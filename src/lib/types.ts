export type CardValue = string

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
  | {
      type: "presence"
      event: "join" | "leave"
      clientId: string
      name: string
      avatar: string
    }
