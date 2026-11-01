import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '../../src/shared/i18n'
import { initialOf } from '../../src/shared/initial'
import { ChartWithRail } from '../../src/shared/ui/ChartWithRail'
import { SectionTitle } from '../../src/shared/ui/SectionTitle'

// Las piezas comunes de las pantallas: el título de sección con su
// explicación, la gráfica con su panel de opciones y la inicial de un login.

beforeEach(() => {
  localStorage.setItem('sanatorio_lang', 'es')
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('SectionTitle: el título de una sección con su InfoTip', () => {
  it('es un h2 con el título y un botón que abre la explicación', async () => {
    const user = userEvent.setup()

    render(
      <I18nProvider>
        <SectionTitle title="Exámenes">
          <p>Así se sigue un examen en directo</p>
        </SectionTitle>
      </I18nProvider>,
    )

    const heading = screen.getByRole('heading', { level: 2, name: /Exámenes/ })

    // La explicación no se monta hasta abrirla: nada de párrafos fijos.
    expect(screen.queryByText('Así se sigue un examen en directo')).toBeNull()
    await user.click(within(heading).getByRole('button', { name: 'Cómo funciona: Exámenes' }))

    const dialog = screen.getByRole('dialog', { name: 'Exámenes' })

    expect(within(dialog).getByText('Así se sigue un examen en directo')).toBeTruthy()
  })

  it('la explicación puede llamarse distinto que el título', () => {
    render(
      <I18nProvider>
        <SectionTitle title="Tus proyectos" tipTitle="Peer to peer">
          <p>demo</p>
        </SectionTitle>
      </I18nProvider>,
    )

    expect(screen.getByRole('heading', { name: /Tus proyectos/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cómo funciona: Peer to peer' })).toBeTruthy()
  })

  it('un título vacío o muy largo no rompe el encabezado', () => {
    const long = 'Sección '.repeat(200).trim()

    render(
      <I18nProvider>
        <SectionTitle title="">
          <p>vacía</p>
        </SectionTitle>
        <SectionTitle title={long}>
          <p>larga</p>
        </SectionTitle>
      </I18nProvider>,
    )

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2)
    expect(screen.getByRole('button', { name: `Cómo funciona: ${long}` })).toBeTruthy()
  })
})

describe('ChartWithRail: la gráfica a la izquierda y sus opciones a la derecha', () => {
  it('pinta la gráfica en su tarjeta y las opciones en un panel con nombre', () => {
    const { container } = render(
      <ChartWithRail chart={<svg aria-label="Gráfica" />} railLabel="Opciones del Avance">
        <label>
          Medida <select aria-label="Medida" />
        </label>
      </ChartWithRail>,
    )

    const rail = screen.getByRole('complementary', { name: 'Opciones del Avance' })
    const layout = container.querySelector('.progress-layout')

    expect(layout?.firstElementChild?.matches('article.card.progress-card')).toBe(true)
    expect(within(rail).getByRole('combobox', { name: 'Medida' })).toBeTruthy()
    // Primero la gráfica y después el panel: en el móvil, por ese orden.
    expect(layout?.lastElementChild).toBe(rail)
    expect(rail.className).toBe('card progress-rail')
  })

  it('dentro de otra tarjeta, la gráfica no lleva la suya', () => {
    const { container } = render(
      <ChartWithRail framed={false} chart={<p>gráfica</p>} railLabel="Opciones">
        {null}
      </ChartWithRail>,
    )

    const chart = container.querySelector('.progress-card')

    expect(chart?.tagName).toBe('DIV')
    expect(chart?.classList.contains('card')).toBe(false)
    // Sin opciones, el panel sigue ahí (vacío), para que la gráfica no se estire.
    expect(screen.getByRole('complementary', { name: 'Opciones' }).childElementCount).toBe(0)
  })
})

describe('initialOf: la inicial de un login', () => {
  it('la primera letra, en mayúscula', () => {
    expect(initialOf('alberto')).toBe('A')
    expect(initialOf('Zoe')).toBe('Z')
    expect(initialOf('x')).toBe('X')
  })

  it('lo raro: vacío, cifras, guiones y letras con acento', () => {
    expect(initialOf('')).toBe('')
    expect(initialOf('42student')).toBe('4')
    expect(initialOf('-guion')).toBe('-')
    expect(initialOf('ñandú')).toBe('Ñ')
    expect(initialOf('a'.repeat(10_000))).toBe('A')
  })
})
