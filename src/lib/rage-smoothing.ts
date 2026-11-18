// Draws remote fighters between their 5 Hz `rage` packets. Each remote is
// dead-reckoned from its last sample (position + velocity × time since it
// arrived), and the drawn position eases toward that prediction so a fresh
// packet corrects the course without a visible snap. No render delay is
// added, unlike buffered interpolation, which would trail by a whole interval.
// Pure: every call takes the clock as `now`.

import { SEND_INTERVAL_MS } from "@/lib/rage-move-throttle"

export type RemoteSample = {
  x: number
  y: number
  at: number
  // Sender's velocity in ring units per ms. Absent from older clients, in
  // which case it is estimated from the last two samples.
  vx?: number
  vy?: number
}

type Point = { x: number; y: number }

type Track = {
  last: RemoteSample
  velocity: Point
  drawn: Point | null
  drawnAt: number
}

export type RemoteSmoother = Map<string, Track>

// Fighters are kept this far inside the ring edge (rage-arena.tsx).
export const RING_EDGE = 0.06
// Full-speed prediction for one send interval; after that a packet is late,
// so velocity eases to zero over DECAY_MS rather than gliding on.
export const DECAY_MS = SEND_INTERVAL_MS / 2
export const MAX_EXTRAPOLATE_MS = SEND_INTERVAL_MS + DECAY_MS
// Time constant of the correction ease toward the prediction.
export const EASE_MS = 40
// A gap this large (respawn, restart, tab wake) is a jump, not motion.
export const SNAP_DISTANCE = 0.25
// Samples further apart than this say nothing about current velocity.
const MAX_VELOCITY_GAP_MS = SEND_INTERVAL_MS * 3
// Faster than any fighter can move (≈ 6e-4 at full tilt): a bad value.
const MAX_SPEED = 3e-3

export const createRemoteSmoother = (): RemoteSmoother => new Map()

const ZERO: Point = { x: 0, y: 0 }

const capSpeed = (v: Point): Point => {
  const s = Math.hypot(v.x, v.y)
  return s > MAX_SPEED
    ? { x: (v.x / s) * MAX_SPEED, y: (v.y / s) * MAX_SPEED }
    : v
}

export const recordSample = (
  smoother: RemoteSmoother,
  id: string,
  sample: RemoteSample,
) => {
  const sent =
    Number.isFinite(sample.vx) && Number.isFinite(sample.vy)
      ? { x: sample.vx as number, y: sample.vy as number }
      : null
  const track = smoother.get(id)
  if (!track) {
    smoother.set(id, {
      last: sample,
      velocity: capSpeed(sent ?? ZERO),
      drawn: null,
      drawnAt: 0,
    })
    return
  }
  if (sample.at <= track.last.at) return
  const dt = sample.at - track.last.at
  const dx = sample.x - track.last.x
  const dy = sample.y - track.last.y
  const jump = Math.hypot(dx, dy)
  track.velocity = capSpeed(
    sent ??
      // A heartbeat that didn't move means stopped, whatever came before.
      (jump === 0 || dt > MAX_VELOCITY_GAP_MS || jump >= SNAP_DISTANCE
        ? ZERO
        : { x: dx / dt, y: dy / dt }),
  )
  if (jump >= SNAP_DISTANCE) track.drawn = null
  track.last = sample
}

export const forgetRemote = (smoother: RemoteSmoother, id: string) => {
  smoother.delete(id)
}

const clampRing = (n: number) => Math.max(RING_EDGE, Math.min(1 - RING_EDGE, n))

// Distance covered after `elapsed` ms at unit speed: full speed for one send
// interval, then a linear slowdown to a halt over DECAY_MS.
const travel = (elapsed: number) => {
  const t = Math.max(0, elapsed)
  if (t <= SEND_INTERVAL_MS) return t
  const late = Math.min(t - SEND_INTERVAL_MS, DECAY_MS)
  return SEND_INTERVAL_MS + late - (late * late) / (2 * DECAY_MS)
}

export const predictPosition = (track: Track, now: number): Point => {
  const d = travel(now - track.last.at)
  return {
    x: clampRing(track.last.x + track.velocity.x * d),
    y: clampRing(track.last.y + track.velocity.y * d),
  }
}

/**
 * Where to draw `id` this frame. Call once per frame per remote: it advances
 * the eased position. Returns null for a remote with no sample yet.
 */
export const renderPosition = (
  smoother: RemoteSmoother,
  id: string,
  now: number,
): Point | null => {
  const track = smoother.get(id)
  if (!track) return null
  const target = predictPosition(track, now)
  if (!track.drawn) {
    track.drawn = target
    track.drawnAt = now
    return { ...target }
  }
  const dt = Math.max(0, now - track.drawnAt)
  const k = 1 - Math.exp(-dt / EASE_MS)
  track.drawn = {
    x: track.drawn.x + (target.x - track.drawn.x) * k,
    y: track.drawn.y + (target.y - track.drawn.y) * k,
  }
  track.drawnAt = now
  return { ...track.drawn }
}
