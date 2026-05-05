import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/design-system/Button'
import { onConfirmRequest } from './confirmBus'
import type { ToolCallRequest } from '@shared/types'

interface PendingConfirm {
  call: ToolCallRequest
  resolve: (ok: boolean) => void
}

export function ConfirmDialog(): JSX.Element {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  useEffect(() => {
    return onConfirmRequest((req) => setPending(req))
  }, [])

  const decide = (ok: boolean): void => {
    pending?.resolve(ok)
    setPending(null)
  }

  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            background: 'rgba(7,7,13,0.65)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            style={{
              width: 'min(440px, 90vw)',
              padding: 24,
              background: 'var(--bg-elev-3)',
              backdropFilter: 'blur(50px)',
              border: '1px solid var(--border-glass-strong)',
              borderRadius: 18,
              boxShadow: 'var(--shadow-window)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 14
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(255, 188, 60, 0.18)',
                  border: '1px solid rgba(255, 188, 60, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <AlertTriangle size={20} color="#febc2e" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>L'AI vuole eseguire un'azione</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Approva per procedere
                </div>
              </div>
            </div>
            <div
              style={{
                background: 'rgba(0,0,0,0.35)',
                padding: 12,
                borderRadius: 10,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                marginBottom: 18,
                wordBreak: 'break-word',
                maxHeight: 160,
                overflow: 'auto'
              }}
            >
              <div style={{ color: 'var(--accent-2)', marginBottom: 6 }}>{pending.call.name}</div>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  fontSize: 12
                }}
              >
                {JSON.stringify(pending.call.arguments, null, 2)}
              </pre>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" onClick={() => decide(false)}>
                Annulla
              </Button>
              <Button variant="aurora" onClick={() => decide(true)}>
                Esegui
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
