"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { playClink } from "@/lib/sounds"

const PIXEL = 5
const WALK_SPEED = 14
const PAUSE_SECONDS = 2.4
const FRAME_MS = 140
const STOP_AT = 36

const SKIN = "#e8b88a"
const HAIR = "#1c1917"
const JACKET = "#f1f5f9"
const TROUSERS = "#1b2030"
const TRAY = "#52525b"
const CUP = "#fffdf7"
const COFFEE = "#7c4a1e"
const STEAM = "#cbd5e1"
const SHOE = "#0a0c12"

const BODY_PIXELS: Array<[number, number, number, number, string]> = [
  [4, 0, 4, 1, HAIR],
  [3, 1, 6, 1, HAIR],
  [4, 2, 4, 3, SKIN],
  [6, 3, 1, 1, HAIR],
  [3, 5, 6, 7, JACKET],
  [5, 5, 1, 1, TROUSERS],
  [9, 7, 1, 1, JACKET],
  [10, 7, 1, 1, SKIN],
  [8, 8, 6, 1, TRAY],
  [11, 6, 2, 2, CUP],
  [11, 6, 2, 1, COFFEE],
  [4, 12, 4, 2, TROUSERS],
]

const LEG_FRAMES: Array<Array<[number, number, number, number, string]>> = [
  [
    [4, 14, 1, 3, TROUSERS],
    [7, 14, 1, 3, TROUSERS],
    [3, 17, 2, 1, SHOE],
    [7, 17, 2, 1, SHOE],
  ],
  [
    [5, 14, 1, 3, TROUSERS],
    [6, 14, 1, 3, TROUSERS],
    [5, 17, 1, 1, SHOE],
    [6, 17, 2, 1, SHOE],
  ],
]

const STEAM_FRAMES: Array<Array<[number, number, number, number, string]>> = [
  [
    [11, 4, 1, 1, STEAM],
    [12, 3, 1, 1, STEAM],
  ],
  [
    [12, 4, 1, 1, STEAM],
    [11, 3, 1, 1, STEAM],
  ],
]

const WaiterSprite = ({ frame }: { frame: number }) => (
  <svg
    width={15 * PIXEL}
    height={18 * PIXEL}
    viewBox="0 0 15 18"
    shapeRendering="crispEdges"
    aria-hidden
  >
    {[...BODY_PIXELS, ...LEG_FRAMES[frame], ...STEAM_FRAMES[frame]].map(
      ([x, y, w, h, fill], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
      ),
    )}
  </svg>
)

type Phase = "in" | "pause" | "out"

export const PixelWaiter = ({
  active,
  onDone,
}: {
  active: boolean
  onDone: () => void
}) => {
  const [phase, setPhase] = useState<Phase | null>(null)
  const [frame, setFrame] = useState(0)
  const clinked = useRef(false)

  useEffect(() => {
    if (active && !phase) {
      clinked.current = false
      setPhase("in")
    }
  }, [active, phase])

  const walking = phase === "in" || phase === "out"

  useEffect(() => {
    if (!walking) return
    const timer = setInterval(() => setFrame((f) => f ^ 1), FRAME_MS)
    return () => clearInterval(timer)
  }, [walking])

  useEffect(() => {
    if (phase !== "pause") return
    if (!clinked.current) {
      clinked.current = true
      playClink()
    }
    const timer = setTimeout(() => setPhase("out"), PAUSE_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [phase])

  if (!phase) return null

  const target = phase === "in" ? STOP_AT : phase === "pause" ? STOP_AT : 108
  const duration =
    phase === "in"
      ? (STOP_AT + 8) / WALK_SPEED
      : phase === "pause"
        ? 0
        : (108 - STOP_AT) / WALK_SPEED

  return (
    <motion.div
      className="absolute bottom-[6%] z-20 hidden md:block pointer-events-none"
      initial={{ left: "-8%" }}
      animate={{ left: `${target}%` }}
      transition={{ duration, ease: "linear" }}
      onAnimationComplete={() => {
        if (phase === "in") setPhase("pause")
        if (phase === "out") {
          setPhase(null)
          onDone()
        }
      }}
    >
      <AnimatePresence>
        {phase === "pause" && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-yellow-500/40 bg-[#10131f]/95 px-3 py-1.5 text-xs text-yellow-100"
          >
            ☕ Room service.
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        animate={walking ? { y: [0, -1, 0] } : { y: 0 }}
        transition={
          walking ? { duration: 0.32, repeat: Infinity, ease: "easeInOut" } : {}
        }
      >
        <WaiterSprite frame={walking ? frame : 0} />
      </motion.div>
    </motion.div>
  )
}
