# Tareas tras compactar (2026-10-25)

Francés como quinto idioma y repaso de textos (pedido por Alberto).

- Fase 1 (hecha, en main 69274da, sin desplegar): infraestructura del francés,
  columna `fr` vacía con el inglés de reserva, `FR_REQUIRED = false` en
  `apps/web/tools/textos-cli.ts`.
- Fase 2 (en marcha, 7 agentes en worktrees, sin push): cada uno repasa
  es/en/ca/eu de sus tablas y escribe el francés. Encargo común en
  `/tmp/claude-1000/-home-alberto-Desktop-ideas/57dad75e-f532-4dbb-a822-ebdccca067cc/scratchpad/brief-textos.md`.
  - A: comun, legal, agenda, avisos, calendario
  - B: juego/juego.csv, code-clicker
  - C: gestion
  - D: notgames, curso-shell, red, estadisticas, examenes
  - E: expediente, animos, demos, buzon, tablon, terapia, guardia, clusters,
    pizarras, sala-de-espera
  - F: lecciones del curso de git (`levels/fr/`) y de shell (`fr` en cada unidad)
  - G: banco de preguntas de Not-games (`bank/fr/`, `Actor.lang` con `fr`)
- Al unir: conflictos solo en `docs/textos/*.md` (regenerar con
  `npm run textos -- --write`).
- Fase 3: un agente distinto relee todo el francés (doble comprobación) y
  coherencia del glosario; luego `FR_REQUIRED = true`, check, cobertura,
  push y despliegue.
