"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { playClink } from "@/lib/sounds"
import { cn } from "@/lib/utils"

const PIXEL = 5
const WALK_SPEED = 14
const PAUSE_SECONDS = 2.4
const FRAME_MS = 140
// Stop at the table's near-left edge, not its centre — keeps his speech
// bubble clear of the centred vote result on the felt.
const STOP_AT = 16

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

const WaiterSprite = ({
  frame,
  spilled,
}: {
  frame: number
  spilled?: boolean
}) => {
  // Once spilled, the cup is empty — drop the coffee fill and the rising steam.
  const body = spilled
    ? BODY_PIXELS.filter(([, , , , fill]) => fill !== COFFEE)
    : BODY_PIXELS
  const steam = spilled ? [] : STEAM_FRAMES[frame]
  return (
    <svg
      width={15 * PIXEL}
      height={18 * PIXEL}
      viewBox="0 0 15 18"
      shapeRendering="crispEdges"
      aria-hidden
    >
      {[...body, ...LEG_FRAMES[frame], ...steam].map(
        ([x, y, w, h, fill], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
        ),
      )}
    </svg>
  )
}

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
  const [spilled, setSpilled] = useState(false)
  const clinked = useRef(false)

  useEffect(() => {
    if (active && !phase) {
      clinked.current = false
      setSpilled(false)
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
      // z-[5]: above the felt (z-auto) but below the centred result (z-10),
      // so the tray/bubble never overlaps the vote stats.
      className="absolute bottom-[6%] z-[5] hidden md:block pointer-events-none"
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
            {spilled ? "Oops— my apologies!" : "☕ Room service."}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        // Clickable only while he's standing with the tray — knock the cup over.
        onClick={() => {
          if (phase !== "pause" || spilled) return
          setSpilled(true)
          playClink()
        }}
        className={cn(
          "relative",
          phase === "pause" && !spilled && "pointer-events-auto cursor-pointer",
        )}
        animate={
          spilled
            ? { rotate: [0, -8, 4, 0], y: 0 }
            : walking
              ? { y: [0, -1, 0] }
              : { y: 0 }
        }
        transition={
          spilled
            ? { duration: 0.5, ease: "easeOut" }
            : walking
              ? { duration: 0.32, repeat: Infinity, ease: "easeInOut" }
              : {}
        }
        style={{ transformOrigin: "bottom center" }}
      >
        <WaiterSprite frame={walking ? frame : 0} spilled={spilled} />
        {spilled && (
          <>
            {/* Coffee splashing out of the tipped cup */}
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="absolute rounded-full bg-[#7c4a1e]"
                style={{ width: 4, height: 4, left: 56 + i * 3, top: 32 }}
                initial={{ y: 0, opacity: 1 }}
                animate={{ y: 50, opacity: [1, 1, 0], scaleX: [1, 1.7] }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.08,
                  repeat: Infinity,
                  repeatDelay: 0.6,
                  ease: "easeIn",
                }}
              />
            ))}
            {/* Puddle pooling at his feet */}
            <motion.span
              className="absolute rounded-full bg-[#5b3416]/80 blur-[1px]"
              style={{ left: 40, bottom: 2, height: 6 }}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 30, opacity: 1 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
