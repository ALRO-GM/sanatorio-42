/**
 * El curso de shell en francés: cada unidad y cada bloque tiene su texto, con
 * la misma forma que en inglés (las mismas partes, tantas tareas y tantas
 * líneas de ejemplo en la teoría) y los mismos comandos en esas líneas.
 */
import { courseText } from '@sanatorio/course'
import { BLOCKS, unitIn, UNITS } from '@sanatorio/shellsim'
import { describe, expect, it } from 'vitest'

/** Lo que sí se traduce al principio de una línea: el hueco de «una orden cualquiera». */
const ANY_COMMAND = new Set(['orden', 'command', 'commande'])

/**
 * El programa con el que empieza una línea de ejemplo, que nunca se traduce.
 * Una asignación (`NOMBRE=peer`) cuenta solo como asignación: el nombre de
 * la variable de ejemplo sí se traduce.
 */
const program = (line: string): string => {
  const first = line.trim().split(/\s+/)[0] ?? ''

  if (/^\w+=/.test(first)) return '='

  return ANY_COMMAND.has(first) ? '…' : first
}

describe('curso de shell en francés', () => {
  it.each(UNITS.map((unit) => [unit.id, unit] as const))(
    '%s tiene su francés, con la forma del inglés',
    (_id, unit) => {
      const { fr, en } = unit

      expect(fr).toBeDefined()
      expect(Object.keys(fr ?? {}).sort()).toEqual(Object.keys(en).sort())
      expect(Object.keys(fr?.theory ?? {}).sort()).toEqual(Object.keys(en.theory ?? {}).sort())
      expect(fr?.tasks?.length).toBe(en.tasks?.length)
      expect(fr?.theory?.how.length).toBe(en.theory?.how.length)
      expect(fr?.theory?.how.map(program)).toEqual(en.theory?.how.map(program))
      expect(unitIn(unit, 'fr')).toBe(fr)
    },
  )

  it('cada bloque tiene su título y su resumen en francés', () => {
    for (const block of BLOCKS) {
      expect(block.fr?.title, `bloque ${block.n}`).toBeTruthy()
      expect(block.fr?.pitch, `bloque ${block.n}`).toBeTruthy()
      expect(courseText(block, 'fr')).toBe(block.fr)
      expect(courseText(block, 'eu')).toBe(block.es)
    }
  })

  it('un texto sin francés sale en inglés', () => {
    expect(courseText({ es: 'hola', en: 'hello' }, 'fr')).toBe('hello')
    expect(courseText({ es: 'hola', en: 'hello', fr: 'salut' }, 'en')).toBe('hello')
    expect(courseText({ es: 'hola', en: 'hello', fr: 'salut' }, 'xx')).toBe('hola')
  })
})
