import type { SessionStats } from "./session-stats"

export type CardValue = string

// Clickable ambient props that broadcast "who poked what" to the whole room.
export type PropId = "dealer" | "cat" | "plant-left" | "plant-right"

export type Card = {
  value: CardValue
  label?: string
}

export type DeckPreset = "fibonacci" | "numeric" | "tshirt" | "custom"

export type Deck = {
  preset: DeckPreset
  cards: Card[]
}

export type Participant = {
  id: string
  name: string
  avatar: string
  vote: CardValue | null
  isHost: boolean
  isSpectator?: boolean
}

export type Topic = {
  title: string
  url: string | null
}

export type HistoryEntry = {
  id: string
  title: string
  url: string | null
  estimate: CardValue
  at: number
}

export type RoomState = {
  deck: Deck
  participants: Record<string, Participant>
  revealed: boolean
  speaker: string | null
  spoken: string[]
  topic: Topic | null
  history: HistoryEntry[]
  autoReveal: boolean
  rageEnabled: boolean
  break: {
    status: "voting" | "active"
    requesterId: string
    requesterName: string
    accepts: string[]
    declines: string[]
    endsAt: number | null
  } | null
  requireApproval: boolean
  pending: Record<string, { id: string; name: string; avatar: string }>
  timer: { endsAt: number } | null
  sessionStats: SessionStats
}

export type Message =
  | { type: "vote"; value: CardValue }
  | { type: "update-profile"; name: string; avatar: string }
  | { type: "state"; state: RoomState }
  | { type: "reveal" }
  | { type: "reset" }
  | { type: "set-deck"; deck: Deck }
  | { type: "roll-speaker" }
  | { type: "set-topic"; title: string; url: string | null }
  | { type: "save-round"; estimate: CardValue }
  | {
      type: "edit-history"
      id: string
      title: string
      url: string | null
      estimate: CardValue
    }
  | { type: "clear-history" }
  | { type: "set-auto-reveal"; enabled: boolean }
  | { type: "set-spectator"; enabled: boolean }
  | { type: "start-timer"; seconds: number }
  | { type: "clear-timer" }
  | { type: "request-break" }
  | { type: "break-vote"; accept: boolean }
  | { type: "set-break-time"; seconds: number }
  | { type: "end-break" }
  | { type: "set-approval"; enabled: boolean }
  | { type: "admit"; clientId: string }
  | { type: "deny"; clientId: string }
  | { type: "set-rage"; enabled: boolean }
  | { type: "rage-invite" }
  | { type: "rage-invited"; from: string; name: string }
  | { type: "rage-restart" }
  | { type: "rage-restarted" }
  | { type: "rage-move"; x: number; y: number; punching: boolean; hp: number }
  | {
      type: "rage"
      from: string
      x: number
      y: number
      punching: boolean
      hp: number
    }
  | { type: "react"; emoji: string }
  | { type: "reaction"; from: string; name: string; emoji: string }
  | { type: "poke-prop"; prop: PropId; variant?: string }
  | {
      type: "prop-poked"
      from: string
      name: string
      prop: PropId
      variant?: string
    }
  | {
      type: "presence"
      event: "join" | "leave"
      clientId: string
      name: string
      avatar: string
    }
