import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MapPin, ArrowDown } from 'lucide-react'
import { Sound, useJST, Split, Words } from './shared.jsx'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })

// Three.js lives in its own chunk; it is prefetched while the story is read.
const loadSanctuary = () => import('./Sanctuary.jsx')
const Sanctuary = lazy(loadSanctuary)
const COARSE = typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches

/* ───────────────────────── MAGNETIC LERP CURSOR ───────────────────────── */
function Cursor({ label }) {
  const ref = useRef()
  useEffect(() => {
    if (COARSE) return
    let mx = innerWidth / 2, my = innerHeight / 2, x = mx, y = my, tx = mx, ty = my, raf
    const move = (e) => {
      mx = e.clientX; my = e.clientY
      const m = e.target.closest ? e.target.closest('[data-mag]') : null
      if (m) {
        const r = m.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2
        tx = mx + (cx - mx) * 0.4; ty = my + (cy - my) * 0.4
        ref.current?.classList.add('mag')
        gsap.to(m, { x: (mx - cx) * 0.22, y: (my - cy) * 0.22, duration: 0.4 })
      } else { tx = mx; ty = my; ref.current?.classList.remove('mag') }
    }
    const out = (e) => {
      const m = e.target.closest ? e.target.closest('[data-mag]') : null
      if (m) gsap.to(m, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1,.4)' })
    }
    const loop = () => {
      x += (tx - x) * 0.16; y += (ty - y) * 0.16
      if (ref.current) ref.current.style.transform = `translate3d(${x}px,${y}px,0)`
      raf = requestAnimationFrame(loop)
    }
    addEventListener('pointermove', move); addEventListener('pointerout', out); loop()
    return () => { removeEventListener('pointermove', move); removeEventListener('pointerout', out); cancelAnimationFrame(raf) }
  }, [])
  if (COARSE) return null
  return (
    <div ref={ref} className={'cursor ' + (label ? 'pill' : '')}>
      <div className="cursor-dot">{label}</div>
    </div>
  )
}

/* ───────────────────────── ACT I — BRUTALIST ENTRY GATE ───────────────────────── */
function Gate({ onEnter }) {
  const root = useRef()
  const jst = useJST()
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.ch', { yPercent: 115, duration: 1.3, stagger: 0.045, ease: 'expo.out', delay: 0.2 })
      gsap.from('.fade', { opacity: 0, y: 14, duration: 1, stagger: 0.12, delay: 1 })
    }, root)
    const mv = (e) => {
      if (e.pointerType !== 'mouse') return
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5
      gsap.to('.drift', { x: x * -30, y: y * -18, duration: 0.8 })
    }
    addEventListener('pointermove', mv)
    return () => { ctx.revert(); removeEventListener('pointermove', mv) }
  }, [])
  return (
    <section ref={root} className="fixed inset-0 bg-ink text-paper flex flex-col justify-between p-6 md:p-10 overflow-hidden scanlines safe-pad">
      <div className="absolute inset-0 halftone opacity-40 pointer-events-none" />
      <header className="relative z-10 flex flex-wrap justify-between gap-4 text-[.7rem] tracking-[.3em] font-display">
        <span className="fade">MARC JACOBS // ARCHIVE ENTRY</span>
        <span className="fade hud-pill flex items-center gap-2">
          <MapPin size={12} className="text-vermilion" />
          SHIBUYA 35.6595° N, 139.7005° E · JST {jst}
        </span>
      </header>

      <div className="relative z-10 drift">
        <h1 className="font-display font-black leading-[.85] text-[15vw] md:text-[12vw] m-0">
          <Split text="MARC" /><br /><Split text="JACOBS" />
        </h1>
        <p className="fade font-mincho font-bold text-vermilion mt-4 text-[4vw] md:text-[2.2vw] tracking-[.3em]">
          マーク ジェイコブス 東京
        </p>
      </div>

      <footer className="relative z-10 flex flex-wrap items-end justify-between gap-6">
        <button className="btn fade text-paper cursor-pointer" data-mag onClick={onEnter}>[ ENTER ]</button>
        <p className="fade max-w-xs text-[.7rem] tracking-[.25em] leading-relaxed opacity-60 font-display">
          TOKYO EDITION — A GRAPHIC NOVEL IN FOUR ACTS. SOUND RECOMMENDED. HEADPHONES BETTER.
        </p>
      </footer>
    </section>
  )
}

/* ───────────────────────── ACT II — MANGA PANELS ───────────────────────── */
function drawPanel(cv, seed) {
  const w = (cv.width = cv.offsetWidth), h = (cv.height = cv.offsetHeight)
  if (!w || !h) return
  const c = cv.getContext('2d')
  let s = seed * 7919 + 13
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  c.fillStyle = '#0a0a0a'; c.fillRect(0, 0, w, h)

  const gx = w * (0.25 + rnd() * 0.5), gy = h * (0.2 + rnd() * 0.25)
  const ang = 0.52 + rnd() * 0.3, cos = Math.cos(ang), sin = Math.sin(ang), diag = Math.hypot(w, h)

  const dots = (step, col, fn) => {
    c.fillStyle = col
    for (let u = -diag; u < diag; u += step)
      for (let v = -diag; v < diag; v += step) {
        const x = u * cos - v * sin + w / 2, y = u * sin + v * cos + h / 2
        if (x < -step || y < -step || x > w + step || y > h + step) continue
        const t = fn(x, y)
        if (t <= 0.05) continue
        c.beginPath(); c.arc(x, y, step * 0.62 * Math.min(t, 1), 0, 6.283); c.fill()
      }
  }
  dots(9, '#f4f1ea', (x, y) => (1 - Math.hypot(x - gx, y - gy) / (w * 0.8)) * (0.8 + 0.3 * Math.sin(x * 0.04) * Math.cos(y * 0.05)))
  dots(13, '#e60026', (x, y) => 1.25 - Math.hypot(x - gx, y - gy) / (w * 0.3))
  c.fillStyle = '#e60026'; c.beginPath(); c.arc(gx, gy, w * 0.07, 0, 6.283); c.fill()
  c.strokeStyle = '#0a0a0a'; c.lineWidth = 5; c.stroke()

  c.strokeStyle = '#0a0a0a'
  for (let i = 0; i < 80; i++) {
    const a = rnd() * 6.283, r0 = w * (0.1 + rnd() * 0.12), r1 = r0 + w * (0.25 + rnd() * 0.5)
    c.lineWidth = 1 + rnd() * 3.5
    c.beginPath(); c.moveTo(gx + Math.cos(a) * r0, gy + Math.sin(a) * r0); c.lineTo(gx + Math.cos(a) * r1, gy + Math.sin(a) * r1); c.stroke()
  }

  let bx = -10
  while (bx < w) {
    const bw = 34 + rnd() * 70, bh = h * (0.18 + rnd() * 0.34)
    c.fillStyle = '#000'; c.fillRect(bx, h - bh, bw, bh)
    c.strokeStyle = '#f4f1ea'; c.lineWidth = 2; c.strokeRect(bx, h - bh, bw, bh)
    c.fillStyle = '#f4f1ea'
    for (let wy = h - bh + 14; wy < h - 10; wy += 16)
      for (let wx = bx + 8; wx < bx + bw - 8; wx += 12) if (rnd() > 0.62) c.fillRect(wx, wy, 5, 7)
    bx += bw + 3
  }

  c.save(); c.beginPath(); c.moveTo(w * 0.5, 0); c.lineTo(w, 0); c.lineTo(w, h * 0.55); c.closePath(); c.clip()
  c.strokeStyle = 'rgba(244,241,234,.6)'; c.lineWidth = 1.3
  for (let i = -h; i < w + h; i += 7) {
    c.beginPath(); c.moveTo(i + rnd() * 3, 0); c.quadraticCurveTo(i + h / 2 + rnd() * 6, h / 2, i + h + rnd() * 3, h); c.stroke()
  }
  c.strokeStyle = 'rgba(10,10,10,.7)'
  for (let i = 0; i < w + h; i += 11) { c.beginPath(); c.moveTo(w - i, 0); c.lineTo(w - i + h, h); c.stroke() }
  c.restore()

  c.strokeStyle = 'rgba(244,241,234,.35)'; c.lineWidth = 1
  for (let i = 0; i < 160; i++) {
    const x = rnd() * w, y = rnd() * h
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - 6, y + 20 + rnd() * 16); c.stroke()
  }
}

const PANELS = [
  { n: '01', t: 'SHIBUYA — 03:14 AM.', c: 'NEON DISSOLVES IN THE DRIZZLE.', k: '渋谷', seed: 3,
    body: 'The scramble is empty. Four hundred signs still hum above the wet asphalt, and one silhouette crosses alone, carrying the only thing worth the rain.' },
  { n: '02', t: 'THE TOKYO TOTE MONOLITH', c: 'AWAKENS BENEATH THE CONCRETE.', k: '覚醒', seed: 7,
    body: 'Black glass. Polished chrome. A seam of vermilion breathing under the city like a second pulse. The archive opens only for those who stay awake.' },
  { n: '03', t: 'NO WITNESSES.', c: 'ONLY THE SIGNAL REMAINS.', k: '無', seed: 11,
    body: 'By dawn the drizzle has erased every footprint. What is left is an object, a colour, and a door that opens when you press and drag.' }
]

function Panel({ p, i }) {
  const root = useRef(), cv = useRef()
  useEffect(() => {
    const redraw = () => cv.current && drawPanel(cv.current, p.seed)
    redraw()
    const ro = new ResizeObserver(redraw); ro.observe(cv.current)
    const ctx = gsap.context(() => {
      gsap.fromTo('.pin', { clipPath: 'inset(50% 50% 50% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power4.out', scrollTrigger: { trigger: root.current, start: 'top 80%' } })
      gsap.fromTo('.pcv', { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } })
      gsap.from('.w', { yPercent: 120, duration: 0.9, stagger: 0.04, ease: 'power4.out', scrollTrigger: { trigger: root.current, start: 'top 60%' } })
      gsap.from('.kanji', { opacity: 0, scale: 1.4, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: root.current, start: 'top 70%' } })
    }, root)
    return () => { ro.disconnect(); ctx.revert() }
  }, [p.seed])

  const tilt = (e) => {
    if (e.pointerType !== 'mouse') return
    const r = root.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
    gsap.to(root.current, { rotateY: x * 7, rotateX: -y * 7, transformPerspective: 1100, duration: 0.5 })
    gsap.to('.cap', { x: x * 22, y: y * 12, duration: 0.6 })
    gsap.to('.kanji', { x: x * -36, y: y * -20, duration: 0.8 })
  }
  const rest = () => gsap.to([root.current, '.cap', '.kanji'].flatMap(t => typeof t === 'string' ? Array.from(root.current.querySelectorAll(t)) : [t]), { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.8 })

  return (
    <div className={'relative my-[10vh] w-[min(90vw,980px)] ' + (i % 2 ? 'ml-auto mr-[5vw]' : 'mr-auto ml-[5vw]')}>
      <div ref={root} className="woodcut h-[min(78svh,760px)]" onPointerMove={tilt} onPointerLeave={rest}>
        <div className="pin absolute inset-0 overflow-hidden">
          <canvas ref={cv} className="pcv absolute left-0 w-full" style={{ top: '-8%', height: '116%' }} />
          <span className="kanji absolute top-4 right-6 font-mincho font-extrabold text-paper/90 text-[16vw] md:text-[11vw] leading-none" style={{ writingMode: 'vertical-rl', WebkitTextStroke: '2px #000' }}>{p.k}</span>
          <div className="cap absolute left-5 bottom-5 right-5 md:right-auto md:max-w-[70%] bg-paper text-ink border-4 border-black p-5 z-10">
            <p className="font-display font-black text-[.7rem] tracking-[.35em] text-vermilion m-0 mb-2">PANEL {p.n}: {p.t}</p>
            <h3 className="font-mincho font-extrabold text-[clamp(1.1rem,2.6vw,2rem)] leading-tight m-0 mb-3"><Words text={p.c} /></h3>
            <p className="font-mincho text-[.9rem] leading-relaxed m-0 opacity-80">{p.body}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Story({ onDescend }) {
  const jst = useJST()
  const root = useRef()
  useEffect(() => {
    ;(window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(() => loadSanctuary())
    const ctx = gsap.context(() => {
      gsap.from('.ch', { yPercent: 115, duration: 1.2, stagger: 0.04, ease: 'expo.out' })
    }, root)
    return () => ctx.revert()
  }, [])
  return (
    <section ref={root} className="relative bg-paper text-ink min-h-[100dvh] overflow-x-hidden">
      <div className="fixed inset-0 halftone opacity-[.18] pointer-events-none" />
      <div className="fixed hud-tr z-40 hud-pill bg-ink/80 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-vermilion animate-pulse" /> TOKYO JST {jst}
      </div>
      <div className="relative min-h-[70vh] flex flex-col justify-end p-6 md:p-12">
        <p className="font-display text-[.7rem] tracking-[.4em] text-vermilion m-0">CHAPTER ONE — 第一章</p>
        <h2 className="font-display font-black text-[11vw] leading-[.88] m-0"><Split text="NIGHT" /><br /><Split text="SHIFT" /></h2>
        <p className="mt-6 flex items-center gap-3 text-[.75rem] tracking-[.3em] font-display"><ArrowDown size={16} className="text-vermilion" /> SCROLL TO READ</p>
      </div>
      {PANELS.map((p, i) => <Panel key={p.n} p={p} i={i} />)}
      <div className="relative text-center py-[14vh]">
        <p className="font-mincho font-extrabold text-[8vw] leading-none m-0 mb-8 text-ink/90">降りる</p>
        <button className="btn text-ink cursor-pointer" data-mag onClick={onDescend}>[ DESCEND ]</button>
      </div>
    </section>
  )
}

/* ───────────────────────── ACT III — HOLD & DRAG INK GATE ───────────────────────── */
function HoldGate({ onUnlock }) {
  const cv = useRef(), bar = useRef()
  useEffect(() => {
    const c = cv.current, g = c.getContext('2d')
    let down = false, last = null, len = 0, done = false, raf
    const bleeds = []
    const paper = () => {
      c.width = c.clientWidth; c.height = c.clientHeight
      g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, c.width, c.height)
      g.fillStyle = 'rgba(10,10,10,.08)'
      for (let y = 0; y < c.height; y += 8) for (let x = (y / 8 % 2) * 4; x < c.width; x += 8) { g.beginPath(); g.arc(x, y, 1.1, 0, 6.283); g.fill() }
    }
    paper()
    let cw = innerWidth
    const onResize = () => { if (innerWidth !== cw) { cw = innerWidth; paper() } }
    const NEED = 2200
    const seg = (x, y) => {
      const d = Math.hypot(x - last.x, y - last.y)
      if (d < 1) return
      len += d
      const w = 10 + Math.min(len / 14, 70)
      const col = len > 1000 ? '#e60026' : '#0a0a0a'
      const steps = Math.ceil(d / 3)
      for (let i = 0; i < steps; i++) {
        const t = i / steps, px = last.x + (x - last.x) * t, py = last.y + (y - last.y) * t
        g.fillStyle = '#0a0a0a'
        g.beginPath(); g.ellipse(px, py, w * (0.55 + Math.random() * 0.3), w * (0.35 + Math.random() * 0.25), Math.atan2(y - last.y, x - last.x), 0, 6.283); g.fill()
        if (len > 1000) { g.fillStyle = col; g.beginPath(); g.arc(px, py, w * 0.32, 0, 6.283); g.fill() }
      }
      for (let i = 0; i < 4; i++) {
        g.fillStyle = Math.random() > 0.8 && len > 1000 ? '#e60026' : '#0a0a0a'
        g.beginPath(); g.arc(x + (Math.random() - 0.5) * w * 2.2, y + (Math.random() - 0.5) * w * 2.2, Math.random() * w * 0.14, 0, 6.283); g.fill()
      }
      if (Math.random() > 0.7) bleeds.push({ x, y, r: w * 0.5, max: w * (1.4 + Math.random()) })
      last = { x, y }
      bar.current.style.width = Math.min(len / NEED, 1) * 100 + '%'
      if (len % 5 < 2) Sound.tick(300 + len / 4)
      if (len >= NEED && !done) { done = true; onUnlock() }
    }
    const grow = () => {
      for (let i = bleeds.length - 1; i >= 0; i--) {
        const b = bleeds[i]; b.r += 0.35
        g.fillStyle = 'rgba(10,10,10,.05)'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.283); g.fill()
        if (b.r > b.max) bleeds.splice(i, 1)
      }
      raf = requestAnimationFrame(grow)
    }
    grow()
    const pd = (e) => { c.setPointerCapture?.(e.pointerId); down = true; last = { x: e.clientX, y: e.clientY }; Sound.tick(500) }
    const pm = (e) => { if (down && !done) seg(e.clientX, e.clientY) }
    const pu = () => { down = false }
    c.addEventListener('pointerdown', pd); addEventListener('pointermove', pm); addEventListener('pointerup', pu); addEventListener('pointercancel', pu); addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); c.removeEventListener('pointerdown', pd); removeEventListener('pointermove', pm); removeEventListener('pointerup', pu); removeEventListener('pointercancel', pu); removeEventListener('resize', onResize) }
  }, [onUnlock])
  return (
    <section className="fixed inset-0 bg-paper text-ink" style={{ touchAction: 'none' }}>
      <canvas ref={cv} className="absolute inset-0 w-full h-full block" />
      <div className="absolute top-safe-lg left-0 right-0 text-center pointer-events-none">
        <p className="font-display font-black text-[.75rem] tracking-[.5em] m-0">ACT III — 第三幕</p>
        <h2 className="font-mincho font-extrabold text-[clamp(1.4rem,4vw,3rem)] m-0 mt-2">CARVE THE SEAL</h2>
      </div>
      <div className="absolute bottom-safe-lg left-1/2 -translate-x-1/2 w-[min(80vw,520px)] pointer-events-none">
        <p className="text-center font-display text-[.7rem] tracking-[.4em] mb-3">PRESS · HOLD · DRAG TO UNLOCK THE SANCTUARY</p>
        <div className="h-[6px] bg-ink/15"><div ref={bar} className="h-full bg-vermilion" style={{ width: '0%' }} /></div>
      </div>
    </section>
  )
}

/* ───────────────────────── ROOT ───────────────────────── */
export default function App() {
  const [act, setAct] = useState(0)
  const curtain = useRef(), flash = useRef()

  useEffect(() => {
    const m = (e) => Sound.mod?.(e.clientX / innerWidth, e.clientY / innerHeight)
    addEventListener('pointermove', m, { passive: true })
    return () => removeEventListener('pointermove', m)
  }, [])

  useEffect(() => {
    document.body.style.overflow = act === 1 ? 'auto' : 'hidden'
    requestAnimationFrame(() => ScrollTrigger.refresh())
    // Shifts the audio engine's chord progression to match each act smoothly
    Sound.shift?.(act)
  }, [act])

  const go = (n) => {
    Sound.tick()
    gsap.timeline()
      .set(curtain.current, { yPercent: 100, display: 'block' })
      .to(curtain.current, { yPercent: 0, duration: 0.6, ease: 'power4.inOut', onComplete: () => { window.scrollTo(0, 0); setAct(n) } })
      .to(curtain.current, { yPercent: -100, duration: 0.7, ease: 'power4.inOut', delay: 0.1 })
      .set(curtain.current, { display: 'none' })
  }
  const enter = () => { Sound.boot(); go(1) }
  const unlock = () => {
    Sound.hit()
    gsap.timeline()
      .set(flash.current, { display: 'block' })
      .to(flash.current, { opacity: 1, duration: 0.12 })
      .add(() => setAct(3))
      .to(flash.current, { opacity: 0, duration: 1.4, ease: 'power2.out' })
      .set(flash.current, { display: 'none' })
  }

  return (
    <div className="grain">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="woodcut" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="3" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="9" />
        </filter>
      </svg>

      <Cursor label={act === 2 ? 'HOLD & DRAG' : ''} />

      {act === 0 && <Gate onEnter={enter} />}
      {act === 1 && <Story onDescend={() => go(2)} />}
      {act === 2 && <HoldGate onUnlock={unlock} />}
      {act === 3 && (
        <Suspense fallback={<div className="fixed inset-0 bg-ink" />}>
          <Sanctuary onBack={() => go(1)} />
        </Suspense>
      )}

      <div ref={curtain} className="fixed inset-0 bg-ink z-[95]" style={{ display: 'none' }}>
        <div className="w-full h-full halftone-red opacity-30" />
      </div>
      <div ref={flash} className="fixed inset-0 z-[96] pointer-events-none" style={{ display: 'none', opacity: 0, background: '#e60026' }} />
    </div>
  )
}