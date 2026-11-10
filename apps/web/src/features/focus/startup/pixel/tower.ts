/**
 * El edificio de la startup visto de fuera (espacio 4 y 5): las plantas con
 * sus ventanas (más luces de noche), el sótano de servidores en un corte del
 * terreno, los paneles solares del tejado y la azotea (jardín y, luego,
 * helipuerto). Crece con lo comprado del edificio (`floors`, `basement`,
 * `solar`, `rooftop`).
 */
import { levelOf, spaceOf } from '@sanatorio/startup'
import type { StartupState } from '@sanatorio/startup'

import { DARK, GLASS, LEAF, LED, LIGHT, METAL, NAVY, SCREEN, SOIL, STONE } from './palette'
import { DENSITY } from './paint'
import { scatter, Sprite } from './sprite'
import type { Shades } from './sprite'

export type Tower = { storeys: number; basements: number; solar: number; rooftop: number }

/** Lo que mide cada planta y cada sótano, en el mundo. */
const STOREY = 14
const BASEMENT = 12
const SIDE = 32

const GRASS: Shades = [LEAF[2], '#7a5236', '#5e3f29']
const WALL: Shades = STONE

/** El edificio de una partida, o `null` si aún no lo tiene. */
export function towerOf(state: StartupState): Tower | null {
  const space = spaceOf(state)

  if (space < 4) return null

  return {
    storeys: 2 + levelOf(state, 'floors') + (space >= 5 ? 2 : 0),
    basements: levelOf(state, 'basement'),
    solar: levelOf(state, 'solar'),
    rooftop: levelOf(state, 'rooftop'),
  }
}

/** Lo que mide el dibujo del edificio, en píxeles. */
export function towerSize(tower: Tower): { width: number; height: number; oy: number } {
  const above = tower.storeys * STOREY + 30
  const below = tower.basements * BASEMENT + 10

  return { width: 2 * (SIDE + 12) + 12, height: above + below + SIDE + 16, oy: above + 4 }
}

/** El edificio en el fotograma `frame`; de noche, con más ventanas encendidas. */
export function drawTower(tower: Tower, frame: number, night: boolean): Sprite {
  const { width, height, oy } = towerSize(tower)
  const sprite = new Sprite(width, height, width / 2, oy, DENSITY)
  const depth = tower.basements * BASEMENT + 4

  // El terreno, con el corte que deja ver el sótano.
  sprite.box(-8, -8, -depth, SIDE + 16, SIDE + 16, depth, GRASS)

  for (let level = 0; level < tower.basements; level += 1) {
    const z0 = -(level + 1) * BASEMENT

    sprite.faceY(SIDE + 8.01, 0, SIDE, z0 + 1, z0 + BASEMENT - 1, SCREEN)
    sprite.faceX(SIDE + 8.01, 0, SIDE, z0 + 1, z0 + BASEMENT - 1, SOIL)

    for (let rack = 0; rack < 6; rack += 1) {
      const x = 2 + rack * 5

      sprite.faceY(SIDE + 8.02, x, x + 3.5, z0 + 2, z0 + BASEMENT - 2, DARK[1])

      for (let light = 0; light < 3; light += 1) {
        const on = scatter(level * 97 + rack * 13 + light + Math.floor(frame / 2)) % 3 !== 0

        sprite.dot(x + 1.5, SIDE + 8.03, z0 + 3 + light * 2.5, on ? LED.green : LED.off)
      }
    }
  }

  // Las plantas, cada una con su fila de ventanas.
  for (let storey = 0; storey < tower.storeys; storey += 1) {
    const z = storey * STOREY

    sprite.box(0, 0, z, SIDE, SIDE, STOREY, WALL)
    sprite.faceY(SIDE + 0.01, 0, SIDE, z + STOREY - 1, z + STOREY, STONE[2])

    for (let window = 0; window < 5; window += 1) {
      const seed = scatter(storey * 31 + window + Math.floor(frame / 24))
      const lit = night ? seed % 5 !== 0 : seed % 4 === 0
      const color = lit ? LIGHT : GLASS[1]

      sprite.faceY(SIDE + 0.02, 2 + window * 6, 6 + window * 6, z + 4, z + 10, color)
      sprite.faceX(
        SIDE + 0.02,
        2 + window * 6,
        6 + window * 6,
        z + 4,
        z + 10,
        lit ? LIGHT : GLASS[2],
      )
    }
  }

  // La entrada.
  sprite.faceY(SIDE + 0.03, 12, 20, 0, 9, NAVY[1])

  const roof = tower.storeys * STOREY

  sprite.box(0, 0, roof, SIDE, SIDE, 2, METAL)

  // Los paneles solares, en fila al fondo del tejado (a la derecha del jardín).
  for (let panel = 0; panel < tower.solar * 3; panel += 1) {
    const x = 10 + (panel % 3) * 7.3
    const y = 2 + Math.floor(panel / 3) * 7

    sprite.box(x, y, roof + 2, 6, 5, 2, [NAVY[0], NAVY[1], DARK[2]])
    sprite.dot(x + 3, y + 2.5, roof + 4.1, frame % 12 < 2 ? '#ffffff' : NAVY[0])
  }

  // La azotea: un jardín y, con el segundo nivel, el helipuerto.
  if (tower.rooftop >= 1) {
    for (let bush = 0; bush < 4; bush += 1) {
      sprite.box(2, 3 + bush * 7, roof + 2, 5, 5, 3 + (bush % 2), [LEAF[2], LEAF[1], LEAF[0]])
    }
  }

  if (tower.rooftop >= 2) {
    sprite.faceZ(roof + 2.01, 12, 30, 16, 30, DARK[0])

    for (let step = 0; step < 6; step += 1) {
      sprite.dot(17, 20 + step, roof + 2.02, LIGHT)
      sprite.dot(24, 20 + step, roof + 2.02, LIGHT)
      sprite.dot(18 + step, 22.5, roof + 2.02, LIGHT)
    }
    sprite.dot(12, 16, roof + 2.03, frame % 6 < 3 ? LED.red : LED.off)
    sprite.dot(30, 30, roof + 2.03, frame % 6 < 3 ? LED.off : LED.red)
  }

  return sprite.finish()
}
