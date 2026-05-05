import { create } from 'zustand'
import type { AppId } from '@shared/types'

export interface WindowState {
  id: string
  appId: AppId
  title: string
  x: number
  y: number
  width: number
  height: number
  z: number
  minimized: boolean
  maximized: boolean
  payload?: Record<string, unknown>
}

interface WindowsStore {
  windows: WindowState[]
  topZ: number
  open: (appId: AppId, opts?: Partial<Omit<WindowState, 'id' | 'appId' | 'z'>>) => string
  close: (id: string) => void
  closeApp: (appId: AppId) => void
  focus: (id: string) => void
  minimize: (id: string) => void
  toggleMaximize: (id: string) => void
  move: (id: string, x: number, y: number) => void
  resize: (id: string, w: number, h: number) => void
  byApp: (appId: AppId) => WindowState[]
  /** Replace current windows with snapshot entries (used at login). */
  restore: (snap: { windows: Array<Omit<WindowState, 'id' | 'z' | 'title'>> }) => void
  /** Remove all windows (used at logout). */
  clear: () => void
}

const APP_TITLE: Record<AppId, string> = {
  files: 'Documenti',
  notes: 'Note',
  calculator: 'Calcolatrice',
  programs: 'Programmi',
  trash: 'Cestino',
  settings: 'Impostazioni'
}

export const DEFAULT_GEOMETRY = (appId: AppId): Pick<WindowState, 'width' | 'height'> => {
  switch (appId) {
    case 'calculator':
      return { width: 360, height: 540 }
    case 'settings':
      return { width: 940, height: 660 }
    case 'notes':
      return { width: 980, height: 660 }
    case 'programs':
      return { width: 1000, height: 680 }
    default:
      return { width: 960, height: 640 }
  }
}

export const useWindowsStore = create<WindowsStore>((set, get) => ({
  windows: [],
  topZ: 100,
  open: (appId, opts) => {
    const id = `${appId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
    const z = get().topZ + 1
    const dim = DEFAULT_GEOMETRY(appId)
    const offset = (get().windows.length % 6) * 24
    const win: WindowState = {
      id,
      appId,
      title: APP_TITLE[appId],
      x: 120 + offset,
      y: 80 + offset,
      width: dim.width,
      height: dim.height,
      z,
      minimized: false,
      maximized: false,
      ...opts
    }
    set({ windows: [...get().windows, win], topZ: z })
    return id
  },
  close: (id) => set({ windows: get().windows.filter((w) => w.id !== id) }),
  closeApp: (appId) => set({ windows: get().windows.filter((w) => w.appId !== appId) }),
  focus: (id) => {
    const z = get().topZ + 1
    set({
      topZ: z,
      windows: get().windows.map((w) =>
        w.id === id ? { ...w, z, minimized: false } : w
      )
    })
  },
  minimize: (id) =>
    set({
      windows: get().windows.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w))
    }),
  toggleMaximize: (id) =>
    set({
      windows: get().windows.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w))
    }),
  move: (id, x, y) =>
    set({ windows: get().windows.map((w) => (w.id === id ? { ...w, x, y } : w)) }),
  resize: (id, width, height) =>
    set({
      windows: get().windows.map((w) => (w.id === id ? { ...w, width, height } : w))
    }),
  byApp: (appId) => get().windows.filter((w) => w.appId === appId),
  restore: (snap) => {
    if (!snap?.windows?.length) return
    let z = get().topZ
    const restored: WindowState[] = snap.windows.map((w) => {
      z += 1
      return {
        ...w,
        id: `${w.appId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        title: APP_TITLE[w.appId] ?? w.appId,
        z
      }
    })
    set({ windows: restored, topZ: z })
  },
  clear: () => set({ windows: [], topZ: 100 })
}))
