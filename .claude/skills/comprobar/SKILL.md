---
name: comprobar
description: Pasar npm run check (tipos, lint, formato, código sin uso, duplicados, textos y tests) y arreglar lo que falle antes de dar algo por hecho. Úsala antes de cada commit y cuando un test o la CI fallen.
---

# Comprobar antes de dar algo por hecho

`npm run check` en la raíz encadena: `typecheck`, `lint`, `format:check`,
`deadcode` (knip), `duplicates` (jscpd), `textos` y `test` (API ~1 300 tests,
web ~370). Tarda unos 3–4 minutos. **Nada se da por hecho sin pasarlo entero.**

## Cómo leer un fallo

- **Prettier**: `npx prettier --write <ficheros>` y repetir.
- **knip** («Unused exported …»): se borra o se deja de exportar. No se
  silencia en `knip.json` salvo falso aviso, con el porqué.
- **jscpd** (duplicados): unificar en un helper de `core/` (API) o `shared/`
  (web). No subir el umbral.
- **textos**: clave usada que falta en la tabla, clave sin uso, o
  `docs/textos/*.md` desactualizado → `npm run textos -- --write`. Columnas:
  si una fila «tiene 7 columnas y van 6», falta entrecomillar un campo con comas.
- **i18n test** («catalán y euskera traducen todo…»): falta ca/eu en una clave
  visible.
- **migrations test** («sin huecos» / lista de tablas): numerar seguido y
  añadir la tabla nueva a la lista de `tests/unit/migrations.test.ts`.
- **routes test** (entradas extremas → 500): valida la entrada con zod o
  `idParam`; una ruta pública nueva va en su lista `OPEN` con el porqué.
- **Heap out of memory** en lint: suele ser una carpeta grande sin ignorar
  (`.claude/worktrees/` ya está en `eslint.config.*` y `.prettierignore`).

## Pasar solo una parte (mientras iteras)

- `npx vitest run <fichero>` dentro de `apps/api` o `apps/web`.
- `npm run typecheck`, `npm run lint`, `npx prettier --check <ruta>`.
- Cobertura con mínimos: `npm run test:coverage` (los mínimos solo suben).

## Antes del commit

1. `npm run check` entero en verde.
2. Si tocaste una respuesta de la API: `packages/contracts` y `docs/api.md`.
3. Si tocaste pantallas: `docs/interfaz.md` y el test de `apps/web/tests/ui/`.
4. Textos nuevos con las cuatro lenguas (skill `traducir`).

Para escribir tests que falten siguiendo las cinco familias de `docs/tests.md`,
lanza el subagente `probador`.
