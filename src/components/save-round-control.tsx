"use client"

import { useState } from "react"
import { Deck } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  deck: Deck
  suggested: string | null
  onSave: (estimate: string) => void
  theme?: "dark" | "light"
}

export const SaveRoundControl = ({
  deck,
  suggested,
  onSave,
  theme = "dark",
}: Props) => {
  const [picked, setPicked] = useState<string | null>(suggested)
  const light = theme === "light"

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <span
        className={cn(
          "text-[10px] uppercase tracking-wide",
          light ? "text-slate-500" : "text-white/40",
        )}
      >
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
                ? light
                  ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                  : "border-emerald-400/60 bg-emerald-500/25 text-emerald-100"
                : light
                  ? "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
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
