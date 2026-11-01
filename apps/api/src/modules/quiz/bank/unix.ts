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
        right: ['Ejecuta la orden como root', 'Ejecuta la orden con permisos de root'],
        wrong: [
          'Cambia de shell para esa orden',
          'Apaga la máquina de forma segura',
          'Lista los procesos de root',
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
    wrong: [
      'Cambia de shell para esa orden',
      'Apaga la máquina de forma segura',
      'Lista los procesos de root',
    ],
    why: 'sudo ejecuta como otro usuario (root, si no se dice otro) según las reglas de /etc/sudoers, que se editan con visudo para no romperlo.',
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
        right: ['Decide qué conexiones se permiten', 'Filtra el tráfico de red con reglas'],
        wrong: [
          'Cifra el disco y las particiones',
          'Gestiona usuarios y sus contraseñas',
          'Cifra el tráfico que sale de la red',
          'Acelera la red guardando caché',
        ],
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
    wrong: [
      'Cifra el disco y las particiones',
      'Gestiona usuarios y sus contraseñas',
      'Acelera la red guardando caché',
    ],
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
          'Redimensionar volúmenes sin reparticionar',
          'Juntar varios discos en un mismo grupo',
        ],
      },
    ],
    // LVM no cifra: en Born2beroot el cifrado lo pone LUKS, por debajo.
    wrong: [
      'Hacer el disco más rápido al leer',
      'Cifrar los datos del disco entero',
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
          '¿Qué fichero guarda los hashes de las contraseñas de los usuarios?',
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
        right: ['No se ejecutan: execve no vuelve', 'Nunca llegan a ejecutarse'],
        wrong: [
          'Se ejecutan al terminar el nuevo programa',
          'Se ejecutan en un hilo aparte, a la vez',
          'Se ejecutan en el padre, no en el hijo',
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
      'Se ejecutan en un hilo aparte, a la vez',
      'Se ejecutan en el padre, no en el hijo',
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
          'Hace que el fd 1 apunte a lo mismo que fd',
          'Redirige la salida estándar hacia fd',
        ],
      },
    ],
    wrong: [
      'Copia el contenido del fichero en la salida',
      'Cierra fd y abre uno nuevo',
      'Duplica el proceso, como hace fork',
      'Escribe el número fd en la salida',
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
          'El padre no cierra fd[1]: wc no ve el EOF',
          'El padre deja abierto fd[1], y wc espera',
        ],
      },
    ],
    wrong: [
      'Falta un tercer fork para el padre',
      'ls escribe en stderr, no en el pipe',
      'wait solo espera a un hijo, no a dos',
      'dup2 tiene los argumentos al revés',
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
          'Ha terminado y su padre no ha hecho wait',
          'Ha muerto, pero nadie ha recogido su estado',
        ],
        // Nada de «no responde a señales»: un zombi tampoco muere con kill, sería medio verdad.
        wrong: [
          'Se ha quedado sin padre y lo adopta init',
          'Usa demasiada memoria y lo frena todo',
          'Está parado con SIGSTOP hasta un SIGCONT',
          'Sigue en marcha tras cerrar su terminal',
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
    wrong: [
      'Se ha quedado sin padre y lo adopta init',
      'Usa demasiada memoria y lo frena todo',
      'Está parado con SIGSTOP hasta un SIGCONT',
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
          'Saber qué PID la mandó, con SA_SIGINFO',
          'Un comportamiento igual en todos los sistemas',
        ],
        wrong: [
          'Atender la señal más rápido que signal',
          'Funcionar también en Windows',
          'Poder capturar también SIGKILL',
          'No perder señales aunque lleguen juntas',
        ],
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
    wrong: [
      'Atender la señal más rápido que signal',
      'Funcionar también en Windows',
      'Poder capturar también SIGKILL',
    ],
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
        ask: ["¿Qué imprime `echo '$HOME'`?", '¿Qué sale de `$HOME` entre comillas simples?'],
        right: ['$HOME, tal cual, sin expandir'],
        wrong: [
          'La ruta de tu carpeta personal',
          'La palabra HOME, sin el dólar',
          'Una línea vacía, sin nada',
          'Un error de sintaxis por el $',
        ],
      },
      {
        ask: [
          '¿Qué imprime `echo "$HOME"`?',
          'Entre comillas dobles, ¿en qué se convierte `$HOME`?',
        ],
        right: ['La ruta de tu carpeta personal'],
        wrong: [
          '$HOME, tal cual, sin expandir',
          'La palabra HOME, sin el dólar',
          '"$HOME", con las comillas',
          'Un error de sintaxis por el $',
        ],
      },
    ],
    wrong: [
      'La palabra HOME, sin el dólar',
      'Un error de sintaxis por el $',
      'Una línea vacía, sin nada',
    ],
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
          'Da a cat las líneas que escribas hasta FIN',
          'Pasa como entrada el texto hasta el delimitador',
        ],
      },
    ],
    wrong: [
      'Añade FIN al final de un fichero',
      'Redirige la salida de cat a un fichero FIN',
      'Lee el contenido de un fichero llamado FIN',
      'Compara la salida de cat con la palabra FIN',
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
          'Un hijo no puede cambiar el directorio del padre',
          'Cambiaría el directorio de un hijo, no el de la shell',
        ],
      },
    ],
    wrong: [
      'Porque necesita permisos de root para entrar',
      'Por compatibilidad con la shell de Windows',
      'Porque el núcleo no deja ejecutar /bin/cd',
      'Porque así lo exige la norma de 42',
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
          '¿Cómo usa la shell PATH al escribir una orden sin ruta?',
          'Al escribir `ls`, ¿cómo encuentra la shell el programa?',
        ],
        right: [
          'Lo busca en cada carpeta de PATH, en orden',
          'Prueba las carpetas de PATH hasta dar con él',
        ],
      },
    ],
    wrong: [
      'Lo busca en todo el disco, carpeta a carpeta',
      'Solo lo busca en la carpeta actual',
      'Lo busca en /bin y en ningún otro sitio',
      'Lo busca en la lista de /etc/programs',
    ],
    why: 'PATH es una lista de carpetas separadas por «:»; se prueba cada una hasta encontrar un ejecutable con ese nombre.',
  },
  {
    id: 'b2br-groups-host',
    topic: 'sistema',
    needs: { projects: B2BR },
    kind: 'quick',
    level: 1,
    forms: [
      {
        ask: [
          'En Born2beroot, ¿a qué grupos tiene que pertenecer tu usuario?',
          '¿En qué dos grupos pide el enunciado de Born2beroot que esté tu usuario?',
        ],
        right: ['user42 y sudo'],
        wrong: ['root y sudo', 'user42 y root', 'users y adm', 'admin y user42'],
      },
      {
        ask: [
          '¿Qué nombre de máquina (hostname) pide Born2beroot?',
          'El hostname de tu máquina de Born2beroot tiene que ser…',
        ],
        right: ['Tu login seguido de 42'],
        wrong: [
          'born2beroot, sin más',
          'Tu login en mayúsculas',
          'debian seguido de 42',
          'Tu login seguido de 4242',
        ],
      },
      {
        ask: [
          '¿Qué orden mete a la usuaria ana en el grupo user42 sin quitarle los demás?',
          'Para añadir a ana al grupo user42 conservando sus otros grupos se usa…',
        ],
        right: ['usermod -aG user42 ana'],
        wrong: ['groupadd user42 ana', 'chgrp user42 ana', 'useradd -g user42 ana'],
      },
    ],
    wrong: ['root y sudo', 'user42 y root', 'users y adm'],
    why: 'El enunciado pide un usuario con tu login en los grupos user42 y sudo y una máquina que se llame como tu login acabado en 42; usermod -aG añade un grupo sin quitar los que ya hay.',
  },
  {
    id: 'b2br-hardening',
    topic: 'sistema',
    needs: { projects: B2BR },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué línea de sshd_config impide entrar por SSH como root?',
          'Para que nadie pueda conectarse por SSH como root, en sshd_config pones…',
        ],
        right: ['`PermitRootLogin no`'],
        wrong: [
          '`AllowRoot no`',
          '`RootLogin disabled`',
          '`PasswordAuthentication no`',
          '`DenyGroups sudo`',
        ],
      },
      {
        ask: [
          '¿Qué hace AppArmor, que Born2beroot pide activo desde el arranque?',
          '¿Para qué sirve AppArmor en Debian?',
        ],
        right: ['Limita lo que puede hacer cada programa'],
        wrong: [
          'Cifra las particiones del disco',
          'Filtra el tráfico de red por puertos',
          'Obliga a usar contraseñas seguras',
          'Lanza tareas a horas fijas',
        ],
      },
    ],
    wrong: [
      'Cifra las particiones del disco',
      'Filtra el tráfico de red por puertos',
      'Obliga a usar contraseñas seguras',
    ],
    why: 'PermitRootLogin no cierra SSH a root (sin contraseña ni clave); AppArmor encierra cada programa en un perfil con lo que puede tocar.',
  },
  {
    id: 'b2br-password',
    topic: 'sistema',
    needs: { projects: B2BR },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿En qué fichero se fija PASS_MAX_DAYS para los usuarios que se creen?',
          'La caducidad por defecto de las contraseñas de los usuarios nuevos se fija en…',
        ],
        right: ['/etc/login.defs'],
        wrong: ['/etc/passwd', '/etc/sudoers', '/etc/pam.d/sshd', '/etc/security/limits.conf'],
      },
      {
        ask: [
          '¿Qué módulo de PAM impone longitud, mayúsculas y cifras en las contraseñas?',
          'La política de contraseñas fuertes de Born2beroot se configura con…',
        ],
        right: ['pam_pwquality'],
        wrong: ['pam_limits', 'pam_env', 'pam_motd', 'pam_faildelay'],
      },
      {
        ask: [
          '¿Qué longitud mínima de contraseña pide Born2beroot?',
          '¿Cuántos caracteres tiene que tener, como mínimo, una contraseña en Born2beroot?',
        ],
        right: ['10'],
        wrong: ['8', '12', '6', '16'],
      },
    ],
    wrong: ['/etc/passwd', '/etc/sudoers', '/etc/hosts'],
    why: 'login.defs da la caducidad a los usuarios nuevos (a los que ya existen se les cambia con chage) y pam_pwquality exige al menos 10 caracteres con mayúscula, minúscula y cifra.',
  },
  {
    id: 'b2br-monitoring',
    topic: 'sistema',
    needs: { projects: B2BR },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Cada cuánto tiene que mostrar monitoring.sh su información?',
          'Desde el arranque, monitoring.sh vuelve a enseñar sus datos cada…',
        ],
        right: ['10 min'],
        wrong: ['5 min', '15 min', '30 min', '60 min'],
      },
      {
        ask: [
          '¿Qué servicio lanza monitoring.sh cada pocos minutos?',
          'Para ejecutar monitoring.sh de forma periódica se usa…',
        ],
        right: ['cron'],
        wrong: ['at', 'sudo', 'ufw', 'apt'],
      },
      {
        ask: [
          '¿Con qué orden escribe monitoring.sh en todas las terminales?',
          'Para que el mensaje salga en la terminal de todos los usuarios se usa…',
        ],
        right: ['wall'],
        wrong: ['echo', 'write', 'printf', 'cat'],
      },
    ],
    wrong: ['sudo', 'ufw', 'echo'],
    why: 'cron lanza el script cada 10 minutos y wall manda lo que escribe a todas las terminales abiertas.',
  },
  {
    id: 'pipex-equivalent',
    topic: 'procesos',
    needs: { projects: PIPEX },
    kind: 'long',
    level: 2,
    forms: [
      {
        ask: [
          '¿A qué orden de shell equivale `./pipex infile "grep a" "wc -l" outfile`?',
          'Según el enunciado, `./pipex infile "grep a" "wc -l" outfile` hace lo mismo que…',
        ],
        right: ['`grep a < infile | wc -l > outfile`'],
        wrong: [
          '`grep a > infile | wc -l < outfile`',
          '`grep a < infile > outfile | wc -l`',
          '`wc -l < infile | grep a > outfile`',
          '`grep a < outfile | wc -l > infile`',
        ],
      },
      {
        ask: [
          'En el bonus, ¿a qué equivale `./pipex here_doc FIN cat "wc -l" outfile`?',
          'Con here_doc, `./pipex here_doc FIN cat "wc -l" outfile` hace lo mismo que…',
        ],
        right: ['`cat << FIN | wc -l >> outfile`'],
        wrong: [
          '`cat << FIN | wc -l > outfile`',
          '`cat < FIN | wc -l >> outfile`',
          '`cat <<< FIN | wc -l >> outfile`',
        ],
      },
    ],
    wrong: [
      '`grep a > infile | wc -l < outfile`',
      '`grep a < infile > outfile | wc -l`',
      '`wc -l < infile | grep a > outfile`',
    ],
    why: 'pipex hace de `< infile cmd1 | cmd2 > outfile`; con here_doc lee hasta el delimitador y añade al final con >>, como `cmd << LIMITER | cmd1 >> file`.',
  },
  {
    id: 'pipex-path',
    topic: 'procesos',
    needs: { projects: PIPEX },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué comprueba `access(ruta, X_OK)` en pipex?',
          'Antes de llamar a execve, ¿qué mira `access` con X_OK?',
        ],
        right: ['Si esa ruta existe y se puede ejecutar'],
        wrong: [
          'Si el fichero ya está abierto por otro',
          'Si el comando está en la variable PATH',
          'Si tienes permiso de root para lanzarlo',
          'Si el programa ha terminado bien',
        ],
      },
      {
        ask: [
          'Con el comando `ls` a secas, ¿de dónde saca pipex las carpetas donde buscarlo?',
          'Para encontrar `wc` sin ruta, ¿de dónde saca pipex la lista de carpetas?',
        ],
        right: ['De la línea PATH= de envp'],
        wrong: [
          'Del fichero /etc/programs',
          'De la carpeta actual, y nada más',
          'De argv[0], la ruta de pipex',
          'De una lista fija dentro de execve',
        ],
      },
    ],
    wrong: [
      'Si el fichero ya está abierto por otro',
      'Si tienes permiso de root para lanzarlo',
      'Si el programa ha terminado bien',
    ],
    why: 'execve no busca en PATH: pipex parte la línea PATH= de envp por «:», pega el nombre a cada carpeta y usa access con X_OK para dar con la que se puede ejecutar.',
  },
  {
    id: 'pipex-wait',
    topic: 'procesos',
    needs: { projects: PIPEX },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          'En la shell, ¿qué código de salida da `< in cmd1 | cmd2 > out`?',
          '¿De qué comando es el código de salida de una tubería `cmd1 | cmd2`?',
        ],
        right: ['El de cmd2, el último comando'],
        wrong: [
          'El de cmd1, el primer comando',
          'El mayor de los dos códigos',
          'La suma de los dos códigos',
          'El de cmd1 si ha fallado',
        ],
      },
      {
        ask: [
          '¿Qué macro saca el código de salida del status que llena `waitpid`?',
          'Tras `waitpid(pid, &status, 0)`, el código con que salió el hijo se lee con…',
        ],
        right: ['`WEXITSTATUS(status)`'],
        wrong: ['`WIFEXITED(status)`', '`WTERMSIG(status)`', '`WSTOPSIG(status)`', '`status >> 4`'],
      },
    ],
    wrong: [
      'El de cmd1, el primer comando',
      'El mayor de los dos códigos',
      'La suma de los dos códigos',
    ],
    why: 'La shell devuelve el código del último comando de la tubería; waitpid lo deja codificado en status y WEXITSTATUS lo saca (WIFEXITED solo dice si salió normalmente).',
  },
  {
    id: 'talk-pid',
    topic: 'señales',
    needs: { projects: MINITALK },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Cómo sabe el cliente de minitalk a qué proceso mandar las señales?',
          '¿Cómo encuentra el cliente de minitalk al servidor?',
        ],
        right: ['Se le pasa el PID que imprime el servidor'],
        wrong: [
          'Lo busca por su nombre con la orden ps',
          'Lo lee de un fichero que crea el servidor',
          'Manda las señales a todos los procesos',
          'Usa getpid(), que da el del servidor',
        ],
      },
      {
        ask: [
          '¿Qué función usa el servidor de minitalk para saber su propio PID?',
          'Para imprimir su PID al arrancar, el servidor llama a…',
        ],
        right: ['getpid'],
        wrong: ['getppid', 'kill', 'pause', 'sigaction'],
      },
      {
        ask: [
          'En el bonus, ¿de dónde saca el servidor el PID del cliente al que confirma?',
          'Para mandarle la confirmación, ¿de dónde saca el servidor el PID del cliente?',
        ],
        right: ['Del si_pid que da sigaction con SA_SIGINFO'],
        wrong: [
          'De getppid(): el cliente es su padre',
          'De getpid(), que da el del cliente',
          'Del número de la señal que recibe',
        ],
      },
    ],
    wrong: [
      'Lo busca por su nombre con la orden ps',
      'Lo lee de un fichero que crea el servidor',
      'Manda las señales a todos los procesos',
    ],
    why: 'El servidor imprime su PID con getpid y se lo pasas al cliente; en el bonus, sigaction con SA_SIGINFO le da en si_pid quién mandó la señal.',
  },
  {
    id: 'talk-ack',
    topic: 'señales',
    needs: { projects: MINITALK },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Por qué el cliente de minitalk no puede mandar las señales todas seguidas, sin esperar?',
          '¿Qué falla si el cliente manda señales más rápido de lo que el servidor las atiende?',
        ],
        right: ['Las pendientes iguales se juntan y se pierden'],
        wrong: [
          'El núcleo solo deja mandar una por segundo',
          'kill falla si el servidor está ocupado',
          'SIGUSR1 y SIGUSR2 se anulan entre sí',
          'El servidor se cierra si recibe muchas',
        ],
      },
      {
        ask: [
          'En el bonus de minitalk, ¿qué hace el servidor al recibir un mensaje?',
          '¿Cómo confirma el servidor del bonus que ha recibido un mensaje?',
        ],
        right: ['Manda una señal de vuelta al cliente'],
        wrong: [
          'Escribe el PID del cliente en un fichero',
          'Se cierra hasta que lo vuelvan a lanzar',
          'Le responde por una tubería con un OK',
          'Imprime el mensaje dos veces seguidas',
        ],
      },
    ],
    wrong: [
      'El núcleo solo deja mandar una por segundo',
      'kill falla si el servidor está ocupado',
      'SIGUSR1 y SIGUSR2 se anulan entre sí',
    ],
    why: 'Una señal estándar no se encola: si llega otra igual antes de atender la primera, se pierde; por eso el cliente espera, y en el bonus el servidor confirma con una señal.',
  },
  {
    id: 'talk-unicode',
    topic: 'señales',
    needs: { projects: MINITALK },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Por qué minitalk, que manda bytes bit a bit, sirve ya para texto en UTF-8?',
          'Con un bit por señal, ¿por qué llegan bien letras como «ñ» o «€»?',
        ],
        right: ['Porque UTF-8 son bytes y se mandan igual'],
        wrong: [
          'Porque cada señal lleva un carácter entero',
          'Porque SIGUSR2 se usa para las letras raras',
          'Porque write convierte los bytes a ASCII',
          'Porque la terminal adivina la letra que falta',
        ],
      },
      {
        ask: ['A bit por señal, ¿cuántas señales cuesta mandar «ñ» en UTF-8?'],
        right: ['16'],
        wrong: ['8', '1', '32', '2'],
      },
      {
        ask: ['Mandando un bit por señal, ¿cuántas señales hacen falta para «€» en UTF-8?'],
        right: ['24'],
        wrong: ['8', '16', '32', '3'],
      },
    ],
    wrong: ['4', '12', '64'],
    why: 'UTF-8 escribe cada carácter con 1 a 4 bytes: el servidor junta los bytes y write los imprime; la «ñ» son 2 bytes (16 señales) y el «€», 3 (24).',
  },
  {
    id: 'msh-signals',
    topic: 'señales',
    needs: { projects: MINISHELL },
    kind: 'quick',
    level: 3,
    forms: [
      {
        ask: [
          '¿Qué puede guardar la única variable global que permite minishell?',
          '¿Qué deja guardar el enunciado de minishell en su variable global?',
        ],
        right: ['El número de la señal recibida, nada más'],
        wrong: [
          'Todo el estado de la shell, en una struct',
          'La lista de variables de entorno',
          'El último código de salida, el de $?',
          'El historial de órdenes escritas',
        ],
      },
      {
        ask: [
          '¿Qué hace minishell con Ctrl-C en el prompt, sin nada en marcha?',
          'Pulsas Ctrl-C en el prompt vacío de minishell. ¿Qué pasa?',
        ],
        right: ['Muestra un prompt nuevo en otra línea'],
        wrong: [
          'Cierra la minishell, igual que exit',
          'Borra la pantalla y deja el prompt arriba',
          'Repite la última orden del historial',
          'No hace nada: lo ignora como Ctrl-\\',
        ],
      },
      {
        ask: [
          'En bash, ¿cuánto vale `$?` después de pulsar Ctrl-C en el prompt?',
          'Tras un Ctrl-C en el prompt de bash, `echo $?` imprime…',
        ],
        right: ['130'],
        wrong: ['0', '1', '2', '127'],
      },
    ],
    wrong: [
      'Cierra la minishell, igual que exit',
      'Borra la pantalla y deja el prompt arriba',
      'Repite la última orden del historial',
    ],
    why: 'La global solo guarda el número de la señal (lo demás va en tus structs); Ctrl-C saca un prompt nuevo en otra línea y bash pone $? a 130 (128 + SIGINT).',
  },
  {
    id: 'msh-readline',
    topic: 'shell',
    needs: { projects: MINISHELL },
    kind: 'quick',
    level: 2,
    forms: [
      {
        ask: [
          '¿Qué hace Ctrl-D en el prompt vacío de minishell?',
          'Pulsas Ctrl-D sin haber escrito nada en minishell. ¿Qué pasa?',
        ],
        right: ['Sale de la minishell, como exit'],
        wrong: [
          'Muestra un prompt nuevo en otra línea',
          'Borra la última letra que escribiste',
          'Manda SIGQUIT y deja un volcado',
          'Nada: solo cuentan Ctrl-C y Ctrl-\\',
        ],
      },
      {
        ask: [
          '¿Qué devuelve `readline` si se pulsa Ctrl-D en una línea vacía?',
          'Al llegar al fin de la entrada, readline devuelve…',
        ],
        right: ['`NULL`'],
        wrong: ['`""`', '`"\\n"`', '`EOF`'],
      },
      {
        ask: [
          '¿Qué función guarda una línea en el historial de readline?',
          'Para que la flecha arriba recupere lo que escribiste, llamas a…',
        ],
        right: ['add_history'],
        wrong: ['rl_on_new_line', 'rl_redisplay', 'rl_replace_line'],
      },
    ],
    wrong: [
      'Muestra un prompt nuevo en otra línea',
      'Borra la última letra que escribiste',
      'Manda SIGQUIT y deja un volcado',
    ],
    why: 'Con la línea vacía, Ctrl-D es fin de entrada: readline devuelve NULL y minishell sale; add_history guarda cada línea para las flechas.',
  },
  {
    id: 'msh-env-expand',
    topic: 'shell',
    needs: { projects: MINISHELL },
    kind: 'long',
    level: 4,
    forms: [
      {
        ask: [
          'En bash, ¿qué hace `export VAR` sin `=` si VAR no existía?',
          'Con VAR sin definir, ¿qué consigue `export VAR` en bash?',
        ],
        right: ['La marca para exportar, sin darle valor'],
        wrong: [
          'La crea vacía, y env la muestra como VAR=',
          'Da un error porque le falta el =',
          'La borra del entorno, como unset',
          'Imprime el valor que tiene VAR',
        ],
      },
      {
        ask: [
          'En bash, ¿qué pasa con `echo hola > $NADA` si NADA no está definida?',
          'Si `$NADA` está vacía, ¿qué hace bash con `echo hola > $NADA`?',
        ],
        right: ['Da error: redirección ambigua'],
        wrong: [
          'Escribe hola en un fichero llamado $NADA',
          'Escribe hola en la pantalla, sin más',
          'Crea un fichero vacío sin nombre',
          'Escribe hola en un fichero llamado NADA',
        ],
      },
      {
        ask: [
          'Si USER vale ana, ¿qué imprime `echo "$USER"\'$USER\'`?',
          'Con USER=ana, la orden `echo "$USER"\'$USER\'` imprime…',
        ],
        right: ['ana$USER'],
        wrong: ['anaana', '$USER$USER', "ana'$USER'", '$USERana'],
      },
    ],
    wrong: [
      'Da un error porque le falta el =',
      'La borra del entorno, como unset',
      'Imprime el valor que tiene VAR',
    ],
    why: 'export VAR sin valor solo la marca (sale en export, no en env); redirigir a una variable vacía sin comillas es ambiguo; y entre comillas simples $USER no se expande.',
  },
]
