/**
 * Referencias a lo que se monta después.
 *
 * Algunos módulos preguntan a otros que se construyen más tarde (el perfil
 * pregunta al Code Clicker, y el Code Clicker al perfil). En vez de cierres que
 * capturan un `const` aún sin inicializar, la composición pide aquí lo que
 * necesita y lo conecta todo de una vez con `wire()` al final. Usarlo antes es
 * un error con nombre, no un `ReferenceError` en el arranque.
 */
export function createLate<T extends object>() {
  let wired: T | null = null

  return {
    /** Lo conectado con esa clave. Falla si aún no se ha llamado a `wire()`. */
    get<K extends keyof T>(key: K): T[K] {
      if (wired === null) {
        throw new Error(`«${String(key)}» aún no está montado: no se usa mientras se construye`)
      }

      return wired[key]
    },
    /** Si ya está todo conectado. */
    ready: (): boolean => wired !== null,
    /** Conecta lo que se montó después. Una sola vez. */
    wire(all: T): void {
      if (wired !== null) throw new Error('Ya estaba conectado')
      wired = all
    },
  }
}
