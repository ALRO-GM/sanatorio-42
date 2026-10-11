import { useEffect, useRef, useState } from 'react'

import type { CurrentUser } from '@sanatorio/contracts'

import { useI18n } from '../shared/i18n'
import { Avatar } from '../shared/ui/Avatar'
import { Icon } from '../shared/ui/Icon'
import type { IconName } from '../shared/ui/Icon'

type Item = { id: string; icon: IconName; label: string; run: () => void; danger?: boolean }

type UserMenuProps = {
  me: CurrentUser
  /** Lo que se puede hacer desde el menú, en orden. Un `null` es una raya de separación. */
  items: readonly (Item | null)[]
}

/**
 * El menú de la cuenta: la foto y el login abren una lista con todo lo que es
 * "tuyo" (expediente, guardia, personalizar, escribir a quien administra,
 * salir). Antes cada cosa era un botón suelto en la cabecera.
 *
 * Se cierra al elegir, al pulsar fuera o con Escape.
 */
export function UserMenu({ me, items }: UserMenuProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return undefined

    const onPointer = (event: PointerEvent): void => {
      if (root.current !== null && !root.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="user-menu" ref={root}>
      <button
        type="button"
        className="user-menu-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('menu.open', { login: me.login })}
        onClick={() => {
          setOpen((current) => !current)
        }}
      >
        <Avatar login={me.login} image={me.image} size={30} />
        <span className="user-login">{me.login}</span>
        <Icon name="abajo" size={14} />
      </button>

      {open && (
        <div className="user-menu-list" role="menu">
          {items.map((item, index) =>
            item === null ? (
              <hr key={`raya-${index}`} />
            ) : (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={item.danger === true ? 'danger' : undefined}
                onClick={() => {
                  setOpen(false)
                  item.run()
                }}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
