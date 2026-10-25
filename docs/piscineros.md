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
