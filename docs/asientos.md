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

## Historial hacia atrás (2026-10-27)

Pedido por Alberto: que la red tenga todo el historial de 42, no solo desde el
día en que se empezó a mirar. 42 guarda cada sesión de cada puesto
(`GET /campus/:id/locations?range[begin_at]=…`): Madrid son 7 000-13 000 al mes,
unas 850 000 desde 2019 y unas 8 500 peticiones.

- `replica/seat-history.ts`, trabajo de volumen `seats` (detrás de las
  correcciones, `BULK_ORDER`): un mes cada vez, de hoy hacia atrás, página a
  página, con el sitio guardado en `sync_state` (`seats-history:<campus>`). Un
  campus detrás de otro, por el orden de `SYNC_CAMPUS_IDS`: **Madrid primero**.
  Acaba al llegar al primer alumno del 42cursus del campus.
- **Solo alumnos, como siempre**: una sesión entra si quien se sentó está en el
  42cursus del campus (`core_cursus`) y la sesión empezó cuando ya lo estaba.
  La piscina (quien no pasó, y el mes de piscina de quien sí) no entra. Las
  sesiones abiertas las apunta la copia de puestos.
- Las sesiones históricas se guardan como las vistas en directo, con
  `first_seen_at` = su entrada y `seen_at` = su salida, y cuentan igual (12 h
  como mucho por sesión). Una que ya apuntó la copia de puestos no se toca,
  solo se alarga hasta su salida de verdad.
- `npm run sync:status` dice por dónde va cada campus.

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

## Recortar el grafo

Pedido por Alberto el 2026-10-28: el grafo salía demasiado entrelazado. Tiene
tres opciones, como la red de correcciones pero menos, que recortan en la web
y al momento, sin volver a pedir nada (`features/network/seat-trim.ts`):

- **Las más cercanas de cada cual** (1 a 10, o todas; de fábrica, 5): de cada
  persona solo se guardan las que más cercanía tienen con ella.
- **Hasta reunir este tiempo acompañado** (50 % a 100 %; de fábrica, 80 %): de
  cada persona se cogen sus parejas de la más a la menos cercana hasta reunir
  esa parte de su cercanía total (siempre la primera). Quien pasa la mitad del
  tiempo con dos personas y el resto repartido entre muchas, con el 50 %, se
  queda solo con esas dos. Las dos opciones van juntas: manda la que corte
  antes.
- Sin nadie elegido, **una unión se queda si es de las cercanas de cualquiera
  de las dos personas**: a quien solo se sienta con alguien muy sociable no se
  le queda sin nadie. La gente sale toda.
- **Al elegir a alguien, solo sus conexiones** (casilla, marcada de fábrica):
  esa persona y sus más cercanas, con las mismas dos opciones, y solo sus
  uniones con ella, sin las de las demás entre sí, para que se vea despejado.
  Se elige pinchando en el grafo, en las listas de la ficha o con el buscador
  de personas (las de más horas, primero). Pinchar en otra persona del grafo
  pasa a sus conexiones; vaciar el buscador o cerrar la ficha vuelve a todas.
- Bajo el grafo, «Se ven N de M uniones» cuando algo queda fuera.

La ficha de cada persona sigue enseñando sus 8 parejas más cercanas, se vean o
no en el grafo.

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
  nada de desplazar ni canto de pantalla. **Filas y puestos van en el orden
  del plano de cada cual** (pestaña Clústeres): de fábrica, la fila 1 abajo y
  el puesto 1 a la izquierda; con «Invertir en vertical» u «horizontal», al
  revés (pedido por Alberto el 2026-10-26); los números de puesto van encima y los de fila a la izquierda,
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

### Clústeres grandes

Pedido por Alberto el 2026-10-26 al mirar París (campus 1) con el selector de
campus: los clústeres de allí (`f0`, `f1`, `f1b`, `f2`, `f4`, `f6`, de unos
13 × 23 puestos) no cabían y había que deslizar el plano de lado, y moverse
por él gastaba mucha CPU.

- **Nombres.** `parseHost` (API, `modules/map/seat-layout.ts`) y `parseSeat`
  (web, `shared/seats.ts`) leen igual `f1r11s15` (clúster `f1`) y `f1br2s8`
  (`f1b`, la entreplanta de la planta 1). Los nombres cortos de letra y número
  que no son `c1`, `c2`… se enseñan en mayúsculas, como se rotulan allí: «F1B»
  en la pastilla y «F1B · Fila 2 · Puesto 8» en la ficha. «Clúster F1B» no
  cabría en las pastillas y no es como lo llama nadie; `c1` sigue siendo
  «Clúster 1». Lo demás (`bess-f1`, `made-f0a`) va tal cual.
- **«Puestos» de broma.** Las cuentas del staff y los bots (norminet en
  `POISSON POISSON POISSON 🐟🐟🐟`, `Hogwarts`, `Frozen 🥶`, `bocal`, `oven`…)
  no son puestos: `parseHost` da `null` si no acaban en `r<fila>s<puesto>` o
  si el clúster no es letras, números y guiones (16 como mucho), así que no
  forman clúster. En el mapa salen en «Sin sitio en el plano», como antes; en
  el mapa de calor y la red de asientos, no cuentan. Comprobado con la copia
  de producción del 2026-10-26: de 2403 nombres de puesto que se colocan,
  ninguno cambia; los que no se colocaban siguen sin colocarse.
- **Erratas.** El plano se completa dentro del rectángulo de los puestos
  vistos de cada clúster, así que un número mal escrito (`f1r13s93` en un
  clúster de 23 por fila) lo convertía en una cuadrícula gigante. Ahora el
  tamaño sale de `clusterBounds`: de cada clúster, filas y puestos se miden
  por separado, del número más bajo visto hacia arriba, y cada número entra
  solo si no pasa del doble de lo que ya mide más 10 (`MIN_JUMP`); nunca pasa
  de 50 (`MAX_LINE`). Lo que queda fuera no se dibuja: si hay alguien
  sentado, sale en «Sin sitio en el plano»; en el mapa de calor, sus horas
  siguen en las cuentas del clúster pero sin casilla. Un clúster del que solo
  hay erratas no sale. La regla es holgada a propósito: en producción hay
  campus vistos a medias (filas 1, 8, 15 y 16 de un clúster), y ninguno de
  los 89 clústeres de la copia cambia de tamaño con ella.
- **Caber a lo ancho** (`features/map/fit.ts`). El plano mide su caja
  (`ResizeObserver`) y encoge los puestos hasta que la fila cabe: el tamaño
  llega en `--seat` y `--seat-gap`, y lo demás (relieve, desplazamiento,
  cantos) va en proporción. Según lo que quede, tres formas: con cara
  (28 px o más), con la inicial (18–27 px) y solo el color, como un punto
  (8–17 px). Con iniciales o puntos los puestos van planos, sin sombras ni
  degradados, y el color de cada estado pasa al fondo (dorado, verde, azul,
  elegido). Por debajo de 8 px no se encoge más y el plano vuelve a
  deslizarse. Si el clúster no cabe a tamaño real (48 px; 40 px en una caja
  de 520 px o menos), sale «Ajustar» / «100 %» a la derecha de los
  resaltados; «100 %» lo deja a tamaño real, con caras, y se recuerda con el
  resto de la vista (`fit` en `look.ts`). Los de Madrid caben y no cambian.
  En un móvil de 390 px, un clúster de 30 puestos por fila cabe con puntos.
- **CPU.** Lo que más costaba era que cada movimiento del ratón sobre el
  plano (la ficha que flota) volvía a pintar todos los puestos: unos 600
  botones con ocho manejadores nuevos cada uno, su `aria-label` y su cara.
  Ahora la cuadrícula (`SeatGrid`) y cada puesto (`SeatButton`) van
  memorizados y reciben solo valores sueltos; los clics y el ratón los recoge
  la cuadrícula con un manejador por evento (delegación, con `data-host`); los
  valores de fábrica (`picked`, `showReservation`) son constantes del módulo.
  Pasar el ratón, abrir una ficha o el refresco del mapa del Peer to peer
  (cada minuto, con lo mismo) ya no repintan los puestos. Además: la ficha
  fijada sigue a su puesto como mucho una vez por fotograma; las caras se
  piden al acercarse (`loading="lazy"`), se decodifican aparte
  (`decoding="async"`) y van con `key={login}`, para que el «no ha cargado»
  de alguien no pase a quien se siente luego en el mismo sitio; el apagado de
  los resaltados es solo opacidad (el `filter: grayscale` en cientos de
  puestos era caro de pintar); y con iniciales o puntos no hay sombras,
  degradados ni el brillo animado del «perfecto». Un puesto son 1,65 nodos
  de media (el botón y, si hay alguien, su cara o inicial y el punto de «con
  Peer4U abierto»). El mapa de calor (`SeatHeatMap`) tenía lo mismo: al pasar
  el ratón repintaba todas las casillas de todos los clústeres y la tabla
  plegada con todos los puestos; ahora clústeres y tabla van memorizados.
  Medidas del 2026-10-26 (traza de Chrome sin pantalla, compilado de
  producción del simulado, París de mentira con `f1` de 20 × 30 y 267
  personas; mediana de tres pasadas, ms de hilo principal ocupado):

  | Acción (escritorio, 1280 px)            | Antes     | Ajustar    | 100 %     |
  | --------------------------------------- | --------- | ---------- | --------- |
  | Ratón por 60 puestos (solo script)      | 630 (207) | 365 (65)   | 552 (79)  |
  | Cambiar de clúster tres veces           | 162       | 154        | 183       |
  | Invertir en horizontal y volver         | 120       | 36         | 81        |
  | Resaltar «Mi círculo» y quitarlo        | 56        | 56         | 64        |

  En el móvil (390 px), cambiar de clúster tres veces pasa de 173 a 108 ms e
  invertir, de 83 a 49. Con el servidor de desarrollo (React sin compilar),
  el script de pasar el ratón por 60 puestos bajó de 464 a 185 ms. Lo que
  queda al pasar el ratón es sobre todo pintar y componer la ficha flotante.
- **El simulado** (`shared/api/mock/paris.ts`): al elegir París en el pie,
  un campus con `f0`, `f1` (20 × 30), `f1b` (vacío), `f2`, `f4` y `f6`, unos
  500 sentados con logins inventados, algunos ocupados sin cara, algún puesto
  roto y dos «puestos» de broma sin sitio. Como la API, cuenta como ocupado
  también a quien no se ve.
- **Las cuentas de las pastillas.** Cada pastilla lleva la gente sentada en
  el clúster (`occupied` de la API: con cara o sin ella), también cuando es 0.

