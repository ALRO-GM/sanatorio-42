import { useState } from 'react'

import type { PiscineProgress } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { InfoTip } from '../../shared/ui/InfoTip'
import { PersonInput } from '../../shared/ui/PersonInput'
import { PoolOnly } from '../../shared/ui/PoolOnly'
import { PiscineProgressChart } from './PiscineProgressChart'
import type { Line, PiscineShown } from './PiscineProgressChart'
import { PiscineTop, useTopLines } from './PiscineTop'
import { MAX_OTHERS, PERSON_COLORS } from './progressSeries'

/**
 * El Avance de un piscinero (`docs/piscineros.md`), en vez del del common
 * core: cuántos de los dieciséis proyectos que cuentan (Shell 00 … C 13) lleva
 * aprobados cada día de piscina, con la media de su piscina (nada de otras
 * piscinas) y hasta cinco piscineros con quien compararse. Los
 * rushes, BSQ y exámenes no suman. Sin pace, plan, black hole ni horas: en la
 * piscina no hay nada de eso.
 *
 * Como toda gráfica con opciones: la gráfica a la izquierda y las opciones en
 * un panel a la derecha; en el móvil, la gráfica primero.
 */
export function PiscineProgressPage({ me }: { me: string }) {
  const { t, tn } = useI18n()
  const [others, setOthers] = useState<string[]>([])
  const [shown, setShown] = useState<PiscineShown>({ cohort: true })
  const [typed, setTyped] = useState('')
  const fetched = useAsync(() => api.getPiscineProgress(others), [others.join(',')])
  // Mientras llega lo nuevo (otra persona), se queda lo de antes: la gráfica no se vacía.
  const [kept, setKept] = useState<PiscineProgress | undefined>(undefined)

  if (fetched.data !== undefined && fetched.data !== kept) setKept(fetched.data)
  const data = fetched.data ?? kept
  const full = others.length >= MAX_OTHERS
  const add = (raw: string): void => {
    const login = raw.trim().toLowerCase()

    if (login !== '' && login !== me && !others.includes(login) && !full) {
      setOthers([...others, login])
    }
    setTyped('')
  }
  const missing =
    data === undefined ? [] : others.filter((login) => !data.others.some((o) => o.login === login))
  // La vista sin límites del dueño: los más avanzados, la media de los mejores
  // y quien cae entre dos percentiles (`docs/piscineros.md`).
  const top = useTopLines(data)
  const extra: Line[] = top?.lines ?? []
  const toggle = (key: keyof PiscineShown) => (
    <label className="progress-toggle">
      <input
        type="checkbox"
        checked={shown[key]}
        onChange={(event) => {
          setShown({ ...shown, [key]: event.target.checked })
        }}
      />{' '}
      {t(`piscine.chart.${key}`)}
      {data !== undefined && ` · ${tn('piscine.chart.people', data[key].people)}`}
    </label>
  )

  return (
    <section className="progress-page" aria-labelledby="stats-progress">
      <div className="section-head">
        <h2 id="stats-progress">
          {t('stats.progress.title')}
          <InfoTip title={t('stats.progress.title')}>
            <p>{t('piscine.chart.info')}</p>
          </InfoTip>
        </h2>
      </div>
      <div className="progress-layout">
        <article className="card progress-card">
          {data === undefined ? (
            <ErrorNote error={fetched.error} onRetry={() => void fetched.reload()} />
          ) : (
            <>
              <p className="piscine-summary">
                {t('piscine.done', { done: data.me?.done ?? 0, total: data.steps.length })}
              </p>
              <PiscineProgressChart data={data} shown={shown} others={others} extra={extra} />
            </>
          )}
        </article>
        <aside className="card progress-rail" aria-label={t('stats.progress.options')}>
          <div className="progress-option">
            <span className="eyebrow">{t('piscine.chart.compareWith')}</span>
            {toggle('cohort')}
          </div>
          {top?.options}
          <PoolOnly k="avance.compare">
            <div className="progress-option">
              <form
                className="progress-compare-row"
                onSubmit={(event) => {
                  event.preventDefault()
                  add(typed)
                }}
              >
                <PersonInput
                  value={typed}
                  label={t('stats.progress.compare')}
                  placeholder={t('stats.progress.comparePlaceholder')}
                  exclude={[...others, me]}
                  onChange={setTyped}
                  onPick={add}
                />
                <button type="submit" className="pill" disabled={full || typed.trim() === ''}>
                  {t('stats.progress.compareAdd')}
                </button>
              </form>
              <ul className="progress-chips">
                {others.map((login, index) => (
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
                        setOthers(others.filter((each) => each !== login))
                      }}
                    >
                      <Icon name="cerrar" size={12} />
                    </button>
                  </li>
                ))}
              </ul>
              {missing.map((login) => (
                <p key={login} className="hint">
                  {t('piscine.chart.noOther', { login })}
                </p>
              ))}
            </div>
          </PoolOnly>
        </aside>
      </div>
      {top !== null && data !== undefined && (
        <PiscineTop ranked={top.ranked} total={data.steps.length} />
      )}
    </section>
  )
}
