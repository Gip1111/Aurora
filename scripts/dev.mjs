#!/usr/bin/env node
// Launches electron-vite dev with ELECTRON_RUN_AS_NODE deleted from env.
// Needed when running inside Electron-based tools (e.g. VS Code, Claude Code)
// that inherit ELECTRON_RUN_AS_NODE=1.
import { spawn } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const bin = resolve(root, 'node_modules', '.bin', 'electron-vite')
const child = spawn(bin, ['dev'], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: true
})

child.on('close', (code) => process.exit(code ?? 0))
