"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Participant } from "@/lib/types"

type Props = {
  participants: Record<string, Participant>
  revealed: boolean
}

const average = (votes: number[]) =>
  votes.length === 0 ? null : votes.reduce((a, b) => a + b, 0) / votes.length

export const VoteSummary = ({ participants, revealed }: Props) => {
  const votes = Object.values(participants)
    .filter((p) => p.vote !== null)
    .map((p) => p.vote!)

  const numericVotes = votes.map(Number).filter((n) => !isNaN(n))
  const avg = average(numericVotes)

  const tally = votes.reduce<Record<string, number>>((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1
    return acc
  }, {})

  return (
    <AnimatePresence>
      {revealed && votes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 16 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="flex flex-wrap gap-2 items-center justify-center pt-2"
        >
          {Object.entries(tally).map(([value, count], i) => (
            <motion.div
              key={value}
              initial={{ opacity: 0, y: 16, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: i * 0.06,
                type: "spring",
                stiffness: 400,
                damping: 24,
              }}
              className="flex flex-col items-center rounded-xl border border-white/10 bg-white/8 px-4 py-2 min-w-[52px]"
            >
              <span className="text-xl font-bold text-white">{value}</span>
              <span className="text-[11px] text-slate-400">×{count}</span>
            </motion.div>
          ))}
          {avg !== null && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: Object.keys(tally).length * 0.06 + 0.06,
                type: "spring",
                stiffness: 400,
                damping: 24,
              }}
              className="flex flex-col items-center rounded-xl border border-primary/50 bg-primary/20 px-4 py-2 min-w-[52px] shadow-[0_0_16px_rgba(99,102,241,0.3)]"
            >
              <span className="text-xl font-bold text-indigo-300">
                {avg % 1 === 0 ? avg : avg.toFixed(1)}
              </span>
              <span className="text-[11px] text-indigo-400">avg</span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
