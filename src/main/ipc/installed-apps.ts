import { app, shell, type IpcMain } from 'electron'
import { promises as fs, watch as fsWatch, type FSWatcher } from 'node:fs'
import { join, basename, extname } from 'node:path'
import { homedir, tmpdir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomUUID } from 'node:crypto'
import type { InstalledApp } from '@shared/types.js'

const execFileP = promisify(execFile)

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6h
let cache: InstalledApp[] | null = null
let cacheAt = 0
let scanInFlight: Promise<InstalledApp[]> | null = null
const watchers: FSWatcher[] = []

const STARTMENU_DIRS_WIN: string[] = [
  join(process.env.APPDATA || '', 'Microsoft\\Windows\\Start Menu\\Programs'),
  join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'Microsoft\\Windows\\Start Menu\\Programs')
]

async function walkLnk(dir: string, out: string[], depth = 0): Promise<void> {
  if (depth > 5) return
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const ent of entries) {
    const full = join(dir, ent.name)
    if (ent.isDirectory()) {
      await walkLnk(full, out, depth + 1)
    } else if (ent.isFile() && extname(ent.name).toLowerCase() === '.lnk') {
      out.push(full)
    }
  }
}

/**
 * Resolve .lnk shortcut targets via PowerShell.
 *
 * On a typical Windows install there are 200-400 .lnk files in Start Menu.
 * Passing them inline to powershell.exe via -Command exceeds the ~32KB
 * Windows command-line limit, so we write the input list and the script to
 * temp files and use -File. The script reads paths from the input file and
 * writes JSON results back to an output file (avoids stdout encoding issues).
 */
async function resolveLnks(lnkPaths: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (lnkPaths.length === 0) return result

  const tag = randomUUID()
  const inputFile = join(tmpdir(), `aurora-lnk-in-${tag}.txt`)
  const outputFile = join(tmpdir(), `aurora-lnk-out-${tag}.json`)
  const scriptFile = join(tmpdir(), `aurora-lnk-${tag}.ps1`)

  const script = `$ErrorActionPreference = 'SilentlyContinue'
$paths = [System.IO.File]::ReadAllLines('${inputFile.replace(/'/g, "''")}', [System.Text.Encoding]::UTF8)
$wshell = New-Object -ComObject WScript.Shell
$out = New-Object System.Collections.ArrayList
foreach ($p in $paths) {
  $ps = [string]$p
  if ([string]::IsNullOrWhiteSpace($ps)) { continue }
  try {
    $sc = $wshell.CreateShortcut($ps)
    $t = [string]$sc.TargetPath
    if (-not [string]::IsNullOrWhiteSpace($t)) {
      [void]$out.Add([pscustomobject]@{ src = $ps; target = $t })
    }
  } catch {}
}
$json = $out | ConvertTo-Json -Compress
[System.IO.File]::WriteAllText('${outputFile.replace(/'/g, "''")}', $json, [System.Text.UTF8Encoding]::new($false))
`

  try {
    await fs.writeFile(inputFile, lnkPaths.join('\n'), 'utf-8')
    await fs.writeFile(scriptFile, script, 'utf-8')
    await execFileP(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptFile],
      { maxBuffer: 16 * 1024 * 1024, windowsHide: true, timeout: 60_000 }
    )
    const rawWithBom = await fs.readFile(outputFile, 'utf-8').catch(() => '[]')
    // PowerShell's UTF8 encoder may emit a BOM (U+FEFF); strip it before JSON.parse.
    const raw = rawWithBom.replace(/^﻿/, '').trim()
    // ConvertTo-Json may emit a single object if there's only one entry
    const parsed = raw ? JSON.parse(raw) : []
    const arr: Array<{ src: string; target: string }> = Array.isArray(parsed)
      ? parsed
      : [parsed]
    for (const item of arr) {
      if (item?.src && item?.target) result.set(item.src, item.target)
    }
  } catch (e) {
    // Surface the error to console so dev sees it
    console.error('[installed-apps] PowerShell .lnk resolution failed:', e)
  } finally {
    // Cleanup temp files (best-effort)
    void fs.unlink(inputFile).catch(() => {})
    void fs.unlink(outputFile).catch(() => {})
    void fs.unlink(scriptFile).catch(() => {})
  }
  return result
}

function categorize(name: string): string {
  const n = name.toLowerCase()
  if (/whatsapp|telegram|discord|skype|teams|zoom|signal|slack/i.test(n)) return 'Comunicazione'
  if (/edge|chrome|firefox|brave|opera|safari/i.test(n)) return 'Internet'
  if (/word|excel|powerpoint|outlook|libreoffice|onenote/i.test(n)) return 'Ufficio'
  if (/spotify|vlc|media player|netflix|youtube|audacity|gimp|paint|photoshop/i.test(n))
    return 'Multimedia'
  if (/steam|epic|xbox|riot|game/i.test(n)) return 'Giochi'
  return 'Altro'
}

async function scanWindowsApps(): Promise<InstalledApp[]> {
  if (process.platform !== 'win32') return []
  const lnks: string[] = []
  for (const dir of STARTMENU_DIRS_WIN) {
    if (dir) await walkLnk(dir, lnks)
  }
  const targets = await resolveLnks(lnks)

  const seen = new Set<string>()
  const out: InstalledApp[] = []
  for (const lnk of lnks) {
    const target = targets.get(lnk)
    if (!target) continue
    if (!target.toLowerCase().endsWith('.exe')) continue
    if (seen.has(target.toLowerCase())) continue
    seen.add(target.toLowerCase())
    const name = basename(lnk, '.lnk')
    let iconDataUrl: string | undefined
    try {
      const img = await app.getFileIcon(target, { size: 'large' })
      iconDataUrl = img.toDataURL()
    } catch {
      /* ignore */
    }
    out.push({
      name,
      path: target,
      iconDataUrl,
      category: categorize(name)
    })
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

async function scanGenericApps(): Promise<InstalledApp[]> {
  // Best-effort fallback for non-Windows: list /Applications on macOS
  if (process.platform === 'darwin') {
    try {
      const apps = await fs.readdir('/Applications')
      return apps
        .filter((a) => a.endsWith('.app'))
        .map((a) => ({
          name: a.replace(/\.app$/, ''),
          path: join('/Applications', a),
          category: 'Altro'
        }))
    } catch {
      return []
    }
  }
  // Linux: scan ~/.local/share/applications and /usr/share/applications for .desktop
  if (process.platform === 'linux') {
    const dirs = [join(homedir(), '.local/share/applications'), '/usr/share/applications']
    const out: InstalledApp[] = []
    for (const d of dirs) {
      try {
        const list = await fs.readdir(d)
        for (const f of list) {
          if (f.endsWith('.desktop')) {
            out.push({ name: f.replace(/\.desktop$/, ''), path: join(d, f), category: 'Altro' })
          }
        }
      } catch {
        /* ignore */
      }
    }
    return out
  }
  return []
}

async function runScan(): Promise<InstalledApp[]> {
  if (scanInFlight) return scanInFlight
  scanInFlight = (async () => {
    try {
      const result = process.platform === 'win32' ? await scanWindowsApps() : await scanGenericApps()
      cache = result
      cacheAt = Date.now()
      return result
    } finally {
      scanInFlight = null
    }
  })()
  return scanInFlight
}

function isCacheFresh(): boolean {
  return cache !== null && cache.length > 0 && Date.now() - cacheAt < CACHE_TTL_MS
}

/**
 * Kick off a background scan if we don't have a fresh cache. Doesn't await.
 * Call this from app.whenReady so the cache is populated before the user
 * opens the Programs app for the first time.
 */
export function warmInstalledAppsCache(): void {
  if (isCacheFresh() || scanInFlight) return
  void runScan().catch((e) => console.error('[installed-apps] background scan failed:', e))
  // Set up best-effort watchers on Start Menu folders to invalidate cache
  // when new shortcuts appear (e.g. user installed a new program).
  if (process.platform === 'win32' && watchers.length === 0) {
    for (const dir of STARTMENU_DIRS_WIN) {
      try {
        const w = fsWatch(dir, { recursive: true }, (_event, fname) => {
          if (fname && /\.lnk$/i.test(String(fname))) {
            cacheAt = 0 // invalidate; next list/refresh will rescan
          }
        })
        w.on('error', () => {
          /* swallow — best-effort */
        })
        watchers.push(w)
      } catch {
        // Watcher unavailable (e.g. dir missing); ignore
      }
    }
  }
}

export function registerInstalledAppsIpc(ipcMain: IpcMain): void {
  ipcMain.handle('programs:list', async (): Promise<InstalledApp[]> => {
    if (isCacheFresh()) return cache as InstalledApp[]
    return runScan()
  })

  ipcMain.handle('programs:refresh', async (): Promise<InstalledApp[]> => {
    cacheAt = 0
    cache = null
    return runScan()
  })

  ipcMain.handle(
    'programs:get-icon',
    async (_e, path: string): Promise<string | null> => {
      try {
        const img = await app.getFileIcon(path, { size: 'large' })
        if (img.isEmpty()) return null
        return img.toDataURL()
      } catch {
        return null
      }
    }
  )

  ipcMain.handle(
    'programs:launch',
    async (_e, path: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const err = await shell.openPath(path)
        if (err) return { ok: false, error: err }
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) }
      }
    }
  )
}

/** Used by AI tool launch_installed_app: fuzzy search and launch. */
export async function findAndLaunchApp(query: string): Promise<{ ok: boolean; matched?: string; error?: string }> {
  if (!isCacheFresh()) await runScan()
  const list = cache ?? []
  const q = query.toLowerCase().trim()
  if (!q) return { ok: false, error: 'Nome programma vuoto' }
  // Score: exact match > startsWith > includes
  const scored = list
    .map((a) => {
      const n = a.name.toLowerCase()
      let score = 0
      if (n === q) score = 100
      else if (n.startsWith(q)) score = 50
      else if (n.includes(q)) score = 20
      return { app: a, score }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
  if (scored.length === 0) return { ok: false, error: `Programma "${query}" non trovato` }
  const best = scored[0].app
  const err = await shell.openPath(best.path)
  if (err) return { ok: false, matched: best.name, error: err }
  return { ok: true, matched: best.name }
}
