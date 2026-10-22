# Revisión de tests, CI, despliegue y operación — Sanatorio 42

Fecha: 2026-10-22. Revisión de solo lectura sobre `/home/alberto/Desktop/ideas/sanatorio-42`
(commit `9f3df2f`). Todo lo que se afirma se ha leído en el código o medido en
esta máquina; lo que no se pudo comprobar (GitHub, el servidor) va marcado como
**sospecha** o **sin verificar**.

Medidas tomadas aquí (portátil, no la CI):

| Qué | Resultado |
| --- | --- |
| `npm run test:coverage` | 32,6 s de reloj (2 m 10 s de CPU); API 1 335 tests en 65 ficheros; web 373 en 53 |
| `npm run check` | **1 m 17,7 s** de reloj (3 m 14 s de CPU). API tests 5,4 s, web tests 23,3 s; el resto (4 × `tsc`, ESLint con tipos, Prettier, knip, jscpd, textos) ≈ 49 s |
| `npm run build` (API + web + demo) | 9,7 s |
| jscpd | 9 clones, 134 líneas (0,11 %) sobre un umbral del 1 % |
| textos | 2 734 claves en 20 tablas, en orden |

## Resumen

El proyecto tiene una base de pruebas muy por encima de lo habitual para un
equipo de una persona: 1 708 tests, API al 98 % de líneas, un test que recorre
las 183 rutas con entradas hostiles, reglas delicadas en funciones puras con
reloj inyectado, y una CI que bloquea el despliegue si falla. Las carencias
están en los bordes del sistema, no en el centro:

1. **La vuelta atrás automática no funciona si el despliegue trae una
   migración**: el código anterior se niega a arrancar con un esquema más nuevo
   (`database.ts:146-154`, `build-app.ts:76-78`), así que `deploy.sh` acabaría
   en «La app no responde» con el contenedor reiniciándose en bucle. Es el
   fallo más grave y el más probable (6 de las últimas 14 migraciones tocan
   datos).
2. **Los errores 500 de producción no se registran**: el logger de Fastify
   está apagado salvo con `LOG_REQUESTS=true` (`build-app.ts:131`,
   `env.ts:207`), y `request.log.error` del manejador de errores
   (`error-handler.ts:252`) escribe en la nada. No hay forma de saber si un
   despliegue ha roto algo salvo que alguien lo cuente.
3. **La espera a la CI depende de 60 consultas/hora sin autenticar** a la API de
   GitHub desde la IP del servidor (`deploy.sh:27-37`); con dos despliegues
   seguidos o cualquier otro consumidor en esa IP, el despliegue se para hasta
   la hora siguiente. Hay alternativas sin cupo (una etiqueta de git que publique
   la CI, o desplegar desde la propia CI).
4. **Copias de seguridad**: en la misma máquina, retención por número (14) que
   con varios despliegues al día cubre tres o cuatro días, sin destino externo y
   sin ensayo de restauración documentado.
5. **La web tiene el 66 % de líneas cubiertas pero el mínimo exigido sigue en
   48 %**; tablón, terapia, Code Clicker, login, sala del evento y staff apenas
   tienen recorrido de pantalla. `docs/api.md` ha perdido el paso del código
   (22 rutas sin documentar, 18 documentadas que no existen) y nada lo vigila.
6. **Flujo de desarrollo**: todo va directo a `main` (136 commits en 7 días),
   sin hooks de git, sin PR, sin dependabot, sin versión ni etiqueta por
   despliegue. Funciona porque hay una sola persona, pero no hay red si
   `npm run check` se olvida.

## 1. Cobertura

### 1.1 Cifras y mínimos

**Dónde**: `apps/api/vitest.config.ts:26`, `apps/web/vitest.config.ts:30`, salida
de `npm run test:coverage`.

**Qué pasa**:

| | Líneas | Sentencias | Funciones | Ramas | Mínimo (líneas/sent./func./ramas) |
| --- | --- | --- | --- | --- | --- |
| API | 98,13 | 98,13 | 97,37 | 89,56 | 96 / 96 / 96 / 89 |
| Web | 66,30 | 66,30 | 53,96 | 80,68 | 48 / 48 / 44 / 78 |

- En la API, las ramas van al 89,56 % con mínimo 89: **medio punto de margen**;
  un cambio pequeño en un módulo grande puede tirar la CI sin que falte nada
  relevante, y la tentación será bajar el umbral.
- En la web los mínimos están **18 puntos por debajo de lo real** (líneas) y 10
  (funciones). `docs/tests.md:95` dice «solo suben»; hoy no protegen: se podrían
  borrar un tercio de los tests de pantalla sin que la CI lo note.
- `docs/tests.md:96-97` y `contexto.md:577` citan cifras antiguas (API 96 %,
  595 tests; README:636 habla de 608 y 310).

**Propuesta**: subir ya la web a 64/64/52/79 y la API a 97/97/96/89 (dejando un
punto de margen real en ramas), y añadir a `npm run check` un aviso cuando lo
real supere el mínimo en más de 3 puntos (un `node` de diez líneas leyendo
`coverage/coverage-summary.json`, añadiendo `json-summary` a los reporters), para
que subir el umbral sea parte del flujo y no un recuerdo. **Esfuerzo: S.**

### 1.2 Cobertura por módulo (API)

**Dónde**: tabla de `coverage/` de la API.

**Qué pasa** (líneas / ramas):

| Carpeta | Líneas | Ramas | Lo que falta |
| --- | --- | --- | --- |
| `integrations` (solo `slack.ts`) | 30 | 50 | Sin test: el aviso a Slack no se prueba (ni el timeout ni el `log` de fallo) |
| `modules/stats` | 82,7 | 78,9 | `progress.service.ts` **61,6 %**: el servicio con lógica menos cubierto del proyecto |
| `core/db` | 90,5 | 80,6 | `database.ts` 78 %: `tune` (WAL, `ANALYZE`) y `ensureParentDirectory` solo corren con fichero, nunca en tests |
| `modules/facility` | 92,2 | 84,1 | `facility.service.ts` 88,9 % |
| `modules/calendar` | 93,8 | 88,6 | `calendar.service.ts` 92,7 % |
| `modules/auth` | 95,3 | 87,2 | `oauth-client.ts` ramas 72 % |
| `app` | 95,5 | 93,3 | `error-handler.ts` 72 %: la rama de `ApiError` y el `log.error` no se ejercitan |
| `modules/clicker` | 98,7 | **85,8** | Es el módulo con más reglas de dinero y el de ramas más bajas entre los grandes |

El resto está entre el 96 y el 100 %. Los routes files (`boards.routes.ts` 91,7,
`help.routes.ts` 91,8, `therapy.routes.ts` 92, `quiz.routes.ts` 92,5) pierden
líneas en ramas de error que solo se ven por HTTP.

**Propuesta**: tests directos de `progress.service.ts` (cinco familias),
`slack.ts` (respuesta no ok, timeout, URL vacía), y un test de `openDatabase`
con un fichero temporal que compruebe WAL y `ANALYZE` (es lo que corre en
producción y lo único que no se prueba nunca). **Esfuerzo: S** cada uno.

### 1.3 Reglas sin test propio

**Dónde**: 20 ficheros `*.rules.ts`; `apps/api/tests/unit/`.

**Qué pasa**:

- `modules/usage/flows.rules.ts`: **ningún test lo importa**; su 95 % viene de
  pasada por `admin.test.ts`/usage. Es la única regla sin test directo.
- `modules/attendance/attendance.rules.ts` (las reglas de XP por códigos, las
  que AGENTS.md declara críticas) no tiene `attendance.test.ts`: se prueba desde
  `boards.test.ts:10,440-520` (`windowOf`, `validSpan`, `unionMinutes`) y
  `help.test.ts:38-56`. Lo que hay es bueno (reloj falso, «justo al terminar»,
  fin fuera de plazo, cinco fallos y se acabó, repetir código no mueve nada),
  pero está repartido y una persona que busque «dónde se prueba la asistencia»
  no lo encuentra.
- `meet.rules.ts`, `xp.rules.ts`, `budget.rules.ts`, `tickets.rules.ts`,
  `staff.rules.ts`, `styles.rules.ts`: un solo fichero de test cada una
  (correcto, pero ver 1.6 para las familias).

**Propuesta**: `tests/unit/attendance.test.ts` que reúna las reglas con los
cinco bordes de cada constante (`MARGIN_MS`, `MAX_LATE_MS`, `MIN_STAY_MS`,
`END_GRACE_MS`, `MAX_FAILED_ATTEMPTS`) a ±1 ms, y `flows-rules.test.ts`.
**Esfuerzo: S.**

### 1.4 Rutas: documentación y tests funcionales

**Dónde**: 183 rutas (`modules/*/index.ts`, `*.routes.ts`, `app/health.ts`);
`docs/api.md`; `tests/integration/routes.test.ts`.

**Qué pasa**:

- `routes.test.ts` recorre **las 183** (401 sin sesión, cookie falsa, 403 en
  `/admin`, cuenta bloqueada, 14 parámetros × 5 consultas × 15 cuerpos sin
  500). Eso está muy bien y entra solo.
- Pero **91 de las 183 rutas no aparecen en ningún otro test** (su ruta no se
  invoca por HTTP fuera de `routes.test.ts`; el servicio de detrás puede estar
  probado directamente). Lista completa en
  `/tmp/claude-1000/-home-alberto-Desktop-ideas/71998cc9-d76c-4a7c-8126-eec71a8187f6/scratchpad/routes-sin-test.txt`.
  Las que importan por riesgo:
  - `POST /events/checkin`, `POST /events/messages` (los códigos de asistencia
    por HTTP: es la superficie donde llega una trampa).
  - `PUT /clicker/save`, `POST /clicker/pill`, `POST /clicker/plus`,
    `POST /clicker/seizure/ack`, `POST /admin/clicker/sanction`,
    `POST /admin/clicker/cheats/:id/pardon`, `POST /admin/clicker/alerts/:id/review`.
  - `POST /admin/data/delete`, `POST /admin/data/preview`, `PUT /admin/roles`,
    `PUT /admin/blocks`, `DELETE /admin/blocks/:login`, `PUT /admin/limits`
    (destructivas o de permisos).
  - `GET /me/export`, `POST /me/legal/accept`, `GET /me/legal` (datos personales).
  - Todas las de salas: `/games/rooms/*` (8), `/gitcourse/rooms/*` (6),
    `/quiz/rooms/*` (6), `/gitcourse/gates/*`, `/gitcourse/levels/:id`.
- `docs/api.md` frente al código: **22 rutas sin documentar** (`GET /exams/live`,
  `GET /exams/stats`, `GET /gitcourse`, `GET /gitcourse/rooms(/:id)`,
  `GET /games/rooms(/:id)`, `GET /quiz/rooms(/:id)`, `GET /help/inbox`,
  `POST /help/bookings/:id/seen`, `GET|PUT|DELETE /me/focus`,
  `GET /me/focus/stats`, `POST /me/focus/stay`, `GET /admin/focus/stats`,
  `GET /admin/facility`, `GET /staff/facility`, `POST /admin/clicker/sanction`,
  `POST /groups/:id/invite`, `POST|DELETE /map/seats/:host/broken`) y **18
  documentadas que no existen** (`GET /admin/clicker`, `/admin/clicker/capital`,
  `/admin/clicker/game`, `/admin/flows`, `/admin/stats`, `/clicker/capital`,
  `GET /events/messages`, `GET /network`, `/network/pair`, `/network/strictest`,
  `GET /profiles/:login`, `POST /admin/totp/confirm`, `/admin/totp/verify`,
  `POST /clicker/pool/claim`, `POST /guide-proposals/:id/accept`,
  `POST /help/bookings/:id/accept`, `POST /reactions`; `GET /v2/teams` es de 42).
  Parte son renombres (la ruta existe con otro nombre): la lista exacta está en
  `scratchpad/code-not-docs.txt` y `docs-not-code.txt`. AGENTS.md exige el
  reflejo en `docs/api.md`; nada lo comprueba.

**Propuesta**: (a) un test en `routes.test.ts` que lea `docs/api.md`, extraiga
`(GET|POST|PUT|DELETE) /ruta` y lo compare con `built.routes` en los dos
sentidos (lista de excepciones con porqué, como `OPEN`); así una ruta nueva sin
documentar rompe la CI (**S**). (b) Para las 91 rutas: no hace falta un test por
ruta; sí un test de integración por **flujo** en las zonas de riesgo (códigos por
HTTP, guardado del clicker con trampa, borrado de datos, salas) (**M**).

### 1.5 Web: pantallas sin recorrido

**Dónde**: `apps/web/tests/ui/*.test.tsx` (19 ficheros), tabla de cobertura de la web.

**Qué pasa**: hay recorrido de sala de espera, pizarras (apuntarse), guardia,
buscador, idioma, 404, exámenes, exámenes en vivo, incidencias del edificio,
calendario (vistas y abrir evento), panel de gestión (pestañas, trampas, buzón,
menú, personalizar), terapias (abrir/cerrar formulario), red/clústeres/exámenes
(se pintan), secciones todas, Pomodoro (entrar, salir, estadísticas), curso de
git y pruebas de grupo, franjas de guardia, condiciones legales, modos,
estadísticas de ayuda, Not-games, hueco de login, otro campus, demos. Faltan,
por cobertura de sus componentes:

| Funcionalidad | Cobertura | Ficheros casi a cero |
| --- | --- | --- |
| Staff (`#/validar`) | 7,3 % | `StaffPage.tsx` 1 % |
| Tablón de dudas | 12,4 % | `DoubtBoard` 18,9, `DoubtForm` 5,9, `DoubtDetailCard` 1,2, `HolyGraph` 2,3, `CorrectionGraph` 4,2, `GuidePanel` 1,9 |
| Code Clicker | 39,2 % | `CodeClicker.tsx`, `Card`, `Bust`, `Mini`, `scene`, `sound` al **0 %**; `ReviewGate` ramas 25 % |
| Login | 39,2 % | `Login.tsx` 14,6 |
| Sala del evento | 42,6 % | `Attendance.tsx` 19,7 (donde se teclean los códigos), `Chat` 43,7, `EventRoom` 51,8, `AlertCenter` 45,7 |
| Terapia | 44,2 % | `GroupCard` 1,4, `GroupForm` 52,9 (no se llega a crear un grupo) |
| Red | 58,6 % | `PersonPanel` 2,8, `PairDetail` 5,1 |
| Pizarras | 59 % | `BoardForm` 1,4 (nunca se crea una pizarra) |
| Sala de espera | 61,4 % | `PeerList.tsx` 33,9 — ahí vive `onDuty`, la regla de producto de AGENTS.md |
| Buzón | 63,7 % | `PeerPicker` 3,5 (empezar una conversación) |
| Panel | 64 % | `ClickMap` 3, `SanctionForm` 3, `FlowsPanel` 3,4, `Inbox.tsx` 0 |
| Clústeres | 64 % | `ProjectMap` 7,9, `SeatHoverCard` 5,3, `SeatPicker` 29,9 (proponer puestos) |

`shared/api/client.ts` (el cliente real) tiene 3,5 % de funciones: esperable,
porque los tests usan el simulado; pero significa que la forma de las URLs y la
lectura de errores del cliente real no se prueban nunca (ver 1.6, auth).

**Propuesta**: seis recorridos nuevos, por orden de valor: (1) sala del evento —
validar código de inicio y de fin, código mal, quinto fallo; (2) tablón — crear
duda, responder, resolver, grafo; (3) terapia — crear grupo con puestos, fichar;
(4) pizarra — crear, con la última plaza y la primera que sobra; (5) Code
Clicker — pulsar 42 veces, elegir pastilla, guardar, ventana de revisión;
(6) `PeerList`: de guardia / fuera de turno / fuera del centro con los tres
casos de `onDuty`. Más un test de `client.ts` contra un `fetch` falso (URL,
método, cuerpo, 401 → sesión caducada, 503 → corte). **Esfuerzo: M.**

### 1.6 Las cinco familias en los flujos críticos

| Flujo | Normal | Límite | Vacío y enorme | Imprevisible | Permisos | Huecos concretos |
| --- | --- | --- | --- | --- | --- | --- |
| Códigos de asistencia (`boards.test.ts:239-520`, `help.test.ts:38-56`) | Sí | Sí (justo al terminar, fin fuera de plazo, 5 fallos) | Parcial (`routes.test` da 500-cero; no hay test con código de 3 000 caracteres a nivel de servicio) | **No visto**: dos validaciones simultáneas del mismo código, reloj que retrocede | Parcial: «la reserva la tiene que aceptar quien ayuda»; **no visto**: un tercero que no es de la sesión valida un código | Concurrencia y permisos de tercero |
| Sesiones de ayuda (`help.test.ts`) | Sí | Sí (tope del día, última media hora, medias horas empezadas) | Sí (sin franjas) | Sí (cuota justa → turno) | Sí (bloqueos, sin valorar no reservas) | `MAX_ACTIVE_REQUESTS` (3) sin test del 3.º y 4.º por título |
| Code Clicker (`clicker.test.ts`, `clicks*.test.ts`) | Sí | Sí (50/51 por segundo, 9 justos) | **No visto**: el `10¹⁵ líneas` que `docs/tests.md` pone de ejemplo | Sí (partida vieja no pisa, reparto tardío) | Sí (solo admin ve/sanciona) | `PUT /clicker/save` nunca por HTTP (cuerpo manipulado, tamaño, campos de más) |
| Auth/sesión (`auth.test.ts`, `server.test.ts`, `second-factor.test.ts`) | Sí | Sí (caducidad firmada, `exp` ausente) | Sí (payload no JSON) | Sí (state plantado, cookie manipulada, 404 de scope) | Sí (staff fuera de `/staff`, admin sin 2.º factor) | Completo. Único matiz: TOTP con reloj real (ver 2.1) |
| Cuota de 42 (`quota.test.ts`, `syncer.test.ts`, `forty-two-client.test.ts`, `limits.test.ts`) | Sí | Sí (70/90 %, 90/95 %, mes nuevo) | Sí (sin base, sin cabeceras) | Sí (429, 503, timeout, 42 caída) | Sí (admin no hace cola) | **No visto**: última página exactamente llena (`PAGE_SIZE` elementos) → ¿pide una más? |
| Migraciones (`migrations.test.ts`) | Sí (base nueva, idempotente) | Sí (versión por detrás / por delante) | **Parcial**: 1→última con una sola fila | **No**: fallo a mitad (sentencia rota en la N+1) | n/a | Ver 2.5 |

**Propuesta**: cuatro tests cortos (concurrencia de códigos con `Promise.all`,
código de tercero, página exactamente llena, migración que falla a mitad y deja
la versión anterior intacta). **Esfuerzo: S.**

## 2. Calidad de los tests

### 2.1 Riesgos de intermitencia

**Dónde / qué pasa**:

- **Temporizadores reales en los tests de pantalla**: `tests/ui/render.tsx:87`
  (`settle(600)`), `:111` (`settle(900)`), `answerGates` con rondas de 300 ms
  cuyo propio comentario (`render.tsx:118-119`) dice que sin ello «un test podría
  encontrárselas o no según lo rápida que sea la máquina». 24 usos de
  `settle`/`setTimeout` en `tests/ui`; solo 4 de 19 ficheros usan
  `vi.useFakeTimers` (`exams-live`, `focus-exit`, `guard-slots`, `tours`).
  `sections.test.tsx` necesita 15 s de timeout por sección. Consecuencia: la
  suite web gasta 110 s de CPU, mayormente esperando, y en una CI lenta o
  cargada puede fallar sin que nada esté roto. La API de mentira añade
  `delay()` en cada método (`shared/api/mock/state.ts`, usado en `mock/boards.ts:17`…).
- **Reloj real en tests de la API**: `community.test.ts:68,433,725,813,819`
  calcula «mañana», «dentro de N minutos» y rangos con `Date.now()` → un test que
  corra a las 23:59 cruza el día entre dos líneas (sospecha razonable; el resto
  de la suite usa `clock.advance`). `second-factor.test.ts:73-151` y
  `test-app.ts:320` generan el TOTP con la hora real; lo salva `DRIFT_STEPS` en
  `totp.ts:105`, así que es tolerante, pero «un código usado no vale otra vez»
  depende de que dos pasos no cambien de minuto.
- **Reloj no inyectado en servicios**: 56 usos de `Date.now()`/`new Date()` en
  `src` (excluidos `cli` y el banco de preguntas): `network.sync.ts` (8),
  `admin.service.ts` (6), `meet.service.ts` (5), `composition.ts` (5, con
  `config.now ?? Date.now` en `:204` y `:406`), `map.service.ts` (4),
  `curriculum.ts` (3). La skill `probador` y `nueva-funcionalidad` piden `now`
  inyectable; estos módulos no lo cumplen del todo, y por eso sus tests tienen
  que trabajar con la hora real.
- **Estado compartido**: no hay. Cada `makeApp` abre `file::memory:`
  (`test-app.ts:274-278`). `fixtures.ts:58` lleva un `nextRowId` global: los ids
  dependen del orden de los `it` dentro del fichero (inofensivo hoy).
- **Red**: ninguna; `fetchImpl` inyectado. Correcto.
- `fake-api.ts:93` usa `setTimeout` real para simular latencia.

**Propuesta**: (1) en la web, un `delay()` del mock que sea 0 cuando
`import.meta.env.VITEST` y sustituir `settle(ms)` por `await screen.findBy…`
(`waitFor`), que es lo que recomienda Testing Library y lo que `docs/tests.md`
cita; (2) en `community.test.ts`, un `now` fijo pasado a `makeApp({ now })` como
ya hace `buildApp` (`build-app.ts:40`); (3) inyectar `now` en `meet`, `map`,
`network.sync`, `admin` (son opciones ya previstas en `composition.ts:151`).
**Esfuerzo: M** (1), **S** (2 y 3).

### 2.2 Tests lentos

**Dónde**: salida de vitest.

| Fichero | Tiempo | Tests |
| --- | --- | --- |
| `web/tests/ui/panels.test.tsx` | 21,9 s | 7 |
| `web/tests/ui/notgames.test.tsx` | 16,9 s | 4 |
| `web/tests/ui/sections.test.tsx` | 15,7 s | 15 |
| `web/tests/ui/modes.test.tsx` | 11,5 s | 7 |
| `web/tests/ui/flows.test.tsx` | 10,7 s | 6 |
| `web/tests/gitrooms-mock.test.ts` | 7,1 s | 4 |
| `api/tests/integration/routes.test.ts` | 4,4 s | 14 |
| `web/tests/ui/gitgroups.test.tsx` | 3,9 s | 1 |
| `web/tests/ui/stats.test.tsx`, `exams.test.tsx` | 3,7 s | 2 |
| `api/tests/integration/community.test.ts` | 3,1 s | 35 |

Los cinco primeros son tiempo de espera, no de cálculo (ver 2.1). La API entera
corre en 5,4 s: ejemplar.

**Propuesta**: la de 2.1(1) debería bajar la web de ~25 s a menos de 10 s de
reloj. **Esfuerzo: incluido arriba.**

### 2.3 Helpers duplicados

**Dónde**: `apps/api/tests/`.

- El envoltorio `async function app(...)` que acumula apps y las cierra en
  `afterEach` está copiado en **5 ficheros** (`routes.test.ts:18-28` y otros
  cuatro de integración). `send` ×3 y `group` ×3 también repetidos.
- `tests/helpers/` ya tiene `test-app.ts` (363 líneas), `community.ts`,
  `fake-42.ts`, `fake-api.ts`, `fixtures.ts`, `rows.ts`: la infraestructura
  común es buena; falta el `apps()` con autocierre.
- En la web no hay funciones duplicadas por nombre; `render.tsx` y `must.ts`
  cumplen.

**Propuesta**: `tests/helpers/apps.ts` que exporte `useApps()` (devuelve `app()`
y registra el `afterEach`). jscpd no lo detecta porque excluye `tests/`
(`package.json` `duplicates` solo mira `src`). Añadir `apps/*/tests` a jscpd con
un umbral propio. **Esfuerzo: S.**

### 2.4 Tests que afirman detalles de implementación

- `migrations.test.ts:42-137` fija la lista **exacta** de las 88 tablas: cada
  migración obliga a editar el test (la skill `migracion` paso 4 lo asume). Es
  deliberado como barrera, pero mide estructura, no comportamiento; valdría con
  comprobar que las tablas con logins están declaradas en `personal` y que no
  sobra ninguna tabla sin dueño.
- `render.tsx:123-126` busca `dialog[open]`, `.welcome`, `.legal-gate`,
  `.actions button` por **clase CSS**, en contra de `docs/tests.md:98-101`
  («nunca por clases CSS»). Si se renombra la clase, los tests siguen pasando
  pero dejan de contestar las ventanas y empiezan a fallar en cascada sin pista.
- `routes.test.ts:166-181` acepta 200 **o 400** en todos los GET de `/admin`
  sin parámetro: un GET que empiece a devolver 400 por un fallo pasaría.

**Propuesta**: `answerGates` por `role="dialog"` y `getByRole('button')` dentro
del diálogo; en `routes.test`, lista explícita de las rutas que exigen parámetro
y 200 para el resto. **Esfuerzo: S.**

### 2.5 Migraciones: lo que no se prueba

**Dónde**: `migrations.test.ts`, `core/db/database.ts:95-113`, skill `migracion`.

**Qué pasa**:

- Se prueba: base nueva, idempotencia, 1→66 con una fila, versión por detrás y
  por delante, numeración sin huecos, y cuatro migraciones con datos (35, 36,
  37, 52). Buen esquema.
- 6 migraciones transforman datos (`0008`, `0029`, `0036`, `0037`, `0063`,
  `0066`); `0008`, `0029`, `0063` y `0066` no tienen test con datos.
- `docs/tests.md:63-64` exige «sobre la base de la versión anterior con datos
  dentro»; no hay ningún test ni paso de CI que aplique las migraciones
  pendientes a una **copia del esquema de producción con datos reales (o
  realistas en volumen)**. La skill `migracion` propone mirar una copia con
  `sqlite3 -readonly` a mano.
- Cada migración va en un `db.batch` (atómico) junto con la versión: un fallo a
  mitad deja la versión anterior. Pero **no hay test de ese fallo** (una
  sentencia rota en la N+1 → la N queda aplicada y la app no arranca).
- No existe el concepto de vuelta atrás de esquema (`down`); es una decisión
  (solo adelante) coherente con SQLite, pero entonces la vuelta atrás del
  despliegue necesita la copia (ver 4.2).
- `backup.sh` copia en caliente con `VACUUM INTO`, y las migraciones corren
  dentro del proceso al arrancar (`database.ts:46`): si una tarda más de 60 s
  (`deploy.sh:88-93`, 30 × 2 s) sobre las ~86 000 correcciones,
  `deploy.sh` da la versión por muerta y lanza la vuelta atrás mientras la
  migración sigue ejecutándose.

**Propuesta**: (1) test de «fallo a mitad» con una migración falsa; (2) un
ensayo semanal **en el servidor** (cron, no CI: los datos son personales):
descomprimir la última copia en `/tmp`, `docker run --rm -v copia:/data imagen
node dist/cli/migrate.js` sobre ella, y publicar el resultado y la duración en
el panel/Slack; (3) en CI, el mismo ensayo sobre una base **sintética** con
volumen (10⁴ usuarios, 10⁵ correcciones generados por un script) para medir la
duración de las migraciones nuevas y fallar si pasa de 30 s. **Esfuerzo: M.**

## 3. CI

### 3.1 Qué comprueba `ci.yml` y qué le falta

**Dónde**: `.github/workflows/ci.yml`.

**Qué pasa**: dos trabajos en paralelo. `check`: `npm ci`, typecheck, lint,
format:check, knip, jscpd, textos, `test:coverage` (con mínimos) y `build`
(que incluye `build:demo`, verificado en `apps/web/package.json` `build`).
`image`: construye la imagen con buildx y caché `gha`, sin publicar. Caché de
npm por `setup-node`. `concurrency` con `cancel-in-progress`. Se dispara en
`push` a `main` y en `pull_request` (que hoy no se usa).

Le falta:

| Hueco | Por qué importa |
| --- | --- |
| Sin `timeout-minutes` ni `permissions:` | Un job colgado consume minutos; el token por defecto tiene más permisos de los necesarios |
| Sin `npm audit` ni *dependency review* | 21 dependencias de ejecución y ~30 de desarrollo; no hay aviso de CVE |
| La imagen se construye pero **nunca se arranca** | Un `CMD` roto, un `STATIC_DIR` mal o una migración que no arranca se descubre en producción. Hoy el único «smoke» es `healthy()` en el servidor |
| Sin comprobación de `docs/api.md` ↔ rutas | Ya hay 40 discrepancias (1.4) |
| Sin presupuesto de tamaño del bundle | El chunk `useAsync-*.js` pesa 159 kB (53 kB gz); no hay `chunkSizeWarningLimit` ni `size-limit`; la demo duplica la web (6,2 MB en `dist`) |
| Sin ensayo de migraciones con datos | Ver 2.5 |
| Sin subir `lcov`/resumen de cobertura como artefacto | La cifra solo se ve en el log |
| Sin shellcheck | Cuatro scripts `sh` críticos (`deploy.sh`, `backup.sh`, `restore.sh`, `limits-guard.sh`) sin ningún test ni lint; `limits-guard.sh:46-51` tiene ganchos «para las pruebas» (`GUARD_TX_FILE`, `GUARD_COMPOSE`) que nadie usa |
| `image` repite `npm ci` + `build` dentro de Docker | Duplica tiempo; aceptable mientras la imagen no se publique |

Tiempo de la CI: **sin verificar** (sin acceso a GitHub). `deploy.sh:30-31`
asume «4 minutos como poco». En local, `check` + `build` suman ~1,5 min de
reloj; en `ubuntu-latest` (2 vCPU) es plausible que ronde los 4-6 min más la
imagen.

**Propuesta** (en orden):

1. `permissions: contents: read`, `timeout-minutes: 15` en ambos jobs. **S**
2. Paso *smoke* en `image`: `docker run -d -e … imagen`, esperar `/health/db`,
   `curl /` (la web), `curl /demo/`, `curl /api/health/db`; parar. Cubre lo que
   `healthy()` cubre pero antes de tocar producción. **S**
3. `npm audit --omit=dev --audit-level=high` (con `continue-on-error` el primer
   mes para ver el ruido) + Dependabot (5.5). **S**
4. Test de `docs/api.md` (1.4) y `shellcheck infra/scripts/*.sh`. **S**
5. Test de `limits-guard.sh` con sus propios ganchos (`GUARD_TX_FILE` con un
   contador falso, `GUARD_COMPOSE=echo`, `GUARD_SYSTEMCTL=echo`): 0 %, 89,9 %,
   90 %, 95 %, mes nuevo, reinicio de la tarjeta. Es la regla de «no pagar
   nunca» y no tiene ni un test. **S**
6. Presupuesto de bundle: `build.chunkSizeWarningLimit` + un script que falle si
   el gz total del `index` + chunk mayor supera un tope fijado hoy. **S**

### 3.2 `deploy.yml`: ¿quitarlo o convertirlo en el camino real?

**Dónde**: `.github/workflows/deploy.yml`, `deploy.sh:97-99,121`,
`docs/contexto.md:439-454`, skill `desplegar`.

**Qué pasa**: es manual (`workflow_dispatch`), publica la imagen en GHCR para
amd64+arm64 y lanza por SSH `git pull --ff-only && infra/scripts/deploy.sh`.
Hoy no se usa: `APP_IMAGE` está vacío en producción (contexto) y la máquina
construye la imagen ella misma (8-15 minutos según la skill, en 1 OCPU ARM).
Además, tal como está, **tiene dos fallos** si alguien lo lanzara:

- No llama a `backup.sh` antes (el camino manual sí: skill `desplegar`).
- En modo `APP_IMAGE`, `deploy.sh` ni espera a la CI (la imagen viene de ella,
  bien) **ni puede volver atrás** (`BUILT_HERE=0`, `deploy.sh:121`).

**Propuesta**: convertirlo en el camino real, no borrarlo, porque resuelve de
golpe tres problemas: el cupo de la API de GitHub (ya no hay que preguntar: el
despliegue es el último paso de la propia CI), los 8-15 min de compilación en la
máquina (la imagen multiarquitectura sale de la CI con caché) y el `setsid
nohup` (el runner espera, no el SSH de Alberto). Cambios:

1. Un solo workflow: `check` → `image` (push a GHCR, etiquetas `sha-<sha>` y
   `latest`) → `deploy` (`needs: [check, image]`, `environment: production`,
   `concurrency: deploy`), solo en `push` a `main`.
2. `deploy` hace por SSH: `backup.sh && APP_SHA=<sha> deploy.sh`. `deploy.sh` en
   modo imagen: `docker pull ghcr.io/…:sha-<sha>`, etiqueta la imagen actual
   como `previous`, `up -d`, `healthy()`, y si falla vuelve a `previous`
   (hoy solo lo hace si construyó aquí).
3. En la máquina, `docker login ghcr.io` una vez con un token de solo lectura de
   paquetes (o paquete público: el repo ya es público, puesto que la API se
   consulta sin token).
4. Mantener `deploy.sh` ejecutable a mano con `SIN_CI=1` para emergencias, como
   hoy.

**Esfuerzo: M.** Si no se quiere ir por ahí, hay que **borrarlo**: un camino de
despliegue sin probar y con secretos sin configurar (sin verificar) es una
trampa para quien lo encuentre en la pestaña Actions.

## 4. Despliegue y operación

### 4.1 La espera a la CI por la API pública de GitHub

**Dónde**: `infra/scripts/deploy.sh:24-85`; `docs/contexto.md:450-454`;
memoria «cupo de la API de GitHub».

**Qué pasa**: 60 consultas/hora por IP, compartidas con todo lo que salga de la
máquina. Primera consulta a los 240 s, luego una por minuto, 16 como mucho;
antes de cada una, `/rate_limit`; con ≤ 10 % de reserva se **niega a
desplegar** y dice a qué hora vuelve. Es decir: un despliegue que coincide con
otra CI lenta, o dos seguidos, pueden dejar la máquina sin poder desplegar
hasta una hora, justo cuando más falta hace (un arreglo urgente). Además la
regla del 90 % es una convención de la persona, no del sistema.

**Propuesta** (tres opciones, de menor a mayor cambio):

- **A. La CI publica el veredicto en git** (sin API, sin secretos en la
  máquina): último paso de `check` en `main`:
  `git tag ci-ok/${GITHUB_SHA} && git push origin ci-ok/${GITHUB_SHA}`
  (`permissions: contents: write`). `deploy.sh` espera con
  `git ls-remote --exit-code origin refs/tags/ci-ok/$sha` cada 30 s: va por el
  mismo transporte de git que el `pull`, sin cupo. Borrar etiquetas de más de
  30 días en el mismo paso. **S.**
- **B. Token de solo lectura** (*fine-grained PAT*, sin permisos, o `gh auth`):
  5 000/h. Resuelve el cupo pero mete un secreto más en la máquina. **S.**
- **C. Desplegar desde la CI** (3.2): desaparece la pregunta. **M.**

Recomendación: A hoy, C como destino.

### 4.2 Vuelta atrás cuando el contenedor no arranca

**Dónde**: `deploy.sh:107-129`; `core/db/database.ts:34-53,146-154`;
`app/build-app.ts:72-78`; `compose.yml:21`; `restore.sh:13-16`.

**Qué pasa**: antes de construir, la imagen que funciona se etiqueta `previous`;
si la nueva no contesta a `/health/db` en 60 s, se vuelve a `previous`. Pero:

1. La app nueva aplica las migraciones **al arrancar** (`openDatabase` →
   `migrate`). Si el despliegue trae una migración y falla *después* (o la
   migración 2 de 2 falla, o simplemente la app no arranca por otra cosa), la
   base queda en la versión N+1. La imagen `previous` espera N:
   `assertSchemaIsCurrent` lanza «está en la versión N+1 y el código espera la
   N» y el contenedor muere; `restart: unless-stopped` lo reinicia en bucle;
   `deploy.sh` imprime «La app no responde» y sale con 1. **La vuelta atrás
   automática no sirve en el caso más frecuente** (14 de las 66 migraciones
   son de las últimas dos semanas).
2. Para salir de ahí hace falta `restore.sh`, que es **interactivo**
   (`read -r answer`) y, por tanto, no se puede meter en el `setsid nohup`, y
   que pierde lo escrito entre la copia y la restauración.
3. `healthy()` da 60 s. Una migración pesada sobre `corrections` (86 000 filas)
   puede tardar más en 1 OCPU; se dispararía una vuelta atrás **a mitad de
   migración** (el `batch` es atómico, así que la base no se corrompe, pero el
   despliegue se declara fallido sin motivo).
4. `docker image prune -f` (`deploy.sh:113`) corre antes de la salud; solo quita
   imágenes sin etiqueta, así que `previous` sobrevive (correcto).

**Propuesta**:

1. Separar migración de arranque en el despliegue: `deploy.sh` ejecuta
   `docker compose run --rm app node dist/cli/migrate.js` **antes** de `up -d`,
   con la copia ya hecha; si falla, no se toca el contenedor que corre
   (el viejo sigue sirviendo con el esquema viejo: el `batch` atómico garantiza
   que no quedó a medias). `migrate.ts` ya existe (`src/cli/migrate.ts`).
2. Si tras migrar la app nueva no arranca: `restore.sh --yes copia-pre-deploy`
   automático + `previous`. Hay que añadir el `--yes` y el nombre de la copia
   que `backup.sh` acaba de hacer (que `backup.sh` escriba la ruta en un
   fichero, p. ej. `infra/backups/ultima`).
3. `healthy()` a 180 s y que compruebe además que `/health/db` devuelve la
   versión de esquema esperada (ver 6.3).
4. Un `flock` al principio de `deploy.sh` (dos despliegues no pueden solaparse;
   hoy nada lo impide) y `backup.sh && deploy.sh` en vez de `;` en la orden del
   `nohup` (hoy si la copia falla se despliega igual: skill `desplegar` y
   `contexto.md:446`).

**Esfuerzo: M** (1-2), **S** (3-4).

### 4.3 Copias de seguridad

**Dónde**: `infra/scripts/backup.sh`, `restore.sh`, `infra/oracle/cloud-init.yaml:28-31`,
`docs/revision-seguridad.md:280-286`, `docs/contexto.md:595-599`.

**Qué pasa**:

- Frecuencia: una cada noche a las 04:00 (cron como `ubuntu`) y una antes de
  cada despliegue (por la orden de la skill, no por `deploy.sh`).
- Retención: **las 14 últimas por número** (`backup.sh:61-62`). Con el ritmo
  actual (136 commits en 7 días, despliegues por bloque), 14 copias pueden
  cubrir solo tres o cuatro días: una corrupción descubierta una semana después
  ya no tiene copia anterior.
- Destino externo: previsto (`BACKUP_REMOTE` con rclone) pero **sin configurar**
  (revisión de seguridad, «Pendiente»). Si Oracle reclama la máquina, se pierde
  todo lo propio (XP, guardias, dudas, pizarras).
- Con la guardia al 95 %, `backup.sh` sale con 0 sin hacer nada
  (`backup.sh:22-25`): correcto, pero nadie se entera salvo leyendo
  `/var/log/sanatorio-backup.log`.
- No se verifica la copia (`gzip -t`, `PRAGMA integrity_check`) ni se comprueba
  que su `schema_version` coincide con el código al restaurar.
- `restore.sh`: para la app (caída), borra `-wal`/`-shm` (bien), copia, `chown`,
  arranca. Interactivo. **No hay constancia de que se haya ejecutado nunca**
  («hay una copia comprobada» en `contexto.md:597` se refiere a que la copia
  existe; no verificado un ensayo de restauración).
- Las copias viven en `infra/backups/` dentro del repo clonado, con el mismo
  usuario que hace `git pull`.

**Propuesta**:

1. Retención por tiempo y por tipo: `nocturna-*` 30 días, `predeploy-*` las 10
   últimas; nombre con el motivo. **S**
2. Verificación en la propia copia: `gzip -t` y
   `sqlite3 copia "PRAGMA integrity_check"` (o el mismo `node -e` con libsql),
   y escribir el resultado en un fichero que lea el panel (ver 6). **S**
3. Destino externo gratuito: Oracle Object Storage (10 GB en Always Free, dentro
   de la regla del 90 % porque la copia comprimida es de MB) con `rclone` y un
   bucket con *retention rule*; `BACKUP_REMOTE` en el cron. La subida es
   tráfico de salida: ya está contemplado por la guardia (`backup.sh:64-66`). **S**
4. Ensayo de restauración mensual automatizado en un contenedor aparte (no toca
   `/data`): restaurar la última copia en `/tmp`, arrancar la imagen actual con
   ese volumen en otro puerto interno, `/health/db` y `sync-status`, apagar.
   Resultado al panel/Slack. Es también el test de migraciones sobre datos
   reales de 2.5. **M**

### 4.4 `limits-guard.sh`

**Dónde**: `infra/scripts/limits-guard.sh`; `cloud-init.yaml:36-39`;
`compose.yml:23-28`; `admin/budget.rules.ts`.

**Qué pasa**: cuenta `tx_bytes` de la interfaz cada 5 min como root, guarda
mes/total/último en `/var/lib/sanatorio-guard/egress`, escribe el nivel en el
volumen de datos para la web, enmudece unidades de systemd al 90 % y para los
contenedores al 95 %, y lo deshace al cambiar de mes. Está bien pensado (reinicio
de la tarjeta, mes UTC, `status`). Riesgos:

- **Cero tests** pese a tener ganchos para ello (3.1).
- Si el cron no corre (máquina reiniciada antes de clonar, `cron` parado), la
  web solo tiene su propia cuenta de bytes servidos: nadie avisa de que la
  guardia lleva horas sin pasar. El fichero `level` no lleva fecha.
- `percent=$((total * 100 / LIMIT_BYTES))`: con 10 TB entra en 64 bits; correcto.
- Al 90 % enmudece `unattended-upgrades` y lo rearma al mes siguiente: si el
  corte dura semanas, la máquina no recibe parches de seguridad. Decisión
  consciente (coste cero); conviene que el panel lo diga.

**Propuesta**: test con los ganchos (3.1, punto 5); que la guardia escriba
también `last-run` y que `/health/db` (o el panel) avise si tiene más de 15 min.
**Esfuerzo: S.**

### 4.5 Salud, tiempo de parada y arranque

**Dónde**: `app/health.ts`, `infra/docker/Dockerfile:64-65`, `Caddyfile:38-42`,
`compose.yml:46-50`.

**Qué pasa**: `/health` (vive), `/health/db` (`SELECT 1`). Docker `HEALTHCHECK`
cada 30 s con 20 s de gracia; Caddy `health_uri /health` cada 30 s (pasivo).
`compose.yml` no define `healthcheck` ni `depends_on: condition:
service_healthy`: Caddy arranca y enruta aunque la app esté migrando → 502
durante el arranque. `docker compose up -d --build` construye primero y
recrea después, así que la parada es: `stop` (10 s de gracia por defecto; el
cierre ordenado está en `main.ts:14-31`) + arranque + migraciones. Con un solo
SQLite no hay azul/verde razonable; lo que sí se puede es acortar y no mentir:

**Propuesta**: `stop_grace_period: 20s`; Caddy con `lb_try_duration 15s` en
`reverse_proxy` (reintenta la conexión en vez de dar 502 mientras la app
arranca: quita casi toda la parada visible); `/health/db` que devuelva versión de
esquema esperada/real, sha del build, edad de la última sincronización y nivel
de la guardia (ver 6.3). **Esfuerzo: S.**

### 4.6 Registros y rotación

**Dónde**: `compose.yml:40-44,61-65`; `cloud-init.yaml:31,39`; `Caddyfile`.

**Qué pasa**: los contenedores rotan (`json-file`, 10 MB × 3). Los logs de cron
(`/var/log/sanatorio-backup.log`, `/var/log/sanatorio-limits.log`) crecen sin
`logrotate` (la guardia escribe una línea cada 5 min solo cuando hay algo, así
que es lento, pero infinito). `infra/deploy.log` se sobrescribe en cada
despliegue: no hay historial de despliegues. Caddy no tiene `log`: no hay
registro de accesos ni de 5xx (bien para privacidad; mal para detectar un
despliegue roto).

**Propuesta**: `/etc/logrotate.d/sanatorio` (semanal, 8 copias) en
`cloud-init.yaml`; `deploy.log` con fecha (`infra/deploy-YYYYMMDD-HHMM.log` y
enlace `deploy.log` al último); en Caddy, `log` solo de respuestas ≥ 500 con
`format filter` sin IPs. **Esfuerzo: S.**

### 4.7 Secretos en la máquina

**Dónde**: `compose.yml:22` (`env_file: .env`), `infra/.env.example`,
`docs/contexto.md:640-642`, `docs/revision-seguridad.md:276-277`,
`cloud-init.yaml:50`.

**Qué pasa**: `infra/.env` con permisos 600 contiene `FORTY_TWO_SECRET` y
`SESSION_SECRET`; entran como variables del contenedor (visibles con `docker
inspect` para cualquier usuario del grupo `docker`, que es `ubuntu`: aceptable
con una sola persona). **Pendiente desde 2026-10-11**: rotar el secreto de la app
de 42 que se vio en una conversación. Hay un fichero `.env.notas-42` (600) en la
raíz del repo, ignorado por git por el patrón `.env.*`: **sospecha** (no se ha
leído) de que guarda credenciales junto al código; mejor fuera del árbol del
repo. `deploy.yml` necesitaría `DEPLOY_SSH_KEY` en GitHub: **sin verificar** si
existe.

**Propuesta**: rotar el secreto de 42 hoy; mover `.env.notas-42` a
`~/.config/sanatorio/`; si se adopta el despliegue desde la CI, una clave SSH
dedicada con `command="…"` en `authorized_keys` restringida al script de
despliegue. **Esfuerzo: S.**

### 4.8 Monitorización y alertas

**Dónde**: `build-app.ts:86-88` (`createSlackPoster`), `integrations/slack.ts`,
`modules/admin/index.ts:282-284` (`/admin/consumption`), `docs/deploy-oracle.md:383-386`.

**Qué pasa**: no hay ningún monitor externo ni alerta operativa. El webhook de
Slack existe pero solo lo usan los avisos del edificio (`facility`). El panel
enseña consumo de tráfico, cuota de 42, gente conectada, tickets; no enseña
errores 500, fallos de trabajos de fondo (van a `stderr`, `build-app.ts:181-184`),
edad de la última copia ni si la guardia pasó. La única alerta recomendada es la
de presupuesto de Oracle (por correo, manual).

**Propuesta**: ver sección 6. **Esfuerzo: M** en total.

### 4.9 El patrón `setsid nohup`

**Dónde**: skill `desplegar`, `docs/contexto.md:444-449`.

**Qué pasa**: nació de dos despliegues muertos por corte de SSH. Funciona, pero:
no hay cerrojo (dos lanzamientos se solapan), `backup.sh; deploy.sh` sigue aunque
la copia falle, la salida va a un único `deploy.log` sobrescrito, y la vigilancia
es un bucle de `ssh tail -1` cada 60 s desde el portátil (40 conexiones por
despliegue).

**Propuesta**: `systemd-run --unit=sanatorio-deploy --collect sh -c 'backup.sh
&& deploy.sh'` en vez de `setsid nohup`: queda en el journal con fecha, se
consulta con `systemctl status sanatorio-deploy` y `journalctl -u`, no se puede
lanzar dos veces con el mismo nombre (cerrojo gratis), y sobrevive al SSH igual.
Si se va al despliegue desde la CI (3.2), esto desaparece. **Esfuerzo: S.**

## 5. Flujo de desarrollo

### 5.1 Scripts y `check`

**Dónde**: `package.json` raíz y de cada workspace.

**Qué pasa**: `dev`, `dev:api`, `dev:web`, `dev:mock`, `build`, `start`,
`typecheck`, `lint(:fix)`, `format(:check)`, `test`, `test:coverage`, `check`,
`deadcode`, `duplicates`, `textos`, `demo:new`, `sync:*`, `db:migrate` (API).
`check` tarda **1 m 18 s** aquí (la skill `comprobar` dice 3-4 min: cifra
antigua o de otra máquina). Reparto: ~49 s de herramientas estáticas (cuatro
`tsc`, ESLint con `projectService`, Prettier sobre todo el repo, knip, jscpd,
textos), 5 s de tests de la API y 23 s de tests de la web.

**Propuesta**: un `check:quick` para iterar (no sustituye a `check` antes del
commit): `tsc` solo del workspace tocado + `eslint` y `prettier --check` sobre
`git diff --name-only` + `vitest related --run <ficheros cambiados>`. Debería
quedar en 15-30 s. Y arreglar 2.1 baja `check` entero por debajo del minuto.
**Esfuerzo: S.**

### 5.2 Hooks de git

**Dónde**: `.git/hooks/` (solo `*.sample`); `package.json` (sin husky, lint-staged
ni simple-git-hooks).

**Qué pasa**: nada se ejecuta al hacer commit o push. La regla «`npm run check`
antes de dar algo por hecho» vive en AGENTS.md y en las skills, no en la
herramienta. Como los commits los hace la persona (AGENTS.md), el hook es
justamente el sitio.

**Propuesta**: sin dependencias nuevas: `git config core.hooksPath .githooks` y
dos ficheros versionados: `.githooks/pre-commit` (Prettier y ESLint sobre lo
*staged*, `npm run textos` si cambió un CSV) y `.githooks/pre-push`
(`npm run check`). Un script `npm run hooks` que ponga el `core.hooksPath` y se
cite en el README. Si se prefiere lo estándar, `simple-git-hooks` + `lint-staged`
(dos devDependencies). **Esfuerzo: S.**

### 5.3 Ramas, PR y revisión

**Dónde**: `git log` (194 commits, 4 *merges* «Une la rama…» de worktrees de
agentes, 136 commits en 7 días), skills `paralelo` y `revisar`, `ci.yml`
(`pull_request` sin uso).

**Qué pasa**: todo va directo a `main`, que es a la vez la rama de desarrollo y
la de producción. Protección de rama: **sin verificar** (offline); por el flujo
descrito no la hay. La revisión es la skill `revisar`, a petición. Para una
persona esto es rápido; el coste es que no hay ningún punto donde la CI tenga
que estar en verde *antes* de que el commit esté en `main` (lo está después, y
`deploy.sh` lo comprueba), y que un `git push` con el `check` olvidado deja
`main` roja.

**Propuesta** proporcionada al tamaño del equipo: ramas cortas por bloque
(`exams-live`, como ya hace la skill `paralelo`), PR a `main` con la CI como
*required status check* y *squash merge* (una línea limpia por bloque),
protección de `main` contra *force-push*; el despliegue sale del *merge*
(3.2). La revisión de la skill `revisar` se hace sobre el PR, con `gh pr diff`.
Para cambios de una línea, PR igual: cuesta 30 s y la CI corre antes del
*merge*. **Esfuerzo: S** (configuración) + cambio de hábito.

### 5.4 Correr la app en local: mock y 42 real; demo

**Dónde**: README «Puesta en marcha» (`README.md:859-888`), `apps/api/.env.example`,
`apps/web/.env.mock`, `vite.config.ts`.

**Qué pasa**: bien documentado. `npm run dev` (API real + web, necesita cinco
variables y una app de 42), `npm run dev:mock` (solo web, `VITE_USE_MOCK`),
`API_PROXY_TARGET` para apuntar a otra API, `build:demo` genera `/demo/` con el
mock dentro de la misma imagen (verificado en `Dockerfile:52` → `web/` incluye
`demo/`). Falta: un `.env` de API «de mentira» para levantar la API sin
credenciales de 42 (hoy `FORTY_TWO_UID/SECRET` son obligatorias aunque
`SYNC_ENABLED=false`), y un `docker compose -f infra/compose.local.yml` para
probar la imagen tal cual irá a producción (hoy se prueba «en local antes de
desplegar» a mano, `contexto.md:604`).

**Propuesta**: `npm run dev:api:mock` que arranque la API con el proveedor de
42 simulado de `tests/helpers/fake-42.ts` (ya existe, solo falta exponerlo por
una variable `FORTY_TWO_FAKE=true` en `create-client.ts`), y
`infra/compose.local.yml` (sin Caddy, puerto 3000, `.env.local`). **Esfuerzo: S.**

### 5.5 Dependencias

**Dónde**: `.github/` (solo `workflows/`), `package.json` de cada workspace, `npm ls`.

**Qué pasa**: sin Dependabot ni Renovate. Deriva visible: `@types/node ^26.6.5`
en la web frente a `^22` en la API y Node 22 en `.nvmrc`/Dockerfile; `vitest
2.1.9` (que arrastra su propio `vite 5.4.21`) junto a `vite ^8.3.2` de la web;
`jsdom ^25` (hay 26). `npm audit` no se ejecuta en ningún sitio. Versiones
de las acciones de GitHub por *major* (`@v4`), sin *pin* por SHA.

**Propuesta**: `.github/dependabot.yml` semanal, agrupando *minor+patch* en un
PR para `npm` y otro para `github-actions`; alinear `@types/node` a 22;
`npm audit --omit=dev` en CI (3.1). **Esfuerzo: S.**

### 5.6 Versión y registro de cambios

**Dónde**: `package.json` (`1.0.0` en todos), `git tag` (solo
`punto-guardado-2026-10-11`), `docs/contexto.md` (hace de historial).

**Qué pasa**: no hay forma de saber desde fuera qué commit está en producción
salvo `ssh … git log -1` (la skill lo hace). La imagen no lleva el sha. No hay
CHANGELOG; `contexto.md` cumple parcialmente ese papel pero mezcla estado,
decisiones e histórico (ya pesa 360 líneas).

**Propuesta**: `ARG GIT_SHA` en el Dockerfile → `ENV APP_VERSION`, expuesto en
`/health` y en el pie del panel; una etiqueta `deploy/YYYYMMDD-HHMM` empujada
por el camino de despliegue (desde la CI es trivial); `docs/cambios.md` corto,
una línea por despliegue, generado desde los mensajes de commit entre etiquetas
(`git log deploy/A..deploy/B --oneline`). **Esfuerzo: S.**

## 6. Observabilidad

### 6.1 Registros estructurados e identificadores de petición

**Dónde**: `build-app.ts:130-140`, `main.ts:12`, `config/env.ts:207`,
`app/error-handler.ts:248-265`, `infra/.env.example`.

**Qué pasa**: Fastify trae pino (JSON, `reqId` por petición) pero
`logger: options.logger ?? false` y `LOG_REQUESTS` vale `'false'` por defecto;
`infra/.env.example` ni lo menciona. Con el logger apagado, `request.log.error(…,
'error no controlado')` y `request.log.warn` **no escriben nada**. Lo que sí
llega a `stderr`: `[42] …` del sincronizador, `[job] …` de los trabajos, `[slack]
…`, y los mensajes de arranque/apagado. Es decir, en producción **un 500 no deja
rastro** (salvo que se haya puesto `LOG_REQUESTS=true`, que además registra
*todas* las peticiones a nivel `info`: **sin verificar** cómo está en la
máquina). Sin ids de petición, no se puede correlacionar un fallo que reporte un
estudiante con una línea de log.

**Propuesta**: logger siempre encendido a nivel `warn` (`logger: { level:
env.LOG_LEVEL }`, por defecto `warn`), `LOG_REQUESTS=true` solo sube a `info`;
`disableRequestLogging` cuando no se quieren accesos. El `reqId` de pino sale
solo; devolverlo en la cabecera `x-request-id` y enseñarlo en `ErrorNote` de la
web («código de incidencia») para que un ticket del buzón lo traiga. Los
`process.stderr.write` de `[42]`/`[job]` pasan por el mismo logger
(`app.log.warn({ job }, …)`). **Esfuerzo: S.**

### 6.2 Seguimiento de errores (API y web)

**Dónde**: web: ningún `ErrorBoundary` ni `getDerivedStateFromError` (0
coincidencias en `apps/web/src`), ningún `window.onerror`/`unhandledrejection`;
API: sin Sentry ni equivalente; `Caddyfile:18` (`connect-src 'self'`).

**Qué pasa**: un error de render en una sección deja la pantalla en blanco sin
aviso ni registro; `sections.test.tsx` lo cubre en tests, no en producción. Un
error de la API solo se ve si alguien escribe al buzón.

**Propuesta** sin servicios de terceros (coste cero, CSP intacta):
`POST /client-errors` con `createRateLimit` por IP y cuerpo acotado (mensaje,
pila recortada, sección, versión), que lo guarde en una tabla `client_errors`
con retención de 30 días; un `ErrorBoundary` por sección (`SectionView.tsx`)
que pinte «esta sección ha fallado» con el código y envíe el error; en la API,
contador de respuestas ≥ 500 por minuto en memoria (ya existe la cuenta de
tráfico en `admin.service.ts:567`). **Esfuerzo: M.**

### 6.3 Qué hace falta para detectar un despliegue malo en minutos

**Dónde**: `app/health.ts`, panel (`features/admin`), `modules/usage`,
`modules/admin` (`consumption`, `online`, `quota`).

**Qué pasa**: el panel sirve para el producto (uso, consumo, cuota, tickets,
trampas), no para la operación. Hoy, tras desplegar, lo que se mira es
`docker inspect … Health.Status` y `git log -1` por SSH (skill `desplegar`).
Nada compara «antes» y «después».

**Propuesta**, en orden de coste:

1. **`GET /health/db` ampliado** (sigue sin sesión, sin datos personales):
   `{ version: <sha>, schema: { expected, actual }, syncAgeSeconds,
   guardLevel, lastBackupAgeSeconds, jobs: { name, lastOkAgo, failures } ,
   errors5m }`. `deploy.sh` lo lee tras arrancar y comprueba `version === sha`
   y `schema.actual === expected`. Es el *smoke* real del despliegue. **S**
2. **Alertas por el webhook de Slack que ya existe** (`createSlackPoster`):
   despliegue iniciado/terminado/vuelta atrás (desde `deploy.sh` con `curl`),
   copia fallida o no verificada, guardia que cambia de nivel, trabajo de fondo
   con 3 fallos seguidos, más de N errores 5xx en 5 min. Un canal, cinco
   mensajes posibles. **S**
3. **Monitor externo gratuito** (healthchecks.io o UptimeRobot) a
   `/api/health/db` cada 5 min desde fuera, con aviso al correo: detecta caída
   total, certificado caducado y DNS. Son unos cientos de bytes cada 5 min:
   irrelevante para la guardia. **S**
4. **Pestaña «Estado» en el panel** que pinte lo de (1) más la lista de los
   últimos despliegues (etiquetas `deploy/*`) y los últimos errores de cliente
   (6.2). **M**

## Flujo objetivo: de la idea a producción

Cada paso lleva su barrera; nada pasa a la siguiente fase sin ella. Lo marcado
con (hoy) ya existe.

1. **Decidir y apuntar** (hoy): categoría, sección o bloque, modo e importancia
   en `docs/interfaz.md`; si viene del buzón, su `#NN`. *Barrera*: está escrito
   antes de la primera línea de código.
2. **Rama corta** desde `origin/main` (`git switch -c <bloque>`); con agentes en
   paralelo, un worktree por rama (hoy, skill `paralelo`).
3. **Contrato primero** (hoy): `packages/contracts`, `docs/api.md`; esquema
   nuevo = migración nueva (skill `migracion`). *Barrera*: `tsc` de los dos
   lados compila con el contrato nuevo.
4. **Implementar con las cinco familias** (hoy): reglas en `*.rules.ts` con
   test directo; servicio con `now` inyectado; ruta con zod; pantalla con su
   recorrido en `tests/ui`; mock a la par del cliente real; textos en CSV.
5. **Iterar con `check:quick`** (nuevo, 5.1): tipos del workspace, lint y
   formato de lo cambiado, `vitest related`. 15-30 s.
6. **Commit** (lo hace la persona): el *pre-commit* (nuevo, 5.2) pasa Prettier,
   ESLint y `textos` sobre lo *staged*. *Barrera*: no entra un commit sin
   formato ni con una clave de texto suelta.
7. **Push de la rama**: el *pre-push* (nuevo) corre `npm run check` entero (hoy
   ~1 m 18 s; menos de 1 min con 2.1). *Barrera*: no sale nada rojo del
   portátil.
8. **PR a `main`** (nuevo, 5.3): la CI corre en el PR: tipos, lint, formato,
   knip, jscpd, textos, tests con mínimos de cobertura, build, **imagen +
   smoke** (`/health/db`, `/`, `/demo/`), **`docs/api.md` ↔ rutas**,
   **shellcheck**, **audit**, **presupuesto de bundle**, **migraciones sobre
   base sintética con volumen**. Revisión con la skill `revisar` sobre el diff
   del PR. *Barrera*: *required status check* y protección de `main`.
9. **Squash merge a `main`**: la CI vuelve a correr sobre el commit final y, en
   verde, **publica la imagen** `ghcr.io/…:sha-<sha>` (multiarquitectura) y
   etiqueta `ci-ok/<sha>` (4.1 A, mientras el despliegue no salga de la CI).
10. **Despliegue** (desde la CI, 3.2; o `deploy.sh` en la máquina mientras
    tanto), siempre en este orden, con cerrojo:
    1. `backup.sh` → copia `predeploy-*`, verificada (`gzip -t`,
       `integrity_check`), ruta apuntada en `infra/backups/ultima`. *Barrera*:
       sin copia buena no se sigue (`&&`).
    2. `docker pull` de la imagen del sha (o `build`); etiqueta de la actual
       como `previous`.
    3. **Migrar aparte**: `docker compose run --rm app node dist/cli/migrate.js`.
       *Barrera*: si falla, el contenedor viejo sigue sirviendo con el esquema
       viejo y se avisa a Slack.
    4. `docker compose up -d`; Caddy reintenta la conexión (`lb_try_duration`)
       en vez de dar 502.
    5. **Smoke**: `/health/db` devuelve `version === sha`,
       `schema.actual === expected`, `syncAgeSeconds` razonable; `/` y `/demo/`
       200; hasta 180 s.
    6. Si falla: `restore.sh --yes $(cat infra/backups/ultima)` + `previous` +
       `up -d` + smoke de nuevo; aviso a Slack con el motivo. Si va bien:
       etiqueta `deploy/YYYYMMDD-HHMM`, aviso a Slack «desplegado <sha> en
       <n> s».
11. **Después**: el monitor externo sigue pegando a `/health/db`; la pestaña
    «Estado» del panel enseña errores 5xx y de cliente de los últimos minutos
    frente a la hora del despliegue; `docs/contexto.md` y `docs/cambios.md` al
    día (hoy, parcialmente).
12. **Cada noche y cada semana** (cron en la máquina): copia nocturna con
    verificación y subida a Object Storage; ensayo semanal de restauración +
    migración en un contenedor aparte; Dependabot abre sus PR los lunes y pasan
    por los pasos 8-10 como cualquier cambio.

## Lista priorizada de mejoras

Orden por (riesgo que quita) / (esfuerzo). S = horas, M = uno o dos días, L = más.

| # | Mejora | Esfuerzo | Sección |
| --- | --- | --- | --- |
| 1 | Logger siempre encendido a `warn` + `x-request-id`: que un 500 deje rastro | S | 6.1 |
| 2 | Migrar como paso aparte en `deploy.sh`, antes de `up -d`; `restore.sh --yes`; `healthy()` a 180 s; `flock`; `&&` en vez de `;` | M | 4.2 |
| 3 | Rotar el secreto de 42 pendiente desde el 11-10; sacar `.env.notas-42` del repo | S | 4.7 |
| 4 | Copias: retención por tiempo, verificación, destino en Object Storage | S | 4.3 |
| 5 | `/health/db` ampliado (sha, esquema, sync, guardia, copia, jobs, 5xx) y que `deploy.sh` lo compruebe | S | 6.3, 4.5 |
| 6 | Espera a la CI por etiqueta `ci-ok/<sha>` (sin API de GitHub) | S | 4.1 A |
| 7 | Avisos a Slack: despliegue, vuelta atrás, copia fallida, guardia, jobs; monitor externo gratuito | S | 6.3 |
| 8 | Subir los mínimos de cobertura de la web (64/64/52/79) y aviso cuando lo real los supere en 3 puntos | S | 1.1 |
| 9 | Quitar los temporizadores reales de `tests/ui` (`delay()` a 0 en Vitest, `findBy`/`waitFor`); `now` fijo en `community.test.ts` | M | 2.1, 2.2 |
| 10 | Test `docs/api.md` ↔ rutas en `routes.test.ts`; corregir las 40 discrepancias | S | 1.4 |
| 11 | Hooks de git (`.githooks`: pre-commit lo staged, pre-push `check`) y `check:quick` | S | 5.1, 5.2 |
| 12 | CI: `permissions`, `timeout-minutes`, smoke de la imagen, `npm audit`, shellcheck, presupuesto de bundle | S | 3.1 |
| 13 | Test de `limits-guard.sh` con sus ganchos; test de «migración que falla a mitad» | S | 4.4, 2.5 |
| 14 | Recorridos de pantalla: sala del evento (códigos), tablón, terapia (crear), pizarra (crear), Code Clicker, `PeerList`/`onDuty`; test de `client.ts` | M | 1.5 |
| 15 | Tests de flujo por HTTP en zonas de riesgo (códigos, `PUT /clicker/save`, borrado de datos, salas); concurrencia y permisos de tercero en códigos | M | 1.4, 1.6 |
| 16 | `attendance.test.ts` propio con los bordes de cada constante; `flows-rules.test.ts`; `progress.service`, `slack.ts`, `openDatabase` con fichero | S | 1.2, 1.3 |
| 17 | Despliegue desde la CI (imagen en GHCR, `environment: production`, rollback con `previous`) y retirar el `setsid nohup`; o borrar `deploy.yml` | M | 3.2, 4.9 |
| 18 | Ensayo semanal de restauración + migración sobre la última copia en un contenedor aparte; base sintética con volumen en CI | M | 2.5, 4.3 |
| 19 | PR a `main` con CI obligatoria y protección de rama; squash merge; despliegue desde el merge | S + hábito | 5.3 |
| 20 | Dependabot (npm + actions), alinear `@types/node` | S | 5.5 |
| 21 | `ErrorBoundary` por sección + `POST /client-errors` + pestaña «Estado» en el panel | M | 6.2, 6.3 |
| 22 | `GIT_SHA` en la imagen y en `/health`; etiqueta `deploy/*`; `docs/cambios.md` | S | 5.6 |
| 23 | `logrotate` para los logs de cron; `deploy.log` con fecha; Caddy `log` solo de ≥ 500 | S | 4.6 |
| 24 | Helper `useApps()` compartido; jscpd también sobre `tests/`; `answerGates` por rol | S | 2.3, 2.4 |
| 25 | `dev:api:mock` con la 42 simulada y `compose.local.yml` | S | 5.4 |
| 26 | Inyectar `now` en `meet`, `map`, `network.sync`, `admin` | S | 2.1 |

Ficheros auxiliares de esta revisión (en el scratchpad):
`routes.txt` (las 183 rutas), `routes-sin-test.txt` (91), `code-not-docs.txt`
(22), `docs-not-code.txt` (18), `cov.txt` (salida de cobertura), `check.log`,
`build.log`, `coverage.log`.
