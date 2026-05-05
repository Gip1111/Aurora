export type AppId =
  | 'files'
  | 'notes'
  | 'calculator'
  | 'programs'
  | 'trash'
  | 'settings'

export interface SessionSnapshot {
  windows: Array<{
    appId: AppId
    x: number
    y: number
    width: number
    height: number
    maximized: boolean
    minimized: boolean
    payload?: Record<string, unknown>
  }>
  lastUpdated: number
}

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modified: number
}

export interface NotificationPayload {
  id?: string
  title: string
  body?: string
  appId?: AppId
  level?: 'info' | 'success' | 'warning' | 'error'
}

export interface ToolCallRequest {
  name: string
  arguments: Record<string, unknown>
}

export interface ToolCallResult {
  ok: boolean
  result?: unknown
  error?: string
}

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: ToolCallRequest[]
  toolName?: string
  toolCallId?: string
}

export interface AIStreamEvent {
  type: 'token' | 'tool_call' | 'tool_result' | 'done' | 'error'
  data?: unknown
}

export interface SystemInfo {
  platform: NodeJS.Platform
  hostname: string
  username: string
  homeDir: string
  totalMemory: number
  freeMemory: number
  cpuCount: number
}

export interface InstalledApp {
  name: string
  path: string
  iconDataUrl?: string
  category?: string
}

export interface SystemStatus {
  battery?: { percent: number; charging: boolean; remainingMinutes?: number }
  audioVolume?: number
  brightness?: number
  wifiSsid?: string
  diskFreeGb?: number
  uptimeHours?: number
}

export interface AppSettings {
  theme: 'aurora-dark' | 'aurora-light'
  wallpaper: string
  /** Optional custom wallpaper image (file:// URI). Empty string = use built-in shader. */
  wallpaperImage: string
  openrouterApiKey: string
  openrouterModel: string
  autonomousMode: boolean
  cursorTrail: boolean
  reduceMotion: boolean
  uiScale: number
  uiSounds: boolean
  mailUrl: string
  firstRun: boolean
  autoStart: boolean
  /** Floating AI orb visibility + position. */
  aiOrbEnabled: boolean
  aiOrbX: number
  aiOrbY: number
}

export interface DesktopIcon {
  id: string
  /** "file" → opens path with shell.openPath; "folder" → opens in Files app;
   *  "program" → launches installed Windows program by path */
  kind: 'file' | 'folder' | 'program'
  label: string
  /** Absolute path (file/folder) or executable path (program) */
  target: string
  /** Position on the desktop grid (in pixels, top-left of icon) */
  x: number
  y: number
  /** Optional custom icon emoji (overrides type-based icon) */
  emoji?: string
}
