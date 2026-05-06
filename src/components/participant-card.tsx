"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Participant } from "@/lib/types"
import { avatarUrl } from "@/lib/avatar"

type Props = {
  participant: Participant
  revealed: boolean
  index: number
  theme: "dark" | "light"
}

const HATCH = [
  "repeating-linear-gradient(45deg, rgba(99,102,241,0.2) 0px, rgba(99,102,241,0.2) 1px, transparent 1px, transparent 8px)",
  "repeating-linear-gradient(-45deg, rgba(99,102,241,0.2) 0px, rgba(99,102,241,0.2) 1px, transparent 1px, transparent 8px)",
].join(", ")

const BACK_COLORS = {
  dark: {
    voted: "rgb(23 25 56)",
    idle: "rgb(15 23 42)",
    border: { voted: "border-indigo-500/50", idle: "border-white/8" },
    check: "text-indigo-300",
    checkBg: "bg-indigo-500/30",
    name: "text-slate-400",
  },
  light: {
    voted: "rgb(238 242 255)",
    idle: "rgb(248 250 252)",
    border: { voted: "border-indigo-300", idle: "border-slate-200" },
    check: "text-indigo-500",
    checkBg: "bg-indigo-100",
    name: "text-slate-500",
  },
}

export const ParticipantCard = ({
  participant,
  revealed,
  index,
  theme,
}: Props) => {
  const hasVoted = participant.vote !== null
  const showValue = revealed && hasVoted
  const colors = BACK_COLORS[theme]

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ perspective: 1200 }} className="w-20 h-28">
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
          {/* Front — value */}
          <motion.div
            style={{ backfaceVisibility: "hidden" }}
            animate={showValue ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={{
              delay: revealed ? index * 0.08 + 0.35 : 0,
              duration: 0.25,
            }}
            className="absolute inset-0 rounded-xl border-2 border-primary bg-[#fffdf7] shadow-[0_0_24px_rgba(99,102,241,0.5)] flex flex-col items-center justify-center"
          >
            <span className="text-2xl font-bold text-slate-800">
              {participant.vote}
            </span>
          </motion.div>

          {/* Back — face-down */}
          <div
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              backgroundImage: HATCH,
              backgroundColor: hasVoted ? colors.voted : colors.idle,
            }}
            className={cn(
              "absolute inset-0 rounded-xl border-2 flex items-center justify-center transition-colors duration-300",
              hasVoted ? colors.border.voted : colors.border.idle,
            )}
          >
            {hasVoted && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center",
                  colors.checkBg,
                )}
              >
                <span className={cn("text-xs font-bold", colors.check)}>✓</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="flex items-center gap-2">
        <img
          src={avatarUrl(participant.avatar || participant.name)}
          alt={participant.name}
          className="w-7 h-7 rounded-lg flex-none"
        />
        <span className={cn("text-sm font-medium", colors.name)}>
          {participant.name}
          {participant.isHost && <span className="ml-0.5">👑</span>}
        </span>
      </div>
    </div>
  )
}
