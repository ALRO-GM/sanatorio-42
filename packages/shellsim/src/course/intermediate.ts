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
        what: 'La tubería | pasa la salida de un comando a la entrada del siguiente. < mete un fichero como entrada. Así se encadenan herramientas pequeñas.',
        how: [
          'ls /var/log | wc -l',
          'cat fichero | head -n 2',
          'wc -l < fichero        # solo el número, sin el nombre',
          'orden | tee copia.txt   # verlo y guardarlo',
        ],
        when: 'Siempre que la respuesta salga de juntar dos o tres pasos: contar, filtrar, ordenar.',
        problems:
          'Con wc -l fichero sale también el nombre; con wc -l < fichero o cat fichero | wc -l, solo el número.',
      },
      example: 'Cuentas lo que hay en /var/log y miras las dos primeras cuentas de /etc/passwd.',
    },
    en: {
      title: 'Pipes: | and wc',
      goal: 'How many requests are in /var/log/nginx/access.log? Show only the number.',
      theory: {
        what: 'The pipe | feeds one command’s output into the next one’s input. < feeds a file as input. That is how small tools are chained.',
        how: [
          'ls /var/log | wc -l',
          'cat file | head -n 2',
          'wc -l < file           # just the number, no name',
          'command | tee copy.txt # see it and save it',
        ],
        when: 'Whenever the answer comes from joining two or three steps: count, filter, sort.',
        problems:
          'wc -l file also prints the name; wc -l < file or cat file | wc -l print just the number.',
      },
      example: 'You count what is in /var/log and look at the first two accounts in /etc/passwd.',
    },
    fr: {
      title: 'Tubes : | et wc',
      goal: 'Combien y a-t-il de requêtes dans /var/log/nginx/access.log ? Affiche seulement le nombre.',
      theory: {
        what: 'Le tube (pipe) | envoie la sortie d’une commande dans l’entrée de la suivante. < donne un fichier en entrée. C’est comme ça qu’on enchaîne de petits outils.',
        how: [
          'ls /var/log | wc -l',
          'cat fichier | head -n 2',
          'wc -l < fichier        # seulement le nombre, sans le nom',
          'commande | tee copie.txt # le voir et le garder',
        ],
        when: 'Chaque fois que la réponse vient de deux ou trois étapes mises bout à bout : compter, filtrer, trier.',
        problems:
          'Avec wc -l fichier, le nom s’affiche aussi ; avec wc -l < fichier ou cat fichier | wc -l, seulement le nombre.',
      },
      example:
        'Tu comptes ce qu’il y a dans /var/log et tu regardes les deux premiers comptes de /etc/passwd.',
    },
    example: ['ls /var/log | wc -l', 'cat /etc/passwd | head -n 2'],
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
        what: 'grep enseña las líneas que encajan con un patrón (una expresión regular). -i sin mayúsculas, -v las que no, -c cuántas, -n con número, -r en carpetas, -E regex extendida.',
        how: [
          'grep ERROR app.log',
          'grep -i error app.log',
          'grep -v INFO app.log',
          'grep -c WARN app.log',
          "grep -rn 'listen' /etc/nginx",
          "grep -E '50[0-9]' access.log",
        ],
        when: 'Para encontrar la aguja en el registro: errores, una IP, un usuario, una opción en la configuración.',
        problems:
          'Los caracteres especiales (. * [ ]) son de la regex: entre comillas simples y, si los quieres literales, con -F.',
      },
      example: 'Buscas errores sin mirar mayúsculas, cuentas avisos y buscas dónde escucha nginx.',
    },
    en: {
      title: 'Searching text: grep',
      goal: 'Show the lines of /var/log/peer4u/app.log that contain ERROR.',
      theory: {
        what: 'grep prints the lines matching a pattern (a regular expression). -i ignore case, -v the ones that do not, -c how many, -n with numbers, -r in directories, -E extended regex.',
        how: [
          'grep ERROR app.log',
          'grep -i error app.log',
          'grep -v INFO app.log',
          'grep -c WARN app.log',
          "grep -rn 'listen' /etc/nginx",
          "grep -E '50[0-9]' access.log",
        ],
        when: 'To find the needle in the log: errors, an IP, a user, a setting in the config.',
        problems:
          'Special characters (. * [ ]) belong to the regex: use single quotes and, for literal text, -F.',
      },
      example: 'You search errors ignoring case, count warnings and find where nginx listens.',
    },
    fr: {
      title: 'Chercher du texte : grep',
      goal: 'Affiche les lignes de /var/log/peer4u/app.log qui contiennent ERROR.',
      theory: {
        what: 'grep affiche les lignes qui correspondent à un motif (une expression régulière). -i sans tenir compte de la casse, -v celles qui ne correspondent pas, -c combien, -n avec les numéros, -r dans des dossiers, -E regex étendue.',
        how: [
          'grep ERROR app.log',
          'grep -i error app.log',
          'grep -v INFO app.log',
          'grep -c WARN app.log',
          "grep -rn 'listen' /etc/nginx",
          "grep -E '50[0-9]' access.log",
        ],
        when: 'Pour trouver l’aiguille dans le log : des erreurs, une IP, un utilisateur, une option dans la configuration.',
        problems:
          'Les caractères spéciaux (. * [ ]) appartiennent à la regex : mets-la entre apostrophes et, pour chercher le texte tel quel, utilise -F.',
      },
      example:
        'Tu cherches des erreurs sans tenir compte de la casse, tu comptes les avertissements et tu trouves où nginx écoute.',
    },
    example: [
      `grep -i error ${APP} | head -n 3`,
      `grep -c WARN ${APP}`,
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
        what: 'cut saca columnas (-d el separador, -f los campos; -c caracteres). tr cambia o borra caracteres.',
        how: [
          'cut -d: -f1 /etc/passwd',
          "cut -d' ' -f1 access.log",
          'cut -d: -f1,7 /etc/passwd',
          'tr a-z A-Z',
          "tr -d '\\r'          # quitar retornos de Windows",
          "tr ' ' '\\n'         # una palabra por línea",
        ],
        when: 'Con ficheros de columnas fijas: /etc/passwd, CSV, registros separados por espacios.',
        problems: 'cut no entiende varios espacios seguidos como uno: para eso, awk.',
      },
      example:
        'Sacas las IPs del registro de acceso, pasas un texto a mayúsculas y miras las shells.',
    },
    en: {
      title: 'Columns and characters: cut and tr',
      goal: 'Show only the user names in /etc/passwd (the first field), in uppercase.',
      theory: {
        what: 'cut extracts columns (-d separator, -f fields; -c characters). tr translates or deletes characters.',
        how: [
          'cut -d: -f1 /etc/passwd',
          "cut -d' ' -f1 access.log",
          'cut -d: -f1,7 /etc/passwd',
          'tr a-z A-Z',
          "tr -d '\\r'          # remove Windows carriage returns",
          "tr ' ' '\\n'         # one word per line",
        ],
        when: 'With fixed-column files: /etc/passwd, CSV, space-separated logs.',
        problems: 'cut does not treat several spaces as one: use awk for that.',
      },
      example: 'You extract IPs from the access log, uppercase a text and look at the shells.',
    },
    fr: {
      title: 'Colonnes et caractères : cut et tr',
      goal: 'Affiche seulement les noms d’utilisateur de /etc/passwd (le premier champ), en majuscules.',
      theory: {
        what: 'cut extrait des colonnes (-d le séparateur, -f les champs ; -c des caractères). tr remplace ou supprime des caractères.',
        how: [
          'cut -d: -f1 /etc/passwd',
          "cut -d' ' -f1 access.log",
          'cut -d: -f1,7 /etc/passwd',
          'tr a-z A-Z',
          "tr -d '\\r'          # enlever les retours chariot de Windows",
          "tr ' ' '\\n'         # un mot par ligne",
        ],
        when: 'Avec des fichiers en colonnes fixes : /etc/passwd, CSV, logs séparés par des espaces.',
        problems:
          'cut ne traite pas plusieurs espaces à la suite comme un seul : pour ça, il y a awk.',
      },
      example:
        'Tu extrais les IP du log d’accès, tu passes un texte en majuscules et tu regardes les shells.',
    },
    example: [
      `cut -d' ' -f1 ${ACCESS} | head -n 3`,
      "echo 'hola peers' | tr a-z A-Z",
      'cut -d: -f1,7 /etc/passwd | tail -n 2',
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
        what: 'sort ordena (-n como números, -r al revés, -h tamaños como 2K y 1G, -k por columna, -u sin repetidos). uniq junta líneas iguales seguidas (-c las cuenta): por eso va detrás de sort.',
        how: [
          'sort fichero',
          'sort -rn',
          'sort -k2 -t, datos.csv',
          '... | sort | uniq -c | sort -rn | head',
          'sort -u',
        ],
        when: 'El «top N» de cualquier cosa: IPs, rutas, errores, usuarios. Es la tubería más usada de este curso.',
        problems: 'uniq sin sort antes no cuenta bien: solo junta repetidas que estén seguidas.',
      },
      example: 'Cuentas qué shell usa cada cuenta y los códigos HTTP del registro.',
    },
    en: {
      title: 'Counting and sorting: sort and uniq',
      goal: 'Show the 3 IPs with the most requests in access.log, with how many each made (most first).',
      theory: {
        what: 'sort sorts (-n numeric, -r reverse, -h sizes like 2K and 1G, -k by column, -u unique). uniq merges equal adjacent lines (-c counts them): that is why it goes after sort.',
        how: [
          'sort file',
          'sort -rn',
          'sort -k2 -t, data.csv',
          '... | sort | uniq -c | sort -rn | head',
          'sort -u',
        ],
        when: 'The «top N» of anything: IPs, paths, errors, users. The most used pipeline in this course.',
        problems:
          'uniq without a sort first miscounts: it only merges repeated lines that are adjacent.',
      },
      example: 'You count which shell each account uses and the HTTP codes in the log.',
    },
    fr: {
      title: 'Compter et trier : sort et uniq',
      goal: 'Affiche les 3 IP qui font le plus de requêtes dans access.log, avec le nombre de requêtes de chacune (de la plus active à la moins active).',
      theory: {
        what: 'sort trie (-n comme des nombres, -r à l’envers, -h des tailles comme 2K et 1G, -k par colonne, -u sans doublons). uniq regroupe les lignes identiques qui se suivent (-c les compte) : c’est pour ça qu’il vient après sort.',
        how: [
          'sort fichier',
          'sort -rn',
          'sort -k2 -t, donnees.csv',
          '... | sort | uniq -c | sort -rn | head',
          'sort -u',
        ],
        when: 'Le « top N » de n’importe quoi : IP, chemins, erreurs, utilisateurs. C’est l’enchaînement de tubes le plus utilisé de ce cours.',
        problems:
          'uniq sans sort avant compte mal : il ne regroupe que les lignes répétées qui se suivent.',
      },
      example: 'Tu comptes quel shell utilise chaque compte et les codes HTTP du log.',
    },
    example: [
      'cut -d: -f7 /etc/passwd | sort | uniq -c',
      `cut -d' ' -f9 ${ACCESS} | sort | uniq -c | sort -rn`,
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
        what: "sed edita texto al vuelo: 's/viejo/nuevo/' cambia la primera vez de cada línea, con g todas. -i cambia el fichero. También borra (/patrón/d) o enseña rangos (-n '2,4p').",
        how: [
          "sed 's/ERROR/FALLO/' app.log",
          "sed -i 's/info/debug/' app.env",
          "sed -i.bak 's/80/8080/' nginx.conf   # con copia .bak",
          "sed -n '10,20p' fichero",
          "sed '/^#/d' config   # sin comentarios",
        ],
        when: 'Para cambiar configuraciones desde un guion o desde ssh, sin abrir un editor.',
        problems: 'sed f > f deja f vacío (la redirección lo vacía antes de leer): usa -i.',
      },
      example: 'Cambias palabras en la salida, enseñas un rango de líneas y quitas las de INFO.',
    },
    en: {
      title: 'Changing text: sed',
      goal: 'In ~/app.env, change LOG_LEVEL=info to LOG_LEVEL=debug (in the file itself).',
      theory: {
        what: "sed edits text on the fly: 's/old/new/' replaces the first match of each line, with g all of them. -i changes the file. It also deletes (/pattern/d) or prints ranges (-n '2,4p').",
        how: [
          "sed 's/ERROR/FAIL/' app.log",
          "sed -i 's/info/debug/' app.env",
          "sed -i.bak 's/80/8080/' nginx.conf   # with a .bak copy",
          "sed -n '10,20p' file",
          "sed '/^#/d' config   # without comments",
        ],
        when: 'To change configuration from a script or over ssh, without opening an editor.',
        problems: 'sed f > f leaves f empty (the redirection empties it before reading): use -i.',
      },
      example: 'You replace words in the output, print a range of lines and drop the INFO ones.',
    },
    fr: {
      title: 'Modifier du texte : sed',
      goal: 'Dans ~/app.env, remplace LOG_LEVEL=info par LOG_LEVEL=debug (dans le fichier lui-même).',
      theory: {
        what: "sed modifie du texte à la volée : 's/ancien/nouveau/' remplace la première occurrence de chaque ligne, avec g toutes. -i modifie le fichier. Il sait aussi supprimer (/motif/d) ou afficher des plages (-n '2,4p').",
        how: [
          "sed 's/ERROR/ECHEC/' app.log",
          "sed -i 's/info/debug/' app.env",
          "sed -i.bak 's/80/8080/' nginx.conf   # avec une copie .bak",
          "sed -n '10,20p' fichier",
          "sed '/^#/d' config   # sans les commentaires",
        ],
        when: 'Pour modifier une configuration depuis un script ou en ssh, sans ouvrir d’éditeur.',
        problems: 'sed f > f laisse f vide (la redirection le vide avant la lecture) : utilise -i.',
      },
      example:
        'Tu remplaces des mots dans la sortie, tu affiches une plage de lignes et tu enlèves celles en INFO.',
    },
    example: [
      `sed 's/ERROR/FALLO/' ${APP} | grep FALLO | head -n 2`,
      "sed -n '2,4p' /etc/passwd",
      `sed '/INFO/d' ${APP} | wc -l`,
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
        what: 'awk lee línea a línea y parte cada una en campos ($1, $2… $NF el último). Un patrón decide qué líneas, y entre llaves lo que se hace. END se ejecuta al final.',
        how: [
          "awk '{print $1}' access.log",
          "awk -F: '{print $1, $7}' /etc/passwd",
          "awk '$9 >= 500' access.log",
          "awk '{s += $10} END {print s}' access.log",
          "awk '{n[$1]++} END {for (ip in n) print n[ip], ip}'",
        ],
        when: 'Cuando hay que filtrar por el valor de una columna o hacer sumas y medias: más de lo que dan grep y cut.',
        problems: 'Entre comillas simples: con dobles, la shell se come los $1.',
      },
      example: 'Enseñas IP y código, filtras cuentas humanas por su uid y cuentas errores 5xx.',
    },
    en: {
      title: 'Columns with maths: awk',
      goal: 'Add up the bytes sent (column 10) of the responses with code 200 (column 9) in access.log. Show only the total.',
      theory: {
        what: 'awk reads line by line and splits each into fields ($1, $2… $NF the last one). A pattern selects lines and the braces say what to do. END runs at the end.',
        how: [
          "awk '{print $1}' access.log",
          "awk -F: '{print $1, $7}' /etc/passwd",
          "awk '$9 >= 500' access.log",
          "awk '{s += $10} END {print s}' access.log",
          "awk '{n[$1]++} END {for (ip in n) print n[ip], ip}'",
        ],
        when: 'When you filter on a column value or compute sums and averages: more than grep and cut give you.',
        problems: 'Use single quotes: with double quotes the shell eats the $1.',
      },
      example: 'You print IP and code, filter human accounts by uid and count 5xx errors.',
    },
    fr: {
      title: 'Des colonnes et des calculs : awk',
      goal: 'Additionne les octets envoyés (colonne 10) des réponses au code 200 (colonne 9) de access.log. Affiche seulement le total.',
      theory: {
        what: 'awk lit ligne par ligne et découpe chacune en champs ($1, $2… $NF pour le dernier). Un motif choisit les lignes, et ce qui est entre accolades dit quoi faire. END s’exécute à la fin.',
        how: [
          "awk '{print $1}' access.log",
          "awk -F: '{print $1, $7}' /etc/passwd",
          "awk '$9 >= 500' access.log",
          "awk '{s += $10} END {print s}' access.log",
          "awk '{n[$1]++} END {for (ip in n) print n[ip], ip}'",
        ],
        when: 'Quand il faut filtrer selon la valeur d’une colonne ou faire des sommes et des moyennes : plus que ce que permettent grep et cut.',
        problems:
          'Entre apostrophes : avec des guillemets doubles, le shell remplace les $1 avant awk.',
      },
      example:
        'Tu affiches l’IP et le code, tu filtres les comptes humains par leur uid et tu comptes les erreurs 5xx.',
    },
    example: [
      `awk '{print $1, $9}' ${ACCESS} | head -n 3`,
      "awk -F: '$3 >= 1000 {print $1}' /etc/passwd",
      `awk '$9 >= 500' ${ACCESS} | wc -l`,
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
        what: 'find recorre carpetas y enseña lo que cumple las condiciones: -name (con comodines entre comillas), -type f/d, -size +10M, -mtime +7 (más de 7 días), -user, -empty.',
        how: [
          "find . -name '*.txt'",
          'find /etc -type d -name nginx',
          "find /var/log -name '*.log' -size +100M",
          'find /tmp -mtime +7',
          'find ~ -empty',
        ],
        when: 'Cuando no sabes dónde está algo o quieres todo lo que cumple algo (viejo, grande, de alguien).',
        problems:
          'Sin comillas, *.log lo expande la shell antes de que llegue a find y la búsqueda sale mal.',
      },
      example: 'Buscas tus .txt, la carpeta de nginx y lo tocado en la última hora.',
    },
    en: {
      title: 'Finding files: find',
      goal: 'Show the .log files under /var/log (subdirectories included) bigger than 2 KB.',
      theory: {
        what: 'find walks directories and prints what matches: -name (wildcards in quotes), -type f/d, -size +10M, -mtime +7 (older than 7 days), -user, -empty.',
        how: [
          "find . -name '*.txt'",
          'find /etc -type d -name nginx',
          "find /var/log -name '*.log' -size +100M",
          'find /tmp -mtime +7',
          'find ~ -empty',
        ],
        when: 'When you do not know where something is or want everything matching a rule (old, big, someone’s).',
        problems:
          'Without quotes, *.log is expanded by the shell before find sees it and the search goes wrong.',
      },
      example: 'You find your .txt files, the nginx directory and what changed in the last hour.',
    },
    fr: {
      title: 'Chercher des fichiers : find',
      goal: 'Affiche les fichiers .log de /var/log (sous-dossiers compris) qui font plus de 2 Ko.',
      theory: {
        what: 'find parcourt des dossiers et affiche ce qui remplit les conditions : -name (jokers entre apostrophes), -type f/d, -size +10M, -mtime +7 (plus de 7 jours), -user, -empty.',
        how: [
          "find . -name '*.txt'",
          'find /etc -type d -name nginx',
          "find /var/log -name '*.log' -size +100M",
          'find /tmp -mtime +7',
          'find ~ -empty',
        ],
        when: 'Quand tu ne sais pas où se trouve quelque chose ou que tu veux tout ce qui remplit un critère (ancien, volumineux, appartenant à quelqu’un).',
        problems:
          'Sans apostrophes, *.log est développé par le shell avant d’arriver à find, et la recherche se passe mal.',
      },
      example:
        'Tu cherches tes .txt, le dossier de nginx et ce qui a été modifié dans la dernière heure.',
    },
    example: ["find ~ -name '*.txt'", 'find /etc -type d -name nginx', 'find /var/log -mmin -60'],
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
        what: 'find puede actuar sobre lo que encuentra: -delete lo borra, -exec orden {} \\; ejecuta una orden por cada uno. xargs convierte líneas de la entrada en argumentos de otra orden.',
        how: [
          'find ~/cache -mtime +7 -delete',
          "find . -name '*.tmp' -exec rm {} \\;",
          "find . -name '*.log' -exec gzip {} +",
          "find . -name '*.tmp' | xargs rm",
          'ls *.log | xargs wc -l',
        ],
        when: 'Limpiezas periódicas: temporales viejos, registros antiguos, copias caducadas.',
        problems: 'Prueba primero sin -delete (solo find) para ver qué se llevaría por delante.',
      },
      example: 'Ves qué tiene más de 7 días, lo listas con -exec y cuentas bytes con xargs.',
    },
    en: {
      title: 'Acting on what you find: -exec, -delete and xargs',
      goal: 'Delete the .tmp files in ~/cache older than 7 days. The new ones and the .dat stay.',
      theory: {
        what: 'find can act on what it finds: -delete deletes it, -exec cmd {} \\; runs a command for each one. xargs turns input lines into arguments of another command.',
        how: [
          'find ~/cache -mtime +7 -delete',
          "find . -name '*.tmp' -exec rm {} \\;",
          "find . -name '*.log' -exec gzip {} +",
          "find . -name '*.tmp' | xargs rm",
          'ls *.log | xargs wc -l',
        ],
        when: 'Periodic cleanups: old temporary files, old logs, expired backups.',
        problems: 'Run it first without -delete (just find) to see what would go.',
      },
      example: 'You see what is older than 7 days, list it with -exec and count bytes with xargs.',
    },
    fr: {
      title: 'Agir sur ce qu’on trouve : -exec, -delete et xargs',
      goal: 'Supprime les .tmp de ~/cache qui ont plus de 7 jours. Les récents et les .dat restent.',
      theory: {
        what: 'find peut agir sur ce qu’il trouve : -delete le supprime, -exec commande {} \\; lance une commande pour chaque résultat. xargs transforme les lignes de l’entrée en arguments d’une autre commande.',
        how: [
          'find ~/cache -mtime +7 -delete',
          "find . -name '*.tmp' -exec rm {} \\;",
          "find . -name '*.log' -exec gzip {} +",
          "find . -name '*.tmp' | xargs rm",
          'ls *.log | xargs wc -l',
        ],
        when: 'Les nettoyages réguliers : vieux fichiers temporaires, anciens logs, sauvegardes périmées.',
        problems: 'Lance-le d’abord sans -delete (find tout seul) pour voir ce qui partirait.',
      },
      example:
        'Tu vois ce qui a plus de 7 jours, tu le listes avec -exec et tu comptes les octets avec xargs.',
    },
    example: [
      'find ~/cache -mtime +7',
      "find ~/cache -name '*.tmp' -exec ls -l {} \\;",
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
        what: 'tar junta muchos ficheros en uno (-c crear, -x sacar, -t listar, -z comprimido con gzip, -f el nombre, -C dónde). gzip comprime un fichero suelto (.gz).',
        how: [
          'tar -czf copia.tar.gz carpeta/',
          'tar -tzf copia.tar.gz',
          'tar -xzf copia.tar.gz -C /tmp/restaurar',
          'gzip -k registro.log      # -k: guarda el original',
          'zcat registro.log.gz | tail',
        ],
        when: 'Copias de seguridad, mover una carpeta a otra máquina, guardar registros rotados.',
        problems:
          'El orden importa: -f va justo antes del nombre del fichero (tar -czf nombre, no tar -cfz).',
      },
      example:
        'Empaquetas tus notas, miras qué lleva, lo sacas en otra carpeta y comprimes un fichero suelto.',
    },
    en: {
      title: 'Archiving: tar and gzip',
      goal: 'Save the nginx configuration (all of /etc/nginx) in ~/backups/nginx-conf.tar.gz.',
      theory: {
        what: 'tar bundles many files into one (-c create, -x extract, -t list, -z gzip-compressed, -f the name, -C where). gzip compresses a single file (.gz).',
        how: [
          'tar -czf backup.tar.gz dir/',
          'tar -tzf backup.tar.gz',
          'tar -xzf backup.tar.gz -C /tmp/restore',
          'gzip -k app.log      # -k: keep the original',
          'zcat app.log.gz | tail',
        ],
        when: 'Backups, moving a directory to another machine, keeping rotated logs.',
        problems:
          'Order matters: -f goes right before the file name (tar -czf name, not tar -cfz).',
      },
      example:
        'You archive your notes, list what is inside, extract it elsewhere and compress a single file.',
    },
    fr: {
      title: 'Archiver : tar et gzip',
      goal: 'Sauvegarde la configuration de nginx (tout /etc/nginx) dans ~/backups/nginx-conf.tar.gz.',
      theory: {
        what: 'tar regroupe beaucoup de fichiers en un seul (-c créer, -x extraire, -t lister, -z compressé avec gzip, -f le nom, -C où). gzip compresse un fichier seul (.gz).',
        how: [
          'tar -czf copie.tar.gz dossier/',
          'tar -tzf copie.tar.gz',
          'tar -xzf copie.tar.gz -C /tmp/restauration',
          'gzip -k app.log      # -k : garde l’original',
          'zcat app.log.gz | tail',
        ],
        when: 'Les sauvegardes, le transfert d’un dossier vers une autre machine, l’archivage des logs après rotation.',
        problems:
          'L’ordre compte : -f va juste avant le nom du fichier (tar -czf nom, pas tar -cfz).',
      },
      example:
        'Tu archives tes notes, tu regardes ce que contient l’archive, tu l’extrais ailleurs et tu compresses un fichier seul.',
    },
    example: [
      'tar -czf notas.tar.gz notas.txt proyectos',
      'tar -tzf notas.tar.gz',
      'mkdir restaurado && tar -xzf notas.tar.gz -C restaurado',
      'gzip -k notas.txt',
      'ls -l notas.txt*',
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
        what: 'df -h dice cuánto queda en cada disco; du -sh cuánto ocupa una carpeta. Con sort -h se ordenan tamaños como 5M y 3G.',
        how: [
          'df -h',
          'du -sh /var/log',
          'du -sh /srv/datos/* | sort -h',
          'du -h -d 1 / 2>/dev/null | sort -h | tail',
        ],
        when: 'Cuando salta la alarma de disco: primero df (qué disco), luego du (qué carpeta) hasta dar con el culpable.',
        problems: 'du sobre carpetas sin permiso da errores: 2>/dev/null los esconde (o sudo).',
      },
      example: 'Miras el disco, lo que ocupan los registros y las carpetas de /var/log ordenadas.',
    },
    en: {
      title: 'Disk space: df and du',
      goal: 'Which subdirectory of /srv/datos takes the most space? Write only its name into ~/mayor.txt.',
      theory: {
        what: 'df -h tells how much is left on each disk; du -sh how much a directory takes. sort -h sorts sizes like 5M and 3G.',
        how: [
          'df -h',
          'du -sh /var/log',
          'du -sh /srv/datos/* | sort -h',
          'du -h -d 1 / 2>/dev/null | sort -h | tail',
        ],
        when: 'When the disk alarm goes off: df first (which disk), then du (which directory) until you find the culprit.',
        problems:
          'du on directories without permission prints errors: 2>/dev/null hides them (or sudo).',
      },
      example: 'You check the disk, how much the logs take and the /var/log directories sorted.',
    },
    fr: {
      title: 'Espace disque : df et du',
      goal: 'Quel sous-dossier de /srv/datos prend le plus de place ? Écris seulement son nom dans ~/mayor.txt.',
      theory: {
        what: 'df -h dit combien il reste sur chaque disque ; du -sh combien prend un dossier. Avec sort -h, on trie des tailles comme 5M et 3G.',
        how: [
          'df -h',
          'du -sh /var/log',
          'du -sh /srv/datos/* | sort -h',
          'du -h -d 1 / 2>/dev/null | sort -h | tail',
        ],
        when: 'Quand l’alerte disque se déclenche : d’abord df (quel disque), puis du (quel dossier) jusqu’à trouver le coupable.',
        problems:
          'du sur des dossiers sans permission affiche des erreurs : 2>/dev/null les cache (ou sudo).',
      },
      example: 'Tu regardes le disque, ce que prennent les logs et les dossiers de /var/log triés.',
    },
    example: ['df -h', 'du -sh /var/log', 'du -h -d 1 /var/log | sort -h'],
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
        'Vacía /var/log/peer4u/debug.log sin borrarlo: la API lo tiene abierto.',
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
        'Empty /var/log/peer4u/debug.log without deleting it: the API has it open.',
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
        'Vide /var/log/peer4u/debug.log sans le supprimer : l’API le garde ouvert.',
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
        what: 'Cada programa en marcha es un proceso con su PID. ps aux los lista todos (usuario, PID, %CPU, %MEM, orden); top los ordena por CPU; pgrep da el PID por el nombre.',
        how: [
          'ps aux',
          'ps aux --sort=-%cpu | head',
          'ps -eo pid,user,%cpu,cmd --sort=-%cpu',
          'pgrep -a nginx',
          'pgrep -f miner.py    # -f: en toda la orden',
          'top',
        ],
        when: 'Cuando la máquina va lenta: quién gasta CPU o memoria, y de quién es.',
        problems:
          'ps aux | grep algo también encuentra el propio grep: pgrep no tiene ese problema.',
      },
      example: 'Miras tus procesos, los cinco primeros de todos y los que más CPU gastan.',
    },
    en: {
      title: 'Seeing processes: ps, top and pgrep',
      goal: 'Something is eating web1’s CPU. Write into ~/pid.txt the PID (just the number) of the process using the most CPU.',
      theory: {
        what: 'Every running program is a process with a PID. ps aux lists them all (user, PID, %CPU, %MEM, command); top sorts them by CPU; pgrep gives the PID by name.',
        how: [
          'ps aux',
          'ps aux --sort=-%cpu | head',
          'ps -eo pid,user,%cpu,cmd --sort=-%cpu',
          'pgrep -a nginx',
          'pgrep -f miner.py    # -f: whole command line',
          'top',
        ],
        when: 'When the machine is slow: who uses CPU or memory, and whose it is.',
        problems:
          'ps aux | grep something also finds the grep itself: pgrep does not have that problem.',
      },
      example: 'You look at your processes, the first five of all and the top CPU users.',
    },
    fr: {
      title: 'Voir les processus : ps, top et pgrep',
      goal: 'Quelque chose dévore le CPU de web1. Écris dans ~/pid.txt le PID (seulement le nombre) du processus qui consomme le plus de CPU.',
      theory: {
        what: 'Chaque programme lancé est un processus avec son PID. ps aux les liste tous (utilisateur, PID, %CPU, %MEM, commande) ; top les trie par CPU ; pgrep donne le PID à partir du nom.',
        how: [
          'ps aux',
          'ps aux --sort=-%cpu | head',
          'ps -eo pid,user,%cpu,cmd --sort=-%cpu',
          'pgrep -a nginx',
          'pgrep -f miner.py    # -f : dans toute la ligne de commande',
          'top',
        ],
        when: 'Quand la machine rame : qui consomme du CPU ou de la mémoire, et à qui ça appartient.',
        problems: 'ps aux | grep truc trouve aussi le grep lui-même : pgrep n’a pas ce problème.',
      },
      example:
        'Tu regardes tes processus, les cinq premiers de tous et ceux qui consomment le plus de CPU.',
    },
    example: ['ps', 'ps aux | head -n 5', 'ps -eo pid,user,%cpu,cmd --sort=-%cpu | head -n 4'],
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
        what: 'kill manda una señal a un PID: TERM (15, la de por defecto) pide que acabe; KILL (9) lo mata sin preguntar; HUP (1) suele recargar la configuración. pkill y killall lo hacen por nombre.',
        how: [
          'kill 1234',
          'kill -9 1234',
          'kill -HUP 1234',
          'pkill yes',
          'pkill -f miner.py',
          'kill -l',
        ],
        when: 'Con un proceso colgado o desbocado. Primero TERM (deja que guarde y cierre); KILL solo si no responde.',
        whenNot:
          'Matar el proceso de un servicio no lo arregla: systemd puede volver a arrancarlo (eso, en el nivel avanzado).',
        problems: 'Solo puedes señalar tus procesos; los de otros, con sudo.',
      },
      example: 'Lanzas un sleep en segundo plano, lo encuentras y lo paras.',
    },
    en: {
      title: 'Stopping processes: kill and signals',
      goal: 'Stop both yes processes and miner.py. Careful: miner.py ignores the normal signal.',
      theory: {
        what: 'kill sends a signal to a PID: TERM (15, the default) asks it to finish; KILL (9) kills it without asking; HUP (1) usually reloads configuration. pkill and killall do it by name.',
        how: [
          'kill 1234',
          'kill -9 1234',
          'kill -HUP 1234',
          'pkill yes',
          'pkill -f miner.py',
          'kill -l',
        ],
        when: 'With a hung or runaway process. TERM first (let it save and close); KILL only if it does not respond.',
        whenNot:
          'Killing a service’s process does not fix it: systemd may restart it (that is for the advanced level).',
        problems: 'You can only signal your own processes; other people’s, with sudo.',
      },
      example: 'You start a sleep in the background, find it and stop it.',
    },
    fr: {
      title: 'Arrêter des processus : kill et signaux',
      goal: 'Arrête les deux processus yes et miner.py. Attention : miner.py ignore le signal normal.',
      theory: {
        what: 'kill envoie un signal à un PID : TERM (15, celui par défaut) lui demande de se terminer ; KILL (9) le tue sans discuter ; HUP (1) recharge en général la configuration. pkill et killall font la même chose par nom.',
        how: [
          'kill 1234',
          'kill -9 1234',
          'kill -HUP 1234',
          'pkill yes',
          'pkill -f miner.py',
          'kill -l',
        ],
        when: 'Avec un processus bloqué ou qui s’emballe. D’abord TERM (il a le temps d’enregistrer et de fermer) ; KILL seulement s’il ne répond pas.',
        whenNot:
          'Tuer le processus d’un service ne le répare pas : systemd peut le relancer (on verra ça au niveau avancé).',
        problems:
          'Tu ne peux envoyer de signal qu’à tes propres processus ; pour ceux des autres, il faut sudo.',
      },
      example: 'Tu lances un sleep en arrière-plan, tu le retrouves et tu l’arrêtes.',
    },
    example: ['sleep 600 &', 'pgrep -a sleep', 'pkill sleep', 'pgrep -a sleep'],
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
        what: 'Una variable guarda un texto ($NOMBRE lo usa). Con export pasa a los programas que lances. PATH es la lista de carpetas donde la shell busca las órdenes.',
        how: [
          'NOMBRE=peer          # sin espacios alrededor del =',
          'echo "hola, $NOMBRE"',
          'export ENTORNO=prod',
          'export PATH="$PATH:$HOME/bin"',
          'which ls',
          'env | sort',
        ],
        when: 'Configurar programas (DATABASE_URL, NODE_ENV) y tener tus guiones a mano sin escribir la ruta.',
        problems:
          'NOMBRE = peer (con espacios) es ejecutar la orden NOMBRE. Y lo de export solo dura en esta sesión: para siempre, en ~/.bashrc.',
      },
      example: 'Ves tus variables, una sin exportar y otra exportada en una shell hija.',
    },
    en: {
      title: 'Variables, export and PATH',
      goal: 'Export ENTORNO=staging, add ~/bin to PATH and run hola by name (no path).',
      theory: {
        what: 'A variable holds text ($NAME uses it). With export it is passed to the programs you start. PATH is the list of directories where the shell looks for commands.',
        how: [
          'NAME=peer            # no spaces around =',
          'echo "hello, $NAME"',
          'export ENTORNO=prod',
          'export PATH="$PATH:$HOME/bin"',
          'which ls',
          'env | sort',
        ],
        when: 'Configuring programs (DATABASE_URL, NODE_ENV) and having your scripts at hand without typing the path.',
        problems:
          'NAME = peer (with spaces) runs a command called NAME. And export only lasts for this session: put it in ~/.bashrc to keep it.',
      },
      example: 'You look at your variables, one not exported and one exported in a child shell.',
    },
    fr: {
      title: 'Variables, export et PATH',
      goal: 'Exporte ENTORNO=staging, ajoute ~/bin au PATH et lance le programme hola par son nom (sans chemin).',
      theory: {
        what: 'Une variable contient un texte ($NOM l’utilise). Avec export, elle est transmise aux programmes que tu lances. PATH est la liste des dossiers où le shell cherche les commandes.',
        how: [
          'NOM=peer            # pas d’espace autour du =',
          'echo "salut, $NOM"',
          'export ENTORNO=prod',
          'export PATH="$PATH:$HOME/bin"',
          'which ls',
          'env | sort',
        ],
        when: 'Pour configurer des programmes (DATABASE_URL, NODE_ENV) et avoir tes scripts sous la main sans taper leur chemin.',
        problems:
          'NOM = peer (avec des espaces) lance une commande appelée NOM. Et export ne dure que pour cette session : pour le garder, mets-le dans ~/.bashrc.',
      },
      example: 'Tu regardes tes variables, une non exportée et une exportée, dans un shell enfant.',
    },
    example: [
      'echo $HOME $USER',
      'echo $PATH',
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
        what: 'Cada orden acaba con un código: 0 es que fue bien; otro número, que falló. $? guarda el último. a && b ejecuta b solo si a fue bien; a || b, solo si falló. test (o [ ]) comprueba cosas: -f fichero, -d carpeta.',
        how: [
          'ls /nada; echo $?',
          'mkdir -p /tmp/x && echo creada',
          'cat /nada || echo "no está"',
          'test -f /etc/hosts && echo hay',
          '[ -d /srv ] && echo carpeta',
        ],
        when: 'Para encadenar pasos que dependen de los anteriores (compilar && desplegar) y en todos los guiones.',
        problems: 'a && b || c no es un if: si b falla, también se ejecuta c.',
      },
      example:
        'Ves el código de una orden que va bien y de una que falla, y encadenas con && y ||.',
    },
    en: {
      title: 'Exit codes: $?, && and ||',
      goal: 'With && and ||: create ~/listo.txt (empty) only if /etc/peer4u/app.env exists, and ~/fallo.txt (empty) only if /etc/peer4u/old.env does NOT exist.',
      theory: {
        what: 'Every command ends with a code: 0 means success; any other number, failure. $? holds the last one. a && b runs b only if a succeeded; a || b, only if it failed. test (or [ ]) checks things: -f file, -d dir.',
        how: [
          'ls /nothing; echo $?',
          'mkdir -p /tmp/x && echo created',
          'cat /nothing || echo "not there"',
          'test -f /etc/hosts && echo yes',
          '[ -d /srv ] && echo dir',
        ],
        when: 'To chain steps that depend on earlier ones (build && deploy) and in every script.',
        problems: 'a && b || c is not an if: if b fails, c runs too.',
      },
      example:
        'You see the code of a command that works and of one that fails, and chain with && and ||.',
    },
    fr: {
      title: 'Codes de sortie : $?, && et ||',
      goal: 'Avec && et || : crée ~/listo.txt (vide) seulement si /etc/peer4u/app.env existe, et ~/fallo.txt (vide) seulement si /etc/peer4u/old.env n’existe PAS.',
      theory: {
        what: 'Chaque commande se termine avec un code : 0 veut dire que tout s’est bien passé ; un autre nombre, qu’elle a échoué. $? garde le dernier. a && b lance b seulement si a a réussi ; a || b, seulement s’il a échoué. test (ou [ ]) vérifie des choses : -f fichier, -d dossier.',
        how: [
          'ls /rien; echo $?',
          'mkdir -p /tmp/x && echo cree',
          'cat /rien || echo "absent"',
          'test -f /etc/hosts && echo oui',
          '[ -d /srv ] && echo dossier',
        ],
        when: 'Pour enchaîner des étapes qui dépendent des précédentes (compiler && déployer), et dans tous les scripts.',
        problems: 'a && b || c n’est pas un if : si b échoue, c s’exécute aussi.',
      },
      example:
        'Tu vois le code d’une commande qui réussit et d’une qui échoue, et tu enchaînes avec && et ||.',
    },
    example: [
      'ls /etc/hostname; echo "código: $?"',
      'ls /nada; echo "código: $?"',
      'cat /nada || echo "no está"',
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
