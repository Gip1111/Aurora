import { useEffect, useState } from 'react'
import { useSessionStore } from '@/stores/session'
import { useNotificationsStore } from '@/stores/notifications'
import { useAIStore } from '@/stores/ai'
import { useShellStore } from '@/stores/shell'
import { Bell, Sparkles, Settings2, MessageCircle } from 'lucide-react'

export function Taskbar(): JSX.Element {
  const [now, setNow] = useState(new Date())
  const user = useSessionStore((s) => s.user)
  const notifOpen = useNotificationsStore((s) => s.open)
  const setNotifOpen = useNotificationsStore((s) => s.setOpen)
  const unread = useNotificationsStore((s) => s.toasts.filter((t) => !t.read).length)
  const aiHealth = useAIStore((s) => s.health)
  const toggleAI = useAIStore((s) => s.toggle)
  const setQuickSettings = useShellStore((s) => s.setQuickSettingsOpen)
  const quickSettingsOpen = useShellStore((s) => s.quickSettingsOpen)

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(i)
  }, [])

  const time = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div
      className="app-drag"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 44,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        background: 'var(--bg-elev-1)',
        backdropFilter: 'blur(40px) saturate(160%)',
        WebkitBackdropFilter: 'blur(40px) saturate(160%)',
        borderBottom: '1px solid var(--border-glass)',
        fontSize: 13,
        color: 'var(--text-secondary)'
      }}
    >
      {/* Left: Aurora logo */}
      <div className="app-no-drag" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 10px',
            borderRadius: 8
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: 'var(--gradient-aurora)',
              boxShadow: '0 0 12px rgba(176, 124, 255, 0.6)'
            }}
          />
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Aurora</span>
        </span>

        <div
          className="app-no-drag"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-primary)',
            lineHeight: 1.1,
            cursor: 'pointer',
            padding: '4px 10px',
            borderRadius: 8
          }}
          onClick={() => setNotifOpen(!notifOpen)}
          title="Notifiche e calendario"
        >
          <span style={{ fontSize: 14, fontWeight: 600 }}>{time}</span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              textTransform: 'capitalize'
            }}
          >
            {date}
          </span>
        </div>
      </div>

      {/* Center: prominent AI button */}
      <button
        className="app-no-drag"
        onClick={toggleAI}
        title="Apri l'assistente (Ctrl+K)"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 18px',
          background: 'var(--gradient-aurora)',
          border: 'none',
          borderRadius: 22,
          color: '#0b0b14',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
          boxShadow:
            aiHealth === 'ok'
              ? '0 0 24px rgba(176, 124, 255, 0.45), 0 0 48px rgba(79, 214, 255, 0.20)'
              : '0 4px 12px rgba(0, 0, 0, 0.3)',
          animation: aiHealth === 'ok' ? 'pulse-glow 2.4s ease-in-out infinite' : undefined
        }}
      >
        <MessageCircle size={16} />
        Chiedimi
        {aiHealth === 'down' && (
          <span
            style={{
              fontSize: 10,
              padding: '2px 6px',
              background: 'rgba(255, 80, 100, 0.4)',
              borderRadius: 8,
              color: '#fff'
            }}
          >
            offline
          </span>
        )}
      </button>

      {/* Right: indicators */}
      <div className="app-no-drag" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={toggleAI}
          title="Aurora AI (Ctrl+K)"
          style={{
            ...iconBtn,
            background:
              aiHealth === 'ok'
                ? 'linear-gradient(135deg, rgba(176,124,255,0.25), rgba(79,214,255,0.25))'
                : 'transparent'
          }}
        >
          <Sparkles size={16} color={aiHealth === 'ok' ? '#b07cff' : 'currentColor'} />
        </button>
        <button
          style={{
            ...iconBtn,
            background: quickSettingsOpen ? 'var(--bg-elev-3)' : 'transparent'
          }}
          title="Volume, schermo, energia"
          onClick={() => setQuickSettings(!quickSettingsOpen)}
        >
          <Settings2 size={16} />
        </button>
        <button
          style={{ ...iconBtn, position: 'relative' }}
          title="Notifiche"
          onClick={() => setNotifOpen(!notifOpen)}
        >
          <Bell size={16} />
          {unread > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--accent-3)',
                boxShadow: '0 0 8px var(--accent-3)'
              }}
            />
          )}
        </button>
        {user && (
          <div
            style={{
              marginLeft: 6,
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'var(--gradient-aurora)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
              color: '#0b0b14',
              cursor: 'pointer'
            }}
            title={user.name}
          >
            {user.avatar || user.name.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 8,
  background: 'transparent',
  border: '1px solid transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  transition: 'background 0.18s ease, border-color 0.18s ease'
}
