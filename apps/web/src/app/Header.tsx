import { useEffect, useState } from 'react'

import type { CurrentUser } from '@sanatorio/contracts'

import { AvailabilityToggle } from '../features/peers/AvailabilityToggle'
import { useI18n } from '../shared/i18n'
import { track } from '../shared/layout/store'
import { Avatar } from '../shared/ui/Avatar'
import { Logo } from '../shared/ui/Logo'
import { Nav } from './Nav'
import type { Section } from './sections'

type HeaderProps = {
  me: CurrentUser
  section: Section
  /** Si quien mira administra la web: le sale el botón del panel. */
  admin: boolean
  onGo: (section: Section) => void
  onCustomize: () => void
  onLogout: () => void
}

/**
 * La cabecera y, debajo, la fila de secciones. Se quedan arriba al bajar por la
 * página, más estrechas.
 */
export function Header({ me, section, admin, onGo, onCustomize, onLogout }: HeaderProps) {
  const { t } = useI18n()
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const onScroll = (): void => {
      // Con margen entre encoger y volver a crecer, para que no tiemble en el límite.
      setCompact((current) => (current ? window.scrollY > 12 : window.scrollY > 56))
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div className={`top-sticky ${compact ? 'compact' : ''}`}>
      <header className="topbar">
        <div className="topbar-brand">
          <Logo
            onMarkClick={() => {
              track('nav.expediente')
              onGo('expediente')
            }}
            markLabel={t('nav.openRecord')}
            markActive={section === 'expediente'}
          />
        </div>
        <div className="topbar-user">
          <Avatar login={me.login} image={me.image} size={compact ? 30 : 40} />
          <span className="user-login">{me.login}</span>
        </div>
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
        {admin && (
          <button
            type="button"
            className={`icon-btn ${section === 'gestion' ? 'active' : ''}`}
            aria-label={t('admin.usage.open')}
            title={t('admin.usage.open')}
            onClick={() => {
              onGo('gestion')
            }}
          >
            📊
          </button>
        )}
        <button
          type="button"
          className="icon-btn"
          aria-label={t('layout.open')}
          title={t('layout.open')}
          onClick={onCustomize}
        >
          ⚙
        </button>
        <button onClick={onLogout}>{t('app.logout')}</button>
      </header>

      <Nav section={section} onGo={onGo} />
    </div>
  )
}
