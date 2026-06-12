"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { Reaction } from "@/hooks/use-party-room"

const seatPosition = (clientId: string) => {
  const seats = document.querySelectorAll(
    `[data-seat="${CSS.escape(clientId)}"]`,
  )
  for (const el of seats) {
    const rect = el.getBoundingClientRect()
    if (rect.width > 0) return { x: rect.left + rect.width / 2, y: rect.top }
  }
  return null
}

const ReactionFloat = ({ reaction }: { reaction: Reaction }) => {
  const [origin] = useState(() => seatPosition(reaction.from))
  const anchored = origin !== null
  const drift = ((reaction.id % 5) - 2) * 8

  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [0, -50, -110, -170],
        x: [0, drift, -drift / 2, drift / 3],
        scale: [0.5, 1.2, 1, 0.9],
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 3, ease: "easeOut" }}
      className="fixed z-40 pointer-events-none flex flex-col items-center"
      style={
        anchored
          ? {
              left: origin.x,
              top: origin.y - 14,
              transform: "translateX(-50%)",
            }
          : { left: 40 + (reaction.id % 3) * 24, bottom: 190 }
      }
    >
      <span className="text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
        {reaction.emoji}
      </span>
      {!anchored && (
        <span className="mt-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] text-white/90 max-w-20 truncate">
          {reaction.name}
        </span>
      )}
    </motion.div>
  )
}

export const FloatingReactions = ({ reactions }: { reactions: Reaction[] }) => (
  <AnimatePresence>
    {reactions.map((reaction) => (
      <ReactionFloat key={reaction.id} reaction={reaction} />
    ))}
  </AnimatePresence>
)
