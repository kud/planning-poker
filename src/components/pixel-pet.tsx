"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

const PIXEL = 3
const WALK_SPEED = 6
const SNIFF_SECONDS = 1.7
const FRAME_MS = 150

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

type Segment = { kind: "walk" | "sniff"; target: number; duration: number }

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
  const walking = segment?.kind === "walk"

  useEffect(() => {
    if (!walking) return
    const timer = setInterval(() => setFrame((f) => f ^ 1), FRAME_MS)
    return () => clearInterval(timer)
  }, [walking])

  if (!stroll || !segment) return null

  const advance = () => {
    if (segIndex + 1 < stroll.segments.length) setSegIndex(segIndex + 1)
    else setStroll(null)
  }

  const sniffTilt = stroll.direction === 1 ? 14 : -14

  return (
    <motion.div
      key={stroll.id}
      className="absolute bottom-[7%] z-0 pointer-events-none hidden md:block"
      initial={{ left: `${stroll.direction === 1 ? -6 : 104}%` }}
      animate={{ left: `${segment.target}%` }}
      transition={{ duration: segment.duration, ease: "linear" }}
      onAnimationComplete={advance}
    >
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
      ) : (
        <motion.div
          animate={{ y: [0, -1, 0] }}
          transition={{ duration: 0.3, repeat: Infinity, ease: "easeInOut" }}
        >
          <CatSprite flipped={stroll.direction === -1} frame={frame} />
        </motion.div>
      )}
    </motion.div>
  )
}
