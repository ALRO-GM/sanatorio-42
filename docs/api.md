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

## Campus y preferencias
GET /campuses
[{ "id": 22, "name": "Madrid", "city": "Madrid", "country": "Spain", "tracked": true }]

`tracked: true` son los campus que se copian en segundo plano; el resto funcionan,
pero la primera vez que se abre un proyecto tarda algo más.

PUT /me/settings → 204. Todos los campos son opcionales.
{ "campusId": 58, "lang": "en", "title": "residente" }

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
reservada»). Ya no existe `POST /reactions`: la XP por ayudar sale solo de una
sesión reservada.

GET /users/:login/profile → el expediente público de otra persona: `login`,
`image`, `xp`, `title`, `achievements`, `reactions` y `health` (como
`/me/health`). No lleva preferencias ni desglose de XP. `404`
si no conocemos a nadie con ese login.

## Avisos, chat y asistencia de un evento

Un evento se nombra con su id del calendario (`board:12`, `help:booking:7`,
`therapy:3:2026-10-12`, `evaluation:9690094`). Solo quien lo tiene en su
calendario (y va a ir) puede leer o escribir; el resto recibe `403`.

- GET /events/thread?id= → `{ "messages": [{ "id", "login", "image", "kind", "minutes", "reason", "body", "at" }] }`.
- POST /events/messages → `{ "id", "kind", "minutes"?, "reason"?, "body"? }`; devuelve el chat.
  `kind`: `seen` (he visto el aviso), `late` (pide `minutes`), `absent` o `text`
  (pide `body`). `reason`: `evaluation`, `other_event`, `on_my_way`, `transport`, `other`.
- GET /events/alerts → `{ "alerts": [{ "event", "state" }] }`, por orden de
  inicio. `pending`: es con más gente y no has dicho si vas (la web no deja
  cerrar el aviso hasta que contestes con `seen`, `late` o `absent`); `missed`:
  pasó media hora desde el inicio sin respuesta y quedaste como no asistido
  (se apunta en el chat con `reason: "missed"`); `info`: no pide respuesta.
- POST /events/alerts/ack → `{ "id" }`: cierra un aviso `missed`. 204.
- Los mensajes se borran a los 90 días; el registro de intentos de códigos
  (`/admin/checkins`), al año. El tiempo validado no se borra.
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
- GET /events/report?from=&to=&login=&format= → las horas validadas con códigos
  en un periodo (días `YYYY-MM-DD`, los dos incluidos; por defecto, los últimos
  treinta): `{ "from", "to", "totalMinutes", "rows": [{ "login", "role", "eventId",
  "kind", "title", "day", "from", "to", "minutes", "scheduledMinutes", "with" }] }`.
  Sin `login`, las tuyas; las de otra persona o las de todo el mundo
  (`login=all`), solo quien administra. Con `format=csv` es un fichero para una
  hoja de cálculo, con las horas del campus.
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

- POST /tickets → `{ "kind": "issue" | "idea" | "report", "subject", "body", "target"? }`.
  Una denuncia (`report`) lleva `target`: `message:12`, `board:3`, `doubt:5`.
- GET /tickets/mine → lo que has mandado, con su `answer` si la tiene.

Solo admins (`403` para el resto). Administra quien está en `ADMIN_LOGINS` o
quien haya recibido el permiso desde el panel:

- GET /admin/consumption → tope actual, últimas 48 h, media por día de la semana
  y hora (UTC), avisos de los tramos por encima del 80 % del presupuesto y quién
  más consume.
- GET /admin/people · PUT /admin/roles `{ login, admin }` · PUT /admin/blocks
  `{ login, reason, days? }` · DELETE /admin/blocks/:login · PUT /admin/limits
  `{ login, perHour }` (`null` vuelve al tope automático).
- GET /admin/tickets · POST /admin/tickets/:id/answer `{ answer, status? }`.
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
- GET /usage/heatmap?by=total|activity|track|cohort → solo admins (`403` si no):

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
- POST /guide-proposals/:id/accept y /guide-proposals/:id/reject → 204. Solo especialistas.

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

- POST /boards/:id/join → 204 (409 si no quedan plazas)
- DELETE /boards/:id/join → 204
- DELETE /boards/:id → 204. Solo quien la imparte.

Quien imparte gana 50 XP cuando la pizarra ya ha terminado y al menos otra persona
validó los dos códigos de asistencia (ver "Reglas de los códigos").

## Calendario personal

GET /calendar?from=&to= → tus eventos entre dos instantes (ISO-8601), ordenados
por hora. Como mucho, 62 días de una vez.

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

Lo de 42 se pide solo cuando alguien abre su calendario y se guarda: lo del
campus (eventos y exámenes, 2 peticiones) una hora; lo de cada persona
(inscripciones, exámenes y correcciones, 3 peticiones) un cuarto de hora.

## Guardia: ayuda reservada

Quien está de guardia abre franjas del día (en medias horas) y un tope de
minutos; otras personas le reservan un rato. Es la única forma de ganar XP por
ayudar en persona.

- GET /help/today → tu guardia de hoy: `windows`, `maxMinutes`, `bookedMinutes`,
  `bookings`, `mustRate` y `blocked`.
- PUT /help/today → `{ "windows": [{ "start": "17:00", "end": "19:00" }], "maxMinutes": 60 }`.
  Las franjas que se pisan se juntan. `[]` retira la oferta.
  Las medias horas que ya han empezado se descartan, salvo las que ya tenías
  abiertas; la respuesta trae lo que ha quedado.
- GET /help/offers → quién se ofrece hoy y aún tiene hueco:
  `[{ "login": "jdoe", "freeStarts": ["17:00", "17:30"], "remainingMinutes": 60 }]`.
- POST /help/bookings → `{ "helper", "start", "minutes", "projectId"?, "note"? }`
  (`minutes`: 30, 60, 90 o 120). Queda `pending`.
- POST /help/bookings/:id/accept · …/decline → 204. Solo quien ayuda.
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
- Una **corrección de 42** manda sobre la guardia: mientras dura no se te puede
  reservar, aunque caiga en una franja abierta. `GET /help/today` las trae en
  `busy`. Los **slots abiertos** para corregir no se pueden leer ni cerrar: 42
  los reserva al permiso `projects`, que esta web no pide.
- A quien bloqueas no le sales en `/help/offers` ni puede reservarte; recibe la
  misma respuesta que si no te ofrecieras.

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
  ]
}
```

- `startedAt` y `blackholedAt` salen del `cursus_users` del 42cursus (id `21`)
  de tu perfil, que se guarda cada vez que entras. `blackholedAt` es la fecha
  oficial de 42 y puede ser `null`.
- `milestones[n]` es cuándo validaste el `common-core-rank-0n`
  (`/v2/users/:id/quests_users`, como mucho una petición al día por persona).
- La API solo da hechos. A qué pace vas, cuándo caerías al siguiente y la
  calculadora los hace la web con la tabla de plazos
  (`apps/web/src/shared/pace.ts`): tu pace es el más rápido cuyo plazo para el
  círculo en el que estás no ha pasado.
- Si `blackholedAt` es posterior a lo que sale de la tabla, es la fecha real:
  la diferencia son días extra (bonus, compensación o *freeze*) y la web
  retrasa con ellos todos los plazos del círculo actual.

## Red de correcciones

Quién ha corregido a quién en el 42cursus del campus que miras. Sale de una
copia local de las correcciones de 42 que se va completando sola.

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
  "count", "at", "read" }] }`, lo que no se ha leído primero.
- POST /notices/read → `{ "ids"? }`: da por leídos esos avisos, o todos. Devuelve
  el buzón.

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
`count`. Abrir un chat da por leído su aviso. Los leídos se borran al mes; los
que nadie lee, a los tres.

## Salud del servicio

Sin sesión: las usan Caddy y quien despliega.

- GET /health → `{ "status": "ok" }` si el proceso responde.
- GET /health/db → lo mismo si además la base contesta; `503` si no.
