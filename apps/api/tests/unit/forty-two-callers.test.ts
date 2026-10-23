/**
 * Quién puede hablar con la API de 42. La regla (AGENTS.md): el cliente solo
 * lo reciben `replica`, `network` y `exams` (`auth` hace OAuth con el token de
 * la persona, sin el cliente de la app), y cualquier llamada que
 * gaste cuota va precedida de `quota.allows(...)` o envuelta en `quota.defer`.
 * Un módulo nuevo que importe el cliente rompe este test a propósito: tiene
 * que entrar en la lista con su porqué.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const SRC = join(import.meta.dirname, '../../src')

/** Ficheros que importan el cliente de 42, y por qué pueden. */
const ALLOWED: Record<string, string> = {
  'modules/replica/agenda.ts': 'la copia de la agenda de 42',
  'modules/replica/curriculum.ts': 'rangos y plan de estudios de cada persona',
  'modules/replica/index.ts': 'cableado del módulo que copia 42',
  'modules/replica/photos.ts': 'las fotos; la cuota la mira quien lo llama (el bucle de copia)',
  'modules/replica/points.ts':
    'el historial de puntos (lo donado a la bolsa, para el Code Clicker)',
  'modules/replica/quota.ts': 'la cuota misma',
  'modules/replica/syncer.ts': 'el bucle que copia el campus',
  'modules/network/index.ts': 'cableado del módulo',
  'modules/network/network.sync.ts': 'la copia de las correcciones, por páginas',
  'modules/exams/index.ts': 'cableado del módulo',
  'modules/exams/exams.sync.ts': 'la copia de los intentos de examen',
  'modules/exams/exams.live.ts': 'el examen en marcha: apuntados y notas',
  'app/composition.ts': 'recibe el cliente y se lo pasa a replica, network y exams',
}

/** Los que solo cablean no gastan cuota: no se les pide `quota`. */
const NO_QUOTA = new Set([
  'modules/replica/quota.ts',
  'modules/replica/index.ts',
  'modules/replica/photos.ts',
  'modules/network/index.ts',
  'modules/exams/index.ts',
  'app/composition.ts',
])

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)

    return entry.isDirectory() ? files(path) : path.endsWith('.ts') ? [path] : []
  })
}

describe('quién habla con 42', () => {
  const callers = files(SRC)
    .filter((path) => !path.includes('/integrations/'))
    .filter((path) => readFileSync(path, 'utf8').includes('integrations/forty-two/client'))
    .map((path) => relative(SRC, path))
    .sort()

  it('solo quien está en la lista, con su porqué', () => {
    expect(callers.filter((path) => !(path in ALLOWED))).toEqual([])
    // Y la lista no guarda a nadie que ya no llame: que no se quede vieja.
    expect(Object.keys(ALLOWED).filter((path) => !callers.includes(path))).toEqual([])
  })

  it('quien gasta cuota pregunta antes a quota', () => {
    for (const path of callers.filter((each) => !NO_QUOTA.has(each))) {
      const source = readFileSync(join(SRC, path), 'utf8')

      expect(/quota\.(allows|defer)\(|quota\.allows\b|allows\(/.test(source), path).toBe(true)
    }
  })
})
