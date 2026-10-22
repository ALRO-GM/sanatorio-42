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

## Qué se hizo ya (22-23 de octubre)

- **Seguridad**: el motor del Code Clicker pasó a `packages/clicker`, compartido
  por web y API, y la API rehace la producción de cada partida en vez de
  fiarse del `perSecond` del cliente. `/usage/heatmap` pasó a
  `/admin/usage/heatmap`. La barrera de `/admin/` compara la ruta
  descodificada (con test para `/%61dmin/people`). Los ids de evento a medias
  (`help:booking`) ya no dan 500.
- **Flujo**: skills y subagentes en `.claude/`, y `docs/flujo-de-trabajo.md`.
- **Máquina**: ampliada al máximo gratuito de Oracle (4 OCPU, 24 GB, 200 GB).

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
