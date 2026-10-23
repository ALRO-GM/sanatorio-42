/**
 * `GET /health/db`: lo que mira quien despliega. Sin sesión y sin datos
 * personales.
 */
export type DbHealth = {
  /** `ok` si la base contesta; `degraded` (con `503`) si no. */
  status: 'ok' | 'degraded'
  database: 'ok' | 'error'
  /**
   * Commit desplegado (el `GIT_SHA` que la imagen lleva dentro), o `null` si
   * no se sabe (en local).
   */
  version: string | null
  /**
   * Versión del esquema que espera el código y la que tiene la base. Si no
   * coinciden, la app no arranca; `actual` es `null` cuando no se pudo leer.
   */
  schema: { expected: number; actual: number | null }
  /**
   * Segundos desde la última vez que se trajo algo de 42 (puestos o cambios de
   * proyectos de un campus seguido), o `null` si aún no ha habido ninguna.
   */
  syncAgeSeconds: number | null
}
