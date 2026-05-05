/**
 * Connects renderer-side tool execution to the main-process AI orchestrator.
 *
 * The main process asks us to:
 *  - execute a renderer-only tool (open_app, change_theme, change_text_size, notify, close_app)
 *  - confirm a destructive system tool (system_action, install_app, write_file, delete_path)
 */

import { useWindowsStore } from '@/stores/windows'
import { useNotificationsStore } from '@/stores/notifications'
import { useSessionStore } from '@/stores/session'
import type { AppId, ToolCallRequest } from '@shared/types'
import { showConfirmDialog } from './confirmBus'

async function runRendererTool(
  call: ToolCallRequest
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const a = call.arguments as Record<string, string | number>
  try {
    switch (call.name) {
      case 'open_app': {
        const appId = a.appId as AppId
        useWindowsStore.getState().open(appId)
        return { ok: true, result: `App ${appId} aperta` }
      }
      case 'close_app': {
        useWindowsStore.getState().closeApp(a.appId as AppId)
        return { ok: true, result: `App ${a.appId} chiusa` }
      }
      case 'notify': {
        useNotificationsStore.getState().push({
          title: String(a.title),
          body: a.body ? String(a.body) : undefined
        })
        return { ok: true, result: 'Notifica mostrata' }
      }
      case 'change_theme': {
        useSessionStore
          .getState()
          .setSetting('theme', a.theme as 'aurora-dark' | 'aurora-light')
        return { ok: true, result: `Tema impostato su ${a.theme}` }
      }
      case 'change_text_size': {
        useSessionStore.getState().setSetting('uiScale', Number(a.scale))
        return { ok: true, result: `Dimensione testo: ${a.scale}` }
      }
      default:
        return { ok: false, error: `Tool renderer sconosciuto: ${call.name}` }
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export function setupAIBridge(): () => void {
  const offTool = window.api.ai.onRendererTool(async ({ id, call }) => {
    const result = await runRendererTool(call)
    window.api.ai.rendererToolResult(id, result)
  })

  const offConfirm = window.api.ai.onConfirm(async ({ id, call }) => {
    const settings = useSessionStore.getState().settings
    if (settings.autonomousMode) {
      window.api.ai.confirmResult(id, true)
      return
    }
    const approved = await showConfirmDialog(call)
    window.api.ai.confirmResult(id, approved)
  })

  return () => {
    offTool()
    offConfirm()
  }
}
