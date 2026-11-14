/**
 * Los cursos de NetPractice y de RAG en francés: cada unidad y cada bloque
 * tienen su texto, con la misma forma que el inglés (las mismas partes, las
 * mismas tareas, pasos y líneas de ejemplo) y las mismas cifras, direcciones
 * y fracciones, que no se traducen.
 */
import { courseText } from '@sanatorio/course'
import * as net from '@sanatorio/netsim'
import * as rag from '@sanatorio/ragsim'
import { describe, expect, it } from 'vitest'

type Text = {
  title: string
  goal: string
  theory?: { what: string; how: string[]; when: string; whenNot?: string; problems?: string }
  example?: string
  frames?: string[]
  story?: string
  tasks?: string[]
}
type Unit = { id: string; en: Text; fr?: Text }
type Block = { n: number; es: object; en: object; fr?: { title: string; pitch: string } }

/** Lo que no se traduce y tiene que salir igual: IP, prefijos, decimales y fracciones. */
const KEPT = /\d+(?:[./]\d+)+|\/\d+/g

const kept = (text: Text): string[] => JSON.stringify(text).match(KEPT)?.sort() ?? []

function shape(unit: Unit): void {
  const { fr, en } = unit

  if (fr === undefined) throw new Error(`falta el francés de ${unit.id}`)

  expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort())
  expect(Object.keys(fr.theory ?? {}).sort()).toEqual(Object.keys(en.theory ?? {}).sort())
  expect(fr.tasks?.length).toBe(en.tasks?.length)
  expect(fr.frames?.length).toBe(en.frames?.length)
  expect(fr.theory?.how.length).toBe(en.theory?.how.length)
  expect(kept(fr)).toEqual(kept(en))
}

const COURSES = [
  {
    name: 'NetPractice',
    units: net.UNITS as Unit[],
    blocks: net.BLOCKS as Block[],
    lang: net.unitIn,
  },
  { name: 'RAG', units: rag.UNITS as Unit[], blocks: rag.BLOCKS as Block[], lang: rag.unitIn },
]

describe.each(COURSES)('curso de $name en francés', ({ units, blocks, lang }) => {
  it.each(units.map((unit) => [unit.id, unit] as const))(
    '%s tiene su francés, con la forma del inglés',
    (_id, unit) => {
      shape(unit)
      expect(lang(unit as never, 'fr')).toBe(unit.fr)
      expect(lang(unit as never, 'en')).toBe(unit.en)
    },
  )

  it('cada bloque tiene su título y su resumen en francés', () => {
    for (const block of blocks) {
      expect(block.fr?.title, `bloque ${block.n}`).toBeTruthy()
      expect(block.fr?.pitch, `bloque ${block.n}`).toBeTruthy()
      expect(courseText(block, 'fr')).toBe(block.fr)
    }
  })
})

describe('las piezas del curso de RAG en francés', () => {
  it('cada bloque trae la misma pieza que en inglés: mismas líneas de esqueleto y mismo código', () => {
    for (const block of rag.BLOCKS) {
      const { en, fr } = block

      expect(fr?.build.piece, `bloque ${block.n}`).toBeTruthy()
      expect(fr?.build.verify, `bloque ${block.n}`).toBeTruthy()
      expect(fr?.build.skeleton.length, `bloque ${block.n}`).toBe(en.build.skeleton.length)

      // Lo que no se traduce: el código, sin sus comentarios ni las frases de las instrucciones.
      const code = (line: string): string =>
        /^\s*(#|")/.test(line) ? '' : (line.split('  #')[0] ?? '')

      expect(fr?.build.skeleton.map(code), `bloque ${block.n}`).toEqual(en.build.skeleton.map(code))
    }
  })
})
