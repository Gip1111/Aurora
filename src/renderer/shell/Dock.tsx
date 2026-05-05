import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { APPS } from '@/stores/apps'
import { useWindowsStore } from '@/stores/windows'
import { LayoutGrid, MessageCircle } from 'lucide-react'
import { useShellStore } from '@/stores/shell'
import { useAIStore } from '@/stores/ai'
import { useSessionStore } from '@/stores/session'

const ICON_SIZE = 56
const MAGNIFY_RANGE = 120

export function Dock(): JSX.Element {
  const open = useWindowsStore((s) => s.open)
  const focus = useWindowsStore((s) => s.focus)
  const windows = useWindowsStore((s) => s.windows)
  const setLauncher = useShellStore((s) => s.setLauncherOpen)
  const toggleAI = useAIStore((s) => s.toggle)
  const uiScale = useSessionStore((s) => s.settings.uiScale)
  const [mouseX, setMouseX] = useState<number | null>(null)
  const dockApps = APPS.filter((a) => a.inDock)
  const showLabels = uiScale >= 1.15

  const handleClick = (appId: (typeof APPS)[number]['id']): void => {
    const existing = windows.find((w) => w.appId === appId)
    if (existing) focus(existing.id)
    else open(appId)
  }

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 28 }}
      style={{
        position: 'fixed',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        padding: '10px 14px',
        background: 'var(--bg-elev-2)',
        backdropFilter: 'blur(40px) saturate(160%)',
        WebkitBackdropFilter: 'blur(40px) saturate(160%)',
        border: '1px solid var(--border-glass-strong)',
        borderRadius: 22,
        boxShadow: '0 12px 48px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.10)'
      }}
      onMouseMove={(e) => setMouseX(e.clientX)}
      onMouseLeave={() => setMouseX(null)}
    >
      <DockIconBtn
        mouseX={mouseX}
        onClick={toggleAI}
        title="Chiedimi"
        showLabel={showLabels}
        background="var(--gradient-aurora)"
        glow
      >
        <MessageCircle size={26} color="#0b0b14" strokeWidth={2.4} />
      </DockIconBtn>
      <DockIconBtn
        mouseX={mouseX}
        onClick={() => setLauncher(true)}
        title="App"
        showLabel={showLabels}
        background="linear-gradient(135deg, #4fd6ff 0%, #6affb1 100%)"
      >
        <LayoutGrid size={24} color="white" strokeWidth={2.2} />
      </DockIconBtn>
      <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border-glass)' }} />
      {dockApps.map((app) => {
        const Icon = app.icon
        const running = windows.some((w) => w.appId === app.id)
        return (
          <DockIconBtn
            key={app.id}
            mouseX={mouseX}
            running={running}
            onClick={() => handleClick(app.id)}
            title={app.name}
            showLabel={showLabels}
            background={app.gradient}
          >
            <Icon size={24} color="white" />
          </DockIconBtn>
        )
      })}
    </motion.div>
  )
}

interface DockIconBtnProps {
  mouseX: number | null
  running?: boolean
  onClick: () => void
  title: string
  showLabel: boolean
  background: string
  glow?: boolean
  children: React.ReactNode
}

function DockIconBtn({
  mouseX,
  running,
  onClick,
  title,
  showLabel,
  background,
  glow,
  children
}: DockIconBtnProps): JSX.Element {
  const btnRef = useRef<HTMLButtonElement>(null)
  let scale = 1
  if (mouseX !== null && btnRef.current) {
    const rect = btnRef.current.getBoundingClientRect()
    const center = rect.left + rect.width / 2
    const dist = Math.abs(mouseX - center)
    if (dist < MAGNIFY_RANGE) {
      const t = 1 - dist / MAGNIFY_RANGE
      scale = 1 + t * t * 0.4
    }
  }
  return (
    <button
      ref={btnRef}
      onClick={onClick}
      title={title}
      style={{
        position: 'relative',
        width: ICON_SIZE,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer'
      }}
    >
      <motion.div
        animate={{ scale, y: scale > 1 ? -((scale - 1) * 12) : 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 30, mass: 0.5 }}
        style={{
          width: ICON_SIZE,
          height: ICON_SIZE,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background,
          boxShadow: glow
            ? '0 6px 20px rgba(176, 124, 255, 0.45), 0 0 24px rgba(79, 214, 255, 0.25), inset 0 1px 0 rgba(255,255,255,0.20)'
            : '0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.20)',
          border: '1px solid rgba(255,255,255,0.10)'
        }}
      >
        {children}
      </motion.div>
      {showLabel && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            fontWeight: 500,
            maxWidth: 80,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {title}
        </span>
      )}
      {running && (
        <span
          style={{
            position: 'absolute',
            bottom: showLabel ? -2 : -4,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'var(--accent-2)',
            boxShadow: '0 0 6px var(--accent-2)'
          }}
        />
      )}
    </button>
  )
}
