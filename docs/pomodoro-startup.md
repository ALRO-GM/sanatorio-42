# Startup del Pomodoro

Pedido por Alberto el 2026-10-27: como los Pomodoros en los que se planta un
bosque, aquí cada minuto de concentración sirve para construir una startup,
desde aprender a programar en un garaje hasta el control global, y compararla
con la de los demás.

**Dónde está**: pestaña «Startup» de la ventana del Pomodoro (menú de la
cuenta → Modo concentración), desde el modo normal; y la escena en pequeño
abajo del Pomodoro a pantalla completa. Es parte del Pomodoro, no una sección:
no añade pestañas a la navegación (`docs/interfaz.md`).

## Reglas

- **Moneda**: los minutos de concentración de las sesiones del Pomodoro
  (`focus_sessions`, como en tus estadísticas: la acabada hasta su final, la que
  sigue hasta ahora). Los cuenta la API: el navegador no puede inventarlos.
  Gastar no resta horas del ranking.
- **Catálogo** (`packages/startup/src/data.ts`, todo datos):
  - Aprender, cinco ramas de cinco niveles (30 min … 8 h).
  - Ordenador: del portátil viejo a dos pantallas grandes.
  - Espacio (tras fundar): coworking, oficina, planta, edificio, campus. Da
    sitio a la plantilla (2, 5, 12, 30, 70, 160).
  - Servidores (tras el MVP), que suman a infraestructura.
- **Hitos**, en orden: proyecto propio, MVP, **fundar (se le pone nombre)** y
  control global (tras salir a bolsa, 60 personas, 400 h).
- **Contratar** (tras el MVP): tres candidatos al azar con su especialidad,
  estrellas (1-5, las altas raras) y aspecto; la mitad de las veces de la
  especialidad de la empresa. Volver a sacar cuesta 15 min.
- **Rondas** (tras fundar): presemilla, semilla, A, B, C y salida a bolsa. Cada
  una pide plantilla, espacio y horas, y multiplica la valoración por su
  multiplicador y una suerte de 0,7 a 1,5.
- **El azar** sale de una semilla con el login y lo hecho hasta ahora
  (`seeded` en `engine.ts`): el mismo en la web y en la API, y recargar no lo
  cambia.
- **Valoración**: lo construido por las rondas (×10 con el control global).
- **Ranking** (`GET /startup/ranking`): por horas de concentración y, a
  igualdad, por valoración. Cada mundo ve el suyo (`audience`).

## Los cinco modelos de negocio

La empresa se enfoca según lo aprendido (×2), la plantilla (×3 por estrella) y
los servidores (×2, infraestructura). El que más pesa es su modelo, con su
dibujo y su color:

| Modelo | Qué es | Dibujo |
|---|---|---|
| `front` | Apps y producto de consumo | Ventana, azul |
| `back` | Plataforma y APIs para otras empresas (SaaS) | Llaves, naranja |
| `data` | Datos y analítica | Barras, verde |
| `ai` | Inteligencia artificial | Chispa con nodos, violeta |
| `infra` | Nube e infraestructura | Nube, amarillo |

## Sin idiomas

La interfaz es de dibujos, iconos y cifras (los minutos como `h:mm`). El texto
solo está en los nombres accesibles (lector de pantalla y lo que sale al pasar
el ratón), en `comun.csv` (`startup.*`), y en el nombre que cada cual le pone a
su startup.

## Piezas (para mejorarlas una a una)

- Reglas y cuentas: `packages/startup` (`@sanatorio/startup`), compartido por
  la API (`modules/startup`, migración 82) y la web.
- `StartupPanel` es la pestaña; `StartupStrip`, la oficina en pequeño en el
  Pomodoro a pantalla completa. `art/AxisGlyph` dibuja los cinco modelos de
  negocio en las cifras y el ranking.
- Añadir una pieza al juego: una entrada en `ITEMS`, su dibujo (abajo) y su
  nombre accesible en `comun.csv`.

## La oficina en píxeles

Pedido por Alberto el 2026-10-28: pixel art isométrico, sin paredes (solo el
suelo, como una isla) y fácil de ampliar poco a poco. Todo se dibuja con
código, sin imágenes: así casa siempre, no hay licencias de terceros y cada
pieza crece con la partida. Vive en `apps/web/src/features/focus/startup/pixel/`.

| Pieza | Qué hace |
|---|---|
| `sprite.ts` | El motor: cajas y caras en coordenadas del mundo (baldosa de 16 × 16, `z` hacia arriba), proyección 2:1 (cada baldosa, 32 × 16 píxeles), píxeles a mano (`grid`) y contorno. Sin navegador. |
| `palette.ts` | La paleta. Cada caja lleva tres tonos: arriba el claro, a la izquierda el medio y a la derecha el oscuro (la luz viene de arriba a la izquierda). |
| `person.ts` | Las personas, 10 × 13 píxeles: piel, pelo y peinado salen de `look`; la ropa, de su modelo de negocio. |
| `models/` | Un modelo por pieza (`Model`: `frames` y `draw`), reunidos en `models/index.ts`. |
| `floor.ts` | Los suelos, uno por sitio: cemento, parquet, baldosa, moqueta y suelo técnico. |
| `layout.ts` | Qué sale y dónde, solo a partir de la partida: el lado de la oficina (`ROOM`), las mesas en filas con pasillo, los servidores al fondo y la decoración que se gana (`DECOR`). |
| `paint.ts` | Pasa los dibujos al lienzo: cada fotograma de cada modelo se dibuja una vez y se guarda. |
| `PixelScene` / `PixelArt` / `ItemArt` | La oficina, un modelo suelto y el dibujo de cada tarjeta. |
| `useFrame.ts` | Un solo reloj a 6 fotogramas por segundo para todos; se para con movimiento reducido y con la web quieta. Dentro de `AwakeFrames` (la oficina pequeña del Pomodoro a pantalla completa) solo para con la pestaña escondida: esa pantalla marca quieta la web que tapa y quien se concentra no toca nada, pero es lo que se mira (arreglado el 2026-10-29: los muñequitos no se movían). |

Se agranda siempre a múltiplos enteros (× 2, × 3; en las tarjetas, de medio en
medio) con `image-rendering: pixelated`, para que ningún píxel salga borroso.

### Añadir un modelo

1. Su `Model` en `models/` (en el archivo de su familia o en uno nuevo): cajas
   con `sprite.box`, detalles con `faceX` / `faceY` / `faceZ` y `dot`, y
   píxeles a mano con `grid`. Lo que mira a la izquierda (`faceY`) es lo que
   más se ve: pantallas, frentes, luces.
2. Una línea en `MODELS` (`models/index.ts`).
3. Para que salga en la oficina, su regla en `DECOR` (`layout.ts`): cuándo
   (etapa, espacio, hitos…) y dónde (fondo, izquierda, derecha o delante,
   por orden de preferencia).
4. Para que sea el dibujo de una tarjeta, su caso en `modelOf` (`ItemArt.tsx`).
5. `npm run pixel -w @sanatorio/web -- <modelo>` lo pinta en PNG
   (`apps/web/.pixel/`) en cada nivel y fotograma, sin abrir la web. Sin
   nombre, pinta todos los modelos y seis oficinas de ejemplo.

Los tests (`tests/unit/startup-pixel.test.ts`) comprueban solos que el modelo
nuevo cabe en su lienzo en cualquier nivel y fotograma, que sale siempre igual
y que en ninguna oficina hay dos cosas en la misma baldosa.

### Añadir una animación

Un modelo anima con `frames` (cuántos fotogramas tiene) y el `frame` que
recibe `draw`: lo que cambie entre uno y otro se mueve. Van a 6 por segundo,
como en los juegos de píxeles: un parpadeo es un fotograma de 16, un vaivén
son dos posiciones. Para que no se muevan todos a la vez, se desfasa con algo
propio (`look`, el nivel). Lo que parece al azar (luces, motas) sale de
`scatter`, nunca de `Math.random`: el mismo fotograma tiene que salir igual.

### Lo siguiente

- Colocar las piezas a mano en la cuadrícula: hace falta guardar su sitio en
  la partida (`StartupState`) y una acción nueva en la API.
- Más modelos por modelo de negocio (por ejemplo, una granja de GPU para `ai`).

## La pantalla del Pomodoro en el móvil (2026-10-29)

Pedido por Alberto: a pantalla completa, la pantalla del móvil no se apaga ni
se bloquea, para que el tiempo y el «no molestar» sigan a la vista. Lo hace el
bloqueo de pantalla del navegador (`features/focus/useWakeLock.ts`, la API
*Screen Wake Lock*): se pide al abrir, se vuelve a pedir al volver a la
pestaña (el navegador lo suelta al esconderla) y se suelta al cerrar. Donde no
existe (Firefox, Safari anterior a la 16.4) no pasa nada. La pantalla completa
de verdad se pide también con el prefijo de Safari; en el iPhone no existe, y
la ventana del Pomodoro ya tapa toda la web. Las animaciones de la propia
pantalla del Pomodoro tampoco se paran con la web quieta (`styles/comfort.css`).
