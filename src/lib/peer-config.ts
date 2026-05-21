import type { PeerJSOption } from "peerjs"

const buildIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }]

  const url = process.env.NEXT_PUBLIC_TURN_URL
  const username = process.env.NEXT_PUBLIC_TURN_USERNAME
  const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL

  if (url && username && credential) {
    servers.push({ urls: url, username, credential })
  }

  return servers
}

export const peerOptions = (): PeerJSOption => ({
  config: { iceServers: buildIceServers() },
})
