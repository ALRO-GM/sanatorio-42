/**
 * Bus de eventos entre módulos, dentro del proceso.
 *
 * Sirve para que un módulo reaccione a lo que pasa en otro sin que ninguno
 * importe al otro: `peers` avisa de que alguien se ha puesto de guardia y
 * `profile` apunta el logro, sin que `peers` sepa que existe la XP.
 *
 * Es síncrono a propósito (`emit` espera a todos los oyentes): quien emite
 * devuelve la respuesta con el efecto ya aplicado, y un fallo de un oyente se ve
 * en la petición que lo provocó en vez de perderse.
 */

/** Todos los eventos que existen, con lo que lleva cada uno. */
export type AppEvents = {
  /** Alguien se ha marcado como de guardia. */
  'duty.started': { login: string }
  /** Alguien va a ver su expediente: buen momento para cerrar cuentas pendientes. */
  'profile.viewed': { login: string }
}

type Handler<T> = (payload: T) => Promise<void> | void

export type EventBus = {
  on: <K extends keyof AppEvents>(event: K, handler: Handler<AppEvents[K]>) => void
  emit: <K extends keyof AppEvents>(event: K, payload: AppEvents[K]) => Promise<void>
}

export function createEventBus(): EventBus {
  const handlers = new Map<keyof AppEvents, Handler<never>[]>()

  return {
    on(event, handler) {
      handlers.set(event, [...(handlers.get(event) ?? []), handler])
    },

    async emit(event, payload) {
      for (const handler of handlers.get(event) ?? []) {
        await (handler as Handler<typeof payload>)(payload)
      }
    },
  }
}
