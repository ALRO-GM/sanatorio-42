/**
 * Con qué partida se juega y cuándo se puede guardar en la API.
 *
 * La partida vive en la API, para poder seguirla desde otro dispositivo, y hay
 * una copia en el navegador por si la API no contesta. Lo que hay que evitar es
 * que una partida vieja o recién empezada pise la buena.
 */

import type { ClickerState } from '@sanatorio/contracts'

const LOCAL_KEY = 'sanatorio_clicker'
const REV_KEY = 'sanatorio_clicker_rev'
/** De quién es la copia: en un ordenador compartido no se retoma la de otra persona. */
const OWNER_KEY = 'sanatorio_clicker_owner'
const CAUGHT_KEY = 'sanatorio_clicker_caught'

/** La copia de este navegador y la `rev` de la API de la que salió. */
type LocalCopy = { save: string | null; rev: number | null }

/** La copia de este navegador, si es de `login` (o de antes de apuntar de quién era). */
export function readLocal(login: string): LocalCopy {
  try {
    const rev = localStorage.getItem(REV_KEY)
    const owner = localStorage.getItem(OWNER_KEY)

    if (owner !== null && owner !== login) return { save: null, rev: null }

    return { save: localStorage.getItem(LOCAL_KEY), rev: rev === null ? null : Number(rev) }
  } catch {
    return { save: null, rev: null }
  }
}

export function writeLocal(login: string, save: string, rev: number | null): void {
  try {
    localStorage.setItem(OWNER_KEY, login)
    localStorage.setItem(LOCAL_KEY, save)
    if (rev !== null) localStorage.setItem(REV_KEY, String(rev))
  } catch {
    // Sin almacenamiento local, queda la copia de la API.
  }
}

/**
 * La API ha vuelto después de fallar la carga, y mientras tanto se ha jugado
 * con la copia del navegador: ¿se puede seguir guardando esa partida encima?
 *
 * Solo si la API no tiene ninguna o si la copia salió de la misma `rev`. Si la
 * API tiene otra más nueva, se jugó en otro sitio y no se pisa.
 */
export function canResume(server: Pick<ClickerState, 'save' | 'rev'>, local: LocalCopy): boolean {
  return server.save === null || (local.save !== null && local.rev === server.rev)
}

/**
 * Al entrar, con qué partida se sigue: la de la API o la copia de este
 * navegador. La copia, si salió de la misma `rev` que tiene la API: es la
 * misma partida, guardada aquí después (cada 10 s), y puede ir muy por
 * delante. Pasa si los guardados en la API fallaron un rato con la pestaña
 * abierta: la sesión caducó de madrugada, se fue la red… Antes se entraba con
 * la de la API y se perdía lo de esas horas.
 */
export function startFrom(
  server: Pick<ClickerState, 'save' | 'rev'>,
  local: LocalCopy,
): string | null {
  return server.save !== null && local.save !== null && local.rev === server.rev
    ? local.save
    : server.save
}

/** Un identificador para esta pestaña: la API lo usa para saber quién guardó el último. */
export function newSession(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  }
}

/** La última trampa de la que ya se avisó en este navegador: su número. */
export function seenCaught(): number {
  try {
    return Number(localStorage.getItem(CAUGHT_KEY) ?? 0) || 0
  } catch {
    return 0
  }
}

/** Segundos de capital que se guardan a la espera de mandarlos, como mucho. */
const SAMPLES_KEPT = 900

/**
 * Apunta el capital de este segundo, si aún no se había apuntado. La API lo
 * guarda por minutos y mira si hay saltos raros.
 */
export function sample(samples: [number, number][], now: number, capital: number): void {
  const second = Math.floor(now / 1000)

  if ((samples.at(-1)?.[0] ?? 0) >= second) return

  samples.push([second, capital])
  if (samples.length > SAMPLES_KEPT) samples.splice(0, samples.length - SAMPLES_KEPT)
}

export function markCaught(caught: number): void {
  try {
    localStorage.setItem(CAUGHT_KEY, String(caught))
  } catch {
    // Sin almacenamiento, el aviso volverá a salir al recargar.
  }
}
