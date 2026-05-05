import { promises as fs } from 'node:fs'
import { join, basename, dirname } from 'node:path'
import { app, type IpcMain } from 'electron'
import type { FileEntry } from '@shared/types.js'
import { safePath, HOME_DIR } from '../util/path.js'

export function registerFilesystemIpc(ipcMain: IpcMain): void {
  ipcMain.handle('fs:list', async (_e, raw: string): Promise<FileEntry[]> => {
    const path = safePath(raw)
    const entries = await fs.readdir(path, { withFileTypes: true })
    const out: FileEntry[] = []
    for (const ent of entries) {
      try {
        const full = join(path, ent.name)
        const st = await fs.stat(full)
        out.push({
          name: ent.name,
          path: full,
          isDirectory: ent.isDirectory(),
          size: st.size,
          modified: st.mtimeMs
        })
      } catch {
        // skip unreadable
      }
    }
    out.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return out
  })

  ipcMain.handle('fs:read', async (_e, raw: string): Promise<string> => {
    return fs.readFile(safePath(raw), 'utf-8')
  })

  ipcMain.handle('fs:write', async (_e, raw: string, content: string): Promise<void> => {
    const p = safePath(raw)
    await fs.mkdir(dirname(p), { recursive: true })
    await fs.writeFile(p, content, 'utf-8')
  })

  ipcMain.handle(
    'fs:write-binary',
    async (_e, raw: string, data: ArrayBuffer | Uint8Array): Promise<void> => {
      const p = safePath(raw)
      await fs.mkdir(dirname(p), { recursive: true })
      const buf = data instanceof ArrayBuffer ? Buffer.from(data) : Buffer.from(data)
      await fs.writeFile(p, buf)
    }
  )

  ipcMain.handle('fs:mkdir', async (_e, raw: string): Promise<void> => {
    await fs.mkdir(safePath(raw), { recursive: true })
  })

  ipcMain.handle('fs:remove', async (_e, raw: string): Promise<void> => {
    await fs.rm(safePath(raw), { recursive: true, force: true })
  })

  ipcMain.handle('fs:trash', async (_e, raw: string): Promise<void> => {
    // Always move into Aurora's local .aurora-trash so the in-app Cestino can
    // list, restore and definitively delete. Saves a sibling manifest .json
    // with original path + timestamp.
    const original = safePath(raw)
    const trashDir = join(HOME_DIR, '.aurora-trash')
    await fs.mkdir(trashDir, { recursive: true })
    const ts = Date.now()
    const safeName = `${ts}-${basename(original)}`
    const dest = join(trashDir, safeName)
    await fs.rename(original, dest).catch(async () => {
      // cross-device rename: copy + remove
      await fs.cp(original, dest, { recursive: true })
      await fs.rm(original, { recursive: true, force: true })
    })
    const manifest = JSON.stringify({
      originalPath: original,
      trashedAt: ts,
      name: basename(original)
    })
    await fs.writeFile(`${dest}.aurora-trash.json`, manifest, 'utf-8').catch(() => {})
  })

  ipcMain.handle('fs:trash-list', async (): Promise<Array<{ name: string; path: string; originalPath: string; trashedAt: number; size: number; isDirectory: boolean }>> => {
    const trashDir = join(HOME_DIR, '.aurora-trash')
    try {
      await fs.mkdir(trashDir, { recursive: true })
      const entries = await fs.readdir(trashDir, { withFileTypes: true })
      const out = []
      for (const ent of entries) {
        if (ent.name.endsWith('.aurora-trash.json')) continue
        const full = join(trashDir, ent.name)
        const manifestPath = `${full}.aurora-trash.json`
        let manifest: { originalPath: string; trashedAt: number; name: string } | null = null
        try {
          manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'))
        } catch {
          /* legacy item without manifest */
        }
        try {
          const st = await fs.stat(full)
          out.push({
            name: manifest?.name ?? ent.name,
            path: full,
            originalPath: manifest?.originalPath ?? '',
            trashedAt: manifest?.trashedAt ?? st.mtimeMs,
            size: st.size,
            isDirectory: ent.isDirectory()
          })
        } catch {
          /* skip unreadable */
        }
      }
      out.sort((a, b) => b.trashedAt - a.trashedAt)
      return out
    } catch {
      return []
    }
  })

  ipcMain.handle(
    'fs:trash-restore',
    async (_e, trashedPath: string): Promise<{ ok: boolean; error?: string }> => {
      const safe = safePath(trashedPath)
      const manifestPath = `${safe}.aurora-trash.json`
      try {
        const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as {
          originalPath: string
        }
        if (!manifest.originalPath) return { ok: false, error: 'Origine sconosciuta' }
        await fs.mkdir(dirname(manifest.originalPath), { recursive: true })
        await fs.rename(safe, manifest.originalPath).catch(async () => {
          await fs.cp(safe, manifest.originalPath, { recursive: true })
          await fs.rm(safe, { recursive: true, force: true })
        })
        await fs.unlink(manifestPath).catch(() => {})
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) }
      }
    }
  )

  ipcMain.handle('fs:trash-delete', async (_e, trashedPath: string): Promise<void> => {
    const safe = safePath(trashedPath)
    await fs.rm(safe, { recursive: true, force: true }).catch(() => {})
    await fs.unlink(`${safe}.aurora-trash.json`).catch(() => {})
  })

  ipcMain.handle('fs:trash-empty', async (): Promise<void> => {
    const trashDir = join(HOME_DIR, '.aurora-trash')
    await fs.rm(trashDir, { recursive: true, force: true }).catch(() => {})
    await fs.mkdir(trashDir, { recursive: true })
  })

  ipcMain.handle('fs:rename', async (_e, src: string, dst: string): Promise<void> => {
    await fs.rename(safePath(src), safePath(dst))
  })

  ipcMain.handle('fs:home', async (): Promise<string> => HOME_DIR)
  ipcMain.handle('fs:docs', async (): Promise<string> => app.getPath('documents'))
  ipcMain.handle('fs:pictures', async (): Promise<string> => app.getPath('pictures'))
  ipcMain.handle('fs:downloads', async (): Promise<string> => app.getPath('downloads'))
  ipcMain.handle('fs:desktop', async (): Promise<string> => app.getPath('desktop'))

  ipcMain.handle('fs:stat', async (_e, raw: string): Promise<FileEntry | null> => {
    try {
      const path = safePath(raw)
      const st = await fs.stat(path)
      return {
        name: basename(path),
        path,
        isDirectory: st.isDirectory(),
        size: st.size,
        modified: st.mtimeMs
      }
    } catch {
      return null
    }
  })

  ipcMain.handle(
    'fs:search',
    async (_e, raw: string, query: string, max = 200): Promise<FileEntry[]> => {
      const root = safePath(raw)
      const needle = query.toLowerCase()
      const out: FileEntry[] = []
      async function walk(dir: string, depth: number): Promise<void> {
        if (depth > 5 || out.length >= max) return
        let entries
        try {
          entries = await fs.readdir(dir, { withFileTypes: true })
        } catch {
          return
        }
        for (const ent of entries) {
          if (out.length >= max) return
          if (ent.name.startsWith('.')) continue
          const full = join(dir, ent.name)
          if (ent.name.toLowerCase().includes(needle)) {
            try {
              const st = await fs.stat(full)
              out.push({
                name: ent.name,
                path: full,
                isDirectory: ent.isDirectory(),
                size: st.size,
                modified: st.mtimeMs
              })
            } catch {
              // skip
            }
          }
          if (ent.isDirectory()) await walk(full, depth + 1)
        }
      }
      await walk(root, 0)
      return out
    }
  )
}
