"use client"

import { useState } from "react"
import { Deck } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  deck: Deck
  suggested: string | null
  onSave: (estimate: string) => void
}

export const SaveRoundControl = ({ deck, suggested, onSave }: Props) => {
  const [picked, setPicked] = useState<string | null>(suggested)

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wide text-white/40">
        Final
      </span>
      <div className="flex flex-wrap gap-1">
        {deck.cards.map((card) => (
          <button
            key={card.value}
            onClick={() => setPicked(card.value)}
            className={cn(
              "min-w-7 rounded-md border px-1.5 py-0.5 text-xs font-semibold transition-colors",
              picked === card.value
                ? "border-emerald-400/60 bg-emerald-500/25 text-emerald-100"
                : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10",
            )}
          >
            {card.value}
          </button>
        ))}
      </div>
      <Button
        size="sm"
        disabled={picked === null}
        onClick={() => picked !== null && onSave(picked)}
        className="border border-emerald-400/40 bg-emerald-600/80 text-white hover:bg-emerald-600 disabled:opacity-40"
      >
        Save &amp; next round
      </Button>
    </div>
  )
}
