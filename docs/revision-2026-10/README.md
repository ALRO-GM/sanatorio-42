# Revisión completa de octubre de 2026

Cinco revisiones de solo lectura hechas el 22 de octubre de 2026 por agentes en
paralelo, cada una con su informe entero en esta carpeta:

| Informe | Hallazgos | Lo más grave |
| --- | --- | --- |
| [Seguridad de la API](seguridad-api.md) | 0 críticos · 1 alto · 7 medios · 14 bajos | La barrera de `/admin/` se saltaba con `/%61dmin/…`; el antitrampas del Clicker se fiaba del cliente |
| [Calidad de la API](calidad-api.md) | 39 | Repetición semántica (listas `IN`, `iso`, cachés), servicios de 500-1 100 líneas, SQL en servicios |
| [Calidad y usabilidad de la web](calidad-web.md) | 53 | 37 copias del grupo de pastillas, relojes y sondeos a mano, 16 ventanas con el mismo armazón |
| [Textos](textos.md) | 275 filas que corregir | Terminología dispar, `...` por `…`, 941 filas sin catalán ni euskera, 207 errores de la API solo en español |
| [Tests e infraestructura](tests-infra.md) | 31 | La vuelta atrás del despliegue no funciona con migración; los 500 no se registran; copias solo en la máquina |

Las cifras de partida: 126 000 líneas de TypeScript, 1 708 tests (API al 98 %
de líneas, web al 66 %), `npm run check` en 1 m 18 s, 183 rutas.

## Estado (23 de octubre, mañana)

**Seguridad** (`seguridad-api.md`): resueltos y en producción A1 (barrera de
`/admin/` sobre la ruta descodificada), M1 (ids de evento a medias), M2 (vista
de salas solo para su campus o su gente), M3 (motor del Clicker en
`packages/clicker`, producción calculada en la API), M4
(`/admin/usage/heatmap`), M5 (Slack escapado), M6 (exportación de datos sin
datos de terceros, tablas declaradas, secretos omitidos, truncado señalado),
B1 (el documento de horas solo por `POST`), B2 (secreto de 32), B3 (búsqueda de personas con caché por campus), B4 y B12 (con M6). M7: se anonimiza (decisión de Alberto), con
`POST /me/anonymize` y su versión de admin. Del informe de los juegos, todos hechos: FFA en
solitario sin victoria, `remember` tras deduplicar, irse a media partida
apunta derrota, cerrojo por persona en el Clicker (`plus`, `choose`, `save`,
`pardon`, `sanction`), ids de texto del curso de git con `slugParam`, el tramo
del Pomodoro de al menos cinco personas, nombres de demostración de una lista
cerrada (`TourName`; de paso, `helpStats`, `gitCourse` y `notGames` ya pueden
guardar su velocidad) y tope de mil claves de uso por persona. También B6
(veinte análisis nuevos de la red por persona y minuto), B7 (cuarenta envíos
de estadística por persona y minuto), B8 (lo que sale de la máquina, cifrado;
falta crear el destino), B9 (`externalHref`: solo `https://`) y B10
(`paintable`: valores de paleta sencillos). B11 se acepta: son logins y fotos
públicas de la intra, validados al leer, y el buscador los necesita.

**Calidad de la API** (`calidad-api.md`): hechos los diez refactors, también
A2 + L4 (módulo `presence`, `createLate` con `wire()` al final de
`composition.ts` en vez de diez referencias adelantadas, lo donado al Clicker
leído por `replica.points` y la regla de imports también sobre `app/`): helpers de filas y
`toJson`, `inList` con `json_each` (22 sitios), `Cache-Control` solo en el
gancho global (46 líneas), `given()` y `Clock`/`Logger`, caché TTL compartida,
guarda de reentrada en los `jobs`, `isoAt`/`dayOf`/`startOfDayIso` (22
definiciones), regla verificable de quién habla con 42, índice de
`help_bookings` y `LIMIT` en la clasificación.

**Calidad de la web** (`calidad-web.md`): la página de exámenes perezosa
(hecho) y los diez refactors (`PillGroup`, `useNow`, `usePolling`,
`useFormat`, `RankingList`, `Modal`/`useConfirm`, piezas a `shared/`, colores
semánticos, `Async` y plurales, `PeopleResults`), unidos el 23 de octubre.

**Textos** (`textos.md`): las 275 filas, el glosario y los contextos
aplicados; catalán y euskera completos en todas las tablas (1 009 filas).
Claves repetidas: 55 unidas en 21 `common.*` (botones y etiquetas genéricas;
las que se montan con plantilla y las de contexto distinto se quedan). Queda
pintar como icono los glifos (★ ✦ ← →) que hoy van en el texto.

**Tests e infraestructura** (`tests-infra.md`): hechos los puntos 1, 2, 5 y
6 de su lista (logger a `warn` con `x-request-id`, migración aparte con
vuelta atrás y cerrojo, `/health/db` con sha y esquema, espera a la CI por
etiqueta `ci-ok/<sha>`). Pendientes: copias fuera de la máquina y cifradas,
hooks de git y `check:quick` (hechos), mínimos de cobertura de la web
(subidos a lo que hay: 64 % de líneas, 51 % de funciones, 79 % de ramas),
`docs/api.md` ↔ rutas (hecho: `tests/integration/api-docs.test.ts`), recorridos de pantalla (hechos: asistencia, guardia en la sala de espera,
pizarra, terapia, tablón y el cliente real contra un `fetch` falso; falta el
Code Clicker), Slack de despliegues y monitor
externo (falta la cuenta). Errores de cliente: hechos (`ErrorBoundary` por
sección y `POST /client-errors` al registro).

**Flujo**: skills y subagentes en `.claude/`, `docs/flujo-de-trabajo.md`.
**Máquina**: ampliada al máximo gratuito de Oracle (4 OCPU, 24 GB, 200 GB).

## Plan de arreglos, por tandas

Cada tanda acaba con `npm run check`, commit y despliegue. Entre paréntesis,
el identificador del hallazgo en su informe.

1. **Seguridad media** (en curso): texto a Slack sin menciones (M5), vista de
   salas solo para su gente o su campus (M2), `SESSION_SECRET` de 32 (B2),
   documento de horas solo por `POST` (B1).
2. **Despliegue y rastro** (en curso, subagente): logger a `warn` con
   `x-request-id`, migración aparte con vuelta atrás, espera a la CI por
   etiqueta, `/health/db` con sha y esquema.
3. **Textos** (en curso, subagente): las 275 filas, el glosario y los
   contextos; después, catalán y euskera de `gestion`, `legal` y `juego`.
4. **Datos personales** (M6, M7): tablas y columnas sin declarar, datos de
   terceros en la exportación, `omit` de secretos, truncado señalado; decidir
   la política de borrado de cuenta.
5. **Base reutilizable de la API** (los diez de `calidad-api.md`): helpers de
   filas y listas `IN` con `json_each`, `Cache-Control` por gancho, `given()`,
   caché TTL compartida, guarda de reentrada en los `jobs`, `core/time.ts`,
   regla escrita de quién llama a 42, módulo `presence`, índice de
   `help_bookings`.
6. **Base reutilizable de la web** (los diez de `calidad-web.md`):
   `PillGroup`, `useNow`, `usePolling`, `ExamsPage` perezosa, `useFormat`,
   `RankingList`, `Modal` + `useConfirm`, compartidos a `shared/`, colores
   semánticos a variables, `Async` y plurales.
7. **Tests**: mínimos de cobertura de la web, `docs/api.md` ↔ rutas,
   recorridos de pantalla que faltan, temporizadores falsos en `tests/ui`.
8. **Bajos de seguridad** restantes y observabilidad (Slack de despliegues,
   monitor externo, `ErrorBoundary` + errores de cliente).
