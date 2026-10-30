/**
 * Los cursos, plegados por capítulos (`shared/course/Chapter.tsx`): de entrada
 * solo el que toca; uno sin alcanzar no se despliega; en las pruebas de grupo
 * del de git, quién de tu campus las espera.
 */
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { LEVELS } from '@sanatorio/gitsim'

import { api } from '../../src/shared/api'
import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
})

/** La cabecera del capítulo que lleva ese nombre. */
const chapter = (name: string): HTMLElement =>
  must(
    screen
      .getAllByRole('button')
      .find(
        (button) =>
          button.classList.contains('course-chapter-head') && button.textContent.includes(name),
      ),
    `el capítulo ${name}`,
  )

describe('cursos por capítulos', () => {
  it('git: el mundo que toca, abierto; los demás, plegados y sin alcanzar cerrados', async () => {
    await openApp('#/cursogit')
    await screen.findByRole('button', { name: 'Tu primer commit' }, { timeout: 5000 })

    expect(chapter(text('git.world.0.name')).getAttribute('aria-expanded')).toBe('true')
    const branches = chapter(text('git.world.1.name'))

    expect(branches).toHaveProperty('disabled', true)
    // Aun cerrado, dice de qué trata, para qué sirve y cuánta gente pide su prueba.
    expect(branches.textContent).toContain(text('git.world.1.pitch'))
    expect(branches.textContent).toContain(text('git.group').replace('{n}', '2'))
    expect(branches.textContent).toContain(text('course.chapter.locked'))
    expect(screen.queryByRole('button', { name: 'Crear una rama' })).toBeNull()
  }, 20_000)

  it('git: llegada a una prueba de grupo, quién del campus la espera', async () => {
    const user = userEvent.setup()

    // Hecho hasta el punto gordo del mundo 1, que abre la primera prueba de grupo.
    for (const level of LEVELS.slice(0, LEVELS.findIndex((each) => each.id === 'w1-world') + 1)) {
      await api.submitGitAttempt(level.id, { lines: level.solution })
    }
    await openApp('#/cursogit')
    await screen.findByText(text('git.world.2.pitch'), {}, { timeout: 5000 })

    // Toca el mundo 2; el 1, plegado, se despliega a mano.
    expect(chapter(text('git.world.1.name')).getAttribute('aria-expanded')).toBe('false')
    await user.click(chapter(text('git.world.1.name')))

    const waiting = await screen.findByRole('complementary', {
      name: text('git.gate.people.title'),
    })

    expect(await within(waiting).findByRole('link', { name: /mgarcia/ })).toBeTruthy()
    expect(within(waiting).getByText(text('git.gate.people.hint'))).toBeTruthy()
  }, 20_000)

  it('shell: un árbol de bloques plegados, abierto solo el que toca', async () => {
    await openApp('#/cursoshell')
    await screen.findByRole(
      'heading',
      { name: new RegExp(`^${text('shell.tier.beginner')}/`) },
      { timeout: 5000 },
    )

    const heads = [
      ...document.querySelectorAll<HTMLButtonElement>('.shell-block .course-chapter-head'),
    ]

    expect(heads.length).toBe(9)
    expect(heads.filter((head) => head.getAttribute('aria-expanded') === 'true')).toHaveLength(1)
  }, 20_000)
})
