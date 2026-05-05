import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Trash2, FileText, Sparkles } from 'lucide-react'
import { Button } from '@/design-system/Button'
import { useAIStore } from '@/stores/ai'
import type { FileEntry } from '@shared/types'

const FOLDER_NAME = 'Aurora Note'
const SAVE_DEBOUNCE_MS = 800

interface Note {
  path: string
  title: string
  modified: number
  content: string
  loaded: boolean
}

function titleFromContent(content: string, fallback: string): string {
  const firstLine = content.split('\n').find((l) => l.trim().length > 0)
  if (firstLine) return firstLine.slice(0, 60)
  return fallback
}

function safeFilename(title: string): string {
  const cleaned = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim()
  return (cleaned || `nota-${Date.now()}`).slice(0, 80) + '.txt'
}

export function NotesApp(): JSX.Element {
  const [folder, setFolder] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [draftContent, setDraftContent] = useState('')
  const setAIOpen = useAIStore((s) => s.setOpen)
  const setAIContext = useAIStore((s) => s.setContext)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reloadNotes = useCallback(async (folderPath: string) => {
    try {
      const entries = await window.api.fs.list(folderPath)
      const txtFiles = entries.filter(
        (e: FileEntry) => !e.isDirectory && e.name.toLowerCase().endsWith('.txt')
      )
      txtFiles.sort((a, b) => b.modified - a.modified)
      setNotes(
        txtFiles.map((e) => ({
          path: e.path,
          title: e.name.replace(/\.txt$/i, ''),
          modified: e.modified,
          content: '',
          loaded: false
        }))
      )
    } catch {
      setNotes([])
    }
  }, [])

  useEffect(() => {
    void (async () => {
      const docs = await window.api.fs.docs()
      const target = `${docs}\\${FOLDER_NAME}`
      try {
        await window.api.fs.mkdir(target)
      } catch {
        /* ignore */
      }
      setFolder(target)
      await reloadNotes(target)
    })()
  }, [reloadNotes])

  const loadNote = useCallback(
    async (idx: number) => {
      const n = notes[idx]
      if (!n) return
      if (!n.loaded) {
        try {
          const content = await window.api.fs.read(n.path)
          setNotes((prev) => {
            const next = [...prev]
            next[idx] = { ...next[idx], content, loaded: true }
            return next
          })
          setDraftContent(content)
        } catch {
          setDraftContent('')
        }
      } else {
        setDraftContent(n.content)
      }
      setActiveIdx(idx)
    },
    [notes]
  )

  const createNote = useCallback(async () => {
    if (!folder) return
    const name = `nota-${Date.now()}.txt`
    const path = `${folder}\\${name}`
    await window.api.fs.write(path, '')
    await reloadNotes(folder)
    setActiveIdx(0)
    setDraftContent('')
  }, [folder, reloadNotes])

  const deleteActive = useCallback(async () => {
    if (activeIdx === null) return
    const n = notes[activeIdx]
    if (!n) return
    if (!confirm(`Eliminare la nota "${n.title}"?`)) return
    await window.api.fs.trash(n.path)
    if (folder) await reloadNotes(folder)
    setActiveIdx(null)
    setDraftContent('')
  }, [activeIdx, notes, folder, reloadNotes])

  // Debounced auto-save + rename file when first line changes (keeps title in filename)
  useEffect(() => {
    if (activeIdx === null) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const n = notes[activeIdx]
      if (!n || !folder) return
      const newTitle = titleFromContent(draftContent, n.title)
      const desiredName = safeFilename(newTitle)
      const newPath = `${folder}\\${desiredName}`
      try {
        if (newPath !== n.path) {
          await window.api.fs.write(newPath, draftContent)
          await window.api.fs.trash(n.path)
          await reloadNotes(folder)
          // try to keep selection on same content
          setActiveIdx(0)
        } else {
          await window.api.fs.write(n.path, draftContent)
          setNotes((prev) => {
            const next = [...prev]
            next[activeIdx] = {
              ...next[activeIdx],
              content: draftContent,
              modified: Date.now(),
              loaded: true
            }
            return next
          })
        }
      } catch {
        /* ignore save errors */
      }
    }, SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftContent])

  const askAI = (prompt: string): void => {
    setAIContext(`Testo della nota:\n${draftContent}\n\nIstruzione: ${prompt}`)
    setAIOpen(true)
  }

  const active = activeIdx !== null ? notes[activeIdx] : null

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        background: 'var(--bg-elev-1)',
        color: 'var(--text-primary)',
        fontSize: 'calc(14px * var(--ui-scale, 1))'
      }}
    >
      <aside
        style={{
          width: 260,
          borderRight: '1px solid var(--border-glass)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-elev-2)'
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            gap: 8
          }}
        >
          <Button variant="aurora" size="md" icon={<Plus size={16} />} onClick={createNote}>
            Nuova nota
          </Button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notes.length === 0 && (
            <div style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center' }}>
              Nessuna nota. Crea la prima!
            </div>
          )}
          {notes.map((n, i) => (
            <button
              key={n.path}
              onClick={() => loadNote(i)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '12px 14px',
                background: i === activeIdx ? 'var(--bg-elev-3)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border-glass)',
                cursor: 'pointer',
                color: 'var(--text-primary)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 500,
                  marginBottom: 4
                }}
              >
                <FileText size={14} color="var(--accent-2)" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.title}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {new Date(n.modified).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {active ? (
          <>
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--border-glass)',
                display: 'flex',
                gap: 8,
                alignItems: 'center'
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                icon={<Sparkles size={14} />}
                onClick={() => askAI('Riassumi questa nota in poche righe')}
              >
                Riassumi
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Sparkles size={14} />}
                onClick={() => askAI('Riscrivi questa nota in modo più chiaro e ben formattato')}
              >
                Migliora
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Sparkles size={14} />}
                onClick={() => askAI('Continua tu da dove finisce questa nota')}
              >
                Continua
              </Button>
              <div style={{ flex: 1 }} />
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={deleteActive}
              >
                Elimina
              </Button>
            </div>
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="Scrivi qui la tua nota..."
              style={{
                flex: 1,
                width: '100%',
                padding: 24,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: 'calc(16px * var(--ui-scale, 1))',
                lineHeight: 1.6
              }}
              autoFocus
            />
            <div
              style={{
                padding: '6px 16px',
                borderTop: '1px solid var(--border-glass)',
                fontSize: 11,
                color: 'var(--text-muted)'
              }}
            >
              Salvataggio automatico • {draftContent.length} caratteri
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              color: 'var(--text-muted)'
            }}
          >
            <FileText size={64} color="var(--accent-2)" />
            <div style={{ fontSize: 18 }}>Nessuna nota selezionata</div>
            <Button variant="aurora" icon={<Plus size={16} />} onClick={createNote}>
              Crea la tua prima nota
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
