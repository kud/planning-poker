import { describe, it, expect } from "vitest"
import {
  shouldSendRageMove,
  decideRageMove,
  markSent,
  SEND_INTERVAL_MS,
  EDGE_INTERVAL_MS,
  MOVING_SPEED,
  HEARTBEAT_INTERVAL_MS,
  MIN_GAP_MS,
  type LastSent,
  type RageMoveState,
} from "@/lib/rage-move-throttle"

const baseState: RageMoveState = {
  x: 0.5,
  y: 0.5,
  punching: false,
  hp: 100,
  vx: 0,
  vy: 0,
}

const RUN = MOVING_SPEED * 10

const makeLast = (overrides: Partial<LastSent> = {}): LastSent => ({
  at: 1000,
  combatEdgeAt: 0,
  motionEdgeAt: 0,
  x: 0.5,
  y: 0.5,
  punching: false,
  hp: 100,
  vx: 0,
  vy: 0,
  ...overrides,
})

describe("shouldSendRageMove", () => {
  it("first call (no previous) sends", () => {
    expect(shouldSendRageMove(1000, null, baseState)).toBe(true)
  })

  it("no send within SEND_INTERVAL_MS even if changed", () => {
    const last = makeLast({ at: 1000 })
    const next: RageMoveState = { ...baseState, x: 0.6 }
    expect(shouldSendRageMove(1000 + SEND_INTERVAL_MS - 1, last, next)).toBe(
      false,
    )
  })

  it("send at >= SEND_INTERVAL_MS when changed", () => {
    const last = makeLast({ at: 1000 })
    const next: RageMoveState = { ...baseState, x: 0.6 }
    expect(shouldSendRageMove(1000 + SEND_INTERVAL_MS, last, next)).toBe(true)
  })

  it("changed state inside a window is sent on the first frame after the window (trailing edge)", () => {
    const last = makeLast({ at: 1000 })
    // State changes at 1050 (within the 200ms window)
    const next1: RageMoveState = { ...baseState, x: 0.55 }
    // At 1150 (still within window) — should not send yet
    expect(shouldSendRageMove(1150, last, next1)).toBe(false)
    // At 1200 (window elapsed) — should send the LATEST state
    const next2: RageMoveState = { ...baseState, x: 0.6 }
    expect(shouldSendRageMove(1200, last, next2)).toBe(true)
  })

  it("punching keeps sending every SEND_INTERVAL_MS", () => {
    const last = makeLast({ at: 1000, punching: true })
    const next: RageMoveState = { ...baseState, punching: true }
    // Just before interval — no send
    expect(shouldSendRageMove(1000 + SEND_INTERVAL_MS - 1, last, next)).toBe(
      false,
    )
    // At interval — send
    expect(shouldSendRageMove(1000 + SEND_INTERVAL_MS, last, next)).toBe(true)
    // Another interval later — send again
    expect(shouldSendRageMove(1000 + 2 * SEND_INTERVAL_MS, last, next)).toBe(
      true,
    )
  })

  it("idle sends nothing until HEARTBEAT_INTERVAL_MS", () => {
    const last = makeLast({ at: 1000 })
    const next: RageMoveState = { ...baseState }
    // Before heartbeat — no send
    expect(
      shouldSendRageMove(1000 + HEARTBEAT_INTERVAL_MS - 1, last, next),
    ).toBe(false)
    // At heartbeat — send
    expect(shouldSendRageMove(1000 + HEARTBEAT_INTERVAL_MS, last, next)).toBe(
      true,
    )
  })

  it("hp change counts as state change", () => {
    const last = makeLast({ at: 1000, hp: 100 })
    const next: RageMoveState = { ...baseState, hp: 86 }
    expect(shouldSendRageMove(1000 + SEND_INTERVAL_MS, last, next)).toBe(true)
  })

  it("punching flag change counts as state change", () => {
    const last = makeLast({ at: 1000, punching: false })
    const next: RageMoveState = { ...baseState, punching: true }
    expect(shouldSendRageMove(1000 + SEND_INTERVAL_MS, last, next)).toBe(true)
  })

  it("position change counts as state change", () => {
    const last = makeLast({ at: 1000, x: 0.5, y: 0.5 })
    const next: RageMoveState = { ...baseState, x: 0.51, y: 0.5 }
    expect(shouldSendRageMove(1000 + SEND_INTERVAL_MS, last, next)).toBe(true)
  })

  it("exact equality on all fields means no state change", () => {
    const last = makeLast({ at: 1000 })
    const next: RageMoveState = { ...baseState }
    expect(shouldSendRageMove(1000 + SEND_INTERVAL_MS, last, next)).toBe(false)
    // But heartbeat should still fire later
    expect(shouldSendRageMove(1000 + HEARTBEAT_INTERVAL_MS, last, next)).toBe(
      true,
    )
  })

  // Regression: punches waited up to SEND_INTERVAL_MS in the window, so peers
  // saw them ~110 ms late on average and judged hits against stale positions.
  it("punch start skips the movement window once MIN_GAP_MS has passed", () => {
    const last = makeLast({ at: 1000 })
    const next: RageMoveState = { ...baseState, x: 0.52, punching: true }
    expect(shouldSendRageMove(1000 + MIN_GAP_MS, last, next)).toBe(true)
  })

  it("punch end skips the movement window too", () => {
    const last = makeLast({ at: 1000, punching: true })
    expect(shouldSendRageMove(1000 + MIN_GAP_MS, last, baseState)).toBe(true)
  })

  it("hp change skips the movement window", () => {
    const last = makeLast({ at: 1000 })
    const next: RageMoveState = { ...baseState, hp: 86 }
    expect(shouldSendRageMove(1000 + MIN_GAP_MS, last, next)).toBe(true)
  })

  it("an edge inside MIN_GAP_MS waits, so the server's 30 ms drop never eats it", () => {
    const last = makeLast({ at: 1000 })
    const next: RageMoveState = { ...baseState, punching: true }
    expect(MIN_GAP_MS).toBeGreaterThan(30)
    expect(shouldSendRageMove(1000 + MIN_GAP_MS - 1, last, next)).toBe(false)
  })

  it("movement alone still waits for the full window", () => {
    const last = makeLast({ at: 1000 })
    const next: RageMoveState = { ...baseState, x: 0.6, y: 0.4 }
    expect(shouldSendRageMove(1000 + MIN_GAP_MS, last, next)).toBe(false)
  })

  it("stopping is an edge: peers must not glide on for a whole window", () => {
    const last = makeLast({ vx: RUN })
    const next: RageMoveState = { ...baseState, x: 0.51 }
    expect(decideRageMove(1000 + MIN_GAP_MS, last, next)).toBe("motion-edge")
  })

  it("starting to move is an edge", () => {
    const last = makeLast()
    const next: RageMoveState = { ...baseState, x: 0.501, vy: RUN }
    expect(decideRageMove(1000 + MIN_GAP_MS, last, next)).toBe("motion-edge")
  })

  it("turning past 45 degrees is an edge, a gentle curve is not", () => {
    const last = makeLast({ vx: RUN })
    const sharp: RageMoveState = { ...baseState, x: 0.51, vx: -RUN }
    const gentle: RageMoveState = {
      ...baseState,
      x: 0.51,
      vx: RUN,
      vy: RUN * 0.3,
    }
    expect(decideRageMove(1000 + MIN_GAP_MS, last, sharp)).toBe("motion-edge")
    expect(decideRageMove(1000 + MIN_GAP_MS, last, gentle)).toBe(false)
  })

  it("combat edges get one bypass per EDGE_INTERVAL_MS, so mashing can't flood", () => {
    const last = makeLast({ at: 1000, combatEdgeAt: 1000, punching: true })
    const next: RageMoveState = { ...baseState, punching: false }
    // Too soon after the last combat edge: falls back to the movement window.
    expect(decideRageMove(1000 + MIN_GAP_MS, last, next)).toBe(false)
    expect(decideRageMove(1000 + SEND_INTERVAL_MS, last, next)).toBe("window")
    expect(decideRageMove(1000 + EDGE_INTERVAL_MS, last, next)).toBe(
      "combat-edge",
    )
  })

  it("steering never spends the punch budget", () => {
    // A turn just went out as a motion edge; a punch right after still does.
    const last = makeLast({ at: 1000, motionEdgeAt: 1000, vx: RUN })
    const next: RageMoveState = { ...baseState, vx: RUN, punching: true }
    expect(decideRageMove(1000 + MIN_GAP_MS, last, next)).toBe("combat-edge")
  })

  it("markSent records each edge time only for its own kind of send", () => {
    const last = makeLast({ combatEdgeAt: 500, motionEdgeAt: 600 })
    expect(markSent(2000, last, baseState, "window")).toMatchObject({
      combatEdgeAt: 500,
      motionEdgeAt: 600,
    })
    expect(markSent(2000, last, baseState, "combat-edge")).toMatchObject({
      combatEdgeAt: 2000,
      motionEdgeAt: 600,
    })
    expect(markSent(2000, last, baseState, "motion-edge")).toMatchObject({
      combatEdgeAt: 500,
      motionEdgeAt: 2000,
    })
    expect(markSent(2000, null, baseState, "window")).toMatchObject({
      at: 2000,
      combatEdgeAt: 0,
      motionEdgeAt: 0,
    })
  })
})
