"use client"

import { useState, useEffect } from "react"
import { RoomView } from "@/components/room-view"
import { usePeerHost } from "@/hooks/use-peer-host"

type Props = { name: string; avatar: string }

export const HostRoom = ({ name, avatar }: Props) => {
  const { peerId, state, myId, vote, reveal, reset, setDeck, updateProfile } =
    usePeerHost(name, avatar)
  const [copiedMode, setCopiedMode] = useState<"code" | "link" | null>(null)

  useEffect(() => {
    if (!peerId) return
    window.history.replaceState(null, "", `/room/${peerId}`)
  }, [peerId])

  const writeToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement("textarea")
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
    }
  }

  const copyCode = async () => {
    if (!peerId) return
    await writeToClipboard(peerId)
    setCopiedMode("code")
    setTimeout(() => setCopiedMode(null), 2000)
  }

  const copyLink = async () => {
    if (!peerId) return
    await writeToClipboard(`${window.location.origin}/room/${peerId}`)
    setCopiedMode("link")
    setTimeout(() => setCopiedMode(null), 2000)
  }

  if (!peerId || !state || !myId) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          background:
            "linear-gradient(160deg, #0d1117 0%, #090d18 50%, #0a0814 100%)",
        }}
      >
        <p className="text-slate-500 animate-pulse">Connecting…</p>
      </div>
    )
  }

  return (
    <RoomView
      state={state}
      myId={myId}
      isHost
      onVote={vote}
      onReveal={reveal}
      onReset={reset}
      onSetDeck={setDeck}
      onCopyCode={copyCode}
      onCopyLink={copyLink}
      copiedMode={copiedMode}
      onUpdateProfile={updateProfile}
    />
  )
}
