import { ipcMain, type BrowserWindow } from 'electron'
import {
  TOOL_BY_NAME,
  executeMainTool,
  openRouterToolSpec
} from './tools.js'
import type { AIChatMessage, AIStreamEvent, ToolCallRequest } from '@shared/types.js'

const SYSTEM_PROMPT = `Sei l'assistente di Aurora DE: una shell semplificata sopra Windows 11 pensata per chi non è esperto di computer (incluso un nonno di 90 anni). L'utente parla italiano.

Stile: amichevole, paziente, frasi corte, niente gergo tecnico (no "shell", "package manager", "IPC", "CLI"). Chiama "programmi" gli .exe, "Impostazioni di Windows" il pannello, "Cestino" il recycle bin.

Aurora ha solo poche app proprie super-semplici: Documenti (file), Note (testo), Calcolatrice, Programmi (lista app installate), Impostazioni (di Aurora). Per TUTTO il resto, lancia o automatizza Windows.

Hai dei TOOL. Usali invece di inventare risposte:

App Aurora interne:
- open_app(appId) — apri Documenti / Note / Calcolatrice / Programmi / Impostazioni
- close_app(appId)

Lancia/usa Windows:
- launch_installed_app(name) — lancia un programma installato (WhatsApp, Word, Edge, Spotify, Chrome…). Usalo per "apri WhatsApp", "voglio Word".
- open_windows_app(appName) — apre un'app integrata di Windows: photos, mail, calendar, calculator, edge, music, video, maps, weather. Usalo per "voglio vedere le foto" → photos, "calendario" → calendar, "navigare in internet" → edge.
- open_windows_settings(section) — apre Impostazioni di Windows. Usalo per "aggiungi stampante" → printers, "wifi" → network-wifi, "schermo" → display, "audio" → sound.
- compose_email_external(to, subject, body) — apre email di sistema con bozza
- web_search(query) — ricerca nel browser di sistema

Sistema:
- system_action(action) — shutdown / restart / sleep / lock / logout (Aurora chiede conferma)
- set_volume(0-100), set_brightness(0-100)
- get_system_status — batteria, volume, wifi, spazio
- take_screenshot — salva in Immagini/Aurora-Screenshots
- install_app(id) — installa via winget; prima cerca con search_app per ottenere l'ID
- search_app(query) — cerca app installabili

File:
- list_files, read_file, write_file, create_folder, delete_path (cestino), search_files, open_with_default

UI Aurora:
- notify(title, body), change_theme, change_text_size

REGOLE FONDAMENTALI:
1. Quando l'utente chiede di FARE qualcosa, USA SEMPRE un tool. Non descrivere come fare, FAI.
2. Se non sai esattamente cosa vuole, chiedi UNA domanda breve.
3. Per azioni distruttive (system_action, install_app, write_file, delete_path) Aurora chiederà conferma — tu non chiedere il permesso, basta procedere.
4. Prima del tool, una frase corta tipo: "Apro le foto…" / "Cerco WhatsApp…". Dopo, conferma in 1 riga.
5. Se l'utente chiede una cosa di Windows che non hai come tool, spiega in 2-3 passi e proponi open_windows_settings se utile.
6. Mai dire "non posso" senza proporre alternativa.

ESEMPI DI MAPPING (usa SEMPRE questi tool):
- "apri edge" / "apri il browser" → launch_installed_app(name="Edge") oppure open_windows_app(appName="edge")
- "apri whatsapp" → launch_installed_app(name="WhatsApp")
- "apri word" → launch_installed_app(name="Word")
- "voglio vedere le foto" → open_windows_app(appName="photos")
- "crea cartella sul desktop" → create_folder(path="~/Desktop/NuovaCartella")
- "crea cartella X in documenti" → create_folder(path="~/Documents/X")
- "scrivi una nota X" → open_app(appId="notes") + opzionalmente write_file
- "alza volume al 70" → set_volume(level=70)
- "che ora è" → rispondi direttamente, niente tool
- "cerca su google X" → web_search(query="X")
- "fai una foto allo schermo" → take_screenshot()
- "aggiungi stampante" → open_windows_settings(section="printers")
- "spegni il pc" → system_action(action="shutdown")`

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

interface ChatOptions {
  apiKey: string
  model: string
  messages: AIChatMessage[]
  signal?: AbortSignal
}

/**
 * Run a chat completion with tool-calling loop via OpenRouter.
 * Streams events to the renderer via webContents.send('ai:event:<id>', event).
 */
export async function runAgent(
  win: BrowserWindow | null,
  streamId: string,
  opts: ChatOptions
): Promise<void> {
  if (!win) return
  const send = (e: AIStreamEvent): void => {
    if (!win.isDestroyed()) win.webContents.send(`ai:event:${streamId}`, e)
  }

  if (!opts.apiKey) {
    send({
      type: 'error',
      data: 'Chiave API OpenRouter non configurata. Vai in Impostazioni → Assistente AI e inserisci la tua chiave API.'
    })
    return
  }

  // Filter out empty assistant messages
  const cleanMessages = opts.messages.filter((m, i, arr) => {
    if (m.role === 'assistant' && !m.content?.trim() && !m.toolCalls?.length) {
      return false
    }
    if (m.role === 'user') {
      const next = arr[i + 1]
      if (next && next.role === 'assistant' && !next.content?.trim() && !next.toolCalls?.length) {
        if (i !== arr.length - 1 && i !== arr.length - 2) return false
      }
    }
    return true
  })

  // Cap to last N messages to keep within context window
  const MAX_HISTORY = 12
  const trimmed = cleanMessages.slice(-MAX_HISTORY)

  const messages: Array<{
    role: string
    content: string
    tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>
    tool_call_id?: string
    name?: string
  }> = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...trimmed.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool' as const,
          content: m.content,
          tool_call_id: m.toolCallId || `call_${m.toolName || 'unknown'}`,
          name: m.toolName
        }
      }
      if (m.role === 'assistant' && m.toolCalls?.length) {
        return {
          role: 'assistant' as const,
          content: m.content || '',
          tool_calls: m.toolCalls.map((tc, idx) => ({
            id: `call_${tc.name}_${idx}`,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments)
            }
          }))
        }
      }
      return { role: m.role, content: m.content }
    })
  ]

  const tools = openRouterToolSpec()

  const fallbackModels = [
    opts.model,
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-3-27b-it:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'openrouter/owl-alpha'
  ]

  for (let iter = 0; iter < 8; iter++) {
    let res: Response | null = null
    let activeModel = opts.model

    // Try fallback models if rate-limited
    for (const m of fallbackModels) {
      activeModel = m
      try {
        console.log(`[ai] iter ${iter} POST OpenRouter model=${activeModel} messages=${messages.length}`)
        const payload: Record<string, unknown> = {
          model: activeModel,
          messages,
          tools,
          tool_choice: 'auto'
        }
        res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${opts.apiKey}`,
            'HTTP-Referer': 'https://aurora-de.app',
            'X-OpenRouter-Title': 'Aurora DE'
          },
          body: JSON.stringify(payload),
          signal: opts.signal
        })
        
        if (res.status === 429 || res.status === 502 || res.status === 404) {
          console.warn(`[ai] Model ${activeModel} returned ${res.status}, trying next fallback...`)
          continue
        }
        break // Stop fallback loop if request was successful or failed with other error
      } catch (err) {
        console.warn(`[ai] Fetch failed for ${activeModel}:`, err)
        continue
      }
    }

    if (!res) {
      send({ type: 'error', data: 'Nessun modello di riserva disponibile. Verifica la connessione o riprova più tardi.' })
      return
    }

    if (!res.ok) {
      let detail = ''
      try {
        detail = await res.text()
      } catch {
        /* ignore */
      }
      const isAuthError = res.status === 401 || res.status === 403
      const msg = isAuthError
        ? 'Chiave API OpenRouter non valida o scaduta. Controlla in Impostazioni → Assistente AI.'
        : `Tutti i modelli gratuiti sono momentaneamente intasati (HTTP ${res.status}). Riprova tra 1-2 minuti.`
      send({ type: 'error', data: msg })
      return
    }

    console.log(`[ai] response received status=${res.status}, parsing JSON...`)
    let assistantContent = ''
    const collectedToolCalls: (ToolCallRequest & { callId: string })[] = []

    let json: {
      choices?: Array<{
        message?: {
          content?: string | null
          tool_calls?: Array<{
            id: string
            type: string
            function: { name: string; arguments: string }
          }>
        }
        finish_reason?: string
      }>
      error?: { message?: string }
    }
    try {
      json = await res.json()
    } catch (e) {
      send({
        type: 'error',
        data: `Risposta OpenRouter non valida: ${e instanceof Error ? e.message : String(e)}`
      })
      return
    }

    if (json.error) {
      send({ type: 'error', data: `OpenRouter: ${json.error.message || 'Errore sconosciuto'}` })
      return
    }

    const choice = json.choices?.[0]
    const msg = choice?.message
    if (msg?.content) {
      assistantContent = msg.content
      send({ type: 'token', data: msg.content })
    }
    if (msg?.tool_calls && Array.isArray(msg.tool_calls)) {
      for (const tc of msg.tool_calls) {
        if (!tc.function?.name) continue
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(tc.function.arguments || '{}')
        } catch {
          args = {}
        }
        collectedToolCalls.push({
          name: tc.function.name,
          arguments: args,
          callId: tc.id
        })
      }
    }
    console.log(
      `[ai] parsed. content_len=${assistantContent.length} tools=${collectedToolCalls.length}`
    )

    if (collectedToolCalls.length === 0) {
      send({ type: 'done', data: { content: assistantContent } })
      return
    }

    // Push assistant message with tool_calls to conversation
    messages.push({
      role: 'assistant',
      content: assistantContent || '',
      tool_calls: collectedToolCalls.map((tc) => ({
        id: tc.callId,
        type: 'function' as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments)
        }
      }))
    })

    for (const call of collectedToolCalls) {
      const def = TOOL_BY_NAME.get(call.name)
      if (!def) {
        const err = `Tool sconosciuto: ${call.name}`
        send({ type: 'tool_result', data: { call, ok: false, error: err } })
        messages.push({
          role: 'tool',
          content: err,
          tool_call_id: call.callId,
          name: call.name
        })
        continue
      }

      send({ type: 'tool_call', data: { call, destructive: def.destructive } })

      let result: { ok: boolean; result?: unknown; error?: string }
      if (def.target === 'renderer') {
        result = await dispatchRendererTool(win, call, def.destructive)
      } else {
        if (def.destructive) {
          const approved = await confirmDestructive(win, call)
          if (!approved) {
            result = { ok: false, error: "Annullato dall'utente" }
          } else {
            result = await executeMainTool(call)
          }
        } else {
          result = await executeMainTool(call)
        }
      }

      send({ type: 'tool_result', data: { call, ...result } })
      messages.push({
        role: 'tool',
        content: JSON.stringify(result).slice(0, 8000),
        tool_call_id: call.callId,
        name: call.name
      })
    }
  }

  send({ type: 'done', data: { content: '', stoppedReason: 'max_iterations' } })
}

function dispatchRendererTool(
  win: BrowserWindow,
  call: ToolCallRequest,
  destructive: boolean
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).slice(2)
    const channel = `ai:renderer-tool-result:${id}`
    const handler = (_e: unknown, payload: { ok: boolean; result?: unknown; error?: string }): void => {
      ipcMain.removeListener(channel, handler)
      resolve(payload)
    }
    ipcMain.once(channel, handler)
    win.webContents.send('ai:renderer-tool', { id, call, destructive })
    setTimeout(() => {
      ipcMain.removeListener(channel, handler)
      resolve({ ok: false, error: 'Timeout esecuzione tool' })
    }, 30_000)
  })
}

function confirmDestructive(
  win: BrowserWindow,
  call: ToolCallRequest
): Promise<boolean> {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).slice(2)
    const channel = `ai:confirm-result:${id}`
    const handler = (_e: unknown, approved: boolean): void => {
      ipcMain.removeListener(channel, handler)
      resolve(approved)
    }
    ipcMain.once(channel, handler)
    win.webContents.send('ai:confirm', { id, call })
    setTimeout(() => {
      ipcMain.removeListener(channel, handler)
      resolve(false)
    }, 60_000)
  })
}
