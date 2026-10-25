/**
 * Nivel principiante: bloques 1 a 3 y su jefe final. Cada unidad se apoya en
 * las anteriores: primero mirar (pwd, ls, cd, cat), luego tocar ficheros y,
 * al final, quién puede tocar qué (permisos, sudo, usuarios).
 */

import type { Unit } from './types.js'

const H = '/home/peer'

export const BEGINNER: Unit[] = [
  /* ---------- Bloque 1: orientarte ---------- */
  {
    id: 'ls',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: '¿Dónde estoy? pwd y ls',
      goal: 'Enseña qué hay dentro de /srv/peer4u (la carpeta de la API).',
      theory: {
        what: 'pwd dice en qué carpeta estás; ls lista lo que hay en una carpeta (la tuya si no dices cuál).',
        how: [
          'pwd',
          'ls',
          'ls /var/log',
          'ls -l /var/log      # formato largo: permisos, dueño, tamaño, fecha',
          'man ls              # la ayuda de cualquier comando',
        ],
        when: 'Lo primero al entrar en un servidor: saber dónde estás y qué tienes alrededor antes de tocar nada.',
        problems: 'Linux distingue mayúsculas: Notas.txt y notas.txt son dos ficheros distintos.',
      },
      example: 'Miras dónde estás, qué hay en tu carpeta y el detalle de /var/log.',
    },
    en: {
      title: 'Where am I? pwd and ls',
      goal: 'Show what is inside /srv/peer4u (the API directory).',
      theory: {
        what: 'pwd tells you which directory you are in; ls lists what is in a directory (yours if you do not say which).',
        how: [
          'pwd',
          'ls',
          'ls /var/log',
          'ls -l /var/log      # long format: permissions, owner, size, date',
          'man ls              # help for any command',
        ],
        when: 'The first thing after logging into a server: know where you are and what is around before touching anything.',
        problems: 'Linux is case-sensitive: Notes.txt and notes.txt are two different files.',
      },
      example: 'You check where you are, what is in your directory and the details of /var/log.',
    },
    fr: {
      title: 'Où suis-je ? pwd et ls',
      goal: 'Affiche ce qu’il y a dans /srv/peer4u (le dossier de l’API).',
      theory: {
        what: 'pwd te dit dans quel dossier tu es ; ls liste ce qu’il y a dans un dossier (le tien si tu n’en précises pas).',
        how: [
          'pwd',
          'ls',
          'ls /var/log',
          'ls -l /var/log      # format long : permissions, propriétaire, taille, date',
          'man ls              # l’aide de n’importe quelle commande',
        ],
        when: 'La première chose à faire en arrivant sur un serveur : savoir où tu es et ce qu’il y a autour avant de toucher à quoi que ce soit.',
        problems:
          'Linux distingue les majuscules : Notes.txt et notes.txt sont deux fichiers différents.',
      },
      example: 'Tu regardes où tu es, ce qu’il y a dans ton dossier et le détail de /var/log.',
    },
    example: ['pwd', 'ls', 'ls -l /var/log'],
    solution: ['ls /srv/peer4u'],
    check: { output: true },
  },
  {
    id: 'cd',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Moverte: cd y las rutas',
      goal: 'Acaba dentro de /var/log/nginx.',
      theory: {
        what: 'cd cambia de carpeta. Una ruta absoluta empieza por / (desde la raíz); una relativa parte de donde estás.',
        how: [
          'cd /var/log         # absoluta',
          'cd nginx            # relativa: /var/log/nginx',
          'cd ..               # la carpeta de arriba',
          'cd ~   (o cd solo)  # tu carpeta personal',
          'cd -                # la carpeta de antes',
        ],
        when: 'Para trabajar dentro de una carpeta sin escribir la ruta entera cada vez.',
        whenNot: 'En guiones es más seguro usar rutas absolutas: no dependen de dónde se ejecuten.',
      },
      example: 'Vas a /var/log, entras en nginx, subes con .. y vuelves a casa con ~.',
    },
    en: {
      title: 'Moving around: cd and paths',
      goal: 'End up inside /var/log/nginx.',
      theory: {
        what: 'cd changes directory. An absolute path starts with / (from the root); a relative one starts where you are.',
        how: [
          'cd /var/log         # absolute',
          'cd nginx            # relative: /var/log/nginx',
          'cd ..               # the directory above',
          'cd ~   (or just cd) # your home',
          'cd -                # the previous directory',
        ],
        when: 'To work inside a directory without typing the full path every time.',
        whenNot: 'In scripts absolute paths are safer: they do not depend on where they run.',
      },
      example: 'You go to /var/log, enter nginx, go up with .. and back home with ~.',
    },
    fr: {
      title: 'Se déplacer : cd et les chemins',
      goal: 'Termine dans /var/log/nginx.',
      theory: {
        what: 'cd change de dossier. Un chemin absolu commence par / (depuis la racine) ; un chemin relatif part de là où tu es.',
        how: [
          'cd /var/log         # absolu',
          'cd nginx            # relatif : /var/log/nginx',
          'cd ..               # le dossier du dessus',
          'cd ~   (ou cd seul) # ton dossier personnel',
          'cd -                # le dossier précédent',
        ],
        when: 'Pour travailler dans un dossier sans retaper le chemin complet à chaque fois.',
        whenNot:
          'Dans les scripts, les chemins absolus sont plus sûrs : ils ne dépendent pas de l’endroit où on les lance.',
      },
      example:
        'Tu vas dans /var/log, tu entres dans nginx, tu remontes avec .. et tu rentres chez toi avec ~.',
    },
    example: ['cd /var/log', 'pwd', 'cd nginx', 'pwd', 'cd ..', 'cd ~', 'pwd'],
    solution: ['cd /var/log/nginx'],
    check: { cwd: true },
  },
  {
    id: 'hidden',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    setup: {
      files: {
        '/srv/peer4u/.env.example': {
          text: 'API_KEY=cambia-esto\nDB_URL=postgres://db1:5432/peer4u\n',
          owner: 'deploy',
        },
      },
    },
    es: {
      title: 'Ficheros ocultos y cat',
      goal: 'En /srv/peer4u hay un fichero oculto. Enseña su contenido.',
      theory: {
        what: 'Los ficheros que empiezan por punto (.bashrc, .env) no salen con ls a secas: ls -a los enseña. cat imprime un fichero entero.',
        how: ['ls -a ~', 'ls -la ~            # oculto y en formato largo', 'cat ~/.bashrc'],
        when: 'La configuración suele estar en ficheros ocultos: .bashrc, .ssh/, .env, .gitignore.',
        problems:
          'cat de un fichero enorme llena la pantalla: para eso están head, tail y less (siguiente unidad).',
      },
      example: 'Ves tu carpeta con y sin -a y lees tu .bashrc.',
    },
    en: {
      title: 'Hidden files and cat',
      goal: 'There is a hidden file in /srv/peer4u. Show its contents.',
      theory: {
        what: 'Files starting with a dot (.bashrc, .env) do not show with plain ls: ls -a shows them. cat prints a whole file.',
        how: ['ls -a ~', 'ls -la ~            # hidden and long format', 'cat ~/.bashrc'],
        when: 'Configuration usually lives in hidden files: .bashrc, .ssh/, .env, .gitignore.',
        problems:
          'cat on a huge file floods the screen: that is what head, tail and less are for (next unit).',
      },
      example: 'You look at your home with and without -a and read your .bashrc.',
    },
    fr: {
      title: 'Fichiers cachés et cat',
      goal: 'Il y a un fichier caché dans /srv/peer4u. Affiche son contenu.',
      theory: {
        what: 'Les fichiers qui commencent par un point (.bashrc, .env) n’apparaissent pas avec ls tout court : ls -a les affiche. cat affiche un fichier en entier.',
        how: ['ls -a ~', 'ls -la ~            # cachés et en format long', 'cat ~/.bashrc'],
        when: 'La configuration se trouve souvent dans des fichiers cachés : .bashrc, .ssh/, .env, .gitignore.',
        problems:
          'cat sur un énorme fichier remplit l’écran : c’est à ça que servent head, tail et less (unité suivante).',
      },
      example: 'Tu regardes ton dossier avec et sans -a, et tu lis ton .bashrc.',
    },
    example: ['ls ~', 'ls -a ~', 'cat ~/.bashrc'],
    solution: ['cat /srv/peer4u/.env.example'],
    check: { output: true },
  },
  {
    id: 'read',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Leer registros: head, tail, wc, less',
      goal: 'Enseña las 5 últimas líneas de /var/log/peer4u/app.log.',
      theory: {
        what: 'head enseña el principio de un fichero, tail el final, wc -l cuenta líneas y less lo pasa página a página.',
        how: [
          'head -n 3 fichero',
          'tail -n 20 /var/log/syslog',
          'tail -f app.log      # sigue lo que se va escribiendo',
          'wc -l fichero',
          'less fichero         # q para salir',
        ],
        when: 'En un registro lo nuevo está al final: tail es lo que más se usa en una guardia.',
        problems:
          'tail -f no acaba nunca (Ctrl+C para salir); en este simulador enseña lo último y vuelve.',
      },
      example:
        'Miras el principio del registro de la API, cuántas líneas tiene y el final de syslog.',
    },
    en: {
      title: 'Reading logs: head, tail, wc, less',
      goal: 'Show the last 5 lines of /var/log/peer4u/app.log.',
      theory: {
        what: 'head shows the start of a file, tail the end, wc -l counts lines and less pages through it.',
        how: [
          'head -n 3 file',
          'tail -n 20 /var/log/syslog',
          'tail -f app.log      # follow what is being written',
          'wc -l file',
          'less file            # q to quit',
        ],
        when: 'In a log the new stuff is at the end: tail is what you use most on call.',
        problems:
          'tail -f never ends (Ctrl+C to quit); in this simulator it shows the end and returns.',
      },
      example: 'You look at the start of the API log, how many lines it has and the end of syslog.',
    },
    fr: {
      title: 'Lire des logs : head, tail, wc, less',
      goal: 'Affiche les 5 dernières lignes de /var/log/peer4u/app.log.',
      theory: {
        what: 'head affiche le début d’un fichier, tail la fin, wc -l compte les lignes et less le fait défiler page par page.',
        how: [
          'head -n 3 fichier',
          'tail -n 20 /var/log/syslog',
          'tail -f app.log      # suit ce qui s’écrit au fur et à mesure',
          'wc -l fichier',
          'less fichier         # q pour quitter',
        ],
        when: 'Dans un log, le plus récent est à la fin : tail est ce que tu utiliseras le plus en astreinte.',
        problems:
          'tail -f ne s’arrête jamais (Ctrl+C pour sortir) ; dans ce simulateur, il affiche la fin et rend la main.',
      },
      example:
        'Tu regardes le début du log de l’API, combien de lignes il contient et la fin de syslog.',
    },
    example: [
      'head -n 3 /var/log/peer4u/app.log',
      'wc -l /var/log/peer4u/app.log',
      'tail -n 2 /var/log/syslog',
    ],
    solution: ['tail -n 5 /var/log/peer4u/app.log'],
    check: { output: true },
  },
  {
    id: 'boss1',
    block: 1,
    tier: 'beginner',
    kind: 'boss',
    limit: 180,
    setup: {
      files: {
        [`${H}/ONCALL.txt`]: 'Turno de on-call. La primera pista está oculta en /srv/peer4u.\n',
        '/srv/peer4u/.pista': {
          text: 'Ve a /var/log/nginx y enseña las 3 últimas líneas de access.log.\n',
          owner: 'deploy',
        },
      },
    },
    es: {
      title: 'Jefe: primer día de on-call',
      goal: 'Sigue las pistas y acaba en la carpeta de los registros de nginx enseñando lo último que ha pasado.',
      story:
        'Te toca el busca por primera vez. Alguien te ha dejado una nota en tu carpeta y una pista escondida.',
      tasks: [
        'Lee ~/ONCALL.txt.',
        'Encuentra y lee la pista oculta en /srv/peer4u.',
        'Haz lo que dice la pista (y quédate en esa carpeta).',
      ],
    },
    en: {
      title: 'Boss: first day on call',
      goal: 'Follow the clues and end in the nginx log directory showing the latest entries.',
      story:
        'You are holding the pager for the first time. Someone left a note in your home directory and a hidden clue.',
      tasks: [
        'Read ~/ONCALL.txt.',
        'Find and read the hidden clue in /srv/peer4u.',
        'Do what the clue says (and stay in that directory).',
      ],
    },
    fr: {
      title: 'Boss : premier jour d’astreinte',
      goal: 'Suis les indices et termine dans le dossier des logs de nginx en affichant les dernières entrées.',
      story:
        'C’est ta première astreinte. Quelqu’un t’a laissé une note dans ton dossier personnel et un indice caché.',
      tasks: [
        'Lis ~/ONCALL.txt.',
        'Trouve et lis l’indice caché dans /srv/peer4u.',
        'Fais ce que dit l’indice (et reste dans ce dossier).',
      ],
    },
    solution: [
      'cat ~/ONCALL.txt',
      'cat /srv/peer4u/.pista',
      'cd /var/log/nginx',
      'tail -n 3 access.log',
    ],
    check: { cwd: true, output: true },
  },

  /* ---------- Bloque 2: ficheros ---------- */
  {
    id: 'mkdir',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Crear: mkdir y touch',
      goal: 'Crea ~/deploy con las carpetas logs, config y releases, y un fichero vacío ~/deploy/config/app.env.',
      theory: {
        what: 'mkdir crea carpetas (-p crea también las de por medio y no se queja si ya existen); touch crea un fichero vacío o le pone la hora de ahora.',
        how: [
          'mkdir pruebas',
          'mkdir -p a/b/c',
          'mkdir -p deploy/{logs,config}   # llaves: varias de una vez',
          'touch vacio.txt',
        ],
        when: 'Para preparar la estructura de un despliegue, de unas copias o de un proyecto.',
        problems: 'Sin -p, mkdir a/b falla si a no existe.',
      },
      example: 'Creas carpetas anidadas de un golpe y un fichero vacío dentro.',
    },
    en: {
      title: 'Creating: mkdir and touch',
      goal: 'Create ~/deploy with the directories logs, config and releases, and an empty file ~/deploy/config/app.env.',
      theory: {
        what: 'mkdir creates directories (-p also creates the ones in between and does not complain if they exist); touch creates an empty file or sets its time to now.',
        how: [
          'mkdir tests',
          'mkdir -p a/b/c',
          'mkdir -p deploy/{logs,config}   # braces: several at once',
          'touch empty.txt',
        ],
        when: 'To prepare the layout of a deployment, of backups or of a project.',
        problems: 'Without -p, mkdir a/b fails if a does not exist.',
      },
      example: 'You create nested directories in one go and an empty file inside.',
    },
    fr: {
      title: 'Créer : mkdir et touch',
      goal: 'Crée ~/deploy avec les dossiers logs, config et releases, et un fichier vide ~/deploy/config/app.env.',
      theory: {
        what: 'mkdir crée des dossiers (-p crée aussi ceux du milieu et ne se plaint pas s’ils existent déjà) ; touch crée un fichier vide ou met à jour sa date de modification.',
        how: [
          'mkdir essais',
          'mkdir -p a/b/c',
          'mkdir -p deploy/{logs,config}   # accolades : plusieurs d’un coup',
          'touch vide.txt',
        ],
        when: 'Pour préparer l’arborescence d’un déploiement, de sauvegardes ou d’un projet.',
        problems: 'Sans -p, mkdir a/b échoue si a n’existe pas.',
      },
      example: 'Tu crées des dossiers imbriqués d’un seul coup et un fichier vide dedans.',
    },
    example: ['mkdir -p pruebas/a/b', 'touch pruebas/a/vacio.txt', 'ls -R pruebas'],
    solution: [
      'mkdir -p ~/deploy/logs ~/deploy/config ~/deploy/releases',
      'touch ~/deploy/config/app.env',
    ],
    check: {
      dirs: [`${H}/deploy/logs`, `${H}/deploy/config`, `${H}/deploy/releases`],
      files: [`${H}/deploy/config/app.env`],
    },
  },
  {
    id: 'cp-mv',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    setup: { files: { [`${H}/inbox/report.txt`]: 'Informe de octubre\n' } },
    es: {
      title: 'Copiar y mover: cp y mv',
      goal: 'Guarda una copia de /etc/nginx/nginx.conf como ~/backup/nginx.conf.bak y renombra ~/inbox/report.txt a ~/inbox/informe-octubre.txt.',
      theory: {
        what: 'cp copia (cp -r, carpetas enteras); mv mueve o renombra: es lo mismo, cambiar la ruta.',
        how: [
          'cp origen destino',
          'cp nginx.conf nginx.conf.bak      # copia de seguridad antes de editar',
          'cp -r carpeta/ copia/',
          'mv viejo.txt nuevo.txt',
          'mv fichero carpeta/',
        ],
        when: 'Antes de tocar una configuración, cópiala: si algo va mal, vuelves atrás con un mv.',
        problems: 'cp y mv pisan el destino sin preguntar si ya existe.',
      },
      example: 'Copias tus notas, mueves la copia a proyectos y lo compruebas.',
    },
    en: {
      title: 'Copy and move: cp and mv',
      goal: 'Save a copy of /etc/nginx/nginx.conf as ~/backup/nginx.conf.bak and rename ~/inbox/report.txt to ~/inbox/informe-octubre.txt.',
      theory: {
        what: 'cp copies (cp -r, whole directories); mv moves or renames: it is the same thing, changing the path.',
        how: [
          'cp source dest',
          'cp nginx.conf nginx.conf.bak      # backup before editing',
          'cp -r dir/ copy/',
          'mv old.txt new.txt',
          'mv file dir/',
        ],
        when: 'Before touching a config, copy it: if something breaks, you go back with one mv.',
        problems: 'cp and mv overwrite the destination without asking.',
      },
      example: 'You copy your notes, move the copy into proyectos and check it.',
    },
    fr: {
      title: 'Copier et déplacer : cp et mv',
      goal: 'Garde une copie de /etc/nginx/nginx.conf sous ~/backup/nginx.conf.bak et renomme ~/inbox/report.txt en ~/inbox/informe-octubre.txt.',
      theory: {
        what: 'cp copie (cp -r pour des dossiers entiers) ; mv déplace ou renomme (c’est la même opération : changer le chemin).',
        how: [
          'cp source destination',
          'cp nginx.conf nginx.conf.bak      # sauvegarde avant de modifier',
          'cp -r dossier/ copie/',
          'mv ancien.txt nouveau.txt',
          'mv fichier dossier/',
        ],
        when: 'Avant de toucher à une configuration, copie-la : si ça tourne mal, tu reviens en arrière avec un seul mv.',
        problems: 'cp et mv écrasent la destination sans demander.',
      },
      example: 'Tu copies tes notes, tu déplaces la copie dans proyectos et tu vérifies.',
    },
    example: ['cp notas.txt notas-copia.txt', 'mv notas-copia.txt proyectos/', 'ls proyectos'],
    solution: [
      'mkdir ~/backup',
      'cp /etc/nginx/nginx.conf ~/backup/nginx.conf.bak',
      'mv ~/inbox/report.txt ~/inbox/informe-octubre.txt',
    ],
    check: {
      files: [
        `${H}/backup/nginx.conf.bak`,
        `${H}/inbox/report.txt`,
        `${H}/inbox/informe-octubre.txt`,
      ],
    },
  },
  {
    id: 'rm',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    setup: {
      files: {
        [`${H}/build/tmp/a.o`]: 'objeto a\n',
        [`${H}/build/tmp/b.o`]: 'objeto b\n',
        [`${H}/build/out/app`]: 'binario\n',
        [`${H}/old.log`]: 'registro viejo\n',
        [`${H}/importante.txt`]: 'No me borres.\n',
      },
    },
    es: {
      title: 'Borrar: rm y rmdir',
      goal: 'Borra la carpeta ~/build/tmp entera y ~/old.log. Que sigan ~/build/out/app y ~/importante.txt.',
      theory: {
        what: 'rm borra ficheros; rm -r, carpetas con todo lo de dentro; rmdir, solo carpetas vacías.',
        how: [
          'rm fichero',
          'rm -r carpeta',
          'rm -i fichero      # pregunta antes',
          'rmdir carpeta-vacia',
        ],
        when: 'Para limpiar lo que ya no sirve: compilados, temporales, registros viejos.',
        whenNot:
          'Nunca rm -rf con una variable que pueda estar vacía (rm -rf $DIR/ puede ser rm -rf /).',
        problems: 'No hay papelera: lo borrado no se recupera.',
      },
      example: 'Borras un fichero, una carpeta vacía, y ves por qué rm a secas no borra carpetas.',
    },
    en: {
      title: 'Deleting: rm and rmdir',
      goal: 'Delete the whole ~/build/tmp directory and ~/old.log. Keep ~/build/out/app and ~/importante.txt.',
      theory: {
        what: 'rm deletes files; rm -r, directories with everything inside; rmdir, only empty directories.',
        how: ['rm file', 'rm -r dir', 'rm -i file         # asks first', 'rmdir empty-dir'],
        when: 'To clean up what is no longer needed: build output, temporary files, old logs.',
        whenNot:
          'Never rm -rf with a variable that may be empty (rm -rf $DIR/ can become rm -rf /).',
        problems: 'There is no trash: what you delete is gone.',
      },
      example:
        'You delete a file, an empty directory, and see why plain rm does not delete directories.',
    },
    fr: {
      title: 'Supprimer : rm et rmdir',
      goal: 'Supprime tout le dossier ~/build/tmp et ~/old.log. ~/build/out/app et ~/importante.txt doivent rester.',
      theory: {
        what: 'rm supprime des fichiers ; rm -r, des dossiers avec tout leur contenu ; rmdir, seulement des dossiers vides.',
        how: [
          'rm fichier',
          'rm -r dossier',
          'rm -i fichier      # demande avant',
          'rmdir dossier-vide',
        ],
        when: 'Pour faire le ménage dans ce qui ne sert plus : fichiers compilés, temporaires, vieux logs.',
        whenNot:
          'Jamais de rm -rf avec une variable qui peut être vide (rm -rf $DIR/ peut devenir rm -rf /).',
        problems: 'Il n’y a pas de corbeille : ce que tu supprimes est perdu.',
      },
      example:
        'Tu supprimes un fichier, un dossier vide, et tu vois pourquoi rm tout court ne supprime pas les dossiers.',
    },
    example: ['touch borrame.txt', 'rm borrame.txt', 'mkdir vacia', 'rmdir vacia', 'rm proyectos'],
    solution: ['rm -r ~/build/tmp', 'rm ~/old.log'],
    check: {
      files: [`${H}/old.log`, `${H}/importante.txt`, `${H}/build/out/app`],
      dirs: [`${H}/build/tmp`],
    },
  },
  {
    id: 'redirect',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Escribir: echo, > y >>',
      goal: 'Crea ~/motd.txt con dos líneas: «Bienvenida a web1» y «Mantenimiento: domingo 03:00».',
      theory: {
        what: 'echo escribe un texto. > manda la salida a un fichero (lo vacía antes); >> la añade al final; 2> manda los errores.',
        how: [
          "echo 'hola' > saludo.txt",
          "echo 'otra línea' >> saludo.txt",
          'ls noexiste 2> errores.txt',
          'orden > todo.txt 2>&1   # salida y errores juntos',
          "cat > fichero <<'EOF'   # varias líneas, hasta EOF",
        ],
        when: 'Para dejar notas, crear configuraciones pequeñas y guardar lo que sale de un comando.',
        problems: 'Un > de más borra lo que había: con ficheros importantes, piensa si querías >>.',
      },
      example: 'Escribes un fichero, le añades una línea y guardas un error aparte.',
    },
    en: {
      title: 'Writing: echo, > and >>',
      goal: 'Create ~/motd.txt with two lines: «Bienvenida a web1» and «Mantenimiento: domingo 03:00».',
      theory: {
        what: 'echo prints text. > sends output to a file (emptying it first); >> appends at the end; 2> sends the errors.',
        how: [
          "echo 'hello' > hi.txt",
          "echo 'another line' >> hi.txt",
          'ls missing 2> errors.txt',
          'command > all.txt 2>&1   # output and errors together',
          "cat > file <<'EOF'      # several lines, up to EOF",
        ],
        when: 'To leave notes, create small configs and save what a command prints.',
        problems:
          'One > too many wipes what was there: with important files, ask yourself if you meant >>.',
      },
      example: 'You write a file, append a line and keep an error apart.',
    },
    fr: {
      title: 'Écrire : echo, > et >>',
      goal: 'Crée ~/motd.txt avec ces deux lignes, à recopier telles quelles : « Bienvenida a web1 » et « Mantenimiento: domingo 03:00 ».',
      theory: {
        what: 'echo écrit un texte. > envoie la sortie dans un fichier (en le vidant d’abord) ; >> l’ajoute à la fin ; 2> envoie les erreurs. C’est ce qu’on appelle une redirection.',
        how: [
          "echo 'salut' > salut.txt",
          "echo 'une autre ligne' >> salut.txt",
          'ls absent 2> erreurs.txt',
          'commande > tout.txt 2>&1   # sortie et erreurs ensemble',
          "cat > fichier <<'EOF'      # plusieurs lignes, jusqu’à EOF",
        ],
        when: 'Pour laisser des notes, créer de petites configurations et garder ce qu’affiche une commande.',
        problems:
          'Un > de trop efface ce qu’il y avait : sur un fichier important, demande-toi si tu voulais >>.',
      },
      example: 'Tu écris un fichier, tu y ajoutes une ligne et tu mets une erreur de côté.',
    },
    example: [
      'echo hola > saludo.txt',
      'echo adiós >> saludo.txt',
      'cat saludo.txt',
      'ls noexiste 2> errores.txt',
      'cat errores.txt',
    ],
    solution: [
      "echo 'Bienvenida a web1' > ~/motd.txt",
      "echo 'Mantenimiento: domingo 03:00' >> ~/motd.txt",
    ],
    check: { files: [`${H}/motd.txt`] },
  },
  {
    id: 'glob',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    setup: {
      files: {
        [`${H}/descargas/a.log`]: 'a\n',
        [`${H}/descargas/b.log`]: 'b\n',
        [`${H}/descargas/c.txt`]: 'c\n',
        [`${H}/descargas/img1.png`]: 'png\n',
        [`${H}/descargas/img2.png`]: 'png\n',
        [`${H}/descargas/notas.md`]: '# notas\n',
      },
    },
    es: {
      title: 'Comodines: *, ? y {}',
      goal: 'Mueve todos los .log de ~/descargas a ~/descargas/logs/ (créala) y borra los .png.',
      theory: {
        what: 'La shell cambia los comodines por los nombres que encajan antes de ejecutar: * es cualquier cosa, ? un carácter, [abc] uno de esos. Las llaves {a,b} y {1..5} generan palabras.',
        how: [
          'ls *.log',
          'rm img?.png',
          'mv *.log logs/',
          'echo informe-{enero,febrero}.txt',
          'echo sprint-{1..5}',
        ],
        when: 'Para hacer lo mismo con muchos ficheros de una vez.',
        problems:
          'Comprueba con ls (o echo) qué encaja antes de un rm con comodines. * no encaja con los ocultos.',
      },
      example: 'Ves qué encaja con unos patrones y qué generan las llaves.',
    },
    en: {
      title: 'Wildcards: *, ? and {}',
      goal: 'Move every .log in ~/descargas into ~/descargas/logs/ (create it) and delete the .png files.',
      theory: {
        what: 'The shell replaces wildcards with the matching names before running: * is anything, ? one character, [abc] one of those. Braces {a,b} and {1..5} generate words.',
        how: [
          'ls *.log',
          'rm img?.png',
          'mv *.log logs/',
          'echo report-{jan,feb}.txt',
          'echo sprint-{1..5}',
        ],
        when: 'To do the same thing to many files at once.',
        problems:
          'Check with ls (or echo) what matches before an rm with wildcards. * does not match hidden files.',
      },
      example: 'You see what some patterns match and what braces generate.',
    },
    fr: {
      title: 'Jokers : *, ? et {}',
      goal: 'Déplace tous les .log de ~/descargas dans ~/descargas/logs/ (crée-le) et supprime les .png.',
      theory: {
        what: 'Avant d’exécuter, le shell remplace les jokers par les noms qui correspondent : * veut dire n’importe quoi, ? un caractère, [abc] l’un de ceux-là. Les accolades {a,b} et {1..5} génèrent des mots.',
        how: [
          'ls *.log',
          'rm img?.png',
          'mv *.log logs/',
          'echo rapport-{janvier,fevrier}.txt',
          'echo sprint-{1..5}',
        ],
        when: 'Pour faire la même chose sur beaucoup de fichiers d’un coup.',
        problems:
          'Vérifie avec ls (ou echo) ce qui correspond avant un rm avec des jokers. * ne correspond pas aux fichiers cachés.',
      },
      example: 'Tu vois ce qui correspond à quelques motifs et ce que génèrent les accolades.',
    },
    example: ['ls /var/log/*.log', 'ls /etc/host*', 'echo fichero-{1..3}.txt'],
    solution: [
      'mkdir ~/descargas/logs',
      'mv ~/descargas/*.log ~/descargas/logs/',
      'rm ~/descargas/*.png',
    ],
    check: {
      dirs: [`${H}/descargas/logs`],
      files: [
        `${H}/descargas/a.log`,
        `${H}/descargas/b.log`,
        `${H}/descargas/logs/a.log`,
        `${H}/descargas/logs/b.log`,
        `${H}/descargas/c.txt`,
        `${H}/descargas/img1.png`,
        `${H}/descargas/img2.png`,
        `${H}/descargas/notas.md`,
      ],
    },
  },
  {
    id: 'boss2',
    block: 2,
    tier: 'beginner',
    kind: 'boss',
    limit: 240,
    setup: {
      files: {
        [`${H}/release-v2/app.js`]: 'console.log("v2")\n',
        [`${H}/release-v2/utils.js`]: 'export const v = 2\n',
        [`${H}/release-v2/styles.css`]: 'body { color: teal }\n',
        [`${H}/release-v2/debug.tmp`]: 'basura\n',
        [`${H}/release-v2/cache.tmp`]: 'basura\n',
        [`${H}/app/releases/v1/app.js`]: 'console.log("v1")\n',
        [`${H}/app/CURRENT`]: 'v1\n',
      },
    },
    es: {
      title: 'Jefe: la release v2',
      goal: 'Deja la v2 instalada en ~/app/releases/v2, limpia los temporales y marca v2 como la actual.',
      story:
        'La build de la v2 ha llegado a ~/release-v2 con basura dentro. La demo es en cuatro minutos.',
      tasks: [
        'Crea ~/app/releases/v2.',
        'Copia allí los .js y el .css de ~/release-v2.',
        'Borra los .tmp de ~/release-v2.',
        'Haz que ~/app/CURRENT diga v2.',
      ],
    },
    en: {
      title: 'Boss: release v2',
      goal: 'Install v2 in ~/app/releases/v2, clean the temporary files and mark v2 as current.',
      story:
        'The v2 build has landed in ~/release-v2 with junk inside. The demo is in four minutes.',
      tasks: [
        'Create ~/app/releases/v2.',
        'Copy the .js files and the .css from ~/release-v2 there.',
        'Delete the .tmp files in ~/release-v2.',
        'Make ~/app/CURRENT say v2.',
      ],
    },
    fr: {
      title: 'Boss : la release v2',
      goal: 'Installe la v2 dans ~/app/releases/v2, nettoie les fichiers temporaires et marque la v2 comme version actuelle.',
      story:
        'Le build de la v2 est arrivé dans ~/release-v2, avec des fichiers inutiles dedans. La démo est dans quatre minutes.',
      tasks: [
        'Crée ~/app/releases/v2.',
        'Copie-y les .js et le .css de ~/release-v2.',
        'Supprime les .tmp de ~/release-v2.',
        'Fais en sorte que ~/app/CURRENT contienne v2.',
      ],
    },
    solution: [
      'mkdir ~/app/releases/v2',
      'cp ~/release-v2/*.js ~/release-v2/*.css ~/app/releases/v2/',
      'rm ~/release-v2/*.tmp',
      'echo v2 > ~/app/CURRENT',
    ],
    check: {
      files: [
        `${H}/app/releases/v2/app.js`,
        `${H}/app/releases/v2/utils.js`,
        `${H}/app/releases/v2/styles.css`,
        `${H}/app/releases/v2/debug.tmp`,
        `${H}/release-v2/debug.tmp`,
        `${H}/release-v2/cache.tmp`,
        `${H}/app/CURRENT`,
      ],
    },
  },

  /* ---------- Bloque 3: permisos y usuarios ---------- */
  {
    id: 'perms',
    block: 3,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Leer permisos: ls -l e id',
      goal: 'Averigua de quién es /etc/peer4u/app.env y enseña con id los grupos de ese usuario.',
      theory: {
        what: 'ls -l enseña -rwxr-x---: tipo y tres tríos (dueño, grupo, resto) de leer (r), escribir (w) y ejecutar o entrar (x). Luego el dueño y el grupo. id dice quién eres y en qué grupos estás.',
        how: ['ls -l fichero', 'ls -ld carpeta', 'id', 'id deploy', 'groups'],
        when: 'Ante un «Permission denied»: mira los permisos y tus grupos antes de tirar de sudo.',
        problems:
          'En una carpeta, x es poder entrar: sin x no se llega a lo de dentro aunque se pueda leer.',
      },
      example: 'Comparas /etc/passwd con /etc/shadow y ves quién eres tú.',
    },
    en: {
      title: 'Reading permissions: ls -l and id',
      goal: 'Find out who owns /etc/peer4u/app.env and show that user’s groups with id.',
      theory: {
        what: 'ls -l shows -rwxr-x---: type and three triples (owner, group, others) of read (r), write (w) and execute or enter (x). Then owner and group. id tells you who you are and your groups.',
        how: ['ls -l file', 'ls -ld dir', 'id', 'id deploy', 'groups'],
        when: 'When you get «Permission denied»: check permissions and your groups before reaching for sudo.',
        problems:
          'On a directory, x means entering: without x you cannot reach what is inside even if you can read it.',
      },
      example: 'You compare /etc/passwd with /etc/shadow and see who you are.',
    },
    fr: {
      title: 'Lire les permissions : ls -l et id',
      goal: 'Trouve à qui appartient /etc/peer4u/app.env et affiche avec id les groupes de cet utilisateur.',
      theory: {
        what: 'ls -l affiche -rwxr-x--- : le type, puis trois triplets (propriétaire, groupe, autres) de lecture (r), écriture (w) et exécution ou accès (x). Ensuite, le propriétaire et le groupe. id te dit qui tu es et dans quels groupes tu es.',
        how: ['ls -l fichier', 'ls -ld dossier', 'id', 'id deploy', 'groups'],
        when: 'Face à un « Permission denied » : regarde les permissions et tes groupes avant de dégainer sudo.',
        problems:
          'Sur un dossier, x veut dire pouvoir y entrer : sans x, tu n’atteins pas son contenu même si tu peux le lire.',
      },
      example: 'Tu compares /etc/passwd et /etc/shadow, et tu vois qui tu es.',
    },
    example: ['ls -l /etc/passwd /etc/shadow', 'id', 'cat /etc/shadow'],
    solution: ['ls -l /etc/peer4u/app.env', 'id deploy'],
    check: { output: true },
  },
  {
    id: 'chmod',
    block: 3,
    tier: 'beginner',
    kind: 'unit',
    setup: {
      files: {
        [`${H}/scripts/backup.sh`]: { text: '#!/bin/bash\necho copia hecha\n', mode: 0o644 },
        [`${H}/secrets.env`]: { text: 'TOKEN=abc123\n', mode: 0o644 },
      },
    },
    es: {
      title: 'Cambiar permisos: chmod',
      goal: 'Deja ~/scripts/backup.sh como rwxr-xr-x (ejecutable) y ~/secrets.env como rw------- (solo tú).',
      theory: {
        what: 'chmod cambia los permisos. En octal cada trío es una cifra: r=4, w=2, x=1 (7=rwx, 5=r-x, 6=rw-, 0=---). En letras: u (dueño), g, o, a (todos) con +, - o =.',
        how: [
          'chmod 755 guion.sh    # rwxr-xr-x',
          'chmod 600 secreto      # rw-------',
          'chmod u+x guion.sh',
          'chmod go-w fichero',
          'chmod -R g+r carpeta',
        ],
        when: 'Para que un guion se pueda ejecutar o para que una clave no la lea nadie más (ssh se niega a usar claves con permisos abiertos).',
        whenNot:
          'chmod 777 «para que funcione» abre la puerta a todo el mundo: busca el permiso justo.',
      },
      example: 'Cambias los permisos de tus notas en octal y en letras.',
    },
    en: {
      title: 'Changing permissions: chmod',
      goal: 'Make ~/scripts/backup.sh rwxr-xr-x (executable) and ~/secrets.env rw------- (only you).',
      theory: {
        what: 'chmod changes permissions. In octal each triple is a digit: r=4, w=2, x=1 (7=rwx, 5=r-x, 6=rw-, 0=---). With letters: u (owner), g, o, a (all) with +, - or =.',
        how: [
          'chmod 755 script.sh    # rwxr-xr-x',
          'chmod 600 secret        # rw-------',
          'chmod u+x script.sh',
          'chmod go-w file',
          'chmod -R g+r dir',
        ],
        when: 'To make a script executable or keep a key unreadable for others (ssh refuses keys with open permissions).',
        whenNot:
          'chmod 777 «to make it work» opens the door to everyone: find the right permission.',
      },
      example: 'You change the permissions of your notes in octal and with letters.',
    },
    fr: {
      title: 'Changer les permissions : chmod',
      goal: 'Mets ~/scripts/backup.sh en rwxr-xr-x (exécutable) et ~/secrets.env en rw------- (toi seulement).',
      theory: {
        what: 'chmod change les permissions. En octal, chaque triplet est un chiffre : r=4, w=2, x=1 (7=rwx, 5=r-x, 6=rw-, 0=---). En lettres : u (propriétaire), g, o, a (tous) avec +, - ou =.',
        how: [
          'chmod 755 script.sh    # rwxr-xr-x',
          'chmod 600 secret        # rw-------',
          'chmod u+x script.sh',
          'chmod go-w fichier',
          'chmod -R g+r dossier',
        ],
        when: 'Pour rendre un script exécutable ou pour qu’une clé ne soit lisible par personne d’autre (ssh refuse les clés aux permissions trop ouvertes).',
        whenNot:
          'chmod 777 « pour que ça marche » ouvre la porte à tout le monde : donne seulement les permissions nécessaires.',
      },
      example: 'Tu changes les permissions de tes notes en octal et en lettres.',
    },
    example: [
      'ls -l notas.txt',
      'chmod 640 notas.txt',
      'ls -l notas.txt',
      'chmod u+x,g-r notas.txt',
      'ls -l notas.txt',
    ],
    solution: ['chmod 755 ~/scripts/backup.sh', 'chmod 600 ~/secrets.env'],
    check: { modes: [`${H}/scripts/backup.sh`, `${H}/secrets.env`] },
  },
  {
    id: 'chown',
    block: 3,
    tier: 'beginner',
    kind: 'unit',
    setup: { run: ['mkdir -p /srv/site/css', 'touch /srv/site/index.html /srv/site/css/main.css'] },
    es: {
      title: 'Dueños y sudo: chown',
      goal: 'Haz que /srv/site y todo lo de dentro sea de deploy, grupo www-data.',
      theory: {
        what: 'chown cambia dueño y grupo (usuario:grupo). Solo root puede regalar ficheros, así que va con sudo: ejecuta una orden como root si estás en el grupo sudo.',
        how: [
          'sudo chown deploy fichero',
          'sudo chown deploy:www-data fichero',
          'sudo chown -R deploy:www-data /srv/site',
          'sudo -i     # una shell de root (exit para volver)',
        ],
        when: 'Cuando un servicio (nginx corre como www-data) tiene que leer o escribir lo que dejaste tú.',
        whenNot: 'No trabajes siempre como root: sudo solo para la orden que lo necesita.',
      },
      example: 'Ves que sin sudo no puedes escribir en /srv y con sudo sí.',
    },
    en: {
      title: 'Owners and sudo: chown',
      goal: 'Make /srv/site and everything inside owned by deploy, group www-data.',
      theory: {
        what: 'chown changes owner and group (user:group). Only root can give files away, so it goes with sudo: it runs a command as root if you are in the sudo group.',
        how: [
          'sudo chown deploy file',
          'sudo chown deploy:www-data file',
          'sudo chown -R deploy:www-data /srv/site',
          'sudo -i     # a root shell (exit to go back)',
        ],
        when: 'When a service (nginx runs as www-data) must read or write what you left.',
        whenNot: 'Do not work as root all the time: sudo only for the command that needs it.',
      },
      example: 'You see that without sudo you cannot write in /srv and with sudo you can.',
    },
    fr: {
      title: 'Propriétaires et sudo : chown',
      goal: 'Fais en sorte que /srv/site et tout son contenu appartiennent à deploy, groupe www-data.',
      theory: {
        what: 'chown change le propriétaire et le groupe (utilisateur:groupe). Seul root peut donner des fichiers à quelqu’un d’autre, donc il faut sudo : il lance une commande en tant que root si tu es dans le groupe sudo.',
        how: [
          'sudo chown deploy fichier',
          'sudo chown deploy:www-data fichier',
          'sudo chown -R deploy:www-data /srv/site',
          'sudo -i     # un shell root (exit pour revenir)',
        ],
        when: 'Quand un service (nginx tourne en tant que www-data) doit lire ou écrire ce que tu as déposé.',
        whenNot:
          'Ne travaille pas tout le temps en root : sudo seulement pour la commande qui en a besoin.',
      },
      example: 'Tu vois que sans sudo tu ne peux pas écrire dans /srv, et qu’avec sudo tu peux.',
    },
    example: ['touch /srv/prueba', 'sudo touch /srv/prueba', 'ls -l /srv/prueba'],
    solution: ['sudo chown -R deploy:www-data /srv/site'],
    check: {
      modes: ['/srv/site', '/srv/site/index.html', '/srv/site/css', '/srv/site/css/main.css'],
    },
  },
  {
    id: 'users',
    block: 3,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Usuarios y grupos',
      goal: 'Crea la usuaria lucia, con carpeta personal y en el grupo developers. Y mete a mgarcia en www-data sin que pierda developers.',
      theory: {
        what: 'useradd crea usuarios (-m con carpeta, -G grupos extra, -s shell); usermod los cambia; groupadd crea grupos. Se guardan en /etc/passwd y /etc/group.',
        how: [
          'sudo useradd -m -s /bin/bash -G developers ana',
          'sudo usermod -aG www-data ana   # -a: añadir',
          'sudo groupadd ops',
          'id ana',
        ],
        when: 'Cuando llega alguien al equipo o un servicio necesita su propio usuario.',
        problems: 'usermod -G sin -a sustituye todos los grupos: así se deja a alguien sin sudo.',
      },
      example: 'Miras los grupos de mgarcia y las últimas cuentas de /etc/passwd.',
    },
    en: {
      title: 'Users and groups',
      goal: 'Create the user lucia, with a home and in the developers group. And add mgarcia to www-data without losing developers.',
      theory: {
        what: 'useradd creates users (-m with home, -G extra groups, -s shell); usermod changes them; groupadd creates groups. They live in /etc/passwd and /etc/group.',
        how: [
          'sudo useradd -m -s /bin/bash -G developers ana',
          'sudo usermod -aG www-data ana   # -a: append',
          'sudo groupadd ops',
          'id ana',
        ],
        when: 'When someone joins the team or a service needs its own user.',
        problems: 'usermod -G without -a replaces every group: that is how someone loses sudo.',
      },
      example: 'You look at mgarcia’s groups and the last accounts in /etc/passwd.',
    },
    fr: {
      title: 'Utilisateurs et groupes',
      goal: 'Crée le compte lucia, avec un dossier personnel et dans le groupe developers. Puis ajoute mgarcia à www-data sans lui faire perdre developers.',
      theory: {
        what: 'useradd crée des utilisateurs (-m avec dossier personnel, -G groupes supplémentaires, -s shell) ; usermod les modifie ; groupadd crée des groupes. Tout est enregistré dans /etc/passwd et /etc/group.',
        how: [
          'sudo useradd -m -s /bin/bash -G developers ana',
          'sudo usermod -aG www-data ana   # -a : ajouter',
          'sudo groupadd ops',
          'id ana',
        ],
        when: 'Quand quelqu’un rejoint l’équipe ou qu’un service a besoin de son propre utilisateur.',
        problems:
          'usermod -G sans -a remplace tous les groupes : c’est comme ça qu’on prive quelqu’un de sudo.',
      },
      example: 'Tu regardes les groupes de mgarcia et les derniers comptes de /etc/passwd.',
    },
    example: ['id mgarcia', 'tail -n 3 /etc/passwd'],
    solution: ['sudo useradd -m -G developers lucia', 'sudo usermod -aG www-data mgarcia'],
    check: { users: ['lucia', 'mgarcia'], dirs: ['/home/lucia'] },
  },
  {
    id: 'boss3',
    block: 3,
    tier: 'beginner',
    kind: 'boss',
    limit: 300,
    setup: {
      files: {
        [`${H}/runbook.md`]: '# Runbook de ops\n1. No entres en pánico.\n2. Mira los registros.\n',
      },
    },
    es: {
      title: 'Jefe: llega el equipo de ops',
      goal: 'Deja montado el rincón del nuevo equipo: grupo, persona, carpeta compartida y permisos.',
      story: 'Nora entra hoy en ops. Necesita su cuenta y una carpeta que solo vea su equipo.',
      tasks: [
        'Crea el grupo ops.',
        'Crea a nora, con carpeta personal y en ops.',
        'Mete a peer (tú) en ops sin quitarle sus grupos.',
        'Crea /srv/ops, de root y grupo ops, con permisos 770.',
        'Copia ~/runbook.md dentro, de root:ops y con permisos 640.',
      ],
    },
    en: {
      title: 'Boss: the ops team arrives',
      goal: 'Set up the new team’s corner: group, person, shared directory and permissions.',
      story: 'Nora joins ops today. She needs her account and a directory only her team can see.',
      tasks: [
        'Create the ops group.',
        'Create nora, with a home and in ops.',
        'Add peer (you) to ops without removing your groups.',
        'Create /srv/ops, owned by root and group ops, mode 770.',
        'Copy ~/runbook.md inside, as root:ops with mode 640.',
      ],
    },
    fr: {
      title: 'Boss : l’équipe ops arrive',
      goal: 'Prépare l’espace de la nouvelle équipe : groupe, compte, dossier partagé et permissions.',
      story:
        'Nora rejoint ops aujourd’hui. Il lui faut un compte et un dossier que seule son équipe peut voir.',
      tasks: [
        'Crée le groupe ops.',
        'Crée le compte nora, avec un dossier personnel, dans le groupe ops.',
        'Ajoute peer (toi) à ops sans perdre tes groupes.',
        'Crée /srv/ops, appartenant à root et au groupe ops, avec les permissions 770.',
        'Copie ~/runbook.md dedans, en root:ops et avec les permissions 640.',
      ],
    },
    solution: [
      'sudo groupadd ops',
      'sudo useradd -m -G ops nora',
      'sudo usermod -aG ops peer',
      'sudo mkdir /srv/ops',
      'sudo cp ~/runbook.md /srv/ops/',
      'sudo chown -R root:ops /srv/ops',
      'sudo chmod 770 /srv/ops',
      'sudo chmod 640 /srv/ops/runbook.md',
    ],
    check: {
      users: ['nora', 'peer'],
      dirs: ['/home/nora'],
      modes: ['/srv/ops', '/srv/ops/runbook.md'],
      files: ['/srv/ops/runbook.md'],
    },
  },
  {
    id: 'final-beginner',
    block: 3,
    tier: 'beginner',
    kind: 'final',
    limit: 600,
    setup: {
      files: {
        [`${H}/ENCARGO.txt`]:
          'Encargo: monta ~/sitio, limpia ~/viejo y da de alta a rocio. Detalles en la web del curso.\n',
        [`${H}/publicar.sh`]: { text: '#!/bin/bash\necho publicado\n', mode: 0o644 },
        [`${H}/viejo/a.bak`]: 'a\n',
        [`${H}/viejo/b.bak`]: 'b\n',
        [`${H}/viejo/leeme.txt`]: 'me quedo\n',
        [`${H}/viejo/tmp/x`]: 'x\n',
      },
    },
    es: {
      title: 'Jefe final: principiante',
      goal: 'Tu primer encargo en solitario: todo lo del nivel, contra el reloj. Si lo superas, tienes el certificado de principiante.',
      story: 'Hoy no hay nadie más de guardia. Te han dejado un encargo en ~/ENCARGO.txt.',
      tasks: [
        'Crea ~/sitio con las carpetas css e img.',
        'Escribe ~/sitio/index.html con la línea «<h1>Hola, peers</h1>».',
        'Copia /var/www/html/index.html a ~/sitio/index.original.html.',
        'Mueve ~/publicar.sh a ~/sitio/ y déjalo con permisos 750.',
        'Borra los .bak de ~/viejo y la carpeta ~/viejo/tmp (leeme.txt se queda).',
        'Crea a rocio con carpeta personal y en el grupo www-data.',
        'Para acabar, enseña las 2 últimas líneas de /var/log/syslog.',
      ],
    },
    en: {
      title: 'Final boss: beginner',
      goal: 'Your first solo job: everything from the level, against the clock. Beat it and you get the beginner certificate.',
      story: 'Nobody else is on call today. A job is waiting for you in ~/ENCARGO.txt.',
      tasks: [
        'Create ~/sitio with the directories css and img.',
        'Write ~/sitio/index.html with the line «<h1>Hola, peers</h1>».',
        'Copy /var/www/html/index.html to ~/sitio/index.original.html.',
        'Move ~/publicar.sh into ~/sitio/ with mode 750.',
        'Delete the .bak files in ~/viejo and the directory ~/viejo/tmp (leeme.txt stays).',
        'Create rocio with a home and in the www-data group.',
        'To finish, show the last 2 lines of /var/log/syslog.',
      ],
    },
    fr: {
      title: 'Boss final : débutant',
      goal: 'Ta première mission en solo : tout le niveau, contre la montre. Si tu réussis, tu obtiens le certificat débutant.',
      story:
        'Aujourd’hui, personne d’autre n’est d’astreinte. On t’a laissé une mission dans ~/ENCARGO.txt.',
      tasks: [
        'Crée ~/sitio avec les dossiers css et img.',
        'Écris ~/sitio/index.html avec la ligne « <h1>Hola, peers</h1> », telle quelle.',
        'Copie /var/www/html/index.html vers ~/sitio/index.original.html.',
        'Déplace ~/publicar.sh dans ~/sitio/ et mets-lui les permissions 750.',
        'Supprime les .bak de ~/viejo et le dossier ~/viejo/tmp (leeme.txt reste).',
        'Crée le compte rocio, avec un dossier personnel, dans le groupe www-data.',
        'Pour finir, affiche les 2 dernières lignes de /var/log/syslog.',
      ],
    },
    solution: [
      'cat ~/ENCARGO.txt',
      'mkdir -p ~/sitio/css ~/sitio/img',
      "echo '<h1>Hola, peers</h1>' > ~/sitio/index.html",
      'cp /var/www/html/index.html ~/sitio/index.original.html',
      'mv ~/publicar.sh ~/sitio/',
      'chmod 750 ~/sitio/publicar.sh',
      'rm ~/viejo/*.bak',
      'rm -r ~/viejo/tmp',
      'sudo useradd -m -G www-data rocio',
      'tail -n 2 /var/log/syslog',
    ],
    check: {
      dirs: [`${H}/sitio/css`, `${H}/sitio/img`, `${H}/viejo/tmp`, '/home/rocio'],
      files: [
        `${H}/sitio/index.html`,
        `${H}/sitio/index.original.html`,
        `${H}/publicar.sh`,
        `${H}/viejo/a.bak`,
        `${H}/viejo/b.bak`,
        `${H}/viejo/leeme.txt`,
      ],
      modes: [`${H}/sitio/publicar.sh`],
      users: ['rocio'],
      output: true,
    },
  },
]
