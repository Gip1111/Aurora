import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useCallback } from 'react'
import { Sparkles, FileText, Languages, HelpCircle, MessageCircle } from 'lucide-react'
import { useAIStore } from '@/stores/ai'

interface BubblePos {
  x: number
  y: number
  text: string
}

interface QuickAction {
  icon: JSX.Element
  label: string
  /** Builds the full prompt that will be sent to the AI */
  prompt: (text: string) => string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: <FileText size={13} />,
    label: 'Riassumi',
    prompt: (t) => `Riassumi brevemente il seguente testo:\n\n"${t}"`
  },
  {
    icon: <Languages size={13} />,
    label: 'Traduci',
    prompt: (t) => `Traduci il seguente testo in inglese:\n\n"${t}"`
  },
  {
    icon: <HelpCircle size={13} />,
    label: 'Spiega',
    prompt: (t) => `Spiega in modo semplice il seguente testo:\n\n"${t}"`
  },
  {
    icon: <MessageCircle size={13} />,
    label: 'Chiedi all\u2019AI',
    prompt: (t) => `Testo selezionato:\n"${t}"\n\nIstruzione:`
  }
]

/**
 * Floating quick-action bubble that appears next to the user's text selection.
 * Shows a menu of AI actions (Riassumi / Traduci / Spiega / Chiedi) that open
 * the AI overlay with a pre-filled contextual prompt.
 */
export function AIBubble(): JSX.Element {
  const [bubble, setBubble] = useState<BubblePos | null>(null)
  const setAIOpen = useAIStore((s) => s.setOpen)
  const setAIContext = useAIStore((s) => s.setContext)

  useEffect(() => {
    const onSelectionChange = (): void => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) {
        setBubble(null)
        return
      }
      const text = sel.toString().trim()
      if (text.length < 3) {
        setBubble(null)
        return
      }
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) return
      // Place bubble at the end of the selection
      setBubble({
        x: Math.min(window.innerWidth - 260, rect.right + 8),
        y: Math.max(60, rect.top - 8),
        text
      })
    }
    document.addEventListener('selectionchange', onSelectionChange)
    const onMouseDown = (e: MouseEvent): void => {
      // Don't dismiss when clicking on the bubble itself
      const target = e.target as HTMLElement
      if (target?.closest('[data-ai-bubble]')) return
      setBubble(null)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [])

  const onAction = useCallback(
    (action: QuickAction): void => {
      if (!bubble) return
      setAIContext(action.prompt(bubble.text))
      setAIOpen(true)
      setBubble(null)
    },
    [bubble, setAIContext, setAIOpen]
  )

  return (
    <AnimatePresence>
      {bubble && (
        <motion.div
          data-ai-bubble
          key="ai-bubble"
          initial={{ opacity: 0, scale: 0.6, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          style={{
            position: 'fixed',
            top: bubble.y,
            left: bubble.x,
            zIndex: 4000,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-elev-3)',
            border: '1px solid var(--border-glass-strong)',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(176,124,255,0.18)',
            overflow: 'hidden',
            minWidth: 160
          }}
        >
          {/* Header pill */}
          <div
            style={{
              padding: '7px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--gradient-aurora)',
              color: '#0b0b14',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: 'uppercase'
            }}
          >
            <Sparkles size={12} />
            Azioni AI
          </div>

          {/* Quick-action list */}
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.label}
              onClick={() => onAction(a)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border-glass)',
                color: 'var(--text-primary)',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(176,124,255,0.12)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <span style={{ color: 'var(--accent-1)', flexShrink: 0 }}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
