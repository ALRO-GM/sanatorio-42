# Revisión del curso de shell (2026-11-09)

Unidad por unidad y jefe por jefe: si lo que dice la teoría (y las pistas y
las historias) es lo que hacen bash y GNU en Ubuntu, si lo que se enseña es la
forma profesional de hacerlo y si la prueba acepta las otras formas buenas
que usaría alguien de sistemas (opciones largas o cortas, en otro orden,
`sudo -i`, tuberías o redirecciones, rutas absolutas o relativas…). Las
afirmaciones se comprobaron en el motor (`packages/shellsim`) y, las del mundo
real, con las herramientas de verdad (coreutils, tar, rsync 3.2.7, mawk, bash
5.2) en una carpeta temporal.

Lo comprueban `apps/api/tests/unit/shellsim-real.test.ts` (mensajes, formato
y alternativas de cada bloque) y los tests de siempre del curso
(`shellsim*.test.ts`, `shellcourse*.test.ts`).

✔ = la prueba la acepta; ✘ = la rechaza, y por qué (todas las ✘ son
rechazos buenos: la forma no hace lo que pide la unidad).

## Cambios en el motor

| Qué | Antes | Ahora (como el de verdad) |
| --- | --- | --- |
| `chown` sin ser root | `chown: invalid group: 'peer'` (leía un grupo que no se había escrito) | `chown: changing ownership of 'X': Operation not permitted`; lo tuyo a ti o a un grupo tuyo sí se puede; con `-R`, un error por fichero y sigue |
| `chown`/`chmod` con `-Rv`, `--recursive`, `-v` | `-Rv` no era recursivo; `chmod -Rv` daba «invalid mode» | Las opciones se leen juntas o separadas; un modo malo falla antes de tocar nada; `chmod 7` vale (`007`) |
| `rsync src` frente a `src/` | Sin carpeta de destino, `rsync -a s d3` copiaba lo de dentro | Sin barra copia la carpeta (`d3/s`), con barra lo de dentro; crea el destino («created directory») |
| `rsync -n`, `-v`, `--delete` | Con `-n` listaba aunque no hubiera `-v`; no decía «deleting» en seco; listaba lo que ya estaba igual; resumen inventado | Sin `-v` no dice nada; con `-v` y `--delete` lista primero «deleting z», luego solo lo nuevo o cambiado; resumen `sent … bytes  received … bytes  … bytes/sec` y `total size is …  speedup is … (DRY RUN)`; `--delete` sin `-r` falla con el error de rsync; como usuario sin root, `-a` no conserva el dueño |
| `ps aux \| grep x` | No salía la línea del propio `grep` | Salen `ps` y lo demás de la tubería (`grep nginx`, estado `S+`), así que `grep -v grep` tiene sentido |
| `ps -o pid=`, `-p`, `-C`, `-U`, `--no-headers` | `pid=` dejaba una cabecera vacía; `-p` y `-C` no elegían procesos de fuera de tu terminal; `USER` alineado a la derecha | Como procps: sin cabecera si todas van vacías, anchuras mínimas (`PID` 7, `USER` 8 a la izquierda), `-p/-C/-u/-U` eligen; empates por PID |
| `touch` | `touch: /etc/x: Permission denied` | `touch: cannot touch '/etc/x': Permission denied` |
| `cp` a una carpeta que no existe | `cp: /home/peer/backup/x: No such file or directory` | `cp: cannot create regular file '…': No such file or directory` |
| `ls -l`, `ls -lh` | Dueño y grupo a 8 columnas fijas; con `-h`, `total 16` | Columnas tan anchas como la más ancha; con `-h`, `total 16K` |
| `head`, `tail`, `sort`, `sed`, `awk` sin fichero | `tail: 2: No such file or directory` | `tail: cannot open '2' for reading: …`, `sort: cannot read: x: …` (sale con 2), `sed: can't read x: …`, `awk: cannot open "x" (…)` (mawk, el de Ubuntu); varios ficheros con línea en blanco entre bloques |
| `tar` | Sin aviso con rutas absolutas; `tar -cfz` acababa en 0 | `tar: Removing leading '/' from member names`; si algo falta, «Exiting with failure status…» y código 2 |
| `find -name *.log` sin comillas (varios) | `find: unknown predicate` | `find: paths must precede expression: 'error.log'` y la pista de la comilla; `-size` cuenta también las carpetas; `-print0` |
| Errores dentro de un guion | `bash: 1: unbound variable` | `v.sh: line 3: $1: unbound variable`; en `bash -c`, `bash: line 1: …` |
| `crontab` | Cualquier fallo era «bad minute»; `3 30 * * *` se instalaba | Dice el campo («bad hour», «bad day-of-week»…) y valida rangos, listas y pasos |
| `journalctl -xeu nginx` | La `u` al final del grupo no se leía | `-xeu UNIDAD` filtra por la unidad |
| `sed -i` | Solo miraba el permiso del fichero | Necesita poder escribir en la carpeta («couldn't open temporary file … Permission denied», código 4); `\U`, `\L`, `\u`, `\l`, `\E` en el reemplazo |
| `df -h /ruta` | Siempre todos los discos | Solo el de esa ruta |
| `scp` | `scp x ~/restore/` sin la carpeta creaba un fichero `restore`; sin comodines remotos | Con la barra, la carpeta tiene que existir; `scp 'db1:/ruta/*.gz' .` lo expande la otra máquina |
| Órdenes que faltaban | — | `pushd`/`popd`/`dirs`, `su -c`, `gpasswd -a/-d`, `adduser usuario grupo`, `install`, `pidof`, `mv -t`/`cp -t`, `gzip -1…-9`, `xargs -0/-r`, `date -I`, `cd` con demasiados argumentos, `kill -l 9` |

## Cambios en la corrección (`course/build.ts`)

- **`listing`** (unidad `ls`): la salida de `ls` vale en columnas, en líneas o
  en formato largo (`ls -l`, `ls -la`), sin contar `total`, `.` ni `..`.
- **`answers`**: otras órdenes que dan la misma respuesta con otra forma y
  también valen (en `perms`, `groups deploy` e `id -Gn deploy`; en `find`, el
  mismo `find` desde `/var/log` con rutas relativas).
- **crontab por lo que hace**: `03` = `3`, `0-6` = `*`, `@daily` = `0 0 * * *`,
  `bash guion.sh` = `guion.sh`, sin `>> log 2>&1` ni líneas `MAILTO=`.
- **Sondas de guiones**: el aviso de tar con rutas absolutas no cuenta como
  salida distinta.
- **`requires`** ve también lo de dentro de las comillas invertidas
  (`` `date +%F` ``).

Ninguna unidad cambia de id, de solución ni de progresión.

## Principiante

| Unidad | Afirmaciones comprobadas | Alternativas probadas | Arreglos |
| --- | --- | --- | --- |
| `ls` | `ls Notas.txt` → «ls: cannot access 'Notas.txt': No such file or directory» (sí); `ls -l` enseña permisos, dueño y tamaño | ✔ `cd /srv/peer4u && ls`, `ls /srv/peer4u/`, `ls -1`, `ls -A`, `ls -l`, `ls -la`; ✘ `man ls` (no enseña la carpeta) | `listing`: antes `ls -l` y `ls -la` no valían |
| `cd` | `cd /nginx` → «bash: cd: /nginx: No such file or directory»; `cd -` enseña la carpeta | ✔ `cd /var` + `cd log/nginx`, `cd ../../var/log/nginx`, `pushd /var/log/nginx` | `pushd`/`popd`/`dirs`; `cd a b` → «too many arguments» |
| `hidden` | `ls` sin los que empiezan por punto; `cat proyectos` → «cat: proyectos: Is a directory» | ✔ `ls -a` + `cat`, `cd` + `cat .env.example`, `less`, `head -n 50`, `cat /srv/peer4u/.env*` | — |
| `read` | `tail 5 app.log` toma 5 por fichero y enseña 10 líneas | ✔ `tail -5`, `tail -n5`, `--lines=5`, `cd` + relativa, `cat … \| tail -n 5`, `tail -n 5 < app.log`; ✘ `less` y `cat` (todo el fichero), `head 2` | Mensaje de `head`/`tail` con fichero que no existe |
| `boss1` | — | ✔ `tail -3`, ruta absoluta desde la carpeta, `cat ONCALL.txt` relativo | — |
| `mkdir` | `mkdir pruebas/a` → «cannot create directory 'pruebas/a': No such file or directory»; `touch` no vacía | ✔ llaves, paso a paso con `cd`, `> fichero`, `--parents` | Mensaje de `touch` |
| `cp-mv` | `cp proyectos copia` → «cp: -r not specified; omitting directory 'proyectos'» | ✔ `mkdir -p`, `cp` a la carpeta y `mv` después, `cp -pv`, `mv -v`; ✘ sin crear `~/backup` | Mensaje de `cp` («cannot create regular file») |
| `rm` | `rm proyectos` → «Is a directory»; `rmdir` solo vacías | ✔ `rm -rf`, `rm -R`, `--recursive`, `rm *` + `rmdir`, `rm -i` | — |
| `redirect` | `>` vacía, `>>` añade, `2>` solo errores | ✔ heredoc, `printf`, `echo -e`, `tee`/`tee -a`, `{ …; } >`, comillas dobles, sin comillas | — |
| `glob` | Sin coincidencias el patrón llega tal cual; las llaves no miran el disco; `*` no ve ocultos | ✔ `cd` + relativas, `{a,b}.log`, `img?.png`, `mv -t`, `find -exec mv`/`-delete` | `mv -t` y `cp -t` |
| `boss2` | — | ✔ llaves, `cd` + relativas, `printf`, `sed -i 's/v1/v2/'` | — |
| `perms` | `/etc/shadow` es `-rw-r-----` root:shadow; `cat` → «Permission denied» | ✔ `stat` o `ls -la` + `id deploy`, `groups deploy`, `id -Gn deploy`; ✘ `id` (es el tuyo, no el de deploy) | `answers`; columnas de `ls -l` alineadas |
| `chmod` | `./scripts/backup.sh` sin x → «bash: ./scripts/backup.sh: Permission denied» | ✔ `u+x,go+rx`, `a+x`, `u=rwx,go=rx`, `+x`, `0600`, `go=`, `og-r`, `-v`, `--verbose`; ✘ `chmod 755 /etc/hosts` (no es tuyo) | `-Rv`; `chmod 999` → «invalid mode» antes de tocar nada |
| `chown` | Solo root regala ficheros; sin `-R` solo cambia la carpeta | ✔ `sudo chown -R`, `deploy.www-data`, `--recursive`, `-Rv`, `chown` + `chgrp`, `sudo -i`, `sudo su`, `sudo su -c '…'`, `sudo bash -c`, `sudo find … -exec chown`; ✘ sin sudo («Operation not permitted», un error por fichero) | Mensaje sin sudo; `su -c` |
| `users` | `usermod -G` sin `-a` sustituye los grupos | ✔ opciones largas, `-a -G`, `-G … -a`, `gpasswd -a`, `adduser mgarcia www-data`, `-s /bin/bash`; ✘ sin sudo | `gpasswd`, `adduser usuario grupo` |
| `boss3` | — | ✔ `install -d -m 770 -g ops`, `install -m 640 -o root -g ops`, `gpasswd -a peer ops`, todo dentro de `sudo -i` | `install`, `gpasswd` |
| `final-beginner` | — | ✔ llaves, `chmod u+x,g+rx,o=`, `tail -2`, `sudo tail` | — |

## Intermedio

| Unidad | Afirmaciones comprobadas | Alternativas probadas | Arreglos |
| --- | --- | --- | --- |
| `pipes` | `wc -l fichero` lleva el nombre; `wc -l < fichero`, solo el número | ✔ `cat … \| wc -l`, `grep -c ''`, `awk 'END {print NR}'`, `wc -l f \| cut -d' ' -f1`, `\| awk '{print $1}'`, `--lines`, `sed -n '$='` | — |
| `grep` | `grep -c error` → 0 con el registro lleno de ERROR | ✔ `cat \| grep`, `-w`, `-E`, `-F`, `-e`, `--color=auto`, `awk '/ERROR/'`, relativa | — |
| `cut-tr` | Sin `-d`, `cut -f1 /etc/passwd` enseña la línea entera | ✔ `awk -F: '{print toupper($1)}'`, `[:lower:]`, `'[a-z]'`, `tr` antes de `cut`, opciones largas, `sed 's/.*/\U&/'` | `\U` en `sed` |
| `sort-uniq` | `uniq -c` sin `sort` repite «200» | ✔ `awk` + `sort -nr`, vector de `awk` (la comparación no mira los espacios), `sort -k1,1nr`, `head -3` | La teoría decía «tres líneas más abajo»: son cuatro (es, en, fr) |
| `sed` | `sed … f > f` deja el fichero vacío (`wc -c` → 0) | ✔ `s/info/debug/`, `/LOG_LEVEL/s/…/`, `s/^LOG_LEVEL=.*/…/`, `-i.bak`, `s\|…\|…\|g`, `--in-place`, `-E` con `\1`, a otro fichero y `mv` | `sed -i` mira el permiso de la carpeta |
| `awk` | `awk "{print $1}"` → la línea entera (la shell cambia `$1`) | ✔ sin espacios, `if`, `$9 == "200"`, `grep` + `awk`, `paste -sd+ \| bc`, `printf "%d"`, `-v code=200` | Mensaje de `awk` (mawk) sin fichero |
| `boss4` | — | ✔ `grep -oE` de la IP, `grep \| wc -l`, `grep -o 'invalid user …'`, `$(NF-3)`, `sed -E` con grupos, `sort \| uniq` | — |
| `find` | `find . -name *.log` en /var/log solo encuentra `./auth.log` (la shell lo cambió antes) | ✔ `-type f`, otro orden, `sudo`, `/var/log/`, `-iname`, `cd /var/log` + `find .` | `answers` (rutas relativas); mensaje de GNU con varios nombres; `-size` en carpetas |
| `find-exec` | `-mtime +7` lista también `keep.dat` y la carpeta; `-exec … \;` una vez por fichero | ✔ `-exec rm {} \;`, `-exec rm -f {} +`, `\| xargs rm`, `-print0 \| xargs -0`, `-type f -delete`, `cd` + `find .`, `-ok` | `-print0`, `xargs -0` y `-r` |
| `tar` | `tar -cfz notas.tar.gz notas.txt` toma `z` por nombre y responde «Cannot stat» | ✔ opciones largas, `-C /etc nginx`, `cd /etc` + `czf`, `-zcvf`, `sudo tar`, `tar -cf` + `gzip` | Aviso de la barra; código 2 y «Exiting with failure status» |
| `du-df` | `sort` a secas pone 8.0K detrás de 36K; `sort -h` no | ✔ `sort -rh \| head -1`, `xargs basename`, `--max-depth=1`, `cut -f2`; ✘ `ls -S` (pide `du`) | `df -h /ruta` |
| `boss5` | `truncate -s 0` vacía sin borrar | ✔ `sudo sh -c '> …'`, `: \| sudo tee`, `sudo cp /dev/null`, `--size=0`, `gzip access.log.[12]`, `gzip -9`, `find -exec gzip`; ✘ `sudo echo > fichero` («Permission denied»: la redirección la hace tu shell) | `gzip -1…-9` |
| `ps` | `ps` a secas: «bash» y el propio «ps» | ✔ `pgrep -f miner`, `awk 'NR==2'`, `ps -C python3 -o pid=`, `pidof python3`, número escrito a mano tras mirarlo; ✘ `pgrep miner.py` sin `-f` (el nombre del proceso es `python3`, como en Linux) | `ps` con su propia línea y la del resto de la tubería; `-o pid=`; `pidof` |
| `kill` | `kill 5003` (de deploy) → «bash: kill: (5003) - Operation not permitted» | ✔ `kill $(pgrep yes)`, `killall`, `pkill -KILL`, `-SIGKILL`, `kill -s KILL`, `kill -9` con los PID | `kill -l 9` → `KILL` |
| `env` | `NOMBRE = peer` → «bash: NOMBRE: command not found»; sin `export` la hija no la ve | ✔ `export` aparte, `PATH=$PATH:~/bin`, delante del PATH, `declare -x`, `VAR=x hola` + `export` | — |
| `exit-codes` | `ls /nada` sale con 2; `a && b \|\| c` no es un si-no | ✔ `[ ]`, `[[ ]]`, `ls`, en una línea con `;`, `! test` | — |
| `boss6` | — | ✔ `ps -o user= -p $(pgrep -f miner.py)`, `killall`, `pgrep -c -u deploy`, `ps -u deploy --no-headers \| wc -l`, `ps -U deploy -o pid= \| wc -l`; ✘ `ps -u deploy \| wc -l` (cuenta la cabecera) y `ps aux \| grep deploy \| wc -l` (cuenta el propio grep), como en Linux | `-U`, `--no-headers`, `-p` |
| `final-intermediate` | — | ✔ `cut -f7`, `awk '$9 ~ /^5/'`, `tar -C ~`, `-exec rm {} +`, `pkill -x`, `sed 's/^LOG_LEVEL=.*/…/'`; ✘ el «top» con `awk` en vez de `uniq -c` (otro formato en el fichero, y la tarea pide `sort \| uniq -c \| sort -rn`) | — |

## Avanzado

| Unidad | Afirmaciones comprobadas | Alternativas probadas | Arreglos |
| --- | --- | --- | --- |
| `vars` | `ls -l $f` con espacios → dos «cannot access»; simples no expanden | ✔ variable, `` `date +%F` ``, `date +%Y-%m-%d`, `${d}`, `date -I`; también la fecha escrita a mano si antes se usó `date` (el `requires` lo pide) | `requires` mira las comillas invertidas; `date -I` |
| `if` | `[-f /etc/hosts]` → «bash: [-f: command not found» | ✔ `test`, `[[ ]]`, `&& { …; }`, `if [ ! -f ]`, `-e`, dos `echo >>`; ✘ `-r` (peer no puede leer app.env: diría «falta») | — |
| `loops` | Sin coincidencias, `for` da una vuelta con el patrón | ✔ `cd` + `*.conf`, `find -exec cp {} {}.bak`, `xargs -I{}`, `while read`, en varias líneas, a mano | — |
| `script-args` | Con `set -u`, `$1` sin argumento para con «unbound variable» | ✔ `-z "${1:-}"`, `[[ $# -eq 0 ]]`, `#!/usr/bin/env bash`, `chmod 755`; ✘ `${1:?}` (otro mensaje que el pedido), sin `chmod` (la tarea pide ejecutable) | Errores con «guion: line N:» |
| `boss7` | — | ✔ `$HOME`, `[ -d ] \|\| mkdir`, `cd ~` + relativa, ruta absoluta a `tar` (el aviso de la barra no cuenta) | Sondas sin el aviso de tar |
| `systemctl` | Sin sudo: «Interactive authentication required»; `start` sin `enable` → `is-enabled` dice disabled | ✔ `start` + `enable`, `nginx.service`, `service nginx start` + `enable`, `enable nginx --now`, `sudo -i` | — |
| `journal` | La última línea dice que falló, la de antes por qué | ✔ `--no-pager \| tail`, `-p err`, `-xeu`, `s/^PORT=.*/…/`, `/^PORT=/c\PORT=3000`, `restart`; ✘ `tee -a` (deja `PORT=` y `PORT=3000`), `sudo -u deploy sed -i` (sed -i necesita escribir en /etc/peer4u) | `-xeu`; `sed -i` y la carpeta |
| `cron` | Dos `crontab -` seguidos: queda solo la última tabla; cron no lee `.bashrc` | ✔ `\| crontab -`, `(crontab -l; echo …) \| crontab -`, `30 03`, `bash /ruta`, `>> log 2>&1`, `~/backup.sh`, `MAILTO=""`, `0-6`; ✘ `3 30 * * *` («bad hour») y con un campo de menos | Comparación por lo que hace; mensajes de cron |
| `boss8` | `nginx -t` dice qué falla | ✔ `systemctl --failed`, `nginx -t && restart`, `start nginx peer4u-api`, `reload-or-restart`, `curl -i`, `127.0.0.1`; ✘ `s/PORT=/PORT=3000/` (cambia también `DB_PORT`) | — |
| `curl` | `curl localhost:8080` → «curl: (7) Failed to connect … Couldn't connect to server» | ✔ `-so`, `> fichero`, `wget -qO`, sin `http://`, `-fsS`, `\| tee`, `--silent --output`, `127.0.0.1`; ✘ `\| jq .` (cambia el texto), `:3000/api/health` (nginx quita `/api/` antes de pasarlo) | — |
| `ssh` | En web1, `ls /var/backups/db` → «cannot access» | ✔ `ssh db1 ls -lt`, `rsync -av db1:…`, `peer@db1:`, `scp 'db1:…/*.sql.gz'`, sesión con `ssh db1` y `exit`; ✘ sin crear `~/restore` («dest open … No such file or directory») | Comodines remotos en `scp`; destino con barra que no existe |
| `rsync` | Sin `--delete`, lo que sobra se queda | ✔ `-avz` y `peer@db1:espejo/`, `db1:~/espejo/`, `-r`, opciones largas, `-n` y luego de verdad, borrar y `scp` a mano; ✘ `html/*` (con ficheros sueltos `--delete` no borra) y `html` sin barra (deja `espejo/html`) | Ver «Cambios en el motor» |
| `boss9` | — | ✔ `ssh db1 sudo systemctl start`, sesión, `rsync -a` en vez de `scp`, `curl > fichero`; ✘ sin sudo en db1 | — |
| `final-advanced` | — | ✔ `kill -9 $(pgrep …)`, `sudo sh -c ': > …'`, `curl … && echo ok \|\| { …; }`, cron con `>/dev/null 2>&1` o `~/`, `rsync -a db1:…` | — |

## Lo que se queda distinto a propósito

- **Orden de `ls`**: como `en_US.UTF-8` sin distinguir mayúsculas, pero con los
  ocultos delante (`ls -a` enseña `.bashrc` antes que `notas.txt`). En
  `en_US` irían mezclados (`notas.txt  proyectos  .secreto`) y en `C.UTF-8`,
  las mayúsculas primero. Se deja así porque es lo que se lee mejor en el
  curso y ninguna unidad depende de ello.
- **Datos binarios**: `cat` de un `.gz` enseña «(datos comprimidos: usa zcat…)»
  en vez de basura, y `wc -c` cuenta el texto guardado, no el tamaño que dice
  tener el fichero (`ls -l`, `du` y `df` sí lo usan). Por eso
  `ssh db1 'cat x.gz' > x.gz` no trae la copia (en Linux sí); `scp` y `rsync`
  sí.
- **`sh -c`** es bash (en Ubuntu, `sh` es dash y diría `sh: 1: nada: not
  found`).
- **`kill -l`** enseña solo las señales del curso, no las 64.
- **El mensaje de `scp`** cuando falta la carpeta de destino es aproximado: el
  de OpenSSH cambia según la versión y el modo (SFTP o el antiguo).
- **`stat`** tiene un formato corto (sin `Blocks`, `Device` ni `Access:` de
  fecha).
- **Comparación de ficheros**: el contenido tiene que ser igual, espacios
  incluidos. Un «top» hecho con `awk` en vez de `uniq -c` da otro formato y
  no vale en `final-intermediate`, cuya tarea nombra la tubería.
