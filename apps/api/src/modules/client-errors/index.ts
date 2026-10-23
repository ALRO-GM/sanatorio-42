/**
 * Módulo `client-errors`: los fallos de la web en el navegador de cada cual.
 *
 * Una sección que se rompe al pintarse deja la pantalla en blanco y nadie se
 * entera salvo quien la ve. La web los manda aquí (`ErrorBoundary` y los
 * errores sueltos de la página) y quedan en el registro del servidor, junto a
 * los de la API, con su `x-request-id`. Sin servicios de terceros y sin tabla:
 * el registro ya es el sitio donde se miran los fallos.
 *
 * No pide sesión (también falla la pantalla de entrada), así que va con tope
 * por IP y el cuerpo acotado.
 */

import { z } from 'zod'

import type { AppModule } from '../../core/module.js'
import { createRateLimit } from '../../core/rate-limit.js'
import { parse } from '../../core/validation.js'

/** Fallos que se apuntan por IP y minuto. Más es un bucle de la página, no información. */
export const CLIENT_ERRORS_PER_MINUTE = 10

const reportSchema = z.object({
  message: z.string().max(300),
  stack: z.string().max(2000).optional(),
  /** La sección que falló (`tablon`) o `page` para un error suelto. */
  where: z.string().regex(/^[a-z0-9-]{1,40}$/),
  /** El commit de la web que lo vio. */
  version: z.string().max(40).optional(),
})

export function createClientErrorsModule(): AppModule {
  const limit = createRateLimit({ max: CLIENT_ERRORS_PER_MINUTE, windowMs: 60_000 })

  return {
    name: 'client-errors',
    routes: (app) => {
      /** `POST /client-errors` → `{ message, stack?, where, version? }`. 204, también pasado el tope. */
      app.post('/client-errors', async (request, reply) => {
        if (limit.hit(request.ip)) {
          const report = parse(reportSchema, request.body)

          request.log.warn({ clientError: report }, `fallo en la web (${report.where})`)
        }

        return reply.code(204).send()
      })
    },
  }
}
