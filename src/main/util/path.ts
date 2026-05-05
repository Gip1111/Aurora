import { homedir } from 'node:os'
import { join, normalize, isAbsolute, sep } from 'node:path'

const HOME = homedir()

/**
 * Normalize a user-supplied path so that it works correctly on Windows.
 *
 * Why: the renderer and the AI sometimes send paths in mixed forms:
 *   - empty / undefined            -> $HOME
 *   - "~" or "~/foo" or "~\\foo"   -> $HOME[/foo]
 *   - "/C:/Users/..."              -> Windows interprets the leading "/" as
 *                                     drive-root and concatenates -> "C:\\C:\\..."
 *                                     Strip the leading slash.
 *   - "/Users/..." (POSIX style)   -> on Windows this is drive-root; leave as is
 *                                     and let path.normalize handle it.
 *   - native absolute path         -> unchanged after normalize.
 */
export function safePath(raw: string | undefined | null): string {
  if (!raw) return HOME

  let p = String(raw).trim()
  if (!p) return HOME

  // ~ expansion (handles "~", "~/", "~\\", "~/foo", "~\\foo")
  if (p === '~') return HOME
  if (p.startsWith('~/') || p.startsWith('~\\')) {
    return normalize(join(HOME, p.slice(2)))
  }
  if (p.startsWith('~')) {
    // "~something" treat as "~/something"
    return normalize(join(HOME, p.slice(1)))
  }

  // Windows fix: "/C:/foo" or "/C:\\foo" → "C:/foo"
  if (process.platform === 'win32' && p.length > 1 && p[0] === '/' && /^[a-zA-Z]:/.test(p.slice(1))) {
    p = p.slice(1)
  }

  return normalize(p)
}

export const HOME_DIR = HOME
export const PATH_SEP = sep

/** Are two paths equal as filesystem locations? Cross-platform. */
export function pathEquals(a: string, b: string): boolean {
  const na = normalize(a)
  const nb = normalize(b)
  return process.platform === 'win32'
    ? na.toLowerCase() === nb.toLowerCase()
    : na === nb
}

export { isAbsolute }
