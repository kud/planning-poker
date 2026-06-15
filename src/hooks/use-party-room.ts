"use client"

import { useRef, useState } from "react"
import usePartySocket from "partysocket/react"
import { CardValue, Deck, Message, RoomState } from "@/lib/types"

export type ConnectionStatus = "connecting" | "connected" | "reconnecting"

export type RagePlayer = {
  x: number
  y: number
  punching: boolean
  hp: number
  at: number
}

export type RageInvite = { id: number; from: string; name: string }

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
  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const hasConnected = useRef(false)
  const [reactions, setReactions] = useState<Reaction[]>([])
  const reactionId = useRef(0)
  const [presenceEvents, setPresenceEvents] = useState<PresenceEvent[]>([])
  const presenceId = useRef(0)
  const ragePlayers = useRef<Map<string, RagePlayer>>(new Map())
  const [rageInvite, setRageInvite] = useState<RageInvite | null>(null)

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
      hasConnected.current = true
      setStatus("connected")
    },
    onClose() {
      setStatus(hasConnected.current ? "reconnecting" : "connecting")
    },
    onMessage(e: MessageEvent) {
      let msg: Message
      try {
        msg = JSON.parse(e.data) as Message
      } catch {
        return
      }
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
      if (msg.type === "rage" && msg.from !== clientId) {
        ragePlayers.current.set(msg.from, {
          x: msg.x,
          y: msg.y,
          punching: msg.punching,
          hp: msg.hp,
          at: Date.now(),
        })
      }
      if (msg.type === "rage-invited" && msg.from !== clientId) {
        setRageInvite({
          id: ++presenceId.current,
          from: msg.from,
          name: msg.name,
        })
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
    status,
    connected: status === "connected",
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
    setTopic: (title: string, url: string | null) =>
      send({ type: "set-topic", title, url }),
    saveRound: (estimate: CardValue) => send({ type: "save-round", estimate }),
    editHistory: (
      id: string,
      title: string,
      url: string | null,
      estimate: CardValue,
    ) => send({ type: "edit-history", id, title, url, estimate }),
    clearHistory: () => send({ type: "clear-history" }),
    setAutoReveal: (enabled: boolean) =>
      send({ type: "set-auto-reveal", enabled }),
    setRage: (enabled: boolean) => send({ type: "set-rage", enabled }),
    inviteToRage: () => send({ type: "rage-invite" }),
    sendRageMove: (x: number, y: number, punching: boolean, hp: number) =>
      send({ type: "rage-move", x, y, punching, hp }),
    ragePlayers,
    rageInvite,
    dismissRageInvite: () => setRageInvite(null),
  }
}
