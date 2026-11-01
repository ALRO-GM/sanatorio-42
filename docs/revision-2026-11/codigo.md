# Revisión del código (1 de noviembre de 2026)

Revisión de la API (sin `modules/quiz` ni `modules/startup`), de
`apps/web/src/shared` y de los tests, con arreglos en la rama
`revision-codigo`. Parte de las revisiones de octubre
(`docs/revision-seguridad.md`, `docs/revision-2026-10/`): lo que allí se dio
por arreglado se comprobó por encima (la barrera de `/admin/` sobre la ruta
descodificada, los ids de evento, Slack, la exportación) y sigue en su sitio.
Aquí solo va lo nuevo, casi todo de lo añadido después del 23 de octubre
(piscineros, red de asientos, mapa, exámenes en vivo).

Cifras de partida: API con 2 549 tests y 98,7 % de líneas (90,6 % de ramas);
web con 786 tests y 80,3 % de líneas (67,3 % de funciones, 83,8 % de ramas).
Los mínimos de cobertura estaban en 96/96/96/89 (API) y 64/64/51/79 (web).

## Seguridad

| Id | Gravedad | Qué | Estado |
| --- | --- | --- | --- |
| S1 | Media | Un estudiante veía a piscineros de **otro** campus | Arreglado |
| S2 | Media | Un piscinero avisaba a todos los estudiantes de un proyecto | Arreglado |
| S3 | Media | Red de asientos recalculable sin tope y sin final de periodo | Arreglado |
| S4 | Baja | El login de quien avisa de un puesto roto, para todos | Arreglado |
| S5 | Baja | Esquemas sin tope (`from`/`to` del informe, `title`) | Arreglado |
| S6 | Baja | La web no arrancaba con el almacenamiento bloqueado | Arreglado |
| S7 | Baja | Parámetros que llegan al servicio sin pasar por zod en la ruta | Pendiente |
| S8 | Baja | Huecos en los puestos de las clasificaciones | Pendiente |
| S9 | Baja | Perfil por login: puede gastar cuota de 42 | Pendiente |
| S10 | Duda | El mapa enseña piscineros a los estudiantes | Por decidir |

### S1. Mundos separados solo dentro del campus (media, arreglado)

`seesFor` (`core/audience.ts`) separaba los mundos con
`poolIn(actor.campusId)`: un estudiante no veía a los piscineros **de su
campus**, pero sí a los de cualquier otro. Los de otros campus están en la
réplica (los exámenes de la piscina traen a su gente con `ingestProjectUsers`,
y un piscinero que se sienta en otro campus sale en sus puestos), así que
`GET /users/:login/profile` devolvía su XP, logros y estado de salud, y
`/people/:login/card` sus proyectos y su puesto. Confirmado con un test que
falla sin el arreglo.

Arreglo: `Audience.poolAnywhere()` (todos los piscineros en curso, de
`pool_members`, guardado un minuto como `poolIn`) y, para un estudiante,
fuera los de su campus y los de cualquier otro. Un piscinero sigue viendo solo
a los de su campus y no lee la lista entera. `network.service` ya lo hacía a
su manera (`seesIn` por cada campus mirado) y no cambia.

Tests: `tests/unit/audience-hidden.test.ts` (mundos, mayúsculas, a sí mismo,
caché y fallo de lectura), `tests/unit/pool-members.test.ts`
(`loginsAnywhere` sin repetir ni piscinas pasadas) y
`tests/integration/hidden-people.test.ts` (perfil, ficha y buscador por
HTTP).

### S2. Avisos de terapia entre mundos (media, arreglado)

`therapy.invite` avisaba a `replica.doingProject(...)` sin pasar por quién ve a
quién. `terapia` está en los permisos de fábrica de los piscineros y `create`
acepta cualquier proyecto, así que un piscinero podía abrir un grupo de
`libft` y mandar un aviso con su login a cada estudiante que lo hace. Tampoco
se miraban los ocultos, en ningún sentido.

Arreglo: solo se avisa a quien ve quien avisa (`seesFor`), y nadie si quien
avisa está oculto a su grupo. Test en `tests/unit/therapy.test.ts`.

### S3. Red de asientos sin tope (media, arreglado)

`GET /network/seats` y `/network/seats/heat` llevan el periodo en la clave de
una caché de 12 entradas y no tenían tope por persona (la red de correcciones
sí: 20 análisis nuevos por minuto). Además la consulta solo acotaba
`seen_at >= desde`: un periodo de 2016 leía toda la historia del campus.

Arreglo: el mismo tope (20 periodos nuevos por persona y minuto, entre los
dos), `AND begin_at < hasta` en la consulta y las fechas con el esquema `day`
(antes, una expresión regular propia). Tests en
`tests/integration/seats.test.ts`.

### S4. Quién avisó de un puesto roto (baja, arreglado)

`MapSeat.broken.by` salía siempre, también a quien no puede ver a esa persona
(otro mundo, oculta). La web no lo usa. Ahora es `null` si quien avisó no sale
con nombre en el plano para quien mira (contrato `by: string | null`). Test en
`tests/unit/therapy.test.ts`.

### S5. Esquemas sin tope (baja, arreglado)

`reportSchema` de `meet` admitía cualquier texto en `from`/`to` (se validaba
después en `attendance`); ahora usa `day`. `title` de `PUT /me/settings` lleva
un tope de 60.

### S6. Almacenamiento bloqueado (baja, arreglado)

`initialLang` (que `main.tsx` llama antes de pintar) y `setLang` leían y
escribían `localStorage` sin `try`: con el almacenamiento bloqueado (modo
privado de algunos navegadores, cookies de terceros bloqueadas) la web se
quedaba en blanco. Igual `loadPace`/`savePace`, que tiraban el grafo del
tablón. Además `isLang` usaba `in`, que da por idioma `constructor` o
`toString`; ahora usa `Object.hasOwn`. Tests en
`apps/web/tests/lang-storage.test.ts` y `pace-storage.test.ts`.

### Pendiente de seguridad

- **S7 (baja).** Varias rutas pasan `request.params`/`request.query` crudos
  al servicio, que sí los valida (regex o zod): `profile.routes.ts:45,51,71`,
  `map.routes.ts:38,47`, `meet/index.ts:32-33,84,114`,
  `calendar.routes.ts:35-36`, `stats/index.ts:153`. No hay fallo, pero
  incumple la regla de validar en el borde. Se deja porque cada cambio toca
  una ruta y su test, sin ganancia de seguridad.
- **S8 (baja).** En `/leaderboard` y `/stats` el puesto se calcula antes de
  `visibleTo`: los huecos dicen cuánta gente oculta o del otro mundo va por
  delante. Arreglarlo cambia los puestos que se enseñan: decisión de producto.
- **S9 (baja, sospecha).** `GET /users/:login/profile` puede pedir a 42 los
  hitos de cada login nuevo (uno por persona y día). Un guion que recorra el
  campus gastaría cuota. No se comprobó si el escalón de cuota ya lo frena;
  la solución sería un tope por persona en las peticiones que piden a 42.
- **S10 (por decidir).** El plano (`map.service.ts`, `named`) enseña a los
  estudiantes a todo el que está sentado, piscineros incluidos, con login y
  proyectos; el comentario dice que es a propósito («es lo que hay en la
  sala»), pero choca con «un estudiante no ve a ningún piscinero» de
  `audience.ts` y con el 404 de su ficha. Hay que decidir cuál vale.

### Comprobado y bien

La barrera de piscineros (`pool.keys.ts`) es una lista de permitidos por
plantilla de ruta: lo que no está da 403, y `/admin/` no está. Zod con
`.strict()` en `pool.service`, escape de `LIKE` y tope en `hidden.service`,
topes de `limit`/`offset` en `/stats/ranking`, `with` de `/stats/progress`
acotado y del mismo campus para un piscinero, exámenes en vivo con el mundo
de la sesión, `assertParticipant` en `meet` para cada tipo de conversación,
calendario con 62 días como mucho, SQL siempre con parámetros o `inList`, y
sesiones de staff solo en `/staff/`. En la web, el único
`dangerouslySetInnerHTML` sigue siendo el QR local, los `href` de datos pasan
por `shared/links.ts` (`externalHref` en el calendario) y no hay `innerHTML`,
`eval` ni `new Function`.

## Código repetido

Arreglado:

- **API, fechas.** 76 `new Date(x).toISOString()` (con y sin `.slice(0, 10)`)
  y cuatro copias locales de `iso`, `dayOf` y `monthOf` pasan a
  `isoAt`/`dayOf`/`monthOf` de `core/time.ts` (nuevo `monthOf`). Quedan las de
  `app/composition.ts` (fichero compartido) y `quiz`/`startup` (de otros).
- **Web, fechas.** Cuatro paneles (`FlowsPanel`, `GrowthPanel`, `StatsPanel`,
  `HoursReport`) dejan su copia de `dayOf` por la de `shared/period.ts`. Las
  fechas largas de la sala de ayuda, el calendario de pizarras, los exámenes y
  las reservas del mapa, y la hora de los exámenes, salen de `useFormat`; la
  cuenta atrás de los exámenes, de `clock` (`shared/time.ts`).
- **Web, cuentas.** `shared/math.ts` con `clamp` y `timeLeft`: la cuenta de
  lo que le queda a una pregunta estaba igual en las dos salas de Not games, y
  el `clamp` en el deslizador, los colores de la red y el Clicker.

Pendiente (encontrado, no hecho para no reestructurar pantallas que otro
agente está cambiando):

- **Carga y error a mano tras `useAsync`** (≈17 sitios, casi todo `admin/`):
  `if (loading) … ErrorNote …` en vez de `<Async>`. Mecánico.
- **Título de sección con `InfoTip`** (17 pantallas): `<h2>{t(k)}<InfoTip
  title={t(k)}>…</InfoTip></h2>`. Propuesta: `SectionTitle({ title, children,
  level })` en `shared/ui`.
- **Gráfica con panel de opciones** (Avance, Avance de la piscina, uso de la
  API): `div.progress-layout > article.card + aside.card.progress-rail`.
  Propuesta: `ChartWithRail({ chart, rail, railLabel })`.
- **Sondeo a mano** en `gitcourse/GroupRoom.tsx` (dos `setInterval` con
  `document.hidden`, lo que hace `usePolling`) y carga casi igual en
  `notgames/RoomView.tsx` y `TurnRoomView.tsx` (un `useRoom` común).
- **Pastillas a mano** en `ExamsPage`, `Mailbox`, `EventRoom`,
  `ClusterMapView` y `HolyGraph` que podrían ser `PillGroup`.
- **Más estilos de fecha** en `useFormat` para las ~12 llamadas a
  `toLocale*String` que no casan con los que hay (día, mes corto y año de dos
  cifras; fecha y hora `medium`/`long`; etc.).
- **Inicial de un login** (`charAt(0).toUpperCase()`) en `SeatFace`,
  `ClusterMapView` y cinco demos: `initialOf` en `shared`.
- **`useNow` propio** en `ExamsPage` (se pone en hora al llegar datos): se
  deja, porque el de `shared/hooks` no se reajusta y la cuenta atrás saldría
  un segundo por encima al refrescar.

## Piezas comunes de la web (inventario)

`shared/hooks`: `useAsync`/`useAction`, `usePolling`, `useNow`, `usePulse`,
`useMediaQuery`, `usePeopleSearch`, `useGateQueue`. `shared/ui`: `Async`,
`ErrorNote`, `InfoTip`, `PillGroup`, `StepPicker`, `PeriodPicker`,
`CampusPicker`, `DetailCards`, `ProjectPills`, `DataTable`, `RankingList`,
`Modal`/`useConfirm`, `DayTimeFields`, `RangeSlider`, `SegmentSlider`,
`CountdownClock`, `Avatar`, `PersonLink`, `PersonInput`, `PeopleResults`,
`Qr`, `TitleBanner`, `ReportButton`, `PoolOnly`, `FocusBadge`, `Icon`.
Tiempo: `shared/time.ts` (`clock`, `durationText`), `shared/day.ts`
(`dayKey`, `hhmm`, `clockOf`), `shared/period.ts` (`dayOf`, `periodOf`),
`useFormat`. Nuevo: `shared/math.ts`. No hay aún pieza común para la gráfica
con panel de opciones ni para el título de sección.

## Tests y casos límite

Nuevos: los de cada arreglo de arriba, más `apps/web/tests/report-errors.test.ts`
(`shared/errors.ts`: tope de cinco por carga, recortes a 300/2 000, sección
rara, envío que falla) y `math.test.ts` (bordes, `NaN`, infinitos, tramo vacío
o al revés). Cobertura al terminar: API 98,7 % de líneas y 90,6 % de ramas
(2 559 tests); web 80,3 % de líneas, 67,3 % de funciones y 83,9 % de ramas
(800 tests).

Mínimos subidos a lo que hay, con un poco de margen para lo que unan otras
ramas: API 97/97/97/90 y web 77/77/64/82 (líneas, sentencias, funciones,
ramas).

Lo que más falta en la web (por debajo del 10 % de líneas): `CodeClicker.tsx`,
`GateView.tsx`, `BookHelp.tsx`, `PersonPanel.tsx`, `PairDetail.tsx`,
`PeerPicker.tsx`, `SanctionForm.tsx`, `FlowsPanel.tsx`, `ClickMap.tsx`,
`Inbox.tsx` y `shared/download.ts`; en la API, `core/db/database.ts` (78 %),
`replica/photos.ts` (82 %) y `facility/index.ts` (79 %). Las pantallas no se
tocaron porque otro agente está cambiando su interfaz; sus recorridos van
mejor después.

## Nota sobre `npm run check` en un worktree

Dentro de `.claude/worktrees/…`, `knip` da por sin uso `apps/api/src/cli/*`,
`apps/web/tools/*` y lo que solo usan ellos: casa las rutas absolutas de los
scripts con la línea `.claude/worktrees/` del `.gitignore`. Pasa en limpio en
la copia principal con la misma configuración, y en el worktree sin esa línea.
No es de esta rama; para pasar el check entero aquí se quitó esa línea solo
mientras corría.

## Migraciones

Ninguna. `pool_members` ya tiene lo necesario; si la tabla creciera mucho,
un índice por `begin_at` haría más barata `loginsAnywhere`.
