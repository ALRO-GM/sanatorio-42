import { useI18n } from '../shared/i18n'
import { track, useNavOrder } from '../shared/layout/store'
import { SECTIONS } from './sections'
import type { Section } from './sections'

type NavProps = {
  section: Section
  onGo: (next: Section) => void
}

// Las pestañas van en su propia fila, debajo de la cabecera y pegadas a ella al
// bajar por la página. El orden es el que la persona ha elegido, o el automático.
export function Nav({ section, onGo }: NavProps) {
  const { t } = useI18n()
  const order = useNavOrder()
  const tabs = order.flatMap((id) => SECTIONS.filter((entry) => entry.id === id && entry.inNav))

  return (
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
          <span aria-hidden="true">{icon}</span> {t(`nav.${id}`)}
        </button>
      ))}
    </nav>
  )
}
