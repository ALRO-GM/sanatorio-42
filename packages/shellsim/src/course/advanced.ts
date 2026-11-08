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
        what: '$(orden) se cambia por lo que escribe la orden. Entre comillas dobles se expanden variables y $(…); entre simples, no.',
        when: 'Copias y registros con la fecha en el nombre.',
        how: [
          'HOY=$(date +%F)',
          'cp app.log "app-$HOY.log"',
          "echo 'literal: $HOY'   # sin expandir",
          'echo $((3 * 7))       # cuentas',
        ],
        problems:
          'Variable sin comillas: con f="mi informe.txt", ls -l $f busca dos ficheros y responde «ls: cannot access \'mi\': No such file or directory». Escribe "$f".',
        whenNot: 'Simples para texto fijo; dobles si algo se expande.',
      },
      example: 'Antes de verlo: f vale "mi informe.txt". ¿Qué hará ls -l $f, sin comillas?',
    },
    en: {
      title: 'Variables, quotes and $(…)',
      goal: 'Save a copy of ~/notas.txt as ~/backups/notas-DATE.txt, with today’s date from date +%F (not typed by hand).',
      theory: {
        what: '$(command) is replaced by what the command prints. Inside double quotes variables and $(…) expand; inside single quotes, not.',
        when: 'Backups and logs with the date in the name.',
        how: [
          'HOY=$(date +%F)',
          'cp app.log "app-$HOY.log"',
          "echo 'literal: $HOY'   # not expanded",
          'echo $((3 * 7))       # arithmetic',
        ],
        problems:
          'An unquoted variable: with f="mi informe.txt", ls -l $f looks for two files and answers "ls: cannot access \'mi\': No such file or directory". Write "$f".',
        whenNot: 'Single quotes for fixed text; double if something expands.',
      },
      example: 'Before you look: f is "mi informe.txt". What will ls -l $f, without quotes, do?',
    },
    fr: {
      title: 'Variables, guillemets et $(…)',
      goal: 'Garde une copie de ~/notas.txt sous ~/backups/notas-DATE.txt, avec la date du jour obtenue avec date +%F (pas tapée à la main).',
      theory: {
        what: '$(commande) est remplacé par ce qu’écrit la commande. Entre guillemets doubles, variables et $(…) s’expandent ; entre apostrophes, non.',
        when: 'Sauvegardes et journaux avec la date dans le nom.',
        how: [
          'HOY=$(date +%F)',
          'cp app.log "app-$HOY.log"',
          "echo 'literal: $HOY'   # sans expansion",
          'echo $((3 * 7))       # calcul',
        ],
        problems:
          'Variable sans guillemets : avec f="mi informe.txt", ls -l $f cherche deux fichiers et répond « ls: cannot access \'mi\': No such file or directory ». Écris "$f".',
        whenNot: 'Apostrophes pour du texte fixe ; guillemets doubles si quelque chose s’expand.',
      },
      example: 'Avant de regarder : f vaut "mi informe.txt". Que fera ls -l $f, sans guillemets ?',
    },
    example: [
      'HOY=$(date +%F)',
      'echo "hoy es $HOY"',
      "echo 'hoy es $HOY'",
      'f="mi informe.txt"',
      'touch "$f"',
      'ls -l $f',
      'ls -l "$f"',
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
        what: 'if ejecuta una orden y mira su código: 0 es verdad. [ ] comprueba ficheros (-f, -d), textos (=) y números (-gt).',
        when: 'Cuando un guion tiene que decidir.',
        how: [
          'if [ -f app.env ]; then echo ok; else echo falta; fi',
          '[ "$n" -gt 5 ] && echo grande',
        ],
        problems:
          'Sin espacios dentro de los corchetes: [-f /etc/hosts] responde «bash: [-f: command not found». Pon espacios dentro.',
        whenNot: 'Para un caso suelto basta &&; con else, if se lee mejor.',
      },
      example:
        'Antes de verlo: ¿qué responderá [-f /etc/hosts], sin espacios dentro de los corchetes?',
    },
    en: {
      title: 'Conditions: if, test and [[ ]]',
      goal: 'Write ~/check.sh: if /etc/peer4u/app.env exists, print ok; otherwise print falta and exit with code 1. It will be run with bash ~/check.sh, with and without the file.',
      theory: {
        what: 'if runs a command and looks at its code: 0 is true. [ ] checks files (-f, -d), strings (=) and numbers (-gt).',
        when: 'When a script has to decide.',
        how: [
          'if [ -f app.env ]; then echo ok; else echo falta; fi',
          '[ "$n" -gt 5 ] && echo grande',
        ],
        problems:
          'No spaces inside the brackets: [-f /etc/hosts] answers "bash: [-f: command not found". Put spaces inside.',
        whenNot: 'For a single case && is enough; with else, if reads better.',
      },
      example:
        'Before you look: what will [-f /etc/hosts], with no spaces inside the brackets, answer?',
    },
    fr: {
      title: 'Conditions : if, test et [[ ]]',
      goal: 'Écris ~/check.sh : si /etc/peer4u/app.env existe, il affiche « ok » ; sinon, il affiche « falta » et sort avec le code 1. Il sera testé avec bash ~/check.sh, avec et sans le fichier.',
      theory: {
        what: 'if lance une commande et regarde son code : 0 veut dire vrai. [ ] teste des fichiers (-f, -d), des textes (=) et des nombres (-gt).',
        when: 'Quand un script doit décider.',
        how: [
          'if [ -f app.env ]; then echo ok; else echo falta; fi',
          '[ "$n" -gt 5 ] && echo grande',
        ],
        problems:
          'Sans espaces dans les crochets : [-f /etc/hosts] répond « bash: [-f: command not found ». Mets des espaces dedans.',
        whenNot: 'Pour un cas isolé, && suffit ; avec else, if se lit mieux.',
      },
      example: 'Avant de regarder : que répondra [-f /etc/hosts], sans espaces dans les crochets ?',
    },
    example: [
      '[-f /etc/hosts]',
      '[ -f /etc/hosts ] && echo hay',
      'if [ -d /srv ]; then echo "hay /srv"; else echo no; fi',
      'x=7; if [ $x -gt 5 ]; then echo grande; fi',
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
        what: 'for repite unas órdenes para cada palabra de una lista o fichero de un comodín; while, mientras una orden vaya bien.',
        when: 'Lo mismo con muchos ficheros o servidores.',
        how: [
          'for f in *.conf; do cp "$f" "$f.bak"; done',
          'while read -r u; do echo "$u"; done < lista.txt',
        ],
        problems:
          'Si el comodín no encaja con nada, for da una vuelta con el patrón tal cual: for f in /nada/*.conf escribe «/nada/*.conf». Mira antes con ls.',
        whenNot: 'mv *.log logs/ no necesita bucle.',
      },
      example:
        'Antes de verlo: en /nada no hay ningún .conf. ¿Qué escribirá for f in /nada/*.conf; do echo "$f"; done?',
    },
    en: {
      title: 'Loops: for and while',
      goal: 'For each .conf in ~/configs, leave a .bak copy next to it (a.conf → a.conf.bak). leeme.txt is not copied.',
      theory: {
        what: 'for repeats some commands for each word of a list or file of a wildcard; while, as long as a command succeeds.',
        when: 'The same thing on many files or servers.',
        how: [
          'for f in *.conf; do cp "$f" "$f.bak"; done',
          'while read -r u; do echo "$u"; done < lista.txt',
        ],
        problems:
          'If the wildcard matches nothing, for loops once with the pattern as it is: for f in /nada/*.conf prints "/nada/*.conf". Check with ls first.',
        whenNot: 'mv *.log logs/ needs no loop.',
      },
      example:
        'Before you look: /nada has no .conf files. What will for f in /nada/*.conf; do echo "$f"; done print?',
    },
    fr: {
      title: 'Boucles : for et while',
      goal: 'Pour chaque .conf de ~/configs, laisse à côté une copie en .bak (a.conf → a.conf.bak). leeme.txt n’est pas copié.',
      theory: {
        what: 'for répète des commandes pour chaque mot d’une liste ou fichier d’un joker ; while, tant qu’une commande réussit.',
        when: 'La même chose sur beaucoup de fichiers ou de serveurs.',
        how: [
          'for f in *.conf; do cp "$f" "$f.bak"; done',
          'while read -r u; do echo "$u"; done < lista.txt',
        ],
        problems:
          'Si le joker ne correspond à rien, for fait un tour avec le motif tel quel : for f in /nada/*.conf écrit « /nada/*.conf ». Vérifie avant avec ls.',
        whenNot: 'mv *.log logs/ n’a pas besoin de boucle.',
      },
      example:
        'Avant de regarder : /nada ne contient aucun .conf. Qu’écrira for f in /nada/*.conf; do echo "$f"; done ?',
    },
    example: [
      'for i in 1 2 3; do echo "vuelta $i"; done',
      'for f in /var/log/nginx/*.log; do echo "$f: $(wc -l < $f)"; done',
      'for f in /nada/*.conf; do echo "$f"; done',
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
        what: 'Un guion empieza por #!/bin/bash y se ejecuta con ./guion.sh. $1, $2… son los argumentos; $#, cuántos; exit N sale con ese código.',
        when: 'Lo que repites más de dos veces: despliegues, copias.',
        how: [
          '#!/bin/bash',
          'set -euo pipefail     # para al primer fallo',
          'echo "$# argumentos: $@"',
        ],
        problems:
          'Usar $1 sin comprobarlo: sin argumento vale vacío y el guion sigue. Con set -u se para con «unbound variable».',
        whenNot: 'bash guion.sh no necesita la x; ./guion.sh pide chmod +x.',
      },
      example:
        'Antes de verlo: v.sh tiene set -u y usa $1. ¿Qué pasará con bash v.sh, sin argumentos?',
    },
    en: {
      title: 'Real scripts: arguments and set -euo pipefail',
      goal: 'Write ~/deploy.sh, executable: with no arguments it prints «uso: deploy.sh VERSION» to standard error and exits 1; with a version it creates ~/releases/VERSION and prints «desplegada VERSION».',
      theory: {
        what: 'A script starts with #!/bin/bash and runs with ./script.sh. $1, $2… are the arguments; $#, how many; exit N leaves with that code.',
        when: 'Anything you repeat more than twice: deployments, backups.',
        how: [
          '#!/bin/bash',
          'set -euo pipefail     # stop at the first failure',
          'echo "$# argumentos: $@"',
        ],
        problems:
          'Using $1 without checking it: with no argument it is empty and the script carries on. With set -u it stops with "unbound variable".',
        whenNot: 'bash script.sh does not need the x; ./script.sh needs chmod +x.',
      },
      example:
        'Before you look: v.sh has set -u and uses $1. What happens with bash v.sh, without arguments?',
    },
    fr: {
      title: 'De vrais scripts : arguments et set -euo pipefail',
      goal: 'Écris ~/deploy.sh, exécutable : sans argument, il écrit « uso: deploy.sh VERSION » sur la sortie d’erreur et sort avec 1 ; avec une version, il crée ~/releases/VERSION et affiche « desplegada VERSION ».',
      theory: {
        what: 'Un script commence par #!/bin/bash et se lance avec ./script.sh. $1, $2… sont les arguments ; $#, leur nombre ; exit N sort avec ce code.',
        when: 'Ce que tu répètes plus de deux fois : déploiements, sauvegardes.',
        how: [
          '#!/bin/bash',
          'set -euo pipefail     # s’arrête au premier échec',
          'echo "$# argumentos: $@"',
        ],
        problems:
          'Utiliser $1 sans le vérifier : sans argument, il est vide et le script continue. Avec set -u, il s’arrête sur « unbound variable ».',
        whenNot: 'bash script.sh n’a pas besoin du x ; ./script.sh demande chmod +x.',
      },
      example:
        'Avant de regarder : v.sh a set -u et utilise $1. Que se passe-t-il avec bash v.sh, sans argument ?',
    },
    example: [
      'printf \'#!/bin/bash\\nset -u\\necho "versión: $1"\\n\' > v.sh',
      'bash v.sh',
      'bash v.sh 2.4',
      'chmod +x v.sh',
      './v.sh 2.5',
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
    fr: {
      title: 'Boss : la sauvegarde de chaque nuit',
      goal: 'Automatise la sauvegarde de ~/proyectos avec un script qui marche même si ~/backups n’existe pas.',
      story:
        'La sauvegarde se faisait à la main, et un jour quelqu’un a oublié. À toi de la mettre dans un script.',
      tasks: [
        'Écris ~/backup.sh, exécutable.',
        'Il crée ~/backups s’il n’existe pas.',
        'Il archive ~/proyectos dans ~/backups/proyectos-DATE.tar.gz (DATE avec date +%F).',
        'Il affiche le texte espagnol « copia:  » suivi du chemin complet du fichier.',
        'Lance-le une fois.',
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
        what: 'systemctl status dice si un servicio va; start, stop y restart lo arrancan, paran y reinician; enable lo arranca al encender.',
        when: 'Tras cambiar una configuración o después de un fallo.',
        how: [
          'systemctl status nginx',
          'sudo systemctl restart nginx',
          'sudo systemctl enable --now nginx  # ya y al encender',
        ],
        problems:
          'Arrancar sin enable: tras sudo systemctl start nginx va, pero systemctl is-enabled nginx dice «disabled»: al reiniciar no volverá.',
        whenNot: 'No pares un servicio con kill: systemd puede rearrancarlo.',
      },
      example:
        'Antes de verlo: arrancas nginx con sudo systemctl start. ¿Qué dirá systemctl is-enabled nginx?',
    },
    en: {
      title: 'Services: systemctl',
      goal: 'nginx is stopped and does not start at boot. Start it and make it start at boot.',
      theory: {
        what: 'systemctl status says whether a service runs; start, stop and restart do what they say; enable starts it at boot.',
        when: 'After changing a configuration or after a failure.',
        how: [
          'systemctl status nginx',
          'sudo systemctl restart nginx',
          'sudo systemctl enable --now nginx  # now and at boot',
        ],
        problems:
          'Starting without enable: after sudo systemctl start nginx it runs, but systemctl is-enabled nginx says "disabled": after a reboot it is gone.',
        whenNot: 'Do not stop a service with kill: systemd may restart it.',
      },
      example:
        'Before you look: you start nginx with sudo systemctl start. What will systemctl is-enabled nginx say?',
    },
    fr: {
      title: 'Services : systemctl',
      goal: 'nginx est arrêté et ne démarre pas avec la machine. Démarre-le et fais en sorte qu’il se lance tout seul quand la machine s’allume.',
      theory: {
        what: 'systemctl status dit si un service tourne ; start, stop et restart font ce qu’ils disent ; enable le lance au démarrage.',
        when: 'Après avoir changé une configuration ou après une panne.',
        how: [
          'systemctl status nginx',
          'sudo systemctl restart nginx',
          'sudo systemctl enable --now nginx  # maintenant et au démarrage',
        ],
        problems:
          'Démarrer sans enable : après sudo systemctl start nginx, il tourne, mais systemctl is-enabled nginx dit « disabled » : au redémarrage, il n’est plus là.',
        whenNot: 'N’arrête pas un service avec kill : systemd peut le relancer.',
      },
      example:
        'Avant de regarder : tu démarres nginx avec sudo systemctl start. Que dira systemctl is-enabled nginx ?',
    },
    example: [
      'systemctl is-active nginx',
      'systemctl start nginx',
      'sudo systemctl start nginx',
      'systemctl is-active nginx',
      'systemctl is-enabled nginx',
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
        what: 'journalctl lee el registro de systemd: -u de un servicio, -n las últimas líneas, -p err solo errores.',
        when: 'Cuando un servicio no arranca.',
        how: [
          'journalctl -u peer4u-api -n 20',
          'journalctl -p err --since "1 hour ago"',
          'journalctl -u nginx -f      # siguiendo',
        ],
        problems:
          'Quedarte con la última línea: «Failed to start peer4u-api.service» dice que falló, no por qué. La causa va antes: «Error: PORT is not set».',
        whenNot: 'Si el programa escribe su propio registro, como nginx, mira también ese fichero.',
      },
      example: 'Antes de verlo: la API no arranca. ¿Dirá la última línea de su registro por qué?',
    },
    en: {
      title: 'Logs: journalctl',
      goal: 'The API (peer4u-api) will not start. Find out why in its log, fix /etc/peer4u/app.env (PORT=3000) and start it.',
      theory: {
        what: 'journalctl reads the systemd log: -u for one service, -n the last lines, -p err only errors.',
        when: 'When a service will not start.',
        how: [
          'journalctl -u peer4u-api -n 20',
          'journalctl -p err --since "1 hour ago"',
          'journalctl -u nginx -f      # following',
        ],
        problems:
          'Stopping at the last line: "Failed to start peer4u-api.service" says it failed, not why. The cause comes earlier: "Error: PORT is not set".',
        whenNot: 'If the program writes its own log, like nginx, check that file too.',
      },
      example: 'Before you look: the API will not start. Will the last line of its log say why?',
    },
    fr: {
      title: 'Logs système : journalctl',
      goal: 'L’API (peer4u-api) ne démarre pas. Cherche pourquoi dans son log, corrige /etc/peer4u/app.env (PORT=3000) et démarre-la.',
      theory: {
        what: 'journalctl lit le journal de systemd : -u pour un service, -n les dernières lignes, -p err seulement les erreurs.',
        when: 'Quand un service ne démarre pas.',
        how: [
          'journalctl -u peer4u-api -n 20',
          'journalctl -p err --since "1 hour ago"',
          'journalctl -u nginx -f      # en suivant',
        ],
        problems:
          'T’arrêter à la dernière ligne : « Failed to start peer4u-api.service » dit que ça a échoué, pas pourquoi. La cause vient avant : « Error: PORT is not set ».',
        whenNot: 'Si le programme écrit son propre journal, comme nginx, regarde aussi ce fichier.',
      },
      example:
        'Avant de regarder : l’API ne démarre pas. La dernière ligne de son journal dira-t-elle pourquoi ?',
    },
    example: [
      'journalctl -u peer4u-api -n 1',
      'journalctl -u peer4u-api -n 5',
      'journalctl -u nginx -n 3',
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
        what: 'cron ejecuta órdenes a su hora. Cada línea: minuto, hora, día, mes, día de la semana y la orden.',
        when: 'Copias y limpiezas que pasan solas.',
        how: [
          '30 3 * * * /home/peer/backup.sh  # 03:30 a diario',
          'crontab mi-cron.txt             # carga la tabla',
          'crontab -l',
        ],
        problems:
          'Cargar una tabla borra la de antes: tras dos crontab -, crontab -l solo enseña «*/10 * * * * date >> /tmp/hora.txt». Júntalas en un fichero.',
        whenNot: 'cron no carga tu .bashrc: usa rutas absolutas.',
      },
      example:
        'Antes de verlo: cargas una tabla con una línea y luego otra con otra. ¿Cuántas líneas enseñará crontab -l?',
    },
    en: {
      title: 'Scheduled jobs: cron',
      goal: 'Schedule /home/peer/backup.sh in your crontab to run every day at 03:30.',
      theory: {
        what: 'cron runs commands on schedule. Each line: minute, hour, day, month, weekday and the command.',
        when: 'Backups and clean-ups that run on their own.',
        how: [
          '30 3 * * * /home/peer/backup.sh  # daily at 03:30',
          'crontab mi-cron.txt             # load the table',
          'crontab -l',
        ],
        problems:
          'Loading a table wipes the old one: after two crontab -, crontab -l shows only "*/10 * * * * date >> /tmp/hora.txt". Put them all in one file.',
        whenNot: 'cron does not load your .bashrc: use absolute paths.',
      },
      example:
        'Before you look: you load a table with one line, then another with another. How many lines will crontab -l show?',
    },
    fr: {
      title: 'Tâches planifiées : cron',
      goal: 'Programme /home/peer/backup.sh dans ta crontab pour qu’il s’exécute tous les jours à 3 h 30.',
      theory: {
        what: 'cron lance des commandes à l’heure prévue. Chaque ligne : minute, heure, jour, mois, jour de la semaine et la commande.',
        when: 'Sauvegardes et ménage qui se font seuls.',
        how: [
          '30 3 * * * /home/peer/backup.sh  # tous les jours à 03:30',
          'crontab mi-cron.txt             # charge la table',
          'crontab -l',
        ],
        problems:
          'Charger une table efface l’ancienne : après deux crontab -, crontab -l n’affiche que « */10 * * * * date >> /tmp/hora.txt ». Mets-les toutes dans un fichier.',
        whenNot: 'cron ne charge pas ton .bashrc : utilise des chemins absolus.',
      },
      example:
        'Avant de regarder : tu charges une table d’une ligne, puis une autre. Combien de lignes affichera crontab -l ?',
    },
    example: [
      'crontab -l',
      "echo '0 2 * * * /home/peer/limpia.sh' | crontab -",
      "echo '*/10 * * * * date >> /tmp/hora.txt' | crontab -",
      'crontab -l',
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
        'Alguien desplegó configuración a medianoche y se fue a dormir. Ahora no va ni la web ni la API. El turno de on-call anterior dejó una copia buena de nginx en /etc/nginx/nginx.conf.bak.',
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
        'Someone deployed config at midnight and went to bed. Now neither the site nor the API works. The previous on-call shift left a good nginx copy at /etc/nginx/nginx.conf.bak.',
      tasks: [
        'Find which services are down and why (systemctl, journalctl).',
        'Fix nginx: restore its good configuration and test it with nginx -t.',
        'Fix the API: /etc/peer4u/app.env must say PORT=3000.',
        'Start both.',
        'Check with curl that http://localhost/api/health answers.',
      ],
    },
    fr: {
      title: 'Boss : panne à trois heures du matin',
      goal: 'Remets nginx et l’API sur pied et vérifie que le site répond.',
      story:
        'Quelqu’un a déployé une configuration à minuit et est allé se coucher. Maintenant, ni le site ni l’API ne marchent. La personne d’astreinte précédente a laissé une copie saine de la configuration de nginx dans /etc/nginx/nginx.conf.bak.',
      tasks: [
        'Regarde quels services sont tombés et pourquoi (systemctl, journalctl).',
        'Répare nginx : remets sa configuration saine et teste-la avec nginx -t.',
        'Répare l’API : /etc/peer4u/app.env doit contenir PORT=3000.',
        'Démarre les deux.',
        'Vérifie avec curl que http://localhost/api/health répond.',
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
        what: 'curl hace peticiones HTTP: -I solo cabeceras, -s sin progreso, -o a un fichero. ss -tln enseña qué puertos escuchan.',
        when: 'Para saber si falla el servicio o el puerto.',
        how: [
          'ss -tln                    # puertos que escuchan',
          'curl -I http://localhost   # solo cabeceras',
          'curl -s http://localhost/api/health',
        ],
        problems:
          "Llamar a un puerto donde nadie escucha: curl http://localhost:8080 responde «curl: (7) Failed to connect to localhost port 8080 after 0 ms: Couldn't connect to server».",
        whenNot: 'Un 502 es distinto: nginx va, lo de detrás no.',
      },
      example:
        'Antes de verlo: ss -tln no enseña el 8080. ¿Qué responderá curl http://localhost:8080?',
    },
    en: {
      title: 'The network from inside: ss, ping and curl',
      goal: 'Ask for the API status through nginx (http://localhost/api/health) and save the answer in ~/health.json.',
      theory: {
        what: 'curl makes HTTP requests: -I headers only, -s no progress, -o to a file. ss -tln shows which ports listen.',
        when: 'To tell whether the service or the port fails.',
        how: [
          'ss -tln                    # ports that listen',
          'curl -I http://localhost   # headers only',
          'curl -s http://localhost/api/health',
        ],
        problems:
          'Calling a port where nobody listens: curl http://localhost:8080 answers "curl: (7) Failed to connect to localhost port 8080 after 0 ms: Couldn\'t connect to server".',
        whenNot: 'A 502 differs: nginx answers, the backend does not.',
      },
      example:
        'Before you look: ss -tln does not show 8080. What will curl http://localhost:8080 answer?',
    },
    fr: {
      title: 'Le réseau vu de l’intérieur : ss, ping et curl',
      goal: 'Demande l’état de l’API en passant par nginx (http://localhost/api/health) et enregistre la réponse dans ~/health.json.',
      theory: {
        what: 'curl fait des requêtes HTTP : -I les en-têtes, -s sans progression, -o vers un fichier. ss -tln montre quels ports écoutent.',
        when: 'Pour savoir si c’est le service ou le port qui flanche.',
        how: [
          'ss -tln                    # ports qui écoutent',
          'curl -I http://localhost   # en-têtes seulement',
          'curl -s http://localhost/api/health',
        ],
        problems:
          "Appeler un port où personne n’écoute : curl http://localhost:8080 répond « curl: (7) Failed to connect to localhost port 8080 after 0 ms: Couldn't connect to server ».",
        whenNot: 'Un 502, c’est autre chose : nginx répond, pas le service derrière.',
      },
      example:
        'Avant de regarder : ss -tln n’affiche pas le 8080. Que répondra curl http://localhost:8080 ?',
    },
    example: [
      'ss -tln',
      'curl http://localhost:8080',
      'curl -I http://localhost',
      'curl -s http://localhost/api/health',
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
        what: 'ssh abre una sesión en otra máquina (exit vuelve) o ejecuta allí una orden. scp copia ficheros; db1:ruta está en db1.',
        when: 'Para mirar y traer cosas de otra máquina.',
        how: [
          "ssh db1 'ls /var/backups/db'   # una orden en db1",
          'ssh db1                        # sesión; exit vuelve',
          'scp db1:/var/log/syslog ~/',
        ],
        problems:
          "Buscar en la máquina equivocada: en web1, ls /var/backups/db responde «ls: cannot access '/var/backups/db': No such file or directory». Mira hostname.",
        whenNot: "ssh db1 'orden' vuelve sola; tras ssh db1, sigues allí hasta exit.",
      },
      example:
        'Antes de verlo: las copias viven en db1. ¿Qué responderá ls /var/backups/db escrito en web1?',
    },
    en: {
      title: 'Other machines: ssh and scp',
      goal: 'Bring to ~/restore/ (on web1) the most recent dump from db1, which lives in /var/backups/db.',
      theory: {
        what: 'ssh opens a session on another machine (exit returns) or runs one command there. scp copies files; db1:path lives on db1.',
        when: 'To look at and fetch things from another machine.',
        how: [
          "ssh db1 'ls /var/backups/db'   # one command on db1",
          'ssh db1                        # session; exit returns',
          'scp db1:/var/log/syslog ~/',
        ],
        problems:
          'Looking on the wrong machine: on web1, ls /var/backups/db answers "ls: cannot access \'/var/backups/db\': No such file or directory". Check hostname.',
        whenNot: "ssh db1 'command' returns; after ssh db1, you stay until exit.",
      },
      example:
        'Before you look: the backups live on db1. What will ls /var/backups/db answer when typed on web1?',
    },
    fr: {
      title: 'D’autres machines : ssh et scp',
      goal: 'Ramène dans ~/restore/ (sur web1) le dump le plus récent de db1, qui se trouve dans /var/backups/db.',
      theory: {
        what: 'ssh ouvre une session sur une autre machine (exit revient) ou y lance une commande. scp copie des fichiers ; db1:chemin est sur db1.',
        when: 'Pour regarder et récupérer des choses sur une autre machine.',
        how: [
          "ssh db1 'ls /var/backups/db'   # une commande sur db1",
          'ssh db1                        # session ; exit revient',
          'scp db1:/var/log/syslog ~/',
        ],
        problems:
          "Chercher sur la mauvaise machine : sur web1, ls /var/backups/db répond « ls: cannot access '/var/backups/db': No such file or directory ». Regarde hostname.",
        whenNot: "ssh db1 'commande' revient seul ; après ssh db1, tu y restes jusqu’à exit.",
      },
      example:
        'Avant de regarder : les sauvegardes sont sur db1. Que répondra ls /var/backups/db tapé sur web1 ?',
    },
    example: [
      'hostname',
      'ls /var/backups/db',
      "ssh db1 'ls /var/backups/db'",
      'ssh db1',
      'hostname',
      'exit',
    ],
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
        what: 'rsync copia solo lo que cambia, también a otra máquina: -a conserva permisos y fechas, -v cuenta, -n prueba en seco.',
        when: 'Espejos de una web y copias que se repiten.',
        how: [
          'rsync -av html/ db1:/srv/copia/',
          'rsync -avn --delete html/ /tmp/web/  # en seco',
          'rsync -av --delete html/ /tmp/web/',
        ],
        problems:
          'Esperar un espejo sin --delete: rsync -av copia lo nuevo pero deja lo que sobra, y ls /tmp/web sigue enseñando «viejo.html».',
        whenNot: 'cp copia todo cada vez; rsync, solo lo que cambió.',
      },
      example:
        'Antes de verlo: /tmp/web tiene un viejo.html que el origen no tiene. ¿Seguirá ahí tras rsync -av?',
    },
    en: {
      title: 'Syncing: rsync',
      goal: 'Make db1:/home/peer/espejo/ match web1’s /var/www/html/: what is missing, copied; what is extra, deleted.',
      theory: {
        what: 'rsync copies only what changed, locally or to another machine: -a keeps permissions and dates, -v reports, -n is a dry run.',
        when: 'Website mirrors and copies you repeat.',
        how: [
          'rsync -av html/ db1:/srv/copia/',
          'rsync -avn --delete html/ /tmp/web/  # dry run',
          'rsync -av --delete html/ /tmp/web/',
        ],
        problems:
          'Expecting a mirror without --delete: rsync -av copies what is new but leaves the leftovers, and ls /tmp/web still shows "viejo.html".',
        whenNot: 'cp copies everything every time; rsync, only what changed.',
      },
      example:
        'Before you look: /tmp/web has a viejo.html that the source does not. Will it still be there after rsync -av?',
    },
    fr: {
      title: 'Synchroniser : rsync',
      goal: 'Rends db1:/home/peer/espejo/ identique à /var/www/html/ sur web1 : ce qui manque, copié ; ce qui est en trop, supprimé.',
      theory: {
        what: 'rsync copie seulement ce qui change, aussi vers une autre machine : -a garde droits et dates, -v raconte, -n essaie à blanc.',
        when: 'Miroirs d’un site et copies qui se répètent.',
        how: [
          'rsync -av html/ db1:/srv/copia/',
          'rsync -avn --delete html/ /tmp/web/  # à blanc',
          'rsync -av --delete html/ /tmp/web/',
        ],
        problems:
          'Attendre un miroir sans --delete : rsync -av copie le nouveau mais laisse le reste, et ls /tmp/web affiche toujours « viejo.html ».',
        whenNot: 'cp copie tout à chaque fois ; rsync, seulement ce qui a changé.',
      },
      example:
        'Avant de regarder : /tmp/web contient un viejo.html que la source n’a pas. Sera-t-il encore là après rsync -av ?',
    },
    example: [
      'mkdir -p /tmp/web && touch /tmp/web/viejo.html',
      'rsync -av /var/www/html/ /tmp/web/',
      'ls /tmp/web',
      'rsync -av --delete /var/www/html/ /tmp/web/',
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
    fr: {
      title: 'Boss : la base de données ne répond plus',
      goal: 'Relance PostgreSQL sur db1, récupère la dernière sauvegarde et vérifie tout depuis web1.',
      story:
        'L’API affiche « db connection refused (db1:5432) ». Il faut aller voir sur l’autre machine.',
      tasks: [
        'Démarre postgresql sur db1 (en ssh, avec sudo).',
        'Ramène le dump le plus récent de db1 (/var/backups/db) dans ~/restore/ sur web1.',
        'Laisse une copie du /etc/nginx/nginx.conf de web1 sur db1, dans /home/peer/configs/.',
        'Enregistre dans ~/health.json la réponse de http://localhost/api/health.',
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
    fr: {
      title: 'Boss final : avancé',
      goal: 'Une panne complète de la production, et ce qu’il faut pour qu’elle ne te prenne plus par surprise : tout le cours, contre la montre. Si tu réussis, tu obtiens le certificat avancé.',
      story:
        'Lundi, 9 h. Le site ne charge pas, le disque est plein, quelque chose dévore le CPU et la dernière sauvegarde est sur db1. Et ensuite, on veut que la prochaine fois, une alerte parte toute seule.',
      tasks: [
        'Relance nginx (copie saine dans /etc/nginx/nginx.conf.bak) et l’API (PORT=3000 dans /etc/peer4u/app.env).',
        'Arrête le miner.py de deploy.',
        'Fais passer le disque sous les 80 % sans supprimer /var/log/peer4u/debug.log.',
        'Écris ~/bin/salud.sh, exécutable : si curl -sf http://localhost/api/health réussit, il affiche « ok » ; sinon, il affiche « caida » et sort avec 1.',
        'Programme-le dans ta crontab toutes les 5 minutes : */5 * * * * /home/peer/bin/salud.sh',
        'Ramène dans ~/restore/ le dump le plus récent de db1 (/var/backups/db).',
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
