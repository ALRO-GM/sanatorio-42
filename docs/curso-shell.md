# Curso de shell de Linux

Un curso para manejarse en la shell de un servidor Linux, de lo más básico a
lo que se hace en una guardia de verdad. Sigue la
[plantilla de cursos](plantilla-cursos.md): cada conocimiento tiene **teoría,
ejemplo y prueba**, cada bloque acaba en un **jefe contrarreloj** y cada nivel
en un **jefe final** que da su certificado (principiante, intermedio,
avanzado). Está en Not-games, pestaña «Curso de shell» (`#/notgames/shell`),
y los certificados salen también en el perfil.

La investigación de la que sale (cursos que ya existen y qué se usa en el
trabajo, con sus fuentes) está en
[curso-shell-investigacion.md](curso-shell-investigacion.md).

## De la investigación al curso

- **Validar por el estado final**, como LFCS y RHCSA: lo que cuenta es cómo
  queda la máquina (ficheros, permisos, servicios, procesos, crontab), no las
  órdenes exactas. Para las respuestas («¿qué IP ataca?») se mira la salida,
  como Command Challenge; y si una respuesta se podría escribir a mano, la
  unidad exige usar la herramienta (`requires`).
- **Jefes como SadServers**: un servidor roto, una historia, un reloj y unas
  tareas; se comprueba solo, sin intervención.
- **Orden de Linux Journey y de la Upskill Challenge**: moverse, ficheros,
  permisos, texto, procesos, paquetes, servicios, red, guiones.
- **Lo que de verdad se usa** (foros, encuesta de Stack Overflow, ofertas):
  `grep | sort | uniq -c | sort -rn | head` como pieza central, `tail`, `less`,
  `find`, `du`/`df`, `ps`/`kill`, `systemctl`/`journalctl`, `ssh`/`scp`/`rsync`,
  `curl`, `cron` y guiones con `set -euo pipefail`. La lista de 60 segundos de
  Netflix (Brendan Gregg) inspira los jefes de incidentes.

## Los niveles

El mundo es siempre el mismo: dos servidores de una empresa pequeña, `web1`
(nginx delante de la API de Node, cron, ssh) y `db1` (PostgreSQL y copias).
Entras como `peer`, con sudo. Cada unidad parte de ese mundo y lo prepara a su
manera (un fichero oculto, un proceso desbocado, un servicio roto).

### Principiante: moverse y tocar sin romper

| Bloque | Unidades (qué valida su prueba) | Jefe (límite) |
| --- | --- | --- |
| 1. Orientarte en el servidor | `pwd`/`ls` (listar una carpeta) · `cd` y rutas (acabar en una carpeta) · ocultos y `cat` (leer un fichero oculto) · `head`/`tail`/`wc`/`less` (las 5 últimas líneas de un registro) | Primer día de on-call: seguir pistas ocultas hasta los registros de nginx (3 min) |
| 2. Ficheros y carpetas | `mkdir`/`touch` (una estructura de despliegue) · `cp`/`mv` (copia de seguridad y renombrar) · `rm` (borrar lo que sobra y no lo demás) · `echo`, `>`, `>>` (un fichero de dos líneas) · comodines y llaves (mover y borrar por patrón) | La release v2: instalar, limpiar y marcar la versión (4 min) |
| 3. Permisos y usuarios | `ls -l` e `id` (leer permisos y grupos) · `chmod` (ejecutable y secreto) · `sudo` y `chown -R` · `useradd`/`usermod -aG` | Llega el equipo de ops: grupo, persona, carpeta compartida y permisos (5 min) |
| **Jefe final** | Tu primer encargo en solitario: todo lo anterior junto | 10 min |

### Intermedio: que los registros hablen

| Bloque | Unidades | Jefe |
| --- | --- | --- |
| 4. Texto y tuberías | `\|` y `wc` · `grep` · `cut`/`tr` · `sort`/`uniq -c` (el «top 3» de IPs) · `sed -i` · `awk` (sumar una columna con condición) | Alguien llama a la puerta del ssh: atacante, número de fallos y usuarios probados desde `auth.log` (5 min) |
| 5. Buscar, empaquetar y disco | `find` · `-exec`/`-delete`/`xargs` (limpiar lo viejo) · `tar`/`gzip` · `du`/`df` | Disco al 97 %: vaciar un registro abierto sin borrarlo y comprimir los rotados (6 min) |
| 6. Procesos y entorno | `ps`/`top`/`pgrep` · `kill` y señales (uno no hace caso a TERM) · variables, `export` y `PATH` · `$?`, `&&` y `\|\|` | La API va a pedales: parar pruebas de carga y un minero, y anotar quién fue (5 min) |
| **Jefe final** | El informe de la mañana y la limpieza | 10 min |

### Avanzado: guiones, servicios y varias máquinas

| Bloque | Unidades | Jefe |
| --- | --- | --- |
| 7. Guiones de bash | variables, comillas y `$(…)` · `if`/`test`/`[[ ]]` · `for`/`while` · argumentos, `exit` y `set -euo pipefail` | La copia de cada noche: un guion que empaqueta con fecha (8 min) |
| 8. Servicios, registros y cron | `systemctl` (arrancar y `enable`) · `journalctl` (encontrar por qué no arranca y arreglarlo) · `cron` | Caída a las tres de la mañana: nginx y la API rotos a la vez (8 min) |
| 9. Redes y otras máquinas | `ss`/`ping`/`dig`/`curl` · `ssh`/`scp` · `rsync --delete` | La base de datos no contesta: levantar PostgreSQL en db1, traer la copia y comprobar (8 min) |
| **Jefe final** | Lunes, 9:00: web caída, disco lleno, un minero, la copia en db1 y un guion de salud programado en cron | 15 min |

En total: 37 unidades (13 de principiante, 14 de intermedio y 10 de avanzado), 9 jefes y 3 jefes finales: 49 puntos.

## Cómo se acumula

Cada unidad usa lo de antes y lo combina: las rutas del bloque 1 están en
todas las demás; las redirecciones del bloque 2 son cómo se entregan las
respuestas de los jefes (`… > ~/informe/atacante.txt`); `sudo` (bloque 3) es
lo que deja tocar servicios y registros ajenos; las tuberías del bloque 4
alimentan los bucles del 7; `find`, `tar` y `date` vuelven en los guiones de
copia; `systemctl` y `journalctl` (bloque 8) se usan otra vez en el bloque 9
y en el jefe final, que junta todo el curso. Los jefes repiten conceptos de
bloques anteriores (el jefe 6 vuelve a usar `>`; el 8, `sed` y `cp`).

## Perfiles de trabajo

Cada bloque dice en el camino qué perfiles lo usan más (sale de la
investigación):

- **Soporte / helpdesk**: bloques 1 a 3 y algo del 6 (ver qué corre).
- **Backend**: 1, 2, 4 (registros), 6 (variables, procesos) y 9 (`curl`).
- **Datos**: 1, 2, 4 (todo `grep`/`awk`/`sort`), 7 (guiones) y `cron`.
- **Seguridad / SOC**: 1, 3, 4 (`auth.log`, el jefe 4) y 9.
- **Sysadmin / SRE / DevOps / cloud**: todo; el nivel avanzado es lo que se
  pide para llevar el busca.

## Estrellas y tiempo

- **Unidades**: por comandos. Cuenta cada orden o tubería que sale bien y no
  es solo mirar (`ls`, `cat`, `pwd`, `ps`, `echo` solos no cuentan; lo que
  falla tampoco). Una tubería entera cuenta uno; un bucle, uno; `a && b`, dos.
  Las formas equivalentes valen igual (`tail -5` = `tail -n 5`,
  `mkdir -p a/{b,c}` = dos carpetas en una orden). Lo comprueba
  `apps/api/tests/unit/shellsim-equivalent.test.ts`.
- **Jefes**: por tiempo, medido por la API. Los umbrales se ven antes de
  empezar.
- **Qué se comprueba** se ve como una lista que se marca sola mientras juegas
  (ficheros, carpetas, permisos, servicios, procesos, usuarios, crontab,
  sondas de guiones, la respuesta en la terminal).
- **Los guiones se comprueban por lo que hacen**: al final se ejecutan unas
  sondas sobre una copia de tu mundo (con el fichero y sin él, con argumentos
  y sin ellos) y su salida tiene que ser la de la solución.

## Tiempo estimado

Con el modelo común (`docs/plantilla-cursos.md`, `estimateOf` en
`packages/shellsim/src/course/estimate.ts`), a 2026-10-25:

| Nivel | Bloques | Tiempo |
| --- | --- | --- |
| Principiante | 22 + 35 + 28 min, y el jefe final | ~1 h 40 min |
| Intermedio | 33 + 28 + 30 min, y el jefe final | ~1 h 46 min |
| Avanzado | 31 + 28 + 26 min, y el jefe final | ~1 h 46 min |
| **Todo el curso** | | **~5 h 12 min** |

Es un cálculo de partida: el tiempo activo real de quien supera cada punto se
guarda (`course_times`) para ajustarlo.

## Cómo está hecho

- `packages/shellsim`: la shell simulada, en TypeScript puro.
  - `parse.ts`: lo que se escribe a un árbol (tuberías, listas, `&&`/`||`,
    redirecciones, heredocs, comillas, `if`, `for`, `while`, `case`,
    funciones, `[[ ]]`, `(( ))`); si la orden está a medias, la terminal pide
    el resto con `>`.
  - `expand.ts`: llaves, tilde, variables (`${x:-y}`, `${#x}`, `${x%.log}`…),
    `$(…)`, aritmética, división en palabras y comodines.
  - `interp.ts`: el intérprete y las órdenes de la shell (`cd`, `export`,
    `read`, `set -euo pipefail`, `source`, `sudo`, `exit`…).
  - `commands/`: unos 110 programas (y unas 40 órdenes de la shell en `interp.ts`) con las opciones que se usan
    (`ls -lah`, `grep -rniEvc`, `sed -i`, `awk` con vectores y `END`, `find
    -exec`, `tar -czf`, `ps aux --sort`, `systemctl`, `journalctl -u -p
    --since`, `crontab`, `apt`, `curl`, `ssh`, `scp`, `rsync`, `jq`…) y
    errores como los de GNU.
  - `world.ts`: las dos máquinas (ficheros, usuarios, servicios con sus
    configuraciones, procesos, registro y red entre ellas). Los registros
    salen de una semilla fija.
  - `regex.ts`: expresiones regulares (BRE y ERE) con un motor propio de
    tiempo lineal (máquina de Thompson): ningún patrón lo cuelga.
  - `course/`: los bloques, las unidades (castellano e inglés) y la
    corrección (`checkAttempt`, `goalOf`, `starGoals`, `timeGoalsOf`).
- `apps/api/src/modules/shellcourse`: progreso (`shell_progress`), relojes de
  los jefes (`shell_runs`), migración 74. Ver `docs/api.md`.
- `apps/web/src/features/shellcourse`: el camino, la unidad (teoría, ejemplo
  y prueba), los jefes y la demostración animada; usa la terminal y las
  estrellas de `shared/course`.

## Protección

- **No ejecuta nada de verdad**: todo es un objeto en memoria; el paquete no
  importa `fs`, procesos, red ni `eval` (lo comprueba un test). `rm -rf /`,
  `cat /etc/shadow`, `nmap`, `python3`, `vim`… dan el mensaje que darían (o
  «command not found») y no salen del simulador.
- **Topes** (`LIMITS` en `packages/shellsim/src/limits.ts`): orden de 2000
  caracteres y 60 líneas; 300 órdenes por intento; 400 ficheros por máquina,
  12 000 caracteres por fichero y 120 000 entre todos; 80 procesos; 20 000
  caracteres de salida por orden (lo demás se corta); 1000 vueltas por bucle;
  3000 comandos y un presupuesto de trabajo por orden (cada comando, vuelta,
  paso de regex o de awk lo gasta); 12 niveles de guiones, funciones o `$(…)`
  unos dentro de otros; 600 kB de mundo. Si algo se pasa, la orden falla con
  un mensaje y el mundo queda como estaba.
- **API**: los intentos se validan con zod (300 órdenes de 2000 caracteres) y
  van a 30 por persona cada diez minutos; empezar un jefe, 20. Las estrellas y
  el tiempo los pone la API.
- A diferencia del curso de git, **no exige un puesto del clúster**: no hay
  pruebas de grupo y la trampa obvia (decir «hecho» o «tardé poco») no sirve.

## Límites conocidos

- La shell es un subconjunto: no hay editores a pantalla completa (se escribe
  con `cat > f <<'EOF'`, `echo`, `printf` o `sed -i`), ni control de trabajos
  interactivo (`fg`), ni sustitución de procesos `<(…)`, ni referencias hacia
  atrás en las expresiones regulares (`\1` en el patrón; en la sustitución de
  `sed` sí). Los programas en segundo plano (`&`) se ejecutan al momento,
  salvo `sleep`, que deja su proceso hasta que pasa su tiempo.
- `tail -f` y `journalctl -f` enseñan lo último y vuelven.
- El contenido de las unidades está en castellano e inglés; en catalán y
  euskera se ve en castellano (la interfaz sí está en los cuatro idiomas).
- Los certificados se ven en el perfil propio (no en el de otras personas).

## El camino como `tree` (2026-10-30)

Pedido por Alberto: el camino se ve como la salida de `tree` en una terminal
oscura. Los niveles son carpetas y cada bloque, un capítulo plegado
(`CourseChapter`, el mismo que los mundos del de git) con su número, de qué
trata y quién lo usa en el trabajo como comentarios (`# …`), lo hecho y el
tiempo. Desplegado, sus unidades y su jefe como ficheros. De entrada, solo el
bloque que toca; uno sin alcanzar no se despliega.
