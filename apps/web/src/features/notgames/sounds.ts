/**
 * Los sonidos de Not-games: cortos y bajitos, hechos con `shared/synth.ts`.
 * Vienen encendidos; cada cual los apaga desde la sala (y se recuerda).
 *
 * No se piden a mano en cada botón: se deducen de cómo cambia la partida entre
 * una lectura y la siguiente (nueva jugada, nueva pregunta, se reveló…), que es
 * lo que de verdad ve la persona, venga de quien venga el cambio.
 */

import { useMemo, useSyncExternalStore } from 'react'

import type { QuizRoom, TurnRoom } from '@sanatorio/contracts'

import { focusing } from '../../shared/focus'
import { tone } from '../../shared/synth'
import type { Tune } from '../../shared/synth'

const KEY = 'sanatorio_games_sound'

type Sound =
  'move' | 'capture' | 'check' | 'ask' | 'yourTurn' | 'right' | 'wrong' | 'tick' | 'win' | 'lose'

const TUNES: Record<Sound, Tune> = {
  move: { wave: 'triangle', notes: [392], step: 0.05, gain: 0.05 },
  capture: { wave: 'square', notes: [330, 247], step: 0.05, gain: 0.04 },
  check: { wave: 'sawtooth', notes: [523, 523], step: 0.07, gain: 0.035 },
  ask: { wave: 'sine', notes: [659, 880], step: 0.07, gain: 0.05 },
  yourTurn: { wave: 'triangle', notes: [523, 784], step: 0.08, gain: 0.05 },
  right: { wave: 'triangle', notes: [523, 659, 784], step: 0.08, gain: 0.06 },
  wrong: { wave: 'sawtooth', notes: [233, 175], step: 0.1, gain: 0.04 },
  tick: { wave: 'sine', notes: [1047], step: 0.03, gain: 0.03 },
  win: { wave: 'triangle', notes: [523, 659, 784, 1047], step: 0.11, gain: 0.07 },
  lose: { wave: 'sine', notes: [392, 330, 262], step: 0.14, gain: 0.05 },
}

const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== '0'
  } catch {
    return true
  }
}

let on = read()

export function setGameSound(next: boolean): void {
  on = next
  try {
    localStorage.setItem(KEY, next ? '1' : '0')
  } catch {
    // Sin almacenamiento, vale para esta visita.
  }
  for (const listener of listeners) listener()
}

/** Si suenan los juegos, para el botón de la sala. */
export function useGameSoundOn(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },
    () => on,
  )
}

function playGame(sound: Sound): void {
  // En Pomodoro, los juegos no suenan.
  if (on && !focusing()) tone(TUNES[sound])
}

/** Los sonidos de las dos clases de sala, según lo que ha cambiado. */
export function useGameSounds() {
  return useMemo(
    () => ({
      /** Ajedrez: jugada nueva, pregunta, te toca, cómo fue la pregunta y el final. */
      turnChanged(previous: TurnRoom | null, next: TurnRoom, me: string): void {
        if (previous?.id !== next.id) return

        const mine = next.players.find((p) => p.login === me)?.side ?? null
        const moves = next.board?.history.length ?? 0

        if (moves > (previous.board?.history.length ?? 0)) {
          const last = next.board?.lastMove

          playGame(last?.check === true ? 'check' : last?.captured === true ? 'capture' : 'move')
        }
        if (next.question !== null && previous.question?.index !== next.question.index)
          playGame('ask')
        if (next.last !== null && previous.last?.index !== next.last.index) {
          const first = next.last.first

          if (first?.login === me) playGame(first.correct ? 'right' : 'wrong')
        }
        if (next.mover !== null && next.mover === mine && previous.mover !== mine)
          playGame('yourTurn')
        if (next.end !== null && previous.end === null) {
          playGame(next.end.winner === null ? 'move' : next.end.winner === mine ? 'win' : 'lose')
        }
      },
      /** Preguntas: pregunta nueva, revelado (acierto o fallo) y el final. */
      quizChanged(previous: QuizRoom | null, next: QuizRoom, me: string): void {
        if (previous?.id !== next.id) return

        const question = next.question

        if (
          question !== null &&
          question.options.length > 0 &&
          previous.question?.options.length === 0
        ) {
          playGame('ask')
        }
        if (next.phase === 'reveal' && previous.phase !== 'reveal' && question?.mine !== null) {
          playGame(question?.mine === question?.answer ? 'right' : 'wrong')
        }
        if (next.status === 'done' && previous.status !== 'done') {
          playGame(next.winners.includes(me) ? 'win' : 'lose')
        }
      },
      tick(): void {
        playGame('tick')
      },
    }),
    [],
  )
}
