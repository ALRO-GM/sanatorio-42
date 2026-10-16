import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import type { CurrentUser } from '@sanatorio/contracts'

import { AvailabilityToggle } from '../features/peers/AvailabilityToggle'
import { PersonFinder } from '../features/profile/PersonFinder'
import { useI18n } from '../shared/i18n'
import { track } from '../shared/layout/store'
import { Icon } from '../shared/ui/Icon'
import { Nav } from './Nav'
import type { Section } from './sections'
import { UserMenu } from './UserMenu'
import { PLUS_GOAL, pressPlus, useEgg } from '../features/clicker/egg'

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
  /** Volver a ver la bienvenida. */
  onWelcome: () => void
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
  onWelcome,
  onLogout,
}: HeaderProps) {
  const { t } = useI18n()
  const egg = useEgg()
  // Al bajar, la barra gana una raya que la separa de lo que pasa por debajo.
  const [scrolled, setScrolled] = useState(false)
  // Cada pulsación de la cruz la hace vibrar otra vez (cambia la clave y se repite).
  const [knocks, setKnocks] = useState(0)
  // Lo cerca que está de abrirse, de 0 a 1: gira y se infla poco a poco.
  const counting = egg.ready && egg.pill === null && egg.plus > 0 && egg.plus < PLUS_GOAL
  const strain = counting ? egg.plus / PLUS_GOAL : 0
  const bar = useRef<HTMLDivElement>(null)

  // Lo que mide la cabecera (cambia si las pestañas pasan a dos filas) queda
  // en `--appbar-h`: lo que se ancla debajo de ella sabe así dónde empieza.
  useEffect(() => {
    const element = bar.current

    if (element === null) return undefined

    const measure = (): void => {
      document.documentElement.style.setProperty(
        '--appbar-h',
        `${Math.round(element.getBoundingClientRect().height)}px`,
      )
    }
    const observer = new ResizeObserver(measure)

    measure()
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [])

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
    <div ref={bar} className={`appbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="appbar-inner">
        <header className="appbar-row">
          <button
            type="button"
            className="brand"
            aria-label={t('nav.openRecord')}
            aria-current={section === 'expediente' ? 'page' : undefined}
            onClick={() => {
              track('nav.expediente')
              // Y cuenta para el secreto: a las 42, pasa algo.
              pressPlus()
              setKnocks((count) => count + 1)
              onGo('expediente')
            }}
          >
            <span
              key={knocks}
              className={`brand-mark ${counting ? 'knocked' : ''} ${knocks > 0 && !counting && egg.plus >= PLUS_GOAL && egg.pill === null ? 'opened' : ''}`}
              style={{ '--strain': strain } as CSSProperties}
              aria-hidden="true"
            >
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
            <PersonFinder />
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
                // Solo para quien eligió la pastilla roja.
                ...(egg.pill === 'red'
                  ? [
                      {
                        id: 'clicker',
                        icon: 'terminal' as const,
                        label: t('nav.clicker'),
                        run: () => {
                          onGo('clicker')
                        },
                      },
                    ]
                  : []),
                null,
                { id: 'personalizar', icon: 'ajustes', label: t('layout.open'), run: onCustomize },
                { id: 'incidencias', icon: 'bicho', label: t('inbox.open'), run: onInbox },
                { id: 'bienvenida', icon: 'pregunta', label: t('welcome.open'), run: onWelcome },
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
