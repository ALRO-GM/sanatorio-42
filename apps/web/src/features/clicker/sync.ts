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

/** La copia de este navegador y la `rev` de la API de la que salió. */
export type LocalCopy = { save: string | null; rev: number | null }

export function readLocal(): LocalCopy {
  try {
    const rev = localStorage.getItem(REV_KEY)

    return { save: localStorage.getItem(LOCAL_KEY), rev: rev === null ? null : Number(rev) }
  } catch {
    return { save: null, rev: null }
  }
}

export function writeLocal(save: string, rev: number | null): void {
  try {
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

/** Un identificador para esta pestaña: la API lo usa para saber quién guardó el último. */
export function newSession(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  }
}
