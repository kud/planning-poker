"use client"

import { useRef, useState } from "react"
import usePartySocket from "partysocket/react"
import { Deck, Message, RoomState } from "@/lib/types"

export type Reaction = {
  id: number
  from: string
  name: string
  emoji: string
}

export type PresenceEvent = {
  id: number
  event: "join" | "leave"
  clientId: string
  name: string
  avatar: string
}

const REACTION_LIFETIME_MS = 4000
const PRESENCE_LIFETIME_MS = 4500

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
  const [reactions, setReactions] = useState<Reaction[]>([])
  const reactionId = useRef(0)
  const [presenceEvents, setPresenceEvents] = useState<PresenceEvent[]>([])
  const presenceId = useRef(0)

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
      if (msg.type === "reaction") {
        const id = ++reactionId.current
        setReactions((current) => [
          ...current,
          { id, from: msg.from, name: msg.name, emoji: msg.emoji },
        ])
        setTimeout(
          () => setReactions((current) => current.filter((r) => r.id !== id)),
          REACTION_LIFETIME_MS,
        )
      }
      if (msg.type === "presence" && msg.clientId !== clientId) {
        const id = ++presenceId.current
        setPresenceEvents((current) => [
          ...current,
          {
            id,
            event: msg.event,
            clientId: msg.clientId,
            name: msg.name,
            avatar: msg.avatar,
          },
        ])
        setTimeout(
          () =>
            setPresenceEvents((current) => current.filter((p) => p.id !== id)),
          PRESENCE_LIFETIME_MS,
        )
      }
    },
  })

  const send = (msg: Message) => socket.send(JSON.stringify(msg))

  return {
    state,
    connected,
    reactions,
    presenceEvents,
    react: (emoji: string) => send({ type: "react", emoji }),
    vote: (value: string) => send({ type: "vote", value }),
    reveal: () => send({ type: "reveal" }),
    reset: () => send({ type: "reset" }),
    setDeck: (deck: Deck) => send({ type: "set-deck", deck }),
    rollSpeaker: () => send({ type: "roll-speaker" }),
    updateProfile: (name: string, avatar: string) =>
      send({ type: "update-profile", name, avatar }),
  }
}
