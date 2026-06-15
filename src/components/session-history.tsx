"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Deck, HistoryEntry } from "@/lib/types"
import { toCsv, toMarkdown } from "@/lib/history-export"
import { cn } from "@/lib/utils"

type EditFn = (
  id: string,
  title: string,
  url: string | null,
  estimate: string,
) => void

type Props = {
  history: HistoryEntry[]
  deck: Deck
  isHost: boolean
  triggerClassName?: string
  onClear: () => void
  onEdit?: EditFn
}

const HistoryRow = ({
  entry,
  deck,
  isHost,
  onEdit,
}: {
  entry: HistoryEntry
  deck: Deck
  isHost: boolean
  onEdit?: EditFn
}) => {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(entry.title)
  const [url, setUrl] = useState(entry.url ?? "")
  const [estimate, setEstimate] = useState(entry.estimate)

  const open = () => {
    setTitle(entry.title)
    setUrl(entry.url ?? "")
    setEstimate(entry.estimate)
    setEditing(true)
  }

  const save = () => {
    onEdit?.(entry.id, title.trim(), url.trim() || null, estimate)
    setEditing(false)
  }

  if (editing)
    return (
      <li className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5">
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Story name"
          className="h-8 text-sm"
        />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Link (optional)"
          className="h-8 text-sm"
        />
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-xs text-muted-foreground">Estimate</span>
          {deck.cards.map((card) => (
            <button
              key={card.value}
              onClick={() => setEstimate(card.value)}
              className={cn(
                "min-w-7 rounded-md border px-1.5 py-0.5 text-xs font-semibold transition-colors",
                estimate === card.value
                  ? "border-primary/60 bg-primary/20 text-primary"
                  : "border-border bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
            >
              {card.value}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-7" onClick={save}>
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </div>
      </li>
    )

  return (
    <li className="group flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 transition-colors hover:bg-muted/70">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">
          {entry.title || "Untitled"}
        </span>
        {entry.url && (
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs text-muted-foreground underline underline-offset-2"
          >
            {entry.url}
          </a>
        )}
      </span>
      {isHost && onEdit && (
        <button
          onClick={open}
          aria-label="Edit story"
          className="shrink-0 rounded-md px-1.5 py-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        >
          ✏️
        </button>
      )}
      <span className="shrink-0 rounded-md bg-primary/15 px-2.5 py-1 text-sm font-bold text-primary">
        {entry.estimate}
      </span>
    </li>
  )
}

export const SessionHistory = ({
  history,
  deck,
  isHost,
  triggerClassName,
  onClear,
  onEdit,
}: Props) => {
  const [copied, setCopied] = useState<"md" | "csv" | null>(null)

  const copy = async (kind: "md" | "csv") => {
    const text = kind === "md" ? toMarkdown(history) : toCsv(history)
    await navigator.clipboard.writeText(text)
    setCopied(kind)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className={triggerClassName} />
        }
      >
        🗂 History{history.length > 0 ? ` · ${history.length}` : ""}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Session history</DialogTitle>
        </DialogHeader>

        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No rounds saved yet. After revealing, the host can save the agreed
            estimate to build a running list you can copy back into your
            tracker.
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto pr-1">
              {history.map((entry) => (
                <HistoryRow
                  key={entry.id}
                  entry={entry}
                  deck={deck}
                  isHost={isHost}
                  onEdit={onEdit}
                />
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button size="sm" variant="secondary" onClick={() => copy("md")}>
                {copied === "md" ? "Copied ✓" : "Copy as Markdown"}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => copy("csv")}>
                {copied === "csv" ? "Copied ✓" : "Copy as CSV"}
              </Button>
              {isHost && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClear}
                  className="ml-auto text-destructive"
                >
                  Clear
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
