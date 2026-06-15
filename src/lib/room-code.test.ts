import { describe, it, expect } from "vitest"
import { normaliseRoomCode, generateRoomCode } from "@/lib/room-code"

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
const CODE_LENGTH = 6

describe("normaliseRoomCode", () => {
  it("trims leading and trailing whitespace", () => {
    expect(normaliseRoomCode("  abc  ")).toBe("ABC")
  })

  it("uppercases lowercase letters", () => {
    expect(normaliseRoomCode("abc123")).toBe("ABC123")
  })

  it("returns an already-normalised code unchanged", () => {
    expect(normaliseRoomCode("XYZ789")).toBe("XYZ789")
  })

  it("handles an empty string", () => {
    expect(normaliseRoomCode("")).toBe("")
  })

  it("trims without uppercasing non-alpha chars", () => {
    expect(normaliseRoomCode("  42  ")).toBe("42")
  })
})

describe("generateRoomCode", () => {
  it(`produces a code of exactly ${CODE_LENGTH} characters`, () => {
    expect(generateRoomCode()).toHaveLength(CODE_LENGTH)
  })

  it("only uses characters from the allowed alphabet", () => {
    const code = generateRoomCode()
    for (const ch of code) {
      expect(ALPHABET).toContain(ch)
    }
  })

  it("produces different codes on successive calls", () => {
    // Astronomically unlikely to be equal; treat a match as a failure
    const a = generateRoomCode()
    const b = generateRoomCode()
    expect(a).not.toBe(b)
  })

  it("never contains ambiguous characters (0, O, I, L, 1)", () => {
    // Run a few times to get statistical confidence
    for (let i = 0; i < 20; i++) {
      const code = generateRoomCode()
      expect(code).not.toMatch(/[0OIL1]/)
    }
  })
})
