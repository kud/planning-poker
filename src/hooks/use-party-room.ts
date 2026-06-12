"use client"

import { useState } from "react"
import usePartySocket from "partysocket/react"
import { Deck, Message, RoomState } from "@/lib/types"

const PARTYKIT_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST ??
  (process.env.NODE_ENV === "development"
    ? "127.0.0.1:1999"
    : "planning-poker.kud.partykit.dev")

type Options = {
  roomId: string
  name: string
  avatar: string
  hostSecret?: string
  clientId: string
}

export const usePartyRoom = ({
  roomId,
  name,
  avatar,
  hostSecret,
  clientId,
}: Options) => {
  const [state, setState] = useState<RoomState | null>(null)
  const [connected, setConnected] = useState(false)

  const socket = usePartySocket({
    host: PARTYKIT_HOST,
    room: roomId,
    query: {
      clientId,
      name,
      avatar,
      ...(hostSecret ? { hostSecret } : {}),
    },
    onOpen() {
      setConnected(true)
    },
    onClose() {
      setConnected(false)
    },
    onMessage(e: MessageEvent) {
      const msg = JSON.parse(e.data) as Message
      if (msg.type === "state") setState(msg.state)
    },
  })

  const send = (msg: Message) => socket.send(JSON.stringify(msg))

  return {
    state,
    connected,
    vote: (value: string) => send({ type: "vote", value }),
    reveal: () => send({ type: "reveal" }),
    reset: () => send({ type: "reset" }),
    setDeck: (deck: Deck) => send({ type: "set-deck", deck }),
    updateProfile: (name: string, avatar: string) =>
      send({ type: "update-profile", name, avatar }),
  }
}
