import { create } from 'zustand'
import type { AppSettings } from '@shared/types'

export interface SessionUser {
  id: string
  name: string
  avatar: string
}

interface SessionStore {
  user: SessionUser | null
  loggedIn: boolean
  settings: AppSettings
  login: (user: SessionUser) => void
  logout: () => void
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'aurora-light',
  wallpaper: 'aurora-flow',
  wallpaperImage: '',
  openrouterApiKey: '',
  openrouterModel: 'meta-llama/llama-3.3-70b-instruct:free',
  autonomousMode: false,
  cursorTrail: false,
  reduceMotion: false,
  uiScale: 1.15,
  uiSounds: false,
  mailUrl: 'https://mail.google.com/mail/u/0/#inbox',
  firstRun: true,
  autoStart: false,
  aiOrbEnabled: true,
  aiOrbX: -120,
  aiOrbY: -120
}

const STORAGE_KEY = 'aurora-de-settings'

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const merged = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    // Migration: any of the previous defaults gets upgraded to the current
    // default. User-selected non-default values are preserved.
    const LEGACY_DEFAULTS = [
      'qwen2.5:7b', 'qwen3:4b', 'qwen2.5:3b', 'llama3.2:3b', 'llama3.2:1b',
      'openrouter/owl-alpha', 'meta-llama/llama-4-scout:free', 'google/gemini-2.0-flash-exp:free'
    ]
    if (LEGACY_DEFAULTS.includes((merged as any).ollamaModel) || LEGACY_DEFAULTS.includes(merged.openrouterModel) || !merged.openrouterModel) {
      merged.openrouterModel = DEFAULT_SETTINGS.openrouterModel
    }
    return merged
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(s: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // ignore
  }
}

function applyTheme(theme: string): void {
  document.documentElement.setAttribute('data-theme', theme)
}

function applyUiScale(scale: number): void {
  document.documentElement.style.setProperty('--ui-scale', String(scale))
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  user: null,
  loggedIn: false,
  settings: loadSettings(),
  login: (user) => set({ user, loggedIn: true }),
  logout: () => set({ user: null, loggedIn: false }),
  setSetting: (key, value) => {
    const next = { ...get().settings, [key]: value }
    saveSettings(next)
    set({ settings: next })
    if (key === 'theme') applyTheme(value as string)
    if (key === 'uiScale') applyUiScale(value as number)
  }
}))

if (typeof document !== 'undefined') {
  const s = loadSettings()
  applyTheme(s.theme)
  applyUiScale(s.uiScale)
}
