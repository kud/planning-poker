"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SeatAvatar } from "@/components/seat-avatar"
import { TableCard } from "@/components/table-card"
import { PlayingCard } from "@/components/playing-card"
import { DeckSelector } from "@/components/deck-selector"
import { VoteSummary } from "@/components/vote-summary"
import { Deck, RoomState } from "@/lib/types"
import { SettingsDialog } from "@/components/settings-dialog"
import { OnboardingHints } from "@/components/onboarding-hints"
import { PixelPet } from "@/components/pixel-pet"
import {
  isMuted,
  setMuted,
  playVote,
  playReveal,
  playConsensus,
  playDice,
  playNewRound,
} from "@/lib/sounds"
import { saveSettings } from "@/lib/settings"

type Theme = "dark" | "light"

type Props = {
  state: RoomState
  myId: string
  roomId?: string
  isHost: boolean
  onVote: (value: string) => void
  onReveal?: () => void
  onReset?: () => void
  onSetDeck?: (deck: Deck) => void
  onCopyCode?: () => void
  onCopyLink?: () => void
  copiedMode?: "code" | "link" | null
  onUpdateProfile?: (name: string, avatar: string) => void
  onRollSpeaker?: () => void
}

type Announcement = { emoji: string; title: string; sub: string }

const revealQuip = (votes: string[]): Announcement => {
  const numbers = votes.map(Number).filter((n) => !Number.isNaN(n))
  const distinct = new Set(votes)

  if (
    votes.length > 1 &&
    distinct.size === 1 &&
    !["?", "☕"].includes(votes[0])
  )
    return {
      emoji: "🏆",
      title: "Unanimous!",
      sub: "Perfect consensus — ship it 🚀",
    }
  if (votes.includes("☕"))
    return {
      emoji: "☕",
      title: "Coffee break?",
      sub: "Someone played the coffee card",
    }
  if (numbers.length >= 2) {
    const min = Math.min(...numbers)
    const max = Math.max(...numbers)
    const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length
    if (max >= 13 && max / Math.max(min, 0.5) >= 4)
      return {
        emoji: "😱",
        title: `From ${min} to ${max} — that's quite a gap`,
        sub: "Someone knows something we don't…",
      }
    if (avg >= 13)
      return {
        emoji: "🌶️",
        title: `${Math.round(avg)} on average — spicy`,
        sub: "Big one. Brace yourselves",
      }
    if (avg <= 2)
      return {
        emoji: "🍃",
        title: "Barely a warm-up",
        sub: "Quick win — next!",
      }
    if (max - min >= 5)
      return {
        emoji: "🎭",
        title: "Quite the spread",
        sub: "Time to talk it out",
      }
  }
  if (votes.includes("?"))
    return {
      emoji: "🔍",
      title: "Mystery at the table",
      sub: "Someone needs more details",
    }
  return { emoji: "🃏", title: "The table has spoken", sub: "Solid round" }
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

const FELT_SURFACE: React.CSSProperties = {
  background: "linear-gradient(170deg, #1e6e40 0%, #145733 40%, #0d3d22 100%)",
  boxShadow:
    "inset 0 8px 32px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.6), 0 0 0 3px rgba(180,110,40,0.2)",
}

// Seats sit on an ellipse around the table, cards on a smaller ellipse on
// the felt. Positions are percentages of the table wrapper, so the layout
// scales with the viewport. The bottom slot (angle π/2) is the current user.
const seatAngle = (index: number, total: number) =>
  Math.PI / 2 + (2 * Math.PI * index) / total

const seatStyle = (angle: number): React.CSSProperties => ({
  position: "absolute",
  left: `${50 + 60 * Math.cos(angle)}%`,
  top: `${50 + 86 * Math.sin(angle)}%`,
  transform: "translate(-50%, -50%)",
})

const cardStyle = (angle: number): React.CSSProperties => ({
  position: "absolute",
  left: `${50 + 37 * Math.cos(angle)}%`,
  top: `${50 + 33 * Math.sin(angle)}%`,
  transform: "translate(-50%, -50%)",
})

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
        data-tour="share"
        onClick={() => setOpen((v) => !v)}
        className={`border text-xs ${btnClass}`}
      >
        {copiedMode ? "Copied ✓" : "Share ▾"}
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

const RoundControls = ({
  state,
  isHost,
  voteCount,
  allVoted,
  total,
  roomId,
  onReveal,
  onReset,
  onRollSpeaker,
}: {
  state: RoomState
  isHost: boolean
  voteCount: number
  allVoted: boolean
  total: number
  roomId?: string
  onReveal?: () => void
  onReset?: () => void
  onRollSpeaker?: () => void
}) => {
  const pending = Object.values(state.participants).filter(
    (p) => p.vote === null,
  )
  const status =
    total <= 1
      ? null
      : allVoted
        ? "All voted — ready to reveal"
        : pending.length === 1
          ? `Waiting for ${pending[0].name}…`
          : `${voteCount} of ${total} voted`

  return (
    <AnimatePresence mode="wait">
      {!state.revealed ? (
        <motion.div
          key="pre-reveal"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center gap-2 sm:gap-3"
        >
          {status ? (
            <span className="text-[10px] sm:text-xs font-semibold text-white/40 tracking-widest uppercase text-center">
              {status}
            </span>
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] font-semibold text-white/40 tracking-widest uppercase">
                It&apos;s quiet in here — room code
              </span>
              <span className="text-xl sm:text-2xl font-mono font-bold tracking-[0.25em] text-white/90">
                {roomId}
              </span>
            </div>
          )}
          {isHost && (
            <Button
              size="sm"
              data-tour="reveal"
              onClick={onReveal}
              className={cn(
                "bg-red-700 hover:bg-red-600 text-white border border-yellow-500/40 shadow-[0_0_20px_rgba(185,28,28,0.6),inset_0_1px_0_rgba(255,220,100,0.2)] font-semibold tracking-wide",
                voteCount === 0 && "opacity-40 pointer-events-none",
              )}
            >
              Reveal cards
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="post-reveal"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-5"
        >
          <VoteSummary
            participants={state.participants}
            revealed={state.revealed}
          />
          {isHost && (
            <div className="flex items-center gap-2 flex-none">
              {onRollSpeaker && total > 1 && (
                <Button
                  size="sm"
                  onClick={onRollSpeaker}
                  className="border border-amber-400/30 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25"
                >
                  🎲 Speaker
                </Button>
              )}
              <Button
                size="sm"
                onClick={onReset}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                New round
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const RoomView = ({
  state,
  myId,
  roomId,
  isHost,
  onVote,
  onReveal,
  onReset,
  onSetDeck,
  onCopyCode,
  onCopyLink,
  copiedMode,
  onUpdateProfile,
  onRollSpeaker,
}: Props) => {
  const [theme, setTheme] = useState<Theme>("dark")
  const [flyingCard, setFlyingCard] = useState<{
    value: string
    label?: string
    targetY: number
  } | null>(null)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [rollingDice, setRollingDice] = useState(false)
  const [muted, setMutedState] = useState(false)

  useEffect(() => {
    setMutedState(isMuted())
    playNewRound()
  }, [])

  const toggleMuted = () => {
    setMuted(!muted)
    setMutedState(!muted)
  }
  const prevRevealed = useRef(false)
  const tableRef = useRef<HTMLDivElement>(null)
  const latestVotes = useRef<string[]>([])
  useEffect(() => {
    latestVotes.current = Object.values(state.participants)
      .map((p) => p.vote)
      .filter((v): v is string => v !== null)
  })

  useEffect(() => {
    const was = prevRevealed.current
    prevRevealed.current = state.revealed
    if (was === state.revealed) return
    if (state.revealed) playReveal()
    else playNewRound()
    setAnnouncement(
      state.revealed
        ? revealQuip(latestVotes.current)
        : {
            emoji: "🤵",
            title: "New round",
            sub: "Place your votes, ladies and gentlemen",
          },
    )
    const timer = setTimeout(() => setAnnouncement(null), 3000)
    return () => clearTimeout(timer)
  }, [state.revealed])

  useEffect(() => {
    if (!state.speaker) return
    playDice()
    setRollingDice(true)
    const timer = setTimeout(() => setRollingDice(false), 900)
    return () => clearTimeout(timer)
  }, [state.speaker])

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
    onVote(value)
    playVote()
    const tableVisible = tableRef.current?.offsetParent != null
    if (!tableVisible) return
    const card = state.deck.cards.find((c) => c.value === value)
    const cardCenterFromTop = window.innerHeight - 110 - 40
    const rect = tableRef.current!.getBoundingClientRect()
    const targetY = rect.top + rect.height / 2 - cardCenterFromTop
    setFlyingCard({ ...(card ?? { value }), targetY })
    setTimeout(() => setFlyingCard(null), 750)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return
      const key = e.key.toLowerCase()
      if (!state.revealed && /^[0-9]$/.test(key)) {
        const index = key === "0" ? 9 : Number(key) - 1
        const card = state.deck.cards[index]
        if (card) handleVote(card.value)
      }
      const anyVotes = Object.values(state.participants).some(
        (p) => p.vote !== null,
      )
      if (isHost && key === "r" && !state.revealed && anyVotes) onReveal?.()
      if (isHost && key === "n" && state.revealed) onReset?.()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const me = state.participants[myId]
  const participants = Object.values(state.participants)
  const others = participants.filter((p) => p.id !== myId)
  const seated = me ? [me, ...others] : others
  const allVoted = participants.every((p) => p.vote !== null)
  const voteCount = participants.filter((p) => p.vote !== null).length
  const s = THEME_STYLES[theme]

  useEffect(() => {
    document.title = state.revealed
      ? "Revealed · Planning Poker"
      : `${voteCount}/${participants.length} voted · Planning Poker`
    return () => {
      document.title = "Planning Poker"
    }
  }, [state.revealed, voteCount, participants.length])

  const votes = participants.map((p) => p.vote).filter(Boolean)
  const isConsensus =
    votes.length > 1 &&
    votes.every((v) => v === votes[0]) &&
    !["?", "☕"].includes(votes[0]!)

  useEffect(() => {
    if (!state.revealed || !isConsensus) return
    playConsensus()
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
      className={`flex flex-col h-dvh ${s.text}`}
      style={{ background: s.bg }}
    >
      {/* Header */}
      <header
        className={`flex-none border-b ${s.header} backdrop-blur-md px-3 sm:px-6 py-2 sm:py-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 z-10`}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-xl">🃏</span>
          <span className="font-semibold tracking-tight hidden md:inline">
            Planning Poker
          </span>
          <span
            className="text-[11px] sm:text-xs font-mono px-2 py-0.5 rounded-full border whitespace-nowrap"
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

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMuted}
            className={`border text-sm ${s.themeBtn}`}
            aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          >
            {muted ? "🔇" : "🔊"}
          </Button>
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

      {/* Table area */}
      <main className="flex-1 relative flex items-center justify-center overflow-hidden">
        <PixelPet />
        {/* Mobile — roster grid, no table */}
        <div className="md:hidden w-full max-h-full overflow-y-auto px-4 py-5 flex flex-col items-center gap-6">
          <div
            data-tour="table"
            className={cn(
              "grid gap-x-3 gap-y-5 justify-items-center w-full max-w-sm",
              seated.length > 6 ? "grid-cols-4" : "grid-cols-3",
            )}
          >
            <AnimatePresence>
              {seated.map((participant, i) => (
                <motion.div
                  key={participant.id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 24,
                    delay: i * 0.04,
                  }}
                  className="flex flex-col items-center gap-2"
                >
                  <SeatAvatar
                    participant={participant}
                    theme={theme}
                    isSpeaker={participant.id === state.speaker}
                  />
                  {participant.vote !== null ? (
                    <TableCard
                      participant={participant}
                      revealed={state.revealed}
                      index={i}
                      dealFrom={{ x: 0, y: -16 }}
                    />
                  ) : (
                    <div
                      className={cn(
                        "w-10 h-14 rounded-lg border-2 border-dashed",
                        theme === "dark"
                          ? "border-white/15"
                          : "border-slate-300",
                      )}
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div
            className="w-full max-w-sm rounded-[3rem] px-6 py-6 flex items-center justify-center"
            style={{ ...FELT_SURFACE, border: "8px solid #6b3d12" }}
          >
            <RoundControls
              state={state}
              isHost={isHost}
              voteCount={voteCount}
              allVoted={allVoted}
              total={participants.length}
              roomId={roomId}
              onReveal={onReveal}
              onReset={onReset}
              onRollSpeaker={onRollSpeaker}
            />
          </div>
        </div>

        {/* Desktop — poker table */}
        <div
          ref={tableRef}
          data-tour="table"
          className="relative hidden md:block"
          style={{ width: "min(640px, 74vw)", aspectRatio: "640 / 268" }}
        >
          {/* Felt */}
          <div
            className="absolute inset-0"
            style={{
              ...FELT_SURFACE,
              borderRadius: 9999,
              border: "10px solid #6b3d12",
            }}
          >
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ borderRadius: 9999 }}
            >
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
          </div>

          {/* Centre content */}
          <div className="absolute inset-0 flex items-center justify-center px-[12%]">
            <RoundControls
              state={state}
              isHost={isHost}
              voteCount={voteCount}
              allVoted={allVoted}
              total={participants.length}
              roomId={roomId}
              onReveal={onReveal}
              onReset={onReset}
              onRollSpeaker={onRollSpeaker}
            />
          </div>

          {/* Cards on the felt — one per participant who has voted */}
          <AnimatePresence>
            {seated.map(
              (participant, i) =>
                participant.vote !== null && (
                  <div
                    key={`card-${participant.id}`}
                    className="pointer-events-none"
                    style={cardStyle(seatAngle(i, seated.length))}
                  >
                    <TableCard
                      participant={participant}
                      revealed={state.revealed}
                      index={i}
                      dealFrom={{
                        x: 70 * Math.cos(seatAngle(i, seated.length)),
                        y: 56 * Math.sin(seatAngle(i, seated.length)),
                      }}
                    />
                  </div>
                ),
            )}
          </AnimatePresence>

          {/* Seats around the table — presence */}
          <AnimatePresence>
            {seated.map((participant, i) => (
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
                style={seatStyle(seatAngle(i, seated.length))}
              >
                <SeatAvatar
                  participant={participant}
                  theme={theme}
                  isSpeaker={participant.id === state.speaker}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* Hand */}
      <div
        className={cn(
          "flex-none border-t px-3 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4",
          s.hand,
        )}
      >
        <div
          data-tour="hand"
          className="flex flex-col items-center gap-3 sm:gap-5"
        >
          <div className="flex items-baseline gap-3">
            <p
              className={`text-[10px] sm:text-xs font-medium tracking-wide uppercase ${s.handLabel}`}
            >
              {state.revealed ? "Waiting for next round…" : "Your hand"}
            </p>
            <p
              className={`hidden sm:block text-[10px] font-mono opacity-60 ${s.handLabel}`}
            >
              {isHost
                ? state.revealed
                  ? "N — new round"
                  : "1–9 vote · R reveal"
                : state.revealed
                  ? ""
                  : "press 1–9 to vote"}
            </p>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={state.deck.preset}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex flex-wrap justify-center sm:flex-nowrap sm:overflow-x-auto gap-2 sm:gap-3 max-w-full px-2 pt-3 sm:pt-4 pb-1"
            >
              {state.deck.cards.map((card, i) => (
                <motion.div
                  key={card.value}
                  className="flex-none"
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
                    hotkey={i < 9 ? String(i + 1) : i === 9 ? "0" : undefined}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <OnboardingHints isHost={isHost} />

      {/* Dealer announcements — new round & reveal commentary */}
      <AnimatePresence>
        {announcement && (
          <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: -16 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="flex items-center gap-3 rounded-full border-2 border-yellow-500/60 bg-[#10131f]/90 backdrop-blur-md px-6 py-3 shadow-[0_0_40px_rgba(234,179,8,0.3)]"
            >
              <span className="text-2xl">{announcement.emoji}</span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-yellow-100 tracking-wide">
                  {announcement.title}
                </span>
                <span className="text-xs text-yellow-200/60 italic">
                  {announcement.sub}
                </span>
              </div>
              <span className="text-2xl">🃏</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Speaker pick — dice roll then the floor is yours */}
      <AnimatePresence>
        {state.speaker && state.participants[state.speaker] && (
          <motion.div
            key={state.speaker}
            initial={{ opacity: 0, y: -12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="fixed top-14 sm:top-16 inset-x-0 z-30 flex justify-center pointer-events-none"
          >
            <div className="flex items-center gap-2.5 rounded-full border border-amber-400/40 bg-[#10131f]/90 backdrop-blur-md px-4 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
              {rollingDice ? (
                <motion.span
                  animate={{ rotate: 720 }}
                  transition={{ duration: 0.85, ease: "easeOut" }}
                  className="text-lg"
                >
                  🎲
                </motion.span>
              ) : (
                <span className="text-lg">🎤</span>
              )}
              <span className="text-sm font-medium text-amber-100">
                {rollingDice
                  ? "Rolling…"
                  : `${state.participants[state.speaker].name}, the floor is yours`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
