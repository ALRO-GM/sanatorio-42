# Tareas tras compactar (2026-11-01)

En producción hasta 7a69796. Si la CI falla: `gh run view --job <id> --log-failed`
(gh en `~/.local/bin`).

## Gran tanda pedida por Alberto el 2026-11-01 (push y despliegue autorizados)

Cinco agentes en worktrees (`.claude/worktrees/`), cada uno con commit local:

| Rama (si la crearon a mano) | Encargo | Entrega |
| --- | --- | --- |
| revision-codigo | Revisión: seguridad, duplicados, cobertura y casos límite, componentes reutilizables | `docs/revision-2026-11/codigo.md` |
| docs-readme | README al día, `docs/componentes.md` (Mermaid + pros/contras), `docs/funcionalidades.md` | docs |
| ux-modos | UX a fondo y qué se ve en simplificado/normal/datos | `docs/revision-2026-11/ux.md`, `docs/interfaz.md` |
| preguntas | Coherencia del banco, Common Core, ≥100 (ideal 200) de piscina Shell00-01 y C00-C12 | `docs/preguntas.md` |
| startup-mundo | Pomodoro: cuarto→coworking→oficinas→edificio, mudanzas, economía, oficios, mundo vivo, decoración recolocable, premio tras ≥30 min. Migración 0083 | `docs/pomodoro-startup.md` |

Al acabar: `git merge --no-ff` de cada rama en main (textos: `npm run textos -- --write`),
`npm run check`, un push y un despliegue (skill desplegar). Resumen a Alberto.

**Hecho y desplegado (e871d05, 2026-11-01).** Pendientes de Alberto: piscineros en el
mapa de clústeres (S10), huecos de los rankings (S8), unificar componentes de pantalla,
propuestas de `docs/revision-2026-11/ux.md` y datos dudosos de `docs/preguntas.md`.
