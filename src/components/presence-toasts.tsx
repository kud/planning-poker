"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { PresenceEvent } from "@/hooks/use-party-room"
import { avatarUrl } from "@/lib/avatar"

const welcomeConfetti = () => {
  import("canvas-confetti").then(({ default: confetti }) => {
    confetti({
      particleCount: 50,
      spread: 55,
      startVelocity: 28,
      origin: { x: 0.04, y: 0.92 },
      angle: 65,
      colors: ["#34d399", "#6ee7b7", "#a78bfa", "#fbbf24"],
    })
  })
}

type Theme = "dark" | "light"

const TOAST_STYLES = {
  dark: {
    join: "border-emerald-400/40 bg-[#0d1117]/90 text-emerald-50 shadow-[0_0_28px_rgba(16,185,129,0.28)]",
    leave:
      "border-white/10 bg-[#0d1117]/90 text-slate-300 shadow-[0_8px_24px_rgba(0,0,0,0.45)]",
    sub: { join: "text-emerald-300/70", leave: "text-slate-500" },
  },
  light: {
    join: "border-emerald-500/40 bg-white/95 text-emerald-900 shadow-[0_0_28px_rgba(16,185,129,0.22)]",
    leave:
      "border-slate-200 bg-white/95 text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.12)]",
    sub: { join: "text-emerald-600/70", leave: "text-slate-400" },
  },
}

const PresenceToast = ({
  presence,
  theme,
}: {
  presence: PresenceEvent
  theme: Theme
}) => {
  const isJoin = presence.event === "join"
  const styles = TOAST_STYLES[theme]

  useEffect(() => {
    if (isJoin) welcomeConfetti()
  }, [isJoin])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -32, scale: 0.85 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -24, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={`relative flex items-center gap-2.5 rounded-full border-2 px-3 py-2 backdrop-blur-md ${
        isJoin ? styles.join : styles.leave
      }`}
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl(presence.avatar || presence.name)}
          alt={presence.name}
          className="w-8 h-8 rounded-lg"
        />
        {isJoin && (
          <motion.span
            className="absolute inset-0 rounded-lg ring-2 ring-emerald-400/70"
            initial={{ opacity: 0.9, scale: 1 }}
            animate={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        )}
      </div>

      <div className="flex flex-col leading-tight pr-1">
        <span className="text-sm font-semibold max-w-40 truncate">
          {presence.name}
        </span>
        <span className={`text-[11px] ${styles.sub[presence.event]}`}>
          {isJoin ? "joined the room" : "left the room"}
        </span>
      </div>

      <motion.span
        className="text-lg"
        initial={{ scale: 0, rotate: isJoin ? -30 : 0 }}
        animate={
          isJoin
            ? { scale: [0, 1.3, 1], rotate: [-30, 12, 0] }
            : { scale: 1, rotate: [0, 18, -8, 12, 0] }
        }
        transition={{ duration: isJoin ? 0.6 : 0.9, ease: "easeOut" }}
      >
        {isJoin ? "✨" : "👋"}
      </motion.span>
    </motion.div>
  )
}

export const PresenceToasts = ({
  events,
  theme,
}: {
  events: PresenceEvent[]
  theme: Theme
}) => (
  <div className="fixed bottom-6 left-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
    <AnimatePresence initial={false}>
      {events.map((presence) => (
        <PresenceToast key={presence.id} presence={presence} theme={theme} />
      ))}
    </AnimatePresence>
  </div>
)
