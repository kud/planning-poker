"use client"

import { useState } from "react"
import { Topic } from "@/lib/types"
import { Button } from "@/components/ui/button"

type Theme = "dark" | "light"

type Props = {
  topic: Topic | null
  isHost: boolean
  theme: Theme
  onSetTopic: (title: string, url: string | null) => void
}

const linkClass = "underline underline-offset-2 hover:opacity-80"

export const TopicBar = ({ topic, isHost, theme, onSetTopic }: Props) => {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(topic?.title ?? "")
  const [url, setUrl] = useState(topic?.url ?? "")

  const muted = theme === "dark" ? "text-slate-400" : "text-slate-500"
  const inputClass =
    theme === "dark"
      ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500"
      : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"

  const open = () => {
    setTitle(topic?.title ?? "")
    setUrl(topic?.url ?? "")
    setEditing(true)
  }

  const save = () => {
    onSetTopic(title.trim(), url.trim() || null)
    setEditing(false)
  }

  if (editing)
    return (
      <div className="flex-none flex flex-wrap items-center justify-center gap-2 px-3 py-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="What are we estimating? (e.g. PROJ-1234 · Refactor auth)"
          className={`h-8 w-72 max-w-[70vw] rounded-md border px-2.5 text-sm ${inputClass}`}
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Link (optional)"
          className={`h-8 w-48 max-w-[70vw] rounded-md border px-2.5 text-sm ${inputClass}`}
        />
        <Button size="sm" onClick={save} className="h-8">
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing(false)}
          className={`h-8 ${muted}`}
        >
          Cancel
        </Button>
      </div>
    )

  return (
    <div className="flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-sm">
      {topic ? (
        <span className="flex items-center gap-2 min-w-0">
          <span className="opacity-60">📌</span>
          <span className="font-medium truncate max-w-[60vw]">
            {topic.title || "Untitled topic"}
          </span>
          {topic.url && (
            <a
              href={topic.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkClass} ${muted} whitespace-nowrap`}
            >
              open ↗
            </a>
          )}
        </span>
      ) : (
        <span className={muted}>No topic set</span>
      )}
      {isHost && (
        <button
          onClick={open}
          className={`text-xs ${linkClass} ${muted}`}
          aria-label="Edit topic"
        >
          {topic ? "edit" : "+ add topic"}
        </button>
      )}
    </div>
  )
}
