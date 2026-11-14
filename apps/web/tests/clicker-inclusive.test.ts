/**
 * Code Clicker: los textos del juego no dan por hecho el género de nadie
 * (#116 del buzón) y las cifras de debajo del contador se leen bien (#111).
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import gameCa from 'virtual:textos/juego/ca'
import gameEs from 'virtual:textos/juego/es'

const css = readFileSync(join(__dirname, '../src/styles/clicker.css'), 'utf8')

/**
 * Formas con género que hablaban de personas (quien juega, el vecindario, los
 * nombres de la noticia). Las de cosas («bug aplastado», «patito becario»,
 * que es un pato) no cuentan.
 */
const GENDERED_ES = [
  /\bnombrad[oa]\b/i,
  /\bministr[oa]\b/i,
  /\bproclamad[oa]\b/i,
  /\barchievaluador\b/i,
  /\blos expertos\b/i,
  /\blos vecinos\b/i,
  /\bnosotr[oa]s\b/i,
  /\btodos los pisciners\b/i,
  /\. Todos\./,
  /\breci[eé]n llegad[oa]\b/i,
  /\bpasarte de list[oa]\b/i,
  /\bmagos\b/i,
  /\bsolo que muchos\b/i,
  /\blos pisciners\b/i,
  /^(exterminador|entomólogo|mantenedor|revisor on-call|callo de programador)$/i,
]
const GENDERED_CA = [
  /\bnomenat\b/i,
  /\bels pisciners\b/i,
  /\bels experts\b/i,
  /\bels veïns\b/i,
  /\bnosaltres\b/i,
]

const values = (table: Record<string, string>): [string, string][] =>
  Object.entries(table).filter(([, text]) => typeof text === 'string')

describe('Code Clicker: textos inclusivos (#116)', () => {
  it('normal: la noticia del ministerio ya no lleva género', () => {
    expect(gameEs['game.news.late.5']).toContain('asume la cartera de Evaluaciones')
    expect(gameEs['game.news.late.5']).toContain('{name}')
  })

  it('límite: ninguna frase en español usa las formas con género de antes', () => {
    for (const [key, text] of values(gameEs)) {
      for (const pattern of GENDERED_ES) expect(`${key}: ${text}`).not.toMatch(pattern)
    }
  })

  it('límite: tampoco en catalán', () => {
    for (const [key, text] of values(gameCa)) {
      for (const pattern of GENDERED_CA) expect(`${key}: ${text}`).not.toMatch(pattern)
    }
  })

  it('vacío: ninguna clave del juego se ha quedado sin texto al cambiarlas', () => {
    expect(values(gameEs).length).toBeGreaterThan(400)
    for (const [, text] of values(gameEs)) expect(text.trim()).not.toBe('')
  })
})

/** El tamaño de letra de una regla de `clicker.css`, en rem. */
const remOf = (selector: string): number => {
  const start = css.indexOf(`${selector} {`)

  expect(start).toBeGreaterThan(-1)
  const rule = css.slice(start, css.indexOf('}', start))
  const size = /font-size:\s*([\d.]+)rem/.exec(rule)?.[1]

  return Number(size ?? 0)
}

describe('Code Clicker: cifras legibles (#111)', () => {
  it('lo de debajo del contador, el precio de los edificios y las estadísticas, a partir de 0.85rem', () => {
    expect(remOf('.cc-cps')).toBeGreaterThanOrEqual(1)
    expect(remOf('.cc-building small')).toBeGreaterThanOrEqual(0.85)
    expect(remOf('.cc-stats dd')).toBeGreaterThanOrEqual(1)
    expect(remOf('.cc-level b')).toBeGreaterThan(0.75)
  })
})
