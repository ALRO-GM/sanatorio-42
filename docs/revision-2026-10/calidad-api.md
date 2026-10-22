# Revisión de calidad de la API de Sanatorio 42

Revisión de solo lectura de `apps/api` (Fastify + libsql, TypeScript, zod), hecha el 2026-10-22.
Todas las rutas de fichero son relativas a `apps/api/src/` salvo que se diga otra cosa.
Solo se recoge lo comprobado con `grep`, `wc`, `jscpd` (`--min-lines 5 --min-tokens 50`),
`knip` y lectura directa.

## Resumen

La base es sana: capas respetadas (ningún servicio importa `fastify`, ningún `*.rules.ts`
toca la base, ningún repositorio lanza `DomainError`, ningún módulo importa las tripas de
otro), `knip` limpio, `jscpd` con solo 27 clones exactos (0,47 %) y comentarios que explican
el porqué. Los problemas son de **repetición semántica** que las herramientas no ven
(unos 22 constructores de `IN (?,?,…)`, 22 `const iso = …` locales, 61 líneas de
`...(x === undefined ? {} : { x })`, 46 `reply.header('Cache-Control', 'private, no-store')`,
dos cachés por campus iguales), de **tamaño** (servicios-cierre de 500 a 1 100 líneas con
métodos de 100 a 220 líneas, `composition.ts` con 514 líneas y diez referencias adelantadas)
y de **desviaciones de la arquitectura declarada** (nueve módulos con SQL en el servicio en vez
de repositorio; `network`, `exams` y `auth` llaman a 42 aunque `AGENTS.md` dice que solo
`replica`; rutas en `index.ts` en doce módulos y en `*.routes.ts` en el resto). En datos faltan
dos índices y en tests, `calendar`, `map`, `usage` y `meet` van cortos.

Hallazgos: duplicación 8, generalización 6, desacoplamiento 6, legibilidad 6, datos 5,
tests 5, integración con 42 3. Total: 39.

---

## 1. Duplicación

### D1. Constructor de `IN (?, ?, …)` repetido en 13 ficheros (22 sitios)

- **Dónde**: `modules/stats/stats.repository.ts:241,268`; `modules/exams/exams.repository.ts:220`;
  `modules/quiz/quiz.repository.ts:444`; `modules/notices/notices.service.ts:136,154`;
  `modules/meet/meet.service.ts:451`; `modules/replica/curriculum.ts:280,468,537`;
  `modules/doubts/guide-changes.repository.ts:40`; `modules/boards/boards.repository.ts:36`;
  `modules/replica/replica.repository.ts:295,362,363,386,662,798`;
  `modules/therapy/therapy.repository.ts:54`; `modules/profile/xp.repository.ts:70`;
  `modules/network/network.repository.ts:171`; `modules/focus/focus.service.ts:67`.
- **Qué pasa**: `${ids.map(() => '?').join(', ')}` y `args: [...ids]` a mano. Dos sitios ya
  resuelven lo mismo con `json_each(?)` (`network.repository.ts:36` con la constante
  `IN_SCOPE`, `exams.repository.ts:72,96,130`, `exams.live.ts:384`), y `replica.repository.ts:356`
  trocea en `BATCH_SIZE = 400` para no pasar del tope de parámetros de SQLite. El caso
  `ids.length === 0` se trata distinto en cada sitio (`exams.repository.ts:220` pone `NULL`;
  otros confían en que el llamador no pase vacío).
- **Propuesta**: en `core/db/sql.ts`:
  ```ts
  /** `col IN (SELECT value FROM json_each(?))`: un solo parámetro, sin tope de 999 ni lista vacía. */
  export const inList = (column: string): string => `${column} IN (SELECT value FROM json_each(?))`
  export const listArg = (values: readonly (string | number)[]): string => JSON.stringify(values)
  ```
  y sustituir los 22 sitios; el troceo por lotes de `replica.repository.ts:356-390` sobra.
- **Beneficio**: un parámetro por lista, sin límite de 999, lista vacía que devuelve nada, y
  menos SQL dinámico.
- **Riesgo**: medio-bajo; `json_each` cambia el plan de consulta (comprobar con `EXPLAIN` las
  dos de `project_users` por `user_id`). Los tests de repositorio existen.
- **Esfuerzo**: M.

### D2. `const iso = (ms) => new Date(ms).toISOString()` definido 22 veces

- **Dónde**: `modules/replica/quota.ts:129`, `notices/notices.service.ts:51`,
  `meet/conversations.ts:84`, `quiz/quiz.service.ts:88`, `quiz/games/turns.service.ts:114`,
  `replica/agenda.ts:101`, `admin/admin.service.ts:203`, `doubts/doubts.service.ts:189`,
  `broadcasts/broadcasts.service.ts:68`, `staff/staff.service.ts:115`,
  `facility/facility.service.ts:76`, `tours/tours.service.ts:53`, `clicker/clicker.service.ts:184`,
  `replica/syncer.ts:231`, `focus/focus.service.ts:115`, `gitcourse/gates.ts:139`,
  `gitcourse/rooms.ts:200`, `calendar/calendar.service.ts:63`, `attendance/attendance.service.ts:107`,
  `profile/xp.service.ts:94` (`today`), `replica/quota.ts:130` (`today`), `boards/boards.service.ts:154`.
  Además, 40 usos sueltos de `new Date(now()).toISOString()` (`grep` en `modules/`).
- **Qué pasa**: la misma función con tres firmas distintas (`iso()`, `iso(at)`, `iso(at = now())`).
  `core/db/database.ts:162` tiene `nowIso()` pero usa el reloj real, así que los servicios con
  reloj inyectado no pueden usarla y los nueve repositorios que sí la usan
  (`boards.repository.ts`, `help.repository.ts`, `doubts.repository.ts`, `availability.repository.ts`,
  `xp.repository.ts`…) escriben `*_at` con la hora real aunque el test tenga reloj falso.
- **Propuesta**: en `core/time.ts`: `export const isoAt = (ms: number): string => new Date(ms).toISOString()`
  y `export const dayOf = (ms: number): string => isoAt(ms).slice(0, 10)`; quitar `nowIso()` de
  `database.ts` y hacer que los repositorios reciban el instante del servicio (como ya hace
  `focus.repository.untilOf(logins, iso)`).
- **Beneficio**: una sola forma, repositorios deterministas en tests.
- **Riesgo**: bajo; cambio mecánico.
- **Esfuerzo**: S (helper) + M (repositorios con `nowIso`).

### D3. Cachés por campus iguales en `stats` y `exams`

- **Dónde**: `modules/stats/progress.service.ts:60-100` (`type Snapshot = { at, … }`,
  `const cache = new Map<number, Snapshot>()`, `if (cached && t - cached.at < CACHE_MS) return cached`)
  y `modules/exams/exams.service.ts:55-95` (idéntico). Patrón parecido en `exams.live.ts:74-93`
  (`states` + `inFlight`) y `replica/agenda.ts:99` (`campusFetchedAt`).
- **Qué pasa**: `core/ttl-cache.ts` ya hace exactamente esto, con tope de entradas y
  deduplicación de cargas simultáneas (dos visitas a la vez no lanzan dos agregados). Las copias
  locales no deduplican ni limitan.
- **Propuesta**: `const snapshots = createTtlCache<Snapshot>({ ttlMs: CACHE_MS, maxEntries: 50, now })`
  y `snapshots.get(String(campusId), () => build(campusId))`. Para `exams.live.ts`, `inFlight`
  desaparece con el mismo cambio.
- **Beneficio**: menos código, sin carreras entre peticiones simultáneas.
- **Riesgo**: bajo; `ttl-cache` tiene tests.
- **Esfuerzo**: S.

### D4. `...(deps.x === undefined ? {} : { x: deps.x })` en 61 líneas

- **Dónde**: 20 ficheros; concentrado en `modules/replica/index.ts:61-105` (cuatro bloques
  casi iguales que `jscpd` marca: `[62:71-67:8]`, `[81:30-99:15]`, `[102:44-108:79]`),
  `app/composition.ts:167,174,175,303,316,353,356`, `modules/admin/index.ts:70`,
  `modules/facility/index.ts`, todos los `index.ts` que reciben `now`/`log`.
- **Qué pasa**: `exactOptionalPropertyTypes: true` (`tsconfig.base.json:12`) obliga a no pasar
  `undefined` explícito, y cada sitio lo resuelve a mano.
- **Propuesta**: `core/options.ts`:
  ```ts
  /** Quita las claves `undefined`: con `exactOptionalPropertyTypes` no se pueden pasar. */
  export function given<T extends object>(o: T): { [K in keyof T]-?: Exclude<T[K], undefined> } { … }
  ```
  y `createQuota({ db, client, hourlyReserve, ...given({ priority: deps.priority, halted: deps.halted, now: deps.now, log: deps.log }) })`.
  Alternativa más simple: definir `Clock = { now?: () => number; log?: (m: string) => void }` y
  pasar siempre `deps` entero (`createX({ ...deps, … })`), que ya se hace en `composition.ts:184`
  con `common`.
- **Beneficio**: 61 líneas menos y un patrón único para añadir una dependencia opcional.
- **Riesgo**: bajo.
- **Esfuerzo**: S.

### D5. Lectura de columnas anulables repetida a mano

- **Dónde**: `typeof row.x === 'string' ? row.x : null` ×43 (`replica.repository.ts` 12,
  `exams.repository.ts` 4, `agenda.ts` 3, `profiles.repository.ts` 3, `facility.service.ts` 3,
  `therapy.repository.ts` 2, `stats.repository.ts:165`…); `row.x === null ? null : toNumber(row.x)`
  ×25 (`exams.repository.ts:106,139,156`, `quiz.repository.ts:52`…); `Number(row.available) === 1`
  como booleano (`replica.repository.ts:541,548`, `availability.repository.ts:53`); dos
  `triState` distintos (`exams.repository.ts:27` lee `unknown → boolean | null`,
  `replica.repository.ts:953` escribe `boolean | null → number | null`).
- **Qué pasa**: `core/db/rows.ts` solo tiene `toText` y `toNumber`; lo anulable y lo booleano se
  reinventa en cada repositorio.
- **Propuesta**: ampliar `core/db/rows.ts` con `toTextOrNull`, `toNumberOrNull`, `toBool`
  (`=== 1`), `toBoolOrNull` (el `triState` de lectura) y `fromBoolOrNull` (el de escritura).
- **Beneficio**: mapeos de fila de una línea por columna y el mismo criterio para `bigint`/texto
  de Turso en todas partes.
- **Riesgo**: nulo.
- **Esfuerzo**: S (helpers) + M (sustituir 70 sitios, puede ir por módulos).

### D6. Comprobación de staff activo duplicada en rutas

- **Dónde**: `modules/facility/index.ts:63-71` y `:77-85` (clon exacto según `jscpd`), igual que
  `modules/staff/index.ts:73-80`; el mismo mensaje también en `staff.service.ts:154` como
  `domainError('unauthenticated', …)`.
- **Qué pasa**: tres rutas repiten `session.staff(request)` + `staffActive(id)` + `reply.code(401).send({…})`
  a mano, construyendo el cuerpo del error sin pasar por `mapError`.
- **Propuesta**: añadir a `SessionReader` (`core/session.ts`) `activeStaff: (request) => Promise<{ id; name }>`
  que lance `DomainError('unauthenticated')` si la cuenta está dada de baja; `auth` lo implementa
  con el servicio de `staff` (que `composition` ya le puede inyectar) y `facility` deja de recibir
  `staffActive`.
- **Beneficio**: una sola regla de "staff vigente", sin cuerpos de error a mano.
- **Riesgo**: bajo; `tests/integration/staff.test.ts` lo cubre.
- **Esfuerzo**: S.

### D7. `quiz.service.ts` y `games/turns.service.ts` comparten ~60 líneas

- **Dónde**: clones de `jscpd`: `quiz.service.ts:78-84/236-257/351-363/449-457/471-480` ↔
  `turns.service.ts:92-98/266-284/391-403/445-453/457-466`; `quiz.repository.ts:92-103` ↔
  `turns.repository.ts:71-82` ↔ `gitcourse/rooms.ts:107-117`; `quiz/index.ts:23-29` ↔
  `quiz/games/index.ts:20-26`.
- **Qué pasa**: `turns.service.ts` ya es genérico (`createTurnsService<Board, View>`), pero el
  quiz no se montó sobre él: ciclo de vida de sala (lobby → en marcha → cerrada, jugadores,
  imágenes, `locked`) repetido. `gitcourse/rooms.ts` repite la consulta de "salas abiertas del
  campus con jugadores".
- **Propuesta**: extraer `modules/quiz/games/rooms.ts` (o `core/rooms.ts` si `gitcourse` lo usa):
  `createRoomLifecycle<State>({ db, table, now, imagesOf, locked })` con `open/join/leave/start/close`
  y la consulta de salas, y que `quiz`, `turns` y `gitcourse` lo compongan.
- **Beneficio**: una sola implementación de salas multijugador para los tres juegos y los que
  vengan.
- **Riesgo**: medio; tres módulos tocados, pero con 1 442 + 371 líneas de tests.
- **Esfuerzo**: L.

### D8. Repetición interna en `therapy.repository.ts` y `admin.service.ts`

- **Dónde**: `therapy.repository.ts:174-183` ↔ `:218-227` (lista de columnas de INSERT y UPDATE);
  `admin.service.ts:894-902` ↔ `:910-918`.
- **Qué pasa**: la lista de valores de un grupo se escribe dos veces; si se añade una columna hay
  que tocar las dos.
- **Propuesta**: `const groupArgs = (group) => [group.place, group.dates.join(','), …]` compartido
  por `insert` y `update`.
- **Beneficio**: una columna nueva, un sitio.
- **Riesgo**: nulo.
- **Esfuerzo**: S.

---

## 2. Generalización

### G1. `Cache-Control: private, no-store` escrito 46 veces en rutas

- **Dónde**: 59 `reply.header('Cache-Control', …)` en `modules/`; 46 son `'private, no-store'`
  (p. ej. `help.routes.ts:50`, `focus/index.ts:39,61,68`, `facility/index.ts:72`); el resto,
  `max-age` de 30/60/300/600/86400. No hay ningún gancho global (`grep` en `app/` y `core/`: solo
  `static.ts`).
- **Propuesta**: en `app/build-app.ts`, un `onSend` que ponga `private, no-store` a toda respuesta
  de ruta de API que no traiga ya `Cache-Control`; las 13 rutas con `max-age` lo siguen poniendo.
  Alternativa: `reply.decorate('noStore')`.
- **Beneficio**: una ruta nueva no puede olvidarse de la cabecera (hoy depende de la persona).
- **Riesgo**: bajo; cambia la cabecera de las rutas que hoy no la ponen (a más estricto).
- **Esfuerzo**: S.

### G2. Rutas: dos convenciones (`*.routes.ts` vs `index.ts`)

- **Dónde**: `*.routes.ts` en 12 módulos (`help`, `doubts`, `quiz`, `therapy`, `profile`, `boards`,
  `network`, `map`, `replica`, `peers`, `calendar`, `auth`); rutas dentro de `index.ts` en otros
  12: `admin/index.ts` (22 rutas, 341 líneas en `createAdminModule`), `clicker/index.ts` (13 rutas,
  184 líneas), `meet/index.ts` (11), `gitcourse/index.ts` (11), `staff`, `focus`, `usage`, `notices`,
  `facility`, `broadcasts`, `tours`, `legal`, `exams`, `stats`.
- **Qué pasa**: `docs/architecture.md` describe `x.routes.ts`; la mitad no lo sigue. La forma de las
  rutas sí es uniforme (zod dentro del servicio, `input: unknown`, `reply.code(204)`), así que no
  hace falta un "registrador genérico": basta la convención de fichero.
- **Propuesta**: mover a `x.routes.ts` los módulos con más de 3 rutas (`admin`, `clicker`, `meet`,
  `gitcourse`, `staff`, `focus`, `usage`, `notices`, `facility`, `broadcasts`), y dejar la regla
  escrita: `index.ts` solo compone.
- **Beneficio**: `index.ts` legible (hoy `admin/index.ts` mezcla ganchos de consumo, segundo factor
  y 22 rutas) y la convención documentada se cumple.
- **Riesgo**: nulo (movimiento de código).
- **Esfuerzo**: M.

### G3. `idParam(request.params.id, 'La reserva')`: la etiqueta se repite por ruta

- **Dónde**: 32 llamadas con 10 etiquetas (`El proyecto` ×6, `La duda` ×5, `El grupo` ×5,
  `La reserva` ×4, `La pizarra` ×4…); cuatro módulos ya se hacen un envoltorio local
  (`quiz.routes.ts:17`, `turns.routes.ts:17`, `facility/index.ts:34`, `gitcourse/index.ts:88`).
- **Qué pasa**: además, `core/http/params.ts:16-21` lanza `invalid_input` (400) con el mensaje
  `"… no existe"`, que suena a 404: código y texto no casan.
- **Propuesta**: `export const idOf = (what: string) => (raw: string) => idParam(raw, what)` en
  `core/http/params.ts`, y mensaje `"${what}: identificador no válido"`.
- **Beneficio**: una línea por módulo (`const booking = idOf('La reserva')`) y mensaje coherente
  con el código.
- **Riesgo**: nulo (cambia un texto de error).
- **Esfuerzo**: S.

### G4. Tipo `Services` y objeto devuelto duplicados en `composition.ts`

- **Dónde**: `app/composition.ts:100-139` (tipo, 38 líneas) y `:473-512` (literal, 38 líneas).
- **Qué pasa**: cada módulo nuevo se añade en tres sitios (tipo, literal, lista `modules`).
- **Propuesta**: construir el literal `services` primero y derivar `export type Services = ReturnType<typeof compose>['services']`.
- **Beneficio**: un sitio menos por módulo nuevo.
- **Riesgo**: nulo.
- **Esfuerzo**: S.

### G5. Opciones de servicio sin tipo común (`now`, `log`)

- **Dónde**: `now?: () => number` declarado en 26 `*Options`; `log?: (message: string) => void`
  en `replica/index.ts`, `network/index.ts`, `exams/index.ts`, `composition.ts:84`; `const now = options.now ?? Date.now`
  y `const log = options.log ?? (() => undefined)` en cada servicio (`quota.ts:109-110`,
  `exams.live.ts:71-72`…).
- **Propuesta**: `core/clock.ts`: `export type Clock = { now?: () => number }`, `export type Logger = { log?: (message: string) => void }`
  y `export const clockOf = (o: Clock) => o.now ?? Date.now`. Los `*Options` hacen `& Clock & Logger`.
- **Beneficio**: nombre único para la inyección del reloj; facilita D4.
- **Riesgo**: nulo.
- **Esfuerzo**: S.

### G6. `startOfDayIso` vive en `core/validation.ts`

- **Dónde**: `core/validation.ts:70-73`; usos en `doubts.service.ts:549`, `therapy.service.ts:526`.
- **Qué pasa**: es una función de tiempo, no de validación; `core/time.ts` ya existe y tiene
  `localMoment`, `zonedInstant`, `beyondHorizon`.
- **Propuesta**: moverla a `core/time.ts` junto con `isoAt`/`dayOf` (D2).
- **Beneficio**: quien busque funciones de fecha las encuentra en un sitio.
- **Riesgo**: nulo.
- **Esfuerzo**: S.

---

## 3. Desacoplamiento

### A1. Nueve módulos con SQL en el servicio (sin repositorio)

- **Dónde** (`db.execute`/`db.batch` en ficheros que no son `*.repository.ts`):
  `clicker/clicker.service.ts` 39, `admin/admin.service.ts` 32, `replica/quota.ts` 13,
  `replica/curriculum.ts` 13, `staff/staff.service.ts` 11, `notices/notices.service.ts` 11,
  `attendance/attendance.service.ts` 11, `gitcourse/rooms.ts` 11, `meet/conversations.ts` 9,
  `meet/meet.service.ts` 8, `usage/usage.service.ts` 8, `tours/tours.service.ts` 8,
  `broadcasts/broadcasts.service.ts` 6, `focus/focus.sessions.ts` 5.
- **Qué pasa**: `docs/architecture.md` ("Un módulo por dentro") promete `x.repository.ts: SQL y
  nada más`. En `clicker.service.ts` (1 084 líneas de cierre, 20 métodos) y `admin.service.ts`
  (724) las reglas de XP, trampas y topes están mezcladas con las consultas, y no se pueden probar
  reglas sin base.
- **Propuesta**: extraer `clicker.repository.ts` y `admin.repository.ts` primero (son los que más
  pesan y los que tocan dinero/XP); el resto, al tocarlos. Para módulos de 300 líneas (`tours`,
  `broadcasts`, `legal`) aceptar la excepción y escribirla en `architecture.md`.
- **Beneficio**: los servicios con más reglas quedan probables con dobles; se cumple lo que dice la
  documentación.
- **Riesgo**: medio; tocar `clicker` exige apoyarse en sus 1 428 líneas de tests.
- **Esfuerzo**: L (`clicker`, `admin`), S cada uno de los demás.

### A2. `composition.ts`: 514 líneas, diez referencias adelantadas

- **Dónde**: `app/composition.ts:189-199, 221-226, 237-242, 278-285, 357-358, 367-368, 395`:
  comentarios "`clicker` se monta después: para cuando alguien pregunte ya estará" (10 veces) con
  lambdas que capturan `const` aún no inicializadas (`clicker`, `network`, `calendar`, `help`,
  `exams`, `usage`, `modules`); `let halted` y `let refreshPanelAdmins` reasignados en `:402-416`.
- **Qué pasa**: el orden de montaje tiene dependencias circulares resueltas por cierre; funciona
  porque nadie llama en construcción, pero cualquier módulo que lo haga fallará con un
  `ReferenceError` en arranque. Además hay lógica de negocio en la composición: presencia
  (`:201-212`), `donated` con la cuota (`:379-385`), `seatOf` de `facility` (`:323-328`),
  `refreshPanelAdmins` (`:405-416`), y un import de tripas (`:40` `modules/clicker/donations.rules.js`)
  que el linter no vigila porque la regla de `no-restricted-imports` no cubre `app/`.
- **Propuesta**:
  1. Un módulo `presence` propio (beat, online, seatOf) que hoy está repartido entre
     `composition.ts:201-212,323-328,421`.
  2. Las lambdas que cruzan módulos las publica el módulo destino en su `index.ts` (p. ej.
     `clicker.hackerOf`, `network.masterOf`) y se pasan **después** de construir ambos con un
     `wire()` explícito, o se usan eventos (`core/events.ts`) donde solo se avisa.
  3. `donated` pasa a `clicker` con `quota` inyectada (es la misma regla que ya usa `exams`).
  4. Añadir `apps/api/src/app/**` a la regla ESLint "solo `index.js` de un módulo".
- **Beneficio**: `composition.ts` vuelve a ser una lista; el orden deja de importar.
- **Riesgo**: medio; tocar el arranque. Los tests de integración (`makeApp`) lo cubren entero.
- **Esfuerzo**: M.

### A3. Dependencias con dos granularidades: repositorio entero o lambda por función

- **Dónde**: `common = { db, replica: replica.repository, … }` (`composition.ts:184`) se pasa a
  `profile`, `peers`, `therapy`, `doubts`, `boards`, `help`; en cambio `quiz`, `gitcourse`, `stats`,
  `map` reciben `imagesOf`, `circlesOf`, `seatOf` como lambdas (`composition.ts:261-263,392,427-434`).
  `exams.live.ts:38` declara `Pick<ReplicaRepository, 'ingestProjectUsers' | 'imagesOf' | …>`.
- **Qué pasa**: `imagesOf` se usa en 15 sitios con las dos formas; `doubts` recibe `corrections: { byProject, since }`
  envolviendo métodos que `network` ya expone con el mismo nombre (`:238-241`).
- **Propuesta**: regla única: un módulo recibe **el tipo público** del otro (`Pick<…>` cuando quiera
  acotar, como hace `exams.live.ts`), nunca lambdas que solo reenvían. Las lambdas quedan para
  adaptar firma o romper ciclos.
- **Beneficio**: menos líneas en `composition.ts` y dependencias legibles en el tipo.
- **Riesgo**: nulo.
- **Esfuerzo**: S.

### A4. Trabajos periódicos sin guarda de reentrada

- **Dónde**: `app/build-app.ts:175-185`: `setInterval(() => job.run().catch(…), job.everyMs)`.
  Trabajos cada 60 s: `therapy/index.ts:50` (`checkAttendance`, pide a 42 vía `sync.ensureLocations`),
  `meet/index.ts:131`, `admin/index.ts:399`; cada 20 s: `network/index.ts:80`, `replica/index.ts:146`.
- **Qué pasa**: si una vuelta tarda más que `everyMs` (42 lenta, `network.sync` con
  `STEP_BUDGET_MS`), la siguiente arranca solapada. Ningún `index.ts` con `jobs` lleva `running`
  o `inFlight` propio (`grep` en `therapy`, `meet`, `admin`, `network`).
- **Propuesta**: en el lanzador, `let busy = false; if (busy) return; busy = true; job.run().finally(() => { busy = false })`,
  o mejor `setTimeout` encadenado (`schedule()` tras terminar), que además respeta `everyMs`
  como pausa y no como periodo.
- **Beneficio**: nunca dos copias del mismo trabajo; menos gasto de cuota en picos.
- **Riesgo**: bajo; `tests/integration/lifecycle.test.ts` prueba arranque/parada.
- **Esfuerzo**: S.

### A5. `auth.routes.ts`: 209 líneas en una función con lógica de cookies

- **Dónde**: `modules/auth/auth.routes.ts:58-266` (`registerAuthRoutes`), con `cookieOf`,
  `forgetState`, `sessionCookieHeader`, `frontWithError` definidos dentro, y un
  `reply.code(401).send({ error: 'unauthenticated', … })` a mano en `:207`.
- **Qué pasa**: es la única `*.routes.ts` con funciones internas y estado (`attempts`); el resto
  son listas de rutas de una línea.
- **Propuesta**: mover `cookieOf/forgetState/sessionCookieHeader/frontWithError` a
  `auth/cookies.ts` (ya existe `core/http/cookies.ts` para la parte genérica) y lanzar
  `DomainError` en `:207` para que pase por `mapError`.
- **Beneficio**: el fichero de rutas vuelve a ser un listado; las cookies se prueban solas.
- **Riesgo**: bajo (522 líneas de tests en `auth.test.ts`).
- **Esfuerzo**: S.

### A6. Cuerpos de error construidos a mano en rutas

- **Dónde**: `replica.routes.ts:45`, `admin/index.ts:151`, `auth.routes.ts:207`,
  `facility/index.ts:69,83`.
- **Qué pasa**: cinco rutas devuelven `{ error, message }` sin pasar por `core/http/errors.ts`; si
  cambia el formato (por ejemplo al traducir mensajes, "Pendiente" de `AGENTS.md`) hay que
  buscarlas.
- **Propuesta**: lanzar `domainError('not_found'|'unauthenticated', …)` y dejar que el manejador
  conteste. El 503 de `admin/index.ts:103-113` es el único con cabecera propia (`Retry-After`) y
  puede quedarse.
- **Beneficio**: un solo formato de error.
- **Riesgo**: nulo.
- **Esfuerzo**: S.

---

## 4. Legibilidad

### L1. Métodos de servicio de 100 a 220 líneas

- **Dónde**: `clicker.service.ts:431` `save` (219 líneas), `map.service.ts:149` `forCampus` (178),
  `attendance.service.ts:346` `checkin` (146), `doubts.service.ts:252` `graph` (124),
  `help.service.ts:621` `book` (109), `clicker.service.ts:1157` `usage` (106),
  `meet/conversations.ts:171` `list` (105), `usage.service.ts:275` `stats` (103),
  `network.service.ts:259` `graph` (86), `clicker.service.ts:1074` `cheats` (82).
  Funciones libres: `network.analysis.ts:99` `communitiesOf` (146, con un `for` de 112 líneas en `:117`).
- **Propuesta**: en cada uno, separar "leer" (consultas en paralelo), "decidir" (función pura en
  `*.rules.ts`, probable sin base) y "guardar". `clicker.save` ya tiene los `*.rules.ts`
  (`clicks`, `capital`, `cheat`) y aun así mide 219 líneas: la orquestación se puede partir en
  `validateSave`, `applyCheats`, `persistSave`.
- **Beneficio**: tests unitarios de la regla sin montar la base; lectura por pasos.
- **Riesgo**: medio en `clicker.save` y `attendance.checkin` (tocan XP); bajo en los de solo lectura.
- **Esfuerzo**: M cada uno.

### L2. Servicios como un único cierre de 500 a 1 100 líneas

- **Dónde**: `createClickerService` 1 084 líneas, `createReplicaRepository` 827,
  `createAdminService` 724, `createHelpService` 706, `createSyncer` 624,
  `createDoubtsService` 614, `createTurnsService` 522, `createQuizService` 511, `createMeetService` 479.
- **Qué pasa**: el estilo `createX(deps)` que devuelve un objeto es el acordado y está bien; el
  problema es que todo el módulo cabe en una sola función, con helpers internos que no se pueden
  importar en tests.
- **Propuesta**: cuando un servicio pase de ~400 líneas, partirlo por tema en ficheros que reciben
  las mismas `deps` (`clicker/capital.service.ts`, `clicker/cheats.service.ts`, …) y que
  `createClickerService` los componga (`admin` ya lo hace con `growth.ts` y `second-factor.ts`;
  `quiz` con `games/`).
- **Beneficio**: ficheros de 200-300 líneas con un tema cada uno.
- **Riesgo**: bajo (movimiento).
- **Esfuerzo**: M por servicio.

### L3. Nombres: `campus` vs `campusId`, `who` vs `login`

- **Dónde**: `stats/stats.repository.ts:139,152` (`campus: number`) y `progress.service.ts:92`
  (`snapshot(campus)`) frente a `campusId` en el resto (`Actor.campusId`, `exams.service.ts:67`);
  `admin.service.ts:348,458,517,567` y `usage.service.ts:310` usan `who: string` para un login.
- **Propuesta**: `campusId` y `login` siempre; `who` solo para un `Actor`.
- **Beneficio**: buscar `campusId` encuentra todo.
- **Riesgo**: nulo.
- **Esfuerzo**: S.

### L4. Lógica de presencia y de "quién pasa sin turno" fuera de cualquier módulo

- **Dónde**: `composition.ts:74-77` (`PRESENCE_BEAT_MS`, `PRESENCE_WINDOW_MS`), `:201-212`,
  `:323-328`, `:421`; `:160-161,402-416` (`panelAdmins`, `refreshPanelAdmins` con 60 s de caché a mano).
- **Qué pasa**: hay reglas (ventana de 6 min, latido cada 60 s, caché de admins) sin tests
  unitarios posibles porque viven en la composición.
- **Propuesta**: ver A2 (módulo `presence`); `refreshPanelAdmins` es un `createTtlCache<Set<string>>`
  de una entrada dentro de `admin`.
- **Beneficio**: reglas con nombre y test.
- **Riesgo**: bajo.
- **Esfuerzo**: S.

### L5. Mensaje y código discordantes en `idParam`

- **Dónde**: `core/http/params.ts:16-21`: `DomainError('invalid_input', `${what} "${raw}" no existe`)`.
- **Qué pasa**: un id mal formado (`abc`) responde 400 con "no existe", y un id bien formado que no
  está responde 404 con "no existe": el front no distingue.
- **Propuesta**: ver G3.
- **Esfuerzo**: S.

### L6. Comentarios: bien

- Se revisó una muestra aleatoria de 30 comentarios de `*.service.ts` y los encabezados de todos
  los ficheros de `core/`: explican el porqué ("no se dice con quién: 42 lo oculta hasta que llega
  la hora", "el reloj de verdad, no el inyectado: mide lo que tarda la red"). No hay comentarios
  que repitan el código (`grep` de `// Devuelve|Guarda|Lee|Crea|…`: 0). No es un hallazgo sino un
  modelo a seguir; se deja aquí para que no se busque un problema que no hay.

---

## 5. Datos

### B1. Índice que falta: `help_bookings (campus_id, status, day)`

- **Dónde**: `stats/stats.repository.ts:41`
  `WHERE campus_id = ? AND status = 'confirmed' AND verified = 1 AND (? IS NULL OR day >= ?)`.
  Índices existentes: `help_bookings (helper, day)`, `(requester, day)` (ninguno por campus).
- **Qué pasa**: la clasificación de ayuda recorre la tabla entera del campus en cada visita a
  estadísticas (mitigado por caché de `stats`).
- **Propuesta**: migración `0067-help-bookings-campus.ts`:
  `CREATE INDEX help_bookings_campus ON help_bookings (campus_id, status, day)`.
- **Beneficio**: consulta por índice.
- **Riesgo**: nulo.
- **Esfuerzo**: S.

### B2. `event_messages … OR event_id LIKE ?` no puede usar índice

- **Dónde**: `meet/conversations.ts:174-176`: `WHERE login = ? OR event_id LIKE ? OR event_id LIKE ? GROUP BY event_id`.
- **Qué pasa**: el chat directo codifica los dos logins en `event_id` (`chat:a:b`), así que
  encontrar "mis conversaciones" obliga a `LIKE` sobre toda la tabla; los índices
  `(login, event_id)`, `(event_id, id)` no sirven para el `OR`.
- **Propuesta**: una tabla `chat_members (chat_id, login)` (PK compuesta, índice por `login`)
  rellenada al crear el chat, o usar `conversation_marks` (ya existe, indexada por `remind_at`) con
  una columna `login` indexada. Migración nueva con relleno desde los `event_id` existentes.
- **Beneficio**: `list` deja de crecer con el total de mensajes del campus.
- **Riesgo**: medio (migración con datos; `tests/unit/migrations.test.ts` ya tiene el patrón
  "aplica sobre base con datos").
- **Esfuerzo**: M.

### B3. Columnas JSON parseadas en cada sitio

- **Dónde**: `JSON.parse` en `clicker.service.ts` (5), `quiz.repository.ts` (2),
  `turns.repository.ts` (2), `broadcasts.service.ts` (2), `auth.service.ts` (2), `stats.repository.ts`,
  `replica.repository.ts`, `quota.ts:231`, `curriculum.ts`, `agenda.ts`; `replica.getState<T>/setState`
  (`exams.live.ts:88,152`, `network.sync.ts:244`) es la única abstracción, y valida la forma a
  mano (`exams.live.ts:88-90`).
- **Propuesta**: `core/db/rows.ts`: `toJson<T>(value: unknown, schema: z.ZodType<T>): T | null`
  (parsea y valida; devuelve `null` y no lanza, como hace `quota.ts:231-233` con su `try/catch`).
- **Beneficio**: un `JSON.parse` que no explota y una forma de validar lo que se lee.
- **Riesgo**: nulo.
- **Esfuerzo**: S.

### B4. Consultas sin `LIMIT` que crecen con el campus

- **Dónde** (`SELECT` sin ningún `LIMIT` en el fichero): `boards.repository.ts` (5 SELECT),
  `exams.repository.ts` (13), `help.repository.ts` (6), `stats.repository.ts` (18),
  `therapy.repository.ts` (6), `xp.repository.ts` (6), `profiles.repository.ts` (4).
  Hay tope en `event_checkins` (`LIMIT 1000`), `tickets` (`LIMIT 50/200`), `notices`, `personalData`
  (`MAX_ROWS = 5000`).
- **Qué pasa**: la mayoría son agregados por campus (razonable) o listas acotadas por fecha; pero
  `stats.repository.ts:154-168` `ranking` devuelve la clasificación **entera** del campus y es el
  servicio quien recorta (`stats.service.ts`). Con 1 600 personas es asumible; con varios campus
  seguidos (`SYNC_CAMPUS_IDS`) deja de serlo.
- **Propuesta**: `ranking(section, campusId, since, now, limit)` con `LIMIT ?` y la posición propia
  por una consulta aparte (`COUNT(*) WHERE value > mine`), como ya hace `clicker.board`.
- **Beneficio**: tiempo de respuesta independiente del tamaño del campus.
- **Riesgo**: bajo.
- **Esfuerzo**: S.

### B5. Migraciones: bien, con un punto a vigilar

- **Comprobado**: 66 migraciones (`0001`…`0066`), número de fichero = `version` en todas (script),
  `tests/unit/migrations.test.ts:159` "aplica solo las migraciones que faltan y conserva los
  datos", `:335` "numera de forma creciente y sin huecos", y tests específicos de las 35, 36, 37 y
  52. Patrón `0065-correction-feedback` → `0066-no-correction-feedback`: se añadió y se quitó una
  tabla en dos migraciones seguidas en vez de editar la primera, que es lo correcto.
- **Punto a vigilar**: el directorio no es un repositorio git en esta copia, así que no se pudo
  comprobar el historial de ediciones; conviene un test que compare un hash de cada migración
  aplicada con lo guardado en `schema_version` (añadir columna `checksum`) para detectar una
  edición de una migración ya desplegada.
- **Esfuerzo**: S.

---

## 6. Tests

### T1. Módulos con tests finos respecto a su tamaño

- **Dónde** (líneas de `src` / líneas de test que los nombran o referencian):
  `calendar` 388 / 0 unitarios (solo `integration/community.test.ts`);
  `map` 536 / 34 (`seat-layout.test.ts`) + integración;
  `usage` 928 / 75 (`clicks.test.ts`) + `routes.test.ts`;
  `meet` 1 169 / 396 (`conversations.test.ts`, `meet-rules.test.ts`) y **sin** test de integración
  (`grep services.meet|/events` en `tests/integration`: nada para `meet`);
  `gitcourse` 1 104 / 371; `stats` 892 / 299; `help` 1 369 / 491; `network` 1 901 / 679.
- **Qué pasa**: la cobertura global (96 % líneas) se sostiene por los tests de integración, que
  pasan por las rutas pero no por los bordes (familias "límite" y "vacío y enorme" de
  `docs/tests.md`). `map.service.forCampus` (178 líneas) y `meet.service.alerts` (76) solo se
  ejercitan de pasada.
- **Propuesta**: `tests/unit/calendar.test.ts` (solapes, cambio de día en zona del campus),
  `map.test.ts` (campus sin puestos, puesto roto + ocupado, 2 000 personas), `meet.test.ts`
  (alertas sin contestar, dos pulsaciones a la vez), `usage.test.ts` (ventanas `from/to` al revés,
  `offset` fuera de rango).
- **Beneficio**: los bordes de los módulos grandes quedan cubiertos.
- **Esfuerzo**: M.

### T2. `usage/flows.rules.ts` sin test directo

- **Dónde**: `modules/usage/flows.rules.ts` (87 líneas); ningún fichero de `tests/` lo nombra.
  Todos los demás `*.rules.ts` (19) tienen al menos un test que los importa.
- **Propuesta**: `tests/unit/flows-rules.test.ts` con las cinco familias (secuencia vacía, un solo
  paso, bucle A→B→A, 10 000 pasos).
- **Esfuerzo**: S.

### T3. Repositorios con reloj real (`nowIso()`)

- **Dónde**: 25 usos de `nowIso()` (`core/db/database.ts:162`) en nueve repositorios
  (`boards`, `help`, `doubts`, `replica`, `availability`, `guide-changes`, `therapy`, `profiles`, `xp`).
- **Qué pasa**: los servicios reciben `now` falso pero las columnas `*_at` se escriben con la hora
  de la máquina; un test que compare "creado antes de X" con el reloj falso depende del orden real
  de ejecución. Es el patrón de intermitencia que `docs/tests.md` pide evitar.
- **Propuesta**: ver D2: el servicio pasa `at` al repositorio.
- **Esfuerzo**: M.

### T4. `Date.now()` real en código con reloj inyectado

- **Dónde**: `network/network.sync.ts:211,214,253,256` (comentado como intencionado: mide la red),
  `admin/index.ts:110` (`Retry-After`), `replica/syncer.ts:806` y `integrations/forty-two/headers.ts:20`
  (`setTimeout` reales para esperas).
- **Qué pasa**: `network.sync` mezcla `now()` (sellos) y `Date.now()` (presupuesto): en un test
  con reloj falso el bucle de `sweep`/`backfill` puede dar una página o varias según la máquina.
- **Propuesta**: inyectar también `sleep`/`elapsed` (como ya hace `syncer.ts` con `sleep`), o
  fijar `STEP_BUDGET_MS` por opción y poner 0 en tests para que dé exactamente una página.
- **Esfuerzo**: S.

### T5. La prohibición de llamar a 42 fuera de `replica` no está en los tests

- **Dónde**: `docs/tests.md:51` dice "que no se llame a 42 desde donde no toca (los tests lo
  prohíben salvo en `replica`)". `grep` en `tests/`: ningún test recorre `src/modules` buscando
  imports de `integrations/forty-two` ni comprueba que `fake-42` no recibe peticiones desde otros
  módulos. Los módulos que importan el cliente: `exams` (3 ficheros), `network` (2), `auth` (3).
- **Propuesta**: o bien un test que liste los ficheros con `integrations/forty-two/client` y
  compruebe que están en una lista cerrada (`replica`, `network/network.sync.ts`, `exams/exams.sync.ts`,
  `exams/exams.live.ts`, `auth/oauth-client.ts`), o bien quitar la frase de la documentación.
- **Esfuerzo**: S.

---

## 7. Integración con 42

### Q1. La regla "solo `replica` llama a 42" no es la que se cumple

- **Dónde**: `AGENTS.md` ("ningún módulo llama a la API de 42 salvo `replica`") y
  `docs/architecture.md`; llamadas directas en `exams/exams.sync.ts:57`, `exams/exams.live.ts:143,175`,
  `network/network.sync.ts:216,258,296`, `app/composition.ts:352,384`, más OAuth en `auth`.
- **Qué pasa**: todas pasan por `quota.allows(...)` antes de llamar (comprobado en cada sitio), así
  que la **regla real** es "nadie gasta cuota sin preguntar a `replica.quota`", que sí se cumple.
  Pero la documentación dice otra cosa y no hay prueba que la sostenga (T5).
- **Propuesta**: reescribir la regla: "Solo `replica`, `network`, `exams` y `auth` reciben el
  cliente de 42; cualquier llamada va precedida de `quota.allows(tier)` o envuelta en
  `quota.defer`". Y mover `donated` (`composition.ts:379-385`) a `clicker` con `quota: QuotaGate`
  inyectada, para que la composición no haga llamadas a 42.
- **Beneficio**: regla verificable (T5) y sin excepciones silenciosas.
- **Esfuerzo**: S.

### Q2. Reservas horarias calculadas de forma distinta en cada módulo

- **Dónde**: `exams.sync.ts:45` `quota.allows('background', Math.round(hourlyReserve / 2))`;
  `network.sync.ts:136` `hourlyReserve + BUDGET_MARGIN`; `network.sync.ts:212` `hourlyReserve + SWEEP_MARGIN`;
  `exams.live.ts:135,172,362` sin reserva explícita (usa la de `quota`).
- **Qué pasa**: cada módulo recibe `hourlyReserve` (`composition.ts:300,315`) y decide su margen;
  `exams.sync` incluso pide **menos** reserva que la de fondo (la mitad), con lo que puede comerse
  parte de lo reservado para logins. `quota.allows` ya distingue escalones; los márgenes por
  módulo son un segundo sistema paralelo.
- **Propuesta**: que `quota` ofrezca los escalones que hacen falta (`'sweep'` = fondo con margen
  amplio, `'backfill'`), y que los módulos no reciban `hourlyReserve`. Si `exams.sync` necesita
  menos reserva, que sea una decisión escrita en `quota.ts` con su porqué, no un `/ 2` en el módulo.
- **Beneficio**: una sola tabla de prioridades para toda la cuota, revisable en un fichero.
- **Riesgo**: bajo; `quota.test.ts` (303 líneas) y `syncer.test.ts` cubren los escalones.
- **Esfuerzo**: S.

### Q3. Estado de 42 guardado con validación a mano

- **Dónde**: `exams.live.ts:84-95` (`stateOf` comprueba `typeof stored.at !== 'number' || !Array.isArray(stored.logins)`),
  `network.sync.ts` (`State` leído con `replica.getState<State>`), `agenda.ts`, `curriculum.ts`
  (`JSON.parse` propio).
- **Qué pasa**: `replica.getState<T>` hace un cast; cada consumidor valida (o no) la forma. Un
  cambio de forma del estado entre despliegues se descubre en producción.
- **Propuesta**: `getState(key, schema: z.ZodType<T>): Promise<T | undefined>` (ver B3), con los
  esquemas junto a cada `State`.
- **Esfuerzo**: S.

---

## Diez refactors con mejor relación beneficio/esfuerzo

1. **D5 + B3** — `toTextOrNull`, `toNumberOrNull`, `toBool`, `toBoolOrNull`, `toJson` en
   `core/db/rows.ts` (S). Quita ~70 expresiones repetidas y un `JSON.parse` que puede explotar.
2. **D1** — `inList(column)` / `listArg(values)` con `json_each` en `core/db/sql.ts` (M). 22 sitios,
   adiós al tope de 999 y al troceo por lotes.
3. **G1** — Gancho `onSend` con `Cache-Control: private, no-store` por defecto (S). 46 líneas y una
   fuga menos posible.
4. **D4 + G5** — `given({...})` o tipo `Clock & Logger` (S). 61 líneas de `=== undefined ? {} : {}`.
5. **D3** — `createTtlCache` en `stats/progress.service.ts` y `exams.service.ts` (S). Menos código y
   sin dos agregados a la vez.
6. **A4** — Guarda de reentrada en los `jobs` de `build-app.ts` (S). Evita trabajos solapados que
   gastan cuota.
7. **D2 + G6 + T3** — `isoAt`/`dayOf`/`startOfDayIso` en `core/time.ts`, quitar `nowIso()` de los
   repositorios (S+M). Repositorios deterministas.
8. **Q1 + Q2 + T5** — Regla escrita de quién llama a 42, escalones de reserva dentro de `quota`,
   test que lo compruebe (S). Documentación y código vuelven a coincidir.
9. **A2 + L4** — Módulo `presence` y `wire()` explícito en `composition.ts`; ESLint sobre `app/` (M).
   La composición vuelve a ser una lista.
10. **B1 + B4** — Índice `help_bookings (campus_id, status, day)` y `LIMIT` en `stats.ranking` (S).

Después, con más esfuerzo: A1 (repositorios de `clicker` y `admin`), L1 (los diez métodos
largos), D7 (ciclo de vida de salas), G2 (rutas a `*.routes.ts`), T1 (tests de `calendar`, `map`,
`meet`, `usage`).

## Lo que ya está bien y debe ser el modelo

- **`core/` pequeño y con un propósito por fichero**: `errors.ts` (códigos de dominio sin HTTP),
  `http/errors.ts` (la única traducción a estado), `actor.ts` (`assertAdmin`, 41 usos, ningún `if`
  propio salvo reglas de autor/admin legítimas), `validation.ts` (`parse` + `day` que exige que la
  fecha exista), `ttl-cache.ts` (dedupe de cargas, tope, no guarda fallos), `lock.ts`, `rate-limit.ts`
  (tope de claves), `data-store.ts` y `personal-data.ts` (cada módulo declara sus tablas y el
  panel/la descarga no se quedan atrás).
- **Fronteras respetadas y vigiladas**: ESLint con `no-restricted-imports`; comprobado con script:
  ningún módulo importa fichero interno de otro, ningún servicio importa `fastify`, ningún
  `*.rules.ts` toca la base, ningún repositorio lanza `DomainError`.
- **Rutas sin lógica**: `help.routes.ts`, `focus/index.ts`, `therapy.routes.ts`: una línea por
  ruta, `input: unknown` que valida el servicio, `reply.code(204)`. `routes.test.ts` recorre toda
  ruta nueva con entradas extremas.
- **Inyección de dependencias por función** (`createX(deps)`) con reloj inyectable en 26
  servicios; `Pick<ReplicaRepository, …>` en `exams.live.ts:38` como forma de acotar lo que se
  recibe.
- **Reglas puras en `*.rules.ts`** con tests propios en 19 de 20 (`exams.rules.ts` 610 líneas,
  `focus.rules.ts`, `cheat.rules.ts`, `budget.rules.ts`), y `network.analysis.ts` sin azar
  (Louvain determinista).
- **`replica/quota.ts`**: un solo sitio decide si se gasta cuota, con escalones, `halted`,
  cola con turno (`defer`) y la renovación horaria deducida cuando 42 no contesta.
- **`network.repository.ts:36` `IN_SCOPE`** con `json_each`: la forma correcta de pasar listas,
  lista para generalizar (D1).
- **Migraciones**: una por cambio, numeradas sin huecos, test de aplicación sobre base con datos,
  y corrección por migración nueva (`0066-no-correction-feedback`) en vez de editar la anterior.
- **Comentarios**: explican el porqué (muestra de 30, encabezados de `core/`), en español, sin
  parafrasear el código.
- **`npm run check` completo**: `knip` sin nada que marcar, `jscpd` al 0,47 % con 8/80, cobertura
  96/89 que solo sube.
