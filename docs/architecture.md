# Arquitectura

## Idea general

Un solo proceso de Node sirve la API y la web compilada, con una base SQLite en
disco. Delante, Caddy pone HTTPS. No hay más piezas.

```
navegador ──HTTPS──> Caddy ──> app (Fastify)
                                ├─ /api/*   módulos
                                ├─ /*       web compilada
                                ├─ SQLite   (volumen /data)
                                └─ bucle de sincronización ──> API de 42
```

La API de 42 da 1 200 peticiones por hora. Por eso la web no le pregunta nada
en cada visita: un bucle de fondo copia el campus a la base local y lo mantiene
al día, y todas las pantallas leen de esa copia.

## Capas de la API

```
main.ts            abre el puerto, arranca y para
app/               composición: qué módulos hay y qué recibe cada uno
modules/           funcionalidades
integrations/      servicios externos (la API de 42)
core/              base común: base de datos, errores, eventos, sesión
config/            entorno
```

Las dependencias van solo hacia abajo:

- `core` e `integrations` no conocen los módulos.
- Un módulo puede usar `core`, `integrations` y **el `index.ts`** de otro
  módulo, nunca sus ficheros internos.
- Solo `app/composition.ts` conoce a todos los módulos.

ESLint lo comprueba (`no-restricted-imports` en `eslint.config.js`), así que un
import que se salte una frontera no pasa la CI.

## Un módulo por dentro

```
modules/therapy/
  index.ts               createTherapyModule(deps): lo único que se importa desde fuera
  therapy.routes.ts      HTTP: lee parámetros, resuelve quién pregunta, llama al servicio
  therapy.service.ts     reglas: quién puede, cuándo, cuánto vale. Valida con zod
  therapy.repository.ts  SQL y nada más
```

- Las **rutas** no tienen lógica: si una empieza a tenerla, va al servicio.
- Los **servicios** no saben de HTTP. Reciben un `Actor` (`login`, `campusId`,
  `admin`) y lanzan `DomainError`; `core/http/errors.ts` lo traduce a un código.
- Los **repositorios** no saben de reglas. Las restricciones únicas de las
  tablas son las que garantizan que nada se apunta dos veces.

Todo se construye con funciones `createX(deps)`: las dependencias (base, reloj,
otros servicios) llegan por parámetro, y los tests pasan las suyas.

## Comunicación entre módulos

Dos formas, según quién necesita a quién:

1. **Dependencia directa**, cuando un módulo necesita el resultado de otro.
   `therapy` recibe el servicio de XP para repartir puntos al fichar.
2. **Eventos** (`core/events.ts`), cuando un módulo solo avisa de que algo ha
   pasado. `peers` emite `duty.started` al ponerse alguien de guardia y
   `profile` apunta el logro, sin que `peers` sepa que existe la XP.

Los eventos y lo que lleva cada uno están declarados en `AppEvents`. El evento
`notice` es el del buzón: lo emite cualquier módulo con `notify` cuando algo le
toca a otra persona, y lo recoge `notices`.

## Trabajos periódicos

Un módulo puede declarar `jobs` (nombre, cada cuánto y qué hacer). La app los
lanza al arrancar y los para al cerrar; un fallo se registra y se reintenta en la
siguiente vuelta. Hoy hay cuatro. La asistencia a terapias (`therapy`), cada
minuto, que usa la foto de puestos de 42 y la refresca con
`sync.ensureLocations` si se ha quedado vieja. La copia de correcciones
(`network`) y la cola de la cuota de 42 (`replica`), cada veinte segundos, que
casi siempre no tienen nada que hacer. Y el volcado del consumo (`admin`), cada
minuto.

Nadie decide por su cuenta si puede gastar cuota de 42: lo pregunta a
`replica.quota` diciendo su escalón (fondo, aplazable o crítico). Ver
`docs/api.md`, "Cuota de la API de 42".

Las pizarras y las sesiones de ayuda no tienen trabajo periódico: su asistencia
se valida con códigos (`attendance`) y su XP se reparte al leer (`settle`).

## XP que no se puede puentear

Toda la XP sale de `xp.award`, con una referencia única por hecho (una sesión,
una duda, un cambio), así que nada se cobra dos veces. Encima, cada vía tiene su
propia comprobación: ver `docs/api.md`, "Cómo se gana XP".

## Réplica de 42

Vive en el módulo `replica`. El sincronizador (`syncer.ts`) reparte la cuota
por prioridad:

| Tarea                         | Cadencia                                   | Tipo |
| ----------------------------- | ------------------------------------------ | ---- |
| Puestos ocupados del campus   | 2 min con gente en la web, 5 min sin ella  | Mantenimiento |
| Cambios en proyectos          | 5 min / 30 min                             | Mantenimiento |
| Novedades de correcciones     | 10 min                                     | Mantenimiento |
| Catálogo de campus            | Semanal                                    | Mantenimiento |
| Copia inicial del campus      | Una petición cada 5 s de día; de corrido de noche y al final de la hora | Volumen, turno 1 |
| 42cursus (`core_cursus`)      | Diaria; sigue en su página si se corta     | Volumen, turno 2 |
| Histórico de correcciones     | Ráfagas de 16 s cada 20 s hasta terminar   | Volumen, turno 3 |
| Repaso diario de correcciones | Diario, sin nadie en la web                | Volumen, turno 4 |

- La copia inicial de Madrid son unas 1 600 peticiones, una sola vez. Después,
  entre 10 y 130 por hora según haya gente o no.
- `SYNC_HOURLY_RESERVE` peticiones de cada hora no las toca el trabajo de
  fondo de día: son para los logins y para quien está mirando.
- **La cuota horaria se renueva a la hora en punto** (UTC; con Madrid, a cada
  hora en punto también), y lo que no se gasta se pierde: ventana fija, no
  deslizante. Comprobado el 2026-10-26 leyendo `x-hourly-ratelimit-remaining`
  a ambos lados de las 00:00 UTC: 206 a las 23:59:55 y 1 199 a las 00:00:02
  (quedaban 206 sin gastar: se perdieron). 42 no manda ninguna cabecera con la hora de
  renovación (solo `x-hourly-ratelimit-limit/remaining` y
  `x-secondly-ratelimit-limit/remaining`), así que se da por hecha a la hora
  en punto: lo que dijo 42 antes de esa hora ya no vale y se vuelve a
  preguntar. Si alguna vez cambia, la cuota lo verá: cada salto hacia arriba
  de lo que queda se apunta (`cuota de 42 renovada: …` en el registro y
  `lastReset` en el panel).

### Ritmo de la copia según la hora

`modules/replica/budget.ts`, aplicado por `replica.quota`. El mantenimiento va
siempre primero; el **volumen** (copias y repasos) gasta lo que sobra. Valores
de fábrica (todos regulables en el entorno, ver `infra/.env.example`):

| Hora (Madrid)                    | Modo | La copia baja hasta | El mantenimiento, hasta | Copia inicial | Turnos |
| -------------------------------- | ---- | ------------------- | ----------------------- | ------------- | ------ |
| 06:00–02:00, minutos :00–:50     | Día | 300 (correcciones 360, repaso 450) | 100 con gente, 300 sin ella | 1 cada 5 s | No: comparten |
| 06:00–02:00, minutos :50–:60     | Gastar lo que sobra | 70 + 3 por minuto que falta (100 → 70) | 70 | De corrido | Sí |
| 02:00–06:00 sin nadie en la web  | Noche | 50 + 3 por minuto que falta (230 → 50) | 50 | De corrido | Sí |
| 02:00–06:00 con alguien en la web | Día (o gastar lo que sobra en :50–:60) | Como de día | Como de día | Como de día | Como de día |

- **Variables**: `SYNC_NIGHT_WINDOW` (`02:00-06:00`, vacía u `off` sin
  noche), `SYNC_TIMEZONE` (`Europe/Madrid`), `SYNC_NIGHT_RESERVE` (50, nunca
  menos de 40), `SYNC_SPEND_REMAINING_MINUTES` (10; `0`, nunca) y
  `SYNC_SPEND_MARGIN` (30 sobre el suelo de lo crítico, 40).
- **La rampa** (3 peticiones por minuto que falta) es lo que gasta el
  mantenimiento de cinco campus (unas 150 por hora): sin ella la copia se
  comería la hora en diez minutos y el historial de asientos tendría huecos.
- **Turnos**: fuera del día, la tarea de volumen de más prioridad que quiera
  gastar se lleva todo; las de detrás esperan hasta que lleve 30 s sin pedir
  (porque terminó, falló o no le queda cuota). Orden: copia inicial (que es
  también la copia de los proyectos de todo el campus), 42cursus, histórico de
  correcciones, repasos.
- **Quien usa la web gana**: «alguien en la web» es una petición con sesión en
  los últimos diez minutos (lo mismo que ya paraba el repaso). Con alguien
  dentro no hay noche: la copia vuelve a la reserva de día al instante. Lo
  crítico (entrar, puestos) no cambia (para con 40), y lo aplazable de las
  personas, en una hora en la que la copia bajó de la reserva, aguanta hasta
  70 en vez de 300, para no hacerles esperar a la hora siguiente.
- **Ritmo por segundo**: además del suelo de 250 ms, el cliente nunca deja
  salir más de 2 peticiones en 1,1 s (`perSecond` en `throttle.ts`): con
  varias tareas a la vez las cabeceras llegan tarde y salían hasta 4 por
  segundo (los `429` al arrancar). Un `429` se reintenta con `Retry-After` o
  espera exponencial, y la tarea que sigue fallando se aparta hasta 15 min.
- **Lo que se ve**: el registro avisa de cada cambio de modo (`cuota de 42:
  modo noche, la copia baja hasta 230`); el panel (Consumo → Cuota de la API de
  42) enseña el modo, hasta dónde baja la copia y cuándo vuelve la cuota; y
  `npm run sync:status` el modo guardado y lo que queda de cada tarea de volumen.
- Mientras la copia no ha terminado, lo que falte para una pantalla concreta se
  pide en el momento (`ensureFresh`), con tope.
- Los campus de `SYNC_CAMPUS_IDS` se copian enteros; el resto funcionan bajo
  demanda. En producción: Madrid (22), Málaga (37), Urduliz (40), Barcelona
  (46) y, desde el 2026-10-25, París (1). París es el más grande: unas 404 000
  correcciones (unas 4 000 peticiones la primera vez, con la cuota que sobra) y
  unas 24 000 personas.

`npm run sync:status` enseña por dónde va.

El **plan de estudios** (`replica/curriculum.ts`) tampoco viene de la API: qué
plan sigue cada persona y en qué círculo va cada proyecto se deduce de sus rangos
y de las fechas en que se apuntó a cada proyecto, y se va completando con cada
persona que abre el grafo del tablón.

La **agenda de 42** (eventos, exámenes y correcciones, `replica/agenda.ts`) va
aparte: no la mantiene el bucle, se pide cuando alguien abre su calendario y se
guarda un rato. Si nadie mira el calendario, no gasta nada.

## Red de correcciones

El módulo `network` copia de 42 las correcciones del 42cursus de cada campus
seguido (`GET /v2/scale_teams?filter[campus_id]=…&filter[cursus_id]=21`; Madrid
son unas 82 000, 820 peticiones una sola vez) y calcula sobre ellas el grafo.

- **Copia** (`network.sync.ts`), en tres ritmos:
  - *Histórico*: una vez, ordenado por id y con un cursor guardado en
    `sync_state`, así que un reinicio sigue donde se dejó.
  - *Novedades*: cada diez minutos, solo lo cambiado (`range[updated_at]`). Una
    petición casi siempre.
  - *Repaso*: una vez al día vuelve a recorrer el histórico entero para recoger
    lo que `updated_at` no avise y borrar lo que 42 haya quitado. Solo corre si
    nadie ha usado la web en los últimos diez minutos y sobra cuota, de modo que
    gasta la que de otro modo se perdería; si alguien entra, se para y sigue luego.

  De día nunca toca la reserva horaria de la API; de noche y al final de la
  hora gasta lo que sobra, por turno (ver «Ritmo de la copia según la hora»).
  Se guarda quién, a quién, qué proyecto, cuándo, la nota y la marca; los
  comentarios y el feedback no llegan a la base.
- **Veredicto**: la marca que pone quien corrige no vale sola, porque 42 guarda
  "Ok" también en correcciones con un 0. Una corrección aprueba si la marca es
  buena y la nota llega a la mínima del proyecto. Esa mínima no está en la API:
  se deduce de con qué notas ha validado y suspendido la gente cada proyecto
  (`passMarkOf`), y se recalcula cada seis horas.
- **Cuentas** (`network.analysis.ts`, funciones puras): SQLite junta las
  correcciones por pareja y sentido; con eso se calculan la endogamia de cada
  persona (media de cuánto repite con la misma gente y cuánto de lo que corrige
  se lo devuelven) y las comunidades (método de Louvain, sin azar).
- **Quién es de fuera**: quien no está en la réplica del campus. Solo sale como
  vecino de alguien de dentro; una pareja de dos personas de fuera se descarta.
  Las cuentas borradas (`3b3-…`) fueron estudiantes del campus y cuentan como tales.
- **Rendimiento**: el análisis de cada combinación de filtros se guarda diez minutos
  en memoria (`core/ttl-cache.ts`), así que cambiar el tope de personas o elegir a
  alguien no vuelve a leer la base. La web lo pinta en un `<canvas>` con
  `d3-force` y solo descarga esa parte al abrir la sección.
- **Tope del grafo**: la red de correcciones pinta las personas pedidas («Personas,
  como mucho»: 150 a 2 000 o «Todas», que es `limit=20000`) y seis uniones por
  persona, las más fuertes. Desde 2 000 la opción avisa de que irá lento: lo
  decide quien lo pide. La red de asientos se queda en 1 500 personas y 10 000
  uniones (`GRAPH_BUDGET` en `network.analysis.ts`). Se quedan las más activas y
  la web lo dice bajo el grafo («se ven las más activas · fuera por el tope…»).
  Medido el 2026-10-26 con la base local (Madrid, 86 000 correcciones; un París
  de 47 000 copiado de parte de Madrid): por defecto (300 personas) la respuesta
  pesa 150-220 KB y tarda 150-480 ms en frío y 6-15 ms de caché; con el tope
  antiguo (20 000) eran 3 300 personas, 20 000 uniones y 2,1 MB, y ahora son
  1 500, 9 000 y 1 MB. No hace falta agregar más.
- **El grafo en la web** (`ForceGraph.tsx`, cuentas en `graph-data.ts`), para que
  la CPU descanse:
  - La simulación no lleva el reloj de d3: cada fotograma del lienzo da un paso
    mientras tenga calor y se para del todo al enfriarse (`ALPHA_MIN`). Un paso
    gasta como mucho un tercio del tiempo (si costó 10 ms, el siguiente espera
    20 ms). Arrastrar calienta poco (`DRAG_HEAT`) y al soltar se enfría.
  - Los datos se comparan por su huella (`graphSignature`): el sondeo mientras se
    copia el histórico (cada 45 s) o un render con arrays nuevos no la recalienta.
    Cambiar el color, la etiqueta o la persona elegida solo repinta.
  - Las uniones se pintan por grupos de peso (un trazo por grupo); con el grafo
    quieto salen de una capa guardada (`graph-layers.ts`) y, moviéndose, solo las
    2 500 más fuertes. Fotos solo con zoom (radio en pantalla de más de 11 px),
    ya recortadas y guardadas, seis pidiéndose a la vez como mucho y ninguna con
    más de 400 burbujas en movimiento. Nombres: los grandes, los del entorno
    elegido, y no más de 120.
  - La burbuja bajo el ratón se busca en un quadtree (`spotIndex`/`spotAt`).
  - Al desmontar o con la pestaña oculta (`visibilitychange`) no queda ningún
    fotograma pedido, y las fotos a medio pedir se cortan.

  Medido en Chrome sin cabeza (`--disable-gpu`) con la API de mentira, que tiene
  un campus «Paris» de 3 600 personas (`mock/network-big.ts`): con «sin límite»
  (3 568 personas, 11 156 uniones), arrastrar una burbuja tenía el hilo de la
  página al 98 % (Chrome entero, 122 %), los 10 s tras cargar gastaban 2,9 s de
  JavaScript y el sondeo de cada 45 s volvía a mover el grafo (330 fotogramas).
  Con el tope y lo de arriba (1 500 personas, 4 300 uniones): arrastrar, 43-54 %
  del hilo (Chrome, 58-75 %); 0,8-1,2 s de JavaScript tras cargar; el bucle,
  parado a los 2-3 s de soltar; un solo fotograma en 50 s de reposo con el
  sondeo, y ninguno al salir de la sección.

## Base de datos

SQLite a través de `@libsql/client`. Las migraciones están en
`apps/api/src/core/db/migrations/`, una por fichero, y se aplican solas al
arrancar. Una migración desplegada no se edita: se añade otra.

## Contrato compartido

`packages/contracts` tiene el tipo de cada respuesta. La API lo usa para tipar
lo que devuelve y la web para lo que recibe, así que un cambio de forma que no
se propague no compila. Es solo tipos: no hay nada que construir ni publicar.

## Web

```
app/        App (qué pantalla toca), Clinic (cabecera, secciones, pie), secciones
features/   una carpeta por funcionalidad, con sus componentes
shared/     api/ (cliente real y simulado), i18n/, hooks/, ui/
```

- Solo `shared/api` habla con la API. Tiene dos implementaciones del mismo tipo
  `Api`: la real y una en memoria para trabajar sin servidor (`npm run dev:mock`).
- La navegación va en el hash de la URL (`#/tablon`); no hay router. Solo la
  portada viaja con la web: cada una de las demás secciones se descarga al
  abrirla (`lazy` en `SectionView.tsx`), y la API simulada, solo en `dev:mock`.
- El orden de las pestañas y de los bloques de cada página, y cuáles salen
  plegados, es personalizable (`shared/layout`): manual, o automático según lo
  que más usa la persona o la comunidad. Para que un bloque entre en ese juego
  se apunta en `registry.ts` y se pinta dentro de `<Blocks>`. La personalización
  vive en el navegador; el uso se cuenta en cada clic y se manda al módulo `usage`.
- Los estilos están en `styles/`, un fichero por sección, y se juntan en
  `styles/index.css`. El orden de ese fichero es el de la cascada.
- Los textos están en `shared/i18n`; el español es la referencia.

## Añadir una funcionalidad

Por ejemplo, "avisos":

1. **Contrato**: `packages/contracts/src/notices.ts` con los tipos, y exportarlo
   en `index.ts`.
2. **Esquema**: `apps/api/src/core/db/migrations/0004-avisos.ts`, y añadirlo a
   la lista de `migrations/index.ts`.
3. **Módulo**: `apps/api/src/modules/notices/` con repositorio, servicio, rutas
   e `index.ts` que exporte `createNoticesModule`.
4. **Composición**: construirlo en `apps/api/src/app/composition.ts` y añadirlo
   a `modules`.
5. **Web**: métodos nuevos en `shared/api/types.ts`, `client.ts` y `mock/`;
   pantalla en `features/notices/`; si es una sección, apuntarla en
   `app/sections.ts` y pintarla en `app/SectionView.tsx`; textos en su tabla de
   `shared/i18n/textos/` (`docs/textos.md`).
6. **Tests** en `apps/api/tests/`, y documentar las rutas en `docs/api.md`.

Ningún otro módulo se toca.

## Tests

`apps/api/tests/unit` prueba cada pieza con una base en memoria y un reloj
falso; `tests/integration` levanta la app entera con la API de 42 simulada
(`tests/helpers/fake-42.ts`). Ningún test sale a la red.

`apps/web/tests` prueba las funciones puras de la web (plazos por pace, nombres
de puestos, franjas, colores y periodos de la red): lo que se puede romper sin
que se note en pantalla. Los componentes no tienen tests.
