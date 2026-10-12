/* global document, localStorage, window */

// El aspecto antes de pintar, para que el modo nocturno no arranque con un
// fogonazo blanco ni el estilo elegido con el de fábrica. Es la misma lógica
// que `src/shared/theme`.
//
// No sabe qué estilos hay: pone el que esté guardado, y las variables de su
// paleta tal como se guardaron. Si ese estilo ya no existe, la web lo corrige
// al arrancar.
//
// Va en un fichero y no escrito dentro de `index.html` para que la política de
// contenido (`infra/Caddyfile`) pueda prohibir todo script en línea.
;(function () {
  var choice = null
  var style = null
  var vars = null

  try {
    choice = localStorage.getItem('sanatorio_theme')
    style = localStorage.getItem('sanatorio_style')
    vars = JSON.parse(localStorage.getItem('sanatorio_palette_vars') || '{}')
  } catch {
    // Sin almacenamiento (modo privado estricto): se sigue el tema del sistema.
  }

  var root = document.documentElement
  var dark =
    choice === 'dark' ||
    (choice !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  root.dataset.theme = dark ? 'dark' : 'light'
  root.dataset.style = style !== null && /^[a-z0-9-]{1,30}$/.test(style) ? style : 'clinica'

  if (vars !== null && typeof vars === 'object') {
    Object.keys(vars).forEach(function (name) {
      // Solo variables de CSS: lo guardado no puede tocar otra cosa.
      if (/^--[a-z0-9-]+$/.test(name)) root.style.setProperty(name, String(vars[name]))
    })
  }
})()
