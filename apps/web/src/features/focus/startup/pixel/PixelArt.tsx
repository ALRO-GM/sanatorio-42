import { useEffect, useRef } from 'react'

import type { ModelId, Props } from './models'
import { boundsOf, paintModel } from './paint'
import { DENSITY, useQuality } from './quality'
import type { Quality } from './quality'
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
  quality: fixed,
}: {
  model: ModelId
  props?: Props
  size: number
  /** Una calidad fija (la muestra del selector); sin ella, la elegida. */
  quality?: Quality | undefined
}) {
  const chosen = useQuality()
  const quality = fixed ?? chosen
  const density = DENSITY[quality].scale
  // Los fotogramas ya están guardados: recortar cada vez no cuesta.
  const bounds = boundsOf(model, props, quality)
  // En píxeles del dibujo, como en 8 bits: a más calidad, el lienzo es más fino, no más grande.
  const logical = { width: bounds.width / density, height: bounds.height / density }
  const frame = useFrame()
  const canvas = useRef<HTMLCanvasElement>(null)
  const scale = Math.max(1, Math.floor((size * 2) / Math.max(logical.width, logical.height)) / 2)

  useEffect(() => {
    const context = canvas.current?.getContext('2d')

    if (context !== null && context !== undefined) paintModel(context, model, props, frame, quality)
  })

  return (
    <canvas
      ref={canvas}
      className="su-item-art"
      width={bounds.width}
      height={bounds.height}
      style={{
        width: `${String(logical.width * scale)}px`,
        height: `${String(logical.height * scale)}px`,
      }}
      aria-hidden="true"
    />
  )
}
