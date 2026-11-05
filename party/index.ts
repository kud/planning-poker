import {
  routePartykitRequest,
  Server,
  type Connection,
  type ConnectionContext,
  type WSMessage,
} from "partyserver"
import type {
  Deck,
  HistoryEntry,
  Message,
  RoomState,
  Snack,
} from "../src/lib/types"
import { freshStats, recordReveal } from "../src/lib/session-stats"
import {
  MAX_TEXT_LEN,
  clampConnectionUrl,
  parseConnectionParams,
} from "./connection-params"
import { projectState } from "./project-state"

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

type PersistedData = { state: RoomState; hostSecret: string | null }

// Per-connection data kept in the WebSocket attachment so it survives
// hibernation wake-ups. The room itself lives in ctx.storage via `persist()`.
type ConnState = {
  clientId: string
  secret: string
  name: string
  avatar: string
}

const ROOM_TTL_MS = 24 * 60 * 60 * 1000
const MAX_HISTORY = 200

const freshState = (): RoomState => ({
  deck: defaultDeck(),
  revealed: false,
  participants: {},
  speaker: null,
  spoken: [],
  topic: null,
  history: [],
  autoReveal: false,
  rageEnabled: false,
  break: null,
  requireApproval: false,
  pending: {},
  timer: null,
  sessionStats: freshStats(),
})

const clampText = (value: unknown, max = MAX_TEXT_LEN) =>
  typeof value === "string" ? value.slice(0, max) : ""

const validDeck = (deck: unknown): deck is Deck => {
  if (!deck || typeof deck !== "object") return false
  const cards = (deck as Deck).cards
  return (
    Array.isArray(cards) &&
    cards.length > 0 &&
    cards.length <= 40 &&
    cards.every((c) => typeof c?.value === "string" && c.value.length <= 12)
  )
}

export class PokerRoom extends Server {
  static options = { hibernate: true }

  private state: RoomState = freshState()
  private hostSecret: string | null = null
  private lastReactionAt = new Map<string, number>()
  private lastRageAt = new Map<string, number>()
  private lastPokeAt = new Map<string, number>()
  private lastSnackDropAt = new Map<string, number>()
  private lastSnackEatAt = new Map<string, number>()
  // Snack ids already claimed this brawl — the referee for pickup races. Reset
  // whenever the arena resets (rage toggled off or restarted). Held in memory:
  // losing it to hibernation only risks a double-eat, never room state.
  private eatenSnacks = new Set<string>()

  // Runs on every wake-up (new or evicted instance), reloading the room from
  // storage; every state change went through persist() when it was broadcast.
  async onStart() {
    const saved = await this.ctx.storage.get<PersistedData>("room")
    if (saved) {
      this.state = { ...freshState(), ...saved.state }
      this.hostSecret = saved.hostSecret
    }
  }

  onRequest() {
    return Response.redirect("https://planning-poker.beansontoast.app", 302)
  }

  private scheduleCleanup() {
    this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS)
  }

  async onAlarm() {
    const stillConnected = [...this.getConnections()].length > 0
    if (stillConnected) {
      this.scheduleCleanup()
      return
    }
    // This storage also holds PartyServer's own name-fallback record, so only
    // the room snapshot key is cleared rather than everything.
    await this.ctx.storage.delete("room")
    this.state = freshState()
    this.hostSecret = null
  }

  // A client can hold several connections (tabs); the connection being opened
  // or closed may or may not still be listed by getConnections, so it is
  // excluded by id either way.
  private hasOtherLiveConnection(connId: string, clientId: string) {
    for (const conn of this.getConnections<ConnState>()) {
      if (conn.id === connId) continue
      if (conn.state?.clientId === clientId) return true
    }
    return false
  }

  onConnect(conn: Connection<ConnState>, ctx: ConnectionContext) {
    const parsed = parseConnectionParams(new URL(ctx.request.url).searchParams)
    const clientId = parsed.clientId || conn.id

    // The attachment must be in place before the first broadcast: the vote
    // mask is projected per connection from state.clientId.
    conn.setState({
      clientId,
      secret: parsed.secret,
      name: parsed.name,
      avatar: parsed.avatar,
    })
    this.scheduleCleanup()

    if (parsed.secret && !this.hostSecret) this.hostSecret = parsed.secret
    const isHost = !!parsed.secret && parsed.secret === this.hostSecret
    const existing = this.state.participants[clientId]
    const isFirstConnection = !this.hasOtherLiveConnection(conn.id, clientId)

    // Gate new, non-host joiners into a pending bucket when approval is on.
    // Already-admitted participants (reconnects) are grandfathered through.
    if (this.state.requireApproval && !isHost && !existing) {
      this.state = {
        ...this.state,
        pending: {
          ...this.state.pending,
          [clientId]: {
            id: clientId,
            name: uniqueName(parsed.name, {
              ...this.state.participants,
              ...this.state.pending,
            }),
            avatar: parsed.avatar,
          },
        },
      }
      this.broadcastState()
      return
    }

    this.state = {
      ...this.state,
      participants: {
        ...this.state.participants,
        [clientId]: existing
          ? { ...existing, avatar: parsed.avatar, isHost }
          : {
              id: clientId,
              name: uniqueName(parsed.name, this.state.participants),
              avatar: parsed.avatar,
              vote: null,
              isHost,
            },
      },
    }

    this.broadcastState()

    if (isFirstConnection) {
      const joined = this.state.participants[clientId]
      this.broadcast(
        JSON.stringify({
          type: "presence",
          event: "join",
          clientId,
          name: joined.name,
          avatar: joined.avatar,
        } satisfies Message),
      )
    }
  }

  private ensureParticipant(clientId: string, conn: Connection<ConnState>) {
    if (this.state.participants[clientId]) return
    const profile = conn.state ?? { name: "Guest", avatar: "" }
    const secret = conn.state?.secret ?? ""
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

  onMessage(conn: Connection<ConnState>, message: WSMessage) {
    if (typeof message !== "string") return
    let msg: Message
    try {
      msg = JSON.parse(message) as Message
    } catch {
      return
    }
    const clientId = conn.state?.clientId ?? conn.id
    const senderSecret = conn.state?.secret ?? ""
    const isHost = !!this.hostSecret && senderSecret === this.hostSecret

    // A pending (un-admitted) client can't do anything until the host lets it in.
    if (
      this.state.requireApproval &&
      !isHost &&
      !this.state.participants[clientId]
    )
      return

    switch (msg.type) {
      case "vote": {
        if (this.state.revealed) return
        if (!this.deckValues().has(msg.value)) return
        this.ensureParticipant(clientId, conn)
        if (this.state.participants[clientId].isSpectator) return
        const participant = this.state.participants[clientId]
        const isRevoting =
          participant.vote !== null && participant.vote !== msg.value
        this.state = {
          ...this.state,
          participants: {
            ...this.state.participants,
            [clientId]: {
              ...participant,
              vote: msg.value,
              voteRevision: (participant.voteRevision ?? 0) + (isRevoting ? 1 : 0),
            },
          },
        }
        if (this.state.autoReveal && this.everyoneVoted()) this.revealRound()
        break
      }
      case "update-profile": {
        this.ensureParticipant(clientId, conn)
        const excluded = Object.fromEntries(
          Object.entries(this.state.participants).filter(
            ([id]) => id !== clientId,
          ),
        )
        const resolved = uniqueName(clampText(msg.name) || "Guest", excluded)
        this.state = {
          ...this.state,
          participants: {
            ...this.state.participants,
            [clientId]: {
              ...this.state.participants[clientId],
              name: resolved,
              avatar: clampText(msg.avatar),
            },
          },
        }
        break
      }
      case "reveal": {
        if (!isHost) return
        this.revealRound()
        break
      }
      case "reset": {
        if (!isHost) return
        this.state = this.clearedRound()
        break
      }
      case "roll-speaker": {
        if (!isHost || !this.state.revealed) return
        const ids = Object.keys(this.state.participants).filter(
          (id) => !this.state.participants[id].isSpectator,
        )
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
      case "react": {
        if (typeof msg.emoji !== "string" || msg.emoji.length > 16) return
        const now = Date.now()
        if (now - (this.lastReactionAt.get(conn.id) ?? 0) < 250) return
        this.lastReactionAt.set(conn.id, now)
        const name =
          this.state.participants[clientId]?.name ??
          conn.state?.name ??
          "Guest"
        this.broadcast(
          JSON.stringify({
            type: "reaction",
            from: clientId,
            name,
            emoji: msg.emoji,
          } satisfies Message),
        )
        return
      }
      case "poke-prop": {
        const validProps: ReadonlySet<string> = new Set([
          "dealer",
          "cat",
          "plant-left",
          "plant-right",
        ])
        if (!validProps.has(msg.prop)) return
        const now = Date.now()
        if (now - (this.lastPokeAt.get(conn.id) ?? 0) < 150) return
        this.lastPokeAt.set(conn.id, now)
        const name =
          this.state.participants[clientId]?.name ??
          conn.state?.name ??
          "Guest"
        this.broadcast(
          JSON.stringify({
            type: "prop-poked",
            from: clientId,
            name,
            prop: msg.prop,
            variant:
              typeof msg.variant === "string"
                ? msg.variant.slice(0, 16)
                : undefined,
          } satisfies Message),
        )
        return
      }
      case "cat-stroll": {
        // Only the host schedules the cat; relay its path to everyone else so
        // all clients animate the same cat.
        if (!isHost) return
        const s = msg.stroll
        if (
          !s ||
          typeof s.id !== "number" ||
          (s.direction !== 1 && s.direction !== -1) ||
          !Array.isArray(s.segments) ||
          s.segments.length > 24
        )
          return
        this.broadcast(
          JSON.stringify({ type: "cat-strolled", stroll: s } satisfies Message),
          [conn.id],
        )
        return
      }
      case "snack-drop": {
        // Only relayed while the ring is open; sender already has it locally.
        if (!this.state.rageEnabled) return
        const snack = this.sanitizeSnack(msg.snack)
        if (!snack) return
        const now = Date.now()
        if (now - (this.lastSnackDropAt.get(conn.id) ?? 0) < 400) return
        this.lastSnackDropAt.set(conn.id, now)
        this.broadcast(
          JSON.stringify({ type: "snack-dropped", snack } satisfies Message),
          [conn.id],
        )
        return
      }
      case "snack-eat": {
        if (!this.state.rageEnabled) return
        if (typeof msg.id !== "string" || msg.id.length > 64) return
        const now = Date.now()
        if (now - (this.lastSnackEatAt.get(conn.id) ?? 0) < 40) return
        this.lastSnackEatAt.set(conn.id, now)
        // First claim wins; later claims for the same snack are dropped so only
        // one fighter is ever told they ate it.
        if (this.eatenSnacks.has(msg.id)) return
        if (this.eatenSnacks.size > 4096) this.eatenSnacks.clear()
        this.eatenSnacks.add(msg.id)
        this.broadcast(
          JSON.stringify({
            type: "snack-eaten",
            id: msg.id,
            by: clientId,
          } satisfies Message),
        )
        return
      }
      case "set-deck": {
        if (!isHost) return
        if (!validDeck(msg.deck)) return
        this.state = {
          ...this.state,
          deck: msg.deck,
          revealed: false,
          timer: null,
        }
        break
      }
      case "set-topic": {
        if (!isHost) return
        const title = clampText(msg.title)
        const url = this.safeUrl(msg.url)
        this.state = {
          ...this.state,
          topic: title || url ? { title, url } : null,
        }
        break
      }
      case "save-round": {
        if (!isHost) return
        if (!this.deckValues().has(msg.estimate)) return
        const topic = this.state.topic
        const entry: HistoryEntry = {
          id: crypto.randomUUID(),
          title: topic?.title ?? "",
          url: topic?.url ?? null,
          estimate: msg.estimate,
          at: Date.now(),
        }
        this.state = {
          ...this.clearedRound(),
          topic: null,
          history: [...this.state.history, entry].slice(-MAX_HISTORY),
        }
        break
      }
      case "edit-history": {
        if (!isHost) return
        const title = clampText(msg.title)
        const url = this.safeUrl(msg.url)
        this.state = {
          ...this.state,
          history: this.state.history.map((entry) =>
            entry.id === msg.id
              ? {
                  ...entry,
                  title,
                  url,
                  estimate: this.deckValues().has(msg.estimate)
                    ? msg.estimate
                    : entry.estimate,
                }
              : entry,
          ),
        }
        break
      }
      case "clear-history": {
        if (!isHost) return
        this.state = { ...this.state, history: [] }
        break
      }
      case "set-auto-reveal": {
        if (!isHost) return
        this.state = { ...this.state, autoReveal: !!msg.enabled }
        if (
          this.state.autoReveal &&
          !this.state.revealed &&
          this.everyoneVoted()
        )
          this.revealRound()
        break
      }
      case "set-spectator": {
        this.ensureParticipant(clientId, conn)
        const enabled = !!msg.enabled
        const p = this.state.participants[clientId]
        this.state = {
          ...this.state,
          participants: {
            ...this.state.participants,
            [clientId]: {
              ...p,
              isSpectator: enabled,
              vote: enabled ? null : p.vote,
            },
          },
        }
        // Stepping out as a voter can complete the round for everyone else.
        if (
          enabled &&
          this.state.autoReveal &&
          !this.state.revealed &&
          this.everyoneVoted()
        )
          this.revealRound()
        break
      }
      case "start-timer": {
        if (!isHost || this.state.revealed) return
        const seconds =
          typeof msg.seconds === "number" && Number.isFinite(msg.seconds)
            ? Math.max(5, Math.min(3600, Math.floor(msg.seconds)))
            : 0
        if (seconds === 0) return
        this.state = {
          ...this.state,
          timer: { endsAt: Date.now() + seconds * 1000 },
        }
        break
      }
      case "clear-timer": {
        if (!isHost) return
        this.state = { ...this.state, timer: null }
        break
      }
      case "request-break": {
        if (this.state.break) break
        const name =
          this.state.participants[clientId]?.name ??
          conn.state?.name ??
          "Someone"
        this.state = {
          ...this.state,
          break: {
            status: "voting",
            requesterId: clientId,
            requesterName: name,
            accepts: [clientId],
            declines: [],
            endsAt: null,
          },
        }
        break
      }
      case "break-vote": {
        const b = this.state.break
        if (!b || b.status !== "voting") break
        const accepts = b.accepts.filter((id) => id !== clientId)
        const declines = b.declines.filter((id) => id !== clientId)
        if (msg.accept) accepts.push(clientId)
        else declines.push(clientId)
        const total = Object.keys(this.state.participants).length
        const needed = Math.floor(total / 2) + 1
        if (accepts.length >= needed) {
          // Majority said yes — start a 5-minute break the host can adjust.
          this.state = {
            ...this.state,
            break: {
              ...b,
              status: "active",
              accepts,
              declines,
              endsAt: Date.now() + 300_000,
            },
          }
        } else if (declines.length >= needed) {
          this.state = { ...this.state, break: null }
        } else {
          this.state = { ...this.state, break: { ...b, accepts, declines } }
        }
        break
      }
      case "set-break-time": {
        if (!isHost || this.state.break?.status !== "active") break
        const seconds =
          typeof msg.seconds === "number" && Number.isFinite(msg.seconds)
            ? Math.max(0, Math.min(3600, Math.floor(msg.seconds)))
            : 0
        this.state = {
          ...this.state,
          break: { ...this.state.break, endsAt: Date.now() + seconds * 1000 },
        }
        break
      }
      case "end-break": {
        // Host can always end it; the requester can cancel their own.
        if (!isHost && this.state.break?.requesterId !== clientId) return
        this.state = { ...this.state, break: null }
        break
      }
      case "set-approval": {
        if (!isHost) return
        const enabled = !!msg.enabled
        if (!enabled && Object.keys(this.state.pending).length > 0) {
          // Disabling approval admits everyone currently waiting.
          const admitted = Object.fromEntries(
            Object.values(this.state.pending).map((p) => [
              p.id,
              {
                id: p.id,
                name: p.name,
                avatar: p.avatar,
                vote: null,
                isHost: false,
              },
            ]),
          )
          this.state = {
            ...this.state,
            requireApproval: false,
            participants: { ...this.state.participants, ...admitted },
            pending: {},
          }
        } else {
          this.state = { ...this.state, requireApproval: enabled }
        }
        break
      }
      case "admit": {
        if (!isHost) return
        const p = this.state.pending[msg.clientId]
        if (!p) return
        const pending = { ...this.state.pending }
        delete pending[msg.clientId]
        this.state = {
          ...this.state,
          pending,
          participants: {
            ...this.state.participants,
            [p.id]: {
              id: p.id,
              name: p.name,
              avatar: p.avatar,
              vote: null,
              isHost: false,
            },
          },
        }
        this.broadcastState()
        this.broadcast(
          JSON.stringify({
            type: "presence",
            event: "join",
            clientId: p.id,
            name: p.name,
            avatar: p.avatar,
          } satisfies Message),
        )
        return
      }
      case "deny": {
        if (!isHost) return
        if (!this.state.pending[msg.clientId]) return
        const pending = { ...this.state.pending }
        delete pending[msg.clientId]
        // Leave the connection open — removing from `pending` (without admitting)
        // is what the client reads as "denied". Closing would just reconnect
        // and re-enter the pending queue.
        this.state = { ...this.state, pending }
        break
      }
      case "set-rage": {
        if (!isHost) return
        this.state = { ...this.state, rageEnabled: !!msg.enabled }
        this.eatenSnacks.clear()
        break
      }
      case "rage-restart": {
        if (!isHost || !this.state.rageEnabled) return
        this.eatenSnacks.clear()
        this.broadcast(
          JSON.stringify({ type: "rage-restarted" } satisfies Message),
        )
        return
      }
      case "rage-invite": {
        if (!this.state.rageEnabled) return
        const name =
          this.state.participants[clientId]?.name ??
          conn.state?.name ??
          "Someone"
        this.broadcast(
          JSON.stringify({
            type: "rage-invited",
            from: clientId,
            name,
          } satisfies Message),
        )
        return
      }
      case "rage-move": {
        if (!this.state.rageEnabled) return
        if (
          typeof msg.x !== "number" ||
          typeof msg.y !== "number" ||
          !Number.isFinite(msg.x) ||
          !Number.isFinite(msg.y)
        )
          return
        const now = Date.now()
        if (now - (this.lastRageAt.get(conn.id) ?? 0) < 30) return
        this.lastRageAt.set(conn.id, now)
        this.broadcast(
          JSON.stringify({
            type: "rage",
            from: clientId,
            x: Math.max(0, Math.min(1, msg.x)),
            y: Math.max(0, Math.min(1, msg.y)),
            punching: !!msg.punching,
            hp:
              typeof msg.hp === "number" && Number.isFinite(msg.hp)
                ? Math.max(0, Math.min(100, msg.hp))
                : 100,
          } satisfies Message),
        )
        return
      }
      default:
        return
    }

    this.broadcastState()
  }

  onClose(conn: Connection<ConnState>) {
    const clientId = conn.state?.clientId ?? conn.id
    this.scheduleCleanup()

    // A second tab keeps the client present; closing the last connection
    // behaves as before.
    if (this.hasOtherLiveConnection(conn.id, clientId)) return

    const left = this.state.participants[clientId]
    if (!left) return
    const participants = { ...this.state.participants }
    delete participants[clientId]
    this.state = {
      ...this.state,
      participants,
      speaker: this.state.speaker === clientId ? null : this.state.speaker,
    }
    this.broadcastState()
    this.broadcast(
      JSON.stringify({
        type: "presence",
        event: "leave",
        clientId,
        name: left.name,
        avatar: left.avatar,
      } satisfies Message),
    )
  }

  private deckValues() {
    return new Set(this.state.deck.cards.map((c) => c.value))
  }

  private everyoneVoted() {
    const voters = Object.values(this.state.participants).filter(
      (p) => !p.isSpectator,
    )
    return voters.length > 0 && voters.every((p) => p.vote !== null)
  }

  // The single false→true reveal transition: clears the timer and folds the
  // round into the session tallies exactly once.
  private revealRound() {
    if (this.state.revealed) return
    this.state = {
      ...this.state,
      revealed: true,
      timer: null,
      sessionStats: recordReveal(
        this.state.sessionStats,
        Object.values(this.state.participants),
      ),
    }
  }

  private clearedRound(): RoomState {
    return {
      ...this.state,
      revealed: false,
      speaker: null,
      spoken: [],
      timer: null,
      participants: Object.fromEntries(
        Object.entries(this.state.participants).map(([id, p]) => [
          id,
          { ...p, vote: null },
        ]),
      ),
    }
  }

  private sanitizeSnack(value: unknown): Snack | null {
    if (!value || typeof value !== "object") return null
    const s = value as Snack
    if (typeof s.id !== "string" || s.id.length === 0 || s.id.length > 64)
      return null
    if (typeof s.emoji !== "string" || s.emoji.length > 8) return null
    if (s.side !== "left" && s.side !== "right") return null
    if (
      typeof s.x !== "number" ||
      typeof s.y !== "number" ||
      !Number.isFinite(s.x) ||
      !Number.isFinite(s.y)
    )
      return null
    return {
      id: s.id,
      emoji: s.emoji,
      side: s.side,
      x: Math.max(0, Math.min(1, s.x)),
      y: Math.max(0, Math.min(1, s.y)),
    }
  }

  private safeUrl(value: unknown): string | null {
    const text = clampText(value, 2048).trim()
    if (!text) return null
    try {
      const url = new URL(text)
      return url.protocol === "http:" || url.protocol === "https:"
        ? url.href
        : null
    } catch {
      return null
    }
  }

  private persist() {
    void this.ctx.storage.put<PersistedData>("room", {
      state: this.state,
      hostSecret: this.hostSecret,
    })
  }

  private broadcastState() {
    this.persist()
    for (const conn of this.getConnections<ConnState>()) {
      const projected = projectState(this.state, conn.state?.clientId)
      conn.send(
        JSON.stringify({ type: "state", state: projected } satisfies Message),
      )
    }
  }
}

export default {
  async fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, env, {
        // Trim the connection URL before the DO stores it in the WebSocket
        // attachment (done in accept(), before onConnect); the upgraded
        // request's headers, including x-partykit-*, are carried over.
        onBeforeConnect: (req) => new Request(clampConnectionUrl(req.url), req),
      })) ?? new Response("Not found", { status: 404 })
    )
  },
} satisfies ExportedHandler<Cloudflare.Env>
