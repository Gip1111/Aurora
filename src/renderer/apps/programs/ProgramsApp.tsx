import { useEffect, useMemo, useState } from 'react'
import { Search, RefreshCw, AppWindow, Sparkles } from 'lucide-react'
import { Button } from '@/design-system/Button'
import { Input } from '@/design-system/Input'
import { useAIStore } from '@/stores/ai'
import type { InstalledApp } from '@shared/types'

export function ProgramsApp(): JSX.Element {
  const [apps, setApps] = useState<InstalledApp[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const setAIOpen = useAIStore((s) => s.setOpen)
  const setAIContext = useAIStore((s) => s.setContext)

  const load = async (force = false): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const list = force
        ? await window.api.programs.refresh()
        : await window.api.programs.list()
      setApps(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(false)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return apps
    return apps.filter((a) => a.name.toLowerCase().includes(q))
  }, [apps, query])

  const launch = async (path: string): Promise<void> => {
    const result = await window.api.programs.launch(path)
    if (!result.ok && result.error) {
      window.api.sys.notify({
        title: 'Errore avvio',
        body: result.error,
        level: 'error'
      })
    }
  }

  const askAIInstall = (): void => {
    setAIContext('')
    setAIOpen(true)
    // Suggerisci all'utente di chiedere "installa <nome>"
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-elev-1)',
        color: 'var(--text-primary)',
        fontSize: 'calc(14px * var(--ui-scale, 1))'
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          gap: 12,
          alignItems: 'center'
        }}
      >
        <Search size={18} color="var(--text-muted)" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca un programma…"
          style={{ flex: 1, fontSize: 'calc(15px * var(--ui-scale, 1))' }}
          autoFocus
        />
        <Button
          variant="ghost"
          size="md"
          icon={<RefreshCw size={16} />}
          onClick={() => void load(true)}
          disabled={loading}
        >
          Aggiorna
        </Button>
        <Button
          variant="aurora"
          size="md"
          icon={<Sparkles size={16} />}
          onClick={askAIInstall}
        >
          Installa nuova app
        </Button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Carico la lista programmi…
          </div>
        )}
        {error && (
          <div
            style={{
              padding: 16,
              background: 'rgba(255, 80, 100, 0.15)',
              border: '1px solid rgba(255, 80, 100, 0.4)',
              borderRadius: 12,
              color: '#ffb3bf'
            }}
          >
            Errore: {error}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            {query ? `Nessun programma trovato per "${query}"` : 'Nessun programma installato trovato.'}
          </div>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 16
          }}
        >
          {filtered.map((app) => (
            <button
              key={app.path}
              onClick={() => void launch(app.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                padding: 14,
                background: 'var(--bg-elev-2)',
                border: '1px solid var(--border-glass)',
                borderRadius: 14,
                cursor: 'pointer',
                transition: 'transform 0.15s ease, background 0.2s ease',
                color: 'var(--text-primary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-elev-3)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-elev-2)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
              title={app.path}
            >
              {app.iconDataUrl ? (
                <img
                  src={app.iconDataUrl}
                  alt=""
                  width={56}
                  height={56}
                  style={{ borderRadius: 8 }}
                />
              ) : (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    background:
                      'linear-gradient(135deg, var(--accent-1) 0%, var(--accent-2) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <AppWindow size={28} color="white" />
                </div>
              )}
              <div
                style={{
                  fontSize: 'calc(13px * var(--ui-scale, 1))',
                  fontWeight: 500,
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%'
                }}
              >
                {app.name}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
