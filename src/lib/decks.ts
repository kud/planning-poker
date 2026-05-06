import { Card, Deck, DeckPreset } from "@/lib/types"

export const DECK_PRESETS: Record<
  Exclude<DeckPreset, "custom">,
  { name: string; cards: Card[] }
> = {
  fibonacci: {
    name: "Fibonacci",
    cards: [
      { value: "0" },
      { value: "½" },
      { value: "1" },
      { value: "2" },
      { value: "3" },
      { value: "5" },
      { value: "8" },
      { value: "13" },
      { value: "21" },
      { value: "?" },
      { value: "☕" },
    ],
  },
  numeric: {
    name: "Numeric",
    cards: [
      { value: "1", label: "XS" },
      { value: "2", label: "S" },
      { value: "4", label: "M" },
      { value: "8", label: "L" },
      { value: "16", label: "XL" },
      { value: "32", label: "XXL" },
    ],
  },
  tshirt: {
    name: "T-shirt",
    cards: [
      { value: "XS" },
      { value: "S" },
      { value: "M" },
      { value: "L" },
      { value: "XL" },
      { value: "XXL" },
    ],
  },
}

export const parseCustomDeck = (input: string): Card[] =>
  input
    .split(",")
    .map((v) => ({ value: v.trim() }))
    .filter((c) => c.value.length > 0)

export const defaultDeck = (): Deck => ({
  preset: "fibonacci",
  cards: DECK_PRESETS.fibonacci.cards,
})
