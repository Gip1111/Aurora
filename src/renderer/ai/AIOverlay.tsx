import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, Square, RotateCcw } from 'lucide-react'
import { useAIStore } from '@/stores/ai'
import { useAIAgent } from './useAIAgent'
import { ToolCallChip } from './ToolCallChip'

/** Contexts that end with this suffix are "fill only" – drop into input box */
const FILL_SUFFIX = 'Istruzione:'

const QUICK = [
  'Apri il file manager',
  'Crea una cartella Documenti AI in Home',
  'Cambia tema in chiaro',
  'Cerca foto vacanza nelle mie cartelle',
  'Spiegami cosa fa il tasto Cmd+K'
]

export function AIOverlay(): JSX.Element {
  const open = useAIStore((s) => s.open)
  const setOpen = useAIStore((s) => s.setOpen)
  const messages = useAIStore((s) => s.messages)
  const status = useAIStore((s) => s.status)
  const reset = useAIStore((s) => s.reset)
  const health = useAIStore((s) => s.health)
  const { send, abort } = useAIAgent()
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const context = useAIStore((s) => s.context)
  const setContext = useAIStore((s) => s.setContext)

  // When overlay opens, consume pending context
  useEffect(() => {
    if (!open) return
    setTimeout(() => inputRef.current?.focus(), 80)
    if (context) {
      // If the context is a "fill only" prompt, pre-fill the input
      if (context.endsWith(FILL_SUFFIX)) {
        setInput(context)
      } else {
        // Otherwise auto-send it
        void send(context)
      }
      setContext(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const submit = (): void => {
    if (!input.trim() || status === 'streaming') return
    void send(input)
    setInput('')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(7,7,13,0.55)',
            backdropFilter: 'blur(40px) saturate(140%)',
            WebkitBackdropFilter: 'blur(40px) saturate(140%)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: 80
          }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: -20, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -10, scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            style={{
              width: 'min(720px, 92vw)',
              maxHeight: '78vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-elev-3)',
              border: '1px solid var(--border-glass-strong)',
              borderRadius: 18,
              boxShadow: 'var(--shadow-window)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                borderBottom: '1px solid var(--border-glass)'
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'var(--gradient-aurora)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Sparkles size={14} color="#0b0b14" />
              </div>
              <span style={{ fontWeight: 600 }}>Aurora AI</span>
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 10,
                  background:
                    health === 'ok' ? 'rgba(106,255,177,0.15)' : 'rgba(255,108,108,0.15)',
                  color: health === 'ok' ? '#6affb1' : '#ff8a8a',
                  border: `1px solid ${
                    health === 'ok' ? 'rgba(106,255,177,0.4)' : 'rgba(255,108,108,0.4)'
                  }`
                }}
              >
                {health === 'ok' ? 'ollama online' : health === 'down' ? 'ollama offline' : 'verifico…'}
              </span>
              <div style={{ flex: 1 }} />
              {messages.length > 0 && (
                <button
                  onClick={reset}
                  title="Nuova chat"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 8,
                    color: 'var(--text-muted)',
                    padding: 6,
                    cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              style={{ flex: 1, overflow: 'auto', padding: 16, minHeight: 240 }}
            >
              {messages.length === 0 ? (
                <div style={{ paddingTop: 24 }}>
                  <div
                    style={{
                      fontSize: 14,
                      color: 'var(--text-secondary)',
                      marginBottom: 14
                    }}
                  >
                    Chiedi qualsiasi cosa. Posso aprire app, gestire file, installare pacchetti,
                    cambiare tema, cercare in rete e molto altro.
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {QUICK.map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setInput(q)
                          setTimeout(() => inputRef.current?.focus(), 0)
                        }}
                        style={{
                          background: 'var(--bg-elev-1)',
                          border: '1px solid var(--border-glass)',
                          color: 'var(--text-secondary)',
                          fontSize: 12,
                          padding: '6px 12px',
                          borderRadius: 16,
                          cursor: 'pointer'
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      marginBottom: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '88%',
                        padding: '10px 14px',
                        borderRadius: 14,
                        background:
                          m.role === 'user'
                            ? 'var(--gradient-aurora)'
                            : 'var(--bg-elev-1)',
                        border:
                          m.role === 'user'
                            ? 'none'
                            : '1px solid var(--border-glass)',
                        color: m.role === 'user' ? '#0b0b14' : 'var(--text-primary)',
                        fontSize: 14,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
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
                ))
              )}
            </div>

            {/* Input */}
            <div
              style={{
                padding: 12,
                borderTop: '1px solid var(--border-glass)',
                display: 'flex',
                gap: 8,
                alignItems: 'flex-end'
              }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                placeholder="Chiedi ad Aurora…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submit()
                  }
                  if (e.key === 'Escape') setOpen(false)
                }}
                style={{
                  flex: 1,
                  resize: 'none',
                  padding: '10px 14px',
                  minHeight: 40,
                  maxHeight: 160,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-elev-1)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 10,
                  outline: 'none'
                }}
              />
              {status === 'streaming' ? (
                <button
                  onClick={abort}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(255,108,108,0.18)',
                    border: '1px solid rgba(255,108,108,0.4)',
                    color: '#ffb3bf',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Ferma"
                >
                  <Square size={14} />
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={!input.trim()}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: input.trim() ? 'var(--gradient-aurora)' : 'var(--bg-elev-1)',
                    border: input.trim() ? 'none' : '1px solid var(--border-glass)',
                    color: '#0b0b14',
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Invia"
                >
                  <Send size={15} />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
