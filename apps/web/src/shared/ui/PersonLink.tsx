import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import type { PersonCard } from '@sanatorio/contracts'

import { api } from '../api'
import { useI18n } from '../i18n'
import { recordHref } from '../links'
import { Avatar } from './Avatar'
import { FocusBadge } from './FocusBadge'
import { usePoolAllows } from '../pool'

/** Lo que se tarda en sacar la ficha al pasar el ratón: así no salta al cruzar la lista. */
const HOVER_DELAY_MS = 350
/** La ficha de cada login se guarda un rato: pasar dos veces no la pide otra vez. */
const CACHE_MS = 30_000
const CARD_WIDTH = 240

const cache = new Map<string, { at: number; card: Promise<PersonCard> }>()

function cardOf(login: string): Promise<PersonCard> {
  const hit = cache.get(login)

  if (hit !== undefined && Date.now() - hit.at < CACHE_MS) return hit.card

  const card = api.getPersonCard(login)

  cache.set(login, { at: Date.now(), card })
  // Si falla, que la próxima vez se vuelva a pedir.
  card.catch(() => cache.delete(login))

  return card
}

type PersonLinkProps = {
  login: string
  className?: string
  /** Lo que se pinta como enlace; por defecto, el login. */
  children?: ReactNode
}

/**
 * Un login que lleva a su expediente y, al pasar el ratón (o con el foco),
 * enseña su ficha: la foto en grande, dónde está sentado, su círculo, lo que
 * está haciendo y si está de guardia. El mismo componente en toda la web.
 */
export function PersonLink({ login, className = 'record-link', children }: PersonLinkProps) {
  const { t } = useI18n()
  const ref = useRef<HTMLAnchorElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const [card, setCard] = useState<PersonCard | null>(null)
  const [open, setOpen] = useState(false)
  const cards = usePoolAllows('people')

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
    },
    [],
  )

  const show = (): void => {
    // Sin el permiso de fichas (un piscinero, `docs/piscineros.md`), solo el enlace.
    if (!cards) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setOpen(true)
      void cardOf(login)
        .then(setCard)
        .catch(() => undefined)
    }, HOVER_DELAY_MS)
  }
  const hide = (): void => {
    window.clearTimeout(timer.current)
    setOpen(false)
  }

  const rect = open ? ref.current?.getBoundingClientRect() : undefined
  const above = rect !== undefined && rect.top > 260
  const left =
    rect === undefined
      ? 0
      : Math.min(
          Math.max(rect.left + rect.width / 2, CARD_WIDTH / 2 + 8),
          window.innerWidth - CARD_WIDTH / 2 - 8,
        )

  return (
    <>
      <a
        ref={ref}
        className={className}
        href={recordHref(login)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children ?? login}
      </a>
      {open && rect !== undefined && card !== null && (
        <div
          className={`seat-hover person-hover ${above ? 'above' : 'below'}`}
          style={{ left, top: above ? rect.top - 10 : rect.bottom + 10 }}
          role="tooltip"
        >
          <Avatar login={card.login} image={card.image} size={96} />
          <strong>{card.login}</strong>
          <span className="seat-host">
            {card.seat === null ? t('person.away') : t('person.seat', { seat: card.seat })}
          </span>
          <FocusBadge until={card.focusUntil} />
          <span className="seat-projects">
            {card.me && <span className="badge subtle">{t('map.you')}</span>}
            {card.circle !== null && (
              <span className="badge subtle">{t('map.circle', { n: card.circle })}</span>
            )}
            {card.onDuty && <span className="badge on">{t('peers.badgeOn')}</span>}
            {card.online && !card.me && <span className="badge on">{t('clusters.online')}</span>}
          </span>
          {card.projects.length > 0 ? (
            <span className="seat-projects">
              {card.projects.map((project) => (
                <span key={project} className="chip">
                  {project}
                </span>
              ))}
            </span>
          ) : (
            <span className="hint">{t('map.noProjects')}</span>
          )}
        </div>
      )}
    </>
  )
}
