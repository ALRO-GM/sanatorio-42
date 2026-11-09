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
- **Dinero** (desde el 2026-11-01): lo que se compra o se alquila (espacio,
  edificio, personal, decoración) se paga con dinero, y el dinero se gana
  mientras te concentras: cada minuto de concentración rinde lo que dan los
  productos implementados más media moneda por estrella de quien programa (y
  20 por planta del sótano de servidores), por el ánimo de la oficina, la
  energía solar (+10 % por nivel) y cada partida terminada antes (+25 %)
  (`economy.ts`). No hay reloj: la partida apunta el dinero (`cash`) y los
  minutos ganados cuando lo apuntó (`at`); el de ahora es lo apuntado más lo
  que rinden los minutos ganados desde entonces. Cada acción lo vuelve a
  apuntar, así un cambio de lo que rinde solo cuenta hacia delante, y la API
  lo vuelve a contar igual con los minutos que cuenta ella.
- **Catálogo** (`packages/startup/src/data.ts`, todo datos):
  - Aprender, cinco ramas de cinco niveles (30 min … 8 h).
  - Ordenador: del portátil viejo a dos pantallas grandes.
  - Productos (minutos): un bot, una web, una API, analítica, un asistente de
    IA y una nube propia, con tres versiones cada uno. Cada versión pide ese
    nivel aprendido en su rama y da dinero por minuto.
  - Espacio (dinero, tras el proyecto propio): tu cuarto con un ordenador
    viejo, un puesto en un coworking, una oficina pequeña, una grande, un
    edificio y el edificio entero (`SPACES`). Da sitio a la plantilla (2, 5,
    12, 30, 70, 160) y agranda la planta (`ROOM`: de 4 × 4 a 10 × 10). Las
    partidas de antes lo compraron con minutos y conservan su nivel.
  - Servidores (tras el MVP), que suman a infraestructura.
  - Edificio (dinero, desde el espacio 4): más plantas (20 sitios cada una),
    sótano de servidores, paneles solares y azotea (jardín y helipuerto).
- **Hitos**, en orden: proyecto propio, MVP, **fundar (se le pone nombre)** y
  control global (tras salir a bolsa, 60 personas, 400 h).
- **Contratar** (tras el MVP): tres candidatos al azar con su especialidad,
  estrellas (1-5, las altas raras) y aspecto; la mitad de las veces de la
  especialidad de la empresa. Volver a sacar cuesta 15 min.
- **El resto de la oficina** (dinero, tras fundar): recepción, limpieza,
  reparto, cocina, seguridad y mantenimiento (`ROLES`), cada oficio desde su
  espacio y con su máximo. No programan: suben el ánimo (la segunda persona
  de un oficio, la mitad…), y con él lo que se gana. Cada cual con su
  uniforme y lo suyo en la oficina.
- **Decoración** (dinero): veinte piezas que se compran desde su espacio, y
  tres piezas y tres mascotas que solo salen en las cajas. Lo comprado se
  deja solo en la primera baldosa libre; luego se mueve, se gira o se guarda
  en el almacén (`place`, `store`). La API comprueba que la baldosa esté
  dentro de la planta y sin otra pieza, mesa, servidor ni nada movido a mano
  (`canPlace` de `world.ts`). La decoración colocada sube el ánimo (hasta
  +0,3), y las mascotas (+0,1 cada una, hasta +0,2).
- **Vender** (pedido por Alberto el 2026-11-09, `sell`): cualquier pieza de
  decoración, colocada o en el almacén, mascotas incluidas, por lo que costó
  en la tienda. Lo que solo sale en las cajas no tiene precio de tienda: vale
  lo que da una caja en dinero en el espacio de ahora (100 × 2^espacio,
  `sellPrice`). El botón pide un segundo toque, porque lo de las cajas no se
  vuelve a comprar.
- **Nada fijo** (pedido por Alberto el 2026-11-09, `move`): además de la
  decoración, se mueven las mesas, los armarios de servidores, el mostrador
  de recepción y lo que se gana (cactus o planta, estantería, pizarra, panel,
  bandera, monedas, globo, cafetera, impresora, fuente, pufs y planta grande;
  `fixturesOf`). Cada cosa tiene una clave fija (`desk:0`, `rack:1`,
  `whiteboard`, `beanbag-2`…) y la partida guarda su baldosa en `moved`. Lo
  movido a mano manda (`layoutOf`): se coloca primero, y lo demás va a su
  sitio de siempre en lo que quede libre; lo que no cabe no sale. No se puede
  dejar encima de la decoración ni de otra cosa movida a mano; encima de algo
  que se coloca solo, sí (eso se aparta). Lo que aún no hay en la oficina no
  se mueve, y al volver a empezar (nueva partida+) todo vuelve a su sitio.
- **Cajas sorpresa**: cada sesión del Pomodoro acabada de 30 minutos o más
  (`focus_sessions`, contadas por la API con `focus.longSessions`) da una
  caja. Lo que sale está decidido con semilla (`prizeOf`): casi siempre
  decoración, a veces una pieza de las cajas o una mascota que no tienes, y
  si no, dinero. Cuentan también las sesiones de antes del 2026-11-01.
- **Nueva partida+**: con el control global y el edificio entero, se puede
  terminar (`legacy`) y volver a tu cuarto. Se conservan la decoración (lo
  que no quepa, al almacén), las mascotas, las cajas abiertas, lo gastado (el
  tiempo no vuelve), una décima del dinero y un +25 % de lo que se gana por
  cada vuelta. La nueva vuelta saca otros candidatos y otra suerte.
- **Rondas** (tras fundar): presemilla, semilla, A, B, C y salida a bolsa. Cada
  una pide plantilla, espacio y horas, y multiplica la valoración por su
  multiplicador y una suerte de 0,7 a 1,5.
- **El azar** sale de una semilla con el login y lo hecho hasta ahora
  (`seeded` en `engine.ts`): el mismo en la web y en la API, y recargar no lo
  cambia.
- **Valoración**: lo construido por las rondas (×10 con el control global).
- **Ranking** (`GET /startup/ranking`): por horas de concentración y, a
  igualdad, por valoración. Cada mundo ve el suyo (`audience`). Tocando a
  alguien se va a ver su oficina (`GET /startup/office/:login`, solo la
  partida, sin sus minutos; `404` si no sale en tu ranking).
- **Partidas de antes** (migración 82): el estado es JSON y lo nuevo es
  opcional; `parseStartup` lo lee con el dinero, la decoración y las cajas
  vacíos, y la semilla de la primera vuelta es la de siempre (los mismos
  candidatos). No hizo falta migración nueva (la 83 quedó sin usar).

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
- Añadir una pieza al juego: una entrada en `ITEMS` (o en `DECOR`, con un
  modelo del mismo nombre), su dibujo (abajo) y su nombre accesible en
  `comun.csv`.
- `World.tsx`: el personal, la tienda de decoración, el editor para recolocar
  la oficina sin ratón (todo lo que se mueve, con flechas; la decoración
  además se gira, se guarda o se vende) y las cajas sorpresa. En la oficina
  se mueve cualquier cosa tocándola y arrastrándola (o tocando otra baldosa);
  el botón de la mano (`startup.edit`, «Recolocar la oficina») lo enciende y
  sale siempre. Lo elegido es un `Target` (`target.ts`): `d:3` para la
  decoración, la clave para lo demás.

## La oficina en píxeles

Pedido por Alberto el 2026-10-28: pixel art isométrico, sin paredes (solo el
suelo, como una isla) y fácil de ampliar poco a poco. Todo se dibuja con
código, sin imágenes: así casa siempre, no hay licencias de terceros y cada
pieza crece con la partida. Vive en `apps/web/src/features/focus/startup/pixel/`.

| Pieza | Qué hace |
|---|---|
| `sprite.ts` | El motor: cajas y caras en coordenadas del mundo (baldosa de 16 × 16, `z` hacia arriba), proyección 2:1 (cada baldosa, 32 × 16 píxeles), píxeles a mano (`grid`) y contorno. Sin navegador. |
| `palette.ts` | La paleta. Cada caja lleva tres tonos: arriba el claro, a la izquierda el medio y a la derecha el oscuro (la luz viene de arriba a la izquierda). |
| `person.ts` | Las personas: sentadas (10 × 13 píxeles) o enteras andando (10 × 18, con su paso, de espaldas y con lo que llevan). Piel, pelo y peinado salen de `look`; la ropa, de su modelo de negocio o del uniforme de su oficio (con gorra, gorro de cocina o casco). |
| `models/` | Un modelo por pieza (`Model`: `frames` y `draw`), reunidos en `models/index.ts`. |
| `floor.ts` | Los suelos, uno por sitio: tablas de madera (tu cuarto), cemento pulido (coworking), parquet, moqueta, suelo técnico y mármol. |
| `layout.ts` | Qué sale y dónde, solo a partir de la partida: lo fijo y lo colocado a mano salen del motor (`world.ts`, lo mismo que comprueba la API); lo que se gana (`RULES`) va en los bordes libres, y la recepción en su mostrador. También quién anda por la oficina (`people`). |
| `paint.ts` | Pasa los dibujos al lienzo: cada fotograma de cada modelo se dibuja una vez y se guarda. |
| `PixelScene` / `PixelArt` / `ItemArt` | La oficina, un modelo suelto y el dibujo de cada tarjeta. |
| `life.ts` | La vida: un plan con semilla por persona (programar, café, charlar con quien mejor le cae, descansar; limpiar, hacer la ronda, repartir, servir café, revisar servidores; las mascotas pasean) por caminos de la cuadrícula que esquivan lo que ocupa sitio. Dónde está cada cual en un fotograma es una cuenta sobre su plan (`poseAt`). Las amistades salen de los aspectos (`friendsOf`). |
| `bubbles.ts` | Los bocadillos sin palabras: café, charla, corazón, idea, música, sueño, paquete, brillo, escudo, llave y cara contenta. |
| `move.ts` | La mudanza (cajas, camión, la oficina vieja que se desvanece y la nueva que cae pieza a pieza) y el epílogo de la nueva partida+ (el edificio de noche, un cohete que despega y tu cuarto que se monta). Con movimiento reducido no se hacen. |
| `tower.ts` | El edificio por fuera, al lado de la planta (espacio 4 y 5): plantas con ventanas (más encendidas de noche), sótano de servidores en un corte del terreno, paneles solares y azotea. |
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

Un modelo se puede girar (`turn`): el motor lo refleja y cambia los tonos de
las caras para que la luz siga viniendo de la izquierda (`Sprite.turned`).
De noche (de las 21 a las 7 en tu reloj) la oficina baja la luz y el edificio
enciende más ventanas; es solo el dibujo, nada de la partida.

### Lo siguiente

- Más modelos por modelo de negocio (por ejemplo, una granja de GPU para `ai`).
- Varias plantas a la vista (ahora la plantilla que no cabe sale como «+N» y
  el edificio se ve por fuera).
- Que la amistad crezca con lo que se ha charlado (ahora sale del aspecto de
  cada par) y un panel con las relaciones.
- Paredes, ventanas y puertas en cada sitio.

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
