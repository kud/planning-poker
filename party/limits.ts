// Abuse limits for a single room. Generous enough that an honest team never
// meets them; they only bound what one misbehaving client can cost the room.

// Open sockets per room, counting every tab.
export const MAX_CONNECTIONS = 120
// Distinct identities per room (seated participants plus the approval queue).
export const MAX_PARTICIPANTS = 60
// Largest accepted message. A full custom deck is well under 2 KB.
export const MAX_MESSAGE_CHARS = 16_384

// Token bucket for messages that change room state or fan out to everyone.
export const BUCKET_CAPACITY = 30
export const BUCKET_REFILL_PER_SECOND = 8

export type Bucket = { tokens: number; at: number }

export const freshBucket = (now: number): Bucket => ({
  tokens: BUCKET_CAPACITY,
  at: now,
})

// Refills by elapsed time, then spends one token if there is one. Returns
// whether the message may proceed.
export const takeToken = (bucket: Bucket, now: number) => {
  const elapsed = Math.max(0, now - bucket.at) / 1000
  bucket.tokens = Math.min(
    BUCKET_CAPACITY,
    bucket.tokens + elapsed * BUCKET_REFILL_PER_SECOND,
  )
  bucket.at = now
  if (bucket.tokens < 1) return false
  bucket.tokens -= 1
  return true
}
