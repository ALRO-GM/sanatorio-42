/**
 * Modo mantenimiento (`docs/mantenimiento.md`): quien administra cierra la web
 * a todo el mundo menos a quien administra, con un mensaje y, si quiere, la
 * hora a la que acabará (la web enseña una cuenta atrás).
 */

/** El mantenimiento como está ahora. */
export type Maintenance = {
  on: boolean
  /** Lo que se enseña además del texto de siempre; `null` sin mensaje. */
  message: string | null
  /** Cuándo se prevé acabar (ISO-8601, UTC), o `null` si no se sabe. */
  until: string | null
  /** Desde cuándo está puesto, o `null` si no lo está. */
  since: string | null
}

/** `GET /maintenance`: el estado, y si quien pregunta puede seguir usando la web. */
export type MaintenanceStatus = Maintenance & {
  /** `true` si quien pregunta administra: la web le sigue funcionando. */
  exempt: boolean
}

/** Cuerpo de `PUT /admin/maintenance`. */
export type MaintenanceInput = {
  on: boolean
  message?: string | null
  until?: string | null
}
