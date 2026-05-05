import { useEffect, useRef } from 'react'
import { useSessionStore } from '@/stores/session'

/**
 * Animated aurora wallpaper rendered to a canvas. Three radial blobs with
 * slow Lissajous motion and a sutile noise texture. CPU-cheap and beautiful.
 */
export function Wallpaper(): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduceMotion = useSessionStore((s) => s.settings.reduceMotion)
  const theme = useSessionStore((s) => s.settings.theme)
  const wallpaperImage = useSessionStore((s) => s.settings.wallpaperImage)

  // If user picked a custom image, render it as a static layer below the
  // animated aurora canvas (which we keep at lower opacity so glow still shows).
  if (wallpaperImage) {
    return (
      <>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            backgroundImage: `url("${wallpaperImage}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        {/* Subtle Aurora overlay so the desktop still feels alive */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.32) 100%)',
            pointerEvents: 'none'
          }}
        />
      </>
    )
  }

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let t0 = performance.now()

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const colors =
      theme === 'aurora-light'
        ? [
            ['#c8a8ff', '#fde6ff'],
            ['#b6efff', '#e9f9ff'],
            ['#ffc8e0', '#ffe9f3']
          ]
        : [
            ['#b07cff', '#3a1d80'],
            ['#4fd6ff', '#0a3a55'],
            ['#ff6cc4', '#5a164a']
          ]

    const blob = (
      x: number,
      y: number,
      r: number,
      [c1, c2]: [string, string]
    ): void => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, c1)
      g.addColorStop(1, c2 + '00')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    const draw = (): void => {
      const t = (performance.now() - t0) / 1000
      const w = window.innerWidth
      const h = window.innerHeight

      // base
      ctx.fillStyle = theme === 'aurora-light' ? '#f3f0ff' : '#07070d'
      ctx.fillRect(0, 0, w, h)

      ctx.globalCompositeOperation = 'lighter'
      const speed = reduceMotion ? 0 : 1
      const cx = w * 0.3 + Math.sin(t * 0.18 * speed) * w * 0.15
      const cy = h * 0.35 + Math.cos(t * 0.13 * speed) * h * 0.18
      blob(cx, cy, Math.max(w, h) * 0.55, colors[0] as [string, string])

      const cx2 = w * 0.75 + Math.cos(t * 0.21 * speed) * w * 0.12
      const cy2 = h * 0.7 + Math.sin(t * 0.16 * speed) * h * 0.15
      blob(cx2, cy2, Math.max(w, h) * 0.5, colors[1] as [string, string])

      const cx3 = w * 0.5 + Math.sin(t * 0.11 * speed + 1.2) * w * 0.2
      const cy3 = h * 0.5 + Math.cos(t * 0.19 * speed + 0.4) * h * 0.2
      blob(cx3, cy3, Math.max(w, h) * 0.4, colors[2] as [string, string])

      ctx.globalCompositeOperation = 'source-over'

      // subtle vignette
      const vg = ctx.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.4,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.8
      )
      vg.addColorStop(0, 'rgba(0,0,0,0)')
      vg.addColorStop(1, theme === 'aurora-light' ? 'rgba(255,255,255,0.0)' : 'rgba(0,0,0,0.55)')
      ctx.fillStyle = vg
      ctx.fillRect(0, 0, w, h)

      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [reduceMotion, theme])

  return <canvas ref={ref} className="wallpaper-canvas" />
}
