// The full, unclamped connection URL is what PartyServer stores in the
// WebSocket's Durable Object attachment: the request URL goes into the
// attachment during accept(), which runs before onConnect (dist/index.js
// stores `uri: request.url` in `__pk`). The platform caps that attachment
// around 2 KB, so the URL is clamped at the routing hook — before accept()
// sees it. parseConnectionParams applies the same limits to what is kept in
// per-connection state.

export const MAX_ID_LEN = 128
export const MAX_TEXT_LEN = 120

export type ConnectionParams = {
  clientId: string
  secret: string
  name: string
  avatar: string
}

const clamp = (value: string | null, max: number) =>
  (value ?? "").slice(0, max)

// The params partysocket puts on the URL: `_pk` plus the caller's query
// (`clientId`, `name`, `avatar`, optional `hostSecret`). Everything else is
// dropped. Absent params stay absent so parseConnectionParams' fallbacks
// still apply.
const KEPT_PARAMS = [
  ["clientId", MAX_ID_LEN],
  ["hostSecret", MAX_ID_LEN],
  ["_pk", MAX_ID_LEN],
  ["name", MAX_TEXT_LEN],
  ["avatar", MAX_TEXT_LEN],
] as const

export const clampConnectionUrl = (url: string): string => {
  const parsed = new URL(url)
  const clamped = new URLSearchParams()
  for (const [key, max] of KEPT_PARAMS) {
    const value = parsed.searchParams.get(key)
    if (value !== null) clamped.set(key, value.slice(0, max))
  }
  parsed.search = clamped.toString()
  return parsed.toString()
}

export const parseConnectionParams = (
  params: URLSearchParams,
): ConnectionParams => {
  const name = params.get("name")
  return {
    clientId: clamp(params.get("clientId"), MAX_ID_LEN),
    secret: clamp(params.get("hostSecret"), MAX_ID_LEN),
    name: name === null ? "Guest" : clamp(name, MAX_TEXT_LEN),
    avatar: clamp(params.get("avatar"), MAX_TEXT_LEN),
  }
}
