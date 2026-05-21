const STUN_ONLY = [{ urls: "stun:stun.l.google.com:19302" }]

export const GET = async () => {
  const domain = process.env.METERED_DOMAIN
  const secretKey = process.env.METERED_SECRET_KEY

  if (!domain || !secretKey) {
    return Response.json(STUN_ONLY)
  }

  try {
    const res = await fetch(
      `https://${domain}/api/v1/turn/credentials?apiKey=${secretKey}`,
    )
    if (!res.ok) throw new Error("Metered API error")
    const iceServers = await res.json()
    return Response.json(iceServers, {
      headers: { "Cache-Control": "private, max-age=3600" },
    })
  } catch {
    return Response.json(STUN_ONLY)
  }
}
