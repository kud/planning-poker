"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

type Theme = "dark" | "light"

type Props = {
  timer: { endsAt: number; duration: number } | null
  isHost: boolean
  theme: Theme
  onSetTimer: (seconds: number) => void
}

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

export const RoundTimer = ({ timer, isHost, theme, onSetTimer }: Props) => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!timer) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [timer])

  const remaining = timer
    ? Math.max(0, Math.ceil((timer.endsAt - now) / 1000))
    : null
  const expired = remaining === 0
  const urgent = remaining !== null && remaining <= 10 && !expired

  const muted = theme === "dark" ? "text-slate-400" : "text-slate-500"
  const btn =
    theme === "dark"
      ? "border-white/15 text-slate-200 hover:bg-white/10"
      : "border-slate-300 text-slate-700 hover:bg-slate-100"

  return (
    <div className="flex items-center gap-2 text-sm">
      {remaining !== null ? (
        <span
          className={
            expired
              ? "font-bold text-red-400"
              : urgent
                ? "font-bold tabular-nums text-amber-400"
                : `font-semibold tabular-nums ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`
          }
        >
          {expired ? "⏰ Time!" : `⏳ ${fmt(remaining)}`}
        </span>
      ) : (
        isHost && <span className={`text-xs ${muted}`}>No timer</span>
      )}

      {isHost &&
        (remaining === null || expired ? (
          <span className="flex items-center gap-1">
            {[60, 120, 300].map((s) => (
              <Button
                key={s}
                size="sm"
                variant="ghost"
                className={`h-7 border px-2 text-xs ${btn}`}
                onClick={() => onSetTimer(s)}
              >
                {fmt(s)}
              </Button>
            ))}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className={`h-7 border px-2 text-xs ${btn}`}
              onClick={() => onSetTimer((remaining ?? 0) + 30)}
            >
              +30s
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={`h-7 border px-2 text-xs ${btn}`}
              onClick={() => onSetTimer(0)}
            >
              Stop
            </Button>
          </span>
        ))}
    </div>
  )
}
