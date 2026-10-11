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

Los eventos y lo que lleva cada uno están declarados en `AppEvents`.

## Trabajos periódicos

Un módulo puede declarar `jobs` (nombre, cada cuánto y qué hacer). La app los
lanza al arrancar y los para al cerrar; un fallo se registra y se reintenta en la
siguiente vuelta. Hoy hay tres. Dos cada minuto: la asistencia a terapias
(`therapy`) y la comprobación de sesiones de ayuda (`help`), que usan la foto de
puestos de 42 y la refrescan con `sync.ensureLocations` si se ha quedado vieja.
Y la copia de correcciones (`network`), cada veinte segundos, que casi siempre
no tiene nada que hacer.

## XP que no se puede puentear

Toda la XP sale de `xp.award`, con una referencia única por hecho (una sesión,
una duda, un cambio), así que nada se cobra dos veces. Encima, cada vía tiene su
propia comprobación: ver `docs/api.md`, "Cómo se gana XP".

## Réplica de 42

Vive en el módulo `replica`. El sincronizador (`syncer.ts`) reparte la cuota
por prioridad:

| Tarea                         | Cadencia                                   |
| ----------------------------- | ------------------------------------------ |
| Puestos ocupados del campus   | 2 min con gente en la web, 15 min sin ella |
| Cambios en proyectos          | 5 min / 30 min                             |
| Catálogo de campus            | Semanal                                    |
| Copia inicial del campus      | Una petición cada 5 s hasta terminar       |

- La copia inicial de Madrid son unas 1 600 peticiones, una sola vez. Después,
  entre 10 y 130 por hora según haya gente o no.
- `SYNC_HOURLY_RESERVE` peticiones de cada hora no las toca el trabajo de
  fondo: son para los logins y para quien está mirando.
- Mientras la copia no ha terminado, lo que falte para una pantalla concreta se
  pide en el momento (`ensureFresh`), con tope.
- Los campus de `SYNC_CAMPUS_IDS` se copian enteros; el resto funcionan bajo
  demanda.

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

- **Copia** (`network.sync.ts`): primero todo el histórico, ordenado por id y con
  un cursor guardado en `sync_state`, así que un reinicio sigue donde se dejó.
  Después, cada diez minutos, solo lo cambiado (`range[updated_at]`). Nunca gasta
  la reserva horaria de la API. Se guarda quién, a quién, qué proyecto, cuándo y
  la nota; los comentarios y el feedback no llegan a la base.
- **Cuentas** (`network.analysis.ts`, funciones puras): SQLite junta las
  correcciones por pareja y sentido; con eso se calculan la endogamia de cada
  persona (media de cuánto repite con la misma gente y cuánto de lo que corrige
  se lo devuelven) y las comunidades (método de Louvain, sin azar).
- **Quién es de fuera**: quien no está en la réplica del campus. Solo sale como
  vecino de alguien de dentro; una pareja de dos personas de fuera se descarta.
  Las cuentas borradas (`3b3-…`) fueron estudiantes del campus y cuentan como tales.
- **Rendimiento**: el análisis de cada combinación de filtros se guarda un minuto
  en memoria (`core/ttl-cache.ts`), así que cambiar el tope de personas o elegir a
  alguien no vuelve a leer la base. La web lo pinta en un `<canvas>` con
  `d3-force` y solo descarga esa parte al abrir la sección.

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
  abrirla (`lazy` en `Clinic.tsx`), y la API simulada, solo en `dev:mock`.
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
   `app/sections.ts` y pintarla en `app/Clinic.tsx`; textos en `es.ts` y `en.ts`.
6. **Tests** en `apps/api/tests/`, y documentar las rutas en `docs/api.md`.

Ningún otro módulo se toca.

## Tests

`apps/api/tests/unit` prueba cada pieza con una base en memoria y un reloj
falso; `tests/integration` levanta la app entera con la API de 42 simulada
(`tests/helpers/fake-42.ts`). Ningún test sale a la red.

`apps/web/tests` prueba las funciones puras de la web (plazos por pace, nombres
de puestos, franjas, colores y periodos de la red): lo que se puede romper sin
que se note en pantalla. Los componentes no tienen tests.
