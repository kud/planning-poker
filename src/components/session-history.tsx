"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
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
  theme?: "dark" | "light"
  triggerClassName?: string
  onClear: () => void
  onEdit?: EditFn
}

const HistoryRow = ({
  entry,
  index,
  deck,
  isHost,
  theme,
  onEdit,
}: {
  entry: HistoryEntry
  index: number
  deck: Deck
  isHost: boolean
  theme: "dark" | "light"
  onEdit?: EditFn
}) => {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(entry.title)
  const [url, setUrl] = useState(entry.url ?? "")
  const [estimate, setEstimate] = useState(entry.estimate)

  const dark = theme === "dark"
  const rowCls = dark
    ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
    : "border-slate-200 bg-slate-50 hover:bg-slate-100"
  const titleCls = dark ? "text-white" : "text-slate-900"
  const subCls = dark ? "text-white/40" : "text-slate-500"
  const badgeCls = dark
    ? "bg-indigo-500/25 text-indigo-200"
    : "bg-indigo-100 text-indigo-700"

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
      <li
        className={cn(
          "flex flex-col gap-2 rounded-lg border px-3 py-2.5",
          dark
            ? "border-indigo-400/40 bg-indigo-500/10"
            : "border-indigo-300 bg-indigo-50",
        )}
      >
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
          <span className={cn("mr-1 text-xs", subCls)}>Estimate</span>
          {deck.cards.map((card) => (
            <button
              key={card.value}
              onClick={() => setEstimate(card.value)}
              className={cn(
                "min-w-7 rounded-md border px-1.5 py-0.5 text-xs font-semibold transition-colors",
                estimate === card.value
                  ? "border-indigo-400/60 bg-indigo-500/25 text-indigo-100"
                  : dark
                    ? "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100",
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
    <li
      className={cn(
        "group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
        rowCls,
      )}
    >
      <span className={cn("w-4 shrink-0 text-xs tabular-nums", subCls)}>
        {index + 1}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "truncate text-sm font-medium",
            entry.title ? titleCls : cn("italic", subCls),
          )}
        >
          {entry.title || "Untitled"}
        </span>
        {entry.url && (
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "truncate text-xs underline underline-offset-2 hover:opacity-80",
              subCls,
            )}
          >
            {entry.url}
          </a>
        )}
      </span>
      {isHost && onEdit && (
        <button
          onClick={open}
          aria-label="Edit story"
          className={cn(
            "shrink-0 rounded-md px-1.5 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100",
            subCls,
          )}
        >
          ✏️
        </button>
      )}
      <span
        className={cn(
          "flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg px-2 text-sm font-bold tabular-nums",
          badgeCls,
        )}
      >
        {entry.estimate}
      </span>
    </li>
  )
}

export const SessionHistory = ({
  history,
  deck,
  isHost,
  theme = "dark",
  triggerClassName,
  onClear,
  onEdit,
}: Props) => {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<"md" | "csv" | null>(null)

  const copy = async (kind: "md" | "csv") => {
    const text = kind === "md" ? toMarkdown(history) : toCsv(history)
    await navigator.clipboard.writeText(text)
    setCopied(kind)
    setTimeout(() => setCopied(null), 1500)
  }

  const dark = theme !== "light"
  const panel = dark
    ? "border-white/10 bg-gradient-to-b from-[#141829] to-[#0c0f1a] text-white"
    : "border-slate-200 bg-white text-slate-900"
  const divide = dark ? "border-white/10" : "border-slate-200"
  const copyBtn = dark
    ? "border border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white dark:hover:bg-white/10"
    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
  const clearBtn = dark
    ? "ml-auto text-red-400 hover:bg-white/5 hover:text-red-300 dark:hover:bg-white/5"
    : "ml-auto text-red-600 hover:bg-red-50 hover:text-red-700"

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        🗂 History{history.length > 0 ? ` · ${history.length}` : ""}
      </Button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.div
                  className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-[1px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setOpen(false)}
                />
                <motion.aside
                  className={cn(
                    "fixed right-0 top-0 z-[71] flex h-full w-80 max-w-[90vw] flex-col gap-3 border-l p-4 shadow-2xl sm:w-96",
                    panel,
                  )}
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", stiffness: 380, damping: 36 }}
                >
                  <div
                    className={cn(
                      "-mx-4 -mt-4 mb-1 flex items-center justify-between border-b px-4 py-3.5",
                      divide,
                    )}
                  >
                    <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
                      <span aria-hidden>🗂</span>
                      Session history
                      {history.length > 0 && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                            dark
                              ? "bg-white/10 text-white/70"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {history.length}
                        </span>
                      )}
                    </h2>
                    <button
                      onClick={() => setOpen(false)}
                      aria-label="Close history"
                      className={cn(
                        "rounded-lg p-1.5 transition-colors",
                        dark
                          ? "text-white/50 hover:bg-white/10 hover:text-white"
                          : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                      )}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No rounds saved yet. After revealing, the host can save
                      the agreed estimate to build a running list you can copy
                      back into your tracker.
                    </p>
                  ) : (
                    <>
                      <ul className="flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
                        {history.map((entry, i) => (
                          <HistoryRow
                            key={entry.id}
                            entry={entry}
                            index={i}
                            deck={deck}
                            isHost={isHost}
                            theme={theme}
                            onEdit={onEdit}
                          />
                        ))}
                      </ul>

                      <div
                        className={cn(
                          "-mx-4 -mb-4 flex flex-wrap items-center gap-2 border-t px-4 pb-4 pt-3",
                          divide,
                        )}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copy("md")}
                          className={copyBtn}
                        >
                          {copied === "md" ? "Copied ✓" : "Copy as Markdown"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copy("csv")}
                          className={copyBtn}
                        >
                          {copied === "csv" ? "Copied ✓" : "Copy as CSV"}
                        </Button>
                        {isHost && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={onClear}
                            className={clearBtn}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </motion.aside>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}
