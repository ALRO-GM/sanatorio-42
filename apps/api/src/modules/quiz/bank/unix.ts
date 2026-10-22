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
        ask: ['¿Para qué sirve `sudo`?', '¿Qué hace `sudo orden`?'],
        right: [
          'Ejecuta la orden con los permisos de otro usuario (normalmente root)',
          'Ejecuta la orden como root, si tienes permiso',
        ],
        wrong: [
          'Cambia de shell',
          'Apaga la máquina',
          'Lista los procesos',
          'Instala paquetes, y nada más',
        ],
      },
      {
        ask: [
          '¿En qué fichero se configura quién puede usar sudo?',
          '¿Dónde están las reglas de sudo que se editan con visudo?',
        ],
        right: ['/etc/sudoers'],
        wrong: ['/etc/passwd', '/etc/shadow', '~/.bashrc'],
      },
    ],
    wrong: ['Cambia de shell', 'Apaga la máquina', 'Lista los procesos'],
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
        ask: ['¿En qué puerto escucha SSH por defecto?', '¿Cuál es el puerto estándar de SSH?'],
        right: ['22'],
        wrong: ['21', '80', '443', '4242', '23'],
      },
      {
        ask: [
          '¿Qué fichero configura el servidor SSH?',
          'Para cambiar el puerto del servidor SSH se edita…',
        ],
        right: ['/etc/ssh/sshd_config'],
        wrong: ['/etc/ssh/ssh_config', '~/.ssh/known_hosts', '/etc/hosts'],
      },
    ],
    wrong: ['21', '80', '443', '4242'],
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
        ask: ['¿Qué hace un cortafuegos como UFW?', '¿Para qué sirve UFW?'],
        right: [
          'Decide qué conexiones de red se permiten y cuáles no',
          'Filtra el tráfico de red por puertos y reglas',
        ],
        wrong: ['Cifra el disco', 'Gestiona usuarios', 'Comprime ficheros', 'Acelera la red'],
      },
      {
        ask: [
          '¿Qué orden de UFW deja pasar conexiones al puerto 4242?',
          'Para abrir el puerto 4242 en UFW se usa…',
        ],
        right: ['ufw allow 4242'],
        wrong: ['ufw open 4242', 'ufw enable 4242', 'ufw deny 4242'],
      },
    ],
    wrong: ['Cifra el disco', 'Gestiona usuarios', 'Comprime ficheros'],
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
        ask: [
          '¿Qué ventaja tiene LVM frente a las particiones normales?',
          '¿Qué permite hacer LVM?',
        ],
        right: [
          'Crear volúmenes lógicos y cambiarlos de tamaño con flexibilidad',
          'Juntar discos y redimensionar volúmenes sin reparticionar',
        ],
      },
    ],
    wrong: [
      'Hacer el disco más rápido',
      'Cifrar los datos',
      'Prescindir del sistema de ficheros',
      'Hacer copias de seguridad automáticas',
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
          '¿En qué fichero están las contraseñas (cifradas) de los usuarios?',
        ],
        right: ['/etc/shadow'],
        wrong: ['/etc/passwd', '/etc/group', '/etc/sudoers', '/var/log/auth.log'],
      },
      {
        ask: [
          '¿Qué fichero lista los usuarios, su shell y su carpeta?',
          '¿En qué fichero aparece cada usuario con su uid y su shell?',
        ],
        right: ['/etc/passwd'],
        wrong: ['/etc/shadow', '/etc/group', '/etc/sudoers', '/etc/hosts'],
      },
    ],
    wrong: ['/etc/group', '/etc/sudoers', '/var/log/auth.log'],
    why: '/etc/passwd lo lee cualquiera (usuarios); los hashes van aparte, en /etc/shadow, que solo lee root.',
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
        wrong: ['-1', '1', '2'],
      },
      {
        ask: ['¿Qué devuelve `fork()` en el proceso padre?', 'En el padre, fork devuelve…'],
        right: ['El PID del hijo'],
        wrong: ['El PID del padre', 'Siempre -1', 'Nada: no vuelve'],
      },
    ],
    wrong: ['El PID del padre', 'Siempre -1', 'Nada: no vuelve'],
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
        right: ['4'],
      },
      {
        ask: [
          '¿Cuántos procesos hay en total al llegar al printf?',
          'Contando el original, ¿cuántos procesos ejecutan el printf?',
        ],
        right: ['4'],
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
          'Si execve tiene éxito, ¿qué pasa con las líneas que lo siguen?',
        ],
        right: [
          'No se ejecutan nunca: el proceso pasa a ser el nuevo programa',
          'Nada: el proceso se sustituye y execve no vuelve',
        ],
        wrong: [
          'Se ejecutan al terminar el nuevo programa',
          'Se ejecutan en un hilo aparte',
          'Se ejecutan en el padre',
        ],
      },
      {
        ask: [
          '¿Qué devuelve `execve` si falla?',
          'Cuando execve no puede ejecutar el programa, devuelve…',
        ],
        right: ['-1'],
        wrong: ['0', '1', '127'],
      },
    ],
    wrong: [
      'Se ejecutan al terminar el nuevo programa',
      'Se ejecutan en un hilo aparte',
      'Se ejecutan en el padre',
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
          'Después de `pipe(fd)`, ¿por qué extremo se escribe?',
          'En un pipe, ¿cuál es el extremo de escritura?',
        ],
        right: ['fd[1]'],
        wrong: ['fd[0]', 'fd[2]', 'fd[-1]'],
      },
      {
        ask: [
          'Después de `pipe(fd)`, ¿por qué extremo se lee?',
          'En un pipe, ¿cuál es el extremo de lectura?',
        ],
        right: ['fd[0]'],
        wrong: ['fd[1]', 'fd[2]', 'fd[-1]'],
      },
    ],
    wrong: ['fd[2]', 'fd[-1]', 'fd[3]'],
    why: 'pipe llena dos descriptores: fd[0] para leer y fd[1] para escribir (como stdin es 0 y stdout es 1).',
  },
  {
    id: 'proc-dup2',
    topic: 'procesos',
    needs: { projects: PROCESSES },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué hace `dup2(fd, 1)`?', '¿Para qué sirve `dup2(fd, STDOUT_FILENO)`?'],
        right: [
          'Hace que el descriptor 1 apunte a lo mismo que fd',
          'Redirige la salida estándar a donde apunta fd',
        ],
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
          'El padre deja abierto un extremo de escritura, así que wc espera para siempre',
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
    why: 'Un lector solo ve el fin de fichero cuando todos los extremos de escritura están cerrados, también el que heredó el padre.',
  },
  {
    id: 'proc-zombie',
    topic: 'procesos',
    needs: { projects: PROCESSES },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué es un proceso zombi?', '¿Cuándo se dice que un proceso es zombi?'],
        right: [
          'Ha terminado, pero su padre aún no ha recogido su estado',
          'Está muerto y espera a que su padre haga wait',
        ],
        wrong: [
          'No responde a señales',
          'Se ha quedado sin padre',
          'Usa demasiada memoria',
          'Está parado con SIGSTOP',
        ],
      },
      {
        ask: ['Un hijo que ha terminado y por el que el padre aún no ha hecho wait se llama…'],
        right: ['Zombi'],
        wrong: ['Huérfano', 'Demonio', 'Colgado'],
      },
      {
        ask: [
          '¿Cómo se evita dejar zombis?',
          'Para que un hijo terminado no se quede como zombi, el padre debe…',
        ],
        right: ['Hacer wait o waitpid por él'],
        wrong: ['Matarlo con kill', 'Hacer otro fork', 'Esperar con sleep a que desaparezca'],
      },
    ],
    wrong: ['No responde a señales', 'Se ha quedado sin padre', 'Usa demasiada memoria'],
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
          '¿Qué señales quedan libres para lo que quiera cada programa?',
        ],
        right: ['SIGUSR1 y SIGUSR2'],
        wrong: ['SIGINT y SIGQUIT', 'SIGKILL y SIGSTOP', 'SIGSEGV y SIGBUS', 'SIGALRM y SIGCHLD'],
      },
      {
        ask: [
          '¿Con qué función se manda una señal a otro proceso?',
          'Para enviar SIGUSR1 a otro proceso por su PID se usa…',
        ],
        right: ['kill'],
        wrong: ['signal', 'raise', 'send', 'sigaction'],
      },
    ],
    wrong: ['SIGINT y SIGQUIT', 'SIGKILL y SIGSTOP', 'SIGSEGV y SIGBUS'],
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
          'Que con SA_SIGINFO se sabe el PID de quien manda la señal, entre otras cosas',
        ],
        wrong: ['Que es más rápida', 'Que funciona en Windows', 'Que manda la señal dos veces'],
      },
      {
        ask: [
          '¿Qué dos señales no se pueden capturar ni ignorar?',
          '¿Para qué señales no hay manejador posible?',
        ],
        right: ['SIGKILL y SIGSTOP'],
        wrong: ['SIGUSR1 y SIGUSR2', 'SIGINT y SIGQUIT', 'SIGTERM y SIGHUP'],
      },
    ],
    wrong: ['Que es más rápida', 'Que funciona en Windows', 'Que manda la señal dos veces'],
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
        right: ['16'],
        wrong: ['2', '8', '32', '14'],
      },
      {
        ask: [
          '¿Cuántas señales hacen falta para mandar un carácter, a bit por señal?',
          'Bit a bit, ¿cuántas señales es un char?',
        ],
        right: ['8'],
        wrong: ['16', '1', '4', '7'],
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
        ask: ["¿Qué imprime `echo '$HOME'`?", '¿Qué pasa con `$HOME` entre comillas simples?'],
        right: ['$HOME, tal cual, sin expandir'],
        wrong: ['La ruta de tu carpeta personal', 'Un error de sintaxis', 'Nada', 'HOME'],
      },
      {
        ask: ['¿Qué imprime `echo "$HOME"`?', '¿Qué pasa con `$HOME` entre comillas dobles?'],
        right: ['Se expande: sale la ruta de tu carpeta personal'],
        wrong: ['$HOME, tal cual, sin expandir', 'Un error de sintaxis', 'Nada', 'HOME'],
      },
    ],
    wrong: ['Un error de sintaxis', 'Nada', 'HOME'],
    why: 'Las comillas simples lo dejan todo literal; las dobles dejan expandir variables.',
  },
  {
    id: 'sh-heredoc',
    topic: 'shell',
    needs: { projects: MINISHELL },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: ['¿Qué hace `cat << FIN`?', '¿Para qué sirve un heredoc (`<< FIN`)?'],
        right: [
          'Lee líneas hasta una que diga FIN y se las da a cat como entrada',
          'Pasa a la orden, como entrada, el texto escrito hasta el delimitador',
        ],
      },
    ],
    wrong: [
      'Añade FIN al final de un fichero',
      'Redirige la salida a un fichero llamado FIN',
      'Lee el fichero FIN',
      'Compara la salida de cat con FIN',
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
          '¿Qué imprime `orden_que_no_existe; echo $?`?',
        ],
        right: ['127'],
        wrong: ['1', '0', '126', '255'],
      },
      {
        ask: [
          '¿Qué código de salida da una orden interrumpida con Ctrl-C?',
          'Después de cortar una orden con SIGINT, ¿cuánto vale `$?`?',
        ],
        right: ['130'],
        wrong: ['127', '2', '1', '255'],
      },
    ],
    wrong: ['1', '0', '-1', '255', '2'],
    why: '127 es «orden no encontrada»; terminar por la señal N da 128 + N (SIGINT es la 2: 130).',
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
          '¿Por qué cd no puede ser un programa aparte?',
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
          'Lo busca en las carpetas de esa lista, en orden',
          'Prueba cada carpeta de la lista hasta dar con un ejecutable',
        ],
      },
    ],
    wrong: [
      'Lo busca en todo el disco',
      'Solo mira en la carpeta actual',
      'Lo descarga de internet',
      'Lo busca en /etc/programs',
    ],
    why: 'PATH es una lista de carpetas separadas por «:»; se prueba cada una hasta encontrar un ejecutable con ese nombre.',
  },
]
