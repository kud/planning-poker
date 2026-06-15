import { describe, it, expect } from "vitest"
import { parseCustomDeck, defaultDeck, DECK_PRESETS } from "@/lib/decks"

describe("parseCustomDeck", () => {
  it("parses a comma-separated list into Card objects", () => {
    const cards = parseCustomDeck("1,2,3")
    expect(cards).toEqual([{ value: "1" }, { value: "2" }, { value: "3" }])
  })

  it("trims whitespace from each value", () => {
    const cards = parseCustomDeck(" 1 , 2 , 3 ")
    expect(cards).toEqual([{ value: "1" }, { value: "2" }, { value: "3" }])
  })

  it("filters out empty segments", () => {
    const cards = parseCustomDeck("1,,2, ,3")
    expect(cards).toEqual([{ value: "1" }, { value: "2" }, { value: "3" }])
  })

  it("returns an empty array for an empty string", () => {
    expect(parseCustomDeck("")).toEqual([])
  })

  it("returns an empty array for a whitespace-only string", () => {
    expect(parseCustomDeck("   ")).toEqual([])
  })

  it("handles a single value", () => {
    expect(parseCustomDeck("XL")).toEqual([{ value: "XL" }])
  })

  it("preserves non-numeric values like t-shirt sizes", () => {
    const cards = parseCustomDeck("XS,S,M,L,XL")
    expect(cards).toHaveLength(5)
    expect(cards[0]).toEqual({ value: "XS" })
    expect(cards[4]).toEqual({ value: "XL" })
  })

  it("preserves special characters like '?' and '☕'", () => {
    const cards = parseCustomDeck("1,?,☕")
    expect(cards).toEqual([{ value: "1" }, { value: "?" }, { value: "☕" }])
  })
})

describe("defaultDeck", () => {
  it("returns a deck with preset 'fibonacci'", () => {
    expect(defaultDeck().preset).toBe("fibonacci")
  })

  it("returns the fibonacci cards", () => {
    const { cards } = defaultDeck()
    expect(cards).toEqual(DECK_PRESETS.fibonacci.cards)
  })

  it("each call returns a fresh object (not a shared reference)", () => {
    const a = defaultDeck()
    const b = defaultDeck()
    expect(a).not.toBe(b)
  })

  it("contains at least the standard fibonacci values", () => {
    const values = defaultDeck().cards.map((c) => c.value)
    for (const v of ["1", "2", "3", "5", "8", "13"]) {
      expect(values).toContain(v)
    }
  })
})
