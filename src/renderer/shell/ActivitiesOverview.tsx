import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useShellStore } from '@/stores/shell'
import { useWindowsStore } from '@/stores/windows'
import { APP_BY_ID } from '@/stores/apps'

/**
 * Mission-control style overview of all open Aurora windows. Trigger: F3 or
 * via QuickSettings/Taskbar. We don't snapshot real content (would require
 * webContents.capturePage from the renderer side), instead we show app icon
 * + title cards.
 */
export function ActivitiesOverview(): JSX.Element {
  const open = useShellStore((s) => s.overviewOpen)
  const setOpen = useShellStore((s) => s.setOverviewOpen)
  const windows = useWindowsStore((s) => s.windows)
  const focus = useWindowsStore((s) => s.focus)
  const close = useWindowsStore((s) => s.close)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(28px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 15, 30, 0.55)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 60
          }}
          onClick={() => setOpen(false)}
        >
          <h1
            style={{
              fontSize: 28,
              color: 'var(--text-primary)',
              marginBottom: 28,
              fontWeight: 600
            }}
          >
            Finestre aperte
          </h1>
          {windows.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 16 }}>
              Nessuna finestra aperta. Premi Esc per tornare al desktop.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 18,
                maxWidth: 1200,
                width: '100%'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {windows.map((w) => {
                const meta = APP_BY_ID.get(w.appId)
                const Icon = meta?.icon
                return (
                  <motion.div
                    key={w.id}
                    layout
                    whileHover={{ scale: 1.04 }}
                    style={{
                      position: 'relative',
                      aspectRatio: '16/10',
                      background: 'var(--bg-elev-2)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      padding: 18,
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)'
                    }}
                    onClick={() => {
                      focus(w.id)
                      setOpen(false)
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        background: meta?.gradient || 'var(--gradient-aurora)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                      }}
                    >
                      {Icon && <Icon size={28} color="white" />}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text-primary)'
                      }}
                    >
                      {w.title}
                    </div>
                    {w.minimized && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>(ridotta)</div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        close(w.id)
                      }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        background: 'var(--bg-elev-3)',
                        border: '1px solid var(--border-glass)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-secondary)'
                      }}
                      title="Chiudi"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                )
              })}
            </div>
          )}
          <div style={{ marginTop: 24, fontSize: 13, color: 'var(--text-muted)' }}>
            Premi Esc per chiudere
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
