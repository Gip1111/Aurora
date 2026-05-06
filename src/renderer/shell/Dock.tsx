import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { APPS } from '@/stores/apps'
import { useWindowsStore } from '@/stores/windows'
import {
  Sparkles,
  ArrowUp,
  Clock,
  TrendingUp,
  FolderOpen,
  StickyNote,
  Zap
} from 'lucide-react'
import { useAIStore } from '@/stores/ai'
import { useSessionStore } from '@/stores/session'
import { useAIAgent } from '@/ai/useAIAgent'

const ICON_SIZE = 48

/**
 * "Aurora Bar" — the new innovative dock.
 *
 * Three states:
 *  1. **Idle**: shows a row of app icons + a compact "Chiedimi" pill input.
 *  2. **Hover/typing the input**: the bar grows upward to show AI quick
 *     suggestions (recent files, popular actions, "type to ask…").
 *  3. **AI sending**: the input is replaced by a status pill while the AI
 *     orchestrator processes; result appears as a notification.
 *
 * No DesktopHub, no taskbar duplication: this IS the place where the user
 * starts every action. Inline, contextual, never blocks the desktop.
 */
export function Dock(): JSX.Element {
  const open = useWindowsStore((s) => s.open)
  const focus = useWindowsStore((s) => s.focus)
  const windows = useWindowsStore((s) => s.windows)
  const aiHealth = useAIStore((s) => s.health)
  const aiStatus = useAIStore((s) => s.status)
  const setAIOpen = useAIStore((s) => s.setOpen)
  const uiScale = useSessionStore((s) => s.settings.uiScale)
  const showLabels = uiScale >= 1.15

  const dockApps = APPS.filter((a) => a.inDock)
  const [inputValue, setInputValue] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { send } = useAIAgent()

  // Listen for the global Ctrl+/ shortcut to focus the inline AI input
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleClick = (appId: (typeof APPS)[number]['id']): void => {
    const existing = windows.find((w) => w.appId === appId)
    if (existing) focus(existing.id)
    else open(appId)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const q = inputValue.trim()
    if (!q) return
    setInputValue('')
    setInputFocused(false)
    inputRef.current?.blur()
    setAIOpen(true)
    await send(q)
  }

  const expanded = inputFocused || hovered

  return (
    <>
      {/* Suggestion popover above the bar when input focused */}
      <AnimatePresence>
        {inputFocused && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{
              position: 'fixed',
              bottom: 92,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1001,
              minWidth: 540,
              maxWidth: 700,
              padding: 14,
              background: 'rgba(20, 20, 35, 0.92)',
              backdropFilter: 'blur(40px) saturate(160%)',
              WebkitBackdropFilter: 'blur(40px) saturate(160%)',
              border: '1px solid rgba(176, 124, 255, 0.30)',
              borderRadius: 18,
              boxShadow: '0 24px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)',
              color: 'var(--text-primary)'
            }}
            // Prevent blur when clicking inside
            onMouseDown={(e) => e.preventDefault()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: 'var(--accent-1)',
                marginBottom: 12,
                paddingLeft: 4
              }}
            >
              <Sparkles size={12} /> Suggerimenti
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => {
                    setInputValue(s.text)
                    inputRef.current?.focus()
                  }}
                  style={suggestionStyle}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(176,124,255,0.15)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <span style={{ color: s.color, flexShrink: 0 }}>
                    <s.icon size={15} />
                  </span>
                  <span style={{ flex: 1 }}>{s.text}</span>
                  <ArrowUp size={12} style={{ opacity: 0.5, transform: 'rotate(45deg)' }} />
                </button>
              ))}
            </div>
            <div
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTop: '1px solid rgba(255,255,255,0.08)',
                fontSize: 11,
                color: 'var(--text-muted)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>
                <kbd style={kbdStyle}>↵</kbd> per inviare •{' '}
                <kbd style={kbdStyle}>Ctrl</kbd>+<kbd style={kbdStyle}>/</kbd> per qui
              </span>
              <span style={{ color: aiHealth === 'ok' ? '#6affb1' : '#ff9090' }}>
                ● {aiHealth === 'ok' ? 'AI online' : 'AI offline'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 28, delay: 0.1 }}
        style={{
          position: 'fixed',
          bottom: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 10px',
          background: 'rgba(15, 15, 25, 0.72)',
          backdropFilter: 'blur(48px) saturate(180%)',
          WebkitBackdropFilter: 'blur(48px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          borderRadius: 26,
          boxShadow:
            '0 16px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(176,124,255,0.10) inset, 0 1px 0 rgba(255,255,255,0.10) inset'
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* App icons */}
        {dockApps.map((app) => {
          const Icon = app.icon
          const running = windows.some((w) => w.appId === app.id)
          return (
            <DockIconBtn
              key={app.id}
              running={running}
              onClick={() => handleClick(app.id)}
              title={app.name}
              showLabel={showLabels && expanded}
              background={app.gradient}
            >
              <Icon size={22} color="white" strokeWidth={2.1} />
            </DockIconBtn>
          )
        })}

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: ICON_SIZE - 16,
            background: 'rgba(255,255,255,0.12)',
            margin: '0 4px'
          }}
        />

        {/* Inline AI input pill — the heart of Aurora Bar */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center' }}>
          <motion.div
            animate={{
              width: inputFocused ? 360 : expanded ? 240 : 180,
              borderColor: inputFocused
                ? 'rgba(176,124,255,0.55)'
                : 'rgba(255,255,255,0.10)'
            }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: ICON_SIZE,
              padding: '0 6px 0 14px',
              background: inputFocused
                ? 'rgba(176,124,255,0.10)'
                : 'rgba(255,255,255,0.06)',
              border: '1px solid',
              borderRadius: 22,
              overflow: 'hidden'
            }}
          >
            <motion.div
              animate={{
                rotate: aiStatus === 'streaming' ? 360 : 0,
                scale: inputFocused ? 1.1 : 1
              }}
              transition={
                aiStatus === 'streaming'
                  ? { duration: 1.5, repeat: Infinity, ease: 'linear' }
                  : { type: 'spring', stiffness: 500, damping: 30 }
              }
              style={{ flexShrink: 0, color: 'var(--accent-1)' }}
            >
              <Sparkles size={18} />
            </motion.div>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setTimeout(() => setInputFocused(false), 150)}
              placeholder={aiStatus === 'streaming' ? 'Sto pensando…' : 'Chiedimi qualunque cosa…'}
              disabled={aiStatus === 'streaming'}
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'white',
                fontSize: 14,
                fontFamily: 'inherit'
              }}
            />
            <AnimatePresence>
              {inputValue.trim() && (
                <motion.button
                  type="submit"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  style={{
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    border: 'none',
                    background: 'var(--gradient-aurora)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0b0b14'
                  }}
                  title="Invia"
                >
                  <ArrowUp size={16} strokeWidth={2.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </form>
      </motion.div>
    </>
  )
}

interface DockIconBtnProps {
  running?: boolean
  onClick: () => void
  title: string
  showLabel: boolean
  background: string
  children: React.ReactNode
}

function DockIconBtn({
  running,
  onClick,
  title,
  showLabel,
  background,
  children
}: DockIconBtnProps): JSX.Element {
  const [hover, setHover] = useState(false)
  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      whileTap={{ scale: 0.92 }}
      title={title}
      style={{
        position: 'relative',
        width: ICON_SIZE,
        height: ICON_SIZE,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <motion.div
        animate={{
          scale: hover ? 1.1 : 1,
          y: hover ? -3 : 0
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
        style={{
          width: ICON_SIZE - 8,
          height: ICON_SIZE - 8,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background,
          boxShadow: hover
            ? '0 8px 22px rgba(0,0,0,0.45), 0 0 18px rgba(176,124,255,0.25), inset 0 1px 0 rgba(255,255,255,0.25)'
            : '0 4px 12px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.18)',
          border: '1px solid rgba(255,255,255,0.10)'
        }}
      >
        {children}
      </motion.div>
      {/* Running dot */}
      {running && (
        <motion.span
          layout
          style={{
            position: 'absolute',
            bottom: 2,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 5,
            height: 5,
            borderRadius: 3,
            background: 'var(--accent-2)',
            boxShadow: '0 0 8px var(--accent-2)'
          }}
        />
      )}
      {/* Tooltip on hover */}
      <AnimatePresence>
        {hover && showLabel && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              bottom: ICON_SIZE + 8,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '6px 12px',
              background: 'rgba(20, 20, 35, 0.95)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              color: 'white',
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}
          >
            {title}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

interface Suggestion {
  text: string
  icon: typeof Clock
  color: string
}

const SUGGESTIONS: Suggestion[] = [
  { text: 'Apri WhatsApp', icon: Zap, color: '#25d366' },
  { text: 'Mostrami le foto di oggi', icon: Clock, color: '#ff6cc4' },
  { text: 'Apri i miei documenti', icon: FolderOpen, color: '#4fd6ff' },
  { text: 'Scrivi una nota della spesa', icon: StickyNote, color: '#ffd86c' },
  { text: 'Cosa puoi fare per me?', icon: TrendingUp, color: '#b07cff' }
]

const suggestionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 14px',
  background: 'transparent',
  border: 'none',
  borderRadius: 10,
  color: 'var(--text-primary)',
  fontSize: 14,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
  width: '100%',
  transition: 'background 0.15s'
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 6px',
  background: 'rgba(255,255,255,0.10)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 4,
  fontFamily: 'monospace',
  fontSize: 10,
  margin: '0 2px'
}
