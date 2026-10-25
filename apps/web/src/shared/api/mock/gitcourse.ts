/**
 * API de mentira: el curso de git. Corrige los retos con el mismo motor que la
 * API y hace como si quien mira estuviera sentado en un puesto del clúster. El
 * test previo tiene ocho preguntas fijas, con las mismas reglas: todas bien, y
 * si no, una hora de espera.
 */

import type { GitCourse, GitGateQuiz } from '@sanatorio/contracts'
import { checkAttempt, gateOf, LEVELS } from '@sanatorio/gitsim'

import { delay, fail } from './state'
import type { Api } from '../types'

const course: GitCourse = { seat: 'c1r4s2', stars: {}, gates: {} }
const snapshot = (): GitCourse => ({
  seat: course.seat,
  stars: { ...course.stars },
  gates: { ...course.gates },
})

const QUESTIONS: { prompt: string; options: string[]; answer: number; why: string }[] = [
  {
    prompt: '¿Qué es una rama en git?',
    options: [
      'Una copia de la carpeta',
      'Un nombre que apunta a un commit',
      'Un repositorio aparte',
      'Un servidor',
    ],
    answer: 1,
    why: 'Una rama es solo una etiqueta que apunta a un commit.',
  },
  {
    prompt: '¿Qué entra en un commit?',
    options: [
      'Todo lo de la carpeta',
      'Solo los ficheros nuevos',
      'Lo preparado con git add',
      'Nada',
    ],
    answer: 2,
    why: 'El commit guarda lo que está en el índice.',
  },
  {
    prompt: '¿Qué es HEAD?',
    options: ['El primer commit', 'Dónde estás', 'La rama del remoto', 'El último push'],
    answer: 1,
    why: 'HEAD es dónde estás: normalmente la rama actual.',
  },
  {
    prompt: 'Para crear la rama login y pasarte a ella:',
    options: ['git branch login', 'git merge login', 'git switch login', 'git switch -c login'],
    answer: 3,
    why: 'switch -c crea y cambia a la vez.',
  },
  {
    prompt: 'Un merge fast-forward…',
    options: [
      'Solo mueve la rama hacia delante',
      'Crea un commit con dos padres',
      'Ignora conflictos',
      'Borra la otra rama',
    ],
    answer: 0,
    why: 'Si el destino no avanzó, solo se mueve el puntero.',
  },
  {
    prompt: 'Un commit de merge tiene…',
    options: ['Ningún padre', 'Un padre', 'Dos padres', 'Tantos padres como ficheros'],
    answer: 2,
    why: 'Une las dos historias: dos padres.',
  },
  {
    prompt: 'git branch -d con una rama sin unir…',
    options: ['La borra', 'Se niega (con -D sí)', 'La une primero', 'La sube'],
    answer: 1,
    why: '-d protege el trabajo sin unir.',
  },
  {
    prompt: '¿Qué te dice git status?',
    options: [
      'La historia',
      'Quién cambió cada línea',
      'Rama, preparado y no preparado',
      'Si hay red',
    ],
    answer: 2,
    why: 'status es la foto de ahora; la historia es git log.',
  },
]

const SECONDS_EACH = 20
let started: { gate: string; deadline: number } | null = null

export const gitCourseMock: Pick<
  Api,
  'getGitCourse' | 'submitGitAttempt' | 'startGitGate' | 'answerGitGate'
> = {
  async getGitCourse() {
    await delay(80)

    return snapshot()
  },
  async submitGitAttempt(id, { lines }) {
    await delay(150)

    const index = LEVELS.findIndex((level) => level.id === id)
    const level = LEVELS[index]
    const previous = LEVELS[index - 1]

    if (level === undefined) throw fail(404, 'Ese punto del camino no existe')
    if (previous !== undefined && course.stars[previous.id] === undefined)
      throw fail(409, 'Antes tienes que superar el punto anterior')

    const result = checkAttempt(level, lines)

    if (result.done && result.stars > 0) {
      course.stars[id] = Math.max(course.stars[id] ?? 0, result.stars) as 1 | 2 | 3
    }

    return {
      done: result.done,
      stars: result.stars,
      commands: result.commands,
      misses: result.misses.map((miss) => miss.name),
      course: snapshot(),
    }
  },
  async startGitGate(id) {
    await delay(120)

    const gate = gateOf(id)
    const state = course.gates[id]

    if (gate === undefined) throw fail(404, 'Esa prueba no existe')
    if (course.stars[gate.after] === undefined) throw fail(409, 'Antes tienes que superar el mundo')
    if (state?.passed === true) throw fail(409, 'Este test ya lo pasaste')
    if (state !== undefined && state.retryAt !== null && Date.parse(state.retryAt) > Date.now())
      throw fail(429, 'Hasta una hora después de fallarlo no se puede repetir')
    if (started?.gate !== id) {
      started = { gate: id, deadline: Date.now() + QUESTIONS.length * SECONDS_EACH * 1000 }
    }

    const quiz: GitGateQuiz = {
      gate: id,
      questions: QUESTIONS.map(({ prompt, options }) => ({ prompt, code: null, options })),
      deadline: new Date(started.deadline).toISOString(),
    }

    return quiz
  },
  async answerGitGate(id, { answers }) {
    await delay(150)

    if (started?.gate !== id) throw fail(409, 'No hay ningún test empezado')

    const late = Date.now() > started.deadline
    const review = QUESTIONS.map((question, index) => ({
      prompt: question.prompt,
      code: null,
      options: question.options,
      answer: question.answer,
      chosen: answers[index] ?? null,
      why: question.why,
    }))
    const right = review.filter((each) => each.chosen === each.answer).length
    const passed = !late && right === QUESTIONS.length

    started = null
    course.gates[id] = {
      passed,
      retryAt: passed ? null : new Date(Date.now() + 3_600_000).toISOString(),
    }

    return { passed, right, total: QUESTIONS.length, review, course: snapshot() }
  },
}
