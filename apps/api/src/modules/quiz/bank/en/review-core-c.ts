/** Repaso de Not-games en inglés: traducción de `../review-core-c.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_CORE_C_EN: Readonly<Record<string, ReviewEntry>> = {
  'libft-split': {
    title: 'ft_split and its NULL-terminated array',
    definition:
      'ft_split cuts a string on a separator character and returns an array of new strings. Repeated separators, or separators at the edges, give no empty strings, and the array ends with a NULL pointer so whoever uses it knows where it stops.',
    example: 'ft_split("  hola  42 ", \' \') gives {"hola", "42", NULL}: three allocated pointers.',
  },
  'libft-itoa': {
    title: 'ft_itoa and INT_MIN',
    definition:
      'ft_itoa turns an int into text. Flipping the sign with n = -n fails with INT_MIN (-2147483648), because 2147483648 does not fit in a 32-bit int; handle it apart or move to a long. You must allocate the sign, the digits and the null character.',
    example: "ft_itoa(-42) allocates 4 bytes: '-', '4', '2' and '\\0'.",
  },
  'libft-ar': {
    title: 'libft.a, a static library',
    definition:
      'A static .a library is an archive that bundles object files (.o). It is built with ar (the subject asks for it), and when a program is linked the objects it uses are copied into it. It is neither an executable nor a dynamic library.',
    example: 'ar rcs libft.a *.o, then cc main.c -L. -lft to use it.',
  },
  'libft-lstclear': {
    title: 'ft_lstclear and the del function',
    definition:
      'ft_lstclear deletes a node and every node after it: it frees the content of each one with the del function it receives, frees the node with free and finally sets the list pointer to NULL. del exists because the list does not know what content holds.',
    example: 'ft_lstclear(&lst, free) frees contents and nodes, and lst ends up NULL.',
  },
  'printf-return': {
    title: 'What ft_printf returns',
    definition:
      'Like the real printf, ft_printf returns the number of characters it has written, counting newlines and whatever each conversion prints. It does not return how many conversions or arguments there were.',
    example: 'ft_printf("hola %d\\n", 42) writes "hola 42\\n" and returns 8.',
  },
  'printf-pointer': {
    title: 'The %p conversion',
    definition:
      '%p takes a void * and writes its address in hexadecimal, lowercase and with the 0x prefix, just like printf. It does not pad with zeros or use capitals.',
    example: 'ft_printf("%p", (void *)42) prints 0x2a.',
  },
  'printf-percent': {
    title: 'The %% of ft_printf',
    definition:
      '%% is the conversion that writes a percent sign. It uses up no argument, and whatever follows is printed as it is: %%d comes out as the text %d, not as a number.',
    example: 'ft_printf("%d%%", 50) prints 50% and returns 3.',
  },
  'gnl-buffer-size': {
    title: 'BUFFER_SIZE in get_next_line',
    definition:
      'BUFFER_SIZE is the number of bytes each read asks for, and it is set at compile time with -D. It must work with 1 (one read per character) and with huge values, which do not fit in a local array on the stack: the buffer is allocated with malloc.',
    example: 'cc -D BUFFER_SIZE=42 get_next_line.c; with BUFFER_SIZE=1, "hola\\n" costs 5 reads.',
  },
  'gnl-last-line': {
    title: 'The last line in get_next_line',
    definition:
      'get_next_line returns each line with its newline included. The last one may have none, and then it is returned as it is. When there is nothing left to read, it returns NULL.',
    example: 'With "a\\nb", the calls give "a\\n", then "b" and then NULL.',
  },
  'gnl-errors': {
    title: 'Errors in get_next_line',
    definition:
      'If the descriptor is not valid or read fails, get_next_line returns NULL. Whatever was kept in the static variable must then be freed, so as not to leave a leak.',
    example:
      'get_next_line(-1) returns NULL; if read gives -1, the leftover is freed and NULL returned.',
  },
  'gnl-bonus-fd': {
    title: 'Several fds in the get_next_line bonus',
    definition:
      'The bonus asks you to read from several descriptors at once without mixing their lines, and with a single static variable. For that, each fd keeps its own pending leftover, for example in an array of leftovers indexed by the fd number.',
    example: 'static char *rest[1024]; and rest[fd] is used for each descriptor.',
  },
  'b2br-groups-host': {
    title: 'User, groups and hostname in Born2beroot',
    definition:
      'Born2beroot asks for a user with your login in the groups user42 and sudo, and for the machine to be named after your login followed by 42. usermod -aG adds a group without removing the ones the user already has.',
    example: 'usermod -aG user42 ana and hostnamectl set-hostname ana42.',
  },
  'b2br-hardening': {
    title: 'SSH without root, and AppArmor',
    definition:
      'The subject asks that nobody can log in over SSH as root: that is done with PermitRootLogin no in /etc/ssh/sshd_config. AppArmor, which must be running from boot on Debian, limits with a profile what each program can do.',
    example: 'PermitRootLogin no, then systemctl restart ssh; aa-status shows the profiles.',
  },
  'b2br-password': {
    title: 'The password policy',
    definition:
      'Password expiry for new users is set in /etc/login.defs (PASS_MAX_DAYS, PASS_MIN_DAYS, PASS_WARN_AGE); existing users are changed with chage. Quality (at least 10 characters, a capital, a lowercase letter and a digit) is checked by pam_pwquality.',
    example: 'PASS_MAX_DAYS 30 in login.defs and minlen=10 on the pam_pwquality line.',
  },
  'b2br-monitoring': {
    title: 'monitoring.sh, cron and wall',
    definition:
      'monitoring.sh shows data about the machine (CPU, memory, disk, connections…) on every terminal every 10 minutes from boot. cron takes care of running it every 10 minutes and wall sends the text to the terminal of every user.',
    example: '*/10 * * * * /root/monitoring.sh | wall, in the crontab of root.',
  },
  'pipex-equivalent': {
    title: 'What pipex imitates',
    definition:
      'pipex takes an input file, two commands and an output file, and does what the shell does with < infile cmd1 | cmd2 > outfile. In the bonus, here_doc LIMITER reads up to the delimiter and writes at the end of the file, like << and >>.',
    example: './pipex here_doc FIN cat "wc -l" out is the same as cat << FIN | wc -l >> out.',
  },
  'pipex-path': {
    title: 'Finding the command in PATH',
    definition:
      'execve needs the full path of the program and does not look at PATH. pipex takes the PATH= line out of envp, splits it on «:», glues the command name to each folder and checks with access(path, X_OK) which one exists and can be run.',
    example: 'For ls it tries /usr/local/bin/ls, /usr/bin/ls… until access gives 0.',
  },
  'pipex-wait': {
    title: 'waitpid and the exit code',
    definition:
      'In the shell, a pipeline ends with the exit code of its last command. waitpid leaves in status how the child ended, encoded: WIFEXITED says whether it left through exit and WEXITSTATUS gives the number it exited with.',
    example: 'waitpid(pid2, &status, 0); return (WEXITSTATUS(status));',
  },
  'talk-pid': {
    title: 'The PID in minitalk',
    definition:
      'The minitalk server prints its PID at start-up (it gets it with getpid) and the client takes it as an argument to know whom to send the signals to with kill. In the bonus, the server knows who is writing from the si_pid that sigaction gives with SA_SIGINFO.',
    example: './server prints 4242; then ./client 4242 "hola".',
  },
  'talk-ack': {
    title: 'Why the client waits',
    definition:
      'Standard signals are not queued: if one arrives while an identical one is still pending, they become one and a bit is lost. That is why the client waits between signals; in the bonus, the server confirms each message by sending a signal back to the client.',
    example: 'The client sends a bit and waits (with pause or usleep) before sending the next.',
  },
  'talk-unicode': {
    title: 'Unicode in minitalk',
    definition:
      'UTF-8 writes each character with 1 to 4 bytes. If minitalk sends bytes 8 bits at a time and the server puts them back together and writes them, non-ASCII characters arrive fine with nothing special; they just cost more signals.',
    example: '«ñ» is 2 bytes (16 signals) and «€», 3 bytes (24 signals).',
  },
  'msh-signals': {
    title: 'Signals in minishell',
    definition:
      'minishell may only use one global variable, and only to store the number of the signal received. With Ctrl-C at the prompt, a new prompt is shown on a new line; bash then sets $? to 130, which is 128 plus the number of SIGINT.',
    example: 'volatile sig_atomic_t g_signal; the handler does g_signal = sig.',
  },
  'msh-readline': {
    title: 'readline, Ctrl-D and the history',
    definition:
      'readline reads a line with editing and returns NULL when it reaches the end of input, which is what Ctrl-D does on an empty line: minishell must then exit, like exit. add_history saves each line so the arrow keys can bring it back.',
    example: 'line = readline("minishell$ "); if (!line) quit; else add_history(line);',
  },
  'msh-env-expand': {
    title: 'export, expansion and redirections',
    definition:
      'In bash, export VAR without = only marks the variable for export (it shows in export, not in env). Variables are expanded before redirections are applied: if one ends up empty and unquoted, bash says «ambiguous redirect». Inside single quotes nothing is expanded.',
    example: 'echo hola > $NADA gives «ambiguous redirect»; echo "$USER"\'$USER\' gives ana$USER.',
  },
}
