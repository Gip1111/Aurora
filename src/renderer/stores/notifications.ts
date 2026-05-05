import { create } from 'zustand'
import type { NotificationPayload } from '@shared/types'
import { play, type SoundName } from '@/lib/sounds'

export interface ToastNotification extends NotificationPayload {
  id: string
  createdAt: number
  read: boolean
}

interface NotificationsStore {
  toasts: ToastNotification[]
  open: boolean
  push: (n: NotificationPayload) => string
  dismiss: (id: string) => void
  clearAll: () => void
  markAllRead: () => void
  setOpen: (open: boolean) => void
}

export const useNotificationsStore = create<NotificationsStore>((set, get) => ({
  toasts: [],
  open: false,
  push: (n) => {
    const id = n.id ?? Math.random().toString(36).slice(2)
    const toast: ToastNotification = {
      ...n,
      id,
      createdAt: Date.now(),
      read: false
    }
    set({ toasts: [toast, ...get().toasts].slice(0, 50) })
    // Play UI sound based on level (gated by settings.uiSounds inside play())
    const sound: SoundName =
      n.level === 'error' ? 'error' : n.level === 'success' ? 'success' : 'notify'
    play(sound)
    return id
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  clearAll: () => set({ toasts: [] }),
  markAllRead: () =>
    set({ toasts: get().toasts.map((t) => ({ ...t, read: true })) }),
  setOpen: (open) => set({ open })
}))
