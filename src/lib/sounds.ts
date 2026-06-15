const MUTE_KEY = "pp-muted"

let ctx: AudioContext | null = null

const audioContext = () => {
  if (typeof window === "undefined") return null
  ctx ??= new AudioContext()
  if (ctx.state === "suspended") ctx.resume()
  return ctx
}

export const isMuted = () => {
  try {
    return localStorage.getItem(MUTE_KEY) === "1"
  } catch {
    return false
  }
}

export const setMuted = (muted: boolean) => {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0")
  } catch {}
}

const tone = (
  frequency: number,
  duration: number,
  options: {
    type?: OscillatorType
    volume?: number
    delay?: number
    glideTo?: number
  } = {},
) => {
  const audio = audioContext()
  if (!audio || isMuted()) return
  const { type = "sine", volume = 0.06, delay = 0, glideTo } = options
  const start = audio.currentTime + delay

  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, start)
  if (glideTo)
    osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration)
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}

const swish = (duration: number, volume: number, delay = 0) => {
  const audio = audioContext()
  if (!audio || isMuted()) return
  const start = audio.currentTime + delay
  const length = Math.ceil(audio.sampleRate * duration)
  const buffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1

  const source = audio.createBufferSource()
  source.buffer = buffer
  const filter = audio.createBiquadFilter()
  filter.type = "bandpass"
  filter.frequency.setValueAtTime(1800, start)
  filter.frequency.exponentialRampToValueAtTime(600, start + duration)
  filter.Q.value = 1.2
  const gain = audio.createGain()
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(audio.destination)
  source.start(start)
}

export const playVote = () => swish(0.16, 0.08)

export const playReveal = () => {
  swish(0.22, 0.06)
  tone(520, 0.18, { type: "triangle", volume: 0.045, delay: 0.1 })
}

export const playConsensus = () => {
  tone(660, 0.3, { volume: 0.05 })
  tone(880, 0.45, { volume: 0.05, delay: 0.14 })
}

export const playEnterRoom = () => {
  const audio = audioContext()
  if (!audio) return
  const fire = () => {
    if (isMuted()) return
    swish(0.18, 0.06)
    tone(392, 0.3, { type: "triangle", volume: 0.05, delay: 0.12 })
    tone(523.25, 0.5, { type: "triangle", volume: 0.05, delay: 0.28 })
  }
  if (audio.state === "suspended") {
    const once = () => {
      window.removeEventListener("pointerdown", once)
      window.removeEventListener("keydown", once)
      audio.resume().then(fire)
    }
    window.addEventListener("pointerdown", once, { once: true })
    window.addEventListener("keydown", once, { once: true })
    return
  }
  fire()
}

export const playNewRound = () => {
  swish(0.1, 0.05)
  swish(0.12, 0.06, 0.09)
  tone(440, 0.22, {
    type: "triangle",
    volume: 0.035,
    delay: 0.18,
    glideTo: 587,
  })
}

// A cat purrs at a ~25 Hz fundamental (real measurements: egressive ~21–27 Hz,
// ingressive ~23–26 Hz — the inhale runs ~2.4 Hz higher). The 25 Hz itself is
// near-inaudible on laptop speakers, so we use a 25 Hz sawtooth whose harmonics
// (50/75/100 Hz…) carry the audible "rrrr", lowpassed warm and gated by a slow
// inhale/exhale breathing envelope.
export const playPurr = () => {
  const audio = audioContext()
  if (!audio || isMuted()) return
  const start = audio.currentTime

  const PHASES = [
    { freq: 25, peak: 1, len: 0.95 }, // exhale: lower, longer, fuller
    { freq: 27.4, peak: 0.62, len: 0.6 }, // inhale: higher, shorter, softer
    { freq: 25, peak: 1, len: 0.95 },
    { freq: 27.4, peak: 0.62, len: 0.6 },
  ]
  const dur = PHASES.reduce((a, p) => a + p.len, 0) + 0.3

  const out = audio.createGain()
  out.gain.value = 0.22
  out.connect(audio.destination)

  // Breathing envelope shared by every layer.
  const breath = audio.createGain()
  breath.gain.setValueAtTime(0.0001, start)
  breath.connect(out)

  const lowpass = audio.createBiquadFilter()
  lowpass.type = "lowpass"
  lowpass.frequency.value = 430
  lowpass.Q.value = 0.5
  lowpass.connect(breath)

  // Core buzz — 25 Hz sawtooth → harmonics are the audible purr texture.
  const buzz = audio.createOscillator()
  buzz.type = "sawtooth"
  const buzzGain = audio.createGain()
  buzzGain.gain.value = 0.5
  buzz.connect(buzzGain)
  buzzGain.connect(lowpass)

  // Sub fundamental — felt more than heard.
  const sub = audio.createOscillator()
  sub.type = "sine"
  const subGain = audio.createGain()
  subGain.gain.value = 0.3
  sub.connect(subGain)
  subGain.connect(breath)

  // Faint breath noise for airy texture.
  const length = Math.ceil(audio.sampleRate * dur)
  const buffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  const noise = audio.createBufferSource()
  noise.buffer = buffer
  const noiseBp = audio.createBiquadFilter()
  noiseBp.type = "bandpass"
  noiseBp.frequency.value = 550
  noiseBp.Q.value = 0.4
  const noiseGain = audio.createGain()
  noiseGain.gain.value = 0.05
  noise.connect(noiseBp)
  noiseBp.connect(noiseGain)
  noiseGain.connect(breath)

  // Drive breathing + per-phase pitch, with a touch of organic jitter.
  let t = start
  for (const ph of PHASES) {
    const f = ph.freq + (Math.random() - 0.5) * 1.5
    buzz.frequency.setValueAtTime(f, t)
    sub.frequency.setValueAtTime(f, t)
    breath.gain.linearRampToValueAtTime(ph.peak, t + ph.len * 0.4)
    breath.gain.linearRampToValueAtTime(ph.peak * 0.5, t + ph.len)
    t += ph.len
  }
  breath.gain.linearRampToValueAtTime(0.0001, t + 0.25)

  const stop = t + 0.3
  buzz.start(start)
  buzz.stop(stop)
  sub.start(start)
  sub.stop(stop)
  noise.start(start)
}

export const playClink = () => {
  tone(2093, 0.09, { volume: 0.04 })
  tone(2637, 0.14, { volume: 0.035, delay: 0.07 })
}

export const playAhem = () => {
  tone(170, 0.07, { type: "triangle", volume: 0.05 })
  tone(140, 0.12, { type: "triangle", volume: 0.045, delay: 0.1 })
}

export const playScamper = () => {
  ;[0, 0.07, 0.15, 0.21, 0.3].forEach((delay, i) =>
    tone(1500 + (i % 2) * 250, 0.025, {
      type: "triangle",
      volume: 0.04,
      delay,
    }),
  )
}

export const playDice = () => {
  tone(2400, 0.03, { type: "square", volume: 0.025 })
  tone(2100, 0.03, { type: "square", volume: 0.025, delay: 0.09 })
  tone(2600, 0.03, { type: "square", volume: 0.02, delay: 0.19 })
}

export const playPunch = () => {
  tone(170, 0.12, { type: "square", volume: 0.13, glideTo: 50 })
  tone(80, 0.16, { type: "sine", volume: 0.1, glideTo: 40 })
  swish(0.08, 0.07)
}

export const playHit = () => {
  tone(110, 0.13, { type: "sine", volume: 0.09, glideTo: 45 })
  tone(220, 0.05, { type: "square", volume: 0.03 })
}

export const playBell = () => {
  tone(880, 0.6, { type: "triangle", volume: 0.06 })
  tone(1320, 0.5, { type: "triangle", volume: 0.03 })
  tone(880, 0.6, { type: "triangle", volume: 0.05, delay: 0.18 })
}

// Short, hype "fight!" sting when Rage Mode opens: ring bell, a gritty power
// chord, a low thud, then a rising charge lead.
export const playRageStart = () => {
  playBell()
  const root = 110 // A2 power chord (root + fifth + octave)
  ;[root, root * 1.5, root * 2].forEach((f) =>
    tone(f, 0.8, {
      type: "sawtooth",
      volume: 0.045,
      delay: 0.05,
      glideTo: f * 1.06,
    }),
  )
  tone(70, 0.28, { type: "square", volume: 0.09, glideTo: 42 })
  ;[330, 415, 494, 660].forEach((f, i) =>
    tone(f, 0.13, { type: "square", volume: 0.04, delay: 0.5 + i * 0.09 }),
  )
}

// Crowd cheer — a low roar floor with many random clap transients baked into
// the buffer (Poisson-ish), so it reads as applause/voices, not a noise wave.
export const playCheer = (volume = 0.05) => {
  const audio = audioContext()
  if (!audio || isMuted()) return
  const start = audio.currentTime
  const duration = 3.0
  const length = Math.ceil(audio.sampleRate * duration)
  const buffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = buffer.getChannelData(0)
  // Per the applause-synthesis literature (Peltola et al.): ~12 claps/sec,
  // each a noise burst with a fast attack and a long (~250ms) decay, over a
  // quiet roar floor. Resonance + band-limiting come from the filters below.
  const triggerProb = 12 / audio.sampleRate
  const clapDecay = Math.exp(-1 / (0.25 * audio.sampleRate)) // ~250ms
  let roar = 0
  let clap = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    roar = 0.75 * roar + 0.25 * white
    if (Math.random() < triggerProb) clap = 1
    clap *= clapDecay
    data[i] = roar * 0.32 + white * clap * 0.9
  }
  const source = audio.createBufferSource()
  source.buffer = buffer

  // Roll off lows/highs, with a presence resonance ~1.8 kHz for the clap "pop".
  const highpass = audio.createBiquadFilter()
  highpass.type = "highpass"
  highpass.frequency.value = 220
  const presence = audio.createBiquadFilter()
  presence.type = "peaking"
  presence.frequency.value = 1800
  presence.Q.value = 1
  presence.gain.value = 6
  const lowpass = audio.createBiquadFilter()
  lowpass.type = "lowpass"
  lowpass.frequency.value = 7500

  const gain = audio.createGain()
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.25)
  gain.gain.linearRampToValueAtTime(volume * 0.9, start + 2.1)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  source.connect(highpass)
  highpass.connect(presence)
  presence.connect(lowpass)
  lowpass.connect(gain)
  gain.connect(audio.destination)
  source.start(start)
}
