"use client"

import { useEffect, useRef, useState } from "react"
import type { DataConnection, Peer as PeerType } from "peerjs"
import { defaultDeck } from "@/lib/decks"
import { Card, Deck, Message, RoomState } from "@/lib/types"

const buildInitialState = (hostId: string): RoomState => ({
  story: "",
  deck: defaultDeck(),
  revealed: false,
  participants: {
    [hostId]: {
      id: hostId,
      name: "Host",
      avatar: "",
      vote: null,
      isHost: true,
    },
  },
})

const uniqueName = (
  name: string,
  existing: Record<string, { name: string }>,
) => {
  const taken = Object.values(existing).map((p) => p.name)
  if (!taken.includes(name)) return name
  let n = 2
  while (taken.includes(`${name} (${n})`)) n++
  return `${name} (${n})`
}

export const usePeerHost = (hostName: string, hostAvatar: string) => {
  const [peerId, setPeerId] = useState<string | null>(null)
  const [renderState, setRenderState] = useState<RoomState | null>(null)

  const stateRef = useRef<RoomState | null>(null)
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map())
  const peerRef = useRef<PeerType | null>(null)

  const broadcast = (state: RoomState) => {
    const msg: Message = { type: "state", state }
    connectionsRef.current.forEach((conn) => conn.send(msg))
  }

  const updateState = (updater: (prev: RoomState) => RoomState) => {
    if (!stateRef.current) return
    const next = updater(stateRef.current)
    stateRef.current = next
    setRenderState(next)
    broadcast(next)
  }

  useEffect(() => {
    let peer: PeerType
    let cancelled = false

    const init = async () => {
      const { default: Peer } = await import("peerjs")
      if (cancelled) return
      peer = new Peer()
      peerRef.current = peer

      peer.on("open", (id) => {
        if (cancelled) {
          peer.destroy()
          return
        }
        const initial = buildInitialState(id)
        initial.participants[id].name = hostName
        initial.participants[id].avatar = hostAvatar
        stateRef.current = initial
        setRenderState(initial)
        setPeerId(id)
      })

      peer.on("connection", (conn) => {
        connectionsRef.current.set(conn.peer, conn)

        conn.on("open", () => {
          conn.send({ type: "state", state: stateRef.current })
        })

        conn.on("data", (raw) => {
          const data = raw as Message
          if (data.type === "join") {
            updateState((prev) => {
              const name = uniqueName(data.name, prev.participants)
              return {
                ...prev,
                participants: {
                  ...prev.participants,
                  [conn.peer]: {
                    id: conn.peer,
                    name,
                    avatar: data.avatar,
                    vote: null,
                    isHost: false,
                  },
                },
              }
            })
          }
          if (data.type === "vote") {
            updateState((prev) => ({
              ...prev,
              participants: {
                ...prev.participants,
                [conn.peer]: {
                  ...prev.participants[conn.peer],
                  vote: data.value,
                },
              },
            }))
          }
          if (data.type === "update-profile") {
            updateState((prev) => {
              const excluded = Object.fromEntries(
                Object.entries(prev.participants).filter(
                  ([id]) => id !== conn.peer,
                ),
              )
              const resolved = uniqueName(data.name, excluded)
              return {
                ...prev,
                participants: {
                  ...prev.participants,
                  [conn.peer]: {
                    ...prev.participants[conn.peer],
                    name: resolved,
                    avatar: data.avatar,
                  },
                },
              }
            })
          }
        })

        conn.on("close", () => {
          connectionsRef.current.delete(conn.peer)
          updateState((prev) => {
            const next = { ...prev, participants: { ...prev.participants } }
            delete next.participants[conn.peer]
            return next
          })
        })
      })
    }

    init()
    return () => {
      cancelled = true
      peer?.destroy()
    }
  }, [hostName, hostAvatar])

  const reveal = () => updateState((prev) => ({ ...prev, revealed: true }))

  const reset = () =>
    updateState((prev) => ({
      ...prev,
      revealed: false,
      participants: Object.fromEntries(
        Object.entries(prev.participants).map(([id, p]) => [
          id,
          { ...p, vote: null },
        ]),
      ),
    }))

  const setStory = (story: string) =>
    updateState((prev) => ({ ...prev, story }))

  const setDeck = (deck: Deck) =>
    updateState((prev) => ({ ...prev, deck, revealed: false }))

  const vote = (value: Card["value"]) => {
    if (!peerId) return
    updateState((prev) => ({
      ...prev,
      participants: {
        ...prev.participants,
        [peerId]: { ...prev.participants[peerId], vote: value },
      },
    }))
  }

  const updateProfile = (name: string, avatar: string) => {
    if (!peerId) return
    updateState((prev) => {
      const excluded = Object.fromEntries(
        Object.entries(prev.participants).filter(([id]) => id !== peerId),
      )
      const resolved = uniqueName(name, excluded)
      return {
        ...prev,
        participants: {
          ...prev.participants,
          [peerId]: { ...prev.participants[peerId], name: resolved, avatar },
        },
      }
    })
  }

  return {
    peerId,
    state: renderState,
    myId: peerId,
    vote,
    reveal,
    reset,
    setStory,
    setDeck,
    updateProfile,
  }
}
