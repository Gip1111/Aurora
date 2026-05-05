import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import log from './logger.js'
import { registerFilesystemIpc } from './ipc/filesystem.js'
import { registerSystemIpc } from './ipc/system.js'
import { registerSystemControlsIpc } from './ipc/system-controls.js'
import { registerInstalledAppsIpc, warmInstalledAppsCache } from './ipc/installed-apps.js'
import { registerOpenRouterIpc } from './ipc/openrouter.js'
import { registerAiIpc } from './ipc/ai.js'
import { registerUsersIpc } from './ipc/users.js'
import { registerSessionStateIpc } from './ipc/session-state.js'
import { registerAIHistoryIpc } from './ipc/ai-history.js'
import { registerBackupRestoreIpc } from './ipc/backup-restore.js'
import { createTray, setQuitting, shouldQuit } from './tray.js'
import { setupAutoUpdater } from './updater.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Older integrated GPUs (e.g. Intel HD 620) crash Chromium's GPU process
// repeatedly under sustained use; force software rendering for stability.
// Must be called before app.whenReady().
app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    frame: false,
    transparent: process.platform === 'darwin',
    backgroundColor: '#f5f6fb',
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Minimize-to-tray: when the user clicks the close button, hide the window
  // instead of quitting. Quitting only happens via tray "Esci" (which sets
  // `isQuitting` first) or App.quit().
  mainWindow.on('close', (e) => {
    if (!shouldQuit() && process.platform === 'win32') {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  log.info('Aurora DE starting – v' + app.getVersion())

  registerFilesystemIpc(ipcMain)
  registerSystemIpc(ipcMain)
  registerSystemControlsIpc(ipcMain)
  registerInstalledAppsIpc(ipcMain)
  registerOpenRouterIpc(ipcMain)
  registerAiIpc(ipcMain, () => mainWindow)
  registerUsersIpc(ipcMain)
  registerSessionStateIpc(ipcMain)
  registerAIHistoryIpc(ipcMain)
  registerBackupRestoreIpc(ipcMain, () => mainWindow)

  // Pre-warm Programs cache so the user doesn't wait on first open
  warmInstalledAppsCache()

  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.handle('window:close', () => {
    // From renderer: also minimize-to-tray rather than quit
    if (process.platform === 'win32') mainWindow?.hide()
    else mainWindow?.close()
  })
  ipcMain.handle('window:quit', () => {
    setQuitting(true)
    app.quit()
  })
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

  createWindow()
  createTray(() => mainWindow)
  setupAutoUpdater(() => mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow?.show()
  })

  app.on('before-quit', () => {
    setQuitting(true)
  })
})

app.on('window-all-closed', () => {
  // With tray, we don't auto-quit when all windows are closed: user can still
  // re-open from the tray icon. Only quit on macOS by convention (we don't
  // support macOS-specific tray behavior here).
  if (process.platform === 'darwin') app.quit()
})
