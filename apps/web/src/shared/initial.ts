/**
 * La inicial de un login, en mayúscula: lo que se pinta en lugar de la foto
 * (el avatar, el puesto del mapa, las caras de las demostraciones). Antes cada
 * sitio repetía `login.charAt(0).toUpperCase()`.
 *
 * Un login vacío da `''`, no un hueco con «undefined».
 */
export function initialOf(login: string): string {
  return login.charAt(0).toUpperCase()
}
