import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Sparkles, MessageCircle, Type, Rocket } from 'lucide-react'
import { useSessionStore } from '@/stores/session'
import { useAIStore } from '@/stores/ai'
import { useWindowsStore } from '@/stores/windows'
import type { AppId } from '@shared/types'

export function Welcome(): JSX.Element | null {
  const firstRun = useSessionStore((s) => s.settings.firstRun)
  const setSetting = useSessionStore((s) => s.setSetting)
  const [step, setStep] = useState(0)
  const setAIOpen = useAIStore((s) => s.setOpen)
  const openApp = useWindowsStore((s) => s.open)

  if (!firstRun) return null

  const finish = (): void => {
    setSetting('firstRun', false)
  }

  const finishAndAsk = (q: string): void => {
    finish()
    // Set the query as pending context – the AIOverlay will detect this
    // and auto-submit it when it opens.
    useAIStore.getState().setContext(q)
    setAIOpen(true)
  }

  const finishAndOpen = (appId: AppId): void => {
    finish()
    openApp(appId)
  }

  return (
    <AnimatePresence>
      <motion.div
        key="welcome"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 18, 35, 0.78)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          zIndex: 5000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40
        }}
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          style={{
            background: 'var(--bg-elev-3)',
            border: '1px solid var(--border-glass-strong)',
            borderRadius: 24,
            padding: 48,
            maxWidth: 640,
            width: '100%',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.4)',
            color: 'var(--text-primary)',
            textAlign: 'center'
          }}
        >
          {step === 0 && <Slide0 onNext={() => setStep(1)} />}
          {step === 1 && <Slide1 onNext={() => setStep(2)} onBack={() => setStep(0)} />}
          {step === 2 && <Slide2 onNext={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && (
            <Slide3
              onAskAI={(q) => finishAndAsk(q)}
              onOpenApp={(id) => finishAndOpen(id)}
              onFinish={finish}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function Slide0({ onNext }: { onNext: () => void }): JSX.Element {
  return (
    <>
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 24,
          background: 'var(--gradient-aurora)',
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 16px 48px rgba(176, 124, 255, 0.45)'
        }}
      >
        <Sparkles size={48} color="#0b0b14" />
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, margin: '0 0 12px' }}>Benvenuto in Aurora!</h1>
      <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 32px' }}>
        Sono il tuo assistente intelligente.
        <br />
        Ti aiuto a fare tutto sul computer in modo semplice.
      </p>
      <BigBtn label="Iniziamo" onClick={onNext} icon={<Rocket size={18} />} />
    </>
  )
}

function Slide1({ onNext, onBack }: { onNext: () => void; onBack: () => void }): JSX.Element {
  return (
    <>
      <MessageCircle size={64} color="var(--accent-1)" style={{ margin: '0 auto 16px' }} />
      <h2 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 14px' }}>
        Per fare qualsiasi cosa, chiedi a me
      </h2>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 28px' }}>
        Cerca il pulsante <strong>💬 Chiedimi</strong> in alto.
        <br />
        Scrivi quello che vuoi fare, in italiano, normalmente.
      </p>
      <div
        style={{
          background: 'var(--bg-elev-2)',
          border: '1px solid var(--border-glass)',
          borderRadius: 12,
          padding: 18,
          margin: '0 0 28px',
          textAlign: 'left',
          fontSize: 14,
          color: 'var(--text-secondary)',
          lineHeight: 1.8
        }}
      >
        <div>"<em>apri WhatsApp</em>"</div>
        <div>"<em>voglio vedere le foto</em>"</div>
        <div>"<em>scrivi una nota della spesa</em>"</div>
        <div>"<em>installa Spotify</em>"</div>
      </div>
      <BtnRow back={onBack} next={onNext} />
    </>
  )
}

function Slide2({ onNext, onBack }: { onNext: () => void; onBack: () => void }): JSX.Element {
  const setSetting = useSessionStore((s) => s.setSetting)
  const uiScale = useSessionStore((s) => s.settings.uiScale)
  const choices = [
    { v: 1.0, label: 'Normale', sub: 'Standard' },
    { v: 1.15, label: 'Grande', sub: 'Consigliato' },
    { v: 1.3, label: 'Più grande', sub: 'Per leggere meglio' },
    { v: 1.5, label: 'Molto grande', sub: 'Massimo' }
  ]
  return (
    <>
      <Type size={64} color="var(--accent-2)" style={{ margin: '0 0 16px', display: 'inline-block' }} />
      <h2 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 14px' }}>
        Quanto grandi vuoi i testi?
      </h2>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
        Puoi cambiarlo sempre dalle Impostazioni.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 28 }}>
        {choices.map((c) => (
          <button
            key={c.v}
            onClick={() => setSetting('uiScale', c.v)}
            style={{
              padding: 18,
              background: uiScale === c.v ? 'var(--gradient-aurora)' : 'var(--bg-elev-2)',
              border: '1px solid var(--border-glass)',
              borderRadius: 12,
              color: uiScale === c.v ? '#0b0b14' : 'var(--text-primary)',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: 20 * c.v, fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{c.sub}</div>
          </button>
        ))}
      </div>
      <BtnRow back={onBack} next={onNext} />
    </>
  )
}

function Slide3({
  onAskAI,
  onOpenApp,
  onFinish
}: {
  onAskAI: (q: string) => void
  onOpenApp: (id: AppId) => void
  onFinish: () => void
}): JSX.Element {
  return (
    <>
      <h2 style={{ fontSize: 30, fontWeight: 600, margin: '0 0 12px' }}>Tutto pronto!</h2>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: '0 0 28px' }}>
        Cosa vuoi fare per primo?
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        <SuggestionBtn
          label="Apri i miei documenti"
          onClick={() => onOpenApp('files')}
        />
        <SuggestionBtn
          label="Scrivi una nota"
          onClick={() => onOpenApp('notes')}
        />
        <SuggestionBtn
          label="Vedi i programmi"
          onClick={() => onOpenApp('programs')}
        />
        <SuggestionBtn
          label="Chiedi all'AI"
          onClick={() => onAskAI('Cosa puoi fare per me?')}
          accent
        />
      </div>
      <BigBtn label="Inizia a usare Aurora" onClick={onFinish} icon={<Rocket size={18} />} />
    </>
  )
}

function BigBtn({
  label,
  onClick,
  icon
}: {
  label: string
  onClick: () => void
  icon?: JSX.Element
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 28px',
        background: 'var(--gradient-aurora)',
        border: 'none',
        borderRadius: 14,
        color: '#0b0b14',
        fontWeight: 600,
        fontSize: 16,
        cursor: 'pointer',
        boxShadow: '0 12px 28px rgba(176, 124, 255, 0.4)'
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function BtnRow({ back, next }: { back: () => void; next: () => void }): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
      <button
        onClick={back}
        style={{
          padding: '12px 22px',
          background: 'transparent',
          border: '1px solid var(--border-glass-strong)',
          borderRadius: 12,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: 15
        }}
      >
        Indietro
      </button>
      <BigBtn label="Avanti" onClick={next} />
    </div>
  )
}

function SuggestionBtn({
  label,
  onClick,
  accent
}: {
  label: string
  onClick: () => void
  accent?: boolean
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '14px 16px',
        background: accent ? 'var(--gradient-aurora)' : 'var(--bg-elev-2)',
        border: '1px solid var(--border-glass)',
        borderRadius: 12,
        color: accent ? '#0b0b14' : 'var(--text-primary)',
        fontWeight: accent ? 600 : 500,
        cursor: 'pointer',
        fontSize: 15
      }}
    >
      {label}
    </button>
  )
}
