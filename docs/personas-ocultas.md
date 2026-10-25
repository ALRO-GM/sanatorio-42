# Personas ocultas

Pedido por Alberto el 2026-10-25: «Añade la posibilidad en el admin de ocultar
cualquier persona para cualquier grupo».

Hay dos grupos, cada uno en su mundo (`docs/piscineros.md`): estudiantes y
piscineros. Por encima de eso, quien administra puede ocultar a una persona
concreta (de cualquier grupo) a los estudiantes, a los piscineros o a los dos.
Para el grupo del que se oculta, esa persona **no existe**: no sale en ningún
sitio que enseñe gente y su ficha, su perfil y sus dudas dan `404`, como pasa
con los del otro mundo.

## En el panel

Pestaña **Personas ocultas** (`features/admin/HiddenPanel.tsx`):

- Un hueco para buscar un login de cualquier grupo y campus
  (`GET /admin/hidden/search`, que mira la réplica de estudiantes y
  `pool_members`; el buscador de arriba solo ve a los del mundo de quien mira).
- «Ocultar a»: estudiantes, piscineros o los dos, y un motivo opcional (hasta
  500 caracteres) que solo se lee en esta pestaña.
- La lista: login, su grupo (estudiante, piscinero o desconocido si no está en
  ninguna copia), de quién está oculto, quién lo ocultó y cuándo, el motivo y
  el botón «Quitar». Volver a ocultar a alguien de la lista cambia sus grupos y
  su motivo.
- No hay un registro aparte de lo que se hace en el panel (no existe uno
  general); la propia fila guarda quién y cuándo. Al quitar a alguien, la fila
  se borra.

Las rutas cuelgan de `/admin/` (segundo factor del panel, como las demás) y
están en `modules/pool` (`hidden.service.ts`); en `docs/api.md`, apartado
Piscina. Como todo `/admin/…`, están cerradas para piscineros.

## Dónde se guarda

Tabla `hidden_people` (migración 72): `login` (en minúsculas, clave),
`from_students`, `from_pool`, `reason`, `hidden_by`, `hidden_at`. Como mucho
500 filas. Está en los datos personales del módulo `pool`: quien está oculto,
al descargar sus datos, ve de qué grupos y desde cuándo, pero no el motivo ni
quién; quien ocultó, solo cuándo lo hizo.

## Cómo se aplica

En un solo sitio, `core/audience.ts`:

- `seesFor` y `visibleTo` dejan fuera, además del otro mundo, a quien está
  oculto al grupo de quien mira (`hiddenFrom`). A sí mismo se ve cada cual.
- La lista de ocultos de cada grupo se recuerda 30 s y el panel la olvida al
  cambiarla (`forget`), así que se nota al momento.
- Lo que se guarda ya filtrado (la red de correcciones, la de asientos, la
  pertenencia a un chat) lleva en su clave la versión de los ocultos
  (`audienceKey`, `version`); si quien mira está oculto, también su login, para
  que se vea a sí mismo sin colarse en lo de los demás.
- `shownFor`: solo los ocultos, sin separar mundos, para lo que ya mezcla
  grupos y campus (la clasificación de Code Clicker).

Y en las consultas, `audienceWhere` de `replica.repository.ts` lleva
`notHidden`: la sala de espera (`findPeers`) y el recuento de participantes.

## Inventario: dónde se ve a alguien

Cubiertos (para el grupo del que se oculta):

| Sitio | Ruta | Cómo |
| ----- | ---- | ---- |
| Peer to peer (lista y participantes) | `GET /projects/:id/peers` | SQL (`audienceWhere`) |
| Mapa del proyecto y del campus (su puesto sale libre) | `GET /projects/:id/map`, `GET /map` | `seesFor` |
| Ficha al pasar el ratón | `GET /people/:login/card` | `404` |
| Perfil público | `GET /users/:login/profile` | `404` |
| Buscador de personas (estudiantes y piscineros) | `GET /users/search` | `seesFor` |
| Clasificación de XP | `GET /leaderboard` | `visibleTo` |
| Estadísticas (clasificaciones) y comparar avance | `GET /stats`, `GET /stats/progress?with=` | `visibleTo`, `seesFor` |
| Red de correcciones (grafo, pareja, buscador, más estrictos, con quién te has corregido) | `GET /network`, `/network/pair`, `/network/people`, `/network/strictest`, `/network/mine` | `seesFor`, caché con `audienceKey` |
| Red de asientos | `GET /network/seats` | `seesFor`, caché con `audienceKey` |
| Examen en vivo | `GET /exams/live` | `visibleTo` |
| On-call: quién se ofrece y reservarle | `GET /help/offers`, `POST /help/bookings` | `seesFor` (`404` al reservar) |
| Calendario: lo que va con alguien | `GET /calendar` | `seesFor` |
| Sprints (por quien lo creó y sus miembros) | `GET /groups` | `visibleTo` y miembros filtrados |
| Pizarras (por anfitrión) | `GET /boards`, unirse | `visibleTo`, `seesFor` |
| Tablón: dudas, una duda y sus respuestas | `GET /projects/:id/doubts`, `GET /doubts/:id` | `visibleTo`; `404` y respuestas filtradas |
| Salas de Not-games, ajedrez y curso de git (por anfitrión) | `GET /quiz/rooms`, `/games/rooms`, `/gitcourse/rooms` | `visibleTo` |
| Conversaciones y chats | `GET /conversations`, mensajes y asistencia de un evento | `seesFor`: el directo con ella no sale ni se abre; sus mensajes no salen |
| Code Clicker: noticias y clasificación | `GET /clicker`, `GET /clicker/board` | `seesFor` (noticias), `shownFor` (clasificación) |

No cubiertos, con el porqué:

- **Lo que ya se comparte con ella**: reservas de ayuda ya hechas
  (`/help/inbox`, `/help/today`), avisos del buzón ya recibidos, quién está
  dentro de una sala o partida en la que también estás, y los avisos que
  genera lo que hace (si responde a tu duda, el aviso llega con su login,
  aunque la respuesta no se vea). Es trato directo ya empezado: esconderlo a
  medias rompería la reserva o la partida.
- **`GET /avatars/:login`**: da la foto a quien ya sabe el login; no enseña a
  nadie que no se conozca.
- **Recuentos sin nombres**: cifras de estadísticas y del avance, estadísticas
  de exámenes, asistentes de una pizarra, respuestas de una duda (el número),
  «solo» de la red de asientos. Se quedan como están: no dicen de quién son.
- **El panel de gestión**: quien administra ve a todo el mundo en sus
  pestañas (conectados, consumo, mensajes, permisos…).
- La clasificación de Code Clicker no separa mundos (es de todos los campus,
  como antes); solo deja fuera a los ocultos.

## Quién lo nota

- **La persona oculta**: nada. Se ve a sí misma en todas partes (mapa,
  buscador, ficha, perfil, redes) y usa la web con normalidad; ve a los demás
  como siempre. No se le avisa.
- **Quien administra, fuera del panel**: se le aplica la regla de su grupo como
  a cualquiera (casi siempre estudiante; en «Ver como piscinero», piscinero).
  Para ver a alguien oculto está la lista del panel.
- **El otro grupo**: nada, si no se le ha ocultado también.

## Pruebas

- `apps/api/tests/integration/hidden-people.test.ts`: ocultar a estudiantes
  (mapa, buscador, ficha, perfil, peers, red de correcciones y de asientos, y
  el tablón), que la persona se sigue viendo, que un piscinero no lo nota, y al
  revés con piscineros; el buscador del panel, validación y permisos.
- `apps/api/tests/unit/audience-hidden.test.ts`: `seesFor`, `shownFor`,
  `audienceKey`, la caché y `forget`.
- `apps/web/tests/ui/panels.test.tsx`: la pestaña del panel contra la API
  simulada (`shared/api/mock/hidden.ts`, que también aplica los ocultos al
  buscador, la ficha, el perfil, la sala de espera, el mapa y las redes).
