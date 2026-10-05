import React, { useEffect, useState } from 'react'

/* ───────────────────────── CALMING GENERATIVE AMBIENT AUDIO ENGINE ───────────────────────── */
export const Sound = (() => {
  let ac = null, master = null, padFilter = null, rainGain = null, on = true
  let padOscs = [], chimeTimer = null, currentAct = 0, currentVolume = 0.65

  const THEMES = [
    // Act 0: The Gate — E minor open fifth
    { padFreqs: [82.41, 164.81, 246.94], chimes: [196.00, 246.94, 293.66, 392.00, 493.88], cutoff: 280, rain: 0.02 },
    // Act 1: Shibuya Rain — D minor pentatonic
    { padFreqs: [73.42, 146.83, 220.00], chimes: [174.61, 220.00, 261.63, 349.23, 440.00], cutoff: 320, rain: 0.06 },
    // Act 2: The Ink Gate — Meditative A minor Zen
    { padFreqs: [110.00, 164.81, 220.00], chimes: [220.00, 261.63, 329.63, 392.00, 523.25], cutoff: 300, rain: 0.025 },
    // Act 3: 3D Sanctuary — Warm F# minor 9th shimmer
    { padFreqs: [92.50, 185.00, 277.18], chimes: [220.00, 277.18, 329.63, 415.30, 554.37], cutoff: 380, rain: 0.02 }
  ]

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

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.992, t + 3.0)

      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.linearRampToValueAtTime(0.07 + Math.random() * 0.04, t + 0.12)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.2)

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

    const nextInterval = 2200 + Math.random() * 2800
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

      master = ac.createGain()
      master.gain.setValueAtTime(0.0001, ac.currentTime)
      master.gain.linearRampToValueAtTime(on ? currentVolume : 0.0001, ac.currentTime + 2.0)

      padFilter = ac.createBiquadFilter()
      padFilter.type = 'lowpass'
      padFilter.frequency.setValueAtTime(300, ac.currentTime)
      padFilter.Q.value = 1.4

      const breathLFO = ac.createOscillator()
      const breathGain = ac.createGain()
      breathLFO.frequency.value = 0.12
      breathGain.gain.value = 0.04
      const padMasterGain = ac.createGain()
      padMasterGain.gain.value = 0.09
      breathLFO.connect(breathGain)
      breathGain.connect(padMasterGain.gain)
      breathLFO.start()

      const bufferSize = ac.sampleRate * 2
      const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate)
      const data = noiseBuffer.getChannelData(0)
      let b0 = 0, b1 = 0, b2 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99 * b0 + white * 0.045
        b1 = 0.95 * b1 + white * 0.045
        b2 = 0.85 * b2 + white * 0.045
        data[i] = (b0 + b1 + b2) * 0.075
      }
      const noise = ac.createBufferSource()
      noise.buffer = noiseBuffer
      noise.loop = true

      const noiseFilter = ac.createBiquadFilter()
      noiseFilter.type = 'lowpass'
      noiseFilter.frequency.value = 700

      rainGain = ac.createGain()
      rainGain.gain.setValueAtTime(0.025, ac.currentTime)

      noise.connect(noiseFilter)
      noiseFilter.connect(rainGain)
      rainGain.connect(master)
      noise.start()

      const theme = THEMES[0]
      padOscs = []

      theme.padFreqs.forEach((freq, idx) => {
        const osc = ac.createOscillator()
        const g = ac.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ac.currentTime)

        const detune = idx === 0 ? 0 : idx === 1 ? 0.25 : -0.25
        osc.frequency.value += detune

        g.gain.setValueAtTime(0.0001, ac.currentTime)
        g.gain.linearRampToValueAtTime(0.07, ac.currentTime + 2.0)

        osc.connect(g)
        g.connect(padFilter)
        osc.start()
        padOscs.push({ osc, gain: g, baseGain: 0.07 })
      })

      padFilter.connect(padMasterGain)
      padMasterGain.connect(master)
      master.connect(ac.destination)

      setTimeout(playAmbientChime, 1000)
    } catch (e) {
      console.warn('Sound boot error:', e)
    }
  }

  const shift = (actIndex) => {
    currentAct = actIndex
    if (!ac) return
    const theme = THEMES[actIndex] || THEMES[0]
    const t = ac.currentTime

    if (padFilter) padFilter.frequency.setTargetAtTime(theme.cutoff, t, 1.2)
    if (rainGain) rainGain.gain.setTargetAtTime(theme.rain, t, 1.2)

    padOscs.forEach((item, i) => {
      if (i < theme.padFreqs.length) {
        item.osc.frequency.setTargetAtTime(theme.padFreqs[i], t, 1.2)
      }
    })
    setTimeout(playAmbientChime, 400)
  }

  const mod = (nx, ny) => {
    if (!ac || !padFilter || !on) return
    const theme = THEMES[currentAct] || THEMES[0]
    const targetCutoff = theme.cutoff + (1 - ny) * 160
    padFilter.frequency.setTargetAtTime(targetCutoff, ac.currentTime, 0.2)
  }

  const setVolume = (val) => {
    currentVolume = Math.max(0, Math.min(1, val))
    if (master && ac) {
      master.gain.setTargetAtTime(on ? currentVolume : 0.0001, ac.currentTime, 0.08)
    }
    return currentVolume
  }

  const tick = (freq = 520) => {
    if (!ac || !on) return
    try {
      const t = ac.currentTime
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(freq, t)
      o.frequency.exponentialRampToValueAtTime(freq * 0.8, t + 0.06)

      g.gain.setValueAtTime(0.06, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)

      o.connect(g)
      g.connect(master || ac.destination)
      o.start(t)
      o.stop(t + 0.09)
    } catch (e) {}
  }

  const hit = () => {
    if (!ac || !on) return
    try {
      const t = ac.currentTime
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(90, t)
      o.frequency.exponentialRampToValueAtTime(35, t + 0.5)

      g.gain.setValueAtTime(0.35, t)
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
      master.gain.setTargetAtTime(on ? currentVolume : 0.0001, ac.currentTime, 0.15)
    }
    return on
  }

  return { boot, shift, mod, tick, hit, toggle, setVolume, getVolume: () => currentVolume, isOn: () => on }
})()

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