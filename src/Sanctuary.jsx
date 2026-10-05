import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'
import { MapPin, Volume2, VolumeX, Layers, Ruler, Palette, Gem, ChevronUp, ChevronDown } from 'lucide-react'
import { Sound, useJST, Split } from './shared.jsx'

/* ───────────────────────── ACT IV — 3D TOKYO SANCTUARY (MOBILE LOCKED & OPTIMIZED) ───────────────────────── */
export default function Sanctuary({ onBack }) {
  const root = useRef(), tc = useRef()
  const [sound, setSound] = useState(true)
  const [volume, setVolState] = useState(0.65)
  const [cwIdx, setCwIdx] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [specsOpen, setSpecsOpen] = useState(false)
  const [loadingModel, setLoadingModel] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const jst = useJST()

  const COLORWAYS = [
    { id: '01', name: 'NATURAL OAT', sub: 'Authentic Woven Canvas', hex: 0xffffff, css: '#eae3d2' },
    { id: '02', name: 'SHIBUYA NOIR', sub: 'Obsidian Black Tint', hex: 0x222226, css: '#18181c' },
    { id: '03', name: 'TOKYO CRIMSON', sub: 'Lacquer Vermilion Tint', hex: 0xd91428, css: '#9a0f1d' },
  ]

  const updateMaterialRef = useRef(null)
  const modelRef = useRef(null)

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value)
    setVolState(val)
    Sound.setVolume?.(val)
  }

  useEffect(() => {
    const el = tc.current
    if (!el) return

    const renderer = new THREE.WebGLRenderer({
      canvas: el,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight, false)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 100)

    const updateCam = () => {
      const aspect = window.innerWidth / window.innerHeight
      cam.aspect = aspect
      // Perfectly scaled distance for mobile vs desktop
      cam.position.z = aspect < 1 ? 13.0 / aspect : 8.8
      cam.updateProjectionMatrix()
    }
    updateCam()

    const pmrem = new THREE.PMREMGenerator(renderer)
    const envRoom = new RoomEnvironment()
    scene.environment = pmrem.fromScene(envRoom, 0.04).texture

    scene.add(new THREE.AmbientLight(0xffffff, 0.85))

    const keyLight = new THREE.DirectionalLight(0xfff8f0, 3.2)
    keyLight.position.set(6, 8, 7)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.6)
    fillLight.position.set(-6, 3, 5)
    scene.add(fillLight)

    const topLight = new THREE.DirectionalLight(0xffffff, 2.0)
    topLight.position.set(0, 9, -2)
    scene.add(topLight)

    const rimVermilion = new THREE.PointLight(0xe60026, 4.5, 30)
    rimVermilion.position.set(-5, 2, -4)
    scene.add(rimVermilion)

    const rimCyan = new THREE.PointLight(0x38bdf8, 3.8, 30)
    rimCyan.position.set(5, -1, -4)
    scene.add(rimCyan)

    const bagGroup = new THREE.Group()
    scene.add(bagGroup)

    const shadow = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 2.6, 64),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -1.6
    scene.add(shadow)

    const partGeo = new THREE.BufferGeometry()
    const partCount = 75
    const partPos = new Float32Array(partCount * 3)
    for (let i = 0; i < partCount * 3; i += 3) {
      partPos[i] = (Math.random() - 0.5) * 14
      partPos[i + 1] = (Math.random() - 0.5) * 10
      partPos[i + 2] = (Math.random() - 0.5) * 12
    }
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3))
    const particles = new THREE.Points(
      partGeo,
      new THREE.PointsMaterial({ color: 0xff4a5a, size: 0.038, transparent: true, opacity: 0.7 })
    )
    scene.add(particles)

    const applyColorway = (idx) => {
      const selected = COLORWAYS[idx]
      if (!modelRef.current) return

      modelRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          const mat = child.material
          const name = (mat.name || '').toLowerCase()

          if (name.includes('body') || name.includes('edge') || name.includes('handle') || name.includes('strap')) {
            mat.color.setHex(selected.hex)
            mat.needsUpdate = true
          }
          if (name.includes('logo')) {
            mat.color.setHex(0xffffff)
            mat.needsUpdate = true
          }
        }
      })
      gsap.fromTo(bagGroup.scale, { x: 0.94, y: 0.94, z: 0.94 }, { x: 1, y: 1, z: 1, duration: 0.55, ease: 'back.out(2)' })
    }
    updateMaterialRef.current = applyColorway

    const loader = new GLTFLoader()
    const modelUrl = '/marc_jacobs_woven_tote_bag.glb'

    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene
        modelRef.current = model

        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())

        const pivot = new THREE.Group()
        model.position.x -= center.x
        model.position.y -= center.y
        model.position.z -= center.z
        pivot.add(model)
        pivot.rotation.y = Math.PI

        const maxDim = Math.max(size.x, size.y, size.z)
        const scaleFactor = 3.4 / maxDim
        pivot.scale.setScalar(scaleFactor)

        shadow.position.y = - (size.y * scaleFactor * 0.5) - 0.04

        bagGroup.add(pivot)
        applyColorway(0)
        setLoadingModel(false)
      },
      undefined,
      (err) => {
        console.error('Failed to load model:', err)
        setLoadError('Please verify marc_jacobs_woven_tote_bag.glb is in public/ folder.')
        setLoadingModel(false)
      }
    )

    let isDragging = false, lx = 0, ly = 0, vx = 0, vy = 0.006

    const onPointerDown = (e) => { isDragging = true; lx = e.clientX; ly = e.clientY }
    const onPointerMove = (e) => {
      if (!isDragging) return
      vy = (e.clientX - lx) * 0.0055
      vx = (e.clientY - ly) * 0.003
      lx = e.clientX
      ly = e.clientY
    }
    const onPointerUp = () => { isDragging = false }

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true
        lx = e.touches[0].clientX
        ly = e.touches[0].clientY
      }
    }
    const onTouchMove = (e) => {
      if (!isDragging || e.touches.length !== 1) return
      vy = (e.touches[0].clientX - lx) * 0.0075
      vx = (e.touches[0].clientY - ly) * 0.004
      lx = e.touches[0].clientX
      ly = e.touches[0].clientY
    }
    const onTouchEnd = () => { isDragging = false }

    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight, false)
      updateCam()
    }
    window.addEventListener('resize', onResize)

    let reqId
    const clock = new THREE.Clock()

    const animate = () => {
      const t = clock.getElapsedTime()
      bagGroup.rotation.y += vy
      bagGroup.rotation.x += vx

      if (!isDragging) {
        vy += (0.004 - vy) * 0.02
        vy *= 0.97
        vx *= 0.9
        bagGroup.rotation.x += (0.06 - bagGroup.rotation.x) * 0.05
      } else {
        vy *= 0.85
        vx *= 0.85
      }

      bagGroup.rotation.x = Math.max(-0.55, Math.min(0.55, bagGroup.rotation.x))
      bagGroup.position.y = Math.sin(t * 1.4) * 0.06
      particles.rotation.y = t * 0.025

      renderer.render(scene, cam)
      reqId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(reqId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('touchstart', onTouchStart)
      pmrem.dispose()
      envRoom.dispose()
      renderer.dispose()
    }
  }, [])

  const selectColorway = (idx) => {
    Sound.tick?.(800 + idx * 200)
    setCwIdx(idx)
    if (updateMaterialRef.current) updateMaterialRef.current(idx)
  }

  const currentCw = COLORWAYS[cwIdx]

  const specs = [
    [Layers, 'MATERIAL', currentCw.sub],
    [Ruler, 'DIMENSIONS', '34 × 38 × 14 cm · 1.1 kg'],
    [Palette, 'FINISH', currentCw.name + ' · Jacquard Weave'],
    [Gem, 'EDITION', 'Numbered 001–300 · Shibuya Archive'],
  ]

  return (
    <section ref={root} className="fixed inset-0 overflow-hidden select-none" style={{ background: 'radial-gradient(circle at 50% 45%, #1c0a10, #0a0a0a 70%)', touchAction: 'none' }}>
      {/* Background Kinetic Typography */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
        <h1 className="l1 font-display font-black text-[17vw] md:text-[15vw] leading-[.82] m-0 outline-text"><Split text="MARC" /></h1>
        <h1 className="l2 font-display font-black text-[17vw] md:text-[15vw] leading-[.82] m-0 text-chrome/90"><Split text="JACOBS" /></h1>
        <p className="font-mincho font-extrabold text-vermilion text-[3.6vw] md:text-[2vw] tracking-[.4em] mt-4">マーク ジェイコブス 東京</p>
      </div>

      <canvas ref={tc} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-10" style={{ touchAction: 'none' }} />

      {loadingModel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 gap-3">
          <div className="w-8 h-8 border-2 border-vermilion border-t-transparent rounded-full animate-spin" />
          <p className="font-display text-[10px] tracking-[0.4em] text-white/70 uppercase">LOADING ARCHIVE TOTE BAG 3D...</p>
        </div>
      )}

      {loadError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-950/80 border border-red-500 text-white p-4 text-xs font-mono z-30 max-w-md text-center backdrop-blur-md">
          {loadError}
        </div>
      )}

      {/* Top HUD (Non-overlapping responsive layout) */}
      <header className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-5 z-30 flex flex-wrap justify-between items-center gap-2 text-[.65rem] tracking-[.25em] font-display pointer-events-auto">
        <div className="flex items-center gap-2">
          <button
            data-mag
            onClick={onBack}
            className="hud-pill flex items-center gap-1.5 hover:border-vermilion transition cursor-pointer text-paper py-2 px-3"
          >
            ← BACK
          </button>
          <span className="hud-pill hidden xl:flex items-center gap-2 py-2 px-3">
            <MapPin size={12} className="text-vermilion" />
            SHIBUYA · 35.6595° N, 139.7005° E
          </span>
        </div>

        {/* Volume Bar & Audio Control */}
        <div className="flex items-center gap-2">
          <div className="hud-pill flex items-center gap-2 py-2 px-2.5 sm:px-3">
            <button
              data-mag
              aria-label="toggle sound"
              onClick={() => setSound(Sound.toggle?.())}
              className="text-vermilion cursor-pointer hover:scale-110 transition"
            >
              {sound ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={sound ? volume : 0}
              onChange={handleVolumeChange}
              className="w-14 sm:w-18 accent-[#e60026] cursor-pointer h-1.5 bg-white/20 rounded-lg"
              title="Adjust Volume"
            />
            <span className="text-[8px] w-6 text-right font-mono text-white/70">
              {sound ? Math.round(volume * 100) : 0}%
            </span>
          </div>

          <span className="hud-pill hidden sm:inline-block py-2 px-3">JST {jst}</span>
        </div>
      </header>

      {/* Bottom Colorway Selector Pills */}
      <div className="absolute bottom-20 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 flex flex-wrap justify-center gap-1.5 sm:gap-2 pointer-events-auto max-w-[94vw]">
        {COLORWAYS.map((c, i) => (
          <button
            key={c.id}
            data-mag
            onClick={() => selectColorway(i)}
            className={`hud-pill flex items-center gap-1.5 sm:gap-2 text-[.58rem] sm:text-[.64rem] transition cursor-pointer py-1.5 px-2.5 sm:py-2 sm:px-3.5 ${
              cwIdx === i
                ? '!bg-white !text-ink !border-white font-bold shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                : 'hover:border-vermilion'
            }`}
          >
            <span className="w-2 h-2 rounded-full border border-black/40" style={{ background: c.css }} />
            <span>{c.name}</span>
          </button>
        ))}
      </div>

      {/* Specification Sheet / Mobile Collapsible Drawer */}
      <aside className={`absolute z-30 right-3 sm:right-5 bottom-3 md:bottom-auto md:top-1/2 md:-translate-y-1/2 w-[min(94vw,320px)] bg-ink/90 md:bg-ink/65 backdrop-blur-xl border border-white/15 p-4 sm:p-5 shadow-[10px_10px_0_#000] transition-all duration-300 ${specsOpen ? 'max-h-[75vh]' : 'max-h-[110px] md:max-h-none overflow-hidden'}`}>
        <div className="flex justify-between items-center md:block">
          <div>
            <p className="spec font-display font-bold text-[.58rem] tracking-[.4em] text-vermilion m-0 mb-1">SPECIFICATIONS — 仕様</p>
            <h3 className="spec font-mincho font-extrabold text-lg sm:text-xl m-0 mb-1">The Tokyo Monolith Tote</h3>
          </div>
          <button 
            onClick={() => setSpecsOpen(!specsOpen)} 
            className="md:hidden text-white/70 hover:text-white p-1"
            aria-label="Toggle Specifications"
          >
            {specsOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>

        <div className={`space-y-1.5 sm:space-y-2.5 mt-2 ${specsOpen ? 'block' : 'hidden md:block'}`}>
          {specs.map(([Icon, k, v]) => (
            <div key={k} className="spec spec-row py-1.5 sm:py-2">
              <Icon size={14} className="text-vermilion shrink-0 mt-0.5" />
              <div><p className="m-0 text-[.55rem] tracking-[.25em] font-display opacity-60">{k}</p><p className="m-0 text-[.8rem] sm:text-[.85rem] leading-snug">{v}</p></div>
            </div>
          ))}
          <div className="spec flex items-center justify-between pt-2.5 sm:pt-3 border-t border-white/10">
            <span className="font-mincho font-bold text-base sm:text-lg">¥ 248,000</span>
            <button
              className="btn !py-1.5 !px-3 !text-[.62rem] sm:!text-[.68rem] cursor-pointer"
              data-mag
              onClick={() => {
                Sound.hit?.()
                setDrawerOpen(true)
              }}
            >
              [ ACQUIRE ]
            </button>
          </div>
        </div>
      </aside>

      {/* Reservation Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/80 backdrop-blur-md">
          <div className="relative h-full w-full max-w-md border-l border-white/20 bg-[#0e0e12] p-6 sm:p-8 text-paper flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between border-b border-white/15 pb-4 text-[10px] tracking-[0.3em] font-display">
                <span className="text-white/50">SHIBUYA FLAGSHIP CAPSULE</span>
                <button
                  data-mag
                  onClick={() => {
                    Sound.tick?.()
                    setDrawerOpen(false)
                  }}
                  className="text-white hover:text-vermilion font-bold text-sm tracking-wider cursor-pointer"
                >
                  [✕ CLOSE]
                </button>
              </div>

              <h3 className="mt-8 text-3xl font-black font-display text-white">THE TOTE BAG</h3>
              <p className="text-xs tracking-[0.35em] text-vermilion mt-1 font-bold font-mincho">
                TOKYO · 東京 ARCHIVE EDITION
              </p>

              <div className="mt-8 space-y-4 text-xs tracking-[0.2em] font-display border-t border-b border-white/10 py-6">
                <div className="flex justify-between items-center"><span className="text-white/40">COLORWAY</span><span className="font-bold">{currentCw.name}</span></div>
                <div className="flex justify-between items-center"><span className="text-white/40">EDITION</span><span className="text-white">{currentCw.sub}</span></div>
                <div className="flex justify-between items-center"><span className="text-white/40">ALLOCATION</span><span className="text-vermilion font-bold">042 / 300 Reserved</span></div>
                <div className="flex justify-between items-center"><span className="text-white/40">PRICE</span><span className="font-bold">¥ 248,000 JPY</span></div>
              </div>

              <p className="mt-6 text-[11px] leading-relaxed text-white/60 font-display">
                Authentic Marc Jacobs Woven Tote Bag Archive Edition. Hand-crafted jacquard weave with dual structured handles and archival certification.
              </p>
            </div>

            <div className="mt-8 pt-4">
              <button
                data-mag
                onClick={() => {
                  Sound.hit?.()
                  alert('ACCESS CODE: MJ-TOKYO-042 RESERVED. APPOINTMENT SENT TO SHIBUYA FLAGSHIP.')
                }}
                className="w-full border-2 border-vermilion bg-vermilion text-white py-4 text-xs font-bold font-display tracking-[0.35em] hover:bg-white hover:text-ink hover:border-white transition shadow-[0_0_30px_rgba(230,0,38,0.4)] cursor-pointer"
              >
                RSVP PRIVATE APPOINTMENT
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}