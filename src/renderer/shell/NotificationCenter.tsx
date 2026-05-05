import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationsStore } from '@/stores/notifications'
import { X, Bell } from 'lucide-react'

export function NotificationCenter(): JSX.Element {
  const open = useNotificationsStore((s) => s.open)
  const setOpen = useNotificationsStore((s) => s.setOpen)
  const toasts = useNotificationsStore((s) => s.toasts)
  const dismiss = useNotificationsStore((s) => s.dismiss)
  const clearAll = useNotificationsStore((s) => s.clearAll)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1300,
              background: 'rgba(0,0,0,0.0)',
              cursor: 'default'
            }}
          />
          <motion.div
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            style={{
              position: 'fixed',
              top: 56,
              right: 12,
              width: 360,
              maxHeight: 'calc(100vh - 76px - 76px)',
              zIndex: 1400,
              background: 'var(--bg-elev-2)',
              backdropFilter: 'blur(40px) saturate(160%)',
              WebkitBackdropFilter: 'blur(40px) saturate(160%)',
              border: '1px solid var(--border-glass-strong)',
              borderRadius: 16,
              boxShadow: 'var(--shadow-window)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-glass)'
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Bell size={15} />
                Notifiche
              </span>
              {toasts.length > 0 && (
                <button
                  onClick={clearAll}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  Pulisci
                </button>
              )}
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
              {toasts.length === 0 ? (
                <div
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: 13
                  }}
                >
                  Nessuna notifica
                </div>
              ) : (
                toasts.map((t) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 80 }}
                    style={{
                      padding: '12px 14px',
                      margin: '4px 0',
                      background: 'var(--bg-elev-1)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 10,
                      position: 'relative'
                    }}
                  >
                    <button
                      onClick={() => dismiss(t.id)}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={14} />
                    </button>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, paddingRight: 20 }}>
                      {t.title}
                    </div>
                    {t.body && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.body}</div>
                    )}
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        marginTop: 6
                      }}
                    >
                      {new Date(t.createdAt).toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
