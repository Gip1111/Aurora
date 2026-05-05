import type { IpcMain } from 'electron'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

export function registerOpenRouterIpc(ipcMain: IpcMain): void {
  /** Check if the API key is valid by making a lightweight request */
  ipcMain.handle('openrouter:health', async (_e, apiKey: string): Promise<boolean> => {
    if (!apiKey) return false
    try {
      const r = await fetch(`${OPENROUTER_BASE}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` }
      })
      return r.ok
    } catch {
      return false
    }
  })

  /** Return a curated list of recommended models */
  ipcMain.handle('openrouter:models', async (): Promise<string[]> => {
    return [
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemma-3-27b-it:free',
      'nousresearch/hermes-3-llama-3.1-405b:free',
      'openrouter/owl-alpha',
      'google/gemini-2.5-flash'
    ]
  })
}
