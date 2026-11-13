/**
 * Cuándo mirar si hay algo desbloqueado que celebrar (`docs/cursos-logros.md`).
 * La ventana de celebración (`features/unlocks`) pregunta al abrirse la web y
 * cada vez que se supera un punto de un curso: entonces es cuando se gana un
 * logro. En vez de que cada curso lo avise, el cliente de la API lo dice al
 * recibir un punto superado (`withUnlockChecks`), así no se olvida ninguno.
 */

import type { Api } from './api/types'

const CHECK_EVENT = 'sanatorio:unlocks'

/** Pide que se mire si hay algo nuevo que celebrar. */
function checkUnlocks(): void {
  window.dispatchEvent(new Event(CHECK_EVENT))
}

/** Escucha las peticiones de mirar. Devuelve cómo dejar de escuchar. */
export function onCheckUnlocks(listener: () => void): () => void {
  window.addEventListener(CHECK_EVENT, listener)

  return () => {
    window.removeEventListener(CHECK_EVENT, listener)
  }
}

/** La misma llamada, que avisa de mirar si lo que contesta la API es un punto superado. */
const after =
  <A extends unknown[], R>(call: (...args: A) => Promise<R>, passed: (result: R) => boolean) =>
  async (...args: A): Promise<R> => {
    const result = await call(...args)

    if (passed(result)) checkUnlocks()

    return result
  }

/**
 * La API, con el aviso de mirar lo desbloqueado tras cada punto superado de
 * los cuatro cursos. Una prueba de grupo de git se termina en la sala, que se
 * pide cada dos segundos: avisa una sola vez por sala.
 */
export function withUnlockChecks(api: Api): Api {
  const rooms = new Set<number>()
  const roomPassed = (room: { id: number; result: string | null }): boolean => {
    if (room.result !== 'passed' || rooms.has(room.id)) return false
    rooms.add(room.id)

    return true
  }

  return {
    ...api,
    submitShellAttempt: after(
      (unit: string, input: Parameters<Api['submitShellAttempt']>[1]) =>
        api.submitShellAttempt(unit, input),
      (result) => result.done,
    ),
    submitDockerAttempt: after(
      (unit: string, input: Parameters<Api['submitDockerAttempt']>[1]) =>
        api.submitDockerAttempt(unit, input),
      (result) => result.done,
    ),
    submitK8sAttempt: after(
      (unit: string, input: Parameters<Api['submitK8sAttempt']>[1]) =>
        api.submitK8sAttempt(unit, input),
      (result) => result.done,
    ),
    submitNetAttempt: after(
      (unit: string, input: Parameters<Api['submitNetAttempt']>[1]) =>
        api.submitNetAttempt(unit, input),
      (result) => result.done,
    ),
    submitGitAttempt: after(
      (level: string, input: Parameters<Api['submitGitAttempt']>[1]) =>
        api.submitGitAttempt(level, input),
      (result) => result.done,
    ),
    answerGitGate: after(
      (gate: string, input: Parameters<Api['answerGitGate']>[1]) => api.answerGitGate(gate, input),
      (result) => result.passed,
    ),
    getGitRoom: after((id: number) => api.getGitRoom(id), roomPassed),
    runGitRoom: after(
      (id: number, line: string) => api.runGitRoom(id, line),
      (result) => roomPassed(result.room),
    ),
  }
}
