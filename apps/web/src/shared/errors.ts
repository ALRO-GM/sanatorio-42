/**
 * Los fallos de la web en el navegador, al servidor (`POST /client-errors`):
 * así un error que solo ve quien lo sufre deja rastro en el registro.
 *
 * Se mandan como mucho `MAX_PER_PAGE` por carga de página, y si el envío falla
 * no se insiste: es para enterarse, no para molestar.
 */

import { api } from './api'

const MAX_PER_PAGE = 5
let sent = 0

/** Manda un fallo. `where` es la sección, o `page` para uno suelto. */
export function reportError(where: string, error: unknown, extra?: string): void {
  if (sent >= MAX_PER_PAGE) return
  sent += 1

  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  const stack = [error instanceof Error ? error.stack : undefined, extra]
    .filter((part) => part !== undefined && part !== '')
    .join('\n')

  void api
    .reportClientError({
      message: message.slice(0, 300),
      where: /^[a-z0-9-]{1,40}$/.test(where) ? where : 'page',
      ...(stack === '' ? {} : { stack: stack.slice(0, 2000) }),
    })
    .catch(() => undefined)
}

/** Escucha los fallos sueltos de la página (los que no pasan por React). */
export function watchErrors(): void {
  window.addEventListener('error', (event) => {
    reportError('page', event.error ?? event.message)
  })
  window.addEventListener('unhandledrejection', (event) => {
    reportError('page', event.reason)
  })
}
