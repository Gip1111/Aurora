# Aurora DE

**Un guscio semplice e bello sopra Windows 11, con un assistente intelligente che fa tutto al posto tuo.**

Aurora DE non sostituisce Windows: lo rende facile. Pensato per chi non è esperto di computer (incluso chi ha 90 anni), trasforma le mille opzioni di Windows in un assistente in italiano a cui basta chiedere quello che vuoi.

---

## Cosa fa

- 💬 **"Chiedimi" in alto, sempre visibile.** Scrivi cosa vuoi fare in italiano normale ("apri WhatsApp", "vedo le foto", "stampa questo file", "alza il volume"), Aurora lo fa.
- 🪟 **Lancia i programmi di Windows** che hai già (Edge, Word, Photos, Spotify, …) con icone grandi
- ⚙️ **Apre direttamente le sezioni delle Impostazioni di Windows** che ti servono (stampante, wifi, schermo, audio…)
- 📦 **Installa nuove app** dal Microsoft Store / winget chiedendole all'AI
- 🔋 **Volume, luminosità, batteria, wifi** in un pannello unico in alto a destra
- 📁 **Documenti**, **Note**, **Calcolatrice** nel guscio Aurora — versioni super-semplici di quello che già c'è in Windows
- 🔒 **Multi-utente** con avatar e PIN (opzionale), niente password lunghe

---

## Installazione (versione utente)

> Nota: l'installer è in arrivo. Per ora bisogna avviarlo dal codice — vedi sotto.

1. **Scarica** `Aurora-DE-Setup.exe` (quando disponibile)
2. **Doppio click** → segui i passi → fine
3. Aurora DE compare nel menu Start. Aprila.
4. Al primo avvio segui il **benvenuto in 4 schermate**: scegli quanto grande vuoi il testo, e sei pronto.

### Per far funzionare l'assistente AI

Aurora DE utilizza **OpenRouter**, un servizio che permette di accedere ai modelli AI più avanzati nel cloud.

1. Vai su [openrouter.ai/keys](https://openrouter.ai/keys) e crea un account gratuito.
2. Genera una API Key.
3. Apri Aurora → Impostazioni → Assistente AI e incolla la tua chiave.
4. Seleziona il modello desiderato (di default è impostato su `openrouter/owl-alpha`, che è completamente **gratuito**).

Ora l'assistente è pronto e ti dirà "Tutto funziona".

---

## Esempi: cosa puoi chiedere

| Chiedi così | Aurora fa |
|---|---|
| "apri WhatsApp" | Cerca WhatsApp tra i programmi installati e lo lancia |
| "voglio vedere le foto" | Apre Foto di Windows |
| "voglio scrivere a Maria su email" | Apre il client mail con bozza pronta per Maria |
| "aggiungi una stampante" | Apre direttamente Impostazioni > Stampanti |
| "alza il volume al 70%" | Imposta il volume di sistema al 70% |
| "fammi vedere come è la batteria" | "67%, in carica, circa 2 ore restanti" |
| "spegni il computer" | Chiede conferma e spegne |
| "installa Spotify" | Cerca con winget, chiede conferma, installa |
| "salva una nota della spesa: pane, latte, mele" | Apre Note con la lista pronta |
| "fai una foto allo schermo" | Salva uno screenshot in Immagini/Aurora-Screenshots |
| "cerca su Google il numero di emergenza in Italia" | Apre Edge con la ricerca |

---

## App incluse in Aurora

Solo cinque, tenute molto semplici:

- **Documenti** — naviga Home/Documenti/Immagini/Download/Desktop con icone grandi. Doppio click apre con l'app di Windows. "Cestino" sicuro (puoi sempre recuperare).
- **Note** — testo semplice, salvataggio automatico in `Documenti\Aurora Note\`. Bottoni AI: riassumi, riscrivi, continua.
- **Calcolatrice** — base e scientifica, anche da tastiera.
- **Programmi** — griglia di tutti i programmi installati su Windows con le loro icone vere, ricerca veloce. Click = lancia.
- **Impostazioni** — solo quello che riguarda Aurora (tema chiaro/scuro, dimensione testo, AI, email link, account utente). C'è anche una sezione che ti porta diretto alle Impostazioni di Windows.

Tutto il resto (Foto, Browser, Calendario, Mail, Media Player, …) → l'AI lancia direttamente l'equivalente di Windows.

---

## Scorciatoie da tastiera

| Tasto | Cosa fa |
|---|---|
| `Ctrl+K` | Apre l'assistente "Chiedimi" |
| `Ctrl+Spazio` | App launcher |
| `F3` | Vista panoramica finestre aperte |
| `Esc` | Chiude pannelli aperti |
| `Win+←` / `Win+→` | Snap finestra metà schermo |
| `Win+↑` | Massimizza |
| `Win+↓` | Ripristina |
| Tasto destro ovunque | Menu con "Chiedi all'AI" |
| Selezionare testo | Bolla "✨ Chiedi all'AI" appare a fianco |

---

## Per sviluppatori

### Setup

```bash
cd c:/Users/Gian-PC/Downloads/desktop
pnpm install
pnpm dev
```

### Avvertenza importante: `ELECTRON_RUN_AS_NODE`

Se lanci da un terminale dentro VS Code o Claude Code, la variabile `ELECTRON_RUN_AS_NODE=1` viene ereditata dall'editor (entrambi sono Electron) e fa partire Electron in modalità Node.js puro: `process.type` diventa `undefined`, `require("electron")` ritorna il path al binario invece dell'API, e `app.whenReady()` crasha.

Lo script `pnpm dev` usa `scripts/dev.mjs` che cancella questa variabile prima di lanciare electron-vite. Quindi funziona anche da terminali "sporchi".

Se proprio devi lanciare a mano:
```bash
$env:ELECTRON_RUN_AS_NODE = ''   # PowerShell
unset ELECTRON_RUN_AS_NODE       # bash
pnpm electron-vite dev
```

### Stack

- **Electron 32** + **electron-vite 2.3** (build)
- **React 18** + **TypeScript** + **Tailwind v4** (UI)
- **Zustand** (stato), **framer-motion** (animazioni)
- **OpenRouter API** (backend cloud per l'AI, usa owl-alpha gratis)
- **`@node-rs/argon2`** (hash PIN multi-utente, dipendenza opzionale con fallback `scrypt` Node nativo)

### Struttura

```
src/
├── main/                    # Processo Electron principale
│   ├── index.ts             # Bootstrap, BrowserWindow, IPC wiring
│   ├── ipc/
│   │   ├── filesystem.ts    # File CRUD + ricerca + cestino
│   │   ├── system.ts        # info/notify/openExternal/openPath/auto-start
│   │   ├── system-controls.ts # Volume/luminosità/screenshot/winget/shutdown
│   │   ├── installed-apps.ts  # Scan Start Menu .lnk → lista programmi
│   │   ├── ollama.ts        # Health check + lista modelli
│   │   ├── ai.ts            # Stream chat tools-loop
│   │   └── users.ts         # Multi-utente argon2/scrypt
│   ├── ai/
│   │   ├── tools.ts         # ~25 tool: launch_installed_app, open_windows_settings, …
│   │   └── orchestrator.ts  # Loop tool-calling Ollama (max 8 iter)
│   └── util/path.ts         # safePath() consolidato (Windows-safe)
├── preload/index.ts         # contextBridge tipizzato
├── renderer/
│   ├── shell/               # Wallpaper, Taskbar, Dock, Welcome, ContextMenu, QuickSettings, ActivitiesOverview, LoginScreen, …
│   ├── apps/                # files, notes, calculator, programs, settings
│   ├── ai/                  # AIOverlay (Ctrl+K), AISidebar, AIBubble, useAIAgent, ConfirmDialog
│   ├── stores/              # session/windows/ai/shell/notifications/apps (Zustand)
│   ├── design-system/       # Glass, Window, Button, Input, motion presets
│   └── styles/globals.css   # Tokens CSS, ui-scale, animazioni
└── shared/types.ts          # Tipi condivisi main/preload/renderer
```

### Comandi

| Comando | Cosa fa |
|---|---|
| `pnpm dev` | Dev server (HMR) — la finestra Aurora si apre da sola |
| `pnpm typecheck` | Verifica TypeScript di main + renderer |
| `pnpm build` | Build production in `out/` |
| `pnpm dist:win` | Crea installer NSIS Windows (`out/make/Aurora-DE-Setup-0.1.0.exe`) |

### Come l'AI esegue azioni di sistema

1. L'utente scrive in `AIOverlay` (Cmd+K)
2. `useAIAgent` invia tutto a `ai:chat` IPC
3. `orchestrator.ts` chiama l'API di OpenRouter in streaming passandogli i tool (`openRouterToolSpec()`)
4. OpenRouter risponde con `tool_calls` → l'orchestrator esegue:
   - **Tool main** (`executeMainTool`): file, system controls, winget, screenshot, shell.openExternal/openPath
   - **Tool renderer** (`aiBridge.runRendererTool`): apri app Aurora, cambia tema/uiScale, notifica
5. Tool distruttivi (`system_action`, `install_app`, `delete_path`, `write_file`) passano da `confirmBus` → modal glass con conferma
6. Risultati ri-iniettati nella conversazione, fino a max 8 cicli

### Dove Aurora salva i dati

| Cosa | Dove |
|---|---|
| Lista utenti + hash PIN | `%APPDATA%/aurora-de/users.json` |
| Settings (tema, uiScale, openrouterApiKey, …) | `localStorage` del renderer (chiave `aurora:settings`) |
| Note | `~/Documenti/Aurora Note/*.txt` |
| Screenshot | `~/Pictures/Aurora-Screenshots/` |
| Cache lista programmi installati | in memoria, refresh manuale dal pulsante "Aggiorna" |

---

## Limiti noti

- **Volume e luminosità** funzionano solo su Windows (PowerShell/WMI). Su laptop senza driver giusti la luminosità può fallire silenziosamente — Aurora lo segnala.
- **Scan programmi installati** legge i `.lnk` di `Start Menu`; le app installate solo come MSIX/Store potrebbero non comparire — la cosa più affidabile è chiedere all'AI ("apri WhatsApp" funziona anche se l'icona non c'è).
- **Drop file dall'Esplora dentro Documenti** funziona solo per file di testo / piccoli (<1MB) per ora.
- **Disinstallazione**: l'installer NSIS rimuove `node_modules` e `out`, ma `%APPDATA%/aurora-de` (utenti) sopravvive — opzione "rimuovi tutti i dati" arriva con l'installer.

---

## Licenza

MIT.
