"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import { motion } from "framer-motion"
import { playAhem } from "@/lib/sounds"
import type { DealerLine } from "@/lib/dealer-line"

// A poke replayed from another player: same id only fires once.
export type RemotePoke = { id: number; variant?: string } | null

const SMALL_TALK: Required<DealerLine>[] = [
  {
    emoji: "🎩",
    title: "House rules",
    sub: "Whatever happens at this table stays in the retro.",
  },
  {
    emoji: "🃏",
    title: "Pro tip",
    sub: "A 13 is just a 21 that hasn't met the backend yet.",
  },
  {
    emoji: "🤫",
    title: "Between us",
    sub: "The coffee card never means coffee. It means the meeting ran long.",
  },
  {
    emoji: "♠️",
    title: "I've seen things",
    sub: "Teams estimating in hours. We don't speak of them.",
  },
  {
    emoji: "📐",
    title: "Fibonacci, naturally",
    sub: "Uncertainty grows faster than your sprint does.",
  },
  {
    emoji: "🐈",
    title: "Mind the cat",
    sub: "Judging your velocity. Quietly.",
  },
  {
    emoji: "🎲",
    title: "Fair warning",
    sub: "You can't bluff at planning poker. People still try.",
  },
  {
    emoji: "🤵",
    title: "At your service",
    sub: "Cards shuffled, table clean, opinions ready.",
  },
  {
    emoji: "⏳",
    title: "An observation",
    sub: "The story said 'quick fix'. The story always says that.",
  },
  {
    emoji: "🧠",
    title: "Wisdom",
    sub: "If two engineers agree instantly, one of them didn't read the ticket.",
  },
  {
    emoji: "🍝",
    title: "Tonight's special",
    sub: "Spaghetti. It's always spaghetti under there.",
  },
  {
    emoji: "📞",
    title: "Reminder",
    sub: "'It works on my machine' is not a valid estimate.",
  },
  {
    emoji: "🔮",
    title: "I foresee",
    sub: "This 3-pointer becoming an 8 by Thursday.",
  },
  {
    emoji: "🫠",
    title: "Gentle truth",
    sub: "The definition of done was a group hallucination.",
  },
  {
    emoji: "🦗",
    title: "...",
    sub: "That's the sound of the silence after 'any questions?'",
  },
  {
    emoji: "💼",
    title: "Career advice",
    sub: "Estimate in the morning. Regret in the afternoon.",
  },
  {
    emoji: "🪤",
    title: "Careful",
    sub: "'While we're in there...' has ended more sprints than any bug.",
  },
  {
    emoji: "🧾",
    title: "The fine print",
    sub: "Story points are imaginary. The deadline is not.",
  },
  {
    emoji: "🛟",
    title: "House policy",
    sub: "We don't say 'just'. 'Just' is how the 1 becomes a 5.",
  },
  {
    emoji: "🐘",
    title: "Re: the room",
    sub: "Yes, everyone's also thinking about the legacy migration.",
  },
  {
    emoji: "☕",
    title: "Barista's note",
    sub: "Decaf at standup. We've all seen what the other kind does.",
  },
  {
    emoji: "🎰",
    title: "Odds update",
    sub: "House says someone re-opens this ticket within a fortnight.",
  },
  {
    emoji: "🧶",
    title: "Untangling",
    sub: "'It's just a config change' — famous last words, framed on my wall.",
  },
]

const PIXEL = 6

const SKIN = "#e8b88a"
const HAIR = "#3f2d23"
const TUX = "#1b2030"
const TUX_DARK = "#12161f"
const SHIRT = "#f8fafc"
const TIE = "#b91c1c"
const EYE = "#1c1917"
const SHOE = "#0a0c12"

const DEALER_PIXELS: Array<[number, number, number, number, string]> = [
  [4, 0, 5, 1, HAIR],
  [3, 1, 7, 1, HAIR],
  [3, 2, 1, 2, HAIR],
  [9, 2, 1, 2, HAIR],
  [4, 2, 5, 3, SKIN],
  [5, 3, 1, 1, EYE],
  [7, 3, 1, 1, EYE],
  [5, 5, 3, 1, SKIN],
  [3, 6, 7, 1, TUX],
  [6, 6, 1, 1, SHIRT],
  [2, 7, 9, 1, TUX],
  [5, 7, 3, 1, SHIRT],
  [6, 7, 1, 1, TIE],
  [2, 8, 2, 4, TUX],
  [9, 8, 2, 4, TUX],
  [4, 8, 5, 4, TUX],
  [6, 8, 1, 3, SHIRT],
  [4, 9, 1, 2, TUX_DARK],
  [8, 9, 1, 2, TUX_DARK],
  [2, 12, 1, 1, SKIN],
  [10, 12, 1, 1, SKIN],
  [4, 12, 5, 2, TUX],
  [4, 14, 2, 4, TUX_DARK],
  [7, 14, 2, 4, TUX_DARK],
  [3, 18, 3, 1, SHOE],
  [7, 18, 3, 1, SHOE],
]

export const DealerSprite = () => (
  <svg
    width={13 * PIXEL}
    height={19 * PIXEL}
    viewBox="0 0 13 19"
    shapeRendering="crispEdges"
    aria-hidden
  >
    {DEALER_PIXELS.map(([x, y, w, h, fill], i) => (
      <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
    ))}
  </svg>
)

// The dealer's head (rows 0–6 of the sprite), squared to sit in a line of text.
export const DealerHead = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="3 0 7 7"
    shapeRendering="crispEdges"
    aria-hidden
    className="shrink-0"
  >
    {DEALER_PIXELS.filter(([, y]) => y < 7).map(([x, y, w, h, fill], i) => (
      <rect
        key={i}
        x={x}
        y={y}
        width={w}
        height={Math.min(h, 7 - y)}
        fill={fill}
      />
    ))}
  </svg>
)

// The dealer's line, docked in the status line above the hand.
export const DealerLinePill = ({ line }: { line: DealerLine }) => (
  <motion.p
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.18 }}
    data-testid="dealer-line"
    className="flex min-w-0 max-w-[min(36rem,100%)] items-center gap-2 rounded-full border border-yellow-500/40 bg-[#10131f]/95 px-3 py-1 text-sm"
  >
    <DealerHead />
    <span aria-hidden className="shrink-0 leading-none">
      {line.emoji}
    </span>
    <span className="font-semibold text-yellow-100 truncate">
      {line.sub ? `${line.title} — ${line.sub}` : line.title}
    </span>
  </motion.p>
)

export const PixelDealer = ({
  lineSeq,
  onSmallTalk,
  onPoke,
  remotePoke,
  className = "",
}: {
  // Bumps each time a line lands, so he bobs once per line.
  lineSeq: number
  onSmallTalk: (line: DealerLine) => void
  onPoke?: (variant?: string) => void
  remotePoke?: RemotePoke
  className?: string
}) => {
  const lastQuip = useRef(-1)
  const [bobbedSeq, setBobbedSeq] = useState(lineSeq)
  const bobbing = lineSeq !== bobbedSeq

  // Say a specific quip (so a remote poke makes everyone hear the same line).
  const quipAt = (index: number) => {
    playAhem()
    lastQuip.current = index
    onSmallTalk(SMALL_TALK[index])
  }
  const replayQuip = useEffectEvent(quipAt)

  const speak = () => {
    let index = Math.floor(Math.random() * SMALL_TALK.length)
    if (index === lastQuip.current) index = (index + 1) % SMALL_TALK.length
    quipAt(index)
    onPoke?.(String(index))
  }

  // Replay a poke from another player: same quip, no re-broadcast.
  const lastRemote = useRef(0)
  useEffect(() => {
    if (!remotePoke || remotePoke.id === lastRemote.current) return
    lastRemote.current = remotePoke.id
    const index = Number(remotePoke.variant)
    replayQuip(Number.isInteger(index) && SMALL_TALK[index] ? index : 0)
  }, [remotePoke])

  return (
    <div className={`absolute pointer-events-none ${className}`}>
      <motion.div
        data-prop="dealer"
        onClick={speak}
        className="pointer-events-auto cursor-pointer"
        animate={
          bobbing
            ? { rotate: [0, 7, 7, 0], y: 0 }
            : { y: [0, -1.5, 0], rotate: 0 }
        }
        transition={
          bobbing
            ? { duration: 1.1, times: [0, 0.25, 0.7, 1], ease: "easeInOut" }
            : { duration: 3, repeat: Infinity, ease: "easeInOut" }
        }
        onAnimationComplete={() => {
          if (bobbing) setBobbedSeq(lineSeq)
        }}
        style={{ transformOrigin: "bottom center" }}
      >
        <DealerSprite />
      </motion.div>
    </div>
  )
}
