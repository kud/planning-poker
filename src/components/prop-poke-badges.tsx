"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { PropPoke } from "@/hooks/use-party-room"
import type { PropId } from "@/lib/types"

const PROP_EMOJI: Record<PropId, string> = {
  dealer: "🤵",
  cat: "🐱",
  "plant-left": "🌿",
  "plant-right": "🌿",
}

// Where the poked prop currently sits on screen, so the "name" badge can float
// up from it. Props tag their clickable root with data-prop="<id>".
const propPosition = (prop: PropId) => {
  const el = document.querySelector(`[data-prop="${CSS.escape(prop)}"]`)
  const rect = el?.getBoundingClientRect()
  if (!rect || rect.width === 0) return null
  return { x: rect.left + rect.width / 2, y: rect.top }
}

const PokeBadge = ({ poke }: { poke: PropPoke }) => {
  const [origin] = useState(() => propPosition(poke.prop))
  if (!origin) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.6 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [0, -26, -52, -76],
        scale: [0.6, 1, 1, 0.9],
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2.4, ease: "easeOut" }}
      className="fixed z-40 flex -translate-x-1/2 flex-col items-center pointer-events-none"
      style={{ left: origin.x, top: origin.y - 10 }}
    >
      <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <span>{PROP_EMOJI[poke.prop]}</span>
        <span className="max-w-24 truncate">{poke.name}</span>
      </span>
    </motion.div>
  )
}

export const PropPokeBadges = ({ pokes }: { pokes: PropPoke[] }) => (
  <AnimatePresence>
    {pokes.map((poke) => (
      <PokeBadge key={poke.id} poke={poke} />
    ))}
  </AnimatePresence>
)
