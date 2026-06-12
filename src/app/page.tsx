"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { avatarUrl, randomSeed } from "@/lib/avatar"
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
    const newRoomId = generateRoomCode()
    localStorage.setItem(`poker-host-${newRoomId}`, crypto.randomUUID())
    router.push(
      `/room/${newRoomId}?name=${encodeURIComponent(name.trim())}&avatar=${encodeURIComponent(avatar)}`,
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
      transition={{ type: "spring", stiffness: 280, damping: 28, delay: 0.15 }}
      className="w-full max-w-sm"
    >
      <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.55)] border border-white/20 p-7 flex flex-col gap-5">
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

const PREVIEW_SEATS = [
  { seed: "alice-preview", x: "18%", y: "-26%", voted: true },
  { seed: "bob-preview", x: "50%", y: "-34%", voted: true },
  { seed: "chloe-preview", x: "82%", y: "-26%", voted: false },
]

const TablePreview = () => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ type: "spring", stiffness: 220, damping: 26 }}
    className="relative mx-auto mt-20"
    style={{ width: "min(460px, 88vw)", aspectRatio: "460 / 180" }}
  >
    {PREVIEW_SEATS.map((seat) => (
      <div
        key={seat.seed}
        className="absolute flex flex-col items-center gap-1.5"
        style={{ left: seat.x, top: seat.y, transform: "translateX(-50%)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl(seat.seed)}
          alt=""
          className="w-9 h-9 rounded-xl shadow-lg"
        />
      </div>
    ))}
    <div
      className="absolute inset-0"
      style={{
        borderRadius: 9999,
        background:
          "linear-gradient(170deg, #1e6e40 0%, #145733 40%, #0d3d22 100%)",
        border: "9px solid #6b3d12",
        boxShadow:
          "inset 0 8px 32px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.6)",
      }}
    />
    {PREVIEW_SEATS.filter((s) => s.voted).map((seat, i) => (
      <motion.div
        key={seat.seed}
        animate={{ y: [0, -3, 0] }}
        transition={{
          duration: 2.4 + i,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute w-9 h-12 rounded-md border-2 border-indigo-500/60"
        style={{
          left: seat.x,
          top: "26%",
          transform: "translateX(-50%)",
          backgroundColor: "rgb(23 25 56)",
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(99,102,241,0.25) 0px, rgba(99,102,241,0.25) 1px, transparent 1px, transparent 7px)",
        }}
      />
    ))}
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-[10px] font-semibold text-white/35 tracking-widest uppercase">
        2 of 3 voted
      </span>
    </div>
  </motion.div>
)

const FEATURES = [
  {
    emoji: "⚡",
    title: "Instant rooms",
    body: "Create a room, share a six-letter code or a link. Teammates join from any browser — phone included.",
  },
  {
    emoji: "🃏",
    title: "Decks for every team",
    body: "Fibonacci, numeric, T-shirt sizes, or roll your own. Your favourite deck is remembered for next time.",
  },
  {
    emoji: "🎲",
    title: "Built-in rituals",
    body: "Votes stay face-down until the host flips them all at once — then roll the dice to pick who speaks first.",
  },
  {
    emoji: "🎉",
    title: "Delightfully alive",
    body: "Confetti on consensus, a dealer with opinions, subtle sounds, and a cat that occasionally wanders by.",
  },
]

const STEPS = [
  {
    number: "1",
    title: "Create & share",
    body: "One click, no sign-up. Send the link to your team.",
  },
  {
    number: "2",
    title: "Everyone votes",
    body: "Pick a card — they stay hidden so nobody anchors.",
  },
  {
    number: "3",
    title: "Reveal & discuss",
    body: "Flip together, see the spread, roll for who talks first.",
  },
]

export default function HomePage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden text-white"
      style={{
        background:
          "linear-gradient(160deg, #0d1117 0%, #090d18 50%, #0a0814 100%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none select-none opacity-70"
        aria-hidden
      >
        <DecorativeCard
          value="A"
          suit="♠"
          className="top-10 -left-4 rotate-[-18deg]"
          drift={12}
          duration={5.5}
        />
        <DecorativeCard
          value="K"
          suit="♥"
          red
          className="top-24 left-10 rotate-[-7deg] opacity-70"
          drift={8}
          duration={4.2}
        />
        <DecorativeCard
          value="Q"
          suit="♦"
          red
          className="top-[30%] -right-6 rotate-[18deg]"
          drift={10}
          duration={6}
        />
        <DecorativeCard
          value="J"
          suit="♣"
          className="top-[44%] right-10 rotate-[7deg] opacity-70"
          drift={7}
          duration={4.8}
        />
      </div>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-10 lg:pt-28 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/8 px-3 py-1 text-xs text-yellow-200/80 mb-6"
          >
            🤵 Free &amp; open source — no accounts, ever
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]"
          >
            Planning poker your team will{" "}
            <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
              actually enjoy
            </span>
            .
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-5 text-base sm:text-lg text-slate-400 max-w-md leading-relaxed"
          >
            Real-time estimation with a casino soul — face-down cards, a
            dramatic reveal, and a dealer keeping score. Straight from the
            browser, on any device.
          </motion.p>
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 flex flex-col gap-2 text-sm text-slate-300"
          >
            {[
              "Rooms in one click — share a code, start voting",
              "Hidden votes, simultaneous reveal, no anchoring",
              "Works on desktop and mobile, free forever",
            ].map((line) => (
              <li key={line} className="flex items-center gap-2.5">
                <span className="text-emerald-400">✓</span>
                {line}
              </li>
            ))}
          </motion.ul>
        </div>
        <div className="flex justify-center lg:justify-end">
          <LandingForm />
        </div>
      </section>

      {/* Table preview */}
      <section className="relative max-w-6xl mx-auto px-6">
        <TablePreview />
      </section>

      {/* Features */}
      <section className="relative max-w-6xl mx-auto px-6 pt-24 pb-8">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-2xl sm:text-3xl font-bold text-center tracking-tight"
        >
          Everything a sprint planning needs. Nothing it doesn&apos;t.
        </motion.h2>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 hover:border-indigo-400/30 hover:bg-white/[0.05] transition-colors"
            >
              <div className="text-2xl">{feature.emoji}</div>
              <h3 className="mt-3 font-semibold text-sm">{feature.title}</h3>
              <p className="mt-1.5 text-[13px] text-slate-400 leading-relaxed">
                {feature.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative max-w-4xl mx-auto px-6 pt-20 pb-24">
        <div className="grid sm:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="mx-auto w-10 h-10 rounded-full border border-yellow-500/40 bg-yellow-500/8 flex items-center justify-center font-mono font-bold text-yellow-200">
                {step.number}
              </div>
              <h3 className="mt-3 font-semibold text-sm">{step.title}</h3>
              <p className="mt-1.5 text-[13px] text-slate-400 leading-relaxed">
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="relative border-t border-white/8 py-8 text-center text-xs text-slate-500">
        🃏 Planning Poker — MIT licensed ·{" "}
        <a
          href="https://github.com/kud/planning-poker"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:text-slate-300 transition-colors"
        >
          GitHub
        </a>
      </footer>
    </main>
  )
}
