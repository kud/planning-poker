const KEY = "pp-settings"

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
