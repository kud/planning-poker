import { describe, it, expect } from "vitest"
import { ANNOUNCE_DWELL_MS } from "@/lib/announcement-dwell"

describe("announcement dwell", () => {
  it("clears the reveal quip after two seconds", () => {
    expect(ANNOUNCE_DWELL_MS.reveal).toBe(2000)
  })

  it("keeps every other announcement up for three seconds", () => {
    expect(ANNOUNCE_DWELL_MS.default).toBe(3000)
  })
})
