import type { Avatar, Role } from '@sanatorio/startup'
import { useEffect, useRef } from 'react'

import { DENSITY, canPaint } from './paint'
import { toonOf } from './toon'
import { useFrame } from './useFrame'

/** Cuántas veces más fino que en la oficina: lo pequeño (pecas, gafas, cejas) se ve al elegirlo. */
const ZOOM = 3

type Toon = ReturnType<typeof toonOf>

/** Cada figura, pasada a píxeles una vez: los fotogramas sin parpadeo repiten la misma. */
const images = new WeakMap<Toon, ImageData>()

function imageOf(context: CanvasRenderingContext2D, toon: Toon): ImageData {
  let image = images.get(toon)

  if (image === undefined) {
    image = context.createImageData(toon.w, toon.h)
    toon.pixels.forEach((color, index) => {
      if (color === null || image === undefined) return
      const value = Number.parseInt(color.slice(1, 7), 16)

      image.data.set([value >> 16, (value >> 8) & 255, value & 255, 255], index * 4)
    })
    images.set(toon, image)
  }

  return image
}

/**
 * El retrato grande del configurador: la misma figura que anda por la
 * oficina, dibujada a ×3 (no agrandada) para que cada cambio se note.
 * Parpadea de vez en cuando, como en la oficina.
 */
export function AvatarPortrait({ avatar, role }: { avatar: Avatar; role: Role | undefined }) {
  const frame = useFrame()
  const canvas = useRef<HTMLCanvasElement>(null)
  const toon = canPaint()
    ? toonOf({ avatar, role, blink: frame % 24 === 5, k: (ZOOM * DENSITY) / 2 })
    : null
  const [width, height] = toon === null ? [96, 120] : [toon.w, toon.h]

  useEffect(() => {
    const context = canvas.current?.getContext('2d')

    if (context !== null && context !== undefined && toon !== null) {
      context.putImageData(imageOf(context, toon), 0, 0)
    }
  })

  return (
    <canvas
      ref={canvas}
      className="su-item-art"
      width={width}
      height={height}
      style={{ width: `${String(width)}px` }}
      aria-hidden="true"
    />
  )
}
