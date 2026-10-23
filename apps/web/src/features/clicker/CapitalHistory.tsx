import { useState } from 'react'

import type { Lang } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { CapitalChart } from './CapitalChart'

const DAY_S = 86_400
/** Los tramos de un toque: cuántos días hacia atrás, o `null` para todo. */
const SPANS = [
  ['today', 1],
  ['week', 7],
  ['month', 30],
  ['all', null],
] as const

/** `YYYY-MM-DD` de un segundo, en la hora de quien mira: es lo que entiende `<input type="date">`. */
function dayOf(second: number): string {
  const date = new Date(second * 1000)
  const two = (value: number): string => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`
}

/** El segundo en que empieza (o acaba) un día de `<input type="date">`. */
const secondOf = (day: string, end: boolean): number =>
  Math.floor(new Date(`${day}T${end ? '23:59:59' : '00:00:00'}`).getTime() / 1000)

/**
 * El historial de capital con sus mandos: un tramo de un toque (hoy, la semana,
 * el mes, todo), dos fechas a mano, o arrastrar sobre la gráfica para acercarse.
 *
 * Cada tramo se pide a la API, que lo devuelve con el detalle que guarda de esas
 * fechas: lo de hoy, cada diez segundos; lo de la semana, cada hora; lo
 * anterior, cada día.
 *
 * @param login De quién, si lo mira quien administra; sin él, el propio.
 * @param live El capital de ahora mismo: se añade al final si el tramo llega a hoy.
 */
export function CapitalHistory({
  login,
  lang,
  label,
  live,
}: {
  login?: string
  lang: Lang
  label: string
  live?: number
}) {
  const { t } = useI18n()
  // El tramo que se mira; `null` es sin tope por ese lado.
  const [range, setRange] = useState<{ from: number | null; to: number | null }>({
    from: null,
    to: null,
  })
  const { data, error, reload } = useAsync(
    () =>
      api.getClickerCapital({
        ...(login === undefined ? {} : { login }),
        ...(range.from === null ? {} : { from: range.from }),
        ...(range.to === null ? {} : { to: range.to }),
      }),
    [login, range.from, range.to],
  )
  const now = Math.floor(Date.now() / 1000)
  const points: [number, number][] = [
    ...(data?.points ?? []),
    ...(live !== undefined && range.to === null ? [[now, live] as [number, number]] : []),
  ]
  const first = data?.first ?? now
  // El tramo de un toque que está puesto, si es alguno.
  const preset = SPANS.find(
    ([, days]) =>
      range.to === null &&
      (days === null
        ? range.from === null
        : range.from !== null && Math.abs(range.from - (now - days * DAY_S)) < 120),
  )?.[0]

  return (
    <div className="cc-history">
      <div className="cc-history-controls">
        <PillGroup
          options={SPANS.map(([id]) => id)}
          value={preset ?? null}
          onChange={(id) => {
            const days = SPANS.find(([one]) => one === id)?.[1] ?? null

            setRange({ from: days === null ? null : now - days * DAY_S, to: null })
          }}
          label={t('clicker.chart.span')}
          text={(id) => t(`clicker.chart.${id}`)}
        />
        <label>
          {t('clicker.chart.from')}
          <input
            type="date"
            value={dayOf(range.from ?? first)}
            min={dayOf(first)}
            max={dayOf(range.to ?? now)}
            onChange={(event) => {
              if (event.target.value === '') return

              const from = secondOf(event.target.value, false)

              // Un «desde» posterior al «hasta» deja el tramo abierto hasta hoy.
              setRange({ from, to: range.to !== null && range.to < from ? null : range.to })
            }}
          />
        </label>
        <label>
          {t('clicker.chart.to')}
          <input
            type="date"
            value={dayOf(range.to ?? now)}
            min={dayOf(range.from ?? first)}
            max={dayOf(now)}
            onChange={(event) => {
              if (event.target.value === '') return

              const to = secondOf(event.target.value, true)

              // Hasta hoy es "hasta ahora": así la gráfica sigue viva.
              setRange({
                from: range.from !== null && range.from > to ? null : range.from,
                to: to >= now ? null : to,
              })
            }}
          />
        </label>
      </div>
      <ErrorNote error={error} onRetry={() => void reload()} />
      {points.length < 2 ? (
        <p className="cc-chart-empty">{t('clicker.chart.empty')}</p>
      ) : (
        <CapitalChart
          points={points}
          lang={lang}
          label={label}
          onSelect={(from, to) => {
            setRange({ from, to: to >= now - 60 ? null : to })
          }}
        />
      )}
      <p className="cc-chart-hint">{t('clicker.chart.hint')}</p>
    </div>
  )
}
