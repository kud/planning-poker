"use client"

import { useEffect, useRef, useState, type MutableRefObject } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Participant } from "@/lib/types"
import type { RagePlayer } from "@/hooks/use-party-room"
import { avatarUrl } from "@/lib/avatar"
import { cn } from "@/lib/utils"
import { DealerSprite } from "@/components/pixel-dealer"
import { playPunch, playHit, playBell, playCheer } from "@/lib/sounds"

type Props = {
  myId: string
  participants: Record<string, Participant>
  ragePlayers: MutableRefObject<Map<string, RagePlayer>>
  onMove: (x: number, y: number, punching: boolean, hp: number) => void
  onExit: () => void
}

const STALE_MS = 3000
const HIT_RANGE = 0.09
const FRICTION = 0.86
const ACCEL = 0.0016
const KNOCKBACK = 0.05
const PUNCH_MS = 280
const DAMAGE = 14
const HIT_COOLDOWN = 550
const RESPAWN_MS = 4000
const INTRO_MS = 2200

const FIGHT_QUIPS = [
  "Ohh, right in the story points!",
  "That's a 13 if I've ever seen one.",
  "No anchoring now — just fists.",
  "And the retro turns physical, folks.",
  "Someone fetch the coffee card, quick!",
  "This was NOT in the sprint plan.",
  "Velocity through the roof tonight!",
  "Estimate THIS, they said.",
]

const seedX = (id: string) => 0.2 + ((id.charCodeAt(0) || 0) % 60) / 100
const seedY = (id: string) => 0.3 + ((id.charCodeAt(1) || 0) % 45) / 100
const hpColor = (hp: number) =>
  hp > 60 ? "#34d399" : hp > 30 ? "#fbbf24" : "#ef4444"

type Blood = { id: number; x: number; y: number; angle: number; dist: number }

export const RageArena = ({
  myId,
  participants,
  ragePlayers,
  onMove,
  onExit,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const hpRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const me = useRef({
    x: seedX(myId),
    y: seedY(myId),
    vx: 0,
    vy: 0,
    hp: 100,
    deadUntil: 0,
  })
  const keys = useRef<Set<string>>(new Set())
  const target = useRef<{ x: number; y: number } | null>(null)
  const punchUntil = useRef(0)
  const lastSent = useRef(0)
  const lastHitFrom = useRef<Map<string, number>>(new Map())
  const bloodId = useRef(0)

  const [intro, setIntro] = useState(true)
  const [brawlers, setBrawlers] = useState<string[]>([myId])
  const [bloods, setBloods] = useState<Blood[]>([])
  const [quip, setQuip] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    playBell()
    const t = setTimeout(() => setIntro(false), INTRO_MS)
    return () => clearTimeout(t)
  }, [])

  // Refresh roster + ringside crowd occasionally (positions update via refs).
  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const live = [...ragePlayers.current.entries()]
        .filter(([id, p]) => now - p.at < STALE_MS && participants[id])
        .map(([id]) => id)
      setBrawlers([myId, ...live.filter((id) => id !== myId)])
    }
    const interval = setInterval(tick, 400)
    tick()
    return () => clearInterval(interval)
  }, [ragePlayers, participants, myId])

  // Ambient crowd + ringside commentary.
  useEffect(() => {
    if (intro) return
    const cheer = setInterval(() => playCheer(0.03), 7000)
    const talk = setInterval(() => {
      setQuip(FIGHT_QUIPS[Math.floor(Math.random() * FIGHT_QUIPS.length)])
    }, 4200)
    return () => {
      clearInterval(cheer)
      clearInterval(talk)
    }
  }, [intro])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
        e.preventDefault()
      if (k === " ") {
        if (Date.now() > punchUntil.current) playPunch()
        punchUntil.current = Date.now() + PUNCH_MS
        return
      }
      if (k === "escape") return onExit()
      keys.current.add(k)
      target.current = null
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [onExit])

  useEffect(() => {
    let raf = 0
    const loop = () => {
      const m = me.current
      const now = Date.now()
      const dead = m.hp <= 0

      if (dead && now > m.deadUntil) {
        m.hp = 100
        m.x = seedX(myId + now)
        m.y = seedY(myId + now)
        m.vx = 0
        m.vy = 0
      }

      if (!intro && !dead) {
        const k = keys.current
        const left = k.has("arrowleft") || k.has("a")
        const right = k.has("arrowright") || k.has("d")
        const upK = k.has("arrowup") || k.has("w")
        const downK = k.has("arrowdown") || k.has("s")
        if (left || right || upK || downK) {
          m.vx += (Number(right) - Number(left)) * ACCEL
          m.vy += (Number(downK) - Number(upK)) * ACCEL
        } else if (target.current) {
          m.vx += (target.current.x - m.x) * 0.012
          m.vy += (target.current.y - m.y) * 0.012
        }

        for (const [id, p] of ragePlayers.current) {
          if (id === myId || !p.punching || now - p.at > 400) continue
          const dx = m.x - p.x
          const dy = m.y - p.y
          const dist = Math.hypot(dx, dy)
          if (dist >= HIT_RANGE) continue
          if (now - (lastHitFrom.current.get(id) ?? 0) < HIT_COOLDOWN) continue
          lastHitFrom.current.set(id, now)
          const nx = dist === 0 ? 1 : dx / dist
          const ny = dist === 0 ? 0 : dy / dist
          m.vx += nx * KNOCKBACK
          m.vy += ny * KNOCKBACK
          m.hp = Math.max(0, m.hp - DAMAGE)
          playHit()
          const bx = m.x
          const by = m.y
          setBloods((prev) =>
            [
              ...prev,
              ...Array.from({ length: 5 }, () => ({
                id: ++bloodId.current,
                x: bx,
                y: by,
                angle: Math.random() * Math.PI * 2,
                dist: 18 + Math.random() * 34,
              })),
            ].slice(-40),
          )
          if (m.hp <= 0) {
            m.deadUntil = now + RESPAWN_MS
            setFlash("K.O.! 💀")
            playBell()
            playCheer(0.06)
            setTimeout(() => setFlash(null), 1600)
          }
        }
      }

      m.vx *= FRICTION
      m.vy *= FRICTION
      m.x = Math.max(0, Math.min(1, m.x + m.vx))
      m.y = Math.max(0, Math.min(1, m.y + m.vy))
      if (m.x === 0 || m.x === 1) m.vx *= -0.4
      if (m.y === 0 || m.y === 1) m.vy *= -0.4

      const punching = !dead && now < punchUntil.current
      if (now - lastSent.current > 50) {
        lastSent.current = now
        onMove(m.x, m.y, punching, m.hp)
      }

      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        for (const id of nodeRefs.current.keys()) {
          const node = nodeRefs.current.get(id)
          if (!node) continue
          const other = ragePlayers.current.get(id)
          const pos = id === myId ? m : (other ?? { x: 0.5, y: 0.5 })
          const hp = id === myId ? m.hp : (other?.hp ?? 100)
          const isDead = hp <= 0
          const isPunching = id === myId ? punching : (other?.punching ?? false)
          node.style.transform = `translate(${pos.x * rect.width}px, ${pos.y * rect.height}px) translate(-50%, -50%) scale(${isPunching ? 1.25 : 1}) rotate(${isDead ? "82deg" : "0deg"})`
          node.style.opacity = isDead ? "0.5" : "1"
          const fill = hpRefs.current.get(id)
          if (fill) {
            fill.style.width = `${Math.max(0, hp)}%`
            fill.style.background = hpColor(hp)
          }
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [myId, onMove, ragePlayers, intro])

  const onPointer = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    target.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
    keys.current.clear()
  }

  const spectators = Object.values(participants).filter(
    (p) => !brawlers.includes(p.id),
  )

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_35%,#4a1420,#0a0610_72%)]">
      {/* Spotlights */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(255,220,150,0.14),transparent_40%),radial-gradient(circle_at_70%_0%,rgba(255,220,150,0.14),transparent_40%)]" />
      {/* Crowd silhouette band */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[repeating-linear-gradient(90deg,#000_0_8px,#15101a_8px_18px)] opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <span className="text-lg font-black uppercase tracking-[0.2em] text-red-400 drop-shadow-[0_0_14px_rgba(248,113,113,0.7)]">
          🔥 Rage Mode
        </span>
        <button
          onClick={onExit}
          className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
        >
          Exit ✕
        </button>
      </div>

      {/* Dealer commentator — top-left, OUTSIDE the ring */}
      <div className="pointer-events-none absolute left-3 top-16 z-20 flex max-w-[40%] items-start gap-2">
        <DealerSprite />
        <AnimatePresence mode="wait">
          {quip && !intro && (
            <motion.span
              key={quip}
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mt-2 rounded-xl border border-yellow-500/40 bg-[#10131f]/90 px-3 py-1.5 text-xs italic text-yellow-100"
            >
              {quip}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* The ring — square, centred */}
      <div className="relative flex flex-1 items-center justify-center px-3 pb-2">
        <div
          ref={containerRef}
          onPointerDown={onPointer}
          onPointerMove={(e) => e.buttons === 1 && onPointer(e)}
          className="relative aspect-square w-[min(92vw,68vh)] touch-none overflow-hidden rounded-2xl border-4 border-red-500/30 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.02)_0_14px,transparent_14px_28px)] shadow-[inset_0_0_90px_rgba(0,0,0,0.7)]"
        >
          {/* Ropes */}
          <div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-white/15" />
          <div className="pointer-events-none absolute inset-6 rounded-lg border border-white/10" />

          {brawlers.map((id) => {
            const p = participants[id]
            if (!p) return null
            return (
              <div
                key={id}
                ref={(el) => {
                  if (el) nodeRefs.current.set(id, el)
                  else nodeRefs.current.delete(id)
                }}
                className="absolute left-0 top-0 flex flex-col items-center will-change-transform"
                style={{ transition: "transform 0.05s linear" }}
              >
                <div className="mb-1 h-1 w-12 overflow-hidden rounded-sm border border-white/20 bg-black/70">
                  <div
                    ref={(el) => {
                      if (el) hpRefs.current.set(id, el)
                      else hpRefs.current.delete(id)
                    }}
                    className="h-full"
                    style={{ width: "100%", background: "#34d399" }}
                  />
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(p.avatar || p.name)}
                  alt={p.name}
                  draggable={false}
                  className={
                    id === myId
                      ? "h-12 w-12 rounded-xl ring-2 ring-red-400 shadow-[0_0_18px_rgba(248,113,113,0.7)]"
                      : "h-11 w-11 rounded-xl ring-1 ring-white/25"
                  }
                />
                <span className="mt-0.5 max-w-16 truncate text-[10px] text-white/80">
                  {id === myId ? "You" : p.name}
                </span>
              </div>
            )
          })}

          {/* Blood splatter */}
          <AnimatePresence>
            {bloods.map((b) => (
              <motion.span
                key={b.id}
                className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-red-600"
                initial={{
                  left: `${b.x * 100}%`,
                  top: `${b.y * 100}%`,
                  opacity: 0.9,
                  scale: 1,
                }}
                animate={{
                  x: Math.cos(b.angle) * b.dist,
                  y: Math.sin(b.angle) * b.dist + 14,
                  opacity: 0,
                  scale: 0.4,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                onAnimationComplete={() =>
                  setBloods((prev) => prev.filter((x) => x.id !== b.id))
                }
              />
            ))}
          </AnimatePresence>

          {/* KO flash */}
          <AnimatePresence>
            {flash && (
              <motion.div
                initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 1.4, opacity: 0 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl font-black uppercase tracking-widest text-red-500 drop-shadow-[0_0_24px_rgba(239,68,68,0.8)]"
              >
                {flash}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Intro: the felt table is hauled out of the ring, title slams in. */}
          <AnimatePresence>
            {intro && (
              <motion.div
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black/55"
              >
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 0.7, ease: "easeInOut" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-red-600/40 to-transparent"
                />
                {/* The poker felt being dragged off the ring */}
                <motion.div
                  initial={{ x: "0%", rotate: 0, opacity: 1 }}
                  animate={{ x: "150%", rotate: 12, opacity: 0.85 }}
                  transition={{ duration: 1.4, delay: 0.35, ease: "easeIn" }}
                  className="absolute h-28 w-44 rounded-[40%] border-4 border-amber-900/60 bg-[radial-gradient(ellipse_at_center,#1f7a4d,#0c4a2e)] shadow-2xl"
                />
                <motion.span
                  initial={{ scale: 2.4, opacity: 0, rotate: -6 }}
                  animate={{ scale: [2.4, 0.9, 1], opacity: [0, 1, 1] }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                  className="absolute text-4xl font-black uppercase tracking-[0.2em] text-red-500 drop-shadow-[0_0_24px_rgba(239,68,68,0.8)] sm:text-6xl"
                >
                  Rage Mode
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Ringside spectators — cheering crowd flanking the ring */}
      {(["left", "right"] as const).map((side) => {
        const crowd = spectators.filter(
          (_, i) => i % 2 === (side === "left" ? 0 : 1),
        )
        if (crowd.length === 0) return null
        return (
          <div
            key={side}
            className={cn(
              "pointer-events-none absolute top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-3",
              side === "left" ? "left-1.5" : "right-1.5",
            )}
          >
            {crowd.slice(0, 6).map((p, i) => (
              <motion.div
                key={p.id}
                className="flex flex-col items-center"
                animate={{ y: [0, -5, 0] }}
                transition={{
                  duration: 0.55,
                  repeat: Infinity,
                  delay: (i % 4) * 0.13,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(p.avatar || p.name)}
                  alt={p.name}
                  className="h-7 w-7 rounded-md opacity-75"
                />
                <span className="text-[10px] leading-none">🙌</span>
              </motion.div>
            ))}
          </div>
        )
      })}

      <div className="relative z-10 flex items-center justify-center gap-4 px-4 py-3 text-center text-xs text-white/55">
        <span className="hidden sm:inline">
          WASD / arrows to move · Space to punch · drag on touch
        </span>
        <button
          onPointerDown={() => {
            if (Date.now() > punchUntil.current) playPunch()
            punchUntil.current = Date.now() + PUNCH_MS
          }}
          className="rounded-full border border-red-400/50 bg-red-500/20 px-5 py-2 text-sm font-bold text-red-100 active:scale-95"
        >
          👊 Punch
        </button>
      </div>
    </div>
  )
}
