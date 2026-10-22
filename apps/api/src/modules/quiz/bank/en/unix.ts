/** Banco de Not-games en inglés: Unix y procesos (`../unix.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const UNIX_EN: Readonly<Record<string, ConceptText>> = {
  'unix-sudo': {
    forms: [
      {
        ask: ['What is `sudo` for?', 'What does `sudo command` do?'],
        right: [
          'It runs the command with the permissions of another user (usually root)',
          'It runs the command as root, if you are allowed to',
        ],
        wrong: [
          'It changes the shell',
          'It shuts the machine down',
          'It lists the processes',
          'It installs packages, and nothing else',
        ],
      },
      {
        ask: [
          'In which file do you set who can use sudo?',
          'Where are the sudo rules that you edit with visudo?',
        ],
        right: ['/etc/sudoers'],
        wrong: ['/etc/passwd', '/etc/shadow', '~/.bashrc'],
      },
    ],
    wrong: ['It changes the shell', 'It shuts the machine down', 'It lists the processes'],
    why: 'sudo runs as another user according to the rules in /etc/sudoers, which you edit with visudo so you do not break it.',
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
          'It decides which network connections are allowed and which are not',
          'It filters network traffic by ports and rules',
        ],
        wrong: [
          'It encrypts the disk',
          'It manages users',
          'It compresses files',
          'It speeds up the network',
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
    wrong: ['It encrypts the disk', 'It manages users', 'It compresses files'],
    why: 'A firewall filters traffic according to rules; with UFW you open ports with `allow`.',
  },
  'unix-lvm': {
    forms: [
      {
        ask: ['What advantage does LVM have over normal partitions?', 'What does LVM let you do?'],
        right: [
          'Create logical volumes and resize them flexibly',
          'Join disks and resize volumes without repartitioning',
        ],
      },
    ],
    wrong: [
      'Make the disk faster',
      'Encrypt the data',
      'Do without a file system',
      'Make automatic backups',
    ],
    why: 'LVM adds a layer between disks and volumes: they can be joined, grown or shrunk without touching partitions.',
  },
  'unix-password-policy': {
    forms: [
      {
        ask: [
          'Where are password hashes stored in Linux?',
          'In which file are the (encrypted) user passwords?',
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
          'What happens to the code after an `execve` that succeeds?',
          'If execve succeeds, what happens to the lines that follow it?',
        ],
        right: [
          'They never run: the process becomes the new program',
          'Nothing: the process is replaced and execve does not return',
        ],
        wrong: [
          'They run when the new program ends',
          'They run in a separate thread',
          'They run in the parent',
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
      'They run in a separate thread',
      'They run in the parent',
    ],
    why: 'execve replaces the process image; it only returns (with -1) if it did not manage to.',
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
          'It makes descriptor 1 point to the same thing as fd',
          'It redirects standard output to where fd points',
        ],
      },
    ],
    wrong: [
      'It copies the contents of the file to the output',
      'It closes fd and opens a new one',
      'It duplicates the process',
      'It writes fd on the screen',
    ],
    why: 'dup2 makes the second descriptor a copy of the first: that is how output is redirected to a file or a pipe.',
  },
  'proc-pipe-hang': {
    forms: [
      {
        ask: ['This "ls | wc" hangs. Why?', 'What makes wc never finish?'],
        right: [
          'The parent does not close fd[1]: wc never gets the end of file',
          'The parent leaves a write end open, so wc waits forever',
        ],
      },
    ],
    wrong: [
      'A third fork is missing',
      'ls writes to stderr',
      'wait only waits for one child',
      'dup2 is used the wrong way round',
      'execve needs the relative path',
    ],
    why: 'A reader only sees end of file when every write end is closed, including the one the parent inherited.',
  },
  'proc-zombie': {
    forms: [
      {
        ask: ['What is a zombie process?', 'When is a process said to be a zombie?'],
        right: [
          'It has finished, but its parent has not collected its status yet',
          'It is dead and waiting for its parent to call wait',
        ],
        wrong: [
          'It does not respond to signals',
          'It has lost its parent',
          'It uses too much memory',
          'It is stopped with SIGSTOP',
        ],
      },
      {
        ask: ['A child that has finished and that the parent has not waited for yet is called…'],
        right: ['Zombie'],
        wrong: ['Orphan', 'Daemon', 'Hung'],
      },
      {
        ask: [
          'How do you avoid leaving zombies?',
          'So that a finished child does not stay a zombie, the parent must…',
        ],
        right: ['Call wait or waitpid for it'],
        wrong: ['Kill it with kill', 'Fork again', 'Wait with sleep until it disappears'],
      },
    ],
    wrong: ['It does not respond to signals', 'It has lost its parent', 'It uses too much memory'],
    why: 'When it finishes, a child stays in the process table until the parent collects its status with wait.',
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
          'Why is sigaction preferred over signal?',
        ],
        right: [
          'Defined behaviour and more control (mask, flags, who sent it)',
          'With SA_SIGINFO you know the PID of the sender, among other things',
        ],
        wrong: ['It is faster', 'It works on Windows', 'It sends the signal twice'],
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
    wrong: ['It is faster', 'It works on Windows', 'It sends the signal twice'],
    why: 'signal varies between systems; sigaction fixes the behaviour and gives information; SIGKILL and SIGSTOP are never caught.',
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
        ask: ["What does `echo '$HOME'` print?", 'What happens to `$HOME` inside single quotes?'],
        right: ['$HOME, as is, not expanded'],
        wrong: ['The path of your home folder', 'A syntax error', 'Nothing', 'HOME'],
      },
      {
        ask: ['What does `echo "$HOME"` print?', 'What happens to `$HOME` inside double quotes?'],
        right: ['It is expanded: the path of your home folder comes out'],
        wrong: ['$HOME, as is, not expanded', 'A syntax error', 'Nothing', 'HOME'],
      },
    ],
    wrong: ['A syntax error', 'Nothing', 'HOME'],
    why: 'Single quotes keep everything literal; double quotes let variables expand.',
  },
  'sh-heredoc': {
    forms: [
      {
        ask: ['What does `cat << END` do?', 'What is a heredoc (`<< END`) for?'],
        right: [
          'It reads lines until one that says END and gives them to cat as input',
          'It passes the command, as input, the text written up to the delimiter',
        ],
      },
    ],
    wrong: [
      'It appends END to the end of a file',
      'It redirects the output to a file called END',
      'It reads the file END',
      'It compares the output of cat with END',
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
          "A child process cannot change its parent's directory",
          "It would change the directory of a child that dies straight away, not the shell's",
        ],
      },
    ],
    wrong: [
      'For speed',
      'Because /bin/cd does not exist',
      'Because it needs root permissions',
      'For compatibility with Windows',
    ],
    why: 'The current directory belongs to each process: only the shell itself can change its own.',
  },
  'sh-env-path': {
    forms: [
      {
        ask: [
          'What does the shell use the PATH variable for?',
          'When you type `ls`, how does the shell find the program?',
        ],
        right: [
          'It looks for it in the folders of that list, in order',
          'It tries each folder of the list until it finds an executable',
        ],
      },
    ],
    wrong: [
      'It searches the whole disk',
      'It only looks in the current folder',
      'It downloads it from the internet',
      'It looks in /etc/programs',
    ],
    why: 'PATH is a list of folders separated by ":"; each one is tried until an executable with that name is found.',
  },
}
