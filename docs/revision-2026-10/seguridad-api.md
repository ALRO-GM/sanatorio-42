# Revisión de seguridad de Sanatorio 42 (22 de octubre de 2026)

Revisión de solo lectura del monorepo `/home/alberto/Desktop/ideas/sanatorio-42` (API Fastify, web React, contratos e infra). No se tocó ningún fichero del repo, ni git, ni el servidor, ni la red; lo único ejecutado fueron dos comprobaciones en proceso con la app de tests (`tests/helpers/test-app.ts`, base en memoria y 42 simulada). Rutas relativas a la raíz; `api/` abrevia `apps/api/src/`.

## Resumen

1. La base sigue sólida y los arreglos de la revisión del 12-oct están todos en su sitio (sesión HMAC con `exp` dentro de la firma, PKCE y `state` en tiempo constante, SQL siempre con parámetros, zod en casi todo, topes por IP en login y clave de staff, `no-store` por defecto, contenedor sin capacidades, `role = 'admin'`, `idParam`).
2. **Alto (verificado ejecutándolo)**: la barrera global de `/admin/…` (401/403 y el segundo factor TOTP) se salta codificando una letra: `/%61dmin/people`. El enrutador decodifica y llega al handler, pero el gancho compara `request.url` sin decodificar. Con sesión de admin sin TOTP, `/admin/people` da `403 second_factor` y `/%61dmin/people` da `200`. Los servicios siguen comprobando `assertAdmin`, así que hoy no lo abre a quien no administra, pero anula el segundo factor y el aislamiento de staff a nivel de barrera.
3. **500 reproducible** por cualquiera con sesión: `GET /events/attendance?id=help:booking` y `POST /events/checkin` con ese id → `Number(undefined)=NaN` → `RangeError` de libsql. No filtra datos, pero rompe "ningún 5xx".
4. **Datos personales**: huecos en `GET /me/export` (tablas con login sin declarar, columnas de segunda persona, `SELECT *` con datos de terceros, secretos sin `omit`, truncado silencioso, sin borrado de cuenta).
5. **Medios de autorización/abuso**: vista de sala de quiz por id sin pertenencia, antitrampas del clicker fiado del `perSecond` del cliente, `/usage/heatmap` sin `/admin/`, texto a Slack sin escapar.
6. **Bajos**: `GET` con efecto alcanzable cross-site (`SameSite=Lax`), `SESSION_SECRET` de 16, búsqueda que carga `users` entera, DMs a cualquiera, dos rutas sin zod, copias sin cifrar, detalles de web.
7. Web limpia de XSS (un `dangerouslySetInnerHTML` = QR local), sin redirecciones abiertas, sin secretos en almacenamiento, demo sin datos reales, CSP coherente.
8. Infra correcta para su tamaño: Caddy con cabeceras, sin puertos publicados, `cap_drop ALL`, `no-new-privileges`, `pids_limit`, usuario `node`, `.env` 600 e ignorado por git.
9. Dependencias: fastify 5.12.5, zod 4.6.5, @libsql/client 0.18.0, react 19.3.0, find-my-way 9.10.0. No pude correr `npm audit` (sin red). Dos versiones de vite instaladas (8.3.4 en apps/web, 5.4.21 en la raíz/lock): confirmar cuál compila Docker.
10. Recuento: **crítico 0 · alto 1 · medio 7 · bajo 14**. Lista priorizada al final; primero el gancho de `/admin` (una línea + test con ruta codificada).

## Estado de la revisión anterior

Todos los arreglos de `docs/revision-seguridad.md` siguen presentes y verificados: rechazos del servidor sin 500 (`api/core/http/errors.ts:82-106`), esquema `day` único (`api/core/validation.ts:61-68`), ack sin cuerpo → 400 (`meet/index.ts:74-79`), tope de login 200/10 min (`auth/auth.routes.ts:55-56,117,145`), `idParam` en broadcasts/admin, `no-store` por defecto (`admin/index.ts:205-211`), `role='admin'` (`admin/admin.service.ts:354`), contenedor sin capacidades (`infra/compose.yml:35-39`), `backup.sh` comprueba escritura (`infra/scripts/backup.sh:34-38`). **Excepción**: la "segunda cerradura" de admin se evade por codificación (A1). Novedad bien hecha: segundo factor TOTP (`admin/second-factor.ts`, `totp.ts`) con secreto AES-GCM, 5 fallos/15 min, paso usado no reutilizable, cookie `__Host-` `Strict`. Sigue pendiente lo que ya decía: copias fuera de la máquina y sin cifrar; sesión no revocable (riesgo aceptado).

## Hallazgos

### Crítico
Ninguno verificado.

### Alto

#### A1. La barrera de `/admin/…`, el segundo factor y el aislamiento de staff se saltan con la ruta codificada en porcentaje
- **Dónde**: `api/modules/admin/index.ts:95,100,120-121,130-132,145,161,181-185`. El gancho hace `const path = request.url.split('?')[0]` y `const adminOnly = path === '/admin' || path.startsWith('/admin/')`, y usa `request.url` también para `/health`, `/auth/`, `/staff/`.
- **Qué pasa**: `find-my-way` 9.10.0 decodifica la ruta antes de encajarla (`node_modules/find-my-way/index.js:628-639`, `lib/url-sanitizer.js`), así que `/%61dmin/people` ejecuta el handler de `/admin/people`; pero Fastify deja `request.url` crudo, y el gancho no lo reconoce como `/admin/…`, no exige TOTP y no aplica el corte de staff.
- **Explotación / riesgo**: verificado en proceso. Con `ADMIN_LOGINS=albrodri` y sesión sin elevar: `GET /admin/people` → `403 {"error":"second_factor"}`; `GET /%61dmin/people` → `200` con la lista de admins/bloqueos; `GET /%61dmin/tickets` → `200`. Es decir, un admin con la cuenta de 42 comprometida (o una sesión abierta en un puesto del cluster) entra al panel sin el segundo factor, que es justo lo que ese factor quería impedir. Además una sesión de staff podría alcanzar por esta vía rutas de la gente que el gancho bloquea por prefijo (los servicios de staff usan `session.staff`, pero las rutas de la gente que no leen la sesión dependen de este gancho). No afecta a quien no administra, porque cada servicio mantiene `assertAdmin` (`api/core/actor.ts:29`) — por eso es alto y no crítico.
- **Arreglo**: comparar sobre la ruta ya decodificada y encajada por Fastify, no sobre `request.url`. Usar `request.routeOptions.url` (el patrón de la ruta) para `adminOnly`, o `new URL(request.url, 'http://x').pathname` decodificado, en los seis puntos. Añadir a `tests/integration/routes.test.ts` un caso que recorra cada ruta `/admin` también en forma `%`-codificada. **S**.

### Medio

#### M1. 500 interno en asistencia/checkin con ids `help:booking` incompletos
- **Dónde**: `api/modules/meet/meet.service.ts:182,237,262` (`help.session(actor, Number(third))`) y `:218,254,258` (`Number(second)`); alcanzado desde `attendance` (`meet/index.ts:90`) y `checkin` (`:95`). El esquema `eventId` (`meet.service.ts:102`) acepta `help:booking` porque `{1,3}` grupos valen, y `third` queda `undefined`.
- **Qué pasa**: `Number(undefined)` es `NaN`; llega como argumento a libsql y lanza `RangeError: Only finite numbers...`, que el manejador traduce a 500. Verificado: `GET /events/attendance?id=help:booking`, `id=help:booking:x` y `POST /events/checkin {id:'help:booking'}` → 500.
- **Riesgo**: sin fuga de datos, pero un 500 es lo que tantea quien prueba la web, y la regla del proyecto es que no haya ninguno. Afecta también a cualquier `board:` / `group:` con segmento no numérico.
- **Arreglo**: validar la forma del id por tipo de evento antes de `Number(...)`, o un helper `idParam`-equivalente que lance `invalid_input` (400) si no es entero. Acotar el regex de `eventId` para que `help:booking` exija un tercer segmento numérico. **S**.

#### M2. La vista de una sala de quiz no exige pertenencia (de la revisión de juegos; verificado el punto de entrada)
- **Dónde**: `api/modules/quiz/quiz.service.ts:375-377` (`view` → `viewOf(actor, await mustRoom(id))`), ruta `quiz/quiz.routes.ts:39`.
- **Qué pasa**: `view` solo exige que la sala exista; `viewOf` (`:259-276`) devuelve jugadores, imágenes y, en fase de pregunta, quién ha respondido. Cualquiera con sesión puede leer el estado de una sala ajena iterando ids pequeños y correlativos.
- **Riesgo**: fuga menor de actividad de otras personas (quién juega, aciertos). No expone la respuesta correcta antes del reveal (se filtra en `viewOf`), pero sí metadatos. Lo mismo conviene revisar en `gitcourse/rooms.ts` y `quiz/games`.
- **Arreglo**: en `viewOf`, si la sala no es pública/del campus del actor y el actor no es jugador, devolver solo la cabecera (o 403). Confirmar la frontera de campus. **M**.

#### M3. El antitrampas del clicker calcula el techo con el `perSecond` que manda el cliente (de la revisión de juegos)
- **Dónde**: `api/modules/clicker/cheat.rules.ts:196,203,211-220` — `rate = Math.max(before.perSecond, sent.perSecond)` y el "allowed" se derivan del `perSecond` enviado.
- **Qué pasa**: el límite de ganancia por intervalo se calibra con un valor que controla el cliente, así que subir `perSecond` sube el techo permitido. Es un juego sin XP real (los puntos no salen de aquí), por eso medio y no alto, pero invalida la detección de ritmo.
- **Arreglo**: derivar el ritmo permitido del estado guardado en servidor (último total/tiempo), no del `perSecond` entrante; usar el enviado solo como dato a verificar. **M**.

#### M4. `GET /usage/heatmap` de clics fuera de `/admin/` (de la revisión de juegos)
- **Dónde**: ruta de mapa de calor de clics; el servicio sí llama `assertAdmin` (`usage/clicks.ts:91-92`, `usage/usage.service.ts:513-514`), pero la de elementos/heatmap de clics está montada fuera del prefijo `/admin/` en `usage/index.ts` (p. ej. no lleva el prefijo), de modo que la barrera global no la cubre y solo la protege el `assertAdmin` del servicio.
- **Qué pasa**: incumple la regla de AGENTS.md "lo de admins cuelga de `/admin/`". Hoy el servicio corta igual, así que no hay fuga; el riesgo es que una ruta hermana nueva olvide el `assertAdmin` y quede abierta, porque la barrera no está.
- **Arreglo**: mover la ruta bajo `/admin/` (y actualizar el cliente web). **S**.

#### M5. El texto libre de un aviso de edificio va a Slack sin neutralizar menciones
- **Dónde**: `api/modules/facility/facility.service.ts` (construcción del mensaje `*LABEL* en ${where}: ${note} (avisa ${login})` y `void options.slack?.(...)`), `integrations/slack.ts:17-29`.
- **Qué pasa**: `note` y `place` son texto de la persona (máx. 500/60), validados solo por longitud. Slack interpreta `<!channel>`, `<!here>` y `<@id>` dentro de `text`: un aviso con `<!channel>` suena a todo el canal del staff. No es inyección de código, pero sí abuso del canal del staff a voluntad (hasta 10 avisos/día/persona).
- **Arreglo**: antes de mandar a Slack, escapar `<`, `>`, `&` (o usar bloques con `type:"mrkdwn"` sin `link_names`), y/o quitar `<!...>`. **S**.

#### M6. Exportación de datos personales: cobertura incompleta y fuga de datos de terceros
- **Dónde**: `api/core/db/personal-data.ts:28-69` (`SELECT * ... LIMIT 5000`), declaraciones `personal:` en cada `modules/*/index.ts`, `modules/legal/legal.service.ts:74-81`.
- **Qué pasa** (verificado contra las migraciones de `api/core/db/migrations/`):
  - Tablas con login **sin declarar** en ningún `personal`: `help_blocks` (0005:54, blocker/blocked), `settings.updated_by` (0019:20), `staff_accounts.created_by` (0033:42), y `therapy_checks.present` (0005:92, logins en una lista separada por comas que ni siquiera es consultable con `col = ?`).
  - Declaradas pero sin una columna de persona: `notices.from_login` (`notices/index.ts:45`), `guide_changes.validator` (`doubts/index.ts:49`), `tickets.answered_by` (`admin/index.ts:80`), `user_roles.granted_by` y `user_blocks.blocked_by` (`admin/index.ts:78-79`), `help_bookings.news_for` (menor).
  - `SELECT *` devuelve la fila entera, con datos de terceros: `event_attendance` por `host` devuelve a **todos los asistentes** del evento; `report_exports` por `requested_by` devuelve `content` (el CSV de horas de otra persona); `reactions.from_login`, `corrections` (la otra parte y su nota), `help_bookings` (la otra parte, nota y tags), `git_rooms.state` (repos/comandos de cada jugador), `broadcasts.audience` (hasta 200 logins).
  - Secretos sin `omit`: `event_checkins.code` (0018:38, el código de asistencia del evento) y `report_exports.hash` (0033:30). `admin_second_factor.secret` sí está omitido.
  - Truncado a 5 000 filas **sin señalarlo** (`:25,55`): el usuario no sabe que su exportación está incompleta.
  - La réplica de 42 (users, corrections, exam_attempts…) se mezcla con lo de la app sin etiqueta.
- **Riesgo**: una exportación de "derecho de acceso" entrega datos de otras personas (RGPD: sería cesión a un tercero) y, a la vez, omite datos propios; dos secretos verificables se filtran al titular. 
- **Arreglo**: declarar las tablas y columnas que faltan; cambiar `SELECT *` por un proyector que excluya columnas de otra persona (o devolver solo el subconjunto del titular en las tablas "entre dos"); añadir `omit` a `event_checkins.code` y `report_exports.hash`; manejar los logins-en-JSON (`therapy_checks.present`, `broadcasts.audience`, `git_rooms.state`) aparte; señalar el truncado con un flag; separar "datos de 42" de "datos de la app". **M/L**.

#### M7. No hay borrado de cuenta ni borrado administrativo de la mayoría de tablas
- **Dónde**: `modules/legal/` (solo export, sin `DELETE /me`), `api/core/db/data-store.ts`, declaraciones `stores:` por módulo.
- **Qué pasa**: no existe ruta de "borrar mi cuenta" ni anonimización. El borrado administrativo por `stores` cubre ~14 tablas; quedan sin store casi todas las de contenido (doubts, doubt_answers, boards, board_attendees, therapy_groups/members/checks, help_bookings/days/blocks, reactions, xp_events, profiles, quiz_*, git_*, facility_reports, etc.) y ningún "padre" declara `children`, así que borrar una no arrastra las hijas.
- **Riesgo**: ante una baja o una denuncia, no hay forma operativa de eliminar los datos de una persona; incumple expectativas de supresión.
- **Arreglo**: decidir política de supresión; como mínimo, declarar `stores` con `children` para los árboles principales y documentar qué se conserva y por qué. **L**.

### Bajo

#### B1. `GET /events/report?format=csv` tiene efecto de escritura y es alcanzable cross-site
- **Dónde**: `meet/index.ts:102-118` → `reportCsv` → `staff.service.ts:issue` (inserta en `report_exports`, 40 documentos/día/persona).
- **Qué pasa**: es un `GET` que crea estado. La cookie de sesión es `SameSite=Lax` (`core/http/cookies.ts:52`), que sí viaja en navegaciones top-level de primer nivel; un enlace/redirección a `…/api/events/report?format=csv&login=…` desde otra web gasta el cupo diario de documentos del titular (no filtra nada: la respuesta la recibe el navegador que navega, no el atacante).
- **Arreglo**: emitir documentos solo por `POST`, o exigir una cabecera que CORS no deje poner cross-site. **S**.

#### B2. `SESSION_SECRET` admite 16 caracteres
- **Dónde**: `api/config/env.ts:96`. Es la única barrera contra falsificar sesiones y, además, deriva la clave del segundo factor y del cifrado del secreto TOTP.
- **Arreglo**: subir el mínimo a 32 (`openssl rand -base64 48`, como ya sugiere `.env.example`). **S**.

#### B3. Búsqueda de personas carga la tabla `users` entera por pulsación
- **Dónde**: `api/modules/replica/replica.repository.ts:762-799` (`searchUsers` hace `SELECT ... FROM users WHERE active = 1` y filtra en memoria), vía `GET /users/search` y `/network/people`.
- **Qué pasa**: cada tecla (≥2 chars) lee todas las filas activas (miles) y las ordena en memoria. Autenticado y con tope global de tráfico, pero es trabajo O(usuarios) por petición de autocompletado.
- **Arreglo**: índice/`LIKE` con prefijo normalizado en una columna auxiliar, o una caché. **M**.

#### B4. Mensajes directos a cualquier login existente, 20/min
- **Dónde**: `meet.service.ts:160-166` (`dm` es válido si los dos logins existen) y topes `:84-85` (8/evento, 20/min).
- **Qué pasa**: se puede iniciar un chat con cualquiera sin relación previa; `notices` deja aviso. No es spam masivo por los topes, pero no hay bloqueo/consentimiento como en `help`.
- **Arreglo**: respetar los `help_blocks` también en DMs, o exigir alguna relación. **S/M**.

#### B5. Dos rutas leen entrada sin esquema zod
- **Dónde**: `profile/profile.routes.ts:53` (`xp.publicProfile(request.params.login)` — el servicio valida con regex `:118-120`, correcto) y, más relevante, los `request.query`/`request.body` que llegan "crudos" a servicios que sí validan dentro (p. ej. `admin` pasa `request.body` a `setRole/block/limit/budget`, todos con `parse(...)`). No encontré ninguna ruta donde la entrada llegue a SQL sin validar; lo que hay son rutas que delegan la validación al servicio. Lo dejo como observación: `availability.set` valida el booleano a mano (`availability.service.ts:30`) en vez de zod.
- **Arreglo**: homogeneizar con zod en el borde; no hay vulnerabilidad confirmada. **S**.

#### B6. Análisis de la red recomputable a voluntad
- **Dónde**: `api/modules/network/network.service.ts` (caché TTL 60 s, 12 entradas, `MAX_LIMIT=20 000`).
- **Qué pasa**: variando `from/to/projectto/limit/campuses` se generan claves de caché distintas y se fuerza el recálculo sobre decenas de miles de correcciones. Autenticado y cacheado por clave, pero la clave la controla quien pide.
- **Arreglo**: acotar combinaciones o un tope de coste por persona. **M**.

#### B7. `/usage/clicks` y `/usage` escriben por petición con tope solo por tamaño de lote
- **Dónde**: `usage/clicks.ts:36-60` (lotes de 400 celdas / 150 elementos), `usage/index.ts:93,107`.
- **Qué pasa**: cada POST hace hasta 550 upserts; con el tope global de peticiones por persona está acotado, pero conviene un tope propio de telemetría. El esquema de `element` está bien ceñido por regex (`clicks.ts:47`).
- **Arreglo**: tope por minuto de telemetría por persona. **S**.

#### B8. Copias de seguridad sin cifrar
- **Dónde**: `infra/scripts/backup.sh:50-69` (`VACUUM INTO` + `gzip`; `rclone copy` opcional a `BACKUP_REMOTE`).
- **Qué pasa**: la base entera (datos personales de la gente) se guarda y, si se configura, se sube sin cifrar.
- **Arreglo**: cifrar antes de subir (rclone crypt o `age`/`gpg`). **S**.

#### B9. `href` de evento de la API sin comprobar esquema (web)
- **Dónde**: `apps/web/src/features/calendar/EventDialog.tsx:206-207` usa `event.url` directo en `href`. Hoy la API siempre construye `https://…/events/…` (`calendar.service.ts:195,218`), así que no es explotable; la CSP `script-src 'self'` bloquearía un `javascript:`. Defensa en profundidad.
- **Arreglo**: comprobar que empieza por `https://` antes de pintarlo. **S**.

#### B10. Valores de paleta en `localStorage` aplicados como CSS sin validar (web)
- **Dónde**: `apps/web/public/theme.js:84-86` y `shared/theme/index.ts:142` validan el nombre `--x` pero no el valor. Solo la propia web escribe ahí y es del mismo origen; sin impacto real con la CSP actual. Por completitud.
- **Arreglo**: validar el valor o aceptar solo un conjunto cerrado. **S**.

#### B11. `recent.ts` guarda login+foto de terceros en `localStorage` (web)
- **Dónde**: `apps/web/src/shared/recent.ts:10,14`. Datos públicos de la intra, validados al leer; es persistencia de datos de terceros en el navegador. Muy bajo.
- **Arreglo**: valorar si procede guardarlo o limitar a logins. **S**.

#### B12. `settings`/`staff_accounts` sin `omit` de columnas de sistema en los `stores`
- **Dónde**: `data-store.ts` + declaraciones; `staff_accounts.key_hash/salt` no se exportan (bien, no están en `personal`), pero `report_exports.content`/`hash` sí (ver M6). Observación de consistencia.
- **Arreglo**: ver M6. **—**.

#### B13. Códigos de asistencia de 4 caracteres `[A-Z0-9]`
- **Dónde**: `attendance.service.ts:98-104` (`randomInt`, alfabeto y longitud en `attendance.rules`), con `MAX_FAILED_ATTEMPTS=5` por persona/evento (`attendance.rules.ts:28`). El espacio es pequeño (~1,3M), pero el tope de 5 intentos y la ventana temporal del evento lo hacen poco útil adivinar. Generación con CSPRNG (`randomInt`), comparación por igualdad de strings (no secreto largo, aceptable). Bajo/informativo.
- **Arreglo**: ninguno urgente; mantener el tope de 5. **—**.

#### B14. Dos versiones de vite instaladas
- **Dónde**: `apps/web/node_modules/vite` 8.3.4 vs raíz/lock 5.4.21.
- **Arreglo**: alinear el lockfile y confirmar la que usa el build de Docker; pasar `npm audit` con red disponible. **S**.

## Lo que está bien hecho (conservar)

- **Sesión**: HMAC-SHA256 con `verify` en tiempo constante (`auth/signed-cookie.ts:42-64`), `exp` dentro del payload firmado y validado con `Number.isFinite` (`auth.service.ts:383-392`), `__Host-` + `HttpOnly` + `Secure` + `SameSite=Lax`.
- **OAuth 42**: PKCE S256, `state` firmado con TTL y comparado en tiempo constante (`auth.service.ts:415-428`), token de usuario usado solo para `/v2/me` y descartado, topes por IP en login y clave de staff.
- **SQL**: todo parametrizado; las únicas interpolaciones son nombres de columna/tabla del código o placeholders `?` generados (`IN (${ids.map(()=>'?')})`), y `json_each(?)` para listas. `LIKE` con `ESCAPE` y escape de `%_` (`network.repository.ts:419`).
- **Autorización**: ownership comprobada en los servicios, no en la UI, de forma consistente — boards (`boards.service.ts:185,271`), therapy (`therapy.service.ts:323,410,443`), help (`mustGet` :382-392 y chequeos por reserva), doubts (`doubts.service.ts:456,522,574,634,718`), notices/conversaciones (`WHERE login = ?` en cada update, `assertParticipant` por tipo de chat `meet.service.ts:143-205`).
- **Segundo factor TOTP** del panel, bien construido (AES-GCM, anti-replay, rate limit, cookie `Strict`).
- **Staff**: clave de 256 bits, scrypt con sal, respuesta de tiempo constante exista o no la cuenta (`staff.service.ts:321-339`), sesión de 2 h `SameSite=Strict`, aislada por `session.staff` y por la barrera (salvo A1), 60 comprobaciones/10 min.
- **CSV**: celdas que empiezan por `= + - @` neutralizadas con apóstrofo (`attendance.service.ts:cell`).
- **Infra**: Caddy con CSP sin scripts en línea, HSTS, nosniff, `frame-ancestors 'none'`, `Permissions-Policy`, `-Server/-Via`, `security.txt`; app sin puertos publicados, `cap_drop ALL`, `no-new-privileges`, `pids_limit`, `mem_limit`, usuario `node`; guardia de límites del plan; `deploy.sh` respeta el cupo de la API de GitHub.
- **Web**: sin XSS (un único `dangerouslySetInnerHTML` = QR local), enlaces por `shared/links.ts` codificados, sin redirecciones abiertas, sin secretos en almacenamiento, prefijo `demo:` sobre `Storage.prototype`, demo con datos inventados y sin tráfico a `/api`.
- **42**: solo `replica` llama a 42; el resto lee de la copia; cuota con escalones y cola; el secreto OAuth nunca se registra.

## Lista priorizada de arreglos

1. **A1 (alto, S)** — Barrera `/admin/…`/TOTP/staff: comparar sobre la ruta decodificada (patrón de ruta de Fastify), no `request.url`; test con ruta `%`-codificada.
2. **M1 (medio, S)** — Validar los ids de evento (`help:booking` sin tercer segmento) antes de `Number(...)`; eliminar los 500.
3. **M4 (medio, S)** — Mover `/usage/heatmap` (y hermanas) bajo `/admin/`.
4. **M5 (medio, S)** — Escapar `<!channel>`/menciones en los mensajes a Slack.
5. **M2 (medio, M)** — Exigir pertenencia/campus en la vista de salas (quiz, games, gitcourse).
6. **M3 (medio, M)** — Antitrampas del clicker: derivar el ritmo permitido del estado del servidor.
7. **M6 (medio, M/L)** — Export de datos: declarar tablas/columnas que faltan, no exportar datos de terceros, `omit` de `event_checkins.code` y `report_exports.hash`, señalar truncado.
8. **M7 (medio, L)** — Política de borrado de cuenta y `stores`+`children` para los árboles de contenido.
9. **B1 (bajo, S)** — `/events/report` emisor solo por POST.
10. **B2 (bajo, S)** — Subir el mínimo de `SESSION_SECRET` a 32.
11. **B8 (bajo, S)** — Cifrar las copias antes de subirlas.
12. **B4 (bajo, S/M)** — Respetar bloqueos en los DMs.
13. **B3 / B6 / B7 (bajo, M/S)** — Acotar coste de búsqueda, análisis de red y telemetría.
14. **B9–B14** — Correcciones menores de web, dependencias y consistencia.
