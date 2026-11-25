import { describe, it, expect } from "vitest"
import { ANNOUNCE_DWELL_MS } from "@/lib/announcement-dwell"

describe("announcement dwell", () => {
  it("keeps a passing announcement up for three seconds", () => {
    expect(ANNOUNCE_DWELL_MS.default).toBe(3000)
  })

  it("has no separate reveal dwell: the reveal line holds for the round", () => {
    expect(Object.keys(ANNOUNCE_DWELL_MS)).toEqual(["default"])
  })
})
