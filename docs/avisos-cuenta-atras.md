# Avisos con cuenta atrás

Pedido por Alberto el 2026-10-25: en el clúster se limpian a menudo las
taquillas y se avisa con unos días o una semana de antelación. Quería un aviso
con cuenta atrás que se pueda dejar a la vista, cerrar o mantener, reutilizable
para otros eventos importantes, y que cada cual pueda ponerse los suyos (un
evento del calendario, el siguiente al que tiene que ir) en una ventanita como
la del Pomodoro.

## La ventanita

`features/countdowns/CountdownDock.tsx`, montada en toda la web (`Clinic.tsx`).
Flota abajo a la izquierda (el Pomodoro va a la derecha) y solo sale si hay
algo que contar.

- Cada cuenta atrás lleva su etiqueta (Aviso, Evento, Próximo, Tuya), el título,
  el texto si lo tiene, lo que falta (`4 d 20:54:12`) y la fecha. Menos de un
  día: el marcador en el color de aviso. Pasada la hora, «Ya ha pasado» durante
  30 minutos; después deja de salir.
- **Cerrar** un aviso de quien administra lo guarda la API: no vuelve a salir en
  ningún navegador. **Quitar** algo propio lo borra.
- Se **arrastra** por la cabecera y se vuelve a **anclar** con la chincheta; se
  **pliega** en una píldora con lo más cercano. Eso solo lo recuerda el
  navegador (`sanatorio_countdowns_pos`, `sanatorio_countdowns_min`). En el móvil
  empieza plegada, y si hay Pomodoro sube para no taparlo.
- «+» abre el formulario: **Mi próximo compromiso** o **algo tuyo** (título,
  día y hora).

## De dónde salen

- **Avisos de quien administra**: pestaña **Cuentas atrás** del panel. La
  **limpieza de taquillas** va con su texto ya escrito en los cuatro idiomas
  (`countdown.lockers.*`: se abren todas y se tira lo que haya dentro) y solo
  pide el día y la hora. Otro aviso lleva título y, si se quiere, texto. Se
  manda a todo el mundo, a los estudiantes o a los piscineros (los mundos
  separados de `docs/piscineros.md`) y, si se marca, solo a quien mira ese
  campus. El panel enseña cuánta gente lo ha cerrado y deja retirarlo.
- **Un evento del calendario**: «Fijar cuenta atrás» en su ficha (pizarras,
  sprints, on-call, correcciones, exámenes, eventos de 42…), si aún no ha
  empezado. La API lo busca en tu calendario y guarda su título y hora.
- **Tu próximo compromiso**: lo primero que empieza a partir de ahora y a lo
  que vas (lo apuntado, lo tuyo, una corrección o un examen; no las franjas en
  las que te ofreces a ayudar ni los eventos a los que no vas). Se busca en cada
  petición, así que cambia solo cuando pasa. Sin nada a la vista en 60 días, lo
  dice.
- **Uno tuyo**: título, día y hora.

Como mucho 12 propias a la vez; fijar dos veces lo mismo no lo repite.

## Cómo funciona

- Tablas (migración 73): `countdown_notices` (los avisos, con `target_group`
  y `campus_id`), `countdown_dismissals` (quién ha cerrado cuál) y
  `countdown_pins` (lo de cada cual). Las tres van en la descarga de datos.
- `modules/countdowns`: el calendario le da los eventos (`calendar.between`,
  sin pedir nada nuevo a 42).
- El pulso trae `countdowns`, una huella de los avisos que tienes a la vista:
  si llega uno nuevo o se retira, cambia y la ventanita los vuelve a pedir. Sin
  sondeo propio.
- Un piscinero recibe los avisos siempre (`/countdowns` en `POOL_BASE`); fijarse
  algo va con el permiso del calendario.
- En la API simulada hay una limpieza de taquillas esperando (el viernes que
  viene a las 9:00), también en la demostración pública.

Rutas en [api.md](api.md#avisos-con-cuenta-atrás-modulescountdowns).
