import { create } from 'zustand'
import type { DesktopIcon } from '@shared/types'

const STORAGE_KEY = 'aurora:desktop-icons'

interface DesktopIconsStore {
  icons: DesktopIcon[]
  /** True after first load from localStorage – avoids overwriting persisted state on mount. */
  loaded: boolean
  add: (icon: Omit<DesktopIcon, 'id'>) => string
  remove: (id: string) => void
  move: (id: string, x: number, y: number) => void
  rename: (id: string, label: string) => void
  load: () => void
}

function readStorage(): DesktopIcon[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStorage(icons: DesktopIcon[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(icons))
  } catch {
    /* ignore */
  }
}

const newId = (): string => Math.random().toString(36).slice(2, 9)

export const useDesktopIconsStore = create<DesktopIconsStore>((set, get) => ({
  icons: [],
  loaded: false,
  load: () => {
    if (get().loaded) return
    set({ icons: readStorage(), loaded: true })
  },
  add: (icon) => {
    const id = newId()
    const next = [...get().icons, { ...icon, id }]
    set({ icons: next })
    writeStorage(next)
    return id
  },
  remove: (id) => {
    const next = get().icons.filter((i) => i.id !== id)
    set({ icons: next })
    writeStorage(next)
  },
  move: (id, x, y) => {
    const next = get().icons.map((i) => (i.id === id ? { ...i, x, y } : i))
    set({ icons: next })
    writeStorage(next)
  },
  rename: (id, label) => {
    const next = get().icons.map((i) => (i.id === id ? { ...i, label } : i))
    set({ icons: next })
    writeStorage(next)
  }
}))
