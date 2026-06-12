"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { randomSeed } from "@/lib/avatar"
import { loadSettings, saveSettings } from "@/lib/settings"
import { generateRoomCode, normaliseRoomCode } from "@/lib/room-code"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AvatarPicker } from "@/components/avatar-picker"

const DecorativeCard = ({
  value,
  suit,
  red,
  className,
  drift = 10,
  duration = 5,
}: {
  value: string
  suit: string
  red?: boolean
  className: string
  drift?: number
  duration?: number
}) => (
  <motion.div
    animate={{ y: [0, -drift, 0], rotate: [0, drift / 4, 0] }}
    transition={{ duration, ease: "easeInOut", repeat: Infinity }}
    className={`absolute w-20 h-28 rounded-2xl bg-white/90 shadow-xl border border-white/60 flex flex-col justify-between p-2.5 select-none pointer-events-none ${className}`}
  >
    <div
      className={`text-sm font-bold ${red ? "text-rose-500" : "text-slate-800"}`}
    >
      {value}
    </div>
    <div
      className={`text-3xl text-center ${red ? "text-rose-500" : "text-slate-800"}`}
    >
      {suit}
    </div>
    <div
      className={`text-sm font-bold self-end rotate-180 ${red ? "text-rose-500" : "text-slate-800"}`}
    >
      {value}
    </div>
  </motion.div>
)

const FEATURES = [
  { emoji: "⚡", label: "Instant rooms" },
  { emoji: "🔒", label: "No accounts" },
  { emoji: "🃏", label: "Custom decks" },
]

const LandingForm = () => {
  const router = useRouter()

  const [name, setName] = useState("")
  const [roomId, setRoomId] = useState("")
  const [mode, setMode] = useState<"create" | "join">("create")
  const [avatar, setAvatar] = useState("")
  const [avatarOptions, setAvatarOptions] = useState<string[]>([])

  useEffect(() => {
    const join = new URLSearchParams(window.location.search).get("join")
    if (join) {
      setRoomId(join)
      setMode("join")
    }
    const saved = loadSettings()
    const options = Array.from({ length: 8 }, randomSeed)
    if (saved) {
      setName(saved.name)
      const withSaved = options.includes(saved.avatar)
        ? options
        : [saved.avatar, ...options.slice(1)]
      setAvatarOptions(withSaved)
      setAvatar(saved.avatar)
    } else {
      setAvatarOptions(options)
      setAvatar(options[0])
    }
  }, [])

  const shuffleAvatars = () => {
    const options = Array.from({ length: 8 }, randomSeed)
    setAvatarOptions(options)
    setAvatar(options[0])
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    saveSettings({ name: name.trim(), avatar })
    const roomId = generateRoomCode()
    localStorage.setItem(`poker-host-${roomId}`, crypto.randomUUID())
    router.push(
      `/room/${roomId}?name=${encodeURIComponent(name.trim())}&avatar=${encodeURIComponent(avatar)}`,
    )
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    const code = normaliseRoomCode(roomId)
    if (!name.trim() || !code) return
    saveSettings({ name: name.trim(), avatar })
    router.push(
      `/room/${encodeURIComponent(code)}?name=${encodeURIComponent(name.trim())}&avatar=${encodeURIComponent(avatar)}`,
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className="w-full max-w-sm"
    >
      <div className="bg-white/85 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/70 p-8 flex flex-col gap-6">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.5, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: 0.15,
            }}
            className="text-5xl mb-3 inline-block"
          >
            🃏
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Planning Poker
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Estimate stories together, in real time
          </p>
        </div>

        <div className="flex rounded-xl border overflow-hidden bg-muted/40">
          {(["create", "join"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                mode === m
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "create" ? "Create room" : "Join room"}
            </button>
          ))}
        </div>

        <motion.div
          key={mode}
          initial={{ opacity: 0, x: mode === "create" ? -12 : 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18 }}
        >
          {mode === "create" ? (
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <AvatarPicker
                options={avatarOptions}
                selected={avatar}
                onSelect={setAvatar}
                onShuffle={shuffleAvatars}
              />
              <Button
                type="submit"
                className={cn(
                  "w-full",
                  !name.trim() && "opacity-50 pointer-events-none",
                )}
              >
                Create room
              </Button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="flex flex-col gap-3">
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <Input
                placeholder="Room code"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <AvatarPicker
                options={avatarOptions}
                selected={avatar}
                onSelect={setAvatar}
                onShuffle={shuffleAvatars}
              />
              <Button
                type="submit"
                className={cn(
                  "w-full",
                  (!name.trim() || !roomId.trim()) &&
                    "opacity-50 pointer-events-none",
                )}
              >
                Join room
              </Button>
            </form>
          )}
        </motion.div>

        <div className="flex justify-center gap-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span>{feature.emoji}</span>
              <span>{feature.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-4 text-center text-xs text-slate-500"
      >
        Free & open source ·{" "}
        <a
          href="https://github.com/kud/planning-poker"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:text-slate-700 transition-colors"
        >
          GitHub
        </a>
      </motion.p>
    </motion.div>
  )
}

export default function HomePage() {
  return (
    <main
      className="animate-gradient relative flex min-h-screen items-center justify-center px-4 overflow-hidden"
      style={{
        background:
          "linear-gradient(-45deg, #e0e7ff, #f5f3ff, #ede9fe, #ddd6fe, #e0e7ff)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none select-none"
        aria-hidden
      >
        <DecorativeCard
          value="A"
          suit="♠"
          className="top-10 left-6 rotate-[-18deg]"
          drift={12}
          duration={5.5}
        />
        <DecorativeCard
          value="K"
          suit="♥"
          red
          className="top-20 left-16 rotate-[-7deg] opacity-80"
          drift={8}
          duration={4.2}
        />
        <DecorativeCard
          value="Q"
          suit="♦"
          red
          className="bottom-10 right-6 rotate-[18deg]"
          drift={10}
          duration={6}
        />
        <DecorativeCard
          value="J"
          suit="♣"
          className="bottom-20 right-16 rotate-[7deg] opacity-80"
          drift={7}
          duration={4.8}
        />
      </div>
      <LandingForm />
    </main>
  )
}
