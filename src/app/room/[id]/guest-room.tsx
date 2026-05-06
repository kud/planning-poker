"use client"

import { RoomView } from "@/components/room-view"
import { usePeerGuest } from "@/hooks/use-peer-guest"

type Props = { hostId: string; name: string; avatar: string }

export const GuestRoom = ({ hostId, name, avatar }: Props) => {
  const { state, connected, myId, vote, updateProfile, error } = usePeerGuest(
    hostId,
    name,
    avatar,
  )

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-3">
        <p className="text-destructive font-medium">{error}</p>
        <a
          href="/"
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          Back to home
        </a>
      </div>
    )
  }

  if (!connected || !state || !myId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground animate-pulse">
          Connecting to room…
        </p>
      </div>
    )
  }

  return (
    <RoomView
      state={state}
      myId={myId}
      isHost={false}
      onVote={vote}
      onUpdateProfile={updateProfile}
    />
  )
}
