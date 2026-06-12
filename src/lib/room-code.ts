const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
const CODE_LENGTH = 6

export const generateRoomCode = () =>
  Array.from(
    crypto.getRandomValues(new Uint32Array(CODE_LENGTH)),
    (n) => ALPHABET[n % ALPHABET.length],
  ).join("")

export const normaliseRoomCode = (input: string) => input.trim().toUpperCase()
