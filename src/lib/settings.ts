import { Deck } from "@/lib/types"

const KEY = "pp-settings"
const DECK_KEY = "pp-preferred-deck"

export type Settings = { name: string; avatar: string }

export const loadSettings = (): Settings | null => {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Settings) : null
  } catch {
    return null
  }
}

export const saveSettings = (settings: Settings) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {}
}

export const loadPreferredDeck = (): Deck | null => {
  try {
    const raw = localStorage.getItem(DECK_KEY)
    return raw ? (JSON.parse(raw) as Deck) : null
  } catch {
    return null
  }
}

export const savePreferredDeck = (deck: Deck) => {
  try {
    localStorage.setItem(DECK_KEY, JSON.stringify(deck))
  } catch {}
}
