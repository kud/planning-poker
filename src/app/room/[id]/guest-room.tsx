"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"
import Link from "next/link"
import { RoomView } from "@/components/room-view"
import { usePartyRoom } from "@/hooks/use-party-room"
import { useShareRoom } from "@/hooks/use-share-room"
import { loadPreferredDeck, savePreferredDeck } from "@/lib/settings"
import { Deck } from "@/lib/types"

type Props = { hostId: string; name: string; avatar: string }

const emptySubscribe = () => () => {}

const readOrCreateClientId = (roomId: string) => {
  const key = `poker-client-${roomId}`
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem(key, id)
  return id
}

export const GuestRoom = ({ hostId, name, avatar }: Props) => {
  const clientId = useSyncExternalStore(
    emptySubscribe,
    () => readOrCreateClientId(hostId),
    () => null,
  )
  const hostSecret = useSyncExternalStore(
    emptySubscribe,
    () => localStorage.getItem(`poker-host-${hostId}`),
    () => null,
  )

  if (!clientId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground animate-pulse">
          Connecting to room…
        </p>
      </div>
    )
  }

  return (
    <GuestRoomConnected
      roomId={hostId}
      name={name}
      avatar={avatar}
      clientId={clientId}
      hostSecret={hostSecret ?? undefined}
    />
  )
}

const GuestRoomConnected = ({
  roomId,
  name,
  avatar,
  clientId,
  hostSecret,
}: {
  roomId: string
  name: string
  avatar: string
  clientId: string
  hostSecret?: string
}) => {
  const {
    state,
    connected,
    vote,
    reveal,
    reset,
    setDeck,
    rollSpeaker,
    updateProfile,
  } = usePartyRoom({
    roomId,
    name,
    avatar,
    hostSecret,
    clientId,
  })
  const { copiedMode, copyCode, copyLink } = useShareRoom(roomId)
  const preferredDeckApplied = useRef(false)

  const amHost = state?.participants[clientId]?.isHost ?? false

  useEffect(() => {
    if (!state || !amHost || preferredDeckApplied.current) return
    preferredDeckApplied.current = true
    const roomIsFresh =
      Object.keys(state.participants).length <= 1 &&
      !state.revealed &&
      Object.values(state.participants).every((p) => p.vote === null)
    if (!roomIsFresh) return
    const preferred = loadPreferredDeck()
    if (preferred && JSON.stringify(preferred) !== JSON.stringify(state.deck))
      setDeck(preferred)
  }, [state, amHost, setDeck])

  const applyDeck = (deck: Deck) => {
    savePreferredDeck(deck)
    setDeck(deck)
  }

  if (!connected || !state) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-3">
        <p className="text-muted-foreground animate-pulse">
          Connecting to room…
        </p>
        <Link
          href="/"
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          Back to home
        </Link>
      </div>
    )
  }

  const isHost = state.participants[clientId]?.isHost ?? false

  return (
    <RoomView
      state={state}
      myId={clientId}
      isHost={isHost}
      onVote={vote}
      onReveal={reveal}
      onReset={reset}
      onSetDeck={applyDeck}
      onRollSpeaker={rollSpeaker}
      onCopyCode={copyCode}
      onCopyLink={copyLink}
      copiedMode={copiedMode}
      onUpdateProfile={updateProfile}
    />
  )
}
