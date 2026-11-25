import { useEffect, useState } from "react"
import { ANNOUNCE_DWELL_MS } from "@/lib/announcement-dwell"

// What the dealer is saying in the status line above the hand.
export type DealerLine = {
  emoji: string
  title: string
  // Only small talk keeps its sub, on the same line as the title.
  sub?: string
}

// Two layers: the reveal line holds for the whole revealed state; any other
// line passes over it for the dwell, then hands back.
export const createDealerLine = (
  onChange: (line: DealerLine | null) => void,
  dwellMs: number = ANNOUNCE_DWELL_MS.default,
) => {
  let held: DealerLine | null = null
  let passing: DealerLine | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const clear = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  const emit = () => onChange(passing ?? held)

  return {
    say(line: DealerLine) {
      passing = line
      clear()
      timer = setTimeout(() => {
        passing = null
        timer = null
        emit()
      }, dwellMs)
      emit()
    },
    hold(line: DealerLine | null) {
      held = line
      if (line) {
        passing = null
        clear()
      }
      emit()
    },
    dispose: clear,
  }
}

// `seq` counts every line that lands, so the dealer can bob once per line.
export const useDealerLine = () => {
  const [state, setState] = useState<{ line: DealerLine | null; seq: number }>({
    line: null,
    seq: 0,
  })
  const [controller] = useState(() =>
    createDealerLine((line) =>
      setState((s) => ({ line, seq: line ? s.seq + 1 : s.seq })),
    ),
  )
  useEffect(() => controller.dispose, [controller])
  return { ...state, say: controller.say, hold: controller.hold }
}
