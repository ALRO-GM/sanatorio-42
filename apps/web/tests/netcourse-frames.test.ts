/**
 * La animación del paquete del curso de NetPractice (`features/netcourse/frames.ts`):
 * la traza del motor, puesta en fila fotograma a fotograma. Que pise cada nodo
 * (switches incluidos), que cuente cada salto al llegar y que la muerte salga
 * donde es, en la ida, en la vuelta o antes de salir.
 */
import { describe, expect, it } from 'vitest'

import { exampleOf, unitOf } from '@sanatorio/netsim'
import type { Trace } from '@sanatorio/netsim'

import { framesOf, wireKey } from '../src/features/netcourse/frames'

function traces(id: string): { fixed: Trace; broken: Trace | null } {
  const unit = unitOf(id)
  const example = unit === undefined ? null : exampleOf(unit)

  if (example?.kind !== 'net') throw new Error(`${id} no tiene un ping de ejemplo`)

  return { fixed: example.trace, broken: example.broken?.trace ?? null }
}

const kinds = (trace: Trace): string[][] =>
  framesOf(trace).map((frame) => frame.notes.map((note) => note.kind))

describe('fotogramas del paquete', () => {
  it('ida y vuelta: un fotograma por nodo, con el switch, y cada cosa contada al llegar', () => {
    const { fixed } = traces('net-switch')
    const frames = framesOf(fixed)

    expect(frames.map((frame) => [frame.at, frame.leg])).toEqual([
      ['ana', 'out'],
      ['sw1', 'out'],
      ['impresora', 'out'],
      ['sw1', 'back'],
      ['ana', 'back'],
    ])
    expect(frames.map((frame) => frame.wire)).toEqual([
      null,
      wireKey('ana', 'sw1'),
      wireKey('sw1', 'impresora'),
      wireKey('impresora', 'sw1'),
      wireKey('sw1', 'ana'),
    ])
    expect(kinds(fixed)).toEqual([[], [], ['hop', 'arrived'], [], ['hop', 'ok']])
    // El cable se llama igual se cruce hacia donde se cruce.
    expect(wireKey('b', 'a')).toBe('a|b')
  })

  it('muere en la ida: se para donde muere y no hay vuelta', () => {
    const { broken } = traces('net-route')

    if (broken === null) throw new Error('sin fallo')
    expect(framesOf(broken).map((frame) => frame.at)).toEqual(['ana', 'r1'])
    expect(kinds(broken)).toEqual([[], ['hop', 'death']])
  })

  it('muere antes de salir: un solo fotograma, en el nodo mal configurado', () => {
    const { broken } = traces('net-special')

    if (broken === null) throw new Error('sin fallo')
    expect(kinds(broken)).toEqual([['death']])
    expect(framesOf(broken)[0]).toMatchObject({ at: 'ana', leg: 'out', wire: null })

    // Si lo mal puesto es el destino, se señala allí sin que el paquete viaje.
    const target = traces('net-edges').broken

    if (target === null) throw new Error('sin fallo')
    expect(framesOf(target).map((frame) => [frame.at, frame.wire])).toEqual([
      ['ana', null],
      ['leo', null],
    ])
  })

  it('muere en la vuelta: la ida llega y la muerte se cuenta con la etiqueta de la vuelta', () => {
    const atTarget = traces('net-roundtrip').broken
    const atRouter = traces('net-return').broken

    if (atTarget === null || atRouter === null) throw new Error('sin fallo')
    // db no tiene puerta: la respuesta muere nada más nacer, en el mismo fotograma en que llegó la pregunta.
    expect(kinds(atTarget).at(-1)).toEqual(['hop', 'arrived', 'death'])
    expect(framesOf(atTarget).at(-1)?.notes.at(-1)).toMatchObject({ kind: 'death', leg: 'back' })
    // r2 no sabe volver: la respuesta da un salto y muere allí.
    expect(framesOf(atRouter).map((frame) => `${frame.leg}:${frame.at}`)).toEqual([
      'out:ana',
      'out:r1',
      'out:r2',
      'out:db',
      'back:r2',
    ])
    expect(kinds(atRouter).at(-1)).toEqual(['hop', 'death'])
  })
})
