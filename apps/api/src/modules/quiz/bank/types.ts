/**
 * El formato del banco de preguntas de Not-games.
 *
 * Una entrada es un **concepto**, no una pregunta: varias formas de
 * preguntarlo, varias formas de decir la respuesta buena y muchas respuestas
 * malas. Cada vez que sale se monta una pregunta distinta (una forma de
 * preguntar, una buena y tres malas, en orden al azar), para que no se pueda
 * aprender de memoria qué botón pulsar.
 */

/** Rápida: se contesta leyendo, en 10 s. Larga: hay que razonar o leer código. */
export type ConceptKind = 'quick' | 'long'

/**
 * Qué hay que haber hecho (o estar haciendo) para que te salga.
 *
 * - `projects`: alguno de estos proyectos, por su slug de 42.
 * - `lang`: haber tocado ese lenguaje en el 42cursus (C lo toca todo el mundo
 *   con Libft; Python, quien hace los módulos de Python; C++, los CPP).
 * - Sin nada: es general (git, shell, binario…) y sale a cualquiera.
 */
export type ConceptNeeds = {
  projects?: readonly string[]
  lang?: 'c' | 'python' | 'cpp'
}

export type ConceptForm = {
  /** Maneras de preguntar: dicen lo mismo con otras palabras. */
  ask: readonly string[]
  /** Respuestas buenas a esas preguntas. Sale una. */
  right: readonly string[]
  /** Malas que solo tienen sentido con esta forma, además de las comunes. */
  wrong?: readonly string[]
}

export type Concept = {
  /** Único y estable: las estadísticas de dificultad van por él. */
  id: string
  /** Tema, para agrupar: `memoria`, `procesos`, `redes`… */
  topic: string
  needs: ConceptNeeds
  kind: ConceptKind
  /** Segundos para contestar. Por defecto, 10 las rápidas y 30 las largas. */
  seconds?: 10 | 30 | 60
  /** Dificultad de partida, de 1 a 5. Se reajusta con lo que falla la gente. */
  level: 1 | 2 | 3 | 4 | 5
  /**
   * Formas de plantearlo. Cada una junta maneras de preguntar lo mismo con
   * sus respuestas buenas (escritas de varias formas): cualquier buena de una
   * forma contesta a cualquier pregunta de esa forma, y a ninguna de otra.
   */
  forms: readonly ConceptForm[]
  /** Un código que leer, si la pregunta va de eso. */
  code?: string
  /** Respuestas malas para todas las formas, cuantas más mejor. Salen tres. */
  wrong: readonly string[]
  /** Por qué, en una frase: se enseña al revelar la respuesta. */
  why: string
}

/** Lo que se enseña en el Repaso de un concepto: título corto, qué es y un ejemplo. */
export type ReviewEntry = {
  title: string
  definition: string
  example: string
}
