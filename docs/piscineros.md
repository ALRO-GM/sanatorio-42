# Piscineros

Pedido por Alberto el 2026-10-25. Sanatorio es para estudiantes de 42; quien
está en la piscina entra, si se le abre, a una versión solo para piscineros,
con lo que se elija en el panel.

## Quién entra

Al volver de 42 (`/auth/callback`) se mira el `cursus_users` de `/v2/me`:

| Grupo          | Regla                                                                  | Entra                               |
| -------------- | ---------------------------------------------------------------------- | ----------------------------------- |
| **Estudiante** | Tiene el 42cursus (`21`) empezado                                       | Sí, como siempre                    |
| **Piscinero**  | Sin 42cursus y con la C Piscine (`9`) de una piscina en curso: empezada hace 60 días o menos (o que empieza en los próximos 30) | Solo si la piscina está abierta en el panel |
| **Otro**       | Lo demás: Discovery Piscine, piscinas antiguas, cuentas sin cursus      | No: aviso de que su cuenta no es de estudiante |

Quien administra (por configuración o desde el panel) entra siempre, como
estudiante. Decidido con Alberto: solo piscina en curso, no las antiguas.

El grupo va **firmado en la cookie** (`aud`). Las cookies de antes no lo
llevan y dejan de valer: todo el mundo vuelve a entrar una vez, y así nadie que
entró como estudiante sin serlo se queda dentro.

## Mundos separados

Decidido con Alberto: por defecto cada grupo solo ve a los suyos. Los
estudiantes no ven piscineros en ningún sitio, y los piscineros solo ven
piscineros de su campus (sala de espera, mapa, buscador, fichas, red). El
calendario de un piscinero solo trae eventos y exámenes de piscina.

**Excepción, el plano de los clústeres** (pedido por Alberto el 2026-10-25): es
la sala tal como está. Un estudiante ve con nombre y foto a todo el que esté
sentado (piscineros, discovery…). Un piscinero ve con nombre solo a los de su
piscina; los demás puestos con alguien salen **ocupados**, sin nombre ni foto
(`MapSeat.taken`), para que sepa que no están libres. Lo mismo vale para los
ocultos a un grupo: ocupados, sin nombre. La ficha y el buscador siguen
separados.

## Lo que ve un piscinero

Se elige en el panel, pestaña **Piscina**:

- **Entrada abierta o cerrada**, y el texto que ve un piscinero con la piscina
  cerrada.
- **Permisos**: cada pestaña de la web y, dentro de cada una, cada bloque (los
  de `shared/layout/registry.ts`), y además lo que no es una pestaña: Code
  Clicker, Not-games, curso de git, curso de shell (`shellcourse`), Pomodoro, buzón y chats, buscador de
  personas. La lista de claves vive en `packages/contracts/src/pool.ts`; la
  web y la API leen la misma.
- Sin marcar, no se ve. Al abrir la piscina por primera vez solo está el
  expediente.

Se aplica **en la API**, no solo escondiendo en la web: un gancho global
(`app/build-app.ts`, antes de las rutas) mira la plantilla de la ruta de cada
petición y, con una sesión de piscinero, corta con 403 la que no es de la base
ni de un permiso concedido (`modules/pool/pool.keys.ts`). Una ruta que no está
en esa tabla queda cerrada para piscineros, y un test exige que cada ruta nueva
se apunte en ella (`tests/integration/pool-gate.test.ts`).

Por encima de los dos mundos, quien administra puede ocultar a una persona
concreta a los estudiantes, a los piscineros o a los dos (pestaña **Personas
ocultas** del panel): ver [personas-ocultas.md](personas-ocultas.md).

## La piscina en el Avance, el tablón y la ayuda

Pedido por Alberto el 2026-10-26: «para los piscineros su avance es como se
muestra en la foto» (el grafo de la piscina de la intra). Un piscinero no ve
nada del common core; ve la piscina, definida una sola vez en
`apps/api/src/modules/replica/piscine.ts` (por `slug`):

| Grupo | Proyectos | Color | Cuenta para el avance |
| --- | --- | --- | --- |
| `shell` | `c-piscine-shell-00`, `-01` | azul claro (`--piscine-shell`) | Sí |
| `c` | `c-piscine-c-00` … `c-piscine-c-13` | azul oscuro (`--piscine-c`) | Sí |
| `rush` | `c-piscine-rush-00`, `-01`, `-02` y `c-piscine-bsq` (en grupo, el fin de semana) | gris, aparte | No |
| `exam` | `c-piscine-exam-00`, `-01`, `-02` y `c-piscine-final-exam` | gris, aparte | No |

Fuera quedan los `c-piscine-exam-checkpoint-*` y `c-piscine-reloaded` (que es
del 42cursus). Los dos azules son variables de tema (`styles/theme.css`, con
su valor en claro y en oscuro y su color de texto encima, `--on-piscine-*`).

- **Avance** (`GET /stats/progress/piscine`, `stats/piscine.service.ts` y
  `piscine.rules.ts`; en la web `PiscineProgressPage.tsx`, que sale en vez de
  la del common core): cuántos de los 16 proyectos de shell y C lleva
  aprobados al acabar cada día de piscina (eje de 0 a 30 días; el día 1 es el
  primero). Los rushes, BSQ y exámenes no suman nunca. Sin plan, pace, black
  hole, horas, campus a elegir ni «quién va más rápido»: en la piscina no
  significan nada. Se compara solo con la media de **tu piscina**: los
  piscineros en curso de tu campus (`pool_members`) que empezaron a menos de
  una semana de ti, sin ti. Nada de otras piscinas (pedido por Alberto el
  2026-10-26: a quien está en la piscina no se le enseña información de las
  anteriores). Con menos de 10 personas no hay media: van las líneas de cada
  cual.
  Comparar con alguien (`?with=`, permiso `avance.compare`): solo gente de
  tu piscina que ves. Quien administra viéndolo como piscinero no
  tiene línea propia y su «piscina» es la última que ha empezado en su campus.
- **Tablón** (`GET /doubts/graph` con `kind: 'piscine'`, `PiscineGraph.tsx`):
  el camino de los 16 que cuentan, en orden y con sus colores, y aparte, bajo
  una raya, los rushes, BSQ y exámenes. Relleno = aprobado, con aro = en curso,
  a trazos = sin empezar (un examen suspendido también: se vuelve a hacer).
  Nada va cerrado: quien prepara un examen pregunta antes de hacerlo. Cada
  nodo abre su guía y sus dudas, con las mismas marcas que el common core. El
  grafo de correcciones también usa la piscina.
- **Ayuda** (`GET /me/projects`): a un piscinero, todos los proyectos de la
  piscina con su `group`, lo que tiene en curso primero (también un rush
  buscando grupo o esperando corrección, que antes no salía). Así la sala de
  espera, los sprints y el buzón le dejan elegir un rush, BSQ o un examen que
  aún no ha empezado. La sala de espera los enseña en dos listas: lo que
  cuenta y lo de aparte. Quién ayuda en cada uno ya iba solo con piscineros de
  su campus (`findPeers` con `pool`).
- Un proyecto que nadie de los campus copiados ha tocado aún no está en
  `projects` y no sale (no se inventan ids). La agenda sigue con los proyectos
  que tiene empezados.
- API de mentira: con `mock_pool` (o la vista previa), el tablón, la sala de
  espera y el Avance enseñan la piscina de `mock/piscine.ts`.

## Ver como piscinero

Pedido por Alberto el 2026-10-25. En la pestaña **Piscina** del panel, **Ver
como piscinero** enseña la web exactamente como la vería un piscinero del
campus de quien administra, con los permisos **guardados** (lo que no se haya
guardado no cuenta). Funciona con la piscina cerrada, para probar antes de
abrirla.

- `POST /admin/pool/preview` (rutas en `modules/auth/auth.routes.ts`, porque
  lo que hacen es volver a firmar la cookie): pide lo mismo que `PUT
  /admin/pool` (administrar y el segundo factor) y firma la cookie con
  `aud: 'pool'` y la marca `preview: true`. La caducidad no cambia.
- Mientras dura es un piscinero a todos los efectos: el corte de la API
  (también todo el panel, que da 403), los mundos separados, su campus de casa
  y `admin: false` en `actor()`, así que tampoco modera.
- La web pinta arriba del todo una franja fija, «Estás viendo Sanatorio como un
  piscinero · Volver» (`app/PoolPreviewBar.tsx`), con `preview: true` de
  `GET /pool/access`. «Volver» llama a `POST /pool/preview/exit`, que firma
  otra vez la cookie como estudiante, y la web se recarga en el panel.
- La salida es de la base de los piscineros, pero solo hace algo con la marca
  firmada y si la persona sigue administrando. Un piscinero de verdad no la
  tiene (y añadirla rompe la firma): recibe un 403 y sigue siendo piscinero
  (`tests/integration/pool-preview.test.ts`).
- Lo que no es igual: quien administra no está en `pool_members`, así que no
  se ve a sí mismo en el buscador, como un piscinero recién llegado que aún no
  se ha copiado (en el mapa sí: cada cual se ve siempre a sí mismo). Si deja de administrar estando dentro, no
  puede volver: sale de la cuenta y entra otra vez (como estudiante).
- API de mentira: `localStorage.mock_pool_preview = 'true'` es la vista previa.

### Sin límites (solo el dueño)

Pedido por Alberto el 2026-10-30: ver la web como piscinero sin ninguna
restricción, con exámenes y todo lo de un estudiante, y que solo él pueda.

- Botón **Ver como piscinero sin límites** bajo el de siempre, que solo sale
  con `owner: true` de `GET /pool/access`. Entra con
  `POST /admin/pool/preview/full`.
- Solo el dueño: el login va fijo en `apps/api/src/core/owner.ts`, no en
  `ADMIN_LOGINS` ni en el panel, así que dar a alguien el permiso de
  administrar no le da esto. Pide además lo de la vista normal (administrar,
  segundo factor, sesión de estudiante).
- La cookie lleva `unrestricted: true` firmado, y al leerla solo cuenta con
  `preview` y el login del dueño. Con ella el corte de piscineros deja pasar
  todo; sigue siendo piscinero en lo demás (mundos separados, la piscina en
  Avance y tablón, su campus de casa, `admin: false`, sin panel).
- La franja dice «… como un piscinero sin límites»; «Volver» es la misma.
- **Exámenes** (pedido el 2026-10-30): arriba, «Estudiantes · Piscineros».
  De entrada, el examen en vivo y el último de los estudiantes, con sus
  estadísticas; «Piscineros», los de la piscina de su campus, con su gente (sin
  estadísticas, que son de los Exam Rank). Va con `?world=` a
  `/exams/live`, que solo atiende esta vista.
- El examen de la piscina mira sus propios proyectos (pedido el 2026-10-30):
  «C Piscine Exam 00» a «03» y el final (`c-piscine-exam-0*`,
  `c-piscine-final-exam`; las prácticas `c-piscine-exam-checkpoint-*` no).
  Quién ha entrado, en qué examen y su nota salen de la fila de cada
  piscinero en esos proyectos, como con los Exam Rank; el refresco de cinco
  minutos pide a 42 esos proyectos y los intentos se guardan en
  `exam_attempts`. Las estadísticas siguen siendo solo de los Exam Rank.
- Tests: `tests/integration/pool-preview.test.ts` (otro que administra recibe
  `403` y la marca firmada a mano no le vale).
- API de mentira: `localStorage.mock_pool_preview = 'full'`.

## Estado (2026-10-25)

Hecho: entrada (fase 1), permisos (fase 2) y separación de datos (fase 3). Los
piscineros en curso de cada campus se copian de 42 cada seis horas
(`replica/pool-members.ts`, tabla `pool_members`); la red copia aparte las
correcciones de la piscina y el calendario guarda los cursus de cada evento.
Quién ve a quién está en `core/audience.ts` (`seesFor`, `visibleTo`). La Red
de un piscinero abre por la red de asientos (`docs/asientos.md`, permiso
`red.seats`).

Lo que no separa nada porque no enseña a nadie: las cifras sueltas de las
estadísticas (totales de cada sección). El avance de un piscinero es el de la
piscina, con medias de piscineros (arriba).

## Fases

Cada una con `npm run check`, commit, push y despliegue.

1. **Entrada**: clasificación al entrar, `aud` en la cookie, avisos en la
   portada (no es estudiante; piscina cerrada), ajustes `pool` (abierta y
   texto) y pestaña Piscina del panel con el interruptor y el texto. La
   piscina no se puede abrir hasta la fase 2.
2. **Permisos**: claves compartidas, tabla de rutas por clave, corte en
   `actor()`, `GET /me` con el grupo y lo permitido, la web filtra pestañas y
   bloques, y el árbol de casillas en el panel. Se puede abrir la piscina.
3. **Datos de piscina**: copiar de 42 la gente, las correcciones y los eventos
   de la piscina (cursus `9`) del campus; red, sala de espera, mapa, buscador y
   calendario de un piscinero solo con eso; los estudiantes sin piscineros.
4. **Documentación y demostración**: README, `docs/api.md`, `docs/interfaz.md`
   y demostración de la pestaña Piscina del panel.
