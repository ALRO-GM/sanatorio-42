import type { CSSProperties } from 'react'

import { useI18n } from '../../shared/i18n'
import { useStyle } from '../../shared/theme'
import { click, defineTour, Tour } from '../../shared/tour/Tour'
import type { Cue } from '../../shared/tour/Tour'
import { Icon } from '../../shared/ui/Icon'
import { themesFor } from '../../themes'
import type { ThemeManifest } from '../../themes'

type Studio = {
  /** Orden de las categorías en la web en pequeño. */
  categories: readonly string[]
  /** Orden de los bloques del perfil. */
  blocks: readonly string[]
  /** Lo que lleva cogido el ratón, si lleva algo. */
  lifted: string | null
  tab: 'order' | 'style'
  /** El estilo elegido en la demostración: su índice en la lista, o `-1`. */
  look: number
  done: boolean
}

const CATEGORIES = ['yo', 'ayuda', 'aprender', 'campus']
const BLOCKS = ['record', 'health', 'network']

const START: Studio = {
  categories: CATEGORIES,
  blocks: BLOCKS,
  lifted: null,
  tab: 'order',
  look: -1,
  done: false,
}

/**
 * Coger algo por el asa y llevarlo a otro hueco: el ratón va al asa, aprieta,
 * se lleva la pieza (que cambia de hueco a la vez) y la suelta.
 */
const carry = (at: number, id: string, to: string, change: Partial<Studio>): Cue<Studio>[] => [
  [at, { cursor: `grip-${id}` }],
  [at + 700, { press: true, drag: true, lifted: id }],
  [at + 760, { cursor: to, ...change }],
  [at + 1700, { press: false, drag: false, lifted: null }],
]

export const TOUR = defineTour<Studio>(
  'studio',
  START,
  [
    ...carry(700, 'aprender', 'cat1', {
      categories: ['yo', 'aprender', 'ayuda', 'campus'],
    }),
    [3300, { caption: 2 }],
    ...carry(3300, 'network', 'block0', {
      blocks: ['network', 'record', 'health'],
    }),
    [6000, { caption: 3 }],
    ...click<Studio>(6000, 'tab-style', { tab: 'style' }),
    [7700, { caption: 4 }],
    ...click<Studio>(7700, 'style1', { look: 1 }),
    [10200, { caption: 5 }],
    ...click<Studio>(10200, 'done', { done: true }),
  ],
  // De qué sitio de la página habla cada paso: soltando ahí el interrogante,
  // la demostración empieza en él.
  {
    1: '.mini-tabs, .mini-subtabs',
    2: '.mini-blocks',
    3: '#studio-tab-style',
    4: '.studio-styles, .studio-palettes',
    5: '.studio > .actions',
  },
)

/** Los colores de la muestra de un estilo, para la web en pequeño. */
const colors = (theme: ThemeManifest | undefined): CSSProperties =>
  (theme === undefined
    ? {}
    : {
        '--mini-bg': theme.preview.bg,
        '--mini-surface': theme.preview.surface,
        '--mini-text': theme.preview.text,
        '--mini-accent': theme.preview.accent,
        '--mini-radius': theme.preview.radius,
      }) as CSSProperties

/**
 * Cómo se usa Personalizar: se arrastran las pestañas y los bloques de la web
 * en pequeño, y un estilo nuevo se aplica al momento, sin guardar nada.
 */
export function StudioTour() {
  const { t, lang } = useI18n()
  const [current] = useStyle()
  // Tres estilos de los de todo el mundo, con el que está puesto el primero:
  // el que se elige en la demostración siempre cambia algo.
  const all = themesFor('')
  const styles = [
    ...all.filter((theme) => theme.id === current),
    ...all.filter((theme) => theme.id !== current),
  ].slice(0, 3)

  return (
    <Tour tour={TOUR} tab={() => t('layout.title')}>
      {(shot) => (
        <>
          <div className="tour-mini" style={colors(styles[shot.look])}>
            <div className="tour-sort-row" style={{ ['--n' as string]: CATEGORIES.length }}>
              {CATEGORIES.map((id) => (
                <span
                  key={id}
                  className={`tour-sort ${id === 'yo' ? 'on' : ''} ${shot.lifted === id ? 'lifted' : ''}`}
                  style={{ ['--i' as string]: shot.categories.indexOf(id) }}
                >
                  <span>
                    <span className="tour-grip" data-tour={`grip-${id}`}>
                      <Icon name="agarrar" size={11} />
                    </span>
                    <b>{t(`nav.cat.${id}`)}</b>
                  </span>
                </span>
              ))}
              {CATEGORIES.map((id, index) => (
                <span
                  key={id}
                  className="tour-anchor"
                  data-tour={`cat${String(index)}`}
                  style={{ left: `calc(${String(index * 20)}% + 0.8em)`, top: '50%' }}
                />
              ))}
            </div>
            <strong>{t('nav.expediente')}</strong>
            <div className="tour-sort-col" style={{ ['--n' as string]: BLOCKS.length }}>
              {BLOCKS.map((id) => (
                <span
                  key={id}
                  className={`tour-sort ${shot.lifted === id ? 'lifted' : ''}`}
                  style={{ ['--i' as string]: shot.blocks.indexOf(id) }}
                >
                  <span>
                    <span className="tour-grip" data-tour={`grip-${id}`}>
                      <Icon name="agarrar" size={11} />
                    </span>
                    <b>{t(`layout.expediente.${id}`)}</b>
                  </span>
                </span>
              ))}
              <span
                className="tour-anchor"
                data-tour="block0"
                style={{ left: '0.8em', top: '0.9em' }}
              />
            </div>
          </div>
          <div className="tour-card">
            <div className="tour-row">
              <span
                className={`tour-pill ${shot.tab === 'style' ? 'on' : ''}`}
                data-tour="tab-style"
              >
                {t('studio.tab.style')}
              </span>
              <span className={`tour-pill ${shot.tab === 'order' ? 'on' : ''}`}>
                {t('studio.tab.order')}
              </span>
              <span className="tour-button tour-end" data-tour="done">
                {t('layout.done')}
              </span>
              {shot.done && (
                <span className="tour-saved">
                  <Icon name="hecho" size={13} />
                </span>
              )}
            </div>
            {shot.tab === 'order' ? (
              <div className="tour-row">
                <strong>{t('layout.mode')}</strong>
                {(['manual', 'mine', 'community'] as const).map((mode) => (
                  <span key={mode} className={`tour-pill ${mode === 'manual' ? 'on' : ''}`}>
                    {t(`layout.mode.${mode}`)}
                  </span>
                ))}
              </div>
            ) : (
              <div className="tour-row tour-in">
                {styles.map((theme, index) => (
                  <span
                    key={theme.id}
                    data-tour={`style${String(index)}`}
                    className={`tour-style ${index === Math.max(0, shot.look) ? 'on' : ''}`}
                    style={{
                      ['--sample-bg' as string]: theme.preview.bg,
                      ['--sample-accent' as string]: theme.preview.accent,
                    }}
                  >
                    <i />
                    {theme.name[lang] ?? theme.name.es}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Tour>
  )
}
