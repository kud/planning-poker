// Session-wide tallies the server folds over each revealed round. Kept free of
// any import from types.ts so RoomState can reference SessionStats without a
// circular dependency — and so the whole thing stays a pure, testable reducer.

const NON_NUMERIC = ["?", "☕"]

export type PlayerTally = { name: string; rounds: number; hits: number }

export type SessionStats = {
  rounds: number
  consensusRounds: number
  currentStreak: number
  bestStreak: number
  players: Record<string, PlayerTally>
}

export type RevealVoter = {
  id: string
  name: string
  vote: string | null
  isSpectator?: boolean
}

export const freshStats = (): SessionStats => ({
  rounds: 0,
  consensusRounds: 0,
  currentStreak: 0,
  bestStreak: 0,
  players: {},
})

const modeValue = (votes: string[]) => {
  const counts: Record<string, number> = {}
  let best = votes[0]
  let bestCount = 0
  for (const v of votes) {
    const next = (counts[v] ?? 0) + 1
    counts[v] = next
    if (next > bestCount) {
      best = v
      bestCount = next
    }
  }
  return best
}

const isConsensus = (votes: string[]) =>
  votes.length > 1 &&
  votes.every((v) => v === votes[0]) &&
  !NON_NUMERIC.includes(votes[0])

// Fold one revealed round into the running tallies. A round with no cast votes
// (e.g. everyone's a spectator) is a no-op so it can't break a consensus streak.
export const recordReveal = (
  stats: SessionStats,
  participants: RevealVoter[],
): SessionStats => {
  const voters = participants.filter((p) => !p.isSpectator && p.vote !== null)
  const votes = voters.map((p) => p.vote as string)
  if (votes.length === 0) return stats

  const mode = modeValue(votes)
  const consensus = isConsensus(votes)
  const currentStreak = consensus ? stats.currentStreak + 1 : 0

  const players = { ...stats.players }
  for (const voter of voters) {
    const prev = players[voter.id] ?? { name: voter.name, rounds: 0, hits: 0 }
    players[voter.id] = {
      name: voter.name,
      rounds: prev.rounds + 1,
      hits: prev.hits + (voter.vote === mode ? 1 : 0),
    }
  }

  return {
    rounds: stats.rounds + 1,
    consensusRounds: stats.consensusRounds + (consensus ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    players,
  }
}

export type Award = {
  key: string
  emoji: string
  title: string
  player: string
  detail: string
}

const rate = (p: PlayerTally) => p.hits / p.rounds
const pct = (n: number) => Math.round(n * 100)

// Light-hearted end-of-session awards. Only meaningful once a couple of people
// have a couple of rounds under their belt, so we gate on that to avoid naming
// a "winner" off a single round.
export const computeAwards = (stats: SessionStats): Award[] => {
  const entries = Object.values(stats.players).filter((p) => p.rounds >= 2)
  if (entries.length < 2) return []

  const ranked = [...entries].sort(
    (a, b) => rate(b) - rate(a) || b.rounds - a.rounds,
  )
  const best = ranked[0]
  const worst = ranked[ranked.length - 1]
  if (rate(best) <= rate(worst)) return []

  return [
    {
      key: "deadon",
      emoji: "🎯",
      title: "Dead-on",
      player: best.name,
      detail: `sided with the table ${pct(rate(best))}% of the time`,
    },
    {
      key: "freespirit",
      emoji: "🦄",
      title: "Free spirit",
      player: worst.name,
      detail: `went their own way (${pct(rate(worst))}% with the table)`,
    },
  ]
}
