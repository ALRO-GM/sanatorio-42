/** Banco de Not-games en inglés: Unix y procesos (`../unix.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const UNIX_EN: Readonly<Record<string, ConceptText>> = {
  'unix-sudo': {
    forms: [
      {
        ask: ['What is `sudo` for?', 'What does `sudo command` do?'],
        right: ['It runs the command as root', 'It runs the command with root rights'],
        wrong: [
          'It switches shell for that command',
          'It shuts the machine down safely',
          'It lists the processes of root',
          'It installs packages, and nothing else',
        ],
      },
      {
        ask: [
          'In which file do you configure who can use sudo?',
          'Where are the sudo rules you edit with visudo?',
        ],
        right: ['/etc/sudoers'],
        wrong: ['/etc/passwd', '/etc/shadow', '~/.bashrc'],
      },
    ],
    wrong: [
      'It switches shell for that command',
      'It shuts the machine down safely',
      'It lists the processes of root',
    ],
    why: 'sudo runs a command as another user (root, unless you say otherwise) following the rules in /etc/sudoers, which you edit with visudo so you do not break it.',
  },
  'unix-ssh-port': {
    forms: [
      {
        ask: ['On which port does SSH listen by default?', 'What is the standard SSH port?'],
        right: ['22'],
        wrong: ['21', '80', '443', '4242', '23'],
      },
      {
        ask: ['Which file configures the SSH server?', 'To change the SSH server port you edit…'],
        right: ['/etc/ssh/sshd_config'],
        wrong: ['/etc/ssh/ssh_config', '~/.ssh/known_hosts', '/etc/hosts'],
      },
    ],
    wrong: ['21', '80', '443', '4242'],
    why: 'SSH uses 22 by default; the server (sshd) is configured in sshd_config, and ssh_config is the client one.',
  },
  'unix-firewall': {
    forms: [
      {
        ask: ['What does a firewall like UFW do?', 'What is UFW for?'],
        right: [
          'It decides which connections are allowed',
          'It filters network traffic with rules',
        ],
        wrong: [
          'It encrypts the disk and its partitions',
          'It manages users and their passwords',
          'It encrypts the traffic leaving the network',
          'It speeds up the network with a cache',
        ],
      },
      {
        ask: [
          'Which UFW command lets connections through to port 4242?',
          'To open port 4242 in UFW you use…',
        ],
        right: ['ufw allow 4242'],
        wrong: ['ufw open 4242', 'ufw enable 4242', 'ufw deny 4242'],
      },
    ],
    wrong: [
      'It encrypts the disk and its partitions',
      'It manages users and their passwords',
      'It speeds up the network with a cache',
    ],
    why: 'A firewall filters traffic according to rules; with UFW you open ports with `allow`.',
  },
  'unix-lvm': {
    forms: [
      {
        ask: ['What advantage does LVM have over plain partitions?', 'What does LVM let you do?'],
        right: ['Resize volumes without repartitioning', 'Join several disks into one group'],
      },
    ],
    wrong: [
      'Make the disk faster to read',
      'Encrypt the data of the whole disk',
      'Do without a file system',
      'Make automatic backups',
    ],
    why: 'LVM puts a layer between disks and volumes: they can be joined, grown or shrunk without touching partitions.',
  },
  'unix-password-policy': {
    forms: [
      {
        ask: [
          'Where are password hashes stored in Linux?',
          'Which file holds the hashes of the user passwords?',
        ],
        right: ['/etc/shadow'],
        wrong: ['/etc/passwd', '/etc/group', '/etc/sudoers', '/var/log/auth.log'],
      },
      {
        ask: [
          'Which file lists the users, their shell and their folder?',
          'In which file does each user appear with their uid and shell?',
        ],
        right: ['/etc/passwd'],
        wrong: ['/etc/shadow', '/etc/group', '/etc/sudoers', '/etc/hosts'],
      },
    ],
    wrong: ['/etc/group', '/etc/sudoers', '/var/log/auth.log'],
    why: 'Anyone can read /etc/passwd (users); the hashes go separately, in /etc/shadow, which only root reads.',
  },
  'proc-fork': {
    forms: [
      {
        ask: ['What does `fork()` return in the child process?', 'In the child, fork returns…'],
        right: ['0'],
        wrong: ['-1', '1', '2'],
      },
      {
        ask: ['What does `fork()` return in the parent process?', 'In the parent, fork returns…'],
        right: ["The child's PID"],
        wrong: ["The parent's PID", 'Always -1', 'Nothing: it does not return'],
      },
    ],
    wrong: ["The parent's PID", 'Always -1', 'Nothing: it does not return'],
    why: "fork returns twice: 0 in the child and the child's PID in the parent (-1 if it fails).",
  },
  'proc-fork-count': {
    code: 'int main(void)\n{\n    fork();\n    fork();\n    printf("hello\\n");\n    return 0;\n}',
    forms: [
      {
        ask: ['How many times is "hello" printed?', 'How many "hello" lines come out?'],
        right: ['4'],
      },
      {
        ask: [
          'How many processes are there in total when reaching the printf?',
          'Counting the original, how many processes run the printf?',
        ],
        right: ['4'],
      },
    ],
    wrong: ['2', '3', '1', '8'],
    why: 'Each fork duplicates every process that already existed: 1 → 2 → 4 processes, and each one prints.',
  },
  'proc-exec': {
    forms: [
      {
        ask: [
          'What happens to the code after an `execve` that works?',
          'If execve succeeds, what happens to the lines after it?',
        ],
        right: ['They do not run: execve does not return', 'They never get to run'],
        wrong: [
          'They run when the new program ends',
          'They run in a separate thread, at the same time',
          'They run in the parent, not in the child',
        ],
      },
      {
        ask: [
          'What does `execve` return if it fails?',
          'When execve cannot run the program, it returns…',
        ],
        right: ['-1'],
        wrong: ['0', '1', '127'],
      },
    ],
    wrong: [
      'They run when the new program ends',
      'They run in a separate thread, at the same time',
      'They run in the parent, not in the child',
    ],
    why: 'execve replaces the image of the process; it only returns (with -1) if it did not manage to.',
  },
  'proc-pipe-ends': {
    forms: [
      {
        ask: ['After `pipe(fd)`, which end do you write to?', 'In a pipe, which is the write end?'],
        right: ['fd[1]'],
        wrong: ['fd[0]', 'fd[2]', 'fd[-1]'],
      },
      {
        ask: ['After `pipe(fd)`, which end do you read from?', 'In a pipe, which is the read end?'],
        right: ['fd[0]'],
        wrong: ['fd[1]', 'fd[2]', 'fd[-1]'],
      },
    ],
    wrong: ['fd[2]', 'fd[-1]', 'fd[3]'],
    why: 'pipe fills two descriptors: fd[0] to read and fd[1] to write (just as stdin is 0 and stdout is 1).',
  },
  'proc-dup2': {
    forms: [
      {
        ask: ['What does `dup2(fd, 1)` do?', 'What is `dup2(fd, STDOUT_FILENO)` for?'],
        right: [
          'It makes fd 1 point to the same thing as fd',
          'It redirects standard output to fd',
        ],
      },
    ],
    wrong: [
      'It copies the contents of the file to the output',
      'It closes fd and opens a new one',
      'It duplicates the process, like fork',
      'It writes the number fd to the output',
    ],
    why: 'dup2 makes the second descriptor a copy of the first: that is how output is redirected to a file or a pipe.',
  },
  'proc-pipe-hang': {
    forms: [
      {
        ask: ['This «ls | wc» hangs. Why?', 'What makes wc never finish?'],
        right: [
          'The parent does not close fd[1]: no EOF for wc',
          'The parent keeps fd[1] open, so wc waits',
        ],
      },
    ],
    wrong: [
      'A third fork for the parent is missing',
      'ls writes to stderr, not to the pipe',
      'wait only waits for one child, not two',
      'dup2 has its arguments the wrong way round',
      'execve needs the relative path',
    ],
    why: 'A reader only sees end of file when every write end is closed, including the one the parent inherited.',
  },
  'proc-zombie': {
    forms: [
      {
        ask: ['What is a zombie process?', 'When is a process said to be a zombie?'],
        right: [
          'It has ended and its parent has not called wait',
          'It is dead, but nobody has collected its status',
        ],
        wrong: [
          'It has lost its parent and init adopts it',
          'It uses too much memory and slows everything',
          'It is stopped with SIGSTOP until a SIGCONT',
          'It keeps running after its terminal closes',
        ],
      },
      {
        ask: ['A child that has ended and that the parent has not called wait for yet is called…'],
        right: ['Zombie'],
        wrong: ['Orphan', 'Daemon', 'Hung'],
      },
      {
        ask: [
          'How do you avoid leaving zombies?',
          'So that a finished child does not stay a zombie, the parent must…',
        ],
        right: ['Call wait or waitpid for it'],
        wrong: ['Kill it with kill', 'Call fork once more', 'Sleep until it goes away'],
      },
    ],
    wrong: [
      'It has lost its parent and init adopts it',
      'It uses too much memory and slows everything',
      'It is stopped with SIGSTOP until a SIGCONT',
    ],
    why: 'When it ends, a child stays in the process table until the parent collects its status with wait.',
  },
  'sig-sigusr': {
    forms: [
      {
        ask: [
          'Which two signals are usually used in minitalk to send bits?',
          'Which signals are left free for whatever each program wants?',
        ],
        right: ['SIGUSR1 and SIGUSR2'],
        wrong: [
          'SIGINT and SIGQUIT',
          'SIGKILL and SIGSTOP',
          'SIGSEGV and SIGBUS',
          'SIGALRM and SIGCHLD',
        ],
      },
      {
        ask: [
          'With which function do you send a signal to another process?',
          'To send SIGUSR1 to another process by its PID you use…',
        ],
        right: ['kill'],
        wrong: ['signal', 'raise', 'send', 'sigaction'],
      },
    ],
    wrong: ['SIGINT and SIGQUIT', 'SIGKILL and SIGSTOP', 'SIGSEGV and SIGBUS'],
    why: 'SIGUSR1 and SIGUSR2 have no fixed meaning; kill does not only kill: it sends any signal.',
  },
  'sig-sigaction': {
    forms: [
      {
        ask: [
          'What does `sigaction` offer that `signal` does not?',
          'Why is sigaction preferred to signal?',
        ],
        right: ['Knowing which PID sent it, with SA_SIGINFO', 'The same behaviour on every system'],
        wrong: [
          'Handling the signal faster than signal',
          'Working on Windows too',
          'Being able to catch SIGKILL too',
          'Not losing signals that arrive together',
        ],
      },
      {
        ask: [
          'Which two signals cannot be caught or ignored?',
          'For which signals is no handler possible?',
        ],
        right: ['SIGKILL and SIGSTOP'],
        wrong: ['SIGUSR1 and SIGUSR2', 'SIGINT and SIGQUIT', 'SIGTERM and SIGHUP'],
      },
    ],
    wrong: [
      'Handling the signal faster than signal',
      'Working on Windows too',
      'Being able to catch SIGKILL too',
    ],
    why: 'signal varies between systems; sigaction fixes the behaviour and gives information; SIGKILL and SIGSTOP can never be caught.',
  },
  'sig-bits': {
    forms: [
      {
        ask: [
          'Sending one bit per signal, how many signals does it take to send "Hi"?',
          'If each signal is one bit, how many signals does it cost to send 2 ASCII characters?',
        ],
        right: ['16'],
        wrong: ['2', '8', '32', '14'],
      },
      {
        ask: [
          'How many signals does it take to send one character, one bit per signal?',
          'Bit by bit, how many signals is a char?',
        ],
        right: ['8'],
        wrong: ['16', '1', '4', '7'],
      },
    ],
    wrong: ['2', '4', '32', '7'],
    why: 'A char is 8 bits: with one bit per signal, 8 signals per character.',
  },
  'sh-quotes': {
    forms: [
      {
        ask: ["What does `echo '$HOME'` print?", 'What comes out of `$HOME` in single quotes?'],
        right: ['$HOME, as it is, not expanded'],
        wrong: [
          'The path of your home folder',
          'The word HOME, without the dollar',
          'An empty line, with nothing',
          'A syntax error because of the $',
        ],
      },
      {
        ask: ['What does `echo "$HOME"` print?', 'In double quotes, what does `$HOME` turn into?'],
        right: ['The path of your home folder'],
        wrong: [
          '$HOME, as it is, not expanded',
          'The word HOME, without the dollar',
          '"$HOME", with the quotes',
          'A syntax error because of the $',
        ],
      },
    ],
    wrong: [
      'The word HOME, without the dollar',
      'A syntax error because of the $',
      'An empty line, with nothing',
    ],
    why: 'Single quotes keep everything literal; double quotes let variables expand.',
  },
  'sh-heredoc': {
    forms: [
      {
        ask: ['What does `cat << END` do?', 'What is a heredoc (`<< END`) for?'],
        right: [
          'It gives cat the lines you type up to END',
          'It feeds the text up to the delimiter as input',
        ],
      },
    ],
    wrong: [
      'It appends END to the end of a file',
      'It redirects the output of cat to a file END',
      'It reads the contents of a file called END',
      'It compares the output of cat with the word END',
    ],
    why: 'The heredoc collects lines up to the delimiter and gives them as the standard input of the command.',
  },
  'sh-exit-codes': {
    forms: [
      {
        ask: [
          'What exit code does bash give if the command does not exist?',
          'What does `no_such_command; echo $?` print?',
        ],
        right: ['127'],
        wrong: ['1', '0', '126', '255'],
      },
      {
        ask: [
          'What exit code does a command interrupted with Ctrl-C give?',
          'After stopping a command with SIGINT, what is `$?`?',
        ],
        right: ['130'],
        wrong: ['127', '2', '1', '255'],
      },
    ],
    wrong: ['1', '0', '-1', '255', '2'],
    why: '127 is "command not found"; ending because of signal N gives 128 + N (SIGINT is 2: 130).',
  },
  'sh-builtin-cd': {
    forms: [
      {
        ask: ['Why must `cd` be a shell builtin?', 'Why can cd not be a separate program?'],
        right: [
          'A child cannot change the directory of its parent',
          'It would change the directory of a child, not the shell',
        ],
      },
    ],
    wrong: [
      'Because it needs root rights to get in',
      'For compatibility with the Windows shell',
      'Because the kernel does not let /bin/cd run',
      'Because the 42 Norm requires it',
    ],
    why: 'The current directory belongs to each process: only the shell itself can change its own.',
  },
  'sh-env-path': {
    forms: [
      {
        ask: [
          'How does the shell use PATH when you type a command with no path?',
          'When you type `ls`, how does the shell find the program?',
        ],
        right: [
          'It looks in each folder of PATH, in order',
          'It tries the PATH folders until it finds it',
        ],
      },
    ],
    wrong: [
      'It searches the whole disk, folder by folder',
      'It only looks in the current folder',
      'It looks in /bin and nowhere else',
      'It looks it up in the /etc/programs list',
    ],
    why: 'PATH is a list of folders separated by «:»; each one is tried until an executable with that name is found.',
  },
  'b2br-groups-host': {
    forms: [
      {
        ask: [
          'In Born2beroot, which groups must your user belong to?',
          'Which two groups does the Born2beroot subject want your user in?',
        ],
        right: ['user42 and sudo'],
        wrong: ['root and sudo', 'user42 and root', 'users and adm', 'admin and user42'],
      },
      {
        ask: [
          'What machine name (hostname) does Born2beroot ask for?',
          'The hostname of your Born2beroot machine must be…',
        ],
        right: ['Your login followed by 42'],
        wrong: [
          'born2beroot, nothing more',
          'Your login in capitals',
          'debian followed by 42',
          'Your login followed by 4242',
        ],
      },
      {
        ask: [
          'Which command puts the user ana in the group user42 without removing the others?',
          'To add ana to the group user42 while keeping her other groups you use…',
        ],
        right: ['usermod -aG user42 ana'],
        wrong: ['groupadd user42 ana', 'chgrp user42 ana', 'useradd -g user42 ana'],
      },
    ],
    wrong: ['root and sudo', 'user42 and root', 'users and adm'],
    why: 'The subject asks for a user with your login in the groups user42 and sudo and a machine named after your login ending in 42; usermod -aG adds a group without removing the existing ones.',
  },
  'b2br-hardening': {
    forms: [
      {
        ask: [
          'Which sshd_config line stops anyone from logging in over SSH as root?',
          'So that nobody can connect over SSH as root, in sshd_config you put…',
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
          'What does AppArmor, which Born2beroot wants running from boot, do?',
          'What is AppArmor for on Debian?',
        ],
        right: ['It limits what each program can do'],
        wrong: [
          'It encrypts the partitions of the disk',
          'It filters network traffic by port',
          'It forces the use of strong passwords',
          'It runs tasks at fixed times',
        ],
      },
    ],
    wrong: [
      'It encrypts the partitions of the disk',
      'It filters network traffic by port',
      'It forces the use of strong passwords',
    ],
    why: 'PermitRootLogin no shuts SSH to root (with neither password nor key); AppArmor locks each program in a profile with what it may touch.',
  },
  'b2br-password': {
    forms: [
      {
        ask: [
          'In which file do you set PASS_MAX_DAYS for users created from then on?',
          'The default password expiry for new users is set in…',
        ],
        right: ['/etc/login.defs'],
        wrong: ['/etc/passwd', '/etc/sudoers', '/etc/pam.d/sshd', '/etc/security/limits.conf'],
      },
      {
        ask: [
          'Which PAM module enforces length, capitals and digits in passwords?',
          'The strong password policy of Born2beroot is set up with…',
        ],
        right: ['pam_pwquality'],
        wrong: ['pam_limits', 'pam_env', 'pam_motd', 'pam_faildelay'],
      },
      {
        ask: [
          'What minimum password length does Born2beroot ask for?',
          'How many characters must a password have, at least, in Born2beroot?',
        ],
        right: ['10'],
        wrong: ['8', '12', '6', '16'],
      },
    ],
    wrong: ['/etc/passwd', '/etc/sudoers', '/etc/hosts'],
    why: 'login.defs gives new users their expiry (existing ones are changed with chage) and pam_pwquality demands at least 10 characters with a capital, a lowercase letter and a digit.',
  },
  'b2br-monitoring': {
    forms: [
      {
        ask: [
          'How often must monitoring.sh show its information?',
          'From boot, monitoring.sh shows its data again every…',
        ],
        right: ['10 min'],
        wrong: ['5 min', '15 min', '30 min', '60 min'],
      },
      {
        ask: [
          'Which service runs monitoring.sh every few minutes?',
          'To run monitoring.sh periodically you use…',
        ],
        right: ['cron'],
        wrong: ['at', 'sudo', 'ufw', 'apt'],
      },
      {
        ask: [
          'With which command does monitoring.sh write to every terminal?',
          'So that the message shows up in the terminal of every user you use…',
        ],
        right: ['wall'],
        wrong: ['echo', 'write', 'printf', 'cat'],
      },
    ],
    wrong: ['sudo', 'ufw', 'echo'],
    why: 'cron runs the script every 10 minutes and wall sends what it writes to every open terminal.',
  },
  'pipex-equivalent': {
    forms: [
      {
        ask: [
          'Which shell command is `./pipex infile "grep a" "wc -l" outfile` equivalent to?',
          'According to the subject, `./pipex infile "grep a" "wc -l" outfile` does the same as…',
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
          'In the bonus, what is `./pipex here_doc FIN cat "wc -l" outfile` equivalent to?',
          'With here_doc, `./pipex here_doc FIN cat "wc -l" outfile` does the same as…',
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
    why: 'pipex acts as `< infile cmd1 | cmd2 > outfile`; with here_doc it reads up to the delimiter and appends with >>, like `cmd << LIMITER | cmd1 >> file`.',
  },
  'pipex-path': {
    forms: [
      {
        ask: [
          'What does `access(path, X_OK)` check in pipex?',
          'Before calling execve, what does `access` look at with X_OK?',
        ],
        right: ['Whether that path exists and can be run'],
        wrong: [
          'Whether another process has the file open',
          'Whether the command is in the PATH variable',
          'Whether you have root rights to launch it',
          'Whether the program ended well',
        ],
      },
      {
        ask: [
          'With a bare `ls` command, where does pipex get the folders to look in?',
          'To find `wc` with no path, where does pipex get the list of folders?',
        ],
        right: ['From the PATH= line of envp'],
        wrong: [
          'From the file /etc/programs',
          'From the current folder, and nothing else',
          'From argv[0], the path of pipex',
          'From a fixed list inside execve',
        ],
      },
    ],
    wrong: [
      'Whether another process has the file open',
      'Whether you have root rights to launch it',
      'Whether the program ended well',
    ],
    why: 'execve does not search PATH: pipex splits the PATH= line of envp on «:», glues the name to each folder and uses access with X_OK to find the one that can be run.',
  },
  'pipex-wait': {
    forms: [
      {
        ask: [
          'In the shell, what exit code does `< in cmd1 | cmd2 > out` give?',
          'Which command does the exit code of a pipeline `cmd1 | cmd2` come from?',
        ],
        right: ['That of cmd2, the last command'],
        wrong: [
          'That of cmd1, the first command',
          'The larger of the two codes',
          'The sum of the two codes',
          'That of cmd1 if it failed',
        ],
      },
      {
        ask: [
          'Which macro gets the exit code out of the status filled by `waitpid`?',
          'After `waitpid(pid, &status, 0)`, the code the child exited with is read with…',
        ],
        right: ['`WEXITSTATUS(status)`'],
        wrong: ['`WIFEXITED(status)`', '`WTERMSIG(status)`', '`WSTOPSIG(status)`', '`status >> 4`'],
      },
    ],
    wrong: [
      'That of cmd1, the first command',
      'The larger of the two codes',
      'The sum of the two codes',
    ],
    why: 'The shell returns the code of the last command of the pipeline; waitpid leaves it encoded in status and WEXITSTATUS gets it out (WIFEXITED only says whether it exited normally).',
  },
  'talk-pid': {
    forms: [
      {
        ask: [
          'How does the minitalk client know which process to send the signals to?',
          'How does the minitalk client find the server?',
        ],
        right: ['You pass it the PID the server prints'],
        wrong: [
          'It looks it up by name with the ps command',
          'It reads it from a file the server creates',
          'It sends the signals to every process',
          'It uses getpid(), which gives the server one',
        ],
      },
      {
        ask: [
          'Which function does the minitalk server use to know its own PID?',
          'To print its PID at start-up, the server calls…',
        ],
        right: ['getpid'],
        wrong: ['getppid', 'kill', 'pause', 'sigaction'],
      },
      {
        ask: [
          'In the bonus, where does the server get the PID of the client it acknowledges?',
          'To send it the acknowledgement, where does the server get the PID of the client?',
        ],
        right: ['From the si_pid given by sigaction with SA_SIGINFO'],
        wrong: [
          'From getppid(): the client is its parent',
          'From getpid(), which gives the client one',
          'From the number of the signal it gets',
        ],
      },
    ],
    wrong: [
      'It looks it up by name with the ps command',
      'It reads it from a file the server creates',
      'It sends the signals to every process',
    ],
    why: 'The server prints its PID with getpid and you pass it to the client; in the bonus, sigaction with SA_SIGINFO gives it in si_pid who sent the signal.',
  },
  'talk-ack': {
    forms: [
      {
        ask: [
          'Why can the minitalk client not send all the signals in a row, without waiting?',
          'What goes wrong if the client sends signals faster than the server handles them?',
        ],
        right: ['Identical pending ones merge and get lost'],
        wrong: [
          'The kernel only allows one per second',
          'kill fails if the server is busy',
          'SIGUSR1 and SIGUSR2 cancel each other out',
          'The server quits if it gets too many',
        ],
      },
      {
        ask: [
          'In the minitalk bonus, what does the server do when it receives a message?',
          'How does the bonus server confirm that it got a message?',
        ],
        right: ['It sends a signal back to the client'],
        wrong: [
          'It writes the PID of the client to a file',
          'It quits until someone starts it again',
          'It answers OK through a pipe',
          'It prints the message twice in a row',
        ],
      },
    ],
    wrong: [
      'The kernel only allows one per second',
      'kill fails if the server is busy',
      'SIGUSR1 and SIGUSR2 cancel each other out',
    ],
    why: 'A standard signal is not queued: if another identical one arrives before the first is handled, it is lost; so the client waits, and in the bonus the server confirms with a signal.',
  },
  'talk-unicode': {
    forms: [
      {
        ask: [
          'Why does minitalk, which sends bytes bit by bit, already work for UTF-8 text?',
          'With one bit per signal, why do letters like «ñ» or «€» arrive fine?',
        ],
        right: ['Because UTF-8 is bytes, sent the same way'],
        wrong: [
          'Because each signal carries a whole character',
          'Because SIGUSR2 is used for unusual letters',
          'Because write turns the bytes into ASCII',
          'Because the terminal guesses the missing letter',
        ],
      },
      {
        ask: ['At one bit per signal, how many signals does sending «ñ» in UTF-8 cost?'],
        right: ['16'],
        wrong: ['8', '1', '32', '2'],
      },
      {
        ask: ['Sending one bit per signal, how many signals does «€» take in UTF-8?'],
        right: ['24'],
        wrong: ['8', '16', '32', '3'],
      },
    ],
    wrong: ['4', '12', '64'],
    why: 'UTF-8 writes each character with 1 to 4 bytes: the server puts the bytes back together and write prints them; «ñ» is 2 bytes (16 signals) and «€», 3 (24).',
  },
  'msh-signals': {
    forms: [
      {
        ask: [
          'What may the single global variable minishell allows hold?',
          'What does the minishell subject let you keep in its global variable?',
        ],
        right: ['The number of the signal received, nothing else'],
        wrong: [
          'The whole state of the shell, in a struct',
          'The list of environment variables',
          'The last exit code, the one in $?',
          'The history of the commands typed',
        ],
      },
      {
        ask: [
          'What does minishell do with Ctrl-C at the prompt, with nothing running?',
          'You press Ctrl-C at the empty minishell prompt. What happens?',
        ],
        right: ['It shows a new prompt on a new line'],
        wrong: [
          'It closes minishell, just like exit',
          'It clears the screen and leaves the prompt on top',
          'It repeats the last command of the history',
          'Nothing: it ignores it like Ctrl-\\',
        ],
      },
      {
        ask: [
          'In bash, what is `$?` after pressing Ctrl-C at the prompt?',
          'After a Ctrl-C at the bash prompt, `echo $?` prints…',
        ],
        right: ['130'],
        wrong: ['0', '1', '2', '127'],
      },
    ],
    wrong: [
      'It closes minishell, just like exit',
      'It clears the screen and leaves the prompt on top',
      'It repeats the last command of the history',
    ],
    why: 'The global only holds the signal number (everything else goes in your structs); Ctrl-C gives a new prompt on a new line and bash sets $? to 130 (128 + SIGINT).',
  },
  'msh-readline': {
    forms: [
      {
        ask: [
          'What does Ctrl-D do at the empty minishell prompt?',
          'You press Ctrl-D in minishell without typing anything. What happens?',
        ],
        right: ['It leaves minishell, like exit'],
        wrong: [
          'It shows a new prompt on a new line',
          'It deletes the last letter you typed',
          'It sends SIGQUIT and leaves a core dump',
          'Nothing: only Ctrl-C and Ctrl-\\ count',
        ],
      },
      {
        ask: [
          'What does `readline` return if Ctrl-D is pressed on an empty line?',
          'When it reaches the end of input, readline returns…',
        ],
        right: ['`NULL`'],
        wrong: ['`""`', '`"\\n"`', '`EOF`'],
      },
      {
        ask: [
          'Which function saves a line in the readline history?',
          'For the up arrow to bring back what you typed, you call…',
        ],
        right: ['add_history'],
        wrong: ['rl_on_new_line', 'rl_redisplay', 'rl_replace_line'],
      },
    ],
    wrong: [
      'It shows a new prompt on a new line',
      'It deletes the last letter you typed',
      'It sends SIGQUIT and leaves a core dump',
    ],
    why: 'On an empty line, Ctrl-D is end of input: readline returns NULL and minishell exits; add_history saves each line for the arrow keys.',
  },
  'msh-env-expand': {
    forms: [
      {
        ask: [
          'In bash, what does `export VAR` without `=` do if VAR did not exist?',
          'With VAR undefined, what does `export VAR` achieve in bash?',
        ],
        right: ['It marks it for export, with no value'],
        wrong: [
          'It creates it empty, and env shows it as VAR=',
          'It gives an error because the = is missing',
          'It removes it from the environment, like unset',
          'It prints the value VAR has',
        ],
      },
      {
        ask: [
          'In bash, what happens with `echo hola > $NADA` if NADA is not defined?',
          'If `$NADA` is empty, what does bash do with `echo hola > $NADA`?',
        ],
        right: ['An error: ambiguous redirect'],
        wrong: [
          'It writes hola to a file called $NADA',
          'It writes hola on the screen, nothing more',
          'It creates an empty file with no name',
          'It writes hola to a file called NADA',
        ],
      },
      {
        ask: [
          'If USER is ana, what does `echo "$USER"\'$USER\'` print?',
          'With USER=ana, the command `echo "$USER"\'$USER\'` prints…',
        ],
        right: ['ana$USER'],
        wrong: ['anaana', '$USER$USER', "ana'$USER'", '$USERana'],
      },
    ],
    wrong: [
      'It gives an error because the = is missing',
      'It removes it from the environment, like unset',
      'It prints the value VAR has',
    ],
    why: 'export VAR with no value only marks it (it shows in export, not in env); redirecting to an empty unquoted variable is ambiguous; and inside single quotes $USER is not expanded.',
  },
}
