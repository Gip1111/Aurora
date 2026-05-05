import { app, dialog, type IpcMain, type BrowserWindow } from 'electron'
import { promises as fs } from 'node:fs'
import { join, basename } from 'node:path'

/**
 * Backup / Restore user settings.
 *
 * Backup: gathers all aurora-de JSON files from userData into a single bundle
 *         and lets the user pick a save location via native dialog.
 *
 * Restore: user picks a backup file, and we extract settings back to userData.
 */

interface BackupBundle {
  version: 1
  createdAt: string
  files: Record<string, unknown>
}

const BACKUP_PATTERNS = [
  /^aurora-de-settings.*\.json$/i,
  /^session-.*\.json$/i,
  /^ai-history-.*\.json$/i,
  /^users\.json$/i
]

async function gatherFiles(): Promise<Record<string, unknown>> {
  const dir = app.getPath('userData')
  const entries = await fs.readdir(dir)
  const result: Record<string, unknown> = {}
  for (const f of entries) {
    if (BACKUP_PATTERNS.some((p) => p.test(f))) {
      try {
        const raw = await fs.readFile(join(dir, f), 'utf-8')
        result[f] = JSON.parse(raw)
      } catch {
        // skip corrupt files
      }
    }
  }
  return result
}

export function registerBackupRestoreIpc(
  ipcMain: IpcMain,
  getWindow: () => BrowserWindow | null
): void {
  ipcMain.handle('settings:backup', async (): Promise<{ ok: boolean; path?: string; error?: string }> => {
    const win = getWindow()
    if (!win) return { ok: false, error: 'Finestra non trovata' }

    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Salva backup impostazioni',
      defaultPath: `aurora-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'Aurora Backup', extensions: ['json'] }]
    })
    if (canceled || !filePath) return { ok: false, error: 'Annullato' }

    try {
      const files = await gatherFiles()
      const bundle: BackupBundle = {
        version: 1,
        createdAt: new Date().toISOString(),
        files
      }
      await fs.writeFile(filePath, JSON.stringify(bundle, null, 2), 'utf-8')
      return { ok: true, path: filePath }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('settings:restore', async (): Promise<{ ok: boolean; count?: number; error?: string }> => {
    const win = getWindow()
    if (!win) return { ok: false, error: 'Finestra non trovata' }

    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Ripristina backup impostazioni',
      filters: [{ name: 'Aurora Backup', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (canceled || filePaths.length === 0) return { ok: false, error: 'Annullato' }

    try {
      const raw = await fs.readFile(filePaths[0], 'utf-8')
      const bundle = JSON.parse(raw) as BackupBundle
      if (bundle.version !== 1 || typeof bundle.files !== 'object') {
        return { ok: false, error: 'File di backup non valido' }
      }
      const dir = app.getPath('userData')
      let count = 0
      for (const [name, data] of Object.entries(bundle.files)) {
        // Security: only restore files matching known patterns
        const safeName = basename(name)
        if (!BACKUP_PATTERNS.some((p) => p.test(safeName))) continue
        await fs.writeFile(join(dir, safeName), JSON.stringify(data), 'utf-8')
        count++
      }
      return { ok: true, count }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
