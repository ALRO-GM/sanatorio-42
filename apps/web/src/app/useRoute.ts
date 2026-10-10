import { useCallback, useEffect, useState } from 'react'

import { HOME, isSection } from './sections'
import type { Section } from './sections'

/** Sección que dice la URL (`#/tablon`), o la portada si no dice ninguna válida. */
function current(): Section {
  const name = window.location.hash.replace(/^#\/?/, '').split('/')[0] ?? ''

  return isSection(name) ? name : HOME
}

/**
 * Sección activa, guardada en el hash de la URL.
 *
 * Con el hash funcionan el botón de atrás del navegador y los enlaces directos
 * ("mira el tablón") sin que el servidor tenga que saber nada de rutas.
 */
export function useRoute(): [Section, (next: Section) => void] {
  const [section, setSection] = useState(current)

  useEffect(() => {
    const onChange = (): void => {
      setSection(current())
    }

    window.addEventListener('hashchange', onChange)

    return () => {
      window.removeEventListener('hashchange', onChange)
    }
  }, [])

  const go = useCallback((next: Section) => {
    window.location.hash = `/${next}`
  }, [])

  return [section, go]
}
