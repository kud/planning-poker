"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card } from "@/lib/types"

type Props = {
  card: Card
  selected: boolean
  disabled: boolean
  onSelect: (value: string) => void
}

export const PlayingCard = ({ card, selected, disabled, onSelect }: Props) => (
  <motion.button
    onClick={() => !disabled && onSelect(card.value)}
    whileHover={!disabled ? { y: -12, scale: 1.08 } : {}}
    whileTap={!disabled ? { scale: 0.93 } : {}}
    animate={selected ? { y: -16 } : { y: 0 }}
    transition={{ type: "spring", stiffness: 350, damping: 22 }}
    className={cn(
      "flex w-14 h-20 rounded-xl border-2 flex-col items-center justify-center select-none cursor-pointer",
      selected
        ? "border-primary bg-primary text-white shadow-[0_0_28px_rgba(99,102,241,0.65)]"
        : "border-white/20 bg-[#fffdf7] text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.3)] hover:border-primary/40",
      disabled && "opacity-40 cursor-not-allowed",
    )}
  >
    <span
      className={cn(
        "text-2xl font-bold leading-none",
        !selected && "text-slate-800",
      )}
    >
      {card.value}
    </span>
    {card.label && (
      <span
        className={cn(
          "text-[11px] font-semibold mt-1",
          selected ? "text-white/70" : "text-slate-400",
        )}
      >
        {card.label}
      </span>
    )}
  </motion.button>
)
