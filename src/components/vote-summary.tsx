"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence, animate } from "framer-motion"
import { Participant } from "@/lib/types"
import { computeVoteStats } from "@/lib/vote-stats"

const CountUp = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: setDisplay,
    })
    return () => controls.stop()
  }, [value])

  const settled = display === value
  const formatted =
    settled && value % 1 === 0 ? String(value) : display.toFixed(1)
  return <>{formatted}</>
}

type Props = {
  participants: Record<string, Participant>
  revealed: boolean
  theme?: "dark" | "light"
}

const StatChip = ({
  label,
  children,
  delay,
  highlight,
  dark,
}: {
  label: string
  children: React.ReactNode
  delay: number
  highlight?: boolean
  dark: boolean
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16, scale: 0.8 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, type: "spring", stiffness: 400, damping: 24 }}
    className={
      highlight
        ? "flex flex-col items-center rounded-xl border border-primary/50 bg-primary/20 px-4 py-2 min-w-[52px] shadow-[0_0_16px_rgba(99,102,241,0.3)]"
        : dark
          ? "flex flex-col items-center rounded-xl border border-white/10 bg-white/8 px-4 py-2 min-w-[52px]"
          : "flex flex-col items-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 min-w-[52px]"
    }
  >
    {children}
    <span
      className={
        highlight
          ? "text-[11px] text-indigo-400"
          : dark
            ? "text-[11px] text-slate-400"
            : "text-[11px] text-slate-500"
      }
    >
      {label}
    </span>
  </motion.div>
)

export const VoteSummary = ({
  participants,
  revealed,
  theme = "dark",
}: Props) => {
  const dark = theme !== "light"
  const tallyColor = dark ? "text-white" : "text-slate-900"
  const medianColor = dark ? "text-slate-200" : "text-slate-700"
  const spreadColor = dark ? "text-amber-300" : "text-amber-600"
  const avgColor = dark ? "text-indigo-300" : "text-indigo-600"
  const votes = Object.values(participants)
    .filter((p) => p.vote !== null)
    .map((p) => p.vote!)

  const stats = computeVoteStats(votes)
  const showSpread =
    stats.spread !== null && stats.spread > 0 && stats.numericVotes.length > 1

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
          {stats.tally.map(({ value, count }, i) => (
            <StatChip
              key={value}
              label={`×${count}`}
              delay={i * 0.06}
              dark={dark}
            >
              <span className={`text-xl font-bold ${tallyColor}`}>{value}</span>
            </StatChip>
          ))}
          {stats.average !== null && (
            <StatChip
              label="avg"
              delay={stats.tally.length * 0.06 + 0.06}
              highlight
              dark={dark}
            >
              <span className={`text-xl font-bold ${avgColor}`}>
                <CountUp value={stats.average} />
              </span>
            </StatChip>
          )}
          {stats.median !== null && (
            <StatChip
              label="median"
              delay={stats.tally.length * 0.06 + 0.12}
              dark={dark}
            >
              <span className={`text-xl font-bold ${medianColor}`}>
                {stats.median}
              </span>
            </StatChip>
          )}
          {showSpread && (
            <StatChip
              label="spread"
              delay={stats.tally.length * 0.06 + 0.18}
              dark={dark}
            >
              <span className={`text-xl font-bold ${spreadColor}`}>
                {stats.min}–{stats.max}
              </span>
            </StatChip>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
