import type { ReactNode } from 'react'

type ChartWithRailProps = {
  /** La gráfica: a la izquierda y quieta a la vista mientras se baja. */
  chart: ReactNode
  /** Nombre del panel de opciones para quien no lo ve («Opciones del Avance»). */
  railLabel: string
  /** Las opciones, de arriba abajo (`StepPicker`, pastillas, desplegables). */
  children: ReactNode
  /**
   * `false` si todo va ya dentro de una tarjeta: la gráfica no lleva la suya,
   * que dentro de una tarjeta no va otra tarjeta con borde.
   */
  framed?: boolean
}

/**
 * Una gráfica con su panel de opciones a la derecha, como manda la regla de
 * `docs/interfaz.md` («Gráficas con opciones»); en el móvil, la gráfica primero
 * y las opciones debajo. Las clases (`progress-layout`, `progress-card`,
 * `progress-rail`) son las de `styles/stats.css`, que ya daban esa forma al
 * Avance, al Avance de la piscina y al uso de la API.
 */
export function ChartWithRail({ chart, railLabel, children, framed = true }: ChartWithRailProps) {
  return (
    <div className="progress-layout">
      {framed ? (
        <article className="card progress-card">{chart}</article>
      ) : (
        <div className="progress-card">{chart}</div>
      )}
      <aside className="card progress-rail" aria-label={railLabel}>
        {children}
      </aside>
    </div>
  )
}
