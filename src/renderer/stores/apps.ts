import {
  FolderOpen,
  StickyNote,
  Calculator,
  LayoutGrid,
  Settings as SettingsIcon,
  Trash2,
  type LucideIcon
} from 'lucide-react'
import type { AppId } from '@shared/types'

export interface AppMeta {
  id: AppId
  name: string
  icon: LucideIcon
  gradient: string
  description: string
  inDock: boolean
}

export const APPS: AppMeta[] = [
  {
    id: 'files',
    name: 'Documenti',
    icon: FolderOpen,
    gradient: 'linear-gradient(135deg, #4fd6ff 0%, #b07cff 100%)',
    description: 'I tuoi file e cartelle',
    inDock: true
  },
  {
    id: 'notes',
    name: 'Note',
    icon: StickyNote,
    gradient: 'linear-gradient(135deg, #ffd86c 0%, #ff9c4f 100%)',
    description: 'Scrivi appunti rapidi',
    inDock: true
  },
  {
    id: 'calculator',
    name: 'Calcolatrice',
    icon: Calculator,
    gradient: 'linear-gradient(135deg, #6affb1 0%, #4fd6ff 100%)',
    description: 'Fai i conti',
    inDock: true
  },
  {
    id: 'programs',
    name: 'Programmi',
    icon: LayoutGrid,
    gradient: 'linear-gradient(135deg, #b07cff 0%, #ff6cc4 100%)',
    description: 'Apri i tuoi programmi',
    inDock: true
  },
  {
    id: 'trash',
    name: 'Cestino',
    icon: Trash2,
    gradient: 'linear-gradient(135deg, #ff8a8a 0%, #ff6cc4 100%)',
    description: 'File eliminati di recente',
    inDock: false
  },
  {
    id: 'settings',
    name: 'Impostazioni',
    icon: SettingsIcon,
    gradient: 'linear-gradient(135deg, #8a8aa6 0%, #c8c8d8 100%)',
    description: 'Personalizza Aurora',
    inDock: true
  }
]

export const APP_BY_ID = new Map(APPS.map((a) => [a.id, a]))
