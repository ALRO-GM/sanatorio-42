/**
 * La tipografía del francés que comprueba `npm run textos`: avisa de lo que
 * está mal y deja en paz el código, las URL, los huecos y las horas.
 */
import { describe, expect, it } from 'vitest'

import { readTables } from '../tools/textos'
import { frenchTypography } from '../tools/textos-fr'

const NB = ' '
const NNB = ' '

describe('tipografía del francés', () => {
  it('acepta un texto bien puesto', () => {
    expect(
      frenchTypography(
        `Attention${NB}: tu as ${NB}2 corrections${NNB}! Tu viens${NNB}? «${NB}Oui${NB}»${NNB}; 50${NB}% de 12${NNB}345…`,
      ),
    ).toEqual([])
  })

  it('pide el espacio sin corte que toca antes de : ; ? ! y %', () => {
    expect(frenchTypography('Attention: oui')).toEqual(['falta U+00A0 antes de «:»'])
    expect(frenchTypography('Attention : oui')).toEqual([
      'antes de «:» va U+00A0, no un espacio normal',
    ])
    expect(frenchTypography(`Tu viens${NB}?`)).toEqual(['antes de «?» va U+202F, no U+00A0'])
    expect(frenchTypography('Super!')).toEqual(['falta U+202F antes de «!»'])
    expect(frenchTypography('{pct}%')).toEqual(['falta U+00A0 antes de «%»'])
    expect(frenchTypography('50 %')).toEqual(['antes de «%» va U+00A0'])
  })

  it('pide « » con espacios sin corte, … y nada de español', () => {
    expect(frenchTypography('Le bouton "OK"')).toEqual(['comillas inglesas: van « »'])
    expect(frenchTypography('« OK »')).toEqual([
      'tras la comilla «, U+00A0',
      'antes de la comilla », U+00A0',
    ])
    expect(frenchTypography('Attends...')).toEqual(['«...»: va «…»'])
    expect(frenchTypography('Deux  espaces')).toEqual(['espacio doble'])
    expect(frenchTypography('¿Año?')).toContain('lleva ¿, ¡ o ñ')
    expect(frenchTypography('Agencia Española de Protección de Datos')).toEqual([])
    expect(frenchTypography('Etape suivante')).toEqual(['mayúscula sin acento (À, É…)'])
    expect(frenchTypography('A vu le message')).toEqual([])
    expect(frenchTypography('10 000 lignes')).toEqual(['los miles van con U+202F'])
  })

  it('no confunde con frases las horas, las URL, los huecos ni el código', () => {
    expect(frenchTypography('De 10:30 à 12:00')).toEqual([])
    expect(frenchTypography('Va sur https://x.fr/a?b=1 ou écris à a@b.fr')).toEqual([])
    expect(frenchTypography(`Ex.${NB}: le %p et \`a ? b : c\``)).toEqual([])
    expect(frenchTypography(`Lance \`git commit -m "fix"\``)).toEqual([])
    expect(frenchTypography(`{login}${NB}!`)).toEqual(['antes de «!» va U+202F, no U+00A0'])
    expect(frenchTypography('Ça marche ?!')).toEqual([
      'antes de «?» va U+202F, no un espacio normal',
    ])
  })

  it('las tablas de verdad cumplen la tipografía en francés', () => {
    const wrong = readTables()
      .filter((row) => frenchTypography(row.text.fr).length > 0)
      .map((row) => row.key)

    expect(wrong).toEqual([])
  })
})
