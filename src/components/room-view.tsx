"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ParticipantCard } from "@/components/participant-card"
import { PlayingCard } from "@/components/playing-card"
import { DeckSelector } from "@/components/deck-selector"
import { VoteSummary } from "@/components/vote-summary"
import { Deck, RoomState } from "@/lib/types"
import { SettingsDialog } from "@/components/settings-dialog"
import { saveSettings } from "@/lib/settings"

type Theme = "dark" | "light"

type Props = {
  state: RoomState
  myId: string
  isHost: boolean
  onVote: (value: string) => void
  onReveal?: () => void
  onReset?: () => void
  onSetDeck?: (deck: Deck) => void
  onCopyCode?: () => void
  onCopyLink?: () => void
  copiedMode?: "code" | "link" | null
  onUpdateProfile?: (name: string, avatar: string) => void
}

const THEME_STYLES = {
  dark: {
    bg: "linear-gradient(160deg, #0d1117 0%, #090d18 50%, #0a0814 100%)",
    header: "border-white/6 bg-white/3",
    text: "text-white",
    badge: {
      border: "rgba(99,102,241,0.4)",
      color: "rgb(165,180,252)",
      bg: "rgba(99,102,241,0.08)",
    },
    shareBtn:
      "border-white/10 text-slate-400 hover:text-white hover:bg-white/8",
    themeBtn:
      "border-white/10 text-slate-300 hover:text-white hover:bg-white/8",
    hand: "border-white/8 bg-[rgba(255,255,255,0.02)]",
    handLabel: "text-slate-400",
  },
  light: {
    bg: "linear-gradient(160deg, #f0f4ff 0%, #eef2ff 50%, #f5f3ff 100%)",
    header: "border-slate-200 bg-white/80",
    text: "text-slate-900",
    badge: {
      border: "rgba(99,102,241,0.3)",
      color: "rgb(79,70,229)",
      bg: "rgba(99,102,241,0.08)",
    },
    shareBtn:
      "border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100",
    themeBtn:
      "border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100",
    hand: "border-slate-200 bg-white/70",
    handLabel: "text-slate-500",
  },
}

const TABLE_W = 640
const TABLE_H = 268
const SEAT_RX = TABLE_W / 2 + 56
const SEAT_RY = TABLE_H / 2 + 68

// Participants are positioned relative to the main area centre.
// The bottom slot (angle π/2) is reserved for the current user (hand below).
// index is 0-based among the filtered others; total includes current user.
const computeSeatStyle = (
  index: number,
  total: number,
): React.CSSProperties => {
  const angle = Math.PI / 2 + (2 * Math.PI * (index + 1)) / total
  const x = SEAT_RX * Math.cos(angle)
  const y = SEAT_RY * Math.sin(angle)
  return {
    position: "absolute",
    left: `calc(50% + ${x}px)`,
    top: `calc(50% + ${y}px)`,
    transform: "translate(-50%, -50%)",
  }
}

const ShareMenu = ({
  onCopyCode,
  onCopyLink,
  copiedMode,
  btnClass,
  popupClass,
  hoverClass,
}: {
  onCopyCode?: () => void
  onCopyLink?: () => void
  copiedMode: "code" | "link" | null
  btnClass: string
  popupClass: string
  hoverClass: string
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className={`border text-xs ${btnClass}`}
      >
        {copiedMode ? "Copied ✓" : "Share room ▾"}
      </Button>
      {open && (
        <div
          className={`absolute right-0 top-full mt-1 min-w-[140px] rounded-lg border shadow-xl z-50 overflow-hidden ${popupClass}`}
        >
          {onCopyCode && (
            <button
              className={`w-full px-3 py-2 text-xs text-left transition-colors ${hoverClass}`}
              onClick={() => {
                onCopyCode()
                setOpen(false)
              }}
            >
              {copiedMode === "code" ? "✓ Copied" : "Copy code"}
            </button>
          )}
          {onCopyLink && (
            <button
              className={`w-full px-3 py-2 text-xs text-left transition-colors ${hoverClass}`}
              onClick={() => {
                onCopyLink()
                setOpen(false)
              }}
            >
              {copiedMode === "link" ? "✓ Copied" : "Copy link"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export const RoomView = ({
  state,
  myId,
  isHost,
  onVote,
  onReveal,
  onReset,
  onSetDeck,
  onCopyCode,
  onCopyLink,
  copiedMode,
  onUpdateProfile,
}: Props) => {
  const [theme, setTheme] = useState<Theme>("dark")
  const [flyingCard, setFlyingCard] = useState<{
    value: string
    label?: string
    targetY: number
  } | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem("pp-theme") as Theme | null
    if (saved === "dark" || saved === "light") setTheme(saved)
  }, [])

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark"
    setTheme(next)
    localStorage.setItem("pp-theme", next)
  }

  const handleVote = (value: string) => {
    const card = state.deck.cards.find((c) => c.value === value)
    const cardCenterFromTop = window.innerHeight - 110 - 40
    const tableCenterFromTop = tableRef.current
      ? tableRef.current.getBoundingClientRect().top + TABLE_H / 2
      : window.innerHeight * 0.42
    const targetY = tableCenterFromTop - cardCenterFromTop
    setFlyingCard({ ...(card ?? { value }), targetY })
    onVote(value)
    const t = setTimeout(() => setFlyingCard(null), 750)
    return () => clearTimeout(t)
  }

  const me = state.participants[myId]
  const participants = Object.values(state.participants)
  const others = participants.filter((p) => p.id !== myId)
  const allVoted = participants.every((p) => p.vote !== null)
  const voteCount = participants.filter((p) => p.vote !== null).length
  const s = THEME_STYLES[theme]

  const votes = participants.map((p) => p.vote).filter(Boolean)
  const isConsensus =
    votes.length > 1 &&
    votes.every((v) => v === votes[0]) &&
    !["?", "☕"].includes(votes[0]!)

  useEffect(() => {
    if (!state.revealed || !isConsensus) return
    let cancelled = false
    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#6366f1", "#a78bfa", "#34d399", "#fbbf24", "#f472b6"],
      })
    })
    return () => {
      cancelled = true
    }
  }, [state.revealed, isConsensus])

  return (
    <div
      className={`flex flex-col h-screen ${s.text}`}
      style={{ background: s.bg }}
    >
      {/* Header */}
      <header
        className={`flex-none border-b ${s.header} backdrop-blur-md px-6 py-3 flex items-center justify-between gap-4 z-10`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🃏</span>
          <span className="font-semibold tracking-tight">Planning Poker</span>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-full border"
            style={{
              borderColor: s.badge.border,
              color: s.badge.color,
              background: s.badge.bg,
            }}
          >
            {state.revealed
              ? "Revealed"
              : allVoted
                ? "All voted ✓"
                : `${voteCount} / ${participants.length} voted`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className={`border text-sm ${s.themeBtn}`}
          >
            {theme === "dark" ? "☀︎" : "☾"}
          </Button>
          {onUpdateProfile && (
            <SettingsDialog
              currentName={state.participants[myId]?.name ?? ""}
              currentAvatar={state.participants[myId]?.avatar ?? ""}
              onSave={(name, avatar) => {
                saveSettings({ name, avatar })
                onUpdateProfile(name, avatar)
              }}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className={`border text-xs ${s.themeBtn}`}
                >
                  Profile
                </Button>
              }
            />
          )}
          {isHost && (onCopyCode || onCopyLink) && (
            <ShareMenu
              onCopyCode={onCopyCode}
              onCopyLink={onCopyLink}
              copiedMode={copiedMode ?? null}
              btnClass={`border text-xs ${s.shareBtn}`}
              popupClass={
                theme === "dark"
                  ? "bg-[#1a1d2e] border-white/10 text-slate-300"
                  : "bg-white border-slate-200 text-slate-700"
              }
              hoverClass={
                theme === "dark" ? "hover:bg-white/8" : "hover:bg-slate-50"
              }
            />
          )}
          {isHost && onSetDeck && (
            <DeckSelector currentDeck={state.deck} onApply={onSetDeck} />
          )}
        </div>
      </header>

      {/* Table area — fills remaining space; table centred, others around it */}
      <main className="flex-1 relative overflow-hidden">
        {/* Pool table */}
        <div
          ref={tableRef}
          style={{
            position: "absolute",
            width: TABLE_W,
            height: TABLE_H,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            borderRadius: TABLE_H / 2,

            background:
              "linear-gradient(170deg, #1e6e40 0%, #145733 40%, #0d3d22 100%)",
            border: "12px solid #6b3d12",
            boxShadow:
              "inset 0 8px 32px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.6), 0 0 0 3px rgba(180,110,40,0.2)",
          }}
        >
          {/* Clipped: centre line + shimmer */}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ borderRadius: TABLE_H / 2 - 10 }}
          >
            <div
              className="absolute top-1/2"
              style={{
                left: "10%",
                right: "10%",
                height: 1,
                transform: "translateY(-50%)",
                background:
                  "linear-gradient(to right, transparent, rgba(255,255,255,0.13) 30%, rgba(255,255,255,0.13) 70%, transparent)",
              }}
            />
            <motion.div
              style={{
                position: "absolute",
                width: "55%",
                height: "160%",
                top: "-30%",
                skewX: -18,
                background:
                  "linear-gradient(to right, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)",
              }}
              animate={{ left: ["-60%", "120%"] }}
              transition={{
                duration: 3,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 5,
              }}
            />
          </div>

          {/* Table centre content — text above the line, button below */}
          <div className="absolute inset-0 flex flex-col px-16">
            <AnimatePresence mode="wait">
              {!state.revealed ? (
                <motion.div
                  key="pre-reveal"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="contents"
                >
                  <div className="flex-1 flex items-end justify-center pb-3">
                    <span className="text-xs font-semibold text-white/40 tracking-widest uppercase">
                      {allVoted
                        ? "All voted — ready to reveal"
                        : `${voteCount} of ${participants.length} voted`}
                    </span>
                  </div>
                  <div className="flex-1 flex items-start justify-center pt-3">
                    {isHost && (
                      <Button
                        size="sm"
                        onClick={onReveal}
                        className={cn(
                          "bg-red-700 hover:bg-red-600 text-white border border-yellow-500/40 shadow-[0_0_20px_rgba(185,28,28,0.6),inset_0_1px_0_rgba(255,220,100,0.2)] font-semibold tracking-wide",
                          voteCount === 0 && "opacity-40 pointer-events-none",
                        )}
                      >
                        Reveal cards
                      </Button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="post-reveal"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="contents"
                >
                  <div className="flex-1 flex items-end justify-center pb-3">
                    <VoteSummary
                      participants={state.participants}
                      revealed={state.revealed}
                    />
                  </div>
                  <div className="flex-1 flex items-start justify-center pt-3">
                    {isHost && (
                      <Button
                        size="sm"
                        onClick={onReset}
                        className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                      >
                        New round
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Current user's card — rests just below the bottom rail */}
          <AnimatePresence>
            {me?.vote && (
              <motion.div
                key={me.vote}
                className="absolute left-1/2"
                style={{ x: "-50%", bottom: -88 }}
                initial={{ y: 20, scale: 0, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 20, scale: 0, opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 26,
                  delay: 0.44,
                }}
              >
                <ParticipantCard
                  participant={me}
                  revealed={state.revealed}
                  index={0}
                  theme={theme}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Other participants seated around the table */}
        <AnimatePresence>
          {others.map((participant, i) => (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 24,
                delay: i * 0.05,
              }}
              style={computeSeatStyle(i, participants.length)}
            >
              <ParticipantCard
                participant={participant}
                revealed={state.revealed}
                index={i}
                theme={theme}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </main>

      {/* Hand — anchored to the bottom of the screen */}
      <div className={cn("flex-none border-t px-6 pt-6 pb-4", s.hand)}>
        <div className="flex flex-col items-center gap-5">
          <p
            className={`text-xs font-medium tracking-wide uppercase ${s.handLabel}`}
          >
            {state.revealed ? "Waiting for next round…" : "Your hand"}
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={state.deck.preset}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex flex-nowrap gap-3 justify-center"
            >
              {state.deck.cards.map((card, i) => (
                <motion.div
                  key={card.value}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: i * 0.04,
                    type: "spring",
                    stiffness: 300,
                    damping: 22,
                  }}
                >
                  <PlayingCard
                    card={card}
                    selected={me?.vote === card.value}
                    disabled={state.revealed}
                    onSelect={handleVote}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Flying card — travels from hand to table on vote */}
      <AnimatePresence>
        {flyingCard && (
          <motion.div
            key={flyingCard.value + "-fly"}
            className="fixed z-50 pointer-events-none flex flex-col items-center justify-center w-20 h-28 rounded-xl border-2 border-primary bg-[#fffdf7] shadow-[0_0_28px_rgba(99,102,241,0.65)]"
            style={{ left: "50%", bottom: 110 }}
            initial={{ y: 0, x: "-50%", scale: 1, rotate: 0, opacity: 1 }}
            animate={{
              y: [0, flyingCard.targetY, flyingCard.targetY],
              x: "-50%",
              scale: [1, 0.78, 0.6],
              rotate: [0, -8, 0],
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 0.75,
              times: [0, 0.62, 1],
              ease: "easeOut",
            }}
          >
            <span className="text-2xl font-bold text-slate-800">
              {flyingCard.value}
            </span>
            {flyingCard.label && (
              <span className="text-[11px] font-semibold text-slate-400 mt-1">
                {flyingCard.label}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
