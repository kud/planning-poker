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

const ROOM_KEY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export const touchRoom = (roomId: string) => {
  try {
    localStorage.setItem(`poker-seen-${roomId}`, String(Date.now()))
  } catch {}
}

export const pruneStaleRooms = () => {
  try {
    const cutoff = Date.now() - ROOM_KEY_MAX_AGE_MS
    for (const key of Object.keys(localStorage)) {
      const match = key.match(/^poker-(?:client|host)-(.+)$/)
      if (!match) continue
      const roomId = match[1]
      const seen = Number(localStorage.getItem(`poker-seen-${roomId}`))
      if (!seen) {
        touchRoom(roomId)
      } else if (seen < cutoff) {
        localStorage.removeItem(`poker-client-${roomId}`)
        localStorage.removeItem(`poker-host-${roomId}`)
        localStorage.removeItem(`poker-seen-${roomId}`)
      }
    }
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
