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

## Lo que ve un piscinero

Se elige en el panel, pestaña **Piscina**:

- **Entrada abierta o cerrada**, y el texto que ve un piscinero con la piscina
  cerrada.
- **Permisos**: cada pestaña de la web y, dentro de cada una, cada bloque (los
  de `shared/layout/registry.ts`), y además lo que no es una pestaña: Code
  Clicker, Not-games, curso de git, Pomodoro, buzón y chats, buscador de
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
  se ve a sí mismo en el mapa ni en el buscador, como un piscinero recién
  llegado que aún no se ha copiado. Si deja de administrar estando dentro, no
  puede volver: sale de la cuenta y entra otra vez (como estudiante).
- API de mentira: `localStorage.mock_pool_preview = 'true'` es la vista previa.

## Estado (2026-10-25)

Hecho: entrada (fase 1), permisos (fase 2) y separación de datos (fase 3). Los
piscineros en curso de cada campus se copian de 42 cada seis horas
(`replica/pool-members.ts`, tabla `pool_members`); la red copia aparte las
correcciones de la piscina y el calendario guarda los cursus de cada evento.
Quién ve a quién está en `core/audience.ts` (`seesFor`, `visibleTo`). La Red
de un piscinero abre por la red de asientos (`docs/asientos.md`, permiso
`red.seats`).

Lo que no separa nada porque no enseña a nadie: las cifras sueltas de las
estadísticas (totales de cada sección) y las medias del avance, que son de
estudiantes; para un piscinero no dicen nada de nadie.

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
