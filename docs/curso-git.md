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
- [ ] Fase 3: preguntas de git en el banco y el test previo (100 %, 1 h).
- [ ] Fase 4: pruebas de grupo.
- [ ] Fase 5: jefe final.
- [ ] Fase 6: demostración y repaso.
