import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

/** Un QR como SVG, sin pedir nada a ningún servidor. */
export function Qr({ text, label }: { text: string; label: string }) {
  const svg = useMemo(() => {
    const code = qrcode(0, 'M')

    code.addData(text)
    code.make()

    return code.createSvgTag({ cellSize: 4, margin: 2, scalable: true })
  }, [text])

  // El SVG lo genera la librería a partir de un texto nuestro: no hay nada de fuera.
  return (
    <span className="qr" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />
  )
}
