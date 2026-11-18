// Send-rate gate for `rage-move` WebSocket messages (each send costs hosting
// quota). Movement goes out at most every 200 ms (≤ 5 msg/s); peers draw the
// gaps by dead reckoning on the velocity we send (rage-smoothing.ts).
//
// Discrete edges skip that window, because dead reckoning gets them wrong:
// a punch starting or ending and hp changing (peers judge hits from them), and
// starting, stopping or turning (otherwise the peer glides on for 200 ms, then
// snaps back). Combat edges (punch, hp) and motion edges each get one bypass
// per EDGE_INTERVAL_MS: separate, so steering never delays a punch, and
// capped, so mashing keys can't turn the bypass into a quota leak. Every send
// keeps MIN_GAP_MS, just above the server's 30 ms per-connection drop window, so an
// edge is never silently discarded. Idle fighters heartbeat at 1000 ms so
// peers never hit their 3 s (STALE_MS) drop timeout.

export const SEND_INTERVAL_MS = 200
export const MIN_GAP_MS = 40
export const EDGE_INTERVAL_MS = 250
export const HEARTBEAT_INTERVAL_MS = 1000
// Ring units per ms. A held key settles near 6e-4; under a tenth of that the
// fighter is coasting to a halt and reads as stopped.
export const MOVING_SPEED = 6e-5
// Turning by more than this since the last send is a direction change.
const TURN_COS = Math.cos(Math.PI / 4)

export type RageMoveState = {
  x: number
  y: number
  punching: boolean
  hp: number
  // Velocity in ring units per ms; sent so peers can dead-reckon.
  vx: number
  vy: number
}

export type LastSent = {
  at: number
  // When the last combat / motion edge bypassed the window; 0 before any.
  combatEdgeAt: number
  motionEdgeAt: number
} & RageMoveState

export type SendDecision = false | "window" | "combat-edge" | "motion-edge"

const speed = (s: { vx: number; vy: number }) => Math.hypot(s.vx, s.vy)

export const isMotionEdge = (last: RageMoveState, next: RageMoveState) => {
  const wasMoving = speed(last) >= MOVING_SPEED
  const isMoving = speed(next) >= MOVING_SPEED
  if (wasMoving !== isMoving) return true
  if (!isMoving) return false
  const cos =
    (last.vx * next.vx + last.vy * next.vy) / (speed(last) * speed(next))
  return cos < TURN_COS
}

/**
 * Decides whether the animation loop should emit a `rage-move` now, and
 * which edge budget that send spends (record it with `markSent`). `last` is the state last sent, null before the first send.
 * Movement changed inside the 200 ms window is withheld and emitted on the
 * first frame at/after the window's end, so the newest position always gets
 * out.
 */
export function decideRageMove(
  now: number,
  last: LastSent | null,
  next: RageMoveState,
): SendDecision {
  if (last === null) return "window"

  const timeSinceLastSend = now - last.at

  const combatEdge = last.punching !== next.punching || last.hp !== next.hp
  const motionEdge = isMotionEdge(last, next)
  if (timeSinceLastSend >= MIN_GAP_MS) {
    if (combatEdge && now - last.combatEdgeAt >= EDGE_INTERVAL_MS)
      return "combat-edge"
    if (motionEdge && now - last.motionEdgeAt >= EDGE_INTERVAL_MS)
      return "motion-edge"
  }
  const edgeChanged = combatEdge || motionEdge

  const stateChanged = edgeChanged || last.x !== next.x || last.y !== next.y

  const punchingRequiresSend =
    next.punching && timeSinceLastSend >= SEND_INTERVAL_MS

  const changedAndWindowElapsed =
    stateChanged && timeSinceLastSend >= SEND_INTERVAL_MS

  const heartbeatDue =
    !stateChanged && timeSinceLastSend >= HEARTBEAT_INTERVAL_MS

  return punchingRequiresSend || changedAndWindowElapsed || heartbeatDue
    ? "window"
    : false
}

export function shouldSendRageMove(
  now: number,
  last: LastSent | null,
  next: RageMoveState,
): boolean {
  return decideRageMove(now, last, next) !== false
}

/** The `LastSent` to keep after sending `next` under `decision`. */
export const markSent = (
  now: number,
  last: LastSent | null,
  next: RageMoveState,
  decision: Exclude<SendDecision, false>,
): LastSent => ({
  ...next,
  at: now,
  combatEdgeAt: decision === "combat-edge" ? now : (last?.combatEdgeAt ?? 0),
  motionEdgeAt: decision === "motion-edge" ? now : (last?.motionEdgeAt ?? 0),
})
