import { useState } from 'react'

type SeatFaceProps = {
  login: string
  image: string | null
}

/**
 * La cara de quien ocupa un puesto, a tamaño de casilla.
 *
 * La foto se amplía un poco y se centra hacia arriba (`.seat-face`, en los
 * estilos): las de 42 son retratos con mucho aire, y a este tamaño lo que hace
 * falta para reconocer a alguien es la cara. Sin foto, o si no carga, la inicial.
 */
export function SeatFace({ login, image }: SeatFaceProps) {
  const [failed, setFailed] = useState(false)

  if (image === null || image === '' || failed) {
    return <span className="seat-initial">{login.charAt(0).toUpperCase()}</span>
  }

  return (
    <img
      className="seat-face"
      src={image}
      alt=""
      loading="lazy"
      draggable={false}
      onError={() => {
        setFailed(true)
      }}
    />
  )
}
