/**
 * Sonidos hechos al vuelo con el sintetizador del navegador: no hay ningún
 * fichero de audio. Lo usan los juegos (Code Clicker, Not-games).
 */

/** Un sonido: forma de onda, notas (Hz), cuánto dura cada una (s) y volumen. */
export type Tune = { wave: OscillatorType; notes: number[]; step: number; gain: number }

let context: AudioContext | null = null

/** Toca un sonido. Nunca falla: sin audio (o si el navegador no deja), no suena y ya. */
export function tone(tune: Tune): void {
  try {
    context ??= new AudioContext()

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
    // Sin audio: se juega en silencio.
  }
}
