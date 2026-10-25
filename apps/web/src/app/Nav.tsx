import { useEffect, useRef } from 'react'

import { shows, useDetail } from '../shared/detail'
import { useI18n } from '../shared/i18n'
import { track, useNavOrder, useOrder } from '../shared/layout/store'
import { Icon } from '../shared/ui/Icon'
import { focusing, useFocus } from '../shared/focus'
import { usePoolAccess } from '../shared/pool'
import {
  blockedForPool,
  CATEGORIES,
  categoryOf,
  hiddenInFocus,
  sectionsOfCategory,
} from './sections'
import type { Category, Section } from './sections'

type NavProps = {
  section: Section
  onGo: (next: Section) => void
  /** `true` si hay un examen en marcha en el campus: su pestaña lo dice. */
  examLive?: boolean
}

/** La última sección que se miró de cada categoría: se vuelve a ella. */
const lastOf = new Map<Category, Section>()

/**
 * Las pestañas, en su propia fila debajo de la marca: arriba las categorías
 * (Perfil, Ayuda, Calendario, Clústeres, Datos), en el orden elegido, y, si la
 * abierta tiene varias secciones, una segunda fila con ellas, en el orden que
 * la persona ha elegido (o el automático). Solo sale lo que toca en el modo de la interfaz.
 */
export function Nav({ section, onGo, examLive = false }: NavProps) {
  const { t } = useI18n()
  const order = useNavOrder()
  const categoryOrder = useOrder('categories')
  const detail = useDetail()
  const active = categoryOf(section)

  const bar = useRef<HTMLElement>(null)

  useEffect(() => {
    if (active !== null) lastOf.set(active, section)
  }, [active, section])

  // En el móvil las filas se deslizan de lado: la pestaña abierta, a la vista.
  useEffect(() => {
    for (const element of bar.current?.parentElement?.querySelectorAll('[aria-current="page"]') ??
      []) {
      element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }, [section])

  const focus = useFocus()
  const pool = usePoolAccess()

  // Las de la categoría que tocan en este modo; las que se pueden reordenar, en
  // el orden elegido.
  const sectionsOf = (category: Category) => {
    const all = sectionsOfCategory(category)

    return (
      [
        ...all.filter((entry) => !entry.inNav),
        ...order.flatMap((id) => all.filter((entry) => entry.id === id && entry.inNav)),
      ]
        .filter((entry) => shows(detail, entry.from ?? 'simple'))
        // Un piscinero, solo lo que permite el panel (el expediente, siempre).
        .filter((entry) => !blockedForPool(entry.id, pool))
        // En Pomodoro, solo lo elegido (y el expediente).
        .filter(
          (entry) => !focusing(focus) || !hiddenInFocus(entry.id, focus?.settings.sections ?? []),
        )
    )
  }

  // Las categorías, en el orden que haya puesto la persona en Personalizar.
  const categories = CATEGORIES.filter(({ id }) => sectionsOf(id).length > 0).sort(
    (a, b) => categoryOrder.indexOf(a.id) - categoryOrder.indexOf(b.id),
  )
  const subs = active === null ? [] : sectionsOf(active)
  const open = (category: Category): void => {
    const choices = sectionsOf(category)
    const remembered = lastOf.get(category)
    const target = choices.find((entry) => entry.id === remembered) ?? choices[0]

    if (target === undefined) return
    track(`nav.${target.id}`)
    onGo(target.id)
  }

  return (
    <>
      <nav ref={bar} className="tabs" aria-label={t('nav.label')}>
        {categories.map(({ id, icon }) => (
          <button
            key={id}
            className={`tab ${active === id ? 'active' : ''}`}
            aria-current={active === id ? 'page' : undefined}
            title={t(`nav.cat.${id}.hint`)}
            onClick={() => {
              open(id)
            }}
          >
            <Icon name={icon} />
            <span>{t(`nav.cat.${id}`)}</span>
            {examLive && id === 'datos' && <b className="tab-live">{t('nav.examenesLive')}</b>}
          </button>
        ))}
      </nav>
      {subs.length > 1 && (
        <nav className="subtabs" aria-label={t(`nav.cat.${active ?? 'ayuda'}`)}>
          {subs.map(({ id, icon }) => (
            <button
              key={id}
              className={`subtab ${section === id ? 'active' : ''}`}
              aria-current={section === id ? 'page' : undefined}
              onClick={() => {
                track(`nav.${id}`)
                onGo(id)
              }}
            >
              <Icon name={icon} size={16} />
              <span>{t(`nav.${id}`)}</span>
              {id === 'examenes' && examLive && <b className="tab-live">{t('nav.examenesLive')}</b>}
            </button>
          ))}
        </nav>
      )}
    </>
  )
}
