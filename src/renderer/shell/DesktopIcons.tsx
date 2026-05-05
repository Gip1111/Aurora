import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Folder,
  FileText,
  AppWindow,
  Image as ImageIcon,
  Music,
  Video,
  Trash2,
  Edit2
} from 'lucide-react'
import { useDesktopIconsStore } from '@/stores/desktopIcons'
import type { DesktopIcon } from '@shared/types'

const ICON_SIZE = 84
const TASKBAR_HEIGHT = 44
const DOCK_HEIGHT = 100

function pickIcon(icon: DesktopIcon): JSX.Element {
  if (icon.emoji) {
    return <span style={{ fontSize: 36 }}>{icon.emoji}</span>
  }
  if (icon.kind === 'folder') {
    return <Folder size={42} color="#4fd6ff" fill="rgba(79,214,255,0.18)" />
  }
  if (icon.kind === 'program') {
    return <AppWindow size={40} color="white" strokeWidth={2.2} />
  }
  // file: pick by extension
  const ext = icon.target.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext))
    return <ImageIcon size={40} color="#ff6cc4" />
  if (['mp3', 'wav', 'flac', 'm4a', 'ogg'].includes(ext))
    return <Music size={40} color="#b07cff" />
  if (['mp4', 'mov', 'mkv', 'webm', 'avi'].includes(ext))
    return <Video size={40} color="#6affb1" />
  return <FileText size={40} color="#cccfd9" />
}

function programIconCache(): Map<string, string> {
  return new Map()
}

export function DesktopIcons(): JSX.Element {
  const icons = useDesktopIconsStore((s) => s.icons)
  const move = useDesktopIconsStore((s) => s.move)
  const remove = useDesktopIconsStore((s) => s.remove)
  const rename = useDesktopIconsStore((s) => s.rename)
  const load = useDesktopIconsStore((s) => s.load)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    icon: DesktopIcon
  } | null>(null)
  const [iconUrls, setIconUrls] = useState<Map<string, string>>(programIconCache)
  const dragRef = useRef<{
    id: string
    startX: number
    startY: number
    pointerStartX: number
    pointerStartY: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    load()
  }, [load])

  // Lazy-load OS-extracted icons for "program" entries (one per path).
  useEffect(() => {
    let cancelled = false
    const programs = icons.filter((i) => i.kind === 'program')
    for (const p of programs) {
      if (iconUrls.has(p.target)) continue
      void window.api.programs.getIcon?.(p.target).then((url) => {
        if (cancelled || !url) return
        setIconUrls((prev) => {
          if (prev.has(p.target)) return prev
          const next = new Map(prev)
          next.set(p.target, url)
          return next
        })
      })
    }
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [icons])

  const open = async (icon: DesktopIcon): Promise<void> => {
    if (icon.kind === 'program') {
      void window.api.programs.launch(icon.target)
    } else if (icon.kind === 'folder' || icon.kind === 'file') {
      void window.api.sys.openPath(icon.target)
    }
  }

  const onPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    icon: DesktopIcon
  ): void => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelectedId(icon.id)
    dragRef.current = {
      id: icon.id,
      startX: icon.x,
      startY: icon.y,
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      moved: false
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.pointerStartX
    const dy = e.clientY - dragRef.current.pointerStartY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true
    if (!dragRef.current.moved) return
    const nx = clamp(
      dragRef.current.startX + dx,
      4,
      window.innerWidth - ICON_SIZE - 4
    )
    const ny = clamp(
      dragRef.current.startY + dy,
      TASKBAR_HEIGHT + 4,
      window.innerHeight - ICON_SIZE - DOCK_HEIGHT - 4
    )
    move(dragRef.current.id, nx, ny)
  }

  const onPointerUp = (
    e: React.PointerEvent<HTMLDivElement>,
    icon: DesktopIcon
  ): void => {
    if (!dragRef.current) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    const wasClick = !dragRef.current.moved
    dragRef.current = null
    if (wasClick) {
      // Double-click would also be desirable; we open on single because the
      // user might be older. The icon stays selected so multi-click works.
      void open(icon)
    } else {
      // Snap to coarse grid for visual order
      const grid = 12
      const snappedX = Math.round(icon.x / grid) * grid
      const snappedY = Math.round(icon.y / grid) * grid
      move(icon.id, snappedX, snappedY)
    }
  }

  const onContext = (e: React.MouseEvent, icon: DesktopIcon): void => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, icon })
  }

  return (
    <div
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      onClick={() => {
        setSelectedId(null)
        setContextMenu(null)
      }}
    >
      {icons.map((icon) => {
        const url = icon.kind === 'program' ? iconUrls.get(icon.target) : undefined
        const selected = selectedId === icon.id
        return (
          <motion.div
            key={icon.id}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onPointerDown={(e) => onPointerDown(e, icon)}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => onPointerUp(e, icon)}
            onContextMenu={(e) => onContext(e, icon)}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: icon.x,
              top: icon.y,
              width: ICON_SIZE,
              height: ICON_SIZE + 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: 6,
              borderRadius: 12,
              cursor: 'pointer',
              pointerEvents: 'auto',
              userSelect: 'none',
              background: selected ? 'rgba(176, 124, 255, 0.22)' : 'transparent',
              border: '1.5px solid ' + (selected ? 'rgba(176,124,255,0.6)' : 'transparent'),
              transition: 'background 0.15s, border-color 0.15s'
            }}
            title={icon.target}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background:
                  icon.kind === 'program'
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))'
                    : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow:
                  icon.kind === 'program' ? '0 4px 16px rgba(0,0,0,0.25)' : 'none'
              }}
            >
              {url ? (
                <img src={url} alt="" width={48} height={48} style={{ borderRadius: 8 }} />
              ) : (
                pickIcon(icon)
              )}
            </div>
            <div
              style={{
                fontSize: 'calc(11.5px * var(--ui-scale, 1))',
                color: 'white',
                textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                textAlign: 'center',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 500
              }}
            >
              {icon.label}
            </div>
          </motion.div>
        )
      })}

      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--bg-elev-3)',
            backdropFilter: 'blur(40px) saturate(160%)',
            WebkitBackdropFilter: 'blur(40px) saturate(160%)',
            border: '1px solid var(--border-glass-strong)',
            borderRadius: 12,
            padding: 6,
            minWidth: 180,
            zIndex: 9999,
            boxShadow: '0 12px 48px rgba(0,0,0,0.45)',
            pointerEvents: 'auto'
          }}
        >
          <ContextItem
            icon={<AppWindow size={14} color="var(--accent-2)" />}
            label="Apri"
            onClick={() => {
              void open(contextMenu.icon)
              setContextMenu(null)
            }}
          />
          <ContextItem
            icon={<Edit2 size={14} />}
            label="Rinomina"
            onClick={() => {
              const newName = prompt('Nuovo nome:', contextMenu.icon.label)
              if (newName?.trim()) rename(contextMenu.icon.id, newName.trim())
              setContextMenu(null)
            }}
          />
          <div style={{ height: 1, background: 'var(--border-glass)', margin: '4px 0' }} />
          <ContextItem
            icon={<Trash2 size={14} color="#ff8080" />}
            label="Rimuovi dal desktop"
            danger
            onClick={() => {
              remove(contextMenu.icon.id)
              setContextMenu(null)
            }}
          />
        </div>
      )}
    </div>
  )
}

function ContextItem({
  icon,
  label,
  onClick,
  danger
}: {
  icon: JSX.Element
  label: string
  onClick: () => void
  danger?: boolean
}): JSX.Element {
  return (
    <button
      onClick={onClick}
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
        cursor: 'pointer',
        color: danger ? '#ff8080' : 'var(--text-primary)',
        fontSize: 13
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elev-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}
      {label}
    </button>
  )
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}
