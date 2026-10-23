# Flujo de trabajo: de la idea a producción

Cómo se desarrolla Sanatorio 42 de forma segura y constante: una funcionalidad
o un arreglo cada vez, con una barrera en cada paso, y producción que no se
rompe aunque un paso falle. Sale de la revisión de octubre de 2026
(`docs/revision-2026-10/`) y de las reglas de `AGENTS.md`; cada acción
recurrente tiene su skill en `.claude/skills/` y su subagente en
`.claude/agents/`.

## Las piezas

| Pieza | Dónde | Qué garantiza |
| --- | --- | --- |
| Reglas del proyecto | `AGENTS.md` | Capas, validación, permisos, cuota de 42, textos, docs |
| Skills | `.claude/skills/*` | El procedimiento de cada acción, igual cada vez |
| Subagentes | `.claude/agents/*` | Implementar, traducir, probar, revisar y desplegar en paralelo y sin pisarse |
| `npm run check` | raíz | Tipos, lint, formato, código sin uso, duplicados, textos y 1 700 tests |
| CI (GitHub Actions) | `.github/workflows/ci.yml` | Lo mismo que el check, más cobertura mínima, build e imagen |
| `deploy.sh` | `infra/scripts/` | Copia de seguridad, espera a la CI, migración, arranque y vuelta atrás |
| Plan vivo | `docs/tareas-tras-compactar.md`, `docs/contexto.md` | Lo hecho, lo siguiente y lo que queda a medias, para retomar con el contexto vacío |

## El camino, paso a paso

1. **Decidir y apuntar** (skill `nueva-funcionalidad`). Categoría, sección o
   bloque, modo e importancia en `docs/interfaz.md`; el número del buzón si
   viene de allí. *Barrera*: está escrito antes de la primera línea de código.
2. **Contrato primero.** Tipos en `packages/contracts`, ruta en `docs/api.md`;
   si cambia el esquema, migración nueva (skill `migracion`). *Barrera*: los dos
   lados compilan con el contrato nuevo.
3. **Implementar con las cinco familias** (`docs/tests.md`): reglas puras con
   test directo, servicio con reloj inyectado, ruta con zod, pantalla con su
   recorrido por rol y nombre, mock a la par del cliente real, textos en las
   cuatro lenguas (skill `traducir`).
4. **Iterar rápido.** Mientras se trabaja: `npx vitest run <fichero>` y
   `npm run check:quick` (tipos, lint, formato y textos, sin tests: medio
   minuto). Antes de cerrar: `npm run check` entero (skill `comprobar`), que
   tarda poco más de un minuto. Con `npm run hooks` (una vez por clon) el
   pre-commit pasa formato, lint y textos sobre lo preparado, y el pre-push
   pasa el check entero: nada rojo sale del portátil.
5. **Revisar** (skill `revisar`, subagente `revisor` para una segunda
   opinión): seguridad, permisos, cuota, textos, tests y docs sobre el diff.
6. **Commit** en español que explique el porqué, en `main` o en una rama corta
   cuando el cambio es grande o va en paralelo.
7. **Desplegar** (skill `desplegar`, subagente `desplegador`): push, copia de
   seguridad, espera a la CI, migración aparte, arranque, comprobación de
   salud y vuelta atrás automática si no responde. Agrupar lo que esté listo
   en un solo despliegue.
8. **Después.** `docs/contexto.md` al día; antes de compactar el contexto,
   `docs/tareas-tras-compactar.md` (skill `retomar`).

## Trabajo en paralelo

Dos o tres tareas que no se pisan van a la vez con el subagente
`implementador`, cada uno en su worktree y su rama (skill `paralelo`): push
antes de lanzarlos, números de migración reservados, en los ficheros
compartidos solo se añaden líneas, y se unen de una en una a `main` con el
check de todo junto y un solo despliegue por tanda. Las revisiones de solo
lectura no necesitan worktree.

## Seguridad como costumbre

- Toda entrada pasa por zod o `idParam`; lo de admins cuelga de `/admin/` y
  llama a `assertAdmin`; staff solo en `/staff/`; sin sesión y con coste, tope
  por IP. La barrera de `/admin/` compara la ruta descodificada.
- Solo `replica` habla con 42 y siempre tras preguntar a la cuota.
- Cada tabla con logins está en `personal` (exportación y borrado) y en el
  test de migraciones.
- Nada que la API rehaga puede fiarse de una cifra del cliente (ejemplo: el
  Code Clicker calcula la producción de cada partida con el motor compartido
  de `packages/clicker`).
- Una revisión de seguridad completa cada pocos meses o tras un cambio grande
  (subagente `revisor` con el alcance «todo»), con el informe en `docs/`.

## Lo que falta por montar (en orden)

De la lista priorizada de `docs/revision-2026-10/tests-infra.md`:

1. Logger siempre encendido a `warn` con `x-request-id`: que un 500 deje rastro.
2. Migración como paso aparte en `deploy.sh`, con vuelta atrás que funcione
   aunque el despliegue traiga una migración, cerrojo y `&&`.
3. Espera a la CI por etiqueta `ci-ok/<sha>` (sin cupo de la API de GitHub).
4. `/health/db` con sha, esquema y edad de la sincronización, y que el
   despliegue lo compruebe.
5. Copias: retención por tiempo, verificación y destino fuera de la máquina
   (cifradas).
7. Subir los mínimos de cobertura de la web (el test de `docs/api.md` ↔ rutas
   ya está).
8. Avisos a Slack del despliegue y un monitor externo gratuito.
9. Ramas con PR y CI obligatoria cuando haya más de una persona.
