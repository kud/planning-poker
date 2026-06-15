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

export const TopicBar = ({ topic, isHost, theme, onSetTopic }: Props) => {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(topic?.title ?? "")
  const [url, setUrl] = useState(topic?.url ?? "")

  const muted = theme === "dark" ? "text-slate-400" : "text-slate-500"
  const chip =
    theme === "dark"
      ? "border-white/10 bg-white/5"
      : "border-slate-200 bg-slate-50"
  const inputClass =
    theme === "dark"
      ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500"
      : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
  const link = `underline underline-offset-2 hover:opacity-80 cursor-pointer ${muted}`
  const btnClass =
    theme === "dark"
      ? "border-white/15 text-slate-200 hover:bg-white/10 hover:text-white dark:hover:bg-white/10"
      : "border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900"

  const open = () => {
    setTitle(topic?.title ?? "")
    setUrl(topic?.url ?? "")
    setEditing(true)
  }

  const save = () => {
    onSetTopic(title.trim(), url.trim() || null)
    setEditing(false)
  }

  return (
    <div className="flex min-h-[44px] flex-wrap items-center justify-center gap-2 px-3 py-1.5 text-sm">
      {editing ? (
        <>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="What are we estimating? (e.g. PROJ-1234 · Refactor auth)"
            className={`h-7 w-72 max-w-[70vw] rounded-md border px-2.5 text-sm ${inputClass}`}
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="Link (optional)"
            className={`h-7 w-44 max-w-[70vw] rounded-md border px-2.5 text-sm ${inputClass}`}
          />
          <Button size="sm" className="h-7" onClick={save}>
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={`h-7 border ${btnClass}`}
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </>
      ) : topic ? (
        <span
          className={`flex items-center gap-2 rounded-full border px-3 py-1 ${chip}`}
        >
          <span aria-hidden>📌</span>
          <span className="truncate max-w-[55vw] font-medium">
            {topic.title || "Untitled topic"}
          </span>
          {topic.url && (
            <a
              href={topic.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`whitespace-nowrap text-xs ${link}`}
            >
              open ↗
            </a>
          )}
          {isHost && (
            <Button
              size="sm"
              variant="ghost"
              className={`h-6 border px-2 text-xs ${btnClass}`}
              onClick={open}
            >
              Edit
            </Button>
          )}
        </span>
      ) : isHost ? (
        <Button
          size="sm"
          variant="ghost"
          className={`h-8 border ${btnClass}`}
          onClick={open}
        >
          📌 Add a topic
        </Button>
      ) : (
        <span className={muted}>No topic set</span>
      )}
    </div>
  )
}
