import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

export type SnapZone = 'left' | 'right' | 'top' | null

interface SnapHintEvent {
  zone: SnapZone
  taskbarHeight: number
  dockHeight: number
}

const SNAP_EVENT = 'aurora:snap-hint'

/** Helper used by Window.tsx during drag to broadcast the hovered snap zone. */
export function broadcastSnapZone(zone: SnapZone, taskbarHeight = 44, dockHeight = 88): void {
  window.dispatchEvent(
    new CustomEvent<SnapHintEvent>(SNAP_EVENT, {
      detail: { zone, taskbarHeight, dockHeight }
    })
  )
}

/**
 * Full-screen overlay that paints a translucent rectangle over the area where
 * the dragged window will snap on release.
 */
export function SnapHint(): JSX.Element {
  const [hint, setHint] = useState<SnapHintEvent | null>(null)

  useEffect(() => {
    const onHint = (e: Event): void => {
      const ev = e as CustomEvent<SnapHintEvent>
      setHint(ev.detail.zone ? ev.detail : null)
    }
    window.addEventListener(SNAP_EVENT, onHint as EventListener)
    return () => window.removeEventListener(SNAP_EVENT, onHint as EventListener)
  }, [])

  return (
    <AnimatePresence>
      {hint && hint.zone && (
        <motion.div
          key={hint.zone}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          style={{
            position: 'fixed',
            zIndex: 999,
            background: 'linear-gradient(135deg, rgba(176, 124, 255, 0.22), rgba(79, 214, 255, 0.22))',
            border: '2px solid rgba(176, 124, 255, 0.55)',
            borderRadius: 14,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            pointerEvents: 'none',
            ...zoneRect(hint)
          }}
        />
      )}
    </AnimatePresence>
  )
}

function zoneRect(h: SnapHintEvent): React.CSSProperties {
  const { taskbarHeight, dockHeight } = h
  const top = taskbarHeight + 6
  const bottom = dockHeight + 6
  const halfW = `calc(50vw - 12px)`
  const fullW = `calc(100vw - 12px)`
  const fullH = `calc(100vh - ${top + bottom}px)`
  switch (h.zone) {
    case 'left':
      return { left: 6, top, width: halfW, height: fullH }
    case 'right':
      return { right: 6, top, width: halfW, height: fullH }
    case 'top':
      return { left: 6, top, width: fullW, height: fullH }
    default:
      return {}
  }
}
