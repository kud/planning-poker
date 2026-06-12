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
  const gain = audio.createGain()
  const tremolo = audio.createOscillator()
  const tremoloGain = audio.createGain()
  tremolo.frequency.value = 22
  tremoloGain.gain.value = 0.05
  tremolo.connect(tremoloGain)
  tremoloGain.connect(gain.gain)

  const layers: Array<[number, number]> = [
    [90, 0.05],
    [180, 0.06],
    [360, 0.025],
  ]
  const oscillators = layers.map(([frequency, volume]) => {
    const osc = audio.createOscillator()
    const oscGain = audio.createGain()
    osc.type = "sine"
    osc.frequency.value = frequency
    oscGain.gain.value = volume
    osc.connect(oscGain)
    oscGain.connect(gain)
    return osc
  })

  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(1, start + 0.18)
  gain.gain.setValueAtTime(1, start + 1.3)
  gain.gain.exponentialRampToValueAtTime(0.001, start + 1.8)
  const master = audio.createGain()
  master.gain.value = 1
  gain.connect(master)
  master.connect(audio.destination)
  tremolo.start(start)
  tremolo.stop(start + 1.9)
  oscillators.forEach((osc) => {
    osc.start(start)
    osc.stop(start + 1.9)
  })
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
