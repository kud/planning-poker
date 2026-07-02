"use client"

import { useRef, useState } from "react"
import usePartySocket from "partysocket/react"
import {
  CardValue,
  CatStroll,
  Deck,
  Message,
  PropId,
  RoomState,
  Snack,
} from "@/lib/types"
import { freshStats } from "@/lib/session-stats"

export type ConnectionStatus = "connecting" | "connected" | "reconnecting"

// Fill in any fields an older/partial server might omit, so the room never
// crashes on a version mismatch (e.g. mid-deploy when client and server differ).
const normalizeState = (s: Partial<RoomState>): RoomState => ({
  deck: s.deck ?? { preset: "fibonacci", cards: [] },
  participants: s.participants ?? {},
  revealed: s.revealed ?? false,
  speaker: s.speaker ?? null,
  spoken: s.spoken ?? [],
  topic: s.topic ?? null,
  history: s.history ?? [],
  autoReveal: s.autoReveal ?? false,
  rageEnabled: s.rageEnabled ?? false,
  break: s.break ?? null,
  requireApproval: s.requireApproval ?? false,
  pending: s.pending ?? {},
  timer: s.timer ?? null,
  sessionStats: s.sessionStats ?? freshStats(),
})

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

export type PropPoke = {
  id: number
  from: string
  name: string
  prop: PropId
  variant?: string
}

const REACTION_LIFETIME_MS = 4000
const PRESENCE_LIFETIME_MS = 4500
const PROP_POKE_LIFETIME_MS = 2600

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
  const [propPokes, setPropPokes] = useState<PropPoke[]>([])
  const propPokeId = useRef(0)
  const [catStroll, setCatStroll] = useState<CatStroll | null>(null)
  const ragePlayers = useRef<Map<string, RagePlayer>>(new Map())
  // Ref-backed queues drained by the arena each frame (like `ragePlayers`) —
  // incoming spawns and eaten-claims. Capped so they can't grow unbounded when
  // no arena is mounted to drain them.
  const snackDrops = useRef<Snack[]>([])
  const snackEats = useRef<{ id: string; by: string }[]>([])
  const [rageInvite, setRageInvite] = useState<RageInvite | null>(null)
  const [rageRestart, setRageRestart] = useState(0)

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
      if (msg.type === "state") setState(normalizeState(msg.state))
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
      if (msg.type === "prop-poked") {
        const id = ++propPokeId.current
        setPropPokes((current) => [
          ...current,
          {
            id,
            from: msg.from,
            name: msg.name,
            prop: msg.prop,
            variant: msg.variant,
          },
        ])
        setTimeout(
          () => setPropPokes((current) => current.filter((p) => p.id !== id)),
          PROP_POKE_LIFETIME_MS,
        )
      }
      if (msg.type === "cat-strolled") {
        setCatStroll(msg.stroll)
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
      if (msg.type === "snack-dropped") {
        snackDrops.current = [...snackDrops.current, msg.snack].slice(-60)
      }
      if (msg.type === "snack-eaten") {
        snackEats.current = [
          ...snackEats.current,
          { id: msg.id, by: msg.by },
        ].slice(-120)
      }
      if (msg.type === "rage-restarted") {
        ragePlayers.current.clear()
        snackDrops.current = []
        snackEats.current = []
        setRageRestart((n) => n + 1)
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
    propPokes,
    pokeProp: (prop: PropId, variant?: string) =>
      send({ type: "poke-prop", prop, variant }),
    catStroll,
    sendCatStroll: (stroll: CatStroll) => send({ type: "cat-stroll", stroll }),
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
    setSpectator: (enabled: boolean) =>
      send({ type: "set-spectator", enabled }),
    startTimer: (seconds: number) => send({ type: "start-timer", seconds }),
    clearTimer: () => send({ type: "clear-timer" }),
    requestBreak: () => send({ type: "request-break" }),
    voteBreak: (accept: boolean) => send({ type: "break-vote", accept }),
    setBreakTime: (seconds: number) =>
      send({ type: "set-break-time", seconds }),
    endBreak: () => send({ type: "end-break" }),
    setApproval: (enabled: boolean) => send({ type: "set-approval", enabled }),
    admit: (clientId: string) => send({ type: "admit", clientId }),
    deny: (clientId: string) => send({ type: "deny", clientId }),
    setRage: (enabled: boolean) => send({ type: "set-rage", enabled }),
    inviteToRage: () => send({ type: "rage-invite" }),
    sendRageMove: (x: number, y: number, punching: boolean, hp: number) =>
      send({ type: "rage-move", x, y, punching, hp }),
    dropSnack: (snack: Snack) => send({ type: "snack-drop", snack }),
    eatSnack: (id: string) => send({ type: "snack-eat", id }),
    snackDrops,
    snackEats,
    ragePlayers,
    rageInvite,
    dismissRageInvite: () => setRageInvite(null),
    rageRestart,
    requestRageRestart: () => send({ type: "rage-restart" }),
  }
}
