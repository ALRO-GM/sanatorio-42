/**
 * La forma de una unidad de un curso: teoría, ejemplo y prueba. Cada curso
 * añade lo suyo (el de git, cómo se ve en las ramas; el de shell, el mundo de
 * partida y lo que se comprueba), pero la teoría tiene siempre estas partes,
 * en este orden, para que se lea igual en todos.
 */

export type Theory = {
  /** Para qué sirve, en una o dos frases. */
  what: string
  /** Cómo se usa: comandos de ejemplo, uno por línea. */
  how: string[]
  /** Cuándo usarlo. */
  when: string
  /** Cuándo no (opcional). */
  whenNot?: string
  /** Qué problemas puede dar (opcional). */
  problems?: string
}

/**
 * `unit`: un conocimiento (teoría, ejemplo y prueba). `boss`: el contrarreloj
 * que cierra un bloque y junta todo lo del bloque. `final`: el jefe final de
 * un nivel (principiante, intermedio, avanzado), que da su certificado.
 */
export type UnitKind = 'unit' | 'boss' | 'final'
