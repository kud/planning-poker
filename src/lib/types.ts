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

export type RoomState = {
  deck: Deck
  participants: Record<string, Participant>
  revealed: boolean
  speaker: string | null
  spoken: string[]
}

export type Message =
  | { type: "vote"; value: CardValue }
  | { type: "update-profile"; name: string; avatar: string }
  | { type: "state"; state: RoomState }
  | { type: "reveal" }
  | { type: "reset" }
  | { type: "set-deck"; deck: Deck }
  | { type: "roll-speaker" }
  | { type: "react"; emoji: string }
  | { type: "reaction"; from: string; name: string; emoji: string }
