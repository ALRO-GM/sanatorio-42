import { useI18n } from '../shared/i18n'
import { track, useNavOrder } from '../shared/layout/store'
import { SECTIONS } from './sections'
import type { Section } from './sections'
import { Icon } from '../shared/ui/Icon'

type NavProps = {
  section: Section
  onGo: (next: Section) => void
}

// Las pestañas van en su propia fila, debajo de la marca y pegadas arriba al
// bajar por la página. El orden es el que la persona ha elegido, o el automático.
export function Nav({ section, onGo }: NavProps) {
  const { t } = useI18n()
  const order = useNavOrder()
  // El expediente va siempre el primero: es donde se entra. El resto, en el orden elegido.
  const tabs = [
    ...SECTIONS.filter((entry) => entry.id === 'expediente'),
    ...order.flatMap((id) => SECTIONS.filter((entry) => entry.id === id && entry.inNav)),
  ]

  // La sección en la que se está, aunque no sea una pestaña (la guardia, el panel…).
  const current = tabs.some((tab) => tab.id === section)
    ? null
    : SECTIONS.find((entry) => entry.id === section)

  return (
    <>
      {/* En el móvil, un desplegable: las pestañas no caben en una fila. */}
      <label className="tabs-select">
        <span className="sr-only">{t('nav.label')}</span>
        <select
          value={section}
          onChange={(event) => {
            const next = SECTIONS.find((entry) => entry.id === event.target.value)

            if (next !== undefined) {
              track(`nav.${next.id}`)
              onGo(next.id)
            }
          }}
        >
          {current !== null && current !== undefined && (
            <option value={current.id}>{t(`nav.${current.id}`)}</option>
          )}
          {tabs.map(({ id }) => (
            <option key={id} value={id}>
              {t(`nav.${id}`)}
            </option>
          ))}
        </select>
      </label>
      <nav className="tabs" aria-label={t('nav.label')}>
        {tabs.map(({ id, icon }) => (
          <button
            key={id}
            className={`tab ${section === id ? 'active' : ''}`}
            aria-current={section === id ? 'page' : undefined}
            onClick={() => {
              track(`nav.${id}`)
              onGo(id)
            }}
          >
            <Icon name={icon} />
            <span>{t(`nav.${id}`)}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
