import { app, desktopCapturer, screen, type IpcMain } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'
import type { SystemStatus } from '@shared/types.js'

const execFileP = promisify(execFile)

async function runPowerShell(script: string): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileP(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { maxBuffer: 4 * 1024 * 1024, windowsHide: true }
    )
    return { ok: true, stdout, stderr }
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string }
    return { ok: false, stdout: err.stdout || '', stderr: err.stderr || err.message || '' }
  }
}

async function setVolumeWindows(level: number): Promise<{ ok: boolean; error?: string }> {
  // Use Win32 API via .NET in PowerShell to set system master volume.
  const clamped = Math.max(0, Math.min(100, Math.round(level)))
  const target = (clamped / 100).toFixed(3)
  const script = `
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i();
  int SetMasterVolumeLevelScalar(float level, System.Guid pguidEventContext);
  int j(); int GetMasterVolumeLevelScalar(out float level);
  int k(); int l(); int m(); int n();
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
  int GetMute(out bool pbMute);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
  int Activate(ref System.Guid id, int clsCtx, int activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object aud);
}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
  int f(); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject { }
public class Audio {
  public static void SetVolume(float v) {
    var e = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
    IMMDevice dev; e.GetDefaultAudioEndpoint(0, 1, out dev);
    var IID_IAudioEndpointVolume = new System.Guid("5CDF2C82-841E-4546-9722-0CF74078229A");
    object o; dev.Activate(ref IID_IAudioEndpointVolume, 23, 0, out o);
    var aev = (IAudioEndpointVolume)o;
    aev.SetMasterVolumeLevelScalar(v, System.Guid.Empty);
  }
}
"@ -ErrorAction SilentlyContinue
[Audio]::SetVolume(${target})
`.trim()
  const r = await runPowerShell(script)
  return r.ok ? { ok: true } : { ok: false, error: r.stderr || 'PowerShell error' }
}

async function getVolumeWindows(): Promise<number | undefined> {
  const script = `
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i();
  int SetMasterVolumeLevelScalar(float level, System.Guid pguidEventContext);
  int j(); int GetMasterVolumeLevelScalar(out float level);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
  int Activate(ref System.Guid id, int clsCtx, int activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object aud);
}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
  int f(); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject { }
public class AudioGet {
  public static float GetVolume() {
    var e = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
    IMMDevice dev; e.GetDefaultAudioEndpoint(0, 1, out dev);
    var IID = new System.Guid("5CDF2C82-841E-4546-9722-0CF74078229A");
    object o; dev.Activate(ref IID, 23, 0, out o);
    var aev = (IAudioEndpointVolume)o;
    float v; aev.GetMasterVolumeLevelScalar(out v);
    return v;
  }
}
"@ -ErrorAction SilentlyContinue
[AudioGet]::GetVolume()
`.trim()
  const r = await runPowerShell(script)
  if (!r.ok) return undefined
  const v = parseFloat(r.stdout.trim())
  if (Number.isFinite(v)) return Math.round(v * 100)
  return undefined
}

async function setBrightnessWindows(level: number): Promise<{ ok: boolean; error?: string }> {
  const clamped = Math.max(0, Math.min(100, Math.round(level)))
  const script = `(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${clamped})`
  const r = await runPowerShell(script)
  return r.ok ? { ok: true } : { ok: false, error: 'Luminosità non disponibile su questo monitor' }
}

async function getBrightnessWindows(): Promise<number | undefined> {
  const script =
    "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness).CurrentBrightness"
  const r = await runPowerShell(script)
  if (!r.ok) return undefined
  const v = parseInt(r.stdout.trim(), 10)
  return Number.isFinite(v) ? v : undefined
}

async function getBatteryWindows(): Promise<SystemStatus['battery']> {
  const script = `
$b = Get-WmiObject -Class Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1
if ($b) {
  @{
    percent = $b.EstimatedChargeRemaining
    charging = ($b.BatteryStatus -eq 2 -or $b.BatteryStatus -eq 6 -or $b.BatteryStatus -eq 7 -or $b.BatteryStatus -eq 8 -or $b.BatteryStatus -eq 9)
    remaining = if ($b.EstimatedRunTime -lt 71582788) { $b.EstimatedRunTime } else { $null }
  } | ConvertTo-Json -Compress
} else { '{}' }
`.trim()
  const r = await runPowerShell(script)
  if (!r.ok) return undefined
  try {
    const parsed = JSON.parse(r.stdout || '{}')
    if (typeof parsed.percent !== 'number') return undefined
    return {
      percent: parsed.percent,
      charging: !!parsed.charging,
      remainingMinutes: typeof parsed.remaining === 'number' ? parsed.remaining : undefined
    }
  } catch {
    return undefined
  }
}

async function getDiskFreeGb(): Promise<number | undefined> {
  if (process.platform !== 'win32') return undefined
  const script =
    "(Get-PSDrive -Name C).Free / 1GB"
  const r = await runPowerShell(script)
  if (!r.ok) return undefined
  const v = parseFloat(r.stdout.trim())
  return Number.isFinite(v) ? Math.round(v) : undefined
}

async function getWifiSsid(): Promise<string | undefined> {
  if (process.platform !== 'win32') return undefined
  const r = await runPowerShell('netsh wlan show interfaces | Select-String "^\\s*SSID"')
  if (!r.ok) return undefined
  // first SSID line (skip BSSID)
  const lines = r.stdout.split('\n').filter((l) => /SSID\s*:/.test(l) && !/BSSID/.test(l))
  if (lines.length === 0) return undefined
  return lines[0].split(':')[1]?.trim() || undefined
}

async function takeScreenshot(): Promise<{ ok: boolean; path?: string; error?: string }> {
  try {
    const display = screen.getPrimaryDisplay()
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: display.size.width, height: display.size.height }
    })
    if (sources.length === 0) return { ok: false, error: 'Nessuno schermo disponibile' }
    const png = sources[0].thumbnail.toPNG()
    const dir = join(app.getPath('pictures'), 'Aurora-Screenshots')
    await fs.mkdir(dir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const path = join(dir, `screenshot-${ts}.png`)
    await fs.writeFile(path, png)
    return { ok: true, path }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function systemAction(
  action: 'shutdown' | 'restart' | 'sleep' | 'lock' | 'logout'
): Promise<{ ok: boolean; error?: string }> {
  if (process.platform !== 'win32') return { ok: false, error: 'Disponibile solo su Windows' }
  const cmds: Record<typeof action, [string, string[]]> = {
    shutdown: ['shutdown.exe', ['/s', '/t', '5']],
    restart: ['shutdown.exe', ['/r', '/t', '5']],
    sleep: ['rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0']],
    lock: ['rundll32.exe', ['user32.dll,LockWorkStation']],
    logout: ['shutdown.exe', ['/l']]
  }
  const [cmd, args] = cmds[action]
  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true }).unref()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function searchApp(
  query: string
): Promise<Array<{ id: string; name: string; version?: string; source?: string }>> {
  if (process.platform !== 'win32') return []
  // winget search returns formatted text; use --source winget for stable
  try {
    const { stdout } = await execFileP('winget', ['search', query, '--accept-source-agreements'], {
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true
    })
    const lines = stdout.split('\n')
    // Find header line "Name ... Id ... Version ..."
    const headerIdx = lines.findIndex((l) => /^Name\s+Id\s+Version/i.test(l))
    if (headerIdx < 0) return []
    const header = lines[headerIdx]
    const idStart = header.indexOf('Id')
    const versionStart = header.indexOf('Version')
    const sourceStart = header.indexOf('Source')
    const out: Array<{ id: string; name: string; version?: string; source?: string }> = []
    for (let i = headerIdx + 2; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim() || line.startsWith('---')) continue
      const name = line.slice(0, idStart).trim()
      const id = line.slice(idStart, versionStart > 0 ? versionStart : line.length).trim()
      const version =
        versionStart > 0 ? line.slice(versionStart, sourceStart > 0 ? sourceStart : line.length).trim() : undefined
      const source = sourceStart > 0 ? line.slice(sourceStart).trim() : undefined
      if (name && id) out.push({ name, id, version, source })
      if (out.length >= 10) break
    }
    return out
  } catch {
    return []
  }
}

async function installApp(
  id: string
): Promise<{ ok: boolean; output?: string; error?: string }> {
  if (process.platform !== 'win32') return { ok: false, error: 'Disponibile solo su Windows' }
  try {
    const { stdout, stderr } = await execFileP(
      'winget',
      [
        'install',
        '--id',
        id,
        '--accept-package-agreements',
        '--accept-source-agreements',
        '--silent',
        '-e'
      ],
      { maxBuffer: 8 * 1024 * 1024, windowsHide: true, timeout: 5 * 60 * 1000 }
    )
    return { ok: true, output: stdout || stderr }
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string }
    return { ok: false, error: err.stderr || err.message || 'winget error', output: err.stdout }
  }
}

export function registerSystemControlsIpc(ipcMain: IpcMain): void {
  ipcMain.handle(
    'controls:set-volume',
    async (_e, level: number): Promise<{ ok: boolean; error?: string }> => {
      if (process.platform !== 'win32') return { ok: false, error: 'Solo Windows' }
      return setVolumeWindows(level)
    }
  )

  ipcMain.handle(
    'controls:set-brightness',
    async (_e, level: number): Promise<{ ok: boolean; error?: string }> => {
      if (process.platform !== 'win32') return { ok: false, error: 'Solo Windows' }
      return setBrightnessWindows(level)
    }
  )

  ipcMain.handle('controls:get-status', async (): Promise<SystemStatus> => {
    if (process.platform !== 'win32') {
      return {
        uptimeHours: Math.round(os.uptime() / 3600)
      }
    }
    const [battery, audioVolume, brightness, diskFreeGb, wifiSsid] = await Promise.all([
      getBatteryWindows(),
      getVolumeWindows(),
      getBrightnessWindows(),
      getDiskFreeGb(),
      getWifiSsid()
    ])
    return {
      battery,
      audioVolume,
      brightness,
      diskFreeGb,
      wifiSsid,
      uptimeHours: Math.round(os.uptime() / 3600)
    }
  })

  ipcMain.handle(
    'controls:system-action',
    async (_e, action: 'shutdown' | 'restart' | 'sleep' | 'lock' | 'logout') => systemAction(action)
  )

  ipcMain.handle('controls:take-screenshot', async () => takeScreenshot())

  ipcMain.handle('controls:install-app', async (_e, id: string) => installApp(id))
  ipcMain.handle('controls:search-app', async (_e, q: string) => searchApp(q))
}

export {
  setVolumeWindows,
  setBrightnessWindows,
  takeScreenshot,
  systemAction,
  installApp,
  searchApp
}
