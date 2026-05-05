/**
 * UI sounds. We synthesize tiny tones via Web Audio so we don't need to ship
 * MP3 assets — keeps the installer lean and there's no licensing concerns.
 *
 * Three sounds:
 *  - notify: soft 880→660 Hz arpeggio (200ms)
 *  - success: rising 660→880 Hz (180ms)
 *  - error: descending 440→220 Hz (250ms)
 *
 * Gated by `settings.uiSounds` in the consumer (notifications.ts).
 */

import { useSessionStore } from '@/stores/session'

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (audioCtx) return audioCtx
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx = new Ctor()
    return audioCtx
  } catch {
    return null
  }
}

interface ToneSpec {
  freqStart: number
  freqEnd: number
  duration: number // seconds
  gain: number
}

const SOUNDS: Record<'notify' | 'success' | 'error', ToneSpec[]> = {
  notify: [
    { freqStart: 880, freqEnd: 880, duration: 0.08, gain: 0.08 },
    { freqStart: 660, freqEnd: 660, duration: 0.1, gain: 0.06 }
  ],
  success: [
    { freqStart: 660, freqEnd: 990, duration: 0.18, gain: 0.08 }
  ],
  error: [
    { freqStart: 440, freqEnd: 220, duration: 0.25, gain: 0.10 }
  ]
}

export type SoundName = keyof typeof SOUNDS

/** Plays a tone if uiSounds is enabled. Best-effort, never throws. */
export function play(name: SoundName): void {
  if (!useSessionStore.getState().settings.uiSounds) return
  const ctx = getCtx()
  if (!ctx) return
  // Resume context if suspended (browsers autoplay policy)
  if (ctx.state === 'suspended') void ctx.resume()
  const specs = SOUNDS[name]
  let t = ctx.currentTime
  for (const spec of specs) {
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(spec.freqStart, t)
      osc.frequency.linearRampToValueAtTime(spec.freqEnd, t + spec.duration)
      // Smooth envelope (avoid clicks)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(spec.gain, t + 0.01)
      gain.gain.linearRampToValueAtTime(0, t + spec.duration)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + spec.duration + 0.02)
    } catch {
      /* swallow */
    }
    t += spec.duration
  }
}
