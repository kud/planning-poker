"use client"

import { motion } from "framer-motion"
import { Participant } from "@/lib/types"

const HATCH = [
  "repeating-linear-gradient(45deg, rgba(99,102,241,0.25) 0px, rgba(99,102,241,0.25) 1px, transparent 1px, transparent 7px)",
  "repeating-linear-gradient(-45deg, rgba(99,102,241,0.25) 0px, rgba(99,102,241,0.25) 1px, transparent 1px, transparent 7px)",
].join(", ")

type Props = {
  participant: Participant
  revealed: boolean
  index: number
  dealFrom?: { x: number; y: number }
}

export const TableCard = ({
  participant,
  revealed,
  index,
  dealFrom,
}: Props) => {
  const showValue = revealed && participant.vote !== null
  const origin = dealFrom ?? { x: 0, y: 14 }
  // Before the reveal each card waits in front of its owner; on reveal every
  // card glides to its spot on the felt (and flips), so the cards visibly come
  // from the players rather than appearing from a central deck.
  const resting = revealed ? { x: 0, y: 0 } : origin

  return (
    <motion.div
      initial={{ scale: 0.6, x: origin.x, y: origin.y, opacity: 0 }}
      animate={{ scale: 1, x: resting.x, y: resting.y, opacity: 1 }}
      exit={{ scale: 0.6, x: origin.x, y: origin.y, opacity: 0 }}
      transition={{
        type: "spring",
        stiffness: 330,
        damping: 26,
        delay: revealed ? index * 0.08 : 0,
      }}
      style={{ perspective: 900 }}
      className="w-10 h-14 sm:w-12 sm:h-16"
    >
      <motion.div
        animate={{ rotateY: showValue ? 0 : 180 }}
        initial={{ rotateY: 180 }}
        transition={{
          duration: 0.6,
          delay: revealed ? index * 0.08 : 0,
          type: "spring",
          stiffness: 180,
          damping: 22,
        }}
        style={{
          transformStyle: "preserve-3d",
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        <div
          style={{ backfaceVisibility: "hidden" }}
          className="absolute inset-0 rounded-lg border-2 border-primary bg-[#fffdf7] shadow-[0_0_18px_rgba(99,102,241,0.5)] flex items-center justify-center"
        >
          <span className="text-lg sm:text-xl font-bold text-slate-800">
            {participant.vote}
          </span>
        </div>
        <div
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            backgroundImage: HATCH,
            backgroundColor: "rgb(23 25 56)",
          }}
          className="absolute inset-0 rounded-lg border-2 border-indigo-500/60 shadow-[0_4px_14px_rgba(0,0,0,0.45)]"
        />
      </motion.div>
    </motion.div>
  )
}
