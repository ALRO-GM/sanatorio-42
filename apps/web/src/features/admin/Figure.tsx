import { useFormat } from '../../shared/i18n/useFormat'

/** Una cifra del panel en su tarjeta: el nombre arriba y el número grande. */
export function Figure({
  label,
  value,
  strong = false,
}: {
  label: string
  /** Un número se escribe a la manera del idioma (`1.234`, `1,234`, `1 234`). */
  value: string | number
  strong?: boolean
}) {
  const { number } = useFormat()

  return (
    <div className={`stat-card ${strong ? 'strong' : ''}`}>
      <span className="eyebrow">{label}</span>
      <strong>{typeof value === 'number' ? number(value) : value}</strong>
    </div>
  )
}
