import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'
import { Volume2, VolumeX, Gem, Ruler, Palette, Layers } from 'lucide-react'
import { Sound, useJST, Split } from './shared.jsx'

export default function Sanctuary({ onBack }) {
  const root = useRef(), tc = useRef()
  const [sound, setSound] = useState(true)
  const [cwIdx, setCwIdx] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [specsOpen, setSpecsOpen] = useState(false)
  const [reserved, setReserved] = useState(false)
  const jst = useJST()

  const COLORWAYS = [
    { id: '01', name: 'SHIBUYA NOIR', sub: 'Obsidian Pebble Leather', hex: 0x121216, css: '#121216', text: '#ffffff', metal: 0.12, rough: 0.35, clearcoat: 0.75 },
    { id: '02', name: 'TOKYO CRIMSON', sub: 'Deep Lacquer Vermilion', hex: 0x7a0916, css: '#7a0916', text: '#ffffff', metal: 0.15, rough: 0.28, clearcoat: 0.85 },
    { id: '03', name: 'CHROME ICE', sub: 'Mirror Specular Chrome', hex: 0xcdd3db, css: '#cdd3db', text: '#0a0a0a', metal: 0.95, rough: 0.15, clearcoat: 0.95 },
  ]

  useEffect(() => {
    if (!drawerOpen) return
    const k = (e) => e.key === 'Escape' && setDrawerOpen(false)
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [drawerOpen])

  const updateMaterialRef = useRef(null)

  useEffect(() => {
    const el = tc.current
    if (!el) return
    let disposed = false, curIdx = 0

    const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.75 : 2))
    renderer.setSize(el.clientWidth, el.clientHeight, false)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1

    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(32, el.clientWidth / el.clientHeight, 0.1, 100)

    let baseY = 0
    const updateCam = () => {
      const aspect = el.clientWidth / el.clientHeight
      cam.aspect = aspect
      baseY = aspect < 1 ? 0.55 : 0
      cam.position.z = aspect < 1 ? Math.max(8.8, 8.6 / aspect) : 8.8
      cam.updateProjectionMatrix()
    }
    updateCam()

    scene.add(new THREE.AmbientLight(0xffffff, 0.2))
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTex
    pmrem.dispose()

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
    keyLight.position.set(5, 6, 7)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xaad4ff, 0.75)
    fillLight.position.set(-6, 2, 4)
    scene.add(fillLight)

    const backLight = new THREE.DirectionalLight(0xffffff, 1.2)
    backLight.position.set(0, 4, -6)
    scene.add(backLight)

    const rimVermilion = new THREE.PointLight(0xe60026, 3.8, 25)
    rimVermilion.position.set(-4, 2, -3)
    scene.add(rimVermilion)

    const rimCyan = new THREE.PointLight(0x22d3ee, 3.2, 25)
    rimCyan.position.set(4, -1, -3)
    scene.add(rimCyan)

    // Canvas Logo Texture Renderer (The Tokyo Marc Jacobs Logo)
    const logoCanvas = document.createElement('canvas')
    logoCanvas.width = 1024
    logoCanvas.height = 1024

    const drawLogo = (cw) => {
      const g = logoCanvas.getContext('2d')
      g.fillStyle = cw.css
      g.fillRect(0, 0, 1024, 1024)

      const grad = g.createRadialGradient(512, 512, 100, 512, 512, 600)
      grad.addColorStop(0, 'rgba(255,255,255,0.08)')
      grad.addColorStop(1, 'rgba(0,0,0,0.32)')
      g.fillStyle = grad
      g.fillRect(0, 0, 1024, 1024)

      g.strokeStyle = cw.text
      g.globalAlpha = 0.35
      g.setLineDash([14, 10])
      g.lineWidth = 4
      g.strokeRect(52, 52, 920, 920)
      g.setLineDash([])
      g.globalAlpha = 1.0

      g.fillStyle = cw.text
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.font = '900 170px "Impact", "Arial Narrow", sans-serif'
      g.fillText('THE TOTE BAG', 512, 330)

      g.fillStyle = '#e60026'
      g.fillRect(212, 416, 600, 8)

      g.fillStyle = cw.text
      g.font = '700 110px "Cinzel Decorative", Georgia, serif'
      g.fillText('MARC JACOBS', 512, 530)

      g.font = '800 86px "Shippori Mincho", serif'
      g.fillText('TOKYO · 東京', 512, 690)

      g.globalAlpha = 0.7
      g.font = '600 28px sans-serif'
      g.fillText('SHIBUYA POP-UP // NUMBERED 001-300', 512, 810)
      g.globalAlpha = 1.0
    }

    drawLogo(COLORWAYS[0])
    const logoTexture = new THREE.CanvasTexture(logoCanvas)
    logoTexture.anisotropy = renderer.capabilities.getMaxAnisotropy()

    // Pebble Leather Bump Texture
    Promise.all([
      document.fonts.load('700 110px "Cinzel Decorative"'),
      document.fonts.load('800 86px "Shippori Mincho"', '東京'),
    ]).then(() => { if (!disposed) { drawLogo(COLORWAYS[curIdx]); logoTexture.needsUpdate = true } }).catch(() => {})

    const bumpCanvas = document.createElement('canvas')
    bumpCanvas.width = 256
    bumpCanvas.height = 256
    const bg = bumpCanvas.getContext('2d')
    const imgData = bg.createImageData(256, 256)
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = 110 + Math.random() * 110
      imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = v
      imgData.data[i + 3] = 255
    }
    bg.putImageData(imgData, 0, 0)
    const bumpTexture = new THREE.CanvasTexture(bumpCanvas)
    bumpTexture.wrapS = bumpTexture.wrapT = THREE.RepeatWrapping
    bumpTexture.repeat.set(6, 6)

    // Materials
    const createMat = () => new THREE.MeshPhysicalMaterial({
      color: COLORWAYS[0].hex,
      roughness: COLORWAYS[0].rough,
      metalness: COLORWAYS[0].metal,
      clearcoat: COLORWAYS[0].clearcoat,
      clearcoatRoughness: 0.25,
      bumpMap: bumpTexture,
      bumpScale: 0.04,
      envMapIntensity: 0.55,
    })

    const bodyMat = createMat()
    const frontMat = createMat()
    frontMat.map = logoTexture

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.98,
      roughness: 0.06,
    })

    const strapMat = new THREE.MeshStandardMaterial({
      color: 0x18181c,
      roughness: 0.7,
      metalness: 0.05,
    })

    const bagGroup = new THREE.Group()
    scene.add(bagGroup)

    const W = 3.2, H = 2.6, D = 1.35

    const bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(W, H, D),
      [bodyMat, bodyMat, bodyMat, bodyMat, frontMat, bodyMat]
    )
    bagGroup.add(bodyMesh)

    const addPiping = (len, pos, rot) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len, 12), bodyMat)
      p.position.set(...pos)
      p.rotation.set(...rot)
      bagGroup.add(p)
    }
    ;[-1, 1].forEach((a) => [-1, 1].forEach((b) => {
      addPiping(W, [0, a * H / 2, b * D / 2], [0, 0, Math.PI / 2])
      addPiping(H, [a * W / 2, 0, b * D / 2], [0, 0, 0])
      addPiping(D, [a * W / 2, b * H / 2, 0], [Math.PI / 2, 0, 0])
    }))

    ;[-D / 2 + 0.12, D / 2 - 0.12].forEach((zPos) => {
      const handle = new THREE.Mesh(
        new THREE.TorusGeometry(0.85, 0.055, 12, 48, Math.PI),
        strapMat
      )
      handle.scale.z = 2.4
      handle.position.set(0, H / 2, zPos)
      bagGroup.add(handle)

      ;[-0.85, 0.85].forEach((xPos) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 16, 32), chromeMat)
        ring.position.set(xPos, H / 2 - 0.04, zPos)
        ring.rotation.y = Math.PI / 2
        bagGroup.add(ring)
      })
    })

    const shadow = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 2.6, 64),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -H / 2 - 0.4
    scene.add(shadow)

    const partGeo = new THREE.BufferGeometry()
    const partCount = 100
    const partPos = new Float32Array(partCount * 3)
    for (let i = 0; i < partCount * 3; i += 3) {
      partPos[i] = (Math.random() - 0.5) * 14
      partPos[i + 1] = (Math.random() - 0.5) * 10
      partPos[i + 2] = (Math.random() - 0.5) * 12
    }
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3))
    const particles = new THREE.Points(
      partGeo,
      new THREE.PointsMaterial({ color: 0xff4a5a, size: 0.04, transparent: true, opacity: 0.75 })
    )
    scene.add(particles)

    updateMaterialRef.current = (idx) => {
      const selected = COLORWAYS[idx]
      curIdx = idx
      bodyMat.color.setHex(selected.hex)
      bodyMat.roughness = selected.rough
      bodyMat.metalness = selected.metal
      bodyMat.clearcoat = selected.clearcoat

      frontMat.color.setHex(selected.hex)
      frontMat.roughness = selected.rough
      frontMat.metalness = selected.metal
      frontMat.clearcoat = selected.clearcoat

      drawLogo(selected)
      logoTexture.needsUpdate = true

      gsap.fromTo(bagGroup.scale, { x: 0.92, y: 0.92, z: 0.92 }, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(2)' })
    }

    let isDragging = false, lx = 0, ly = 0, vx = 0, vy = 0.008

    const onPointerDown = (e) => { isDragging = true; lx = e.clientX; ly = e.clientY; el.setPointerCapture?.(e.pointerId) }
    const onPointerMove = (e) => {
      if (!isDragging) return
      vy = (e.clientX - lx) * 0.006 * (e.pointerType === 'touch' ? 1.3 : 1)
      vx = (e.clientY - ly) * 0.003 * (e.pointerType === 'touch' ? 1.3 : 1)
      lx = e.clientX
      ly = e.clientY
    }
    const onPointerUp = () => { isDragging = false }


    el.addEventListener('pointerdown', onPointerDown)
    addEventListener('pointermove', onPointerMove)
    addEventListener('pointerup', onPointerUp)
    addEventListener('pointercancel', onPointerUp)

    const onResize = () => {
      if (!el.clientWidth || !el.clientHeight) return
      renderer.setSize(el.clientWidth, el.clientHeight, false)
      updateCam()
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(el)

    let reqId
    const clock = new THREE.Clock()

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const animate = () => {
      reqId = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta() * 60, 3)
      const t = clock.elapsedTime
      bagGroup.rotation.y += vy * dt
      bagGroup.rotation.x += vx * dt
      if (!isDragging) {
        vy += ((reduce ? 0 : 0.005) - vy) * 0.02 * dt
        vy *= Math.pow(0.97, dt)
        vx *= Math.pow(0.9, dt)
        bagGroup.rotation.x += (0.08 - bagGroup.rotation.x) * 0.05 * dt
      } else {
        vy *= Math.pow(0.85, dt)
        vx *= Math.pow(0.85, dt)
      }
      bagGroup.rotation.x = Math.max(-0.6, Math.min(0.6, bagGroup.rotation.x))
      bagGroup.position.y = baseY + (reduce ? 0 : Math.sin(t * 1.5) * 0.08)
      particles.rotation.y = t * 0.03
      renderer.render(scene, cam)
    }
    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(reqId)
      else { clock.getDelta(); reqId = requestAnimationFrame(animate) }
    }
    document.addEventListener('visibilitychange', onVis)
    animate()

    gsap.from('.spec', { opacity: 0, x: 40, duration: 1, stagger: 0.12, ease: 'power3.out', delay: 0.3 })
    gsap.from('.hudin', { opacity: 0, y: -20, duration: 1, delay: 0.2 })

    return () => {
      cancelAnimationFrame(reqId)
      removeEventListener('pointermove', onPointerMove)
      removeEventListener('pointerup', onPointerUp)
      removeEventListener('pointercancel', onPointerUp)
      document.removeEventListener('visibilitychange', onVis)
      ro.disconnect()
      el.removeEventListener('pointerdown', onPointerDown)
      disposed = true
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()) })
      logoTexture.dispose(); bumpTexture.dispose(); envTex.dispose()
      renderer.dispose()
    }
  }, [])

  const selectColorway = (idx) => {
    Sound.tick(800 + idx * 200)
    setCwIdx(idx)
    if (updateMaterialRef.current) updateMaterialRef.current(idx)
  }

  const currentCw = COLORWAYS[cwIdx]

  const specs = [
    [Layers, 'MATERIAL', currentCw.sub],
    [Ruler, 'DIMENSIONS', '34 × 38 × 14 cm · 1.1 kg'],
    [Palette, 'FINISH', currentCw.name + ' · Dual Ring Mounts'],
    [Gem, 'EDITION', 'Numbered 001–300 · Shibuya archive'],
  ]

  return (
    <section ref={root} className="fixed inset-0 overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 45%, #1c0a10, #0a0a0a 70%)' }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
        <h1 className="l1 font-display font-black text-[17vw] md:text-[15vw] leading-[.82] m-0 outline-text"><Split text="MARC" /></h1>
        <h1 className="l2 font-display font-black text-[17vw] md:text-[15vw] leading-[.82] m-0 text-chrome/90"><Split text="JACOBS" /></h1>
        <p className="font-mincho font-extrabold text-vermilion text-[3.6vw] md:text-[2vw] tracking-[.4em] mt-4">マーク ジェイコブス 東京</p>
      </div>

      <canvas ref={tc} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" style={{ touchAction: 'none' }} />

      {/* Top Left: Back Button */}
      <div className="hudin hud-tl absolute z-20">
        <button
          data-mag
          onClick={onBack}
          className="hud-pill flex items-center gap-2 hover:border-vermilion transition cursor-pointer text-paper"
        >
          ← BACK
        </button>
      </div>

      {/* Top Right: HUD */}
      <div className="hudin hud-tr absolute z-20 hud-pill text-right">
        <div className="flex items-center justify-end gap-3">
          <span>TOKYO JST {jst}</span>
          <button data-mag aria-label="toggle sound" onClick={() => setSound(Sound.toggle())} className="text-vermilion cursor-pointer p-2 -m-2">{sound ? <Volume2 size={14} /> : <VolumeX size={14} />}</button>
        </div>
        <div className="mt-1 opacity-80">35.6595° N, 139.7005° E<span className={'bars ' + (sound ? '' : 'off')}><i /><i /><i /><i /></span></div>
      </div>
      <p className="hudin hidden md:block absolute bottom-5 left-5 z-20 text-[.65rem] tracking-[.35em] font-display opacity-60">DRAG 360° TO ROTATE · REALTIME WEBGL</p>

      {/* Bottom Center: Colorway Selector Pills */}
      <div className="absolute bottom-safe left-1/2 -translate-x-1/2 z-20 flex gap-2 w-max max-w-[96vw] justify-center pointer-events-auto">
        {COLORWAYS.map((c, i) => (
          <button
            key={c.id}
            data-mag
            onClick={() => selectColorway(i)}
            aria-pressed={cwIdx === i}
            aria-label={c.name}
            className={`hud-pill flex items-center gap-2 text-[.65rem] transition cursor-pointer ${
              cwIdx === i
                ? '!bg-white !text-ink !border-white font-bold shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                : 'hover:border-vermilion'
            }`}
          >
            <span className="w-2 h-2 rounded-full border border-black/40" style={{ background: c.css }} />
            <span className={cwIdx === i ? '' : 'hidden sm:inline'}>{c.name}</span>
          </button>
        ))}
      </div>

      <aside className="sheet absolute z-20 w-[min(92vw,340px)] max-h-[58dvh] overflow-y-auto bg-ink/75 md:bg-ink/55 backdrop-blur-md md:backdrop-blur-xl border border-white/15 p-4 md:p-6 shadow-[6px_6px_0_#000] md:shadow-[10px_10px_0_#000]">
        <p className="spec font-display font-bold text-[.65rem] tracking-[.45em] text-vermilion m-0 mb-1">SPECIFICATIONS — 仕様</p>
        <div className="spec flex items-center justify-between gap-3 mb-2">
          <h3 className="font-mincho font-extrabold text-xl md:text-2xl m-0">The Tokyo Monolith Tote</h3>
          <button className="md:hidden hud-pill !px-3 !py-1 text-[.6rem]" aria-expanded={specsOpen} onClick={() => setSpecsOpen((v) => !v)}>{specsOpen ? '− SPECS' : '+ SPECS'}</button>
        </div>
        {specs.map(([Icon, k, v]) => (
          <div key={k} className={'spec spec-row' + (specsOpen ? '' : ' collapsed')}>
            <Icon size={16} className="text-vermilion shrink-0 mt-1" />
            <div><p className="m-0 text-[.62rem] tracking-[.35em] font-display opacity-60">{k}</p><p className="m-0 text-[.92rem] leading-snug">{v}</p></div>
          </div>
        ))}
        <div className="spec flex items-center justify-between pt-5">
          <span className="font-mincho font-bold text-xl">¥ 248,000</span>
          <button
            className="btn !py-2 !px-4 !text-[.7rem] cursor-pointer min-h-[44px]"
            data-mag
            onClick={() => {
              Sound.hit()
              setDrawerOpen(true)
            }}
          >
            [ ACQUIRE ]
          </button>
        </div>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col md:flex-row justify-end bg-black/80 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Reservation" onClick={() => setDrawerOpen(false)}>
          <div className="relative w-full max-w-md mx-auto md:mx-0 max-h-[88dvh] md:max-h-none md:h-full rounded-t-2xl md:rounded-none border-t md:border-t-0 md:border-l border-white/20 bg-[#0e0e12] p-6 md:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-paper flex flex-col justify-between overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div>
              <div className="flex items-center justify-between border-b border-white/15 pb-4 text-[10px] tracking-[0.3em] font-display">
                <span className="text-white/50">SHIBUYA FLAGSHIP CAPSULE</span>
                <button
                  data-mag
                  onClick={() => {
                    Sound.tick()
                    setDrawerOpen(false)
                  }}
                  className="text-white hover:text-vermilion font-bold text-sm tracking-wider cursor-pointer min-h-[44px] px-2"
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
                <div className="flex justify-between items-center"><span className="text-white/40">ALLOCATION</span><span className="text-vermilion font-bold">042 / 300 Reserved</span></div>
                <div className="flex justify-between items-center"><span className="text-white/40">PRICE</span><span className="font-bold">¥ 248,000 JPY</span></div>
              </div>

              <p className="mt-6 text-[11px] leading-relaxed text-white/60 font-display">
                Each piece is hand-finished in Tokyo with certified serial stamping and presented in the archival matte presentation case.
              </p>
            </div>

            <div className="mt-8 pt-4">
              <button
                data-mag
                onClick={() => {
                  Sound.hit()
                  setReserved(true)
                }}
                className="w-full border-2 border-vermilion bg-vermilion text-white py-4 text-xs font-bold font-display tracking-[0.35em] hover:bg-white hover:text-ink hover:border-white transition shadow-[0_0_30px_rgba(230,0,38,0.4)] cursor-pointer"
              >
                {reserved ? 'RESERVED · CODE MJ-TOKYO-042' : 'RSVP PRIVATE APPOINTMENT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

