import { describe, it, expect } from "vitest"
import { projectState } from "./project-state"
import { VOTE_MASK } from "../src/lib/constants"
import type { RoomState } from "../src/lib/types"

const freshState = (): RoomState => ({
  deck: {
    preset: "fibonacci",
    cards: [
      { value: "0" },
      { value: "½" },
      { value: "1" },
      { value: "2" },
      { value: "3" },
      { value: "5" },
      { value: "8" },
      { value: "13" },
      { value: "21" },
      { value: "?" },
      { value: "☕" },
    ],
  },
  revealed: false,
  participants: {
    a: { id: "a", name: "Alice", avatar: "", vote: "5", isHost: false },
    b: { id: "b", name: "Bob", avatar: "", vote: "8", isHost: false },
    c: { id: "c", name: "Carol", avatar: "", vote: null, isHost: true },
  },
  speaker: null,
  spoken: [],
  topic: null,
  history: [],
  autoReveal: false,
  rageEnabled: false,
  break: null,
  requireApproval: false,
  pending: {},
  timer: null,
  sessionStats: {
    rounds: 0,
    consensusRounds: 0,
    currentStreak: 0,
    bestStreak: 0,
    players: {},
  },
})

describe("projectState", () => {
  it("returns real votes after reveal", () => {
    const state = { ...freshState(), revealed: true }
    const projected = projectState(state, "a")
    expect(projected.participants.a.vote).toBe("5")
    expect(projected.participants.b.vote).toBe("8")
    expect(projected.participants.c.vote).toBeNull()
  })

  it("keeps own vote, masks others before reveal", () => {
    const state = freshState()
    const projected = projectState(state, "a")
    expect(projected.participants.a.vote).toBe("5")
    expect(projected.participants.b.vote).toBe(VOTE_MASK)
    expect(projected.participants.c.vote).toBeNull()
  })

  it("masks all votes for unknown viewer", () => {
    const state = freshState()
    const projected = projectState(state, undefined)
    expect(projected.participants.a.vote).toBe(VOTE_MASK)
    expect(projected.participants.b.vote).toBe(VOTE_MASK)
    expect(projected.participants.c.vote).toBeNull()
  })

  it("does not mutate input state", () => {
    const state = freshState()
    projectState(state, "a")
    expect(state.participants.a.vote).toBe("5")
    expect(state.participants.b.vote).toBe("8")
    expect(state.participants.c.vote).toBeNull()
  })

  it("null votes stay null after reset (new round)", () => {
    const state = { ...freshState(), participants: {
      a: { id: "a", name: "Alice", avatar: "", vote: null, isHost: false },
      b: { id: "b", name: "Bob", avatar: "", vote: null, isHost: false },
    }}
    const projected = projectState(state, "a")
    expect(projected.participants.a.vote).toBeNull()
    expect(projected.participants.b.vote).toBeNull()
  })

  it("preserves all other state fields", () => {
    const state = freshState()
    const projected = projectState(state, "a")
    expect(projected.deck).toBe(state.deck)
    expect(projected.revealed).toBe(state.revealed)
    expect(projected.speaker).toBe(state.speaker)
    expect(projected.spoken).toBe(state.spoken)
    expect(projected.topic).toBe(state.topic)
    expect(projected.history).toBe(state.history)
    expect(projected.autoReveal).toBe(state.autoReveal)
    expect(projected.rageEnabled).toBe(state.rageEnabled)
    expect(projected.break).toBe(state.break)
    expect(projected.requireApproval).toBe(state.requireApproval)
    expect(projected.pending).toBe(state.pending)
    expect(projected.timer).toBe(state.timer)
    expect(projected.sessionStats).toBe(state.sessionStats)
  })

  it("shows each viewer only their own vote", () => {
    const state = freshState()
    const forAlice = projectState(state, "a")
    const forBob = projectState(state, "b")
    expect(forAlice.participants.a.vote).toBe("5")
    expect(forAlice.participants.b.vote).toBe(VOTE_MASK)
    expect(forBob.participants.a.vote).toBe(VOTE_MASK)
    expect(forBob.participants.b.vote).toBe("8")
    expect(JSON.stringify(forAlice)).not.toContain('"vote":"8"')
  })

  it("keeps the revision so a hidden re-vote still animates", () => {
    const state = freshState()
    state.participants.b.voteRevision = 2
    const projected = projectState(state, "a")
    expect(projected.participants.b.vote).toBe(VOTE_MASK)
    expect(projected.participants.b.voteRevision).toBe(2)
  })
})
