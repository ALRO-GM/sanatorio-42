/**
 * Nivel avanzado: bloques 7 a 9 y su jefe final. Guiones de bash (que se
 * comprueban por lo que hacen, con sondas, no por cómo están escritos),
 * servicios con systemd, registros, cron y varias máquinas (ssh, scp, rsync,
 * curl). El jefe final es una caída completa de producción.
 */

import type { Unit } from './types.js'

const H = '/home/peer'

const CHECK_SH = `cat > ~/check.sh <<'EOF'
#!/bin/bash
if [ -f /etc/peer4u/app.env ]; then
  echo ok
else
  echo falta
  exit 1
fi
EOF`

const DEPLOY_SH = `cat > ~/deploy.sh <<'EOF'
#!/bin/bash
set -euo pipefail
if [ $# -lt 1 ]; then
  echo 'uso: deploy.sh VERSION' >&2
  exit 1
fi
mkdir -p ~/releases/$1
echo "desplegada $1"
EOF`

const BACKUP_SH = `cat > ~/backup.sh <<'EOF'
#!/bin/bash
set -euo pipefail
destino=~/backups/proyectos-$(date +%F).tar.gz
mkdir -p ~/backups
tar -czf "$destino" -C ~ proyectos
echo "copia: $destino"
EOF`

const SALUD_SH = `cat > ~/bin/salud.sh <<'EOF'
#!/bin/bash
if curl -sf http://localhost/api/health > /dev/null; then
  echo ok
else
  echo caida
  exit 1
fi
EOF`

/** Rompe nginx y la API como en una mala noche (lo comparten el jefe 8 y el final). */
const BREAK_SERVICES = [
  'cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak',
  "sed -i '/listen 80;/d' /etc/nginx/nginx.conf",
  'systemctl restart nginx || true',
  "sed -i 's/PORT=3000/PORT=/' /etc/peer4u/app.env",
  'systemctl restart peer4u-api || true',
]

const FIX_SERVICES = [
  'sudo systemctl list-units --failed',
  'sudo journalctl -p err -n 10',
  'sudo cp /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf',
  'sudo nginx -t',
  "sudo sed -i 's/^PORT=$/PORT=3000/' /etc/peer4u/app.env",
  'sudo systemctl restart nginx',
  'sudo systemctl start peer4u-api',
]

const DUMP = '/var/backups/db/peer4u-2026-10-24.sql.gz'

export const ADVANCED: Unit[] = [
  /* ---------- Bloque 7: guiones ---------- */
  {
    id: 'vars',
    block: 7,
    tier: 'advanced',
    kind: 'unit',
    es: {
      title: 'Variables, comillas y $(…)',
      goal: 'Guarda una copia de ~/notas.txt como ~/backups/notas-FECHA.txt, con la fecha de hoy sacada de date +%F (no escrita a mano).',
      theory: {
        what: '$(orden) se cambia por lo que escribe la orden. Entre comillas dobles se expanden las variables; entre simples, no. $((…)) hace cuentas.',
        how: [
          'HOY=$(date +%F)',
          'echo "hoy es $HOY"',
          "echo 'literal: $HOY'",
          'cp app.log "app-$(date +%F).log"',
          'echo $((3 * 7))',
        ],
        when: 'Nombres con fecha para copias y registros, y guardar el resultado de una orden para usarlo después.',
        problems:
          'Pon comillas dobles alrededor de las variables ("$f"): un nombre con espacios se partiría en dos.',
      },
      example: 'Guardas la fecha en una variable, comparas comillas y haces una cuenta.',
    },
    en: {
      title: 'Variables, quotes and $(…)',
      goal: 'Save a copy of ~/notas.txt as ~/backups/notas-DATE.txt, with today’s date from date +%F (not typed by hand).',
      theory: {
        what: '$(command) is replaced by what the command prints. Double quotes expand variables; single quotes do not. $((…)) does arithmetic.',
        how: [
          'TODAY=$(date +%F)',
          'echo "today is $TODAY"',
          "echo 'literal: $TODAY'",
          'cp app.log "app-$(date +%F).log"',
          'echo $((3 * 7))',
        ],
        when: 'Dated names for backups and logs, and keeping a command’s result to use later.',
        problems:
          'Put double quotes around variables ("$f"): a name with spaces would split in two.',
      },
      example: 'You store the date in a variable, compare quotes and do some arithmetic.',
    },
    example: [
      'HOY=$(date +%F)',
      'echo "hoy es $HOY"',
      "echo 'sin expandir: $HOY'",
      'echo "cuentas: $(wc -l < /etc/passwd)"',
      'echo $((3 * 7))',
    ],
    solution: ['mkdir -p ~/backups', 'cp ~/notas.txt ~/backups/notas-$(date +%F).txt'],
    check: { files: [`${H}/backups/notas-2026-10-25.txt`] },
    requires: [['date']],
  },
  {
    id: 'if',
    block: 7,
    tier: 'advanced',
    kind: 'unit',
    es: {
      title: 'Condiciones: if, test y [[ ]]',
      goal: 'Escribe ~/check.sh: si existe /etc/peer4u/app.env, escribe ok; si no, escribe falta y sale con código 1. Se probará con bash ~/check.sh, con el fichero y sin él.',
      theory: {
        what: 'if ejecuta una orden y mira su código: 0 es verdad. [ ] (test) comprueba ficheros (-f, -d), textos (=, -z) y números (-eq, -gt); [[ ]] además entiende patrones y regex.',
        how: [
          'if [ -f fichero ]; then\n  echo hay\nelse\n  echo falta\nfi',
          'if [ "$n" -gt 5 ]; then …',
          '[[ $f == *.log ]]',
          'if grep -q ERROR app.log; then …',
          "cat > guion.sh <<'EOF'   # escribir un guion",
        ],
        when: 'Siempre que un guion tenga que decidir: si existe, si responde, si hay errores.',
        problems:
          'Hacen falta los espacios dentro de [ ] y las comillas en "$var": [ -f $f ] falla si f está vacía.',
      },
      example: 'Pruebas condiciones con carpetas, números y patrones.',
    },
    en: {
      title: 'Conditions: if, test and [[ ]]',
      goal: 'Write ~/check.sh: if /etc/peer4u/app.env exists, print ok; otherwise print falta and exit with code 1. It will be run with bash ~/check.sh, with and without the file.',
      theory: {
        what: 'if runs a command and looks at its code: 0 is true. [ ] (test) checks files (-f, -d), strings (=, -z) and numbers (-eq, -gt); [[ ]] also understands patterns and regexes.',
        how: [
          'if [ -f file ]; then\n  echo yes\nelse\n  echo missing\nfi',
          'if [ "$n" -gt 5 ]; then …',
          '[[ $f == *.log ]]',
          'if grep -q ERROR app.log; then …',
          "cat > script.sh <<'EOF'   # write a script",
        ],
        when: 'Whenever a script must decide: does it exist, does it respond, are there errors.',
        problems:
          'The spaces inside [ ] are required and so are the quotes in "$var": [ -f $f ] breaks if f is empty.',
      },
      example: 'You try conditions with directories, numbers and patterns.',
    },
    example: [
      'if [ -d /srv ]; then echo "hay /srv"; else echo "no"; fi',
      'x=7; if [ $x -gt 5 ]; then echo grande; fi',
      '[[ "app.log" == *.log ]] && echo "es un log"',
    ],
    solution: [CHECK_SH],
    check: { probes: ['bash ~/check.sh', 'sudo mv /etc/peer4u/app.env /tmp/; bash ~/check.sh'] },
  },
  {
    id: 'loops',
    block: 7,
    tier: 'advanced',
    kind: 'unit',
    setup: {
      files: {
        [`${H}/configs/a.conf`]: 'a=1\n',
        [`${H}/configs/b.conf`]: 'b=2\n',
        [`${H}/configs/c.conf`]: 'c=3\n',
        [`${H}/configs/leeme.txt`]: 'no es una configuración\n',
      },
    },
    es: {
      title: 'Bucles: for y while',
      goal: 'Para cada .conf de ~/configs, deja al lado una copia con .bak (a.conf → a.conf.bak). leeme.txt no se copia.',
      theory: {
        what: 'for repite para cada palabra de una lista (o cada fichero de un comodín); while repite mientras una orden vaya bien. while read lee una entrada línea a línea.',
        how: [
          'for f in *.conf; do cp "$f" "$f.bak"; done',
          'for i in {1..5}; do echo $i; done',
          'while [ $n -lt 3 ]; do n=$((n+1)); done',
          'cut -d: -f1 /etc/passwd | while read -r u; do echo "$u"; done',
        ],
        when: 'Hacer lo mismo con muchos ficheros, servidores o usuarios.',
        problems:
          'Un while que no cambia su condición no acaba nunca (aquí el simulador lo para a las 1000 vueltas).',
      },
      example:
        'Das vueltas con for, cuentas líneas de cada registro, usas while y lees usuarios uno a uno.',
    },
    en: {
      title: 'Loops: for and while',
      goal: 'For each .conf in ~/configs, leave a .bak copy next to it (a.conf → a.conf.bak). leeme.txt is not copied.',
      theory: {
        what: 'for repeats for each word in a list (or each file of a wildcard); while repeats while a command succeeds. while read reads input line by line.',
        how: [
          'for f in *.conf; do cp "$f" "$f.bak"; done',
          'for i in {1..5}; do echo $i; done',
          'while [ $n -lt 3 ]; do n=$((n+1)); done',
          'cut -d: -f1 /etc/passwd | while read -r u; do echo "$u"; done',
        ],
        when: 'Doing the same with many files, servers or users.',
        problems:
          'A while that never changes its condition never ends (here the simulator stops it at 1000 turns).',
      },
      example: 'You loop with for, count lines of each log, use while and read users one by one.',
    },
    example: [
      'for i in 1 2 3; do echo "vuelta $i"; done',
      'for f in /var/log/nginx/*.log; do echo "$f: $(wc -l < $f)"; done',
      'n=0; while [ $n -lt 3 ]; do n=$((n+1)); echo $n; done',
      'cut -d: -f1 /etc/passwd | while read -r u; do echo "usuario: $u"; done | head -n 3',
    ],
    solution: ['for f in ~/configs/*.conf; do cp "$f" "$f.bak"; done'],
    check: {
      files: [
        `${H}/configs/a.conf.bak`,
        `${H}/configs/b.conf.bak`,
        `${H}/configs/c.conf.bak`,
        `${H}/configs/leeme.txt.bak`,
      ],
    },
  },
  {
    id: 'script-args',
    block: 7,
    tier: 'advanced',
    kind: 'unit',
    es: {
      title: 'Guiones de verdad: argumentos y set -euo pipefail',
      goal: 'Escribe ~/deploy.sh, ejecutable: sin argumentos escribe «uso: deploy.sh VERSION» en la salida de errores y sale con 1; con una versión crea ~/releases/VERSION y escribe «desplegada VERSION».',
      theory: {
        what: 'Un guion empieza por #!/bin/bash y, con chmod +x, se ejecuta como ./guion.sh. $1, $2… son los argumentos, $# cuántos hay, $@ todos. exit N sale con ese código. set -euo pipefail para al primer fallo, ante una variable sin definir o un fallo dentro de una tubería.',
        how: [
          '#!/bin/bash',
          'set -euo pipefail',
          'if [ $# -lt 1 ]; then echo "uso: $0 X" >&2; exit 1; fi',
          'echo "primero: $1, todos: $@"',
          'chmod +x guion.sh && ./guion.sh v1',
        ],
        when: 'Todo lo que repites más de dos veces: despliegues, copias, limpiezas, altas de usuarios.',
        problems:
          'Sin set -e, un guion sigue tan tranquilo después de un error y puede hacer daño con datos a medias.',
      },
      example: 'Escribes un guion que cuenta sus argumentos y lo ejecutas de dos maneras.',
    },
    en: {
      title: 'Real scripts: arguments and set -euo pipefail',
      goal: 'Write ~/deploy.sh, executable: with no arguments it prints «uso: deploy.sh VERSION» to standard error and exits 1; with a version it creates ~/releases/VERSION and prints «desplegada VERSION».',
      theory: {
        what: 'A script starts with #!/bin/bash and, after chmod +x, runs as ./script.sh. $1, $2… are the arguments, $# how many, $@ all of them. exit N exits with that code. set -euo pipefail stops at the first failure, on an unset variable or on a failure inside a pipe.',
        how: [
          '#!/bin/bash',
          'set -euo pipefail',
          'if [ $# -lt 1 ]; then echo "usage: $0 X" >&2; exit 1; fi',
          'echo "first: $1, all: $@"',
          'chmod +x script.sh && ./script.sh v1',
        ],
        when: 'Everything you repeat more than twice: deployments, backups, cleanups, user creation.',
        problems:
          'Without set -e, a script carries on after an error and can do damage with half-done data.',
      },
      example: 'You write a script that counts its arguments and run it two ways.',
    },
    example: [
      'printf \'#!/bin/bash\\necho "me llamo $0 y tengo $# argumentos: $@"\\n\' > args.sh',
      'chmod +x args.sh',
      './args.sh uno dos',
      'bash args.sh tres',
    ],
    solution: [DEPLOY_SH, 'chmod +x ~/deploy.sh'],
    check: {
      probes: ['~/deploy.sh; echo "código $?"', '~/deploy.sh v3; echo "código $?"; ls ~/releases'],
    },
  },
  {
    id: 'boss7',
    block: 7,
    tier: 'advanced',
    kind: 'boss',
    limit: 480,
    es: {
      title: 'Jefe: la copia de cada noche',
      goal: 'Automatiza la copia de ~/proyectos con un guion que funcione aunque ~/backups no exista.',
      story: 'La copia se hacía a mano y un día se olvidó. Te toca dejarla en un guion.',
      tasks: [
        'Escribe ~/backup.sh, ejecutable.',
        'Que cree ~/backups si no existe.',
        'Que empaquete ~/proyectos en ~/backups/proyectos-FECHA.tar.gz (FECHA con date +%F).',
        'Que escriba «copia: » y la ruta completa del fichero.',
        'Ejecútalo una vez.',
      ],
    },
    en: {
      title: 'Boss: the nightly backup',
      goal: 'Automate the backup of ~/proyectos with a script that works even if ~/backups does not exist.',
      story:
        'The backup was done by hand and one day it was forgotten. Your job: put it in a script.',
      tasks: [
        'Write ~/backup.sh, executable.',
        'It creates ~/backups if it does not exist.',
        'It archives ~/proyectos into ~/backups/proyectos-DATE.tar.gz (DATE from date +%F).',
        'It prints «copia: » and the full path of the file.',
        'Run it once.',
      ],
    },
    solution: [BACKUP_SH, 'chmod +x ~/backup.sh', '~/backup.sh'],
    check: {
      archives: [`${H}/backups/proyectos-2026-10-25.tar.gz`],
      probes: ['rm -rf ~/backups; ~/backup.sh', 'ls ~/backups'],
    },
  },

  /* ---------- Bloque 8: servicios, registros y cron ---------- */
  {
    id: 'systemctl',
    block: 8,
    tier: 'advanced',
    kind: 'unit',
    setup: { run: ['systemctl stop nginx', 'systemctl disable nginx'] },
    es: {
      title: 'Servicios: systemctl',
      goal: 'nginx está parado y no arranca con la máquina. Arráncalo y haz que arranque solo al encender.',
      theory: {
        what: 'systemd lleva los servicios. systemctl status dice si va y sus últimas líneas de registro; start, stop y restart lo arrancan, paran y reinician; enable y disable deciden si arranca al encender.',
        how: [
          'systemctl status nginx',
          'sudo systemctl restart nginx',
          'sudo systemctl enable --now nginx',
          'systemctl is-active nginx',
          'systemctl list-units --failed',
        ],
        when: 'Tras cambiar una configuración (reload o restart), después de un fallo y al instalar algo nuevo.',
        whenNot:
          'No mates el proceso de un servicio con kill: systemd puede volver a arrancarlo o dejarlo «failed». Usa systemctl.',
      },
      example:
        'Miras el estado de ssh, si nginx está activo, los servicios caídos y reinicias cron.',
    },
    en: {
      title: 'Services: systemctl',
      goal: 'nginx is stopped and does not start at boot. Start it and make it start at boot.',
      theory: {
        what: 'systemd runs the services. systemctl status says whether it runs and shows its last log lines; start, stop and restart start, stop and restart it; enable and disable decide whether it starts at boot.',
        how: [
          'systemctl status nginx',
          'sudo systemctl restart nginx',
          'sudo systemctl enable --now nginx',
          'systemctl is-active nginx',
          'systemctl list-units --failed',
        ],
        when: 'After changing a configuration (reload or restart), after a failure and when installing something new.',
        whenNot:
          'Do not kill a service’s process: systemd may restart it or leave it «failed». Use systemctl.',
      },
      example:
        'You check ssh’s status, whether nginx is active, the failed services, and restart cron.',
    },
    example: [
      'systemctl status ssh',
      'systemctl is-active nginx',
      'systemctl list-units --failed',
      'sudo systemctl restart cron',
    ],
    solution: ['sudo systemctl enable --now nginx'],
    check: { services: ['nginx'] },
  },
  {
    id: 'journal',
    block: 8,
    tier: 'advanced',
    kind: 'unit',
    setup: {
      run: [
        "sed -i 's/PORT=3000/PORT=/' /etc/peer4u/app.env",
        'systemctl restart peer4u-api || true',
      ],
    },
    es: {
      title: 'Registros: journalctl',
      goal: 'La API (peer4u-api) no arranca. Busca en su registro por qué, arregla /etc/peer4u/app.env (PORT=3000) y arráncala.',
      theory: {
        what: 'journalctl lee el registro de systemd: -u de un servicio, -n las últimas N, -p err solo errores, --since desde cuándo, -e al final, -f siguiendo.',
        how: [
          'journalctl -u peer4u-api -n 20',
          'journalctl -p err --since "1 hour ago"',
          'journalctl -xeu nginx',
          'tail -f /var/log/nginx/error.log',
        ],
        when: 'Cuando un servicio falla: el porqué casi siempre está en las últimas líneas de su registro.',
        problems: 'Si no estás en el grupo adm (o systemd-journal), solo ves lo tuyo: sudo.',
      },
      example:
        'Miras lo último del sistema, lo de nginx, solo los errores y lo de la última media hora.',
    },
    en: {
      title: 'Logs: journalctl',
      goal: 'The API (peer4u-api) will not start. Find out why in its log, fix /etc/peer4u/app.env (PORT=3000) and start it.',
      theory: {
        what: 'journalctl reads the systemd log: -u for a service, -n the last N, -p err only errors, --since from when, -e jump to the end, -f follow.',
        how: [
          'journalctl -u peer4u-api -n 20',
          'journalctl -p err --since "1 hour ago"',
          'journalctl -xeu nginx',
          'tail -f /var/log/nginx/error.log',
        ],
        when: 'When a service fails: the reason is almost always in the last lines of its log.',
        problems:
          'If you are not in the adm (or systemd-journal) group, you only see your own: sudo.',
      },
      example: 'You look at the latest system log, nginx’s, only errors and the last half hour.',
    },
    example: [
      'journalctl -n 5',
      'journalctl -u nginx -n 3',
      'journalctl -p err',
      "journalctl --since '30 min ago' -u peer4u-api",
    ],
    solution: [
      'journalctl -u peer4u-api -n 5',
      "sudo sed -i 's/^PORT=$/PORT=3000/' /etc/peer4u/app.env",
      'sudo systemctl start peer4u-api',
    ],
    check: { services: ['peer4u-api'], files: ['/etc/peer4u/app.env'] },
  },
  {
    id: 'cron',
    block: 8,
    tier: 'advanced',
    kind: 'unit',
    setup: { files: { [`${H}/backup.sh`]: { text: '#!/bin/bash\necho copia\n', mode: 0o755 } } },
    es: {
      title: 'Tareas programadas: cron',
      goal: 'Programa /home/peer/backup.sh en tu crontab para que se ejecute todos los días a las 03:30.',
      theory: {
        what: 'cron ejecuta órdenes a su hora. Cada línea del crontab: minuto, hora, día del mes, mes, día de la semana y la orden (* es «cualquiera», */5 «cada 5»).',
        how: [
          'crontab -l',
          '30 3 * * * /home/peer/backup.sh',
          '*/5 * * * * /home/peer/bin/salud.sh',
          "echo '0 2 * * 0 /ruta/guion.sh' | crontab -",
          'crontab fichero.txt',
          'crontab -r',
        ],
        when: 'Copias, limpiezas, informes y comprobaciones que tienen que pasar solas.',
        problems:
          'cron no carga tu .bashrc: usa rutas absolutas (y redirige la salida a un fichero para ver si falla).',
      },
      example: 'Miras tu tabla, la del sistema, cargas una de prueba y la borras.',
    },
    en: {
      title: 'Scheduled jobs: cron',
      goal: 'Schedule /home/peer/backup.sh in your crontab to run every day at 03:30.',
      theory: {
        what: 'cron runs commands on schedule. Each crontab line: minute, hour, day of month, month, day of week and the command (* means «any», */5 «every 5»).',
        how: [
          'crontab -l',
          '30 3 * * * /home/peer/backup.sh',
          '*/5 * * * * /home/peer/bin/health.sh',
          "echo '0 2 * * 0 /path/script.sh' | crontab -",
          'crontab file.txt',
          'crontab -r',
        ],
        when: 'Backups, cleanups, reports and checks that must happen on their own.',
        problems:
          'cron does not load your .bashrc: use absolute paths (and redirect output to a file to see failures).',
      },
      example: 'You look at your table and the system one, load a test one and remove it.',
    },
    example: [
      'crontab -l',
      'cat /etc/crontab',
      "echo '*/10 * * * * date >> /tmp/hora.txt' | crontab -",
      'crontab -l',
      'crontab -r',
    ],
    solution: ["echo '30 3 * * * /home/peer/backup.sh' > ~/mi-cron.txt", 'crontab ~/mi-cron.txt'],
    check: { crontab: ['peer'] },
  },
  {
    id: 'boss8',
    block: 8,
    tier: 'advanced',
    kind: 'boss',
    limit: 480,
    setup: { run: BREAK_SERVICES },
    es: {
      title: 'Jefe: caída a las tres de la mañana',
      goal: 'Vuelve a poner en pie nginx y la API y comprueba que la web contesta.',
      story:
        'Alguien desplegó configuración a medianoche y se fue a dormir. Ahora no va ni la web ni la API. La guardia anterior dejó una copia buena de nginx en /etc/nginx/nginx.conf.bak.',
      tasks: [
        'Mira qué servicios han caído y por qué (systemctl, journalctl).',
        'Arregla nginx: vuelve a su configuración buena y pruébala con nginx -t.',
        'Arregla la API: /etc/peer4u/app.env tiene que decir PORT=3000.',
        'Arranca los dos.',
        'Comprueba con curl que http://localhost/api/health contesta.',
      ],
    },
    en: {
      title: 'Boss: outage at three in the morning',
      goal: 'Get nginx and the API back up and check the site answers.',
      story:
        'Someone deployed config at midnight and went to bed. Now neither the site nor the API works. The previous on-call left a good nginx copy at /etc/nginx/nginx.conf.bak.',
      tasks: [
        'Find which services are down and why (systemctl, journalctl).',
        'Fix nginx: restore its good configuration and test it with nginx -t.',
        'Fix the API: /etc/peer4u/app.env must say PORT=3000.',
        'Start both.',
        'Check with curl that http://localhost/api/health answers.',
      ],
    },
    solution: [...FIX_SERVICES, 'curl -s http://localhost/api/health'],
    check: {
      services: ['nginx', 'peer4u-api'],
      files: ['/etc/nginx/nginx.conf', '/etc/peer4u/app.env'],
      output: true,
    },
  },

  /* ---------- Bloque 9: redes y otras máquinas ---------- */
  {
    id: 'curl',
    block: 9,
    tier: 'advanced',
    kind: 'unit',
    es: {
      title: 'La red desde dentro: ss, ping y curl',
      goal: 'Pide el estado de la API a través de nginx (http://localhost/api/health) y guarda la respuesta en ~/health.json.',
      theory: {
        what: 'ss -tlnp enseña qué puertos escuchan y qué proceso hay detrás; ping dice si una máquina responde; dig pregunta al DNS; curl habla HTTP (-I solo cabeceras, -s sin progreso, -o a un fichero, -f falla con 4xx/5xx).',
        how: [
          'ss -tlnp',
          'ping -c 3 db1',
          'dig +short api.peer4u.dev',
          'curl -I http://localhost',
          'curl -s http://localhost/api/health',
          "curl -s -o /dev/null -w '%{http_code}' http://localhost",
        ],
        when: 'Para saber si el fallo es del servicio, del puerto, del nombre o de la red: de dentro hacia fuera.',
        problems:
          '«Connection refused» es que nadie escucha en ese puerto; «502 Bad Gateway», que nginx va pero lo de detrás no.',
      },
      example: 'Miras los puertos, las cabeceras de la web, el health check, db1 y el DNS.',
    },
    en: {
      title: 'The network from inside: ss, ping and curl',
      goal: 'Ask for the API status through nginx (http://localhost/api/health) and save the answer in ~/health.json.',
      theory: {
        what: 'ss -tlnp shows which ports listen and which process is behind; ping says whether a machine answers; dig asks DNS; curl talks HTTP (-I headers only, -s silent, -o to a file, -f fails on 4xx/5xx).',
        how: [
          'ss -tlnp',
          'ping -c 3 db1',
          'dig +short api.peer4u.dev',
          'curl -I http://localhost',
          'curl -s http://localhost/api/health',
          "curl -s -o /dev/null -w '%{http_code}' http://localhost",
        ],
        when: 'To know whether the fault is the service, the port, the name or the network: from the inside out.',
        problems:
          '«Connection refused» means nobody listens on that port; «502 Bad Gateway», that nginx works but what is behind it does not.',
      },
      example: 'You look at the ports, the site headers, the health check, db1 and DNS.',
    },
    example: [
      'ss -tln',
      'curl -I http://localhost',
      'curl -s http://localhost/api/health',
      'ping -c 2 db1',
      'dig +short api.peer4u.dev',
    ],
    solution: ['curl -s http://localhost/api/health -o ~/health.json'],
    check: { files: [`${H}/health.json`] },
  },
  {
    id: 'ssh',
    block: 9,
    tier: 'advanced',
    kind: 'unit',
    es: {
      title: 'Otras máquinas: ssh y scp',
      goal: 'Trae a ~/restore/ (en web1) el volcado más reciente de db1, que está en /var/backups/db.',
      theory: {
        what: 'ssh abre una sesión en otra máquina (exit para volver) o ejecuta allí una orden suelta. scp copia ficheros entre máquinas: maquina:ruta es la ruta de la otra.',
        how: [
          'ssh db1',
          "ssh db1 'df -h /'",
          'scp fichero db1:/tmp/',
          'scp db1:/var/backups/db/x.sql.gz ~/restore/',
          'scp -r carpeta db1:~/',
        ],
        when: 'Administrar varias máquinas desde una, traer copias y registros, llevar configuraciones.',
        problems:
          'Fíjate en qué máquina estás (el nombre del prompt): un rm en la máquina equivocada duele.',
      },
      example: 'Preguntas el nombre de db1 desde fuera, entras, miras las copias y vuelves.',
    },
    en: {
      title: 'Other machines: ssh and scp',
      goal: 'Bring to ~/restore/ (on web1) the most recent dump from db1, which lives in /var/backups/db.',
      theory: {
        what: 'ssh opens a session on another machine (exit to come back) or runs one command there. scp copies files between machines: host:path is the other machine’s path.',
        how: [
          'ssh db1',
          "ssh db1 'df -h /'",
          'scp file db1:/tmp/',
          'scp db1:/var/backups/db/x.sql.gz ~/restore/',
          'scp -r dir db1:~/',
        ],
        when: 'Managing several machines from one, fetching backups and logs, pushing configuration.',
        problems:
          'Watch which machine you are on (the name in the prompt): an rm on the wrong one hurts.',
      },
      example: 'You ask db1 its name from outside, log in, look at the backups and come back.',
    },
    example: ['ssh db1 hostname', 'ssh db1', 'ls -lh /var/backups/db', 'exit', 'hostname'],
    solution: [
      'mkdir -p ~/restore',
      "ssh db1 'ls -t /var/backups/db | head -n 1'",
      `scp db1:${DUMP} ~/restore/`,
    ],
    check: { files: [`${H}/restore/peer4u-2026-10-24.sql.gz`] },
  },
  {
    id: 'rsync',
    block: 9,
    tier: 'advanced',
    kind: 'unit',
    setup: { files: { 'db1:/home/peer/espejo/viejo.html': '<h1>versión vieja</h1>\n' } },
    es: {
      title: 'Sincronizar: rsync',
      goal: 'Deja db1:/home/peer/espejo/ igual que /var/www/html/ de web1: lo que falta, copiado; lo que sobra, borrado.',
      theory: {
        what: 'rsync copia solo lo que cambia, en local o entre máquinas. -a conserva permisos y fechas, -v cuenta lo que hace, -n prueba sin tocar nada, --delete borra en el destino lo que ya no está en el origen.',
        how: [
          'rsync -av origen/ destino/',
          'rsync -av carpeta/ db1:/srv/copia/',
          'rsync -avn --delete a/ b/   # primero, en seco',
          'rsync -av --delete a/ b/',
        ],
        when: 'Copias incrementales, espejos de una web, mover datos grandes sin empezar de cero.',
        problems:
          'La barra final cuenta: origen/ copia lo de dentro; origen copia la carpeta entera dentro del destino.',
      },
      example: 'Pruebas en seco, sincronizas una carpeta local y miras el resultado.',
    },
    en: {
      title: 'Syncing: rsync',
      goal: 'Make db1:/home/peer/espejo/ match web1’s /var/www/html/: what is missing, copied; what is extra, deleted.',
      theory: {
        what: 'rsync copies only what changed, locally or between machines. -a keeps permissions and dates, -v reports what it does, -n is a dry run, --delete removes at the destination what is no longer in the source.',
        how: [
          'rsync -av src/ dest/',
          'rsync -av dir/ db1:/srv/copy/',
          'rsync -avn --delete a/ b/   # dry run first',
          'rsync -av --delete a/ b/',
        ],
        when: 'Incremental backups, mirrors of a site, moving big data without starting over.',
        problems:
          'The trailing slash matters: src/ copies what is inside; src copies the directory itself into the destination.',
      },
      example: 'You do a dry run, sync a local directory and look at the result.',
    },
    example: [
      'rsync -avn /var/www/html/ /tmp/web/',
      'rsync -av /var/www/html/ /tmp/web/',
      'ls /tmp/web',
    ],
    solution: ['rsync -av --delete /var/www/html/ db1:/home/peer/espejo/'],
    check: { files: ['db1:/home/peer/espejo/index.html', 'db1:/home/peer/espejo/viejo.html'] },
  },
  {
    id: 'boss9',
    block: 9,
    tier: 'advanced',
    kind: 'boss',
    limit: 480,
    setup: { run: ["ssh db1 'systemctl stop postgresql'"] },
    es: {
      title: 'Jefe: la base de datos no contesta',
      goal: 'Levanta PostgreSQL en db1, trae la última copia y deja todo comprobado desde web1.',
      story: 'La API dice «db connection refused (db1:5432)». Hay que mirar en la otra máquina.',
      tasks: [
        'Arranca postgresql en db1 (por ssh, con sudo).',
        'Trae el volcado más reciente de db1 (/var/backups/db) a ~/restore/ en web1.',
        'Deja una copia de /etc/nginx/nginx.conf de web1 en db1, en /home/peer/configs/.',
        'Guarda en ~/health.json la respuesta de http://localhost/api/health.',
      ],
    },
    en: {
      title: 'Boss: the database is not answering',
      goal: 'Bring PostgreSQL up on db1, fetch the last backup and leave everything checked from web1.',
      story:
        'The API says «db connection refused (db1:5432)». You need to look at the other machine.',
      tasks: [
        'Start postgresql on db1 (over ssh, with sudo).',
        'Bring the most recent dump from db1 (/var/backups/db) to ~/restore/ on web1.',
        'Leave a copy of web1’s /etc/nginx/nginx.conf on db1, in /home/peer/configs/.',
        'Save the answer of http://localhost/api/health in ~/health.json.',
      ],
    },
    solution: [
      "ssh db1 'sudo systemctl start postgresql'",
      'mkdir -p ~/restore',
      `scp db1:${DUMP} ~/restore/`,
      "ssh db1 'mkdir -p ~/configs'",
      'scp /etc/nginx/nginx.conf db1:/home/peer/configs/',
      'curl -s http://localhost/api/health -o ~/health.json',
    ],
    check: {
      services: ['db1:postgresql'],
      files: [
        `${H}/restore/peer4u-2026-10-24.sql.gz`,
        'db1:/home/peer/configs/nginx.conf',
        `${H}/health.json`,
      ],
    },
  },
  {
    id: 'final-advanced',
    block: 9,
    tier: 'advanced',
    kind: 'final',
    limit: 900,
    setup: {
      run: BREAK_SERVICES,
      files: {
        '/var/log/peer4u/debug.log': {
          text: 'DEBUG cache miss\n',
          owner: 'deploy',
          group: 'adm',
          mode: 0o640,
          size: 27 * 1024 ** 3,
        },
      },
      procs: [{ user: 'deploy', cmd: 'python3 /tmp/miner.py', cpu: 95, mem: 14, stubborn: true }],
    },
    es: {
      title: 'Jefe final: avanzado',
      goal: 'Una caída completa de producción y lo que hace falta para que no vuelva a pillarte: todo el curso, contra el reloj. Si lo superas, tienes el certificado de avanzado.',
      story:
        'Lunes, 9:00. La web no carga, el disco está lleno, algo se come la CPU y la última copia está en db1. Y luego quieren que la próxima vez avise sola.',
      tasks: [
        'Levanta nginx (copia buena en /etc/nginx/nginx.conf.bak) y la API (PORT=3000 en /etc/peer4u/app.env).',
        'Para el miner.py de deploy.',
        'Deja el disco por debajo del 80 % sin borrar /var/log/peer4u/debug.log.',
        'Escribe ~/bin/salud.sh, ejecutable: si curl -sf http://localhost/api/health va bien, escribe ok; si no, escribe caida y sale con 1.',
        'Prográmalo en tu crontab cada 5 minutos: */5 * * * * /home/peer/bin/salud.sh',
        'Trae a ~/restore/ el volcado más reciente de db1 (/var/backups/db).',
      ],
    },
    en: {
      title: 'Final boss: advanced',
      goal: 'A full production outage and what it takes so it never catches you again: the whole course, against the clock. Beat it and you get the advanced certificate.',
      story:
        'Monday, 9:00. The site will not load, the disk is full, something is eating the CPU and the last backup is on db1. Then they want it to warn on its own next time.',
      tasks: [
        'Bring up nginx (good copy at /etc/nginx/nginx.conf.bak) and the API (PORT=3000 in /etc/peer4u/app.env).',
        'Stop deploy’s miner.py.',
        'Get the disk under 80% without deleting /var/log/peer4u/debug.log.',
        'Write ~/bin/salud.sh, executable: if curl -sf http://localhost/api/health succeeds it prints ok; otherwise it prints caida and exits 1.',
        'Schedule it in your crontab every 5 minutes: */5 * * * * /home/peer/bin/salud.sh',
        'Bring the most recent dump from db1 (/var/backups/db) to ~/restore/.',
      ],
    },
    solution: [
      ...FIX_SERVICES,
      'sudo pkill -9 -f miner.py',
      'sudo truncate -s 0 /var/log/peer4u/debug.log',
      'mkdir -p ~/bin',
      SALUD_SH,
      'chmod +x ~/bin/salud.sh',
      "echo '*/5 * * * * /home/peer/bin/salud.sh' | crontab -",
      'mkdir -p ~/restore',
      `scp db1:${DUMP} ~/restore/`,
    ],
    check: {
      services: ['nginx', 'peer4u-api'],
      files: [
        '/etc/nginx/nginx.conf',
        '/etc/peer4u/app.env',
        '/var/log/peer4u/debug.log',
        `${H}/restore/peer4u-2026-10-24.sql.gz`,
      ],
      procs: ['miner.py'],
      disk: { below: 80 },
      crontab: ['peer'],
      probes: [
        '~/bin/salud.sh; echo "código $?"',
        'sudo systemctl stop nginx; ~/bin/salud.sh; echo "código $?"',
      ],
    },
  },
]
