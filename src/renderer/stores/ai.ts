import { create } from 'zustand'
import type { AIChatMessage } from '@shared/types'

export interface AIToolCallRecord {
  id: string
  name: string
  arguments: Record<string, unknown>
  status: 'pending' | 'ok' | 'error'
  result?: unknown
  error?: string
  destructive: boolean
}

export interface AIThreadMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: AIToolCallRecord[]
  streaming?: boolean
  /** Epoch ms — set once when the message is first created */
  timestamp?: number
}

interface AIStore {
  open: boolean
  sidebarOpen: boolean
  messages: AIThreadMessage[]
  status: 'idle' | 'streaming'
  health: 'unknown' | 'ok' | 'down'
  context: string | null
  setOpen: (v: boolean) => void
  toggle: () => void
  setSidebar: (v: boolean) => void
  setStatus: (s: 'idle' | 'streaming') => void
  setHealth: (h: 'unknown' | 'ok' | 'down') => void
  setContext: (c: string | null) => void
  pushUser: (text: string) => string
  startAssistant: () => string
  appendAssistant: (id: string, chunk: string) => void
  finishAssistant: (id: string) => void
  pushToolCall: (assistantId: string, call: AIToolCallRecord) => void
  updateToolCall: (assistantId: string, callId: string, patch: Partial<AIToolCallRecord>) => void
  reset: () => void
  asChatMessages: () => AIChatMessage[]

  // ---- Persistence ----
  /** Persist current messages to disk for the given user */
  persist: (userId: string) => void
  /** Load messages from disk for the given user and replace current messages */
  hydrate: (userId: string) => Promise<void>
  /** Clear persisted history for the given user */
  clearHistory: (userId: string) => void
}

const newId = (): string => Math.random().toString(36).slice(2)

/** Debounce helper for auto-save */
let saveTimer: ReturnType<typeof setTimeout> | null = null
function debouncedPersist(userId: string, messages: AIThreadMessage[]): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (typeof window === 'undefined' || !window.api?.aiHistory) return
    const entries = messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp ?? Date.now()
    }))
    window.api.aiHistory.save(userId, entries).catch(() => {})
  }, 1500)
}

export const useAIStore = create<AIStore>((set, get) => ({
  open: false,
  sidebarOpen: false,
  messages: [],
  status: 'idle',
  health: 'unknown',
  context: null,
  setOpen: (v) => set({ open: v }),
  toggle: () => set({ open: !get().open }),
  setSidebar: (v) => set({ sidebarOpen: v }),
  setStatus: (s) => set({ status: s }),
  setHealth: (h) => set({ health: h }),
  setContext: (c) => set({ context: c }),
  pushUser: (text) => {
    const id = newId()
    const msg: AIThreadMessage = { id, role: 'user', content: text, timestamp: Date.now() }
    set({ messages: [...get().messages, msg] })
    return id
  },
  startAssistant: () => {
    const id = newId()
    set({
      messages: [...get().messages, { id, role: 'assistant', content: '', streaming: true, timestamp: Date.now() }]
    })
    return id
  },
  appendAssistant: (id, chunk) =>
    set({
      messages: get().messages.map((m) =>
        m.id === id ? { ...m, content: m.content + chunk } : m
      )
    }),
  finishAssistant: (id) =>
    set({
      messages: get().messages.map((m) => (m.id === id ? { ...m, streaming: false } : m))
    }),
  pushToolCall: (assistantId, call) =>
    set({
      messages: get().messages.map((m) =>
        m.id === assistantId
          ? { ...m, toolCalls: [...(m.toolCalls ?? []), call] }
          : m
      )
    }),
  updateToolCall: (assistantId, callId, patch) =>
    set({
      messages: get().messages.map((m) =>
        m.id === assistantId
          ? {
              ...m,
              toolCalls: (m.toolCalls ?? []).map((c) =>
                c.id === callId ? { ...c, ...patch } : c
              )
            }
          : m
      )
    }),
  reset: () => set({ messages: [], status: 'idle' }),
  asChatMessages: () =>
    get().messages.map((m) => ({ role: m.role, content: m.content }) as AIChatMessage),

  // ---- Persistence ----
  persist: (userId) => {
    debouncedPersist(userId, get().messages)
  },
  hydrate: async (userId) => {
    if (!window.api?.aiHistory) return
    try {
      const entries = await window.api.aiHistory.load(userId)
      if (entries && entries.length > 0) {
        const msgs: AIThreadMessage[] = entries.map((e) => ({
          id: e.id,
          role: e.role as 'user' | 'assistant',
          content: e.content,
          timestamp: e.timestamp
        }))
        set({ messages: msgs })
      }
    } catch {
      // first run or corrupt file — start fresh
    }
  },
  clearHistory: (userId) => {
    set({ messages: [], status: 'idle' })
    window.api?.aiHistory?.clear(userId).catch(() => {})
  }
}))
