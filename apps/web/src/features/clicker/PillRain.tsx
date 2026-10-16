import { useEffect, useRef } from 'react'

/** Los caracteres que caen: medio katakana, medio lo que se escribe en 42. */
const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ0123456789{}<>;=+*#42'
/** Alto de cada carácter, en píxeles. */
const SIZE = 16
/** Fotogramas por segundo: de fondo, sin gastar. */
const FPS = 20

/**
 * La lluvia de caracteres de detrás de la ventana de las pastillas. Con «menos
 * movimiento» pedido al sistema, no llueve.
 */
export function PillRain() {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d')

    if (element === null || context === null || context === undefined) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const ratio = window.devicePixelRatio || 1
    const width = element.clientWidth
    const height = element.clientHeight

    element.width = Math.round(width * ratio)
    element.height = Math.round(height * ratio)
    context.scale(ratio, ratio)
    context.font = `${SIZE}px monospace`

    const drops = Array.from({ length: Math.ceil(width / SIZE) }, () =>
      Math.floor((Math.random() * -height) / SIZE),
    )
    let last = 0
    let frame = 0

    const draw = (at: number): void => {
      frame = requestAnimationFrame(draw)

      if (at - last < 1000 / FPS) return

      last = at
      // Un velo oscuro encima: lo de antes se va apagando y deja estela.
      context.fillStyle = 'rgba(2, 8, 5, 0.18)'
      context.fillRect(0, 0, width, height)

      for (const [column, row] of drops.entries()) {
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? '4'

        // La cabeza de cada gota, más clara.
        context.fillStyle = Math.random() < 0.08 ? '#d8ffe6' : '#1fdd6a'
        context.fillText(glyph, column * SIZE, row * SIZE)
        drops[column] = row * SIZE > height && Math.random() > 0.975 ? 0 : row + 1
      }
    }

    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [])

  return <canvas ref={canvas} className="cc-pill-rain" aria-hidden="true" />
}
