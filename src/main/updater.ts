import { app, type BrowserWindow } from 'electron'

/**
 * Auto-update via electron-updater.
 *
 * In dev (`!app.isPackaged`) we skip the check entirely — electron-updater
 * needs `app-update.yml` which only exists in packaged builds, and would
 * throw "ENOENT app-update.yml" otherwise.
 *
 * Once the app is packaged with electron-builder and a GitHub release is
 * published (matching the version + .nsis output), this fires automatically.
 */
export function setupAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  if (!app.isPackaged) {
    console.log('[updater] skipped in dev')
    return
  }

  // Lazy import so dev never even loads the module
  void import('electron-updater').then(({ autoUpdater }) => {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('update-available', (info) => {
      console.log('[updater] update available:', info.version)
      const win = getMainWindow()
      win?.webContents.send('aurora:update-available', { version: info.version })
    })

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[updater] update downloaded:', info.version)
      const win = getMainWindow()
      win?.webContents.send('aurora:update-downloaded', { version: info.version })
    })

    autoUpdater.on('error', (err) => {
      console.error('[updater] error:', err)
    })

    // First check shortly after app start (defer 5s to avoid contending with first paint)
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((e) => {
        console.error('[updater] initial check failed:', e)
      })
    }, 5000)

    // Re-check every 24h
    setInterval(
      () => {
        autoUpdater.checkForUpdates().catch(() => {
          /* swallow */
        })
      },
      24 * 60 * 60 * 1000
    )
  })
}
