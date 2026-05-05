import { app, type IpcMain } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'

/**
 * Persists per-user AI conversation history as JSON in the userData directory.
 * File: ai-history-<userId>.json
 */

interface AIHistoryEntry {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

function historyFile(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return join(app.getPath('userData'), `ai-history-${safe}.json`)
}

export function registerAIHistoryIpc(ipcMain: IpcMain): void {
  ipcMain.handle(
    'ai-history:save',
    async (_e, userId: string, entries: AIHistoryEntry[]): Promise<void> => {
      if (!userId) return
      try {
        await fs.mkdir(app.getPath('userData'), { recursive: true })
        await fs.writeFile(historyFile(userId), JSON.stringify(entries), 'utf-8')
      } catch {
        // best-effort
      }
    }
  )

  ipcMain.handle(
    'ai-history:load',
    async (_e, userId: string): Promise<AIHistoryEntry[] | null> => {
      if (!userId) return null
      try {
        const raw = await fs.readFile(historyFile(userId), 'utf-8')
        return JSON.parse(raw) as AIHistoryEntry[]
      } catch {
        return null
      }
    }
  )

  ipcMain.handle(
    'ai-history:clear',
    async (_e, userId: string): Promise<void> => {
      if (!userId) return
      await fs.unlink(historyFile(userId)).catch(() => {})
    }
  )
}
