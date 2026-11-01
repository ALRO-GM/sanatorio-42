/** Repaso de Not-games en inglés: traducción de `../review-piscine-shell.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_PISCINE_SHELL_EN: Readonly<Record<string, ReviewEntry>> = {
  'pis-sh00-cat-e': {
    title: 'cat -e and the end of line',
    definition:
      'cat -e shows what you cannot see: it puts a $ where each line ends (where the \\n is) and writes control characters with ^. It tells you whether a file ends with a newline.',
    example: 'echo Z > z; cat -e z prints Z$ (and z takes 2 bytes).',
  },
  'pis-sh00-echo-n': {
    title: 'echo and echo -n',
    definition:
      'echo writes its arguments followed by a newline. With -n it leaves that final newline out. With > the output goes to a file, which is created or emptied.',
    example: 'echo Z > z leaves “Z\\n” (2 bytes); echo -n Z > z leaves only “Z” (1 byte).',
  },
  'pis-sh00-tar': {
    title: 'Archives with tar',
    definition:
      'tar bundles files into one archive and keeps their permissions and dates. The first letter says what to do: c (create), x (extract) or t (list); f is followed by the .tar name.',
    example:
      'tar -cf exo.tar ex00 ex01 creates the archive; tar -tf exo.tar lists it; tar -xf exo.tar extracts it.',
  },
  'pis-sh00-touch-t': {
    title: 'Setting the date with touch -t',
    definition:
      'touch creates the file if it does not exist and, if it does, changes its date. With -t you give the date yourself, as [[CC]YY]MMDDhhmm[.ss]: the year is optional and month and day come first.',
    example: 'touch -t 202106012342 f dates f June 1st 2021 at 23:42.',
  },
  'pis-sh00-ls-l-line': {
    title: 'Reading an ls -l line',
    definition:
      'Each ls -l line holds, in order: the type (- file, d directory, l link) and the owner, group and others permissions; the number of hard links; the owner; the group; the size in bytes; the modification date and the name.',
    example:
      '-r--r-xr-x 1 ana staff 40 Jun 1 23:42 testShell00: permissions 455, 1 link, 40 bytes.',
  },
  'pis-sh00-ls-type': {
    title: 'The type in ls -l',
    definition:
      'The first character of each ls -l line tells what the entry is: - a regular file, d a directory, l a symbolic link (and c or b, devices). A hard link looks like any file.',
    example: 'drwxr-xr-x is a directory; lrwxr-xr-x test6 -> test0, a symbolic link.',
  },
  'pis-sh00-octal': {
    title: 'Octal permissions',
    definition:
      'Octal chmod takes three digits: owner, group and others. Each adds 4 (read), 2 (write) and 1 (execute), from 0 to 7.',
    example: 'chmod 640 f gives rw-r-----; chmod 711 f gives rwx--x--x; rwxr-x--- is 750.',
  },
  'pis-sh00-chmod-sym': {
    title: 'Symbolic chmod',
    definition:
      'Instead of setting all nine permissions in octal, you change just some: who (u owner, g group, o others, a all), + or - and what (r, w, x). Whatever is not named stays as it was.',
    example:
      'chmod u+x script.sh turns rw-r--r-- into rwxr--r--; chmod go-w f removes w from group and others.',
  },
  'pis-sh00-umask': {
    title: 'The umask',
    definition:
      'The umask says which permissions what you create will NOT have. A new file starts from 666 and a directory from 777; the bits set in the umask are removed.',
    example: 'With umask 022: touch f gives 644 (rw-r--r--) and mkdir d gives 755 (rwxr-xr-x).',
  },
  'pis-sh00-dir-x': {
    title: 'Directory permissions',
    definition:
      'On a directory the permissions do not mean the same as on a file: r is seeing the names it holds, w is creating, renaming and deleting inside, and x is entering it with cd and reaching its files.',
    example: 'With chmod 644 dir, ls dir shows the names, but cd dir says “Permission denied”.',
  },
  'pis-sh00-ln-hard': {
    title: 'Hard links',
    definition:
      'ln a b gives the file a a second name, b, pointing to the same inode (the same data). ls -l shows how many names it has; delete one and the other still holds the content.',
    example: 'ln test3 test5; ls -l test3 shows 2 links; rm test3 and test5 can still be read.',
  },
  'pis-sh00-ln-sym': {
    title: 'Symbolic links',
    definition:
      'A symbolic link is a small file that stores a path to another one. It is made with ln -s target name (the target first). If the target is deleted, the link breaks.',
    example: 'ln -s test0 test6; ls -l shows lrwxr-xr-x ... 5 ... test6 -> test0.',
  },
  'pis-sh00-dir-links': {
    title: "A directory's links",
    definition:
      "A directory's link count counts the names leading to it: its own in the parent, its own “.” and the “..” of each subdirectory.",
    example: 'mkdir d gives 2 links; after mkdir d/a d/b, ls -ld d shows 4.',
  },
  'pis-sh00-ssh-keygen': {
    title: 'SSH keys',
    definition:
      'ssh-keygen generates two keys that go together: the private one (id_rsa), which is your secret, and the public one (id_rsa.pub), which goes on servers or the intra so they recognise you.',
    example:
      'ssh-keygen leaves ~/.ssh/id_rsa and ~/.ssh/id_rsa.pub; you paste the .pub into the intra.',
  },
  'pis-sh00-ssh-auth': {
    title: 'Logging in with an SSH key',
    definition:
      "To log in without a password, your public key is added to the server's ~/.ssh/authorized_keys (ssh-copy-id does it for you). When connecting you prove you hold the private key without sending it: that is why it is never shared.",
    example: 'ssh-copy-id ana@host, then ssh ana@host logs in without asking for the password.',
  },
  'pis-sh00-ls-opts': {
    title: 'ls options',
    definition:
      'ls changes format and order with its options: -m puts commas between names, -p adds / to directories, -t sorts by modification date, -S by size and -r reverses the order.',
    example: 'ls -mp gives something like “ex00/, ex01/, notes.txt”.',
  },
  'pis-sh00-midls': {
    title: 'midLS and hidden files',
    definition:
      'ls options combine: ls -mtp separates with commas, sorts by date and marks directories. A file whose name starts with a dot is hidden: ls does not show it unless you use -a or -A.',
    example: 'ls does not show .gitignore; ls -A does, and ls -a also shows . and ..',
  },
  'pis-sh00-ls-r': {
    title: 'ls -R and ls -r',
    definition:
      'Options are case-sensitive: ls -R lists the folder and then each subdirectory below it, one after another; ls -r lists the same as ls but in reverse order.',
    example:
      'ls -R shows “./ex00:”, its contents, and so on for each folder; ls -tr puts the newest last.',
  },
  'pis-sh00-git-log': {
    title: 'git log with a format',
    definition:
      'git log shows the history. With -n (or -5) it keeps only the latest commits, and with --format (or --pretty=format:) you decide what each one prints: %H full hash, %h short, %an author, %s message.',
    example: 'git log -5 --format=%H prints 5 lines of 40 characters, the newest on top.',
  },
  'pis-sh00-gitignore': {
    title: 'The .gitignore',
    definition:
      '.gitignore lists patterns of files git should not offer to add (objects, binaries, .DS_Store…). It deletes nothing and does not untrack what is already in the repository.',
    example:
      'With *.o in .gitignore, git status stops showing main.o; git status --ignored does show it.',
  },
  'pis-sh00-diff-patch': {
    title: 'diff and patch',
    definition:
      'diff compares two files line by line and writes the differences: < for the first and > for the second. That output is a patch: patch reads it and turns the first file into the second.',
    example: 'diff a b > sw.diff; patch a sw.diff; now diff a b prints nothing.',
  },
  'pis-sh00-find-clean': {
    title: 'Cleaning up with find',
    definition:
      'find searches from a folder downward and applies tests: -type f (files), -name with a quoted pattern so the shell does not expand it, -o for “one or the other”. At the end, -delete or -exec rm {} \\; act on each result.',
    example: "find . -type f \\( -name '*~' -o -name '#*#' \\) -print -delete",
  },
  'pis-sh00-find-exec': {
    title: 'find -exec',
    definition:
      'With -exec, find runs a command for each result: {} is replaced by the found path and \\; marks the end of the command (the backslash stops the shell from reading the semicolon).',
    example: "find . -name '*~' -exec rm {} \\; runs rm ./a~, then rm ./ex00/b~…",
  },
  'pis-sh00-file-magic': {
    title: 'file and magic files',
    definition:
      'Many formats start with fixed bytes, the magic number (a PNG, for instance). file looks for them with a signature database; a magic file of your own describes a new signature and is passed with file -m.',
    example:
      'A PNG starts with \\x89PNG: file photo.dat says “PNG image” even though it is called .dat.',
  },
  'pis-sh00-paths': {
    title: 'Absolute and relative paths',
    definition:
      'An absolute path starts at the root, /, and works wherever you are. A relative one starts from the current folder: . is the folder itself, .. the parent. ~ is replaced by your home folder ($HOME).',
    example:
      'From /home/ana/piscine, ../ex00 is /home/ana/ex00, and so is ~/ex00 if HOME is /home/ana.',
  },
  'pis-sh00-mkdir-rm': {
    title: 'mkdir -p and rm -r',
    definition:
      'mkdir creates a folder; with -p it also creates any missing ones along the way and does not complain if it exists. rm deletes files; with -r it goes into folders and deletes everything, with no bin.',
    example: 'mkdir -p ex00/test creates both; rm -r ex00 deletes them with whatever is inside.',
  },
  'pis-sh00-cp-mv': {
    title: 'cp and mv',
    definition:
      'mv moves or renames; cp copies. If the last argument is an existing folder, the others go inside it. cp does not copy folders without -r (recursive).',
    example: 'mv z ex00 leaves ex00/z; cp -r ex00 backup makes a full copy of ex00.',
  },
  'pis-sh00-man': {
    title: 'man and pwd',
    definition:
      'man command opens its manual; pages are split by section (1 commands, 2 system calls, 3 C library) and man 2 write picks one. pwd prints the absolute path of where you are.',
    example: 'man 2 write shows the write system call, not the write command from section 1.',
  },
  'pis-sh01-groups': {
    title: 'print_groups: id and tr',
    definition:
      "id -G gives a user's group numbers, and with -n their names (-g would be only the primary one). tr swaps characters: tr ' ' ',' puts commas where spaces were and tr -d '\\n' deletes the newlines.",
    example: "id -Gn $FT_USER | tr ' ' ',' | tr -d '\\n' gives “staff,piscine,student”.",
  },
  'pis-sh01-env': {
    title: 'Environment variables',
    definition:
      'NAME=value creates a shell variable; export puts it in the environment, which the programs and scripts you run receive. It is read with $NAME (case matters) and env lists them all.',
    example: 'export FT_USER=nours; ./print_groups.sh can now read $FT_USER.',
  },
  'pis-sh01-shebang': {
    title: 'Running a script',
    definition:
      'A script starts with the shebang (#!/bin/sh), which says which interpreter reads it. To run it like a program it needs execute permission (chmod +x) and a path (./script.sh), because the shell only looks up bare names in the PATH folders.',
    example: 'chmod +x find_sh.sh; ./find_sh.sh. Without the ./ you get “command not found”.',
  },
  'pis-sh01-args': {
    title: 'Script arguments',
    definition:
      'What you type after the script name arrives as $1, $2, $3…; $0 is the name itself, $# counts the arguments (without $0) and "$@" gives them all, each as one word.',
    example: './s.sh a b c: $0 is ./s.sh, $1 is a, $# is 3.',
  },
  'pis-sh01-find-sh': {
    title: 'find_sh: finding and trimming',
    definition:
      "find . -name '*.sh' lists the .sh files here and in every subfolder (the quotes stop the shell from expanding *). To drop the extension, sed 's/\\.sh$//': the dot escaped and $ so it only matches at the end.",
    example: "find . -name '*.sh' | sed 's/\\.sh$//' turns ./ex02/find_sh.sh into ./ex02/find_sh.",
  },
  'pis-sh01-basename': {
    title: 'basename and dirname',
    definition:
      'basename path gives the file name without the folders, and basename path suffix also strips that ending. dirname path gives the folder that holds it. They do not touch the disk: they only work on the text.',
    example: 'basename a/b/c.sh .sh gives c; dirname a/b/c.sh gives a/b.',
  },
  'pis-sh01-count-files': {
    title: 'count_files: counting with find',
    definition:
      'find . prints one line per file and folder it finds, including the starting folder “.”. Piped to wc -l, it gives how many there are counting that folder; with -type f or -type d you count only files or only folders.',
    example: 'With a, b and d/c: find . prints ., ./a, ./b, ./d and ./d/c, and wc -l gives 5.',
  },
  'pis-sh01-wc': {
    title: 'Counting with wc',
    definition:
      'wc counts what it receives: -l lines (newlines), -w words (chunks separated by spaces) and -c bytes. The newline echo adds counts as a byte.',
    example: 'echo hola | wc -c gives 5 (4 letters and the \\n); echo -n hola | wc -c gives 4.',
  },
  'pis-sh01-mac': {
    title: 'MAC.sh: MAC addresses',
    definition:
      'A MAC address identifies a network card: 6 bytes written in hex and separated by colons. ifconfig (or ip link) shows it on the line starting with ether; grep and cut pull it out on its own.',
    example: "ifconfig | grep ether | cut -d ' ' -f 2 gives something like a0:ce:c8:12:34:56.",
  },
  'pis-sh01-quotes': {
    title: 'Quotes and escapes',
    definition:
      'To stop the shell from interpreting a character (space, $, *, quotes…) you protect it: with a \\ before it, with single quotes (all literal) or with double quotes (literal except $, ` and \\). That is how you create file names with odd characters.',
    example: 'echo "$HOME *" prints your folder and a *; echo \'$HOME *\' prints $HOME * as is.',
  },
  'pis-sh01-skip': {
    title: 'skip: one line out of two',
    definition:
      "sed -n prints nothing on its own; p prints the current line and n moves to the next one. sed -n 'p;n' prints one and skips the next. In awk, NR is the line number: awk 'NR%2==1' does the same.",
    example: "ls -l | sed -n 'p;n' shows lines 1, 3, 5… of ls -l.",
  },
  'pis-sh01-passwd': {
    title: '/etc/passwd, grep and cut',
    definition:
      '/etc/passwd stores one user per line: name, x, UID, GID, description, home folder and shell, separated by “:”. grep -v drops matching lines (^# means “starts with #”) and cut -d: -f1 keeps the first field.',
    example: "cat /etc/passwd | grep -v '^#' | cut -d: -f1 gives root, daemon, nobody…",
  },
  'pis-sh01-rev-sort': {
    title: 'rev and sort',
    definition:
      'rev reverses the characters of each line. sort orders lines as text; -r in reverse, -n by numeric value (otherwise 10 comes before 9) and -u removes repeats.',
    example: 'printf "10\\n9\\n" | sort gives 10 then 9; with sort -n, 9 then 10.',
  },
  'pis-sh01-sed-range': {
    title: 'A line range with sed',
    definition:
      "sed -n 'A,Bp' prints only lines A to B, both included. If A and B are in variables, use double quotes so the shell replaces them with their value before calling sed.",
    example: 'With FT_LINE1=7 and FT_LINE2=15, sed -n "${FT_LINE1},${FT_LINE2}p" prints 9 lines.',
  },
  'pis-sh01-sed-s': {
    title: 'Substituting with sed',
    definition:
      "sed 's/pattern/replacement/' looks for the pattern on each line and replaces its first match. With the g flag it replaces every match within the line. sed always works on all lines.",
    example: "echo banana | sed 's/a/o/' gives bonana; with /g it gives bonono.",
  },
  'pis-sh01-paste': {
    title: 'Joining lines with paste',
    definition:
      'paste -s joins all the lines of its input into one (the - is standard input) and -d says what to put between them. sed then fixes the separator or the end.',
    example: "printf 'a\\nb\\nc\\n' | paste -sd, - | sed 's/,/, /g' gives “a, b, c”.",
  },
  'pis-sh01-bc': {
    title: 'Bases with bc',
    definition:
      'bc is a calculator that reads from its input. ibase sets the base it reads what you type in and obase the base it prints in. Since ibase changes how what follows is read, obase goes first.',
    example: "echo 'obase=2; ibase=16; FF' | bc prints 11111111.",
  },
  'pis-sh01-tr': {
    title: 'Translating characters with tr',
    definition:
      'tr list1 list2 replaces each character of list1 with the one in the same position of list2. It does not work on words, only single characters. -d deletes those in a list and -s squeezes consecutive repeats.',
    example: "echo hola | tr 'a-z' 'A-Z' gives HOLA; echo hola | tr -d 'o' gives hla.",
  },
  'pis-sh01-grep': {
    title: 'grep options',
    definition:
      'grep pattern shows the lines containing the pattern. -v inverts (the ones without it), -c counts instead of showing, -i ignores case and -n prefixes the line number.',
    example: 'grep -ci error log.txt counts the lines with error, Error or ERROR.',
  },
  'pis-sh01-uniq': {
    title: 'sort and uniq',
    definition:
      'uniq drops a line if it equals the one right before; with -c it prefixes how many times it repeated. Since it only looks at the previous line, you sort first. sort -u does both at once.',
    example: 'printf "b\\na\\nb\\n" | uniq leaves b, a, b; with sort | uniq, a and b.',
  },
  'pis-sh01-head-tail': {
    title: 'head and tail',
    definition:
      'head -n N shows the first N lines and tail -n N the last N (tail -n +N, from line N to the end). Chained with a pipe they extract a slice from the middle.',
    example: 'head -n 5 f | tail -n 1 prints the fifth line of f.',
  },
  'pis-sh01-xargs': {
    title: 'xargs',
    definition:
      'Many commands do not read standard input but their arguments (rm, mkdir, basename…). xargs command reads words from its input and calls the command with them as arguments.',
    example:
      "find . -name '*.o' | xargs rm deletes each .o; with a bare | rm, rm complains about missing operands.",
  },
  'pis-sh01-pipeline': {
    title: 'Chained pipes',
    definition:
      'In a long pipeline each command does one step on what the previous one gives it: filter (grep), cut (cut), sort (sort), trim (head, sed -n). It reads left to right, and the order of the steps changes the result.',
    example:
      'In r_dwssap: drop comments, one line in two, cut, rev, sort -r, sed -n for the range and paste to join.',
  },
  'pis-sh01-cut': {
    title: 'Cutting with cut',
    definition:
      'cut keeps a piece of each line: with -c by character positions (starting at 1) and with -d separator -f fields. Ranges are inclusive: 2-4, and 2- means to the end.',
    example: 'echo root:x:0:0 | cut -d: -f1 gives root; cut -c1-2 would give ro.',
  },
}
