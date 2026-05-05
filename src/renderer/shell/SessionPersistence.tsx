import { useEffect, useRef } from 'react'
import { useSessionStore } from '@/stores/session'
import { useWindowsStore } from '@/stores/windows'
import type { SessionSnapshot } from '@shared/types'

/**
 * Headless component that:
 *  - On login (user becomes non-null) → load snapshot and restore windows
 *  - On any windows[] change → debounced save to disk via IPC
 *  - On logout → clear windows and stop saving
 *
 * Skips the special "guest" user (we don't persist guest sessions).
 */
export function SessionPersistence(): null {
  const userId = useSessionStore((s) => s.user?.id ?? null)
  const restore = useWindowsStore((s) => s.restore)
  const clear = useWindowsStore((s) => s.clear)
  const lastUserRef = useRef<string | null>(null)
  const initialLoadRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load snapshot on user change
  useEffect(() => {
    if (userId === lastUserRef.current) return
    lastUserRef.current = userId
    initialLoadRef.current = false
    if (!userId) {
      clear()
      return
    }
    if (userId === 'guest') {
      initialLoadRef.current = true
      return
    }
    void window.api.sessionState.load(userId).then((snap) => {
      if (snap?.windows?.length) restore(snap)
      initialLoadRef.current = true
    })
  }, [userId, restore, clear])

  // Subscribe to windows changes and debounce save
  useEffect(() => {
    if (!userId || userId === 'guest') return
    const unsub = useWindowsStore.subscribe((state) => {
      if (!initialLoadRef.current) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const snap: SessionSnapshot = {
          windows: state.windows.map((w) => ({
            appId: w.appId,
            x: w.x,
            y: w.y,
            width: w.width,
            height: w.height,
            maximized: w.maximized,
            minimized: w.minimized,
            payload: w.payload
          })),
          lastUpdated: Date.now()
        }
        void window.api.sessionState.save(userId, snap)
      }, 500)
    })
    return () => {
      unsub()
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [userId])

  return null
}
