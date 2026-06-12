"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Participant } from "@/lib/types"
import { avatarUrl } from "@/lib/avatar"

type Props = {
  participant: Participant
  theme: "dark" | "light"
  isSpeaker?: boolean
}

const NAME_COLORS = {
  dark: "text-slate-400",
  light: "text-slate-500",
}

const rhythm = (id: string) =>
  [...id].reduce((acc, char) => acc + char.charCodeAt(0), 0)

export const SeatAvatar = ({ participant, theme, isSpeaker }: Props) => {
  const seed = rhythm(participant.id)
  const bobDuration = 2.2 + (seed % 5) * 0.25
  const tiltDelay = 3 + (seed % 7) * 0.8
  const tiltDirection = seed % 2 === 0 ? 1 : -1

  return (
    <div className="flex flex-col items-center gap-0.5">
      <motion.div
        className="relative"
        animate={{ y: [0, -2, 0] }}
        transition={{
          duration: bobDuration,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      >
        <motion.img
          src={avatarUrl(participant.avatar || participant.name)}
          alt={participant.name}
          animate={{ rotate: [0, tiltDirection * 5, tiltDirection * 5, 0] }}
          transition={{
            duration: 1.1,
            times: [0, 0.25, 0.75, 1],
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: tiltDelay,
          }}
          style={{ transformOrigin: "bottom" }}
          className={cn(
            "w-9 h-9 sm:w-11 sm:h-11 rounded-xl transition-shadow",
            participant.vote !== null &&
              "shadow-[0_0_14px_rgba(99,102,241,0.65)] ring-2 ring-indigo-400/60",
            isSpeaker &&
              "shadow-[0_0_18px_rgba(251,191,36,0.75)] ring-2 ring-amber-400",
          )}
        />
        {participant.isHost && (
          <span className="absolute -top-2 -right-2 text-xs">👑</span>
        )}
        {isSpeaker && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className="absolute -bottom-1.5 -right-1.5 text-sm"
          >
            🎤
          </motion.span>
        )}
      </motion.div>
      <span
        className={cn(
          "text-[11px] sm:text-xs font-medium max-w-20 truncate",
          NAME_COLORS[theme],
        )}
      >
        {participant.name}
      </span>
    </div>
  )
}
