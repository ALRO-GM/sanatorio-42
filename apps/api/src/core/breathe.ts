/**
 * Una pausa de un turno del bucle de eventos. Node atiende todo en un solo
 * hilo: un cálculo largo de una vez (la red de asientos con todo el historial)
 * hace esperar a todas las demás peticiones. Partido en tandas con esta pausa
 * entre una y otra, las demás pasan entre medias.
 */
export const breathe = (): Promise<void> => new Promise((resolve) => setImmediate(resolve))
