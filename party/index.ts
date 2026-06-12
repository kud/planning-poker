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

export default class PokerRoom implements Party.Server {
  private state: RoomState = {
    deck: defaultDeck(),
    revealed: false,
    participants: {},
  }
  private hostSecret: string | null = null
  private connToClientId = new Map<string, string>()
  private connToSecret = new Map<string, string>()

  constructor(readonly room: Party.Room) {}

  async onStart() {
    const saved = await this.room.storage.get<PersistedData>("room")
    if (saved) {
      this.state.deck = saved.deck
      this.hostSecret = saved.hostSecret
    }
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const url = new URL(ctx.request.url)
    const clientId = url.searchParams.get("clientId") ?? conn.id
    const secret = url.searchParams.get("hostSecret") ?? ""
    const name = url.searchParams.get("name") ?? "Guest"
    const avatar = url.searchParams.get("avatar") ?? ""

    this.connToClientId.set(conn.id, clientId)
    if (secret) this.connToSecret.set(conn.id, secret)

    if (secret && !this.hostSecret) {
      this.hostSecret = secret
      this.persist()
    }

    const isHost = !!secret && secret === this.hostSecret
    const resolved = uniqueName(name, this.state.participants)
    this.state = {
      ...this.state,
      participants: {
        ...this.state.participants,
        [clientId]: {
          id: clientId,
          name: resolved,
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

  onMessage(message: string, sender: Party.Connection) {
    const msg = JSON.parse(message) as Message
    const clientId = this.connToClientId.get(sender.id) ?? sender.id
    const senderSecret = this.connToSecret.get(sender.id) ?? ""
    const isHost = !!this.hostSecret && senderSecret === this.hostSecret

    switch (msg.type) {
      case "vote": {
        if (!this.state.participants[clientId]) break
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
        if (!this.state.participants[clientId]) break
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

    if (!this.state.participants[clientId]) return
    const participants = { ...this.state.participants }
    delete participants[clientId]
    this.state = { ...this.state, participants }
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
