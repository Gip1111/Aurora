import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSessionStore } from '@/stores/session'
import { useNotificationsStore } from '@/stores/notifications'
import { useAIStore } from '@/stores/ai'
import { useShellStore } from '@/stores/shell'
import { useWindowsStore } from '@/stores/windows'
import { APP_BY_ID } from '@/stores/apps'
import { Bell, Settings2, Battery, Wifi, Volume2, X } from 'lucide-react'

/**
 * "Aurora Taskbar" — minimal floating glass strip at the very top.
 *
 * Three clustered pills (iOS Dynamic-Island vibe):
 *  • Left: Aurora logo + greeting + clock
 *  • Center: live mini-thumbnails of open windows (click to focus, X to close)
 *  • Right: system pill (battery + wifi + volume) + notifications + user
 *
 * No "Chiedimi" button here anymore — that lives in the Dock at the bottom
 * (Aurora Bar). This top strip is purely status/navigation.
 */
export function Taskbar(): JSX.Element {
  const [now, setNow] = useState(new Date())
  const user = useSessionStore((s) => s.user)
  const notifOpen = useNotificationsStore((s) => s.open)
  const setNotifOpen = useNotificationsStore((s) => s.setOpen)
  const unread = useNotificationsStore((s) => s.toasts.filter((t) => !t.read).length)
  const aiHealth = useAIStore((s) => s.health)
  const setQuickSettings = useShellStore((s) => s.setQuickSettingsOpen)
  const quickSettingsOpen = useShellStore((s) => s.quickSettingsOpen)
  const setOverview = useShellStore((s) => s.setOverviewOpen)
  const windows = useWindowsStore((s) => s.windows)
  const focus = useWindowsStore((s) => s.focus)
  const close = useWindowsStore((s) => s.close)

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(i)
  }, [])

  const greeting = getGreeting(now.getHours())
  const time = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <div
      className="app-drag"
      style={{
        position: 'fixed',
        top: 10,
        left: 12,
        right: 12,
        height: 44,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        pointerEvents: 'none' // each pill enables its own
      }}
    >
      {/* LEFT pill — logo + greeting + clock */}
      <motion.div
        className="app-no-drag"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        style={pillStyle}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 7,
            background: 'var(--gradient-aurora)',
            boxShadow:
              aiHealth === 'ok'
                ? '0 0 12px rgba(176,124,255,0.7), 0 0 24px rgba(79,214,255,0.35)'
                : '0 0 6px rgba(176,124,255,0.3)',
            flexShrink: 0,
            transition: 'box-shadow 0.4s ease'
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'white',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {time}
          </span>
          <span
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.55)',
              textTransform: 'capitalize',
              marginTop: 1
            }}
          >
            {greeting} • {date}
          </span>
        </div>
      </motion.div>

      {/* CENTER pill — open windows (mini-thumbnails) */}
      <motion.div
        className="app-no-drag"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.05 }}
        style={{
          ...pillStyle,
          maxWidth: 'min(50vw, 600px)',
          padding: windows.length === 0 ? '6px 14px' : '4px 6px',
          minHeight: 36
        }}
      >
        {windows.length === 0 ? (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            Nessuna finestra aperta
          </span>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                gap: 4,
                alignItems: 'center'
              }}
            >
              {windows.slice(0, 6).map((w) => {
                const meta = APP_BY_ID.get(w.appId)
                const Icon = meta?.icon
                return (
                  <WindowChip
                    key={w.id}
                    icon={
                      Icon ? <Icon size={14} color="white" strokeWidth={2.2} /> : null
                    }
                    title={w.title}
                    background={meta?.gradient ?? 'var(--gradient-aurora)'}
                    minimized={w.minimized}
                    onClick={() => focus(w.id)}
                    onClose={() => close(w.id)}
                  />
                )
              })}
            </div>
            {windows.length > 6 && (
              <button
                onClick={() => setOverview(true)}
                style={{
                  marginLeft: 4,
                  padding: '4px 10px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                +{windows.length - 6}
              </button>
            )}
          </>
        )}
      </motion.div>

      {/* RIGHT pill — system status + notifications + user */}
      <motion.div
        className="app-no-drag"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.1 }}
        style={{ ...pillStyle, gap: 4 }}
      >
        <SysStatusButton onClick={() => setQuickSettings(!quickSettingsOpen)} active={quickSettingsOpen} />

        <button
          style={{
            ...iconBtn,
            position: 'relative',
            background: notifOpen ? 'rgba(255,255,255,0.12)' : 'transparent'
          }}
          title="Notifiche"
          onClick={() => setNotifOpen(!notifOpen)}
        >
          <Bell size={15} color="white" />
          {unread > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 5,
                right: 5,
                minWidth: 14,
                height: 14,
                padding: '0 4px',
                borderRadius: 7,
                background: 'var(--accent-3)',
                color: 'white',
                fontSize: 9,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 8px var(--accent-3)'
              }}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {user && (
          <button
            title={user.name}
            style={{
              marginLeft: 4,
              width: 28,
              height: 28,
              borderRadius: 14,
              background: 'var(--gradient-aurora)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 600,
              color: '#0b0b14',
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
          >
            {user.avatar || user.name.slice(0, 1).toUpperCase()}
          </button>
        )}
      </motion.div>
    </div>
  )
}

function WindowChip({
  icon,
  title,
  background,
  minimized,
  onClick,
  onClose
}: {
  icon: React.ReactNode
  title: string
  background: string
  minimized: boolean
  onClick: () => void
  onClose: () => void
}): JSX.Element {
  const [hover, setHover] = useState(false)
  return (
    <motion.div
      layout
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      title={title}
      style={{
        position: 'relative',
        height: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: hover ? '0 8px 0 4px' : '0 4px',
        background: minimized ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 10,
        cursor: 'pointer',
        opacity: minimized ? 0.6 : 1,
        transition: 'padding 0.15s ease, background 0.15s ease'
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        {icon}
      </div>
      <AnimatePresence>
        {hover && (
          <motion.span
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            style={{
              fontSize: 12,
              color: 'white',
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 500
            }}
          >
            {title}
          </motion.span>
        )}
      </AnimatePresence>
      {hover && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            background: 'rgba(255,90,90,0.6)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0
          }}
          title="Chiudi"
        >
          <X size={9} color="white" strokeWidth={3} />
        </button>
      )}
    </motion.div>
  )
}

function SysStatusButton({
  onClick,
  active
}: {
  onClick: () => void
  active: boolean
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      title="Volume, luminosità, batteria"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 30,
        padding: '0 10px',
        background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.85)'
      }}
    >
      <Wifi size={14} />
      <Volume2 size={14} />
      <Battery size={14} />
      <Settings2 size={13} style={{ opacity: 0.7, marginLeft: 2 }} />
    </button>
  )
}

function getGreeting(h: number): string {
  if (h < 6) return 'Buonanotte'
  if (h < 12) return 'Buongiorno'
  if (h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

const pillStyle: React.CSSProperties = {
  pointerEvents: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '6px 12px',
  background: 'rgba(15, 15, 25, 0.72)',
  backdropFilter: 'blur(48px) saturate(180%)',
  WebkitBackdropFilter: 'blur(48px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 18,
  boxShadow:
    '0 8px 24px rgba(0,0,0,0.40), 0 0 0 1px rgba(176,124,255,0.06) inset, 0 1px 0 rgba(255,255,255,0.08) inset',
  minHeight: 36
}

const iconBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  borderRadius: 9,
  background: 'transparent',
  border: 'none',
  color: 'rgba(255,255,255,0.85)',
  cursor: 'pointer',
  transition: 'background 0.18s ease'
}
