import { CardValue } from "@/lib/types"

const NON_NUMERIC = ["?", "☕"]

export type VoteStats = {
  tally: { value: CardValue; count: number }[]
  numericVotes: number[]
  average: number | null
  median: number | null
  min: number | null
  max: number | null
  spread: number | null
  consensus: boolean
}

const median = (sorted: number[]) => {
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

const round1 = (n: number) => (n % 1 === 0 ? n : Number(n.toFixed(1)))

export const computeVoteStats = (votes: CardValue[]): VoteStats => {
  const counts = votes.reduce<Record<string, number>>((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1
    return acc
  }, {})
  const tally = Object.entries(counts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)

  const numericVotes = votes
    .filter((v) => !NON_NUMERIC.includes(v))
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b)

  const hasNumbers = numericVotes.length > 0
  const min = hasNumbers ? numericVotes[0] : null
  const max = hasNumbers ? numericVotes[numericVotes.length - 1] : null
  const average = hasNumbers
    ? round1(numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length)
    : null
  const med = median(numericVotes)

  const consensus =
    votes.length > 1 &&
    votes.every((v) => v === votes[0]) &&
    !NON_NUMERIC.includes(votes[0])

  return {
    tally,
    numericVotes,
    average,
    median: med === null ? null : round1(med),
    min,
    max,
    spread: min === null || max === null ? null : max - min,
    consensus,
  }
}
