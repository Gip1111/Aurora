/**
 * Tool registry for Aurora's AI agent.
 *
 * Aurora is a simplified shell on top of Windows. The AI tools are designed so
 * that the AI can fulfill almost any user intent by either:
 *  - performing a small, well-scoped action via Aurora's IPC, or
 *  - delegating to a Windows app/setting via shell.openExternal / openPath.
 *
 * Renderer-target tools are dispatched to the React side (e.g. open_app).
 * Main-target tools execute here in the main process.
 */

import { app, shell, Notification, type IpcMain } from 'electron'
import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ToolCallRequest, ToolCallResult } from '@shared/types.js'
import { safePath } from '../util/path.js'
import {
  setBrightnessWindows,
  setVolumeWindows,
  systemAction,
  takeScreenshot,
  installApp,
  searchApp
} from '../ipc/system-controls.js'
import { findAndLaunchApp } from '../ipc/installed-apps.js'

export type ToolTarget = 'main' | 'renderer'

export interface ToolDef {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, { type: string; description?: string; enum?: string[] }>
    required?: string[]
  }
  target: ToolTarget
  destructive: boolean
}

const APP_IDS = ['files', 'notes', 'calculator', 'programs', 'settings'] as const

const WIN_APP_URIS: Record<string, string> = {
  photos: 'ms-photos:',
  foto: 'ms-photos:',
  mail: 'outlookmail:',
  posta: 'outlookmail:',
  calendar: 'outlookcal:',
  calendario: 'outlookcal:',
  calculator: 'calculator:',
  calcolatrice: 'calculator:',
  settings: 'ms-settings:',
  impostazioni: 'ms-settings:',
  store: 'ms-windows-store:',
  store_microsoft: 'ms-windows-store:',
  edge: 'microsoft-edge:',
  browser: 'microsoft-edge:',
  music: 'mswindowsmusic:',
  musica: 'mswindowsmusic:',
  video: 'mswindowsvideo:',
  film: 'mswindowsvideo:',
  maps: 'bingmaps:',
  mappe: 'bingmaps:',
  weather: 'msnweather:',
  meteo: 'msnweather:'
}

const WIN_SETTINGS_SECTIONS = [
  'about',
  'display',
  'sound',
  'network',
  'network-wifi',
  'bluetooth',
  'printers',
  'mouse',
  'keyboard',
  'datetime',
  'regionlanguage',
  'speech',
  'powersleep',
  'storagesense',
  'apps',
  'defaultapps',
  'optionalfeatures',
  'yourinfo',
  'signinoptions',
  'family',
  'windowsupdate',
  'backup',
  'recovery'
]

export const TOOLS: ToolDef[] = [
  // ---------- Aurora app launching ----------
  {
    name: 'open_app',
    description: "Apre un'app interna di Aurora (Documenti, Note, Calcolatrice, Programmi, Impostazioni).",
    parameters: {
      type: 'object',
      properties: {
        appId: { type: 'string', enum: [...APP_IDS] }
      },
      required: ['appId']
    },
    target: 'renderer',
    destructive: false
  },
  {
    name: 'close_app',
    description: "Chiude tutte le finestre di un'app di Aurora.",
    parameters: {
      type: 'object',
      properties: { appId: { type: 'string' } },
      required: ['appId']
    },
    target: 'renderer',
    destructive: false
  },

  // ---------- Windows app/feature integration ----------
  {
    name: 'launch_installed_app',
    description:
      "Avvia un programma di Windows installato sul computer (es. WhatsApp, Word, Edge, Chrome). Usa il nome che l'utente conosce.",
    parameters: {
      type: 'object',
      properties: { name: { type: 'string', description: "Nome dell'app come l'utente la conosce" } },
      required: ['name']
    },
    target: 'main',
    destructive: false
  },
  {
    name: 'open_windows_app',
    description:
      "Apre un'app integrata di Windows: photos, mail, calendar, calculator, edge, music, video, maps, weather.",
    parameters: {
      type: 'object',
      properties: {
        appName: {
          type: 'string',
          description: "Nome breve dell'app Windows",
          enum: Object.keys(WIN_APP_URIS)
        }
      },
      required: ['appName']
    },
    target: 'main',
    destructive: false
  },
  {
    name: 'open_windows_settings',
    description: "Apre una sezione delle Impostazioni di Windows (es. printers, network-wifi, display).",
    parameters: {
      type: 'object',
      properties: {
        section: { type: 'string', enum: WIN_SETTINGS_SECTIONS }
      },
      required: ['section']
    },
    target: 'main',
    destructive: false
  },
  {
    name: 'compose_email_external',
    description: "Apre il client email di sistema con una bozza precompilata (mailto:).",
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' }
      },
      required: ['to']
    },
    target: 'main',
    destructive: false
  },
  {
    name: 'web_search',
    description: 'Apre una ricerca web nel browser di sistema.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query']
    },
    target: 'main',
    destructive: false
  },

  // ---------- System controls ----------
  {
    name: 'system_action',
    description: 'Spegnimento, riavvio, sospensione, blocca schermo, esci dall\'utente.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['shutdown', 'restart', 'sleep', 'lock', 'logout'] }
      },
      required: ['action']
    },
    target: 'main',
    destructive: true
  },
  {
    name: 'set_volume',
    description: 'Imposta il volume di sistema (0-100).',
    parameters: {
      type: 'object',
      properties: { level: { type: 'number' } },
      required: ['level']
    },
    target: 'main',
    destructive: false
  },
  {
    name: 'set_brightness',
    description: 'Imposta la luminosità dello schermo (0-100). Disponibile solo su laptop.',
    parameters: {
      type: 'object',
      properties: { level: { type: 'number' } },
      required: ['level']
    },
    target: 'main',
    destructive: false
  },
  {
    name: 'get_system_status',
    description: 'Ottieni stato sistema: batteria, volume, luminosità, wifi, spazio disco, uptime.',
    parameters: { type: 'object', properties: {} },
    target: 'main',
    destructive: false
  },
  {
    name: 'take_screenshot',
    description: "Cattura una foto dello schermo e salvala in Immagini/Aurora-Screenshots.",
    parameters: { type: 'object', properties: {} },
    target: 'main',
    destructive: false
  },
  {
    name: 'install_app',
    description: 'Installa un programma da winget. Cerca prima con search_app per ottenere l\'ID.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: "ID winget esatto (es. Spotify.Spotify)" } },
      required: ['id']
    },
    target: 'main',
    destructive: true
  },
  {
    name: 'search_app',
    description: 'Cerca app installabili da winget per nome.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query']
    },
    target: 'main',
    destructive: false
  },

  // ---------- Files ----------
  {
    name: 'list_files',
    description: 'Elenca file e cartelle in un percorso. ~ è la home, ~/Documents per i Documenti.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } }
    },
    target: 'main',
    destructive: false
  },
  {
    name: 'read_file',
    description: 'Leggi il contenuto testuale di un file.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path']
    },
    target: 'main',
    destructive: false
  },
  {
    name: 'write_file',
    description: 'Scrivi (o sovrascrivi) un file di testo.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' }, content: { type: 'string' } },
      required: ['path', 'content']
    },
    target: 'main',
    destructive: true
  },
  {
    name: 'create_folder',
    description: 'Crea una cartella (anche annidata).',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path']
    },
    target: 'main',
    destructive: false
  },
  {
    name: 'delete_path',
    description: 'Sposta un file o cartella nel Cestino di Windows (recuperabile).',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path']
    },
    target: 'main',
    destructive: true
  },
  {
    name: 'search_files',
    description: "Cerca file per nome dentro una cartella (default ~/Documents).",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        path: { type: 'string', description: "Cartella in cui cercare (default ~/Documents)" }
      },
      required: ['query']
    },
    target: 'main',
    destructive: false
  },
  {
    name: 'open_with_default',
    description: "Apri un file con l'app predefinita di Windows.",
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path']
    },
    target: 'main',
    destructive: false
  },

  // ---------- Aurora UI ----------
  {
    name: 'notify',
    description: "Mostra una notifica in Aurora.",
    parameters: {
      type: 'object',
      properties: { title: { type: 'string' }, body: { type: 'string' } },
      required: ['title']
    },
    target: 'renderer',
    destructive: false
  },
  {
    name: 'change_theme',
    description: 'Cambia il tema (light o dark).',
    parameters: {
      type: 'object',
      properties: { theme: { type: 'string', enum: ['aurora-light', 'aurora-dark'] } },
      required: ['theme']
    },
    target: 'renderer',
    destructive: false
  },
  {
    name: 'change_text_size',
    description: 'Cambia la dimensione del testo (1.0=normale, 1.15=grande, 1.3=più grande, 1.5=molto grande).',
    parameters: {
      type: 'object',
      properties: { scale: { type: 'number' } },
      required: ['scale']
    },
    target: 'renderer',
    destructive: false
  }
]

export const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]))

export function openRouterToolSpec(): unknown[] {
  return TOOLS.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters }
  }))
}

/** Executors for "main"-target tools. Renderer-target tools are dispatched separately. */
export async function executeMainTool(req: ToolCallRequest): Promise<ToolCallResult> {
  const a = req.arguments as Record<string, unknown>
  try {
    switch (req.name) {
      // ---------- Windows integration ----------
      case 'launch_installed_app': {
        const r = await findAndLaunchApp(String(a.name || ''))
        return r.ok
          ? { ok: true, result: `Avviato: ${r.matched}` }
          : { ok: false, error: r.error || 'Programma non trovato' }
      }
      case 'open_windows_app': {
        const key = String(a.appName || '').toLowerCase()
        const uri = WIN_APP_URIS[key]
        if (!uri) return { ok: false, error: `App Windows '${a.appName}' non riconosciuta` }
        await shell.openExternal(uri)
        return { ok: true, result: `Aperto ${a.appName}` }
      }
      case 'open_windows_settings': {
        const section = String(a.section || '')
        const uri = section.startsWith('ms-settings:') ? section : `ms-settings:${section}`
        await shell.openExternal(uri)
        return { ok: true, result: `Aperte impostazioni: ${section}` }
      }
      case 'compose_email_external': {
        const to = encodeURIComponent(String(a.to || ''))
        const subject = encodeURIComponent(String(a.subject || ''))
        const body = encodeURIComponent(String(a.body || ''))
        await shell.openExternal(`mailto:${to}?subject=${subject}&body=${body}`)
        return { ok: true, result: 'Email pronta da inviare' }
      }
      case 'web_search': {
        const q = encodeURIComponent(String(a.query || ''))
        await shell.openExternal(`https://duckduckgo.com/?q=${q}`)
        return { ok: true, result: 'Ricerca aperta nel browser' }
      }

      // ---------- System controls ----------
      case 'system_action':
        return mapResult(await systemAction(a.action as 'shutdown' | 'restart' | 'sleep' | 'lock' | 'logout'))
      case 'set_volume':
        return mapResult(await setVolumeWindows(Number(a.level)))
      case 'set_brightness':
        return mapResult(await setBrightnessWindows(Number(a.level)))
      case 'get_system_status': {
        // Re-import here to avoid circular import; reuse status from controls module
        const { default: os } = await import('node:os')
        return {
          ok: true,
          result: {
            uptimeHours: Math.round(os.uptime() / 3600),
            note: 'Per dettagli completi usa controls:get-status'
          }
        }
      }
      case 'take_screenshot': {
        const r = await takeScreenshot()
        if (r.ok && r.path) {
          new Notification({
            title: 'Screenshot salvato',
            body: r.path
          }).show()
        }
        return r.ok ? { ok: true, result: r.path } : { ok: false, error: r.error }
      }
      case 'install_app': {
        const r = await installApp(String(a.id || ''))
        return r.ok
          ? { ok: true, result: r.output || 'Installato' }
          : { ok: false, error: r.error }
      }
      case 'search_app': {
        const r = await searchApp(String(a.query || ''))
        return { ok: true, result: r }
      }

      // ---------- Files ----------
      case 'list_files': {
        const path = safePath(a.path as string | undefined)
        const ents = await fs.readdir(path, { withFileTypes: true })
        return {
          ok: true,
          result: ents.map((e) => ({ name: e.name, isDirectory: e.isDirectory() }))
        }
      }
      case 'read_file': {
        const text = await fs.readFile(safePath(a.path as string), 'utf-8')
        return { ok: true, result: text.slice(0, 50_000) }
      }
      case 'write_file': {
        const p = safePath(a.path as string)
        await fs.mkdir(dirname(p), { recursive: true })
        await fs.writeFile(p, String(a.content ?? ''), 'utf-8')
        return { ok: true, result: `Scritto ${p}` }
      }
      case 'create_folder': {
        const p = safePath(a.path as string)
        await fs.mkdir(p, { recursive: true })
        return { ok: true, result: `Creata cartella ${p}` }
      }
      case 'delete_path': {
        const p = safePath(a.path as string)
        try {
          await shell.trashItem(p)
        } catch {
          await fs.rm(p, { recursive: true, force: true })
        }
        return { ok: true, result: `Spostato nel Cestino: ${p}` }
      }
      case 'search_files': {
        const root = safePath((a.path as string) || join(app.getPath('documents')))
        const needle = String(a.query || '').toLowerCase()
        const out: string[] = []
        async function walk(dir: string, depth: number): Promise<void> {
          if (depth > 4 || out.length >= 50) return
          const ents = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
          for (const e of ents) {
            if (e.name.startsWith('.')) continue
            const full = join(dir, e.name)
            if (e.name.toLowerCase().includes(needle)) out.push(full)
            if (e.isDirectory()) await walk(full, depth + 1)
          }
        }
        await walk(root, 0)
        return { ok: true, result: out }
      }
      case 'open_with_default': {
        const p = safePath(a.path as string)
        const err = await shell.openPath(p)
        return err ? { ok: false, error: err } : { ok: true, result: `Aperto ${p}` }
      }

      default:
        return { ok: false, error: `Tool sconosciuto in main: ${req.name}` }
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function mapResult(r: { ok: boolean; error?: string }): ToolCallResult {
  return r.ok ? { ok: true, result: 'Eseguito' } : { ok: false, error: r.error }
}

// Re-export for backward compat (orchestrator imports these names)
export { TOOL_BY_NAME as TOOL_REGISTRY }
export const _IPC_MARKER: IpcMain | null = null
