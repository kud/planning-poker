"use client"

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
  onReveal?: () => void
  onReset?: () => void
  onRollSpeaker?: () => void
  onSaveRound?: (estimate: string) => void
  onSetAutoReveal?: (enabled: boolean) => void
}

export const HostActions = ({
  revealed,
  autoReveal,
  deck,
  spokenCount,
  participantCount,
  voteCount,
  suggestedEstimate,
  headerClass,
  onReveal,
  onReset,
  onRollSpeaker,
  onSaveRound,
  onSetAutoReveal,
}: Props) => (
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
          <label className="flex items-center gap-1.5 text-[11px] text-white/55 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoReveal}
              onChange={(e) => onSetAutoReveal(e.target.checked)}
              className="accent-emerald-500"
            />
            Auto-reveal when all voted
          </label>
        )}
      </>
    ) : (
      <>
        {onSaveRound && (
          <SaveRoundControl
            deck={deck}
            suggested={suggestedEstimate}
            onSave={onSaveRound}
          />
        )}
        {onRollSpeaker &&
          participantCount > 1 &&
          spokenCount < participantCount && (
            <Button
              size="sm"
              onClick={onRollSpeaker}
              className="border border-amber-400/30 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25"
            >
              🎲 {spokenCount === 0 ? "First speaker" : "Next speaker"}
            </Button>
          )}
        <Button
          size="sm"
          onClick={onReset}
          className="border-white/20 bg-white/10 text-white hover:bg-white/20"
        >
          New round
        </Button>
        {participantCount > 1 && spokenCount > 0 && (
          <span className="text-[10px] text-white/40 tracking-wide uppercase">
            {spokenCount >= participantCount
              ? "Everyone spoke 🎉"
              : `${spokenCount} of ${participantCount} spoke`}
          </span>
        )}
      </>
    )}
  </div>
)
