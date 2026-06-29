"use client"

import { motion, AnimatePresence } from "framer-motion"
import type { PropPoke } from "@/hooks/use-party-room"
import type { PropId } from "@/lib/types"

type Theme = "dark" | "light"

const PROP_LABEL: Record<PropId, { emoji: string; verb: string }> = {
  dealer: { emoji: "🤵", verb: "heckled the dealer" },
  cat: { emoji: "🐱", verb: "petted the cat" },
  "plant-left": { emoji: "🌿", verb: "poked the plant" },
  "plant-right": { emoji: "🌿", verb: "poked the plant" },
}

const TOAST_STYLES: Record<Theme, string> = {
  dark: "border-white/10 bg-[#0d1117]/90 text-slate-300 shadow-[0_8px_24px_rgba(0,0,0,0.45)]",
  light:
    "border-slate-200 bg-white/95 text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.12)]",
}

const PokeToast = ({ poke, theme }: { poke: PropPoke; theme: Theme }) => {
  const label = PROP_LABEL[poke.prop]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -32, scale: 0.85 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -24, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm backdrop-blur-md ${TOAST_STYLES[theme]}`}
    >
      <motion.span
        className="text-base"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: [0, 1.3, 1], rotate: [-20, 10, 0] }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {label.emoji}
      </motion.span>
      <span className="flex items-center gap-1 whitespace-nowrap">
        <span className="max-w-28 truncate font-semibold">{poke.name}</span>
        <span>{label.verb}</span>
      </span>
    </motion.div>
  )
}

export const PropPokeToasts = ({
  pokes,
  theme,
}: {
  pokes: PropPoke[]
  theme: Theme
}) => (
  <div className="fixed bottom-24 left-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
    <AnimatePresence initial={false}>
      {pokes.map((poke) => (
        <PokeToast key={poke.id} poke={poke} theme={theme} />
      ))}
    </AnimatePresence>
  </div>
)
