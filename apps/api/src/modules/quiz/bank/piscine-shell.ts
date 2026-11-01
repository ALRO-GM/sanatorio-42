/**
 * Banco de Not-games: la piscina, Shell 00 y Shell 01.
 *
 * Lo que se ve en los enunciados de los dos módulos de shell: en Shell 00,
 * ficheros, permisos, enlaces, ls, tar, ssh, git, diff, find y file; en
 * Shell 01, variables, scripts y tuberías con grep, sed, cut, tr, sort, paste
 * o bc. Cada concepto pide «este módulo o cualquiera de después»
 * (`fromPiscine`): quien va por C 05 ya pasó por la shell.
 */

import { fromPiscine } from './piscine-steps.js'
import type { Concept } from './types.js'

const SH00 = fromPiscine('c-piscine-shell-00')
const SH01 = fromPiscine('c-piscine-shell-01')

export const PISCINE_SHELL: readonly Concept[] = [
  {
    id: 'pis-sh00-cat-e',
    topic: 'shell',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['Un fichero z contiene una Z y un salto de línea. ¿Qué enseña `cat -e z`?'],
        right: ['`Z$`'],
        wrong: ['`Z`', '`$Z`', '`Z\\n`', '`Z^J`'],
      },
      {
        ask: ['¿Qué pone `cat -e` al final de cada línea?'],
        right: ['`$`'],
        wrong: ['`^`', '`\\n`', '`#`', '`~`'],
      },
      {
        ask: ['¿Cuántos bytes ocupa un fichero que solo tiene una Z y un salto de línea?'],
        right: ['2'],
        wrong: ['1', '3', '0', '4'],
      },
    ],
    wrong: ['`Z`', '`$Z`', '`Z\\n`'],
    why: '`cat -e` marca cada fin de línea con un $; la Z y el salto de línea son 2 bytes.',
  },
  {
    id: 'pis-sh00-echo-n',
    topic: 'shell',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Qué orden crea un fichero z que contiene «Z» y un salto de línea?'],
        right: ['`echo Z > z`'],
        wrong: ['`echo -n Z > z`', '`echo Z < z`', '`echo Z >> Z`', '`touch z Z`'],
      },
      {
        ask: ['¿Qué hace la opción `-n` de echo?'],
        right: ['No añade el salto de línea del final'],
        wrong: [
          'Añade un salto de línea de más',
          'Interpreta los escapes como \\t',
          'Numera las líneas que escribe',
          'Escribe siempre en un fichero nuevo',
        ],
      },
    ],
    wrong: ['`echo -n Z > z`', '`echo Z < z`', '`echo Z >> Z`'],
    why: 'echo escribe su texto y un salto de línea; con -n se queda sin él, y la redirección > lo guarda en z.',
  },
  {
    id: 'pis-sh00-tar',
    topic: 'shell',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué orden mete el fichero testShell00 en el archivo testShell00.tar?'],
        right: ['`tar -cf testShell00.tar testShell00`'],
        wrong: [
          '`tar -xf testShell00.tar testShell00`',
          '`tar -tf testShell00.tar testShell00`',
          '`tar -cf testShell00 testShell00.tar`',
          '`tar testShell00 > testShell00.tar`',
        ],
      },
      {
        ask: ['¿Qué orden enseña lo que hay dentro de un .tar sin sacarlo?'],
        right: ['`tar -tf exo.tar`'],
        wrong: ['`tar -xf exo.tar`', '`tar -cf exo.tar`', '`tar -vf exo.tar`', '`cat -t exo.tar`'],
      },
      {
        ask: ['¿Qué orden saca en la carpeta actual lo que hay en un .tar?'],
        right: ['`tar -xf exo.tar`'],
        wrong: [
          '`tar -tf exo.tar`',
          '`tar -cf exo.tar`',
          '`tar -rf exo.tar`',
          '`untar -f exo.tar`',
        ],
      },
    ],
    wrong: [
      '`tar -xf testShell00.tar testShell00`',
      '`tar -tf testShell00.tar testShell00`',
      '`tar -cf testShell00 testShell00.tar`',
    ],
    why: 'En tar, c crea, x extrae y t lista; f dice que lo que va detrás es el nombre del archivo.',
  },
  {
    id: 'pis-sh00-touch-t',
    topic: 'shell',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué orden pone a testShell00 la fecha del 1 de junio a las 23:42?'],
        right: ['`touch -t 06012342 testShell00`'],
        wrong: [
          '`touch -d 06012342 testShell00`',
          '`touch -m 06012342 testShell00`',
          '`date -t 06012342 testShell00`',
          '`touch -t 23420601 testShell00`',
        ],
      },
      {
        ask: ['¿Qué formato de fecha espera `touch -t`?'],
        right: ['`[[CC]YY]MMDDhhmm[.ss]`'],
        wrong: [
          '`DDMMYYYY hh:mm`',
          '`YYYY-MM-DD hh:mm:ss`',
          '`hhmm[DDMM[YY]]`',
          '`[.ss]hhmmDDMM[YY]`',
        ],
      },
    ],
    wrong: [
      '`touch -d 06012342 testShell00`',
      '`touch -m 06012342 testShell00`',
      '`date -t 06012342 testShell00`',
    ],
    why: 'touch -t cambia la fecha del fichero a la que le das, escrita como [[CC]YY]MMDDhhmm[.ss]: mes, día, hora y minuto.',
  },
  {
    id: 'pis-sh00-ls-l-line',
    topic: 'permisos',
    needs: { projects: SH00 },
    kind: 'long',
    level: 2,
    code: '-r--r-xr-x  1 ana  staff  40 Jun  1 23:42 testShell00',
    forms: [
      {
        ask: ['¿Qué es el 40 de esta línea de `ls -l`?'],
        right: ['El tamaño del fichero en bytes'],
        wrong: [
          'El número de enlaces duros',
          'Los bloques que ocupa en disco',
          'El número que identifica al dueño',
          'Los minutos desde el último cambio',
        ],
      },
      {
        ask: ['¿Qué es el 1 que va justo detrás de los permisos?'],
        right: ['El número de enlaces duros'],
        wrong: [
          'El tamaño del fichero en kilobytes',
          'El número de versión del fichero',
          'Cuántos usuarios lo tienen abierto',
          'El número de copias de seguridad',
        ],
      },
      {
        ask: ['En esta línea, ¿qué puede hacer el grupo con el fichero?'],
        right: ['Leerlo y ejecutarlo, pero no escribir'],
        wrong: [
          'Solo leerlo, sin escribir ni ejecutar',
          'Leerlo, escribirlo y ejecutarlo',
          'Nada: el grupo no puede ni leerlo',
          'Escribirlo y ejecutarlo, sin leer',
        ],
      },
      {
        ask: ['¿Qué octal corresponde a los permisos de esta línea?'],
        right: ['455'],
        wrong: ['445', '544', '355', '454'],
      },
    ],
    wrong: [
      'Los bloques que ocupa en disco',
      'El número que identifica al dueño',
      'Los minutos desde el último cambio',
    ],
    why: 'ls -l da tipo y permisos, enlaces duros, dueño, grupo, tamaño en bytes, fecha y nombre; r-x es 4 + 1 = 5, así que r--r-xr-x es 455.',
  },
  {
    id: 'pis-sh00-ls-type',
    topic: 'permisos',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['En `ls -l`, ¿qué es una entrada cuya línea empieza por `l`?'],
        right: ['Un enlace simbólico'],
        wrong: [
          'Un enlace duro',
          'Una carpeta',
          'Un fichero de texto largo',
          'Un fichero bloqueado',
        ],
      },
      {
        ask: ['¿Con qué letra empieza en `ls -l` la línea de una carpeta?'],
        right: ['`d`'],
        wrong: ['`-`', '`l`', '`c`', '`f`'],
      },
    ],
    wrong: ['Un enlace duro', 'Una carpeta', 'Un fichero de texto largo'],
    why: 'El primer carácter de ls -l es el tipo: - fichero normal, d carpeta, l enlace simbólico.',
  },
  {
    id: 'pis-sh00-octal',
    topic: 'permisos',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Cómo se ve `chmod 640` en `ls -l`?'],
        right: ['rw-r-----'],
        wrong: ['rw-r--r--', 'rwxr-----', 'r--rw----', 'rw--w----'],
      },
      {
        ask: ['¿Qué permisos deja `chmod 711`?'],
        right: ['rwx--x--x'],
        wrong: ['rwxr--r--', 'rwx-w--w-', 'rwxrw-rw-', 'rw---x--x'],
      },
      {
        ask: ['¿Qué número de chmod da `rwxr-x---`?'],
        right: ['750'],
        wrong: ['760', '740', '751', '570'],
      },
    ],
    wrong: ['rw-r--r--', 'rwxr-----', 'r--rw----'],
    why: 'Cada cifra es dueño, grupo y otros, sumando leer (4), escribir (2) y ejecutar (1): 6 es rw-, 1 es --x, 0 es ---.',
  },
  {
    id: 'pis-sh00-chmod-sym',
    topic: 'permisos',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['Un fichero tiene `rw-r--r--`. ¿Cómo queda tras `chmod u+x`?'],
        right: ['rwxr--r--'],
        wrong: ['rwxr-xr-x', 'rw-r--r-x', 'rw-r-xr--', 'rwxrwxrwx'],
      },
      {
        ask: ['Un fichero tiene `rw-rw-rw-`. ¿Cómo queda tras `chmod go-w`?'],
        right: ['rw-r--r--'],
        wrong: ['r--rw-rw-', 'rw-rw-r--', 'r--r--r--', 'rw-r--rw-'],
      },
      {
        ask: ['¿Qué orden quita el permiso de escritura al grupo y a los otros?'],
        right: ['`chmod go-w f`'],
        wrong: ['`chmod ug-w f`', '`chmod go+w f`', '`chmod a-w f`', '`chmod o-x f`'],
      },
    ],
    wrong: ['rwxr-xr-x', 'rw-r--r-x', 'rw-r-xr--'],
    why: 'En chmod simbólico, u es el dueño, g el grupo, o los otros y a todos; + añade y - quita, sin tocar el resto.',
  },
  {
    id: 'pis-sh00-umask',
    topic: 'permisos',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['Con `umask 022`, ¿con qué permisos nace un fichero nuevo?'],
        right: ['644'],
        wrong: ['755', '022', '666', '600'],
      },
      {
        ask: ['Con `umask 022`, ¿con qué permisos nace una carpeta nueva?'],
        right: ['755'],
        wrong: ['644', '777', '022', '733'],
      },
      {
        ask: ['¿Qué es la umask?'],
        right: ['Los permisos que se quitan a lo que se crea'],
        wrong: [
          'Los permisos que se dan a lo que se crea',
          'La máscara de red de la máquina',
          'El dueño que tendrán los ficheros nuevos',
          'La lista de usuarios que pueden entrar',
        ],
      },
    ],
    wrong: ['022', '666', '600'],
    why: 'La umask quita permisos: un fichero parte de 666 y una carpeta de 777, y 022 les quita la escritura de grupo y otros.',
  },
  {
    id: 'pis-sh00-dir-x',
    topic: 'permisos',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué permite el permiso x en una carpeta?'],
        right: ['Entrar en ella y llegar a lo que tiene dentro'],
        wrong: [
          'Ejecutar todos los programas que contiene',
          'Listar los nombres de lo que contiene',
          'Crear y borrar ficheros dentro de ella',
          'Nada: en una carpeta x no significa nada',
        ],
      },
      {
        ask: ['¿Qué permiso de una carpeta deja listar los nombres que hay en ella?'],
        right: ['`r`'],
        wrong: ['`x`', '`w`', '`s`', '`t`'],
      },
    ],
    wrong: [
      'Ejecutar todos los programas que contiene',
      'Listar los nombres de lo que contiene',
      'Crear y borrar ficheros dentro de ella',
    ],
    why: 'En una carpeta, r deja listar los nombres, w crear y borrar entradas, y x entrar (cd) y acceder a lo de dentro.',
  },
  {
    id: 'pis-sh00-ln-hard',
    topic: 'ficheros',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué orden crea un enlace duro llamado b al fichero a?'],
        right: ['`ln a b`'],
        wrong: ['`ln -s a b`', '`ln b a`', '`cp a b`', '`mv a b`'],
      },
      {
        ask: ['Tras `ln a b`, ¿cuántos enlaces enseña `ls -l a`?'],
        right: ['2'],
        wrong: ['1', '0', '3', '4'],
      },
      {
        ask: ['Borras el fichero a. ¿Qué le pasa al enlace duro b?'],
        right: ['Sigue con el contenido: es el mismo inodo'],
        wrong: [
          'Queda roto y no apunta a nada',
          'Se borra también, a la vez',
          'Se queda vacío, con 0 bytes',
          'Pasa a ser un enlace simbólico',
        ],
      },
    ],
    wrong: ['`ln -s a b`', '`ln b a`', '`cp a b`'],
    why: 'Un enlace duro es otro nombre para el mismo inodo: sube el contador de enlaces, y el contenido solo se borra cuando no queda ningún nombre.',
  },
  {
    id: 'pis-sh00-ln-sym',
    topic: 'ficheros',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué orden crea un enlace simbólico llamado test6 que apunta a test0?'],
        right: ['`ln -s test0 test6`'],
        wrong: [
          '`ln -s test6 test0`',
          '`ln test0 test6`',
          '`ln -l test0 test6`',
          '`cp -l test0 test6`',
        ],
      },
      {
        ask: ['¿Cómo se ve ese enlace al final de su línea de `ls -l`?'],
        right: ['`test6 -> test0`'],
        wrong: ['`test0 -> test6`', '`test6 => test0`', '`test6@test0`', '`test6 <- test0`'],
      },
      {
        ask: ['Según `ls -l`, ¿cuántos bytes ocupa un enlace simbólico que apunta a test0?'],
        right: ['5'],
        wrong: ['0', '4', '1', '4096'],
      },
    ],
    wrong: ['`ln -s test6 test0`', '`ln test0 test6`', '`ln -l test0 test6`'],
    why: 'ln -s destino nombre guarda en el enlace la ruta del destino: ls -l la enseña con ->, y su tamaño es lo que mide esa ruta.',
  },
  {
    id: 'pis-sh00-dir-links',
    topic: 'ficheros',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Cuántos enlaces enseña `ls -l` para una carpeta recién creada y vacía?'],
        right: ['2'],
        wrong: ['1', '0', '3', '4096'],
      },
      {
        ask: ['Dentro de esa carpeta creas dos subcarpetas. ¿Cuántos enlaces enseña ahora?'],
        right: ['4'],
        wrong: ['2', '3', '1', '6'],
      },
    ],
    wrong: ['1', '0', '3'],
    why: 'Una carpeta tiene su nombre en la de arriba y su propio «.»: 2; cada subcarpeta suma uno con su «..».',
  },
  {
    id: 'pis-sh00-ssh-keygen',
    topic: 'ssh',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Qué orden genera un par de claves SSH, pública y privada?'],
        right: ['`ssh-keygen`'],
        wrong: ['`ssh-add`', '`ssh-copy-id`', '`ssh-agent`', '`sshd`'],
      },
      {
        ask: ['¿Qué fichero de tu par de claves puedes dar a otros sin peligro?'],
        right: ['`id_rsa.pub`'],
        wrong: ['`id_rsa`', '`known_hosts`', '`ssh_config`', '`id_rsa.key`'],
      },
      {
        ask: ['¿En qué carpeta deja tus claves, por defecto, la orden que las genera?'],
        right: ['`~/.ssh/`'],
        wrong: ['`/etc/ssh/`', '`~/.config/ssh/`', '`/var/ssh/`', '`~/.keys/`'],
      },
    ],
    wrong: ['`ssh-add`', '`ssh-copy-id`', '`ssh-agent`'],
    why: 'ssh-keygen crea en ~/.ssh una clave privada (id_rsa), que no sale de tu máquina, y su pública (id_rsa.pub), que es la que se comparte.',
  },
  {
    id: 'pis-sh00-ssh-auth',
    topic: 'ssh',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué puede hacer quien consiga tu `id_rsa`?'],
        right: ['Entrar como tú donde esté tu clave pública'],
        wrong: [
          'Nada: sin el .pub no le sirve de nada',
          'Solo leer tu clave pública, nada más',
          'Cambiar la contraseña de tu cuenta',
          'Solo entrar mientras tu sesión siga abierta',
        ],
      },
      {
        ask: ['En el servidor, ¿qué fichero guarda las claves públicas que pueden entrar?'],
        right: ['`~/.ssh/authorized_keys`'],
        wrong: ['`~/.ssh/known_hosts`', '`~/.ssh/id_rsa`', '`~/.ssh/config`', '`/etc/passwd`'],
      },
      {
        ask: ['¿Qué orden deja tu clave pública en un servidor para entrar sin contraseña?'],
        right: ['`ssh-copy-id ana@host`'],
        wrong: [
          '`ssh-keygen ana@host`',
          '`ssh-add ana@host`',
          '`scp id_rsa ana@host`',
          '`ssh -i ana@host`',
        ],
      },
    ],
    wrong: [
      'Nada: sin el .pub no le sirve de nada',
      'Solo leer tu clave pública, nada más',
      'Cambiar la contraseña de tu cuenta',
    ],
    why: 'El servidor deja entrar a quien demuestre tener la privada de una pública de authorized_keys: la privada es la llave de verdad.',
  },
  {
    id: 'pis-sh00-ls-opts',
    topic: 'shell',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué opción de ls separa los nombres con comas?'],
        right: ['`-m`'],
        wrong: ['`-C`', '`-1`', '`-x`', '`-l`'],
      },
      {
        ask: ['¿Qué opción de ls pone una barra detrás de cada carpeta?'],
        right: ['`-p`'],
        wrong: ['`-s`', '`-d`', '`-r`', '`-1`'],
      },
      {
        ask: ['¿Qué opción de ls ordena por fecha de modificación, lo último primero?'],
        right: ['`-t`'],
        wrong: ['`-S`', '`-d`', '`-r`', '`-s`'],
      },
      {
        ask: ['¿Qué opción de ls ordena por tamaño, lo más grande primero?'],
        right: ['`-S`'],
        wrong: ['`-s`', '`-t`', '`-n`', '`-x`'],
      },
    ],
    wrong: ['`-C`', '`-1`', '`-x`'],
    why: 'En ls, -m separa con comas, -p marca las carpetas con /, -t ordena por fecha y -S por tamaño (-s solo enseña los bloques).',
  },
  {
    id: 'pis-sh00-midls',
    topic: 'shell',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué orden lista lo de la carpeta actual separado por comas, por fecha de modificación y con una barra tras las carpetas?',
        ],
        right: ['`ls -mtp`'],
        wrong: ['`ls -ltp`', '`ls -mSp`', '`ls -mtd`', '`ls -mrR`'],
      },
      {
        ask: ['¿Qué opción de ls enseña los ficheros ocultos, pero no `.` ni `..`?'],
        right: ['`-A`'],
        wrong: ['`-a`', '`-h`', '`-o`', '`-d`'],
      },
      {
        ask: ['¿Qué hace que un fichero esté oculto en Unix?'],
        right: ['Que su nombre empiece por un punto'],
        wrong: [
          'Que no tenga permiso de lectura',
          'Que su dueño sea el usuario root',
          'Que su nombre acabe en una ~',
          'Que esté dentro de una carpeta oculta',
        ],
      },
    ],
    wrong: ['`ls -ltp`', '`ls -mSp`', '`ls -mtd`'],
    why: 'Los nombres que empiezan por punto no salen en ls; -a los enseña todos (con . y ..) y -A, todos menos . y ..',
  },
  {
    id: 'pis-sh00-ls-r',
    topic: 'shell',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué opción de ls entra también en todas las subcarpetas?'],
        right: ['`-R`'],
        wrong: ['`-r`', '`-a`', '`-d`', '`-S`'],
      },
      {
        ask: ['¿Qué hace `ls -r`?'],
        right: ['Le da la vuelta al orden de la lista'],
        wrong: [
          'Entra también en las subcarpetas',
          'Borra lo que va listando',
          'Enseña solo lo que se puede leer',
          'Enseña la ruta real de cada fichero',
        ],
      },
    ],
    wrong: ['`-r`', '`-a`', '`-d`'],
    why: 'En ls, -R (mayúscula) es recursivo y -r (minúscula) invierte el orden: no son lo mismo.',
  },
  {
    id: 'pis-sh00-git-log',
    topic: 'git',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué orden enseña los ids completos de los 5 últimos commits, uno por línea?'],
        right: ['`git log -5 --format=%H`', '`git log -n 5 --format=%H`'],
        wrong: [
          '`git log -5 --format=%h`',
          '`git log -5 --format=%an`',
          '`git show -5 --format=%s`',
          '`git status -5 --format=%H`',
        ],
      },
      {
        ask: ['¿Qué pone `%h` en un formato de `git log`?'],
        right: ['El hash del commit, abreviado'],
        wrong: [
          'El hash completo, de 40 cifras',
          'El nombre de quien hizo el commit',
          'La hora a la que se hizo',
          'El nombre de la rama actual',
        ],
      },
      {
        ask: ['¿Cuántos caracteres tiene el hash completo de un commit (`%H`)?'],
        right: ['40'],
        wrong: ['7', '32', '64', '20'],
      },
    ],
    wrong: ['`git log -5 --format=%h`', '`git log -5 --format=%an`', '`git show -5 --format=%s`'],
    why: 'git log -n limita el número de commits y --format elige qué escribir: %H es el hash entero (40 cifras hexadecimales), %h el corto.',
  },
  {
    id: 'pis-sh00-gitignore',
    topic: 'git',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué orden lista los ficheros que tu repositorio ignora?'],
        right: ['`git ls-files --others --ignored --exclude-standard`'],
        wrong: [
          '`git ls-files --others --exclude-standard`',
          '`git ls-files --cached --ignored --exclude-standard`',
          '`git log --others --ignored --exclude-standard`',
          '`git diff --others --ignored --exclude-standard`',
        ],
      },
      {
        ask: ['¿Qué hace una línea `*.o` en el .gitignore?'],
        right: ['Git deja de ofrecer los .o que aún no sigue'],
        wrong: [
          'Borra del disco todos los .o del repositorio',
          'Hace que git siga solo los ficheros .o',
          'Saca del repositorio los .o ya añadidos',
          'Comprime los .o antes de cada commit',
        ],
      },
    ],
    wrong: [
      '`git ls-files --others --exclude-standard`',
      '`git ls-files --cached --ignored --exclude-standard`',
      '`git log --others --ignored --exclude-standard`',
    ],
    why: 'El .gitignore solo afecta a lo que git aún no sigue: con --others --ignored --exclude-standard, ls-files lista justo eso.',
  },
  {
    id: 'pis-sh00-diff-patch',
    topic: 'shell',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué orden guarda en sw.diff lo que hay que cambiar para pasar de a a b?'],
        right: ['`diff a b > sw.diff`'],
        wrong: [
          '`diff b a > sw.diff`',
          '`patch a b > sw.diff`',
          '`diff a b < sw.diff`',
          '`cmp a b > sw.diff`',
        ],
      },
      {
        ask: ['¿Qué orden aplica a `a` los cambios guardados en `sw.diff`?'],
        right: ['`patch a sw.diff`', '`patch a < sw.diff`'],
        wrong: [
          '`diff a sw.diff`',
          '`patch sw.diff a`',
          '`cat sw.diff >> a`',
          '`patch -R sw.diff`',
        ],
      },
      {
        ask: ['En la salida normal de `diff a b`, ¿qué marca una línea que solo está en b?'],
        right: ['`>`'],
        wrong: ['`<`', '`+`', '`!`', '`*`'],
      },
    ],
    wrong: ['`diff b a > sw.diff`', '`patch a b > sw.diff`', '`diff a b < sw.diff`'],
    why: 'diff a b describe cómo pasar de a a b (< lo que sale de a, > lo que entra de b) y patch aplica esa receta a a.',
  },
  {
    id: 'pis-sh00-find-clean',
    topic: 'shell',
    needs: { projects: SH00 },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: ['¿Qué orden borra, aquí y en las subcarpetas, los ficheros que acaban en ~?'],
        right: ["`find . -type f -name '*~' -delete`"],
        wrong: [
          "`find . -type d -name '*~' -delete`",
          "`find . -type f -name '~*' -delete`",
          "`find . -type f -name '*~' -print`",
          "`find . -type f -name '*~' | rm`",
        ],
      },
      {
        ask: ['¿Qué patrón de `-name` busca los nombres que empiezan y acaban por #?'],
        right: ["`'#*#'`"],
        wrong: ["`'*#*'`", "`'#*'`", "`'*#'`", "`'[#]'`"],
      },
      {
        ask: ['¿Qué hace `-o` entre dos pruebas de find?'],
        right: ['Basta con que se cumpla una de las dos'],
        wrong: [
          'Exige que se cumplan las dos a la vez',
          'Escribe el resultado en un fichero',
          'Niega la prueba que va detrás',
          'Busca solo en la carpeta de arriba',
        ],
      },
    ],
    wrong: [
      "`find . -type d -name '*~' -delete`",
      "`find . -type f -name '~*' -delete`",
      "`find . -type f -name '*~' -print`",
    ],
    why: 'find recorre las subcarpetas; -type f se queda con ficheros, -name con un patrón entre comillas, -o es un «o» y -delete borra lo encontrado.',
  },
  {
    id: 'pis-sh00-find-exec',
    topic: 'shell',
    needs: { projects: SH00 },
    kind: 'long',
    level: 3,
    code: "find . -name '*~' -exec rm {} \\;",
    forms: [
      {
        ask: ['¿Qué es el `{}` de esta orden?'],
        right: ['Cada fichero que va encontrando find'],
        wrong: [
          'La carpeta donde empieza a buscar',
          'Un bloque de órdenes vacío',
          'Las opciones que se le pasan a rm',
          'La lista de todos los resultados juntos',
        ],
      },
      {
        ask: ['¿Para qué está el `\\;` del final?'],
        right: ['Marca dónde acaba la orden de -exec'],
        wrong: [
          'Separa dos búsquedas de find seguidas',
          'Hace que rm no pida confirmación',
          'Comenta lo que queda de la línea',
          'Ejecuta rm una sola vez al final',
        ],
      },
    ],
    wrong: [
      'La carpeta donde empieza a buscar',
      'Un bloque de órdenes vacío',
      'Las opciones que se le pasan a rm',
    ],
    why: 'find cambia {} por cada ruta que encuentra y ejecuta la orden hasta el ;, que va con \\ para que la shell no se lo quede.',
  },
  {
    id: 'pis-sh00-file-magic',
    topic: 'shell',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿En qué se fija la orden `file` para decir qué tipo de fichero es?'],
        right: ['En su contenido, sobre todo los primeros bytes'],
        wrong: [
          'Solo en la extensión de su nombre',
          'En los permisos que tiene el fichero',
          'En la carpeta en la que está guardado',
          'En el programa con el que se creó',
        ],
      },
      {
        ask: ['¿Qué orden analiza a.txt usando tu fichero mágico ft_magic?'],
        right: ['`file -m ft_magic a.txt`'],
        wrong: [
          '`file -f ft_magic a.txt`',
          '`file -b ft_magic a.txt`',
          '`file -i ft_magic a.txt`',
          '`magic -m ft_magic a.txt`',
        ],
      },
      {
        ask: ['¿Qué es un número mágico (magic number) de un fichero?'],
        right: ['Unos bytes fijos que delatan su formato'],
        wrong: [
          'Un número al azar que le da el sistema',
          'El tamaño máximo que puede tener',
          'La suma de comprobación de su contenido',
          'El número de su inodo en el disco',
        ],
      },
    ],
    wrong: [
      'Solo en la extensión de su nombre',
      'En los permisos que tiene el fichero',
      'En la carpeta en la que está guardado',
    ],
    why: 'file no se fía del nombre: compara el contenido con firmas conocidas (números mágicos), y con -m puede usar las que tú escribas.',
  },
  {
    id: 'pis-sh00-paths',
    topic: 'shell',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['Estás en /home/ana/piscine. ¿Qué carpeta es `../ex00`?'],
        right: ['`/home/ana/ex00`'],
        wrong: ['`/home/ana/piscine/ex00`', '`/home/ex00`', '`/ex00`', '`/piscine/ex00`'],
      },
      {
        ask: ['¿Cuál de estas rutas es absoluta?'],
        right: ['`/tmp/ex00`'],
        wrong: ['`./tmp/ex00`', '`tmp/ex00`', '`../tmp/ex00`', '`.tmp/ex00`'],
      },
      {
        ask: ['¿Qué carpeta es `~` en la shell?'],
        right: ['Tu carpeta personal, la de HOME'],
        wrong: [
          'La raíz del sistema de ficheros',
          'La carpeta en la que estabas antes',
          'La carpeta donde está la shell',
          'La carpeta de los ficheros temporales',
        ],
      },
    ],
    wrong: ['`/home/ana/piscine/ex00`', '`/home/ex00`', '`/ex00`'],
    why: 'Una ruta absoluta empieza por /; las relativas parten de donde estás (. es aquí, .. la de arriba), y ~ es tu carpeta personal.',
  },
  {
    id: 'pis-sh00-mkdir-rm',
    topic: 'shell',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Qué orden crea a/b/c aunque todavía no existan a ni b?'],
        right: ['`mkdir -p a/b/c`'],
        wrong: ['`mkdir -r a/b/c`', '`mkdir a/b/c`', '`touch -p a/b/c`', '`mkdir -a a/b/c`'],
      },
      {
        ask: ['¿Qué orden borra una carpeta con todo lo que tiene dentro?'],
        right: ['`rm -r dir`'],
        wrong: ['`rmdir dir`', '`rm dir`', '`rm -d dir`', '`del -r dir`'],
      },
    ],
    wrong: ['`mkdir -r a/b/c`', '`mkdir a/b/c`', '`touch -p a/b/c`'],
    why: 'mkdir -p crea también las carpetas de por medio; rm -r borra una carpeta y todo su contenido (rmdir solo sirve si está vacía).',
  },
  {
    id: 'pis-sh00-cp-mv',
    topic: 'shell',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué hace `mv a b` si b es una carpeta que ya existe?'],
        right: ['Mete a dentro de b, como b/a'],
        wrong: [
          'Sustituye la carpeta b por a',
          'Da error porque b ya existe',
          'Copia a en b y deja el original',
          'Junta el contenido de a y de b',
        ],
      },
      {
        ask: ['¿Qué orden copia la carpeta src entera, con lo que tiene dentro?'],
        right: ['`cp -r src dst`'],
        wrong: ['`cp src dst`', '`mv -r src dst`', '`cp -i src dst`', '`cp -n src dst`'],
      },
    ],
    wrong: [
      'Sustituye la carpeta b por a',
      'Da error porque b ya existe',
      'Copia a en b y deja el original',
    ],
    why: 'Si el destino es una carpeta, mv y cp dejan el original dentro con su nombre; para copiar una carpeta hace falta -r.',
  },
  {
    id: 'pis-sh00-man',
    topic: 'shell',
    needs: { projects: SH00 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Qué orden enseña el manual de ls?'],
        right: ['`man ls`'],
        wrong: ['`help ls`', '`ls --manual`', '`ls -h`', '`doc ls`'],
      },
      {
        ask: ['¿Qué orden te dice en qué carpeta estás?'],
        right: ['`pwd`'],
        wrong: ['`cwd`', '`whereis`', '`cd`', '`whoami`'],
      },
      {
        ask: ['¿En qué sección del manual están las órdenes de usuario, como ls?'],
        right: ['1'],
        wrong: ['2', '3', '8', '5'],
      },
      {
        ask: ['¿En qué sección del manual están las llamadas al sistema, como write?'],
        right: ['2'],
        wrong: ['1', '3', '8', '7'],
      },
    ],
    wrong: ['`help ls`', '`ls --manual`', '`ls -h`'],
    why: 'man enseña el manual de una orden, por secciones: 1 órdenes, 2 llamadas al sistema, 3 funciones de C; pwd escribe la carpeta actual.',
  },
  {
    id: 'pis-sh01-groups',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué orden lista los nombres de los grupos del usuario que hay en FT_USER?'],
        right: ['`id -Gn $FT_USER`', '`groups $FT_USER`'],
        wrong: [
          '`id -u $FT_USER`',
          '`id -gn $FT_USER`',
          '`id -G $FT_USER`',
          '`whoami -G $FT_USER`',
        ],
      },
      {
        ask: ["¿Qué hace `tr ' ' ','` con la salida de `id -Gn`?"],
        right: ['Cambia cada espacio por una coma'],
        wrong: [
          'Borra los espacios y las comas',
          'Cambia cada coma por un espacio',
          'Pone una coma al final de la línea',
          'Ordena los grupos separados por comas',
        ],
      },
      {
        ask: ['¿Qué orden quita los saltos de línea de lo que le llega por la entrada?'],
        right: ["`tr -d '\\n'`"],
        wrong: ["`tr -s '\\n'`", "`sed 's/\\n//'`", "`cut -d '\\n'`", "`grep -v '\\n'`"],
      },
    ],
    wrong: ['`id -u $FT_USER`', '`id -gn $FT_USER`', '`id -G $FT_USER`'],
    why: 'id -Gn da los nombres de todos los grupos separados por espacios; tr cambia carácter por carácter, y con -d los borra.',
  },
  {
    id: 'pis-sh01-env',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Qué hace `export FT_USER=nours`?'],
        right: ['Crea la variable y la pasa a los programas que lances'],
        wrong: [
          'Crea la variable solo para la shell, sin pasarla a nadie',
          'Crea en el sistema un usuario nuevo llamado nours',
          'Guarda la variable en el .bashrc para siempre',
          'Cambia de usuario y te conecta como nours',
        ],
      },
      {
        ask: ['Tras `export NAME=ana`, ¿qué orden escribe ana por pantalla?'],
        right: ['`echo $NAME`', '`echo "$NAME"`'],
        wrong: ['`echo NAME`', '`echo %NAME%`', '`echo $name`', '`echo &NAME`'],
      },
      {
        ask: ['¿Qué orden enseña todas las variables de entorno?'],
        right: ['`env`', '`printenv`'],
        wrong: ['`echo $ENV`', '`set -e`', '`getenv`', '`ls /env`'],
      },
    ],
    wrong: [
      'Crea la variable solo para la shell, sin pasarla a nadie',
      'Crea en el sistema un usuario nuevo llamado nours',
      'Guarda la variable en el .bashrc para siempre',
    ],
    why: 'Una variable se lee con $ y distingue mayúsculas; export la mete en el entorno, que heredan los programas que lanza la shell (env lo enseña).',
  },
  {
    id: 'pis-sh01-shebang',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Qué va en la primera línea de un script para que lo ejecute sh?'],
        right: ['`#!/bin/sh`'],
        wrong: ['`#/bin/sh`', '`!#/bin/sh`', '`//bin/sh`', '`#include <sh>`'],
      },
      {
        ask: ['¿Qué le hace falta a un script para lanzarlo con `./script.sh`?'],
        right: ['Permiso de ejecución, con chmod +x'],
        wrong: [
          'Que su nombre acabe en .sh',
          'Estar en una carpeta del PATH',
          'Compilarlo antes con cc',
          'Que lo lance el usuario root',
        ],
      },
      {
        ask: [
          'Escribir `script.sh` a secas da «command not found», pero `./script.sh` funciona. ¿Por qué?',
        ],
        right: ['La carpeta actual no está en el PATH'],
        wrong: [
          'Al script le falta el permiso x',
          'Al script le falta el #!/bin/sh',
          'Solo root puede lanzar scripts',
          'La shell no lee ficheros .sh',
        ],
      },
    ],
    wrong: ['`#/bin/sh`', '`!#/bin/sh`', '`//bin/sh`'],
    why: 'El shebang #! dice qué programa lee el script; hace falta el permiso x, y ./ da la ruta porque la carpeta actual no está en el PATH.',
  },
  {
    id: 'pis-sh01-args',
    topic: 'argumentos',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['Con `./s.sh a b c`, ¿cuánto vale `$#` dentro del script?'],
        right: ['3'],
        wrong: ['4', '1', '0', '2'],
      },
      {
        ask: ['Con `./s.sh a b c`, ¿qué vale `$2` dentro del script?'],
        right: ['`b`'],
        wrong: ['`a`', '`c`', '`./s.sh`', '`a b c`'],
      },
      {
        ask: ['¿Qué guarda `$@` en un script?'],
        right: ['Todos los argumentos, cada uno por separado'],
        wrong: [
          'Solo el último argumento recibido',
          'El número de argumentos recibidos',
          'El nombre del script que se ejecuta',
          'El código de salida de la última orden',
        ],
      },
    ],
    wrong: ['4', '1', '0'],
    why: 'En un script, $1, $2… son los argumentos, $# cuántos hay (sin contar el nombre, que es $0) y $@ todos ellos.',
  },
  {
    id: 'pis-sh01-find-sh',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué orden busca, desde aquí y en las subcarpetas, los ficheros que acaban en .sh?'],
        right: ["`find . -name '*.sh'`", "`find . -type f -name '*.sh'`"],
        wrong: [
          "`find . -name '.sh'`",
          "`ls -R '*.sh'`",
          "`find . -type d -name '*.sh'`",
          "`grep -r '*.sh' .`",
        ],
      },
      {
        ask: ['¿Qué orden quita el .sh del final de cada nombre que le llega?'],
        right: ["`sed 's/\\.sh$//'`"],
        wrong: ["`tr -d '.sh'`", '`cut -d . -f 2`', "`sed 's/^\\.sh//'`", "`grep -v '\\.sh$'`"],
      },
    ],
    wrong: ["`find . -name '.sh'`", "`ls -R '*.sh'`", "`find . -type d -name '*.sh'`"],
    why: 'find recorre las subcarpetas buscando el patrón *.sh; sed con \\.sh$ quita solo el .sh del final, y tr borraría cada s, h y punto.',
  },
  {
    id: 'pis-sh01-basename',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'long',
    level: 2,
    code: 'basename /home/ana/ex02/find_sh.sh .sh',
    forms: [
      {
        ask: ['¿Qué imprime esta orden?'],
        right: ['`find_sh`'],
        wrong: ['`find_sh.sh`', '`/home/ana/ex02/find_sh`', '`ex02`', '`.sh`'],
      },
      {
        ask: ['¿Qué imprimiría si se quitara el último argumento, el `.sh`?'],
        right: ['`find_sh.sh`'],
        wrong: [
          '`find_sh`',
          '`/home/ana/ex02`',
          '`ex02/find_sh.sh`',
          '`/home/ana/ex02/find_sh.sh`',
        ],
      },
      {
        ask: ['¿Qué imprimiría `dirname` con la misma ruta?'],
        right: ['`/home/ana/ex02`'],
        wrong: ['`ex02`', '`/home/ana`', '`find_sh.sh`', '`/home/ana/ex02/find_sh`'],
      },
    ],
    wrong: ['`/home/ana/ex02/find_sh`', '`ex02`', '`.sh`'],
    why: 'basename se queda con la última parte de la ruta y le quita el sufijo que le des; dirname, con todo lo de antes.',
  },
  {
    id: 'pis-sh01-count-files',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: ['¿Por qué `find . | wc -l` cuenta uno más de lo que hay dentro de la carpeta?'],
        right: ['Porque find lista también la propia carpeta, el .'],
        wrong: [
          'Porque wc -l cuenta una línea vacía al final',
          'Porque find cuenta dos veces los enlaces',
          'Porque find añade una línea con el total',
          'Porque wc -l cuenta también la orden find',
        ],
      },
      {
        ask: [
          'Una carpeta tiene 2 ficheros y una subcarpeta con 1 fichero dentro. ¿Cuántas líneas da allí `find . | wc -l`?',
        ],
        right: ['5'],
        wrong: ['4', '3', '6', '2'],
      },
      {
        ask: ['¿Qué orden cuenta solo los ficheros normales, aquí y en las subcarpetas?'],
        right: ['`find . -type f | wc -l`'],
        wrong: [
          '`find . -type d | wc -l`',
          '`ls | wc -l`',
          '`find . -type f | wc -c`',
          '`ls -R | wc -l`',
        ],
      },
    ],
    wrong: [
      'Porque wc -l cuenta una línea vacía al final',
      'Porque find cuenta dos veces los enlaces',
      'Porque find añade una línea con el total',
    ],
    why: 'find escribe una ruta por línea, empezando por la propia carpeta (.); wc -l cuenta esas líneas, y -type f deja solo los ficheros.',
  },
  {
    id: 'pis-sh01-wc',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Qué cuenta `wc -c`?'],
        right: ['Los bytes'],
        wrong: ['Las líneas', 'Las palabras', 'Las columnas', 'Los ficheros'],
      },
      {
        ask: ['¿Qué número da `echo hola mundo | wc -w`?'],
        right: ['2'],
        wrong: ['1', '10', '11', '3'],
      },
      { ask: ['¿Qué número da `echo hola | wc -c`?'], right: ['5'], wrong: ['4', '1', '6', '2'] },
    ],
    wrong: ['Las líneas', 'Las palabras', 'Las columnas'],
    why: 'wc -l cuenta líneas, -w palabras y -c bytes; echo añade un salto de línea, que también es un byte.',
  },
  {
    id: 'pis-sh01-mac',
    topic: 'redes',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['En la salida de `ifconfig`, ¿qué palabra va delante de cada dirección MAC?'],
        right: ['`ether`'],
        wrong: ['`inet`', '`inet6`', '`netmask`', '`broadcast`'],
      },
      {
        ask: ['¿Qué es una dirección MAC?'],
        right: ['El identificador físico de una tarjeta de red'],
        wrong: [
          'La dirección IP que da el router por DHCP',
          'El nombre de la máquina en la red local',
          'El número de serie de un ordenador Mac',
          'La dirección del servidor DNS de la red',
        ],
      },
      {
        ask: ['¿Cuál de estas tiene la forma de una dirección MAC?'],
        right: ['`0a:1b:2c:3d:4e:5f`'],
        wrong: ['`10.12.4.42`', '`fe80::1`', '`255.255.255.0`', '`0a:1b:2c:3d`'],
      },
      {
        ask: ['¿Cuántos bytes tiene una dirección MAC?'],
        right: ['6'],
        wrong: ['4', '8', '16', '12'],
      },
    ],
    wrong: ['`inet`', '`inet6`', '`netmask`'],
    why: 'La MAC identifica la tarjeta de red: 6 bytes en hexadecimal separados por «:», que ifconfig enseña tras la palabra ether.',
  },
  {
    id: 'pis-sh01-quotes',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué hace en la shell una barra invertida `\\` delante de un carácter?'],
        right: ['Le quita su significado especial'],
        wrong: [
          'Lo borra del nombre del fichero',
          'Lo convierte en mayúscula',
          'Convierte el resto en un comentario',
          'Lo cambia por su código ASCII',
        ],
      },
      {
        ask: ['¿Qué expande la shell dentro de comillas simples?'],
        right: ['Nada: todo queda tal cual'],
        wrong: [
          'Las variables, pero no el *',
          'El *, pero no las variables',
          'Todo, igual que con las dobles',
          'Solo las barras invertidas',
        ],
      },
      {
        ask: ['Dentro de comillas dobles, ¿cuál de estos sigue siendo especial?'],
        right: ['`$`'],
        wrong: ['`*`', "`'`", '`#`', '`~`'],
      },
      {
        ask: ['¿Qué orden crea un fichero cuyo nombre lleva un espacio, a b?'],
        right: ["`touch 'a b'`", '`touch a\\ b`'],
        wrong: ['`touch a b`', '`touch {a b}`', '`touch a/ b`', '`touch [a b]`'],
      },
    ],
    wrong: [
      'Lo borra del nombre del fichero',
      'Lo convierte en mayúscula',
      'Convierte el resto en un comentario',
    ],
    why: 'Las comillas simples lo dejan todo literal; las dobles dejan vivos $, ` y \\; y la \\ protege el carácter que va justo detrás.',
  },
  {
    id: 'pis-sh01-skip',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué orden deja una línea de cada dos, empezando por la primera?'],
        right: ["`sed -n 'p;n'`", "`awk 'NR%2==1'`"],
        wrong: ["`sed -n 'n;p'`", "`awk 'NR%2==0'`", '`head -n 2`', "`sed 'p;n'`"],
      },
      {
        ask: ['¿Qué hace la opción `-n` de sed?'],
        right: ['No imprime nada salvo lo que pidas con p'],
        wrong: [
          'Numera cada línea que imprime',
          'Trabaja solo con la primera línea',
          'Cambia el propio fichero, sin copia',
          'Quita las líneas vacías de la salida',
        ],
      },
      {
        ask: ['¿Qué variable de awk guarda el número de la línea que está leyendo?'],
        right: ['`NR`'],
        wrong: ['`NF`', '`$0`', '`FS`', '`NL`'],
      },
    ],
    wrong: ["`sed -n 'n;p'`", "`awk 'NR%2==0'`", '`head -n 2`'],
    why: 'Con -n sed solo imprime lo que se pide: p imprime la línea y n salta a la siguiente sin imprimirla, así salen la 1, la 3, la 5…',
  },
  {
    id: 'pis-sh01-passwd',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué orden quita las líneas de comentario, las que empiezan por #?'],
        right: ["`grep -v '^#'`"],
        wrong: ["`grep '^#'`", "`grep -v '#$'`", "`grep -c '^#'`", "`sed 's/#//'`"],
      },
      {
        ask: ['¿Qué orden saca el primer campo de unas líneas separadas por «:»?'],
        right: ['`cut -d: -f1`', "`awk -F: '{print $1}'`"],
        wrong: ['`cut -f: -d1`', '`cut -d: -f2`', '`cut -c1`', "`awk '{print $1}'`"],
      },
      {
        ask: ['¿Qué hay en el primer campo de cada línea de /etc/passwd?'],
        right: ['El nombre de usuario'],
        wrong: [
          'La contraseña cifrada',
          'La carpeta personal',
          'La shell de entrada',
          'El número del grupo',
        ],
      },
    ],
    wrong: ["`grep '^#'`", "`grep -v '#$'`", "`grep -c '^#'`"],
    why: "/etc/passwd tiene un usuario por línea con campos separados por «:», el primero el nombre; grep -v '^#' quita las que empiezan por #.",
  },
  {
    id: 'pis-sh01-rev-sort',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué imprime `echo hola | rev`?'],
        right: ['`aloh`'],
        wrong: ['`hola`', '`HOLA`', '`ahol`', '`laoh`'],
      },
      {
        ask: ['¿Qué hace `sort -r`?'],
        right: ['Ordena al revés, de mayor a menor'],
        wrong: [
          'Le da la vuelta a cada línea, letra a letra',
          'Ordena y quita las líneas repetidas',
          'Ordena las líneas al azar',
          'Ordena todo lo que hay en las subcarpetas',
        ],
      },
      {
        ask: ['¿Qué opción de sort ordena por valor numérico, con 9 antes que 10?'],
        right: ['`-n`'],
        wrong: ['`-r`', '`-u`', '`-d`', '`-f`'],
      },
    ],
    wrong: ['`hola`', '`HOLA`', '`ahol`'],
    why: 'rev da la vuelta a cada línea letra a letra; sort -r invierte el orden de las líneas y -n compara como números, no como texto.',
  },
  {
    id: 'pis-sh01-sed-range',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ["¿Qué imprime `sed -n '3,5p'`?"],
        right: ['Las líneas de la 3 a la 5, las dos incluidas'],
        wrong: [
          'Las líneas 3 y 5, pero no la 4',
          'Cinco líneas, a partir de la 3',
          'Todas salvo las de la 3 a la 5',
          'La línea 3 cinco veces seguidas',
        ],
      },
      {
        ask: ['¿Por qué `"${FT_LINE1},${FT_LINE2}p"` va entre comillas dobles?'],
        right: ['Para que la shell sustituya las variables'],
        wrong: [
          'Para que la shell no toque las variables',
          'Porque sed solo acepta comillas dobles',
          'Para que las líneas salgan entre comillas',
          'Para que sed lea las variables él mismo',
        ],
      },
      {
        ask: ["En un fichero de 100 líneas, ¿cuántas imprime `sed -n '7,15p'`?"],
        right: ['9'],
        wrong: ['8', '15', '7', '22'],
      },
    ],
    wrong: [
      'Las líneas 3 y 5, pero no la 4',
      'Cinco líneas, a partir de la 3',
      'Todas salvo las de la 3 a la 5',
    ],
    why: "sed -n 'A,Bp' imprime de la línea A a la B, ambas incluidas; con comillas dobles la shell pone antes el valor de las variables.",
  },
  {
    id: 'pis-sh01-sed-s',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ["¿Qué imprime `echo banana | sed 's/a/o/'`?"],
        right: ['`bonana`'],
        wrong: ['`bonono`', '`banano`', '`obanana`', '`bnn`'],
      },
      {
        ask: ["¿Qué imprime `echo banana | sed 's/a/o/g'`?"],
        right: ['`bonono`'],
        wrong: ['`bonana`', '`banano`', '`bonona`', '`bnn`'],
      },
      {
        ask: ['¿Qué hace la `g` del final de `s/a/b/g`?'],
        right: ['Cambia todas las veces de la línea, no solo la primera'],
        wrong: [
          'Aplica el cambio a todas las líneas, no solo a la primera',
          'Busca sin distinguir mayúsculas de minúsculas',
          'Guarda el resultado en el mismo fichero de entrada',
          'Imprime la línea otra vez después de cambiarla',
        ],
      },
    ],
    wrong: ['`banano`', '`obanana`', '`bnn`'],
    why: 'sed s/viejo/nuevo/ cambia la primera vez de cada línea; con g, todas las de la línea. Las demás líneas ya se tratan siempre.',
  },
  {
    id: 'pis-sh01-paste',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué orden junta todas las líneas que le llegan en una sola, separadas por comas?'],
        right: ['`paste -sd, -`', '`paste -s -d, -`'],
        wrong: ['`paste -d, -`', '`cat -sd, -`', '`join -t, -`', '`sort -t, -`'],
      },
      {
        ask: ["¿Qué hace `sed 's/,/, /g'` con una línea?"],
        right: ['Pone un espacio detrás de cada coma'],
        wrong: [
          'Cambia solo la primera coma de la línea',
          'Borra todas las comas y los espacios',
          'Pone una coma detrás de cada espacio',
          'Junta en una todas las líneas con comas',
        ],
      },
    ],
    wrong: ['`paste -d, -`', '`cat -sd, -`', '`join -t, -`'],
    why: 'paste -s pone todas las líneas en una y -d elige el separador; luego sed cambia cada «,» por «, ».',
  },
  {
    id: 'pis-sh01-bc',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'long',
    level: 4,
    forms: [
      {
        ask: ["¿Qué imprime `echo 'obase=2; 10' | bc`?"],
        right: ['`1010`'],
        wrong: ['`2`', '`10`', '`0101`', '`1100`'],
      },
      {
        ask: ["¿Qué imprime `echo 'ibase=2; 101' | bc`?"],
        right: ['`5`'],
        wrong: ['`101`', '`3`', '`7`', '`1100101`'],
      },
      {
        ask: ['¿Qué hace `ibase=16` en bc?'],
        right: ['Lee en base 16 los números que le escribes'],
        wrong: [
          'Escribe los resultados en base 16',
          'Limita los números a 16 cifras',
          'Usa 16 decimales en las divisiones',
          'Suma 16 a cada número que lee',
        ],
      },
      {
        ask: ['¿Por qué conviene poner `obase` antes que `ibase` en bc?'],
        right: ['Si va detrás, su valor ya se lee en la base nueva'],
        wrong: [
          'Porque bc lee las órdenes de derecha a izquierda',
          'Porque ibase solo se puede cambiar una vez',
          'Porque obase borra lo que ponga ibase',
          'Porque si no, bc da un error de sintaxis',
        ],
      },
    ],
    wrong: ['`2`', '`10`', '`0101`'],
    why: 'En bc, ibase es la base en que lee y obase la base en que escribe; tras cambiar ibase, hasta el número de obase se lee en la base nueva.',
  },
  {
    id: 'pis-sh01-tr',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ["¿Qué hace `tr 'abc' '012'` con su entrada?"],
        right: ['Cambia cada a por 0, cada b por 1 y cada c por 2'],
        wrong: [
          'Cambia cada 0 por a, cada 1 por b y cada 2 por c',
          'Cambia la palabra abc entera por 012, nada más',
          'Borra las a, las b y las c, y añade 012 al final',
          'Cambia solo la primera a, b y c de cada línea',
        ],
      },
      {
        ask: ["¿Qué imprime `echo hola | tr 'ol' '01'`?"],
        right: ['`h01a`'],
        wrong: ['`hola`', '`h10a`', '`01la`', '`h0la`'],
      },
      {
        ask: ["¿Qué hace `tr -s ' '`?"],
        right: ['Junta los espacios seguidos en uno solo'],
        wrong: [
          'Borra todos los espacios del texto',
          'Cambia cada espacio por un salto de línea',
          'Ordena las palabras separadas por espacios',
          'Añade un espacio entre cada dos letras',
        ],
      },
    ],
    wrong: [
      'Cambia cada 0 por a, cada 1 por b y cada 2 por c',
      'Cambia la palabra abc entera por 012, nada más',
      'Borra las a, las b y las c, y añade 012 al final',
    ],
    why: 'tr cambia carácter a carácter: el primero de la primera lista por el primero de la segunda, y así; -d borra y -s junta repetidos.',
  },
  {
    id: 'pis-sh01-grep',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Qué opción de grep cuenta las líneas que encajan en vez de enseñarlas?'],
        right: ['`-c`'],
        wrong: ['`-n`', '`-l`', '`-v`', '`-o`'],
      },
      {
        ask: ['¿Qué opción hace que grep no distinga mayúsculas de minúsculas?'],
        right: ['`-i`'],
        wrong: ['`-I`', '`-w`', '`-x`', '`-c`'],
      },
      {
        ask: ['¿Qué enseña `grep -v error log.txt`?'],
        right: ['Las líneas de log.txt que no dicen error'],
        wrong: [
          'Las líneas de log.txt que dicen error',
          'Cuántas líneas de log.txt dicen error',
          'La versión de grep y su ayuda',
          'El log.txt entero, con error resaltado',
        ],
      },
    ],
    wrong: ['`-n`', '`-l`', '`-v`'],
    why: 'grep enseña las líneas que encajan; -v da las que no, -c cuántas son y -i no distingue mayúsculas.',
  },
  {
    id: 'pis-sh01-uniq',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Por qué se suele poner `sort` antes de `uniq`?'],
        right: ['uniq solo junta las repetidas que van seguidas'],
        wrong: [
          'uniq solo funciona con texto ordenado al revés',
          'uniq necesita las líneas numeradas para ir',
          'sort quita las repetidas y uniq las cuenta',
          'Para que uniq vaya más rápido, sin más',
        ],
      },
      {
        ask: ['¿Qué hace `sort -u`?'],
        right: ['Ordena y quita las líneas repetidas'],
        wrong: [
          'Ordena sin distinguir mayúsculas',
          'Ordena y deja solo las repetidas',
          'Ordena solo por la primera columna',
          'Ordena por fecha de modificación',
        ],
      },
      {
        ask: ['¿Qué hace `uniq -c`?'],
        right: ['Pone delante cuántas veces sale cada línea'],
        wrong: [
          'Cuenta cuántas líneas distintas hay',
          'Deja solo las líneas que no se repiten',
          'Cuenta los caracteres de cada línea',
          'Quita las repetidas sin distinguir mayúsculas',
        ],
      },
    ],
    wrong: [
      'uniq solo funciona con texto ordenado al revés',
      'uniq necesita las líneas numeradas para ir',
      'sort quita las repetidas y uniq las cuenta',
    ],
    why: 'uniq compara cada línea con la anterior, así que solo ve repetidas si están juntas: por eso va tras sort (o se usa sort -u).',
  },
  {
    id: 'pis-sh01-head-tail',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué orden enseña las 3 últimas líneas de f?'],
        right: ['`tail -n 3 f`'],
        wrong: ['`head -n 3 f`', '`tail -c 3 f`', '`tail -n +3 f`', '`head -n -3 f`'],
      },
      {
        ask: ['¿Qué orden enseña solo la línea 5 de f?'],
        right: ['`head -n 5 f | tail -n 1`', "`sed -n '5p' f`"],
        wrong: [
          '`tail -n 5 f | head -n 1`',
          '`head -n 1 f | tail -n 5`',
          "`sed '5p' f`",
          '`head -n 5 f`',
        ],
      },
    ],
    wrong: ['`head -n 3 f`', '`tail -c 3 f`', '`tail -n +3 f`'],
    why: 'head -n N da las N primeras líneas y tail -n N las N últimas; juntándolos se saca una línea concreta.',
  },
  {
    id: 'pis-sh01-xargs',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué hace `xargs` con lo que le llega por la entrada?'],
        right: ['Lo pasa como argumentos a la orden que le digas'],
        wrong: [
          'Lo pasa como entrada estándar de la orden',
          'Lo guarda en una variable llamada ARGS',
          'Cuenta cuántos argumentos hay en la entrada',
          'Lo escribe en un fichero llamado xargs.out',
        ],
      },
      {
        ask: ["¿Por qué `find . -name '*.o' | rm` no borra nada?"],
        right: ['rm no lee nombres de su entrada: los quiere como argumentos'],
        wrong: [
          'Porque rm necesita -r para borrar ficheros sueltos',
          'Porque la tubería solo pasa la primera línea',
          'Porque find escribe los nombres por la salida de error',
          'Porque rm no puede borrar lo que ha encontrado find',
        ],
      },
    ],
    wrong: [
      'Lo pasa como entrada estándar de la orden',
      'Lo guarda en una variable llamada ARGS',
      'Cuenta cuántos argumentos hay en la entrada',
    ],
    why: 'Una tubería llena la entrada estándar, pero rm, ls o basename leen sus argumentos; xargs convierte esas líneas en argumentos.',
  },
  {
    id: 'pis-sh01-pipeline',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'long',
    level: 3,
    code: "cat /etc/passwd | grep -v '^#' | cut -d: -f1 | sort | head -n 2",
    forms: [
      {
        ask: ['¿Qué saca esta tubería?'],
        right: ['Los 2 primeros nombres de usuario por orden alfabético'],
        wrong: [
          'Las 2 primeras líneas de /etc/passwd, enteras',
          'Los 2 últimos nombres de usuario, ordenados',
          'Los 2 primeros comentarios de /etc/passwd',
          'Las contraseñas de los 2 primeros usuarios',
        ],
      },
      {
        ask: ['¿Qué cambia si se quita el `sort`?'],
        right: ['Salen los 2 primeros en el orden del fichero'],
        wrong: [
          'Salen los 2 últimos del fichero, al revés',
          'Nada: head ya ordena lo que le llega',
          'Da un error: head necesita sort delante',
          'Salen también las líneas de comentario',
        ],
      },
    ],
    wrong: [
      'Las 2 primeras líneas de /etc/passwd, enteras',
      'Los 2 últimos nombres de usuario, ordenados',
      'Los 2 primeros comentarios de /etc/passwd',
    ],
    why: 'Cada orden trabaja sobre la salida de la anterior: quita comentarios, se queda con el nombre, ordena y deja las 2 primeras.',
  },
  {
    id: 'pis-sh01-cut',
    topic: 'shell',
    needs: { projects: SH01 },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué imprime `echo abcdef | cut -c2-4`?'],
        right: ['`bcd`'],
        wrong: ['`abc`', '`bcde`', '`cd`', '`ef`'],
      },
      {
        ask: ['¿Qué imprime `echo a:b:c | cut -d: -f2`?'],
        right: ['`b`'],
        wrong: ['`a`', '`a:b`', '`:b:`', '`b:c`'],
      },
      {
        ask: ['¿Qué imprime `echo a:b:c | cut -d: -f1,3`?'],
        right: ['`a:c`'],
        wrong: ['`a:b`', '`a`', '`b:c`', '`a:b:c`'],
      },
    ],
    wrong: ['`abc`', '`bcde`', '`cd`'],
    why: 'cut -c corta por posiciones de carácter y cut -d -f por campos; N-M es de N a M incluidos y 1,3 elige campos sueltos.',
  },
]
