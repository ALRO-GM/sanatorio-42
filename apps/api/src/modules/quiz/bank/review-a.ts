/**
 * Repaso de Not-games (1/2): para cada concepto, un título corto, qué es y un
 * ejemplo. Es lo que ve cada persona en su pestaña «Repaso» de lo que ha
 * fallado. Generales, C y Unix.
 */

import type { ReviewEntry } from './types.js'

export const REVIEW_A: Record<string, ReviewEntry> = {
  'gen-binary-8': {
    title: 'Binario a decimal',
    definition:
      'En binario cada cifra vale el doble que la de su derecha: 1, 2, 4, 8, 16… Para pasar a decimal se suman los valores de las posiciones que tienen un 1.',
    example: '1011 = 8 + 0 + 2 + 1 = 11. Y 1000 = 8.',
  },
  'gen-hex-ff': {
    title: 'Hexadecimal',
    definition:
      'Base 16: las cifras van de 0 a 9 y de A (10) a F (15). Cada cifra hexadecimal son exactamente 4 bits, por eso se usa tanto para escribir bytes.',
    example: '0xFF = 15 × 16 + 15 = 255 (un byte con todo a 1). 0x2A = 2 × 16 + 10 = 42.',
  },
  'gen-byte-bits': {
    title: 'Bits y bytes',
    definition:
      'Un bit es un 0 o un 1. Un byte son 8 bits, que dan 2⁸ = 256 combinaciones: de 0 a 255 sin signo, o de -128 a 127 con signo.',
    example: 'Un char ocupa 1 byte; un int suele ocupar 4 (32 bits).',
  },
  'gen-shift-left': {
    title: 'Desplazamiento de bits',
    definition:
      '`x << n` mueve los bits n posiciones a la izquierda (multiplica por 2ⁿ mientras no se salgan); `x >> n`, a la derecha (divide por 2ⁿ, quitando decimales).',
    example: '5 << 1 = 10 (101 → 1010). 20 >> 2 = 5. Para ver el bit i: (x >> i) & 1.',
  },
  'gen-and-mask': {
    title: 'AND, OR y máscaras',
    definition:
      'AND (&) deja a 1 los bits que están a 1 en los dos números; OR (|), los que están en alguno; XOR (^), los que están en uno solo. Una máscara es un número para quedarse con ciertos bits.',
    example: '13 & 6 → 1101 & 0110 = 0100 = 4. 13 | 6 = 1111 = 15. x & 1 dice si x es impar.',
  },
  'gen-complexity-binary-search': {
    title: 'O(log n)',
    definition:
      'Un algoritmo es logarítmico si en cada paso descarta una parte fija (la mitad, por ejemplo). Doblar los datos solo añade un paso.',
    example: 'Buscar en un array ordenado de 1 000 000 de elementos: unos 20 pasos.',
  },
  'gen-complexity-nested': {
    title: 'Bucles anidados: O(n²)',
    definition:
      'Si por cada elemento recorres los demás, el trabajo crece con el cuadrado: el doble de datos es el cuádruple de tiempo.',
    example: 'Comparar cada par de un array de n elementos: n(n-1)/2 comparaciones.',
  },
  'gen-sort-complexity': {
    title: 'Ordenar cuesta n·log n',
    definition:
      'Ordenar comparando elementos no puede bajar de O(n log n) en el caso general. Merge sort y heap sort lo consiguen siempre; la burbuja es O(n²).',
    example: '1000 elementos: unas 10 000 comparaciones bien hecho, frente a 500 000 con burbuja.',
  },
  'gen-stack-lifo': {
    title: 'Pila (LIFO)',
    definition:
      'Una pila mete y saca por el mismo lado: sale primero lo último que entró. Las operaciones son push (meter) y pop (sacar).',
    example:
      'El historial de «deshacer» de un editor, o las llamadas a funciones (la pila de llamadas).',
  },
  'gen-queue-fifo': {
    title: 'Cola (FIFO)',
    definition: 'Una cola mete por un lado y saca por el otro: sale primero lo que primero entró.',
    example: 'La cola de impresión, o los vecinos pendientes en un recorrido en anchura (BFS).',
  },
  'gen-list-vs-array': {
    title: 'Array frente a lista enlazada',
    definition:
      'Un array está seguido en memoria: el elemento i se calcula al momento (O(1)). Una lista enlazada son nodos sueltos que apuntan al siguiente: llegar al i cuesta i pasos, pero insertar al principio es inmediato.',
    example: 'a[500] es directo; en una lista hay que hacer 500 veces node = node->next.',
  },
  'gen-recursion-base': {
    title: 'Caso base de la recursividad',
    definition:
      'Una función recursiva se llama a sí misma con un problema más pequeño, y necesita un caso base que se resuelva sin llamarse; si no, se llena la pila.',
    example: 'int fact(int n) { if (n <= 1) return 1; return n * fact(n - 1); }',
  },
  'gen-recursion-trace': {
    title: 'Seguir una recursión',
    definition:
      'Para saber qué devuelve, se despliegan las llamadas hasta el caso base y se resuelven de vuelta, de dentro afuera.',
    example: 'fact(4) = 4 × fact(3) = 4 × 3 × fact(2) = 4 × 3 × 2 × 1 = 24.',
  },
  'gen-git-push': {
    title: 'git commit y git push',
    definition:
      '`commit` guarda una foto de los cambios preparados en tu repositorio local. `push` envía tus commits al remoto (GitHub, la vogsphere…). Sin push, nadie más los ve.',
    example: 'git add . && git commit -m "libft: ft_split" && git push',
  },
  'gen-git-add': {
    title: 'El índice (git add)',
    definition:
      'Entre tus ficheros y el commit está el índice (staging): `git add` elige qué cambios entran en el próximo commit. `git status` enseña qué está en cada sitio.',
    example: 'git add src/ft_split.c → solo ese fichero entra en el commit siguiente.',
  },
  'gen-git-conflict': {
    title: 'Conflictos de merge',
    definition:
      'Al unir ramas, git junta solo los cambios que no se pisan. Si las dos cambiaron las mismas líneas, marca el fichero con las dos versiones y te toca elegir, hacer `git add` y terminar el merge.',
    example: '<<<<<<< HEAD … ======= … >>>>>>> rama: te quedas con lo bueno y borras las marcas.',
  },
  'gen-shell-pipe': {
    title: 'Tuberías (|)',
    definition:
      'Una tubería conecta la salida estándar de una orden con la entrada estándar de la siguiente: los datos pasan sin ficheros intermedios.',
    example: 'cat notas.txt | grep 42 | wc -l cuenta las líneas que contienen 42.',
  },
  'gen-shell-redirect': {
    title: 'Redirecciones',
    definition:
      '`>` manda la salida a un fichero (vaciándolo antes), `>>` la añade al final, `<` toma la entrada de un fichero y `2>` redirige los errores.',
    example: 'make 2> errores.log; echo hola >> diario.txt',
  },
  'gen-shell-exit-status': {
    title: 'Código de salida ($?)',
    definition:
      'Toda orden termina con un número: 0 es éxito y cualquier otro, error. `$?` guarda el de la última orden; `&&` y `||` lo usan para decidir qué hacer.',
    example: 'ls fichero_que_no_existe; echo $? → 2. make && ./programa solo ejecuta si compiló.',
  },
  'gen-chmod': {
    title: 'Permisos (chmod)',
    definition:
      'Cada fichero tiene permisos para el dueño, el grupo y los demás. En octal, leer vale 4, escribir 2 y ejecutar 1, y se suman.',
    example: 'chmod 755 script.sh → rwx r-x r-x. chmod 600 clave → solo el dueño lee y escribe.',
  },
  'gen-ascii-a': {
    title: 'ASCII',
    definition:
      "ASCII asigna un número a cada carácter: los dígitos empiezan en 48 ('0'), las mayúsculas en 65 ('A') y las minúsculas en 97 ('a'). Entre mayúscula y minúscula hay 32.",
    example: "'a' - 32 = 'A'. '7' - '0' = 7 (así se pasa de carácter a número).",
  },
  'gen-hash-collision': {
    title: 'Tablas hash y colisiones',
    definition:
      'Una tabla hash calcula, a partir de la clave, en qué casilla guardar el valor: buscar es casi inmediato. Si dos claves dan la misma casilla hay colisión, y se resuelve encadenando o buscando otra casilla.',
    example: 'Un diccionario de Python o un std::map sin ordenar (unordered_map) son tablas hash.',
  },
  'c-string-end': {
    title: 'Cadenas en C',
    definition:
      "Una cadena de C es un array de char que termina en el carácter nulo '\\0'. Las funciones como strlen recorren hasta encontrarlo; sin él, siguen leyendo memoria ajena.",
    example: 'char s[] = "hola"; ocupa 5 bytes: h, o, l, a y \\0. strlen(s) es 4.',
  },
  'c-sizeof-char': {
    title: 'sizeof',
    definition:
      '`sizeof` da el tamaño en bytes de un tipo o variable, y se calcula al compilar. sizeof(char) es 1 por definición; un puntero ocupa 8 bytes en 64 bits.',
    example: 'int a[10]; sizeof(a) = 40, pero en una función que recibe int *a, sizeof(a) = 8.',
  },
  'c-malloc-free': {
    title: 'malloc y free',
    definition:
      'malloc reserva memoria en el montón (heap) y devuelve su dirección; esa memoria vive hasta que se libera con free. Si no se libera, es una fuga; si se libera dos veces, el programa se rompe.',
    example: 'char *s = malloc(n + 1); … free(s); s = NULL;',
  },
  'c-malloc-null': {
    title: 'Cuando malloc falla',
    definition:
      'malloc devuelve NULL si no puede reservar. Hay que comprobarlo siempre antes de usar el puntero, y liberar lo que ya se había reservado antes de devolver error.',
    example: 'tab = malloc(sizeof(char *) * (n + 1)); if (!tab) return (NULL);',
  },
  'c-dangling': {
    title: 'Punteros colgantes',
    definition:
      'Las variables locales viven en la pila y desaparecen al salir de la función. Devolver su dirección deja un puntero a memoria que se reutilizará: hay que usar malloc o recibir el sitio desde fuera.',
    example:
      'int *f(void) { int n = 42; return &n; } ← mal. Bien: int *p = malloc(sizeof(int)); *p = 42; return p;',
  },
  'c-memmove-overlap': {
    title: 'memcpy y memmove',
    definition:
      'Las dos copian n bytes. memcpy supone que origen y destino no se solapan; memmove funciona aunque se solapen, copiando hacia delante o hacia atrás según convenga.',
    example: 'Desplazar un array un sitio a la derecha: memmove(a + 1, a, (n - 1) * sizeof(int));',
  },
  'c-pointer-arith': {
    title: 'Aritmética de punteros',
    definition:
      'Sumar 1 a un puntero avanza un elemento entero, no un byte: p + 1 suma sizeof(*p) a la dirección. Por eso a[i] es lo mismo que *(a + i).',
    example: 'int a[] = {10, 20, 30}; int *p = a; *(p + 2) vale 30.',
  },
  'c-string-literal-write': {
    title: 'Literales de cadena',
    definition:
      'Un literal ("hola") se guarda en memoria de solo lectura. char *s = "hola" apunta a él y no se puede modificar; char s[] = "hola" hace una copia propia que sí.',
    example:
      'char *s = "hola"; s[0] = \'H\'; → segmentation fault. char s[] = "hola"; s[0] = \'H\'; → bien.',
  },
  'c-off-by-one-malloc': {
    title: 'El byte del \\0',
    definition:
      'strlen no cuenta el \\0, pero una copia de la cadena sí lo necesita: hay que reservar longitud + 1. Escribir un byte de más es un desbordamiento (y valgrind lo detecta).',
    example: 'char *dup = malloc(strlen(s) + 1);',
  },
  'c-static-local': {
    title: 'Variables static',
    definition:
      'Una variable local static se crea una sola vez y conserva su valor entre llamadas, aunque solo se vea dentro de la función. Una global static solo se ve en su fichero.',
    example: 'get_next_line guarda en una static lo que sobró de la lectura anterior.',
  },
  'c-read-return': {
    title: 'read',
    definition:
      'read(fd, buf, n) intenta leer n bytes y devuelve cuántos ha leído de verdad (pueden ser menos), 0 al final del fichero y -1 si hay error. No añade \\0.',
    example: "while ((r = read(fd, buf, BUFFER_SIZE)) > 0) { buf[r] = '\\0'; … }",
  },
  'c-fd-standard': {
    title: 'Descriptores de fichero',
    definition:
      'Un descriptor es un número que representa algo abierto (fichero, tubería, socket). 0 es la entrada estándar, 1 la salida y 2 los errores; open devuelve el número libre más bajo.',
    example: 'write(2, "Error\\n", 6); escribe en la salida de errores.',
  },
  'c-variadic': {
    title: 'Funciones variádicas',
    definition:
      'Una función con ... recibe un número variable de argumentos. Se recorren con va_start, va_arg (diciendo el tipo de cada uno) y va_end; cuántos hay y de qué tipo lo dice otro argumento, como el formato de printf.',
    example: 'va_list ap; va_start(ap, format); int n = va_arg(ap, int); va_end(ap);',
  },
  'c-printf-formats': {
    title: 'Formatos de printf',
    definition:
      '%d entero con signo, %u sin signo, %x/%X hexadecimal, %c carácter, %s cadena, %p dirección (0x…) y %% un tanto por ciento.',
    example: 'printf("%x %X %u", 255, 255, -1) → ff FF 4294967295',
  },
  'c-char-promotion': {
    title: 'Promoción de argumentos',
    definition:
      'En los argumentos variables, char y short se convierten a int, y float a double. Por eso en ft_printf un %c se lee con va_arg(ap, int).',
    example: 'char c = va_arg(ap, int); (no va_arg(ap, char), que es indefinido)',
  },
  'c-list-add-front': {
    title: 'Paso por valor y punteros a puntero',
    definition:
      'En C todo se pasa por valor: una función recibe copias. Para cambiar un puntero de fuera (la cabeza de una lista) hay que pasar su dirección: un puntero a puntero.',
    example: 'void ft_lstadd_front(t_list **lst, t_list *new) { new->next = *lst; *lst = new; }',
  },
  'c-unsigned-loop': {
    title: 'Bucles con unsigned',
    definition:
      'Un tipo sin signo (size_t, unsigned) nunca es negativo: al restar 1 a 0 da la vuelta al valor más grande. Un bucle hacia atrás con i >= 0 no termina nunca.',
    example: 'for (size_t i = n; i-- > 0;) recorre de n-1 a 0 sin problemas.',
  },
  'c-signed-overflow': {
    title: 'Desbordamiento de enteros',
    definition:
      'Si un int con signo se pasa de INT_MAX el comportamiento es indefinido: el compilador puede hacer cualquier cosa. Los unsigned dan la vuelta (módulo 2ⁿ). Para evitarlo, se comprueba antes de operar o se usa un tipo más grande.',
    example: 'ft_atoi("2147483648") necesita un long para detectar que no cabe en un int.',
  },
  'c-makefile-relink': {
    title: 'Makefile y dependencias',
    definition:
      'make rehace un objetivo solo si alguna de sus dependencias es más reciente. Si el objetivo no es un fichero (all, clean) se marca como .PHONY. Un Makefile bien hecho no vuelve a enlazar si nada cambió.',
    example: '$(NAME): $(OBJS)\\n\\t$(CC) $(OBJS) -o $(NAME)',
  },
  'unix-sudo': {
    title: 'sudo',
    definition:
      'sudo ejecuta una orden como otro usuario (normalmente root), según las reglas de /etc/sudoers. Se edita con visudo, que comprueba la sintaxis antes de guardar.',
    example:
      'sudo apt update. En sudoers: Defaults passwd_tries=3, logfile="/var/log/sudo/sudo.log".',
  },
  'unix-ssh-port': {
    title: 'SSH',
    definition:
      'SSH abre una terminal cifrada en otra máquina. El servidor (sshd) escucha en el puerto 22 por defecto y se configura en /etc/ssh/sshd_config.',
    example: 'ssh usuario@localhost -p 4242. En sshd_config: Port 4242 y PermitRootLogin no.',
  },
  'unix-firewall': {
    title: 'Cortafuegos (UFW)',
    definition:
      'Un cortafuegos decide qué conexiones entran y salen según reglas. UFW es una forma sencilla de configurar el de Linux: se abre lo necesario y se cierra lo demás.',
    example: 'sudo ufw enable; sudo ufw allow 4242; sudo ufw status numbered',
  },
  'unix-lvm': {
    title: 'LVM',
    definition:
      'LVM pone una capa entre los discos y los volúmenes: se juntan discos (grupos de volúmenes) y se crean volúmenes lógicos que se pueden ampliar o reducir sin reparticionar.',
    example: 'lsblk enseña los volúmenes; lvextend -L +5G /dev/vg/home amplía uno.',
  },
  'unix-password-policy': {
    title: 'Usuarios y contraseñas',
    definition:
      '/etc/passwd lista los usuarios (nombre, uid, carpeta, shell) y lo puede leer cualquiera. Los hashes de las contraseñas van aparte, en /etc/shadow, que solo lee root. Las reglas de caducidad están en /etc/login.defs.',
    example: 'chage -l usuario enseña cuándo caduca su contraseña.',
  },
  'proc-fork': {
    title: 'fork',
    definition:
      'fork duplica el proceso: a partir de ahí hay dos iguales. En el hijo devuelve 0 y en el padre el PID del hijo (-1 si falla), y así cada uno sabe qué hacer.',
    example:
      'pid_t pid = fork(); if (pid == 0) { /* hijo */ } else { /* padre */ waitpid(pid, NULL, 0); }',
  },
  'proc-fork-count': {
    title: 'Contar procesos tras varios fork',
    definition:
      'Cada fork duplica a todos los procesos que lo ejecutan. Tras n fork seguidos (sin if) hay 2ⁿ procesos.',
    example: 'fork(); fork(); fork(); → 8 procesos.',
  },
  'proc-exec': {
    title: 'execve',
    definition:
      'execve sustituye el programa del proceso por otro: si funciona, no vuelve nunca. Solo vuelve (con -1) si falla, así que lo de después es la gestión del error.',
    example: 'execve("/bin/ls", args, envp); perror("execve"); exit(127);',
  },
  'proc-pipe-ends': {
    title: 'pipe',
    definition:
      'pipe(fd) crea una tubería: fd[1] es el extremo para escribir y fd[0] el de leer. Lo que se escribe en uno se lee en el otro, en orden.',
    example: 'pipe(fd); write(fd[1], "hola", 4); read(fd[0], buf, 4);',
  },
  'proc-dup2': {
    title: 'dup2',
    definition:
      'dup2(viejo, nuevo) hace que el descriptor nuevo apunte a lo mismo que viejo (cerrando antes nuevo). Así se redirige la entrada o la salida de un programa antes de execve.',
    example:
      'dup2(fd[1], STDOUT_FILENO); close(fd[1]); → lo que escriba el programa va a la tubería.',
  },
  'proc-pipe-hang': {
    title: 'Cerrar los extremos de las tuberías',
    definition:
      'Quien lee de una tubería solo recibe fin de fichero cuando todos los extremos de escritura están cerrados, en todos los procesos. Uno abierto en el padre basta para que el lector espere para siempre.',
    example: 'Tras los fork, el padre hace close(fd[0]); close(fd[1]); antes de esperar.',
  },
  'proc-zombie': {
    title: 'Procesos zombi',
    definition:
      'Un hijo que termina queda como zombi hasta que el padre recoge su estado con wait o waitpid. Muchos zombis llenan la tabla de procesos.',
    example: 'waitpid(pid, &status, 0); WEXITSTATUS(status) da su código de salida.',
  },
  'sig-sigusr': {
    title: 'Señales y kill',
    definition:
      'Una señal es un aviso que un proceso manda a otro. SIGUSR1 y SIGUSR2 no tienen significado fijo: sirven para lo que quieras. Se mandan con kill(pid, señal).',
    example: 'En minitalk: SIGUSR1 es un bit 0 y SIGUSR2 un bit 1.',
  },
  'sig-sigaction': {
    title: 'sigaction',
    definition:
      'sigaction instala un manejador de señal con un comportamiento definido en todos los sistemas, y con SA_SIGINFO el manejador recibe información extra, como el PID de quien la mandó. SIGKILL y SIGSTOP no se pueden capturar.',
    example: 'sa.sa_sigaction = handler; sa.sa_flags = SA_SIGINFO; sigaction(SIGUSR1, &sa, NULL);',
  },
  'sig-bits': {
    title: 'Mandar datos bit a bit',
    definition:
      'Con dos señales se puede mandar un bit cada vez: un carácter son 8 señales. El receptor junta los bits desplazando y, cada 8, tiene un carácter.',
    example: 'c = (c << 1) | bit; if (++count == 8) { write(1, &c, 1); count = 0; c = 0; }',
  },
  'sh-quotes': {
    title: 'Comillas en la shell',
    definition:
      'Entre comillas simples todo es literal; entre dobles se expanden las variables ($VAR) pero no se parten las palabras. Sin comillas, se expande y se parte por los espacios.',
    example: 'echo \'$USER\' → $USER. echo "$USER" → tu login.',
  },
  'sh-heredoc': {
    title: 'Heredoc (<<)',
    definition:
      'Un heredoc pasa a la orden, como entrada estándar, las líneas que escribas hasta una que sea exactamente el delimitador.',
    example: 'cat << FIN\\nlinea 1\\nlinea 2\\nFIN → imprime las dos líneas.',
  },
  'sh-exit-codes': {
    title: 'Códigos de salida de bash',
    definition:
      '0 es éxito; 1, error genérico; 126, sin permiso para ejecutar; 127, orden no encontrada; y 128 + N si una señal N terminó el proceso.',
    example: 'Ctrl-C (SIGINT, 2) → $? = 130. Ctrl-\\ (SIGQUIT, 3) → 131.',
  },
  'sh-builtin-cd': {
    title: 'Builtins',
    definition:
      'Un builtin es una orden que hace la propia shell, sin lanzar un programa. Hace falta para lo que cambia el estado de la shell: cd, export, unset, exit.',
    example:
      'cd en un hijo cambiaría el directorio del hijo, que muere enseguida: la shell seguiría donde estaba.',
  },
  'sh-env-path': {
    title: 'PATH',
    definition:
      'PATH es una lista de carpetas separadas por «:». Al escribir una orden sin «/», la shell la busca en cada carpeta, en orden, y ejecuta la primera que encuentra.',
    example: 'PATH=/usr/local/bin:/usr/bin:/bin → ls se encuentra en /usr/bin/ls.',
  },
}
