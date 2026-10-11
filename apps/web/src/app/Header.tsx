import { useEffect, useState } from 'react'

import type { CurrentUser } from '@sanatorio/contracts'

import { AvailabilityToggle } from '../features/peers/AvailabilityToggle'
import { useI18n } from '../shared/i18n'
import { track } from '../shared/layout/store'
import { Icon } from '../shared/ui/Icon'
import { Nav } from './Nav'
import type { Section } from './sections'
import { UserMenu } from './UserMenu'

type HeaderProps = {
  me: CurrentUser
  section: Section
  /** Si quien mira administra la web: le sale el panel en su menú. */
  admin: boolean
  /** Avisos sin leer: el número rojo del buzón. */
  unread: number
  onMailbox: () => void
  onGo: (section: Section) => void
  onCustomize: () => void
  /** Abre el formulario de incidencias y sugerencias. */
  onInbox: () => void
  onLogout: () => void
}

/**
 * La barra de arriba, a todo lo ancho y pegada al borde al bajar por la página.
 *
 * Dos filas: en la primera, la marca a la izquierda y a la derecha lo que es de
 * la persona (su guardia, su buzón y su menú); en la segunda, las secciones.
 * Lo que antes eran botones sueltos (panel, personalizar, salir, incidencias)
 * está recogido en el menú de la cuenta.
 */
export function Header({
  me,
  section,
  admin,
  unread,
  onMailbox,
  onGo,
  onCustomize,
  onInbox,
  onLogout,
}: HeaderProps) {
  const { t } = useI18n()
  // Al bajar, la barra gana una raya que la separa de lo que pasa por debajo.
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = (): void => {
      setScrolled(window.scrollY > 4)
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div className={`appbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="appbar-inner">
        <header className="appbar-row">
          <button
            type="button"
            className="brand"
            aria-label={t('nav.openRecord')}
            aria-current={section === 'expediente' ? 'page' : undefined}
            onClick={() => {
              track('nav.expediente')
              onGo('expediente')
            }}
          >
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="brand-name">
              Sanatorio <b>42</b>
            </span>
          </button>

          <div className="appbar-actions">
            <AvailabilityToggle
              active={section === 'guardia'}
              onOpen={() => {
                track('nav.guardia')
                onGo('guardia')
              }}
              onTurnedOn={() => {
                onGo('guardia')
              }}
            />
            <button
              type="button"
              className="icon-btn mailbox-btn"
              aria-label={unread === 0 ? t('notices.open') : t('notices.openUnread', { n: unread })}
              title={t('notices.title')}
              onClick={onMailbox}
            >
              <Icon name="buzon" size={20} />
              {unread > 0 && (
                <span className="count-badge" aria-hidden="true">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
            <UserMenu
              me={me}
              items={[
                {
                  id: 'expediente',
                  icon: 'expediente',
                  label: t('menu.record'),
                  run: () => {
                    onGo('expediente')
                  },
                },
                {
                  id: 'guardia',
                  icon: 'guardia',
                  label: t('menu.duty'),
                  run: () => {
                    onGo('guardia')
                  },
                },
                ...(admin
                  ? [
                      {
                        id: 'gestion',
                        icon: 'gestion' as const,
                        label: t('admin.usage.open'),
                        run: () => {
                          onGo('gestion')
                        },
                      },
                    ]
                  : []),
                null,
                { id: 'personalizar', icon: 'ajustes', label: t('layout.open'), run: onCustomize },
                { id: 'incidencias', icon: 'lapiz', label: t('inbox.open'), run: onInbox },
                null,
                { id: 'salir', icon: 'salir', label: t('app.logout'), run: onLogout, danger: true },
              ]}
            />
          </div>
        </header>

        <Nav section={section} onGo={onGo} />
      </div>
    </div>
  )
}
