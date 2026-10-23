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
  // La demostración (`/demo/`) vive en el mismo dominio que la web de verdad, y
  // el navegador les daría el mismo almacenamiento: lo que alguien tocara en la
  // demo (el estilo, la partida de mentira) pisaría lo suyo de verdad. Aquí,
  // antes de que arranque nada, se le pone un prefijo a todo lo que la demo
  // guarde o lea.
  if (/^\/demo(\/|$)/.test(window.location.pathname)) {
    try {
      var storage = Object.getPrototypeOf(localStorage)

      ;['getItem', 'setItem', 'removeItem'].forEach(function (name) {
        var original = storage[name]

        storage[name] = function (key) {
          var args = Array.prototype.slice.call(arguments)

          args[0] = 'demo:' + key

          return original.apply(this, args)
        }
      })
    } catch {
      // Sin almacenamiento no hay nada que separar.
    }
  }

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

  // Comodidad (`src/shared/comfort.ts`): tamaño del texto, daltonismo y zen.
  try {
    var comfort = JSON.parse(localStorage.getItem('sanatorio_comfort') || '{}') || {}
    var sizes = [90, 100, 110, 125, 150]
    var width = window.screen.width
    var size =
      sizes.indexOf(comfort.text) >= 0
        ? comfort.text
        : width >= 2400
          ? 125
          : width >= 1800
            ? 110
            : 100

    if (size !== 100) root.style.fontSize = size + '%'
    root.dataset.cvd = comfort.cvd === true ? 'on' : 'off'
    root.dataset.zen = comfort.zen === true ? 'on' : 'off'
  } catch {
    // Sin almacenamiento: tamaño de fábrica.
  }

  if (vars !== null && typeof vars === 'object') {
    Object.keys(vars).forEach(function (name) {
      // Solo variables de CSS con un valor sencillo (como `paintable` de
      // `shared/theme`): lo guardado no puede tocar otra cosa.
      var value = String(vars[name])

      if (
        /^--[a-z0-9-]+$/.test(name) &&
        /^[#\w\s.,%()+\-/]{1,100}$/.test(value) &&
        !/url\s*\(/i.test(value)
      )
        root.style.setProperty(name, value)
    })
  }
})()
