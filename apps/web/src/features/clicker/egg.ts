/**
 * El secreto de la cruz: cuántas veces se ha pulsado y qué pastilla se eligió.
 *
 * Es un estado aparte, fuera de React, porque lo tocan dos sitios que no se
 * conocen: la cabecera (que cuenta las pulsaciones) y la ventana que salta al
 * llegar a cien. Las pulsaciones se mandan a la API en grupos, salvo las que
 * dan un logro, que se mandan en el momento.
 */

import { useSyncExternalStore } from 'react'

import type { Pill } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { PLUS_GOALS } from './data'

type Egg = {
  /** `false` hasta que la API dice por dónde iba. */
  ready: boolean
  plus: number
  pill: Pill | null
  /** El último logro del secreto que se ha conseguido, para enseñarlo una vez. */
  fresh: number | null
}

/** Pulsaciones que abren la pregunta de las pastillas. */
export const PLUS_GOAL = 42
const SEND_AFTER_MS = 1500
const MAX_PER_SEND = 20

let state: Egg = { ready: false, plus: 0, pill: null, fresh: null }
/** Pulsaciones contadas aquí y aún sin mandar. */
let unsent = 0
let timer: number | undefined
let asked = false
const listeners = new Set<() => void>()

function set(change: Partial<Egg>): void {
  state = { ...state, ...change }
  listeners.forEach((listener) => {
    listener()
  })
}

function send(): void {
  window.clearTimeout(timer)

  const count = Math.min(MAX_PER_SEND, unsent)

  if (count === 0) return

  unsent -= count
  api.pressPlus(count).then(
    (server) => {
      // Manda lo que diga la API si va por delante (otra pestaña, otro equipo).
      set({ plus: Math.max(state.plus, server.plus + unsent), pill: server.pill })

      if (unsent > 0) send()
    },
    () => {
      unsent += count
    },
  )
}

/** Pide a la API por dónde iba. Una sola vez. */
export function loadEgg(): void {
  if (asked) return

  asked = true
  api.getClicker().then(
    ({ plus, pill }) => {
      set({ ready: true, plus: Math.max(plus, state.plus), pill })
    },
    () => {
      // Sin la API el secreto no existe: mejor eso que contar en falso.
    },
  )
}

/** Alguien ha pulsado la cruz de la cabecera. */
export function pressPlus(): void {
  // Quien eligió ya no cuenta más: la azul lo cierra, la roja ya lo abrió.
  if (!state.ready || state.pill !== null || state.plus >= PLUS_GOAL) return

  const plus = state.plus + 1
  const milestone = PLUS_GOALS.includes(plus)

  unsent += 1
  set({ plus, fresh: milestone ? plus : state.fresh })

  if (milestone || unsent >= MAX_PER_SEND) send()
  else {
    window.clearTimeout(timer)
    timer = window.setTimeout(send, SEND_AFTER_MS)
  }
}

/** El aviso del logro ya se ha visto. */
export function dismissFresh(): void {
  set({ fresh: null })
}

/** Elige pastilla. No hay vuelta atrás: lo guarda la API. */
export async function choosePill(pill: Pill): Promise<void> {
  // Que no quede ninguna pulsación por contar antes de elegir.
  while (unsent > 0) {
    const count = Math.min(MAX_PER_SEND, unsent)

    unsent -= count
    await api.pressPlus(count)
  }

  const next = await api.choosePill(pill)

  set({ plus: next.plus, pill: next.pill })
}

export function useEgg(): Egg {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    () => state,
  )
}
