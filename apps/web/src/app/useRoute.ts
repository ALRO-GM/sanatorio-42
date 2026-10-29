import { useCallback, useEffect, useState } from 'react'

import { HOME, isSection } from './sections'
import type { Section } from './sections'
import { decodePart } from '../shared/links'

/** El camino del hash, sin lo que va detrás de `?` (las opciones de `#/avance?plan=c`). */
const path = (): string => window.location.hash.replace(/^#\/?/, '').split('?')[0] ?? ''

/**
 * Direcciones de antes de la reorganización del 2026-10-29 que siguen valiendo:
 * los cursos eran pestañas de Not-games.
 */
const MOVED: Readonly<Record<string, string>> = {
  'notgames/git': 'cursogit',
  'notgames/shell': 'cursoshell',
}

/** Si la dirección es de antes, se cambia por la de ahora sin dejar rastro en el historial. */
function redirectMoved(): void {
  const to = MOVED[path()]

  if (to !== undefined) window.location.replace(`#/${to}`)
}

/** Sección que dice la URL (`#/tablon`), o la portada si no dice ninguna válida. */
function current(): Section {
  redirectMoved()

  const name = path().split('/')[0] ?? ''

  return isSection(name) ? name : HOME
}

/** Lo que va detrás de la sección (`#/expediente/jdoe` → `jdoe`), o `null`. */
function currentParam(): string | null {
  const param = path().split('/')[1] ?? ''

  return param === '' ? null : decodePart(param)
}

/**
 * Sección activa, guardada en el hash de la URL.
 *
 * Con el hash funcionan el botón de atrás del navegador y los enlaces directos
 * ("mira el tablón") sin que el servidor tenga que saber nada de rutas.
 */
export function useRoute(): [Section, (next: Section) => void, string | null] {
  const [section, setSection] = useState(current)
  const [param, setParam] = useState(currentParam)

  useEffect(() => {
    const onChange = (): void => {
      setSection(current())
      setParam(currentParam())
    }

    window.addEventListener('hashchange', onChange)

    return () => {
      window.removeEventListener('hashchange', onChange)
    }
  }, [])

  const go = useCallback((next: Section) => {
    window.location.hash = `/${next}`
  }, [])

  return [section, go, param]
}
