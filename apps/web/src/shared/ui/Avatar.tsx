import { useState } from 'react'

import { photoUrl } from '../api'

type AvatarProps = {
  login: string
  image: string | null
  size?: number
}

/** Color pastel determinista a partir del login. */
function colorFor(login: string): string {
  let hue = 0

  for (let index = 0; index < login.length; index += 1) {
    hue = (hue * 31 + login.charCodeAt(index)) % 360
  }

  return `hsl(${hue}, 55%, 82%)`
}

/** Foto de la persona, o su inicial sobre un color si no tiene o no carga. */
export function Avatar({ login, image, size = 64 }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const src = photoUrl(login, image)

  if (src === null || failed) {
    return (
      <span
        className="avatar-fallback"
        style={{ width: size, height: size, background: colorFor(login), fontSize: size * 0.45 }}
      >
        {login.charAt(0).toUpperCase()}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={login}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      onError={() => {
        setFailed(true)
      }}
    />
  )
}
