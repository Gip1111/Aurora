import { useEffect, useState, useCallback } from 'react'
import { Trash2, RotateCcw, X, AlertTriangle } from 'lucide-react'
import { Button } from '@/design-system/Button'

interface TrashItem {
  name: string
  path: string
  originalPath: string
  trashedAt: number
  size: number
  isDirectory: boolean
}

const formatBytes = (b: number): string => {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB'
  return (b / 1024 / 1024 / 1024).toFixed(1) + ' GB'
}

const formatDate = (ts: number): string => {
  const d = new Date(ts)
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function TrashApp(): JSX.Element {
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const list = await window.api.fs.trashList()
      setItems(list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const restore = async (item: TrashItem): Promise<void> => {
    if (!item.originalPath) {
      window.api.sys.notify({
        title: 'Origine sconosciuta',
        body: `Non so dove ripristinare "${item.name}". Spostalo manualmente da Documenti.`,
        level: 'warning'
      })
      return
    }
    const r = await window.api.fs.trashRestore(item.path)
    if (r.ok) {
      window.api.sys.notify({
        title: 'Ripristinato',
        body: `${item.name} → ${item.originalPath}`,
        level: 'success'
      })
      await reload()
    } else {
      window.api.sys.notify({
        title: 'Errore',
        body: r.error || 'Ripristino fallito',
        level: 'error'
      })
    }
  }

  const deleteForever = async (item: TrashItem): Promise<void> => {
    if (!confirm(`Eliminare definitivamente "${item.name}"? Non sarà più recuperabile.`)) return
    await window.api.fs.trashDelete(item.path)
    await reload()
  }

  const emptyAll = async (): Promise<void> => {
    if (items.length === 0) return
    if (!confirm(`Svuotare il cestino? Verranno eliminati definitivamente ${items.length} elementi.`)) return
    await window.api.fs.trashEmpty()
    await reload()
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
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}
      >
        <Trash2 size={20} color="var(--accent-3)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 'calc(16px * var(--ui-scale, 1))', fontWeight: 600 }}>Cestino</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {items.length} {items.length === 1 ? 'elemento' : 'elementi'}
          </div>
        </div>
        <Button
          variant="glass"
          icon={<Trash2 size={16} />}
          onClick={emptyAll}
          disabled={items.length === 0}
        >
          Svuota cestino
        </Button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Caricamento…
          </div>
        )}
        {!loading && items.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 60,
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}
          >
            <Trash2 size={48} color="var(--text-muted)" opacity={0.4} />
            <div>Il cestino è vuoto</div>
          </div>
        )}
        {!loading &&
          items.map((item) => (
            <div
              key={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: 14,
                marginBottom: 8,
                background: 'var(--bg-elev-2)',
                border: '1px solid var(--border-glass)',
                borderRadius: 12
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: item.isDirectory
                    ? 'rgba(79, 214, 255, 0.15)'
                    : 'rgba(176, 124, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Trash2 size={20} color="var(--text-muted)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 'calc(14px * var(--ui-scale, 1))',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {item.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={item.originalPath || 'Origine sconosciuta'}
                >
                  {item.originalPath || (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={11} /> Origine sconosciuta
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Eliminato il {formatDate(item.trashedAt)} · {formatBytes(item.size)}
                </div>
              </div>
              <Button
                variant="glass"
                size="sm"
                icon={<RotateCcw size={14} />}
                onClick={() => void restore(item)}
                disabled={!item.originalPath}
                title={item.originalPath ? 'Ripristina nella cartella originale' : 'Origine sconosciuta'}
              >
                Ripristina
              </Button>
              <button
                onClick={() => void deleteForever(item)}
                title="Elimina definitivamente"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid var(--border-glass)',
                  color: '#ff8080',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 80, 80, 0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <X size={16} />
              </button>
            </div>
          ))}
      </div>
    </div>
  )
}
