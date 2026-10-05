import React, { useEffect, useState } from 'react'

/* ───────────────────────── CALMING GENERATIVE AMBIENT AUDIO ENGINE ───────────────────────── */
export const Sound = (() => {
  let ac = null, master = null, padFilter = null, rainGain = null, on = true
  let padOscs = [], chimeTimer = null, currentAct = 0

  // Calming modal scales and pad chords for each act
  const THEMES = [
    // Act 0: The Gate — Ethereal, meditative E minor (Peaceful dawn)
    {
      padFreqs: [82.41, 164.81, 246.94], // E2, E3, B3
      chimes: [196.00, 246.94, 293.66, 392.00, 493.88], // G3, B3, D4, G4, B4
      cutoff: 240,
      rain: 0.012
    },
    // Act 1: Shibuya Rain — Gentle D minor pentatonic with soft rain whisper
    {
      padFreqs: [73.42, 146.83, 220.00], // D2, D3, A3
      chimes: [174.61, 220.00, 261.63, 349.23, 440.00], // F3, A3, C4, F4, A4
      cutoff: 280,
      rain: 0.045
    },
    // Act 2: The Ink Gate — Meditative Zen interval (A minor)
    {
      padFreqs: [110.00, 164.81, 220.00], // A2, E3, A3
      chimes: [220.00, 261.63, 329.63, 392.00, 523.25], // A3, C4, E4, G4, C5
      cutoff: 260,
      rain: 0.018
    },
    // Act 3: 3D Sanctuary — Warm luxury F# minor 9th (Floating celestial chimes)
    {
      padFreqs: [92.50, 185.00, 277.18], // F#2, F#3, C#4
      chimes: [220.00, 277.18, 329.63, 415.30, 554.37], // A3, C#4, E4, G#4, C#5
      cutoff: 320,
      rain: 0.015
    }
  ]

  // Plays a single soft, organic, decaying wind-chime / waterdrop tone
  const playAmbientChime = () => {
    if (!ac || !on || ac.state !== 'running') return
    try {
      const theme = THEMES[currentAct] || THEMES[0]
      const notes = theme.chimes
      const freq = notes[Math.floor(Math.random() * notes.length)]
      const t = ac.currentTime

      const osc = ac.createOscillator()
      const gain = ac.createGain()
      const panner = ac.createStereoPanner ? ac.createStereoPanner() : null

      // Pure warm sine wave
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t)
      // Slight pitch drift downward for natural wind-chime acoustic feel
      osc.frequency.exponentialRampToValueAtTime(freq * 0.992, t + 3.0)

      // Soft envelope: gentle rise, very long relaxing decay
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.linearRampToValueAtTime(0.035 + Math.random() * 0.02, t + 0.12)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.2)

      // Random gentle stereo pan between left and right ear
      if (panner) {
        panner.pan.value = (Math.random() * 2 - 1) * 0.65
        osc.connect(gain)
        gain.connect(panner)
        panner.connect(master)
      } else {
        osc.connect(gain)
        gain.connect(master)
      }

      osc.start(t)
      osc.stop(t + 3.4)
    } catch (e) {}

    // Schedule the next soothing chime note at a random natural interval (every 2.5 to 5.5 seconds)
    const nextInterval = 2400 + Math.random() * 3200
    chimeTimer = setTimeout(playAmbientChime, nextInterval)
  }

  const boot = () => {
    if (ac) {
      if (ac.state === 'suspended') ac.resume()
      return
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      ac = new AC()

      // Master output with soft fade in
      master = ac.createGain()
      master.gain.setValueAtTime(0.0001, ac.currentTime)
      master.gain.linearRampToValueAtTime(on ? 0.35 : 0.0001, ac.currentTime + 3.5)

      // Lowpass filter to ensure all sound is warm, velvety, and never buzzing
      padFilter = ac.createBiquadFilter()
      padFilter.type = 'lowpass'
      padFilter.frequency.setValueAtTime(260, ac.currentTime)
      padFilter.Q.value = 1.2

      // Gentle LFO that breathes the pad volume slowly (like ocean waves / deep breaths)
      const breathLFO = ac.createOscillator()
      const breathGain = ac.createGain()
      breathLFO.frequency.value = 0.12 // 8-second slow breathing cycle
      breathGain.gain.value = 0.025
      const padMasterGain = ac.createGain()
      padMasterGain.gain.value = 0.05
      breathLFO.connect(breathGain)
      breathGain.connect(padMasterGain.gain)
      breathLFO.start()

      // Soft rain bed (filtered pinkish noise)
      const bufferSize = ac.sampleRate * 2
      const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate)
      const data = noiseBuffer.getChannelData(0)
      let b0 = 0, b1 = 0, b2 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99 * b0 + white * 0.04
        b1 = 0.95 * b1 + white * 0.04
        b2 = 0.85 * b2 + white * 0.04
        data[i] = (b0 + b1 + b2) * 0.06
      }
      const noise = ac.createBufferSource()
      noise.buffer = noiseBuffer
      noise.loop = true

      const noiseFilter = ac.createBiquadFilter()
      noiseFilter.type = 'lowpass'
      noiseFilter.frequency.value = 600

      rainGain = ac.createGain()
      rainGain.gain.setValueAtTime(0.015, ac.currentTime)

      noise.connect(noiseFilter)
      noiseFilter.connect(rainGain)
      rainGain.connect(master)
      noise.start()

      // Create 3 warm, deep sine pad voices for the foundation
      const theme = THEMES[0]
      padOscs = []

      theme.padFreqs.forEach((freq, idx) => {
        const osc = ac.createOscillator()
        const g = ac.createGain()
        osc.type = 'sine' // pure, silky sine wave — zero buzz
        osc.frequency.setValueAtTime(freq, ac.currentTime)

        // Subtle chorus detune
        const detune = idx === 0 ? 0 : idx === 1 ? 0.25 : -0.25
        osc.frequency.value += detune

        g.gain.setValueAtTime(0.0001, ac.currentTime)
        g.gain.linearRampToValueAtTime(0.04, ac.currentTime + 3.0)

        osc.connect(g)
        g.connect(padFilter)
        osc.start()
        padOscs.push({ osc, gain: g, baseGain: 0.04 })
      })

      padFilter.connect(padMasterGain)
      padMasterGain.connect(master)
      master.connect(ac.destination)

      // Start the generative calming wind-chime notes
      setTimeout(playAmbientChime, 1500)
    } catch (e) {
      console.warn('Sound boot error:', e)
    }
  }

  // Smooth portamento glide when switching pages/acts
  const shift = (actIndex) => {
    currentAct = actIndex
    if (!ac) return
    const theme = THEMES[actIndex] || THEMES[0]
    const t = ac.currentTime

    // Smooth filter transition
    if (padFilter) {
      padFilter.frequency.setTargetAtTime(theme.cutoff, t, 1.2)
    }

    // Smooth rain texture transition
    if (rainGain) {
      rainGain.gain.setTargetAtTime(theme.rain, t, 1.2)
    }

    // Glide pad notes smoothly to the new chord
    padOscs.forEach((item, i) => {
      if (i < theme.padFreqs.length) {
        const target = theme.padFreqs[i]
        item.osc.frequency.setTargetAtTime(target, t, 1.2)
      }
    })

    // Immediately trigger a welcoming chime note for the new act
    setTimeout(playAmbientChime, 600)
  }

  // Soft pointer modulation — breathes gently with cursor movement without buzzing
  const mod = (nx, ny) => {
    if (!ac || !padFilter || !on) return
    const theme = THEMES[currentAct] || THEMES[0]
    const targetCutoff = theme.cutoff + (1 - ny) * 120
    padFilter.frequency.setTargetAtTime(targetCutoff, ac.currentTime, 0.2)
  }

  // Soft glass / kalimba UI click
  const tick = (freq = 520) => {
    if (!ac || !on) return
    try {
      const t = ac.currentTime
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(freq, t)
      o.frequency.exponentialRampToValueAtTime(freq * 0.8, t + 0.06)

      g.gain.setValueAtTime(0.035, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)

      o.connect(g)
      g.connect(master || ac.destination)
      o.start(t)
      o.stop(t + 0.09)
    } catch (e) {}
  }

  // Soft rounded felt sub-thud
  const hit = () => {
    if (!ac || !on) return
    try {
      const t = ac.currentTime
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(90, t)
      o.frequency.exponentialRampToValueAtTime(35, t + 0.5)

      g.gain.setValueAtTime(0.22, t)
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.55)

      o.connect(g)
      g.connect(master || ac.destination)
      o.start(t)
      o.stop(t + 0.58)
    } catch (e) {}
  }

  const toggle = () => {
    on = !on
    if (master && ac) {
      master.gain.setTargetAtTime(on ? 0.35 : 0.0001, ac.currentTime, 0.15)
    }
    return on
  }

  return { boot, shift, mod, tick, hit, toggle, isOn: () => on }
})()

/* ───────────────────────── HELPERS ───────────────────────── */
export const useJST = () => {
  const f = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Tokyo' })
  const [t, setT] = useState(f)
  useEffect(() => { const i = setInterval(() => setT(f()), 1000); return () => clearInterval(i) }, [])
  return t
}

export const Split = ({ text, cls = '' }) => (
  <span className={'inline-flex overflow-hidden pb-[.08em] ' + cls} aria-label={text}>
    {[...text].map((c, i) => (
      <span key={i} className="ch inline-block" aria-hidden="true">{c === ' ' ? '\u00A0' : c}</span>
    ))}
  </span>
)

export const Words = ({ text }) =>
  text.split(' ').map((w, i) => (
    <span key={i} className="inline-block overflow-hidden align-bottom mr-[.3em]">
      <span className="w inline-block">{w}</span>
    </span>
  ))