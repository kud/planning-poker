"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { RoomState } from "@/lib/types"
import { Button } from "@/components/ui/button"

type BreakState = RoomState["break"]

type Props = {
  state: BreakState
  myId: string
  isHost: boolean
  onVote: (accept: boolean) => void
  onSetTime: (seconds: number) => void
  onEnd: () => void
}

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`

export const BreakOverlay = ({
  state,
  myId,
  isHost,
  onVote,
  onSetTime,
  onEnd,
}: Props) => {
  const [now, setNow] = useState(() => Date.now())
  const active = state?.status === "active"

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [active])

  if (!state) return null

  // --- Voting phase: a compact prompt with a live tally ---
  if (state.status === "voting") {
    const iVoted = state.accepts.includes(myId) || state.declines.includes(myId)
    return (
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.92 }}
        transition={{ type: "spring", stiffness: 360, damping: 26 }}
        className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border-2 border-amber-400/50 bg-[#1a130a]/95 px-4 py-3 shadow-[0_0_36px_rgba(251,191,36,0.3)] backdrop-blur-md"
      >
        <span className="text-2xl">☕</span>
        <span className="text-sm font-medium text-amber-50">
          <span className="font-bold">{state.requesterName}</span> asked for a
          break
          <span className="ml-2 text-amber-200/70">
            ✓ {state.accepts.length} · ✗ {state.declines.length}
          </span>
        </span>
        {iVoted ? (
          <span className="text-xs text-amber-200/60">
            waiting for the room…
          </span>
        ) : (
          <>
            <Button
              size="sm"
              onClick={() => onVote(true)}
              className="border border-amber-400/50 bg-amber-500/80 text-amber-950 hover:bg-amber-500"
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onVote(false)}
              className="text-white/60 hover:text-white"
            >
              Decline
            </Button>
          </>
        )}
      </motion.div>
    )
  }

  // --- Active break: full-screen calm overlay with countdown ---
  const remaining = state.endsAt
    ? Math.max(0, Math.ceil((state.endsAt - now) / 1000))
    : 0
  const over = remaining === 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[55] flex flex-col items-center justify-center gap-4 bg-[radial-gradient(ellipse_at_50%_40%,#1a130a,#0a0610_75%)]/95 backdrop-blur-sm"
    >
      <span className="text-5xl">☕</span>
      <p className="text-2xl font-black uppercase tracking-widest text-amber-200">
        {over ? "Break's over!" : "On a break"}
      </p>
      <p
        className={
          over
            ? "text-4xl font-bold tabular-nums text-amber-400"
            : "text-5xl font-bold tabular-nums text-amber-100"
        }
      >
        {over ? "0:00" : fmt(remaining)}
      </p>
      {isHost ? (
        <div className="flex items-center gap-2">
          {!over && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSetTime(remaining + 60)}
              className="border border-amber-400/40 text-amber-100 hover:bg-amber-500/15"
            >
              +1 min
            </Button>
          )}
          <Button
            size="sm"
            onClick={onEnd}
            className="border border-amber-400/50 bg-amber-600/80 text-white hover:bg-amber-600"
          >
            {over ? "Back to it" : "End break"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-amber-200/60">
          {over ? "Waiting for the host…" : "Stretch your legs ✨"}
        </p>
      )}
    </motion.div>
  )
}
