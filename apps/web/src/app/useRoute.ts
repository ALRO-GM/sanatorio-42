import { useCallback, useEffect, useState } from 'react'

import { HOME, isSection } from './sections'
import type { Section } from './sections'

/** Sección que dice la URL (`#/tablon`), o la portada si no dice ninguna válida. */
function current(): Section {
  const name = window.location.hash.replace(/^#\/?/, '').split('/')[0] ?? ''

  return isSection(name) ? name : HOME
}

/** Lo que va detrás de la sección (`#/expediente/jdoe` → `jdoe`), o `null`. */
function currentParam(): string | null {
  const param = window.location.hash.replace(/^#\/?/, '').split('/')[1] ?? ''

  return param === '' ? null : decodeURIComponent(param)
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
