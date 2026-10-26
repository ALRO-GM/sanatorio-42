import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)
/** El grupo de botones de la gráfica (el primero) o de la clasificación (el segundo). */
const group = (key: string, index = 0): HTMLElement =>
  must(screen.getAllByRole('group', { name: text(key) })[index], `el grupo ${key}`)
/** El periodo del eje del tiempo, en el panel de opciones. */
const picker = (): HTMLSelectElement =>
  screen.getByRole<HTMLSelectElement>('combobox', { name: text('common.period') })
const chartCard = (): HTMLElement =>
  must(document.querySelector<HTMLElement>('.progress-card'), 'la gráfica')
const axis = (): string[] =>
  [...chartCard().querySelectorAll('.progress-grid text')].map((node) => node.textContent)

afterEach(() => {
  cleanup()
})

/** La gráfica ya cargada: su media por defecto está en la leyenda. */
const ready = () =>
  screen.findAllByText(/^Python · En curso \+ terminado · Madrid/, {}, { timeout: 5000 })
const series = (): string[] =>
  [...chartCard().querySelectorAll<SVGGElement>('.progress-series')].map(
    (node) => node.dataset.series ?? '',
  )
const legendItems = (): string[] =>
  [...chartCard().querySelectorAll('.progress-legend li')].map((node) => node.textContent.trim())
const toggle = async (user: ReturnType<typeof userEvent.setup>, groupKey: string, name: string) => {
  await user.click(within(group(groupKey)).getByRole('button', { name }))
}
/** La casilla de la media de todos los campus juntos. */
const together = (): HTMLElement =>
  screen.getByRole('checkbox', { name: text('stats.progress.together') })

describe('Avance: cada opción encendida suma sus líneas', () => {
  it('por defecto tu plan, en curso + terminado y tu campus: una media, con su gente', async () => {
    await openApp('#/avance')
    await ready()

    const pressed = (key: string) =>
      within(group(key))
        .getAllByRole('button')
        .filter((button) => button.getAttribute('aria-pressed') === 'true')
        .map((button) => button.textContent)

    expect(pressed('stats.progress.plan')).toEqual(['Python'])
    expect(pressed('stats.progress.population')).toEqual([
      text('stats.progress.population.current'),
    ])
    expect(pressed('stats.progress.scope')).toEqual(['Madrid'])
    // Ya no hay «Los dos»: cada plan es un botón aparte.
    expect(
      within(group('stats.progress.plan')).queryByRole('button', {
        name: text('stats.progress.plan.all'),
      }),
    ).toBeNull()
    expect(series()).toEqual(['next-current-22', 'me'])
    expect((together() as HTMLInputElement).checked).toBe(false)
    // Quien no se sabe si sigue no entra: se dice cuántos son.
    expect(screen.getByText(/9 personas no entran en ninguna media/)).toBeTruthy()
  })

  it('plan × quién cuenta × alcance; quitar una opción quita sus líneas', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')
    await screen.findAllByText(/^Python · En curso \+ terminado · Madrid/, {}, { timeout: 5000 })

    await toggle(user, 'stats.progress.plan', 'C')
    await user.click(together())
    expect(series()).toEqual([
      'classic-current-22',
      'classic-current-all',
      'next-current-22',
      'next-current-all',
      'me',
    ])
    expect(legendItems()).toContain('C · En curso + terminado · Todos los campus (4700)')

    // Con muy poca gente que terminó Python no hay media: va cada persona, una vez.
    await toggle(user, 'stats.progress.population', text('stats.progress.population.finished'))
    expect(series()).toContain('next-finished-22-nvelasco')
    expect(series()).toContain('next-finished-all-ktorres')
    expect(series().filter((key) => key.endsWith('nvelasco'))).toHaveLength(1)
    expect(legendItems()).toContain('Python · Terminado: nvelasco')
    expect(screen.getByText(/Con menos de 10 personas no se hace media/)).toBeTruthy()

    // Black hole encendido: demasiadas líneas, se avisa y no se pintan las medias.
    await toggle(user, 'stats.progress.population', text('stats.progress.population.blackholed'))
    expect(screen.getByText(/^Son 16 líneas a la vez y caben 10/)).toBeTruthy()
    expect(series()).toEqual(['me'])

    // Se quita Python y todos juntos: vuelven a caber.
    await toggle(user, 'stats.progress.plan', 'Python')
    await user.click(together())
    expect(series()).toEqual([
      'classic-current-22',
      'classic-finished-22',
      'classic-blackholed-22',
      'me',
    ])
  })

  it('varios campus, cada uno en su línea, con su color y su nombre', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')
    await ready()

    // Por defecto, el tuyo; los que sigue la web, para elegir.
    const campuses = within(group('stats.progress.scope'))
      .getAllByRole('button')
      .map((button) => button.textContent)

    expect(campuses).toEqual(['Madrid', 'Málaga', 'Urduliz', 'Barcelona', 'Paris', 'Todas'])
    expect(chartCard().querySelector('.progress-encoding')?.textContent).toBe(
      text('stats.progress.encoding'),
    )

    // «Todas»: cada campus en su línea, al momento.
    await toggle(user, 'stats.progress.scope', 'Todas')
    await screen.findByText(
      (_, node) => node === chartCard() && series().includes('next-current-1'),
      {},
      { timeout: 5000 },
    )
    expect(series()).toEqual([
      'next-current-22',
      'next-current-37',
      'next-current-40',
      'next-current-46',
      'next-current-1',
      'me',
    ])
    const strokes = series()
      .filter((key) => key !== 'me')
      .map((key) =>
        chartCard().querySelector(`[data-series="${key}"] path`)?.getAttribute('stroke'),
      )

    expect(new Set(strokes).size).toBe(5)
    expect(
      legendItems().some((item) => item.startsWith('Python · En curso + terminado · Paris (')),
    ).toBe(true)
    expect(chartCard().querySelector('.progress-encoding')?.textContent).toBe(
      text('stats.progress.encodingCampuses'),
    )

    // Todos juntos va aparte, en gris; y el doble clic deja solo un campus.
    await user.click(together())
    expect(series()).toContain('next-current-all')
    await user.dblClick(
      within(group('stats.progress.scope')).getByRole('button', { name: 'Barcelona' }),
    )
    await screen.findByText(
      (_, node) => node === chartCard() && !series().includes('next-current-22'),
      {},
      { timeout: 5000 },
    )
    expect(series()).toEqual(['next-current-46', 'next-current-all', 'me'])
  })

  it('la ficha al pasar y la tabla nombran cada línea', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')
    await screen.findAllByText(/^Python · En curso \+ terminado · Madrid/, {}, { timeout: 5000 })
    await toggle(user, 'stats.progress.plan', 'C')

    const svg = must(chartCard().querySelector('.progress-chart svg'), 'la gráfica')

    fireEvent.pointerMove(svg, { clientX: 10 })
    const tip = await screen.findByRole('status')

    expect(tip.textContent).toContain('C · En curso + terminado · Madrid (310)')
    expect(tip.textContent).toContain('Python · En curso + terminado · Madrid (110)')
    expect(tip.textContent).toContain(text('stats.progress.me'))

    const headers = [...chartCard().querySelectorAll('.progress-table th')].map(
      (node) => node.textContent,
    )

    expect(headers).toEqual([
      text('stats.progress.tableMonth'),
      'C · En curso + terminado · Madrid (310)',
      'Python · En curso + terminado · Madrid (110)',
      text('stats.progress.me'),
    ])
  })

  it('el eje marca los círculos y, por horas, las horas de tu plan', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')
    await screen.findAllByText(/^Python · En curso \+ terminado · Madrid/, {}, { timeout: 5000 })

    expect(axis()).toEqual(['Inicio', ...[0, 1, 2, 3, 4, 5, 6].map((n) => `Círculo ${String(n)}`)])

    await user.click(
      within(group('stats.progress.measure')).getByRole('button', {
        name: text('stats.progress.measure.hours'),
      }),
    )
    const hours = axis()

    expect(hours[0]).toBe('0 h')
    // Arriba, las horas de todo tu common core (1456 en la API de mentira).
    expect(hours.at(-1)?.replace(/\D/g, '')).toBe('1456')
    expect(screen.getByText(/1\.?456 h\)/)).toBeTruthy()
  })
})

describe('Avance: el periodo del eje del tiempo', () => {
  const months = (): string[] =>
    [...chartCard().querySelectorAll('.progress-axis')].map((node) => node.textContent)
  const paceLabels = (): string[] =>
    [...chartCard().querySelectorAll('.progress-pace text')].map((node) => node.textContent)
  /** El último punto (en x) de tu línea. */
  const myEnd = (): number => {
    const d = chartCard().querySelector('[data-series="me"] path')?.getAttribute('d') ?? ''
    const xs = [...d.matchAll(/[ML]([\d.]+),/g)].map((match) => Number(match[1]))

    return Math.max(...xs)
  }

  afterEach(() => {
    localStorage.removeItem('sanatorio_progress_range')
    localStorage.removeItem('sanatorio_progress_months')
  })

  it('por defecto dos años; con el primer año, marca cada dos meses y los paces de 8 y 12', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')
    await ready()

    // El periodo es un desplegable (`PeriodPicker`): en escritorio, un `<select>` nativo.
    const period = picker()

    expect(period.value).toBe('24')
    expect([...period.options].map((option) => option.textContent)).toEqual([
      'Primer mes',
      'Primeros 3 meses',
      'Primeros 6 meses',
      'Primeros 12 meses',
      'Primeros 24 meses',
      text('period.all'),
      text('period.customMonths'),
    ])
    expect(months()).toEqual(['0 m', '3 m', '6 m', '9 m', '12 m', '15 m', '18 m', '21 m', '24 m'])
    const wide = myEnd()

    await user.selectOptions(period, 'Primeros 12 meses')
    expect(months()).toEqual(['0 m', '2 m', '4 m', '6 m', '8 m', '10 m', '12 m'])
    // Los paces de 8 y 12 meses acaban dentro: se ven con su rótulo; los demás, cortados.
    expect(paceLabels()).toEqual(['8 m', '12 m'])
    // La misma línea, estirada: llega más a la derecha.
    expect(myEnd()).toBeGreaterThan(wide)
    expect(localStorage.getItem('sanatorio_progress_range')).toBe('12')
  })

  it('a mano, un tramo de meses desde el inicio: del 6 al 12', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')
    await ready()
    await user.selectOptions(picker(), text('period.customMonths'))

    const from = screen.getByRole('spinbutton', { name: text('period.fromMonth') })
    const to = screen.getByRole('spinbutton', { name: text('period.toMonth') })

    fireEvent.change(from, { target: { value: '6' } })
    fireEvent.change(to, { target: { value: '12' } })
    // El eje empieza en el mes 6, no en 0.
    expect(months()).toEqual(['6 m', '7 m', '8 m', '9 m', '10 m', '11 m', '12 m'])
    expect(localStorage.getItem('sanatorio_progress_months')).toBe('6,12')
    // Las líneas entran por el borde izquierdo, recortadas.
    const me = must(chartCard().querySelector<SVGGElement>('[data-series="me"]'), 'tu línea')

    expect(me.getAttribute('clip-path')).toMatch(/^url\(#progress-clip-/)
    // La tabla, solo con lo del tramo (cada tres meses: el 9 y el 12).
    const rows = [...chartCard().querySelectorAll('.progress-table tbody tr')]

    expect(rows.map((row) => row.firstElementChild?.textContent)).toEqual(['9', '12'])
    // El teclado va del primer día del tramo al último.
    const svg = must(chartCard().querySelector<SVGSVGElement>('.progress-chart svg'), 'el dibujo')

    svg.focus()
    await user.keyboard('{Home}')
    // El primer sitio del tramo: un día (o un hito) del mes 6.
    expect(screen.getByRole('status').textContent).toMatch(/^Día 1\d\d \(mes 6,/)
    await user.keyboard('{End}')
    expect(screen.getByRole('status').textContent).toContain('Día 360')
  })

  it('lo guardado de antes (8, 15 meses…) cae en el siguiente que hay', async () => {
    const original = localStorage.getItem.bind(localStorage)
    let saved = '8'
    // `openApp` vacía el almacenamiento: lo de antes se finge al leerlo.
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (
      this: Storage,
      key: string,
    ) {
      return key === 'sanatorio_progress_range' ? saved : original(key)
    })

    try {
      await openApp('#/avance')
      await ready()
      expect(picker().value).toBe('12')
      cleanup()

      saved = '15'
      await openApp('#/avance')
      await ready()
      expect(picker().value).toBe('24')
    } finally {
      spy.mockRestore()
    }
  })

  it('«Todo» llega hasta el último dato, y se recuerda al volver', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')
    await ready()
    await user.selectOptions(picker(), text('period.all'))

    // Cuatro años de datos en la API de mentira: una marca al año.
    expect(months()).toEqual(['0 m', '12 m', '24 m', '36 m', '48 m'])
    // Todos los paces acaban antes: se ven enteros; de los rótulos, los que no se pisan.
    expect(chartCard().querySelectorAll('.progress-pace path')).toHaveLength(6)
    expect(paceLabels()).toEqual(expect.arrayContaining(['8 m', '24 m']))
    const rows = [...chartCard().querySelectorAll('.progress-table tbody tr')]

    expect(rows.at(-1)?.firstElementChild?.textContent).toBe('47')
    expect(localStorage.getItem('sanatorio_progress_range')).toBe('all')

    // Se va a otra sección y se vuelve: el Avance se monta de nuevo y lo recuerda.
    window.location.hash = '#/red'
    await screen.findByText(
      (_, node) => node === document.body && document.querySelector('.progress-card') === null,
      {},
      { timeout: 5000 },
    )
    window.location.hash = '#/avance'
    await ready()
    expect(picker().value).toBe('all')
  })

  it('sin almacenamiento del navegador, vuelve a dos años sin romperse', async () => {
    const original = localStorage.getItem.bind(localStorage)
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (
      this: Storage,
      key: string,
    ) {
      if (key === 'sanatorio_progress_range') throw new Error('bloqueado')
      return original(key)
    })

    try {
      await openApp('#/avance')
      await ready()
      expect(picker().value).toBe('24')
    } finally {
      spy.mockRestore()
    }
  })
})

describe('Avance: compararte con varias personas', () => {
  const input = (): HTMLElement =>
    screen.getByRole('combobox', { name: text('stats.progress.compare') })

  it('se añaden de una en una, cada cual con su línea y su pastilla; × la quita', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')
    await screen.findAllByText(/^Python · En curso \+ terminado · Madrid/, {}, { timeout: 5000 })

    for (const login of ['jdoe', 'mgarcia']) {
      await user.type(input(), login)
      await user.click(screen.getByRole('button', { name: text('stats.progress.compareAdd') }))
    }
    await screen.findByText(
      (_, node) => node?.getAttribute('data-series') === 'other-mgarcia',
      {},
      { timeout: 5000 },
    )
    expect(series()).toEqual(['next-current-22', 'other-jdoe', 'other-mgarcia', 'me'])
    // Cada persona, con su color.
    const strokes = ['other-jdoe', 'other-mgarcia'].map((key) =>
      chartCard().querySelector(`[data-series="${key}"] path`)?.getAttribute('stroke'),
    )

    expect(new Set(strokes).size).toBe(2)

    await user.click(screen.getByRole('button', { name: 'Quitar a jdoe' }))
    await screen.findByText(
      (_, node) =>
        node === chartCard() &&
        series().includes('other-mgarcia') &&
        !series().includes('other-jdoe'),
      {},
      { timeout: 5000 },
    )
    expect(series()).toEqual(['next-current-22', 'other-mgarcia', 'me'])
  })

  it('«Los más rápidos» sugiere quién terminó antes y con un clic se añaden, hasta cinco', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')
    await screen.findAllByText(/^Python · En curso \+ terminado · Madrid/, {}, { timeout: 5000 })
    await toggle(user, 'stats.progress.plan', 'C')
    await user.click(together())
    await user.click(screen.getByRole('button', { name: text('stats.progress.fastest') }))

    const campus = await screen.findByRole('region', { name: 'C · Madrid' }, { timeout: 5000 })
    const each = screen.getByRole('region', {
      name: 'C · quien antes terminó en cada campus',
    })

    expect(within(campus).getAllByRole('button')[0]?.textContent).toBe('aprado · 8,8 meses')
    // Uno por campus, con su campus.
    expect(within(each).getByRole('button', { name: /ifresno · Barcelona/ })).toBeTruthy()
    expect(
      within(screen.getByRole('region', { name: 'Python · Madrid' })).getByRole('button', {
        name: /^nvelasco/,
      }),
    ).toBeTruthy()

    await user.click(within(each).getByRole('button', { name: /ifresno/ }))
    await user.click(
      within(campus).getByRole('button', { name: text('stats.progress.fastest.addAll') }),
    )
    await screen.findByText(
      text('stats.progress.compareFull').replace('{n}', '5'),
      {},
      { timeout: 5000 },
    )
    expect(screen.getAllByRole('button', { name: /^Quitar a / })).toHaveLength(5)
    // Ya está: no se puede añadir más.
    expect(within(campus).getByRole('button', { name: /^dolmo/ })).toHaveProperty('disabled', true)
  })
})

describe('Quién va más rápido', () => {
  const list = (): HTMLElement =>
    must(document.querySelector<HTMLElement>('.progress-ranking-scroll'), 'la lista')
  const rows = (): Element[] => [...list().querySelectorAll('li')]

  it('una página al principio, tu fila fija y más al pedirlo', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')
    expect(
      await screen.findByRole('heading', { name: text('stats.ranking.title') }, { timeout: 5000 }),
    ).toBeTruthy()
    await screen.findByText('240 personas', {}, { timeout: 5000 })

    // 50 filas de la página más la tuya, que va al final y fija con `sticky`.
    expect(rows()).toHaveLength(51)
    const pinned = list().querySelectorAll('.row.pinned')

    expect(pinned).toHaveLength(1)
    expect(pinned[0]?.classList.contains('me')).toBe(true)
    expect(rows().at(-1)).toBe(pinned[0])

    await user.click(screen.getByRole('button', { name: text('stats.ranking.more') }))
    await screen.findByText(
      (_, node) => node === list() && rows().length >= 100,
      {},
      { timeout: 5000 },
    )
    // Ya cargada su página, tu fila está en su puesto (y sigue fija), sin repetirse.
    expect(list().querySelectorAll('.row.pinned')).toHaveLength(1)
    expect(list().querySelectorAll('.row.me')).toHaveLength(1)
  }, 20_000)

  it('filtra por plan, kickoff y rangos; sin nadie, lo dice', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')
    await screen.findByText('240 personas', {}, { timeout: 5000 })

    await user.click(
      within(group('stats.progress.plan', 1)).getByRole('button', { name: 'Python' }),
    )
    await screen.findByText(/^80 personas/, {}, { timeout: 5000 })

    const kickoff = screen.getByRole('combobox', { name: text('stats.ranking.kickoff') })

    await user.selectOptions(kickoff, '2026-09')
    await screen.findByText(/^40 personas/, {}, { timeout: 5000 })
    expect(group('stats.ranking.cohort')).toBeTruthy()

    // Solo quien terminó: el círculo mínimo, al tope (Fin).
    const circleMin = screen.getByRole('slider', { name: text('stats.ranking.circleMin') })

    circleMin.focus()
    await user.keyboard('{End}')
    expect(await screen.findByText(/^Círculos: de Terminado a Terminado/)).toBeTruthy()
    // Y como mucho un 10 %, escrito a mano: quien terminó lleva el 100 %, así que nadie.
    await user.click(
      screen.getByRole('button', {
        name: text('range.edit').replace('{what}', text('stats.ranking.pctMax')),
      }),
    )
    await user.keyboard('{Control>}a{/Control}10{Enter}')
    expect(await screen.findByText(text('stats.ranking.empty'), {}, { timeout: 5000 })).toBeTruthy()

    // Por horas: el rango de % es el de horas.
    await user.click(
      within(group('stats.ranking.by')).getByRole('button', {
        name: text('stats.ranking.by.hours'),
      }),
    )
    expect(screen.getByText(/^% por horas: de 0 a 10 %/)).toBeTruthy()
  }, 20_000)
})
