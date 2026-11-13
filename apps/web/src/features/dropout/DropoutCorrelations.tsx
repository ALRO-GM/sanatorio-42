import { useState } from 'react'

import type { DropoutFactorKey, DropoutReport } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { ChartWithRail } from '../../shared/ui/ChartWithRail'
import { correlationOf } from './dropout'
import { ScatterChart } from './DropoutCharts'

/** Lo fuerte que es una relación, para el color de la celda (0–100). */
const strength = (r: number): string =>
  Math.abs(r) >= 60 ? 'strong' : Math.abs(r) >= 30 ? 'medium' : 'weak'

/**
 * La tabla que relaciona todos los factores entre sí, de 0 a 100 (la fuerza,
 * con ↑ si suben a la vez y ↓ si uno baja cuando el otro sube). Pulsar una
 * celda, o elegir los dos factores, dibuja su dispersión. Los factores de la
 * tabla se pueden quitar y poner.
 */
export function DropoutCorrelations({ report }: { report: DropoutReport }) {
  const { t } = useI18n()
  const [shown, setShown] = useState<DropoutFactorKey[]>(report.factors)
  const [x, setX] = useState<DropoutFactorKey>('totalHours')
  const [y, setY] = useState<DropoutFactorKey>('gone')
  const visible = report.factors.filter((key) => shown.includes(key))
  const sample = report.people.filter((person) => person.status !== 'never')
  const name = (key: DropoutFactorKey): string => t(`dropout.factor.${key}`)
  const cell = (r: number): string => `${Math.abs(r)}${r > 0 ? '↑' : r < 0 ? '↓' : ''}`
  const select = (
    value: DropoutFactorKey,
    set: (next: DropoutFactorKey) => void,
    label: string,
  ) => (
    <label className="dropout-select">
      <span className="eyebrow">{label}</span>
      <select
        value={value}
        onChange={(event) => {
          set(event.target.value as DropoutFactorKey)
        }}
      >
        {report.factors.map((key) => (
          <option key={key} value={key}>
            {name(key)}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <section className="card dropout-block" aria-labelledby="dropout-correlations">
      <h3 id="dropout-correlations">{t('dropout.correlations.title')}</h3>
      <p className="hint">{t('dropout.correlations.hint', { people: report.sample })}</p>
      <div className="table-scroll" tabIndex={0}>
        <table className="stat-table dropout-matrix">
          <caption className="sr-only">{t('dropout.correlations.title')}</caption>
          <thead>
            <tr>
              <td />
              {visible.map((key) => (
                <th key={key} scope="col">
                  {name(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((a) => (
              <tr key={a}>
                <th scope="row">{name(a)}</th>
                {visible.map((b) => {
                  const r = correlationOf(report, a, b)

                  return (
                    <td
                      key={b}
                      className={`dropout-cell ${a === b ? 'self' : strength(r)} ${r < 0 ? 'down' : 'up'}`}
                    >
                      {a === b ? (
                        '—'
                      ) : (
                        <button
                          type="button"
                          aria-pressed={x === a && y === b}
                          aria-label={t('dropout.correlations.cell', {
                            a: name(a),
                            b: name(b),
                            r: cell(r),
                          })}
                          onClick={() => {
                            setX(a)
                            setY(b)
                          }}
                        >
                          {cell(r)}
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ChartWithRail
        railLabel={t('dropout.correlations.options')}
        chart={<ScatterChart people={sample} x={x} y={y} r={correlationOf(report, x, y)} />}
      >
        <div className="progress-option">
          {select(x, setX, t('dropout.scatter.x'))}
          {select(y, setY, t('dropout.scatter.yPick'))}
          <p className="hint">
            {t('dropout.scatter.reading', { r: cell(correlationOf(report, x, y)) })}
          </p>
        </div>
        <fieldset className="progress-option">
          <legend className="eyebrow">{t('dropout.correlations.factors')}</legend>
          {report.factors.map((key) => (
            <label key={key} className="progress-toggle">
              <input
                type="checkbox"
                checked={shown.includes(key)}
                onChange={(event) => {
                  setShown(
                    event.target.checked ? [...shown, key] : shown.filter((each) => each !== key),
                  )
                }}
              />{' '}
              {name(key)}
            </label>
          ))}
        </fieldset>
      </ChartWithRail>
    </section>
  )
}

/**
 * Factores comunes: parejas de factores que, juntos, se relacionan con el
 * abandono más (o menos) que cada uno por separado, y los grupos de factores
 * que van juntos.
 */
export function DropoutFactorsPanel({ report }: { report: DropoutReport }) {
  const { t } = useI18n()
  const name = (key: DropoutFactorKey): string => t(`dropout.factor.${key}`)
  const signed = (r: number): string => `${r > 0 ? '+' : ''}${r}`

  return (
    <section className="card dropout-block" aria-labelledby="dropout-factors">
      <h3 id="dropout-factors">{t('dropout.factors.title')}</h3>
      <p className="hint">{t('dropout.factors.hint')}</p>
      {report.groups.length > 0 && (
        <>
          <h4>{t('dropout.factors.groups')}</h4>
          <ul className="dropout-groups">
            {report.groups.map((group) => (
              <li key={group.factors.join('-')}>
                {t('dropout.factors.group', {
                  factors: group.factors.map(name).join(' + '),
                  r: signed(group.together),
                })}
              </li>
            ))}
          </ul>
        </>
      )}
      <h4>{t('dropout.factors.pairs')}</h4>
      <div className="table-scroll" tabIndex={0}>
        <table className="stat-table">
          <thead>
            <tr>
              <th scope="col">{t('dropout.factors.pair')}</th>
              <th scope="col">{t('dropout.factors.between')}</th>
              <th scope="col">{t('dropout.factors.alone')}</th>
              <th scope="col">{t('dropout.factors.together')}</th>
              <th scope="col">{t('dropout.factors.gain')}</th>
            </tr>
          </thead>
          <tbody>
            {report.pairs.slice(0, 12).map((pair) => (
              <tr key={`${pair.a}-${pair.b}`}>
                <th scope="row">
                  {name(pair.a)} + {name(pair.b)}
                </th>
                <td>{signed(pair.between)}</td>
                <td>
                  {signed(pair.ra)} · {signed(pair.rb)}
                </td>
                <td>
                  <b>{signed(pair.together)}</b>
                </td>
                <td className={pair.gain > 0 ? 'dropout-gain' : ''}>{signed(pair.gain)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
