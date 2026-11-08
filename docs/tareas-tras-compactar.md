# Tareas tras compactar (2026-11-01)

En producción hasta 7a69796. Si la CI falla: `gh run view --job <id> --log-failed`
(gh en `~/.local/bin`).


## Cola del 2026-11-08 (push y despliegue autorizados)

Docker (999aecd) y Kubernetes (7466e8a) unidos; puntos 1–3 y 6 hechos.
Agentes en worktrees: repaso de textos de los cursos (punto 4) y gamificación
(punto 5, migración 89 reservada). Al acabar: unir, check, push, desplegar;
luego el punto 7.

3. **Orden de cursos sin bloqueo** (Alberto): sugerir shell → git → Docker →
   Kubernetes y cuál terminar antes, con enlace; nunca bloquear
   (`shared/course`, regla en `docs/plantilla-cursos.md`).
4. **Repaso exhaustivo de los cursos** (todos: git, shell, Docker, Kubernetes)
   al terminarlos: que las explicaciones sean correctas, tengan sentido y
   estén bien escritas (castellano e inglés).
5. **Gamificación de los cursos**: en la pestaña Clasificaciones de campus y
   logros para los banners del perfil (`features/profile/Achievements.tsx`,
   `title.ts`, `TitlePicker.tsx`).
6. Regla nueva: todo lo que tarde enseña progreso (`shared/ui/Refreshing.tsx`).
7. **Agente de preguntas y explicaciones** (después de lo anterior):
   - Investigar (papers, foros, aplicaciones) cómo se escriben preguntas de
     opción múltiple con distractores coherentes: estructuras y reglas
     (p. ej. las de Haladyna, que los distractores salgan de errores
     frecuentes reales, sin pistas gramaticales ni «todas las anteriores»).
   - Crear (o mejorar si existe) un agente en `.claude/agents/` que escriba
     preguntas por proyecto, curso o genéricas: bien redactadas, con la buena y
     las incorrectas coherentes con la pregunta, y **variantes** de cada
     pregunta (afirmativa, negativa, otras palabras) y de cada respuesta, para
     que no se memoricen frases.
   - Investigar qué modelo pedagógico funciona mejor para explicar conceptos
     y hacer una **plantilla de explicación** (explicación concreta + ejemplos
     que demuestran lo explicado) que siga ese agente; con ella, el agente
     completa el repaso de los cursos (punto 4).

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

**Hecho y desplegado (e871d05, 2026-11-01).** Después (Alberto): piscineros en el plano
sin foto para estudiantes (S10) y puestos de clasificaciones sin huecos (S8), hechos; un
agente unifica los componentes de pantalla tras la UX. Las preguntas dudosas las revisa
Alberto (no es pendiente nuestro). Pendiente: propuestas de `docs/revision-2026-11/ux.md`.
