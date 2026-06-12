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
}: {
  value: string
  suit: string
  red?: boolean
  className: string
}) => (
  <div
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
  </div>
)

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
          <h1 className="text-2xl font-bold tracking-tight">Planning Poker</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Estimate together, in real time
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

        <p className="text-xs text-center text-muted-foreground">
          Free · real-time · no account
        </p>
      </div>
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
        />
        <DecorativeCard
          value="K"
          suit="♥"
          red
          className="top-20 left-16 rotate-[-7deg] opacity-80"
        />
        <DecorativeCard
          value="Q"
          suit="♦"
          red
          className="bottom-10 right-6 rotate-[18deg]"
        />
        <DecorativeCard
          value="J"
          suit="♣"
          className="bottom-20 right-16 rotate-[7deg] opacity-80"
        />
      </div>
      <LandingForm />
    </main>
  )
}
