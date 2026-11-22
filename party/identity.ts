// A participant's public id is derived from a private token the client keeps
// to itself. Only the derived id is ever broadcast (state keys, presence,
// reactions), so knowing someone's public id does not let a second socket
// claim their seat, read their hidden vote, or act on their behalf.

export const MIN_TOKEN_LEN = 16
export const MAX_TOKEN_LEN = 128

const TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/

export const isValidToken = (token: string) =>
  token.length >= MIN_TOKEN_LEN &&
  token.length <= MAX_TOKEN_LEN &&
  TOKEN_PATTERN.test(token)

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")

// SHA-256 over a per-room salt and the token, truncated to 128 bits. The salt
// keeps ids from correlating across rooms; the hash keeps the token private.
export const derivePublicId = async (token: string, salt: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${token}`),
  )
  return toHex(digest).slice(0, 32)
}
