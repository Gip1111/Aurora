import { app, Menu, Tray, nativeImage, type BrowserWindow } from 'electron'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

let tray: Tray | null = null
let isQuitting = false

export function setQuitting(v: boolean): void {
  isQuitting = v
}
export function shouldQuit(): boolean {
  return isQuitting
}

function findTrayIcon(): Electron.NativeImage {
  // Look for the asset in resources/. In dev, resources/ sits next to package.json.
  // In packaged app, it sits at process.resourcesPath/.
  const candidates = [
    join(__dirname, '../../resources/tray-icon.png'),
    join(__dirname, '../../../resources/tray-icon.png'),
    join(process.resourcesPath || '', 'tray-icon.png')
  ]
  for (const c of candidates) {
    if (existsSync(c)) {
      const img = nativeImage.createFromPath(c)
      if (!img.isEmpty()) return img
    }
  }
  // Fallback: a 1x1 transparent image so Tray() doesn't throw. The user will
  // see no icon but the menu still works (right-click on empty area in tray).
  console.warn('[tray] tray-icon.png not found, using empty placeholder')
  return nativeImage.createEmpty()
}

export function createTray(getMainWindow: () => BrowserWindow | null): Tray | null {
  if (tray) return tray
  try {
    const icon = findTrayIcon()
    tray = new Tray(icon)
  } catch (e) {
    console.error('[tray] failed to create Tray:', e)
    return null
  }
  tray.setToolTip('Aurora DE')

  const showWin = (): void => {
    const win = getMainWindow()
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }

  const askAI = (): void => {
    const win = getMainWindow()
    if (!win) return
    showWin()
    win.webContents.send('aurora:open-ai')
  }

  const menu = Menu.buildFromTemplate([
    { label: 'Apri Aurora', click: showWin },
    { label: '💬 Chiedimi', click: askAI },
    { type: 'separator' },
    {
      label: 'Esci da Aurora',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
  tray.setContextMenu(menu)
  tray.on('click', showWin)
  return tray
}
