import type { ReactNode } from 'react'

import { useI18n } from '../../shared/i18n'

/**
 * Piezas comunes de las dos tarjetas de límites del panel (presupuesto de
 * Oracle y cuota de 42): las cifras en baldosas, los campos numéricos y los
 * botones de guardar y del modo ahorro.
 */

/** Una cifra con su nombre arriba y una aclaración debajo. */
export function Tile({ label, value, hint }: { label: string; value: ReactNode; hint: ReactNode }) {
  return (
    <div className="tile">
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  )
}

/** Un número del formulario, escrito como texto (como lo da un `<input>`). */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          onChange(event.target.value)
        }}
      />
    </label>
  )
}

/** Guardar los topes y encender o apagar el modo ahorro. */
export function LimitActions({
  busy,
  saving,
  onToggleSaving,
}: {
  busy: boolean
  saving: boolean
  onToggleSaving: () => void
}) {
  const { t } = useI18n()

  return (
    <div className="actions">
      <button type="submit" className="primary small" disabled={busy}>
        {t('admin.budget.save')}
      </button>
      <button
        type="button"
        className={`small ${saving ? 'primary' : ''}`}
        aria-pressed={saving}
        disabled={busy}
        onClick={onToggleSaving}
      >
        {t(saving ? 'admin.budget.savingOff' : 'admin.budget.savingOn')}
      </button>
    </div>
  )
}
