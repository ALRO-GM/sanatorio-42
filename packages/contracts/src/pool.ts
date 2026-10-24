/** Los ajustes de la piscina, del panel (`GET` y `PUT /admin/pool`). */
export type PoolSettings = {
  /** Si los piscineros de una piscina en curso pueden entrar (llega con los permisos). */
  open: boolean
  /** Lo que ve un piscinero al volver de 42 con la piscina cerrada. Vacío: el de fábrica. */
  message: string
}

/** `GET /pool/notice`, sin sesión: el aviso de la piscina cerrada para la portada. */
export type PoolNotice = { message: string }
