"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { DECK_PRESETS, parseCustomDeck } from "@/lib/decks"
import { Card, Deck, DeckPreset } from "@/lib/types"

type Props = {
  currentDeck: Deck
  onApply: (deck: Deck) => void
}

const CardPreview = ({ cards }: { cards: Card[] }) => (
  <div className="flex flex-wrap gap-2">
    {cards.map((c) => (
      <span
        key={c.value}
        className="inline-flex flex-col items-center justify-center w-12 h-16 rounded-lg border-2 border-slate-200 bg-[#fffdf7] shadow-sm text-base font-bold text-slate-800 leading-none"
      >
        {c.value}
        {c.label && (
          <span className="mt-1 text-[10px] font-semibold text-slate-400">
            {c.label}
          </span>
        )}
      </span>
    ))}
  </div>
)

export const DeckSelector = ({ currentDeck, onApply }: Props) => {
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState<DeckPreset>(currentDeck.preset)
  const [customInput, setCustomInput] = useState("")

  const previewCards =
    preset === "custom"
      ? parseCustomDeck(customInput)
      : DECK_PRESETS[preset].cards

  const handleApply = () => {
    if (preset === "custom") {
      const cards = parseCustomDeck(customInput)
      if (cards.length === 0) return
      onApply({ preset: "custom", cards })
    } else {
      onApply({ preset, cards: DECK_PRESETS[preset].cards })
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 text-slate-300 hover:bg-white/8 hover:text-white"
          />
        }
      >
        Deck:{" "}
        {currentDeck.preset === "custom"
          ? "Custom"
          : DECK_PRESETS[currentDeck.preset].name}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Card Deck</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          <Select
            value={preset}
            onValueChange={(v) => setPreset(v as DeckPreset)}
          >
            <SelectTrigger className="w-full">
              <span className="flex flex-1 text-left text-sm">
                {preset === "custom" ? "Custom" : DECK_PRESETS[preset].name}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fibonacci">Fibonacci</SelectItem>
              <SelectItem value="numeric">Numeric</SelectItem>
              <SelectItem value="tshirt">T-shirt</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {preset === "custom" ? (
            <div className="flex flex-col gap-1">
              <Input
                placeholder="e.g. 1, 2, 4, 8, ?, coffee"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated values
              </p>
            </div>
          ) : (
            <CardPreview cards={previewCards} />
          )}

          {previewCards.length > 0 && preset === "custom" && (
            <CardPreview cards={previewCards} />
          )}

          <Button
            onClick={handleApply}
            disabled={preset === "custom" && customInput.trim() === ""}
          >
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
