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

// The private token that binds this browser's identity in the room. It is a
// new key on purpose: the older `poker-client-*` value was broadcast as the
// public id, so it cannot serve as a secret.
const readOrCreateToken = (roomId: string) => {
  const key = `poker-token-${roomId}`
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const token = crypto.randomUUID()
  localStorage.setItem(key, token)
  return token
}

export const GuestRoom = ({ hostId, name, avatar }: Props) => {
  useEffect(() => {
    touchRoom(hostId)
  }, [hostId])

  const token = useSyncExternalStore(
    emptySubscribe,
    () => readOrCreateToken(hostId),
    () => null,
  )
  const hostSecret = useSyncExternalStore(
    emptySubscribe,
    () => localStorage.getItem(`poker-host-${hostId}`),
    () => null,
  )

  if (!token) {
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
      token={token}
      hostSecret={hostSecret ?? undefined}
    />
  )
}

const GuestRoomConnected = ({
  roomId,
  name,
  avatar,
  token,
  hostSecret,
}: {
  roomId: string
  name: string
  avatar: string
  token: string
  hostSecret?: string
}) => {
  const {
    state,
    selfId,
    gate,
    status,
    reactions,
    presenceEvents,
    propPokes,
    pokeProp,
    catStroll,
    sendCatStroll,
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
    setSpectator,
    startTimer,
    clearTimer,
    requestBreak,
    voteBreak,
    setBreakTime,
    endBreak,
    setApproval,
    admit,
    deny,
    setRage,
    sendRageMove,
    dropSnack,
    eatSnack,
    snackDrops,
    snackEats,
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
    token,
  })
  const { copiedMode, copyCode, copyLink } = useShareRoom(roomId)
  const preferredDeckApplied = useRef(false)

  const clientId = selfId ?? ""
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

  if (gate) {
    const copy = {
      pending: {
        icon: "✋",
        title: "Waiting for the host to let you in…",
        body: "This room is set to approve new joiners. Hang tight.",
      },
      denied: {
        icon: "🚫",
        title: "The host didn't let you in",
        body: "Ask the host to re-open the room, or check the room code.",
      },
      "room-full": {
        icon: "🚪",
        title: "This room is full",
        body: "It has reached its limit of people. Try again a little later.",
      },
    }[gate]
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="text-4xl">{copy.icon}</span>
        <p className="text-lg font-semibold">{copy.title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{copy.body}</p>
        <Link
          href="/"
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          Back to home
        </Link>
      </div>
    )
  }

  if (!state || !selfId) {
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
        onSetSpectator={setSpectator}
        onStartTimer={startTimer}
        onClearTimer={clearTimer}
        onRequestBreak={requestBreak}
        onVoteBreak={voteBreak}
        onSetBreakTime={setBreakTime}
        onEndBreak={endBreak}
        onSetApproval={setApproval}
        onAdmit={admit}
        onDeny={deny}
        onSetRage={setRage}
        onRageMove={sendRageMove}
        onDropSnack={dropSnack}
        onEatSnack={eatSnack}
        snackDrops={snackDrops}
        snackEats={snackEats}
        onInviteRage={inviteToRage}
        ragePlayers={ragePlayers}
        rageInvite={rageInvite}
        onDismissRageInvite={dismissRageInvite}
        rageRestart={rageRestart}
        onRequestRageRestart={requestRageRestart}
        reactions={reactions}
        presenceEvents={presenceEvents}
        propPokes={propPokes}
        onPokeProp={pokeProp}
        catStroll={catStroll}
        onCatStroll={sendCatStroll}
        onCopyCode={copyCode}
        onCopyLink={copyLink}
        copiedMode={copiedMode}
        onUpdateProfile={updateProfile}
      />
    </RoomErrorBoundary>
  )
}
