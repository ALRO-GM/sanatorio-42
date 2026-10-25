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

## El plano de los clústeres

La pestaña Clústeres pinta el plano igual de fábrica (`features/map/look.ts`):
la fila 1 abajo, el puesto 1 a la izquierda, y cada puesto un poco desplazado
hacia donde se sienta la persona, con el canto grueso del lado de su pantalla.
Opciones (se recuerdan en el navegador): invertir en vertical, en horizontal,
hacia dónde miran los asientos, y alinear sin desplazamiento.
