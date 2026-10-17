/**
 * Banco de Not-games: Unix y procesos. Born2beroot (el sistema), pipex
 * (procesos y tuberías), minitalk (señales) y minishell (una shell entera).
 */

import type { Concept } from './types.js'

const B2BR = ['born2beroot', '42next-born2beroot']
const PIPEX = ['pipex']
const MINITALK = ['minitalk']
const MINISHELL = ['42cursus-minishell']
const PROCESSES = [...PIPEX, ...MINISHELL]

export const UNIX: readonly Concept[] = [
  {
    id: 'unix-sudo',
    topic: 'sistema',
    needs: { projects: B2BR },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: ['¿Para qué sirve `sudo`?', '`sudo orden` ejecuta la orden…'],
        right: [
          'Para ejecutar una orden con los permisos de otro usuario (normalmente root)',
          'Como root, si tienes permiso',
        ],
      },
      {
        ask: [
          '¿En qué fichero se configura quién puede usar sudo?',
          'Las reglas de sudo se editan (con visudo) en…',
        ],
        right: ['/etc/sudoers', 'El fichero sudoers'],
        wrong: ['/etc/passwd', '/etc/shadow', '~/.bashrc'],
      },
    ],
    wrong: [
      'Para cambiar de shell',
      'Para apagar la máquina',
      'Para ver los procesos',
      'Para instalar paquetes, solo eso',
    ],
    why: 'sudo ejecuta como otro usuario según las reglas de /etc/sudoers, que se editan con visudo para no romperlo.',
  },
  {
    id: 'unix-ssh-port',
    topic: 'sistema',
    needs: { projects: B2BR },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿En qué puerto escucha SSH por defecto?', 'El puerto estándar de SSH es…'],
        right: ['22'],
      },
      {
        ask: [
          '¿Qué fichero configura el servidor SSH?',
          'Para cambiar el puerto del servidor SSH se edita…',
        ],
        right: ['/etc/ssh/sshd_config', 'sshd_config'],
        wrong: ['/etc/ssh/ssh_config', '~/.ssh/known_hosts', '/etc/hosts'],
      },
    ],
    wrong: ['21', '80', '443', '4242', '23'],
    why: 'SSH usa el 22 por defecto; el servidor (sshd) se configura en sshd_config, y ssh_config es el del cliente.',
  },
  {
    id: 'unix-firewall',
    topic: 'sistema',
    needs: { projects: B2BR },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué hace un cortafuegos como UFW?', 'UFW sirve para…'],
        right: [
          'Decidir qué conexiones de red se permiten y cuáles no',
          'Filtrar el tráfico de red por puertos y reglas',
        ],
      },
      {
        ask: [
          '¿Qué orden de UFW deja pasar conexiones al puerto 4242?',
          'Para abrir el puerto 4242 en UFW se usa…',
        ],
        right: ['ufw allow 4242', 'sudo ufw allow 4242'],
        wrong: ['ufw open 4242', 'ufw enable 4242', 'ufw deny 4242'],
      },
    ],
    wrong: ['Cifrar el disco', 'Gestionar usuarios', 'Comprimir ficheros', 'Acelerar la red'],
    why: 'Un cortafuegos filtra el tráfico según reglas; con UFW se abren puertos con `allow`.',
  },
  {
    id: 'unix-lvm',
    topic: 'sistema',
    needs: { projects: B2BR },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué ventaja tiene LVM frente a particiones normales?', 'LVM permite…'],
        right: [
          'Crear y cambiar de tamaño volúmenes lógicos con flexibilidad',
          'Agrupar discos y redimensionar volúmenes sin reparticionar',
        ],
      },
    ],
    wrong: [
      'Hace el disco más rápido',
      'Cifra los datos',
      'Sustituye al sistema de ficheros',
      'Hace copias de seguridad solo',
    ],
    why: 'LVM pone una capa entre discos y volúmenes: se pueden juntar, ampliar o reducir sin tocar particiones.',
  },
  {
    id: 'unix-password-policy',
    topic: 'sistema',
    needs: { projects: B2BR },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Dónde se guardan los hashes de las contraseñas en Linux?',
          'Las contraseñas (cifradas) de los usuarios están en…',
        ],
        right: ['/etc/shadow'],
      },
      {
        ask: [
          '¿Qué fichero lista los usuarios, su shell y su carpeta?',
          'Cada usuario, con su uid y su shell, aparece en…',
        ],
        right: ['/etc/passwd'],
        wrong: ['/etc/shadow'],
      },
    ],
    wrong: ['/etc/group', '/etc/sudoers', '/home/.passwords', '/var/log/auth.log'],
    why: '/etc/passwd lo lee cualquiera (usuarios); los hashes van aparte en /etc/shadow, que solo lee root.',
  },
  {
    id: 'proc-fork',
    topic: 'procesos',
    needs: { projects: PROCESSES },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ['¿Qué devuelve `fork()` en el proceso hijo?', 'En el hijo, fork devuelve…'],
        right: ['0'],
      },
      {
        ask: ['¿Qué devuelve `fork()` en el proceso padre?', 'En el padre, fork devuelve…'],
        right: ['El PID del hijo', 'El identificador del proceso hijo'],
        wrong: ['0'],
      },
    ],
    wrong: ['-1 siempre', 'El PID del padre', '1', 'Nada: no vuelve'],
    why: 'fork vuelve dos veces: 0 en el hijo y el PID del hijo en el padre (-1 si falla).',
  },
  {
    id: 'proc-fork-count',
    topic: 'procesos',
    needs: { projects: PROCESSES },
    kind: 'long',
    level: 3,
    code: 'int main(void)\n{\n    fork();\n    fork();\n    printf("hola\\n");\n    return 0;\n}',
    forms: [
      {
        ask: ['¿Cuántas veces se imprime «hola»?', '¿Cuántas líneas «hola» salen?'],
        right: ['4', 'Cuatro'],
      },
      {
        ask: [
          '¿Cuántos procesos hay en total al llegar al printf?',
          'Contando el original, ¿cuántos procesos ejecutan el printf?',
        ],
        right: ['4', 'Cuatro'],
      },
    ],
    wrong: ['2', '3', '1', '8'],
    why: 'Cada fork duplica a todos los que ya había: 1 → 2 → 4 procesos, y cada uno imprime.',
  },
  {
    id: 'proc-exec',
    topic: 'procesos',
    needs: { projects: PROCESSES },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué pasa con el código que va después de un `execve` que funciona?',
          'Si execve tiene éxito…',
        ],
        right: [
          'No se ejecuta nunca: el proceso pasa a ser el nuevo programa',
          'El proceso se sustituye y no vuelve',
        ],
      },
      {
        ask: [
          '¿Qué devuelve `execve` si falla?',
          'Cuando execve no puede ejecutar el programa, devuelve…',
        ],
        right: ['-1'],
        wrong: ['0', 'El PID del nuevo programa', '1'],
      },
    ],
    wrong: [
      'Se ejecuta al terminar el nuevo programa',
      'Se ejecuta en un hilo aparte',
      'Se ejecuta en el padre',
    ],
    why: 'execve reemplaza la imagen del proceso; solo vuelve (con -1) si no lo ha conseguido.',
  },
  {
    id: 'proc-pipe-ends',
    topic: 'procesos',
    needs: { projects: PROCESSES },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          'Tras `pipe(fd)`, ¿por qué extremo se escribe?',
          'En un pipe, el extremo de escritura es…',
        ],
        right: ['fd[1]'],
      },
      {
        ask: ['Tras `pipe(fd)`, ¿por qué extremo se lee?', 'En un pipe, el extremo de lectura es…'],
        right: ['fd[0]'],
        wrong: ['fd[1]'],
      },
    ],
    wrong: ['fd[2]', 'Cualquiera de los dos', 'fd[-1]', 'El que devuelve pipe'],
    why: 'pipe llena dos descriptores: fd[0] para leer y fd[1] para escribir (como stdin = 0 y stdout = 1).',
  },
  {
    id: 'proc-dup2',
    topic: 'procesos',
    needs: { projects: PROCESSES },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué hace `dup2(fd, 1)`?',
          'Tras `dup2(fd, STDOUT_FILENO)`, lo que se escriba en la salida estándar…',
        ],
        right: ['Hace que el descriptor 1 apunte a lo mismo que fd', 'Va a donde apuntaba fd'],
      },
    ],
    wrong: [
      'Copia el contenido del fichero en la salida',
      'Cierra fd y abre uno nuevo',
      'Duplica el proceso',
      'Escribe fd en pantalla',
    ],
    why: 'dup2 hace que el segundo descriptor sea una copia del primero: así se redirige la salida a un fichero o a un pipe.',
  },
  {
    id: 'proc-pipe-hang',
    topic: 'procesos',
    needs: { projects: PROCESSES },
    kind: 'long',
    level: 4,
    code: 'pipe(fd);\nif (fork() == 0)\n{\n    dup2(fd[1], 1);\n    close(fd[0]);\n    execve("/bin/ls", args, env);\n}\nif (fork() == 0)\n{\n    dup2(fd[0], 0);\n    close(fd[1]);\n    execve("/usr/bin/wc", args2, env);\n}\nwait(NULL);\nwait(NULL);',
    seconds: 60,
    forms: [
      {
        ask: ['Este «ls | wc» se queda colgado. ¿Por qué?', '¿Qué hace que wc no termine nunca?'],
        right: [
          'El padre no cierra fd[1]: wc nunca recibe el fin de fichero',
          'Queda abierto un extremo de escritura (el del padre), así que wc espera para siempre',
        ],
      },
    ],
    wrong: [
      'Falta un tercer fork',
      'ls escribe en stderr',
      'wait solo espera a un hijo',
      'dup2 se usa al revés',
      'execve necesita la ruta relativa',
    ],
    why: 'Un lector solo ve EOF cuando todos los extremos de escritura están cerrados, también el que heredó el padre.',
  },
  {
    id: 'proc-zombie',
    topic: 'procesos',
    needs: { projects: PROCESSES },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué es un proceso zombi?',
          'Un hijo que ha terminado y del que el padre aún no ha hecho wait es…',
        ],
        right: ['Uno que ha terminado pero cuyo padre aún no ha recogido su estado', 'Un zombi'],
      },
      {
        ask: [
          '¿Cómo se evita dejar zombis?',
          'Para que un hijo terminado no quede como zombi, el padre debe…',
        ],
        right: ['Hacer wait o waitpid por él', 'Recoger su estado con waitpid'],
        wrong: ['Matarlo con kill', 'Hacer otro fork', 'Esperar con sleep a que desaparezca'],
      },
    ],
    wrong: [
      'Un proceso que no responde a señales',
      'Un proceso sin padre',
      'Uno que usa demasiada memoria',
    ],
    why: 'Al terminar, un hijo queda en la tabla de procesos hasta que el padre recoge su estado con wait.',
  },
  {
    id: 'sig-sigusr',
    topic: 'señales',
    needs: { projects: MINITALK },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué dos señales se suelen usar en minitalk para mandar bits?',
          'Las señales de usuario libres para lo que quieras son…',
        ],
        right: ['SIGUSR1 y SIGUSR2'],
      },
      {
        ask: [
          '¿Con qué función se manda una señal a otro proceso?',
          'Para enviar SIGUSR1 al PID 1234 se usa…',
        ],
        right: ['kill', 'kill(1234, SIGUSR1)'],
        wrong: ['signal', 'raise', 'send'],
      },
    ],
    wrong: ['SIGINT y SIGQUIT', 'SIGKILL y SIGSTOP', 'SIGSEGV y SIGBUS', 'SIGALRM y SIGCHLD'],
    why: 'SIGUSR1 y SIGUSR2 no tienen significado fijo; kill no solo mata: manda cualquier señal.',
  },
  {
    id: 'sig-sigaction',
    topic: 'señales',
    needs: { projects: [...MINITALK, ...MINISHELL] },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué ofrece `sigaction` que no da `signal`?',
          '¿Por qué se prefiere sigaction a signal?',
        ],
        right: [
          'Comportamiento definido y más control (máscara, flags, quién la mandó)',
          'Saber el PID de quien manda la señal con SA_SIGINFO, entre otras cosas',
        ],
      },
      {
        ask: [
          '¿Qué dos señales no se pueden capturar ni ignorar?',
          'No hay manejador posible para…',
        ],
        right: ['SIGKILL y SIGSTOP'],
        wrong: ['SIGUSR1 y SIGUSR2', 'SIGINT y SIGQUIT', 'SIGTERM y SIGHUP'],
      },
    ],
    wrong: ['Es más rápido', 'Funciona en Windows', 'Manda la señal dos veces'],
    why: 'signal varía entre sistemas; sigaction fija el comportamiento y da información; SIGKILL y SIGSTOP no se capturan nunca.',
  },
  {
    id: 'sig-bits',
    topic: 'señales',
    needs: { projects: MINITALK },
    kind: 'long',
    level: 3,
    forms: [
      {
        ask: [
          'Mandando un bit por señal, ¿cuántas señales hacen falta para enviar «Hi»?',
          'Si cada señal es un bit, ¿cuántas señales cuesta mandar 2 caracteres ASCII?',
        ],
        right: ['16', 'Dieciséis'],
      },
      {
        ask: [
          '¿Cuántas señales hacen falta para mandar un carácter, a bit por señal?',
          'Un char, bit a bit, son…',
        ],
        right: ['8', 'Ocho'],
        wrong: ['16'],
      },
    ],
    wrong: ['2', '4', '32', '7'],
    why: 'Un char son 8 bits: con un bit por señal, 8 señales por carácter.',
  },
  {
    id: 'sh-quotes',
    topic: 'shell',
    needs: { projects: MINISHELL },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: ["¿Qué imprime `echo '$HOME'`?", 'Entre comillas simples, `$HOME`…'],
        right: ['$HOME, tal cual', 'El texto $HOME sin expandir'],
      },
      {
        ask: ['¿Qué imprime `echo "$HOME"`?', 'Entre comillas dobles, `$HOME`…'],
        right: ['La ruta de tu carpeta personal', 'Se expande a su valor'],
        wrong: ['$HOME, tal cual'],
      },
    ],
    wrong: ['Un error de sintaxis', 'Nada', 'HOME'],
    why: 'Las simples lo dejan todo literal; las dobles dejan expandir variables.',
  },
  {
    id: 'sh-heredoc',
    topic: 'shell',
    needs: { projects: MINISHELL },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué hace `cat << FIN`?', 'Un heredoc (`<<`) sirve para…'],
        right: [
          'Lee líneas de la entrada hasta una que diga FIN y se las pasa a cat',
          'Pasar a la orden un texto escrito hasta el delimitador',
        ],
      },
    ],
    wrong: [
      'Añade FIN al final de un fichero',
      'Redirige la salida a un fichero llamado FIN',
      'Lee el fichero FIN',
      'Compara cat con FIN',
    ],
    why: 'El heredoc recoge líneas hasta el delimitador y las da como entrada estándar de la orden.',
  },
  {
    id: 'sh-exit-codes',
    topic: 'shell',
    needs: { projects: MINISHELL },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué código de salida da bash si la orden no existe?',
          '`orden_que_no_existe; echo $?` imprime…',
        ],
        right: ['127'],
      },
      {
        ask: [
          '¿Qué código de salida da una orden interrumpida con Ctrl-C?',
          'Tras matar una orden con SIGINT, `$?` vale…',
        ],
        right: ['130', '128 + 2'],
        wrong: ['127'],
      },
    ],
    wrong: ['1', '0', '-1', '255', '2'],
    why: '127 es «no encontrada»; terminar por la señal N da 128 + N (SIGINT es 2: 130).',
  },
  {
    id: 'sh-builtin-cd',
    topic: 'shell',
    needs: { projects: MINISHELL },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Por qué `cd` tiene que ser un builtin de la shell?',
          'cd no puede ser un programa aparte porque…',
        ],
        right: [
          'Un proceso hijo no puede cambiar el directorio del padre',
          'Cambiaría el directorio de un hijo que muere enseguida, no el de la shell',
        ],
      },
    ],
    wrong: [
      'Por rapidez',
      'Porque no existe /bin/cd',
      'Porque necesita permisos de root',
      'Por compatibilidad con Windows',
    ],
    why: 'El directorio actual es de cada proceso: solo la propia shell puede cambiar el suyo.',
  },
  {
    id: 'sh-env-path',
    topic: 'shell',
    needs: { projects: [...MINISHELL, ...PIPEX] },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Para qué usa la shell la variable PATH?',
          'Al escribir `ls`, ¿cómo encuentra la shell el programa?',
        ],
        right: [
          'Busca el programa en las carpetas que lista PATH',
          'Recorre las carpetas de PATH, en orden',
        ],
      },
    ],
    wrong: [
      'Lo busca en todo el disco',
      'Solo mira la carpeta actual',
      'Lo descarga',
      'Mira en /etc/programs',
    ],
    why: 'PATH es una lista de carpetas separadas por «:»; se prueba cada una hasta encontrar un ejecutable con ese nombre.',
  },
]
