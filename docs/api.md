# Contrato de la API

Los tipos de cada respuesta están en `packages/contracts`; este documento los
explica en prosa. Si cambian, se cambian en los dos sitios.

Todas las respuestas son JSON. La autenticación con la API de 42 (OAuth) la
gestiona el back; el front nunca ve el client secret. La sesión va en una cookie.

En producción todas las rutas cuelgan de `/api` (`/api/auth/me`); en local, el
back también las atiende sin prefijo.

Los errores tienen siempre la misma forma, y `message` se puede enseñar tal cual:

```json
{ "error": "conflict", "message": "El grupo está completo" }
```

| Código | `error` | Cuándo |
|---|---|---|
| 400 | `invalid_input` | Falta un campo o no es válido |
| 401 | `unauthenticated` | No hay sesión |
| 403 | `forbidden` | Hay sesión, pero no puedes hacer eso |
| 404 | `not_found` | No existe (o es de otro campus) |
| 409 | `conflict` | No se puede ahora: grupo lleno, ya reaccionaste hoy… |

## Autenticación
- GET /auth/login → redirige al login de la intra de 42
- GET /auth/callback → uso interno del back; al terminar vuelve al front con sesión iniciada
- GET /auth/me → usuario logueado, o 401 si no hay sesión
  { "id": 1234, "login": "plopez-l", "name": "…", "image": "https://...", "campusId": 22 }
- POST /auth/logout

Lo que vale para todas las rutas:

- Sin sesión, `401`. Con una cuenta bloqueada, `403` en todo menos en `/auth/…`.
- Todo lo que cuelga de `/admin/…` es `403` para quien no administra, exista o
  no la ruta.
- Empezar un login o volver de 42 más de 200 veces en diez minutos desde la
  misma IP acaba en el front con `?error=rate_limited`.
- Un JSON mal escrito es `400`; un cuerpo de más de 64 kB, `413`; un tipo de
  contenido que no sea JSON, `415`.
- Las respuestas llevan `Cache-Control: private, no-store` salvo que la ruta
  diga otra cosa.

## Documentos verificables y staff

Quien se descarga sus horas (`POST /events/report/csv`) puede entregar el
fichero al staff de 42. Para que el staff sepa que no se ha retocado, hay cuentas
de staff: no son de 42, las crea quien administra y **solo** llegan a las rutas
de este apartado. Cualquier otra ruta les contesta `403`.

- POST /auth/staff → `{ "key" }`. Abre una sesión de staff de dos horas. `204`.
  `401` con una clave que no vale (la misma respuesta exista o no la cuenta) y
  `429` tras diez claves falladas desde la misma IP en un cuarto de hora.
- GET /staff/me → `{ "name" }`. `401` sin sesión o si a la cuenta se le ha
  retirado el acceso; `403` con la sesión de una persona.
- GET /staff/documents/:code → el documento emitido con ese código, como salió:
  `{ "code", "login", "requestedBy", "from", "to", "totalMinutes", "rows",
  "issuedAt", "fileName", "header", "lines" }`. `login` es `null` en el informe
  de todo el mundo. El código vale en minúsculas y con espacios o guiones.
  `404` si no es de ningún documento.
- POST /staff/documents/:code/compare → `{ "content" }` (el texto del fichero
  recibido, hasta un millón de caracteres) → `{ "identical" }`. No cuentan la
  marca de UTF-8, el tipo de salto de línea ni los espacios del final; cualquier
  otro cambio, sí.
- Las dos anteriores comparten tope: 60 comprobaciones cada diez minutos por
  cuenta (`429`). Cada una queda apuntada.
- GET /admin/staff → `{ "accounts": [{ "id", "name", "createdBy", "createdAt",
  "lastUsedAt", "revokedAt" }] }`. Solo admins.
- POST /admin/staff → `{ "name" }` (de 3 a 40 letras, números, espacios, puntos
  o guiones). `201` con `{ "account", "key" }`: la clave **solo viaja en esta
  respuesta**; en la base queda su resumen (scrypt con sal). `409` si el nombre
  ya existe.
- DELETE /admin/staff/:id → retira el acceso. Las sesiones abiertas de esa cuenta
  dejan de valer al momento. `204`; `404` si no existe o ya estaba retirada.

## Mis proyectos
GET /me/projects → solo los que tengo en curso
[{ "id": 1314, "name": "ft_printf" }]

GET /me/projects?scope=all → también los aprobados (en ellos soy especialista)
[{ "id": 1314, "name": "ft_printf", "status": "in_progress" },
 { "id": 1312, "name": "Libft", "status": "finished" }]

## Gente del proyecto (en el campus que estoy mirando)
GET /projects/:id/peers

Devuelve a quienes tienen el proyecto en curso y, de quienes ya lo aprobaron
("especialistas"), solo a los que están de guardia. De guardia primero.

[{
  "login": "jdoe",
  "image": "https://...",
  "location": "c2r4s6",     // null si no está en el cluster
  "available": true,
  "status": "in_progress"   // "in_progress": lo está haciendo; "finished": ya lo aprobó (especialista)
}]

Cabeceras: `X-Total-Participants` (personas del campus con ese proyecto) y
`X-Partial: true` si aún se está copiando de 42 y faltan personas.

## Mapa de clusters
GET /projects/:id/map → el campus que estoy mirando, con la gente de guardia de
ese proyecto resaltada. GET /map → el mismo plano sin proyecto (nadie resaltado),
para elegir puestos al abrir un grupo de terapia.

```json
{
  "clusters": [
    {
      "id": "c1", "rows": 5, "seatsPerRow": 8, "occupied": 6, "onDuty": 1,
      "seats": [
        {
          "host": "c1r2s4", "row": 2, "seat": 4,
          "occupant": { "login": "anavarro", "image": null, "projects": ["ft_printf"], "duty": "patient", "me": false },
          "reservation": {
            "groupId": 1, "projectName": "ft_printf",
            "dates": ["2026-10-13", "2026-10-15"], "start": "16:00", "end": "18:00", "inSession": true
          }
        }
      ]
    }
  ],
  "unplaced": []
}
```

- `duty`: `"specialist"` (aprobó el proyecto, dorado), `"patient"` (lo está
  haciendo, verde) o `null` si no está de guardia para ese proyecto.
- `reservation`: grupo de terapia que tiene reservado el puesto (azul), o `null`.
- `seats` trae **todos** los puestos de la cuadrícula (`rows` × `seatsPerRow`),
  ocupados o libres. La API de 42 no publica el plano de un campus, así que se
  deduce de los puestos en los que se ha visto a alguien y el rectángulo se
  completa con puestos libres; alguno puede corresponder a un pasillo.
- `occupant.projects`: nombres de los proyectos que tiene en curso (hasta cuatro).
- `unplaced`: gente en puestos cuyo nombre no sigue el patrón sala-fila-puesto.

No gasta peticiones de 42: usa la misma foto de puestos que la lista de gente.

## Marcarme como disponible
GET /me/availability → { "available": true }
PUT /me/availability
{ "available": true }

## Fotos de perfil
GET /avatars/:login → la foto de esa persona (`image/jpeg`, `png`, `gif` o `webp`), o 404
si no tiene o 42 no la da ahora. Pide sesión.

Desde octubre de 2026 la CDN de 42 (`cdn.intra.42.fr`) contesta 403 a quien no
tiene la intra abierta, así que las direcciones `image` de las respuestas ya no
se ven en cualquier equipo. La API pide la foto una vez con el token de la
aplicación (no gasta cuota de la API: la CDN no la cuenta), la guarda en
`photos/` junto a la base y la sirve desde aquí; la web pide esta ruta para
toda foto de la CDN (`photoUrl` en `shared/api/photos.ts`). Como mucho 1 500
fotos nuevas por hora; una que 42 no da no se vuelve a pedir hasta pasada una hora.

## Estilo del expediente
`PUT /me/settings` admite `recordStyle`: el id de un estilo, `none` (cada cual
lo ve con el suyo) o `default` (lo de fábrica: tu estilo exclusivo si tienes uno).
Un estilo exclusivo de otra persona da `403`. `GET /me/profile` y
`GET /users/:login/profile` traen `recordStyle`, ya resuelto: con qué estilo se ve.

## Privacidad y condiciones
GET /me/legal → `{ "version": "2026-10-16", "acceptedAt": null }`: la versión vigente
y cuándo la aceptaste. La web no deja seguir hasta aceptarla.
POST /me/legal/accept → `{ "version" }`: hay que mandar la vigente (si cambió
mientras se leía, `409`).
GET /me/export → todo lo tuyo, tabla a tabla, como JSON para descargar
(`Content-Disposition: attachment`; tipo `PersonalExport`).
{
  "login": "legomez", "exportedAt": "2026-10-23T10:00:00.000Z", "legalVersion": "2026-10-16",
  "tables": {
    "users": { "source": "42", "truncated": false, "rows": [{ "id": 1, "login": "legomez", … }] },
    "help_bookings": { "source": "sanatorio", "truncated": false, "rows": [ … ] },
    "usage_time": { "source": "sanatorio", "truncated": true, "rows": [ …5000 filas… ] }
  }
}

POST /client-errors → `{ "message", "stack"?, "where", "version"? }` → 204: un
fallo de la web en el navegador (una sección que no se pudo pintar, o `where:
"page"` para uno suelto). Sin sesión, con tope de 10 por IP y minuto (lo que
pasa se tira sin error); queda en el registro del servidor a nivel `warn`.

POST /me/anonymize → `{ "confirm": <tu login> }` → `{ "changed" }`: anonimiza tu
cuenta y cierra la sesión. En cada tabla de la app (las de `personal` con
`source` de la app) tu login pasa a un identificador opaco y nuevo
(`anon-<12 hex>`), también dentro de las listas de logins. Lo que hiciste sigue
contando para los demás (las horas de una pizarra, una reserva, un grupo),
pero ya no se sabe que fuiste tú. Lo copiado de 42 no se toca: es lo que 42
publica al campus y vuelve en la siguiente copia. No se puede deshacer; si
vuelves a entrar, empiezas de cero. `400` si `confirm` no es tu login.
POST /admin/people/:login/anonymize → `{ "changed" }`: lo mismo, de alguien que
lo ha pedido por otra vía. Solo admins.

`source` dice si la tabla está copiada de 42 o es de la app. `truncated: true`
avisa de que la tabla pasaba del tope (5 000 filas) y solo van las primeras.
Cada módulo apunta en `personal` qué tablas suyas tienen datos de alguien y en
qué columnas; un test recorre el esquema y comprueba que no falta ninguna
columna de persona. En las tablas «entre dos» (una reserva, una corrección, un
aviso) cada fila va recortada a lo de quien descarga: ni la nota ni las
etiquetas de la otra persona, ni el CSV de horas de otra, ni quién reaccionó.
Las listas de logins (`therapy_checks.present`, `broadcasts.audience`) salen
solo con el propio login. Los secretos (el del segundo factor, los códigos de
asistencia escritos, el `hash` de los informes, las claves del staff) no salen
nunca.

## Campus y preferencias
GET /campuses
[{ "id": 22, "name": "Madrid", "city": "Madrid", "country": "Spain", "tracked": true }]

`tracked: true` son los campus que se copian en segundo plano; el resto funcionan,
pero la primera vez que se abre un proyecto tarda algo más.

PUT /me/settings → 204. Todos los campos son opcionales.
{ "campusId": 58, "lang": "en", "title": "residente" }

`lang` es `es`, `en`, `ca` o `eu`.

Cambiar `campusId` cambia de qué campus son **todas** las listas (compañeros,
terapias, tablón y pizarras). `title` solo se acepta si ya está desbloqueado.

GET /sync/status → cómo va la copia de 42 (para el "actualizado hace 2 min" del pie)

## Expediente y XP
GET /me/profile
{
  "login": "legomez", "campusId": 22, "homeCampusId": 22, "lang": null, "admin": false,
  "xp": { "total": 340, "level": 4, "floor": 250, "next": 500 },   // next: null en el último nivel
  "title": "residente",
  "titles": [{ "id": "paciente", "level": 1, "unlocked": true }, …],
  "achievements": [{ "id": "first_duty", "progress": 1, "goal": 1, "unlocked": true }, …],
  "reactions": { "bug": 7, "code": 5, "concept": 9, "patient": 4 },
  "rules": { "therapy_session": 20, "specialist_help": 40, "peer_help": 15, "board_host": 50, "first_duty": 0 },
  "earned": { "specialist_help": { "xp": 80, "times": 2 }, "peer_help": { "xp": 0, "times": 0 } }
}

Ids de título: `paciente`, `interno`, `residente`, `especialista`, `jefe`.
Ids de logro: `first_duty`, `group_therapy`, `selfless_help`, `board_teacher`, `campus_guardian`.
Los textos de unos y otros los pone el front (`apps/web/src/shared/i18n/`).

`reactions` son las valoraciones recibidas al ayudar (ver «Guardia: ayuda
reservada»). Ya no se dan valoraciones sueltas (la ruta `/reactions` se quitó): la XP por ayudar sale solo de una
sesión reservada.

GET /users/search?q= → hasta 8 personas cuyo login o nombre lleva lo escrito,
sin distinguir mayúsculas ni tildes: `[{ login, name, image }]`. Primero las de tu campus
y, dentro, las que empiezan así. Con menos de dos letras, `[]`. Es el buscador
de la cabecera.

GET /users/:login/profile → el expediente público de otra persona: `login`,
`image`, `xp`, `title`, `hacks` (las veces que le han pillado haciendo trampas
en Code Clicker), `achievements`, `reactions` y `health` (como `/me/health`). No lleva preferencias ni desglose de XP. `404`
si no conocemos a nadie con ese login.

## Avisos, chat y asistencia de un evento

Un evento se nombra con su id del calendario (`board:12`, `help:booking:7`,
`therapy:3:2026-10-12`, `evaluation:9690094`). Solo quien lo tiene en su
calendario (y va a ir) puede leer o escribir; el resto recibe `403`. Una sala
con alguien del otro mundo (estudiante o piscinero: quien organiza la pizarra
o la terapia, las dos partes de una ayuda o de un chat directo) también da
`403`, y en el chat, la asistencia, los avisos y la lista de conversaciones no
sale nadie del otro mundo.

- GET /events/thread?id= → `{ "messages": [{ "id", "login", "image", "kind", "minutes", "reason", "body", "at" }] }`.
- POST /events/messages → `{ "id", "kind", "minutes"?, "reason"?, "body"? }`; devuelve el chat.
  `kind`: `seen` (he visto el aviso), `late` (pide `minutes`), `absent` o `text`
  (pide `body`). `reason`: `evaluation`, `other_event`, `on_my_way`, `transport`, `other`.
- GET /events/alerts → `{ "alerts": [{ "event", "state" }] }`, por orden de
  inicio. `pending`: es con más gente de Sanatorio (pizarra, terapia o ayuda
  reservada; las correcciones de 42 no) y no has dicho si vas (la web no deja
  cerrar el aviso hasta que contestes con `seen`, `late` o `absent`); `missed`:
  pasó media hora desde el inicio sin respuesta y quedaste como no asistido
  (se apunta en el chat con `reason: "missed"`); `info`: no pide respuesta.
- POST /events/alerts/ack → `{ "id" }`: cierra un aviso `missed`. 204.
- Ni los mensajes ni el registro de intentos de códigos (`/admin/checkins`) se
  borran solos: los quita quien administra (ver «Borrado de datos»).
- GET /events/attendance?id= → solo pizarras y sesiones de ayuda aceptadas. Quien
  organiza recibe `codes: { start, end }` (cuatro caracteres cada uno) y lo
  validado por cada persona; quien asiste, lo suyo en `mine`. Las dos partes
  reciben `window: { startFrom, startUntil, endUntil, minStay }` (cuándo vale
  cada código) y `attemptsLeft`.
- POST /events/checkin → `{ "id", "code" }`. El de inicio marca cuándo empezaste;
  el de fin, cuándo terminaste, y solo vale si antes validaste el de inicio.
  `minutes` es `null` mientras falte uno: sin los dos no hay asistencia. `409`
  si no es el momento de ese código, `400` si el código no es de ese evento,
  `403` si ya has agotado los intentos.
- GET /events/report?from=&to=&login= → las horas validadas con códigos
  en un periodo (días `YYYY-MM-DD`, los dos incluidos; por defecto, los últimos
  treinta): `{ "from", "to", "totalMinutes", "rows": [{ "login", "role", "eventId",
  "kind", "title", "day", "from", "to", "minutes", "scheduledMinutes", "with" }] }`.
  Sin `login`, las tuyas; las de otra persona o las de todo el mundo
  (`login=all`), solo quien administra.
- POST /events/report/csv → `{ "from"?, "to"?, "login"? }`, lo mismo que la
  anterior: el informe como fichero para una hoja de cálculo, con las horas del
  campus. Es `POST` porque emite un documento y gasta del cupo diario: un
  enlace desde otra web no puede pedirlo. El fichero es un **documento
  verificable**: se guarda una copia con un código de cuatro caracteres, que va
  en el nombre (`horas-validadas_<login>_<desde>_<hasta>_<CÓDIGO>.csv`), en la
  cabecera `X-Verification-Code` y en la última línea
  (`"codigo_de_verificacion";"K7QF"`). Pedir dos veces el mismo documento da el
  mismo código. `429` si ya has emitido 40 documentos distintos hoy.
- GET /conversations → `{ "items": [...] }`: todas tus conversaciones, la de
  actividad más reciente primero (hasta 100). Son tuyas las directas en las que
  estás, los chats donde has escrito, los que te han dejado un aviso y los que
  has marcado. Cada una: `{ "id", "kind", "title", "peer", "image", "online",
  "last": { "from", "body", "kind", "at" } | null, "unread", "pending",
  "remindAt", "project": { "id", "name" } | null }`. `kind` es `direct`, `group`,
  `board`, `help` o `event`. `unread` cuenta los mensajes de otras personas
  posteriores a la última vez que abriste el hilo; abrirlo
  (`GET /events/thread`) o escribir en él la da por leída.
- PUT /conversations/mark → `{ "id", "read"?, "pending"?, "remindAt"?,
  "projectId"? }`. Lo que no viene se queda como estaba. `read: false` deja sin
  leer el último mensaje ajeno. `remindAt` (ISO-8601) tiene que ser futuro y a
  no más de 30 días; al llegar la hora se deja un aviso `chat_reminder` en el
  buzón, la conversación queda pendiente y la hora se vacía. Pedir un
  recordatorio la marca como pendiente salvo que se diga `pending: false`.
  Devuelve la lista al día. `403` si no participas en esa conversación, `400`
  si la hora o el proyecto no valen.
- GET /admin/checkins?id= → cada intento de validar un código de ese evento, con
  su resultado (`ok`, `repeat`, `wrong_code`, `locked`, `too_early`, `too_late`,
  `no_start`). Solo admins.

Reglas de los códigos (`modules/attendance/attendance.rules.ts`):

- **Sin los dos códigos no hay nada**: ni XP ni tiempo contado.
- El de **inicio** vale desde 10 minutos antes de la hora hasta 30 después (o
  la mitad del evento, si dura menos de una hora). Quien llega dentro de ese
  margen cuenta desde que llega; quien llega más tarde ya no puede empezar.
- El de **fin** vale cuando han pasado 10 minutos desde el de inicio y hasta 30
  minutos después de la hora de fin. Quien se va antes cuenta hasta que se va.
- El **tiempo validado** es el rato entre los dos códigos, recortado al horario
  previsto con 10 minutos de margen por cada lado, y nunca más que la duración
  prevista. Se guarda ya calculado, con el horario del evento en ese momento.
- El tiempo de **quien organiza** es el rato en que tuvo a alguien validado
  delante, sin contar dos veces a quienes coinciden.
- **Cinco códigos equivocados** por persona y evento, y ya no se puede validar.
- Repetir un código ya validado no cambia nada.

## Buzón y administración

Presupuesto de peticiones (`modules/admin/budget.rules.ts`). Nada es fijo, para
no llegar nunca a un máximo que deje la web parada:

- Lo de **hoy** es el tope diario o, si es menos, lo que queda del límite
  mensual (bytes de salida) entre los días que faltan para que se renueve,
  pasado a peticiones con lo que viene pesando cada una este mes. Del tope
  diario se gasta como mucho el colchón (`share`, 90 %); del mes solo se cuenta
  con lo que hay hasta el corte.
- Lo de **esta hora** es lo que queda del día entre las horas que faltan.
- Lo de **cada persona** es lo de la hora entre quienes están conectados, entre
  un mínimo y un máximo. El mínimo se respeta siempre.
- El **modo ahorro** lo deja todo en un cuarto mientras esté puesto.
- Días y horas en UTC. Al arrancar se recupera de la base lo ya servido.
- **Reglas fijas, que no se regulan**. Al 90 % del límite mensual
  (`STOP_SHARE`) solo entra quien administra: el resto recibe `503` con
  `{ "error": "service_stopped" }` y `Retry-After` en todo menos `/health` y
  `/auth/*`, no se pide nada a 42 y no corre ningún trabajo de fondo. Al 95 %
  (`HARD_STOP_SHARE`), `503` para todo el mundo menos `/health`. `budget.level`
  dice en cuál se está (`ok`, `admin_only`, `stopped`); manda lo peor entre lo
  que cuenta la web y lo que dice la guardia de la máquina. Se levantan solos
  al renovarse el límite. Se cuenta todo lo que sale, con o sin sesión.

Cuota de la API de 42 (`modules/replica/quota.ts`). 42 da 1 200 peticiones por
hora a toda la aplicación; se puede añadir un tope diario o mensual (lo de cada
día es lo que queda del mes entre los días que faltan). Lo que se pide a 42 va
en tres escalones, que se frenan en este orden:

| Escalón      | Qué es                                                   | Cuándo para |
| ------------ | -------------------------------------------------------- | ----------- |
| `background` | La copia y el repaso                                     | Cuota horaria por debajo de la reserva, o 70 % del tope del día |
| `deferrable` | Agenda de 42, hitos y cursus de cada persona, horas de los proyectos | Reserva horaria, o 90 % del tope del día |
| `critical`   | Entrar, y ver quién puede ayudarte y dónde está          | Solo con menos de 40 peticiones en la hora |

Lo aplazable se sirve con lo último guardado. Si es de una persona, coge turno
en una **cola por orden de llegada** guardada en la base: avanza sola (cinco
turnos cada veinte segundos) cuando vuelve a haber cuota, y mientras haya
alguien esperando nadie se cuela. Quien administra por configuración no hace
cola. El modo ahorro deja pasar solo lo crítico.

- GET /quota → `{ "level": "ok" | "tight" | "critical", "ticket": { "number":
  "A-042", "serving": "A-037", "ahead": 4, "etaMinutes": 5, "since" } | null }`.
  Es lo que pinta el rótulo de aviso y el tique de turno.
- GET /admin/quota → `{ "settings", "level", "hourlyRemaining", "day": { "spent",
  "allowance" }, "month": { "spent", "daysLeft", "renewsOn" }, "queued" }`. Solo admins.
- PUT /admin/quota → los ajustes que cambien de `{ "dailyRequests" (o `null`),
  "monthlyRequests" (o `null`), "renewDay" (1-28), "saving" }`. Solo admins.

- PUT /admin/budget → los ajustes que cambien de `{ "dailyRequests",
  "monthlyBytes" (o `null`), "renewDay" (1-28), "share" (0,5-1), "minPerPerson",
  "maxPerPerson", "saving" }`. Devuelve el estado (`budget` de
  `GET /admin/consumption`: `settings`, `day` y `month`). Solo admins.

- POST /tickets → `{ "kind": "issue" | "idea" | "report", "subject"?, "body", "target"?,
  "category"?, "section"?, "reason"? }`. Sin `subject`, se pone la primera línea
  de `body`. `category`: `bug`, `improvement`, `idea`, `translation`, `other`;
  `section`: el id de una sección de la web. Una denuncia (`report`) lleva
  `target` (`message:12`, `board:3`, `doubt:5`) y puede llevar `reason`
  (`spam`, `harassment`, `insults`, `other`); con un motivo que no sea `other`
  el `body` puede ir vacío.
- GET /tickets/mine → lo que has mandado, con su `answer` si la tiene y
  `withdrawUntil`: hasta cuándo puedes retirarlo (15 min y sin respuesta), o `null`.
- DELETE /tickets/:id → retira un mensaje tuyo mientras `withdrawUntil` no haya
  pasado. 204, o 409 si ya no se puede.

Solo admins (`403` para el resto). Administra quien está en `ADMIN_LOGINS` o
quien haya recibido el permiso desde el panel. Además, todo `/admin/…` pide el
**segundo factor**: sin él responde `403` con `error: "second_factor"`.

- GET /admin/totp → `{ "enrolled", "elevatedUntil" }`.
- POST /admin/totp/setup → `{ "uri" }` (`otpauth://…`, lo que lleva el QR).
  Mientras no se confirme se puede pedir otro; después, `409`.
- POST /admin/totp/confirm (la primera vez) · POST /admin/totp/verify →
  `{ "code": "123456" }`. `204` y la cookie `__Host-sanatorio_admin`, firmada y
  de ese navegador, que abre el panel 12 horas. Un código no vale dos veces;
  cinco fallos en 15 min dan `429`.
- POST /admin/totp/lock → cierra el panel en ese navegador. `204`.
- Si alguien pierde el móvil, se le da de baja por SSH y vuelve a darse de alta:
  `DELETE FROM admin_second_factor WHERE login = '…'`.

Con el panel abierto:

- GET /admin/consumption → tope actual, últimas 48 h, media por día de la semana
  y hora (UTC), avisos de los tramos por encima del 80 % del presupuesto y quién
  más consume.
- GET /admin/people · PUT /admin/roles `{ login, admin }` · PUT /admin/blocks
  `{ login, reason, days? }` · DELETE /admin/blocks/:login · PUT /admin/limits
  `{ login, perHour }` (`null` vuelve al tope automático).
- GET /admin/tickets · POST /admin/tickets/:id/answer `{ answer, status? }` ·
  DELETE /admin/tickets/:id (spam, bromas; 204). Responder o borrar un mensaje
  da por leído su `ticket_new` a todo quien administra.
- GET /admin/messages → los últimos mensajes de los chats de eventos.

Toda petición con sesión cuenta para el consumo de esa persona. Si se pasa de su
tope de la hora (el presupuesto repartido entre quienes están conectados, entre
240 y 3 000, o el que se le haya puesto a mano) recibe `429` con `Retry-After`.
Una cuenta bloqueada recibe `403` en todo.

## Uso de la web

Las claves son `<página>.<elemento>`: `nav.tablon`, `expediente.health`.

- POST /usage → `{ "counts": { "nav.tablon": 3 } }`. Suma lo que has usado desde
  el último envío (la web lo manda cada minuto). 204.
- GET /usage → `{ "counts": { "nav.tablon": 420 } }`: el total de la comunidad,
  para la ordenación automática. De cada persona cuentan como mucho 50 usos por
  elemento.
- GET /admin/usage/heatmap?by=total|activity|track|cohort → solo admins (`403` si no):

```json
{
  "by": "activity",
  "groups": [{ "id": "casual", "people": 38 }, { "id": "regular", "people": 20 }],
  "rows": [{ "key": "nav.tablon", "counts": [120, 300] }]
}
```

  `activity` agrupa por cuánto usa la web cada quien (`casual` < 30 usos,
  `regular`, `heavy` ≥ 150); `track`, por plan de estudios; `cohort`, por año
  en que empezó el 42cursus.

## Terapias de grupo
GET /groups → grupos abiertos del campus. Con `?project=1314`, los de ese proyecto.
[{
  "id": 7, "projectId": 1314, "projectName": "ft_printf", "creator": "legomez",
  "place": "Cluster 1 · Planta 2", "note": "Puestos c1r2s1 a c1r2s4",
  "dates": ["2026-10-13", "2026-10-15"],   // días concretos, en la hora del campus
  "start": "16:00", "end": "18:00", "capacity": 5,
  "members": [{ "login": "legomez", "image": null }],
  "joined": true,                    // estoy dentro
  "mine": true,                      // lo abrí yo (o modero): puedo cerrarlo
  "inSession": false                 // ahora mismo es día y hora de quedada
}]

POST /groups → 201 con el grupo. `capacity` (2-12, por defecto 5), `note` y `seats`
son opcionales. `seats` es la lista de puestos que reserva el grupo
(`["c1r2s3", "c1r2s4"]`, como mucho tantos como plazas); cada grupo los devuelve
en `seats` y en el mapa salen en azul.
{ "projectId": 1314, "place": "Cluster 1 · Planta 2", "dates": ["2026-10-13", "2026-10-15"], "start": "16:00", "end": "18:00" }

- POST /groups/:id/join → 204 (409 si está completo)
- DELETE /groups/:id/join → 204. Si era la última persona, el grupo se cierra.
- DELETE /groups/:id → 204. Solo quien lo abrió.
- POST /groups/:id/invite → `{ "invited" }`: avisa del grupo a quien hace el
  proyecto en el campus. Solo quien lo abrió, y una vez.

Las terapias son para **días concretos** (`dates`, de uno a catorce), no se
repiten cada semana. Un grupo se cierra solo cuando pasa su último día o cuando
se queda sin nadie, y entonces deja de salir en la lista, en el calendario y en
el mapa.

### Editar lo que has creado

Quien creó algo puede cambiarlo (y quien modera, también):

- PUT /groups/:id → el grupo entero, con el mismo cuerpo que al crearlo. Los
  días que ya tenía se pueden conservar aunque hayan pasado; los nuevos tienen
  que ser de hoy en adelante. Las plazas no pueden quedar por debajo de la gente
  apuntada.
- PUT /boards/:id → la pizarra, mientras no haya terminado. Mismas condiciones
  con las plazas.
- PUT /doubts/:id → `{ "body" }`. Mientras no esté resuelta: si lo está, hay que
  reabrirla (alguien ganó XP por responder a lo que decía).

Cambios en los grupos (`POST /groups`, `PUT /groups/:id`, `POST /groups/:id/join`):

- `seats`: de dos a seis puestos que se tocan: mismo cluster y cada uno al lado,
  delante, detrás o en diagonal de otro del grupo. Con puestos, `capacity` son los puestos y lo que
  se mande se ignora; sin puestos (campus sin plano) vale `capacity` (2-12, 5).
- `kind`: `study` (por defecto) o `review`, un grupo de repaso para quien ya
  tiene el proyecto terminado. Abrirlo o apuntarse a él exige `progress: 100`.
- `progress` (0-100): cómo lleva el proyecto quien abre el grupo o se apunta
  (`POST /groups/:id/join` → `{ "progress": 35 }`). Sale en cada `members[]`.
- El chat del grupo es el de los eventos, con id `group:<id>`
  (`GET /events/thread?id=group:3`): solo para quien está dentro.

`PUT /me/settings` acepta además `preReview` (te ofreces a preevaluar proyectos
terminados); `GET /projects/:id/peers` lo devuelve en cada persona que ya aprobó
ese proyecto.

## Tablón de dudas
GET /doubts/graph → **tu plan** del common core, por círculos: los proyectos
que tienes o tendrás disponibles. No es un catálogo: quien sigue el plan nuevo
ve sus módulos de Python y no los proyectos de C que ya no le tocan, y al
revés. La piscina no sale nunca.

```json
{
  "track": "next",
  "level": 3.66,
  "currentCircle": 3,
  "knownUpTo": 3,
  "circles": [
    {
      "circle": 1,
      "projects": [
        {
          "projectId": 1316, "name": "ft_printf", "short": "printf",
          "status": "finished", "perfect": true, "hours": 55, "series": null, "locked": false,
          "signals": { "unanswered": 1, "proposals": 0, "missingGuide": false }
        }
      ]
    }
  ]
}
```

- `track`: `"classic"` (todo en C) o `"next"` (C y luego Python). Lo marca 42
  con el hito `42next`.
- `currentCircle`: el círculo en el que estás (el siguiente al último rango
  `common-core-rank-0N` que validaste).
- `knownUpTo`: hasta qué círculo se conoce tu plan. Menor que 6 significa que lo
  de después aún no se sabe.
- `status`: `"todo"`, `"in_progress"` o `"finished"`. `locked` es `true` si el
  proyecto es de un círculo al que aún no has llegado.
- `level`: nivel en el 42cursus, del perfil del último login. `null` si no se sabe.
- `perfect`: lo aprobó con la nota máxima, 125.
- `hours`: horas que 42 estima para el proyecto (`estimate_time` de su
  `project_session`: "55 hours"). Un día cuenta 8 h y una semana 40. Se piden
  todas las del campus de una vez (2 peticiones) y se guardan una semana.
- `series`: `"Python"` o `"CPP"` si es uno de varios módulos numerados; la web
  los agrupa en una sola burbuja.
- `signals` solo trae lo que le sirve a quien pregunta. Quien **aprobó** el
  proyecto ve las dudas sin responder, las propuestas a la guía pendientes y si
  falta la guía. Quien lo tiene **en curso** ve solo las dudas sin responder.
  Quien **no ha llegado** no ve nada. Las dudas y propuestas propias no cuentan.

**De dónde sale el círculo de cada proyecto.** La API de 42 no lo dice. Se
deduce de dos cosas que sí da de cada persona: cuándo validó cada rango y cuándo
se apuntó a cada proyecto (nadie se apunta a uno antes de tenerlo disponible).
Con cada persona que abre el grafo se aprende un poco más, y de cada proyecto se
guarda el círculo más bajo visto. La tabla de partida (plan clásico entero y
círculos 0 a 3 del nuevo) y la lógica están en
`apps/api/src/modules/replica/curriculum.ts`. Cuesta una petición a 42 por
persona y día.

**Piscina.** En todas las listas de proyectos de una persona (sala de espera,
mapa, grafo) solo cuentan los del 42cursus (`cursus_ids` con `21`). De quien
todavía está en la piscina se enseñan los suyos, que es lo único que tiene.

GET /projects/:id/doubts
{
  "project": { "id": 1314, "name": "ft_printf" },
  "guide": { "start": ["…"], "problems": ["…"], "concepts": ["…"], "updatedBy": "jdoe", "updatedAt": "…" },
  "canEditGuide": false,             // true si aprobé el proyecto
  "proposals": [{ "id": 3, "author": "legomez", "section": "problems", "body": "…" }],  // solo si canEditGuide
  "doubts": [{
    "id": 12, "author": "legomez", "body": "¿Por qué ft_split me da leaks?",
    "color": 0,                      // 0-4: color del post-it
    "status": "open",                // open | specialist (respondió alguien que lo aprobó) | resolved
    "answers": 4, "createdAt": "…", "mine": true
  }]
}

- POST /projects/:id/doubts `{ "body": "…" }` → 201 con la duda (5-280 caracteres)
- GET /doubts/:id → la duda más `"replies": [{ "id", "author", "body", "specialist", "createdAt" }]`
- POST /doubts/:id/answers `{ "body": "…" }` → 201 con la lista de respuestas
- PUT /doubts/:id/resolved `{ "resolved": true }` → 204. Solo quien la puso.
- DELETE /doubts/:id → 204. Solo quien la puso.
- PUT /projects/:id/guide `{ "start": [], "problems": [], "concepts": [] }` → la guía. Solo especialistas.
- POST /projects/:id/guide/proposals `{ "section": "problems", "body": "…" }` → 204. Cualquiera.
- POST /guide-proposals/:id/accept · POST /guide-proposals/:id/reject → 204. Solo especialistas.

## Pizarras
GET /boards?from=<ISO>&to=<ISO> → pizarras del campus que empiezan en ese intervalo
[{
  "id": 4, "title": "malloc: dónde vive tu memoria", "topic": "malloc", "description": null,
  "place": "Cluster 1, sala de pizarras",
  "startsAt": "2026-10-08T15:00:00.000Z", "endsAt": "2026-10-08T16:30:00.000Z",
  "capacity": 20, "attendees": 12,
  "host": "jdoe", "hostImage": "https://...",
  "joined": false, "mine": false
}]

POST /boards → 201 con la pizarra. `topic`, `description` y `capacity` (por defecto 20) son opcionales.
{ "title": "…", "place": "…", "startsAt": "2026-10-08T17:00:00+02:00", "endsAt": "2026-10-08T18:30:00+02:00" }

- Ni pizarras ni terapias se pueden poner con más de 62 días de antelación
  (`EVENT_HORIZON_DAYS`, en `core/time.ts`): `400`. Una que ya estuviera más
  lejos se puede retocar o acercar, pero no se puede llevar ninguna allí. La
  web, antes de guardar, dice cuánto falta y pide confirmación.

- POST /boards/:id/join → 204 (409 si no quedan plazas)
- DELETE /boards/:id/join → 204
- DELETE /boards/:id → 204. Solo quien la imparte.

Quien imparte gana 50 XP cuando la pizarra ya ha terminado y al menos otra persona
validó los dos códigos de asistencia (ver "Reglas de los códigos").

## Calendario personal

GET /calendar?from=&to=&fresh= → tus eventos entre dos instantes (ISO-8601), ordenados
por hora. Como mucho, 62 días de una vez. Lo tuyo de 42 se guarda un cuarto de
hora; con `fresh=1` (lo manda la web al abrir el calendario o pulsar
«Actualizar») se vuelve a pedir si tiene más de dos minutos, para que salga una
corrección recién reservada. `fresh` solo admite `0` o `1`.

```json
{
  "events": [
    {
      "id": "event:44804", "kind": "event_joined",
      "title": "[FOUNDERS on the Stage]",
      "start": "2026-10-14T14:00:00.000Z", "end": "2026-10-14T16:00:00.000Z",
      "place": "Auditorio", "description": "…",
      "joined": true, "seats": { "taken": 86, "max": 120 },
      "withLogin": null,
      "url": "https://profile.intra.42.fr/events/44804", "section": null
    }
  ],
  "fortyTwoAt": "2026-10-10T20:05:00.000Z"
}
```

| `kind`         | Qué es                                              | De dónde sale |
| -------------- | --------------------------------------------------- | ------------- |
| `help`         | Tus franjas de guardia de hoy y reservas de ayuda   | Sanatorio     |
| `therapy`      | Cada sesión de los grupos de terapia en los que estás | Sanatorio   |
| `board`        | Pizarras del campus                                 | Sanatorio     |
| `evaluation`   | Correcciones concertadas (corriges o te corrigen)   | 42            |
| `event_joined` | Eventos a los que estás apuntado                    | 42            |
| `event_open`   | Eventos del campus a los que no                     | 42            |
| `exam`         | Exámenes del campus                                 | 42            |

- `joined`: `true`/`false` si te has apuntado o no; `null` si no aplica.
- `url`: página del evento en la intra. Solo en lo de 42.
- `section`: sección de la web donde se gestiona (`guardia`, `terapia`,
  `pizarras`). Solo en lo de Sanatorio.
- `seats.max` es `null` si no hay tope.
- `fortyTwoAt`: cuándo se leyó lo de 42 por última vez; `null` si no se ha podido
  (el calendario sale igual, solo con lo de Sanatorio).
- De una corrección no se dice con quién: 42 lo oculta hasta que llega la hora.
- Las **franjas abiertas para corregir** no están: 42 solo las da con el permiso
  `projects` (de escritura), que esta web no pide.
- **Mundos separados** (`docs/piscineros.md`): los eventos y exámenes del
  campus se filtran por cursus (`cursus_ids` de los eventos, `cursus` de los
  exámenes, guardados en `agenda_events.cursus`). Un estudiante ve los del
  42cursus (`21`) y los que no dicen de qué cursus son (lista vacía o filas de
  antes); un piscinero, solo los de la piscina (`9`). Lo que va con otra
  persona (`withLogin`) solo sale si es de tu mundo. Lo tuyo de 42
  (inscripciones, exámenes y correcciones) sale siempre.

Lo de 42 se pide solo cuando alguien abre su calendario y se guarda: lo del
campus (eventos y exámenes, 2 peticiones) una hora; lo de cada persona
(inscripciones, exámenes y correcciones, 3 peticiones) un cuarto de hora.

## Guardia: ayuda reservada

Quien está de guardia abre franjas del día (en medias horas) y un tope de
minutos; otras personas le reservan un rato. Es la única forma de ganar XP por
ayudar en persona.

- GET /help/today → tu guardia de hoy (con `presence`: `available`, el interruptor, y
  `seat`, tu puesto si estás sentado): `windows`, `maxMinutes`, `bookedMinutes`,
  `bookings`, `mustRate` y `blocked`.
- PUT /help/today → `{ "windows": [{ "start": "17:00", "end": "19:00" }], "maxMinutes": 60 }`.
  Las franjas que se pisan se juntan. `[]` retira la oferta.
  Las medias horas que ya han empezado se descartan, salvo las que ya tenías
  abiertas; la respuesta trae lo que ha quedado.
- GET /help/offers → quién se ofrece hoy y aún tiene hueco:
  `[{ "login": "jdoe", "freeStarts": ["17:00", "17:30"], "remainingMinutes": 60 }]`.
- POST /help/bookings → `{ "helper", "start", "minutes", "projectId"?, "note"? }`
  (`minutes`: 30, 60, 90 o 120). Queda `pending`.
- POST /help/bookings/:id/accept · POST /help/bookings/:id/decline → 204. Solo
  quien ayuda.
- GET /help/inbox → las peticiones que tienes por contestar y las tuyas que se
  rechazaron o anularon y aún no has visto.
- POST /help/bookings/:id/seen → 204: ya has visto que se rechazó o anuló.
- DELETE /help/bookings/:id → 204. Cualquiera de las dos personas, antes o
  después de la hora ("al final no quedamos").
- POST /help/bookings/:id/rating → `{ "tag" }`. Devuelve `{ "xp" }`: `null` si
  falta la otra valoración, o si faltan los códigos y aún se pueden validar.
- POST /help/blocks → `{ "login" }` · DELETE /help/blocks/:login → 204.
- GET /help/reputation → `{ "asked": { "prepared": 4, "curious": 6, "autonomous": 2, "basics": 1 } }`.

Reglas:

- La reserva la tiene que **aceptar** quien ayuda.
- Quien recibe la ayuda **valida los dos códigos** (inicio y fin) que le enseña
  quien ayuda; `verified` dice si lo ha hecho. Sin ellos, la sesión se cierra
  con 0 XP cuando caduca el código de fin.
- La XP se reparte cuando **las dos partes han valorado**. Quien pidió ayuda
  elige cómo le ayudaron (`bug`, `code`, `concept`, `patient`); quien ayudó,
  cómo llegó la otra persona (`prepared`, `curious`, `autonomous`, `basics`).
  Ninguna es una nota.
- Una pareja puntúa una vez al día, y solo puede tener una reserva al día.
- Con una sesión terminada sin valorar (`mustRate`) no se puede reservar ni
  ofrecerse.
- **Lo que ya tienes en el calendario** manda sobre la guardia: correcciones,
  exámenes y eventos de 42 a los que vas, terapias y pizarras. Mientras dura no
  se te puede reservar, aunque caiga en una franja abierta, y la web no deja
  marcar esas medias horas. `GET /help/today` lo trae en `busy`.
- Una media hora ya empezada no se puede abrir, pero sí quitar; la que alguien
  tiene reservada se queda hasta cancelar o rechazar la reserva. Los **slots abiertos** para corregir no se pueden leer ni cerrar: 42
  los reserva al permiso `projects`, que esta web no pide.
- A quien bloqueas no le sales en `/help/offers` ni puede reservarte; recibe la
  misma respuesta que si no te ofrecieras.

## Code Clicker (sección secreta)

Se llega pulsando cien veces la cruz de la cabecera y eligiendo la pastilla
roja. La API no juega: cuenta pulsaciones, guarda qué pastilla se eligió y
custodia la partida. Las reglas están en `apps/web/src/features/clicker`.

GET /clicker → por dónde vas y tu partida:
`{ plus, pill, save, rev, caught, saleDue, names }`.

- `names` son los logins que más corrigen en tu campus, para las noticias del
  juego. Solo viene con la pastilla roja.
- `caught` son las veces que te han pillado haciendo trampas, y `saleDue` dice
  que te toca vender todos los edificios antes de poder guardar.

POST /clicker/plus → `{ "count": 3 }`: pulsaciones de la cruz desde el último
envío (25 como mucho). Devuelve `{ plus, pill }`. Con pastilla elegida ya no suma.

POST /clicker/pill → `{ "pill": "red" }` o `"blue"`. Una sola vez, y solo con
cien pulsaciones: `409` si falta o si ya se eligió. La azul no tiene vuelta atrás.

PUT /clicker/save → `{ rev, caught, refused }`. Recibe
`{ save, rev, session, total, perSecond, achievements, prestige, spent }`: `rev`
es la que se cargó (o la del último guardado), `session` un identificador de la
pestaña y `spent` lo que costó todo lo que se tiene. `409` si la partida se ha
seguido en otro dispositivo: solo entra un guardado de la pestaña que hizo el
último o que parta de la `rev` que hay. `403` sin la pastilla roja; `400` si
`save` no es una partida. La partida pesa 80 kB como mucho, y el `total` de la
clasificación nunca baja.

Trampas (`modules/clicker/cheat.rules.ts`). Un guardado que no cuadra no entra:
se contesta `refused: true` y la web vuelve a cargar la última partida buena. No
cuadra si las cifras no son las de la partida (`figures`), si se tiene más de lo
que se ha escrito (`ledger`), si se ha escrito más de lo que da tiempo desde el
último guardado, ni con la mejor racha (`rate`), o si hay más producción
(`speed`) o prestigio (`prestige`) del que cabe con lo escrito. Los márgenes son
anchos: solo cae lo desproporcionado.

- Cada trampa suma a `caught`, como mucho una cada cinco minutos, y pone un
  título en el banner: `hacker_etico` la primera, `hacker_poco_etico` la segunda
  y `hacker_cazado` de la tercera en adelante (el expediente trae `hacks`, las
  veces, para el contador).
- De la tercera en adelante queda `saleDue`: la web vende todos los edificios a
  la mitad de lo que costaron y guarda. Mientras no llegue una partida sin
  edificios, los guardados se contestan con `refused: true`.
- La partida rechazada se guarda tal como llegó (las diez últimas de cada
  persona), por si hay que indultarla.

Capital. Con cada guardado la web manda `capital`: `[segundo, capital]` de cada
segundo desde el anterior (el capital son las líneas sin gastar, lo que costó lo
que se tiene y lo que deben los bugs). La API mira esos segundos y, si el
capital se multiplica por tres o más en diez segundos o menos (y pasa del
millón) sin que el guardado se haya dado por trampa, deja un aviso para quien
administra con los segundos de alrededor.

El historial no se borra: se aligera. Lo del último día se guarda cada diez
segundos; cada hora, un trabajo deja lo que tiene más de un día en un punto por
hora, y lo que tiene más de una semana, en uno por día.

GET /clicker/capital?from=&to= → `{ points, first, last }`: tu historial,
`[segundo, capital]`, en 300 puntos como mucho. `from` y `to` (segundos desde
1970) piden solo un tramo, que llega con el detalle que haya de esas fechas.
`first` y `last` son el primer y el último segundo con historial.

GET /admin/clicker/capital?login=&from=&to= → lo mismo, de otra persona. Solo admins.

GET /admin/clicker/cheats → `{ entries, people }` (`ClickerCheats`): el registro de
trampas, una fila por cada vez que se pilló a alguien (sola al guardar, al
revisar un salto o con una sanción a mano), con su motivo, cifras, lo requisado
y si se indultó; y un resumen por persona con su patrimonio y si tiene una
revisión abierta. Solo admins.

POST /admin/clicker/cheats/:id/pardon → 204. Solo admins. Indulta una trampa: la
partida rechazada pasa a ser la que está en curso (con sus cifras), se descuenta
de `caught`, se quita la venta pendiente, el banner vuelve al título de antes y
la copia se borra. `404` si ya no está. Quien tuviera la partida abierta recibe
`409` al guardar y tiene que cargarla.

DELETE /admin/clicker/alerts/:id → 204. Solo admins. Descarta un aviso de salto.

POST /admin/clicker/sanction → `{ login, code, wipe, note }` → 204. Solo admins.
Le deja ese código de sanción y, con `wipe`, sin edificios ni mejoras; lo verá
en el juego.

Pulsar más de lo que aguanta una persona también es trampa (motivo `clicks`).
No se mira segundo a segundo, sino el total de cada tramo seguido: más de 50
por segundo durante un minuto, más de 9 durante media hora, y de media más de 6
en 2 h, 4 en 6 h y 2 en 24 h (`clicks.rules.ts`). El minuto se mide con lo que
manda la web en `clicks` (`[segundo, pulsaciones]`, como `capital`, reenviando
el último minuto del guardado anterior); los tramos largos, con el contador de
cada guardado y la hora del servidor (tabla `clicker_clicks`, 25 h).

POST /admin/clicker/alerts/:id/review → `{ "verdict": "cheat" | "likely" | "clean" }`. 204.
Solo admins. Lo que se decide sobre un salto de capital sospechoso:

- `clean`: no es trampa; se cierra sin más.
- `likely`: le sale una ventana que no se salta con las cifras que no cuadran
  (`GET /clicker/reviews`) y tiene que defenderse o explicar cómo lo hizo
  (`POST /clicker/reviews/:id` `{ "answer" }`, de 20 a 2 000 letras). La
  respuesta llega a quien administra (aviso `clicker_defense`) y al panel
  (`status: "answered"`, `answer`); un método nuevo no se penaliza.
- `cheat`: la **política de trampas**, la misma que se aplica sola a cada
  trampa que se pilla al guardar: se vuelve a la última partida buena, se venden
  todos sus edificios y se le da la mitad de lo que costaron (`SALE_REFUND`), y
  esa misma cantidad se reparte a partes iguales entre quienes juegan y nunca han
  sido pillados (les llega en `gift` con su siguiente `PUT /clicker/save`). En el
  juego le sale el aviso de la policía del código con las cifras que no
  cuadraron (`seizure` en `GET /clicker`, hasta `POST /clicker/seizure/ack`).
  El aviso lleva `n` (veces pillado: elige el mensaje) y `shared` (entre
  cuántas personas se repartió).

GET /admin/clicker/game?login= → `{ login, save, caught, perSecond }`: la
partida de alguien, para verla en su pantalla de juego sin guardar nada. Solo admins.

GET /clicker/board → `{ entries, me }`: quién ha escrito más código, de
cualquier campus. `level` es `floor(3 · log10(1 + total))`. `403` sin la roja.

GET /admin/clicker?days= → `{ days, totals, players, alerts, cheats }`: el uso del juego. Solo
admins. `days` (1 a 90, por defecto 7) son los días que cubre el tiempo.

- `totals`: `pressed` (pulsaron la cruz), `reached` (llegaron a cien), `red`,
  `blue`, `players` (con partida guardada), `caught` (con trampas), `active` (pulsaron o guardaron en el
  periodo), `total` (líneas), `saves` y el tiempo con el juego abierto
  (`seen`, `back`, `hidden`, en segundos).
- `players`: una fila por persona que ha pulsado la cruz, con `plus`, `pill`,
  `level`, `total`, `perSecond`, `achievements`, `prestige`, `clicks`
  (pulsaciones de la tecla, leídas de la partida), `saves`, `updatedAt`, las
  trampas (`caught`, `caughtWhy`, `caughtAt`) y su tiempo en el periodo.
- `alerts`: los saltos de capital por mirar (`login`, `at`, `seconds`, `from`,
  `to`, `golden` y `trace`), y `cheats`: las partidas rechazadas que se pueden
  indultar (`id`, `login`, `at`, `why`, `total`, `perSecond`).
- El tiempo sale del uso de la sección `nav.clicker`; lo demás es de siempre,
  porque de la partida solo se guarda cómo está ahora.

## Borrado de datos

La API no borra nada por viejo. Quien administra elige qué quitar. Cada módulo
declara sus datos borrables en `stores` (`core/db/data-store.ts`).

GET /admin/data → `{ kinds: [{ id, rows }] }`: los tipos de dato y cuántas filas
tiene cada uno. Ahora: `traffic`, `tickets`, `notices`, `messages`,
`event_alerts`, `broadcasts` (con sus respuestas), `checkins`, `usage`, `flows`,
`clicker_capital`, `clicker_alerts` y `clicker_cheats`.

POST /admin/data/count → `{ rows }`. Recibe `{ kind, login?, before?, from? }`:
sin `login` son las filas de todo el mundo; `before` deja solo lo anterior a ese
día y `from`, lo de ese día en adelante (`YYYY-MM-DD`, UTC). Sin fechas, todo.

POST /admin/data/preview → `{ rows, columns, sample }`: lo mismo que se
borraría con ese cuerpo. `rows` es el total y `sample`, las 50 filas más
recientes como mucho, con los valores en el orden de `columns` y los textos
largos recortados a 120 caracteres. Es lo que enseña la web antes de borrar.

POST /admin/data/delete → `{ rows }`: lo mismo, pero las borra. No hay vuelta
atrás. `404` si el tipo no existe. Las tres, solo admins.

Lo único que sigue borrándose solo es interno: la cola de peticiones a 42 ya
servidas, y las copias de partidas rechazadas de Code Clicker que pasan de diez
por persona.

## Demostraciones («cómo funciona»)

Cada demostración animada tiene un deslizador de velocidad, y su velocidad de
fábrica se ajusta sola con lo que hace la gente.

GET /tours/speeds → `{ speeds: { "board": 1.5 } }`: a cuánto va cada una de
fábrica. `1` es el ritmo con el que se escribió; las que no salen van a `1`.

POST /tours/speed → `{ speed }`. Recibe `{ name, rate }`: a cuánto has visto esa
demostración respecto a la de fábrica (de `0.5` a `2`; `1` si no tocaste el
deslizador). Se guarda una por persona y demostración. Cuando la han visto 8
personas distintas, la de fábrica se multiplica por la media geométrica de lo
que la han movido (entre `0.5` y `3`; si la media se aparta menos de un 5 %, se
queda) y se vuelve a contar desde cero. Cuenta también quien no la toca.

GET /admin/tours → `{ votesToAdjust, tours }`. Solo admins. De cada una: `speed`
(la de fábrica), `faster`, `slower` y `same` (cuánta gente la ha acelerado,
frenado o dejado desde el último ajuste), `mean` y `adjustedAt`.

## Comunicados

Mensajes de quien administra que salen en pantalla a quien le toquen.
`GET /pulse` trae `broadcasts`: cuántos tienes por leer.

GET /broadcasts → los que tienes por leer, el más antiguo primero.

```json
[
  {
    "id": 4,
    "from": "albrodri",
    "title": "¿Vienes a la charla?",
    "body": "El jueves a las 17:00",
    "options": ["Sí", "No"],
    "required": true,
    "at": "2026-10-12T09:00:00.000Z"
  }
]
```

POST /broadcasts/:id/answer → `{ "option": 0 }`, o `{ "option": null }` para
cerrarlo sin elegir. Devuelve los que quedan por leer.

- `400 invalid_input` si la opción no existe, o si `required` es `true`, hay
  opciones y no se elige ninguna. Sin opciones basta con `null`.
- `404` si no es para ti o ya lo contestaste.
- Deja de salir a los 30 días y se borra a los 180.

Solo admins:

- GET /admin/broadcasts → los últimos 50 con `audience`, `counts` (cuántos han
  elegido cada opción), `seen` (lo han visto sin elegir) y `answers`.
- POST /admin/broadcasts → `201`. `{ title, body, options?, required?, audience }`
  con `audience` igual a `{ "kind": "all" }`, `{ "kind": "campus", "campusId": 22 }`
  o `{ "kind": "logins", "logins": ["ana"] }`. Hasta 6 opciones y 200 logins.
- DELETE /admin/broadcasts/:id → `204`. Lo retira con sus respuestas.

A quién le toca se decide al preguntar, no al mandarlo: le llega también a
quien entra días después. El campus es el que esa persona está mirando.

## Estadísticas de uso

POST /usage acepta, además de `counts`, el tiempo pasado en cada sección:

```json
{ "counts": { "nav.tablon": 2 }, "time": { "nav.tablon": [300, 60, 0] } }
```

- Los tres números son segundos: viendo la web (pestaña visible y ventana con
  el foco), con otra ventana delante, y con la pestaña oculta. Hasta 900 por
  envío.
- Se guarda por persona, día, hora (UTC) y elemento. No se borra solo.

Tramo de gente. `/admin/stats`, `/admin/flows` y `/admin/usage/heatmap` admiten
`low` y `high` (de 0 a 100): se ordena a la gente de menos a más activa y se
mira solo la que cae entre esos tantos por ciento, para dejar fuera a quien más
usa la web, a quien menos, o a los dos. En las dos primeras la actividad es el
tiempo mirando la web en el periodo; en el mapa de calor, los usos de siempre.
La respuesta trae `segment: { low, high, people, of }`. Si se pide un `login`,
el tramo no se aplica.

GET /admin/online → `{ now, people: [{ login, image, since, seenAt }] }`: quién
tiene la web abierta ahora. `since` es cuándo empezó su sesión (más de diez
minutos sin señales de vida y la siguiente ya es otra) y `now`, la hora de la
API para contar cuánto lleva. Solo admins.

Recorridos. Con `POST /usage` la web manda también `flows`: los pasos de una
sección a otra desde el último envío (`{ "tablon>red": 2 }`); al entrar, el
primero viene de `start`. Se guardan por persona y día.

GET /admin/flows?from=&to=&login= → `{ from, to, login, sessions, sections, flows }`.
Solo admins. `sessions` son las entradas a la web. Cada sección trae `visits`
(llegadas), `entries` (las que fueron lo primero), `onward` (las que siguieron a
otra), `exits` (las que no: ahí se acabó), `exitRate`, `seen` y `avgSeen`
(segundos mirándola, en total y por visita) y `role`: `pass`, de paso (menos de
20 s por visita y tasa de salida bajo el 30 %); `end`, final de trayecto (tasa
de salida del 60 % o más); `stay`, de estancia (dos minutos o más por visita);
`null` si no destaca o tiene menos de cinco visitas. `flows` son los pasos
(`from`, `to`, `count`, `people`), el más repetido primero.

GET /admin/stats?from=&to=&login= → solo admins. Días UTC, los dos incluidos;
por defecto la última semana, y 92 días como mucho.

```json
{
  "from": "2026-10-06",
  "to": "2026-10-12",
  "login": null,
  "totals": { "clicks": 3, "seen": 420, "back": 60, "hidden": 1500,
              "requests": 2, "bytes": 3000, "people": 2 },
  "hours": [{ "day": "2026-10-06", "hour": 14, "people": 2, "clicks": 3,
              "seen": 420, "back": 60, "hidden": 600, "requests": 2, "bytes": 3000 }],
  "keys": [{ "key": "nav.tablon", "clicks": 2, "seen": 300, "back": 60,
             "hidden": 900, "people": 1 }],
  "users": [{ "login": "ana", "clicks": 3, "seen": 300, "back": 60,
              "hidden": 900, "requests": 2, "bytes": 3000 }]
}
```

- `requests` y `bytes` son el tráfico con la API de Sanatorio (`request_stats`).
- Las secciones (`nav.*`) llevan tiempo; los bloques de una página, solo
  pulsaciones.
- Con `login`, todo es de esa persona y `users` viene vacío.

## Clústers y chat directo

GET /map → el plano del campus (el mismo de `GET /projects/:id/map`, sin nadie
resaltado). Cada `occupant` lleva `online`: `true` si tiene Sanatorio abierto.

POST /map/seats/:host/broken → 204: ese puesto no funciona (se ve así una
semana). DELETE /map/seats/:host/broken → 204: ya funciona.

- "Abierto" es haber pedido `GET /pulse` en los últimos 6 minutos: es lo único
  que toda pestaña pregunta de fondo, y se anota como mucho una vez por minuto.

Las conversaciones directas salen, con todas las demás, en `GET /conversations`
(ver «Avisos, chat y asistencia de un evento»).

- Un chat directo es un chat más: se lee y se escribe con
  `GET /events/thread?id=dm:<a>:<b>` y `POST /events/messages`, con los dos
  logins en orden alfabético. `403` si no eres uno de los dos, si el orden no
  es ese o si alguno no existe.
- Valen los mismos topes de mensajes por minuto, no se borran solos y
  avisan en el buzón con `kind: "chat"` y `ref` igual al id.

## Estado de salud

GET /me/health → las fechas para saber cómo vas de tiempo en el common core.

```json
{
  "startedAt": "2026-05-18T07:42:00.000Z",
  "blackholedAt": "2027-04-03T07:42:00.000Z",
  "currentCircle": 3,
  "milestones": [
    "2026-05-19T11:37:22.148Z",
    "2026-06-18T14:40:03.509Z",
    "2026-08-20T21:31:21.769Z"
  ],
  "declared": {
    "pace": 15,
    "circle": 3,
    "deadline": "2026-11-11",
    "updatedAt": "2026-10-12T09:00:00.000Z"
  }
}
```

PUT /me/health/pace → anota el pace y el *Milestone Deadline* que ves en tu
perfil de la intra, y devuelve lo mismo que `GET /me/health`.

```json
{ "pace": 15, "deadline": "2026-11-11" }
```

`400 invalid_input` si el pace no es 8, 12, 15, 18, 22 o 24, si la fecha no va
como `AAAA-MM-DD` o queda a más de 800 días, o si ya completaste el common core.

- `startedAt` y `blackholedAt` salen del `cursus_users` del 42cursus (id `21`)
  de tu perfil, que se guarda cada vez que entras. `blackholedAt` es la fecha
  que 42 puso al crear el cursus: no cuenta los días de bonus ni el avance, así
  que la web no calcula con ella. Puede ser `null`.
- `milestones[n]` es cuándo validaste el `common-core-rank-0n`
  (`/v2/users/:id/quests_users`, como mucho una petición al día por persona).
- `declared` es lo que la persona anotó, o `null`. 42 no publica en su API ni el
  pace ni el plazo de cada milestone, y son los únicos datos con los que las
  fechas salen exactas. `circle` es el círculo en el que estaba al anotarlo.
- La API solo da hechos. Las cuentas las hace la web con la tabla del pace
  system (`apps/web/src/shared/pace.ts`): el día cero de la persona es
  `deadline` menos los días que la tabla da a ese pace para ese círculo, y de
  él salen los plazos de todos los paces, el black hole (el plazo del pace 24)
  y la calculadora. Sin `declared` no se calcula nada: la web lo pregunta.
- Si 42 da más días de bonus, el plazo del perfil cambia y hay que anotarlo otra
  vez; por eso se enseña `updatedAt`.

## Red de correcciones

Quién ha corregido a quién en el 42cursus del campus que miras. Sale de una
copia local de las correcciones de 42 que se va completando sola.

Varias escuelas. `/network`, `/network/pair`, `/network/strictest` y
`/network/people` admiten `campuses`: los ids de los campus que se miran juntos,
separados por comas, o `all` para todos los que tienen correcciones copiadas.
Sin él, el de quien pregunta. El grafo trae `campuses` (los que se están
mirando), `available` (los que se pueden elegir, con su nombre) y, en cada
persona, `campusId` (de cuál es; `null` si viene de fuera de todos ellos).

GET /network?from=&to=&login=&projectId=&min=&limit= → el grafo. Todo opcional.

- `from`, `to`: fecha (`2026-10-11`) o instante ISO-8601. `to` sin hora incluye
  ese día entero.
- `login`: se centra en esa persona: ella, quien se ha cruzado con ella y las
  uniones entre todos.
- `projectId`: solo las correcciones de ese proyecto.
- `verdict`: `pass` (solo las correcciones que aprobaron) o `fail` (solo las que
  suspendieron). `mutual=1`: solo las uniones en las que las dos personas se han
  corregido mutuamente.
- `min` (1-100, por defecto 1): correcciones mínimas entre dos personas para que
  salga su unión. `limit` (10-20000, por defecto 300): tope de personas, las más
  activas primero.

```json
{
  "query": { "from": "2025-10-11", "to": null, "login": null, "projectId": null, "verdict": null, "mutual": false, "min": 2, "limit": 300 },
  "nodes": [
    {
      "login": "jdoe", "image": "https://…", "external": false,
      "given": 41, "received": 38, "partners": 52,
      "endogamy": 31, "repetition": 0.342, "reciprocity": 0.278,
      "givenPassRate": 0.829, "receivedPassRate": 0.947, "community": 0, "cohort": 2024
    }
  ],
  "links": [{ "source": "jdoe", "target": "mgomez", "forth": 3, "back": 2 }],
  "totals": {
    "corrections": 13301, "people": 525, "pairs": 11143, "mutualPairs": 1081,
    "endogamy": 17, "repetition": 0.162, "reciprocity": 0.175, "communities": 8
  },
  "hidden": { "nodes": 34, "links": 0 },
  "topPairs": [{ "source": "estina", "target": "gsanchez", "forth": 5, "back": 5 }],
  "timeline": [{ "month": "2026-09", "corrections": 1310 }],
  "projects": [{ "id": 1314, "name": "Libft", "corrections": 4200, "passRate": 0.861 }],
  "sync": { "phase": "copying", "rows": 13301, "total": 81723, "first": "2019-02-25T09:00:00.000Z", "last": "2021-09-27T08:00:00.000Z" }
}
```

- Una unión junta los dos sentidos: `forth` son las veces que `source` ha
  corregido a `target`, y `back` al revés.
- `totals` se calcula sobre todo lo que cumple los filtros, no solo sobre lo que
  cabe en `limit`; `hidden` dice cuánto se ha quedado fuera, o es `null`.
- **Endogamia** (0-100) de una persona con `W` correcciones (hechas más
  recibidas) repartidas entre `P` personas: la media de `repetition = (W − P) / W`
  y `reciprocity = Σ 2·min(a→b, b→a) / W`. La del campus es la media ponderada
  por actividad de su gente.
- `givenPassRate`: como corrector, parte de los proyectos ajenos que ha evaluado
  y ha aprobado. `receivedPassRate`: como corregido, parte de las evaluaciones
  de sus propios proyectos en las que se los aprobaron. Cada uno es `null` con
  menos de tres veredictos.
- `community`: grupo al que pertenece (`0` es el mayor), por el método de Louvain
  sobre las correcciones filtradas. `cohort`: año de su primera corrección.
- `external`: no es del campus. Solo sale como vecino de alguien de dentro.
- `timeline` no lleva el filtro de fechas: es para elegirlas.
- `sync.phase`: `pending` (no ha empezado), `copying` (histórico a medias) o
  `done`. Mientras se copia, el grafo solo llega hasta `sync.last`.

GET /network/pair?a=&b=&from=&to=&projectId= → las correcciones entre dos personas.

```json
{
  "a": "jdoe", "b": "mgomez", "forth": 3, "back": 2,
  "corrections": [
    { "id": 8123456, "corrector": "mgomez", "corrected": "jdoe", "project": "ft_printf", "at": "2026-09-20T10:00:00.000Z", "mark": 100, "positive": true }
  ]
}
```

Las más recientes primero; como mucho, 60. `positive` es el veredicto de esa corrección:
aprobó si la marca de quien corrigió es buena **y** la nota llega a la mínima
del proyecto (un 0 con marca de «Ok» es un suspenso).

GET /network/strictest?min=&order=&from=&to=&projectId= → quién suspende más al corregir.

```json
{
  "min": 20, "order": "desc", "eligible": 812, "campusFailRate": 0.109,
  "people": [{ "login": "jdoe", "image": "https://…", "judged": 64, "failed": 21, "failRate": 0.328 }]
}
```

Solo gente del campus que ha evaluado al menos `min` proyectos ajenos (1-500, por
defecto 20). Hasta 100 personas, por parte de suspensos: de más a menos con
`order=desc` (por defecto) o de menos a más con `order=asc`; a igualdad, quien
más ha evaluado.

GET /network/mine → con quién te has corregido tú, en todo el histórico:
`{ "partners": [{ "login": "mgomez", "gave": 2, "got": 3 }] }`.

GET /network/people?q=jd → hasta 8 logins que empiezan así, los más activos
primero: `[{ "login": "jdoe", "image": "https://…", "corrections": 79 }]`.

## Ranking

GET /leaderboard?period=month|all → quién ayuda más en el campus que miro.

```json
{
  "period": "month",
  "entries": [{ "rank": 1, "login": "jdoe", "image": null, "xp": 410 }],
  "me": { "rank": 5, "login": "plopez-l", "image": null, "xp": 60 }
}
```

Cuenta la XP de sesiones de ayuda, dudas resueltas, cambios de guía y pizarras.
La de asistir a terapias no cuenta. `me` es `null` si aún no has ayudado.

## Cómo se gana XP

| Motivo (`kind`)   | XP | Cuándo |
| ----------------- | -- | ------ |
| `specialist_help` | 40 | Sesión de ayuda con sus dos códigos y cerrada, en un proyecto que ya aprobaste |
| `peer_help`       | 15 | Sesión de ayuda con sus dos códigos y cerrada, en cualquier otro proyecto |
| `doubt_solved`    | 25 | Tu respuesta es la que resuelve una duda ajena |
| `guide_proposal`  | 15 | Te validan un cambio en una guía |
| `guide_review`    | 5  | Validas el cambio de otra persona |
| `board_host`      | 50 | Impartes una pizarra en la que alguien valida los dos códigos |
| `therapy_session` | 10 | Cada media hora en tu puesto reservado de una terapia |

- **Dudas**: `PUT /doubts/:id/resolved` exige `{ "resolved": true, "answerId" }`.
  Reabrirla (`{ "resolved": false }`) retira la XP. La misma pareja puntúa una
  vez al día.
- **Guías**: nadie valida su propio cambio. `POST /guide-changes/:id/flag`
  señala un cambio validado en el último mes; con dos señales de especialistas
  que no participaron se retira, los dos pierden la XP y se les apunta una
  falta. Rechazar una propuesta es una falta para quien la propuso. Cada tres
  faltas, un mes sin proponer (o sin validar ni editar). `GET /projects/:id/doubts`
  trae `recentChanges` y `sanctions`. La misma pareja puntúa una vez por semana.
- **Terapias**: no hay fichaje. Cada media hora desde el inicio se mira quién de
  los apuntados está en un puesto reservado del grupo; hacen falta al menos dos,
  y el grupo tiene que tener puestos reservados.

## Buzón de avisos

Lo que cada persona tiene que saber porque otra ha hecho algo que le toca.
Ningún módulo escribe en el buzón: cada uno emite un evento `notice` y el módulo
`notices` lo guarda. El texto lo redacta la web a partir de `kind`.

- GET /pulse → `{ "unread": 2, "quota": { "level", "ticket" } }`. Lo único que
  la web pregunta de fondo además del calendario: avisos sin leer y cuota de 42.
- GET /notices → `{ "unread", "items": [{ "id", "kind", "ref", "from", "text",
  "count", "at", "read", "saved" }] }`, lo que no se ha leído primero.
- POST /notices/read → `{ "ids"? }`: da por leídos esos avisos, o todos. Devuelve
  el buzón.
- POST /notices/remove → `{ "ids": [...] }` borra esos avisos; `{ "read": true }`,
  todos los leídos que no estén guardados. Devuelve el buzón.
- POST /notices/save → `{ "id", "saved" }`: guarda un aviso (no se borra con
  «borrar los leídos») o deja de guardarlo. Devuelve el buzón.

| `kind` | A quién | Cuándo |
| ------ | ------- | ------ |
| `ticket_answered` | Quien escribió | Responden a lo que mandó al buzón de incidencias |
| `ticket_new` | Quien administra | Alguien manda una incidencia, sugerencia o denuncia |
| `chat` | El resto del evento o del grupo | Un mensaje o un aviso de retraso o ausencia (no "lo he visto") |
| `booking_requested` | Quien ayuda | Le piden un rato |
| `booking_accepted` · `booking_declined` | Quien pidió | Contestan a su reserva |
| `booking_cancelled` | La otra parte | Se anula una reserva |
| `doubt_answered` | Quien puso la duda | Le responden |
| `doubt_solved` | Quien respondió | Su respuesta se marca como la que la resolvió |
| `proposal_accepted` · `proposal_rejected` | Quien propuso | Validan o rechazan su cambio en una guía |
| `board_changed` · `board_cancelled` | Quien tiene plaza | Cambia la hora o el sitio, o se cancela |
| `group_joined` | Quien abrió el grupo | Alguien se apunta |
| `group_closed` | Quien estaba apuntado | Se cierra el grupo |

Quien provoca un aviso no se avisa a sí. Mientras un aviso sigue sin leer, lo
mismo que vuelve a pasar (otro mensaje en el mismo chat) no crea otro: sube
`count`. Abrir un chat da por leído su aviso. Los avisos no se borran solos.

## Salud del servicio

Sin sesión y sin datos personales: las usan Caddy, Docker y quien despliega.

- GET /health → `{ "status": "ok" }` si el proceso responde. No toca la base.
- GET /health/db → `DbHealth`; `503` con `status: "degraded"` si la base no
  contesta. Es el *smoke* del despliegue (`infra/scripts/deploy.sh` espera a
  que `version` sea el commit subido y `schema.actual === schema.expected`):

  ```json
  {
    "status": "ok",
    "database": "ok",
    "version": "0954f1b…",
    "schema": { "expected": 66, "actual": 66 },
    "syncAgeSeconds": 94
  }
  ```

  `version` es el `GIT_SHA` que la imagen lleva dentro (`null` en local).
  `schema` es la versión de esquema que espera el código y la que tiene la base
  (`actual: null` si no se pudo leer). `syncAgeSeconds` son los segundos desde
  lo último que se trajo de 42 para un campus seguido (puestos o cambios de
  proyectos), o `null` si aún nada.

Toda respuesta de la API lleva la cabecera `x-request-id` (12 caracteres al
azar). Un error interno (`500`) deja una línea en el registro del contenedor con
ese mismo valor en `reqId` y `requestId`: es lo que hay que pedir a quien cuenta
un fallo para encontrarlo (`docker logs sanatorio-app-1 | grep <id>`). El
registro va a nivel `warn` por defecto (`LOG_LEVEL`); los errores de cliente
(4xx) van a `info` y no salen.

## Not-games por turnos: ajedrez (`modules/quiz/games`)

Juegos de dos bandos con reloj y **una pregunta entre jugada y jugada**. La
mecánica es común (`modules/quiz/turns.rules.ts`) y cada juego aporta sus reglas
(`TurnGame` en `games/turns.service.ts`); el ajedrez valida las jugadas con
`chess.js` (`games/chess.rules.ts`).

```
GET  /games/rooms              → TurnLobby[]: las salas sin empezar del campus y las tuyas recientes
POST /games/rooms              → TurnSettings { game: 'chess', minutes: 3|5|10|15, pool, kinds, minCircle } → 201 TurnRoom
GET  /games/rooms/:id          → TurnRoom (la web lo pide cada segundo jugando)
POST /games/rooms/:id/join     → entra con el bando libre (a = blancas, b = negras)
POST /games/rooms/:id/leave    → 204. Jugando, pierde quien se va. Vacía, la sala se borra
POST /games/rooms/:id/start    → solo quien la creó, con los dos bandos ocupados. Mueven blancas
POST /games/rooms/:id/move     → { from, to, promotion? } (sin promotion, dama). 409 si no te toca; 400 si no vale
POST /games/rooms/:id/answer   → { question, option }
POST /games/rooms/:id/resign   → abandona: gana el otro bando
```

- Al mover, los dos relojes se paran y sale una pregunta a los dos (`question`).
  La **primera respuesta** decide: si acierta, mueve quien contestó (aunque sean
  dos jugadas seguidas); si falla, pierde el 10 % del tiempo que le quedaba y
  mueve el rival. Sin respuestas, al acabarse el tiempo mueve a quien le tocaba.
- Si a quien gana la pregunta el juego no le deja mover (en ajedrez, mover dos
  veces dejaría el rey contrario en jaque), mueve el otro.
- `last` cuenta cómo fue la pregunta anterior (quién contestó primero, si
  acertó, la buena, el porqué y quién perdió tiempo).
- Final (`end`): jaque mate, ahogado o tablas, sin tiempo, abandono o se fue.
  El resultado va a `game_results` con `game: 'chess'` (victoria 2, tablas 1).
- Nadie está a la vez en una sala de preguntas y en una por turnos (409).

## Modo concentración, Pomodoro (`modules/focus`)

```
GET    /me/focus  → Focus { until, startedAt, settings }
PUT    /me/focus  → FocusSettings { focusMinutes 5–180, breakMinutes 0–60, sections, show } → Focus
DELETE /me/focus  → FocusExit { reasons } (opcional) → Focus (acaba antes de tiempo; los ajustes se guardan)
POST   /me/focus/stay → FocusExit { reasons } → Focus (pulsaste «Acabar» y sigues)
GET    /me/focus/stats?from=&to=&offset=&low=&high=    → MyFocusStats
GET    /admin/focus/stats?from=&to=&offset=&low=&high= → FocusStats (solo admins)
```

Cada sesión empezada se apunta en `focus_sessions` (#80 del buzón): lo
planeado, cuándo acabó y cómo. `completed` si llegó a su hora (no hace falta
avisar: se deduce al leerla), `cancelled` con los motivos marcados
(`FocusReason`: `tired`, `break`, `distracted`, `someone`, `urgent`, `done`,
`other`), o `replaced` si se volvió a empezar encima (cuenta su tiempo, no es
una cancelación). `stay` suma una a las veces que quiso parar y siguió, con
sus motivos. Las reglas están en `modules/focus/focus.rules.ts`.

Las estadísticas: `from`/`to` son días en la hora de quien mira (`offset`, en
minutos sobre UTC, de −840 a 840); sin `to`, hasta hoy; sin `from`, el total.
Cada sesión cuenta en el día y la hora en que empezó, y su tiempo se reparte
por las horas que ocupó. `low`/`high` eligen el tramo de quienes lo usan por
tiempo concentrado en el periodo (como `segmentOf` de `usage`): en el panel
filtra a quién se suma; en lo tuyo, `band` es la media por persona de ese tramo
y `position` qué parte de quienes lo usan se concentra menos que tú. En lo
tuyo el tramo no baja de cinco personas (se ensancha hasta tenerlas): una media
más estrecha sería la cifra de alguien en concreto.

Mientras `until` no ha pasado, los demás ven `focusUntil` en la ficha
(`PersonCard`), en el ocupante de su puesto del plano y en la sala de espera
(`Peer`): «concentrado, no me distraigas». La web, con `settings`, deja en las
pestañas solo las secciones elegidas, calla los juegos y saca solo los avisos
elegidos (`show`); los obligatorios de un evento con más gente salen siempre. El
descanso lo lleva la web.

## Curso de git (`modules/gitcourse`)

```
GET  /gitcourse                   → GitCourse { seat, stars: { [punto]: 1–3 }, gates: { [prueba]: { passed, retryAt } } }
POST /gitcourse/levels/:id        → GitAttemptInput { lines: string[] (≤ 300, ≤ 200 caracteres) } → GitAttemptResult
POST /gitcourse/gates/:id/start   → GitGateQuiz { gate, questions: { prompt, code, options }[], deadline }
POST /gitcourse/gates/:id/answer  → GitGateAnswerInput { answers: (number | null)[] } → GitGateResult
GET  /gitcourse/rooms?gate=group1 → GitRoomLobby[] (las sin empezar del campus y las tuyas de las últimas 6 h)
POST /gitcourse/rooms             → { gate } → GitRoom (201; entras tú)
GET  /gitcourse/rooms/:id         → GitRoom { status, players, missions, mine: { role, repo }, remote, deadline, result }
POST /gitcourse/rooms/:id/join    → GitRoom
POST /gitcourse/rooms/:id/leave   → 204
POST /gitcourse/rooms/:id/start   → GitRoom (solo quien la creó)
POST /gitcourse/rooms/:id/run     → GitRunInput { line (≤ 200) } → GitRunResult { ok, output, room }
```

- Los puntos del camino (teoría, partida, solución) están en
  `@sanatorio/gitsim` (`LEVELS`), el mismo paquete que usa la web.
- El reto se corrige **volviendo a ejecutar** `lines` desde el punto de
  partida con el mismo motor: las líneas que fallan no cuentan. Hecho si la
  forma de la historia (y HEAD, el remoto, los tags o los ficheros que pida el
  punto) coincide con la de la solución. Estrellas: 3 con tantos comandos de
  git como la solución (`status` y `log` no cuentan), 2 con la mitad más uno, 1
  con más. Se guarda la mejor vez (`git_progress`).
- Solo desde un puesto del clúster (`seat`, la última sesión en un puesto):
  sin él, 403. En orden: sin el punto anterior, 409. Punto que no existe, 404.
- **Test previo** a cada prueba de grupo (`group1`, `group2`, `group3`, `boss`
  en `GATES` de gitsim): hace falta el mundo de antes (409). Ocho preguntas del
  banco de Not-games de los mundos hechos (`CONCEPTS_BY_WORLD`), 20 s cada una;
  la buena no sale de la API hasta contestar. Aprobado solo con todas bien y a
  tiempo. Si se falla o caduca, `retryAt` = una hora después (429 al empezar).
  Volver a empezar a mitad devuelve las mismas preguntas. Cada respuesta va al
  Repaso (`quiz_misses`). Se guarda en `git_gates`.
- **Pruebas de grupo** (`rooms.ts`, tablas `git_rooms` y `git_room_players`):
  para crear o entrar, sentado en un puesto (403) y con el test previo de esa
  prueba aprobado (409). Una sala abierta del curso a la vez (409), del mismo
  campus, hasta 6 personas. Empieza quien la creó con el mínimo de la prueba y
  todas sentadas. Al empezar se monta origin (`groupRemote`) y el repositorio
  de cada cual ya clonado, con su prefijo de ids (`a`, `b`, `d`…) y su papel
  por orden de llegada. `run` ejecuta la línea en el servidor con el mismo
  motor (403 si te levantas; 429 pasados 400 comandos); un error no cambia
  nada. Las misiones (`check` de la prueba) se miran sobre origin y casi todas
  son de una persona (`login`): todas hacen todo. Con todas hechas, la sala
  acaba (`result: 'passed'`) y la prueba se guarda en `git_progress` con 3
  estrellas para cada cual. Cada prueba tiene su tiempo (`minutes`: 45 o 60, el
  jefe 30); luego, `result: 'expired'`. **Jefe final** (`boss`): para empezar y
  para cada comando, los puestos de todas tienen que estar en clústeres
  distintos o a 4 filas y 4 columnas (409 si no), y `last` de las demás
  personas sale a `null`. Cada persona tiene su número `n` (orden de llegada). Quien sale pierde su repositorio; la sala pasa a otra
  persona y vacía se borra. Una tarea cada hora borra las salas sin empezar de
  más de 2 h y las demás de más de una semana.

## Mapa de calor de clics (`modules/usage/clicks.ts`)

```
POST /usage/clicks                         → ClickBatch → 204
GET  /admin/clicks?section=&layout=&days=  → ClickHeatmap (solo admins)
```

La web (`shared/layout/clicks.ts`) junta los clics de cada sección y los manda
cada minuto y al ocultar la pestaña. Sin login, solo recuentos por día:

- casillas de una rejilla normalizada sobre el contenido (`main`): 24 columnas a
  lo ancho y filas de 40 px desde arriba (150 como mucho), aparte en `mobile`
  (menos de 700 px de ancho) y `desktop`: la misma coordenada significa lo mismo
  con cualquier zoom o ancho;
- el elemento pulsado como etiqueta y clase (`img.avatar`), sin texto ni clases
  de estado, y si se podía pulsar. Lo que se pulsa sin poder pulsarse es lo que
  la gente espera que haga algo.

## Avisos del edificio (`modules/facility`)

```
POST /facility/reports                → { category, place?, note? } → 201 FacilityReport
GET  /admin/facility                  → FacilityReport[] del campus (solo admins)
POST /admin/facility/:id/resolve      → 204 (solo admins)
GET  /staff/facility                  → FacilityReport[] de todos los campus (sesión de staff)
POST /staff/facility/:id/resolve      → 204 (sesión de staff)
```

- `category`: `computer`, `peripheral`, `network`, `toilets`, `temperature`,
  `light`, `cleaning` u `other` (con nota de 3 caracteres o más).
- Sin `place`, el puesto en el que está sentada la persona; sin puesto y sin
  `place`, 400.
- Diez por persona y día como mucho (429).
- Las listas traen lo abierto y lo resuelto en la última semana, primero lo
  abierto.
- Si está configurado `SLACK_WEBHOOK_URL`, cada aviso va también al canal del
  staff. Un fallo de Slack no rompe el aviso.

## Crecimiento por campus (`modules/admin/growth.ts`, solo admins)

```
GET /admin/growth?from=YYYY-MM-DD&to=YYYY-MM-DD&campus=22,58  → AdminGrowth
```

Sin `campus`, todos. Por día y campus: `active` (gente con peticiones ese día,
de `request_stats`) y `newUsers` (primera entrada, `profiles.created_at`), más
`before` (cuánta gente había ya antes de `from`, para sumar el total). El campus
de cada cual es el que eligió en la web o, si no eligió, el suyo de 42 (`-1`: sin
campus). Como mucho 400 días; un periodo al revés o un `campus` que no sean
números separados por comas es 400.

## Ficha de una persona (`modules/map`)

```
GET /people/:login/card  → PersonCard { login, image, seat, circle, projects, onDuty, online, me }
```

La que sale al pasar el ratón por un login en cualquier parte de la web
(`shared/ui/PersonLink.tsx`): dónde está sentada ahora en el campus que se mira,
su círculo, hasta 4 proyectos en curso, si está de guardia (interruptor y
sentada) y si tiene la web abierta. Un login con caracteres raros es 400. Sin
peticiones a 42: sale de la réplica.

## Estadísticas de Ayuda (`modules/stats`)

Solo lee, de las tablas de cada sección, y siempre del campus de quien mira.

```
GET /stats?period=month|all  → HelpStats: { period, sections: StatsSection[] }
```

- Una `StatsSection` por sección, en este orden: `consulta`, `tablon`,
  `terapia`, `pizarras`, `notgames` y `ritmo`. Cada una trae `totals` (cifras del campus,
  `{ key, value }`), `ranking` (los 10 primeros) y `me` (tu puesto, aunque no
  entres en los 10; `null` si no sales).
- Cada fila: `rank` (empates en las dos cifras comparten puesto), `login`,
  `image`, `value` (lo que ordena) y `extra` (lo que desempata).
- Qué ordena cada una: sesiones de ayuda **validadas con los dos códigos**
  (extra: minutos), respuestas que resuelven una duda ajena (extra: respuestas),
  grupos de terapia a los que vas (extra: los que abres), gente apuntada a tus
  pizarras ya empezadas (extra: pizarras) y partidas ganadas de Not-games
  (extra: aciertos). Quien tiene 0 no sale.
- «Este mes» empieza el día 1 en UTC, como la clasificación de XP.
- La última sección es `ritmo` (#79 del buzón): quién va más rápido en el curso
  según el sistema de pace, no por número de proyectos. `value` es el % del
  curso (lo que suma el último círculo completado con los plazos del pace de 24
  meses) y `extra`, el pace más rápido que habría cumplido desde que empezó (0:
  más lento que 24). Ordena de pace más rápido a más lento y, a igual pace, por
  % del curso. No depende del periodo. Sale de `user_levels.begin_at` y
  `user_tracks.ranks` (`modules/stats/pace.rules.ts`).

## Not-games (`modules/quiz`)

Partidas de preguntas de programación. El servidor lleva el reloj y corrige: la
partida avanza cada vez que alguien la mira o contesta, y la web no recibe la
respuesta buena hasta que se cierra la pregunta. Tipos en
`packages/contracts/src/quiz.ts`.

```
GET  /quiz/rooms              → QuizLobby[]: salas abiertas del campus y las tuyas de las últimas 6 h.
POST /quiz/rooms              → 201 QuizRoom. Cuerpo QuizSettings: mode (duel|teams|ffa|survival),
                                competitive, pool (common|general), kinds (quick|long|mixed),
                                difficulty (easy|medium|hard|rising), questions (5–30; 60 en
                                supervivencia), minCircle (0–6 o null). Entras en ella.
GET  /quiz/rooms/:id          → QuizRoom: cómo va ahora. La web lo pide cada segundo jugando.
POST /quiz/rooms/:id/join     → QuizRoom. { team?: 'a'|'b' }: entra, o cambia de equipo antes de empezar.
POST /quiz/rooms/:id/leave    → 204. Sale de la sala, esté como esté. Si era quien la creó, pasa a quien
                                entró después; vacía, se borra. Jugando, si ya no hay con quién (duelo o
                                supervivencia con una persona, un equipo vacío), la partida acaba.
POST /quiz/rooms/:id/start    → QuizRoom. Solo quien la creó. Duelo: 2; equipos: uno por equipo;
                                supervivencia: 2 o más; todos contra todos: 1 o más (práctica).
POST /quiz/rooms/:id/answer   → QuizRoom. { question, option }: option es el id de una respuesta.
```

- Cada jugador lleva su foto de 42 (`image`, o `null`).
- **Repaso** (`GET /quiz/review` → `QuizReviewItem[]`): lo que ha fallado quien
  pregunta, de cualquier juego, con título, definición, ejemplo, el porqué y una
  de sus preguntas. `mastered` si lo acertó después del último fallo; primero lo
  pendiente. Se guarda en `quiz_misses` (las salas se borran). Cada concepto del
  banco tiene su repaso en `bank/review-a.ts` y `bank/review-b.ts`; un test exige
  que no falte ninguno.
- Al acabar una partida se guarda el resultado de cada cual en `game_results`
  (común a todos los juegos), que queda para las estadísticas aunque la sala se
  borre.
- Nadie está en dos salas a la vez (409). Salas sin empezar se borran a las 2 h;
  las jugadas, a la semana.
- Preguntas: las de los conceptos que les valen a **todos** los que juegan según
  sus proyectos (aprobados o en curso), o solo los generales. El banco está en
  `modules/quiz/bank/`, un fichero por tema; la dificultad de cada concepto sale
  de lo que falla la gente (`quiz_stats`) a partir de 20 respuestas.
- Cada pregunta se monta al sacarla: una forma de preguntar, una de sus buenas y
  tres malas (primero las de esa forma, que se parecen a la buena; luego las del
  concepto). Cada jugador ve las respuestas en su propio orden.
- Tiempos: 3 s de cuenta atrás antes de la primera, 10 s las rápidas y 30 s (o
  60) las largas, 1 s de margen para respuestas tardías y 4 s enseñando la
  respuesta. Se cierra antes si han contestado todos.
- Puntos: acertar suma 1; en competitivo, fallar resta 1. Supervivencia: fallar o
  no contestar quita una de las 3 vidas.

## Piscina (`modules/pool`)

```
GET /pool/notice   → PoolNotice, sin sesión: el aviso de la piscina cerrada
GET /pool/access   → PoolAccess: si eres piscinero y qué puedes ver
GET /admin/pool    → PoolSettings (solo admins)
PUT /admin/pool    → { open?, message?, allow? } → PoolSettings (solo admins)
```

- Quién entra se decide al volver de 42 (`docs/piscineros.md`): con el
  42cursus, estudiante; sin él y con la C Piscine en curso, piscinero; lo
  demás, no. Quien no entra vuelve al front con `?error=not_student` o
  `?error=pool_closed` (`status=403`) y sin sesión.
- La cookie lleva el grupo (`aud`); una de antes, sin él, ya no vale.
- Con una sesión de piscinero, cada petición pasa por un corte antes de la
  ruta: si la plantilla de la ruta no es de la base ni de un permiso concedido
  (`modules/pool/pool.keys.ts`), `403`. Un elemento (`red.rankings`) solo vale
  con su pestaña (`red`). Toda ruta nueva se apunta en esa tabla (lo exige
  `tests/integration/pool-gate.test.ts`).
- `allow`: los permisos (`PoolKey` en `packages/contracts/src/pool.ts`); sin
  ajustes guardados, `POOL_DEFAULT`.
- Mundos separados (`core/audience.ts`): un estudiante no ve a ningún
  piscinero (mapa, fichas, buscador, sala de espera, guardia, clasificaciones,
  salas, grupos, pizarras, dudas, examen en vivo) y un piscinero solo ve a los
  piscineros en curso de su campus (`pool_members`, copiados de
  `GET /v2/cursus/9/cursus_users`). Un piscinero mira siempre su campus.

## Exámenes (`modules/exams`)

```
GET  /exams/stats?track=all|classic|next&kickoffs=AAAA-MM,…  → ExamStats. Por plan y kickoff.
GET  /exams/live          → LiveExam. El examen en marcha en tu campus o el siguiente (24 h).
POST /exams/live/refresh  → LiveExam. Lo mismo, pidiendo antes lo nuevo a 42 si toca.
```

- `track`: el plan de la gente (`classic`, el core en C; `next`, el core en
  Python). `kickoffs`: meses en que se empezó, separados por comas; sin él,
  todos. Un plan desconocido o un mes mal escrito es 400. Tipos en
  `packages/contracts/src/exams.ts`; las cuentas, en `exams.rules.ts`.
- Kickoff de cada cual (#81 del buzón): el mes de `user_levels.begin_at` o, si
  no lo tiene (no ha entrado en la web), el de su primer proyecto del common
  core (`created_at_42`, o `updated_at_42` en las filas antiguas), como en
  `GET /stats/progress`. Plan: `user_tracks.track` o, si no se sabe, el nuevo
  si tiene algo de `python-module…` o `42next-…`.
- Sale toda la gente del campus con kickoff o con algún examen, no solo la que
  tiene los hitos. Cada `ExamStat` lleva `family` (`classic`: Exam Rank en C;
  `next`: los de Nexus) y `rank` (el número), para ponerlos en la misma fila.
  `attemptsToPass` y `byAttempt` no tienen tope de intentos. Quien aprobó en
  una fila antigua sin el número de reintentos cuenta en `passed`, no en
  `attemptsToPass`. En `byAttempt`, la nota es la **mediana** (`medianMark`):
  las notas van a saltos de pregunta y la media da notas que nadie saca.
- `kickoffs`: todas, con su gente de cada plan, para elegir.
- Sin black hole ni tabla de kickoffs (quitados el 2026-10-25): el
  `blackholed_at` que da 42 no es de fiar para contar absorbidos.
- Se guarda lo leído 5 minutos por campus; los filtros se calculan encima.


- `exam.when` (`today`, `tomorrow`, `later`) es el día en que empieza, contado en
  la hora del campus (`campuses.time_zone`), no en UTC: a las 23:30 de Madrid, un
  examen a las 00:30 es «mañana».
- Quién sale: lo que dice 42 (`/exams/:id/exams_users`), quien lo tiene en su
  agenda de 42 copiada (`agenda_users.exams`) y quien ya tiene una fila de examen
  tocada desde que empezó. Cada cual va en el grupo del examen que ha empezado o,
  si no, del que le toca por su círculo (`user_tracks` o sus proyectos): el del
  círculo N es `exam-rank-0N`, o `42next-exam-rank-0N` en el plan nuevo.
- Solo gente del campus de quien mira: se quita a quien consta en otro campus y
  no en este (quien no consta en ninguno se queda: puede no estar copiado aún).
- `mark`: la del intento de esta sesión, solo cuando se cierra. Mientras sigue
  dentro es `null`: 42 no da nota hasta cerrar (comprobado el 2026-10-22 con
  `GET /v2/teams`: equipos en curso sin `final_mark`, `teams_uploads` ni
  `scale_teams`). Nunca la del proyecto: mientras está en curso, 42 deja ahí la
  mejor de los intentos anteriores, no la de ahora.
- `previousMark`: la de su último intento cerrado de antes de la sesión (lo que
  se ve en su expediente); es lo que la web enseña de quien sigue dentro.
- `status`: `pending` (aún no ha entrado), `inProgress`, `passed` (cerrado con 100
  o más) o `failed` (cerrado sin llegar a 100, o sin validar). Solo cuenta la fila
  tocada en esta sesión.
- Refrescos: con el examen en marcha se pide lo nuevo cada 5 minutos (un trabajo
  de fondo, aunque nadie mire, o la visita si toca) y a mano como mucho una vez
  por minuto. El reloj es uno por examen y campus para todo el mundo y se guarda
  en `sync_state` (`exams:live:<campus>:<examen>`). `nextRefreshAt` y
  `refreshableAt` dicen cuándo toca cada uno; sin examen en marcha son `null`.
  Si no toca o no hay cuota de 42, `POST /exams/live/refresh` devuelve lo que hay.
