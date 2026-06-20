"use client"

import { Timer, Dices } from "lucide-react"
import { Deck } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { SaveRoundControl } from "@/components/save-round-control"
import { cn } from "@/lib/utils"

type Props = {
  revealed: boolean
  autoReveal: boolean
  deck: Deck
  spokenCount: number
  participantCount: number
  voteCount: number
  suggestedEstimate: string | null
  headerClass: string
  theme?: "dark" | "light"
  timerActive?: boolean
  onReveal?: () => void
  onReset?: () => void
  onRollSpeaker?: () => void
  onSaveRound?: (estimate: string) => void
  onSetAutoReveal?: (enabled: boolean) => void
  onStartTimer?: (seconds: number) => void
  onClearTimer?: () => void
}

const TIMER_PRESETS = [
  { seconds: 30, label: "30s" },
  { seconds: 60, label: "1m" },
  { seconds: 120, label: "2m" },
]

export const HostActions = ({
  revealed,
  autoReveal,
  deck,
  spokenCount,
  participantCount,
  voteCount,
  suggestedEstimate,
  headerClass,
  theme = "dark",
  timerActive,
  onReveal,
  onReset,
  onRollSpeaker,
  onSaveRound,
  onSetAutoReveal,
  onStartTimer,
  onClearTimer,
}: Props) => {
  const light = theme === "light"
  const neutralPill = light
    ? "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
    : "border-white/15 bg-white/5 text-white/55 hover:bg-white/10"
  const neutralTrack = light ? "bg-slate-300" : "bg-white/25"
  const emeraldOn = light
    ? "border-emerald-500/60 bg-emerald-100 text-emerald-700"
    : "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
  const amberOn = light
    ? "border-amber-500/60 bg-amber-100 text-amber-700 hover:bg-amber-200"
    : "border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25"

  return (
    <div
      className={`flex-none border-b ${headerClass} backdrop-blur-md px-3 py-2 flex items-center justify-center gap-2.5 z-10`}
    >
      {!revealed ? (
        <>
          <Button
            size="sm"
            data-tour="reveal"
            onClick={onReveal}
            className={cn(
              "bg-red-700 hover:bg-red-600 text-white border border-yellow-500/40 shadow-[0_0_20px_rgba(185,28,28,0.5),inset_0_1px_0_rgba(255,220,100,0.2)] font-semibold tracking-wide",
              voteCount === 0 && "opacity-40 pointer-events-none",
            )}
          >
            Reveal cards
          </Button>
          {onSetAutoReveal && (
            <button
              type="button"
              role="switch"
              aria-checked={autoReveal}
              onClick={() => onSetAutoReveal(!autoReveal)}
              title="Reveal automatically once everyone has voted"
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-wide transition-colors select-none",
                autoReveal ? emeraldOn : neutralPill,
              )}
            >
              <span
                className={cn(
                  "relative h-3.5 w-6 rounded-full transition-colors",
                  autoReveal ? "bg-emerald-500/80" : neutralTrack,
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-all",
                    autoReveal ? "left-3" : "left-0.5",
                  )}
                />
              </span>
              Auto-reveal
            </button>
          )}
          {onStartTimer &&
            (timerActive ? (
              <button
                type="button"
                onClick={onClearTimer}
                title="Cancel the round timer"
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-wide transition-colors",
                  amberOn,
                )}
              >
                <Timer className="h-3.5 w-3.5" /> Cancel timer
              </button>
            ) : (
              <div
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]",
                  neutralPill,
                )}
              >
                <span
                  title="Start a countdown for this round"
                  className="px-0.5"
                >
                  <Timer className="h-3.5 w-3.5" />
                </span>
                {TIMER_PRESETS.map((p) => (
                  <button
                    key={p.seconds}
                    type="button"
                    onClick={() => onStartTimer(p.seconds)}
                    className={cn(
                      "rounded-full px-2 py-0.5 font-medium transition-colors",
                      light
                        ? "hover:bg-slate-200 hover:text-slate-900"
                        : "hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            ))}
        </>
      ) : (
        <>
          {onSaveRound && (
            <SaveRoundControl
              deck={deck}
              suggested={suggestedEstimate}
              onSave={onSaveRound}
              theme={theme}
            />
          )}
          {onRollSpeaker &&
            participantCount > 1 &&
            spokenCount < participantCount && (
              <Button
                size="sm"
                onClick={onRollSpeaker}
                className={cn("flex items-center gap-1.5 border", amberOn)}
              >
                <Dices className="h-4 w-4" />{" "}
                {spokenCount === 0 ? "First speaker" : "Next speaker"}
              </Button>
            )}
          <Button
            size="sm"
            onClick={onReset}
            className={cn(
              "border",
              light
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                : "border-white/20 bg-white/10 text-white hover:bg-white/20",
            )}
          >
            New round
          </Button>
          {participantCount > 1 && spokenCount > 0 && (
            <span
              className={cn(
                "text-[10px] tracking-wide uppercase",
                light ? "text-slate-400" : "text-white/40",
              )}
            >
              {spokenCount >= participantCount
                ? "Everyone spoke 🎉"
                : `${spokenCount} of ${participantCount} spoke`}
            </span>
          )}
        </>
      )}
    </div>
  )
}
