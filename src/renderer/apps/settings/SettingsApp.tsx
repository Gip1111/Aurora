import { useEffect, useState } from 'react'
import { useSessionStore } from '@/stores/session'
import { useAIStore } from '@/stores/ai'
import {
  Palette,
  Sparkles,
  Mail,
  User,
  Cpu,
  Info,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/design-system/Button'

const SECTIONS = [
  { id: 'appearance', label: 'Aspetto', icon: Palette },
  { id: 'ai', label: 'Assistente AI', icon: Sparkles },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'account', label: 'Account', icon: User },
  { id: 'windows', label: 'Sistema Windows', icon: Cpu },
  { id: 'about', label: 'Aurora', icon: Info }
] as const

type Section = (typeof SECTIONS)[number]['id']

const MAIL_PRESETS: { label: string; url: string }[] = [
  { label: 'Gmail', url: 'https://mail.google.com/mail/u/0/#inbox' },
  { label: 'Outlook', url: 'https://outlook.live.com/mail/0/' },
  { label: 'Yahoo', url: 'https://mail.yahoo.com/' },
  { label: 'Libero', url: 'https://login.libero.it/' },
  { label: 'iCloud', url: 'https://www.icloud.com/mail' }
]

const WINDOWS_SETTINGS_LINKS: { label: string; uri: string; desc: string }[] = [
  { label: 'Stampanti e scanner', uri: 'ms-settings:printers', desc: 'Aggiungi una stampante' },
  { label: 'Wi-Fi e rete', uri: 'ms-settings:network', desc: 'Connessioni internet' },
  { label: 'Bluetooth', uri: 'ms-settings:bluetooth', desc: 'Auricolari, mouse, tastiere' },
  { label: 'Schermo', uri: 'ms-settings:display', desc: 'Risoluzione e orientamento' },
  { label: 'Audio', uri: 'ms-settings:sound', desc: 'Altoparlanti e microfono' },
  { label: 'App predefinite', uri: 'ms-settings:defaultapps', desc: 'Quale app apre cosa' },
  { label: 'Aggiornamenti', uri: 'ms-settings:windowsupdate', desc: 'Aggiorna Windows' },
  { label: 'Account utente', uri: 'ms-settings:yourinfo', desc: 'Cambia foto e nome' }
]

export function SettingsApp(): JSX.Element {
  const [section, setSection] = useState<Section>('appearance')

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        background: 'var(--bg-elev-1)',
        color: 'var(--text-primary)',
        fontSize: 'calc(14px * var(--ui-scale, 1))'
      }}
    >
      <aside
        style={{
          width: 220,
          background: 'var(--bg-elev-2)',
          borderRight: '1px solid var(--border-glass)',
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}
      >
        {SECTIONS.map((s) => {
          const Icon = s.icon
          const active = section === s.id
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                fontSize: 'calc(14px * var(--ui-scale, 1))',
                background: active ? 'var(--bg-elev-3)' : 'transparent',
                border: '1px solid ' + (active ? 'var(--border-glass-strong)' : 'transparent'),
                borderRadius: 10,
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: active ? 600 : 400
              }}
            >
              <Icon size={18} />
              {s.label}
            </button>
          )
        })}
      </aside>
      <main style={{ flex: 1, overflow: 'auto', padding: 28 }}>
        {section === 'appearance' && <AppearanceSection />}
        {section === 'ai' && <AISection />}
        {section === 'email' && <EmailSection />}
        {section === 'account' && <AccountSection />}
        {section === 'windows' && <WindowsSection />}
        {section === 'about' && <AboutSection />}
      </main>
    </div>
  )
}

function H({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <h2 style={{ fontSize: 'calc(22px * var(--ui-scale, 1))', margin: '0 0 20px', fontWeight: 600 }}>
      {children}
    </h2>
  )
}

function Row({
  label,
  desc,
  children
}: {
  label: string
  desc?: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 18px',
        background: 'var(--bg-elev-2)',
        border: '1px solid var(--border-glass)',
        borderRadius: 12,
        marginBottom: 10,
        gap: 16
      }}
    >
      <div>
        <div style={{ fontSize: 'calc(15px * var(--ui-scale, 1))' }}>{label}</div>
        {desc && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{desc}</div>
        )}
      </div>
      <div>{children}</div>
    </div>
  )
}

function AppearanceSection(): JSX.Element {
  const { settings, setSetting } = useSessionStore()
  const sizes = [
    { v: 1.0, label: 'Normale' },
    { v: 1.15, label: 'Grande' },
    { v: 1.3, label: 'Più grande' },
    { v: 1.5, label: 'Molto grande' }
  ]
  return (
    <>
      <H>Aspetto</H>
      <Row label="Tema" desc="Chiaro per leggere meglio durante il giorno">
        <select
          value={settings.theme}
          onChange={(e) =>
            setSetting('theme', e.target.value as 'aurora-dark' | 'aurora-light')
          }
          style={selectStyle}
        >
          <option value="aurora-light">Chiaro</option>
          <option value="aurora-dark">Scuro</option>
        </select>
      </Row>
      <Row label="Dimensione testo" desc="Quanto grandi vuoi i testi e le icone">
        <select
          value={String(settings.uiScale)}
          onChange={(e) => setSetting('uiScale', parseFloat(e.target.value))}
          style={selectStyle}
        >
          {sizes.map((s) => (
            <option key={s.v} value={s.v}>
              {s.label}
            </option>
          ))}
        </select>
      </Row>
      <Row label="Suoni dell'interfaccia" desc="Suoni leggeri al click e alle notifiche">
        <Toggle checked={settings.uiSounds} onChange={(v) => setSetting('uiSounds', v)} />
      </Row>
      <Row label="Riduci animazioni" desc="Se preferisci meno movimento sullo schermo">
        <Toggle
          checked={settings.reduceMotion}
          onChange={(v) => setSetting('reduceMotion', v)}
        />
      </Row>
      <Row
        label="Sfera AI fluttuante"
        desc="Il pulsante sfera dell'assistente AI sempre visibile sul desktop"
      >
        <Toggle
          checked={settings.aiOrbEnabled}
          onChange={(v) => setSetting('aiOrbEnabled', v)}
        />
      </Row>
      <WallpaperRow />
    </>
  )
}

function WallpaperRow(): JSX.Element {
  const wallpaperImage = useSessionStore((s) => s.settings.wallpaperImage)
  const setSetting = useSessionStore((s) => s.setSetting)

  const pick = async (): Promise<void> => {
    const url = await window.api.sys.pickImage()
    if (url) setSetting('wallpaperImage', url)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 18px',
        background: 'var(--bg-elev-2)',
        border: '1px solid var(--border-glass)',
        borderRadius: 12,
        marginBottom: 10,
        gap: 16
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 88,
            height: 56,
            borderRadius: 8,
            border: '1px solid var(--border-glass-strong)',
            overflow: 'hidden',
            flexShrink: 0,
            background: wallpaperImage
              ? `url("${wallpaperImage}") center/cover`
              : 'var(--gradient-aurora)'
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'calc(15px * var(--ui-scale, 1))' }}>Sfondo</div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 280
            }}
          >
            {wallpaperImage ? 'Immagine personalizzata' : 'Aurora animato (predefinito)'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <Button variant="glass" size="sm" onClick={pick}>
          Scegli immagine…
        </Button>
        {wallpaperImage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSetting('wallpaperImage', '')}
          >
            Ripristina Aurora
          </Button>
        )}
      </div>
    </div>
  )
}

function AISection(): JSX.Element {
  const { settings, setSetting } = useSessionStore()
  const [models, setModels] = useState<string[]>([])
  const setHealth = useAIStore((s) => s.setHealth)
  const health = useAIStore((s) => s.health)
  const [checking, setChecking] = useState(false)

  const refresh = async (): Promise<void> => {
    setChecking(true)
    try {
      const ok = await window.api.openrouter.health(settings.openrouterApiKey)
      setHealth(ok ? 'ok' : 'down')
      if (ok) {
        const list = await window.api.openrouter.models()
        setModels(list)
      }
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (settings.openrouterApiKey) {
      void refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.openrouterApiKey])

  return (
    <>
      <H>Assistente AI (OpenRouter)</H>
      <Row label="Stato" desc={statusDesc(health)}>
        <Button variant="glass" size="sm" onClick={refresh} disabled={checking || !settings.openrouterApiKey}>
          {health === 'ok' ? (
            <CheckCircle2 size={14} color="#6affb1" />
          ) : health === 'down' ? (
            <XCircle size={14} color="#ff8a8a" />
          ) : (
            <RefreshCw size={14} />
          )}
          Verifica
        </Button>
      </Row>
      <Row label="Chiave API OpenRouter" desc="La tua chiave segreta per accedere ai modelli cloud.">
        <input
          type="password"
          value={settings.openrouterApiKey}
          onChange={(e) => setSetting('openrouterApiKey', e.target.value)}
          placeholder="sk-or-v1-..."
          style={{ ...selectStyle, width: 240 }}
        />
      </Row>
      <Row label="Modello" desc="Scegli il modello da utilizzare (es. owl-alpha che è free)">
        {models.length > 0 ? (
          <select
            value={settings.openrouterModel}
            onChange={(e) => setSetting('openrouterModel', e.target.value)}
            style={selectStyle}
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            {!models.includes(settings.openrouterModel) && (
              <option value={settings.openrouterModel}>
                {settings.openrouterModel}
              </option>
            )}
          </select>
        ) : (
          <input
            value={settings.openrouterModel}
            onChange={(e) => setSetting('openrouterModel', e.target.value)}
            style={{ ...selectStyle, width: 200 }}
          />
        )}
      </Row>
      <div
        style={{
          marginTop: 18,
          padding: 16,
          background: 'rgba(79,214,255,0.10)',
          border: '1px solid rgba(79,214,255,0.3)',
          borderRadius: 12,
          fontSize: 13,
          color: 'var(--text-secondary)',
          lineHeight: 1.6
        }}
      >
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          Come iniziare con OpenRouter
        </div>
        Aurora utilizza OpenRouter per collegarsi a modelli AI potenti nel cloud.
        <br />
        <br />
        1. Vai su{' '}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            void window.api.sys.openExternal('https://openrouter.ai/keys')
          }}
          style={{ color: 'var(--accent-2)' }}
        >
          openrouter.ai/keys
        </a>{' '}
        e crea una chiave API gratuita.
        <br />
        2. Incolla la chiave qui sopra.
        <br />
        3. Seleziona il modello <strong>openrouter/owl-alpha</strong> (completamente gratuito!) o un altro modello a tua scelta.
      </div>
    </>
  )
}

function EmailSection(): JSX.Element {
  const { settings, setSetting } = useSessionStore()
  return (
    <>
      <H>Email</H>
      <div style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 14 }}>
        Aurora apre la tua email nel browser. Scegli quale servizio usi:
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {MAIL_PRESETS.map((p) => (
          <Button
            key={p.url}
            variant={settings.mailUrl === p.url ? 'aurora' : 'glass'}
            onClick={() => setSetting('mailUrl', p.url)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <Row label="Indirizzo personalizzato" desc="Se usi un altro provider, incolla qui il link">
        <input
          value={settings.mailUrl}
          onChange={(e) => setSetting('mailUrl', e.target.value)}
          style={{ ...selectStyle, width: 320 }}
        />
      </Row>
      <Button
        variant="aurora"
        size="lg"
        icon={<ExternalLink size={16} />}
        onClick={() => window.api.sys.openExternal(settings.mailUrl)}
        style={{ marginTop: 12 }}
      >
        Apri Email
      </Button>
    </>
  )
}

function AccountSection(): JSX.Element {
  const { settings, setSetting, user } = useSessionStore()
  const [autoStart, setAutoStartLocal] = useState(false)

  useEffect(() => {
    void window.api.sys.getAutoStart().then(setAutoStartLocal)
  }, [])

  return (
    <>
      <H>Account</H>
      <Row label="Utente attivo" desc={`Connesso come ${user?.name || 'Ospite'}`}>
        <span style={{ fontSize: 28 }}>{user?.avatar || '👤'}</span>
      </Row>
      <Row label="Avvia con Windows" desc="Aurora si apre automaticamente all'accensione del PC">
        <Toggle
          checked={autoStart}
          onChange={async (v) => {
            const ok = await window.api.sys.setAutoStart(v)
            if (ok) {
              setAutoStartLocal(v)
              setSetting('autoStart', v)
            }
          }}
        />
      </Row>
    </>
  )
}

function WindowsSection(): JSX.Element {
  return (
    <>
      <H>Impostazioni di Windows</H>
      <div style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 14 }}>
        Tasti rapidi per le impostazioni di Windows che usi più spesso.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {WINDOWS_SETTINGS_LINKS.map((link) => (
          <button
            key={link.uri}
            onClick={() => window.api.sys.openWindowsSettings(link.uri.replace('ms-settings:', ''))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 16,
              background: 'var(--bg-elev-2)',
              border: '1px solid var(--border-glass)',
              borderRadius: 12,
              cursor: 'pointer',
              color: 'var(--text-primary)',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elev-3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-elev-2)')}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 'calc(14px * var(--ui-scale, 1))' }}>
                {link.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {link.desc}
              </div>
            </div>
            <ExternalLink size={16} color="var(--accent-2)" />
          </button>
        ))}
      </div>
    </>
  )
}

function AboutSection(): JSX.Element {
  return (
    <>
      <H>Aurora DE</H>
      <div
        style={{
          padding: 32,
          background: 'var(--bg-elev-2)',
          border: '1px solid var(--border-glass)',
          borderRadius: 16,
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 22,
            background: 'var(--gradient-aurora)',
            margin: '0 auto 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 36px rgba(176,124,255,0.45)'
          }}
        >
          <Sparkles size={44} color="#0b0b14" />
        </div>
        <div style={{ fontSize: 24, fontWeight: 600 }}>Aurora DE</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
          versione 0.1.0
        </div>
        <div
          style={{
            marginTop: 22,
            fontSize: 14,
            color: 'var(--text-secondary)',
            maxWidth: 440,
            margin: '22px auto 0',
            lineHeight: 1.6
          }}
        >
          Aurora è una shell semplificata sopra Windows con un assistente intelligente.
          Per fare qualsiasi cosa, premi <strong>💬 Chiedimi</strong> e descrivi cosa vuoi.
        </div>
      </div>
    </>
  )
}

function statusDesc(h: 'unknown' | 'ok' | 'down'): string {
  if (h === 'ok') return 'Tutto funziona — la connessione API è valida'
  if (h === 'down') return "Connessione fallita — controlla la tua chiave API o la connessione internet"
  return 'Verifica in corso…'
}

function Toggle({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 50,
        height: 28,
        borderRadius: 14,
        background: checked ? 'var(--gradient-aurora)' : 'var(--bg-elev-3)',
        border: '1px solid var(--border-glass)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.18s ease'
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 24 : 2,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'white',
          transition: 'left 0.2s var(--ease-spring)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
        }}
      />
    </button>
  )
}

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: 'var(--bg-elev-3)',
  border: '1px solid var(--border-glass)',
  borderRadius: 10,
  color: 'var(--text-primary)',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none'
}
