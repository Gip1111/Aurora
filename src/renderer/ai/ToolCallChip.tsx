import { Check, X, Loader2, Wrench } from 'lucide-react'
import type { AIToolCallRecord } from '@/stores/ai'

interface Props {
  call: AIToolCallRecord
}

export function ToolCallChip({ call }: Props): JSX.Element {
  const icon =
    call.status === 'pending' ? (
      <Loader2 size={11} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
    ) : call.status === 'ok' ? (
      <Check size={11} />
    ) : (
      <X size={11} />
    )

  const color =
    call.status === 'pending'
      ? '#4fd6ff'
      : call.status === 'ok'
      ? '#6affb1'
      : '#ff8a8a'

  const label = formatLabel(call)

  return (
    <span
      title={JSON.stringify(call.arguments, null, 2)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        padding: '4px 8px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${color}40`,
        color
      }}
    >
      <Wrench size={11} style={{ opacity: 0.6 }} />
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ color }}>{icon}</span>
    </span>
  )
}

function formatLabel(c: AIToolCallRecord): string {
  const a = c.arguments as Record<string, string>
  switch (c.name) {
    case 'open_app':
      return `apri ${a.appId}`
    case 'close_app':
      return `chiudi ${a.appId}`
    case 'create_folder':
      return `crea cartella ${a.path}`
    case 'delete_path':
      return `elimina ${a.path}`
    case 'write_file':
      return `scrivi ${a.path}`
    case 'read_file':
      return `leggi ${a.path}`
    case 'list_files':
      return `lista ${a.path}`
    case 'search_files':
      return `cerca "${a.query}"`
    case 'run_shell':
      return `shell: ${(a.command || '').slice(0, 40)}${(a.command || '').length > 40 ? '…' : ''}`
    case 'install_package':
      return `installa ${a.name}`
    case 'web_search':
      return `cerca web "${a.query}"`
    case 'change_theme':
      return `tema → ${a.theme}`
    case 'notify':
      return `notifica`
    case 'compose_email':
      return `mail → ${a.to}`
    case 'create_event':
      return `evento`
    case 'open_settings':
      return `impostazioni`
    default:
      return c.name
  }
}
