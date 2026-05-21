import type { PeerJSOption } from "peerjs"

export const fetchPeerOptions = async (): Promise<PeerJSOption> => {
  try {
    const res = await fetch("/api/turn")
    if (!res.ok) throw new Error("turn fetch failed")
    const iceServers: RTCIceServer[] = await res.json()
    return { config: { iceServers } }
  } catch {
    return {
      config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] },
    }
  }
}
