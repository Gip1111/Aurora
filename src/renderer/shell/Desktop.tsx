import { useEffect } from 'react'
import { Wallpaper } from './Wallpaper'
import { Taskbar } from './Taskbar'
import { Dock } from './Dock'
import { AppLauncher } from './AppLauncher'
import { NotificationCenter } from './NotificationCenter'
import { WindowManager } from './WindowManager'
import { ContextMenu } from './ContextMenu'
import { QuickSettings } from './QuickSettings'
import { ActivitiesOverview } from './ActivitiesOverview'
import { Welcome } from './Welcome'
import { SessionPersistence } from './SessionPersistence'
import { SnapHint } from './SnapHint'
import { DesktopHub } from './DesktopHub'
import { DesktopIcons } from './DesktopIcons'
import { DesktopContextMenu } from './DesktopContextMenu'
import { AIOverlay } from '@/ai/AIOverlay'
import { AISidebar } from '@/ai/AISidebar'
import { AIBubble } from '@/ai/AIBubble'
import { AIOrb } from '@/ai/AIOrb'
import { useAIStore } from '@/stores/ai'
import { useShellStore } from '@/stores/shell'
import { useSessionStore } from '@/stores/session'
import { useWindowsStore } from '@/stores/windows'
import { setupAIBridge } from '@/ai/aiBridge'
import { useNotificationsStore } from '@/stores/notifications'

const TASKBAR_HEIGHT = 44
const DOCK_HEIGHT = 88

export function Desktop(): JSX.Element {
  const toggleAI = useAIStore((s) => s.toggle)
  const setLauncher = useShellStore((s) => s.setLauncherOpen)
  const setOverview = useShellStore((s) => s.setOverviewOpen)
  const setQuickSettings = useShellStore((s) => s.setQuickSettingsOpen)
  const setSidebar = useAIStore((s) => s.setSidebar)
  const setHealth = useAIStore((s) => s.setHealth)
  const closeAllShell = useShellStore((s) => s.closeAll)
  const setAIOpen = useAIStore((s) => s.setOpen)
  const openrouterApiKey = useSessionStore((s) => s.settings.openrouterApiKey)
  const userId = useSessionStore((s) => s.user?.id)

  useEffect(() => {
    const cleanup = setupAIBridge()
    return cleanup
  }, [])

  // Hydrate AI conversation history for this user
  useEffect(() => {
    if (userId) {
      void useAIStore.getState().hydrate(userId)
    }
  }, [userId])

  // Auto-persist AI messages when they change
  useEffect(() => {
    if (!userId) return
    const unsub = useAIStore.subscribe((state, prev) => {
      if (state.messages !== prev.messages && state.messages.length > 0) {
        state.persist(userId)
      }
    })
    return unsub
  }, [userId])

  // Tray "💬 Chiedimi" → open AI overlay
  useEffect(() => {
    const off = window.api.window.onOpenAI(() => setAIOpen(true))
    return off
  }, [setAIOpen])

  // Auto-update notifications
  useEffect(() => {
    const push = useNotificationsStore.getState().push
    const offAvail = window.api.window.onUpdateAvailable((info) => {
      push({
        title: 'Aggiornamento disponibile',
        body: `Aurora ${info.version} sarà installata in background.`,
        level: 'info'
      })
    })
    const offDone = window.api.window.onUpdateDownloaded((info) => {
      push({
        title: 'Aggiornamento pronto',
        body: `Aurora ${info.version} si installerà al prossimo riavvio.`,
        level: 'success'
      })
    })
    return () => {
      offAvail()
      offDone()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      // AI overlay
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        toggleAI()
        return
      }
      // App launcher
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault()
        setLauncher(true)
        return
      }
      // AI sidebar
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setSidebar(true)
        return
      }
      // Activities overview
      if (e.key === 'F3') {
        e.preventDefault()
        setOverview(true)
        return
      }
      // Escape closes everything
      if (e.key === 'Escape') {
        closeAllShell()
        setAIOpen(false)
        return
      }

      // Window snap with Meta (Win key) + arrows
      if (e.metaKey || (e.altKey && e.shiftKey)) {
        const wins = useWindowsStore.getState().windows
        const top = [...wins].sort((a, b) => b.z - a.z).find((w) => !w.minimized)
        if (!top) return
        const screenW = window.innerWidth
        const screenH = window.innerHeight - TASKBAR_HEIGHT - DOCK_HEIGHT
        const top0 = TASKBAR_HEIGHT
        const { resize, move, toggleMaximize } = useWindowsStore.getState()
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          if (top.maximized) toggleMaximize(top.id)
          move(top.id, 0, top0)
          resize(top.id, Math.floor(screenW / 2), screenH)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          if (top.maximized) toggleMaximize(top.id)
          move(top.id, Math.floor(screenW / 2), top0)
          resize(top.id, Math.floor(screenW / 2), screenH)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (!top.maximized) toggleMaximize(top.id)
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          if (top.maximized) toggleMaximize(top.id)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleAI, setLauncher, setSidebar, setOverview, closeAllShell, setAIOpen])

  useEffect(() => {
    let mounted = true
    const check = async (): Promise<void> => {
      try {
        if (!openrouterApiKey) {
          if (mounted) setHealth('down')
          return
        }
        const ok = await window.api.openrouter.health(openrouterApiKey)
        if (mounted) setHealth(ok ? 'ok' : 'down')
      } catch {
        if (mounted) setHealth('down')
      }
    }
    void check()
    const i = setInterval(() => void check(), 15_000)
    return () => {
      mounted = false
      clearInterval(i)
    }
  }, [openrouterApiKey, setHealth])

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <Wallpaper />
      {/* Invisible background layer that captures right-click on the desktop */}
      <div
        data-desktop-bg
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1
        }}
      />
      <DesktopHub />
      <DesktopIcons />
      <Taskbar />
      <WindowManager />
      <Dock />
      <AppLauncher />
      <NotificationCenter />
      <AIOrb />
      <AIOverlay />
      <AISidebar />
      <ContextMenu />
      <DesktopContextMenu />
      <AIBubble />
      <QuickSettings />
      <ActivitiesOverview />
      <Welcome />
      <SnapHint />
      <SessionPersistence />
    </div>
  )
}

// Re-export for QuickSettings power button
export { TASKBAR_HEIGHT as DESKTOP_TASKBAR_HEIGHT, DOCK_HEIGHT as DESKTOP_DOCK_HEIGHT }
