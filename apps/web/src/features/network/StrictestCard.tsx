import { useEffect, useState } from 'react'

import { api } from '../../shared/api'
import type { NetworkParams } from '../../shared/api/types'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { passColor } from './colors'
import { RankCard } from './RankCard'
import type { Order } from './RankCard'

type StrictestCardProps = {
  /** Filtros de fecha y proyecto del grafo: el ranking mira lo mismo. */
  params: NetworkParams
  onSelect: (login: string) => void
}

/** Mínimos de evaluaciones que se pueden elegir con el deslizador. */
const MIN_STEPS = [3, 5, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200] as const

/** Posición inicial del deslizador: 20 evaluaciones. */
const DEFAULT_STEP = 4

/** Espera tras soltar el deslizador antes de preguntar a la API. */
const DEBOUNCE_MS = 250

/**
 * Los más estrictos: quién suspende más de lo que evalúa.
 *
 * El deslizador fija cuántos proyectos hay que haber evaluado para entrar: con
 * pocos, cualquiera sale arriba por un par de suspensos; con muchos, quedan
 * quienes de verdad corrigen a menudo.
 */
export function StrictestCard({ params, onSelect }: StrictestCardProps) {
  const { t } = useI18n()
  const [step, setStep] = useState(DEFAULT_STEP)
  const [min, setMin] = useState<number>(MIN_STEPS[DEFAULT_STEP])
  // El orden lo aplica la API: de 1.300 personas solo vienen cien, las de un extremo.
  const [order, setOrder] = useState<Order>('desc')
  const wanted = MIN_STEPS[step] ?? MIN_STEPS[DEFAULT_STEP]

  // Mientras se arrastra se ve el número; la petición sale al parar.
  useEffect(() => {
    const timer = setTimeout(() => {
      setMin(wanted)
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [wanted])

  const { from, to, projectId, campuses } = params
  const { data, error, loading, reload } = useAsync(
    () =>
      api.getNetworkStrictest(min, order, {
        ...(from === undefined ? {} : { from }),
        ...(to === undefined ? {} : { to }),
        ...(projectId === undefined ? {} : { projectId }),
        ...(campuses === undefined ? {} : { campuses }),
      }),
    [min, order, from, to, projectId, campuses],
  )

  return (
    <RankCard
      id="strictest"
      title={t('net.strict.title')}
      order={order}
      onOrder={setOrder}
      count={data?.eligible ?? null}
      controls={
        <label className="net-strict-min">
          {t('net.strict.min', { n: wanted })}
          <input
            type="range"
            min={0}
            max={MIN_STEPS.length - 1}
            value={step}
            onChange={(event) => {
              setStep(Number(event.target.value))
            }}
          />
        </label>
      }
      footer={
        <>
          {loading && <p className="hint">{t('net.loading')}</p>}
          {!loading && data === undefined && (
            <ErrorNote error={error} onRetry={() => void reload()} />
          )}
          {data !== undefined && (
            <p className="hint">
              {data.people.length === 0
                ? t('net.strict.empty', { n: data.min })
                : t('net.strict.hint', {
                    shown: data.people.length,
                    eligible: data.eligible,
                    campus: Math.round(data.campusFailRate * 100),
                  })}
            </p>
          )}
        </>
      }
    >
      {(data?.people ?? []).map((person) => (
        <li key={person.login}>
          <button
            type="button"
            onClick={() => {
              onSelect(person.login)
            }}
          >
            <Avatar login={person.login} image={person.image} size={22} />
            <span className="net-row-name">{person.login}</span>
            <span className="net-row-count">
              {t('net.strict.of', { failed: person.failed, judged: person.judged })}
              <span
                className="net-row-badge"
                style={{ background: passColor(1 - person.failRate) }}
              >
                {Math.round(person.failRate * 100)} %
              </span>
            </span>
          </button>
        </li>
      ))}
    </RankCard>
  )
}
