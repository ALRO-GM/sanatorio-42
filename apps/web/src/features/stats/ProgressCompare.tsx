import { useState } from 'react'

import type { CoreTrack, FastestEntry, ProgressScope } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { PersonInput } from '../../shared/ui/PersonInput'
import { MAX_OTHERS, PERSON_COLORS, SCOPES, TRACKS } from './progressSeries'

/** Días en un mes, como en el eje de la gráfica (dos años en 24 marcas). */
const MONTH = 730 / 24

/**
 * Con quién te comparas en el Avance: se añade a la gente de una en una (hasta
 * `MAX_OTHERS`), cada cual con su color y una pastilla con su × para quitarla.
 * Sin nadie en mente, «Los más rápidos» sugiere a quien terminó antes.
 */
export function ProgressCompare(props: {
  others: readonly string[]
  onChange: (others: string[]) => void
  /** Logins con quien se compara que no tienen datos (o no se ven). */
  missing: readonly string[]
  /** Los planes y alcances encendidos en la gráfica: las sugerencias, de esos. */
  tracks: ReadonlySet<CoreTrack>
  scopes: ReadonlySet<ProgressScope>
  me: string
  /** El nombre de tu campus, para rotular sus sugerencias. */
  campus: string | null
}) {
  const { t } = useI18n()
  const [typed, setTyped] = useState('')
  const [open, setOpen] = useState(false)
  const full = props.others.length >= MAX_OTHERS
  const add = (logins: readonly string[]): void => {
    const next = [...props.others]

    for (const raw of logins) {
      const login = raw.trim().toLowerCase()

      if (login === '' || login === props.me || next.includes(login)) continue
      if (next.length >= MAX_OTHERS) break
      next.push(login)
    }
    props.onChange(next)
    setTyped('')
  }

  return (
    <div className="progress-compare">
      <form
        className="progress-compare-row"
        onSubmit={(event) => {
          event.preventDefault()
          add([typed])
        }}
      >
        <PersonInput
          value={typed}
          label={t('stats.progress.compare')}
          placeholder={t('stats.progress.comparePlaceholder')}
          exclude={[...props.others, props.me]}
          onChange={setTyped}
          onPick={(login) => {
            add([login])
          }}
        />
        <button type="submit" className="pill" disabled={full || typed.trim() === ''}>
          {t('stats.progress.compareAdd')}
        </button>
        <button
          type="button"
          className={`pill ${open ? 'active' : ''}`.trim()}
          aria-expanded={open}
          onClick={() => {
            setOpen(!open)
          }}
        >
          {t('stats.progress.fastest')}
        </button>
      </form>
      {props.others.length > 0 && (
        <ul className="progress-chips">
          {props.others.map((login, index) => (
            <li key={login} className="progress-chip">
              <i
                className="progress-chip-dot"
                style={{ background: PERSON_COLORS[index % PERSON_COLORS.length] }}
              />
              {login}
              <button
                type="button"
                aria-label={t('stats.progress.compareRemove', { login })}
                onClick={() => {
                  props.onChange(props.others.filter((each) => each !== login))
                }}
              >
                <Icon name="cerrar" size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {full && <p className="hint">{t('stats.progress.compareFull', { n: MAX_OTHERS })}</p>}
      {props.missing.map((login) => (
        <p key={login} className="hint">
          {t('stats.progress.noOther', { login })}
        </p>
      ))}
      {open && (
        <Fastest
          tracks={props.tracks}
          scopes={props.scopes}
          campus={props.campus}
          others={props.others}
          full={full}
          onAdd={add}
        />
      )}
    </div>
  )
}

/** Las sugerencias: quien terminó antes, por plan y alcance encendidos. */
function Fastest(props: {
  tracks: ReadonlySet<CoreTrack>
  scopes: ReadonlySet<ProgressScope>
  campus: string | null
  others: readonly string[]
  full: boolean
  onAdd: (logins: readonly string[]) => void
}) {
  const { t } = useI18n()
  const { number } = useFormat()
  const { data, error, reload } = useAsync(() => api.getStatsFastest(), [])

  if (data === undefined) return <ErrorNote error={error} onRetry={() => void reload()} />

  // Sin plan o alcance encendido, se sugiere de todos: mejor algo que nada.
  const tracks = TRACKS.filter((track) => props.tracks.size === 0 || props.tracks.has(track))
  const scopes = SCOPES.filter((scope) => props.scopes.size === 0 || props.scopes.has(scope))
  const months = (entry: FastestEntry): string => number(Math.round((entry.days / MONTH) * 10) / 10)

  return (
    <div className="progress-fastest" role="region" aria-label={t('stats.progress.fastest')}>
      <p className="hint">{t('stats.progress.fastest.hint')}</p>
      {tracks.flatMap((track) =>
        scopes.map((scope) => {
          const list = data[scope][track]
          const plan = t(`stats.progress.plan.${track}`)
          const title =
            scope === 'campus'
              ? t('stats.progress.fastest.campus', {
                  plan,
                  campus: props.campus ?? t('stats.progress.scope.campus'),
                })
              : t('stats.progress.fastest.all', { plan })
          const fresh = list.filter((entry) => !props.others.includes(entry.login))

          return (
            <section key={`${track}-${scope}`} aria-label={title}>
              <h4>{title}</h4>
              {list.length === 0 ? (
                <p className="hint">{t('stats.progress.fastest.none')}</p>
              ) : (
                <div className="progress-fastest-list">
                  {list.map((entry) => (
                    <button
                      key={entry.login}
                      type="button"
                      className="pill"
                      disabled={props.full || props.others.includes(entry.login)}
                      onClick={() => {
                        props.onAdd([entry.login])
                      }}
                    >
                      {scope === 'all' && entry.campus !== null
                        ? t('stats.progress.fastest.entryCampus', {
                            login: entry.login,
                            campus: entry.campus,
                            months: months(entry),
                          })
                        : t('stats.progress.fastest.entry', {
                            login: entry.login,
                            months: months(entry),
                          })}
                    </button>
                  ))}
                  {fresh.length > 1 && (
                    <button
                      type="button"
                      className="pill"
                      disabled={props.full}
                      onClick={() => {
                        props.onAdd(fresh.map((entry) => entry.login))
                      }}
                    >
                      {t('stats.progress.fastest.addAll')}
                    </button>
                  )}
                </div>
              )}
            </section>
          )
        }),
      )}
    </div>
  )
}
