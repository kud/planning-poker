import type { RoomState } from "../src/lib/types"
import { VOTE_MASK } from "../src/lib/constants"

export const projectState = (
  state: RoomState,
  viewerId: string | undefined,
): RoomState => {
  if (state.revealed) return state

  return {
    ...state,
    participants: Object.fromEntries(
      Object.entries(state.participants).map(([id, participant]) => [
        id,
        id === viewerId || participant.vote === null
          ? participant
          : { ...participant, vote: VOTE_MASK },
      ]),
    ),
  }
}
