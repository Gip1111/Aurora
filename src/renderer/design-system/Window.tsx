import { motion } from 'framer-motion'
import { useRef, type ReactNode } from 'react'
import { useWindowsStore, type WindowState } from '@/stores/windows'
import { spring, windowOpen } from './motion'
import { X, Square, Minus } from 'lucide-react'
import { broadcastSnapZone, type SnapZone } from '@/shell/SnapHint'

interface WindowProps {
  win: WindowState
  children: ReactNode
}

const TASKBAR_HEIGHT = 44
const DOCK_HEIGHT = 88
const SNAP_EDGE = 12

export function Window({ win, children }: WindowProps): JSX.Element {
  const focus = useWindowsStore((s) => s.focus)
  const move = useWindowsStore((s) => s.move)
  const resize = useWindowsStore((s) => s.resize)
  const close = useWindowsStore((s) => s.close)
  const minimize = useWindowsStore((s) => s.minimize)
  const toggleMaximize = useWindowsStore((s) => s.toggleMaximize)

  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const resizeRef = useRef<{
    edge: string
    x: number
    y: number
    ox: number
    oy: number
    w: number
    h: number
  } | null>(null)

  const onTitleMouseDown = (e: React.MouseEvent): void => {
    if (win.maximized) return
    focus(win.id)
    dragRef.current = { x: e.clientX, y: e.clientY, ox: win.x, oy: win.y }
    let lastZone: SnapZone = null
    const onMove = (ev: MouseEvent): void => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.x
      const dy = ev.clientY - dragRef.current.y
      const newY = Math.max(TASKBAR_HEIGHT, dragRef.current.oy + dy)
      const newX = dragRef.current.ox + dx
      move(win.id, newX, newY)

      // Compute snap zone based on cursor position
      let zone: SnapZone = null
      if (ev.clientY <= TASKBAR_HEIGHT + SNAP_EDGE) zone = 'top'
      else if (ev.clientX <= SNAP_EDGE) zone = 'left'
      else if (ev.clientX >= window.innerWidth - SNAP_EDGE) zone = 'right'
      if (zone !== lastZone) {
        lastZone = zone
        broadcastSnapZone(zone, TASKBAR_HEIGHT, DOCK_HEIGHT)
      }
    }
    const onUp = (): void => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      // Apply snap if any
      if (lastZone) {
        const screenW = window.innerWidth
        const screenH = window.innerHeight - TASKBAR_HEIGHT - DOCK_HEIGHT
        if (lastZone === 'top') {
          if (!win.maximized) toggleMaximize(win.id)
        } else if (lastZone === 'left') {
          move(win.id, 0, TASKBAR_HEIGHT)
          resize(win.id, Math.floor(screenW / 2), screenH)
        } else if (lastZone === 'right') {
          move(win.id, Math.floor(screenW / 2), TASKBAR_HEIGHT)
          resize(win.id, Math.floor(screenW / 2), screenH)
        }
      }
      broadcastSnapZone(null, TASKBAR_HEIGHT, DOCK_HEIGHT)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const onResizeStart = (edge: string) => (e: React.MouseEvent) => {
    if (win.maximized) return
    e.stopPropagation()
    focus(win.id)
    resizeRef.current = {
      edge,
      x: e.clientX,
      y: e.clientY,
      ox: win.x,
      oy: win.y,
      w: win.width,
      h: win.height
    }
    const onMove = (ev: MouseEvent): void => {
      if (!resizeRef.current) return
      const r = resizeRef.current
      const dx = ev.clientX - r.x
      const dy = ev.clientY - r.y
      let nx = r.ox
      let ny = r.oy
      let nw = r.w
      let nh = r.h
      if (edge.includes('e')) nw = Math.max(360, r.w + dx)
      if (edge.includes('w')) {
        nw = Math.max(360, r.w - dx)
        nx = r.ox + (r.w - nw)
      }
      if (edge.includes('s')) nh = Math.max(240, r.h + dy)
      if (edge.includes('n')) {
        nh = Math.max(240, r.h - dy)
        ny = Math.max(TASKBAR_HEIGHT, r.oy + (r.h - nh))
      }
      move(win.id, nx, ny)
      resize(win.id, nw, nh)
    }
    const onUp = (): void => {
      resizeRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const winStyle: React.CSSProperties = win.maximized
    ? {
        left: 0,
        top: TASKBAR_HEIGHT,
        width: '100vw',
        height: `calc(100vh - ${TASKBAR_HEIGHT + DOCK_HEIGHT}px)`,
        borderRadius: 0
      }
    : {
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        borderRadius: 14
      }

  return (
    <motion.div
      {...windowOpen}
      transition={spring}
      style={{
        position: 'absolute',
        zIndex: win.z,
        background: 'var(--bg-elev-2)',
        backdropFilter: 'blur(40px) saturate(150%)',
        WebkitBackdropFilter: 'blur(40px) saturate(150%)',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--shadow-window)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...winStyle
      }}
      onMouseDown={() => focus(win.id)}
    >
      <div
        onMouseDown={onTitleMouseDown}
        onDoubleClick={() => toggleMaximize(win.id)}
        style={{
          height: 38,
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          gap: 8,
          borderBottom: '1px solid var(--border-glass)',
          cursor: win.maximized ? 'default' : 'move',
          userSelect: 'none',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', gap: 8, marginRight: 8 }}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              close(win.id)
            }}
            style={{
              ...trafficStyle,
              background: '#ff5f57',
              boxShadow: '0 0 8px rgba(255,95,87,0.5)'
            }}
            title="Chiudi"
          >
            <X size={8} strokeWidth={3} style={{ opacity: 0.6 }} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              minimize(win.id)
            }}
            style={{
              ...trafficStyle,
              background: '#febc2e',
              boxShadow: '0 0 8px rgba(254,188,46,0.5)'
            }}
            title="Riduci"
          >
            <Minus size={8} strokeWidth={3} style={{ opacity: 0.6 }} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleMaximize(win.id)
            }}
            style={{
              ...trafficStyle,
              background: '#28c840',
              boxShadow: '0 0 8px rgba(40,200,64,0.5)'
            }}
            title="Massimizza"
          >
            <Square size={6} strokeWidth={3} style={{ opacity: 0.6 }} />
          </button>
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            letterSpacing: 0.2
          }}
        >
          {win.title}
        </span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>{children}</div>

      {!win.maximized && (
        <>
          <div style={{ ...edgeStyle, top: 0, left: 6, right: 6, height: 4, cursor: 'ns-resize' }} onMouseDown={onResizeStart('n')} />
          <div style={{ ...edgeStyle, bottom: 0, left: 6, right: 6, height: 4, cursor: 'ns-resize' }} onMouseDown={onResizeStart('s')} />
          <div style={{ ...edgeStyle, top: 6, bottom: 6, left: 0, width: 4, cursor: 'ew-resize' }} onMouseDown={onResizeStart('w')} />
          <div style={{ ...edgeStyle, top: 6, bottom: 6, right: 0, width: 4, cursor: 'ew-resize' }} onMouseDown={onResizeStart('e')} />
          <div style={{ ...cornerStyle, top: 0, left: 0, cursor: 'nwse-resize' }} onMouseDown={onResizeStart('nw')} />
          <div style={{ ...cornerStyle, top: 0, right: 0, cursor: 'nesw-resize' }} onMouseDown={onResizeStart('ne')} />
          <div style={{ ...cornerStyle, bottom: 0, left: 0, cursor: 'nesw-resize' }} onMouseDown={onResizeStart('sw')} />
          <div style={{ ...cornerStyle, bottom: 0, right: 0, cursor: 'nwse-resize' }} onMouseDown={onResizeStart('se')} />
        </>
      )}
    </motion.div>
  )
}

const trafficStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  color: 'rgba(0,0,0,0.5)'
}

const edgeStyle: React.CSSProperties = { position: 'absolute' }
const cornerStyle: React.CSSProperties = { position: 'absolute', width: 10, height: 10 }
