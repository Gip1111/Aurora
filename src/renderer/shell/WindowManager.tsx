import { AnimatePresence } from 'framer-motion'
import { Window } from '@/design-system/Window'
import { useWindowsStore } from '@/stores/windows'
import { lazy, Suspense } from 'react'
import type { AppId } from '@shared/types'

const APP_COMPONENTS: Record<AppId, React.LazyExoticComponent<React.ComponentType<{ winId: string }>>> = {
  files: lazy(() => import('@/apps/files/FilesApp').then((m) => ({ default: m.FilesApp }))),
  notes: lazy(() => import('@/apps/notes/NotesApp').then((m) => ({ default: m.NotesApp }))),
  calculator: lazy(() => import('@/apps/calculator/CalculatorApp').then((m) => ({ default: m.CalculatorApp }))),
  programs: lazy(() => import('@/apps/programs/ProgramsApp').then((m) => ({ default: m.ProgramsApp }))),
  trash: lazy(() => import('@/apps/trash/TrashApp').then((m) => ({ default: m.TrashApp }))),
  settings: lazy(() => import('@/apps/settings/SettingsApp').then((m) => ({ default: m.SettingsApp })))
}

export function WindowManager(): JSX.Element {
  const windows = useWindowsStore((s) => s.windows)
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      <AnimatePresence>
        {windows
          .filter((w) => !w.minimized)
          .map((w) => {
            const Comp = APP_COMPONENTS[w.appId]
            return (
              <div key={w.id} style={{ pointerEvents: 'auto' }}>
                <Window win={w}>
                  <Suspense
                    fallback={
                      <div
                        style={{
                          height: '100%',
                          display: 'grid',
                          placeItems: 'center',
                          color: 'var(--text-muted)'
                        }}
                      >
                        Caricamento…
                      </div>
                    }
                  >
                    <Comp winId={w.id} />
                  </Suspense>
                </Window>
              </div>
            )
          })}
      </AnimatePresence>
    </div>
  )
}
