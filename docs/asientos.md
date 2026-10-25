# Red de asientos

Pedida por Alberto el 2026-10-25: en la pestaña Red, al lado de la red de
correcciones, otra red que muestra con quién se sienta cada cual en los
clústeres. Pensada para la piscina (un piscinero la ve primero), y también la
tienen los estudiantes, cada mundo con los suyos (`docs/piscineros.md`).

## De dónde sale

La copia de los puestos (`replica/syncer.ts`, `GET /campus/:id/locations`)
pasa cada 2 minutos con gente en la web y cada 5 sin nadie (antes, 15). Son
1-4 peticiones por campus: con tres campus, como mucho unas 150 a la hora de
las 1 200.

Cada foto, además de la presencia, apunta en `seat_sessions` (migración 71)
cada sesión de 42 en un puesto: `location_id`, persona, puesto, cuándo empezó
(`begin_at` de 42) y la última vez que se la vio abierta (`seen_at`). Es el
historial de horas de dónde se ha sentado cada cual. Se guarda la sesión
entera, no la cuenta, para poder cambiar después cómo se mide la cercanía, los
grupos de amigos o el aislamiento sin perder nada. Está en la lista de datos
personales (se exporta y se borra con lo demás).

**Las horas cuentan desde que se ve la sesión** (`first_seen_at`, migración
79), no desde el `begin_at` de 42. Si 42 da una entrada más de 15 minutos
anterior a la primera foto en que sale, no se estaba mirando: un puesto de
examen que no se reinicia bien no echa a nadie por inactividad y la sesión
puede seguir abierta días (pasó con una sesión abierta desde el 21 de octubre,
que salía con 103 h). Además, **una sesión cuenta como mucho 12 h seguidas**.

## Cómo se mide

Viendo el plano en vertical, la fila 1 es la de abajo y suben hacia arriba.
Cada fila es una mesa larga; el puesto 1 está a la izquierda, los impares
miran al norte y los pares al sur:

    Fila 3: 1N 2S 3N 4S 5N 6S
    Fila 2: 1N 2S 3N 4S 5N 6S
    Fila 1: 1N 2S 3N 4S 5N 6S

Desde 2·3N, los puestos donde suele sentarse un amigo, con su peso
(`network/seating.rules.ts`, `SEAT_WEIGHTS`):

| Vecino                         | Puestos         | Peso |
| ------------------------------ | --------------- | ---- |
| Al lado, mirando igual         | 2·1N y 2·5N     | 3    |
| Enfrente, en diagonal          | 2·2S y 2·4S     | 2    |
| La fila de atrás               | 1·2S y 1·4S     | 1,5  |

Para un puesto sur es lo mismo hacia la fila de arriba, así que el peso es el
mismo en los dos sentidos. Lo demás no cuenta.

La **cercanía** de dos personas es la suma, sesión a sesión, de las horas que
han estado sentadas a la vez por el peso de sus puestos. Una pareja sale en el
grafo con 2 o más. Por persona: horas en un puesto, cercanía total, con
cuántas se ha sentado cerca, la parte de sus horas **sin nadie cerca**
(aislamiento) y sus tres puestos más usados. Las comunidades (grupos de
amigos) salen con el mismo Louvain que la red de correcciones.

## Dónde se ve

`GET /network/seats?days=` (`docs/api.md`), en la web `features/network/SeatsPage.tsx`
dentro de la pestaña Red (`RedPage.tsx`). Para piscineros, permiso
`red.seats` en el panel (dentro de la Red).

## Mapa de calor

Pedido por Alberto el 2026-10-25: debajo del grafo, en Datos → Red →
Asientos, cuánto se ha usado cada ordenador del clúster en el mismo periodo
(`GET /network/seats/heat?days=`, `features/network/SeatHeatMap.tsx`).

- **Las mismas horas que el grafo.** Las sesiones salen de
  `network/seating.sessions.ts` (`seatSessionsIn`), que usan los dos: desde
  `first_seen_at` menos 15 minutos de margen, 12 h como mucho por sesión y
  recortadas al periodo. Las horas de un puesto son la suma de sus sesiones;
  además, cuántas personas distintas se han sentado en él.
- **Solo la gente que ves.** Cuenta las horas de quien sale en la red de
  asientos de quien mira: un estudiante, las de estudiantes; un piscinero, las
  de su piscina; y nadie oculto a su grupo (`docs/personas-ocultas.md`). Se
  eligió así, y no contar a todo el mundo, para que el mapa y el grafo sumen lo
  mismo y para que una persona oculta no deje rastro de dónde se sienta. No
  lleva nombres: solo horas y número de personas por puesto.
- **Todos los clústeres a la vez, en miniatura** (rediseño pedido por Alberto
  el 2026-10-25). Cada clúster es una cuadrícula plana, sin imitar el plano:
  nada de girar, desplazar ni canto de pantalla, y no sigue las opciones de la
  pestaña Clústeres. **La fila 1 va arriba** y el puesto 1 a la izquierda, como
  en una tabla; los números de puesto van encima y los de fila a la izquierda,
  pequeños. Las miniaturas van una al lado de otra y bajan de línea si no caben;
  en el móvil, la que no quepa a lo ancho se desliza sola. El plano se completa
  como en el mapa (los puestos conocidos de `replica.knownSeats` y los del
  historial; lo que falta dentro del rectángulo sale a 0).
- **Las cuentas de cada clúster**, debajo: uso total en horas, ordenadores
  usados de los que tiene («Ordenadores usados: 54 de 60») y personas
  **distintas** que se han sentado en él. Las horas y la gente las da la API
  por clúster (`hours` y `people` en `seatHeatOf`): la gente se cuenta con los
  logins, no sumando la de cada puesto, porque quien cambia de puesto es una
  sola persona.
- **Color.** Las casillas son suyas (`.heat-cell` en `network.css`), no los
  puestos del mapa (`.seat`). Por reutilizar estos salía un puesto «blanco con
  una marca azul arriba»: el relieve del mapa (el canto grueso de la pantalla,
  el fondo de tecla, el desplazamiento) seguía debajo del color, y en el tema
  oscuro el puesto más usado era casi blanco (`#e3effd`), así que solo se veía
  el canto. Ahora la escala va de **azul oscuro (lo menos usado) a rojo intenso
  (lo más)**, pasando por un gris lila claro, en cinco paradas:

  | Tema   | 0 (mínimo) | 1         | 2 (medio) | 3         | 4 (máximo) |
  | ------ | ---------- | --------- | --------- | --------- | ---------- |
  | Claro  | `#004296`  | `#4c82c6` | `#bab4c9` | `#e37f65` | `#be2323`  |
  | Oscuro | `#4f97ef`  | `#3a69ad` | `#453e53` | `#a64736` | `#f75e54`  |

  Los extremos son saturados y se separan del fondo y el centro casi no tiene
  color, así que no depende solo del tono: con daltonismo rojo-verde el rojo
  pasa a pardo pero sigue lejos del azul y del centro por la luz. Comprobado
  con `validate_palette.js` de la skill dataviz (todas las parejas): ΔE ≥ 13
  en claro y ≥ 11 en oscuro con protanopía y deuteranopía, y ≥ 15 con visión
  normal. El centro queda por debajo de 3:1 con el fondo a propósito (es lo
  «normal»); lo compensan la ficha y la tabla. En el tema oscuro las paradas
  se eligieron otra vez, no se invirtieron: extremos claros y vivos, centro
  oscuro. Es un código de color como los del mapa: igual en todos los estilos.
  La escala va del puesto **menos usado** al más usado de todo el campus (no
  desde 0), en línea recta; el puesto **sin uso no lleva color**, solo el
  contorno. Leyenda: «Sin uso» y la rampa con las horas mínima y máxima.
- Ficha al pasar o al enfocar («c2r3s4 · 37 h · 9 personas»), con su
  `aria-label` en cada casilla. Cada clúster es una sola parada del tabulador y
  las flechas se mueven por la cuadrícula. «Ver como tabla» lista los puestos
  de todos los clústeres, con su clúster, del más al menos usado.
- Caché de 5 minutos por campus, mundo, ocultos y días, como el grafo.

## El plano de los clústeres

La pestaña Clústeres pinta el plano igual de fábrica (`features/map/look.ts`):
la fila 1 abajo, el puesto 1 a la izquierda, y cada puesto un poco desplazado
hacia donde se sienta la persona, con el canto grueso del lado de su pantalla.
Opciones (se recuerdan en el navegador): invertir en vertical, en horizontal,
hacia dónde miran los asientos, y alinear sin desplazamiento.
