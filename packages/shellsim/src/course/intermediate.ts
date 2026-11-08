/**
 * Nivel intermedio: bloques 4 a 6 y su jefe final. Lo del nivel principiante
 * se da por sabido (rutas, redirecciones, permisos) y se le suma lo que se
 * usa a diario en el trabajo: tuberías y filtros de texto, find, tar, du,
 * procesos, señales y variables.
 */

import type { Unit } from './types.js'

const H = '/home/peer'
const ACCESS = '/var/log/nginx/access.log'
const APP = '/var/log/peer4u/app.log'

export const INTERMEDIATE: Unit[] = [
  /* ---------- Bloque 4: texto y tuberías ---------- */
  {
    id: 'pipes',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Tuberías: | y wc',
      goal: '¿Cuántas peticiones hay en /var/log/nginx/access.log? Enseña solo el número.',
      theory: {
        what: 'La tubería | pasa la salida de una orden a la entrada de la siguiente; < mete un fichero como entrada.',
        when: 'Cuando la respuesta sale de juntar pasos: filtrar, contar, quedarte con las primeras.',
        how: [
          'ls /var/log | wc -l          # cuántas cosas hay',
          'cat /etc/passwd | head -n 2  # las dos primeras',
          'wc -l < app.log              # solo el número',
        ],
        problems:
          'Esperar solo el número de wc -l fichero: responde «40 /var/log/peer4u/app.log», con el nombre. Con wc -l < fichero sale «40».',
        whenNot: '| une dos órdenes; > guarda la salida en un fichero.',
      },
      example:
        'Antes de verlo: ¿qué diferencia habrá entre lo que escribe wc -l app.log y wc -l < app.log?',
    },
    en: {
      title: 'Pipes: | and wc',
      goal: 'How many requests are in /var/log/nginx/access.log? Show only the number.',
      theory: {
        what: "The pipe | sends one command's output into the next one's input; < feeds a file in as input.",
        when: 'When the answer comes from chaining steps: filter, count, keep the first lines.',
        how: [
          'ls /var/log | wc -l          # how many things',
          'cat /etc/passwd | head -n 2  # the first two',
          'wc -l < app.log              # just the number',
        ],
        problems:
          'Expecting only the number from wc -l file: it answers "40 /var/log/peer4u/app.log", with the name. With wc -l < file you get "40".',
        whenNot: '| joins two commands; > saves the output to a file.',
      },
      example:
        'Before you look: what difference will there be between what wc -l app.log and wc -l < app.log print?',
    },
    fr: {
      title: 'Tubes : | et wc',
      goal: 'Combien y a-t-il de requêtes dans /var/log/nginx/access.log ? Affiche seulement le nombre.',
      theory: {
        what: 'Le tube | envoie la sortie d’une commande vers l’entrée de la suivante ; < donne un fichier en entrée.',
        when: 'Quand la réponse vient d’étapes enchaînées : filtrer, compter, garder les premières lignes.',
        how: [
          'ls /var/log | wc -l          # combien de choses',
          'cat /etc/passwd | head -n 2  # les deux premières',
          'wc -l < app.log              # juste le nombre',
        ],
        problems:
          'Attendre juste le nombre de wc -l fichier : il répond « 40 /var/log/peer4u/app.log », avec le nom. Avec wc -l < fichier, tu obtiens « 40 ».',
        whenNot: '| relie deux commandes ; > enregistre la sortie dans un fichier.',
      },
      example:
        'Avant de regarder : quelle différence entre ce qu’écrivent wc -l app.log et wc -l < app.log ?',
    },
    example: [
      'ls /var/log | wc -l',
      'wc -l /var/log/peer4u/app.log',
      'wc -l < /var/log/peer4u/app.log',
    ],
    solution: [`wc -l < ${ACCESS}`],
    check: { output: true },
  },
  {
    id: 'grep',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Buscar texto: grep',
      goal: 'Enseña las líneas de /var/log/peer4u/app.log que tienen ERROR.',
      theory: {
        what: 'grep enseña las líneas que contienen un patrón: -i sin mirar mayúsculas, -v las que no, -c cuántas, -r en carpetas.',
        when: 'Para encontrar la aguja en el registro: errores, una IP, una opción.',
        how: [
          'grep -i error app.log        # ERROR, Error, error',
          'grep -c WARN app.log         # cuántas líneas',
          'grep -rn listen /etc/nginx   # en carpetas, con número',
        ],
        problems:
          'grep distingue mayúsculas: grep -c error app.log responde «0» con el registro lleno de ERROR. Usa -i.',
        whenNot:
          'El patrón es una expresión regular: el punto encaja con cualquier carácter. grep -F lo busca tal cual.',
      },
      example:
        'Antes de verlo: app.log escribe ERROR en mayúsculas. ¿Cuántas líneas contará grep -c error?',
    },
    en: {
      title: 'Searching text: grep',
      goal: 'Show the lines of /var/log/peer4u/app.log that contain ERROR.',
      theory: {
        what: 'grep shows the lines that contain a pattern: -i ignoring case, -v those that do not, -c how many, -r in directories.',
        when: 'To find the needle in the log: errors, an IP, an option.',
        how: [
          'grep -i error app.log        # ERROR, Error, error',
          'grep -c WARN app.log         # how many lines',
          'grep -rn listen /etc/nginx   # in directories, numbered',
        ],
        problems:
          'grep is case-sensitive: grep -c error app.log answers "0" with the log full of ERROR. Use -i.',
        whenNot:
          'The pattern is a regular expression: a dot matches any character. grep -F searches for it literally.',
      },
      example:
        'Before you look: app.log writes ERROR in capitals. How many lines will grep -c error count?',
    },
    fr: {
      title: 'Chercher du texte : grep',
      goal: 'Affiche les lignes de /var/log/peer4u/app.log qui contiennent ERROR.',
      theory: {
        what: 'grep affiche les lignes qui contiennent un motif : -i sans la casse, -v celles qui ne l’ont pas, -c combien, -r dans les dossiers.',
        when: 'Pour trouver l’aiguille dans le journal : erreurs, une IP, une option.',
        how: [
          'grep -i error app.log        # ERROR, Error, error',
          'grep -c WARN app.log         # combien de lignes',
          'grep -rn listen /etc/nginx   # dans les dossiers, numéroté',
        ],
        problems:
          'grep distingue les majuscules : grep -c error app.log répond « 0 » avec un journal plein de ERROR. Utilise -i.',
        whenNot:
          'Le motif est une expression régulière : le point correspond à n’importe quel caractère. grep -F le cherche tel quel.',
      },
      example:
        'Avant de regarder : app.log écrit ERROR en majuscules. Combien de lignes comptera grep -c error ?',
    },
    example: [
      'grep -c error /var/log/peer4u/app.log',
      'grep -ci error /var/log/peer4u/app.log',
      'grep -v INFO /var/log/peer4u/app.log | head -n 2',
      'grep -rn listen /etc/nginx',
    ],
    solution: [`grep ERROR ${APP}`],
    check: { output: true },
  },
  {
    id: 'cut-tr',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Columnas y caracteres: cut y tr',
      goal: 'Enseña solo los nombres de usuario de /etc/passwd (el primer campo), en mayúsculas.',
      theory: {
        what: 'cut saca columnas: -d dice el separador y -f qué campos. tr cambia o borra caracteres sueltos.',
        when: 'Con ficheros de columnas: /etc/passwd, un CSV, un registro separado por espacios.',
        how: [
          'cut -d: -f1 /etc/passwd      # el primer campo',
          'cut -d: -f1,7 /etc/passwd    # el 1 y el 7',
          "cut -d' ' -f1 access.log     # separados por espacio",
          'tr a-z A-Z                   # a mayúsculas',
        ],
        problems:
          'Olvidar -d: sin él, cut separa por tabuladores, y cut -f1 /etc/passwd enseña la línea entera, «root:x:0:0:root:/root:/bin/bash». Añade -d:.',
        whenNot:
          'cut toma cada espacio como separador: con columnas alineadas con varios espacios, mejor awk.',
      },
      example: 'Antes de verlo: /etc/passwd separa con dos puntos. ¿Qué enseñará cut -f1, sin -d?',
    },
    en: {
      title: 'Columns and characters: cut and tr',
      goal: 'Show only the user names in /etc/passwd (the first field), in uppercase.',
      theory: {
        what: 'cut extracts columns: -d gives the separator and -f which fields. tr changes or deletes single characters.',
        when: 'With column files: /etc/passwd, a CSV, a space-separated log.',
        how: [
          'cut -d: -f1 /etc/passwd      # the first field',
          'cut -d: -f1,7 /etc/passwd    # fields 1 and 7',
          "cut -d' ' -f1 access.log     # space-separated",
          'tr a-z A-Z                   # to upper case',
        ],
        problems:
          'Forgetting -d: without it cut splits on tabs, and cut -f1 /etc/passwd shows the whole line, "root:x:0:0:root:/root:/bin/bash". Add -d:.',
        whenNot:
          'cut treats every space as a separator: with columns aligned by several spaces, awk is better.',
      },
      example: 'Before you look: /etc/passwd uses colons. What will cut -f1, without -d, show?',
    },
    fr: {
      title: 'Colonnes et caractères : cut et tr',
      goal: 'Affiche seulement les noms d’utilisateur de /etc/passwd (le premier champ), en majuscules.',
      theory: {
        what: 'cut extrait des colonnes : -d donne le séparateur et -f quels champs. tr change ou supprime des caractères.',
        when: 'Avec des fichiers en colonnes : /etc/passwd, un CSV, un journal séparé par des espaces.',
        how: [
          'cut -d: -f1 /etc/passwd      # le premier champ',
          'cut -d: -f1,7 /etc/passwd    # le 1 et le 7',
          "cut -d' ' -f1 access.log     # séparés par des espaces",
          'tr a-z A-Z                   # en majuscules',
        ],
        problems:
          'Oublier -d : sans lui, cut coupe aux tabulations, et cut -f1 /etc/passwd affiche la ligne entière, « root:x:0:0:root:/root:/bin/bash ». Ajoute -d:.',
        whenNot:
          'cut prend chaque espace pour un séparateur : avec des colonnes alignées par plusieurs espaces, awk fait mieux.',
      },
      example:
        'Avant de regarder : /etc/passwd sépare avec des deux-points. Qu’affichera cut -f1, sans -d ?',
    },
    example: [
      'cut -f1 /etc/passwd | head -n 2',
      'cut -d: -f1 /etc/passwd | head -n 2',
      'cut -d: -f1,7 /etc/passwd | tail -n 2',
      "echo 'hola peers' | tr a-z A-Z",
    ],
    solution: ['cut -d: -f1 /etc/passwd | tr a-z A-Z'],
    check: { output: true },
  },
  {
    id: 'sort-uniq',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Contar y ordenar: sort y uniq',
      goal: 'Enseña las 3 IPs que más peticiones hacen en access.log, con cuántas hace cada una (de más a menos).',
      theory: {
        what: 'sort ordena líneas (-n números, -r al revés). uniq -c junta las iguales seguidas y las cuenta.',
        when: 'Para el «top» de cualquier cosa: IPs que más piden, rutas que más fallan.',
        how: [
          'sort -rn cuentas.txt         # números, de más a menos',
          '... | sort | uniq -c         # cuántas de cada',
          '... | sort | uniq -c | sort -rn | head -n 3',
        ],
        problems:
          'uniq sin sort antes solo junta repetidas seguidas: con access.log, uniq -c saca «3 200» y, tres líneas más abajo, «2 200». Ordena primero.',
        whenNot: 'sort -u quita repetidas sin contarlas; para contar, sort | uniq -c.',
      },
      example:
        'Antes de verlo: los códigos de access.log van desordenados. Con uniq -c sin sort, ¿saldrá cada código una sola vez?',
    },
    en: {
      title: 'Counting and sorting: sort and uniq',
      goal: 'Show the 3 IPs with the most requests in access.log, with how many each made (most first).',
      theory: {
        what: 'sort orders lines (-n numbers, -r reversed). uniq -c merges identical adjacent lines and counts them.',
        when: 'For the "top" of anything: IPs that request most, routes that fail most.',
        how: [
          'sort -rn cuentas.txt         # numbers, highest first',
          '... | sort | uniq -c         # how many of each',
          '... | sort | uniq -c | sort -rn | head -n 3',
        ],
        problems:
          'uniq without sort first only merges adjacent repeats: with access.log, uniq -c prints "3 200" and, three lines down, "2 200". Sort first.',
        whenNot: 'sort -u removes repeats without counting; to count, sort | uniq -c.',
      },
      example:
        'Before you look: the codes in access.log are unordered. With uniq -c and no sort, will each code appear only once?',
    },
    fr: {
      title: 'Compter et trier : sort et uniq',
      goal: 'Affiche les 3 IP qui font le plus de requêtes dans access.log, avec le nombre de requêtes de chacune (de la plus active à la moins active).',
      theory: {
        what: 'sort trie les lignes (-n nombres, -r à l’envers). uniq -c regroupe les lignes identiques qui se suivent et les compte.',
        when: 'Pour le « top » de n’importe quoi : IP ou routes qui échouent le plus.',
        how: [
          'sort -rn cuentas.txt         # nombres, du plus grand',
          '... | sort | uniq -c         # combien de chaque',
          '... | sort | uniq -c | sort -rn | head -n 3',
        ],
        problems:
          'uniq sans sort ne regroupe que les voisines : avec access.log, uniq -c sort « 3 200 » puis, trois lignes plus bas, « 2 200 ». Trie d’abord.',
        whenNot: 'sort -u enlève les répétitions sans les compter ; pour compter, sort | uniq -c.',
      },
      example:
        'Avant de regarder : les codes d’access.log sont dans le désordre. Avec uniq -c sans sort, chaque code sortira-t-il une seule fois ?',
    },
    example: [
      "cut -d' ' -f9 /var/log/nginx/access.log | uniq -c | head -n 6",
      "cut -d' ' -f9 /var/log/nginx/access.log | sort | uniq -c",
      "cut -d' ' -f9 /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -n 2",
    ],
    solution: [`cut -d' ' -f1 ${ACCESS} | sort | uniq -c | sort -rn | head -n 3`],
    check: { output: true },
  },
  {
    id: 'sed',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    setup: { files: { [`${H}/app.env`]: 'PORT=3000\nDB_HOST=db1\nLOG_LEVEL=info\n' } },
    es: {
      title: 'Cambiar texto: sed',
      goal: 'En ~/app.env, cambia LOG_LEVEL=info por LOG_LEVEL=debug (en el propio fichero).',
      theory: {
        what: "sed cambia texto al vuelo: 's/viejo/nuevo/' cambia la primera coincidencia de cada línea (con g, todas). Con -i cambia el fichero.",
        when: 'Para cambiar una opción desde un guion o por ssh, sin abrir un editor.',
        how: [
          "sed 's/ERROR/FALLO/' app.log    # solo en pantalla",
          "sed -i 's/info/debug/' app.env  # en el fichero",
          "sed -n '2,4p' /etc/passwd       # líneas 2 a 4",
        ],
        problems:
          "Redirigir al mismo fichero: sed 's/info/debug/' prueba.env > prueba.env lo vacía antes de leerlo, y wc -c dice «0 prueba.env». Usa sed -i.",
        whenNot: 'Sin -i, sed solo enseña el resultado. Prueba así y añade -i cuando salga bien.',
      },
      example:
        "Antes de verlo: escribes sed 's/info/debug/' prueba.env > prueba.env. ¿Qué quedará dentro de prueba.env?",
    },
    en: {
      title: 'Changing text: sed',
      goal: 'In ~/app.env, change LOG_LEVEL=info to LOG_LEVEL=debug (in the file itself).',
      theory: {
        what: "sed edits text on the fly: 's/old/new/' replaces the first match on each line (with g, all). With -i it changes the file.",
        when: 'To change an option from a script or over ssh, without opening an editor.',
        how: [
          "sed 's/ERROR/FALLO/' app.log    # on screen only",
          "sed -i 's/info/debug/' app.env  # in the file",
          "sed -n '2,4p' /etc/passwd       # lines 2 to 4",
        ],
        problems:
          'Redirecting to the same file: sed \'s/info/debug/\' prueba.env > prueba.env empties it before reading, and wc -c says "0 prueba.env". Use sed -i.',
        whenNot: 'Without -i, sed only shows the result: try first, then add -i.',
      },
      example:
        "Before you look: you type sed 's/info/debug/' prueba.env > prueba.env. What will be left inside prueba.env?",
    },
    fr: {
      title: 'Modifier du texte : sed',
      goal: 'Dans ~/app.env, remplace LOG_LEVEL=info par LOG_LEVEL=debug (dans le fichier lui-même).',
      theory: {
        what: "sed modifie le texte à la volée : 's/vieux/neuf/' remplace la première occurrence de chaque ligne (avec g, toutes). Avec -i, il modifie le fichier.",
        when: 'Pour changer une option depuis un script ou par ssh, sans ouvrir d’éditeur.',
        how: [
          "sed 's/ERROR/FALLO/' app.log    # à l’écran seulement",
          "sed -i 's/info/debug/' app.env  # dans le fichier",
          "sed -n '2,4p' /etc/passwd       # lignes 2 à 4",
        ],
        problems:
          "Rediriger vers le même fichier : sed 's/info/debug/' prueba.env > prueba.env le vide avant de le lire, et wc -c dit « 0 prueba.env ». Utilise sed -i.",
        whenNot: 'Sans -i, sed affiche seulement le résultat : essaie, puis ajoute -i.',
      },
      example:
        "Avant de regarder : tu tapes sed 's/info/debug/' prueba.env > prueba.env. Que restera-t-il dans prueba.env ?",
    },
    example: [
      "sed 's/ERROR/FALLO/' /var/log/peer4u/app.log | grep FALLO | head -n 2",
      "sed -n '2,4p' /etc/passwd",
      'cp app.env prueba.env',
      "sed 's/info/debug/' prueba.env > prueba.env",
      'wc -c prueba.env',
    ],
    solution: ["sed -i 's/LOG_LEVEL=info/LOG_LEVEL=debug/' ~/app.env"],
    check: { files: [`${H}/app.env`] },
  },
  {
    id: 'awk',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Columnas con cuentas: awk',
      goal: 'Suma los bytes servidos (columna 10) de las respuestas con código 200 (columna 9) de access.log. Enseña solo el total.',
      theory: {
        what: 'awk parte cada línea en campos ($1, $2… $NF); un patrón elige líneas y entre llaves va qué hacer.',
        when: 'Para filtrar por el valor de una columna o sumar.',
        how: [
          "awk '{print $1}' access.log      # primera columna",
          "awk '$9 >= 500' access.log       # filtra por valor",
          "awk '{s += $10} END {print s}' access.log",
        ],
        problems:
          'Comillas dobles: con awk "{print $1}", la shell cambia $1 por nada y sale la línea entera, no la IP. Usa simples.',
        whenNot:
          'Para una columna de un fichero bien separado basta cut; awk compensa con condiciones o cuentas.',
      },
      example:
        'Antes de verlo: ¿escribirán lo mismo awk "{print $1}", con dobles, y awk \'{print $1}\', con simples?',
    },
    en: {
      title: 'Columns with maths: awk',
      goal: 'Add up the bytes sent (column 10) of the responses with code 200 (column 9) in access.log. Show only the total.',
      theory: {
        what: 'awk splits each line into fields ($1, $2… $NF); a pattern picks lines and braces hold what to do.',
        when: "To filter by a column's value or add things up.",
        how: [
          "awk '{print $1}' access.log      # first column",
          "awk '$9 >= 500' access.log       # filter by value",
          "awk '{s += $10} END {print s}' access.log",
        ],
        problems:
          'Double quotes: with awk "{print $1}", the shell replaces $1 with nothing and you get the whole line, not the IP. Use single quotes.',
        whenNot:
          'For one column of a cleanly separated file cut is enough; awk pays off with conditions or sums.',
      },
      example:
        'Before you look: will awk "{print $1}", with double quotes, and awk \'{print $1}\', with single, print the same?',
    },
    fr: {
      title: 'Des colonnes et des calculs : awk',
      goal: 'Additionne les octets envoyés (colonne 10) des réponses au code 200 (colonne 9) de access.log. Affiche seulement le total.',
      theory: {
        what: 'awk découpe chaque ligne en champs ($1, $2… $NF) ; un motif choisit les lignes, les accolades disent quoi faire.',
        when: 'Pour filtrer selon la valeur d’une colonne ou faire une somme.',
        how: [
          "awk '{print $1}' access.log      # première colonne",
          "awk '$9 >= 500' access.log       # filtre par valeur",
          "awk '{s += $10} END {print s}' access.log",
        ],
        problems:
          'Guillemets doubles : avec awk "{print $1}", le shell remplace $1 par rien et tu obtiens la ligne entière, pas l’IP. Mets des apostrophes.',
        whenNot:
          'Pour une colonne d’un fichier bien séparé, cut suffit ; awk vaut le coup avec des conditions ou des calculs.',
      },
      example:
        'Avant de regarder : awk "{print $1}", entre guillemets doubles, et awk \'{print $1}\', entre apostrophes, écriront-ils la même chose ?',
    },
    example: [
      'awk "{print $1}" /var/log/nginx/access.log | head -n 1',
      "awk '{print $1}' /var/log/nginx/access.log | head -n 1",
      "awk -F: '$3 >= 1000 {print $1}' /etc/passwd",
      "awk '$9 >= 500' /var/log/nginx/access.log | wc -l",
    ],
    solution: [`awk '$9 == 200 {s += $10} END {print s}' ${ACCESS}`],
    check: { output: true },
  },
  {
    id: 'boss4',
    block: 4,
    tier: 'intermediate',
    kind: 'boss',
    limit: 300,
    es: {
      title: 'Jefe: alguien llama a la puerta del ssh',
      goal: 'Saca del registro de autenticación quién está atacando y con qué usuarios, y déjalo en ~/informe.',
      story:
        'Seguridad ha visto cientos de intentos de entrar por ssh en web1. Quiere un informe ya: /var/log/auth.log.',
      tasks: [
        'Crea ~/informe.',
        'En ~/informe/atacante.txt, solo la IP con más líneas «Failed password».',
        'En ~/informe/fallos.txt, cuántas líneas «Failed password» hay (solo el número).',
        'En ~/informe/usuarios.txt, los usuarios que probaron (el que va tras «invalid user»), sin repetir y en orden.',
      ],
    },
    en: {
      title: 'Boss: someone is knocking on ssh',
      goal: 'Find out from the auth log who is attacking and with which users, and leave it in ~/informe.',
      story:
        'Security saw hundreds of ssh login attempts on web1. They want a report now: /var/log/auth.log.',
      tasks: [
        'Create ~/informe.',
        'In ~/informe/atacante.txt, only the IP with the most «Failed password» lines.',
        'In ~/informe/fallos.txt, how many «Failed password» lines there are (just the number).',
        'In ~/informe/usuarios.txt, the users they tried (the one after «invalid user»), unique and sorted.',
      ],
    },
    fr: {
      title: 'Boss : quelqu’un frappe à la porte de ssh',
      goal: 'Trouve dans le log d’authentification qui attaque et avec quels utilisateurs, et range tout ça dans ~/informe.',
      story:
        'L’équipe sécurité a vu des centaines de tentatives de connexion ssh sur web1. Elle veut un rapport tout de suite : /var/log/auth.log.',
      tasks: [
        'Crée ~/informe.',
        'Dans ~/informe/atacante.txt, seulement l’IP qui a le plus de lignes « Failed password ».',
        'Dans ~/informe/fallos.txt, le nombre de lignes « Failed password » (seulement le nombre).',
        'Dans ~/informe/usuarios.txt, les noms d’utilisateur tentés (le mot qui suit « invalid user »), sans doublons et triés.',
      ],
    },
    solution: [
      'mkdir ~/informe',
      "grep 'Failed password' /var/log/auth.log | awk '{print $13}' | sort | uniq -c | sort -rn | head -n 1 | awk '{print $2}' > ~/informe/atacante.txt",
      "grep -c 'Failed password' /var/log/auth.log > ~/informe/fallos.txt",
      "grep 'Failed password' /var/log/auth.log | awk '{print $11}' | sort -u > ~/informe/usuarios.txt",
    ],
    check: {
      files: [`${H}/informe/atacante.txt`, `${H}/informe/fallos.txt`, `${H}/informe/usuarios.txt`],
    },
  },

  /* ---------- Bloque 5: buscar, empaquetar, disco ---------- */
  {
    id: 'find',
    block: 5,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Buscar ficheros: find',
      goal: 'Enseña los ficheros .log de /var/log (con subcarpetas) que pasan de 2 KB.',
      theory: {
        what: 'find recorre carpetas y enseña lo que cumple las condiciones: -name (patrón entre comillas), -type f o d, -size +10M, -mtime +7.',
        when: 'Cuando no sabes dónde está algo, o quieres todo lo viejo o lo grande.',
        how: [
          "find ~ -name '*.txt'               # por nombre",
          'find /etc -type d -name nginx      # solo carpetas',
          'find /tmp -mtime +7                # más de 7 días',
        ],
        problems:
          "Patrón sin comillas: en /var/log, find . -name *.log solo encuentra «./auth.log», porque la shell cambió *.log por auth.log antes. Escribe '*.log'.",
        whenNot: 'ls mira una carpeta; find baja por todas sus subcarpetas.',
      },
      example:
        "Antes de verlo: estás en /var/log, con auth.log y subcarpetas con más .log. ¿Encontrarán lo mismo find . -name *.log y '*.log'?",
    },
    en: {
      title: 'Finding files: find',
      goal: 'Show the .log files under /var/log (subdirectories included) bigger than 2 KB.',
      theory: {
        what: 'find walks directories and shows what meets the conditions: -name (pattern in quotes), -type f or d, -size +10M, -mtime +7.',
        when: 'When you do not know where something is, or want everything old or big.',
        how: [
          "find ~ -name '*.txt'               # by name",
          'find /etc -type d -name nginx      # directories only',
          'find /tmp -mtime +7                # older than 7 days',
        ],
        problems:
          'Unquoted pattern: in /var/log, find . -name *.log only finds "./auth.log", because the shell replaced *.log with auth.log first. Type \'*.log\'.',
        whenNot: 'ls looks at one directory; find goes down into all its subdirectories.',
      },
      example:
        "Before you look: you are in /var/log, with auth.log and subdirectories holding more .log files. Will find . -name *.log and '*.log' find the same?",
    },
    fr: {
      title: 'Chercher des fichiers : find',
      goal: 'Affiche les fichiers .log de /var/log (sous-dossiers compris) qui font plus de 2 Ko.',
      theory: {
        what: 'find parcourt les dossiers et affiche ce qui remplit les conditions : -name (motif entre apostrophes), -type f ou d, -size +10M, -mtime +7.',
        when: 'Quand tu ne sais pas où est une chose, ou pour tout ce qui est vieux ou gros.',
        how: [
          "find ~ -name '*.txt'               # par nom",
          'find /etc -type d -name nginx      # dossiers seulement',
          'find /tmp -mtime +7                # plus de 7 jours',
        ],
        problems:
          "Motif sans apostrophes : dans /var/log, find . -name *.log ne trouve que « ./auth.log », car le shell a remplacé *.log par auth.log avant. Écris '*.log'.",
        whenNot: 'ls regarde un dossier ; find descend dans tous ses sous-dossiers.',
      },
      example:
        "Avant de regarder : tu es dans /var/log, avec auth.log et des sous-dossiers pleins de .log. find . -name *.log et '*.log' trouveront-ils la même chose ?",
    },
    example: [
      'cd /var/log',
      'find . -name *.log',
      "find . -name '*.log'",
      'find /etc -type d -name nginx',
    ],
    solution: ["find /var/log -name '*.log' -size +2k"],
    check: { output: true },
  },
  {
    id: 'find-exec',
    block: 5,
    tier: 'intermediate',
    kind: 'unit',
    setup: {
      files: {
        [`${H}/cache/old1.tmp`]: { text: 'viejo\n', age: 10 },
        [`${H}/cache/old2.tmp`]: { text: 'viejo\n', age: 9 },
        [`${H}/cache/new.tmp`]: { text: 'nuevo\n', age: 1 },
        [`${H}/cache/keep.dat`]: { text: 'datos\n', age: 20 },
      },
    },
    es: {
      title: 'Hacer algo con lo encontrado: -exec, -delete y xargs',
      goal: 'Borra los .tmp de ~/cache que tengan más de 7 días. Los nuevos y los .dat se quedan.',
      theory: {
        what: 'find puede actuar sobre lo que encuentra: -delete lo borra y -exec orden {} \\; la ejecuta con cada uno. xargs pasa líneas como argumentos.',
        when: 'Limpiezas periódicas: temporales viejos, registros antiguos, copias caducadas.',
        how: [
          "find ~/cache -name '*.tmp' -mtime +7   # mira antes",
          "find . -name '*.log' -exec gzip {} \\;",
          "find . -name '*.tmp' | xargs rm",
        ],
        problems:
          'Borrar sin mirar: find ~/cache -mtime +7 también lista «/home/peer/cache/keep.dat» y la propia carpeta; -delete se los llevaría. Prueba sin -delete y afina con -name.',
        whenNot: '-exec … \\; lanza la orden una vez por fichero; xargs, una vez con todos.',
      },
      example:
        'Antes de verlo: en ~/cache hay .tmp viejos y un keep.dat también viejo. ¿Qué listará find ~/cache -mtime +7?',
    },
    en: {
      title: 'Acting on what you find: -exec, -delete and xargs',
      goal: 'Delete the .tmp files in ~/cache older than 7 days. The new ones and the .dat stay.',
      theory: {
        what: 'find can act on what it finds: -delete removes it and -exec command {} \\; runs it on each one. xargs turns lines into arguments.',
        when: 'Routine clean-ups: old temporary files, old logs, expired backups.',
        how: [
          "find ~/cache -name '*.tmp' -mtime +7   # look first",
          "find . -name '*.log' -exec gzip {} \\;",
          "find . -name '*.tmp' | xargs rm",
        ],
        problems:
          'Deleting without looking: find ~/cache -mtime +7 also lists "/home/peer/cache/keep.dat" and the directory itself; -delete would take them. Try without -delete and narrow it with -name.',
        whenNot: '-exec … \\; runs the command once per file; xargs, once with all of them.',
      },
      example:
        'Before you look: ~/cache has old .tmp files and a keep.dat that is old too. What will find ~/cache -mtime +7 list?',
    },
    fr: {
      title: 'Agir sur ce qu’on trouve : -exec, -delete et xargs',
      goal: 'Supprime les .tmp de ~/cache qui ont plus de 7 jours. Les récents et les .dat restent.',
      theory: {
        what: 'find peut agir sur ce qu’il trouve : -delete le supprime et -exec commande {} \\; la lance sur chacun. xargs transforme des lignes en arguments.',
        when: 'Ménage régulier : vieux temporaires, anciens journaux, sauvegardes périmées.',
        how: [
          "find ~/cache -name '*.tmp' -mtime +7   # regarde avant",
          "find . -name '*.log' -exec gzip {} \\;",
          "find . -name '*.tmp' | xargs rm",
        ],
        problems:
          'Supprimer sans regarder : find ~/cache -mtime +7 liste aussi « /home/peer/cache/keep.dat » et le dossier lui-même ; -delete les emporterait. Essaie sans -delete et affine avec -name.',
        whenNot:
          '-exec … \\; lance la commande une fois par fichier ; xargs, une seule fois avec tous.',
      },
      example:
        'Avant de regarder : ~/cache contient de vieux .tmp et un keep.dat vieux lui aussi. Que listera find ~/cache -mtime +7 ?',
    },
    example: [
      'find ~/cache -mtime +7',
      "find ~/cache -name '*.tmp' -mtime +7",
      "find ~/cache -name '*.tmp' | xargs wc -c",
    ],
    solution: ["find ~/cache -name '*.tmp' -mtime +7 -delete"],
    check: {
      files: [
        `${H}/cache/old1.tmp`,
        `${H}/cache/old2.tmp`,
        `${H}/cache/new.tmp`,
        `${H}/cache/keep.dat`,
      ],
    },
  },
  {
    id: 'tar',
    block: 5,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Empaquetar: tar y gzip',
      goal: 'Guarda la configuración de nginx (/etc/nginx entera) en ~/backups/nginx-conf.tar.gz.',
      theory: {
        what: 'tar junta ficheros en uno: -c crea, -t lista, -x saca, -z comprime y -f da el nombre. gzip comprime uno suelto.',
        when: 'Copias de seguridad o llevar una carpeta a otra máquina.',
        how: [
          'tar -czf copia.tar.gz proyectos  # crear',
          'tar -tzf copia.tar.gz            # ver qué lleva',
          'tar -xzf copia.tar.gz -C /tmp    # sacarlo en /tmp',
          'gzip -k app.log                  # guarda el original',
        ],
        problems:
          'Poner la f donde no toca: tar -cfz notas.tar.gz notas.txt toma z por nombre y responde «tar: notas.tar.gz: Cannot stat: No such file or directory». Escribe -czf.',
        whenNot: 'gzip comprime un solo fichero; para una carpeta, tar con -z.',
      },
      example:
        'Antes de verlo: escribes tar -cfz notas.tar.gz notas.txt, con la f antes de la z. ¿Qué pasará?',
    },
    en: {
      title: 'Archiving: tar and gzip',
      goal: 'Save the nginx configuration (all of /etc/nginx) in ~/backups/nginx-conf.tar.gz.',
      theory: {
        what: 'tar bundles files into one: -c creates, -t lists, -x extracts, -z compresses, -f names it. gzip compresses one file.',
        when: 'Backups, or moving a directory to another machine.',
        how: [
          'tar -czf copia.tar.gz proyectos  # create',
          'tar -tzf copia.tar.gz            # see what is inside',
          'tar -xzf copia.tar.gz -C /tmp    # extract into /tmp',
          'gzip -k app.log                  # keeps the original',
        ],
        problems:
          'Putting the f in the wrong place: tar -cfz notas.tar.gz notas.txt takes z as the name and answers "tar: notas.tar.gz: Cannot stat: No such file or directory". Type -czf.',
        whenNot: 'gzip compresses a single file; for a directory, tar with -z.',
      },
      example:
        'Before you look: you type tar -cfz notas.tar.gz notas.txt, with the f before the z. What happens?',
    },
    fr: {
      title: 'Archiver : tar et gzip',
      goal: 'Sauvegarde la configuration de nginx (tout /etc/nginx) dans ~/backups/nginx-conf.tar.gz.',
      theory: {
        what: 'tar rassemble des fichiers en un : -c crée, -t liste, -x extrait, -z compresse, -f donne le nom. gzip compresse un fichier.',
        when: 'Sauvegardes, ou emporter un dossier sur une autre machine.',
        how: [
          'tar -czf copia.tar.gz proyectos  # créer',
          'tar -tzf copia.tar.gz            # voir le contenu',
          'tar -xzf copia.tar.gz -C /tmp    # extraire dans /tmp',
          'gzip -k app.log                  # garde l’original',
        ],
        problems:
          'Mal placer le f : tar -cfz notas.tar.gz notas.txt prend z pour le nom et répond « tar: notas.tar.gz: Cannot stat: No such file or directory ». Écris -czf.',
        whenNot: 'gzip compresse un seul fichier ; pour un dossier, tar avec -z.',
      },
      example:
        'Avant de regarder : tu tapes tar -cfz notas.tar.gz notas.txt, avec le f avant le z. Que se passe-t-il ?',
    },
    example: [
      'tar -cfz notas.tar.gz notas.txt',
      'tar -czf notas.tar.gz notas.txt proyectos',
      'tar -tzf notas.tar.gz',
      'gzip -k notas.txt',
      'ls notas.txt*',
    ],
    solution: ['mkdir -p ~/backups', 'tar -czf ~/backups/nginx-conf.tar.gz /etc/nginx'],
    check: { archives: [`${H}/backups/nginx-conf.tar.gz`] },
  },
  {
    id: 'du-df',
    block: 5,
    tier: 'intermediate',
    kind: 'unit',
    setup: {
      files: {
        '/srv/datos/videos/demo.mp4': { text: 'mp4\n', size: 3 * 1024 ** 3 },
        '/srv/datos/fotos/equipo.jpg': { text: 'jpg\n', size: 200 * 1024 ** 2 },
        '/srv/datos/docs/manual.pdf': { text: 'pdf\n', size: 5 * 1024 ** 2 },
        '/srv/datos/backups/viejo.tar': { text: 'tar\n', size: 1200 * 1024 ** 2 },
      },
    },
    es: {
      title: 'Espacio en disco: df y du',
      goal: '¿Qué subcarpeta de /srv/datos ocupa más? Escribe solo su nombre en ~/mayor.txt.',
      theory: {
        what: 'df -h dice cuánto queda en cada disco; du -sh, cuánto ocupa una carpeta. sort -h ordena tamaños como 5M y 3G.',
        when: 'Cuando salta la alarma de disco: df para ver qué disco, du para dar con la carpeta.',
        how: [
          'df -h                          # cada disco',
          'du -sh /var/log                # una carpeta',
          'du -h -d 1 /var/log | sort -h  # un nivel, ordenado',
        ],
        problems:
          'Ordenar tamaños con sort a secas: compara como texto y pone «8.0K» detrás de «36K». Con sort -h, 8.0K va primero.',
        whenNot: 'df mira el disco entero; du, una carpeta. Primero df y, sabiendo el disco, du.',
      },
      example:
        'Antes de verlo: en /var/log hay carpetas de 8.0K y 16K, y el total es 36K. ¿En qué orden las pondrá sort, sin -h?',
    },
    en: {
      title: 'Disk space: df and du',
      goal: 'Which subdirectory of /srv/datos takes the most space? Write only its name into ~/mayor.txt.',
      theory: {
        what: 'df -h says how much is left on each disk; du -sh, how much a directory takes. sort -h orders sizes like 5M and 3G.',
        when: 'When the disk alarm goes off: df for the disk, du for the directory.',
        how: [
          'df -h                          # each disk',
          'du -sh /var/log                # one directory',
          'du -h -d 1 /var/log | sort -h  # one level, sorted',
        ],
        problems:
          'Sorting sizes with plain sort: it compares them as text and puts "8.0K" after "36K". With sort -h, 8.0K comes first.',
        whenNot:
          'df looks at the whole disk; du, at a directory. First df and, knowing the disk, du.',
      },
      example:
        'Before you look: /var/log has directories of 8.0K and 16K, and the total is 36K. In what order will plain sort put them?',
    },
    fr: {
      title: 'Espace disque : df et du',
      goal: 'Quel sous-dossier de /srv/datos prend le plus de place ? Écris seulement son nom dans ~/mayor.txt.',
      theory: {
        what: 'df -h dit ce qui reste sur chaque disque ; du -sh, ce qu’occupe un dossier. sort -h trie des tailles comme 5M et 3G.',
        when: 'Quand l’alerte disque sonne : df pour le disque, du pour le dossier.',
        how: [
          'df -h                          # chaque disque',
          'du -sh /var/log                # un dossier',
          'du -h -d 1 /var/log | sort -h  # un niveau, trié',
        ],
        problems:
          'Trier des tailles avec sort seul : il compare du texte et met « 8.0K » après « 36K ». Avec sort -h, 8.0K passe en premier.',
        whenNot:
          'df regarde le disque entier ; du, un dossier. D’abord df puis, le disque trouvé, du.',
      },
      example:
        'Avant de regarder : /var/log contient des dossiers de 8.0K et 16K, pour un total de 36K. Dans quel ordre sort, sans -h, les mettra-t-il ?',
    },
    example: [
      'df -h',
      'du -sh /var/log',
      'du -h -d 1 /var/log | sort',
      'du -h -d 1 /var/log | sort -h',
    ],
    solution: ['du -sh /srv/datos/* | sort -h', 'echo videos > ~/mayor.txt'],
    check: { files: [`${H}/mayor.txt`] },
    requires: [['du']],
  },
  {
    id: 'boss5',
    block: 5,
    tier: 'intermediate',
    kind: 'boss',
    limit: 360,
    setup: {
      files: {
        '/var/log/peer4u/debug.log': {
          text: 'DEBUG cache miss\nDEBUG cache miss\n',
          owner: 'deploy',
          group: 'adm',
          mode: 0o640,
          size: 26 * 1024 ** 3,
        },
        '/var/log/nginx/access.log.1': {
          text: '10.42.0.7 - - "GET / HTTP/1.1" 200 63\n',
          owner: 'www-data',
          group: 'adm',
          mode: 0o640,
          size: 900 * 1024 ** 2,
          age: 1,
        },
        '/var/log/nginx/access.log.2': {
          text: '10.42.0.7 - - "GET / HTTP/1.1" 200 63\n',
          owner: 'www-data',
          group: 'adm',
          mode: 0o640,
          size: 900 * 1024 ** 2,
          age: 2,
        },
      },
    },
    es: {
      title: 'Jefe: disco al 97 %',
      goal: 'Deja el disco de web1 por debajo del 80 % sin borrar el registro que la API tiene abierto.',
      story:
        'Son las 4:12 y salta la alarma: el disco de web1 está casi lleno y la API empieza a fallar al escribir.',
      tasks: [
        'Encuentra qué se está comiendo el disco (df, du, find).',
        'Vacía /var/log/peer4u/debug.log sin borrarlo, que la API lo tiene abierto: sudo truncate -s 0 lo deja a cero.',
        'Comprime con gzip los registros rotados de nginx (access.log.1 y access.log.2).',
        'Comprueba con df que el disco ha bajado del 80 %.',
      ],
    },
    en: {
      title: 'Boss: disk at 97%',
      goal: 'Get web1’s disk under 80% without deleting the log the API has open.',
      story:
        'It is 4:12 a.m. and the alarm fires: web1’s disk is nearly full and the API starts failing to write.',
      tasks: [
        'Find what is eating the disk (df, du, find).',
        'Empty /var/log/peer4u/debug.log without deleting it, as the API has it open: sudo truncate -s 0 sets it to zero.',
        'Compress the rotated nginx logs (access.log.1 and access.log.2) with gzip.',
        'Check with df that the disk is below 80%.',
      ],
    },
    fr: {
      title: 'Boss : disque plein à 97 %',
      goal: 'Fais passer le disque de web1 sous les 80 % sans supprimer le log que l’API garde ouvert.',
      story:
        'Il est 4 h 12 et l’alerte sonne : le disque de web1 est presque plein et l’API commence à échouer en écriture.',
      tasks: [
        'Trouve ce qui remplit le disque (df, du, find).',
        'Vide /var/log/peer4u/debug.log sans le supprimer, car l’API le garde ouvert : sudo truncate -s 0 le remet à zéro.',
        'Compresse avec gzip les logs de nginx déjà passés en rotation (access.log.1 et access.log.2).',
        'Vérifie avec df que le disque est passé sous les 80 %.',
      ],
    },
    solution: [
      'df -h',
      'sudo du -sh /var/log/* | sort -h',
      'sudo truncate -s 0 /var/log/peer4u/debug.log',
      'sudo gzip /var/log/nginx/access.log.1 /var/log/nginx/access.log.2',
      'df -h',
    ],
    check: {
      files: [
        '/var/log/peer4u/debug.log',
        '/var/log/nginx/access.log.1',
        '/var/log/nginx/access.log.2',
        '/var/log/nginx/access.log.1.gz',
        '/var/log/nginx/access.log.2.gz',
      ],
      disk: { below: 80 },
    },
  },

  /* ---------- Bloque 6: procesos y entorno ---------- */
  {
    id: 'ps',
    block: 6,
    tier: 'intermediate',
    kind: 'unit',
    setup: { procs: [{ user: 'peer', cmd: 'python3 /tmp/miner.py', cpu: 97.3, mem: 12.1 }] },
    es: {
      title: 'Ver procesos: ps, top y pgrep',
      goal: 'Algo se come la CPU de web1. Escribe en ~/pid.txt el PID (solo el número) del proceso que más CPU gasta.',
      theory: {
        what: 'Cada programa en marcha es un proceso con su PID. ps aux los lista todos (usuario, %CPU, orden); pgrep busca el PID por nombre.',
        when: 'Cuando la máquina va lenta: quién se come la CPU y de quién es.',
        how: [
          'ps                               # tu terminal',
          'ps aux --sort=-%cpu | head -n 3  # los que más CPU',
          'pgrep -a -f miner.py             # PID y orden',
        ],
        problems:
          'ps a secas solo enseña tu terminal: «bash» y el propio «ps». Lo que se come la CPU no sale; usa ps aux.',
        whenNot: 'top se actualiza en directo; ps es una foto, mejor para pasarla a otra orden.',
      },
      example: 'Antes de verlo: algo gasta el 97 % de la CPU. ¿Saldrá con ps a secas?',
    },
    en: {
      title: 'Seeing processes: ps, top and pgrep',
      goal: 'Something is eating web1’s CPU. Write into ~/pid.txt the PID (just the number) of the process using the most CPU.',
      theory: {
        what: 'Every running program is a process with a PID. ps aux lists them all, with user, %CPU and command; pgrep gives the PID by name.',
        when: 'When the machine is slow: who is eating the CPU, and whose it is.',
        how: [
          'ps                               # your terminal',
          'ps aux --sort=-%cpu | head -n 3  # top CPU users',
          'pgrep -a -f miner.py             # PID and command',
        ],
        problems:
          'Plain ps only shows your terminal: "bash" and "ps" itself. Whatever eats the CPU is not there; use ps aux.',
        whenNot: 'top updates live; ps is a snapshot, better for piping into another command.',
      },
      example: 'Before you look: something is using 97% of the CPU. Will it show up with plain ps?',
    },
    fr: {
      title: 'Voir les processus : ps, top et pgrep',
      goal: 'Quelque chose dévore le CPU de web1. Écris dans ~/pid.txt le PID (seulement le nombre) du processus qui consomme le plus de CPU.',
      theory: {
        what: 'Chaque programme en marche est un processus avec son PID. ps aux les liste tous (utilisateur, %CPU, commande) ; pgrep trouve le PID par le nom.',
        when: 'Quand la machine rame : qui dévore le CPU, et à qui c’est.',
        how: [
          'ps                               # ton terminal',
          'ps aux --sort=-%cpu | head -n 3  # les plus gourmands',
          'pgrep -a -f miner.py             # PID et commande',
        ],
        problems:
          'ps seul n’affiche que ton terminal : « bash » et « ps » lui-même. Ce qui dévore le CPU n’y est pas ; utilise ps aux.',
        whenNot:
          'top bouge en direct ; ps est une photo, mieux pour la passer à une autre commande.',
      },
      example:
        'Avant de regarder : quelque chose utilise 97 % du CPU. Apparaîtra-t-il avec ps tout court ?',
    },
    example: ['ps', 'ps aux | head -n 4', 'ps -eo pid,user,%cpu,cmd --sort=-%cpu | head -n 3'],
    solution: ['ps aux --sort=-%cpu | head -n 3', 'pgrep -f miner.py > ~/pid.txt'],
    check: { files: [`${H}/pid.txt`] },
  },
  {
    id: 'kill',
    block: 6,
    tier: 'intermediate',
    kind: 'unit',
    setup: {
      procs: [
        { user: 'peer', cmd: 'python3 /tmp/miner.py', cpu: 60, mem: 12, stubborn: true },
        { user: 'peer', cmd: 'yes', cpu: 18, mem: 0.1, count: 2 },
      ],
    },
    es: {
      title: 'Parar procesos: kill y señales',
      goal: 'Para los dos yes y el miner.py. Ojo: miner.py no hace caso a la señal normal.',
      theory: {
        what: 'kill manda una señal a un PID: TERM (15, la de por defecto) pide que acabe; KILL (9) lo mata sin preguntar. pkill va por nombre.',
        when: 'Con un proceso colgado: primero TERM, que deja cerrar bien.',
        how: [
          'kill 1234           # TERM: que acabe',
          'kill -9 1234        # KILL: sin preguntar',
          'pkill -f miner.py   # por la orden entera',
        ],
        problems:
          'Parar procesos de otra cuenta sin sudo: kill 5003, el node de deploy, responde «bash: kill: (5003) - Operation not permitted». Mira de quién es con ps aux.',
        whenNot: 'Si ignora TERM, sigue en pgrep tras el kill: entonces, -9.',
      },
      example:
        'Antes de verlo: el PID 5003 es de deploy y tú eres peer. ¿Qué responderá kill 5003?',
    },
    en: {
      title: 'Stopping processes: kill and signals',
      goal: 'Stop both yes processes and miner.py. Careful: miner.py ignores the normal signal.',
      theory: {
        what: 'kill sends a signal to a PID: TERM (15, the default) asks it to finish; KILL (9) kills it without asking. pkill works by name.',
        when: 'With a hung process: TERM first, which lets it close cleanly.',
        how: [
          'kill 1234           # TERM: please finish',
          'kill -9 1234        # KILL: no questions',
          'pkill -f miner.py   # by the whole command',
        ],
        problems:
          'Stopping another account\'s processes without sudo: kill 5003, deploy\'s node, answers "bash: kill: (5003) - Operation not permitted". Check whose it is with ps aux.',
        whenNot: 'If it ignores TERM, it is still in pgrep after the kill: then, -9.',
      },
      example:
        'Before you look: PID 5003 belongs to deploy and you are peer. What will kill 5003 answer?',
    },
    fr: {
      title: 'Arrêter des processus : kill et signaux',
      goal: 'Arrête les deux processus yes et miner.py. Attention : miner.py ignore le signal normal.',
      theory: {
        what: 'kill envoie un signal à un PID : TERM (15, par défaut) lui demande de finir ; KILL (9) le tue sans demander. pkill passe par le nom.',
        when: 'Avec un processus bloqué : d’abord TERM, qui le laisse fermer proprement.',
        how: [
          'kill 1234           # TERM : qu’il finisse',
          'kill -9 1234        # KILL : sans demander',
          'pkill -f miner.py   # par la commande entière',
        ],
        problems:
          'Arrêter le processus d’un autre compte sans sudo : kill 5003, le node de deploy, répond « bash: kill: (5003) - Operation not permitted ». Regarde à qui il est avec ps aux.',
        whenNot: 'S’il ignore TERM, il reste dans pgrep après le kill : alors, -9.',
      },
      example:
        'Avant de regarder : le PID 5003 est à deploy et tu es peer. Que répondra kill 5003 ?',
    },
    example: ['sleep 600 &', 'pgrep -a sleep', 'pkill sleep', 'pgrep -a sleep', 'kill 5003'],
    solution: ['pkill yes', 'pkill -9 -f miner.py'],
    check: { procs: ['miner.py', 'yes'] },
  },
  {
    id: 'env',
    block: 6,
    tier: 'intermediate',
    kind: 'unit',
    setup: {
      files: {
        [`${H}/bin/hola`]: {
          text: '#!/bin/bash\necho "hola desde ~/bin ($ENTORNO)"\n',
          mode: 0o755,
        },
      },
    },
    es: {
      title: 'Variables, export y PATH',
      goal: 'Exporta ENTORNO=staging, añade ~/bin al PATH y ejecuta hola por su nombre (sin ruta).',
      theory: {
        what: 'Una variable guarda un texto y $NOMBRE lo usa. export la pasa a los programas que lances. PATH dice dónde se buscan las órdenes.',
        when: 'Para configurar programas (NODE_ENV, DATABASE_URL) y llamar a tus guiones sin la ruta.',
        how: [
          'NOMBRE=peer                    # sin espacios en el =',
          'export ENTORNO=prod            # la ven los hijos',
          'export PATH="$PATH:$HOME/bin"  # tus guiones, a mano',
          'which ls                       # dónde está una orden',
        ],
        problems:
          'Espacios alrededor del =: NOMBRE = peer ejecuta una orden llamada NOMBRE y responde «bash: NOMBRE: command not found». Escríbelo junto.',
        whenNot: 'Sin export, un bash -c no la ve. Para siempre, en ~/.bashrc.',
      },
      example:
        'Antes de verlo: pones NOMBRE=peer sin export. ¿Qué escribirá una shell hija con echo $NOMBRE?',
    },
    en: {
      title: 'Variables, export and PATH',
      goal: 'Export ENTORNO=staging, add ~/bin to PATH and run hola by name (no path).',
      theory: {
        what: 'A variable stores some text and $NOMBRE uses it. export passes it to the programs you start. PATH says where commands are searched for.',
        when: 'To configure programs (NODE_ENV, DATABASE_URL) and call your scripts without their path.',
        how: [
          'NOMBRE=peer                    # no spaces around =',
          'export ENTORNO=prod            # children see it',
          'export PATH="$PATH:$HOME/bin"  # your scripts, at hand',
          'which ls                       # where a command lives',
        ],
        problems:
          'Spaces around the =: NOMBRE = peer runs a command called NOMBRE and answers "bash: NOMBRE: command not found". Write it together.',
        whenNot: 'Without export, a bash -c does not see it. For good, in ~/.bashrc.',
      },
      example:
        'Before you look: you set NOMBRE=peer without export. What will a child shell print with echo $NOMBRE?',
    },
    fr: {
      title: 'Variables, export et PATH',
      goal: 'Exporte ENTORNO=staging, ajoute ~/bin au PATH et lance le programme hola par son nom (sans chemin).',
      theory: {
        what: 'Une variable garde un texte et $NOMBRE l’utilise. export la passe aux programmes que tu lances. PATH dit où chercher les commandes.',
        when: 'Pour configurer des programmes (NODE_ENV, DATABASE_URL) et appeler tes scripts sans leur chemin.',
        how: [
          'NOMBRE=peer                    # sans espaces autour du =',
          'export ENTORNO=prod            # les enfants la voient',
          'export PATH="$PATH:$HOME/bin"  # tes scripts, à portée',
          'which ls                       # où est une commande',
        ],
        problems:
          'Des espaces autour du = : NOMBRE = peer lance une commande appelée NOMBRE et répond « bash: NOMBRE: command not found ». Écris tout collé.',
        whenNot: 'Sans export, un bash -c ne la voit pas. Pour de bon, dans ~/.bashrc.',
      },
      example:
        'Avant de regarder : tu mets NOMBRE=peer sans export. Qu’écrira un shell enfant avec echo $NOMBRE ?',
    },
    example: [
      'NOMBRE = peer',
      'NOMBRE=peer',
      'bash -c \'echo "en la hija: $NOMBRE"\'',
      'export NOMBRE',
      'bash -c \'echo "en la hija: $NOMBRE"\'',
    ],
    solution: ['export ENTORNO=staging', 'export PATH="$PATH:$HOME/bin"', 'hola'],
    check: { env: ['ENTORNO'], output: true },
    requires: [['hola']],
  },
  {
    id: 'exit-codes',
    block: 6,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Códigos de salida: $?, && y ||',
      goal: 'Con && y ||: crea ~/listo.txt (vacío) solo si existe /etc/peer4u/app.env, y ~/fallo.txt (vacío) solo si NO existe /etc/peer4u/old.env.',
      theory: {
        what: 'Cada orden acaba con un código: 0 si fue bien, otro si falló ($? guarda el último). a && b sigue si a fue bien; a || b, si falló.',
        when: 'Para encadenar pasos que dependen del anterior: compilar && desplegar.',
        how: [
          'ls /nada; echo $?                # 2: falló',
          'test -f /etc/hosts && echo hay   # test mira ficheros',
        ],
        problems:
          'a && b || c no es un si-no: si b falla, c también va. test -f /etc/hosts && ls /nada || echo "no está" escribe «no está».',
        whenNot: '; sigue pase lo que pase; && y || miran antes el código.',
      },
      example:
        'Antes de verlo: /etc/hosts existe y /nada no. ¿Qué escribirá test -f /etc/hosts && ls /nada || echo "no está"?',
    },
    en: {
      title: 'Exit codes: $?, && and ||',
      goal: 'With && and ||: create ~/listo.txt (empty) only if /etc/peer4u/app.env exists, and ~/fallo.txt (empty) only if /etc/peer4u/old.env does NOT exist.',
      theory: {
        what: 'Every command ends with a code: 0 if it went well, another if it failed ($? holds the last). a && b runs b on success; a || b, on failure.',
        when: 'To chain steps that depend on the previous one: build && deploy.',
        how: [
          'ls /nada; echo $?                # 2: it failed',
          'test -f /etc/hosts && echo hay   # test checks files',
        ],
        problems:
          'a && b || c is not if-else: if b fails, c runs too. test -f /etc/hosts && ls /nada || echo "no está" prints "no está".',
        whenNot: '; carries on regardless; && and || check the code first.',
      },
      example:
        'Before you look: /etc/hosts exists and /nada does not. What will test -f /etc/hosts && ls /nada || echo "no está" print?',
    },
    fr: {
      title: 'Codes de sortie : $?, && et ||',
      goal: 'Avec && et || : crée ~/listo.txt (vide) seulement si /etc/peer4u/app.env existe, et ~/fallo.txt (vide) seulement si /etc/peer4u/old.env n’existe PAS.',
      theory: {
        what: 'Chaque commande finit avec un code : 0 si ça va, un autre si ça échoue ($? garde le dernier). a && b lance b si a réussit ; a || b, s’il échoue.',
        when: 'Pour enchaîner des étapes qui dépendent de la précédente : compiler && déployer.',
        how: [
          'ls /nada; echo $?                # 2 : échec',
          'test -f /etc/hosts && echo hay   # test vérifie des fichiers',
        ],
        problems:
          'a && b || c n’est pas un si-sinon : si b échoue, c s’exécute aussi. test -f /etc/hosts && ls /nada || echo "no está" écrit « no está ».',
        whenNot: '; continue quoi qu’il arrive ; && et || regardent d’abord le code.',
      },
      example:
        'Avant de regarder : /etc/hosts existe et /nada non. Qu’écrira test -f /etc/hosts && ls /nada || echo "no está" ?',
    },
    example: [
      'ls /etc/hostname; echo "código: $?"',
      'ls /nada; echo "código: $?"',
      'test -f /etc/hosts && echo hay',
      'test -f /etc/hosts && ls /nada || echo "no está"',
    ],
    solution: [
      'test -f /etc/peer4u/app.env && touch ~/listo.txt',
      'test -f /etc/peer4u/old.env || touch ~/fallo.txt',
    ],
    check: { files: [`${H}/listo.txt`, `${H}/fallo.txt`] },
  },
  {
    id: 'boss6',
    block: 6,
    tier: 'intermediate',
    kind: 'boss',
    limit: 300,
    setup: {
      procs: [
        { user: 'mgarcia', cmd: 'stress-ng --cpu 4', cpu: 30, mem: 1.5, count: 3 },
        { user: 'deploy', cmd: 'python3 /tmp/miner.py', cpu: 95, mem: 14, stubborn: true },
      ],
    },
    es: {
      title: 'Jefe: la API va a pedales',
      goal: 'Libera la CPU de web1 y deja constancia de quién lanzó qué.',
      story:
        'Las peticiones tardan 8 segundos. Alguien ha dejado pruebas de carga y algo peor corriendo en producción.',
      tasks: [
        'Para todos los stress-ng (no son tuyos: sudo).',
        'Para el miner.py (no hace caso a TERM).',
        'Escribe en ~/culpable.txt el usuario que lanzó el miner.py.',
        'Escribe en ~/deploy-procs.txt cuántos procesos le quedan a deploy (solo el número).',
      ],
    },
    en: {
      title: 'Boss: the API is crawling',
      goal: 'Free web1’s CPU and record who launched what.',
      story:
        'Requests take 8 seconds. Someone left load tests and something worse running in production.',
      tasks: [
        'Stop every stress-ng (not yours: sudo).',
        'Stop miner.py (it ignores TERM).',
        'Write into ~/culpable.txt the user who launched miner.py.',
        'Write into ~/deploy-procs.txt how many processes deploy has left (just the number).',
      ],
    },
    fr: {
      title: 'Boss : l’API rame',
      goal: 'Libère le CPU de web1 et garde une trace de qui a lancé quoi.',
      story:
        'Les requêtes prennent 8 secondes. Quelqu’un a laissé tourner en production des tests de charge, et quelque chose de pire.',
      tasks: [
        'Arrête tous les processus stress-ng (ils ne sont pas à toi : sudo).',
        'Arrête miner.py (il ignore TERM).',
        'Écris dans ~/culpable.txt l’utilisateur qui a lancé miner.py.',
        'Écris dans ~/deploy-procs.txt combien de processus il reste à deploy (seulement le nombre).',
      ],
    },
    solution: [
      'ps aux --sort=-%cpu | head -n 6',
      'sudo pkill stress-ng',
      'sudo pkill -9 -f miner.py',
      'echo deploy > ~/culpable.txt',
      'pgrep -u deploy | wc -l > ~/deploy-procs.txt',
    ],
    check: {
      procs: ['stress-ng', 'miner.py'],
      files: [`${H}/culpable.txt`, `${H}/deploy-procs.txt`],
    },
  },
  {
    id: 'final-intermediate',
    block: 6,
    tier: 'intermediate',
    kind: 'final',
    limit: 600,
    setup: {
      files: {
        [`${H}/app.env`]: 'PORT=3000\nLOG_LEVEL=debug\n',
        [`${H}/cache/a.tmp`]: { text: 'a\n', age: 5 },
        [`${H}/cache/b.tmp`]: { text: 'b\n', age: 1 },
      },
      procs: [{ user: 'peer', cmd: 'yes', cpu: 40, mem: 0.1 }],
    },
    es: {
      title: 'Jefe final: intermedio',
      goal: 'El informe de la mañana y la limpieza, contra el reloj. Si lo superas, tienes el certificado de intermedio.',
      story: 'Reunión de equipo en diez minutos y te piden números y orden en web1.',
      tasks: [
        'Crea ~/final.',
        'En ~/final/top-rutas.txt, las 3 rutas (columna 7) más pedidas en access.log con su cuenta, de más a menos (sort | uniq -c | sort -rn).',
        'En ~/final/errores.txt, cuántas respuestas 5xx hay (solo el número).',
        'Empaqueta ~/proyectos en ~/final/proyectos.tar.gz.',
        'Borra los .tmp de ~/cache de más de 3 días.',
        'Para el proceso yes.',
        'En ~/app.env, cambia LOG_LEVEL=debug por LOG_LEVEL=warn.',
      ],
    },
    en: {
      title: 'Final boss: intermediate',
      goal: 'The morning report and the cleanup, against the clock. Beat it and you get the intermediate certificate.',
      story: 'Team meeting in ten minutes and they want numbers and order on web1.',
      tasks: [
        'Create ~/final.',
        'In ~/final/top-rutas.txt, the 3 most requested paths (column 7) in access.log with their count, most first (sort | uniq -c | sort -rn).',
        'In ~/final/errores.txt, how many 5xx responses there are (just the number).',
        'Archive ~/proyectos into ~/final/proyectos.tar.gz.',
        'Delete the .tmp files in ~/cache older than 3 days.',
        'Stop the yes process.',
        'In ~/app.env, change LOG_LEVEL=debug to LOG_LEVEL=warn.',
      ],
    },
    fr: {
      title: 'Boss final : intermédiaire',
      goal: 'Le rapport du matin et le ménage, contre la montre. Si tu réussis, tu obtiens le certificat intermédiaire.',
      story:
        'Réunion d’équipe dans dix minutes : on attend de toi des chiffres, et que web1 soit remis en ordre.',
      tasks: [
        'Crée ~/final.',
        'Dans ~/final/top-rutas.txt, les 3 chemins (colonne 7) les plus demandés dans access.log avec leur nombre, du plus au moins demandé (sort | uniq -c | sort -rn).',
        'Dans ~/final/errores.txt, le nombre de réponses 5xx (seulement le nombre).',
        'Archive ~/proyectos dans ~/final/proyectos.tar.gz.',
        'Supprime les .tmp de ~/cache qui ont plus de 3 jours.',
        'Arrête le processus yes.',
        'Dans ~/app.env, remplace LOG_LEVEL=debug par LOG_LEVEL=warn.',
      ],
    },
    solution: [
      'mkdir ~/final',
      `awk '{print $7}' ${ACCESS} | sort | uniq -c | sort -rn | head -n 3 > ~/final/top-rutas.txt`,
      `awk '$9 >= 500' ${ACCESS} | wc -l > ~/final/errores.txt`,
      'tar -czf ~/final/proyectos.tar.gz ~/proyectos',
      "find ~/cache -name '*.tmp' -mtime +3 -delete",
      'pkill yes',
      "sed -i 's/LOG_LEVEL=debug/LOG_LEVEL=warn/' ~/app.env",
    ],
    check: {
      files: [
        `${H}/final/top-rutas.txt`,
        `${H}/final/errores.txt`,
        `${H}/cache/a.tmp`,
        `${H}/cache/b.tmp`,
        `${H}/app.env`,
      ],
      archives: [`${H}/final/proyectos.tar.gz`],
      procs: ['yes'],
    },
  },
]
