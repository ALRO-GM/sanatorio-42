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
(`GET /network/seats/heat?days=`, `features/map/SeatHeatMap.tsx`).

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
- **El plano de cada cual.** Cada clúster se completa como en el mapa (los
  puestos conocidos de `replica.knownSeats` y los del historial; lo que falta
  dentro del rectángulo sale a 0) y se dibuja con las opciones que la persona
  tiene puestas en la pestaña Clústeres (`features/map/look.ts`: filas, puestos,
  hacia dónde miran y el desplazamiento). Un clúster cada vez, con las mismas
  pastillas que el mapa; de entrada, el más usado.
- **Color.** Una sola tinta azul, de clara a oscura en el tema claro y de
  oscura a clara en el oscuro (secuencial, se lee con daltonismo); el puesto sin
  uso, vacío como un puesto libre. Leyenda de 0 al máximo, ficha al pasar o al
  enfocar («c2r3s4 · 37 h · 9 personas») y «Ver como tabla» con los puestos más
  y menos usados.
- Caché de 5 minutos por campus, mundo, ocultos y días, como el grafo.

## El plano de los clústeres

La pestaña Clústeres pinta el plano igual de fábrica (`features/map/look.ts`):
la fila 1 abajo, el puesto 1 a la izquierda, y cada puesto un poco desplazado
hacia donde se sienta la persona, con el canto grueso del lado de su pantalla.
Opciones (se recuerdan en el navegador): invertir en vertical, en horizontal,
hacia dónde miran los asientos, y alinear sin desplazamiento.
