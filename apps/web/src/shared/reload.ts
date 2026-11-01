/**
 * Volver a cargar la página entera. Es lo que hace «Reintentar» en cualquier
 * fallo (pedido por Alberto el 2026-11-01): recargar solo la pieza dejaba a
 * veces el resto de la página con datos viejos o a medias. En su propio módulo
 * para poder sustituirlo en los tests (jsdom no recarga).
 */
export function reloadPage(): void {
  window.location.reload()
}
