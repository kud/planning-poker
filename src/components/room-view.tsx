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
  onReveal,
  onReset,
}: {
  state: RoomState
  isHost: boolean
  voteCount: number
  allVoted: boolean
  total: number
  onReveal?: () => void
  onReset?: () => void
}) => (
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
        <span className="text-[10px] sm:text-xs font-semibold text-white/40 tracking-widest uppercase text-center">
          {allVoted
            ? "All voted — ready to reveal"
            : `${voteCount} of ${total} voted`}
        </span>
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
      </motion.div>
    ) : (
      <motion.div
        key="post-reveal"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center gap-2 sm:gap-3"
      >
        <VoteSummary
          participants={state.participants}
          revealed={state.revealed}
        />
        {isHost && (
          <Button
            size="sm"
            onClick={onReset}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            New round
          </Button>
        )}
      </motion.div>
    )}
  </AnimatePresence>
)

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
    onVote(value)
    const tableVisible = tableRef.current?.offsetParent != null
    if (!tableVisible) return
    const card = state.deck.cards.find((c) => c.value === value)
    const cardCenterFromTop = window.innerHeight - 110 - 40
    const rect = tableRef.current!.getBoundingClientRect()
    const targetY = rect.top + rect.height / 2 - cardCenterFromTop
    setFlyingCard({ ...(card ?? { value }), targetY })
    setTimeout(() => setFlyingCard(null), 750)
  }

  const me = state.participants[myId]
  const participants = Object.values(state.participants)
  const others = participants.filter((p) => p.id !== myId)
  const seated = me ? [me, ...others] : others
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
        {/* Mobile — roster grid, no table */}
        <div className="md:hidden w-full max-h-full overflow-y-auto px-4 py-5 flex flex-col items-center gap-6">
          <div
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
                  <SeatAvatar participant={participant} theme={theme} />
                  {participant.vote !== null ? (
                    <TableCard
                      participant={participant}
                      revealed={state.revealed}
                      index={i}
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
              onReveal={onReveal}
              onReset={onReset}
            />
          </div>
        </div>

        {/* Desktop — poker table */}
        <div
          ref={tableRef}
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
              onReveal={onReveal}
              onReset={onReset}
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
                <SeatAvatar participant={participant} theme={theme} />
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
        <div className="flex flex-col items-center gap-3 sm:gap-5">
          <p
            className={`text-[10px] sm:text-xs font-medium tracking-wide uppercase ${s.handLabel}`}
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
