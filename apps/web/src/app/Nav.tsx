import { useI18n } from '../shared/i18n'
import { SECTIONS } from './sections'
import type { Section } from './sections'

type NavProps = {
  section: Section
  onGo: (next: Section) => void
}

// Las secciones van en su propia fila, debajo de la cabecera: así la cabecera
// sigue cabiendo en una sola línea en el móvil, y aquí se puede deslizar.
export function Nav({ section, onGo }: NavProps) {
  const { t } = useI18n()

  return (
    <nav className="tabs" aria-label={t('nav.label')}>
      {SECTIONS.filter((entry) => entry.inNav).map(({ id, icon }) => (
        <button
          key={id}
          className={`tab ${section === id ? 'active' : ''}`}
          aria-current={section === id ? 'page' : undefined}
          onClick={() => {
            onGo(id)
          }}
        >
          <span aria-hidden="true">{icon}</span> {t(`nav.${id}`)}
        </button>
      ))}
    </nav>
  )
}
