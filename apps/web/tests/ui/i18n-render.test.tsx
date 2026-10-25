/**
 * Los textos tal como se pintan: singular y plural según el idioma, números a
 * su manera, títulos de eventos traducidos y ningún instante en otro idioma al
 * llegar o al cambiar de idioma.
 *
 * El orden importa: los idiomas descargados se quedan en memoria para todo el
 * fichero. La preparación (`setup.ts`) ya trae el inglés, el del navegador.
 */
import type { Lang } from '@sanatorio/contracts'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import en from 'virtual:textos/en'
import es from 'virtual:textos/es'
import eu from 'virtual:textos/eu'
import fr from 'virtual:textos/fr'
import { afterEach, describe, expect, it } from 'vitest'

import { eventTitle } from '../../src/shared/eventTitle'
import { I18nProvider, loadLang, useI18n } from '../../src/shared/i18n'
import { must } from './must'

const NB = ' '
const NNB = ' '

afterEach(() => {
  cleanup()
  localStorage.removeItem('sanatorio_lang')
})

/** Apunta cada texto que se pinta, en orden. */
function Probe({ seen, keyName }: { seen: string[]; keyName: string }) {
  const { t, setLang } = useI18n()
  const text = t(keyName)

  seen.push(text)

  return (
    <>
      <p>{text}</p>
      <button
        type="button"
        onClick={() => {
          setLang('fr')
        }}
      >
        fr
      </button>
    </>
  )
}

describe('ningún instante en otro idioma', () => {
  it('la primera vez no se pinta nada hasta que llegan los textos del idioma', async () => {
    const seen: string[] = []
    const wanted = must(eu['legal.accept'], 'el texto en euskera')

    localStorage.setItem('sanatorio_lang', 'eu')

    const { container } = render(
      <I18nProvider>
        <Probe seen={seen} keyName="legal.accept" />
      </I18nProvider>,
    )

    // Ni en español ni en inglés mientras llega el euskera: nada.
    expect(container.textContent).toBe('')
    expect(await screen.findByText(wanted)).toBeTruthy()
    expect(new Set(seen)).toEqual(new Set([wanted]))
  })

  it('al pasar al francés no se ve el inglés de reserva: sigue el español hasta que llega', async () => {
    const user = userEvent.setup()
    const seen: string[] = []
    const spanish = must(es['legal.accept'], 'el texto en español')
    const french = must(fr['legal.accept'], 'el texto en francés')

    localStorage.setItem('sanatorio_lang', 'es')
    render(
      <I18nProvider>
        <Probe seen={seen} keyName="legal.accept" />
      </I18nProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'fr' }))

    expect(await screen.findByText(french)).toBeTruthy()
    expect(seen).not.toContain(en['legal.accept'])
    expect(new Set(seen)).toEqual(new Set([spanish, french]))
    expect(document.documentElement.lang).toBe('fr')
  })
})

/** Las funciones de textos de un idioma, ya descargado. */
async function i18nIn(lang: Lang): Promise<ReturnType<typeof useI18n>> {
  let got: ReturnType<typeof useI18n> | undefined

  function Grab() {
    got = useI18n()

    return null
  }

  localStorage.setItem('sanatorio_lang', lang)
  await loadLang(lang)
  await act(async () => {
    render(
      <I18nProvider>
        <Grab />
      </I18nProvider>,
    )
    await Promise.resolve()
  })

  return must(got, 'los textos')
}

describe('singular y plural', () => {
  it('español: el singular solo con 1', async () => {
    const { tn } = await i18nIn('es')

    expect(tn('pace.left', 1)).toBe('queda 1 día')
    expect(tn('pace.left', 3)).toBe('quedan 3 días')
    expect(tn('pace.left', 0)).toBe('quedan 0 días')
    expect(tn('admin.people.days', 1)).toBe('1 día')
    expect(tn('admin.people.days', 30)).toBe('30 días')
    expect(tn('staff.rows', 1)).toBe('1 fila')
    expect(tn('exams.selection', 1)).toBe('1 persona en lo elegido')
    // La cantidad sale con los separadores del idioma.
    expect(tn('admin.data.total', 12_345)).toBe('12.345 filas en total')
  })

  it('inglés: «1 day», «7 days»', async () => {
    const { tn } = await i18nIn('en')

    expect(tn('admin.people.days', 1)).toBe('1 day')
    expect(tn('admin.people.days', 7)).toBe('7 days')
    expect(tn('health.calcMargin', 1, { date: '13 Oct' })).toBe(
      '1 day to spare before the deadline (13 Oct).',
    )
    expect(tn('therapy.invited', 1)).toBe('You told 1 person doing the project')
    expect(tn('therapy.invited', 4)).toBe('You told 4 people doing the project')
  })

  it('francés: el singular con 0, 1 y lo que no llega a 2', async () => {
    const { t, tn } = await i18nIn('fr')

    expect(tn('exams.selection', 0)).toBe('0 personne dans la sélection')
    expect(tn('exams.selection', 1)).toBe('1 personne dans la sélection')
    expect(tn('exams.avg', 1.5)).toBe('1,5 tentative en moyenne pour valider')
    expect(tn('exams.selection', 2)).toBe('2 personnes dans la sélection')
    // Los miles, con espacio fino sin corte; el año, tal cual.
    expect(tn('net.sync.copying', 81_723, { rows: 51_300, total: 81_723 })).toBe(
      `Import de l'historique depuis 42${NB}: 51${NNB}300 sur 81${NNB}723 corrections. Le graphe va s'étoffer tout seul.`,
    )
    expect(t('net.since', { year: 2026 })).toBe('depuis 2026')
  })
})

describe('títulos de los eventos', () => {
  const corrected = {
    title: 'Te corrigen ft_printf',
    label: { kind: 'corrected', project: 'ft_printf', login: null },
  } as const

  it('los que pone Peer4U salen en el idioma de quien mira', async () => {
    const { t } = await i18nIn('fr')

    expect(eventTitle(t, corrected)).toBe('Correction de ton ft_printf')
    expect(
      eventTitle(t, {
        title: 'Ayudas a lsoto',
        label: { kind: 'helping', project: null, login: 'lsoto' },
      }),
    ).toBe('Tu aides lsoto')
    expect(
      eventTitle(t, {
        title: 'Sprint de grupo',
        label: { kind: 'sprint', project: null, login: null },
      }),
    ).toBe('Sprint de groupe')
    expect(
      eventTitle(t, {
        title: 'Corriges',
        label: { kind: 'correcting', project: null, login: null },
      }),
    ).toBe('Tu corriges')
  })

  it('en inglés y en español, también', async () => {
    expect(eventTitle((await i18nIn('en')).t, corrected)).toBe('Evaluation of your ft_printf')
    cleanup()
    expect(eventTitle((await i18nIn('es')).t, corrected)).toBe('Te corrigen ft_printf')
  })

  it('un título propio (pizarra, evento de 42) o uno guardado sin label se enseña tal cual', async () => {
    const { t } = await i18nIn('fr')

    expect(eventTitle(t, { title: 'Exam Session Morning', label: null })).toBe(
      'Exam Session Morning',
    )
    expect(eventTitle(t, { title: 'Lo de antes' })).toBe('Lo de antes')
    // A una reserva le falta con quién: mejor el título que un hueco vacío.
    expect(
      eventTitle(t, {
        title: 'Ayudas a alguien',
        label: { kind: 'helping', project: null, login: null },
      }),
    ).toBe('Ayudas a alguien')
    expect(eventTitle(t, { title: null, label: null })).toBe('')
  })
})
