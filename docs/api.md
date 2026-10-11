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

Quien imparte gana 50 XP cuando la pizarra ya ha terminado y fue al menos otra persona.

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
  falta la otra valoración.
- POST /help/blocks → `{ "login" }` · DELETE /help/blocks/:login → 204.
- GET /help/reputation → `{ "asked": { "prepared": 4, "curious": 6, "autonomous": 2, "basics": 1 } }`.

Reglas:

- La reserva la tiene que **aceptar** quien ayuda.
- Durante la franja se comprueba que **las dos personas tienen puesto en el
  campus** (`verified`). Sin eso, la sesión se cierra con 0 XP.
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
- `min` (1-100, por defecto 1): correcciones mínimas entre dos personas para que
  salga su unión. `limit` (10-2000, por defecto 300): tope de personas, las más
  activas primero.

```json
{
  "query": { "from": "2025-10-11", "to": null, "login": null, "projectId": null, "min": 2, "limit": 300 },
  "nodes": [
    {
      "login": "jdoe", "image": "https://…", "external": false,
      "given": 41, "received": 38, "partners": 52,
      "endogamy": 31, "repetition": 0.342, "reciprocity": 0.278,
      "passRate": 0.829, "community": 0, "cohort": 2024
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
  "projects": [{ "id": 1314, "name": "Libft", "corrections": 4200 }],
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
- `passRate`: parte de las correcciones que ha hecho en las que aprobó el
  proyecto; `null` con menos de tres veredictos.
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

Las más recientes primero; como mucho, 60.

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
| `specialist_help` | 40 | Sesión de ayuda cerrada, en un proyecto que ya aprobaste |
| `peer_help`       | 15 | Sesión de ayuda cerrada, en cualquier otro proyecto |
| `doubt_solved`    | 25 | Tu respuesta es la que resuelve una duda ajena |
| `guide_proposal`  | 15 | Te validan un cambio en una guía |
| `guide_review`    | 5  | Validas el cambio de otra persona |
| `board_host`      | 50 | Impartes una pizarra a la que va alguien |
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
