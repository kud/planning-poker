"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Participant } from "@/lib/types"
import { avatarUrl } from "@/lib/avatar"

type Props = {
  participant: Participant
  theme: "dark" | "light"
  isSpeaker?: boolean
  hasSpoken?: boolean
}

const NAME_COLORS = {
  dark: "text-slate-400",
  light: "text-slate-500",
}

const rhythm = (id: string) =>
  [...id].reduce((acc, char) => acc + char.charCodeAt(0), 0)

export const SeatAvatar = ({
  participant,
  theme,
  isSpeaker,
  hasSpoken,
}: Props) => {
  const seed = rhythm(participant.id)
  const bobDuration = 2.2 + (seed % 5) * 0.25

  return (
    <motion.div
      className="flex flex-col items-center gap-0.5"
      animate={{ scale: isSpeaker ? 1.18 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.div
        className="relative"
        animate={{ y: [0, -2, 0] }}
        transition={{
          duration: bobDuration,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl(participant.avatar || participant.name)}
          alt={participant.name}
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
          <>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="absolute -bottom-3 -right-5 text-xl"
            >
              🎤
            </motion.span>
            <motion.span
              className="absolute inset-0 rounded-xl ring-2 ring-amber-300/80 pointer-events-none"
              animate={{ opacity: [0.9, 0.3, 0.9], scale: [1, 1.18, 1] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </>
        )}
        {!isSpeaker && hasSpoken && (
          <span className="absolute -bottom-1 -right-1 text-[10px] rounded-full bg-emerald-500/90 text-white w-4 h-4 flex items-center justify-center">
            ✓
          </span>
        )}
      </motion.div>
      <span
        className={cn(
          "text-[11px] sm:text-xs font-medium max-w-20 truncate",
          isSpeaker ? "text-amber-200 font-semibold" : NAME_COLORS[theme],
        )}
      >
        {participant.name}
      </span>
    </motion.div>
  )
}
