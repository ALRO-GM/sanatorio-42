# Revisión del curso de git (2026-11-09)

Pedido por Alberto: confirmar, punto por punto, que lo que dice cada nivel es
como funciona git de verdad, que el flujo que enseña es el profesional y que
no se bloquean alternativas válidas. Motor: `packages/gitsim`. El
funcionamiento nuevo (mensajes de git en inglés, commits sin cambios que se
niegan, cambios que viajan al cambiar de rama, upstream, `pull` que pide
elegir…) y lo que el simulador hace distinto a sabiendas están en
[curso-git.md](../curso-git.md) («Habla y se porta como git»).

Cómo se ha comprobado:

- **Lo que dice la teoría**: `apps/api/tests/unit/gitcourse-claims.test.ts`
  reproduce en el motor el error típico y las salidas que cita cada punto y
  exige que salgan tal cual. Los mensajes se han contrastado con git 2.43 de
  memoria: el agente que hizo la revisión trabajaba aislado en su worktree y no
  pudo crear repositorios de prueba fuera de él (queda pendiente pasarlos por
  un git de verdad, ver «Pendiente»).
- **Alternativas**: `apps/api/tests/unit/gitsim-equivalent.test.ts` resuelve
  cada punto con varias formas (todas con tres estrellas) y prueba las que no
  valen, con su porqué.
- **El motor**: `apps/api/tests/unit/gitsim.test.ts` (una prueba por
  comportamiento de git) y las pruebas de grupo jugadas de principio a fin en
  `gitgroups.test.ts`, `gitcourse.test.ts` y `apps/web/tests/gitrooms-mock.test.ts`.

## Arreglos del motor

| Antes | Ahora (como git) |
| --- | --- |
| `git log rama` ignoraba la rama | `git log rama`, `a..b`, `^a`, `-n` |
| `git log --all` no enseñaba `origin/main` tras un fetch | `--all` recorre ramas, ramas de origin, tags y HEAD |
| Un commit sin nada preparado hacía un commit vacío | Se niega («nothing to commit…», «no changes added…», «nothing added… untracked»); `--allow-empty` vale |
| «Bajados 1 commits de origin» | `From github.com:equipo/repo.git` y `   c1..c3  main -> origin/main` |
| Cambiar de rama con cambios sin commit se negaba siempre | Se los lleva (`M  f.c`) salvo que choquen con la otra rama |
| Mensajes en castellano y a la medida | Los de git 2.4x en inglés; lo del simulador, `peer4u-sandbox:` en castellano |
| `git switch c3` separaba HEAD | Pide `--detach` («a branch is expected, got commit») |
| `git push` a secas subía cualquier rama | Sin upstream se niega y dice `--set-upstream`; `-u`, `branch -u`, `push.autoSetupRemote` |
| `git pull` con ramas separadas hacía merge | Pide elegir (`--rebase`, `--no-rebase`, `--ff-only`, `git config pull.*`) |
| push rechazado: un único mensaje | `fetch first` / `non-fast-forward` / `stale info` / GH006 de GitHub |
| `fetch` borraba las ramas de origin que ya no estaban | Solo con `--prune` |
| Conflicto: el commit miraba si quedaban marcas | `git add` lo da por resuelto (como git); sin add, «unmerged files» |
| `stash` guardaba también lo no seguido y `pop` exigía la carpeta limpia | Guarda lo seguido (`-u` para lo demás); `pop` une con lo que tengas y se niega solo si choca |
| merge, rebase, cherry-pick y revert exigían la carpeta limpia | Como git: merge/cherry-pick/revert dejan tus cambios donde no tocan; rebase pide limpio |
| `reset --hard` borraba lo no seguido | Lo deja |
| `git commit f` aceptaba un fichero nuevo | Solo ficheros que git sigue («pathspec did not match») |
| Mensajes de merge «Merge feature», revert «Revert «x»» | «Merge branch 'feature'», «Merge remote-tracking branch…», `Revert "x"` |
| rebase copiaba también lo que ya estaba arriba | Lo salta («patch contents already upstream») |
| Al volver de un HEAD separado no avisaba | «you are leaving 1 commit behind» / «Previous HEAD position was…» |
| `diff`/`show` en una línea por fichero | Diff unificado; `status -s`, `--stat`, `--name-only` |

## Punto por punto

Columnas: lo que dice el punto y se ha comprobado; alternativas que valen (✓)
y que no (✗, con el porqué, que es el de git); y qué se ha cambiado. Los ids
no cambian.

| Punto | Comprobado | Alternativas | Cambios |
| --- | --- | --- | --- |
| `w0-commit` | Un commit guarda lo preparado; sin nada preparado, «nothing to commit, working tree clean» | ✓ `--message`, `-m"…"`, `commit` sin `-m`, `commit -am` | Antes pedía dos commits de la nada (commits vacíos): ahora el Makefile empieza preparado y se guarda en un commit (de 2 comandos a 1) |
| `w0-add` | `hola.c` sale en «Untracked files»; sin add, «nothing added to commit but untracked files present» | ✓ `add .`, `-A`, `--all`, `*`, `*.c`, `./hola.c`, `-v`; ✗ `commit -m x hola.c` (git no confirma por nombre un fichero que no sigue) | Teoría: el commit sin add ya no «sale sin hola.c», no sale |
| `w0-status` | «Changes not staged for commit» → «Changes to be committed» | ✓ `commit -m x libft.h` (solo ese), `add .` + `restore --staged`/`reset HEAD`/`reset`/`reset --` main.c, `status -s` | Citas en inglés |
| `w0-world` | `-a` no añade ficheros nuevos («nothing added…») | ✓ `add .`/`-A`/`--all`, `commit -a -m`, `--message` | Teoría: con -a y fichero nuevo, git no hace commit |
| `w1-branch` | «On branch main» tras `git branch` sin cambiarse | ✓ `checkout -b`, `switch --create`, `branch` + `checkout`/`switch`, un fichero nuevo creado antes de cambiar (viaja contigo) | Commits con fichero |
| `w1-head` | Los cambios sin commit viajan al cambiar de rama (`M  README.md`) | ✓ `checkout main`, `switch -`, `checkout -`, crear el fichero antes de volver a main | Teoría: ya no «se niega»; se los lleva (y en `w4-stash` se ve cuándo se niega) |
| `w1-ff` | «Fast-forward»; desde feature, «Already up to date.» | ✓ `merge --ff-only`, `merge -m`; ✗ `merge --no-ff` (deja commit de merge) | Citas en inglés |
| `w1-merge` | «Merge made by the 'ort' strategy.»; desde feature, «Merge branch 'main' into feature» | ✓ `--no-ff`, `-m` | Mensaje de merge de git |
| `w1-delete` | `-d` sin unir: «The branch 'fix' is not fully merged.» | ✓ `--delete`, `-D`, `merge --ff-only` | Cita en inglés |
| `w1-world` | Sacar b sin volver a main la saca de a (`git log --oneline b`) | ✓ `checkout -b`, `switch -c b main` | Teoría: antes citaba «Rama b creada en c2» (git dice «Switched to a new branch 'b'», sin el commit); ahora `git log b`, que ya funciona |
| `w2-clone` | «Your branch is ahead of 'origin/main' by 1 commit.»; push «main -> main» | ✓ `clone <url>`, `push origin main`, `push -u origin main`, `push origin HEAD` | Commits con fichero |
| `w2-fetch` | fetch mueve origin/main; «behind 'origin/main' by 2 commits» | ✓ `pull`, `fetch origin` + `merge origin/main`, `fetch` + `rebase origin/main`, `pull --ff-only`, `fetch` + `merge` a secas | Cita de fetch como git |
| `w2-pull` | push «fetch first»; `pull` a secas: «Need to specify how to reconcile divergent branches» | ✓ `pull --no-rebase`, `pull --no-ff`, `git config pull.rebase false` + `pull`, `fetch` + `merge origin/main`, `pull --no-rebase origin main`; ✗ `pull` a secas | La solución pasa a `pull --no-rebase` (git ≥ 2.33 no une sin que lo digas); teoría y meta lo explican |
| `w2-branch` | `push` a secas en rama nueva: «has no upstream branch»; `-u` la deja seguida; main protegida (GH006) | ✓ `push -u`/`--set-upstream`/`origin HEAD`/`origin login`, `push.autoSetupRemote` + `push` | Enseña `push -u` (lo profesional); el error típico es el upstream |
| `w2-world` | `pull --rebase`: «Successfully rebased» | ✓ `pull -r`, `fetch` + `rebase origin/main`, `pull --rebase origin main`, `config pull.rebase true` + `pull`, `fetch` + `rebase` a secas; ✗ `pull --no-rebase` (merge), `pull` a secas (pide elegir) | Teoría al día |
| `w3-relative` | `checkout HEAD~2`: «HEAD is now at c1 uno»; `switch HEAD~2` pide `--detach`; aviso al dejar commits sueltos | ✓ `HEAD^^`, `switch --detach`/`-d`, `main~2`, `@~2`, `HEAD~1~1`, el id; ✗ `switch HEAD~2` | Antes `switch` separaba HEAD sin `--detach`; teoría con `switch --detach` y el aviso de verdad |
| `w3-amend` | Otro commit sin cambios: «nothing to commit»; con cambios, dos commits | ✓ `--amend --message`, `--amend` sin mensaje (git abriría el editor) | Teoría al día |
| `w3-cherry` | `log --oneline --all` como en la teoría; coger la punta trae c.txt | ✓ `exp^`, `-x`, el id | — |
| `w3-rebase` | Desde main: «Current branch main is up to date.» | ✓ `rebase main feature`, `checkout feature` + `rebase main` | Cita: antes decía «Avance rápido hasta c3», que no es lo que dice git |
| `w3-world` | Sin rebase, merge con commit; con rebase, «Fast-forward» | ✓ `rebase main bugfix`, `merge --ff-only`, `checkout -`, `rebase bugfix` desde main (avanza igual) | — |
| `w4-reset` | `--hard`: «HEAD is now at c1 bien» y desaparece lo de mal y peor | ✓ `HEAD^^`, el id, `main~2`, `reset`/`--mixed`/`--soft HEAD~2` (el reto mira la rama) | Teoría nombra `--mixed` |
| `w4-revert` | `Revert "ups"`; reset + push: «non-fast-forward» | ✓ `revert --no-edit`, `push origin main`/`HEAD`; ✗ `reset --hard` + `push --force` (reescribe origin) | Cita de push rechazado |
| `w4-stash` | `switch fix` se niega: «Your local changes… would be overwritten by checkout: f.c» | ✓ `stash push`/`save`, `checkout`, `stash apply`, `switch -`; ✓ commit provisional + `reset --soft HEAD~1`; ✗ cambiar sin aparcar | Con cambios que viajan, el stash ya no hacía falta: fix tiene ahora otro f.c («Avisa del fallo»), el arreglo cambia f.c y la meta lo dice |
| `w4-conflict` | «CONFLICT (content): Merge conflict in f.c»; sin add, «unmerged files» | ✓ `add .`, `commit -am`, `add -A` + `merge --continue` | Teoría: add marca resuelto y no mira las marcas |
| `w4-world` | `--hard`: «HEAD is now at c1 base» y se pierden a.c, b.c, c.c | ✓ `reset`/`--mixed HEAD~3` + `add` + commit, `--soft HEAD^^^` | Antes «(vacío)» tras ls; ahora queda README.md |
| `w5-github-flow` | Subir main: GH006 | ✓ `checkout -b`, `push -u`/`origin HEAD`/`origin api`, `pull origin main`, `fetch` + `merge --ff-only origin/main` | Enseña `push -u` |
| `w5-tag` | «tag: v1.0» en el log; repetir: «tag 'v1.0' already exists» | ✓ `tag -a -m`, `HEAD^`, `main~1`; publicar con `push origin v1.0` o `--tags` | Teoría: cómo se publica |
| `w5-release` | Sin `--no-ff`, «Fast-forward» | ✓ `checkout`, `merge --no-ff -m`, `tag -a`, tag por nombre de rama; ✗ merge sin `--no-ff` en develop (avanza rápido y no queda el merge: Gitflow pide `--no-ff`) | — |
| `w5-hotfix` | Olvidar develop: allí no está «arreglo» | ✓ `checkout`, merge normal en develop (las ramas ya se han separado) | La solución usa `--no-ff` en las dos ramas (Gitflow) |
| `w5-world` | Unir sin traer: «[rejected] main -> main (fetch first)» | ✓ `fetch` + `rebase origin/main`, `pull --ff-only` + `rebase main mini` + `merge --ff-only`, `push origin main`, `branch --delete` | — |

## Pruebas de grupo y jefe

| Prueba | Comprobado | Cambios |
| --- | --- | --- |
| Grupo 1 | Cada cual su rama, push, `merge --no-ff` en main; quien llega tarde ve «fetch first» y trae main | Tras unir su rama en local, las ramas ya están separadas: la tarea dice `git pull --no-rebase` (un `pull` a secas pediría elegir) |
| Grupo 2 | PR que choca (`gh pr merge` se niega), traer main, resolver, PR otra vez; marcas sin quitar: git deja confirmarlas, la misión no | `git pull --no-rebase origin main` en tareas, pistas y compañeras de mentira; el test que esperaba que el commit con marcas fallara ahora comprueba que la misión no se da |
| Grupo 3 | Funcionalidad, hotfix y versión con tags, en main y develop | `git pull --no-rebase` en tareas y pistas (main y develop tienen merges propios sin subir) |
| Jefe | revert por PR, `reset --soft`, `rebase origin/develop`, merge rápido, tag; push directo a main: GH006 | Sin cambios de tareas (los `pull` que quedan avanzan rápido) |

## Pendiente

- Pasar las salidas citadas por un git 2.4x de verdad (en una carpeta
  temporal) y apuntar aquí cualquier diferencia de redacción.
- El banco de preguntas de git (`bank/git.ts`) se ha revisado solo en lo que
  cita del motor (comentarios y el Repaso); sus preguntas siguen siendo
  ciertas con el motor nuevo.
