import type { DropoutTuning, DropoutWeightKey } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { PARAM_RANGES, PARAMS, WEIGHT_KEYS, WEIGHT_RANGE } from './dropout'
import type { DropoutParam } from './dropout'

/** Un número con los decimales justos para el paso de su deslizador. */
const shown = (value: number, step: number): string =>
  step >= 1 ? String(Math.round(value)) : value.toFixed(step < 0.1 ? 2 : 1)

/**
 * Ajustar el cálculo del abandono a mano (pedido por Alberto el 2026-11-06):
 * cada parámetro y el peso de cada factor con su deslizador, su valor a la
 * vista y una frase de qué hace. Lo que se mueve se pide de nuevo a la API al
 * dejar de moverlo y todo lo de la pestaña se reorganiza.
 */
export function DropoutTuningPanel({
  tuning,
  defaults,
  updating,
  onChange,
}: {
  tuning: DropoutTuning
  defaults: DropoutTuning
  /** Si se está pidiendo el cálculo con lo último que se ha movido. */
  updating: boolean
  onChange: (next: DropoutTuning) => void
}) {
  const { t } = useI18n()
  const changed = JSON.stringify(tuning) !== JSON.stringify(defaults)
  const slider = (
    id: string,
    label: string,
    hint: string,
    value: number,
    range: { min: number; max: number; step: number },
    set: (next: number) => void,
  ) => (
    <div className="dropout-tune" key={id}>
      <label htmlFor={`dropout-tune-${id}`}>
        <span>{label}</span>
        <output htmlFor={`dropout-tune-${id}`}>{shown(value, range.step)}</output>
      </label>
      <input
        id={`dropout-tune-${id}`}
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(event) => {
          set(Number(event.target.value))
        }}
      />
      <p className="hint">{hint}</p>
    </div>
  )
  const param = (key: DropoutParam) =>
    slider(
      key,
      t(`dropout.tuning.${key}`),
      t(`dropout.tuning.${key}.hint`),
      tuning[key],
      PARAM_RANGES[key],
      (next) => {
        onChange({ ...tuning, [key]: next })
      },
    )
  const weight = (key: DropoutWeightKey) =>
    slider(
      `w-${key}`,
      t(`dropout.factor.${key}`),
      t('dropout.tuning.weightHint', { factor: t(`dropout.factor.${key}`) }),
      tuning.weights[key],
      WEIGHT_RANGE,
      (next) => {
        onChange({ ...tuning, weights: { ...tuning.weights, [key]: next } })
      },
    )

  return (
    <details className="card dropout-block dropout-tuning">
      <summary>
        <h3>{t('dropout.tuning.title')}</h3>
        {changed && <span className="dropout-tuned">{t('dropout.tuning.changed')}</span>}
        {updating && (
          <span className="hint" role="status">
            {t('dropout.tuning.updating')}
          </span>
        )}
      </summary>
      <p className="hint">{t('dropout.tuning.hint')}</p>
      <div className="dropout-tune-grid">
        <fieldset>
          <legend className="eyebrow">{t('dropout.tuning.days')}</legend>
          {PARAMS.map(param)}
          <label className="progress-toggle">
            <input
              type="checkbox"
              checked={tuning.fridayToMonday}
              onChange={(event) => {
                onChange({ ...tuning, fridayToMonday: event.target.checked })
              }}
            />{' '}
            {t('dropout.tuning.fridayToMonday')}
          </label>
          <p className="hint">{t('dropout.tuning.fridayToMonday.hint')}</p>
        </fieldset>
        <fieldset>
          <legend className="eyebrow">{t('dropout.tuning.weights')}</legend>
          <p className="hint">{t('dropout.tuning.weightsHint')}</p>
          {WEIGHT_KEYS.map(weight)}
        </fieldset>
      </div>
      <button
        type="button"
        className="pill"
        disabled={!changed}
        onClick={() => {
          onChange(defaults)
        }}
      >
        {t('dropout.tuning.reset')}
      </button>
    </details>
  )
}
