/**
 * El aspecto de cada persona de la plantilla (el configurador de la startup,
 * `docs/pomodoro-startup.md`): cada parte del personaje, una de unas cuantas
 * formas o colores del catálogo. Aquí solo cuántas hay de cada una y en qué
 * orden; cómo se dibuja cada una es cosa de la web (`pixel/toon.ts`).
 *
 * Quien no lo ha cambiado sale de su `look` (0-999), como siempre: el mismo
 * aspecto en cada recarga y en el navegador de cualquiera.
 */

/** Las partes del personaje y cuántas opciones tiene cada una. Añadir una opción: al final, sin mover las de antes. */
export const AVATAR_PARTS = {
  /** Tono de piel. */
  skin: 8,
  /** Peinado: melena, corto, tupé, rizos, trenza, coleta, moño, larga, rapado. */
  hair: 9,
  /** Color del pelo. */
  hairColor: 10,
  /** Forma de los ojos: almendrados, redondos, alegres, serenos. */
  eyes: 4,
  /** Color de los ojos. */
  eyeColor: 6,
  /** Cejas: gruesas, finas, arqueadas. */
  brows: 3,
  /** Pecas: sin o con. */
  freckles: 2,
  /** Gafas: sin, redondas, cuadradas. */
  glasses: 3,
  /** Barba: sin, corta, bigote, perilla. */
  beard: 4,
  /** Arriba: jersey, camisa, sudadera, camiseta, chaqueta. */
  top: 5,
  topColor: 12,
  /** Abajo: vaqueros, pantalón, falda, pantalón corto. */
  bottom: 4,
  bottomColor: 10,
  /** Calzado: zapatillas, botas, zapatos. */
  shoes: 3,
  shoesColor: 6,
} as const

export type AvatarPart = keyof typeof AVATAR_PARTS
export type Avatar = Record<AvatarPart, number>

export const AVATAR_KEYS = Object.keys(AVATAR_PARTS) as AvatarPart[]

/** Un número estable de otro, para repartir el aspecto por partes sin que vayan a la par. */
function mixLook(look: number, salt: number): number {
  let x = Math.imul((Math.floor(look) + 1) ^ Math.imul(salt + 1, 0x9e3779b9), 0x85ebca6b)

  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)

  return (x ^ (x >>> 16)) >>> 0
}

/**
 * El aspecto que sale del `look` de quien no lo ha cambiado. Sin barba ni
 * gafas la mayoría de las veces, para que no lo lleve todo el mundo.
 */
export function avatarOf(look: number): Avatar {
  const pick = (part: AvatarPart, index: number): number =>
    mixLook(look, index) % AVATAR_PARTS[part]
  const avatar = Object.fromEntries(
    AVATAR_KEYS.map((part, index) => [part, pick(part, index)]),
  ) as Avatar

  return {
    ...avatar,
    freckles: mixLook(look, 40) % 4 === 0 ? 1 : 0,
    glasses: mixLook(look, 41) % 4 === 0 ? 1 + (mixLook(look, 42) % 2) : 0,
    beard: mixLook(look, 43) % 5 === 0 ? 1 + (mixLook(look, 44) % 3) : 0,
  }
}

/** Si algo es un aspecto válido: cada parte, un entero de su catálogo. */
export function isAvatar(value: unknown): value is Avatar {
  if (typeof value !== 'object' || value === null) return false

  const raw = value as Record<string, unknown>

  return AVATAR_KEYS.every((part) => {
    const option = raw[part]

    return (
      typeof option === 'number' &&
      Number.isInteger(option) &&
      option >= 0 &&
      option < AVATAR_PARTS[part]
    )
  })
}

/** Un aspecto guardado, solo con sus partes (lo demás se descarta), o `undefined` si no vale. */
export function parseAvatar(value: unknown): Avatar | undefined {
  if (!isAvatar(value)) return undefined

  return Object.fromEntries(AVATAR_KEYS.map((part) => [part, value[part]])) as Avatar
}

/** El aspecto en una cadena corta (`3.0.7…`): para guardar dibujos ya hechos por su aspecto. */
export const avatarKey = (avatar: Avatar): string =>
  AVATAR_KEYS.map((part) => String(avatar[part])).join('.')

/** Lo contrario de `avatarKey`; `null` si la cadena no es un aspecto. */
export function avatarFromKey(key: string): Avatar | null {
  const values = key.split('.').map(Number)
  const avatar = Object.fromEntries(AVATAR_KEYS.map((part, index) => [part, values[index]]))

  return isAvatar(avatar) ? avatar : null
}
