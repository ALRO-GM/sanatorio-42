/**
 * Documentos con código de verificación y cuentas de staff.
 *
 * Quien se descarga sus horas validadas recibe un fichero con un código de
 * cuatro caracteres en el nombre. El staff de 42, con una cuenta que solo sirve
 * para esto, escribe el código y ve el documento tal como lo emitió la web.
 */

/** Una cuenta de staff, vista por quien administra. La clave no se guarda. */
export type StaffAccount = {
  id: number
  name: string
  createdBy: string
  createdAt: string
  /** La última vez que entró, o `null` si aún no lo ha hecho. */
  lastUsedAt: string | null
  /** Cuándo se le retiró el acceso, o `null` si sigue valiendo. */
  revokedAt: string | null
}

/** `GET /admin/staff`. */
export type StaffAccounts = { accounts: StaffAccount[] }

/**
 * `POST /admin/staff` → la cuenta nueva y su clave.
 *
 * La clave solo viaja en esta respuesta: hay que copiarla ahora, porque no se
 * puede volver a pedir.
 */
export type StaffAccountCreated = { account: StaffAccount; key: string }

/** `GET /staff/me`: quién eres, con una sesión de staff. */
export type StaffMe = { name: string }

/** `GET /staff/documents/:code`: un documento emitido, como salió. */
export type StaffDocument = {
  code: string
  /** De quién son las horas, o `null` si es el informe de todo el mundo. */
  login: string | null
  /** Quién se lo descargó. */
  requestedBy: string
  /** Periodo, en días (`YYYY-MM-DD`), los dos incluidos. */
  from: string
  to: string
  totalMinutes: number
  rows: number
  /** Cuándo se emitió (ISO-8601). */
  issuedAt: string
  /** El nombre con el que se descargó. */
  fileName: string
  /** La cabecera y las filas del documento original. */
  header: string[]
  lines: string[][]
}

/** `POST /staff/documents/:code/compare` → si el fichero recibido es el emitido. */
export type StaffComparison = { identical: boolean }
