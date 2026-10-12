import { useEffect, useState } from 'react'

import type { FoundPerson } from '@sanatorio/contracts'

import { api } from '../../shared/api'

/** Lo que se espera tras la última tecla antes de preguntar a la API. */
const WAIT_MS = 180
/** Con menos letras no se busca: saldría medio campus. */
export const MIN_LETTERS = 2

/**
 * Quienes llevan `text` en el login o en el nombre, mientras se escribe.
 * `null` si aún no hay bastantes letras para buscar.
 *
 * Lo comparten el buscador de la cabecera y el del buzón, para que encontrar a
 * alguien funcione igual en los dos sitios.
 */
export function usePeopleSearch(text: string): FoundPerson[] | null {
  const [found, setFound] = useState<FoundPerson[] | null>(null)
  const wanted = text.trim()

  useEffect(() => {
    if (wanted.length < MIN_LETTERS) {
      setFound(null)

      return undefined
    }

    let current = true
    const timer = setTimeout(() => {
      api.searchPeople(wanted).then(
        (people) => {
          // Si entre tanto se ha escrito otra cosa, esta respuesta ya no vale.
          if (current) setFound(people)
        },
        () => {
          if (current) setFound([])
        },
      )
    }, WAIT_MS)

    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [wanted])

  return found
}
