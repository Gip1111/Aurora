import { contextBridge, ipcRenderer } from 'electron'
import type {
  AIChatMessage,
  AIStreamEvent,
  FileEntry,
  InstalledApp,
  NotificationPayload,
  SessionSnapshot,
  SystemInfo,
  SystemStatus,
  ToolCallRequest
} from '../shared/types.js'

const api = {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    quit: () => ipcRenderer.invoke('window:quit'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized') as Promise<boolean>,
    onOpenAI: (cb: () => void): (() => void) => {
      const listener = (): void => cb()
      ipcRenderer.on('aurora:open-ai', listener)
      return () => {
        ipcRenderer.removeListener('aurora:open-ai', listener)
      }
    },
    onUpdateAvailable: (cb: (info: { version: string }) => void): (() => void) => {
      const listener = (_e: unknown, info: { version: string }): void => cb(info)
      ipcRenderer.on('aurora:update-available', listener)
      return () => {
        ipcRenderer.removeListener('aurora:update-available', listener)
      }
    },
    onUpdateDownloaded: (cb: (info: { version: string }) => void): (() => void) => {
      const listener = (_e: unknown, info: { version: string }): void => cb(info)
      ipcRenderer.on('aurora:update-downloaded', listener)
      return () => {
        ipcRenderer.removeListener('aurora:update-downloaded', listener)
      }
    }
  },
  fs: {
    list: (path: string) => ipcRenderer.invoke('fs:list', path) as Promise<FileEntry[]>,
    read: (path: string) => ipcRenderer.invoke('fs:read', path) as Promise<string>,
    write: (path: string, content: string) =>
      ipcRenderer.invoke('fs:write', path, content) as Promise<void>,
    writeBinary: (path: string, data: ArrayBuffer | Uint8Array) =>
      ipcRenderer.invoke('fs:write-binary', path, data) as Promise<void>,
    mkdir: (path: string) => ipcRenderer.invoke('fs:mkdir', path) as Promise<void>,
    remove: (path: string) => ipcRenderer.invoke('fs:remove', path) as Promise<void>,
    rename: (src: string, dst: string) =>
      ipcRenderer.invoke('fs:rename', src, dst) as Promise<void>,
    home: () => ipcRenderer.invoke('fs:home') as Promise<string>,
    docs: () => ipcRenderer.invoke('fs:docs') as Promise<string>,
    pictures: () => ipcRenderer.invoke('fs:pictures') as Promise<string>,
    downloads: () => ipcRenderer.invoke('fs:downloads') as Promise<string>,
    desktop: () => ipcRenderer.invoke('fs:desktop') as Promise<string>,
    stat: (path: string) => ipcRenderer.invoke('fs:stat', path) as Promise<FileEntry | null>,
    search: (path: string, query: string, max?: number) =>
      ipcRenderer.invoke('fs:search', path, query, max) as Promise<FileEntry[]>,
    trash: (path: string) => ipcRenderer.invoke('fs:trash', path) as Promise<void>,
    trashList: () =>
      ipcRenderer.invoke('fs:trash-list') as Promise<
        Array<{
          name: string
          path: string
          originalPath: string
          trashedAt: number
          size: number
          isDirectory: boolean
        }>
      >,
    trashRestore: (path: string) =>
      ipcRenderer.invoke('fs:trash-restore', path) as Promise<{ ok: boolean; error?: string }>,
    trashDelete: (path: string) => ipcRenderer.invoke('fs:trash-delete', path) as Promise<void>,
    trashEmpty: () => ipcRenderer.invoke('fs:trash-empty') as Promise<void>
  },
  sys: {
    info: () => ipcRenderer.invoke('sys:info') as Promise<SystemInfo>,
    notify: (p: NotificationPayload) => ipcRenderer.invoke('sys:notify', p),
    openExternal: (url: string) => ipcRenderer.invoke('sys:open-external', url),
    openPath: (path: string) => ipcRenderer.invoke('sys:open-path', path),
    showInFolder: (path: string) => ipcRenderer.invoke('sys:show-in-folder', path),
    openWindowsSettings: (section: string) =>
      ipcRenderer.invoke('sys:open-windows-settings', section),
    setAutoStart: (enabled: boolean) =>
      ipcRenderer.invoke('sys:set-auto-start', enabled) as Promise<boolean>,
    getAutoStart: () => ipcRenderer.invoke('sys:get-auto-start') as Promise<boolean>,
    pickImage: () => ipcRenderer.invoke('dialog:open-image') as Promise<string | null>
  },
  controls: {
    setVolume: (level: number) =>
      ipcRenderer.invoke('controls:set-volume', level) as Promise<{ ok: boolean; error?: string }>,
    setBrightness: (level: number) =>
      ipcRenderer.invoke('controls:set-brightness', level) as Promise<{
        ok: boolean
        error?: string
      }>,
    getStatus: () => ipcRenderer.invoke('controls:get-status') as Promise<SystemStatus>,
    systemAction: (action: 'shutdown' | 'restart' | 'sleep' | 'lock' | 'logout') =>
      ipcRenderer.invoke('controls:system-action', action) as Promise<{
        ok: boolean
        error?: string
      }>,
    takeScreenshot: () =>
      ipcRenderer.invoke('controls:take-screenshot') as Promise<{
        ok: boolean
        path?: string
        error?: string
      }>,
    installApp: (id: string) =>
      ipcRenderer.invoke('controls:install-app', id) as Promise<{
        ok: boolean
        output?: string
        error?: string
      }>,
    searchApp: (q: string) =>
      ipcRenderer.invoke('controls:search-app', q) as Promise<
        Array<{ id: string; name: string; version?: string; source?: string }>
      >
  },
  programs: {
    list: () => ipcRenderer.invoke('programs:list') as Promise<InstalledApp[]>,
    launch: (path: string) =>
      ipcRenderer.invoke('programs:launch', path) as Promise<{ ok: boolean; error?: string }>,
    refresh: () => ipcRenderer.invoke('programs:refresh') as Promise<InstalledApp[]>,
    getIcon: (path: string) =>
      ipcRenderer.invoke('programs:get-icon', path) as Promise<string | null>
  },
  sessionState: {
    save: (userId: string, snapshot: SessionSnapshot) =>
      ipcRenderer.invoke('session-state:save', userId, snapshot) as Promise<void>,
    load: (userId: string) =>
      ipcRenderer.invoke('session-state:load', userId) as Promise<SessionSnapshot | null>,
    clear: (userId: string) =>
      ipcRenderer.invoke('session-state:clear', userId) as Promise<void>
  },
  users: {
    list: () =>
      ipcRenderer.invoke('users:list') as Promise<
        Array<{ id: string; name: string; avatar: string; hasPin: boolean }>
      >,
    create: (name: string, avatar: string, pin: string) =>
      ipcRenderer.invoke('users:create', name, avatar, pin) as Promise<string>,
    verifyPin: (id: string, pin: string) =>
      ipcRenderer.invoke('users:verify-pin', id, pin) as Promise<boolean>,
    delete: (id: string) => ipcRenderer.invoke('users:delete', id) as Promise<void>,
    setPin: (id: string, pin: string) =>
      ipcRenderer.invoke('users:set-pin', id, pin) as Promise<void>
  },
  openrouter: {
    health: (apiKey?: string) => ipcRenderer.invoke('openrouter:health', apiKey) as Promise<boolean>,
    models: () => ipcRenderer.invoke('openrouter:models') as Promise<string[]>
  },
  ai: {
    chat: (
      streamId: string,
      payload: { apiKey: string; model: string; messages: AIChatMessage[] }
    ) => ipcRenderer.invoke('ai:chat', streamId, payload),
    abort: (streamId: string) => ipcRenderer.invoke('ai:abort', streamId),
    onEvent: (streamId: string, cb: (e: AIStreamEvent) => void) => {
      const listener = (_e: unknown, ev: AIStreamEvent): void => cb(ev)
      ipcRenderer.on(`ai:event:${streamId}`, listener)
      return () => ipcRenderer.removeListener(`ai:event:${streamId}`, listener)
    },
    onRendererTool: (
      cb: (req: { id: string; call: ToolCallRequest; destructive: boolean }) => void
    ) => {
      const listener = (
        _e: unknown,
        payload: { id: string; call: ToolCallRequest; destructive: boolean }
      ): void => cb(payload)
      ipcRenderer.on('ai:renderer-tool', listener)
      return () => ipcRenderer.removeListener('ai:renderer-tool', listener)
    },
    rendererToolResult: (id: string, payload: { ok: boolean; result?: unknown; error?: string }) =>
      ipcRenderer.send(`ai:renderer-tool-result:${id}`, payload),
    onConfirm: (cb: (req: { id: string; call: ToolCallRequest }) => void) => {
      const listener = (_e: unknown, payload: { id: string; call: ToolCallRequest }): void =>
        cb(payload)
      ipcRenderer.on('ai:confirm', listener)
      return () => ipcRenderer.removeListener('ai:confirm', listener)
    },
    confirmResult: (id: string, approved: boolean) =>
      ipcRenderer.send(`ai:confirm-result:${id}`, approved)
  },
  aiHistory: {
    save: (userId: string, entries: Array<{ id: string; role: string; content: string; timestamp: number }>) =>
      ipcRenderer.invoke('ai-history:save', userId, entries) as Promise<void>,
    load: (userId: string) =>
      ipcRenderer.invoke('ai-history:load', userId) as Promise<
        Array<{ id: string; role: string; content: string; timestamp: number }> | null
      >,
    clear: (userId: string) =>
      ipcRenderer.invoke('ai-history:clear', userId) as Promise<void>
  },
  settings: {
    backup: () =>
      ipcRenderer.invoke('settings:backup') as Promise<{ ok: boolean; path?: string; error?: string }>,
    restore: () =>
      ipcRenderer.invoke('settings:restore') as Promise<{ ok: boolean; count?: number; error?: string }>
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
