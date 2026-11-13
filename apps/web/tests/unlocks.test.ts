// @vitest-environment jsdom
/**
 * Cuándo se mira si hay algo que celebrar (`shared/unlocks.ts`): tras cada
 * punto superado de un curso, y no tras un intento fallido. La sala de una
 * prueba de grupo de git, que se pide cada dos segundos, avisa una sola vez.
 */
import { afterEach, describe, expect, it } from 'vitest'

import type { Api } from '../src/shared/api/types'
import { onCheckUnlocks, withUnlockChecks } from '../src/shared/unlocks'

let stop: () => void = () => undefined

afterEach(() => {
  stop()
})

/** Una API de mentira con lo justo: cada llamada contesta lo que se le diga. */
function fakeApi(answers: { done: boolean; passed: boolean; room: 'passed' | null }): Api {
  const attempt = () => Promise.resolve({ done: answers.done })
  const room = (id: number) => ({ id, result: answers.room })

  return {
    submitShellAttempt: attempt,
    submitDockerAttempt: attempt,
    submitK8sAttempt: attempt,
    submitNetAttempt: attempt,
    submitRagAttempt: attempt,
    submitGitAttempt: attempt,
    answerGitGate: () => Promise.resolve({ passed: answers.passed }),
    getGitRoom: (id: number) => Promise.resolve(room(id)),
    runGitRoom: (id: number) => Promise.resolve({ room: room(id) }),
  } as unknown as Api
}

function counter(): { count: () => number } {
  let checks = 0

  stop = onCheckUnlocks(() => {
    checks += 1
  })

  return { count: () => checks }
}

describe('mirar lo desbloqueado tras un curso', () => {
  it('cada punto superado de los cursos avisa; lo fallado, no', async () => {
    const checks = counter()
    const passing = withUnlockChecks(fakeApi({ done: true, passed: true, room: null }))

    await passing.submitShellAttempt('u', { entries: [] })
    await passing.submitDockerAttempt('u', { entries: [] })
    await passing.submitK8sAttempt('u', { entries: [] })
    await passing.submitNetAttempt('u', { entries: [] })
    await passing.submitRagAttempt('u', { entries: [] })
    await passing.submitGitAttempt('w0', { lines: [] })
    await passing.answerGitGate('g', { answers: [] })
    expect(checks.count()).toBe(7)

    const failing = withUnlockChecks(fakeApi({ done: false, passed: false, room: null }))

    await failing.submitShellAttempt('u', { entries: [] })
    await failing.answerGitGate('g', { answers: [] })
    await failing.getGitRoom(1)
    expect(checks.count()).toBe(7)
  })

  it('una sala de git superada avisa una vez, aunque se pida muchas', async () => {
    const checks = counter()
    const api = withUnlockChecks(fakeApi({ done: false, passed: false, room: 'passed' }))

    await api.getGitRoom(7)
    await api.getGitRoom(7)
    await api.runGitRoom(7, 'git push')
    expect(checks.count()).toBe(1)
    // Otra sala, otro aviso.
    await api.getGitRoom(8)
    expect(checks.count()).toBe(2)
  })
})
