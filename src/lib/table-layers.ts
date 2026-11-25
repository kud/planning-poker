// Paint order on the table. Cards always sit above the dealer's speech so a
// reveal is readable while he talks; the round stats stay above the cards.
export const TABLE_LAYER = {
  dealer: 5,
  cards: 6,
  centre: 10,
} as const

// Phone layout: the seat tiles (avatar + card) sit above the dealer's pill.
export const MOBILE_LAYER = {
  announcement: 30,
  seat: 31,
} as const