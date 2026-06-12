"use client"

import { useState, useEffect, useSyncExternalStore } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "pp-onboarded-v1"
const emptySubscribe = () => () => {}

type Step = {
  target: string
  emoji: string
  title: string
  body: string
}

const HOST_STEPS: Step[] = [
  {
    target: "share",
    emoji: "🔗",
    title: "Invite your team",
    body: "Open Share and send the link — anyone with it joins instantly, no account needed.",
  },
  {
    target: "hand",
    emoji: "🃏",
    title: "Everyone votes",
    body: "Pick a card from your hand — or press 1–9. Votes stay face-down until you reveal.",
  },
  {
    target: "reveal",
    emoji: "🎉",
    title: "Reveal together",
    body: "Once people have voted, flip every card at once — or press R. Consensus gets confetti.",
  },
]

const GUEST_STEPS: Step[] = [
  {
    target: "hand",
    emoji: "🃏",
    title: "Pick a card to vote",
    body: "Tap a card — or press 1–9. You can change your mind any time before the reveal.",
  },
  {
    target: "table",
    emoji: "🤫",
    title: "Votes stay secret",
    body: "Your card sits face-down on the table until the host reveals everything at once.",
  },
]

const findTarget = (key: string) =>
  [...document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`)].find(
    (el) => {
      const rect = el.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    },
  )

const PADDING = 8

export const OnboardingHints = ({ isHost }: { isHost: boolean }) => {
  const alreadySeen = useSyncExternalStore(
    emptySubscribe,
    () => localStorage.getItem(STORAGE_KEY) !== null,
    () => true,
  )
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const steps = isHost ? HOST_STEPS : GUEST_STEPS
  const active = !alreadySeen && !dismissed

  useEffect(() => {
    if (!active) return
    const measure = () => {
      const el = findTarget(steps[step].target)
      setRect(el ? el.getBoundingClientRect() : null)
    }
    measure()
    const settle = setTimeout(measure, 400)
    window.addEventListener("resize", measure)
    return () => {
      clearTimeout(settle)
      window.removeEventListener("resize", measure)
    }
  }, [active, step, steps])

  if (!active) return null

  const current = steps[step]
  const isLast = step === steps.length - 1

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "1")
    setDismissed(true)
  }

  const tooltipAbove = rect ? rect.top > window.innerHeight / 2 : false
  const tooltipStyle: React.CSSProperties = rect
    ? {
        position: "fixed",
        left: Math.min(
          Math.max(rect.left + rect.width / 2 - 160, 12),
          window.innerWidth - 332,
        ),
        ...(tooltipAbove
          ? { bottom: window.innerHeight - rect.top + PADDING + 14 }
          : { top: rect.bottom + PADDING + 14 }),
      }
    : {
        position: "fixed",
        left: "50%",
        bottom: 180,
        transform: "translateX(-50%)",
      }

  return (
    <>
      {rect && (
        <motion.div
          layout
          className="fixed z-40 rounded-2xl border-2 border-indigo-400 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            left: rect.left - PADDING,
            top: rect.top - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            boxShadow:
              "0 0 0 9999px rgba(5,7,18,0.6), 0 0 24px rgba(99,102,241,0.6)",
          }}
        />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: tooltipAbove ? 10 : -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          style={tooltipStyle}
          className="z-50 w-80 max-w-[calc(100vw-24px)] rounded-2xl border border-indigo-400/30 bg-[#151830]/95 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.5)] p-4"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{current.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">
                {current.title}
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {current.body}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === step ? "bg-indigo-400" : "bg-white/20"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {!isLast && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={finish}
                  className="text-xs text-slate-400 hover:text-white hover:bg-white/8"
                >
                  Skip
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => (isLast ? finish() : setStep(step + 1))}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white border-0"
              >
                {isLast ? "Got it" : "Next"}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  )
}
