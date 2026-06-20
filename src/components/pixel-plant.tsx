"use client"

import { useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const PIXEL = 5
const BIRD_PIXEL = 4

// Palette — layered greens + terracotta, with a near-black outline that gives
// the sprite its crisp pixel-art identity (see the reference set).
const C: Record<string, string> = {
  o: "#1b1714", // outline
  g: "#2f9e44", // leaf
  d: "#1d7a34", // leaf shadow
  l: "#51cf66", // leaf highlight (spine)
  p: "#c2722e", // pot
  P: "#d98a45", // pot rim / highlight
  D: "#9a5418", // pot shadow / foot
  s: "#3a2a1f", // soil
}

const W = 17
const H = 23

// A fan of upright blades (snake-plant / agave). Each blade is a tapered leaf
// from its tip down into the pot; tips fan out, bases converge.
const BLADES: Array<{ tip: [number, number]; hw: number }> = [
  { tip: [8, 0], hw: 1.6 },
  { tip: [5, 2], hw: 1.5 },
  { tip: [11, 2], hw: 1.5 },
  { tip: [2, 5], hw: 1.4 },
  { tip: [14, 5], hw: 1.4 },
  { tip: [1, 9], hw: 1.3 },
  { tip: [15, 9], hw: 1.3 },
]
const BASE: [number, number] = [8, 16]

// Pot drawn as horizontal runs: [y, x0, x1, colour]. Soil first, then a rim,
// a tapering body, and a slightly wider foot.
const POT: Array<[number, number, number, string]> = [
  [16, 4, 12, "s"],
  [17, 3, 13, "P"],
  [18, 3, 13, "p"],
  [19, 4, 12, "p"],
  [20, 4, 12, "p"],
  [21, 5, 11, "p"],
  [22, 4, 12, "D"],
]

const buildGrid = () => {
  const grid: (string | null)[][] = Array.from({ length: H }, () =>
    Array<string | null>(W).fill(null),
  )

  for (const { tip, hw } of BLADES) {
    const [tx, ty] = tip
    const [bx, by] = BASE
    const steps = by - ty
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const cx = tx + (bx - tx) * t
      const y = ty + i
      const halfW = hw * Math.sin(t * Math.PI) + 0.3
      const x0 = Math.round(cx - halfW)
      const x1 = Math.round(cx + halfW)
      const spine = Math.round(cx)
      for (let x = x0; x <= x1; x++) {
        if (x < 0 || x >= W || y < 0 || y >= H) continue
        grid[y][x] = x === spine ? "l" : x === x1 ? "d" : "g"
      }
    }
  }

  for (const [y, x0, x1, c] of POT) {
    for (let x = x0; x <= x1; x++) grid[y][x] = c
  }

  return grid
}

const withOutline = (grid: (string | null)[][]) => {
  const filled = (x: number, y: number) =>
    x >= 0 &&
    x < W &&
    y >= 0 &&
    y < H &&
    grid[y][x] !== null &&
    grid[y][x] !== "o"
  const out = grid.map((row) => row.slice())
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (grid[y][x] !== null) continue
      let touches = false
      for (let dy = -1; dy <= 1 && !touches; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (filled(x + dx, y + dy)) {
            touches = true
            break
          }
        }
      if (touches) out[y][x] = "o"
    }
  }
  return out
}

// Run-length encode each row into horizontal rects to keep the SVG light.
const toRects = (grid: (string | null)[][]) => {
  const rects: Array<[number, number, number, string]> = []
  for (let y = 0; y < H; y++) {
    let x = 0
    while (x < W) {
      const c = grid[y][x]
      if (!c) {
        x++
        continue
      }
      let w = 1
      while (x + w < W && grid[y][x + w] === c) w++
      rects.push([x, y, w, C[c]])
      x += w
    }
  }
  return rects
}

const RECTS = toRects(withOutline(buildGrid()))

// A tiny pixel bird that lives in the foliage until the plant is poked. Drawn
// the same way as the plant — char rows run-length encoded into rects.
const BIRD_PALETTE: Record<string, string> = {
  o: "#1b1714", // outline
  B: "#4dabf7", // body
  w: "#1c7ed6", // folded wing
  e: "#ffffff", // eye
  k: "#f59f00", // beak
}

const BIRD_ROWS = [
  "...ooo....",
  "..oBBBo...",
  ".oBBBBBo..",
  "oBBBwwBBek",
  "oBBBwwBBo.",
  ".oBBBBBo..",
  "..ooooo...",
  "...o.o....",
]

const BIRD_W = BIRD_ROWS[0].length
const BIRD_H = BIRD_ROWS.length

const birdRects = () => {
  const rects: Array<[number, number, number, string]> = []
  BIRD_ROWS.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      if (ch === ".") {
        x++
        continue
      }
      let w = 1
      while (x + w < row.length && row[x + w] === ch) w++
      rects.push([x, y, w, BIRD_PALETTE[ch]])
      x += w
    }
  })
  return rects
}

const BIRD_RECTS = birdRects()

const PixelBird = ({ onDone }: { onDone: () => void }) => (
  <motion.div
    className="pointer-events-none absolute left-1/3 top-0"
    initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
    animate={{ x: 26, y: -112, opacity: [0, 1, 1, 0], scale: 1, rotate: -14 }}
    transition={{
      duration: 1.2,
      ease: "easeOut",
      opacity: { duration: 1.2, times: [0, 0.15, 0.7, 1] },
    }}
    onAnimationComplete={onDone}
  >
    <motion.svg
      width={BIRD_W * BIRD_PIXEL}
      height={BIRD_H * BIRD_PIXEL}
      viewBox={`0 0 ${BIRD_W} ${BIRD_H}`}
      shapeRendering="crispEdges"
      animate={{ scaleY: [1, 0.78, 1] }}
      transition={{ duration: 0.22, repeat: Infinity, ease: "easeInOut" }}
    >
      {BIRD_RECTS.map(([x, y, w, fill], i) => (
        <rect key={i} x={x} y={y} width={w} height={1} fill={fill} />
      ))}
    </motion.svg>
  </motion.div>
)

export const PixelPlant = ({ className = "" }: { className?: string }) => {
  const [birds, setBirds] = useState<number[]>([])
  const nextId = useRef(0)

  const releaseBird = () =>
    setBirds((current) => [...current, nextId.current++])

  return (
    <div className={`absolute ${className}`}>
      <AnimatePresence>
        {birds.map((id) => (
          <PixelBird
            key={id}
            onDone={() =>
              setBirds((current) => current.filter((b) => b !== id))
            }
          />
        ))}
      </AnimatePresence>
      <motion.button
        type="button"
        onClick={releaseBird}
        whileHover={{ rotate: [-2.5, 2.5, -2.5] }}
        whileTap={{ scaleY: 0.86, scaleX: 1.07 }}
        transition={{
          rotate: { duration: 0.6, repeat: Infinity, ease: "easeInOut" },
          default: { type: "spring", stiffness: 400, damping: 14 },
        }}
        style={{ transformOrigin: "bottom center" }}
        className="block cursor-pointer focus-visible:outline-none"
        aria-label="Poke the plant"
        title="psst… poke me"
      >
        <svg
          width={W * PIXEL}
          height={H * PIXEL}
          viewBox={`0 0 ${W} ${H}`}
          shapeRendering="crispEdges"
        >
          {RECTS.map(([x, y, w, fill], i) => (
            <rect key={i} x={x} y={y} width={w} height={1} fill={fill} />
          ))}
        </svg>
      </motion.button>
    </div>
  )
}
