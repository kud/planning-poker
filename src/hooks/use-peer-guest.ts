"use client"

import { useEffect, useRef, useState } from "react"
import type { DataConnection, Peer as PeerType } from "peerjs"
import { peerOptions } from "@/lib/peer-config"
import { Message, RoomState } from "@/lib/types"

export const usePeerGuest = (hostId: string, name: string, avatar: string) => {
  const [state, setState] = useState<RoomState | null>(null)
  const [connected, setConnected] = useState(false)
  const [myId, setMyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const connRef = useRef<DataConnection | null>(null)

  useEffect(() => {
    if (!hostId || !name) return
    let peer: PeerType
    let cancelled = false

    const init = async () => {
      const { default: Peer } = await import("peerjs")
      if (cancelled) return
      peer = new Peer(peerOptions())

      peer.on("open", (id) => {
        if (cancelled) {
          peer.destroy()
          return
        }
        setMyId(id)
        const conn = peer.connect(hostId)
        connRef.current = conn

        conn.on("open", () => {
          conn.send({ type: "join", name, avatar } satisfies Message)
          setConnected(true)
        })

        conn.on("data", (raw) => {
          const data = raw as Message
          if (data.type === "state") setState(data.state)
        })

        conn.on("close", () => {
          setConnected(false)
          setError("Disconnected from host.")
        })

        conn.on("error", () => setError("Could not connect to room."))
      })

      peer.on("error", () => setError("Could not connect to room."))
    }

    init()
    return () => {
      cancelled = true
      peer?.destroy()
    }
  }, [hostId, name, avatar])

  const vote = (value: string) => {
    connRef.current?.send({ type: "vote", value } satisfies Message)
  }

  const updateProfile = (name: string, avatar: string) => {
    connRef.current?.send({
      type: "update-profile",
      name,
      avatar,
    } satisfies Message)
  }

  return { state, connected, myId, vote, updateProfile, error }
}
