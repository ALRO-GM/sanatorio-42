import { useEffect, useRef } from 'react'

import type { ModelId, Props } from './models'
import { boundsOf, paintModel } from './paint'
import { useFrame } from './useFrame'

/**
 * Un modelo suelto, recortado y animado, en un hueco de `size × size`: el
 * dibujo de las tarjetas. Se agranda de medio en medio (×1, ×1,5, ×2…), que en
 * pantallas de doble densidad sigue siendo un píxel entero.
 */
export function PixelArt({
  model,
  props = {},
  size,
}: {
  model: ModelId
  props?: Props
  size: number
}) {
  // Los fotogramas ya están guardados: recortar cada vez no cuesta.
  const bounds = boundsOf(model, props)
  const frame = useFrame()
  const canvas = useRef<HTMLCanvasElement>(null)
  const scale = Math.max(1, Math.floor((size * 2) / Math.max(bounds.width, bounds.height)) / 2)

  useEffect(() => {
    const context = canvas.current?.getContext('2d')

    if (context !== null && context !== undefined) paintModel(context, model, props, frame)
  })

  return (
    <canvas
      ref={canvas}
      className="su-item-art"
      width={bounds.width}
      height={bounds.height}
      style={{
        width: `${String(bounds.width * scale)}px`,
        height: `${String(bounds.height * scale)}px`,
      }}
      aria-hidden="true"
    />
  )
}
