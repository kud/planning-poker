// How long the dealer's bubble stays up. The reveal quip clears sooner so the
// freshly flipped cards are readable; everything else keeps the longer dwell.
export const ANNOUNCE_DWELL_MS = {
  default: 3000,
  reveal: 2000,
} as const
