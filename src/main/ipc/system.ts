import { app, dialog, Notification, shell, type IpcMain, BrowserWindow } from 'electron'
import { pathToFileURL } from 'node:url'
import os from 'node:os'
import type { NotificationPayload, SystemInfo } from '@shared/types.js'

export function registerSystemIpc(ipcMain: IpcMain): void {
  ipcMain.handle('sys:info', async (): Promise<SystemInfo> => {
    return {
      platform: process.platform,
      hostname: os.hostname(),
      username: os.userInfo().username,
      homeDir: os.homedir(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length
    }
  })

  ipcMain.handle('sys:notify', async (_e, payload: NotificationPayload) => {
    if (Notification.isSupported()) {
      new Notification({ title: payload.title, body: payload.body || '' }).show()
    }
  })

  ipcMain.handle('sys:open-external', async (_e, url: string) => {
    await shell.openExternal(url)
  })

  ipcMain.handle('sys:open-path', async (_e, path: string) => {
    await shell.openPath(path)
  })

  ipcMain.handle('sys:show-in-folder', async (_e, path: string) => {
    shell.showItemInFolder(path)
  })

  ipcMain.handle('sys:open-windows-settings', async (_e, section: string) => {
    // Section can be a full URI (ms-settings:foo) or a bare section name (foo)
    const uri = section.startsWith('ms-settings:') ? section : `ms-settings:${section}`
    await shell.openExternal(uri)
  })

  ipcMain.handle('sys:set-auto-start', async (_e, enabled: boolean): Promise<boolean> => {
    try {
      app.setLoginItemSettings({
        openAtLogin: enabled,
        path: process.execPath
      })
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('sys:get-auto-start', async (): Promise<boolean> => {
    try {
      return app.getLoginItemSettings().openAtLogin
    } catch {
      return false
    }
  })

  /**
   * Open a native file picker for image files. Returns a `file://` URL the
   * renderer can use directly as `background-image`, or `null` if cancelled.
   */
  ipcMain.handle('dialog:open-image', async (): Promise<string | null> => {
    const owner = BrowserWindow.getFocusedWindow() ?? undefined
    const opts: Electron.OpenDialogOptions = {
      title: 'Scegli immagine sfondo',
      filters: [{ name: 'Immagini', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] }],
      properties: ['openFile']
    }
    const result = owner
      ? await dialog.showOpenDialog(owner, opts)
      : await dialog.showOpenDialog(opts)
    if (result.canceled || result.filePaths.length === 0) return null
    return pathToFileURL(result.filePaths[0]).href
  })
}
