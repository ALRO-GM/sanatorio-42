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
          <Icon name={icon} />
          <span>{t(`nav.${id}`)}</span>
        </button>
      ))}
    </nav>
  )
}
