# Tareas tras compactar (2026-10-25, noche)

Desplegado: 9650f72 (París en `SYNC_CAMPUS_IDS` del servidor, selector de
escuelas con 2 s, quitar a los de fuera). En main sin desplegar (e5b8088):
todo el francés de la fase 2 (tablas, banco, lecciones) con `fr` oculto del
selector (`unlisted: true`).

En marcha (worktrees, sin push):

- Revisor 1: todo el `fr` de las tablas CSV, glosario único
  (`docs/glosario-frances.md`), comprobaciones automáticas, `FR_REQUIRED = true`
  y quitar `unlisted`. Glosario de partida:
  `/tmp/claude-1000/-home-alberto-Desktop-ideas/57dad75e-f532-4dbb-a822-ebdccca067cc/scratchpad/glosario-fr.md`.
- Revisor 2: banco de preguntas en francés (`bank/fr`).
- Revisor 3: lecciones de git y shell en francés.
- Burbuja de sugerencias de mejora (migración 0078).
- Avance: selecciones múltiples (plan, población, alcance), varias personas,
  «los más rápidos», terminados de Python (si son pocos, línea individual).

Al unir: conflictos de `docs/textos/*.md` se regeneran con
`npm run textos -- --write`; las filas nuevas de otros agentes tienen que
llevar `fr` (con `FR_REQUIRED` encendido). Después: check, cobertura, push y
despliegue.
