import { useState } from 'react'
import type { ReactNode } from 'react'

import { useI18n } from '../../shared/i18n'
import { PAGE_IDS, PAGES } from '../../shared/layout/registry'
import type { PageId } from '../../shared/layout/registry'
import { useSortable } from '../../shared/layout/sortable'
import type { SortStep } from '../../shared/layout/sortable'
import {
  saveOrder,
  toggleFold,
  usePageLayout,
  useNavOrder,
  useOrder,
} from '../../shared/layout/store'
import { Icon } from '../../shared/ui/Icon'
import type { IconName } from '../../shared/ui/Icon'
import { CATEGORIES, categoryOf, HOME, sectionsOfCategory } from '../sections'
import type { Category, Section } from '../sections'

type MiniatureProps = {
  /** La sección con la que se abre: la que hay detrás de la ventana. */
  start: Section
  /** Cuenta a los lectores de pantalla lo que pasa al arrastrar. */
  announce: (message: string) => void
}

const isPage = (section: Section): section is Section & PageId =>
  (PAGE_IDS as readonly string[]).includes(section)

/** Altura (px) de la barra de un bloque plegado: el puntero tiene que quedar dentro. */
const BAR = 18

/**
 * La web en pequeño, para ordenarla a la vista: la fila de categorías, la de
 * pestañas de la abierta y los bloques de cada página. No pinta las páginas de
 * verdad: cada cosa es una tarjeta con su nombre (el de los idiomas), y el
 * cuerpo de un bloque, unas rayas grises.
 *
 * Todo lo que se mueve tiene un asa (los puntos). Al coger un bloque, todos se
 * pliegan en barras de una línea para colocarlo fácil; al soltarlo se guardan
 * (`saveOrder`) y la página de detrás se recoloca al momento.
 *
 * Salen todas las categorías y pestañas registradas, también las que el modo
 * de la interfaz esconde ahora: el orden vale para todos los modos.
 */
export function Miniature({ start, announce }: MiniatureProps) {
  const { t } = useI18n()
  const [view, setView] = useState<Section>(
    start === 'guardia' || categoryOf(start) !== null ? start : HOME,
  )
  const category = categoryOf(view)
  const categoryOrder = useOrder('categories')
  const navOrder = useNavOrder()

  /** Las secciones de una categoría: la fija (el perfil) y las demás en su orden. */
  const sectionsOf = (id: Category): Section[] => {
    const all = sectionsOfCategory(id)

    return [
      ...all.filter((entry) => !entry.inNav).map((entry) => entry.id),
      ...navOrder.flatMap((section) =>
        all.filter((entry) => entry.inNav && entry.id === section).map((entry) => entry.id),
      ),
    ]
  }

  const tell =
    (nameOf: (id: string) => string) =>
    (step: SortStep, id: string, position: number, total: number): void => {
      announce(t(`studio.${step}`, { name: nameOf(id), pos: position, total }))
    }

  const categories = useSortable({
    ids: categoryOrder,
    onDrop: (order) => {
      saveOrder('categories', order)
    },
    announce: tell((id) => t(`nav.cat.${id}`)),
  })

  // Las pestañas de la categoría abierta que se pueden mover (el perfil, no).
  const movable: string[] =
    category === null ? [] : sectionsOf(category).filter((id) => navOrder.includes(id))
  const subs = useSortable({
    ids: movable,
    onDrop: (order) => {
      // Las de esta categoría ocupan los mismos huecos del orden de todas, en su orden nuevo.
      const queue = [...order]

      saveOrder(
        'nav',
        navOrder.map((id) => (movable.includes(id) ? (queue.shift() ?? id) : id)),
      )
    },
    announce: tell((id) => t(`nav.${id}`)),
  })

  const page = isPage(view) ? view : null
  const layout = usePageLayout(page ?? 'expediente')
  const blocks = useSortable({
    ids: page === null ? [] : layout.order,
    onDrop: (order) => {
      if (page !== null) saveOrder(page, order)
    },
    announce: tell((id) => (page === null ? id : t(`layout.${page}.${id}`))),
    ghostGrip: BAR,
  })

  const fixed = category === null ? [] : sectionsOf(category).filter((id) => !navOrder.includes(id))
  const iconOf = (id: Section): IconName =>
    sectionsOfCategory(categoryOf(id) ?? 'yo').find((entry) => entry.id === id)?.icon ??
    'expediente'

  /** El asa de algo que se arrastra: un botón con los puntos. */
  const grip = (props: ReturnType<typeof categories.handle>, name: string): ReactNode => (
    <button
      type="button"
      className="mini-grip"
      aria-label={t('studio.grab', { name })}
      aria-describedby="studio-keys"
      {...props}
    >
      <Icon name="agarrar" size={14} />
    </button>
  )

  /** Lo cogido: hueco (con el puntero, lo lleva la copia flotante) o levantado (con el teclado). */
  const lifted = (list: { active: string | null; ghost: unknown }, id: string): string =>
    list.active !== id ? '' : list.ghost === null ? 'is-lifted' : 'is-placeholder'

  const categoryIcon = (id: string): IconName =>
    CATEGORIES.find((entry) => entry.id === id)?.icon ?? 'expediente'

  return (
    <div className="mini" role="group" aria-label={t('studio.preview')}>
      <p id="studio-keys" className="sr-only">
        {t('studio.keys')}
      </p>
      <div className="mini-appbar">
        <span className="mini-brand" aria-hidden="true">
          <i />
          <i />
        </span>
        {/* El on-call no es una pestaña: se abre desde la cabecera, como en la web. */}
        <button
          type="button"
          className={`mini-oncall ${view === 'guardia' ? 'active' : ''}`}
          aria-pressed={view === 'guardia'}
          onClick={() => {
            setView('guardia')
          }}
        >
          <Icon name="guardia" size={14} />
          {t('nav.guardia')}
        </button>
      </div>

      <ol
        className={`mini-tabs ${categories.active === null ? '' : 'is-sorting'}`}
        aria-label={t('studio.categories')}
      >
        {categories.order.map((id) => {
          const name = t(`nav.cat.${id}`)

          return (
            <li
              key={id}
              className={`mini-tab ${category === id ? 'active' : ''} ${lifted(categories, id)}`}
              data-sortable-id={id}
              {...categories.item(id)}
            >
              {grip(categories.handle(id), name)}
              <button
                type="button"
                className="mini-tab-open"
                aria-current={category === id ? 'page' : undefined}
                onClick={() => {
                  const first = sectionsOf(id as Category)[0]

                  if (first !== undefined) setView(first)
                }}
              >
                <Icon name={categoryIcon(id)} size={14} />
                <span>{name}</span>
              </button>
            </li>
          )
        })}
      </ol>

      {category !== null && fixed.length + movable.length > 1 && (
        <ol
          className={`mini-subtabs ${subs.active === null ? '' : 'is-sorting'}`}
          aria-label={t(`nav.cat.${category}`)}
        >
          {fixed.map((id) => (
            <li key={id} className={`mini-subtab fixed ${view === id ? 'active' : ''}`}>
              <button
                type="button"
                className="mini-tab-open"
                aria-current={view === id ? 'page' : undefined}
                onClick={() => {
                  setView(id)
                }}
              >
                <Icon name={iconOf(id)} size={13} />
                <span>{t(`nav.${id}`)}</span>
              </button>
            </li>
          ))}
          {subs.order.map((id) => {
            const name = t(`nav.${id}`)

            return (
              <li
                key={id}
                className={`mini-subtab ${view === id ? 'active' : ''} ${lifted(subs, id)}`}
                data-sortable-id={id}
                {...subs.item(id)}
              >
                {grip(subs.handle(id), name)}
                <button
                  type="button"
                  className="mini-tab-open"
                  aria-current={view === id ? 'page' : undefined}
                  onClick={() => {
                    setView(id as Section)
                  }}
                >
                  <Icon name={iconOf(id as Section)} size={13} />
                  <span>{name}</span>
                </button>
              </li>
            )
          })}
        </ol>
      )}

      <div className="mini-page">
        <p className="mini-page-title">{t(`nav.${view}`)}</p>
        {page === null ? (
          <>
            <div className="mini-skeleton" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <p className="mini-empty">{t('studio.noBlocks')}</p>
          </>
        ) : (
          <ol
            className={`mini-blocks ${blocks.active === null ? '' : 'is-sorting'}`}
            aria-label={t('studio.blocks', { name: t(`nav.${view}`) })}
          >
            {blocks.order.map((id) => {
              const name = t(`layout.${page}.${id}`)
              const folded = layout.folded.includes(id)
              const foldable = PAGES[page].find((block) => block.id === id)?.foldable === true

              return (
                <li
                  key={id}
                  className={`mini-block ${folded ? 'folded' : ''} ${lifted(blocks, id)}`}
                  data-sortable-id={id}
                  {...blocks.item(id)}
                >
                  <div className="mini-block-head">
                    {grip(blocks.handle(id), name)}
                    <span className="mini-block-title">{name}</span>
                    {foldable && (
                      <button
                        type="button"
                        className="mini-fold"
                        aria-pressed={folded}
                        aria-label={t(folded ? 'studio.unfold' : 'studio.fold', { name })}
                        title={t(folded ? 'studio.unfold' : 'studio.fold', { name })}
                        onPointerDown={(event) => {
                          // Plegar no es coger el bloque.
                          event.stopPropagation()
                        }}
                        onClick={() => {
                          toggleFold(page, id)
                        }}
                      >
                        <Icon name="abajo" size={14} />
                      </button>
                    )}
                  </div>
                  <div className="mini-block-body" aria-hidden="true">
                    <div>
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {[categories, subs, blocks].map((list, index) =>
        list.ghost === null ? null : (
          <div
            key={index}
            ref={list.ghostRef}
            className="mini-ghost"
            style={{ width: list.ghost.width }}
            aria-hidden="true"
          >
            <Icon name="agarrar" size={14} />
            <span>
              {list === categories
                ? t(`nav.cat.${list.ghost.id}`)
                : list === subs
                  ? t(`nav.${list.ghost.id}`)
                  : page === null
                    ? ''
                    : t(`layout.${page}.${list.ghost.id}`)}
            </span>
          </div>
        ),
      )}
    </div>
  )
}
