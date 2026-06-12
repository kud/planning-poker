import type * as Party from "partykit/server"
import type { Deck, Message, RoomState } from "../src/lib/types"

const defaultDeck = (): Deck => ({
  preset: "fibonacci",
  cards: [
    { value: "0" },
    { value: "½" },
    { value: "1" },
    { value: "2" },
    { value: "3" },
    { value: "5" },
    { value: "8" },
    { value: "13" },
    { value: "21" },
    { value: "?" },
    { value: "☕" },
  ],
})

const uniqueName = (
  name: string,
  existing: Record<string, { name: string }>,
) => {
  const taken = Object.values(existing).map((p) => p.name)
  if (!taken.includes(name)) return name
  let n = 2
  while (taken.includes(`${name} (${n})`)) n++
  return `${name} (${n})`
}

type PersistedData = { deck: Deck; hostSecret: string | null }

const ROOM_TTL_MS = 24 * 60 * 60 * 1000

export default class PokerRoom implements Party.Server {
  private state: RoomState = {
    deck: defaultDeck(),
    revealed: false,
    participants: {},
    speaker: null,
    spoken: [],
  }
  private hostSecret: string | null = null
  private connToClientId = new Map<string, string>()
  private connToSecret = new Map<string, string>()
  private connToProfile = new Map<string, { name: string; avatar: string }>()
  private connCounts = new Map<string, number>()

  constructor(readonly room: Party.Room) {}

  async onStart() {
    const saved = await this.room.storage.get<PersistedData>("room")
    if (saved) {
      this.state.deck = saved.deck
      this.hostSecret = saved.hostSecret
    }
  }

  onRequest() {
    return Response.redirect("https://planningdeck.vercel.app", 302)
  }

  private scheduleCleanup() {
    this.room.storage.setAlarm(Date.now() + ROOM_TTL_MS)
  }

  async onAlarm() {
    const stillConnected = [...this.room.getConnections()].length > 0
    if (stillConnected) {
      this.scheduleCleanup()
      return
    }
    await this.room.storage.deleteAll()
    this.state = {
      deck: defaultDeck(),
      revealed: false,
      participants: {},
      speaker: null,
      spoken: [],
    }
    this.hostSecret = null
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const url = new URL(ctx.request.url)
    const clientId = url.searchParams.get("clientId") ?? conn.id
    const secret = url.searchParams.get("hostSecret") ?? ""
    const name = url.searchParams.get("name") ?? "Guest"
    const avatar = url.searchParams.get("avatar") ?? ""

    this.connToClientId.set(conn.id, clientId)
    this.connToProfile.set(conn.id, { name, avatar })
    if (secret) this.connToSecret.set(conn.id, secret)
    this.connCounts.set(clientId, (this.connCounts.get(clientId) ?? 0) + 1)
    this.scheduleCleanup()

    if (secret && !this.hostSecret) {
      this.hostSecret = secret
      this.persist()
    }

    const isHost = !!secret && secret === this.hostSecret
    const existing = this.state.participants[clientId]
    this.state = {
      ...this.state,
      participants: {
        ...this.state.participants,
        [clientId]: existing
          ? { ...existing, avatar, isHost }
          : {
              id: clientId,
              name: uniqueName(name, this.state.participants),
              avatar,
              vote: null,
              isHost,
            },
      },
    }

    this.room.broadcast(
      JSON.stringify({ type: "state", state: this.state } satisfies Message),
    )
  }

  private ensureParticipant(clientId: string, connId: string) {
    if (this.state.participants[clientId]) return
    const profile = this.connToProfile.get(connId) ?? {
      name: "Guest",
      avatar: "",
    }
    const secret = this.connToSecret.get(connId) ?? ""
    this.state = {
      ...this.state,
      participants: {
        ...this.state.participants,
        [clientId]: {
          id: clientId,
          name: uniqueName(profile.name, this.state.participants),
          avatar: profile.avatar,
          vote: null,
          isHost: !!secret && secret === this.hostSecret,
        },
      },
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    const msg = JSON.parse(message) as Message
    const clientId = this.connToClientId.get(sender.id) ?? sender.id
    const senderSecret = this.connToSecret.get(sender.id) ?? ""
    const isHost = !!this.hostSecret && senderSecret === this.hostSecret

    switch (msg.type) {
      case "vote": {
        if (this.state.revealed) return
        this.ensureParticipant(clientId, sender.id)
        this.state = {
          ...this.state,
          participants: {
            ...this.state.participants,
            [clientId]: {
              ...this.state.participants[clientId],
              vote: msg.value,
            },
          },
        }
        break
      }
      case "update-profile": {
        this.ensureParticipant(clientId, sender.id)
        const excluded = Object.fromEntries(
          Object.entries(this.state.participants).filter(
            ([id]) => id !== clientId,
          ),
        )
        const resolved = uniqueName(msg.name, excluded)
        this.state = {
          ...this.state,
          participants: {
            ...this.state.participants,
            [clientId]: {
              ...this.state.participants[clientId],
              name: resolved,
              avatar: msg.avatar,
            },
          },
        }
        break
      }
      case "reveal": {
        if (!isHost) return
        this.state = { ...this.state, revealed: true }
        this.persist()
        break
      }
      case "reset": {
        if (!isHost) return
        this.state = {
          ...this.state,
          revealed: false,
          speaker: null,
          spoken: [],
          participants: Object.fromEntries(
            Object.entries(this.state.participants).map(([id, p]) => [
              id,
              { ...p, vote: null },
            ]),
          ),
        }
        this.persist()
        break
      }
      case "roll-speaker": {
        if (!isHost) return
        const ids = Object.keys(this.state.participants)
        const alreadySpoken = this.state.spoken.filter((id) => ids.includes(id))
        const fresh = alreadySpoken.length >= ids.length ? [] : alreadySpoken
        const candidates = ids.filter(
          (id) => !fresh.includes(id) && id !== this.state.speaker,
        )
        if (candidates.length === 0) break
        const numericVote = (id: string) =>
          Number(this.state.participants[id]?.vote)
        const numeric = candidates.filter(
          (id) => !Number.isNaN(numericVote(id)),
        )
        const picked =
          numeric.length > 0 && fresh.length === 0
            ? numeric.reduce((a, b) =>
                numericVote(b) > numericVote(a) ? b : a,
              )
            : numeric.length > 0 && fresh.length === 1
              ? numeric.reduce((a, b) =>
                  numericVote(b) < numericVote(a) ? b : a,
                )
              : candidates[Math.floor(Math.random() * candidates.length)]
        this.state = {
          ...this.state,
          speaker: picked,
          spoken: [...fresh, picked],
        }
        break
      }
      case "set-deck": {
        if (!isHost) return
        this.state = { ...this.state, deck: msg.deck, revealed: false }
        this.persist()
        break
      }
      default:
        return
    }

    this.room.broadcast(
      JSON.stringify({ type: "state", state: this.state } satisfies Message),
    )
  }

  onClose(conn: Party.Connection) {
    const clientId = this.connToClientId.get(conn.id) ?? conn.id
    this.connToClientId.delete(conn.id)
    this.connToSecret.delete(conn.id)
    this.connToProfile.delete(conn.id)
    this.scheduleCleanup()

    const remaining = (this.connCounts.get(clientId) ?? 1) - 1
    if (remaining > 0) {
      this.connCounts.set(clientId, remaining)
      return
    }
    this.connCounts.delete(clientId)

    if (!this.state.participants[clientId]) return
    const participants = { ...this.state.participants }
    delete participants[clientId]
    this.state = {
      ...this.state,
      participants,
      speaker: this.state.speaker === clientId ? null : this.state.speaker,
    }
    this.room.broadcast(
      JSON.stringify({ type: "state", state: this.state } satisfies Message),
    )
  }

  private async persist() {
    await this.room.storage.put<PersistedData>("room", {
      deck: this.state.deck,
      hostSecret: this.hostSecret,
    })
  }
}
