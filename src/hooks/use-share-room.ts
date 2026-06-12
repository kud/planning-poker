"use client"

import { useState } from "react"

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

export const useShareRoom = (roomId: string) => {
  const [copiedMode, setCopiedMode] = useState<"code" | "link" | null>(null)

  const flash = (mode: "code" | "link") => {
    setCopiedMode(mode)
    setTimeout(() => setCopiedMode(null), 2000)
  }

  const copyCode = async () => {
    await writeToClipboard(roomId)
    flash("code")
  }

  const copyLink = async () => {
    await writeToClipboard(`${window.location.origin}/room/${roomId}`)
    flash("link")
  }

  return { copiedMode, copyCode, copyLink }
}
