import { describe, it, expect } from "vitest"
import {
  createRemoteSmoother,
  forgetRemote,
  predictPosition,
  recordSample,
  renderPosition,
  DECAY_MS,
  EASE_MS,
  RING_EDGE,
  SNAP_DISTANCE,
  type RemoteSmoother,
} from "@/lib/rage-smoothing"
import { SEND_INTERVAL_MS } from "@/lib/rage-move-throttle"

const V = 0.5 / 1000 // 0.5 ring units per second, in units per ms

// A remote moving +x, sending its velocity, sampled every 200 ms.
const moving = () => {
  const s = createRemoteSmoother()
  recordSample(s, "a", { x: 0.3, y: 0.5, at: 0, vx: V, vy: 0 })
  recordSample(s, "a", { x: 0.4, y: 0.5, at: 200, vx: V, vy: 0 })
  return s
}

// Render every 16 ms from `from` to `to`, returning the last x.
const run = (s: RemoteSmoother, from: number, to: number) => {
  let x = NaN
  for (let t = from; t <= to; t += 16) x = renderPosition(s, "a", t)!.x
  return x
}

describe("rage smoothing", () => {
  it("returns null for a remote it has never heard from", () => {
    expect(renderPosition(createRemoteSmoother(), "a", 0)).toBeNull()
  })

  it("draws the first sample exactly where it was sent", () => {
    const s = createRemoteSmoother()
    recordSample(s, "a", { x: 0.3, y: 0.7, at: 100 })
    expect(renderPosition(s, "a", 100)).toEqual({ x: 0.3, y: 0.7 })
  })

  // Regression: remotes were drawn at the raw last packet, so between 5 Hz
  // packets they froze and then jumped ~0.1 (more than HIT_RANGE).
  it("keeps a moving remote moving between packets", () => {
    const s = moving()
    const frames = [200, 216, 233, 250, 266, 283, 300].map(
      (t) => renderPosition(s, "a", t)!.x,
    )
    for (let i = 1; i < frames.length; i++)
      expect(frames[i]).toBeGreaterThan(frames[i - 1])
    // 100 ms after the packet, the prediction is 0.45; the ease trails a bit.
    expect(frames.at(-1)).toBeGreaterThan(0.43)
    expect(frames.at(-1)).toBeLessThanOrEqual(0.45)
  })

  it("estimates velocity from samples when an older client sends none", () => {
    const s = createRemoteSmoother()
    recordSample(s, "a", { x: 0.3, y: 0.5, at: 0 })
    recordSample(s, "a", { x: 0.4, y: 0.5, at: 200 })
    expect(renderPosition(s, "a", 200)!.x).toBeCloseTo(0.4)
    expect(run(s, 216, 300)).toBeGreaterThan(0.43)
  })

  it("stops gliding at the extrapolation cap when packets stop coming", () => {
    const s = moving()
    const x = run(s, 200, 2000)
    // Full speed for one interval, then half that distance again while it
    // slows to a halt over DECAY_MS.
    expect(x).toBeCloseTo(0.4 + V * (SEND_INTERVAL_MS + DECAY_MS / 2), 3)
  })

  it("slows down, not just stops, once a packet is overdue", () => {
    const track = moving().get("a")!
    const step = (t: number) =>
      predictPosition(track, t + 10).x - predictPosition(track, t).x
    expect(step(200 + 50)).toBeCloseTo(V * 10, 6)
    expect(step(200 + SEND_INTERVAL_MS + DECAY_MS / 2)).toBeLessThan(V * 10)
    expect(step(200 + SEND_INTERVAL_MS + DECAY_MS + 5)).toBe(0)
  })

  // Stop overshoot: a stop sample carries v = 0, so the remote halts where it
  // stopped instead of gliding on and snapping back.
  it("does not overshoot a fighter that stopped", () => {
    const s = moving()
    run(s, 200, 280)
    recordSample(s, "a", { x: 0.43, y: 0.5, at: 280, vx: 0, vy: 0 })
    expect(run(s, 296, 900)).toBeCloseTo(0.43, 3)
  })

  it("treats a heartbeat that didn't move as stopped", () => {
    const s = createRemoteSmoother()
    recordSample(s, "a", { x: 0.3, y: 0.5, at: 0 })
    recordSample(s, "a", { x: 0.4, y: 0.5, at: 200 })
    recordSample(s, "a", { x: 0.4, y: 0.5, at: 1200 })
    expect(run(s, 1200, 1600)).toBeCloseTo(0.4, 3)
  })

  it("follows a direction flip without snapping", () => {
    const s = moving()
    run(s, 200, 296) // drawn ≈ 0.44, heading +x
    recordSample(s, "a", { x: 0.44, y: 0.5, at: 300, vx: -V, vy: 0 })
    const before = renderPosition(s, "a", 300)!.x
    const first = renderPosition(s, "a", 316)!.x
    expect(Math.abs(first - before)).toBeLessThan(V * 16 * 2)
    // Settles on the new course: 0.44 minus the capped prediction.
    const x = run(s, 332, 300 + EASE_MS * 15)
    expect(x).toBeCloseTo(0.44 - V * (SEND_INTERVAL_MS + DECAY_MS / 2), 3)
  })

  it("snaps when the remote jumps further than any step could explain", () => {
    const s = moving()
    renderPosition(s, "a", 200)
    const far = 0.4 + SNAP_DISTANCE + 0.05
    recordSample(s, "a", { x: far, y: 0.5, at: 400, vx: 0, vy: 0 })
    expect(renderPosition(s, "a", 400)).toEqual({ x: far, y: 0.5 })
  })

  it("ignores a sample no newer than the last one", () => {
    const s = moving()
    recordSample(s, "a", { x: 0.9, y: 0.9, at: 200 })
    expect(renderPosition(s, "a", 200)).toEqual({ x: 0.4, y: 0.5 })
  })

  it("never draws a fighter outside the ring", () => {
    const s = createRemoteSmoother()
    recordSample(s, "a", { x: 0.93, y: 0.5, at: 0, vx: V, vy: 0 })
    expect(run(s, 0, 600)).toBeLessThanOrEqual(1 - RING_EDGE)
  })

  it("caps an absurd sent velocity", () => {
    const s = createRemoteSmoother()
    recordSample(s, "a", { x: 0.5, y: 0.5, at: 0, vx: 1, vy: 0 })
    expect(run(s, 0, 16)).toBeLessThan(0.6)
  })

  it("forgets a remote that left", () => {
    const s = moving()
    forgetRemote(s, "a")
    expect(renderPosition(s, "a", 300)).toBeNull()
  })
})
