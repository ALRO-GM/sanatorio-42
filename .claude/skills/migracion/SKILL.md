---
name: migracion
description: Crear una migración de base de datos en la API de Sanatorio 42 (numeración, tablas con datos personales, índices, test de migraciones, qué hacer con una ya desplegada). Úsala para cualquier cambio de esquema.
---

# Migraciones

Viven en `apps/api/src/core/db/migrations/NNNN-nombre.ts` y se registran en
orden en `migrations/index.ts`. **Las existentes no se editan**: una ya
desplegada ya corrió en producción; lo que haya que deshacer es otra migración
(ej.: `0066-no-correction-feedback.ts` borra la tabla que creó la 65).

## Pasos

1. Número: el siguiente al último (`ls migrations | tail`), sin huecos (lo
   comprueba `tests/unit/migrations.test.ts`). Con agentes en paralelo, reserva
   números y renumera al unir si queda un hueco **y aún no está desplegado**.
2. Fichero con comentario de cabecera (qué guarda y por qué, módulo dueño),
   `version`, `name` y `statements` (SQLite: `CREATE TABLE … WITHOUT ROWID`
   cuando la clave es natural; `CHECK` en los enumerados; índices para los
   `WHERE`/`ORDER BY` que usarán las consultas).
3. Tabla con logins → `personal` en el `index.ts` del módulo (exportación y
   borrado de datos) y, si procede, en «Limpiar datos» del panel.
4. Añadir la tabla a la lista de `tests/unit/migrations.test.ts`.
5. Repositorio y tests del módulo; `npm run check`.

## Comprobar sobre una copia de producción (solo lectura)

Copia la última de `infra/backups/*.db.gz` del servidor, `zcat` a un fichero
del scratchpad y consulta con `sqlite3 -readonly`. Nunca se escribe en la
base de producción por SSH.
