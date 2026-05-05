import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Send,
  FolderOpen,
  StickyNote,
  LayoutGrid,
  Calculator,
  Settings,
  Search,
  Sun,
  Moon,
  ArrowRight,
  Mic,
  Zap,
  Clock,
  MessageCircle
} from 'lucide-react'
import { useSessionStore } from '@/stores/session'
import { useAIStore } from '@/stores/ai'
import { useWindowsStore } from '@/stores/windows'
import { useAIAgent } from '@/ai/useAIAgent'
import { ToolCallChip } from '@/ai/ToolCallChip'
import type { AppId } from '@shared/types'

/* ─── time-of-day helpers ─── */
function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Buonanotte'
  if (h < 12) return 'Buongiorno'
  if (h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

function getTimeEmoji(): string {
  const h = new Date().getHours()
  if (h < 6) return '🌙'
  if (h < 12) return '☀️'
  if (h < 18) return '🌤️'
  return '🌆'
}

/** Context-aware suggestion chips that change by time of day */
function getSuggestions(): string[] {
  const h = new Date().getHours()
  if (h < 12)
    return [
      'Che tempo fa oggi?',
      'Apri le mie note',
      'Cerca documenti recenti',
      'Organizza la scrivania'
    ]
  if (h < 18)
    return [
      'Crea una nuova nota',
      'Apri la calcolatrice',
      'Mostra i miei file',
      'Installa un programma'
    ]
  return [
    'Riassumi la giornata',
    'Cambia a tema scuro',
    'Pulisci il cestino',
    'Apri le impostazioni'
  ]
}

/* ─── quick-launch items ─── */
interface QuickItem {
  id: AppId
  label: string
  icon: JSX.Element
  gradient: string
}
const QUICK_LAUNCH: QuickItem[] = [
  {
    id: 'files',
    label: 'Documenti',
    icon: <FolderOpen size={22} />,
    gradient: 'linear-gradient(135deg, #4fd6ff 0%, #b07cff 100%)'
  },
  {
    id: 'notes',
    label: 'Note',
    icon: <StickyNote size={22} />,
    gradient: 'linear-gradient(135deg, #ffd86c 0%, #ff9c4f 100%)'
  },
  {
    id: 'calculator',
    label: 'Calcolatrice',
    icon: <Calculator size={22} />,
    gradient: 'linear-gradient(135deg, #6affb1 0%, #4fd6ff 100%)'
  },
  {
    id: 'programs',
    label: 'Programmi',
    icon: <LayoutGrid size={22} />,
    gradient: 'linear-gradient(135deg, #b07cff 0%, #ff6cc4 100%)'
  },
  {
    id: 'settings',
    label: 'Impostazioni',
    icon: <Settings size={22} />,
    gradient: 'linear-gradient(135deg, #8a8ab6 0%, #c8c8e8 100%)'
  }
]

/**
 * DesktopHub — the AI-first interactive home screen.
 *
 * Replaces the empty desktop area with:
 *  • Personalized greeting
 *  • Always-visible AI command bar (spotlight-style)
 *  • Inline AI conversation (no separate overlay needed)
 *  • Quick-launch app cards
 *  • Contextual AI suggestion chips
 */
export function DesktopHub(): JSX.Element {
  const user = useSessionStore((s) => s.user)
  const theme = useSessionStore((s) => s.settings.theme)
  const setSetting = useSessionStore((s) => s.setSetting)
  const openApp = useWindowsStore((s) => s.open)
  const windows = useWindowsStore((s) => s.windows)

  // AI state
  const messages = useAIStore((s) => s.messages)
  const status = useAIStore((s) => s.status)
  const health = useAIStore((s) => s.health)
  const reset = useAIStore((s) => s.reset)
  const { send, abort } = useAIAgent()

  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(new Date())

  // Hide the hub when app windows are open
  const hasWindows = windows.some((w) => !w.minimized)

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const submit = (): void => {
    if (!input.trim() || status === 'streaming') return
    void send(input)
    setInput('')
  }

  const sendSuggestion = (q: string): void => {
    void send(q)
  }

  // Dynamic data
  const greeting = getGreeting()
  const emoji = getTimeEmoji()
  const suggestions = getSuggestions()
  const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
  const hasConversation = messages.length > 0

  return (
    <AnimatePresence>
      {!hasWindows && (
        <motion.div
          key="desktop-hub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'absolute',
            top: 44, // below taskbar
            left: 0,
            right: 0,
            bottom: 88, // above dock
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: hasConversation ? 'flex-start' : 'center',
            padding: hasConversation ? '24px 20px 16px' : '0 20px 60px',
            zIndex: 1,
            overflow: 'hidden',
            pointerEvents: 'auto'
          }}
        >
          {/* ── Greeting Section ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 28 }}
            style={{
              textAlign: 'center',
              marginBottom: hasConversation ? 16 : 32,
              flexShrink: 0
            }}
          >
            {!hasConversation && (
              <>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                    marginBottom: 8,
                    letterSpacing: 0.5
                  }}
                >
                  <Clock size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 6 }} />
                  {dateStr} · {timeStr}
                </div>
                <h1
                  style={{
                    fontSize: 42,
                    fontWeight: 700,
                    margin: 0,
                    background: 'var(--gradient-aurora)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1.2
                  }}
                >
                  {emoji} {greeting}, {user?.name || 'Utente'}
                </h1>
                <p
                  style={{
                    fontSize: 17,
                    color: 'var(--text-secondary)',
                    margin: '10px 0 0',
                    fontWeight: 400
                  }}
                >
                  Scrivi cosa vuoi fare, ci penso io.
                </p>
              </>
            )}
            {hasConversation && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: 'var(--gradient-aurora)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Sparkles size={13} color="#0b0b14" />
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Aurora AI
                </span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: health === 'ok' ? 'rgba(106,255,177,0.15)' : 'rgba(255,108,108,0.15)',
                    color: health === 'ok' ? '#6affb1' : '#ff8a8a',
                    border: `1px solid ${health === 'ok' ? 'rgba(106,255,177,0.35)' : 'rgba(255,108,108,0.35)'}`
                  }}
                >
                  {health === 'ok' ? 'online' : 'offline'}
                </span>
                <div style={{ flex: 1 }} />
                <button
                  onClick={reset}
                  title="Nuova chat"
                  style={{
                    background: 'var(--bg-elev-2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 8,
                    color: 'var(--text-muted)',
                    padding: '5px 10px',
                    cursor: 'pointer',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <Zap size={11} />
                  Nuova
                </button>
              </div>
            )}
          </motion.div>

          {/* ── AI Conversation (inline on desktop) ── */}
          {hasConversation && (
            <motion.div
              ref={scrollRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                flex: 1,
                width: '100%',
                maxWidth: 680,
                overflow: 'auto',
                marginBottom: 12,
                padding: '4px 0',
                minHeight: 0
              }}
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    marginBottom: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '10px 14px',
                      borderRadius: 14,
                      background:
                        m.role === 'user' ? 'var(--gradient-aurora)' : 'var(--bg-elev-2)',
                      border:
                        m.role === 'user' ? 'none' : '1px solid var(--border-glass-strong)',
                      backdropFilter: m.role === 'assistant' ? 'blur(40px) saturate(150%)' : undefined,
                      WebkitBackdropFilter: m.role === 'assistant' ? 'blur(40px) saturate(150%)' : undefined,
                      color: m.role === 'user' ? '#0b0b14' : 'var(--text-primary)',
                      fontSize: 14,
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      boxShadow:
                        m.role === 'user'
                          ? '0 4px 16px rgba(176,124,255,0.25)'
                          : '0 2px 12px rgba(0,0,0,0.2)'
                    }}
                  >
                    {m.content || (m.streaming ? '…' : '')}
                  </div>
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div
                      style={{
                        marginTop: 6,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 6
                      }}
                    >
                      {m.toolCalls.map((tc) => (
                        <ToolCallChip key={tc.id} call={tc} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* ── AI Command Bar ── */}
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 220, damping: 28 }}
            style={{
              width: '100%',
              maxWidth: 680,
              flexShrink: 0
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 6px 6px 20px',
                background: 'var(--bg-elev-2)',
                backdropFilter: 'blur(50px) saturate(170%)',
                WebkitBackdropFilter: 'blur(50px) saturate(170%)',
                border: `1px solid ${focused ? 'rgba(176,124,255,0.45)' : 'var(--border-glass-strong)'}`,
                borderRadius: 20,
                boxShadow: focused
                  ? '0 8px 40px rgba(176,124,255,0.25), 0 0 0 1px rgba(176,124,255,0.15), inset 0 1px 0 rgba(255,255,255,0.08)'
                  : '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
                transition: 'border-color 0.25s, box-shadow 0.25s'
              }}
            >
              <Sparkles
                size={18}
                style={{
                  color: focused ? '#b07cff' : 'var(--text-muted)',
                  transition: 'color 0.25s',
                  flexShrink: 0
                }}
              />
              <input
                ref={inputRef}
                type="text"
                value={input}
                placeholder={status === 'streaming' ? 'Aurora sta pensando…' : 'Chiedi qualsiasi cosa ad Aurora…'}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    submit()
                  }
                }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  color: 'var(--text-primary)',
                  padding: '10px 0'
                }}
              />
              {status === 'streaming' ? (
                <button
                  onClick={abort}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    background: 'rgba(255,108,108,0.18)',
                    border: '1px solid rgba(255,108,108,0.35)',
                    color: '#ffb3bf',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                  title="Ferma"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  >
                    <Sparkles size={16} />
                  </motion.div>
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={!input.trim()}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    background: input.trim() ? 'var(--gradient-aurora)' : 'var(--bg-elev-3)',
                    border: input.trim() ? 'none' : '1px solid var(--border-glass)',
                    color: input.trim() ? '#0b0b14' : 'var(--text-muted)',
                    cursor: input.trim() ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: input.trim() ? '0 4px 16px rgba(176,124,255,0.35)' : 'none',
                    transition: 'all 0.2s'
                  }}
                  title="Invia"
                >
                  <Send size={16} />
                </button>
              )}
            </div>

            {/* Shortcut hint */}
            <div
              style={{
                textAlign: 'center',
                fontSize: 11,
                color: 'var(--text-muted)',
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16
              }}
            >
              <span>
                <kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>K</kbd> da qualsiasi schermata
              </span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() =>
                  setSetting(
                    'theme',
                    theme === 'aurora-light' ? 'aurora-dark' : 'aurora-light'
                  )
                }
              >
                {theme === 'aurora-light' ? <Moon size={11} /> : <Sun size={11} />}
                {theme === 'aurora-light' ? 'Tema scuro' : 'Tema chiaro'}
              </span>
            </div>
          </motion.div>

          {/* ── Suggestion Chips ── */}
          {!hasConversation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                justifyContent: 'center',
                marginTop: 20,
                maxWidth: 680,
                flexShrink: 0
              }}
            >
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendSuggestion(s)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    background: 'var(--bg-elev-2)',
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)',
                    border: '1px solid var(--border-glass-strong)',
                    borderRadius: 24,
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(176,124,255,0.15)'
                    e.currentTarget.style.borderColor = 'rgba(176,124,255,0.4)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-elev-2)'
                    e.currentTarget.style.borderColor = 'var(--border-glass-strong)'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >
                  <MessageCircle size={13} />
                  {s}
                </button>
              ))}
            </motion.div>
          )}

          {/* ── Quick Launch Grid ── */}
          {!hasConversation && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              style={{
                display: 'flex',
                gap: 12,
                marginTop: 28,
                flexShrink: 0
              }}
            >
              {QUICK_LAUNCH.map((item) => (
                <QuickCard key={item.id} item={item} onClick={() => openApp(item.id)} />
              ))}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Quick Card ─── */
function QuickCard({
  item,
  onClick
}: {
  item: QuickItem
  onClick: () => void
}): JSX.Element {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 100,
        padding: '18px 8px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        background: 'var(--bg-elev-2)',
        backdropFilter: 'blur(40px) saturate(160%)',
        WebkitBackdropFilter: 'blur(40px) saturate(160%)',
        border: `1px solid ${hovered ? 'rgba(176,124,255,0.35)' : 'var(--border-glass-strong)'}`,
        borderRadius: 16,
        cursor: 'pointer',
        color: 'var(--text-primary)',
        fontFamily: 'inherit',
        boxShadow: hovered
          ? '0 12px 32px rgba(0,0,0,0.3), 0 0 20px rgba(176,124,255,0.12)'
          : '0 4px 16px rgba(0,0,0,0.15)',
        transition: 'border-color 0.25s, box-shadow 0.25s'
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: item.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          color: 'white'
        }}
      >
        {item.icon}
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.85 }}>{item.label}</span>
    </motion.button>
  )
}

/* ─── small helpers ─── */
const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 5px',
  fontSize: 10,
  fontFamily: 'inherit',
  background: 'var(--bg-elev-3)',
  border: '1px solid var(--border-glass)',
  borderRadius: 4,
  color: 'var(--text-secondary)'
}
