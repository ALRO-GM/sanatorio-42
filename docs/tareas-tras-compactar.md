# Tareas tras compactar (2026-11-01)

## Sesión del 2026-11-14 (sin push ni despliegue sin permiso de Alberto)

- [x] Producción en 6865a72, esquema 93, sana; `main` igual que `origin/main`.
- [x] Worktrees de las ramas ya unidas borrados (las ramas se conservan).
- [x] `npm run check` en verde (con Node 22: el shell no interactivo coge el
  Node 18 del sistema si no se pone `~/.local/node/node-v22.23.3-linux-x64/bin` en el PATH).
- [x] Preguntas de Not-games de NetPractice (14) y RAG (15), con inglés, francés y Repaso (`bank/course-net.ts`, `course-rag.ts`; banco: 510; sin commit).
- [x] Francés de las unidades de NetPractice y RAG (en `course/fr/` de cada motor, test `netragcourse-fr`; sin commit).

- [x] Desplegado d693170 (francés y preguntas de NetPractice y RAG).
- [x] **Mensajes de la burbuja (pedido por Alberto el 2026-11-14; commits y despliegue autorizados, sin coautoría)**:
  revisar si son reales y arreglar bugs, mejoras pequeñas y grandes. Cuatro agentes en
  worktrees (migraciones reservadas): Not-games y ajedrez (0094: #85 #86 #88 #89 #90 #95
  #107 #108 #109 #110), clústeres y exámenes (0095: #81 #82 #99 #117), red, avance y pace
  (0096: #87 #94 #106 #112 #114 #115), perfil, clicker y varios (0097: #76 #80 #91 #92
  con 10 y 50 personas, #102 #104 #105 #111 #113 #116 #118). #93 (modo terminal) no se hace.
  Al acabar: unir, check, un push, un despliegue y respuestas a cada ticket desde el panel
  (la base de producción no se escribe por SSH).
  Hecho y unido el 2026-11-14 (los agentes se cortaron con un apagón y se relanzaron).
- [x] Cifrado de lo privado en la base (`DATA_KEY`, `docs/cifrado.md`) y de las copias (gpg).
- [x] Black hole de Exámenes para todo el mundo (`GET /exams/blackhole`, modo normal).
- [x] Guardia de límites: el 95 % para todas las webs de la máquina, 4 OCPU, disco en GiB.
- [ ] Alberto: guardar `DATA_KEY` aparte; crear la clave gpg de las copias (`infra/copias.asc`).
- [ ] Responder cada ticket desde el panel (respuestas en el informe de la sesión).
- [ ] Decidir: plazo de los mensajes (punto 2 de `docs/privacidad-mensajes.md`); ocultar en el
  black hole a quien se anonimizó (hoy no hay registro que lo una con la réplica).

## Tanda del 2026-11-13 (push y despliegue autorizados)

Hecho y subido: muebles de las mejoras de espacio que se giran y se venden
(34b5ed1, desplegado) y normas para cualquier dispositivo
(`styles/standards.css`, 355529b; despliegue relanzado desacoplado, comprobar
`curl -s https://peer4u.app/api/health/db`).

Hecho y desplegado después (0c962a0, esquema 93): curso de NetPractice
(`cursonet`, `packages/netsim`, migración 0092) y curso de RAG (`cursorag`,
`packages/ragsim`, migración 0093), unidos a mano (los dos son `extra`: fuera
de los logros de «los cuatro cursos»; 32 logros, 1 255 XP, 9 clasificaciones).

Hecho después: el motor de demostraciones da a cada frase su tiempo de
lectura por idioma (`paced` en `shared/tour/Tour.tsx`, 0612a3e) y siete
demostraciones nuevas (`focus`, `startup`, `dropout`, `piscineProgress`,
`countdowns`, `admin`, `clicker`). Comprobar que está desplegado:
`curl -s https://peer4u.app/api/health/db`. Los worktrees de las ramas ya
unidas se pueden borrar (`git worktree remove` + `git worktree prune`).

Sin demostración propia aún (visto por el agente): la pregunta al parar el
Pomodoro, el editor de avatar y la ronda de inversión de la Startup, y las
pestañas sueltas del panel de gestión.

Pendiente menor de los cursos nuevos: preguntas de Not-games para NetPractice
y RAG; contenido en francés de las unidades (sale el inglés); jscpd al 0,86 %
(tope 1 %: sacar `BossView`/`Stop` a `shared/course` si sube).

## Cola del 2026-11-09 (push y despliegue autorizados)

Hecho y desplegado: límites configurables (pestaña Límites, `docs/limites.md`) y
revisión a fondo de los cuatro cursos (`docs/revision-cursos/*.md`).
Pendientes menores que dejaron los agentes:
- Comprobar los mensajes de git y Kubernetes contra herramientas reales (los
  agentes no pudieron ejecutarlas).

## Cola del 2026-11-08 (push y despliegue autorizados)

Toda la cola hecha y desplegada: Docker, Kubernetes, repaso de los cursos,
gamificación (clasificaciones y 22 logros), investigación de preguntas, plantillas
y agente `didacta`, y la plantilla aplicada a las 138 unidades.
Pendiente posible: diferencias de los simuladores con la herramienta real que
listó el repaso (git log <ref>, rollout status con CrashLoop, etc.).

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
