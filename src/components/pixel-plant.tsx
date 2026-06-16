"use client"

import { motion } from "framer-motion"

const PIXEL = 5

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

export const PixelPlant = ({
  className = "",
  delay = 0,
}: {
  className?: string
  delay?: number
}) => (
  <motion.div
    className={`pointer-events-none absolute ${className}`}
    animate={{ rotate: [-1.5, 1.5, -1.5] }}
    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
    style={{ transformOrigin: "bottom center" }}
    aria-hidden
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
  </motion.div>
)
