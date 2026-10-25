/**
 * La puerta de entrada: ejecutar una orden de la terminal sobre un mundo y
 * devolver el mundo nuevo y lo que se ve. Nunca cambia el mundo que recibe
 * (trabaja sobre una copia) y, si algo se pasa de los topes o falla de forma
 * inesperada, devuelve el de antes con un mensaje: la pestaña y la API no se
 * caen por nada de lo que se escriba.
 */

import { Fail } from './fs.js'
import { Shell } from './interp.js'
import type { RunResult } from './interp.js'
import { LIMITS, withinLimits } from './limits.js'
import type { World } from './model.js'
import { cloneWorld, ShellError } from './model.js'
import { Incomplete, parse } from './parse.js'

const HISTORY = 200

function failed(world: World, message: string, code = 1): RunResult {
  return { ok: false, code, counted: 0, output: [message], stdout: '', world }
}

/** ¿Está la orden a medias (una comilla, un `if` o un heredoc sin cerrar)? */
export function isIncomplete(entry: string): boolean {
  try {
    parse(entry)

    return false
  } catch (error) {
    return error instanceof Incomplete
  }
}

/** Ejecuta una orden (puede tener varias líneas). */
export function run(world: World, entry: string): RunResult {
  if (entry.length > LIMITS.entry)
    return failed(
      world,
      `peer4u-sandbox: la orden es demasiado larga (como mucho ${LIMITS.entry} caracteres)`,
    )
  if (entry.split('\n').length > LIMITS.entryLines)
    return failed(
      world,
      `peer4u-sandbox: demasiadas líneas en una orden (como mucho ${LIMITS.entryLines})`,
    )
  if (entry.trim() === '') return { ok: true, code: 0, counted: 0, output: [], stdout: '', world }

  try {
    parse(entry)
  } catch (error) {
    if (error instanceof Incomplete)
      return { ok: false, code: 2, counted: 0, output: [], stdout: '', world, incomplete: true }
    if (error instanceof ShellError || error instanceof Fail) return failed(world, error.message, 2)
    throw error
  }

  const next = cloneWorld(world)
  const shell = new Shell(next)

  next.clock += 1
  next.session.history = [...next.session.history, entry].slice(-HISTORY)
  for (const machine of Object.values(next.machines))
    machine.procs = machine.procs.filter(
      (proc) => proc.until === undefined || proc.until > next.clock,
    )

  let code: number

  try {
    code = shell.entry(entry)
    withinLimits(next)
  } catch (error) {
    if (error instanceof ShellError || error instanceof Fail) return failed(world, error.message)
    if (error instanceof Incomplete)
      return failed(world, 'bash: syntax error: unexpected end of file', 2)
    if (error instanceof RangeError)
      return failed(world, 'peer4u-sandbox: demasiada recursión: se para aquí')

    // Un fallo del simulador no tumba nada: se enseña y el mundo sigue como estaba.
    return failed(
      world,
      `peer4u-sandbox: error inesperado del simulador (${error instanceof Error ? error.message : 'desconocido'})`,
    )
  }
  next.session.status = code

  const text = shell.screen.map((line) => line.text).join('')
  const output = text === '' ? [] : text.replace(/\n$/, '').split('\n')

  return {
    ok: code === 0,
    code,
    counted: shell.counted,
    output,
    stdout: shell.screen
      .filter((line) => !line.err)
      .map((line) => line.text)
      .join(''),
    world: next,
  }
}
