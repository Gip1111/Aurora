import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Folder,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Archive,
  ChevronRight,
  Home,
  Download,
  Image as PicIcon,
  Monitor,
  ArrowLeft,
  Search,
  FolderPlus,
  Trash2,
  Sparkles,
  AlertTriangle
} from 'lucide-react'
import type { FileEntry } from '@shared/types'
import { Button } from '@/design-system/Button'
import { Input } from '@/design-system/Input'
import { useAIStore } from '@/stores/ai'

const formatBytes = (b: number): string => {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB'
  return (b / 1024 / 1024 / 1024).toFixed(1) + ' GB'
}

function iconFor(name: string, isDir: boolean, size = 48): JSX.Element {
  if (isDir) return <Folder size={size} color="#4fd6ff" fill="rgba(79, 214, 255, 0.18)" />
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'].includes(ext))
    return <ImageIcon size={size} color="#ff6cc4" />
  if (['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'].includes(ext))
    return <Music size={size} color="#b07cff" />
  if (['mp4', 'mov', 'mkv', 'webm', 'avi'].includes(ext))
    return <Video size={size} color="#6affb1" />
  if (['zip', '7z', 'rar', 'tar', 'gz'].includes(ext))
    return <Archive size={size} color="#ffb86c" />
  return <FileText size={size} color="#cccfd9" />
}

interface Shortcut {
  key: string
  label: string
  icon: JSX.Element
  load: () => Promise<string>
}

export function FilesApp(): JSX.Element {
  const [home, setHome] = useState<string>('')
  const [path, setPath] = useState<string>('')
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    entry: FileEntry
  } | null>(null)
  const setAIOpen = useAIStore((s) => s.setOpen)
  const setAIContext = useAIStore((s) => s.setContext)

  const shortcuts: Shortcut[] = useMemo(
    () => [
      { key: 'home', label: 'Home', icon: <Home size={20} />, load: () => window.api.fs.home() },
      {
        key: 'docs',
        label: 'Documenti',
        icon: <FileText size={20} />,
        load: () => window.api.fs.docs()
      },
      {
        key: 'pics',
        label: 'Immagini',
        icon: <PicIcon size={20} />,
        load: () => window.api.fs.pictures()
      },
      {
        key: 'dl',
        label: 'Download',
        icon: <Download size={20} />,
        load: () => window.api.fs.downloads()
      },
      {
        key: 'desk',
        label: 'Desktop',
        icon: <Monitor size={20} />,
        load: () => window.api.fs.desktop()
      }
    ],
    []
  )

  const load = useCallback(async (p: string) => {
    setError(null)
    try {
      const list = await window.api.fs.list(p)
      setEntries(list)
      setPath(p)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setEntries([])
      setPath(p)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      const h = await window.api.fs.home()
      const docs = await window.api.fs.docs()
      setHome(h)
      await load(docs)
    })()
  }, [load])

  const navigate = (next: string): void => {
    if (path) setHistory((h) => [...h, path])
    void load(next)
  }

  const goBack = (): void => {
    const h = [...history]
    const last = h.pop()
    if (!last) return
    setHistory(h)
    void load(last)
  }

  const goShortcut = async (s: Shortcut): Promise<void> => {
    const target = await s.load()
    if (path) setHistory((prev) => [...prev, path])
    void load(target)
  }

  const openEntry = async (entry: FileEntry): Promise<void> => {
    if (entry.isDirectory) navigate(entry.path)
    else await window.api.sys.openPath(entry.path)
  }

  const createFolder = async (): Promise<void> => {
    const name = prompt('Nome della nuova cartella:')
    if (!name) return
    const sep = path.includes('\\') ? '\\' : '/'
    const target = path.endsWith(sep) ? path + name : path + sep + name
    try {
      await window.api.fs.mkdir(target)
      await load(path)
    } catch (e) {
      window.api.sys.notify({
        title: 'Impossibile creare la cartella',
        body: e instanceof Error ? e.message : String(e),
        level: 'error'
      })
    }
  }

  const trashEntry = async (entry: FileEntry): Promise<void> => {
    if (!confirm(`Spostare "${entry.name}" nel Cestino?`)) return
    try {
      await window.api.fs.trash(entry.path)
      await load(path)
    } catch (e) {
      window.api.sys.notify({
        title: 'Errore',
        body: e instanceof Error ? e.message : String(e),
        level: 'error'
      })
    }
  }

  const askAI = (entry: FileEntry, prompt: string): void => {
    setAIContext(`File selezionato: ${entry.path}\nIstruzione: ${prompt}`)
    setAIOpen(true)
  }

  // Drag & drop from external (Windows Explorer) → copy into current folder
  const onDrop = async (e: React.DragEvent<HTMLDivElement>): Promise<void> => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    const MAX_BYTES = 100 * 1024 * 1024 // 100 MB
    let copied = 0
    let skipped = 0
    for (const f of files) {
      if (f.size > MAX_BYTES) {
        skipped++
        window.api.sys.notify({
          title: 'File troppo grande',
          body: `${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB): usa Esplora Risorse per copiare file >100 MB.`,
          level: 'warning'
        })
        continue
      }
      try {
        const data = await f.arrayBuffer()
        const sep = path.includes('\\') ? '\\' : '/'
        const target = path.endsWith(sep) ? path + f.name : path + sep + f.name
        await window.api.fs.writeBinary(target, data)
        copied++
      } catch (err) {
        skipped++
        window.api.sys.notify({
          title: 'Errore copia',
          body: `${f.name}: ${err instanceof Error ? err.message : String(err)}`,
          level: 'error'
        })
      }
    }
    if (copied > 0) {
      window.api.sys.notify({
        title: copied === 1 ? 'File copiato' : `${copied} file copiati`,
        body: skipped ? `${skipped} ignorati per errori o dimensione` : undefined,
        level: 'success'
      })
    }
    await load(path)
  }

  const filtered = search.trim()
    ? entries.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : entries

  const isOutsideHome = home && path && !path.startsWith(home) && !path.includes(home)

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        background: 'var(--bg-elev-1)',
        color: 'var(--text-primary)',
        fontSize: 'calc(14px * var(--ui-scale, 1))'
      }}
      onClick={() => setContextMenu(null)}
    >
      <aside
        style={{
          width: 220,
          background: 'var(--bg-elev-2)',
          borderRight: '1px solid var(--border-glass)',
          padding: '16px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}
      >
        <div
          style={{
            padding: '0 16px 12px',
            fontSize: 11,
            color: 'var(--text-muted)',
            letterSpacing: 1,
            textTransform: 'uppercase'
          }}
        >
          Scorciatoie
        </div>
        {shortcuts.map((s) => (
          <button
            key={s.key}
            onClick={() => void goShortcut(s)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontSize: 'calc(14px * var(--ui-scale, 1))',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elev-3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ color: 'var(--accent-2)' }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </aside>

      <main
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-glass)'
          }}
        >
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={goBack}>
            Indietro
          </Button>
          <div
            style={{
              flex: 1,
              padding: '6px 12px',
              background: 'var(--bg-elev-2)',
              borderRadius: 8,
              border: '1px solid var(--border-glass)',
              fontSize: 13,
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <ChevronRight size={14} />
            {path}
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca…"
            style={{ width: 180 }}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<FolderPlus size={16} />}
            onClick={createFolder}
          >
            Nuova cartella
          </Button>
        </div>

        {isOutsideHome && (
          <div
            style={{
              padding: '10px 16px',
              background: 'rgba(255, 184, 108, 0.12)',
              borderBottom: '1px solid rgba(255, 184, 108, 0.35)',
              color: '#ffb86c',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <AlertTriangle size={14} />
            Sei in una zona avanzata del computer.
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void goShortcut(shortcuts[1])}
              style={{ marginLeft: 'auto' }}
            >
              Torna ai Documenti
            </Button>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: 16,
              margin: 16,
              background: 'rgba(255, 80, 100, 0.15)',
              border: '1px solid rgba(255, 80, 100, 0.4)',
              borderRadius: 12,
              color: '#ffb3bf'
            }}
          >
            {error}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 12
            }}
          >
            {filtered.map((entry) => (
              <button
                key={entry.path}
                onDoubleClick={() => void openEntry(entry)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setContextMenu({ x: e.clientX, y: e.clientY, entry })
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: 12,
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 10,
                  cursor: 'pointer',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-elev-2)'
                  e.currentTarget.style.borderColor = 'var(--border-glass)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                }}
                title={entry.name}
              >
                {iconFor(entry.name, entry.isDirectory, 48)}
                <div
                  style={{
                    fontSize: 'calc(12px * var(--ui-scale, 1))',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%'
                  }}
                >
                  {entry.name}
                </div>
              </button>
            ))}
          </div>
          {filtered.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              Cartella vuota.
            </div>
          )}
        </div>

        <div
          style={{
            padding: '6px 16px',
            borderTop: '1px solid var(--border-glass)',
            fontSize: 11,
            color: 'var(--text-muted)'
          }}
        >
          {entries.length} elementi
          {filtered.length !== entries.length && ` • ${filtered.length} mostrati`}
        </div>
      </main>

      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--bg-elev-3)',
            backdropFilter: 'blur(40px) saturate(160%)',
            border: '1px solid var(--border-glass-strong)',
            borderRadius: 10,
            padding: 6,
            minWidth: 200,
            zIndex: 9999,
            boxShadow: '0 12px 48px rgba(0,0,0,0.5)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextItem
            label="Apri"
            onClick={() => {
              void openEntry(contextMenu.entry)
              setContextMenu(null)
            }}
          />
          <ContextItem
            label="Apri con sistema"
            onClick={() => {
              void window.api.sys.openPath(contextMenu.entry.path)
              setContextMenu(null)
            }}
          />
          <ContextItem
            label="Mostra nella cartella"
            onClick={() => {
              void window.api.sys.showInFolder(contextMenu.entry.path)
              setContextMenu(null)
            }}
          />
          <div style={{ height: 1, background: 'var(--border-glass)', margin: '4px 0' }} />
          <ContextItem
            icon={<Sparkles size={14} color="var(--accent-1)" />}
            label="Chiedi all'AI…"
            onClick={() => {
              askAI(contextMenu.entry, 'Cosa posso fare con questo file?')
              setContextMenu(null)
            }}
          />
          <div style={{ height: 1, background: 'var(--border-glass)', margin: '4px 0' }} />
          <ContextItem
            icon={<Trash2 size={14} color="#ff8080" />}
            label="Sposta nel Cestino"
            danger
            onClick={() => {
              void trashEntry(contextMenu.entry)
              setContextMenu(null)
            }}
          />
          <ContextItem
            label={`Dimensione: ${formatBytes(contextMenu.entry.size)}`}
            disabled
          />
        </div>
      )}
    </div>
  )
}

function ContextItem({
  label,
  onClick,
  icon,
  danger,
  disabled
}: {
  label: string
  onClick?: () => void
  icon?: JSX.Element
  danger?: boolean
  disabled?: boolean
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        width: '100%',
        background: 'transparent',
        border: 'none',
        borderRadius: 6,
        textAlign: 'left',
        cursor: disabled ? 'default' : 'pointer',
        color: danger ? '#ff8080' : disabled ? 'var(--text-muted)' : 'var(--text-primary)',
        fontSize: 13
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = 'var(--bg-elev-2)'
      }}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}
      {label}
    </button>
  )
}
