import { useState } from 'react'

import { photoUrl } from '../../shared/api'

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
 *
 * En un plano grande hay cientos: se piden al acercarse (`lazy`), se decodifican
 * sin parar la página (`async`) y quien la pinta la monta con `key={login}`,
 * para que el «no ha cargado» de una persona no pase a la siguiente que se
 * siente en el mismo sitio (`ClusterMapView`).
 */
export function SeatFace({ login, image }: SeatFaceProps) {
  const [failed, setFailed] = useState(false)
  const src = photoUrl(login, image)

  if (src === null || failed) {
    return <span className="seat-initial">{login.charAt(0).toUpperCase()}</span>
  }

  return (
    <img
      className="seat-face"
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => {
        setFailed(true)
      }}
    />
  )
}
