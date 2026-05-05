import { useEffect, useState } from 'react'
import { Sparkles, Copy, ClipboardPaste } from 'lucide-react'
import { useAIStore } from '@/stores/ai'

interface MenuPos {
  x: number
  y: number
  selectedText: string
}

/**
 * Global right-click context menu. Apps that want their own custom menu can
 * stopPropagation on contextmenu themselves (FilesApp does this).
 */
export function ContextMenu(): JSX.Element | null {
  const [pos, setPos] = useState<MenuPos | null>(null)
  const setAIOpen = useAIStore((s) => s.setOpen)
  const setAIContext = useAIStore((s) => s.setContext)

  useEffect(() => {
    const onContextMenu = (e: MouseEvent): void => {
      // Avoid showing for inputs/textareas (use the browser default)
      const target = e.target as HTMLElement
      if (target?.closest('input, textarea, [contenteditable="true"]')) return
      e.preventDefault()
      const sel = window.getSelection()?.toString().trim() || ''
      setPos({ x: e.clientX, y: e.clientY, selectedText: sel })
    }
    const onClick = (): void => setPos(null)
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setPos(null)
    }
    window.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('click', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  if (!pos) return null

  const askAI = (): void => {
    if (pos.selectedText) {
      setAIContext(`Testo selezionato:\n"${pos.selectedText}"\n\nIstruzione:`)
    } else {
      setAIContext(null)
    }
    setAIOpen(true)
    setPos(null)
  }

  const doCopy = async (): Promise<void> => {
    if (pos.selectedText) await navigator.clipboard.writeText(pos.selectedText)
    setPos(null)
  }

  const doPaste = async (): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText()
      const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        const start = active.selectionStart ?? active.value.length
        const end = active.selectionEnd ?? active.value.length
        active.value = active.value.slice(0, start) + text + active.value.slice(end)
      }
    } catch {
      /* clipboard denied */
    }
    setPos(null)
  }

  return (
    <div
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
        minWidth: 220,
        zIndex: 9999,
        boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
        color: 'var(--text-primary)',
        fontSize: 14
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Item icon={<Sparkles size={16} color="var(--accent-1)" />} label="Chiedi all'AI…" onClick={askAI} accent />
      {pos.selectedText && <Item icon={<Copy size={16} />} label="Copia" onClick={doCopy} />}
      <Item icon={<ClipboardPaste size={16} />} label="Incolla" onClick={doPaste} />
    </div>
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
        padding: '10px 14px',
        width: '100%',
        background: 'transparent',
        border: 'none',
        borderRadius: 8,
        textAlign: 'left',
        cursor: 'pointer',
        color: 'var(--text-primary)',
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
