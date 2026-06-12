"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { playPurr, playScamper } from "@/lib/sounds"

const PIXEL = 3
const WALK_SPEED = 6
const FLEE_SPEED = 30
const SNIFF_SECONDS = 1.7
const PURR_SECONDS = 2
const FRAME_MS = 150
const FLEE_FRAME_MS = 80

const BODY_PIXELS: Array<[number, number, number, number, string]> = [
  [9, 0, 1, 1, "#d97706"],
  [12, 0, 1, 1, "#d97706"],
  [9, 1, 5, 4, "#f59e0b"],
  [10, 1, 1, 1, "#fbbf24"],
  [12, 2, 1, 1, "#1c1917"],
  [13, 4, 1, 1, "#fda4af"],
  [2, 4, 10, 4, "#f59e0b"],
  [3, 5, 3, 2, "#fbbf24"],
  [1, 3, 1, 1, "#d97706"],
  [0, 2, 1, 1, "#d97706"],
]

const LEG_FRAMES: Array<Array<[number, number, number, number, string]>> = [
  [
    [3, 8, 1, 2, "#d97706"],
    [6, 8, 1, 2, "#f59e0b"],
    [9, 8, 1, 2, "#d97706"],
    [12, 8, 1, 2, "#f59e0b"],
  ],
  [
    [4, 8, 1, 2, "#f59e0b"],
    [5, 8, 1, 2, "#d97706"],
    [10, 8, 1, 2, "#f59e0b"],
    [11, 8, 1, 2, "#d97706"],
  ],
]

const CatSprite = ({ flipped, frame }: { flipped: boolean; frame: number }) => (
  <svg
    width={14 * PIXEL}
    height={10 * PIXEL}
    viewBox="0 0 14 10"
    shapeRendering="crispEdges"
    style={{ transform: flipped ? "scaleX(-1)" : undefined }}
    aria-hidden
  >
    {[...BODY_PIXELS, ...LEG_FRAMES[frame]].map(([x, y, w, h, fill], i) => (
      <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
    ))}
  </svg>
)

type Segment = {
  kind: "walk" | "sniff" | "purr" | "flee"
  target: number
  duration: number
}

const buildStroll = (direction: 1 | -1): Segment[] => {
  const start = direction === 1 ? -6 : 104
  const end = direction === 1 ? 104 : -6
  const stopCount = 1 + Math.floor(Math.random() * 2)
  const stops = Array.from(
    { length: stopCount },
    () => 15 + Math.random() * 70,
  ).sort((a, b) => (direction === 1 ? a - b : b - a))

  const waypoints = [start, ...stops, end]
  const segments: Segment[] = []
  for (let i = 1; i < waypoints.length; i++) {
    segments.push({
      kind: "walk",
      target: waypoints[i],
      duration: Math.abs(waypoints[i] - waypoints[i - 1]) / WALK_SPEED,
    })
    if (i < waypoints.length - 1) {
      segments.push({
        kind: "sniff",
        target: waypoints[i],
        duration: SNIFF_SECONDS,
      })
    }
  }
  return segments
}

type Stroll = { direction: 1 | -1; segments: Segment[]; id: number }

export const PixelPet = () => {
  const [stroll, setStroll] = useState<Stroll | null>(null)
  const [segIndex, setSegIndex] = useState(0)
  const [frame, setFrame] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (stroll) return
    const delay = (15 + Math.random() * 45) * 1000
    const timer = setTimeout(() => {
      const direction = Math.random() > 0.5 ? 1 : -1
      setStroll({ direction, segments: buildStroll(direction), id: Date.now() })
      setSegIndex(0)
    }, delay)
    return () => clearTimeout(timer)
  }, [stroll])

  const segment = stroll?.segments[segIndex]
  const moving = segment?.kind === "walk" || segment?.kind === "flee"
  const fleeing = segment?.kind === "flee"

  useEffect(() => {
    if (!moving) return
    const timer = setInterval(
      () => setFrame((f) => f ^ 1),
      fleeing ? FLEE_FRAME_MS : FRAME_MS,
    )
    return () => clearInterval(timer)
  }, [moving, fleeing])

  if (!stroll || !segment) return null

  const currentPercent = () => {
    const el = wrapperRef.current
    const parent = el?.offsetParent as HTMLElement | null
    if (!el || !parent) return 50
    return (el.offsetLeft / parent.clientWidth) * 100
  }

  const handleClick = () => {
    if (segment.kind === "purr" || segment.kind === "flee") return
    const here = currentPercent()
    if (Math.random() < 2 / 3) {
      playPurr()
      const rest = stroll.segments
        .slice(segIndex)
        .filter((s) => s.kind === "walk")
      setStroll({
        ...stroll,
        segments: [
          { kind: "purr", target: here, duration: PURR_SECONDS },
          ...(rest.length > 0
            ? rest
            : [
                {
                  kind: "walk" as const,
                  target: stroll.direction === 1 ? 104 : -6,
                  duration: 4,
                },
              ]),
        ],
      })
      setSegIndex(0)
    } else {
      playScamper()
      const exit = stroll.direction === 1 ? 108 : -10
      setStroll({
        ...stroll,
        segments: [
          {
            kind: "flee",
            target: exit,
            duration: Math.abs(exit - here) / FLEE_SPEED,
          },
        ],
      })
      setSegIndex(0)
    }
  }

  const advance = () => {
    if (segIndex + 1 < stroll.segments.length) setSegIndex(segIndex + 1)
    else setStroll(null)
  }

  const sniffTilt = stroll.direction === 1 ? 14 : -14

  return (
    <motion.div
      ref={wrapperRef}
      key={stroll.id}
      className="absolute bottom-[7%] z-0 hidden md:block pointer-events-none"
      initial={{ left: `${stroll.direction === 1 ? -6 : 104}%` }}
      animate={{ left: `${segment.target}%` }}
      transition={{
        duration: segment.duration,
        ease: segment.kind === "flee" ? "easeIn" : "linear",
      }}
      onAnimationComplete={advance}
    >
      <div
        className="pointer-events-auto cursor-pointer relative"
        onClick={handleClick}
      >
        <AnimatePresence>
          {segment.kind === "purr" && (
            <motion.span
              initial={{ opacity: 0, y: 2, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], y: -16, scale: 1 }}
              transition={{ duration: PURR_SECONDS * 0.9 }}
              className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs text-rose-400 select-none"
            >
              ♥
            </motion.span>
          )}
        </AnimatePresence>
        {segment.kind === "sniff" ? (
          <motion.div
            animate={{
              rotate: [0, sniffTilt, 3, sniffTilt, 0],
              y: [0, 2, 0, 2, 0],
            }}
            transition={{ duration: SNIFF_SECONDS, ease: "easeInOut" }}
            style={{ transformOrigin: "bottom center" }}
          >
            <CatSprite flipped={stroll.direction === -1} frame={0} />
          </motion.div>
        ) : segment.kind === "purr" ? (
          <motion.div
            animate={{ x: [0, -0.7, 0.7, 0], y: [0, 0.4, 0] }}
            transition={{ duration: 0.16, repeat: Infinity }}
          >
            <CatSprite flipped={stroll.direction === -1} frame={0} />
          </motion.div>
        ) : (
          <motion.div
            animate={{ y: [0, -1, 0] }}
            transition={{
              duration: fleeing ? 0.18 : 0.3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <CatSprite flipped={stroll.direction === -1} frame={frame} />
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
