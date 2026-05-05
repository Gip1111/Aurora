import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
  Volume2,
  Sun,
  Moon,
  Type,
  Power,
  RotateCw,
  MoonStar,
  Lock,
  LogOut,
  Wifi,
  Battery,
  HardDrive,
  Download,
  Upload
} from 'lucide-react'
import { useSessionStore } from '@/stores/session'
import { useShellStore } from '@/stores/shell'
import { useNotificationsStore } from '@/stores/notifications'
import type { SystemStatus } from '@shared/types'

export function QuickSettings(): JSX.Element {
  const open = useShellStore((s) => s.quickSettingsOpen)
  const setOpen = useShellStore((s) => s.setQuickSettingsOpen)
  const settings = useSessionStore((s) => s.settings)
  const setSetting = useSessionStore((s) => s.setSetting)
  const logout = useSessionStore((s) => s.logout)
  const pushNotif = useNotificationsStore((s) => s.push)
  const [status, setStatus] = useState<SystemStatus | null>(null)

  useEffect(() => {
    if (!open) return
    void window.api.controls.getStatus().then(setStatus)
  }, [open])

  const setVolume = async (v: number): Promise<void> => {
    setStatus((s) => (s ? { ...s, audioVolume: v } : { audioVolume: v }))
    const r = await window.api.controls.setVolume(v)
    if (!r.ok) {
      pushNotif({ title: 'Volume non disponibile', body: r.error, level: 'warning' })
    }
  }
  const setBrightness = async (v: number): Promise<void> => {
    setStatus((s) => (s ? { ...s, brightness: v } : { brightness: v }))
    const r = await window.api.controls.setBrightness(v)
    if (!r.ok) {
      pushNotif({ title: 'Luminosità non disponibile', body: r.error, level: 'warning' })
    }
  }

  const power = async (
    action: 'shutdown' | 'restart' | 'sleep' | 'lock' | 'logout'
  ): Promise<void> => {
    if (action === 'logout') {
      logout()
      setOpen(false)
      return
    }
    const labels: Record<string, string> = {
      shutdown: 'Spegnere il computer?',
      restart: 'Riavviare il computer?',
      sleep: 'Mettere in sospensione?',
      lock: 'Bloccare lo schermo?'
    }
    if (!confirm(labels[action])) return
    const r = await window.api.controls.systemAction(action)
    if (!r.ok) {
      pushNotif({ title: 'Azione fallita', body: r.error, level: 'error' })
    }
  }

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
              zIndex: 1500
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{
              position: 'fixed',
              top: 56,
              right: 12,
              width: 340,
              padding: 18,
              background: 'var(--bg-elev-3)',
              backdropFilter: 'blur(40px) saturate(160%)',
              WebkitBackdropFilter: 'blur(40px) saturate(160%)',
              border: '1px solid var(--border-glass-strong)',
              borderRadius: 18,
              boxShadow: 'var(--shadow-window)',
              zIndex: 1600,
              color: 'var(--text-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}
          >
            <Slider
              icon={<Volume2 size={18} />}
              label="Volume"
              value={status?.audioVolume ?? 50}
              onChange={setVolume}
            />
            <Slider
              icon={<Sun size={18} />}
              label="Luminosità"
              value={status?.brightness ?? 80}
              onChange={setBrightness}
            />

            <Row>
              <Toggle
                icon={settings.theme === 'aurora-light' ? <Sun size={16} /> : <Moon size={16} />}
                label={settings.theme === 'aurora-light' ? 'Tema chiaro' : 'Tema scuro'}
                active
                onClick={() =>
                  setSetting(
                    'theme',
                    settings.theme === 'aurora-light' ? 'aurora-dark' : 'aurora-light'
                  )
                }
              />
              <Toggle
                icon={<Type size={16} />}
                label={textSizeLabel(settings.uiScale)}
                active={settings.uiScale > 1.0}
                onClick={() => setSetting('uiScale', cycleUiScale(settings.uiScale))}
              />
            </Row>

            <div
              style={{
                padding: 12,
                background: 'var(--bg-elev-2)',
                border: '1px solid var(--border-glass)',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: 13
              }}
            >
              <StatusLine
                icon={<Battery size={14} />}
                label="Batteria"
                value={
                  status?.battery
                    ? `${status.battery.percent}%${status.battery.charging ? ' (in carica)' : ''}`
                    : 'N/D'
                }
              />
              <StatusLine
                icon={<Wifi size={14} />}
                label="Wi-Fi"
                value={status?.wifiSsid || 'Non connesso'}
              />
              <StatusLine
                icon={<HardDrive size={14} />}
                label="Spazio libero"
                value={status?.diskFreeGb ? `${status.diskFreeGb} GB` : 'N/D'}
              />
            </div>

            <Row>
              <Toggle
                icon={<Download size={16} />}
                label="Backup"
                active={false}
                onClick={async () => {
                  const r = await window.api.settings.backup()
                  pushNotif(
                    r.ok
                      ? { title: 'Backup completato', body: r.path, level: 'success' }
                      : { title: 'Backup fallito', body: r.error, level: 'error' }
                  )
                }}
              />
              <Toggle
                icon={<Upload size={16} />}
                label="Ripristina"
                active={false}
                onClick={async () => {
                  const r = await window.api.settings.restore()
                  pushNotif(
                    r.ok
                      ? {
                          title: 'Ripristino completato',
                          body: `${r.count} file ripristinati. Riavvia per applicare.`,
                          level: 'success'
                        }
                      : { title: 'Ripristino fallito', body: r.error, level: 'error' }
                  )
                }}
              />
            </Row>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8
              }}
            >
              <PowerBtn icon={<Power size={16} />} label="Spegni" onClick={() => power('shutdown')} />
              <PowerBtn icon={<RotateCw size={16} />} label="Riavvia" onClick={() => power('restart')} />
              <PowerBtn icon={<MoonStar size={16} />} label="Sospendi" onClick={() => power('sleep')} />
              <PowerBtn icon={<Lock size={16} />} label="Blocca" onClick={() => power('lock')} />
              <PowerBtn
                icon={<LogOut size={16} />}
                label="Cambia utente"
                onClick={() => power('logout')}
                style={{ gridColumn: 'span 2' }}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function textSizeLabel(scale: number): string {
  if (scale <= 1.0) return 'Testo normale'
  if (scale <= 1.15) return 'Testo grande'
  if (scale <= 1.3) return 'Testo più grande'
  return 'Testo molto grande'
}

function cycleUiScale(s: number): number {
  if (s <= 1.0) return 1.15
  if (s <= 1.15) return 1.3
  if (s <= 1.3) return 1.5
  return 1.0
}

function Slider({
  icon,
  label,
  value,
  onChange
}: {
  icon: JSX.Element
  label: string
  value: number
  onChange: (v: number) => void
}): JSX.Element {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ color: 'var(--accent-2)' }}>{icon}</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {Math.round(value)}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{ width: '100%', accentColor: 'var(--accent-2)' }}
      />
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }): JSX.Element {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{children}</div>
}

function Toggle({
  icon,
  label,
  active,
  onClick
}: {
  icon: JSX.Element
  label: string
  active: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        background: active ? 'var(--gradient-aurora)' : 'var(--bg-elev-2)',
        border: '1px solid var(--border-glass)',
        borderRadius: 10,
        color: active ? '#0b0b14' : 'var(--text-primary)',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        fontSize: 13,
        textAlign: 'left'
      }}
    >
      {icon}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </button>
  )
}

function StatusLine({
  icon,
  label,
  value
}: {
  icon: JSX.Element
  label: string
  value: string
}): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function PowerBtn({
  icon,
  label,
  onClick,
  style
}: {
  icon: JSX.Element
  label: string
  onClick: () => void
  style?: React.CSSProperties
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '10px 8px',
        background: 'var(--bg-elev-2)',
        border: '1px solid var(--border-glass)',
        borderRadius: 10,
        color: 'var(--text-primary)',
        cursor: 'pointer',
        fontSize: 13,
        ...style
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elev-3)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-elev-2)')}
    >
      {icon}
      {label}
    </button>
  )
}
