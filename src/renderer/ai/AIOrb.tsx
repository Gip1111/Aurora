import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useAIStore } from '@/stores/ai'
import { useSessionStore } from '@/stores/session'

/**
 * Floating AI orb that lives on top of the desktop. Always visible (unless the
 * user disables it from Settings), draggable, and clickable to open the AI
 * overlay. Looks like a bubble of liquid Aurora glass with internal animated
 * gradient + a soft outer halo. Status colors:
 *   - ok  → vibrant Aurora gradient
 *   - down → dimmer red-tinted
 *   - streaming → faster pulse
 */
export function AIOrb(): JSX.Element | null {
  const aiHealth = useAIStore((s) => s.health)
  const aiStatus = useAIStore((s) => s.status)
  const toggleAI = useAIStore((s) => s.toggle)
  const enabled = useSessionStore((s) => s.settings.aiOrbEnabled)
  const orbX = useSessionStore((s) => s.settings.aiOrbX)
  const orbY = useSessionStore((s) => s.settings.aiOrbY)
  const setSetting = useSessionStore((s) => s.setSetting)

  const x = useMotionValue(orbX ?? -120)
  const y = useMotionValue(orbY ?? -120)
  const xs = useSpring(x, { stiffness: 280, damping: 28 })
  const ys = useSpring(y, { stiffness: 280, damping: 28 })

  const [hovered, setHovered] = useState(false)
  const dragRef = useRef<{
    startX: number
    startY: number
    pointerStartX: number
    pointerStartY: number
    moved: boolean
  } | null>(null)

  // First-run: park the orb in the bottom-right above the dock, but only
  // after we know the window size.
  useEffect(() => {
    if (orbX !== undefined && orbY !== undefined && orbX > -100 && orbY > -100) return
    const margin = 24
    const orbSize = 72
    const dockHeight = 100
    const initX = window.innerWidth - orbSize - margin
    const initY = window.innerHeight - orbSize - dockHeight - margin
    x.set(initX)
    y.set(initY)
    setSetting('aiOrbX', initX)
    setSetting('aiOrbY', initY)
  }, [orbX, orbY, setSetting, x, y])

  if (!enabled) return null

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: x.get(),
      startY: y.get(),
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      moved: false
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>): void => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.pointerStartX
    const dy = e.clientY - dragRef.current.pointerStartY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true
    const orbSize = 72
    const margin = 4
    const nx = clamp(dragRef.current.startX + dx, margin, window.innerWidth - orbSize - margin)
    const ny = clamp(
      dragRef.current.startY + dy,
      44 + margin, // below taskbar
      window.innerHeight - orbSize - margin
    )
    x.set(nx)
    y.set(ny)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>): void => {
    if (!dragRef.current) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    const moved = dragRef.current.moved
    dragRef.current = null
    if (moved) {
      // Persist new position; snap to nearest screen edge if close
      const orbSize = 72
      let finalX = x.get()
      const finalY = y.get()
      const SNAP = 60
      if (finalX < SNAP) finalX = 12
      else if (finalX > window.innerWidth - orbSize - SNAP)
        finalX = window.innerWidth - orbSize - 12
      x.set(finalX)
      setSetting('aiOrbX', finalX)
      setSetting('aiOrbY', finalY)
    } else {
      // Treated as a click → open AI
      toggleAI()
    }
  }

  const isStreaming = aiStatus === 'streaming'
  const isDown = aiHealth === 'down'

  return (
    <motion.button
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      title="Chiedimi qualunque cosa"
      style={
        {
          position: 'fixed',
          x: xs,
          y: ys,
          width: 72,
          height: 72,
          zIndex: 1500,
          borderRadius: '50%',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          background: 'transparent',
          WebkitAppRegion: 'no-drag'
        } as unknown as React.CSSProperties
      }
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
    >
      {/* Outer halo */}
      <motion.div
        animate={{
          opacity: isDown ? 0.25 : hovered ? 0.9 : 0.55,
          scale: isStreaming ? [1, 1.4, 1] : hovered ? 1.25 : 1.1
        }}
        transition={{
          opacity: { duration: 0.3 },
          scale: isStreaming
            ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.4 }
        }}
        style={{
          position: 'absolute',
          inset: -24,
          borderRadius: '50%',
          background: isDown
            ? 'radial-gradient(circle, rgba(255,120,120,0.35), transparent 70%)'
            : 'radial-gradient(circle, rgba(176,124,255,0.55), rgba(79,214,255,0.30) 40%, transparent 70%)',
          filter: 'blur(12px)',
          pointerEvents: 'none'
        }}
      />

      {/* Orb body — animated conic-style gradient via two layered radials */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          overflow: 'hidden',
          background: isDown
            ? 'linear-gradient(135deg, #5a2030, #3a1525)'
            : 'linear-gradient(135deg, #b07cff, #4fd6ff)',
          boxShadow: isDown
            ? '0 8px 28px rgba(255,80,100,0.30), inset 0 2px 8px rgba(255,255,255,0.20), inset 0 -8px 16px rgba(0,0,0,0.35)'
            : '0 8px 28px rgba(176,124,255,0.55), 0 0 24px rgba(79,214,255,0.35), inset 0 2px 8px rgba(255,255,255,0.30), inset 0 -8px 16px rgba(0,0,0,0.25)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
      >
        {/* Liquid swirl */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: isStreaming ? 4 : 12, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: -10,
            background:
              'conic-gradient(from 0deg, rgba(255,108,196,0.55), rgba(176,124,255,0.55), rgba(79,214,255,0.55), rgba(106,255,177,0.55), rgba(255,108,196,0.55))',
            opacity: isDown ? 0.15 : 0.55,
            mixBlendMode: 'overlay'
          }}
        />
        {/* Glossy highlight */}
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 12,
            width: 28,
            height: 16,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.55)',
            filter: 'blur(4px)',
            pointerEvents: 'none'
          }}
        />
        {/* Bottom shadow for depth */}
        <div
          style={{
            position: 'absolute',
            bottom: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 48,
            height: 8,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.4)',
            filter: 'blur(6px)',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Sparkle icon */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 30,
          height: 30,
          filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.45))',
          pointerEvents: 'none'
        }}
      >
        <path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z" fill="white" />
        <path d="M19 14l.7 1.7L21 16.5l-1.3.8L19 19l-.7-1.7L17 16.5l1.3-.8L19 14z" fill="white" />
        <path d="M5 17l.5 1.2L7 18.7l-1.5.5L5 21l-.5-1.8L3 18.7l1.5-.5L5 17z" fill="white" />
      </svg>

      {/* Ollama down badge */}
      {isDown && (
        <div
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#ff5060',
            border: '2px solid var(--bg-base)',
            color: 'white',
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}
          title="Assistente AI offline"
        >
          !
        </div>
      )}
    </motion.button>
  )
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}
