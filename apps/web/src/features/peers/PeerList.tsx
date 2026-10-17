import { useEffect, useState } from 'react'

import type { Peer, ProjectStatus, ProjectSummary } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { Show } from '../../shared/detail'
import { Icon } from '../../shared/ui/Icon'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { BookHelp } from '../help/BookHelp'
import { ProjectMap } from '../map/ProjectMap'
import { intraHref, recordHref } from '../../shared/links'

// 0: especialista de guardia · 1: paciente como tú de guardia
// 2: especialista que no está de guardia · 3: paciente como tú que no está de guardia
// "De guardia" siempre significa available: true y location distinta de null.
function onDuty(peer: Peer): boolean {
  return peer.available && peer.location !== null
}

function rank(peer: Peer): number {
  const specialist = peer.status === 'finished'
  if (onDuty(peer) && specialist) return 0
  if (onDuty(peer)) return 1
  if (specialist) return 2
  return 3
}

// Cada cuánto se vuelve a preguntar mientras la lista está a la vista. El back
// responde de su copia local, así que no le cuesta nada a la API de 42.
const REFRESH_MS = 60_000
// Si el proyecto aún se está copiando, se insiste antes para ver llegar al resto.
const REFRESH_PARTIAL_MS = 8_000

type TypeFilter = 'all' | ProjectStatus

type PeerListProps = {
  project: ProjectSummary
  onOpenTherapy: () => void
}

/** Quién puede ayudarte con un proyecto: de guardia primero. */
export function PeerList({ project, onOpenTherapy }: PeerListProps) {
  const { t } = useI18n()
  const { data, error, loading, reload } = useAsync(() => api.getPeers(project.id), [project.id])
  const groups = useAsync(() => api.getGroups(project.id), [project.id])
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [onlyOnDuty, setOnlyOnDuty] = useState(false)
  // Solo especialistas que se ofrecen a preevaluar un proyecto ya terminado.
  const [onlyPreReview, setOnlyPreReview] = useState(false)
  // Solo a quien se le puede reservar un rato ahora mismo.
  const [onlyBookable, setOnlyBookable] = useState(false)
  // Quién se ofrece hoy con hueco: a esas personas se les puede reservar un rato.
  const offers = useAsync(() => api.getHelpOffers(), [])
  const [booking, setBooking] = useState<string | null>(null)
  // Con quién te has corregido ya: sirve para animar a buscar caras nuevas.
  const network = useAsync(() => api.getNetworkMine(), [])

  const partial = data?.partial === true

  useEffect(() => {
    const timer = setInterval(
      () => {
        // Con la pestaña en segundo plano no se pregunta: nadie lo está mirando.
        if (!document.hidden) void reload()
      },
      partial ? REFRESH_PARTIAL_MS : REFRESH_MS,
    )
    return () => {
      clearInterval(timer)
    }
  }, [reload, partial])

  const title = <h2>{t('peers.title', { project: project.name })}</h2>

  if (loading)
    return (
      <section>
        {title}
        <p>{t('peers.loading')}</p>
      </section>
    )

  if (data === undefined) {
    return (
      <section>
        {title}
        <ErrorNote error={error} onRetry={() => void reload()} />
      </section>
    )
  }

  const { peers, total } = data
  const onDutyCount = peers.filter(onDuty).length
  const onDutySpecialists = peers.filter((p) => onDuty(p) && p.status === 'finished').length
  const sorted = [...peers].sort((a, b) => rank(a) - rank(b))

  const byDuty = onlyOnDuty ? sorted.filter(onDuty) : sorted
  const specialistsCount = byDuty.filter((p) => p.status === 'finished').length
  const inProgressCount = byDuty.filter((p) => p.status === 'in_progress').length
  const byType = typeFilter === 'all' ? byDuty : byDuty.filter((p) => p.status === typeFilter)
  const bookable = new Set(offers.data?.map((offer) => offer.login) ?? [])
  const byPreReview = onlyPreReview ? byType.filter((p) => p.preReview) : byType
  const filtered = onlyBookable ? byPreReview.filter((p) => bookable.has(p.login)) : byPreReview
  const preReviewers = peers.filter((p) => p.preReview).length
  const bookableCount = peers.filter((p) => bookable.has(p.login)).length
  // Con algún filtro puesto, el mapa resalta a quien queda en la lista.
  const filtering = typeFilter !== 'all' || onlyOnDuty || onlyPreReview || onlyBookable
  const spotlight = filtering ? new Set(filtered.map((peer) => peer.login)) : null

  const inProgressOnDuty = peers.filter((p) => onDuty(p) && p.status === 'in_progress')
  const openGroups = groups.data?.length ?? 0

  return (
    <section>
      {title}
      {onDutyCount > 0 ? (
        <p className="count">
          {t('peers.onDuty', { n: onDutyCount })}
          {onDutySpecialists > 0 && (
            <>
              {' '}
              (
              {onDutySpecialists === 1
                ? t('peers.specialists1')
                : t('peers.specialistsN', { n: onDutySpecialists })}
              )
            </>
          )}
        </p>
      ) : (
        <p className="count">{t('peers.nobodyOnDuty')}</p>
      )}
      {peers.length > 0 && (
        <p className="total">
          {total !== null && total > peers.length
            ? t('peers.totalOf', { shown: peers.length, total })
            : peers.length === 1
              ? t('peers.total1')
              : t('peers.totalN', { n: peers.length })}
        </p>
      )}
      {partial && (
        <p className="total aviso" role="status">
          {t('peers.partial')}
        </p>
      )}
      {peers.length === 0 && <p>{t('peers.nobody')}</p>}
      <ProjectMap projectId={project.id} spotlight={spotlight} />
      <div className="filters">
        <Show from="normal">
          <div className="filter-pills">
            {(
              [
                ['all', t('peers.all', { n: byDuty.length })],
                ['finished', t('peers.specialists', { n: specialistsCount })],
                ['in_progress', t('peers.patients', { n: inProgressCount })],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={`pill ${typeFilter === value ? 'active' : ''}`}
                aria-pressed={typeFilter === value}
                onClick={() => {
                  setTypeFilter(value)
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Show>
        <label className="duty-check">
          <input
            type="checkbox"
            checked={onlyOnDuty}
            onChange={(event) => {
              setOnlyOnDuty(event.target.checked)
            }}
          />
          {t('peers.onlyOnDuty')}
        </label>
        {preReviewers > 0 && (
          <Show from="normal">
            <label className="duty-check" title={t('peers.preReview.hint')}>
              <input
                type="checkbox"
                checked={onlyPreReview}
                onChange={(event) => {
                  setOnlyPreReview(event.target.checked)
                }}
              />
              {t('peers.preReview.only', { n: preReviewers })}
            </label>
          </Show>
        )}
        {bookableCount > 0 && (
          <label className="duty-check">
            <input
              type="checkbox"
              checked={onlyBookable}
              onChange={(event) => {
                setOnlyBookable(event.target.checked)
              }}
            />
            {t('peers.onlyBookable', { n: bookableCount })}
          </label>
        )}
      </div>
      {filtered.length === 0 && peers.length > 0 && <p>{t('peers.noneFilter')}</p>}
      {(openGroups > 0 || inProgressOnDuty.length >= 2) && (
        <div className="group-therapy">
          <p>
            {openGroups > 0
              ? openGroups === 1
                ? t('peers.groupOpen1')
                : t('peers.groupOpen', { n: openGroups })
              : t('peers.groupHint', { n: inProgressOnDuty.length })}
          </p>
          <button className="pill active" onClick={onOpenTherapy}>
            {t('peers.groupGo')}
          </button>
        </div>
      )}
      <ul className="peer-list">
        {filtered.map((peer) => {
          const offer = offers.data?.find((entry) => entry.login === peer.login)
          const crossed = network.data?.partners.find((entry) => entry.login === peer.login)
          // Sin ninguna corrección tuya copiada no se puede decir que alguien sea nuevo.
          const known = (network.data?.partners.length ?? 0) > 0

          return (
            <li
              key={peer.login}
              className={`peer-card compact ${offer === undefined ? '' : 'bookable'}`}
            >
              <Avatar login={peer.login} image={peer.image} size={52} />
              <div className="peer-main">
                <span className="peer-name">
                  <a className="record-link" href={recordHref(peer.login)}>
                    <strong>{peer.login}</strong>
                  </a>
                  {onDuty(peer) ? (
                    <span className="badge on">{t('peers.badgeOn')}</span>
                  ) : (
                    <span className="badge off">{t('peers.badgeOff')}</span>
                  )}
                </span>
                <span className="peer-where">
                  {peer.location !== null
                    ? t('peers.attendsAt', { location: peer.location })
                    : t('peers.away')}
                </span>
                <span className="peer-badges">
                  {peer.perfect ? (
                    <span className="badge eminence" title={t('peers.eminenceHint')}>
                      {t('peers.eminence')}
                    </span>
                  ) : peer.status === 'finished' ? (
                    <span className="badge specialist">{t('peers.specialist')}</span>
                  ) : (
                    <span className="badge subtle">{t('peers.patient')}</span>
                  )}
                  {peer.preReview && (
                    <span
                      className="badge on plain pre-review-badge"
                      title={t('peers.preReview.hint')}
                    >
                      <Icon name="preevaluar" size={14} /> {t('peers.preReview')}
                    </span>
                  )}
                </span>
                <Show from="datos">
                  {crossed !== undefined ? (
                    <small className="peer-crossed">
                      {t('peers.crossed', { gave: crossed.gave, got: crossed.got })}
                    </small>
                  ) : (
                    known && <small className="peer-crossed new">{t('peers.neverCrossed')}</small>
                  )}
                </Show>
              </div>
              {offer !== undefined && booking === peer.login ? (
                <BookHelp
                  offer={offer}
                  projectId={project.id}
                  onClose={() => {
                    setBooking(null)
                  }}
                  onBooked={() => void offers.reload()}
                />
              ) : (
                <div className="peer-actions">
                  {offer !== undefined && (
                    <button
                      className="primary small"
                      onClick={() => {
                        setBooking(peer.login)
                      }}
                    >
                      <Icon name="chat" size={14} /> {t('help.ask')}
                    </button>
                  )}
                  <a
                    className="profile-link"
                    href={intraHref(peer.login)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('peers.profile')}
                  </a>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
