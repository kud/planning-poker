import { describe, it, expect } from "vitest"
import {
  shouldSendRageMove,
  SEND_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS,
  type LastSent,
  type RageMoveState,
} from "@/lib/rage-move-throttle"

const baseState: RageMoveState = { x: 0.5, y: 0.5, punching: false, hp: 100 }

const makeLast = (overrides: Partial<LastSent> = {}): LastSent => ({
  at: 1000,
  x: 0.5,
  y: 0.5,
  punching: false,
  hp: 100,
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
})
