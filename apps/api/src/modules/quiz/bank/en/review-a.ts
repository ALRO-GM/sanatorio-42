/** Repaso de Not-games en inglés (1/2): traducción de `../review-a.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_A_EN: Readonly<Record<string, ReviewEntry>> = {
  'gen-binary-8': {
    title: 'Binary to decimal',
    definition:
      'In binary each digit is worth double the one to its right: 1, 2, 4, 8, 16… To convert to decimal, add up the values of the positions that hold a 1.',
    example: '1011 = 8 + 0 + 2 + 1 = 11. And 1000 = 8.',
  },
  'gen-hex-ff': {
    title: 'Hexadecimal',
    definition:
      'Base 16: the digits go from 0 to 9 and from A (10) to F (15). Each hexadecimal digit is exactly 4 bits, which is why it is so widely used to write bytes.',
    example: '0xFF = 15 × 16 + 15 = 255 (a byte with every bit set to 1). 0x2A = 2 × 16 + 10 = 42.',
  },
  'gen-byte-bits': {
    title: 'Bits and bytes',
    definition:
      'A bit is a 0 or a 1. A byte is 8 bits, which gives 2⁸ = 256 combinations: from 0 to 255 unsigned, or from -128 to 127 signed.',
    example: 'A char takes 1 byte; an int usually takes 4 (32 bits).',
  },
  'gen-shift-left': {
    title: 'Bit shifting',
    definition:
      '`x << n` moves the bits n positions to the left (it multiplies by 2ⁿ as long as no bits fall off); `x >> n` moves them to the right (it divides by 2ⁿ, dropping the decimals).',
    example: '5 << 1 = 10 (101 → 1010). 20 >> 2 = 5. To see bit i: (x >> i) & 1.',
  },
  'gen-and-mask': {
    title: 'AND, OR and masks',
    definition:
      'AND (&) keeps the bits that are 1 in both numbers; OR (|), the ones that are 1 in either; XOR (^), the ones that are 1 in only one. A mask is a number used to keep certain bits.',
    example:
      '13 & 6 → 1101 & 0110 = 0100 = 4. 13 | 6 = 1111 = 15. x & 1 tells you whether x is odd.',
  },
  'gen-complexity-binary-search': {
    title: 'O(log n)',
    definition:
      'An algorithm is logarithmic if each step discards a fixed fraction of the data (half, for example). Doubling the data only adds one step.',
    example: 'Searching a sorted array of 1,000,000 elements: about 20 steps.',
  },
  'gen-complexity-nested': {
    title: 'Nested loops: O(n²)',
    definition:
      'If for each element you go through all the others, the work grows with the square: twice the data means four times the time.',
    example: 'Comparing every pair in an array of n elements: n(n-1)/2 comparisons.',
  },
  'gen-sort-complexity': {
    title: 'Sorting costs n·log n',
    definition:
      'Sorting by comparing elements cannot beat O(n log n) in the general case. Merge sort and heap sort always manage it; bubble sort is O(n²).',
    example:
      '1000 elements: about 10,000 comparisons done properly, against 500,000 with bubble sort.',
  },
  'gen-stack-lifo': {
    title: 'Stack (LIFO)',
    definition:
      'A stack adds and removes from the same end: the last thing in is the first thing out. The operations are push (add) and pop (remove).',
    example: 'The «undo» history of an editor, or function calls (the call stack).',
  },
  'gen-queue-fifo': {
    title: 'Queue (FIFO)',
    definition:
      'A queue adds at one end and removes at the other: the first thing in is the first thing out.',
    example: 'The print queue, or the pending neighbours in a breadth-first search (BFS).',
  },
  'gen-list-vs-array': {
    title: 'Array vs linked list',
    definition:
      'An array is contiguous in memory: the address of element i is computed instantly (O(1)). A linked list is a set of separate nodes, each pointing to the next: reaching element i takes i steps, but inserting at the start is immediate.',
    example: 'a[500] is direct; in a list you have to do node = node->next 500 times.',
  },
  'gen-recursion-base': {
    title: 'Base case of recursion',
    definition:
      'A recursive function calls itself with a smaller problem, and it needs a base case that is solved without calling itself; otherwise the stack fills up.',
    example: 'int fact(int n) { if (n <= 1) return 1; return n * fact(n - 1); }',
  },
  'gen-recursion-trace': {
    title: 'Tracing a recursion',
    definition:
      'To work out what it returns, unfold the calls down to the base case and then resolve them on the way back, from the inside out.',
    example: 'fact(4) = 4 × fact(3) = 4 × 3 × fact(2) = 4 × 3 × 2 × 1 = 24.',
  },
  'gen-git-push': {
    title: 'git commit and git push',
    definition:
      '`commit` saves a snapshot of the staged changes in your local repository. `push` sends your commits to the remote (GitHub, the vogsphere…). Without a push, nobody else sees them.',
    example: 'git add . && git commit -m "libft: ft_split" && git push',
  },
  'gen-git-add': {
    title: 'The index (git add)',
    definition:
      'Between your files and the commit sits the index (staging area): `git add` chooses which changes go into the next commit. `git status` shows what is where.',
    example: 'git add src/ft_split.c → only that file goes into the next commit.',
  },
  'gen-git-conflict': {
    title: 'Merge conflicts',
    definition:
      'When joining branches, git combines only the changes that do not overlap. If both changed the same lines, it marks the file with both versions and it is up to you to choose, run `git add` and finish the merge.',
    example:
      '<<<<<<< HEAD … ======= … >>>>>>> branch: you keep the good part and delete the markers.',
  },
  'gen-shell-pipe': {
    title: 'Pipes (|)',
    definition:
      'A pipe connects the standard output of one command to the standard input of the next: the data flows through without intermediate files.',
    example: 'cat notes.txt | grep 42 | wc -l counts the lines that contain 42.',
  },
  'gen-shell-redirect': {
    title: 'Redirections',
    definition:
      '`>` sends the output to a file (emptying it first), `>>` appends it at the end, `<` takes the input from a file and `2>` redirects the errors.',
    example: 'make 2> errors.log; echo hello >> diary.txt',
  },
  'gen-shell-exit-status': {
    title: 'Exit status ($?)',
    definition:
      'Every command ends with a number: 0 means success and anything else means error. `$?` holds the one from the last command; `&&` and `||` use it to decide what to do.',
    example: 'ls missing_file; echo $? → 2. make && ./program only runs if it compiled.',
  },
  'gen-chmod': {
    title: 'Permissions (chmod)',
    definition:
      'Every file has permissions for the owner, the group and everyone else. In octal, read is worth 4, write 2 and execute 1, and they add up.',
    example:
      'chmod 755 script.sh → rwx r-x r-x. chmod 600 key → only the owner can read and write.',
  },
  'gen-ascii-a': {
    title: 'ASCII',
    definition:
      "ASCII assigns a number to each character: digits start at 48 ('0'), uppercase letters at 65 ('A') and lowercase letters at 97 ('a'). Between an uppercase and a lowercase letter there are 32.",
    example: "'a' - 32 = 'A'. '7' - '0' = 7 (this is how you go from a character to a number).",
  },
  'gen-hash-collision': {
    title: 'Hash tables and collisions',
    definition:
      'A hash table uses the key to work out which slot to store the value in: lookup is almost instant. If two keys give the same slot there is a collision, which is resolved by chaining or by looking for another slot.',
    example: 'A Python dictionary and a C++ std::unordered_map are both hash tables.',
  },
  'c-string-end': {
    title: 'Strings in C',
    definition:
      "A C string is an array of char that ends with the null character '\\0'. Functions like strlen read on until they find it; without it, they keep reading memory that is not yours.",
    example: 'char s[] = "hello"; takes 6 bytes: h, e, l, l, o and \\0. strlen(s) is 5.',
  },
  'c-sizeof-char': {
    title: 'sizeof',
    definition:
      '`sizeof` gives the size in bytes of a type or variable, and it is worked out at compile time. sizeof(char) is 1 by definition; a pointer takes 8 bytes on 64 bits.',
    example: 'int a[10]; sizeof(a) = 40, but in a function that receives int *a, sizeof(a) = 8.',
  },
  'c-malloc-free': {
    title: 'malloc and free',
    definition:
      'malloc reserves memory on the heap and returns its address; that memory lives until it is released with free. If it is not released, it is a leak; if it is released twice, the program breaks.',
    example: 'char *s = malloc(n + 1); … free(s); s = NULL;',
  },
  'c-malloc-null': {
    title: 'When malloc fails',
    definition:
      'malloc returns NULL if it cannot allocate. Always check it before using the pointer, and free whatever was already allocated before returning an error.',
    example: 'tab = malloc(sizeof(char *) * (n + 1)); if (!tab) return (NULL);',
  },
  'c-dangling': {
    title: 'Dangling pointers',
    definition:
      'Local variables live on the stack and disappear when the function returns. Returning their address leaves a pointer to memory that will be reused: use malloc or receive the space from outside.',
    example:
      'int *f(void) { int n = 42; return &n; } ← wrong. Right: int *p = malloc(sizeof(int)); *p = 42; return p;',
  },
  'c-memmove-overlap': {
    title: 'memcpy and memmove',
    definition:
      'Both copy n bytes. memcpy assumes source and destination do not overlap; memmove works even if they do, copying forwards or backwards as needed.',
    example: 'Shifting an array one place to the right: memmove(a + 1, a, (n - 1) * sizeof(int));',
  },
  'c-pointer-arith': {
    title: 'Pointer arithmetic',
    definition:
      'Adding 1 to a pointer moves forward one whole element, not one byte: p + 1 adds sizeof(*p) to the address. That is why a[i] is the same as *(a + i).',
    example: 'int a[] = {10, 20, 30}; int *p = a; *(p + 2) is 30.',
  },
  'c-string-literal-write': {
    title: 'String literals',
    definition:
      'A literal ("hello") is stored in read-only memory. char *s = "hello" points to it and it cannot be modified; char s[] = "hello" makes a copy of your own, which can.',
    example:
      'char *s = "hello"; s[0] = \'H\'; → segmentation fault. char s[] = "hello"; s[0] = \'H\'; → fine.',
  },
  'c-off-by-one-malloc': {
    title: 'The \\0 byte',
    definition:
      'strlen does not count the \\0, but a copy of the string does need it: reserve length + 1. Writing one byte too many is an overflow (and valgrind detects it).',
    example: 'char *dup = malloc(strlen(s) + 1);',
  },
  'c-static-local': {
    title: 'static variables',
    definition:
      'A static local variable is created only once and keeps its value between calls, even though it is only visible inside the function. A static global is only visible in its own file.',
    example: 'get_next_line keeps in a static whatever was left over from the previous read.',
  },
  'c-read-return': {
    title: 'read',
    definition:
      'read(fd, buf, n) tries to read n bytes and returns how many it really read (it can be fewer), 0 at the end of the file and -1 on error. It does not add a \\0.',
    example: "while ((r = read(fd, buf, BUFFER_SIZE)) > 0) { buf[r] = '\\0'; … }",
  },
  'c-fd-standard': {
    title: 'File descriptors',
    definition:
      'A descriptor is a number that stands for something that is open (a file, a pipe, a socket). 0 is standard input, 1 is standard output and 2 is errors; open returns the lowest free number.',
    example: 'write(2, "Error\\n", 6); writes to the error output.',
  },
  'c-variadic': {
    title: 'Variadic functions',
    definition:
      'A function with ... receives a variable number of arguments. You go through them with va_start, va_arg (stating the type of each one) and va_end; how many there are and of what type is told by another argument, like the format of printf.',
    example: 'va_list ap; va_start(ap, format); int n = va_arg(ap, int); va_end(ap);',
  },
  'c-printf-formats': {
    title: 'printf formats',
    definition:
      '%d signed integer, %u unsigned, %x/%X hexadecimal, %c character, %s string, %p address (0x…) and %% a percent sign.',
    example: 'printf("%x %X %u", 255, 255, -1) → ff FF 4294967295',
  },
  'c-char-promotion': {
    title: 'Argument promotion',
    definition:
      'In variable arguments, char and short are converted to int, and float to double. That is why in ft_printf a %c is read with va_arg(ap, int).',
    example: 'char c = va_arg(ap, int); (not va_arg(ap, char), which is undefined)',
  },
  'c-list-add-front': {
    title: 'Pass by value and pointers to pointers',
    definition:
      'In C everything is passed by value: a function receives copies. To change a pointer outside (the head of a list) you have to pass its address: a pointer to a pointer.',
    example: 'void ft_lstadd_front(t_list **lst, t_list *new) { new->next = *lst; *lst = new; }',
  },
  'c-unsigned-loop': {
    title: 'Loops with unsigned',
    definition:
      'An unsigned type (size_t, unsigned) is never negative: subtracting 1 from 0 wraps around to the largest value. A backwards loop with i >= 0 never ends.',
    example: 'for (size_t i = n; i-- > 0;) goes from n-1 down to 0 with no problem.',
  },
  'c-signed-overflow': {
    title: 'Integer overflow',
    definition:
      'If a signed int goes past INT_MAX the behaviour is undefined: the compiler can do anything. Unsigned values wrap around (modulo 2ⁿ). To avoid it, check before operating or use a bigger type.',
    example: 'ft_atoi("2147483648") needs a long to detect that it does not fit in an int.',
  },
  'c-makefile-relink': {
    title: 'Makefile and dependencies',
    definition:
      'make rebuilds a target only if one of its dependencies is newer. If the target is not a file (all, clean) it is marked as .PHONY. A well-made Makefile does not relink if nothing changed.',
    example: '$(NAME): $(OBJS)\\n\\t$(CC) $(OBJS) -o $(NAME)',
  },
  'unix-sudo': {
    title: 'sudo',
    definition:
      'sudo runs a command as another user (usually root), following the rules in /etc/sudoers. You edit it with visudo, which checks the syntax before saving.',
    example:
      'sudo apt update. In sudoers: Defaults passwd_tries=3, logfile="/var/log/sudo/sudo.log".',
  },
  'unix-ssh-port': {
    title: 'SSH',
    definition:
      'SSH opens an encrypted terminal on another machine. The server (sshd) listens on port 22 by default and is configured in /etc/ssh/sshd_config.',
    example: 'ssh user@localhost -p 4242. In sshd_config: Port 4242 and PermitRootLogin no.',
  },
  'unix-firewall': {
    title: 'Firewall (UFW)',
    definition:
      'A firewall decides which connections come in and go out according to rules. UFW is a simple way to configure the Linux one: open what you need and close the rest.',
    example: 'sudo ufw enable; sudo ufw allow 4242; sudo ufw status numbered',
  },
  'unix-lvm': {
    title: 'LVM',
    definition:
      'LVM puts a layer between the disks and the volumes: disks are joined together (volume groups) and you create logical volumes that can be grown or shrunk without repartitioning.',
    example: 'lsblk shows the volumes; lvextend -L +5G /dev/vg/home grows one.',
  },
  'unix-password-policy': {
    title: 'Users and passwords',
    definition:
      '/etc/passwd lists the users (name, uid, home folder, shell) and anyone can read it. The password hashes are kept separately, in /etc/shadow, which only root can read. The expiry rules are in /etc/login.defs.',
    example: 'chage -l user shows when their password expires.',
  },
  'proc-fork': {
    title: 'fork',
    definition:
      "fork duplicates the process: from then on there are two identical ones. In the child it returns 0 and in the parent the child's PID (-1 if it fails), so each one knows what to do.",
    example:
      'pid_t pid = fork(); if (pid == 0) { /* child */ } else { /* parent */ waitpid(pid, NULL, 0); }',
  },
  'proc-fork-count': {
    title: 'Counting processes after several forks',
    definition:
      'Each fork doubles every process that runs it. After n forks in a row (with no if) there are 2ⁿ processes.',
    example: 'fork(); fork(); fork(); → 8 processes.',
  },
  'proc-exec': {
    title: 'execve',
    definition:
      "execve replaces the process's program with another one: if it works, it never returns. It only returns (with -1) if it fails, so whatever comes after is the error handling.",
    example: 'execve("/bin/ls", args, envp); perror("execve"); exit(127);',
  },
  'proc-pipe-ends': {
    title: 'pipe',
    definition:
      'pipe(fd) creates a pipe: fd[1] is the end for writing and fd[0] the one for reading. What is written into one is read from the other, in order.',
    example: 'pipe(fd); write(fd[1], "hello", 5); read(fd[0], buf, 5);',
  },
  'proc-dup2': {
    title: 'dup2',
    definition:
      "dup2(old, new) makes the new descriptor point to the same thing as old (closing new first). This is how you redirect a program's input or output before execve.",
    example:
      'dup2(fd[1], STDOUT_FILENO); close(fd[1]); → whatever the program writes goes into the pipe.',
  },
  'proc-pipe-hang': {
    title: 'Closing the ends of pipes',
    definition:
      'Whoever reads from a pipe only gets end of file when all the write ends are closed, in every process. One left open in the parent is enough for the reader to wait forever.',
    example: 'After the forks, the parent does close(fd[0]); close(fd[1]); before waiting.',
  },
  'proc-zombie': {
    title: 'Zombie processes',
    definition:
      'A child that finishes stays as a zombie until the parent collects its status with wait or waitpid. Lots of zombies fill up the process table.',
    example: 'waitpid(pid, &status, 0); WEXITSTATUS(status) gives its exit code.',
  },
  'sig-sigusr': {
    title: 'Signals and kill',
    definition:
      'A signal is a notice that one process sends to another. SIGUSR1 and SIGUSR2 have no fixed meaning: they are for whatever you want. You send them with kill(pid, signal).',
    example: 'In minitalk: SIGUSR1 is a 0 bit and SIGUSR2 a 1 bit.',
  },
  'sig-sigaction': {
    title: 'sigaction',
    definition:
      'sigaction installs a signal handler with behaviour that is defined on every system, and with SA_SIGINFO the handler receives extra information, such as the PID of whoever sent it. SIGKILL and SIGSTOP cannot be caught.',
    example: 'sa.sa_sigaction = handler; sa.sa_flags = SA_SIGINFO; sigaction(SIGUSR1, &sa, NULL);',
  },
  'sig-bits': {
    title: 'Sending data bit by bit',
    definition:
      'With two signals you can send one bit at a time: a character is 8 signals. The receiver builds up the bits by shifting and, every 8, has a character.',
    example: 'c = (c << 1) | bit; if (++count == 8) { write(1, &c, 1); count = 0; c = 0; }',
  },
  'sh-quotes': {
    title: 'Quotes in the shell',
    definition:
      'Inside single quotes everything is literal; inside double quotes variables ($VAR) are expanded but words are not split. Without quotes, it is expanded and split on spaces.',
    example: 'echo \'$USER\' → $USER. echo "$USER" → your login.',
  },
  'sh-heredoc': {
    title: 'Heredoc (<<)',
    definition:
      'A heredoc passes to the command, as standard input, the lines you type up to a line that is exactly the delimiter.',
    example: 'cat << END\\nline 1\\nline 2\\nEND → prints the two lines.',
  },
  'sh-exit-codes': {
    title: 'Bash exit codes',
    definition:
      '0 is success; 1, generic error; 126, no permission to execute; 127, command not found; and 128 + N if a signal N ended the process.',
    example: 'Ctrl-C (SIGINT, 2) → $? = 130. Ctrl-\\ (SIGQUIT, 3) → 131.',
  },
  'sh-builtin-cd': {
    title: 'Builtins',
    definition:
      "A builtin is a command that the shell itself carries out, without launching a program. It is needed for anything that changes the shell's state: cd, export, unset, exit.",
    example:
      "cd in a child would change the child's directory, and the child dies right away: the shell would stay where it was.",
  },
  'sh-env-path': {
    title: 'PATH',
    definition:
      'PATH is a list of folders separated by «:». When you type a command without a «/», the shell looks for it in each folder, in order, and runs the first one it finds.',
    example: 'PATH=/usr/local/bin:/usr/bin:/bin → ls is found at /usr/bin/ls.',
  },
}
