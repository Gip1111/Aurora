import type { ToolCallRequest } from '@shared/types'

type Listener = (req: { call: ToolCallRequest; resolve: (ok: boolean) => void }) => void

const listeners = new Set<Listener>()

export function onConfirmRequest(cb: Listener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function showConfirmDialog(call: ToolCallRequest): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (listeners.size === 0) {
      // No UI mounted: deny by default for safety.
      resolve(false)
      return
    }
    listeners.forEach((cb) => cb({ call, resolve }))
  })
}
