"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type Props = {
  story: string
  isHost: boolean
  onUpdate: (story: string) => void
}

export const StoryHeader = ({ story, isHost, onUpdate }: Props) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(story)

  const commit = () => {
    onUpdate(draft.trim())
    setEditing(false)
  }

  if (isHost && editing) {
    return (
      <div className="flex gap-2 items-center w-full max-w-lg">
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") setEditing(false)
          }}
          placeholder="Story or ticket name…"
          className="text-lg bg-white/8 border-white/15 text-white placeholder:text-slate-500 focus-visible:border-indigo-500/60"
        />
        <Button
          size="sm"
          onClick={commit}
          className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
        >
          Save
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <h2
        className={
          story
            ? "text-xl font-semibold text-white"
            : "text-xl text-slate-500 italic"
        }
      >
        {story || "No story set"}
      </h2>
      {isHost && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDraft(story)
            setEditing(true)
          }}
          className="text-slate-400 hover:text-white hover:bg-white/8"
        >
          Edit
        </Button>
      )}
    </div>
  )
}
