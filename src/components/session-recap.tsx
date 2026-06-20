"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { computeAwards, type SessionStats } from "@/lib/session-stats"

type Props = {
  stats: SessionStats
  theme?: "dark" | "light"
  triggerClassName?: string
}

const HeadlineStat = ({
  value,
  label,
  dark,
}: {
  value: string
  label: string
  dark: boolean
}) => (
  <div
    className={cn(
      "flex flex-1 flex-col items-center rounded-xl border px-3 py-3",
      dark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50",
    )}
  >
    <span className="text-2xl font-bold tabular-nums">{value}</span>
    <span
      className={cn(
        "mt-0.5 text-[11px] uppercase tracking-wide",
        dark ? "text-white/45" : "text-slate-500",
      )}
    >
      {label}
    </span>
  </div>
)

export const SessionRecap = ({
  stats,
  theme = "dark",
  triggerClassName,
}: Props) => {
  const [open, setOpen] = useState(false)

  const dark = theme !== "light"
  const panel = dark
    ? "border-white/10 bg-gradient-to-b from-[#141829] to-[#0c0f1a] text-white"
    : "border-slate-200 bg-white text-slate-900"
  const divide = dark ? "border-white/10" : "border-slate-200"

  const awards = computeAwards(stats)
  const consensusRate =
    stats.rounds > 0
      ? Math.round((stats.consensusRounds / stats.rounds) * 100)
      : 0

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" /> Recap
          {stats.rounds > 0 ? ` · ${stats.rounds}` : ""}
        </span>
      </Button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              >
                <motion.div
                  className={cn(
                    "relative flex max-h-[82vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-2xl",
                    panel,
                  )}
                  initial={{ scale: 0.95, opacity: 0, y: 12 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.96, opacity: 0, y: 12 }}
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className={cn(
                      "flex items-center justify-between border-b px-5 py-4",
                      divide,
                    )}
                  >
                    <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
                      <BarChart3 className="h-4 w-4" /> Session recap
                    </h2>
                  </div>

                  <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
                    {stats.rounds === 0 ? (
                      <p
                        className={cn(
                          "py-6 text-center text-sm",
                          dark ? "text-white/50" : "text-slate-500",
                        )}
                      >
                        No rounds yet — reveal a few hands and the house starts
                        keeping score. 🎲
                      </p>
                    ) : (
                      <>
                        <div className="flex gap-2.5">
                          <HeadlineStat
                            value={String(stats.rounds)}
                            label="rounds"
                            dark={dark}
                          />
                          <HeadlineStat
                            value={`${consensusRate}%`}
                            label="consensus"
                            dark={dark}
                          />
                          <HeadlineStat
                            value={`${stats.bestStreak}🔥`}
                            label="best streak"
                            dark={dark}
                          />
                        </div>

                        {awards.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            <span
                              className={cn(
                                "text-[11px] font-semibold uppercase tracking-widest",
                                dark ? "text-white/40" : "text-slate-400",
                              )}
                            >
                              House awards
                            </span>
                            {awards.map((award) => (
                              <div
                                key={award.key}
                                className={cn(
                                  "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                                  dark
                                    ? "border-white/10 bg-white/[0.04]"
                                    : "border-slate-200 bg-slate-50",
                                )}
                              >
                                <span className="text-2xl">{award.emoji}</span>
                                <div className="flex min-w-0 flex-col">
                                  <span className="text-sm font-semibold">
                                    {award.title} —{" "}
                                    <span className="text-amber-400">
                                      {award.player}
                                    </span>
                                  </span>
                                  <span
                                    className={cn(
                                      "truncate text-xs",
                                      dark ? "text-white/45" : "text-slate-500",
                                    )}
                                  >
                                    {award.detail}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p
                            className={cn(
                              "text-center text-xs",
                              dark ? "text-white/40" : "text-slate-400",
                            )}
                          >
                            A couple more rounds and the house will start
                            handing out awards.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}
