/**
 * Un punto del camino del curso de git. Se monta solo con comandos: los de
 * `start` dejan el repositorio de partida y los de `solution` llegan al
 * objetivo (y hacen la animación). Así el objetivo nunca se escribe a mano y
 * no puede quedar desfasado del motor.
 */

export type Theory = {
  /** Para qué sirve, en una o dos frases. */
  what: string
  /** Cómo se usa: comandos de ejemplo, uno por línea. */
  how: string[]
  /** Cuándo usarlo. */
  when: string
  /** Cuándo no (opcional: no todos los puntos lo necesitan). */
  whenNot?: string
  /** Cómo se ve en las ramas. */
  looks: string
  /** Qué problemas puede dar (opcional). */
  problems?: string
}

export type Level = {
  id: string
  /** El mundo (punto gordo) al que lleva este paso. */
  world: number
  /** `review` junta conceptos de antes; `world` es el punto gordo que cierra un mundo. */
  kind: 'step' | 'review' | 'world'
  title: string
  /** El reto, en una frase: qué hay que conseguir. */
  goal: string
  theory: Theory
  /** Comandos que montan el punto de partida (sobre un repo vacío con `main` en c0). */
  start: string[]
  /**
   * Si hay remoto: una «compañera» (commits `o1`, `o2`…) clona origin y hace
   * `setup`; luego clonas tú (salvo `cloned: false`, si el reto es clonar),
   * se hacen tus `start` y después lo que ella sube mientras (`after`).
   */
  remote?: { setup: string[]; after?: string[]; locked?: string[]; cloned?: false }
  /** Una solución: la animación la reproduce y de su resultado sale el objetivo. */
  solution: string[]
  /** Qué se comprueba del resultado de la solución. Por defecto, ramas locales y HEAD. */
  check?: {
    branches?: string[]
    head?: boolean
    remote?: string[]
    tags?: boolean
    files?: Record<string, string[]>
  }
}
