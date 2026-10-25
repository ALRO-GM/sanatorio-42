# Curso de shell para Peer4U: investigación previa

> Fecha: 2026-10-25. Objetivo: decidir estructura, secuencia, validación y contenidos de un curso de shell de Linux
> dentro de Peer4U para estudiantes de 42. Cada afirmación lleva su enlace. Cuando una página no se pudo leer
> directamente y solo vimos el resumen del buscador, lo marcamos como **[resumen de búsqueda]**. Cuando una
> página devolvió error (403, 404 o bloqueo), lo decimos.

---

## Parte 1. Cursos y plataformas que ya existen

### 1.1 OverTheWire: Bandit

- **Estructura:** niveles secuenciales desde el 0. Al acabar un nivel obtienes lo necesario para entrar en el
  siguiente; cada página «Level X» explica cómo llegar a él ([Bandit](https://overthewire.org/wargames/bandit/)).
  Son 34 niveles (0 a 33), aunque las fuentes no coinciden del todo
  ([WeChall](https://www.wechall.net/en/3-levels-on-Bandit.html), [HackerDNA](https://hackerdna.com/blog/overthewire-wargames-guide)) **[resumen de búsqueda]**.
- **Secuencia:** el nivel 1 consiste en leer un fichero `readme` y entrar por SSH como `bandit1` en el puerto 2220.
  Sugiere `ls`, `cd`, `cat`, `file`, `du` y `find` ([Bandit 1](https://overthewire.org/wargames/bandit/bandit1.html)).
  Después vienen ficheros ocultos, `grep`/`sort`/`uniq`/`tr`, `xxd`, claves SSH, puertos TCP, compresión
  (`gzip`, `bzip2`, `tar`), cron, scripts de bash y git ([Carleton, tarea sobre Bandit](https://cs.carleton.edu/faculty/jondich/courses/comps_f24/assignments/01-otw-bandit.html)).
  El último nivel es un «escape» de una shell restringida ([Bandit 33](https://overthewire.org/wargames/bandit/bandit33.html)).
- **Gamificación:** la progresión es la propia contraseña. No hay puntos, aunque WeChall lleva un ranking externo.
- **Validación:** encontrar una cadena secreta (la *flag*) que abre la puerta siguiente. No se comprueba cómo la
  has encontrado, solo que la tienes.
- **Qué copiar:** la *flag* como prueba barata y a prueba de trampas si se genera por estudiante; el «necesitas
  `man` para seguir» (la página anima a usar `man`, `help` y buscar en la web); cada nivel introduce 1 o 2
  comandos nuevos.

### 1.2 Linux Journey (ahora en LabEx)

- `linuxjourney.com` redirige (301) a [labex.io/linuxjourney](https://labex.io/linuxjourney).
- **Estructura y secuencia:** tres rutas.
  1. *Grasshopper*: Getting Started, Command Line, Text-Fu, Advanced Text-Fu, User Management, Permissions,
     Processes, Packages.
  2. *Journeyman*: Devices, Filesystem, Boot, Kernel, Init, Process Utilization, Logging.
  3. *Networking Nomad*: Network Sharing, Basics, Subnetting, Routing, Config, Troubleshooting, DNS.
  Además tiene *playgrounds* (terminal en el navegador) y laboratorios de certificación, por ejemplo 58 retos
  prácticos de RHCSA ([LabEx Linux Journey](https://labex.io/linuxjourney)).
- **Validación:** la versión original tenía tests al final de cada lección. La de LabEx anuncia
  «laboratorios interactivos» pero no explica cómo comprueba el resultado.
- **Qué copiar:** el orden de *Grasshopper*: texto antes que usuarios, usuarios antes que permisos, y permisos
  antes que procesos. También dejar redes como una ruta aparte.

### 1.3 The Linux Command Line (William Shotts, linuxcommand.org)

- Libro libre de 596 páginas sobre uso básico, programas comunes y *shell scripting*
  ([TLCL](https://linuxcommand.org/tlcl.php)).
- **Secuencia de «Learning the Shell»:** qué es la shell, navegación, mirar alrededor, visita guiada al sistema
  de ficheros, manipular ficheros, trabajar con comandos, redirección de E/S, expansión, permisos y control de
  trabajos ([Learning the Shell](https://linuxcommand.org/lc3_learning_the_shell.php)). Luego hay una sección
  aparte, «Writing Shell Scripts».
- **Validación:** ninguna. Es lectura.
- **Qué copiar:** la expansión (globs, `{}`, `$()`, comillas) es una unidad propia, va antes que permisos y
  después de la redirección. Es lo que más confunde a quien empieza.

### 1.4 Linux Upskill Challenge

- **Formato:** un mes, de 1 a 2 h al día; arranca el primer lunes de cada mes. Es gratis y con licencia CC BY 4.0.
  Se trabaja sobre **un servidor propio en la nube** (el día 0 explica cómo crearlo en AWS, Oracle, etc.)
  ([Linux Upskill Challenge](https://linuxupskillchallenge.org/)).
- **Secuencia:** SSH y claves (día 1), navegación (2), sudo y hostname (3), apt (4), `less`, *dotfiles* e
  historial (5), vim (6), Apache y sus logs (7), `grep`/`cut`/`awk` y tuberías (8), puertos y ufw (9), cron y
  timers de systemd (10), `find`/`locate` (11), SFTP (12), usuarios, grupos y sudoers (13), permisos (14),
  repositorios (15), `tar`/`gzip` (16), compilar desde el código fuente (17), logrotate (18), inodos y enlaces (19),
  scripting (20).
- **Validación:** prácticamente ninguna formal. La única comprobación del día 0 es que `sudo apt update`
  funcione ([Día 0](https://linuxupskillchallenge.org/00-VPS-big/)). La motivación viene de la comunidad
  (Discord, cohortes mensuales).
- **Qué copiar:** el hilo conductor de «tu servidor», con un servicio real (Apache) cuyos logs analizas;
  las cohortes con fecha; logrotate y cron como temas propios.

### 1.5 Command Challenge (cmdchallenge.com)

- Una shell en el navegador donde escribes **una línea** que resuelve el reto ([cmdchallenge](https://cmdchallenge.com/)).
- **Ejecución:** un servidor en Go lanza bajo demanda contenedores efímeros (`cmd`, y `cmd-no-bin` sin `man`)
  para las variantes «Oops», donde faltan binarios y tienes que apañártelas con builtins. Guarda las soluciones
  correctas y las enseña después («View Solutions») ([README del repo](https://gitlab.com/jarv/cmdchallenge/-/raw/master/README.md)).
  Hay variantes temáticas: [oops](https://oops.cmdchallenge.com/) y 12days.
- **Validación:** se compara la salida con la esperada para ese reto (el README muestra la API
  `POST /c/r slug=… cmd=…`, pero no detalla el comparador. Esto último es una inferencia nuestra).
- **Qué copiar:** retos de **una línea con salida exacta** (ideal para texto: `sort | uniq -c | sort -rn`); ver
  las soluciones de otras personas *después* de resolverlo; el modo «sin binarios» para un nivel avanzado.

### 1.6 linuxzoo (Edinburgh Napier University)

- Te da una máquina Linux remota y privada **con root**: haces cola, la arrancas y entras por SSH o desde el
  navegador. Hay tutoriales para Alma (intro, rutas, búsqueda, permisos, tuberías, vi, administración, redes,
  SELinux, firewall, DNS, Apache y logs), Caine (forense) y Kali ([linuxzoo](https://linuxzoo.net/)).
- **Validación:** la portada no lo explica. Por lo que sabemos (no verificado en esta búsqueda), hay preguntas
  que se comprueban inspeccionando el estado de la máquina.
- **Qué copiar:** máquina desechable con root, y rutas temáticas separadas (por ejemplo, forense o seguridad).

### 1.7 Certificaciones: LFCS (Linux Foundation) y RHCSA (EX200)

- **LFCS:** examen práctico de 2 h, en línea y con supervisión: «resolver varios problemas desde la línea de
  comandos». Dominios: Operaciones y despliegue (25 %), Redes (25 %), Almacenamiento (20 %), Comandos
  esenciales (20 %: git, servicios, rendimiento, problemas de espacio en disco, certificados SSL) y Usuarios y
  grupos (10 %). Incluye simulador (Killer.sh) con 20 a 25 preguntas calificadas
  ([LFCS](https://training.linuxfoundation.org/certification/linux-foundation-certified-sysadmin-lfcs/)).
- **RHCSA EX200:** examen práctico sin internet ni apuntes. Objetivos: herramientas esenciales (redirección,
  grep y regex, SSH, archivos comprimidos, enlaces, permisos, documentación), *shell scripting* (condicionales,
  bucles, argumentos, salida de comandos), sistemas en marcha (procesos, logs y journal, servicios),
  almacenamiento (LVM), cron, at y timers, red, usuarios y seguridad (firewalld, SSH por clave, SELinux).
  **La configuración debe sobrevivir a un reinicio** ([EX200](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam)).
- **Validación:** scripts que inspeccionan el estado final de la máquina, a veces tras reiniciarla.
- **Qué copiar:** la corrección por **estado final** (no por los comandos tecleados); la persistencia como
  criterio («¿sigue funcionando si reinicio?»); y los pesos de cada dominio como guía del nivel avanzado.

### 1.8 MIT, The Missing Semester

- La edición de 2026 incluye «Introduction to the Shell» y «Command-line Environment»
  ([Missing Semester](https://missing.csail.mit.edu/)). Las clases de 2020 siguen siendo la referencia:
  - *Shell Tools and Scripting:* variables, comillas, `$?`, `$#`, `$@`, `&&`/`||`, sustitución de comandos y
    de procesos, `[[ ]]`, globs, `find`/`fd`, `grep`/`rg`, historial con Ctrl-R y `fzf`. Ejercicios: un `ls`
    a medida, las funciones `marco`/`polo`, repetir un comando que falla a veces hasta que falle, y comprimir
    los HTML de forma recursiva con `xargs` aguantando espacios en los nombres
    ([Shell Tools](https://missing.csail.mit.edu/2020/shell-tools/)).
  - *Data Wrangling:* `ssh … journalctl | grep` en remoto, `sed -E`, `sort | uniq -c | sort -nk1,1`, `awk`,
    `paste`, `bc`, `xargs`. Ejercicios: estadísticas de tiempos de arranque sacadas del journal, por qué
    `sed … f > f` destruye el fichero, y datos con `curl` + `jq`
    ([Data Wrangling](https://missing.csail.mit.edu/2020/data-wrangling/)).
  - *Command-line Environment:* señales (SIGINT, SIGTERM, SIGKILL, SIGTSTP), `jobs`/`fg`/`bg`/`nohup`, tmux,
    alias, *dotfiles*, SSH (claves, `~/.ssh/config`, túneles `-L`, `rsync`). Ejercicios: `pgrep`/`pkill`,
    `kill -0`, endurecer `sshd_config` ([Command-line Environment](https://missing.csail.mit.edu/2020/command-line/)).
- **Validación:** ejercicios abiertos, sin corrección automática.
- **Qué copiar:** enfocar los datos como un problema («tienes un log de 1 GB, ¿cuál es el top 10?») y los
  ejercicios con trampa (`sed f > f`).

### 1.9 explainshell

- Pegas una línea de comandos y relaciona cada argumento con su ayuda, sacada de las páginas `man` (puedes
  elegir distribución). Ejemplos: `tar xzvf`, `find . -type f -print0`, `cut -d ' ' -f 1 … | uniq -c | sort -n`
  ([explainshell](https://explainshell.com/)).
- **Qué copiar:** un botón «explícame esta línea» en las soluciones y en los errores. Sirve para leer
  comandos, no para escribirlos.

### 1.10 SadServers

- Escenarios de **servidor roto**, con tiempo límite (normalmente de 10 a 60 min) y de tres tipos: *Fix*
  (repara), *Do* (haz una tarea) y *Hack* (tipo CTF). La corrección la hace un botón «Check My Solution» que
  ejecuta `/home/admin/agent/check.sh`, un script que **puedes leer** ([SadServers](https://sadservers.com/scenarios)).
- Ejemplos: «Saint John», un programa desbocado llena un log y hay que pararlo **sin borrar el log**
  (Fácil, 10 min); «Saskatoon», la IP con más peticiones en un `access.log` (Fácil, 15 min); «Bucharest»,
  arreglar la autenticación de Postgres de forma que aguante un reinicio; «Kampot», servir en el 80 una app
  fijada al 20280. Incluso tiene escenarios vinculados al Linux Upskill Challenge.
- **Qué copiar:** casi todo. Es el modelo de los «bosses»: escenario con tiempo, comprobación por estado,
  script de comprobación a la vista y separación entre *Fix* y *Do*.

### 1.11 Juegos: Terminus y Bashcrawl

- **Terminus** (estudiantes del MIT; ganador del iCampus Prize de 2013): aventura de texto en la que `cd` sirve
  para moverse, `ls` para mirar y `less` para examinar objetos ([iCampus Prize](https://icampusprize.mit.edu/?p=1102)).
- **Bashcrawl:** los directorios son salas y los ficheros, pergaminos o monstruos. Empiezas con `ls`/`cd`/`cat`
  y luego aparecen `export` y `echo` ([tutorial de Galaxy](https://training.galaxyproject.org/training-material/topics/data-science/tutorials/cli-bashcrawl/tutorial.html)).
- **Qué copiar:** el árbol de directorios como mapa para la primera hora, con un tono narrativo que encaja
  con el tema «Sanatorio».

### 1.12 Exercism, ruta de Bash

- 97 ejercicios, mentoría voluntaria (807 mentores) y «análisis automático» del código
  ([Exercism Bash](https://exercism.org/tracks/bash)). Los tests usan `bats` (lo sabemos por experiencia previa;
  la página no lo menciona).
- **Qué copiar:** tests unitarios para el bloque de scripting y revisión entre pares, que en 42 ya es cultura.

### 1.13 Tabla de síntesis

| Plataforma | Formato | Secuencia | Validación | Gamificación | Lo que nos llevamos |
|---|---|---|---|---|---|
| Bandit | Wargame por SSH | Ficheros, texto, SSH, red, cron, git | *Flag*/contraseña | Niveles y ranking externo | *Flags* por estudiante, `man` obligatorio |
| Linux Journey | Lecciones y labs | Texto, usuarios, permisos, procesos, paquetes | Quiz y labs | Rutas | Orden de *Grasshopper* |
| TLCL | Libro | Navegar, redirigir, expandir, permisos, jobs | Ninguna | Ninguna | Unidad propia de expansión |
| Upskill Challenge | 21 días, servidor propio | SSH, apt, logs, texto, cron, permisos | Casi ninguna | Cohortes mensuales | Hilo «tu servidor», cohortes |
| cmdchallenge | One-liners en el navegador | Por dificultad | Salida exacta | Ver soluciones ajenas | Retos de salida exacta, modo sin binarios |
| linuxzoo | VM remota con root | Por tema | Inspección de estado (probable) | Ninguna | VM desechable con root |
| LFCS / RHCSA | Examen práctico | Por dominios | Estado final y reinicio | Certificado | Corrección por estado y persistencia |
| Missing Semester | Clases y ejercicios | Shell, herramientas, datos, entorno | Ninguna | Ninguna | Problemas de datos reales |
| explainshell | Herramienta | No aplica | No aplica | No aplica | Botón «explícame» |
| SadServers | Escenarios rotos | Fácil y Medio | `check.sh` visible | Contra reloj | Modelo de boss |
| Terminus / Bashcrawl | Aventura de texto | `ls`, `cd`, `cat` | Avanzar en la historia | Narrativa | Mapa narrativo inicial |
| Exercism | Ejercicios con tests | Por conceptos | Tests y mentoría | Insignias | `bats` y revisión entre pares |

### 1.14 Lecciones para nuestro curso

1. **Tres tipos de validación, cada uno en su sitio:** salida exacta para el texto (cmdchallenge), *flag* para
   la exploración (Bandit) y estado final comprobado por script para la administración (SadServers, RHCSA).
2. **Validar el resultado, no los comandos.** Hay muchas formas correctas de resolverlo y está bien enseñar
   después las soluciones de otras personas.
3. **Script de comprobación a la vista** (como el `check.sh` de SadServers). Es transparente y enseña a
   verificar tu propio trabajo.
4. **Hilo conductor:** «tu servidor» (Upskill) con un servicio y logs reales que crecen de unidad en unidad.
5. **Persistencia como criterio avanzado** (RHCSA): servicios habilitados, cron instalado y permisos que
   aguantan un reinicio.
6. **Tiempo límite solo en los bosses**, no en las lecciones.
7. **`man` y `--help` desde el primer día:** en Bandit y RHCSA la documentación local es la única ayuda.

---

## Parte 2. Qué se usa de verdad en el trabajo

### 2.1 Nota sobre las fuentes

- **Reddit no se pudo leer:** `old.reddit.com` está bloqueado para nuestra herramienta y las búsquedas con
  `site:reddit.com` no devolvieron hilos de r/sysadmin, r/linuxadmin ni r/linux4noobs. Solo aparece una copia
  de un hilo de r/devops sobre perfiles junior **[resumen de búsqueda]**
  ([snapshot r/devops](https://reddit.sentinel-team.org/posts/1q7fj1b/snapshots/2026-01-09T20%3A40%3A10.78376Z)).
- **Hacker News:** no encontramos un *Ask HN* reciente sobre herramientas diarias. Solo hilos antiguos
  ([2015](https://news.ycombinator.com/item?id=9771176), [2013](https://news.ycombinator.com/item?id=6153721))
  **[resumen de búsqueda]**.
- **Netflix Tech Blog y Medium** devolvieron 403. Para la lista de 60 segundos usamos copias y resúmenes
  ([Thomas-Krenn](https://www.thomas-krenn.com/en/wiki/Linux_performance_analysis_in_60_seconds),
  [SD Times](https://sdtimes.com/cloud/netflix-engineering-team-shows-how-to-do-linux-performance-analysis),
  [blog de Brendan Gregg](https://www.brendangregg.com/blog/2015-12-03/linux-perf-60s-video.html)).
- Por tanto, la clasificación por frecuencia que damos abajo es una **síntesis razonada** de ofertas de
  empleo, objetivos de certificación, listas de profesionales y análisis de historiales. No es una medición.

### 2.2 Datos de uso

- **Stack Overflow Developer Survey 2025:** Bash/Shell lo usa el **48,7 %** de quienes respondieron y el
  **48,8 %** de los perfiles profesionales. Es el 5.º lenguaje, por detrás de JS, HTML/CSS, SQL y Python
  ([SO Survey 2025, tecnología](https://survey.stackoverflow.co/2025/technology)).
- **Historiales reales:** la receta `history | awk '{print $2}' | sort | uniq -c | sort -rn | head` aparece en
  muchos sitios. Un autor de Opensource.com obtuvo `sudo`, `ls`, `cd`, `git` y `grep` en su equipo, y
  `systemctl`, `docker` y `vi` en sus máquinas virtuales ([Opensource.com](https://opensource.com/article/18/8/linux-terminal-command)).
  En OMG! Ubuntu, `cd` fue el primero con 338 usos ([OMG! Ubuntu](https://www.omgubuntu.co.uk/2010/09/reveal-your-top-ten-most-used-terminal-commands)).
  Esta receta es un buen ejercicio de tuberías en sí misma
  ([DEV, sobre sus limitaciones](https://dev.to/remy/listing-your-most-used-commands-1d6k)) **[resumen de búsqueda]**.
- **Listas de sysadmins:** coinciden en `ss` (que sustituye a `netstat`), `ip a`/`ip r`, `systemctl`,
  `journalctl`, `tail -f`, `top`/`htop`, `ps aux`, `free -h` y `df`/`du`
  ([Tecmint](https://www.tecmint.com/daily-linux-commands-for-sysadmins/),
  [linuxblog.io](https://linuxblog.io/linux-commands-frequently-used-by-linux-sysadmins-part-1/)) **[resumen de búsqueda]**.
  Un hilo de foro sobre administración junior insiste en logs, `grep`, bash para cron, `netcat`/`openssl` y
  `man`/`apropos` ([The Register, foros](https://forums.theregister.com/post/reply/1738671)) **[resumen de búsqueda]**.
- **Desarrollo:** `grep`, `df -h`, `du -sh`, `tar`, `ssh`, `systemctl status` y `curl`
  ([DEV](https://dev.to/prime_1/top-10-linux-commands-i-use-daily-as-a-developer-437)); `jq`, `ssh`, `git` y
  `tmux` ([Flavio Copes](https://flaviocopes.com/cli-tools-i-use/)) **[resumen de búsqueda]**.

### 2.3 Ofertas de empleo por perfil (muestra pequeña, orientativa)

- **Ingeniería de datos y data ops:** una oferta pide expresamente «crontab, awk, sed, cut, paste», bucles y
  condicionales, y 3 o más años de bash o ksh ([Beacon Hill, Data Ops Engineer](https://bhsg.com/jobs/job/tftl1433998-mr_1760449595-data-ops-engineer-boca-raton-florida));
  otra pide Bash, AWK y SFTP con comprobación de ficheros ([RELX, Data Engineer I](https://nodeflair.com/jobs/relx-data-engineer-i-485650))
  **[resumen de búsqueda]**. En los perfiles cloud modernos pesan más Python y SQL.
- **SOC y seguridad:** soltura con la línea de comandos Unix/Linux para el triaje, leer e interpretar logs,
  SIEM y expresiones regulares ([WeAreDevelopers, SOC Analyst](https://www.wearedevelopers.com/jobs/ext/467070-soc-analyst),
  [Infosecurity Magazine](https://www.infosecurity-magazine.com/jobs/soc-analyst-siem-analyst-security/))
  **[resumen de búsqueda]**.
- **Soporte y helpdesk:** en el nivel 1 Linux suele ser un extra. Los puestos «Linux Support» o de nivel 2
  piden SSH/SCP, permisos, servicios y procesos ([Linux Support Technician](https://social.icims.com/job/Linux-Support-Technician-Job-US-TX-SAN-ANTONIO-48469295.html),
  [Dice, Helpdesk Analyst](https://www.dice.com/job-detail/097a1fa0-c7e0-4fe3-9827-2730e0611f53)) **[resumen de búsqueda]**.
- **DevOps, SRE y cloud junior:** se contrata por soltura en Linux, scripting y una nube
  ([ResumeGeni](https://resumegeni.com/blog/sre-engineer/junior)). La diferencia entre junior y senior está en
  medir antes de actuar: espacio, inodos, ficheros grandes, CPU, memoria, E/S y carga
  ([DEV](https://dev.to/asepsayyad007/the-linux-skills-that-separate-junior-and-senior-devops-engineers-a-practical-comparison-40jh))
  **[resumen de búsqueda]**. Las certificaciones cuentan en la contratación para el 71 % de las organizaciones
  ([Linux Foundation, State of Tech Talent 2025](https://www.linuxfoundation.org/press/linux-foundation-report-finds-organizations-embrace-upskilling-and-open-source-to-meet-ai-driven-job-demands?hs_amp=true)).
- **Sysadmin:** coincide con los dominios de LFCS y RHCSA (ver 1.7).

### 2.4 Frecuencia por perfil

Leyenda: **D** = a diario, **S** = semanal, **O** = ocasional, **·** = casi nunca.

| Habilidad | Sysadmin | DevOps/SRE/Cloud | Backend | Datos | Soporte | SOC |
|---|---|---|---|---|---|---|
| Navegación, ficheros, `less`, historial/Ctrl-R | D | D | D | D | D | D |
| Tuberías y redirección | D | D | D | D | S | D |
| `grep`, `head`/`tail -f`, `wc` | D | D | D | D | S | D |
| `sort`/`uniq`/`cut`/`awk`/`sed` | S | S | S | D | O | D |
| `find`/`xargs` | S | S | S | S | O | S |
| Permisos `chmod`/`chown`/`umask` | D | S | S | O | S | S |
| Usuarios, grupos y `sudo` | S | O | O | · | S | S |
| Procesos `ps`/`top`/`htop`/`kill`/señales | D | D | S | O | S | S |
| `systemctl`/`journalctl`, `/var/log` | D | D | S | O | S | D |
| Red: `ss`, `curl`, `dig`, `ping`, `ip` | D | D | S | O | S | D |
| `ssh`/`scp`/`rsync` | D | D | S | S | S | S |
| Disco: `df`/`du`/`lsblk` | D | S | O | S | S | O |
| `tar`/`gzip` | S | S | O | S | O | S |
| cron y timers | S | S | O | S | O | O |
| Variables de entorno y `PATH` | S | D | D | S | O | O |
| Bash: variables, bucles, `if`, exit codes, `set -euo pipefail` | S | D | S | S | O | S |
| `apt`/`dnf` | S | S | O | O | S | O |
| `tmux` | D | S | O | O | · | O |
| `jq` | O | D | S | S | · | S |

Justificación resumida: datos (ofertas que piden awk, sed, cut y cron); SOC (logs y regex); DevOps (jq para
APIs y salidas `--json`, según [Flavio Copes](https://flaviocopes.com/cli-tools-i-use/), y scripting de
despliegue); sysadmin (listas de 2.2 y dominios de LFCS y RHCSA). `set -euo pipefail` es el «modo estricto no
oficial»: `-e` corta el script ante un error, `-u` trata las variables sin definir como error y `pipefail` hace
que falle la tubería entera si falla cualquier etapa. Hay matices: `pipefail` es solo de bash, y `-e` tiene
casos raros ([jmmv.dev](https://jmmv.dev/2018/03/shell-readability-strict-mode.html)) **[resumen de búsqueda]**.

### 2.5 Flujos de incidente: los «primeros 5 minutos»

**A. Lista de 60 segundos de Netflix (Brendan Gregg):** `uptime` → `dmesg | tail` → `vmstat 1` →
`mpstat -P ALL 1` → `pidstat 1` → `iostat -xz 1` → `free -m` → `sar -n DEV 1` → `sar -n TCP,ETCP 1` → `top`.
La idea es buscar **primero errores y saturación** (fáciles de interpretar) y después la utilización. Varias
herramientas requieren el paquete `sysstat`
([Thomas-Krenn](https://www.thomas-krenn.com/en/wiki/Linux_performance_analysis_in_60_seconds),
[SD Times](https://sdtimes.com/cloud/netflix-engineering-team-shows-how-to-do-linux-performance-analysis),
[copia del artículo](https://rwxdash.notion.site/Linux-Performance-Analysis-in-60-000-Milliseconds-by-Netflix-Technology-Blog-Netflix-TechBlog-8c38cc2e0e934ac0ad69af8258c24e82)).
El vídeo de Gregg comenta carga, errores del kernel, CPU, memoria disponible, red y retransmisiones TCP
([Brendan Gregg](https://www.brendangregg.com/blog/2015-12-03/linux-perf-60s-video.html)).

**B. Triaje general (blogs de práctica, sin estándar oficial) [resumen de búsqueda]:** primero observa y no
cambies nada, porque reiniciar borra las pistas. Después: `uptime` (comparando la carga con `nproc`),
`df -h` y `df -i` (inodos), `free -h` (fíjate en la columna *available*), `systemctl --failed`,
`journalctl -p 3 -xb` y `-u <servicio>`, y `ss -tulnp`
([ostechnix](https://ostechnix.com/linux-troubleshooting-commands-checklist/),
[1gbits](https://1gbits.com/blog/linux-server-troubleshooting/),
[STLLUG, «First Five Minutes»](https://www.stllinux.org/presentations/First_Five_Minutes_on_a_System.pdf)).

**C. Método (Google SRE, cap. 12):** se puede aprender a diagnosticar. El método es formular hipótesis y
ponerlas a prueba, y **estabilizar va antes que buscar la causa raíz**: primero que el avión siga volando
([SRE Book, Effective Troubleshooting](https://sre.google/sre-book/effective-troubleshooting/)).

**Flujos tipo para enseñar como bosses:**

- *Disco lleno:* `df -h` → `du -xh / --max-depth=1 | sort -h` → `lsof +L1` (ficheros borrados que siguen
  abiertos) → identificar el proceso → `systemctl stop` o `kill` → truncar o rotar el log (`: > f`,
  `logrotate -f`) → comprobar de nuevo con `df`.
- *Servicio caído:* `systemctl status x` → `journalctl -u x -n 50` → `ss -tulnp` (¿el puerto está ocupado?) →
  revisar los permisos de config y logs → `systemctl restart` y `enable`.
- *Ataque en logs (SOC):* `grep 'Failed password' /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head`.
- *Lentitud:* la lista de 60 segundos, después `ps aux --sort=-%cpu | head` y `kill -TERM` (y solo después `-KILL`).

---

## Implicaciones para el roadmap

Principios: cada unidad **reutiliza** lo anterior, los retos se validan por salida, *flag* o estado según su
tipo (ver 1.14), y cada nivel termina con un **boss contra reloj** en una máquina desechable con
`check.sh` a la vista. Cada unidad indica para qué perfiles es especialmente útil.

### Nivel 1: Principiante

Objetivo: moverte con soltura, leer y combinar comandos. Perfiles: todos (base común de 42).

1. **El mapa:** `pwd`, `ls -la`, `cd`, rutas absolutas y relativas, `~`, ficheros ocultos, `man`/`--help`.
   Formato Bashcrawl, con validación por *flag*.
2. **Ficheros:** `cat`, `less`, `cp`, `mv`, `rm`, `mkdir`, `touch`, `file`, `head`/`tail`.
3. **Expansión y comillas:** `*`, `?`, `{a,b}`, `$VAR`, `$(...)`, comillas simples y dobles (TLCL).
4. **Redirección y tuberías:** `>`, `>>`, `2>`, `2>&1`, `|`, `tee`, y la trampa de `sed f > f` (MIT).
5. **Texto I:** `grep` (`-i`, `-r`, `-v`, `-n`), `wc`, `sort`, `uniq -c`, `cut`. Retos de salida exacta, como
   «la IP que más aparece» (cmdchallenge o Saskatoon). Útil para datos y SOC.
6. **Buscar:** `find` (nombre, tipo, tamaño, fecha), `xargs`, `-print0`.
7. **Permisos:** `ls -l` leído en voz alta, `chmod` simbólico y octal, `chown`, `umask`, `sudo`.
8. **Historial y productividad:** Ctrl-R, `!!`, alias, `.bashrc`, `PATH` y `export`.

**Boss 1, «El archivo perdido» (15 min):** un directorio con 2 000 ficheros. Encuentra el único fichero de
más de 1 MB modificado ayer, que pertenece a `paciente7`, y saca de él las 3 palabras más frecuentes. La
validación es la salida exacta y una *flag*. Requiere las unidades 1 a 7.

### Nivel 2: Intermedio

Objetivo: entender un sistema en marcha y automatizar tareas pequeñas. Perfiles: backend, datos, soporte,
SOC y DevOps junior.

1. **Procesos:** `ps aux`, `top`/`htop`, `pgrep`/`pkill`, señales (TERM antes que KILL), `jobs`, `fg`, `bg`,
   `nohup`. Se apoya en las tuberías (`ps | grep`).
2. **Servicios y logs:** `systemctl` (status, start, enable), `journalctl -u -f -p`, `/var/log`, `tail -f`.
   Se apoya en Texto I.
3. **Texto II:** `awk` (campos, `BEGIN`/`END`), `sed -E` (sustituciones y capturas), `tr`, `paste`, `jq`.
   Útil para datos, SOC y DevOps.
4. **Disco y archivos comprimidos:** `df -h`/`-i`, `du -sh`, `lsblk`, `tar czf`/`xzf`, `gzip`.
5. **Red básica:** `ip a`, `ping`, `dig`, `curl -v`, `ss -tulnp`, `ssh` con clave, `~/.ssh/config`, `scp`, `rsync`.
6. **Usuarios y paquetes:** `useradd`, grupos, `sudoers`, `apt`/`dnf`.
7. **Scripting I:** shebang, variables, `$1`/`$@`, `if`/`[[ ]]`, `for`/`while`, `$?`, `&&`/`||`, funciones,
   `set -euo pipefail`. Validación con tests tipo `bats` (Exercism) y revisión entre pares.
8. **cron:** `crontab -e`, sintaxis y `PATH` en cron, que es la trampa clásica. Rotación con `logrotate`.

**Boss 2, «El servidor está en llamas» (20 min, tipo Fix, como Saint John de SadServers):** el disco está al
98 %. Encuentra el proceso que llena el disco, páralo **sin borrar el log que aún necesitas**, rota y comprime
el log, y deja `logrotate` configurado. `check.sh` comprueba que el uso de disco baja del 70 %, que el proceso
ya no existe, que hay un `.gz` y que la configuración es válida. Requiere procesos, servicios, disco y texto.

**Boss 2b, «Intrusión» (variante SOC y datos, 15 min, tipo Do):** a partir de `auth.log`, lista las IP con
más de 20 fallos, ordenadas, en `/tmp/ips.txt`. La validación es la salida exacta.

### Nivel 3: Avanzado

Objetivo: diagnosticar con método y dejar sistemas que aguanten. Perfiles: sysadmin, DevOps, SRE, cloud y
seguridad.

1. **Método de diagnóstico:** la lista de 60 segundos de Netflix, «estabilizar antes que la causa raíz»
   (SRE) y `vmstat`/`iostat`/`free`.
2. **Logs a escala:** `journalctl` por boot y por rango de tiempo, correlacionar con `awk`, top N por ventana
   de tiempo (ejercicio de boots del MIT).
3. **Scripting II:** `trap`, `getopts`, `mktemp`, idempotencia, `shellcheck`, salidas limpias para cron.
4. **Red y servicios:** puertos ocupados, firewall (ufw o firewalld), túneles `ssh -L`, proxy inverso.
5. **Persistencia y arranque:** units propias de systemd, timers, `enable`, y comprobar que todo funciona
   tras reiniciar (RHCSA).
6. **Permisos avanzados:** ACL, setuid (Bandit), `umask` por servicio, `lsof`.
7. **Entorno de trabajo:** `tmux`, *dotfiles* versionados y endurecer `sshd_config` (MIT).
8. **Modo «Oops»:** resolver retos sin algunos binarios, solo con builtins (cmdchallenge `cmd-no-bin`).

**Boss 3, «Guardia nocturna» (45 min, varias fases, como SadServers Medio o LFCS):** la web devuelve 502.
Fase 1: diagnostica (el servicio backend está caído y su puerto lo ocupa un proceso huérfano). Fase 2:
estabiliza. Fase 3: arregla los permisos del socket o del log. Fase 4: crea un timer de systemd que haga una
comprobación de salud y lo apunte en el journal. `check.sh` se ejecuta **tras un reinicio simulado**. Se
puntúa por fases, así que se puede aprobar parcialmente.

**Boss 3b, «Script de guardia» (DevOps, 30 min):** escribe `healthcheck.sh` con `set -euo pipefail` que
compruebe disco, servicio y puerto, salga con códigos 0, 1 o 2 y pase una batería de tests `bats` que
incluye casos límite (variables vacías, rutas con espacios).

### Qué se apoya en qué

```
Mapa → Ficheros → Expansión → Redirección/tuberías → Texto I → find/xargs → Permisos → Historial/entorno
                                     │                    │                     │
                                     ▼                    ▼                     ▼
                                 Procesos ─────────▶ Servicios/logs ◀── Texto II (awk/sed/jq)
                                     │                    │
                       Disco/archivos ┤          Red básica ┤── Usuarios/paquetes
                                     ▼                    ▼
                              Scripting I ──▶ cron/logrotate
                                     │
                                     ▼
       Diagnóstico (60 s) ─ Logs a escala ─ Scripting II ─ Red/servicios ─ Persistencia ─ Permisos avanzados
```

### Rutas recomendadas por perfil (sobre el tronco común del nivel 1)

- **Datos:** N2 (Texto II, Scripting I, cron) y N3 (Logs a escala). Bosses: 1, 2b y 3b.
- **SOC y seguridad:** N2 (Procesos, Servicios/logs, Texto II, Red) y N3 (Logs a escala, Permisos
  avanzados). Bosses: 2b y 3.
- **Soporte y helpdesk:** N2 completo, salvo Scripting I, que es optativo. Boss 2.
- **Backend:** N2 (Procesos, Servicios, Red, Scripting I, `jq`). Bosses: 2 y 3b.
- **DevOps, SRE, cloud y sysadmin:** todo. Bosses: 2, 3 y 3b, y un examen final cronometrado de 2 h al
  estilo LFCS.

---

El roadmap con el que se hizo el curso (nueve bloques en tres niveles, jefes y jefes finales) está en [curso-shell.md](curso-shell.md): parte de estas propuestas y las ajusta a lo que el simulador comprueba.
