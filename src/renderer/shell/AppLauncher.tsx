import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import { APPS } from '@/stores/apps'
import { useShellStore } from '@/stores/shell'
import { useWindowsStore } from '@/stores/windows'
import { Input } from '@/design-system/Input'

export function AppLauncher(): JSX.Element {
  const open = useShellStore((s) => s.launcherOpen)
  const setOpen = useShellStore((s) => s.setLauncherOpen)
  const launch = useWindowsStore((s) => s.open)
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!q.trim()) return APPS
    const needle = q.toLowerCase()
    return APPS.filter(
      (a) =>
        a.name.toLowerCase().includes(needle) ||
        a.description.toLowerCase().includes(needle) ||
        a.id.includes(needle)
    )
  }, [q])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(40px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.22 }}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1500,
            background: 'rgba(7,7,13,0.55)',
            backdropFilter: 'blur(40px) saturate(140%)',
            WebkitBackdropFilter: 'blur(40px) saturate(140%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 100
          }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              width: 'min(560px, 80vw)',
              marginBottom: 32,
              position: 'relative'
            }}
          >
            <Search
              size={18}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: 16, top: 14, pointerEvents: 'none' }}
            />
            <Input
              ref={inputRef}
              placeholder="Cerca app…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ paddingLeft: 44, fontSize: 16, height: 48 }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false)
                if (e.key === 'Enter' && filtered[0]) {
                  launch(filtered[0].id)
                  setOpen(false)
                }
              }}
            />
          </motion.div>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 18,
              width: 'min(900px, 90vw)',
              padding: 20
            }}
          >
            {filtered.map((app, idx) => {
              const Icon = app.icon
              return (
                <motion.button
                  key={app.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.025 }}
                  onClick={() => {
                    launch(app.id)
                    setOpen(false)
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    padding: 16,
                    background: 'transparent',
                    border: '1px solid transparent',
                    borderRadius: 14,
                    cursor: 'pointer',
                    transition: 'background 0.18s ease, transform 0.18s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 16,
                      background: app.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                    }}
                  >
                    <Icon size={28} color="white" />
                  </div>
                  <span
                    style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}
                  >
                    {app.name}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
