import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, Send } from 'lucide-react'
import { useAIStore } from '@/stores/ai'
import { useAIAgent } from './useAIAgent'
import { ToolCallChip } from './ToolCallChip'

export function AISidebar(): JSX.Element {
  const open = useAIStore((s) => s.sidebarOpen)
  const setOpen = useAIStore((s) => s.setSidebar)
  const messages = useAIStore((s) => s.messages)
  const { send, abort } = useAIAgent()
  const status = useAIStore((s) => s.status)
  const [input, setInput] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [messages])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            position: 'fixed',
            top: 56,
            bottom: 88,
            right: 12,
            width: 360,
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-elev-2)',
            backdropFilter: 'blur(40px) saturate(160%)',
            WebkitBackdropFilter: 'blur(40px) saturate(160%)',
            border: '1px solid var(--border-glass-strong)',
            borderRadius: 16,
            boxShadow: 'var(--shadow-window)',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: '1px solid var(--border-glass)'
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: 'var(--gradient-aurora)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sparkles size={11} color="#0b0b14" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Assistente Aurora</span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 4
              }}
            >
              <X size={14} />
            </button>
          </div>
          <div ref={ref} style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            {messages.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12 }}>
                Sidebar pronta. Scrivi qui per una conversazione persistente.
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      marginBottom: 4,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5
                    }}
                  >
                    {m.role === 'user' ? 'Tu' : 'Aurora'}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {m.content || (m.streaming ? '…' : '')}
                  </div>
                  {m.toolCalls && (
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {m.toolCalls.map((tc) => (
                        <ToolCallChip key={tc.id} call={tc} />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div
            style={{
              padding: 10,
              borderTop: '1px solid var(--border-glass)',
              display: 'flex',
              gap: 6
            }}
          >
            <input
              placeholder="Messaggio…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (!input.trim()) return
                  void send(input)
                  setInput('')
                }
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: 13,
                background: 'var(--bg-elev-1)',
                border: '1px solid var(--border-glass)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
            <button
              onClick={() => {
                if (status === 'streaming') {
                  abort()
                } else if (input.trim()) {
                  void send(input)
                  setInput('')
                }
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background:
                  status === 'streaming' ? 'rgba(255,108,108,0.2)' : 'var(--gradient-aurora)',
                border: 'none',
                color: status === 'streaming' ? '#ffb3bf' : '#0b0b14',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
