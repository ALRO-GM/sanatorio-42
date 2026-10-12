/* global document, localStorage, window */

// Tema antes de pintar, para que el modo nocturno no arranque con un fogonazo
// blanco. Es la misma lógica que `src/shared/theme`.
//
// Va en un fichero y no escrito dentro de `index.html` para que la política de
// contenido (`infra/Caddyfile`) pueda prohibir todo script en línea.
;(function () {
  var choice = null
  var style = null

  try {
    choice = localStorage.getItem('sanatorio_theme')
    style = localStorage.getItem('sanatorio_style')
  } catch {
    // Sin almacenamiento (modo privado estricto): se sigue el tema del sistema.
  }

  var dark =
    choice === 'dark' ||
    (choice !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  // El estilo (letra, acento y formas): el clásico si no se ha elegido otro.
  document.documentElement.dataset.style =
    style === 'terminal' || style === 'historial' ? style : 'clinica'
})()
