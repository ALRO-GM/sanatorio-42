/**
 * El sonido de fondo del Pomodoro: ruido, naturaleza o lo-fi, en bucle.
 *
 * - **Ruido** (blanco, rosa, marrón): se genera en el navegador, sin fichero.
 *   Un trozo de unos segundos con el final ya fundido con el principio, así que
 *   el bucle no tiene costura.
 * - **Naturaleza y lo-fi**: ficheros de `public/sounds/focus/` (licencias en
 *   `docs/pomodoro-sonidos.md`). Suenan con dos reproductores que se turnan: un
 *   poco antes de que acabe uno empieza el otro desde el principio, y durante
 *   `CROSSFADE_S` el que acaba baja y el que empieza sube.
 *
 * Cambiar de sonido también funde: el de antes se apaga en `SWITCH_S` mientras
 * sube el nuevo. Nada de esto falla hacia fuera: sin audio, no suena y ya.
 *
 * Con el móvil bloqueado o la página en segundo plano (había microcortes,
 * 2026-10-27):
 *
 * - El contexto va con `latencyHint: 'playback'`: búferes grandes, como un
 *   reproductor de música. Con los de fábrica (`interactive`, para juegos), al
 *   bajar el sistema la prioridad de la página el audio no llegaba a tiempo.
 * - El fundido entre vueltas lo lanza el `timeupdate` del propio audio, no un
 *   temporizador: en segundo plano los navegadores retrasan los temporizadores
 *   (hasta uno por minuto) y la siguiente vuelta llegaba tarde. Si aun así se
 *   acaba antes (`ended`), la siguiente empieza al momento.
 * - Media Session: el móvil lo trata como música (título en la pantalla de
 *   bloqueo, pausa y seguir), y al volver a la página se reanuda si el sistema
 *   lo había parado.
 */

import { TRACKS } from './ambience-tracks'

export type AmbienceKind = 'noise' | 'nature' | 'lofi'

/** Lo que suena: de qué tipo y cuál de sus opciones. */
export type Ambience = { kind: AmbienceKind; index: number }

export const AMBIENCE_KINDS: readonly AmbienceKind[] = ['noise', 'nature', 'lofi']

/** Las opciones de cada tipo, en el orden en que se recorren al volver a pulsar. */
export const AMBIENCE_OPTIONS: Record<AmbienceKind, readonly string[]> = {
  noise: ['white', 'pink', 'brown'],
  nature: ['rain', 'ocean', 'storm'],
  lofi: TRACKS.map((track) => track.id),
}

/** Lo que dura el fundido entre dos vueltas del mismo fichero. */
const CROSSFADE_S = 6
/** Lo que dura el fundido al cambiar de sonido o al apagarlo. */
const SWITCH_S = 1.5
/** Lo que dura el trozo de ruido generado, y la parte que se funde con el principio. */
const NOISE_S = 12
const NOISE_SEAM_S = 1
/** Volumen de cada tipo: el ruido llena mucho más que una canción. */
const LEVEL: Record<AmbienceKind, number> = { noise: 0.22, nature: 0.7, lofi: 0.6 }

/**
 * Dónde está cada fichero. Siempre en la raíz, también desde la demostración
 * (`/demo/`): así los sonidos están una vez en la imagen y en la caché.
 */
function ambienceUrl(id: string): string {
  return `/sounds/focus/${id}.m4a`
}

/** Una voz que suena: se le puede pedir que se apague con fundido. */
type Voice = { stop: (fadeS: number) => void }

let context: AudioContext | null = null
let master: GainNode | null = null
let voice: Voice | null = null
let current: Ambience | null = null
const listeners = new Set<() => void>()

const notify = (): void => {
  for (const listener of listeners) listener()
}

/** El contexto de audio, creado la primera vez (siempre tras un clic: el navegador lo exige). */
function audio(): { ctx: AudioContext; out: GainNode } {
  if (context === null || master === null) {
    context = new AudioContext({ latencyHint: 'playback' })
    master = context.createGain()
    master.connect(context.destination)
  }

  void context.resume()

  return { ctx: context, out: master }
}

/** Sube un volumen de 0 a `level` (o lo baja a 0) en `seconds`. */
function ramp(gain: GainNode, from: number, to: number, seconds: number): void {
  const now = gain.context.currentTime

  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(from, now)
  gain.gain.linearRampToValueAtTime(to, now + seconds)
}

/**
 * Un trozo de ruido de `NOISE_S` segundos con el último segundo fundido sobre
 * el primero: repetido en bucle, no hay salto.
 *
 * - Blanco: muestras al azar.
 * - Rosa: el filtro de Paul Kellet sobre el blanco (cae 3 dB por octava).
 * - Marrón: el blanco acumulado, con una pérdida para que no se vaya lejos.
 */
export function noiseSamples(
  color: string,
  rate: number,
  random = Math.random,
): Float32Array<ArrayBuffer> {
  const seam = Math.floor(NOISE_SEAM_S * rate)
  const length = Math.floor(NOISE_S * rate)
  const raw = new Float32Array(length + seam)
  let b0 = 0
  let b1 = 0
  let b2 = 0
  let b3 = 0
  let b4 = 0
  let b5 = 0
  let b6 = 0
  let last = 0

  for (let index = 0; index < raw.length; index += 1) {
    const white = random() * 2 - 1

    if (color === 'pink') {
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      raw[index] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    } else if (color === 'brown') {
      last = (last + 0.02 * white) / 1.02
      raw[index] = last * 3.5
    } else {
      raw[index] = white
    }
  }

  // El final (lo que pasa de `length`) se funde con el principio.
  const samples = raw.slice(0, length)

  for (let index = 0; index < seam; index += 1) {
    const share = index / seam

    samples[index] = (raw[length + index] ?? 0) * (1 - share) + (samples[index] ?? 0) * share
  }

  return samples
}

function playNoise(color: string): Voice {
  const { ctx, out } = audio()
  const buffer = ctx.createBuffer(2, Math.floor(NOISE_S * ctx.sampleRate), ctx.sampleRate)

  // Un canal distinto a cada lado: suena más abierto que el mismo en los dos.
  buffer.copyToChannel(noiseSamples(color, ctx.sampleRate), 0)
  buffer.copyToChannel(noiseSamples(color, ctx.sampleRate), 1)

  const source = ctx.createBufferSource()
  const gain = ctx.createGain()

  source.buffer = buffer
  source.loop = true
  source.connect(gain)
  gain.connect(out)
  ramp(gain, 0, LEVEL.noise, SWITCH_S)
  source.start()

  return {
    stop: (fadeS) => {
      ramp(gain, gain.gain.value, 0, fadeS)
      source.stop(ctx.currentTime + fadeS + 0.05)
    },
  }
}

/** Un fichero en bucle con fundido cruzado entre vueltas, con dos reproductores que se turnan. */
function playFile(id: string, level: number): Voice {
  const { ctx, out } = audio()
  const players = [0, 1].map(() => {
    const element = new Audio(ambienceUrl(id))
    const gain = ctx.createGain()

    element.preload = 'auto'
    element.crossOrigin = 'anonymous'
    gain.gain.value = 0
    ctx.createMediaElementSource(element).connect(gain)
    gain.connect(out)

    return { element, gain }
  })
  let turn = 0
  let stopped = false

  const start = (index: number): void => {
    const player = players[index]

    if (player === undefined) return

    player.element.currentTime = 0
    void player.element.play().catch(() => undefined)
  }

  /** Pasa a la otra vuelta: empieza desde el principio y se cruzan los volúmenes. */
  const cross = (fadeS: number): void => {
    const playing = players[turn]
    const next = players[1 - turn]

    if (stopped || playing === undefined || next === undefined) return

    turn = 1 - turn
    start(turn)
    ramp(next.gain, 0, level, fadeS)
    ramp(playing.gain, playing.gain.gain.value, 0, fadeS)
  }

  // Un poco antes del final, empieza el otro. Lo avisa el propio audio, que en
  // segundo plano no se retrasa como un temporizador.
  players.forEach((player, index) => {
    player.element.addEventListener('timeupdate', () => {
      const { duration, currentTime } = player.element

      if (index === turn && Number.isFinite(duration) && duration - currentTime <= CROSSFADE_S) {
        cross(CROSSFADE_S)
      }
    })
    // Se acabó sin haber cruzado (llegó tarde el aviso): la otra vuelta, ya.
    player.element.addEventListener('ended', () => {
      if (index === turn) cross(0.05)
    })
  })

  start(0)
  if (players[0] !== undefined) ramp(players[0].gain, 0, level, SWITCH_S)

  return {
    stop: (fadeS) => {
      stopped = true

      for (const player of players) ramp(player.gain, player.gain.gain.value, 0, fadeS)

      window.setTimeout(
        () => {
          for (const player of players) {
            player.element.pause()
            player.element.removeAttribute('src')
            player.element.load()
          }
        },
        fadeS * 1000 + 100,
      )
    },
  }
}

/**
 * Lo que enseña el móvil en la pantalla de bloqueo, y sus botones: pausa y
 * seguir paran y reanudan el contexto, sin perder lo elegido.
 */
function showSession(title: string | null): void {
  if (!('mediaSession' in navigator)) return

  try {
    const session = navigator.mediaSession

    session.metadata = title === null ? null : new MediaMetadata({ title, artist: 'Peer4U' })
    session.playbackState = title === null ? 'none' : 'playing'
    session.setActionHandler(
      'pause',
      title === null
        ? null
        : () => {
            void context?.suspend()
            session.playbackState = 'paused'
          },
    )
    session.setActionHandler(
      'play',
      title === null
        ? null
        : () => {
            void context?.resume()
            session.playbackState = 'playing'
          },
    )
  } catch {
    // Sin Media Session (o sin alguna acción): suena igual.
  }
}

// Al volver a la página, si el sistema paró el audio (iOS lo hace al bloquear),
// se reanuda lo que sonaba.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (
      document.visibilityState === 'visible' &&
      current !== null &&
      context?.state !== 'running'
    ) {
      void context?.resume()
    }
  })
}

/**
 * Pone ese sonido (o ninguno, con `null`), fundiendo con el que hubiera.
 *
 * @param title Lo que se enseña en la pantalla de bloqueo del móvil.
 */
export function setAmbience(next: Ambience | null, title: string | null = null): void {
  try {
    voice?.stop(SWITCH_S)
    voice = null

    if (next !== null) {
      const option = AMBIENCE_OPTIONS[next.kind][next.index]

      if (option !== undefined) {
        voice = next.kind === 'noise' ? playNoise(option) : playFile(option, LEVEL[next.kind])
      }
    }
  } catch {
    // Sin audio: el Pomodoro sigue en silencio.
    voice = null
  }

  current = next
  showSession(next === null ? null : (title ?? ''))
  notify()
}

/** Lo que suena ahora, o `null`. */
export function ambience(): Ambience | null {
  return current
}

/** Avisa cuando cambia lo que suena (para `useSyncExternalStore`). */
export function subscribeAmbience(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}
