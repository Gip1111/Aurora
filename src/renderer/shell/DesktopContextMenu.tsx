import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderPlus,
  FilePlus,
  AppWindow,
  Image as ImageIcon,
  Sparkles,
  RefreshCw
} from 'lucide-react'
import { useDesktopIconsStore } from '@/stores/desktopIcons'
import { useAIStore } from '@/stores/ai'
import { useNotificationsStore } from '@/stores/notifications'
import { useSessionStore } from '@/stores/session'
import type { InstalledApp } from '@shared/types'

const ICON_SIZE = 84

interface MenuPos {
  x: number
  y: number
  /** Where the new icon will be placed (close to the click point, snapped to grid) */
  iconX: number
  iconY: number
}

/**
 * Right-click on empty desktop area: glass menu with "New folder", "New file",
 * "New program shortcut", "Change wallpaper", "Ask AI". Mounts in Desktop layout.
 */
export function DesktopContextMenu(): JSX.Element {
  const [pos, setPos] = useState<MenuPos | null>(null)
  const [picker, setPicker] = useState<'program' | null>(null)
  const add = useDesktopIconsStore((s) => s.add)
  const setAIOpen = useAIStore((s) => s.setOpen)
  const setAIContext = useAIStore((s) => s.setContext)
  const pushNotif = useNotificationsStore((s) => s.push)
  const setSetting = useSessionStore((s) => s.setSetting)

  useEffect(() => {
    const onContext = (e: MouseEvent): void => {
      // Only fire on the desktop background, not on app windows / dock / taskbar
      const target = e.target as HTMLElement
      if (target.closest('[data-desktop-bg]')) {
        e.preventDefault()
        setPos({
          x: e.clientX,
          y: e.clientY,
          iconX: Math.max(8, e.clientX - ICON_SIZE / 2),
          iconY: Math.max(56, e.clientY - 24)
        })
      }
    }
    const onClick = (): void => setPos(null)
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setPos(null)
        setPicker(null)
      }
    }
    window.addEventListener('contextmenu', onContext)
    window.addEventListener('click', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('contextmenu', onContext)
      window.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const newFolder = async (): Promise<void> => {
    if (!pos) return
    const name = prompt('Nome della nuova cartella:', 'Nuova cartella')
    if (!name?.trim()) return
    try {
      const docs = await window.api.fs.docs()
      const sep = docs.includes('\\') ? '\\' : '/'
      const path = docs + sep + name.trim()
      await window.api.fs.mkdir(path)
      add({ kind: 'folder', label: name.trim(), target: path, x: pos.iconX, y: pos.iconY })
      pushNotif({
        title: 'Cartella creata',
        body: `Aggiunta sul desktop e in Documenti`,
        level: 'success'
      })
    } catch (e) {
      pushNotif({
        title: 'Errore',
        body: e instanceof Error ? e.message : String(e),
        level: 'error'
      })
    }
    setPos(null)
  }

  const newFile = async (): Promise<void> => {
    if (!pos) return
    const name = prompt('Nome del nuovo file (es. nota.txt):', 'nuovo-file.txt')
    if (!name?.trim()) return
    try {
      const docs = await window.api.fs.docs()
      const sep = docs.includes('\\') ? '\\' : '/'
      const path = docs + sep + name.trim()
      await window.api.fs.write(path, '')
      add({ kind: 'file', label: name.trim(), target: path, x: pos.iconX, y: pos.iconY })
      pushNotif({
        title: 'File creato',
        body: 'Aggiunto sul desktop e in Documenti',
        level: 'success'
      })
    } catch (e) {
      pushNotif({
        title: 'Errore',
        body: e instanceof Error ? e.message : String(e),
        level: 'error'
      })
    }
    setPos(null)
  }

  const newProgramShortcut = (): void => {
    setPicker('program')
  }

  const askAI = (): void => {
    setAIContext(null)
    setAIOpen(true)
    setPos(null)
  }

  const changeWallpaper = (): void => {
    // Cycle wallpaper presets quickly via setting toggle
    setSetting('wallpaperImage', '') // clear custom
    pushNotif({
      title: 'Sfondo',
      body: 'Apri Impostazioni → Aspetto per scegliere uno sfondo personalizzato.',
      level: 'info'
    })
    setPos(null)
  }

  const onPickProgram = (app: InstalledApp): void => {
    if (!pos) return
    add({
      kind: 'program',
      label: app.name,
      target: app.path,
      x: pos.iconX,
      y: pos.iconY
    })
    pushNotif({
      title: 'Aggiunto al desktop',
      body: app.name,
      level: 'success'
    })
    setPicker(null)
    setPos(null)
  }

  return (
    <>
      <AnimatePresence>
        {pos && !picker && (
          <motion.div
            key="ctx"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: pos.y,
              left: pos.x,
              background: 'var(--bg-elev-3)',
              backdropFilter: 'blur(40px) saturate(160%)',
              WebkitBackdropFilter: 'blur(40px) saturate(160%)',
              border: '1px solid var(--border-glass-strong)',
              borderRadius: 12,
              padding: 6,
              minWidth: 240,
              zIndex: 9999,
              boxShadow: '0 16px 48px rgba(0,0,0,0.45)'
            }}
          >
            <Item
              icon={<Sparkles size={15} color="var(--accent-1)" />}
              label="💬 Chiedi all'AI"
              onClick={askAI}
              accent
            />
            <Sep />
            <Item
              icon={<FolderPlus size={15} color="var(--accent-2)" />}
              label="Nuova cartella"
              onClick={newFolder}
            />
            <Item
              icon={<FilePlus size={15} color="var(--accent-2)" />}
              label="Nuovo file"
              onClick={newFile}
            />
            <Item
              icon={<AppWindow size={15} color="var(--accent-2)" />}
              label="Aggiungi programma…"
              onClick={newProgramShortcut}
            />
            <Sep />
            <Item
              icon={<ImageIcon size={15} />}
              label="Cambia sfondo"
              onClick={changeWallpaper}
            />
            <Item
              icon={<RefreshCw size={15} />}
              label="Aggiorna"
              onClick={() => {
                setPos(null)
                location.reload()
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {picker === 'program' && pos && (
        <ProgramPicker
          onPick={onPickProgram}
          onClose={() => {
            setPicker(null)
            setPos(null)
          }}
        />
      )}
    </>
  )
}

function Item({
  icon,
  label,
  onClick,
  accent
}: {
  icon: JSX.Element
  label: string
  onClick: () => void
  accent?: boolean
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '9px 12px',
        width: '100%',
        background: 'transparent',
        border: 'none',
        borderRadius: 7,
        textAlign: 'left',
        cursor: 'pointer',
        color: 'var(--text-primary)',
        fontSize: 13,
        fontWeight: accent ? 600 : 400
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elev-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}
      {label}
    </button>
  )
}

function Sep(): JSX.Element {
  return <div style={{ height: 1, background: 'var(--border-glass)', margin: '4px 0' }} />
}

function ProgramPicker({
  onPick,
  onClose
}: {
  onPick: (a: InstalledApp) => void
  onClose: () => void
}): JSX.Element {
  const [apps, setApps] = useState<InstalledApp[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void window.api.programs.list().then((list) => {
      setApps(list)
      setLoading(false)
    })
  }, [])

  const filtered = query
    ? apps.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()))
    : apps

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(12px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-elev-3)',
          border: '1px solid var(--border-glass-strong)',
          borderRadius: 18,
          padding: 18,
          width: 560,
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          color: 'var(--text-primary)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AppWindow size={20} color="var(--accent-2)" />
          <div style={{ fontSize: 17, fontWeight: 600 }}>Scegli un programma</div>
        </div>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca…"
          style={{
            padding: '10px 14px',
            background: 'var(--bg-elev-2)',
            border: '1px solid var(--border-glass)',
            borderRadius: 10,
            color: 'var(--text-primary)',
            fontSize: 14,
            outline: 'none'
          }}
        />
        <div style={{ overflow: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 20, color: 'var(--text-muted)' }}>Carico…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 20, color: 'var(--text-muted)' }}>Nessun risultato.</div>
          ) : (
            filtered.slice(0, 200).map((a) => (
              <button
                key={a.path}
                onClick={() => onPick(a)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: 13
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elev-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {a.iconDataUrl ? (
                  <img src={a.iconDataUrl} alt="" width={28} height={28} style={{ borderRadius: 5 }} />
                ) : (
                  <AppWindow size={20} color="var(--accent-1)" />
                )}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.name}
                </span>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
