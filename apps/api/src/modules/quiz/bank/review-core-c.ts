/** Repaso de Not-games: lo nuevo de C, Unix y generales del common core. */

import type { ReviewEntry } from './types.js'

export const REVIEW_CORE_C: Record<string, ReviewEntry> = {
  'libft-split': {
    title: 'ft_split y su array terminado en NULL',
    definition:
      'ft_split parte una cadena por un carácter separador y devuelve un array de cadenas nuevas. Los separadores seguidos o en los bordes no dan cadenas vacías, y el array acaba en un puntero NULL para que quien lo use sepa dónde termina.',
    example: 'ft_split("  hola  42 ", \' \') da {"hola", "42", NULL}: tres punteros reservados.',
  },
  'libft-itoa': {
    title: 'ft_itoa e INT_MIN',
    definition:
      'ft_itoa pasa un int a texto. Cambiar el signo con n = -n falla con INT_MIN (-2147483648), porque 2147483648 no cabe en un int de 32 bits; se trata aparte o se pasa a long. Hay que reservar signo, cifras y el carácter nulo.',
    example: "ft_itoa(-42) reserva 4 bytes: '-', '4', '2' y '\\0'.",
  },
  'libft-ar': {
    title: 'libft.a, una biblioteca estática',
    definition:
      'Una biblioteca estática .a es un archivo que junta ficheros objeto (.o). Se crea con ar (el enunciado lo pide), y al enlazar un programa se copian dentro los objetos que usa. No es un ejecutable ni una biblioteca dinámica.',
    example: 'ar rcs libft.a *.o, y luego cc main.c -L. -lft para usarla.',
  },
  'libft-lstclear': {
    title: 'ft_lstclear y la función del',
    definition:
      'ft_lstclear borra un nodo y todos los que le siguen: libera el contenido de cada uno con la función del que recibe, libera el nodo con free y al final deja a NULL el puntero a la lista. del existe porque la lista no sabe qué guarda content.',
    example: 'ft_lstclear(&lst, free) libera contenidos y nodos, y lst queda a NULL.',
  },
  'printf-return': {
    title: 'Lo que devuelve ft_printf',
    definition:
      'Como el printf de verdad, ft_printf devuelve el número de caracteres que ha escrito, contando saltos de línea y lo que sale de cada conversión. No devuelve cuántas conversiones o argumentos había.',
    example: 'ft_printf("hola %d\\n", 42) escribe "hola 42\\n" y devuelve 8.',
  },
  'printf-pointer': {
    title: 'La conversión %p',
    definition:
      '%p recibe un void * y escribe su dirección en hexadecimal, en minúsculas y con el prefijo 0x, igual que printf. No rellena con ceros ni usa mayúsculas.',
    example: 'ft_printf("%p", (void *)42) imprime 0x2a.',
  },
  'printf-percent': {
    title: 'El %% de ft_printf',
    definition:
      '%% es la conversión que escribe un signo de porcentaje. No consume ningún argumento, y lo que va detrás se imprime tal cual: %%d sale como el texto %d, no como un número.',
    example: 'ft_printf("%d%%", 50) imprime 50% y devuelve 3.',
  },
  'gnl-buffer-size': {
    title: 'BUFFER_SIZE en get_next_line',
    definition:
      'BUFFER_SIZE es la cantidad de bytes que pide cada read, y se fija al compilar con -D. Tiene que funcionar con 1 (un read por carácter) y con valores enormes, que no caben en un array local de la pila: el búfer se pide con malloc.',
    example: 'cc -D BUFFER_SIZE=42 get_next_line.c; con BUFFER_SIZE=1, "hola\\n" cuesta 5 reads.',
  },
  'gnl-last-line': {
    title: 'La última línea en get_next_line',
    definition:
      'get_next_line devuelve cada línea con su salto de línea incluido. La última puede no tenerlo, y entonces se devuelve tal cual. Cuando ya no queda nada que leer, devuelve NULL.',
    example: 'Con "a\\nb", las llamadas dan "a\\n", luego "b" y luego NULL.',
  },
  'gnl-errors': {
    title: 'Errores en get_next_line',
    definition:
      'Si el descriptor no vale o read falla, get_next_line devuelve NULL. Lo que se tenía guardado en la variable static hay que liberarlo entonces, para no dejar una fuga.',
    example:
      'get_next_line(-1) devuelve NULL; si read da -1, se libera el resto y se devuelve NULL.',
  },
  'gnl-bonus-fd': {
    title: 'Varios fd en el bonus de get_next_line',
    definition:
      'El bonus pide leer de varios descriptores a la vez sin mezclar sus líneas y con una sola variable static. Para eso cada fd guarda su propio resto pendiente, por ejemplo en un array de restos indexado por el número de fd.',
    example: 'static char *rest[1024]; y se usa rest[fd] para cada descriptor.',
  },
  'b2br-groups-host': {
    title: 'Usuario, grupos y hostname en Born2beroot',
    definition:
      'Born2beroot pide un usuario con tu login que esté en los grupos user42 y sudo, y que la máquina se llame como tu login seguido de 42. usermod -aG añade un grupo sin quitar los que ya tiene el usuario.',
    example: 'usermod -aG user42 ana y hostnamectl set-hostname ana42.',
  },
  'b2br-hardening': {
    title: 'SSH sin root y AppArmor',
    definition:
      'El enunciado pide que no se pueda entrar por SSH como root: se consigue con PermitRootLogin no en /etc/ssh/sshd_config. AppArmor, que tiene que estar activo desde el arranque en Debian, limita con un perfil lo que puede hacer cada programa.',
    example: 'PermitRootLogin no y luego systemctl restart ssh; aa-status enseña los perfiles.',
  },
  'b2br-password': {
    title: 'La política de contraseñas',
    definition:
      'La caducidad de las contraseñas de los usuarios nuevos se fija en /etc/login.defs (PASS_MAX_DAYS, PASS_MIN_DAYS, PASS_WARN_AGE); a los que ya existen se les cambia con chage. La calidad (al menos 10 caracteres, mayúscula, minúscula y cifra) la comprueba pam_pwquality.',
    example: 'PASS_MAX_DAYS 30 en login.defs y minlen=10 en la línea de pam_pwquality.',
  },
  'b2br-monitoring': {
    title: 'monitoring.sh, cron y wall',
    definition:
      'monitoring.sh enseña datos de la máquina (CPU, memoria, disco, conexiones…) en todas las terminales cada 10 minutos desde el arranque. cron se encarga de lanzarlo cada 10 minutos y wall manda el texto a la terminal de todos los usuarios.',
    example: '*/10 * * * * /root/monitoring.sh | wall, en el crontab de root.',
  },
  'pipex-equivalent': {
    title: 'Lo que imita pipex',
    definition:
      'pipex recibe un fichero de entrada, dos comandos y uno de salida, y hace lo mismo que la shell con < infile cmd1 | cmd2 > outfile. En el bonus, here_doc LIMITER lee hasta el delimitador y escribe al final del fichero, como << y >>.',
    example: './pipex here_doc FIN cat "wc -l" out equivale a cat << FIN | wc -l >> out.',
  },
  'pipex-path': {
    title: 'Buscar el comando en PATH',
    definition:
      'execve necesita la ruta completa del programa y no mira PATH. pipex saca la línea PATH= de envp, la parte por «:», pega el nombre del comando a cada carpeta y comprueba con access(ruta, X_OK) cuál existe y se puede ejecutar.',
    example: 'Para ls prueba /usr/local/bin/ls, /usr/bin/ls… hasta que access da 0.',
  },
  'pipex-wait': {
    title: 'waitpid y el código de salida',
    definition:
      'En la shell, una tubería termina con el código de salida de su último comando. waitpid deja en status cómo acabó el hijo, codificado: WIFEXITED dice si salió con exit y WEXITSTATUS da el número con que salió.',
    example: 'waitpid(pid2, &status, 0); return (WEXITSTATUS(status));',
  },
  'talk-pid': {
    title: 'El PID en minitalk',
    definition:
      'El servidor de minitalk imprime su PID al arrancar (lo saca con getpid) y el cliente lo recibe como argumento para saber a quién mandar las señales con kill. En el bonus, el servidor sabe quién le escribe por el si_pid que da sigaction con SA_SIGINFO.',
    example: './server imprime 4242; luego ./client 4242 "hola".',
  },
  'talk-ack': {
    title: 'Por qué el cliente espera',
    definition:
      'Las señales estándar no se encolan: si llega una igual a otra que aún está pendiente, las dos se quedan en una y se pierde un bit. Por eso el cliente espera entre señal y señal; en el bonus, el servidor confirma cada mensaje mandando una señal de vuelta al cliente.',
    example: 'El cliente manda un bit y espera (con pause o usleep) antes de mandar el siguiente.',
  },
  'talk-unicode': {
    title: 'Unicode en minitalk',
    definition:
      'UTF-8 escribe cada carácter con entre 1 y 4 bytes. Si minitalk manda bytes de 8 en 8 bits y el servidor los vuelve a juntar y los escribe, los caracteres no ASCII llegan bien sin hacer nada especial; solo cuestan más señales.',
    example: '«ñ» son 2 bytes (16 señales) y «€», 3 bytes (24 señales).',
  },
  'msh-signals': {
    title: 'Señales en minishell',
    definition:
      'minishell solo puede usar una variable global, y solo para guardar el número de la señal recibida. Con Ctrl-C en el prompt se muestra un prompt nuevo en una línea nueva; bash pone entonces $? a 130, que es 128 más el número de SIGINT.',
    example: 'volatile sig_atomic_t g_signal; el manejador hace g_signal = sig.',
  },
  'msh-readline': {
    title: 'readline, Ctrl-D y el historial',
    definition:
      'readline lee una línea con edición y devuelve NULL al llegar al fin de la entrada, que es lo que pasa con Ctrl-D en una línea vacía: minishell tiene que salir entonces, como exit. add_history guarda cada línea para recuperarla con las flechas.',
    example: 'line = readline("minishell$ "); if (!line) salir; else add_history(line);',
  },
  'msh-env-expand': {
    title: 'export, expansión y redirecciones',
    definition:
      'En bash, export VAR sin = solo marca la variable para exportarla (sale en export, no en env). Las variables se expanden antes de aplicar las redirecciones: si quedan vacías y sin comillas, bash da «redirección ambigua». Entre comillas simples no se expande nada.',
    example: 'echo hola > $NADA da «ambiguous redirect»; echo "$USER"\'$USER\' da ana$USER.',
  },
}
