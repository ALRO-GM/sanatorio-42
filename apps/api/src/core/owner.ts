/**
 * Quien es dueño de la web (pedido por Alberto el 2026-10-30): solo él puede
 * ver la web como un piscinero sin límites (`docs/piscineros.md`). Va fijo en
 * el código, y no en `ADMIN_LOGINS` ni en el panel, para que dar el permiso de
 * administrar a alguien no le dé también esto.
 */
const OWNER_LOGIN = 'albrodri'

/** Si ese login es el del dueño. */
export function isOwner(login: string): boolean {
  return login.toLowerCase() === OWNER_LOGIN
}
