"use client"

import { useEffect, useRef, useState, type MutableRefObject } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Participant } from "@/lib/types"
import type { RagePlayer } from "@/hooks/use-party-room"
import { avatarUrl } from "@/lib/avatar"
import { cn } from "@/lib/utils"
import { DealerSprite } from "@/components/pixel-dealer"
import { RotateCcw } from "lucide-react"
import { playPunch, playHit, playBell, playCheer } from "@/lib/sounds"

type Props = {
  myId: string
  isHost: boolean
  participants: Record<string, Participant>
  ragePlayers: MutableRefObject<Map<string, RagePlayer>>
  onMove: (x: number, y: number, punching: boolean, hp: number) => void
  onExit: () => void
  restartSignal: number
  onRequestRestart?: () => void
}

const STALE_MS = 3000
const HIT_RANGE = 0.09
const FRICTION = 0.86
const ACCEL = 0.0016
const KNOCKBACK = 0.05
const PUNCH_MS = 280
const DAMAGE = 14
const CHAIR_DAMAGE = 30
const CHAIR_GRAB_RANGE = 0.1
const HIT_COOLDOWN = 550
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

type Bot = {
  id: string
  name: string
  seed: string
  x: number
  y: number
  vx: number
  vy: number
  hp: number
  punchUntil: number
  deadUntil: number
  nextDecision: number
  tx: number
  ty: number
}

// A static set of fake spectators to fill the tribunes (independent of who's
// actually in the session).
const FAKE_CROWD = Array.from({ length: 30 }, (_, i) => `rage-crowd-${i}`)

export const RageArena = ({
  myId,
  isHost,
  participants,
  ragePlayers,
  onMove,
  onExit,
  restartSignal,
  onRequestRestart,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const hpRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const chair = useRef({ x: 0.5, y: 0.5, heldBy: null as string | null })
  const chairRef = useRef<HTMLDivElement>(null)
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

  const bots = useRef<Bot[]>([])
  const botSeq = useRef(0)

  const [intro, setIntro] = useState(true)
  const [brawlers, setBrawlers] = useState<string[]>([myId])
  const [botList, setBotList] = useState<
    { id: string; name: string; seed: string }[]
  >([])
  const [bloods, setBloods] = useState<Blood[]>([])
  const [pools, setPools] = useState<{ id: number; x: number; y: number }[]>([])
  const [quip, setQuip] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const restart = () => {
    const m = me.current
    m.hp = 100
    m.deadUntil = 0
    bots.current.forEach((b, i) => {
      b.hp = 100
      b.deadUntil = 0
      b.x = 0.3 + ((i * 13) % 40) / 100
      b.y = 0.3 + ((i * 23) % 40) / 100
    })
    chair.current = { x: 0.5, y: 0.5, heldBy: null }
    lastHitFrom.current.clear()
    setPools([])
    setBloods([])
    setFlash(null)
  }

  const addBot = () => {
    const n = ++botSeq.current
    bots.current.push({
      id: `bot-${n}`,
      name: `Bot ${n}`,
      seed: `rage-bot-${n}`,
      x: 0.3 + ((n * 13) % 40) / 100,
      y: 0.3 + ((n * 23) % 40) / 100,
      vx: 0,
      vy: 0,
      hp: 100,
      punchUntil: 0,
      deadUntil: 0,
      nextDecision: 0,
      tx: 0.5,
      ty: 0.5,
    })
    setBotList(
      bots.current.map((b) => ({ id: b.id, name: b.name, seed: b.seed })),
    )
  }

  useEffect(() => {
    playBell()
    const t = setTimeout(() => setIntro(false), INTRO_MS)
    return () => clearTimeout(t)
  }, [])

  // Host-triggered restart arrives as a signal — revive everyone locally.
  useEffect(() => {
    if (restartSignal > 0) restart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartSignal])

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
    const clamp = (n: number) => Math.max(0, Math.min(1, n))
    const loop = () => {
      const m = me.current
      const now = Date.now()

      const spawnBlood = (x: number, y: number, amount = 12) =>
        setBloods((prev) =>
          [
            ...prev,
            ...Array.from({ length: amount }, () => ({
              id: ++bloodId.current,
              x,
              y,
              angle: Math.random() * Math.PI * 2,
              dist: 22 + Math.random() * 48,
            })),
          ].slice(-90),
        )

      const hurt = (
        v: {
          x: number
          y: number
          vx: number
          vy: number
          hp: number
          deadUntil: number
        },
        meta: { id: string; isMe: boolean; name: string },
        ax: number,
        ay: number,
        attackerId: string,
        dmg: number,
      ) => {
        const key = `${attackerId}>${meta.id}`
        if (now - (lastHitFrom.current.get(key) ?? 0) < HIT_COOLDOWN) return
        lastHitFrom.current.set(key, now)
        const dx = v.x - ax
        const dy = v.y - ay
        const dist = Math.hypot(dx, dy) || 1
        const force = dmg > DAMAGE ? KNOCKBACK * 1.6 : KNOCKBACK
        v.vx += (dx / dist) * force
        v.vy += (dy / dist) * force
        v.hp = Math.max(0, v.hp - dmg)
        spawnBlood(v.x, v.y)
        if (meta.isMe) playHit()
        // Death is permanent — bodies stay down until the arena restarts.
        if (v.hp <= 0 && v.deadUntil === 0) {
          v.deadUntil = now
          spawnBlood(v.x, v.y, 24)
          const px = v.x
          const py = v.y
          setPools((prev) =>
            [...prev, { id: ++bloodId.current, x: px, y: py }].slice(-30),
          )
          setFlash(`${meta.name} — K.O.! 💀`)
          playBell()
          playCheer(0.06)
          setTimeout(() => setFlash(null), 1800)
        }
      }

      // --- update me ---
      if (!intro && m.hp > 0) {
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
      }
      m.vx *= FRICTION
      m.vy *= FRICTION
      m.x = clamp(m.x + m.vx)
      m.y = clamp(m.y + m.vy)
      if (m.x === 0 || m.x === 1) m.vx *= -0.4
      if (m.y === 0 || m.y === 1) m.vy *= -0.4
      const mePunching = m.hp > 0 && now < punchUntil.current

      // --- update bots (simple chase-and-punch AI) ---
      for (const bot of bots.current) {
        if (bot.hp <= 0) {
          // dead — body stays put
        } else if (!intro) {
          if (now > bot.nextDecision) {
            bot.nextDecision = now + 500 + Math.random() * 900
            const targets = [
              { x: m.x, y: m.y, alive: m.hp > 0 },
              ...bots.current
                .filter((o) => o !== bot && o.hp > 0)
                .map((o) => ({ x: o.x, y: o.y, alive: true })),
            ].filter((t) => t.alive)
            if (targets.length) {
              const t = targets.reduce((a, b) =>
                Math.hypot(b.x - bot.x, b.y - bot.y) <
                Math.hypot(a.x - bot.x, a.y - bot.y)
                  ? b
                  : a,
              )
              bot.tx = t.x
              bot.ty = t.y
            }
            if (Math.random() < 0.6) bot.punchUntil = now + PUNCH_MS
          }
          bot.vx += (bot.tx - bot.x) * 0.011 + (Math.random() - 0.5) * 0.001
          bot.vy += (bot.ty - bot.y) * 0.011 + (Math.random() - 0.5) * 0.001
        }
        bot.vx *= FRICTION
        bot.vy *= FRICTION
        bot.x = clamp(bot.x + bot.vx)
        bot.y = clamp(bot.y + bot.vy)
      }

      // --- unified combat: punchers hit nearby victims ---
      if (!intro) {
        const punchers = [
          ...(mePunching ? [{ id: myId, x: m.x, y: m.y }] : []),
          ...bots.current
            .filter((b) => b.hp > 0 && now < b.punchUntil)
            .map((b) => ({ id: b.id, x: b.x, y: b.y })),
          ...[...ragePlayers.current.entries()]
            .filter(([, p]) => p.punching && now - p.at < 400)
            .map(([id, p]) => ({ id, x: p.x, y: p.y })),
        ]

        // Punching near a loose chair grabs it (locally controllable actors only)
        const ch = chair.current
        if (ch.heldBy === null) {
          for (const a of punchers) {
            const local = a.id === myId || a.id.startsWith("bot-")
            if (
              local &&
              Math.hypot(ch.x - a.x, ch.y - a.y) < CHAIR_GRAB_RANGE
            ) {
              ch.heldBy = a.id
              break
            }
          }
        }

        const victims = [
          { v: m, meta: { id: myId, isMe: true, name: "You" } },
          ...bots.current.map((b) => ({
            v: b,
            meta: { id: b.id, isMe: false, name: b.name },
          })),
        ]
        for (const { v, meta } of victims) {
          if (v.hp <= 0) continue
          for (const a of punchers) {
            if (a.id === meta.id) continue
            if (Math.hypot(v.x - a.x, v.y - a.y) < HIT_RANGE)
              hurt(
                v,
                meta,
                a.x,
                a.y,
                a.id,
                a.id === ch.heldBy ? CHAIR_DAMAGE : DAMAGE,
              )
          }
        }
      }

      // --- chair follows its holder; drops when the holder dies ---
      {
        const ch = chair.current
        if (ch.heldBy) {
          const holder =
            ch.heldBy === myId
              ? m
              : bots.current.find((b) => b.id === ch.heldBy)
          if (!holder || holder.hp <= 0) {
            ch.heldBy = null
          } else {
            ch.x = clamp(holder.x + 0.045)
            ch.y = holder.y
          }
        }
      }

      if (now - lastSent.current > 50) {
        lastSent.current = now
        onMove(m.x, m.y, mePunching, m.hp)
      }

      // --- render transforms ---
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        for (const id of nodeRefs.current.keys()) {
          const node = nodeRefs.current.get(id)
          if (!node) continue
          let pos: { x: number; y: number }
          let hp: number
          let isPunching: boolean
          if (id === myId) {
            pos = m
            hp = m.hp
            isPunching = mePunching
          } else {
            const bot = bots.current.find((b) => b.id === id)
            if (bot) {
              pos = bot
              hp = bot.hp
              isPunching = bot.hp > 0 && now < bot.punchUntil
            } else {
              const net = ragePlayers.current.get(id)
              pos = net ?? { x: 0.5, y: 0.5 }
              hp = net?.hp ?? 100
              isPunching = net?.punching ?? false
            }
          }
          const isDead = hp <= 0
          node.style.transform = `translate(${pos.x * rect.width}px, ${pos.y * rect.height}px) translate(-50%, -50%) scale(${isPunching ? 1.25 : 1}) rotate(${isDead ? "90deg" : "0deg"})`
          node.style.opacity = isDead ? "0.65" : "1"
          node.style.filter = isDead ? "grayscale(1) brightness(0.6)" : "none"
          const fill = hpRefs.current.get(id)
          if (fill) {
            fill.style.width = `${Math.max(0, hp)}%`
            fill.style.background = hpColor(hp)
          }
        }

        const ch = chair.current
        const chairNode = chairRef.current
        if (chairNode) {
          const held = ch.heldBy !== null
          const swing = held && now < punchUntil.current ? -45 : held ? -15 : 0
          chairNode.style.transform = `translate(${ch.x * rect.width}px, ${ch.y * rect.height}px) translate(-50%, -50%) rotate(${swing}deg)`
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
  const crowd = [
    ...spectators.map((p) => ({ key: p.id, seed: p.avatar || p.name })),
    ...FAKE_CROWD.map((seed) => ({ key: seed, seed })),
  ]

  const tribune = (side: "left" | "right") => (
    <div
      className={cn(
        "pointer-events-none absolute top-0 z-0 flex h-full w-24 flex-col flex-wrap content-start justify-center gap-2 p-1.5 opacity-70 sm:w-36",
        side === "left" ? "left-0" : "right-0",
      )}
    >
      {crowd
        .filter((_, i) => i % 2 === (side === "left" ? 0 : 1))
        .map((c, i) => (
          <motion.img
            key={c.key}
            src={avatarUrl(c.seed)}
            alt=""
            className="h-10 w-10 rounded-md sm:h-12 sm:w-12"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.5 + (i % 5) * 0.1,
              repeat: Infinity,
              delay: (i % 7) * 0.12,
            }}
          />
        ))}
    </div>
  )

  const fighterNode = (
    id: string,
    label: string,
    avatarSeed: string,
    mine: boolean,
  ) => (
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
        src={avatarUrl(avatarSeed)}
        alt={label}
        draggable={false}
        className={
          mine
            ? "h-12 w-12 rounded-xl ring-2 ring-red-400 shadow-[0_0_18px_rgba(248,113,113,0.7)]"
            : "h-11 w-11 rounded-xl ring-1 ring-white/25"
        }
      />
      <span className="mt-0.5 max-w-16 truncate text-[10px] text-white/80">
        {label}
      </span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_35%,#4a1420,#0a0610_72%)]">
      {/* Spotlights */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(255,220,150,0.14),transparent_40%),radial-gradient(circle_at_70%_0%,rgba(255,220,150,0.14),transparent_40%)]" />
      {/* Crowd silhouette band */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[repeating-linear-gradient(90deg,#000_0_8px,#15101a_8px_18px)] opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      {/* Fake spectators packing the side tribunes */}
      {tribune("left")}
      {tribune("right")}

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

      {/* The ring — square, centred */}
      <div className="relative flex flex-1 items-center justify-center px-3 pb-2">
        <div className="relative aspect-square w-[min(92vw,68vh)]">
          {/* Dealer commentator — anchored just outside the ring's top-left corner */}
          <div className="pointer-events-none absolute bottom-full left-0 z-20 flex items-end gap-2 pb-1">
            <DealerSprite />
            <AnimatePresence mode="wait">
              {quip && !intro && (
                <motion.span
                  key={quip}
                  initial={{ opacity: 0, y: 6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-2 max-w-48 rounded-xl border border-yellow-500/40 bg-[#10131f]/90 px-3 py-1.5 text-xs italic text-yellow-100"
                >
                  {quip}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div
            ref={containerRef}
            onPointerDown={onPointer}
            onPointerMove={(e) => e.buttons === 1 && onPointer(e)}
            className="relative h-full w-full touch-none overflow-hidden rounded-2xl border-4 border-red-500/30 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.02)_0_14px,transparent_14px_28px)] shadow-[inset_0_0_90px_rgba(0,0,0,0.7)]"
          >
            {/* Ropes */}
            <div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-white/15" />
            <div className="pointer-events-none absolute inset-6 rounded-lg border border-white/10" />

            {/* Persistent blood pools — where a fighter fell, stays on the floor */}
            {pools.map((pool) => (
              <div
                key={pool.id}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pool.x * 100}%`, top: `${pool.y * 100}%` }}
              >
                {Array.from({ length: 6 }).map((_, i) => {
                  const a = (((pool.id * 7 + i * 53) % 360) * Math.PI) / 180
                  const r = 4 + ((pool.id + i * 13) % 14)
                  const sz = 7 + ((pool.id * 3 + i * 7) % 12)
                  return (
                    <span
                      key={i}
                      className="absolute rounded-full bg-red-900/70 blur-[1px]"
                      style={{
                        width: sz,
                        height: sz,
                        left: Math.cos(a) * r,
                        top: Math.sin(a) * r,
                      }}
                    />
                  )
                })}
              </div>
            ))}

            {brawlers.map((id) => {
              const p = participants[id]
              if (!p) return null
              return fighterNode(
                id,
                id === myId ? "You" : p.name,
                p.avatar || p.name,
                id === myId,
              )
            })}

            {botList.map((b) => fighterNode(b.id, b.name, b.seed, false))}

            {/* Grabbable chair — punch it to pick it up; held chairs hit harder */}
            <div
              ref={chairRef}
              className="pointer-events-none absolute left-0 top-0 select-none text-6xl will-change-transform drop-shadow-[0_3px_6px_rgba(0,0,0,0.7)]"
              style={{ transition: "transform 0.05s linear" }}
            >
              🪑
            </div>

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
          </div>
        </div>
      </div>

      {/* Stage change — curtains part to reveal the arena */}
      <AnimatePresence>
        {intro && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              initial={{ x: 0 }}
              animate={{ x: "-100%" }}
              transition={{ duration: 0.9, ease: [0.7, 0, 0.3, 1], delay: 0.7 }}
              className="absolute inset-y-0 left-0 w-1/2 border-r-2 border-red-700/40 bg-[linear-gradient(90deg,#0a0610,#1a0a12)] shadow-[inset_-20px_0_40px_rgba(0,0,0,0.6)]"
            />
            <motion.div
              initial={{ x: 0 }}
              animate={{ x: "100%" }}
              transition={{ duration: 0.9, ease: [0.7, 0, 0.3, 1], delay: 0.7 }}
              className="absolute inset-y-0 right-0 w-1/2 border-l-2 border-red-700/40 bg-[linear-gradient(270deg,#0a0610,#1a0a12)] shadow-[inset_20px_0_40px_rgba(0,0,0,0.6)]"
            />
            <motion.div
              initial={{ scale: 2.2, opacity: 0, rotate: -6 }}
              animate={{
                scale: [2.2, 0.95, 1],
                opacity: [0, 1, 1, 0],
                rotate: [-6, 0, 0, 0],
              }}
              transition={{ duration: 1.2, times: [0, 0.25, 0.6, 1] }}
              className="z-10 flex flex-col items-center gap-1"
            >
              <span className="text-5xl font-black uppercase tracking-[0.2em] text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.9)] sm:text-7xl">
                Rage Mode
              </span>
              <span className="text-sm uppercase tracking-[0.35em] text-white/70">
                Fight!
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 px-4 py-3 text-center text-xs text-white/55">
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
        <button
          onClick={addBot}
          className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          🤖 Add bot
        </button>
        {isHost && (
          <button
            onClick={onRequestRestart}
            className="flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-500/25"
          >
            <RotateCcw className="h-4 w-4" />
            Restart arena
          </button>
        )}
      </div>
    </div>
  )
}
