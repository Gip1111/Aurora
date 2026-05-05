import { useCallback, useRef } from 'react'
import { useAIStore, type AIToolCallRecord } from '@/stores/ai'
import { useSessionStore } from '@/stores/session'
import type { AIStreamEvent, ToolCallRequest } from '@shared/types'

interface ToolEventData {
  call: ToolCallRequest
  destructive?: boolean
  ok?: boolean
  result?: unknown
  error?: string
}

export function useAIAgent(): {
  send: (text: string) => Promise<void>
  abort: () => void
} {
  const settings = useSessionStore((s) => s.settings)
  const store = useAIStore
  const streamRef = useRef<{ id: string; off?: () => void } | null>(null)

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const s = store.getState()
      s.pushUser(trimmed)
      const assistantId = s.startAssistant()
      s.setStatus('streaming')

      const streamId = Math.random().toString(36).slice(2)
      const off = window.api.ai.onEvent(streamId, (ev: AIStreamEvent) => {
        switch (ev.type) {
          case 'token':
            s.appendAssistant(assistantId, ev.data as string)
            break
          case 'tool_call': {
            const d = ev.data as ToolEventData
            const rec: AIToolCallRecord = {
              id: Math.random().toString(36).slice(2),
              name: d.call.name,
              arguments: d.call.arguments,
              status: 'pending',
              destructive: d.destructive ?? false
            }
            s.pushToolCall(assistantId, rec)
            break
          }
          case 'tool_result': {
            const d = ev.data as ToolEventData
            const m = store
              .getState()
              .messages.find((mm) => mm.id === assistantId)
            const tcs = m?.toolCalls ?? []
            let last: AIToolCallRecord | undefined
            for (let i = tcs.length - 1; i >= 0; i--) {
              if (tcs[i].name === d.call.name && tcs[i].status === 'pending') {
                last = tcs[i]
                break
              }
            }
            if (last) {
              s.updateToolCall(assistantId, last.id, {
                status: d.ok ? 'ok' : 'error',
                result: d.result,
                error: d.error
              })
            }
            break
          }
          case 'done':
            s.finishAssistant(assistantId)
            s.setStatus('idle')
            off()
            break
          case 'error':
            s.appendAssistant(assistantId, `\n\n⚠️ ${ev.data as string}`)
            s.finishAssistant(assistantId)
            s.setStatus('idle')
            off()
            break
        }
      })
      streamRef.current = { id: streamId, off }

      const messages = store
        .getState()
        .messages.map((m) => ({ role: m.role, content: m.content }))
        // The user message we just pushed and the empty assistant placeholder
        // are both included; drop the empty assistant for the request.
        .filter((_, idx, arr) => !(idx === arr.length - 1))

      try {
        await window.api.ai.chat(streamId, {
          apiKey: settings.openrouterApiKey,
          model: settings.openrouterModel,
          messages
        })
      } catch (err) {
        s.appendAssistant(assistantId, `\n\n⚠️ ${err instanceof Error ? err.message : String(err)}`)
        s.finishAssistant(assistantId)
        s.setStatus('idle')
      }
    },
    [settings.openrouterApiKey, settings.openrouterModel, store]
  )

  const abort = useCallback(() => {
    if (streamRef.current) {
      window.api.ai.abort(streamRef.current.id)
      streamRef.current.off?.()
      streamRef.current = null
      const s = store.getState()
      s.setStatus('idle')
      const last = s.messages[s.messages.length - 1]
      if (last && last.role === 'assistant') s.finishAssistant(last.id)
    }
  }, [store])

  return { send, abort }
}
