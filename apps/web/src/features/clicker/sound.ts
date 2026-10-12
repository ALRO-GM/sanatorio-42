/**
 * Los sonidos del juego, hechos al vuelo con el sintetizador del navegador: no
 * hay ningún fichero de audio. Vienen apagados, que en un cluster no se oye
 * bien que alguien esté jugando; quien quiera los enciende.
 */

const KEY = 'sanatorio_clicker_sound'

export type Sound = 'click' | 'buy' | 'upgrade' | 'golden' | 'achievement' | 'bad' | 'squash'

/** Cada sonido: forma de onda, notas (Hz) y cuánto dura cada una, en segundos. */
const TUNES: Record<Sound, { wave: OscillatorType; notes: number[]; step: number; gain: number }> =
  {
    click: { wave: 'triangle', notes: [520], step: 0.04, gain: 0.05 },
    buy: { wave: 'square', notes: [330, 440], step: 0.06, gain: 0.04 },
    upgrade: { wave: 'square', notes: [440, 554, 659], step: 0.07, gain: 0.04 },
    golden: { wave: 'sine', notes: [659, 784, 988, 1319], step: 0.09, gain: 0.07 },
    achievement: { wave: 'triangle', notes: [523, 659, 784], step: 0.1, gain: 0.06 },
    bad: { wave: 'sawtooth', notes: [220, 165, 110], step: 0.12, gain: 0.05 },
    squash: { wave: 'sawtooth', notes: [180, 90], step: 0.05, gain: 0.06 },
  }

let context: AudioContext | null = null

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setSound(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    // Sin almacenamiento, vale solo para esta visita.
  }
}

/** Toca un sonido, si están encendidos. Nunca falla: sin audio, no suena y ya. */
export function play(sound: Sound, on: boolean): void {
  if (!on) return

  try {
    context ??= new AudioContext()

    const tune = TUNES[sound]
    const start = context.currentTime
    const volume = context.createGain()

    volume.connect(context.destination)
    volume.gain.setValueAtTime(tune.gain, start)
    volume.gain.exponentialRampToValueAtTime(0.0001, start + tune.notes.length * tune.step + 0.08)

    tune.notes.forEach((note, index) => {
      const voice = context?.createOscillator()

      if (voice === undefined) return

      voice.type = tune.wave
      voice.frequency.setValueAtTime(note, start + index * tune.step)
      voice.connect(volume)
      voice.start(start + index * tune.step)
      voice.stop(start + (index + 1) * tune.step + 0.06)
    })
  } catch {
    // El navegador no deja sonar (o no hay audio): se juega en silencio.
  }
}
