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
        when: 'Al entrar en un servidor, antes de tocar nada: saber dónde estás y qué tienes alrededor.',
        how: [
          'pwd                 # dónde estás: /home/peer',
          'ls                  # lo que hay en tu carpeta',
          'ls /var/log         # lo que hay en otra',
          'ls -l /var/log      # largo: permisos, dueño, tamaño',
          'man ls              # la ayuda (q para salir)',
        ],
        problems:
          "Linux distingue mayúsculas. Con notas.txt en tu carpeta, ls Notas.txt responde «ls: cannot access 'Notas.txt': No such file or directory». Copia el nombre tal cual lo enseña ls.",
        whenNot:
          'ls enseña nombres, no lo que hay dentro de un fichero: para leerlo está cat, en la unidad siguiente.',
      },
      example:
        'Antes de verlo: en tu carpeta hay notas.txt. ¿Qué responderá ls Notas.txt, con mayúscula?',
    },
    en: {
      title: 'Where am I? pwd and ls',
      goal: 'Show what is inside /srv/peer4u (the API directory).',
      theory: {
        what: 'pwd tells you which directory you are in; ls lists what is in a directory (yours if you do not say which).',
        when: 'When you log into a server, before touching anything: know where you are and what is around.',
        how: [
          'pwd                 # where you are: /home/peer',
          'ls                  # what is in your directory',
          'ls /var/log         # what is in another one',
          'ls -l /var/log      # long: permissions, owner, size',
          'man ls              # the manual (q to quit)',
        ],
        problems:
          'Linux is case-sensitive. With notas.txt in your directory, ls Notas.txt answers "ls: cannot access \'Notas.txt\': No such file or directory". Copy the name exactly as ls shows it.',
        whenNot:
          'ls shows names, not what is inside a file: to read one there is cat, in the next unit.',
      },
      example:
        'Before you look: your directory has notas.txt. What will ls Notas.txt, with a capital N, answer?',
    },
    fr: {
      title: 'Où suis-je ? pwd et ls',
      goal: 'Affiche ce qu’il y a dans /srv/peer4u (le dossier de l’API).',
      theory: {
        what: 'pwd te dit dans quel dossier tu es ; ls liste ce qu’il y a dans un dossier (le tien si tu n’en précises pas).',
        when: 'En arrivant sur un serveur, avant de toucher à quoi que ce soit : savoir où tu es et ce qu’il y a autour.',
        how: [
          'pwd                 # où tu es : /home/peer',
          'ls                  # ce qu’il y a chez toi',
          'ls /var/log         # ce qu’il y a ailleurs',
          'ls -l /var/log      # long : droits, propriétaire, taille',
          'man ls              # l’aide (q pour sortir)',
        ],
        problems:
          "Linux distingue les majuscules. Avec notas.txt dans ton dossier, ls Notas.txt répond « ls: cannot access 'Notas.txt': No such file or directory ». Recopie le nom tel que ls l’affiche.",
        whenNot:
          'ls affiche des noms, pas le contenu d’un fichier : pour le lire, il y a cat, dans l’unité suivante.',
      },
      example:
        'Avant de regarder : ton dossier contient notas.txt. Que répondra ls Notas.txt, avec une majuscule ?',
    },
    example: ['pwd', 'ls', 'ls -l /var/log', 'ls Notas.txt', 'ls notas.txt'],
    solution: ['ls /srv/peer4u'],
    check: { output: true, listing: true },
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
        what: 'cd te cambia de carpeta. Una ruta que empieza por / es absoluta y parte de la raíz; si no, es relativa y parte de donde estás.',
        when: 'En un servidor te mueves entre /var/log y /srv: saber desde dónde parte cada ruta evita tocar el sitio equivocado.',
        how: [
          'cd /var/log         # absoluta: da igual dónde estés',
          'cd nginx            # relativa: /var/log/nginx',
          'cd ..               # sube una: /var/log',
          'cd ~                # vuelves a tu carpeta',
          'cd -                # la carpeta de antes',
        ],
        problems:
          'Poner / delante sin querer. Desde /var/log, cd /nginx busca nginx en la raíz y responde «bash: cd: /nginx: No such file or directory». Quita la /: cd nginx.',
        whenNot:
          'En un guion, mejor la ruta absoluta: una relativa depende de la carpeta desde la que se ejecute.',
      },
      example: 'Antes de verlo: estás en /var/log/nginx y escribes cd .. ¿Qué dirá pwd?',
    },
    en: {
      title: 'Moving around: cd and paths',
      goal: 'End up inside /var/log/nginx.',
      theory: {
        what: 'cd changes your directory. A path that starts with / is absolute and starts from the root; otherwise it is relative and starts where you are.',
        when: 'On a server you move between /var/log and /srv: knowing where each path starts stops you touching the wrong place.',
        how: [
          'cd /var/log         # absolute: wherever you are',
          'cd nginx            # relative: /var/log/nginx',
          'cd ..               # up one: /var/log',
          'cd ~                # back to your home',
          'cd -                # the previous directory',
        ],
        problems:
          'Adding a / by mistake. From /var/log, cd /nginx looks for nginx in the root and answers "bash: cd: /nginx: No such file or directory". Drop the /: cd nginx.',
        whenNot:
          'In a script, prefer absolute paths: a relative one depends on the directory it runs from.',
      },
      example: 'Before you look: you are in /var/log/nginx and type cd .. What will pwd say?',
    },
    fr: {
      title: 'Se déplacer : cd et les chemins',
      goal: 'Termine dans /var/log/nginx.',
      theory: {
        what: 'cd te fait changer de dossier. Un chemin qui commence par / est absolu et part de la racine ; sinon, il est relatif et part de là où tu es.',
        when: 'Sur un serveur, tu passes de /var/log à /srv : savoir d’où part chaque chemin t’évite de toucher au mauvais endroit.',
        how: [
          'cd /var/log         # absolu : peu importe où tu es',
          'cd nginx            # relatif : /var/log/nginx',
          'cd ..               # remonte d’un cran : /var/log',
          'cd ~                # retour dans ton dossier',
          'cd -                # le dossier précédent',
        ],
        problems:
          'Mettre un / devant sans le vouloir. Depuis /var/log, cd /nginx cherche nginx à la racine et répond « bash: cd: /nginx: No such file or directory ». Enlève le / : cd nginx.',
        whenNot:
          'Dans un script, préfère le chemin absolu : un chemin relatif dépend du dossier d’où on le lance.',
      },
      example: 'Avant de regarder : tu es dans /var/log/nginx et tu tapes cd .. Que dira pwd ?',
    },
    example: ['cd /var/log', 'pwd', 'cd nginx', 'pwd', 'cd ..', 'pwd', 'cd /nginx'],
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
        what: 'ls no enseña los ficheros que empiezan por punto (.bashrc, .env); ls -a, sí. cat imprime un fichero entero.',
        when: 'La configuración suele vivir en ficheros ocultos (.bashrc, .ssh/, .env): cuando falta una opción, mira ahí.',
        how: [
          'ls ~                # sin los ocultos',
          'ls -a ~             # con . .. y los ocultos',
          'ls -la ~            # ocultos y en formato largo',
          'cat ~/.bashrc       # el fichero entero',
        ],
        problems:
          'Pasarle a cat una carpeta: cat proyectos responde «cat: proyectos: Is a directory». cat lee ficheros; lo de dentro de una carpeta se ve con ls.',
        whenNot:
          'Con un fichero largo, cat llena la pantalla: para ver solo el principio o el final están head y tail (la unidad siguiente).',
      },
      example: 'Antes de verlo: ls ~ enseña dos nombres. ¿Cuántos más enseñará ls -a ~?',
    },
    en: {
      title: 'Hidden files and cat',
      goal: 'There is a hidden file in /srv/peer4u. Show its contents.',
      theory: {
        what: 'ls does not show files that start with a dot (.bashrc, .env); ls -a does. cat prints a whole file.',
        when: 'Configuration often lives in hidden files (.bashrc, .ssh/, .env): when a setting is missing, look there.',
        how: [
          'ls ~                # without hidden files',
          'ls -a ~             # with . .. and hidden files',
          'ls -la ~            # hidden, in long format',
          'cat ~/.bashrc       # the whole file',
        ],
        problems:
          'Giving cat a directory: cat proyectos answers "cat: proyectos: Is a directory". cat reads files; what is inside a directory you see with ls.',
        whenNot:
          'With a long file, cat fills the screen: to see just the start or the end there are head and tail (next unit).',
      },
      example: 'Before you look: ls ~ shows two names. How many more will ls -a ~ show?',
    },
    fr: {
      title: 'Fichiers cachés et cat',
      goal: 'Il y a un fichier caché dans /srv/peer4u. Affiche son contenu.',
      theory: {
        what: 'ls n’affiche pas les fichiers qui commencent par un point (.bashrc, .env) ; ls -a, si. cat affiche un fichier en entier.',
        when: 'La configuration vit souvent dans des fichiers cachés (.bashrc, .ssh/, .env) : quand une option manque, regarde là.',
        how: [
          'ls ~                # sans les cachés',
          'ls -a ~             # avec . .. et les cachés',
          'ls -la ~            # cachés, en format long',
          'cat ~/.bashrc       # le fichier entier',
        ],
        problems:
          'Donner un dossier à cat : cat proyectos répond « cat: proyectos: Is a directory ». cat lit des fichiers ; le contenu d’un dossier se voit avec ls.',
        whenNot:
          'Avec un long fichier, cat remplit l’écran : pour n’en voir que le début ou la fin, il y a head et tail (unité suivante).',
      },
      example: 'Avant de regarder : ls ~ affiche deux noms. Combien de plus affichera ls -a ~ ?',
    },
    example: ['ls ~', 'ls -a ~', 'cat ~/.bashrc', 'cat proyectos'],
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
        what: 'head enseña el principio de un fichero; tail, el final; wc -l cuenta sus líneas, y less lo pasa página a página.',
        when: 'De guardia, lo nuevo de un registro está al final: tail es lo primero que miras.',
        how: [
          'head -n 3 app.log   # las 3 primeras líneas',
          'tail -n 20 app.log  # las 20 últimas',
          'tail -f app.log     # sigue lo que se escribe',
          'wc -l app.log       # cuántas líneas tiene',
          'less app.log        # página a página; q sale',
        ],
        problems:
          'Olvidar el -n: tail 5 app.log toma el 5 por un fichero, se queja con «No such file or directory» y enseña 10 líneas. Escribe tail -n 5 app.log.',
        whenNot:
          'head -n 5 da las 5 primeras y tail -n 5, las 5 últimas. En un registro, lo reciente siempre está abajo.',
      },
      example:
        'Antes de verlo: ¿las líneas de tail -n 2 serán más antiguas o más nuevas que las de head -n 3?',
    },
    en: {
      title: 'Reading logs: head, tail, wc, less',
      goal: 'Show the last 5 lines of /var/log/peer4u/app.log.',
      theory: {
        what: 'head shows the start of a file; tail, the end; wc -l counts its lines, and less pages through it.',
        when: 'On call, the newest lines of a log are at the bottom: tail is the first thing you check.',
        how: [
          'head -n 3 app.log   # the first 3 lines',
          'tail -n 20 app.log  # the last 20',
          'tail -f app.log     # follows new lines',
          'wc -l app.log       # how many lines it has',
          'less app.log        # page by page; q quits',
        ],
        problems:
          'Forgetting -n: tail 5 app.log takes 5 as a file, complains "No such file or directory" and shows 10 lines. Type tail -n 5 app.log.',
        whenNot:
          'head -n 5 gives the first 5 and tail -n 5 the last 5. In a log, the recent lines are always at the bottom.',
      },
      example:
        'Before you look: will the lines from tail -n 2 be older or newer than those from head -n 3?',
    },
    fr: {
      title: 'Lire des logs : head, tail, wc, less',
      goal: 'Affiche les 5 dernières lignes de /var/log/peer4u/app.log.',
      theory: {
        what: 'head affiche le début d’un fichier ; tail, la fin ; wc -l compte ses lignes, et less le fait défiler page par page.',
        when: 'D’astreinte, le plus récent d’un journal est à la fin : tail est la première chose que tu regardes.',
        how: [
          'head -n 3 app.log   # les 3 premières lignes',
          'tail -n 20 app.log  # les 20 dernières',
          'tail -f app.log     # suit ce qui s’écrit',
          'wc -l app.log       # combien de lignes',
          'less app.log        # page par page ; q sort',
        ],
        problems:
          'Oublier le -n : tail 5 app.log prend le 5 pour un fichier, se plaint avec « No such file or directory » et affiche 10 lignes. Écris tail -n 5 app.log.',
        whenNot:
          'head -n 5 donne les 5 premières et tail -n 5, les 5 dernières. Dans un journal, le récent est toujours en bas.',
      },
      example:
        'Avant de regarder : les lignes de tail -n 2 seront-elles plus anciennes ou plus récentes que celles de head -n 3 ?',
    },
    example: [
      'head -n 3 /var/log/peer4u/app.log',
      'wc -l /var/log/peer4u/app.log',
      'tail -n 2 /var/log/peer4u/app.log',
      'tail 2 /var/log/peer4u/app.log',
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
        what: 'mkdir crea carpetas; con -p crea también las de por medio y no se queja si ya existen. touch crea un fichero vacío.',
        when: 'Al preparar un despliegue: las carpetas de logs, config y releases, de una vez.',
        how: [
          'mkdir pruebas                  # una carpeta',
          'mkdir -p deploy/logs           # y las de por medio',
          'mkdir -p deploy/{logs,config}  # llaves: varias a la vez',
          'touch deploy/config/app.env    # un fichero vacío',
        ],
        problems:
          "Crear dentro de una carpeta que aún no existe: mkdir pruebas/a responde «mkdir: cannot create directory 'pruebas/a': No such file or directory». Añade -p.",
        whenNot:
          'touch sobre un fichero que ya existe no lo vacía: deja el contenido y le pone la hora de ahora.',
      },
      example:
        'Antes de verlo: pruebas no existe. ¿Qué pasará con mkdir pruebas/a, y con mkdir -p?',
    },
    en: {
      title: 'Creating: mkdir and touch',
      goal: 'Create ~/deploy with the directories logs, config and releases, and an empty file ~/deploy/config/app.env.',
      theory: {
        what: 'mkdir creates directories; with -p it also creates the ones in between and does not complain if they exist. touch creates an empty file.',
        when: 'When you prepare a deployment: the logs, config and releases directories, in one go.',
        how: [
          'mkdir pruebas                  # one directory',
          'mkdir -p deploy/logs           # and those in between',
          'mkdir -p deploy/{logs,config}  # braces: several at once',
          'touch deploy/config/app.env    # an empty file',
        ],
        problems:
          'Creating inside a directory that does not exist yet: mkdir pruebas/a answers "mkdir: cannot create directory \'pruebas/a\': No such file or directory". Add -p.',
        whenNot:
          'touch on a file that already exists does not empty it: it keeps the content and sets the time to now.',
      },
      example:
        'Before you look: pruebas does not exist. What happens with mkdir pruebas/a, and with mkdir -p?',
    },
    fr: {
      title: 'Créer : mkdir et touch',
      goal: 'Crée ~/deploy avec les dossiers logs, config et releases, et un fichier vide ~/deploy/config/app.env.',
      theory: {
        what: 'mkdir crée des dossiers ; avec -p, il crée aussi ceux du milieu et ne se plaint pas s’ils existent. touch crée un fichier vide.',
        when: 'Pour préparer un déploiement : les dossiers logs, config et releases, d’un coup.',
        how: [
          'mkdir pruebas                  # un dossier',
          'mkdir -p deploy/logs           # et ceux du milieu',
          'mkdir -p deploy/{logs,config}  # accolades : plusieurs d’un coup',
          'touch deploy/config/app.env    # un fichier vide',
        ],
        problems:
          "Créer dans un dossier qui n’existe pas encore : mkdir pruebas/a répond « mkdir: cannot create directory 'pruebas/a': No such file or directory ». Ajoute -p.",
        whenNot:
          'touch sur un fichier qui existe déjà ne le vide pas : il garde le contenu et met l’heure actuelle.',
      },
      example:
        'Avant de regarder : pruebas n’existe pas. Que se passe-t-il avec mkdir pruebas/a, et avec mkdir -p ?',
    },
    example: [
      'mkdir pruebas/a',
      'mkdir -p pruebas/a/b',
      'touch pruebas/a/vacio.txt',
      'ls -R pruebas',
    ],
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
        what: 'cp copia un fichero (cp -r, una carpeta entera); mv lo mueve o lo renombra, que es lo mismo: cambiarle la ruta.',
        when: 'Antes de editar una configuración, haz una copia: si algo se rompe, vuelves atrás con un mv.',
        how: [
          'cp nginx.conf nginx.conf.bak   # copia antes de editar',
          'cp -r proyectos copia          # una carpeta entera',
          'mv viejo.txt nuevo.txt         # renombrar',
          'mv informe.txt proyectos/      # mover a una carpeta',
        ],
        problems:
          "Copiar una carpeta sin -r: cp proyectos copia responde «cp: -r not specified; omitting directory 'proyectos'» y no copia nada. Usa cp -r.",
        whenNot:
          'Mira el destino antes: si ya hay un fichero con ese nombre, cp y mv lo pisan sin preguntar.',
      },
      example:
        'Antes de verlo: escribes cp proyectos copia, sin -r. ¿Habrá después una carpeta copia?',
    },
    en: {
      title: 'Copy and move: cp and mv',
      goal: 'Save a copy of /etc/nginx/nginx.conf as ~/backup/nginx.conf.bak and rename ~/inbox/report.txt to ~/inbox/informe-octubre.txt.',
      theory: {
        what: 'cp copies a file (cp -r, a whole directory); mv moves or renames it, which is the same thing: changing its path.',
        when: 'Before editing a configuration, make a copy: if something breaks, you go back with an mv.',
        how: [
          'cp nginx.conf nginx.conf.bak   # copy before editing',
          'cp -r proyectos copia          # a whole directory',
          'mv viejo.txt nuevo.txt         # rename',
          'mv informe.txt proyectos/      # move into a directory',
        ],
        problems:
          'Copying a directory without -r: cp proyectos copia answers "cp: -r not specified; omitting directory \'proyectos\'" and copies nothing. Use cp -r.',
        whenNot:
          'Check the destination first: if a file with that name exists, cp and mv overwrite it without asking.',
      },
      example:
        'Before you look: you type cp proyectos copia, without -r. Will there be a copia directory afterwards?',
    },
    fr: {
      title: 'Copier et déplacer : cp et mv',
      goal: 'Garde une copie de /etc/nginx/nginx.conf sous ~/backup/nginx.conf.bak et renomme ~/inbox/report.txt en ~/inbox/informe-octubre.txt.',
      theory: {
        what: 'cp copie un fichier (cp -r, un dossier entier) ; mv le déplace ou le renomme, ce qui revient au même : changer son chemin.',
        when: 'Avant de modifier une configuration, fais-en une copie : si quelque chose casse, tu reviens en arrière avec un mv.',
        how: [
          'cp nginx.conf nginx.conf.bak   # copie avant de modifier',
          'cp -r proyectos copia          # un dossier entier',
          'mv viejo.txt nuevo.txt         # renommer',
          'mv informe.txt proyectos/      # déplacer dans un dossier',
        ],
        problems:
          "Copier un dossier sans -r : cp proyectos copia répond « cp: -r not specified; omitting directory 'proyectos' » et ne copie rien. Utilise cp -r.",
        whenNot:
          'Regarde la destination avant : si un fichier porte déjà ce nom, cp et mv l’écrasent sans demander.',
      },
      example:
        'Avant de regarder : tu tapes cp proyectos copia, sans -r. Y aura-t-il ensuite un dossier copia ?',
    },
    example: [
      'cp notas.txt notas-copia.txt',
      'mv notas-copia.txt proyectos/',
      'ls proyectos',
      'cp proyectos copia',
      'ls',
    ],
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
        what: 'rm borra ficheros; rm -r, una carpeta con todo lo de dentro; rmdir, solo carpetas vacías.',
        when: 'Para limpiar lo que sobra en un servidor: compilados, temporales, registros viejos.',
        how: [
          'rm old.log          # un fichero',
          'rm -r build/tmp     # la carpeta y lo de dentro',
          'rm -i old.log       # pregunta antes',
          'rmdir vacia         # solo si está vacía',
        ],
        problems:
          "Borrar una carpeta con rm a secas: rm proyectos responde «rm: cannot remove 'proyectos': Is a directory». Hace falta rm -r, y pensarlo dos veces.",
        whenNot:
          'No hay papelera: lo borrado no vuelve. Con dudas, rm -i pregunta fichero a fichero.',
      },
      example:
        'Antes de verlo: proyectos es una carpeta con cosas dentro. ¿Qué responderá rm proyectos?',
    },
    en: {
      title: 'Deleting: rm and rmdir',
      goal: 'Delete the whole ~/build/tmp directory and ~/old.log. Keep ~/build/out/app and ~/importante.txt.',
      theory: {
        what: 'rm deletes files; rm -r, a directory with everything inside; rmdir, only empty directories.',
        when: 'To clean up what is left over on a server: build output, temporary files, old logs.',
        how: [
          'rm old.log          # one file',
          'rm -r build/tmp     # the directory and its contents',
          'rm -i old.log       # asks first',
          'rmdir vacia         # only if it is empty',
        ],
        problems:
          'Deleting a directory with plain rm: rm proyectos answers "rm: cannot remove \'proyectos\': Is a directory". You need rm -r, and to think twice.',
        whenNot:
          'There is no bin: what you delete does not come back. When in doubt, rm -i asks file by file.',
      },
      example:
        'Before you look: proyectos is a directory with things inside. What will rm proyectos answer?',
    },
    fr: {
      title: 'Supprimer : rm et rmdir',
      goal: 'Supprime tout le dossier ~/build/tmp et ~/old.log. ~/build/out/app et ~/importante.txt doivent rester.',
      theory: {
        what: 'rm supprime des fichiers ; rm -r, un dossier avec tout son contenu ; rmdir, seulement les dossiers vides.',
        when: 'Pour faire le ménage sur un serveur : fichiers compilés, temporaires, vieux journaux.',
        how: [
          'rm old.log          # un fichier',
          'rm -r build/tmp     # le dossier et son contenu',
          'rm -i old.log       # demande avant',
          'rmdir vacia         # seulement s’il est vide',
        ],
        problems:
          "Supprimer un dossier avec rm tout court : rm proyectos répond « rm: cannot remove 'proyectos': Is a directory ». Il faut rm -r, et y réfléchir à deux fois.",
        whenNot:
          'Il n’y a pas de corbeille : ce que tu supprimes ne revient pas. En cas de doute, rm -i demande fichier par fichier.',
      },
      example:
        'Avant de regarder : proyectos est un dossier avec des choses dedans. Que répondra rm proyectos ?',
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
        what: 'echo escribe un texto. > manda la salida a un fichero y lo vacía antes; >> la añade al final; 2> manda solo los errores.',
        when: 'Para dejar un aviso en el servidor, crear una configuración corta o guardar lo que sale de una orden.',
        how: [
          'echo hola > saludo.txt         # crea o vacía',
          'echo adiós >> saludo.txt       # añade al final',
          'ls noexiste 2> errores.txt     # los errores aparte',
          'ls /etc > todo.txt 2>&1        # salida y errores juntos',
          "cat > motd.txt <<'EOF'         # varias líneas, hasta EOF",
        ],
        problems:
          'Usar > cuando querías >>: tras echo hola > saludo.txt y echo adiós > saludo.txt, cat saludo.txt enseña solo «adiós». Para añadir, >>.',
        whenNot: '2> se lleva solo los errores: la salida normal sigue saliendo por pantalla.',
      },
      example:
        'Antes de verlo: escribes echo hola > saludo.txt y luego echo adiós > saludo.txt. ¿Qué enseñará cat saludo.txt?',
    },
    en: {
      title: 'Writing: echo, > and >>',
      goal: 'Create ~/motd.txt with two lines: «Bienvenida a web1» and «Mantenimiento: domingo 03:00».',
      theory: {
        what: 'echo writes some text. > sends the output to a file, emptying it first; >> appends to the end; 2> sends only the errors.',
        when: 'To leave a notice on the server, create a short configuration or keep what a command prints.',
        how: [
          'echo hola > saludo.txt         # creates or empties',
          'echo adiós >> saludo.txt       # appends to the end',
          'ls noexiste 2> errores.txt     # errors on their own',
          'ls /etc > todo.txt 2>&1        # output and errors together',
          "cat > motd.txt <<'EOF'         # several lines, up to EOF",
        ],
        problems:
          'Using > when you meant >>: after echo hola > saludo.txt and echo adiós > saludo.txt, cat saludo.txt shows only "adiós". To append, >>.',
        whenNot: '2> takes only the errors: normal output still goes to the screen.',
      },
      example:
        'Before you look: you type echo hola > saludo.txt and then echo adiós > saludo.txt. What will cat saludo.txt show?',
    },
    fr: {
      title: 'Écrire : echo, > et >>',
      goal: 'Crée ~/motd.txt avec ces deux lignes, à recopier telles quelles : « Bienvenida a web1 » et « Mantenimiento: domingo 03:00 ».',
      theory: {
        what: 'echo écrit un texte. > envoie la sortie dans un fichier en le vidant d’abord ; >> l’ajoute à la fin ; 2> n’envoie que les erreurs.',
        when: 'Pour laisser un message sur le serveur, créer une petite configuration ou garder ce qu’affiche une commande.',
        how: [
          'echo hola > saludo.txt         # crée ou vide',
          'echo adiós >> saludo.txt       # ajoute à la fin',
          'ls noexiste 2> errores.txt     # les erreurs à part',
          'ls /etc > todo.txt 2>&1        # sortie et erreurs ensemble',
          "cat > motd.txt <<'EOF'         # plusieurs lignes, jusqu’à EOF",
        ],
        problems:
          'Mettre > quand tu voulais >> : après echo hola > saludo.txt puis echo adiós > saludo.txt, cat saludo.txt n’affiche que « adiós ». Pour ajouter, >>.',
        whenNot:
          '2> ne prend que les erreurs : la sortie normale continue de s’afficher à l’écran.',
      },
      example:
        'Avant de regarder : tu tapes echo hola > saludo.txt puis echo adiós > saludo.txt. Qu’affichera cat saludo.txt ?',
    },
    example: [
      'echo hola > saludo.txt',
      'echo adiós > saludo.txt',
      'cat saludo.txt',
      'echo hola >> saludo.txt',
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
        what: 'Antes de ejecutar, la shell cambia los comodines por los nombres que encajan: * es cualquier cosa; ?, un carácter. Las llaves {a,b} y {1..3} generan palabras.',
        when: 'Para mover o borrar de golpe todos los .log o todas las imágenes de una carpeta.',
        how: [
          'ls descargas/*.log             # los que acaban en .log',
          'ls descargas/img?.png          # img y un carácter',
          'mv descargas/*.log logs/       # todos de una vez',
          'echo informe-{enero,mayo}.txt  # genera dos palabras',
        ],
        problems:
          "Si nada encaja, el comodín llega tal cual: ls descargas/*.LOG responde «ls: cannot access 'descargas/*.LOG': No such file or directory». Mira con ls qué encaja antes de un rm.",
        whenNot:
          'Las llaves no miran el disco: generan los nombres existan o no. Y * no encaja con los ocultos.',
      },
      example:
        'Antes de verlo: en descargas hay a.log y b.log. ¿Qué escribirá echo descargas/*.log?',
    },
    en: {
      title: 'Wildcards: *, ? and {}',
      goal: 'Move every .log in ~/descargas into ~/descargas/logs/ (create it) and delete the .png files.',
      theory: {
        what: 'Before running anything, the shell replaces wildcards with the names that match: * is anything; ?, one character. Braces {a,b} and {1..3} generate words.',
        when: 'To move or delete every .log or every image in a directory at once.',
        how: [
          'ls descargas/*.log             # those ending in .log',
          'ls descargas/img?.png          # img plus one character',
          'mv descargas/*.log logs/       # all at once',
          'echo informe-{enero,mayo}.txt  # generates two words',
        ],
        problems:
          'If nothing matches, the wildcard arrives as it is: ls descargas/*.LOG answers "ls: cannot access \'descargas/*.LOG\': No such file or directory". Check with ls what matches before an rm.',
        whenNot:
          'Braces do not look at the disk: they generate names whether they exist or not. And * does not match hidden files.',
      },
      example:
        'Before you look: descargas has a.log and b.log. What will echo descargas/*.log print?',
    },
    fr: {
      title: 'Jokers : *, ? et {}',
      goal: 'Déplace tous les .log de ~/descargas dans ~/descargas/logs/ (crée-le) et supprime les .png.',
      theory: {
        what: 'Avant d’exécuter, le shell remplace les jokers par les noms qui correspondent : * est n’importe quoi ; ?, un caractère. Les accolades {a,b} et {1..3} génèrent des mots.',
        when: 'Pour déplacer ou supprimer d’un coup tous les .log ou toutes les images d’un dossier.',
        how: [
          'ls descargas/*.log             # ceux qui finissent en .log',
          'ls descargas/img?.png          # img et un caractère',
          'mv descargas/*.log logs/       # tous d’un coup',
          'echo informe-{enero,mayo}.txt  # génère deux mots',
        ],
        problems:
          "Si rien ne correspond, le joker arrive tel quel : ls descargas/*.LOG répond « ls: cannot access 'descargas/*.LOG': No such file or directory ». Vérifie avec ls ce qui correspond avant un rm.",
        whenNot:
          'Les accolades ne regardent pas le disque : elles génèrent les noms, qu’ils existent ou non. Et * ne prend pas les fichiers cachés.',
      },
      example:
        'Avant de regarder : descargas contient a.log et b.log. Qu’écrira echo descargas/*.log ?',
    },
    example: [
      'ls descargas',
      'echo descargas/*.log',
      'ls descargas/img?.png',
      'ls descargas/*.LOG',
      'echo informe-{1..3}.txt',
    ],
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
        what: 'ls -l empieza con algo como -rw-r-----: el tipo y tres tríos (dueño, grupo, resto) de leer, escribir y ejecutar. id dice quién eres y tus grupos.',
        when: 'Ante un «Permission denied»: mira los permisos y tus grupos antes de tirar de sudo.',
        how: [
          'ls -l /etc/shadow   # permisos, dueño y grupo',
          'ls -ld /root        # los de la carpeta misma',
          'id                  # tu usuario y tus grupos',
          'id deploy           # los de otra cuenta',
        ],
        problems:
          'Mirar solo el primer trío. /etc/shadow es -rw-r----- de root y del grupo shadow; tú no eres ninguno de los dos, así que cat responde «cat: /etc/shadow: Permission denied».',
        whenNot:
          'En una carpeta, r deja ver los nombres de dentro y x deja entrar: sin x no llegas a nada.',
      },
      example:
        'Antes de verlo: /etc/shadow es -rw-r----- de root, grupo shadow, y tú estás en peer, adm y sudo. ¿Podrás leerlo?',
    },
    en: {
      title: 'Reading permissions: ls -l and id',
      goal: 'Find out who owns /etc/peer4u/app.env and show that user’s groups with id.',
      theory: {
        what: 'ls -l starts with something like -rw-r-----: the type and three triplets (owner, group, others) of read, write and execute. id says who you are and your groups.',
        when: 'Faced with a "Permission denied": check the permissions and your groups before reaching for sudo.',
        how: [
          'ls -l /etc/shadow   # permissions, owner and group',
          'ls -ld /root        # the directory itself',
          'id                  # your user and your groups',
          "id deploy           # another account's",
        ],
        problems:
          'Looking only at the first triplet. /etc/shadow is -rw-r----- owned by root, group shadow; you are neither, so cat answers "cat: /etc/shadow: Permission denied".',
        whenNot:
          'On a directory, r lets you see the names inside and x lets you enter: without x you reach nothing.',
      },
      example:
        'Before you look: /etc/shadow is -rw-r----- owned by root, group shadow, and you are in peer, adm and sudo. Can you read it?',
    },
    fr: {
      title: 'Lire les permissions : ls -l et id',
      goal: 'Trouve à qui appartient /etc/peer4u/app.env et affiche avec id les groupes de cet utilisateur.',
      theory: {
        what: 'ls -l commence par quelque chose comme -rw-r----- : le type et trois triplets (propriétaire, groupe, autres) de lecture, écriture et exécution. id dit qui tu es et tes groupes.',
        when: 'Face à un « Permission denied » : regarde les droits et tes groupes avant de dégainer sudo.',
        how: [
          'ls -l /etc/shadow   # droits, propriétaire et groupe',
          'ls -ld /root        # ceux du dossier lui-même',
          'id                  # ton utilisateur et tes groupes',
          'id deploy           # ceux d’un autre compte',
        ],
        problems:
          'Ne regarder que le premier triplet. /etc/shadow est -rw-r----- à root, groupe shadow ; tu n’es ni l’un ni l’autre, donc cat répond « cat: /etc/shadow: Permission denied ».',
        whenNot:
          'Sur un dossier, r permet de voir les noms et x d’y entrer : sans x, tu n’atteins rien.',
      },
      example:
        'Avant de regarder : /etc/shadow est -rw-r----- à root, groupe shadow, et tu es dans peer, adm et sudo. Pourras-tu le lire ?',
    },
    example: ['ls -l /etc/passwd /etc/shadow', 'id', 'cat /etc/shadow'],
    solution: ['ls -l /etc/peer4u/app.env', 'id deploy'],
    check: { output: true, answers: ['id -Gn deploy', 'id -G deploy', 'groups deploy'] },
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
        what: 'chmod cambia los permisos. En octal, cada trío es una cifra que suma r=4, w=2 y x=1: 7 es rwx; 5, r-x; 0, nada. En letras: u, g, o con + o -.',
        when: 'Para que un guion se pueda ejecutar, o para que una clave solo la lea su dueño.',
        how: [
          'chmod 755 backup.sh    # rwxr-xr-x',
          'chmod 600 secrets.env  # rw-------',
          'chmod u+x backup.sh    # ejecutable para ti',
          'chmod go-w notas.txt   # quita w a grupo y resto',
          'chmod -R g+r docs      # y todo lo de dentro',
        ],
        problems:
          'Ejecutar un guion sin x: ./scripts/backup.sh responde «bash: ./scripts/backup.sh: Permission denied». No es cosa de sudo: chmod u+x y otra vez.',
        whenNot:
          'chmod 777 «para que funcione» deja escribir a cualquiera: busca el permiso justo, como 755 o 600.',
      },
      example:
        'Antes de verlo: backup.sh es -rw-r--r--. ¿Qué pasará con ./scripts/backup.sh antes y después de chmod u+x?',
    },
    en: {
      title: 'Changing permissions: chmod',
      goal: 'Make ~/scripts/backup.sh rwxr-xr-x (executable) and ~/secrets.env rw------- (only you).',
      theory: {
        what: 'chmod changes permissions. In octal, each triplet is a digit adding r=4, w=2 and x=1: 7 is rwx; 5, r-x; 0, nothing. In letters: u, g, o with + or -.',
        when: 'To make a script executable, or to let only its owner read a key.',
        how: [
          'chmod 755 backup.sh    # rwxr-xr-x',
          'chmod 600 secrets.env  # rw-------',
          'chmod u+x backup.sh    # executable for you',
          'chmod go-w notas.txt   # no w for group and others',
          'chmod -R g+r docs      # and everything inside',
        ],
        problems:
          'Running a script without x: ./scripts/backup.sh answers "bash: ./scripts/backup.sh: Permission denied". It is not a sudo problem: chmod u+x and try again.',
        whenNot:
          'chmod 777 "to make it work" lets anyone write: look for the right permission, like 755 or 600.',
      },
      example:
        'Before you look: backup.sh is -rw-r--r--. What happens with ./scripts/backup.sh before and after chmod u+x?',
    },
    fr: {
      title: 'Changer les permissions : chmod',
      goal: 'Mets ~/scripts/backup.sh en rwxr-xr-x (exécutable) et ~/secrets.env en rw------- (toi seulement).',
      theory: {
        what: 'chmod change les droits. En octal, chaque triplet est un chiffre qui additionne r=4, w=2 et x=1 : 7 est rwx ; 5, r-x ; 0, rien. En lettres : u, g, o avec + ou -.',
        when: 'Pour qu’un script puisse s’exécuter, ou qu’une clé ne soit lisible que par son propriétaire.',
        how: [
          'chmod 755 backup.sh    # rwxr-xr-x',
          'chmod 600 secrets.env  # rw-------',
          'chmod u+x backup.sh    # exécutable pour toi',
          'chmod go-w notas.txt   # retire w au groupe et aux autres',
          'chmod -R g+r docs      # et tout le contenu',
        ],
        problems:
          'Lancer un script sans x : ./scripts/backup.sh répond « bash: ./scripts/backup.sh: Permission denied ». Ce n’est pas une affaire de sudo : chmod u+x et recommence.',
        whenNot:
          'chmod 777 « pour que ça marche » laisse n’importe qui écrire : cherche le droit juste, comme 755 ou 600.',
      },
      example:
        'Avant de regarder : backup.sh est -rw-r--r--. Que se passe-t-il avec ./scripts/backup.sh avant et après chmod u+x ?',
    },
    example: [
      'ls -l scripts/backup.sh',
      './scripts/backup.sh',
      'chmod u+x scripts/backup.sh',
      './scripts/backup.sh',
      'chmod 640 notas.txt',
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
        what: 'chown cambia el dueño y el grupo (usuario:grupo). Regalar ficheros solo puede root, así que va con sudo, que ejecuta una orden como root.',
        when: 'Cuando nginx, que corre como www-data, tiene que leer lo que dejaste en /srv/site.',
        how: [
          'sudo chown deploy index.html           # solo el dueño',
          'sudo chown deploy:www-data index.html  # dueño y grupo',
          'sudo chown -R deploy:www-data /srv/site  # y lo de dentro',
          'sudo -i            # shell de root; exit para volver',
        ],
        problems:
          'Olvidar -R: sudo chown deploy:www-data /srv/demo cambia solo la carpeta, y ls -l /srv/demo sigue enseñando css como de root. Repite con -R.',
        whenNot: 'No trabajes como root todo el rato: sudo solo para la orden que lo necesita.',
      },
      example:
        'Antes de verlo: cambias el dueño de /srv/demo sin -R. ¿De quién será /srv/demo/css?',
    },
    en: {
      title: 'Owners and sudo: chown',
      goal: 'Make /srv/site and everything inside owned by deploy, group www-data.',
      theory: {
        what: 'chown changes the owner and group (user:group). Only root can give files away, so it goes with sudo, which runs a command as root.',
        when: 'When nginx, which runs as www-data, has to read what you left in /srv/site.',
        how: [
          'sudo chown deploy index.html           # owner only',
          'sudo chown deploy:www-data index.html  # owner and group',
          'sudo chown -R deploy:www-data /srv/site  # and its contents',
          'sudo -i            # a root shell; exit to leave',
        ],
        problems:
          "Forgetting -R: sudo chown deploy:www-data /srv/demo changes only the directory, and ls -l /srv/demo still shows css as root's. Run it again with -R.",
        whenNot: 'Do not work as root all the time: sudo only for the command that needs it.',
      },
      example:
        'Before you look: you change the owner of /srv/demo without -R. Who will own /srv/demo/css?',
    },
    fr: {
      title: 'Propriétaires et sudo : chown',
      goal: 'Fais en sorte que /srv/site et tout son contenu appartiennent à deploy, groupe www-data.',
      theory: {
        what: 'chown change le propriétaire et le groupe (utilisateur:groupe). Seul root peut donner des fichiers, donc on passe par sudo, qui lance une commande en root.',
        when: 'Quand nginx, qui tourne en www-data, doit lire ce que tu as laissé dans /srv/site.',
        how: [
          'sudo chown deploy index.html           # le propriétaire seul',
          'sudo chown deploy:www-data index.html  # propriétaire et groupe',
          'sudo chown -R deploy:www-data /srv/site  # et le contenu',
          'sudo -i            # un shell root ; exit pour revenir',
        ],
        problems:
          'Oublier -R : sudo chown deploy:www-data /srv/demo ne change que le dossier, et ls -l /srv/demo montre toujours css à root. Recommence avec -R.',
        whenNot:
          'Ne travaille pas en root tout le temps : sudo seulement pour la commande qui en a besoin.',
      },
      example:
        'Avant de regarder : tu changes le propriétaire de /srv/demo sans -R. À qui sera /srv/demo/css ?',
    },
    example: [
      'sudo mkdir -p /srv/demo/css',
      'sudo touch /srv/demo/css/main.css',
      'sudo chown deploy:www-data /srv/demo',
      'ls -l /srv/demo',
      'sudo chown -R deploy:www-data /srv/demo',
      'ls -l /srv/demo',
    ],
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
        what: 'useradd crea una cuenta (-m con carpeta, -G con grupos extra); usermod cambia una que ya existe; groupadd crea grupos. Todo con sudo.',
        when: 'Cuando llega alguien al equipo o un servicio necesita su propio usuario.',
        how: [
          'sudo useradd -m -G developers ana   # con carpeta y grupo',
          'sudo usermod -aG www-data ana       # añade un grupo',
          'sudo groupadd ops                   # un grupo nuevo',
          'id ana                              # compruébalo',
        ],
        problems:
          'usermod -G sin -a sustituye los grupos: tras sudo usermod -G www-data mgarcia, id mgarcia ya no enseña «developers». Con -aG se añade sin quitar.',
        whenNot:
          'usermod cambia cuentas que ya existen; para dar de alta a alguien nuevo, useradd.',
      },
      example:
        'Antes de verlo: mgarcia está en developers. Tras usermod -G www-data, sin -a, ¿en qué grupos estará?',
    },
    en: {
      title: 'Users and groups',
      goal: 'Create the user lucia, with a home and in the developers group. And add mgarcia to www-data without losing developers.',
      theory: {
        what: 'useradd creates an account (-m with a home, -G with extra groups); usermod changes an existing one; groupadd creates groups. All with sudo.',
        when: 'When someone joins the team or a service needs its own user.',
        how: [
          'sudo useradd -m -G developers ana   # with home and group',
          'sudo usermod -aG www-data ana       # adds a group',
          'sudo groupadd ops                   # a new group',
          'id ana                              # check it',
        ],
        problems:
          'usermod -G without -a replaces the groups: after sudo usermod -G www-data mgarcia, id mgarcia no longer shows "developers". With -aG it adds without removing.',
        whenNot: 'usermod changes accounts that already exist; to add someone new, useradd.',
      },
      example:
        'Before you look: mgarcia is in developers. After usermod -G www-data, without -a, which groups will they be in?',
    },
    fr: {
      title: 'Utilisateurs et groupes',
      goal: 'Crée le compte lucia, avec un dossier personnel et dans le groupe developers. Puis ajoute mgarcia à www-data sans lui faire perdre developers.',
      theory: {
        what: 'useradd crée un compte (-m avec dossier, -G avec groupes en plus) ; usermod modifie un compte existant ; groupadd crée des groupes. Le tout avec sudo.',
        when: 'Quand quelqu’un arrive dans l’équipe ou qu’un service a besoin de son propre utilisateur.',
        how: [
          'sudo useradd -m -G developers ana   # avec dossier et groupe',
          'sudo usermod -aG www-data ana       # ajoute un groupe',
          'sudo groupadd ops                   # un nouveau groupe',
          'id ana                              # vérifie',
        ],
        problems:
          'usermod -G sans -a remplace les groupes : après sudo usermod -G www-data mgarcia, id mgarcia n’affiche plus « developers ». Avec -aG, on ajoute sans retirer.',
        whenNot:
          'usermod modifie des comptes qui existent ; pour créer quelqu’un de nouveau, useradd.',
      },
      example:
        'Avant de regarder : mgarcia est dans developers. Après usermod -G www-data, sans -a, dans quels groupes sera ce compte ?',
    },
    example: [
      'id mgarcia',
      'sudo usermod -G www-data mgarcia',
      'id mgarcia',
      'sudo usermod -aG developers mgarcia',
      'id mgarcia',
    ],
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
      story:
        'Hoy haces el turno de on-call sin nadie más. Te han dejado un encargo en ~/ENCARGO.txt.',
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
