/**
 * API de mentira: la valoración de las correcciones de 42 (#91 del buzón).
 *
 * En la demostración pública salen dos correcciones inventadas de hace un rato:
 * una en la que te corrigieron y otra en la que corregiste tú. Fuera de ella,
 * solo si se pide (`?correccion`): si no, la ventana saldría en cada prueba de
 * pantallas. Lo contestado se recuerda en el navegador para no taparlo todo en
 * cada visita.
 */

import type { CorrectionPrompt } from '@sanatorio/contracts'

import type { Api } from '../types'
import { portrait } from './portrait'
import { delay, fail, projectName } from './state'

const DONE_KEY = 'mock_corrections_done'

const wanted = (): boolean =>
  import.meta.env.VITE_DEMO === 'true' ||
  new URLSearchParams(window.location.search).has('correccion')

/** Las de «Ahora no» (y las de antes, si no hay almacenamiento): hasta recargar no vuelven. */
const hidden = new Set<number>()

/** Las contestadas o descartadas, que no vuelven: en el navegador, si se puede. */
function done(): number[] {
  try {
    return JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]') as number[]
  } catch {
    return []
  }
}

function markDone(id: number): void {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify([...done(), id]))
  } catch {
    // Sin almacenamiento vale con quitarla de esta visita.
    hidden.add(id)
  }
}

const person = (login: string) => ({ login, image: portrait(login) })
const hoursAgo = (hours: number): string => new Date(Date.now() - hours * 3_600_000).toISOString()

/** Logins inventados, como en el resto de la demostración. */
const PROMPTS: CorrectionPrompt[] = [
  {
    id: 9101,
    role: 'corrected',
    peers: [person('rsoto')],
    projectId: 1314,
    projectName: projectName(1314),
    beginAt: hoursAgo(1),
  },
  {
    id: 9102,
    role: 'corrector',
    peers: [person('nmartin'), person('dcano')],
    projectId: 1420,
    projectName: projectName(1420),
    beginAt: hoursAgo(26),
  },
]

/** Lo que toca preguntar ahora. */
export function correctionPrompts(): CorrectionPrompt[] {
  if (!wanted()) return []

  const answered = done()

  return PROMPTS.filter((prompt) => !answered.includes(prompt.id) && !hidden.has(prompt.id))
}

const mustExist = (id: number): void => {
  if (!PROMPTS.some((prompt) => prompt.id === id)) {
    throw fail(404, 'No conocemos esa corrección tuya')
  }
}

export const correctionsMock: Pick<
  Api,
  'getCorrectionPrompts' | 'rateCorrection' | 'skipCorrection' | 'getCorrectionsUnderstood'
> = {
  async getCorrectionPrompts() {
    await delay(80)

    return correctionPrompts()
  },

  async rateCorrection(id) {
    await delay()
    mustExist(id)
    markDone(id)
  },

  async skipCorrection(id, forever) {
    await delay(80)
    mustExist(id)

    if (forever) markDone(id)
    else hidden.add(id)
  },

  async getCorrectionsUnderstood() {
    await delay()

    return { total: 14, answers: { perfect: 5, enough: 6, better: 2, same: 1 } }
  },
}
