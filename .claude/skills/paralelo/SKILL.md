---
name: paralelo
description: Repartir varias tareas independientes de Sanatorio 42 entre agentes en paralelo (worktrees, push previo, migraciones reservadas, ficheros compartidos, unión y un solo despliegue). Úsala cuando haya dos o más tareas que no se pisan.
---

# Trabajar en paralelo con agentes

Sirve cuando las tareas tocan módulos y pantallas distintos. Dos o tres a la
vez; más cuesta más en uniones que lo que ahorra.

1. **Push antes de lanzar**: el worktree de cada agente nace del último commit
   subido, no del `main` local. Si no, llega una rama sin tus últimos cambios y
   la unión es a mano.
2. Cada agente con `isolation: "worktree"` y un encargo que diga: qué módulos
   y pantallas son suyos, cuáles **no** tocar, qué número de migración tiene
   reservado, que en ficheros compartidos (`client.ts`, `types.ts`,
   `mock/index.ts`, `contracts/index.ts`, `composition.ts`, CSV de textos)
   solo **añade líneas**, y que no hace push, ni despliega, ni llama a GitHub
   ni al servidor: solo commit local con `npm run check` en verde.
3. Al terminar cada uno: `git merge --no-ff <rama>` en `main`, resolver
   (`docs/textos/*.md` se regeneran con `npm run textos -- --write`), `npm run
   check` con todo junto.
4. Un solo push y un solo despliegue por tanda (skill `desplegar`).
5. Los worktrees viven en `.claude/worktrees/` (ignorado por git, ESLint y
   Prettier); se borran con `git worktree prune` cuando ya no hacen falta.

Las revisiones de solo lectura no necesitan worktree: varios agentes pueden
leer el mismo árbol a la vez y escribir su informe en el scratchpad.
