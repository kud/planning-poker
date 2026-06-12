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

export const playPurr = () => {
  const audio = audioContext()
  if (!audio || isMuted()) return
  const start = audio.currentTime
  const duration = 2.9

  // Pink-ish noise — warmer than white, without brown noise's seismic rumble.
  const length = Math.ceil(audio.sampleRate * duration)
  const buffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = buffer.getChannelData(0)
  let smoothed = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    smoothed = 0.85 * smoothed + 0.15 * white
    data[i] = smoothed * 1.4 + white * 0.12
  }
  const source = audio.createBufferSource()
  source.buffer = buffer

  const highpass = audio.createBiquadFilter()
  highpass.type = "highpass"
  highpass.frequency.value = 62
  highpass.Q.value = 0.6

  const lowpass = audio.createBiquadFilter()
  lowpass.type = "lowpass"
  lowpass.frequency.value = 240
  lowpass.Q.value = 0.4

  const throat = audio.createBiquadFilter()
  throat.type = "peaking"
  throat.frequency.value = 95
  throat.Q.value = 0.8
  throat.gain.value = 6

  const pulse = audio.createGain()
  pulse.gain.value = 0.72
  const lfo = audio.createOscillator()
  const lfoDepth = audio.createGain()
  lfoDepth.gain.value = 0.28
  lfo.connect(lfoDepth)
  lfoDepth.connect(pulse.gain)

  const bodyGain = audio.createGain()
  bodyGain.gain.value = 0.22
  const bodies = [118, 123].map((frequency) => {
    const osc = audio.createOscillator()
    osc.type = "sine"
    osc.frequency.value = frequency
    osc.connect(bodyGain)
    return osc
  })
  bodyGain.connect(pulse)

  // Asymmetric breathing: a quicker, brighter inhale swell, then a longer,
  // darker exhale fade — two cycles, à la Purrli.
  const envelope = audio.createGain()
  envelope.gain.setValueAtTime(0.02, start)
  const INHALE = 0.5
  const EXHALE = 0.8
  let t = start
  for (let i = 0; i < 2; i++) {
    envelope.gain.linearRampToValueAtTime(0.6, t + INHALE)
    envelope.gain.linearRampToValueAtTime(0.1, t + INHALE + EXHALE)
    lowpass.frequency.setValueAtTime(280, t)
    lowpass.frequency.linearRampToValueAtTime(180, t + INHALE + EXHALE)
    lfo.frequency.setValueAtTime(27, t)
    lfo.frequency.linearRampToValueAtTime(23, t + INHALE + EXHALE)
    t += INHALE + EXHALE + 0.05
  }
  envelope.gain.linearRampToValueAtTime(0.0001, t + 0.15)

  source.connect(highpass)
  highpass.connect(lowpass)
  lowpass.connect(throat)
  throat.connect(pulse)
  pulse.connect(envelope)
  envelope.connect(audio.destination)
  source.start(start)
  lfo.start(start)
  lfo.stop(start + duration)
  bodies.forEach((osc) => {
    osc.start(start)
    osc.stop(start + duration)
  })
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
