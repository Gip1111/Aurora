import type { BrowserWindow, IpcMain } from 'electron'
import { runAgent } from '../ai/orchestrator.js'
import type { AIChatMessage } from '@shared/types.js'

const aborters = new Map<string, AbortController>()

export function registerAiIpc(ipcMain: IpcMain, getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(
    'ai:chat',
    async (
      _e,
      streamId: string,
      payload: { apiKey: string; model: string; messages: AIChatMessage[] }
    ) => {
      const ac = new AbortController()
      aborters.set(streamId, ac)
      try {
        await runAgent(getWindow(), streamId, { ...payload, signal: ac.signal })
      } finally {
        aborters.delete(streamId)
      }
    }
  )

  ipcMain.handle('ai:abort', async (_e, streamId: string) => {
    aborters.get(streamId)?.abort()
    aborters.delete(streamId)
  })
}
