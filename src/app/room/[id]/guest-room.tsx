"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"
import Link from "next/link"
import { RoomView } from "@/components/room-view"
import { RoomErrorBoundary } from "@/components/error-boundary"
import { usePartyRoom } from "@/hooks/use-party-room"
import { useShareRoom } from "@/hooks/use-share-room"
import { loadPreferredDeck, savePreferredDeck, touchRoom } from "@/lib/settings"
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
  useEffect(() => {
    touchRoom(hostId)
  }, [hostId])

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
    status,
    reactions,
    presenceEvents,
    react,
    vote,
    reveal,
    reset,
    setDeck,
    rollSpeaker,
    updateProfile,
    setTopic,
    saveRound,
    editHistory,
    clearHistory,
    setAutoReveal,
    setTimer,
    requestBreak,
    respondBreak,
    breakRequest,
    breakResponses,
    dismissBreak,
    setRage,
    sendRageMove,
    inviteToRage,
    ragePlayers,
    rageInvite,
    dismissRageInvite,
    rageRestart,
    requestRageRestart,
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

  if (!state) {
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
    <RoomErrorBoundary>
      {status === "reconnecting" && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-500/95 px-3 py-1.5 text-sm font-medium text-amber-950 shadow-md">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-900" />
          Connection lost — reconnecting…
        </div>
      )}
      <RoomView
        state={state}
        myId={clientId}
        roomId={roomId}
        isHost={isHost}
        onVote={vote}
        onReveal={reveal}
        onReset={reset}
        onSetDeck={applyDeck}
        onRollSpeaker={rollSpeaker}
        onReact={react}
        onSetTopic={setTopic}
        onSaveRound={saveRound}
        onEditHistory={editHistory}
        onClearHistory={clearHistory}
        onSetAutoReveal={setAutoReveal}
        onSetTimer={setTimer}
        onRequestBreak={requestBreak}
        onRespondBreak={respondBreak}
        breakRequest={breakRequest}
        breakResponses={breakResponses}
        onDismissBreak={dismissBreak}
        onSetRage={setRage}
        onRageMove={sendRageMove}
        onInviteRage={inviteToRage}
        ragePlayers={ragePlayers}
        rageInvite={rageInvite}
        onDismissRageInvite={dismissRageInvite}
        rageRestart={rageRestart}
        onRequestRageRestart={requestRageRestart}
        reactions={reactions}
        presenceEvents={presenceEvents}
        onCopyCode={copyCode}
        onCopyLink={copyLink}
        copiedMode={copiedMode}
        onUpdateProfile={updateProfile}
      />
    </RoomErrorBoundary>
  )
}
