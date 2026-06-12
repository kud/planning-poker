"use client"

import { motion, AnimatePresence } from "framer-motion"
import type { Announcement } from "@/components/room-view"

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

const DealerSprite = () => (
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

export const PixelDealer = ({
  announcement,
}: {
  announcement: Announcement | null
}) => (
  <div className="absolute -left-[19%] -bottom-[4%] z-10 flex flex-col items-start pointer-events-none">
    <AnimatePresence>
      {announcement && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 340, damping: 24 }}
          className="absolute bottom-full mb-3 w-72"
        >
          <div className="rounded-2xl border border-yellow-500/40 bg-[#10131f]/95 backdrop-blur-md px-4 py-3 shadow-[0_10px_32px_rgba(0,0,0,0.5),0_0_18px_rgba(234,179,8,0.18)]">
            <div className="flex items-start gap-2.5">
              <span className="text-2xl leading-none">
                {announcement.emoji}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-yellow-100 leading-snug">
                  {announcement.title}
                </p>
                <p className="text-xs text-yellow-200/60 italic leading-snug mt-1">
                  {announcement.sub}
                </p>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-1 left-7 w-2.5 h-2.5 rotate-45 border-b border-r border-yellow-500/40 bg-[#10131f]" />
        </motion.div>
      )}
    </AnimatePresence>
    <motion.div
      animate={
        announcement
          ? { rotate: [0, 7, 7, 0], y: 0 }
          : { y: [0, -1.5, 0], rotate: 0 }
      }
      transition={
        announcement
          ? { duration: 1.1, times: [0, 0.25, 0.7, 1], ease: "easeInOut" }
          : { duration: 3, repeat: Infinity, ease: "easeInOut" }
      }
      style={{ transformOrigin: "bottom center" }}
    >
      <DealerSprite />
    </motion.div>
  </div>
)
