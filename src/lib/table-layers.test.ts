import { describe, it, expect } from "vitest"
import { TABLE_LAYER, MOBILE_LAYER } from "@/lib/table-layers"

describe("table layers", () => {
  it("keeps revealed cards above the dealer's speech bubble", () => {
    expect(TABLE_LAYER.cards).toBeGreaterThan(TABLE_LAYER.dealer)
  })

  it("keeps the round stats above the cards", () => {
    expect(TABLE_LAYER.centre).toBeGreaterThan(TABLE_LAYER.cards)
  })

  it("keeps phone seat tiles above the dealer's announcement", () => {
    expect(MOBILE_LAYER.seat).toBeGreaterThan(MOBILE_LAYER.announcement)
  })
})
