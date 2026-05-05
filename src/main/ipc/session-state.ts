import { app, type IpcMain } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { SessionSnapshot } from '@shared/types.js'

function snapshotFile(userId: string): string {
  // Sanitize userId for filename
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return join(app.getPath('userData'), `session-${safe}.json`)
}

export function registerSessionStateIpc(ipcMain: IpcMain): void {
  ipcMain.handle(
    'session-state:save',
    async (_e, userId: string, snapshot: SessionSnapshot): Promise<void> => {
      if (!userId) return
      try {
        await fs.mkdir(app.getPath('userData'), { recursive: true })
        await fs.writeFile(snapshotFile(userId), JSON.stringify(snapshot), 'utf-8')
      } catch {
        // best-effort; never crash the renderer for a save failure
      }
    }
  )

  ipcMain.handle(
    'session-state:load',
    async (_e, userId: string): Promise<SessionSnapshot | null> => {
      if (!userId) return null
      try {
        const raw = await fs.readFile(snapshotFile(userId), 'utf-8')
        return JSON.parse(raw) as SessionSnapshot
      } catch {
        return null
      }
    }
  )

  ipcMain.handle(
    'session-state:clear',
    async (_e, userId: string): Promise<void> => {
      if (!userId) return
      await fs.unlink(snapshotFile(userId)).catch(() => {})
    }
  )
}
