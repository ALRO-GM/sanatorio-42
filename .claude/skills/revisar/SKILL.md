---
name: revisar
description: Revisar un cambio (diff, rama o módulo) de Sanatorio 42 contra las reglas de AGENTS.md: seguridad, validación, permisos, cuota de 42, textos, tests de las cinco familias, docs. Úsala antes de unir una rama o cuando se pida una revisión.
---

# Revisar un cambio

Primero el alcance: `git diff --stat main...<rama>` o `git diff HEAD~N --stat`.
Luego, por cada punto, mira el código, no el resumen del commit.

## Seguridad (API)

- Toda entrada (params, query, body) pasa por zod o `idParam` antes de usarse.
  Nada de `Number(request.params.x)` ni `request.body.algo` suelto.
- Lo de admins cuelga de `/admin/…` y el servicio llama a `assertAdmin(actor)`.
- Staff solo en `/staff/…` con `session.staff`; sin excepciones.
- Quien actúa sobre datos de otra persona: el servicio comprueba que es suya
  o que es miembro (sala, grupo, reserva), no solo la UI.
- Sin sesión y con coste → `createRateLimit`. Nada de SQL montado con texto de
  la entrada; listas con `json_each(?)` o placeholders.
- Solo `replica` llama a 42, y siempre tras `quota.allows(tier)` o `quota.defer`.
- Tabla nueva con logins → declarada en `personal` del módulo (exportación y
  borrado de datos) y en la lista de `tests/unit/migrations.test.ts`.
- Errores: `DomainError` con mensaje claro; nunca detalles internos ni 500.

## Calidad

- Capas: `core/` e `integrations/` no importan de `modules/`; de otro módulo,
  solo su `index.ts`. Reglas en `*.rules.ts` sin base de datos (probables solas).
- Nada repetido que ya exista en `core/` o `shared/` (busca antes de crear).
- Comentarios en español que expliquen el porqué. Nombres coherentes
  (`campusId`, `login`, `at`).
- Web: textos solo en CSV; iconos de `Icon.tsx`; enlaces por `shared/links.ts`;
  colores por variables de tema; cliente real y mock a la par; mobile y
  cabecera en una fila; `prefers-reduced-motion` en animaciones.

## Tests (docs/tests.md: normal, límite, vacío y enorme, imprevisible, permisos)

- Reglas nuevas: test unitario. Ruta nueva: entra sola en `routes.test.ts`.
- Pantalla nueva: recorrido en `apps/web/tests/ui/` por rol y nombre.
- Relojes inyectados (`now`), nada de `Date.now()` suelto en lo probado.

## Docs

- Respuesta nueva o cambiada → `packages/contracts` + `docs/api.md`.
- Pantalla o bloque nuevo → `docs/interfaz.md` (categoría, modo, importancia).
- Decisión de producto → `docs/contexto.md`.

## Cómo informar

Hallazgos de más grave a menos, cada uno con `fichero:línea`, qué pasa, cómo
se explota o qué rompe, y el arreglo concreto. Separa lo confirmado de lo
sospechado. Para una revisión independiente, lanza el subagente `revisor`.
