import { describe, it, expect } from "vitest"
import {
  freshStats,
  recordReveal,
  computeAwards,
  type RevealVoter,
} from "@/lib/session-stats"

const voter = (
  id: string,
  vote: string | null,
  isSpectator = false,
): RevealVoter => ({ id, name: id.toUpperCase(), vote, isSpectator })

describe("recordReveal", () => {
  it("ignores rounds with no cast votes (no-op)", () => {
    const start = freshStats()
    const after = recordReveal(start, [
      voter("a", null),
      voter("b", "5", true), // spectator
    ])
    expect(after).toBe(start)
  })

  it("counts a unanimous numeric round as consensus and a streak of 1", () => {
    const after = recordReveal(freshStats(), [voter("a", "5"), voter("b", "5")])
    expect(after.rounds).toBe(1)
    expect(after.consensusRounds).toBe(1)
    expect(after.currentStreak).toBe(1)
    expect(after.bestStreak).toBe(1)
    expect(after.players.a).toEqual({ name: "A", rounds: 1, hits: 1 })
  })

  it("does not treat unanimous non-numeric (?, ☕) as consensus", () => {
    const after = recordReveal(freshStats(), [voter("a", "?"), voter("b", "?")])
    expect(after.consensusRounds).toBe(0)
    expect(after.currentStreak).toBe(0)
  })

  it("a single voter is never consensus", () => {
    const after = recordReveal(freshStats(), [voter("a", "8")])
    expect(after.rounds).toBe(1)
    expect(after.consensusRounds).toBe(0)
  })

  it("awards hits to whoever matched the table's most common vote", () => {
    const after = recordReveal(freshStats(), [
      voter("a", "3"),
      voter("b", "3"),
      voter("c", "5"),
    ])
    expect(after.players.a.hits).toBe(1)
    expect(after.players.b.hits).toBe(1)
    expect(after.players.c.hits).toBe(0)
  })

  it("builds and breaks a consensus streak across rounds", () => {
    let stats = freshStats()
    stats = recordReveal(stats, [voter("a", "5"), voter("b", "5")])
    stats = recordReveal(stats, [voter("a", "8"), voter("b", "8")])
    expect(stats.currentStreak).toBe(2)
    expect(stats.bestStreak).toBe(2)
    stats = recordReveal(stats, [voter("a", "3"), voter("b", "8")])
    expect(stats.currentStreak).toBe(0)
    expect(stats.bestStreak).toBe(2)
  })

  it("excludes spectators from tallies", () => {
    const after = recordReveal(freshStats(), [
      voter("a", "5"),
      voter("b", "5"),
      voter("c", "13", true),
    ])
    expect(after.players.c).toBeUndefined()
    expect(after.consensusRounds).toBe(1)
  })

  it("accumulates per-player rounds across reveals", () => {
    let stats = freshStats()
    stats = recordReveal(stats, [voter("a", "3"), voter("b", "5")])
    stats = recordReveal(stats, [voter("a", "8"), voter("b", "8")])
    expect(stats.players.a.rounds).toBe(2)
    expect(stats.players.b.rounds).toBe(2)
  })
})

describe("computeAwards", () => {
  it("returns nothing until two players have at least two rounds each", () => {
    let stats = freshStats()
    stats = recordReveal(stats, [voter("a", "3"), voter("b", "5")])
    expect(computeAwards(stats)).toEqual([])
  })

  it("names a dead-on and a free spirit when hit rates differ", () => {
    let stats = freshStats()
    // a always matches the table; c never does.
    stats = recordReveal(stats, [
      voter("a", "3"),
      voter("b", "3"),
      voter("c", "8"),
    ])
    stats = recordReveal(stats, [
      voter("a", "5"),
      voter("b", "5"),
      voter("c", "13"),
    ])
    const awards = computeAwards(stats)
    expect(awards.map((x) => x.key)).toEqual(["deadon", "freespirit"])
    expect(awards[0].player).toBe("A")
    expect(awards[1].player).toBe("C")
  })

  it("returns nothing when every player has the same hit rate", () => {
    let stats = freshStats()
    stats = recordReveal(stats, [voter("a", "5"), voter("b", "5")])
    stats = recordReveal(stats, [voter("a", "8"), voter("b", "8")])
    expect(computeAwards(stats)).toEqual([])
  })
})
