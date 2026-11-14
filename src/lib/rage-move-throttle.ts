// Send-rate gate for `rage-move` WebSocket messages (each send costs hosting
// quota). 200 ms keeps the wire at ≤ 5 msg/s while staying well inside the
// 400 ms window peers use to count a remote punch as live. Idle fighters
// heartbeat at 1000 ms so peers never hit their 3 s (STALE_MS) drop timeout.

export const SEND_INTERVAL_MS = 200
export const HEARTBEAT_INTERVAL_MS = 1000

export type RageMoveState = {
  x: number
  y: number
  punching: boolean
  hp: number
}

export type LastSent = {
  at: number
} & RageMoveState

/**
 * Decides whether the animation loop should emit a `rage-move` now.
 * `last` is the state last sent with its send timestamp, null before the
 * first send. When state changed inside the 200 ms window the send is
 * withheld here and emitted on the first frame at/after the window's end
 * (trailing edge), so the newest position / punching:false / final hp always
 * gets out.
 */
export function shouldSendRageMove(
  now: number,
  last: LastSent | null,
  next: RageMoveState,
): boolean {
  if (last === null) return true

  const timeSinceLastSend = now - last.at

  const stateChanged =
    last.x !== next.x ||
    last.y !== next.y ||
    last.punching !== next.punching ||
    last.hp !== next.hp

  const punchingRequiresSend =
    next.punching && timeSinceLastSend >= SEND_INTERVAL_MS

  const changedAndWindowElapsed =
    stateChanged && timeSinceLastSend >= SEND_INTERVAL_MS

  const heartbeatDue =
    !stateChanged && timeSinceLastSend >= HEARTBEAT_INTERVAL_MS

  return punchingRequiresSend || changedAndWindowElapsed || heartbeatDue
}
