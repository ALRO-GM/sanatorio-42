# Curso de git (Not-games, #42 del buzón)

Un juego para aprender git de verdad, en los ordenadores del clúster: un camino
de puntos con forma de ramas de git de colores, que se van marcando al
completarlos. Cada punto enseña algo con una animación y su teoría, y después
hay que recrear una estructura de ramas (y a veces ficheros) en una terminal
simplificada.

## De dónde sale

- **Contenido.** *Pro Git* (Chacon y Straub, libre en git-scm.com): capítulo 3
  (ramas, ramas remotas, rebase y sus riesgos) y 5 (flujos distribuidos).
  *Learn Git Branching* (pcottle): introducción, «ramping up» (HEAD separado,
  referencias relativas, deshacer), mover trabajo (cherry-pick, rebase
  interactivo), un poco de todo (tags) y remotos (clone, fetch, pull, push,
  historia divergente, rama protegida). *Oh My Git!* (bleeptrack y blinry):
  ficheros, índice, ramas, merge, remotos, cambiar el pasado, «cosas que
  pasan», flujos, stash y tags; con terminal y con niveles cortos en pasos.
- **Flujos asentados.** GitHub flow (main y ramas cortas que entran por PR),
  Gitflow (develop, release y hotfix), trunk-based (una rama, integración
  continua) y el de fork para colaborar en proyectos ajenos.
- **Cómo enganchan los juegos.** Camino lineal con mundos que se abren de uno
  en uno (Duolingo cambió su árbol por un camino; Candy Crush agrupa niveles en
  episodios para que cientos de niveles no abrumen). El progreso a la vista
  (efecto *goal-gradient*: se acelera al ver cerca la meta) y un primer paso
  fácil como ventaja inicial. Repaso intercalado en el propio camino.
  Estrellas por resolver con pocos comandos: un motivo para repetir sin
  obligar. Sin rachas ni notificaciones insistentes.

## Conceptos, por mundos

Cada mundo es un **punto gordo** del camino; entre uno y otro hay **pasos**
cortos. Algunos pasos son **de repaso** (juntan conceptos de antes). Cada
cierto número de conceptos hay una **prueba de grupo**.

| Mundo | Conceptos | Pasos |
| --- | --- | --- |
| 0. Raíz | repositorio, commit, índice (`add`), `status`, `log` | 4 |
| 1. Ramas | `branch`, `switch`, HEAD, merge fast-forward y de tres vías, borrar ramas | 5 |
| ★ Grupo 1 (2+) | remoto común: cada cual sube su rama y se une en main | — |
| 2. Remotos | `clone`, `fetch`, `pull`, `push`, ramas de seguimiento, historia divergente | 5 |
| 3. Reescribir | referencias relativas (`~`, `^`), HEAD separado, `rebase`, `cherry-pick`, `commit --amend` | 5 |
| 4. Deshacer | `reset` (soft, mixed, hard), `revert`, `stash`, conflictos y cómo resolverlos | 5 |
| ★ Grupo 2 (3+) | GitHub flow con un conflicto entre dos personas | — |
| 5. Flujos | GitHub flow, Gitflow (develop, release, hotfix), trunk-based, `tag` y versiones | 5 |
| ★ Grupo 3 (3+) | Gitflow: una versión y un hotfix a la vez | — |
| ☠ Jefe final (2+) | todo: cada cual en un puesto a 4 filas y 4 columnas o más del resto, sin hablar y con tiempo | — |

## Cada punto

1. **Animación**: la estructura de ramas que hay que conseguir se va
   construyendo sola, commit a commit (se repiten los comandos de la solución).
2. **Teoría** del comando: para qué sirve, cómo se usa, cuándo usarlo, cuándo
   no, cómo se ve en las ramas y qué problemas da.
3. **Reto**: se parte de un repositorio y hay que llegar a la estructura de la
   animación (ramas, commits, HEAD y, si toca, el contenido de ficheros) con la
   terminal. Una, dos o tres estrellas según los comandos usados.

## Reglas

- **Solo desde un ordenador del clúster**: hace falta estar sentado en un
  puesto (la foto de puestos de 42).
- **Pruebas de grupo**: se elige entre el mínimo de personas o más; todas en
  puestos del clúster, en paralelo, cada una con su repositorio y un remoto
  común. Antes, cada cual pasa un **test de preguntas rápidas con el 100 % de
  aciertos**; si falla, no lo puede repetir en **una hora** (puede repasar).
- **Jefe final**: lo mismo, más separación de **al menos 4 filas y 4
  columnas** entre puestos (o en clústeres distintos), sin comunicarse y con
  tiempo límite.
- **Trampas**: los retos en solitario se juegan en la web y la API los vuelve a
  ejecutar con los mismos comandos (el motor es el mismo) antes de dar el punto.

## Cómo está hecho

- `packages/gitsim`: el motor de git simulado (repositorio, comandos, remotos,
  conflictos) y la comparación con la estructura objetivo. Lo usan la web y la
  API, para que el resultado sea el mismo en los dos sitios. Los ids de commit
  son deterministas (`c1`, `c2`; las copias de un rebase, `c2'`), como en
  *Learn Git Branching*: así dos caminos distintos que llegan a lo mismo dan lo
  mismo.
- `modules/gitcourse` (API): progreso, test previo, salas de grupo y jefe final.
- **Pruebas de grupo** (`packages/gitsim/src/levels/groups.ts` y
  `modules/gitcourse/rooms.ts`): con varias personas el orden de los merges
  cambia la historia, así que no se compara una forma exacta: cada prueba
  tiene **misiones** que se miran sobre origin (qué ficheros hay en la punta
  de cada rama, qué tags y dónde están, de quién son los commits por su
  prefijo). Cada misión se mira **por persona**: todas hacen todas las
  tareas, así que nadie supera la prueba sin haber usado cada concepto con
  sus manos (las tareas llevan `{login}` y `{n}`, el número de cada cual en la
  sala, para que los nombres no choquen). Los comandos se ejecutan en el
  servidor: cada cual tiene su repositorio y todos el mismo origin, así que
  un push de otra persona se nota al momento (rechazos, conflictos). Cada
  persona tiene un prefijo de ids (`a`, `b`, `d`…) y la copia de un commit
  ajeno (rebase, cherry-pick) lleva un id propio, para que dos no inventen el
  mismo. Para el GitHub flow, la terminal tiene `gh pr merge rama [base]`: un
  commit de merge en origin aunque la rama esté protegida, y se niega si hay
  conflictos.
  - Grupo 1: cada cual su rama con su fichero, la sube y la une en main con
    `merge --no-ff`; quien llega tarde tiene que traer main (pull) para subir.
  - Grupo 2: main protegida; cada cual se apunta en `equipo.txt` desde su rama.
    Cuando ya habéis clonado, la «compañera» cambia ese final en main, así que
    a todas les choca el pull request: cada cual trae main, resuelve y vuelve.
  - Grupo 3: Gitflow entero para cada cual: su funcionalidad en develop, su
    hotfix `1.0.{n}` desde main y su versión `1.{n}` desde develop, con tags
    en main y unidas de vuelta en develop.
  - Jefe final (30 min): main protegida con un commit roto por persona
    («Rompe {n}»). Cada cual lo deshace con `revert` por pull request, mete su
    funcionalidad en develop en un solo commit (`reset --soft`) y encima de lo
    último (`rebase`, sin merges), y cuando todo está en develop y main
    arreglada, la une a main y publica `v2.{n}`. Puestos de clústeres
    distintos o a 4 filas y 4 columnas (se mira al empezar y en cada comando)
    y solo se ve lo que escribe cada cual.
- `features/gitcourse` (web): el camino, la animación, la teoría y la terminal.

## Estado

- [x] Fase 1: el motor (`packages/gitsim`) con sus tests.
- [x] Fase 2: los 30 puntos de los mundos 0 a 5 (`packages/gitsim/src/levels`),
  el camino, la animación, la teoría y la terminal en la web, y el progreso en
  la API (`modules/gitcourse`, tabla `git_progress`), que vuelve a ejecutar
  los comandos y exige puesto en el clúster. Cada punto se monta solo con
  comandos (`start`, y en los de remoto lo que hace una compañera antes y
  después de que clones) y su objetivo sale de ejecutar la solución: así el
  objetivo nunca se desfasa del motor. Un test comprueba que todas las
  soluciones llegan y que ningún punto empieza ya resuelto. La teoría de los
  puntos está solo en castellano (como el banco de preguntas).
- [x] Fase 3: 23 conceptos de git en el banco de Not-games (`bank/git.ts`,
  con su Repaso), que también salen en las partidas normales, y el test previo
  a cada prueba de grupo (8 preguntas, 100 %, una hora de espera si se falla).
  La estrella de la prueba en el camino se abre al acabar su mundo.
- [x] Fase 4: las tres pruebas de grupo: salas (una hora para la misión,
  hasta 6 personas, papel por orden de llegada), origin común, misiones y la
  prueba superada para todo el grupo. En la API de mentira, las compañeras
  entran solas y hacen su parte.
- [x] Fase 5: el jefe final, y las pruebas de grupo rehechas para que todas
  las personas usen todos los conceptos (misiones por persona).
- [x] Fase 6: demostración animada (`GitCourseTour`, junto a la frase del
  curso) y repaso de la documentación.
