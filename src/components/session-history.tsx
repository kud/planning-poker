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
import { HistoryEntry } from "@/lib/types"
import { toCsv, toMarkdown } from "@/lib/history-export"

type Props = {
  history: HistoryEntry[]
  isHost: boolean
  triggerClassName?: string
  onClear: () => void
}

export const SessionHistory = ({
  history,
  isHost,
  triggerClassName,
  onClear,
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
      <DialogContent className="max-w-lg">
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
            <ul className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1">
              {history.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {e.title || "Untitled"}
                    </span>
                    {e.url && (
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-xs text-muted-foreground underline underline-offset-2"
                      >
                        {e.url}
                      </a>
                    )}
                  </span>
                  <span className="shrink-0 rounded-md bg-primary/15 px-2.5 py-1 text-sm font-bold text-primary">
                    {e.estimate}
                  </span>
                </li>
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
