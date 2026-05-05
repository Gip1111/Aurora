import { app, type IpcMain } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from 'node:crypto'

interface StoredUser {
  id: string
  name: string
  avatar: string
  pinHash?: string
  pinSalt?: string
}

let argonAvailable = true
let argonHash: ((pin: string) => Promise<string>) | null = null
let argonVerify: ((hash: string, pin: string) => Promise<boolean>) | null = null

async function loadArgon(): Promise<void> {
  if (argonHash) return
  try {
    const mod = (await import('@node-rs/argon2')) as {
      hash: (pin: string) => Promise<string>
      verify: (hash: string, pin: string) => Promise<boolean>
    }
    argonHash = (pin: string) => mod.hash(pin)
    argonVerify = (hash: string, pin: string) => mod.verify(hash, pin)
  } catch {
    argonAvailable = false
  }
}

function scryptHash(pin: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pin, salt, 64).toString('hex')
  return { hash, salt }
}

function scryptVerify(pin: string, hash: string, salt: string): boolean {
  try {
    const candidate = scryptSync(pin, salt, 64)
    const stored = Buffer.from(hash, 'hex')
    return candidate.length === stored.length && timingSafeEqual(candidate, stored)
  } catch {
    return false
  }
}

async function hashPin(pin: string): Promise<{ hash: string; salt?: string }> {
  await loadArgon()
  if (argonAvailable && argonHash) {
    return { hash: await argonHash(pin) }
  }
  const r = scryptHash(pin)
  return { hash: r.hash, salt: r.salt }
}

async function verifyPin(pin: string, user: StoredUser): Promise<boolean> {
  if (!user.pinHash) return true // no PIN set
  if (user.pinSalt) {
    return scryptVerify(pin, user.pinHash, user.pinSalt)
  }
  await loadArgon()
  if (argonAvailable && argonVerify) {
    try {
      return await argonVerify(user.pinHash, pin)
    } catch {
      return false
    }
  }
  return false
}

function usersFile(): string {
  return join(app.getPath('userData'), 'users.json')
}

async function readUsers(): Promise<StoredUser[]> {
  try {
    const raw = await fs.readFile(usersFile(), 'utf-8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(usersFile(), JSON.stringify(users, null, 2), 'utf-8')
}

export function registerUsersIpc(ipcMain: IpcMain): void {
  ipcMain.handle(
    'users:list',
    async (): Promise<Array<{ id: string; name: string; avatar: string; hasPin: boolean }>> => {
      const users = await readUsers()
      return users.map((u) => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        hasPin: !!u.pinHash
      }))
    }
  )

  ipcMain.handle(
    'users:create',
    async (_e, name: string, avatar: string, pin: string): Promise<string> => {
      const users = await readUsers()
      const id = randomUUID()
      const stored: StoredUser = { id, name, avatar }
      if (pin && pin.length >= 4) {
        const h = await hashPin(pin)
        stored.pinHash = h.hash
        if (h.salt) stored.pinSalt = h.salt
      }
      users.push(stored)
      await writeUsers(users)
      return id
    }
  )

  ipcMain.handle(
    'users:verify-pin',
    async (_e, id: string, pin: string): Promise<boolean> => {
      const users = await readUsers()
      const u = users.find((x) => x.id === id)
      if (!u) return false
      return verifyPin(pin, u)
    }
  )

  ipcMain.handle('users:delete', async (_e, id: string): Promise<void> => {
    const users = await readUsers()
    await writeUsers(users.filter((u) => u.id !== id))
  })

  ipcMain.handle('users:set-pin', async (_e, id: string, pin: string): Promise<void> => {
    const users = await readUsers()
    const u = users.find((x) => x.id === id)
    if (!u) return
    if (pin && pin.length >= 4) {
      const h = await hashPin(pin)
      u.pinHash = h.hash
      u.pinSalt = h.salt
    } else {
      delete u.pinHash
      delete u.pinSalt
    }
    await writeUsers(users)
  })
}
