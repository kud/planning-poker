import { describe, it, expect } from "vitest"
import { computeVoteStats } from "@/lib/vote-stats"

describe("computeVoteStats", () => {
  describe("empty input", () => {
    it("returns null for all numeric fields and empty tally", () => {
      const stats = computeVoteStats([])
      expect(stats.tally).toEqual([])
      expect(stats.numericVotes).toEqual([])
      expect(stats.average).toBeNull()
      expect(stats.median).toBeNull()
      expect(stats.min).toBeNull()
      expect(stats.max).toBeNull()
      expect(stats.spread).toBeNull()
      expect(stats.consensus).toBe(false)
    })
  })

  describe("numeric votes", () => {
    it("computes average correctly (rounds to 1dp)", () => {
      const stats = computeVoteStats(["1", "2", "3"])
      expect(stats.average).toBe(2)
    })

    it("rounds average to one decimal place", () => {
      const stats = computeVoteStats(["1", "2"])
      expect(stats.average).toBe(1.5)
    })

    it("computes median for odd count", () => {
      const stats = computeVoteStats(["3", "1", "5"])
      expect(stats.median).toBe(3)
    })

    it("computes median for even count (average of two middle values)", () => {
      const stats = computeVoteStats(["1", "3", "5", "7"])
      expect(stats.median).toBe(4)
    })

    it("computes min, max, and spread", () => {
      const stats = computeVoteStats(["2", "8", "5"])
      expect(stats.min).toBe(2)
      expect(stats.max).toBe(8)
      expect(stats.spread).toBe(6)
    })

    it("spread is 0 when all votes are equal", () => {
      const stats = computeVoteStats(["5", "5", "5"])
      expect(stats.spread).toBe(0)
    })

    it("numericVotes are sorted ascending", () => {
      const stats = computeVoteStats(["8", "1", "3"])
      expect(stats.numericVotes).toEqual([1, 3, 8])
    })
  })

  describe("non-numeric values", () => {
    it("excludes '?' from numeric stats", () => {
      const stats = computeVoteStats(["3", "?"])
      expect(stats.numericVotes).toEqual([3])
      expect(stats.average).toBe(3)
    })

    it("excludes '☕' from numeric stats", () => {
      const stats = computeVoteStats(["5", "☕"])
      expect(stats.numericVotes).toEqual([5])
      expect(stats.average).toBe(5)
    })

    it("non-numeric votes still appear in tally", () => {
      const stats = computeVoteStats(["?", "?", "3"])
      const questionEntry = stats.tally.find((t) => t.value === "?")
      expect(questionEntry).toBeDefined()
      expect(questionEntry?.count).toBe(2)
    })

    it("only non-numeric votes → null numeric fields", () => {
      const stats = computeVoteStats(["?", "☕"])
      expect(stats.average).toBeNull()
      expect(stats.median).toBeNull()
      expect(stats.min).toBeNull()
      expect(stats.max).toBeNull()
      expect(stats.spread).toBeNull()
    })
  })

  describe("tally ordering", () => {
    it("sorts tally entries by count descending", () => {
      const stats = computeVoteStats(["3", "3", "3", "5", "5", "1"])
      expect(stats.tally[0].value).toBe("3")
      expect(stats.tally[0].count).toBe(3)
      expect(stats.tally[1].value).toBe("5")
      expect(stats.tally[1].count).toBe(2)
      expect(stats.tally[2].value).toBe("1")
      expect(stats.tally[2].count).toBe(1)
    })

    it("counts each distinct value once", () => {
      const stats = computeVoteStats(["1", "2", "1"])
      const oneEntry = stats.tally.find((t) => t.value === "1")
      expect(oneEntry?.count).toBe(2)
    })
  })

  describe("consensus", () => {
    it("is true when all votes are equal numeric values and count > 1", () => {
      const stats = computeVoteStats(["5", "5", "5"])
      expect(stats.consensus).toBe(true)
    })

    it("is false with only one vote", () => {
      const stats = computeVoteStats(["5"])
      expect(stats.consensus).toBe(false)
    })

    it("is false when votes differ", () => {
      const stats = computeVoteStats(["3", "5"])
      expect(stats.consensus).toBe(false)
    })

    it("is false when all votes are '?'", () => {
      const stats = computeVoteStats(["?", "?"])
      expect(stats.consensus).toBe(false)
    })

    it("is false when all votes are '☕'", () => {
      const stats = computeVoteStats(["☕", "☕"])
      expect(stats.consensus).toBe(false)
    })
  })
})
