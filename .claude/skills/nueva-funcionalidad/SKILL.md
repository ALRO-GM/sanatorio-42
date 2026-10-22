---
name: nueva-funcionalidad
description: El camino completo de una funcionalidad nueva en Sanatorio 42, de la idea a producción (dónde va en la interfaz, contratos, API, web, mock, textos, tests, docs, check, commit, despliegue). Úsala al empezar cualquier funcionalidad o arreglo que toque API y web.
---

# De la idea a producción

## 0. Decidir y apuntar (antes de escribir código)

- Categoría y sección (`app/sections.ts`), si es sección o bloque, desde qué
  modo sale (simplificado / normal / «loco por los datos»: `from` y `<Show>`
  de `shared/detail.tsx`) e importancia: regla de `docs/interfaz.md`. Se apunta
  allí. Mejor un bloque en una sección que existe que una sección nueva.
- Si viene del buzón (`tickets`), anota el número (#NN) en el commit.
- Si hay varias cosas independientes, repártelas (skill `paralelo`).

## 1. Contrato

`packages/contracts/src/<tema>.ts`: tipos de la respuesta. Documenta la ruta y
sus parámetros en `docs/api.md`.

## 2. API (`apps/api/src/modules/<modulo>/`)

- `*.rules.ts`: cuentas puras, sin base de datos (test unitario directo).
- `*.repository.ts`: SQL con placeholders; filas → objetos con `toText`/`toNumber`.
- `*.service.ts`: permisos (`assertAdmin`, pertenencia), `DomainError`,
  `notify(kind)` si le toca a otra persona, `now` inyectable.
- `index.ts`: rutas con zod/`idParam`, `session.actor`; admin bajo `/admin/`;
  `jobs` para lo periódico; `personal` para tablas con logins.
- Esquema nuevo → skill `migracion`. Datos de 42 → solo vía `replica` y su cuota.

## 3. Web (`apps/web/src/features/<feature>/`)

- Cliente: `shared/api/types.ts` + `client.ts` + `mock/*.ts` (el tipo `Api`
  obliga a los dos; la demo pública usa el mock con datos inventados).
- Componente: `useAsync`/`useAction`, `ErrorNote`, estado vacío, `InfoTip` con
  demo (`npm run demo:new`) si es una sección; reutiliza `shared/ui` y
  `shared/hooks` antes de crear nada.
- Textos: skill `traducir` (cuatro lenguas). Iconos de `Icon.tsx`. Enlaces de
  `shared/links.ts`. Colores por variables. Móvil y cabecera en una fila.

## 4. Tests (`docs/tests.md`: cinco familias)

Reglas → unitario; servicio → `tests/unit/<modulo>.test.ts` con base en
memoria y reloj falso; ruta → entra sola en `routes.test.ts`; pantalla →
`apps/web/tests/ui/<feature>.test.tsx` por rol y nombre; demo → la comprueban
los tests de demos.

## 5. Cerrar

`npm run check` (skill `comprobar`) → commit en español con el porqué →
skill `desplegar`. Antes de compactar el contexto: `docs/tareas-tras-compactar.md`.
