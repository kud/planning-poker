import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createDealerLine, type DealerLine } from "@/lib/dealer-line"
import { ANNOUNCE_DWELL_MS } from "@/lib/announcement-dwell"

const reveal: DealerLine = { emoji: "🃏", title: "All over the map" }
const streak: DealerLine = { emoji: "🔥", title: "3 in a row!" }
const newRound: DealerLine = { emoji: "🤵", title: "New round" }

describe("dealer line", () => {
  let current: DealerLine | null
  let line: ReturnType<typeof createDealerLine>

  beforeEach(() => {
    vi.useFakeTimers()
    current = null
    line = createDealerLine((l) => (current = l))
  })
  afterEach(() => {
    line.dispose()
    vi.useRealTimers()
  })

  it("keeps the reveal line for the whole revealed state", () => {
    line.hold(reveal)
    vi.advanceTimersByTime(60_000)
    expect(current).toBe(reveal)
  })

  it("lets another announcement pass, then hands back to the reveal line", () => {
    line.hold(reveal)
    line.say(streak)
    expect(current).toBe(streak)
    vi.advanceTimersByTime(ANNOUNCE_DWELL_MS.default - 1)
    expect(current).toBe(streak)
    vi.advanceTimersByTime(1)
    expect(current).toBe(reveal)
  })

  it("clears a passing announcement when nothing is held", () => {
    line.say(newRound)
    vi.advanceTimersByTime(ANNOUNCE_DWELL_MS.default)
    expect(current).toBeNull()
  })

  it("lets the reveal line take over from a passing announcement at once", () => {
    line.say(newRound)
    line.hold(reveal)
    expect(current).toBe(reveal)
    vi.advanceTimersByTime(ANNOUNCE_DWELL_MS.default)
    expect(current).toBe(reveal)
  })

  it("drops the reveal line when the round resets", () => {
    line.hold(reveal)
    line.hold(null)
    line.say(newRound)
    vi.advanceTimersByTime(ANNOUNCE_DWELL_MS.default)
    expect(current).toBeNull()
  })
})
