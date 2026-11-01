/** Repaso de Not-games: la piscina, Shell 00 y Shell 01. */

import type { ReviewEntry } from './types.js'

export const REVIEW_PISCINE_SHELL: Record<string, ReviewEntry> = {
  'pis-sh00-cat-e': {
    title: 'cat -e y el fin de línea',
    definition:
      'cat -e enseña lo que no se ve: pone un $ donde acaba cada línea (donde está el \\n) y escribe con ^ los caracteres de control. Sirve para saber si un fichero lleva salto de línea al final.',
    example: 'echo Z > z; cat -e z imprime Z$ (y z ocupa 2 bytes).',
  },
  'pis-sh00-echo-n': {
    title: 'echo y echo -n',
    definition:
      'echo escribe sus argumentos seguidos de un salto de línea. Con -n no pone ese salto final. Con > la salida va a un fichero, que se crea o se vacía.',
    example: 'echo Z > z deja «Z\\n» (2 bytes); echo -n Z > z deja solo «Z» (1 byte).',
  },
  'pis-sh00-tar': {
    title: 'Archivos con tar',
    definition:
      'tar junta ficheros en un solo archivo y conserva sus permisos y fechas. La primera letra dice qué hacer: c (crear), x (extraer) o t (listar); f va seguida del nombre del .tar.',
    example:
      'tar -cf exo.tar ex00 ex01 crea el archivo; tar -tf exo.tar lo lista; tar -xf exo.tar lo saca.',
  },
  'pis-sh00-touch-t': {
    title: 'Cambiar la fecha con touch -t',
    definition:
      'touch crea el fichero si no existe y, si existe, le cambia la fecha. Con -t le das tú la fecha, con el formato [[CC]YY]MMDDhhmm[.ss]: el año es opcional y van primero el mes y el día.',
    example: 'touch -t 202106012342 f deja f con fecha del 1 de junio de 2021 a las 23:42.',
  },
  'pis-sh00-ls-l-line': {
    title: 'Leer una línea de ls -l',
    definition:
      'Cada línea de ls -l trae, en orden: el tipo (- fichero, d carpeta, l enlace) y los permisos de dueño, grupo y otros; el número de enlaces duros; el dueño; el grupo; el tamaño en bytes; la fecha de modificación y el nombre.',
    example: '-r--r-xr-x 1 ana staff 40 Jun 1 23:42 testShell00: permisos 455, 1 enlace, 40 bytes.',
  },
  'pis-sh00-ls-type': {
    title: 'El tipo en ls -l',
    definition:
      'El primer carácter de cada línea de ls -l dice qué es la entrada: - un fichero normal, d una carpeta, l un enlace simbólico (y c o b, dispositivos). Un enlace duro no se distingue: sale como fichero.',
    example: 'drwxr-xr-x es una carpeta; lrwxr-xr-x test6 -> test0, un enlace simbólico.',
  },
  'pis-sh00-octal': {
    title: 'Permisos en octal',
    definition:
      'chmod en octal lleva tres cifras: dueño, grupo y otros. Cada una suma 4 (leer), 2 (escribir) y 1 (ejecutar), de 0 a 7.',
    example: 'chmod 640 f da rw-r-----; chmod 711 f da rwx--x--x; rwxr-x--- es 750.',
  },
  'pis-sh00-chmod-sym': {
    title: 'chmod simbólico',
    definition:
      'En lugar de dar los nueve permisos en octal, se cambian solo algunos: a quién (u dueño, g grupo, o otros, a todos), + o - y qué (r, w, x). Lo que no se nombra se queda como estaba.',
    example:
      'chmod u+x script.sh deja rw-r--r-- en rwxr--r--; chmod go-w f quita la w a grupo y otros.',
  },
  'pis-sh00-umask': {
    title: 'La umask',
    definition:
      'La umask dice qué permisos NO tendrá lo que crees. Un fichero nuevo parte de 666 y una carpeta de 777; se les quitan los bits que marca la umask.',
    example: 'Con umask 022: touch f da 644 (rw-r--r--) y mkdir d da 755 (rwxr-xr-x).',
  },
  'pis-sh00-dir-x': {
    title: 'Permisos de una carpeta',
    definition:
      'En una carpeta los permisos no significan lo mismo que en un fichero: r es ver los nombres que contiene, w es crear, renombrar y borrar dentro, y x es poder entrar con cd y acceder a sus ficheros.',
    example: 'Con chmod 644 dir, ls dir enseña los nombres, pero cd dir da «Permission denied».',
  },
  'pis-sh00-ln-hard': {
    title: 'Enlaces duros',
    definition:
      'ln a b da al fichero a un segundo nombre, b, que apunta al mismo inodo (los mismos datos). ls -l enseña cuántos nombres tiene; si borras uno, el otro sigue con el contenido.',
    example: 'ln test3 test5; ls -l test3 marca 2 enlaces; rm test3 y test5 se sigue leyendo.',
  },
  'pis-sh00-ln-sym': {
    title: 'Enlaces simbólicos',
    definition:
      'Un enlace simbólico es un fichero pequeño que guarda una ruta a otro. Se crea con ln -s destino nombre (primero a dónde apunta). Si se borra el destino, el enlace queda roto.',
    example: 'ln -s test0 test6; ls -l enseña lrwxr-xr-x ... 5 ... test6 -> test0.',
  },
  'pis-sh00-dir-links': {
    title: 'Enlaces de una carpeta',
    definition:
      'El número de enlaces de una carpeta cuenta los nombres que llevan a ella: el suyo en la carpeta de arriba, su propio «.» y el «..» de cada subcarpeta.',
    example: 'mkdir d da 2 enlaces; tras mkdir d/a d/b, ls -ld d marca 4.',
  },
  'pis-sh00-ssh-keygen': {
    title: 'Claves SSH',
    definition:
      'ssh-keygen genera dos claves que van juntas: la privada (id_rsa), que es tu secreto, y la pública (id_rsa.pub), que se pone en los servidores o en la intra para que te reconozcan.',
    example: 'ssh-keygen deja ~/.ssh/id_rsa y ~/.ssh/id_rsa.pub; en la intra se pega el .pub.',
  },
  'pis-sh00-ssh-auth': {
    title: 'Entrar con una clave SSH',
    definition:
      'Para entrar sin contraseña, tu clave pública se añade a ~/.ssh/authorized_keys del servidor (ssh-copy-id lo hace por ti). Al conectar, demuestras que tienes la privada sin enviarla: por eso nunca se comparte.',
    example: 'ssh-copy-id ana@host y luego ssh ana@host entra sin pedir la contraseña.',
  },
  'pis-sh00-ls-opts': {
    title: 'Opciones de ls',
    definition:
      'ls cambia de formato y de orden con sus opciones: -m pone comas entre los nombres, -p añade / a las carpetas, -t ordena por fecha de modificación, -S por tamaño y -r le da la vuelta al orden.',
    example: 'ls -mp da algo como «ex00/, ex01/, notas.txt».',
  },
  'pis-sh00-midls': {
    title: 'midLS y ficheros ocultos',
    definition:
      'Las opciones de ls se juntan: ls -mtp separa con comas, ordena por fecha y marca las carpetas. Un fichero cuyo nombre empieza por punto está oculto: ls no lo enseña salvo con -a o -A.',
    example: 'ls no enseña .gitignore; ls -A sí, y ls -a enseña además . y ..',
  },
  'pis-sh00-ls-r': {
    title: 'ls -R y ls -r',
    definition:
      'Las opciones distinguen mayúsculas: ls -R lista la carpeta y, debajo, cada subcarpeta, una tras otra; ls -r lista lo mismo que ls pero en orden inverso.',
    example:
      'ls -R enseña «./ex00:», su contenido, y así cada carpeta; ls -tr deja lo más reciente al final.',
  },
  'pis-sh00-git-log': {
    title: 'git log con formato',
    definition:
      'git log enseña la historia. Con -n (o -5) se queda con los últimos commits, y con --format (o --pretty=format:) decides qué sale de cada uno: %H hash completo, %h abreviado, %an autor, %s mensaje.',
    example: 'git log -5 --format=%H imprime 5 líneas de 40 caracteres, la más reciente arriba.',
  },
  'pis-sh00-gitignore': {
    title: 'El .gitignore',
    definition:
      'El .gitignore lista patrones de ficheros que git no debe proponer para añadir (objetos, binarios, .DS_Store…). No borra nada ni deja de seguir lo que ya está en el repositorio.',
    example:
      'Con *.o en el .gitignore, git status deja de enseñar main.o; git status --ignored sí lo enseña.',
  },
  'pis-sh00-diff-patch': {
    title: 'diff y patch',
    definition:
      'diff compara dos ficheros línea a línea y escribe las diferencias: con < las de el primero y con > las del segundo. Esa salida es un parche: patch la lee y transforma el primero en el segundo.',
    example: 'diff a b > sw.diff; patch a sw.diff; ahora diff a b no imprime nada.',
  },
  'pis-sh00-find-clean': {
    title: 'Limpiar con find',
    definition:
      'find busca desde una carpeta hacia abajo y aplica pruebas: -type f (ficheros), -name con un patrón entre comillas para que no lo expanda la shell, -o para «una u otra». Al final, -delete o -exec rm {} \\; actúan sobre cada resultado.',
    example: "find . -type f \\( -name '*~' -o -name '#*#' \\) -print -delete",
  },
  'pis-sh00-find-exec': {
    title: 'find -exec',
    definition:
      'Con -exec, find ejecuta una orden por cada resultado: {} se sustituye por la ruta encontrada y \\; marca el final de la orden (la barra evita que la shell interprete el punto y coma).',
    example: "find . -name '*~' -exec rm {} \\; ejecuta rm ./a~, luego rm ./ex00/b~…",
  },
  'pis-sh00-file-magic': {
    title: 'file y los ficheros mágicos',
    definition:
      'Muchos formatos empiezan por unos bytes fijos, el número mágico (un PNG, por ejemplo). file los busca con una base de firmas; un fichero mágico tuyo describe una firma nueva y se le pasa con file -m.',
    example: 'Un PNG empieza por \\x89PNG: file foto.dat dice «PNG image» aunque se llame .dat.',
  },
  'pis-sh00-paths': {
    title: 'Rutas absolutas y relativas',
    definition:
      'Una ruta absoluta empieza en la raíz, /, y vale estés donde estés. Una relativa parte de la carpeta actual: . es ella misma, .. la de arriba. ~ se cambia por tu carpeta personal ($HOME).',
    example:
      'Desde /home/ana/piscine, ../ex00 es /home/ana/ex00 y ~/ex00 también, si HOME es /home/ana.',
  },
  'pis-sh00-mkdir-rm': {
    title: 'mkdir -p y rm -r',
    definition:
      'mkdir crea una carpeta; con -p crea también las que falten por el camino y no se queja si ya existe. rm borra ficheros; con -r entra en las carpetas y lo borra todo, sin papelera.',
    example: 'mkdir -p ex00/test crea las dos; rm -r ex00 las borra con lo que haya dentro.',
  },
  'pis-sh00-cp-mv': {
    title: 'cp y mv',
    definition:
      'mv mueve o renombra; cp copia. Si el último argumento es una carpeta que existe, lo anterior va dentro de ella. cp no copia carpetas sin -r (recursivo).',
    example: 'mv z ex00 deja ex00/z; cp -r ex00 copia hace una copia completa de ex00.',
  },
  'pis-sh00-man': {
    title: 'man y pwd',
    definition:
      'man orden abre su manual; las páginas van por secciones (1 órdenes, 2 llamadas al sistema, 3 biblioteca de C) y man 2 write elige una. pwd escribe la ruta absoluta de donde estás.',
    example: 'man 2 write enseña la llamada write de C, no la orden write de la sección 1.',
  },
  'pis-sh01-groups': {
    title: 'print_groups: id y tr',
    definition:
      "id -G da los números de los grupos de un usuario, y con -n sus nombres (-g sería solo el principal). tr cambia unos caracteres por otros: tr ' ' ',' pone comas donde había espacios y tr -d '\\n' borra los saltos de línea.",
    example: "id -Gn $FT_USER | tr ' ' ',' | tr -d '\\n' da «staff,piscine,student».",
  },
  'pis-sh01-env': {
    title: 'Variables de entorno',
    definition:
      'NOMBRE=valor crea una variable de la shell; export la pasa al entorno, que reciben los programas y scripts que lances. Se lee con $NOMBRE (mayúsculas y minúsculas cuentan) y env las lista todas.',
    example: 'export FT_USER=nours; ./print_groups.sh ya puede leer $FT_USER.',
  },
  'pis-sh01-shebang': {
    title: 'Lanzar un script',
    definition:
      'Un script empieza con el shebang (#!/bin/sh), que dice qué intérprete lo lee. Para lanzarlo como un programa necesita permiso de ejecución (chmod +x) y una ruta (./script.sh), porque la shell solo busca a secas en las carpetas del PATH.',
    example: 'chmod +x find_sh.sh; ./find_sh.sh. Sin el ./ sale «command not found».',
  },
  'pis-sh01-args': {
    title: 'Argumentos de un script',
    definition:
      'Lo que escribes detrás del nombre del script llega como $1, $2, $3…; $0 es el propio nombre, $# cuenta los argumentos (sin $0) y "$@" los da todos, cada uno como una palabra.',
    example: './s.sh a b c: $0 es ./s.sh, $1 es a, $# es 3.',
  },
  'pis-sh01-find-sh': {
    title: 'find_sh: buscar y recortar',
    definition:
      "find . -name '*.sh' lista los .sh de aquí y de todas las subcarpetas (las comillas evitan que la shell expanda el *). Para quitar la extensión, sed 's/\\.sh$//': el punto escapado y el $ para que sea solo al final.",
    example:
      "find . -name '*.sh' | sed 's/\\.sh$//' convierte ./ex02/find_sh.sh en ./ex02/find_sh.",
  },
  'pis-sh01-basename': {
    title: 'basename y dirname',
    definition:
      'basename ruta da el nombre del fichero sin las carpetas, y basename ruta sufijo además le quita ese final. dirname ruta da la carpeta que lo contiene. No miran el disco: solo trabajan con el texto.',
    example: 'basename a/b/c.sh .sh da c; dirname a/b/c.sh da a/b.',
  },
  'pis-sh01-count-files': {
    title: 'count_files: contar con find',
    definition:
      'find . escribe una línea por cada fichero y carpeta que encuentra, incluida la carpeta de partida «.». Pasado a wc -l, da cuántos hay contándola a ella; con -type f o -type d se cuentan solo ficheros o solo carpetas.',
    example: 'Con a, b y d/c: find . saca ., ./a, ./b, ./d y ./d/c, y wc -l da 5.',
  },
  'pis-sh01-wc': {
    title: 'Contar con wc',
    definition:
      'wc cuenta lo que le llega: -l líneas (saltos de línea), -w palabras (trozos separados por espacios) y -c bytes. El salto de línea que pone echo cuenta como byte.',
    example: 'echo hola | wc -c da 5 (4 letras y el \\n); echo -n hola | wc -c da 4.',
  },
  'pis-sh01-mac': {
    title: 'MAC.sh: direcciones MAC',
    definition:
      'Una dirección MAC es el identificador de una tarjeta de red: 6 bytes escritos en hexadecimal y separados por dos puntos. ifconfig (o ip link) la enseña en la línea que empieza por ether; grep y cut sirven para sacarla sola.',
    example: "ifconfig | grep ether | cut -d ' ' -f 2 da algo como a0:ce:c8:12:34:56.",
  },
  'pis-sh01-quotes': {
    title: 'Comillas y escapes',
    definition:
      'Para que la shell no interprete un carácter (espacio, $, *, comillas…) se protege: con \\ delante, con comillas simples (todo literal) o con dobles (literal salvo $, ` y \\). Así se crean nombres de fichero con caracteres raros.',
    example: 'echo "$HOME *" escribe tu carpeta y un *; echo \'$HOME *\' escribe $HOME * tal cual.',
  },
  'pis-sh01-skip': {
    title: 'skip: una línea de cada dos',
    definition:
      "sed -n no imprime nada por su cuenta; p imprime la línea actual y n pasa a la siguiente. sed -n 'p;n' imprime una y se salta otra. En awk, NR es el número de línea: awk 'NR%2==1' hace lo mismo.",
    example: "ls -l | sed -n 'p;n' enseña las líneas 1, 3, 5… de ls -l.",
  },
  'pis-sh01-passwd': {
    title: '/etc/passwd, grep y cut',
    definition:
      '/etc/passwd guarda un usuario por línea: nombre, x, UID, GID, descripción, carpeta personal y shell, separados por «:». grep -v quita las líneas que encajan (^# es «empieza por #») y cut -d: -f1 se queda con el primer campo.',
    example: "cat /etc/passwd | grep -v '^#' | cut -d: -f1 da root, daemon, nobody…",
  },
  'pis-sh01-rev-sort': {
    title: 'rev y sort',
    definition:
      'rev invierte los caracteres de cada línea. sort ordena líneas como texto; -r al revés, -n por valor numérico (si no, 10 va antes que 9) y -u quita las repetidas.',
    example: 'printf "10\\n9\\n" | sort da 10 y 9; con sort -n, 9 y 10.',
  },
  'pis-sh01-sed-range': {
    title: 'Un rango de líneas con sed',
    definition:
      "sed -n 'A,Bp' imprime solo de la línea A a la B, las dos incluidas. Si A y B están en variables, hay que usar comillas dobles para que la shell las cambie por su valor antes de llamar a sed.",
    example: 'Con FT_LINE1=7 y FT_LINE2=15, sed -n "${FT_LINE1},${FT_LINE2}p" imprime 9 líneas.',
  },
  'pis-sh01-sed-s': {
    title: 'Sustituir con sed',
    definition:
      "sed 's/patrón/cambio/' busca el patrón en cada línea y cambia la primera vez que aparece. Con la bandera g las cambia todas dentro de la línea. sed trabaja siempre sobre todas las líneas.",
    example: "echo banana | sed 's/a/o/' da bonana; con /g da bonono.",
  },
  'pis-sh01-paste': {
    title: 'Juntar líneas con paste',
    definition:
      'paste -s junta en una sola línea todas las de su entrada (el - es la entrada estándar) y -d dice qué poner entre ellas. Con sed se arregla luego el separador o el final.',
    example: "printf 'a\\nb\\nc\\n' | paste -sd, - | sed 's/,/, /g' da «a, b, c».",
  },
  'pis-sh01-bc': {
    title: 'Bases con bc',
    definition:
      'bc es una calculadora que lee de la entrada. ibase fija la base en que interpreta lo que escribes y obase la base en que imprime. Como ibase cambia cómo se lee lo que sigue, obase se pone antes.',
    example: "echo 'obase=2; ibase=16; FF' | bc imprime 11111111.",
  },
  'pis-sh01-tr': {
    title: 'Cambiar caracteres con tr',
    definition:
      'tr lista1 lista2 cambia cada carácter de la lista1 por el que está en la misma posición de la lista2. No trabaja con palabras, solo con caracteres sueltos. -d borra los de una lista y -s junta los que se repiten seguidos.',
    example: "echo hola | tr 'a-z' 'A-Z' da HOLA; echo hola | tr -d 'o' da hla.",
  },
  'pis-sh01-grep': {
    title: 'Opciones de grep',
    definition:
      'grep patrón enseña las líneas que contienen el patrón. -v invierte (las que no lo tienen), -c cuenta en vez de enseñar, -i no distingue mayúsculas y -n pone delante el número de línea.',
    example: 'grep -ci error log.txt cuenta las líneas con error, Error o ERROR.',
  },
  'pis-sh01-uniq': {
    title: 'sort y uniq',
    definition:
      'uniq quita una línea si es igual a la de justo antes; con -c pone delante cuántas veces se repetía. Como solo mira la anterior, se ordena primero con sort. sort -u hace las dos cosas a la vez.',
    example: 'printf "b\\na\\nb\\n" | uniq deja b, a, b; con sort | uniq, a y b.',
  },
  'pis-sh01-head-tail': {
    title: 'head y tail',
    definition:
      'head -n N enseña las N primeras líneas y tail -n N las N últimas (tail -n +N, desde la N hasta el final). Encadenados con una tubería sacan un trozo del medio.',
    example: 'head -n 5 f | tail -n 1 imprime la quinta línea de f.',
  },
  'pis-sh01-xargs': {
    title: 'xargs',
    definition:
      'Muchas órdenes no leen su entrada estándar, sino sus argumentos (rm, mkdir, basename…). xargs orden lee palabras de la entrada y llama a la orden con ellas como argumentos.',
    example:
      "find . -name '*.o' | xargs rm borra cada .o; con | rm a secas, rm se queja de que le faltan argumentos.",
  },
  'pis-sh01-pipeline': {
    title: 'Tuberías encadenadas',
    definition:
      'En una tubería larga cada orden hace un solo paso sobre lo que le da la anterior: filtrar (grep), cortar (cut), ordenar (sort), recortar (head, sed -n). Se lee de izquierda a derecha, y el orden de los pasos cambia el resultado.',
    example:
      'En r_dwssap: quitar comentarios, una de cada dos, cut, rev, sort -r, sed -n para el rango y paste para juntar.',
  },
  'pis-sh01-cut': {
    title: 'Cortar con cut',
    definition:
      'cut se queda con un trozo de cada línea: con -c por posiciones de carácter (empezando en 1) y con -d separador -f campos. Los rangos van incluidos: 2-4, y 2- es hasta el final.',
    example: 'echo root:x:0:0 | cut -d: -f1 da root; cut -c1-2 daría ro.',
  },
}
