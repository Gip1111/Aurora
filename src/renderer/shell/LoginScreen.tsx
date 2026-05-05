import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallpaper } from './Wallpaper'
import { useSessionStore } from '@/stores/session'
import { ArrowRight, Plus, Trash2, X } from 'lucide-react'

interface ListedUser {
  id: string
  name: string
  avatar: string
  hasPin: boolean
  gradient: string
}

const AVATAR_OPTIONS = ['🌟', '🌸', '🌊', '🌙', '☀️', '🦄', '🌈', '🎨', '🎵', '📚', '🍀', '🌷']

const GRADIENTS = [
  'linear-gradient(135deg, #b07cff, #4fd6ff)',
  'linear-gradient(135deg, #ff6cc4, #b07cff)',
  'linear-gradient(135deg, #4fd6ff, #6affb1)',
  'linear-gradient(135deg, #ffb86c, #ff6cc4)',
  'linear-gradient(135deg, #6affb1, #4fd6ff)'
]

export function LoginScreen(): JSX.Element {
  const login = useSessionStore((s) => s.login)
  const [now, setNow] = useState(new Date())
  const [users, setUsers] = useState<ListedUser[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const reload = useCallback(async (): Promise<void> => {
    try {
      const list = await window.api.users.list()
      const decorated = list.map((u, i) => ({
        ...u,
        gradient: GRADIENTS[i % GRADIENTS.length]
      }))
      setUsers(decorated)
      if (decorated.length > 0) setSelectedId((id) => id ?? decorated[0].id)
    } catch {
      setUsers([])
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(i)
  }, [])

  const time = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  const selected = users.find((u) => u.id === selectedId) ?? null

  const submit = async (): Promise<void> => {
    if (!selected) {
      // Login as Guest (no users yet)
      login({ id: 'guest', name: 'Ospite', avatar: '👤' })
      return
    }
    if (!selected.hasPin) {
      login({ id: selected.id, name: selected.name, avatar: selected.avatar })
      return
    }
    if (pin.length < 4) return
    const ok = await window.api.users.verifyPin(selected.id, pin)
    if (ok) {
      login({ id: selected.id, name: selected.name, avatar: selected.avatar })
    } else {
      setShake(true)
      setPin('')
      setTimeout(() => setShake(false), 500)
    }
  }

  const loginAsGuest = (): void => {
    login({ id: 'guest', name: 'Ospite', avatar: '👤' })
  }

  const deleteUser = async (id: string): Promise<void> => {
    if (!confirm('Eliminare questo utente?')) return
    await window.api.users.delete(id)
    if (selectedId === id) setSelectedId(null)
    await reload()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <Wallpaper />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(7,7,13,0.45)',
          backdropFilter: 'blur(60px) saturate(140%)',
          WebkitBackdropFilter: 'blur(60px) saturate(140%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 48
        }}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 28 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
        >
          <div
            style={{
              fontSize: 92,
              fontWeight: 200,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: -2,
              lineHeight: 1,
              color: 'white',
              textShadow: '0 2px 24px rgba(0,0,0,0.5)'
            }}
          >
            {time}
          </div>
          <div
            style={{
              fontSize: 18,
              color: 'rgba(255,255,255,0.75)',
              textTransform: 'capitalize'
            }}
          >
            {date}
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 220, damping: 28 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 28
          }}
        >
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 800 }}>
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  setSelectedId(u.id)
                  setPin('')
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 8,
                  borderRadius: 14,
                  position: 'relative'
                }}
              >
                <motion.div
                  animate={{
                    scale: selectedId === u.id ? 1.15 : 1,
                    boxShadow:
                      selectedId === u.id
                        ? '0 0 0 3px rgba(176,124,255,0.6), 0 0 32px rgba(79,214,255,0.5)'
                        : '0 0 0 1px rgba(255,255,255,0.10)'
                  }}
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: '50%',
                    background: u.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 42
                  }}
                >
                  {u.avatar}
                </motion.div>
                <span
                  style={{
                    color: selectedId === u.id ? 'white' : 'rgba(255,255,255,0.6)',
                    fontSize: 14,
                    fontWeight: 500
                  }}
                >
                  {u.name}
                </span>
                {selectedId === u.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      void deleteUser(u.id)
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      background: 'rgba(255, 80, 100, 0.6)',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Elimina utente"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </button>
            ))}
            <button
              onClick={() => setShowCreate(true)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 8,
                borderRadius: 14,
                color: 'rgba(255,255,255,0.7)'
              }}
            >
              <div
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: '50%',
                  border: '2px dashed rgba(255,255,255,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Plus size={32} color="rgba(255,255,255,0.6)" />
              </div>
              <span style={{ fontSize: 14 }}>Nuovo utente</span>
            </button>
          </div>

          {selected && selected.hasPin && (
            <motion.div
              animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div style={{ display: 'flex', gap: 10 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      border: '1.5px solid rgba(255,255,255,0.4)',
                      background: pin.length > i ? 'white' : 'transparent'
                    }}
                  />
                ))}
              </div>
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pin.length >= 4) void submit()
                }}
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: 0,
                  height: 0,
                  pointerEvents: 'none'
                }}
              />
              {pin.length >= 4 && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={() => void submit()}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'white',
                    border: 'none',
                    color: '#0b0b14',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ArrowRight size={18} />
                </motion.button>
              )}
            </motion.div>
          )}

          {selected && !selected.hasPin && (
            <button
              onClick={() => void submit()}
              style={{
                padding: '10px 28px',
                borderRadius: 24,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.30)',
                color: 'white',
                fontSize: 15,
                cursor: 'pointer',
                backdropFilter: 'blur(20px)'
              }}
            >
              Entra come {selected.name}
            </button>
          )}

          {users.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>
                Nessun utente ancora. Crea il primo, o entra come Ospite.
              </div>
              <button
                onClick={loginAsGuest}
                style={{
                  padding: '10px 24px',
                  borderRadius: 22,
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.30)',
                  color: 'white',
                  fontSize: 14,
                  cursor: 'pointer',
                  backdropFilter: 'blur(20px)'
                }}
              >
                Entra come Ospite
              </button>
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateUserDialog
            onClose={() => setShowCreate(false)}
            onCreated={async () => {
              setShowCreate(false)
              await reload()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function CreateUserDialog({
  onClose,
  onCreated
}: {
  onClose: () => void
  onCreated: () => Promise<void>
}): JSX.Element {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0])
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async (): Promise<void> => {
    if (!name.trim()) {
      setError('Inserisci un nome')
      return
    }
    setBusy(true)
    try {
      await window.api.users.create(name.trim(), avatar, pin)
      await onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(24px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-elev-3, rgba(40,40,65,0.92))',
          border: '1px solid rgba(255,255,255,0.20)',
          borderRadius: 18,
          padding: 32,
          width: 460,
          color: 'white',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          position: 'relative'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 28,
            height: 28,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.10)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={16} />
        </button>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Nuovo utente</h2>
        <p style={{ marginTop: 6, marginBottom: 22, color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>
          Crea un profilo personale con avatar e PIN opzionale.
        </p>

        <div style={{ marginBottom: 14 }}>
          <label style={dialogLabel}>Nome</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Maria"
            style={dialogInput}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={dialogLabel}>Avatar</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AVATAR_OPTIONS.map((a) => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background:
                    avatar === a ? 'var(--gradient-aurora)' : 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.20)',
                  fontSize: 24,
                  cursor: 'pointer'
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={dialogLabel}>PIN (opzionale, almeno 4 cifre)</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="Lascia vuoto per nessun PIN"
            style={dialogInput}
          />
        </div>

        {error && (
          <div
            style={{
              padding: 10,
              background: 'rgba(255, 80, 100, 0.18)',
              border: '1px solid rgba(255, 80, 100, 0.4)',
              borderRadius: 8,
              color: '#ffb3bf',
              fontSize: 13,
              marginBottom: 12
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.20)',
              borderRadius: 10,
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Annulla
          </button>
          <button
            onClick={() => void create()}
            disabled={busy}
            style={{
              padding: '10px 20px',
              background: 'var(--gradient-aurora)',
              border: 'none',
              borderRadius: 10,
              color: '#0b0b14',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {busy ? 'Creo…' : 'Crea utente'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

const dialogLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: 'rgba(255,255,255,0.7)',
  marginBottom: 6
}
const dialogInput: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.20)',
  borderRadius: 10,
  color: 'white',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box'
}
