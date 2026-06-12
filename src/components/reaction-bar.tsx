"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const QUICK_EMOJIS = ["👍", "😂", "😮", "🤯"]

const MORE_EMOJIS = [
  "❤️",
  "🎉",
  "👏",
  "🔥",
  "💯",
  "🚀",
  "🤩",
  "😍",
  "🥳",
  "😎",
  "🤝",
  "💪",
  "🤔",
  "🧐",
  "😅",
  "😬",
  "😱",
  "🥲",
  "😢",
  "😡",
  "🤬",
  "🫣",
  "🫠",
  "🥶",
  "😴",
  "🥱",
  "👀",
  "🙄",
  "🤷",
  "🙏",
  "👌",
  "✌️",
  "☕",
  "🍰",
  "🍿",
  "🍾",
  "🎲",
  "🃏",
  "🐈",
  "💸",
]

type Props = {
  onReact: (emoji: string) => void
  theme: "dark" | "light"
}

export const ReactionBar = ({ onReact, theme }: Props) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const surface =
    theme === "dark"
      ? "border-white/10 bg-[#171a2c]/95"
      : "border-slate-200 bg-white/95"
  const hover = theme === "dark" ? "hover:bg-white/10" : "hover:bg-slate-100"

  const fire = (emoji: string) => onReact(emoji)

  return (
    <div ref={ref} className="absolute right-2 sm:right-4 top-2 z-20">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className={cn(
              "absolute bottom-full right-0 mb-2 grid grid-cols-5 sm:grid-cols-8 gap-2 rounded-2xl border p-3 shadow-xl backdrop-blur-md max-h-64 overflow-y-auto",
              surface,
            )}
          >
            {MORE_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => fire(emoji)}
                className={cn(
                  "w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-colors",
                  hover,
                )}
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "flex items-center gap-0.5 rounded-full border px-1.5 py-1 shadow-lg backdrop-blur-md",
          surface,
        )}
      >
        {QUICK_EMOJIS.map((emoji) => (
          <motion.button
            key={emoji}
            whileTap={{ scale: 1.4 }}
            onClick={() => fire(emoji)}
            className={cn(
              "hidden sm:flex w-8 h-8 rounded-full text-lg items-center justify-center transition-colors",
              hover,
            )}
          >
            {emoji}
          </motion.button>
        ))}
        <div
          className={cn(
            "hidden sm:block w-px h-5 mx-0.5",
            theme === "dark" ? "bg-white/15" : "bg-slate-200",
          )}
        />
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="More reactions"
          title="More reactions"
          className={cn(
            "relative flex w-8 h-8 rounded-full text-lg items-center justify-center transition-colors",
            hover,
            open && (theme === "dark" ? "bg-white/10" : "bg-slate-100"),
          )}
        >
          😊
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[9px] font-bold flex items-center justify-center leading-none border",
              theme === "dark"
                ? "bg-indigo-500 text-white border-[#171a2c]"
                : "bg-indigo-500 text-white border-white",
            )}
          >
            +
          </span>
        </button>
      </div>
    </div>
  )
}
