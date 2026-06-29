"use client"

import { motion } from "framer-motion"
import { Crown, Mic, Check, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { Participant } from "@/lib/types"
import { avatarUrl } from "@/lib/avatar"

type Props = {
  participant: Participant
  theme: "dark" | "light"
  isSpeaker?: boolean
  hasSpoken?: boolean
  onFire?: boolean
}

const NAME_COLORS = {
  dark: "text-slate-400",
  light: "text-slate-500",
}

// Flame tongues spread across the avatar's base so it reads as fully ablaze.
const FLAME_SPOTS = [
  { left: "-6%", size: "text-sm", delay: 0.1 },
  { left: "18%", size: "text-lg", delay: 0 },
  { left: "42%", size: "text-xl", delay: 0.22 },
  { left: "66%", size: "text-lg", delay: 0.12 },
  { left: "88%", size: "text-sm", delay: 0.3 },
]

const rhythm = (id: string) =>
  [...id].reduce((acc, char) => acc + char.charCodeAt(0), 0)

export const SeatAvatar = ({
  participant,
  theme,
  isSpeaker,
  hasSpoken,
  onFire,
}: Props) => {
  const seed = rhythm(participant.id)
  const bobDuration = 2.2 + (seed % 5) * 0.25

  return (
    <motion.div
      data-seat={participant.id}
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
            participant.isSpectator && "opacity-60 grayscale",
            onFire &&
              "ring-2 ring-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.85)]",
          )}
        />
        {onFire && (
          <span
            className="pointer-events-none absolute -inset-1 z-10"
            title="In the brawl"
          >
            {/* flickering ember glow behind the flames */}
            <motion.span
              className="absolute inset-0 rounded-xl"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 80%, rgba(249,115,22,0.55), rgba(239,68,68,0.25) 55%, transparent 75%)",
              }}
              animate={{ opacity: [0.7, 1, 0.8, 1], scale: [1, 1.08, 0.97, 1] }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {FLAME_SPOTS.map((f, i) => (
              <motion.span
                key={i}
                className={cn("absolute -bottom-1 leading-none", f.size)}
                style={{ left: f.left }}
                animate={{
                  y: [0, -5, -2, -6, 0],
                  scaleY: [1, 1.3, 0.9, 1.2, 1],
                  scaleX: [1, 0.85, 1.05, 0.9, 1],
                  opacity: [0.85, 1, 0.9, 1, 0.85],
                  rotate: [-5, 4, -3, 5, -5],
                }}
                transition={{
                  duration: 0.45 + (i % 3) * 0.12,
                  delay: f.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                🔥
              </motion.span>
            ))}
          </span>
        )}
        {participant.isHost && (
          <Crown className="absolute -top-2 -right-2 h-3.5 w-3.5 text-amber-400 drop-shadow" />
        )}
        {isSpeaker && (
          <>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="absolute -top-3 left-1/2 -translate-x-1/2"
            >
              <Mic className="h-4 w-4 text-amber-300" />
            </motion.span>
            <motion.span
              className="absolute inset-0 rounded-xl ring-2 ring-amber-300/80 pointer-events-none"
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </>
        )}
        {!isSpeaker && hasSpoken && (
          <span className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500/90 text-white w-4 h-4 flex items-center justify-center">
            <Check className="h-2.5 w-2.5" />
          </span>
        )}
        {participant.isSpectator && (
          <span
            className="absolute -bottom-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-white"
            title="Watching"
          >
            <Eye className="h-2.5 w-2.5" />
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
