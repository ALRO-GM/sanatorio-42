/** Banco de Not-games en inglés: la piscina, Shell 00 y Shell 01 (`../piscine-shell.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const PISCINE_SHELL_EN: Readonly<Record<string, ConceptText>> = {
  'pis-sh00-cat-e': {
    forms: [
      {
        ask: ['A file z holds a Z and a newline. What does `cat -e z` show?'],
        right: ['`Z$`'],
        wrong: ['`Z`', '`$Z`', '`Z\\n`', '`Z^J`'],
      },
      {
        ask: ['What does `cat -e` put at the end of each line?'],
        right: ['`$`'],
        wrong: ['`^`', '`\\n`', '`#`', '`~`'],
      },
      {
        ask: ['How many bytes does a file holding only a Z and a newline take?'],
        right: ['2'],
        wrong: ['1', '3', '0', '4'],
      },
    ],
    wrong: ['`Z`', '`$Z`', '`Z\\n`'],
    why: '`cat -e` marks each end of line with a $; the Z and the newline are 2 bytes.',
  },
  'pis-sh00-echo-n': {
    forms: [
      {
        ask: ['Which command creates a file z holding “Z” and a newline?'],
        right: ['`echo Z > z`'],
        wrong: ['`echo -n Z > z`', '`echo Z < z`', '`echo Z >> Z`', '`touch z Z`'],
      },
      {
        ask: ['What does the `-n` option of echo do?'],
        right: ['It does not add the trailing newline'],
        wrong: [
          'It adds an extra newline',
          'It interprets escapes such as \\t',
          'It numbers the lines it writes',
          'It always writes to a new file',
        ],
      },
    ],
    wrong: ['`echo -n Z > z`', '`echo Z < z`', '`echo Z >> Z`'],
    why: 'echo writes its text plus a newline; with -n it leaves it out, and the > redirection saves it to z.',
  },
  'pis-sh00-tar': {
    forms: [
      {
        ask: ['Which command packs the file testShell00 into the archive testShell00.tar?'],
        right: ['`tar -cf testShell00.tar testShell00`'],
        wrong: [
          '`tar -xf testShell00.tar testShell00`',
          '`tar -tf testShell00.tar testShell00`',
          '`tar -cf testShell00 testShell00.tar`',
          '`tar testShell00 > testShell00.tar`',
        ],
      },
      {
        ask: ['Which command lists what is inside a .tar without extracting it?'],
        right: ['`tar -tf exo.tar`'],
        wrong: ['`tar -xf exo.tar`', '`tar -cf exo.tar`', '`tar -vf exo.tar`', '`cat -t exo.tar`'],
      },
      {
        ask: ['Which command extracts the contents of a .tar into the current folder?'],
        right: ['`tar -xf exo.tar`'],
        wrong: [
          '`tar -tf exo.tar`',
          '`tar -cf exo.tar`',
          '`tar -rf exo.tar`',
          '`untar -f exo.tar`',
        ],
      },
    ],
    wrong: [
      '`tar -xf testShell00.tar testShell00`',
      '`tar -tf testShell00.tar testShell00`',
      '`tar -cf testShell00 testShell00.tar`',
    ],
    why: 'In tar, c creates, x extracts and t lists; f says the next word is the archive name.',
  },
  'pis-sh00-touch-t': {
    forms: [
      {
        ask: ['Which command gives testShell00 the date June 1st at 23:42?'],
        right: ['`touch -t 06012342 testShell00`'],
        wrong: [
          '`touch -d 06012342 testShell00`',
          '`touch -m 06012342 testShell00`',
          '`date -t 06012342 testShell00`',
          '`touch -t 23420601 testShell00`',
        ],
      },
      {
        ask: ['Which date format does `touch -t` expect?'],
        right: ['`[[CC]YY]MMDDhhmm[.ss]`'],
        wrong: [
          '`DDMMYYYY hh:mm`',
          '`YYYY-MM-DD hh:mm:ss`',
          '`hhmm[DDMM[YY]]`',
          '`[.ss]hhmmDDMM[YY]`',
        ],
      },
    ],
    wrong: [
      '`touch -d 06012342 testShell00`',
      '`touch -m 06012342 testShell00`',
      '`date -t 06012342 testShell00`',
    ],
    why: 'touch -t sets the file date to the one you give, written as [[CC]YY]MMDDhhmm[.ss]: month, day, hour and minute.',
  },
  'pis-sh00-ls-l-line': {
    forms: [
      {
        ask: ['What is the 40 in this `ls -l` line?'],
        right: ['The file size in bytes'],
        wrong: [
          'The number of hard links',
          'The blocks it takes on disk',
          'The number that identifies the owner',
          'The minutes since the last change',
        ],
      },
      {
        ask: ['What is the 1 right after the permissions?'],
        right: ['The number of hard links'],
        wrong: [
          'The file size in kilobytes',
          'The version number of the file',
          'How many users have it open',
          'The number of backup copies',
        ],
      },
      {
        ask: ['In this line, what can the group do with the file?'],
        right: ['Read and execute it, but not write'],
        wrong: [
          'Only read it, no writing or running',
          'Read, write and execute it',
          'Nothing: the group cannot even read it',
          'Write and execute it, without reading',
        ],
      },
      {
        ask: ['Which octal value matches the permissions in this line?'],
        right: ['455'],
        wrong: ['445', '544', '355', '454'],
      },
    ],
    wrong: [
      'The blocks it takes on disk',
      'The number that identifies the owner',
      'The minutes since the last change',
    ],
    why: 'ls -l gives type and permissions, hard links, owner, group, size in bytes, date and name; r-x is 4 + 1 = 5, so r--r-xr-x is 455.',
  },
  'pis-sh00-ls-type': {
    forms: [
      {
        ask: ['In `ls -l`, what is an entry whose line starts with `l`?'],
        right: ['A symbolic link'],
        wrong: ['A hard link', 'A directory', 'A long text file', 'A locked file'],
      },
      {
        ask: ['Which letter starts the line of a directory in `ls -l`?'],
        right: ['`d`'],
        wrong: ['`-`', '`l`', '`c`', '`f`'],
      },
    ],
    wrong: ['A hard link', 'A directory', 'A long text file'],
    why: 'The first character in ls -l is the type: - regular file, d directory, l symbolic link.',
  },
  'pis-sh00-octal': {
    forms: [
      {
        ask: ['How does `chmod 640` look in `ls -l`?'],
        right: ['rw-r-----'],
        wrong: ['rw-r--r--', 'rwxr-----', 'r--rw----', 'rw--w----'],
      },
      {
        ask: ['Which permissions does `chmod 711` leave?'],
        right: ['rwx--x--x'],
        wrong: ['rwxr--r--', 'rwx-w--w-', 'rwxrw-rw-', 'rw---x--x'],
      },
      {
        ask: ['Which chmod number gives `rwxr-x---`?'],
        right: ['750'],
        wrong: ['760', '740', '751', '570'],
      },
    ],
    wrong: ['rw-r--r--', 'rwxr-----', 'r--rw----'],
    why: 'Each digit is owner, group and others, adding read (4), write (2) and execute (1): 6 is rw-, 1 is --x, 0 is ---.',
  },
  'pis-sh00-chmod-sym': {
    forms: [
      {
        ask: ['A file has `rw-r--r--`. How does it look after `chmod u+x`?'],
        right: ['rwxr--r--'],
        wrong: ['rwxr-xr-x', 'rw-r--r-x', 'rw-r-xr--', 'rwxrwxrwx'],
      },
      {
        ask: ['A file has `rw-rw-rw-`. How does it look after `chmod go-w`?'],
        right: ['rw-r--r--'],
        wrong: ['r--rw-rw-', 'rw-rw-r--', 'r--r--r--', 'rw-r--rw-'],
      },
      {
        ask: ['Which command removes write permission from the group and others?'],
        right: ['`chmod go-w f`'],
        wrong: ['`chmod ug-w f`', '`chmod go+w f`', '`chmod a-w f`', '`chmod o-x f`'],
      },
    ],
    wrong: ['rwxr-xr-x', 'rw-r--r-x', 'rw-r-xr--'],
    why: 'In symbolic chmod, u is the owner, g the group, o others and a everyone; + adds and - removes, leaving the rest alone.',
  },
  'pis-sh00-umask': {
    forms: [
      {
        ask: ['With `umask 022`, which permissions does a new file get?'],
        right: ['644'],
        wrong: ['755', '022', '666', '600'],
      },
      {
        ask: ['With `umask 022`, which permissions does a new directory get?'],
        right: ['755'],
        wrong: ['644', '777', '022', '733'],
      },
      {
        ask: ['What is the umask?'],
        right: ['The permissions removed from what you create'],
        wrong: [
          'The permissions given to what you create',
          'The network mask of the machine',
          'The owner new files will have',
          'The list of users allowed to log in',
        ],
      },
    ],
    wrong: ['022', '666', '600'],
    why: 'The umask removes permissions: a file starts from 666 and a directory from 777, and 022 takes away group and others write.',
  },
  'pis-sh00-dir-x': {
    forms: [
      {
        ask: ['What does the x permission allow on a directory?'],
        right: ['Entering it and reaching what is inside'],
        wrong: [
          'Running every program it contains',
          'Listing the names of what it contains',
          'Creating and deleting files inside it',
          'Nothing: on a directory x means nothing',
        ],
      },
      {
        ask: ['Which directory permission lets you list the names in it?'],
        right: ['`r`'],
        wrong: ['`x`', '`w`', '`s`', '`t`'],
      },
    ],
    wrong: [
      'Running every program it contains',
      'Listing the names of what it contains',
      'Creating and deleting files inside it',
    ],
    why: 'On a directory, r lets you list names, w create and delete entries, and x enter it (cd) and reach what is inside.',
  },
  'pis-sh00-ln-hard': {
    forms: [
      {
        ask: ['Which command creates a hard link named b to the file a?'],
        right: ['`ln a b`'],
        wrong: ['`ln -s a b`', '`ln b a`', '`cp a b`', '`mv a b`'],
      },
      {
        ask: ['After `ln a b`, how many links does `ls -l a` show?'],
        right: ['2'],
        wrong: ['1', '0', '3', '4'],
      },
      {
        ask: ['You delete the file a. What happens to the hard link b?'],
        right: ['It keeps the content: it is the same inode'],
        wrong: [
          'It breaks and points to nothing',
          'It is deleted too, at once',
          'It becomes empty, 0 bytes',
          'It turns into a symbolic link',
        ],
      },
    ],
    wrong: ['`ln -s a b`', '`ln b a`', '`cp a b`'],
    why: 'A hard link is another name for the same inode: the link count goes up, and the content is only removed when no name is left.',
  },
  'pis-sh00-ln-sym': {
    forms: [
      {
        ask: ['Which command creates a symbolic link named test6 pointing to test0?'],
        right: ['`ln -s test0 test6`'],
        wrong: [
          '`ln -s test6 test0`',
          '`ln test0 test6`',
          '`ln -l test0 test6`',
          '`cp -l test0 test6`',
        ],
      },
      {
        ask: ['How does that link look at the end of its `ls -l` line?'],
        right: ['`test6 -> test0`'],
        wrong: ['`test0 -> test6`', '`test6 => test0`', '`test6@test0`', '`test6 <- test0`'],
      },
      {
        ask: ['According to `ls -l`, how many bytes does a symbolic link to test0 take?'],
        right: ['5'],
        wrong: ['0', '4', '1', '4096'],
      },
    ],
    wrong: ['`ln -s test6 test0`', '`ln test0 test6`', '`ln -l test0 test6`'],
    why: 'ln -s target name stores the target path in the link: ls -l shows it with ->, and its size is the length of that path.',
  },
  'pis-sh00-dir-links': {
    forms: [
      {
        ask: ['How many links does `ls -l` show for a newly created, empty directory?'],
        right: ['2'],
        wrong: ['1', '0', '3', '4096'],
      },
      {
        ask: [
          'Inside that directory you create two subdirectories. How many links does it show now?',
        ],
        right: ['4'],
        wrong: ['2', '3', '1', '6'],
      },
    ],
    wrong: ['1', '0', '3'],
    why: 'A directory has its name in the parent and its own “.”: 2; each subdirectory adds one with its “..”.',
  },
  'pis-sh00-ssh-keygen': {
    forms: [
      {
        ask: ['Which command generates an SSH key pair, public and private?'],
        right: ['`ssh-keygen`'],
        wrong: ['`ssh-add`', '`ssh-copy-id`', '`ssh-agent`', '`sshd`'],
      },
      {
        ask: ['Which file of your key pair can you safely give to others?'],
        right: ['`id_rsa.pub`'],
        wrong: ['`id_rsa`', '`known_hosts`', '`ssh_config`', '`id_rsa.key`'],
      },
      {
        ask: ['Which folder does the key generator put your keys in by default?'],
        right: ['`~/.ssh/`'],
        wrong: ['`/etc/ssh/`', '`~/.config/ssh/`', '`/var/ssh/`', '`~/.keys/`'],
      },
    ],
    wrong: ['`ssh-add`', '`ssh-copy-id`', '`ssh-agent`'],
    why: 'ssh-keygen creates in ~/.ssh a private key (id_rsa), which never leaves your machine, and its public one (id_rsa.pub), which is the one you share.',
  },
  'pis-sh00-ssh-auth': {
    forms: [
      {
        ask: ['What can someone who gets your `id_rsa` do?'],
        right: ['Log in as you wherever your public key is'],
        wrong: [
          'Nothing: without the .pub it is useless',
          'Only read your public key, nothing else',
          'Change the password of your account',
          'Log in only while your session is open',
        ],
      },
      {
        ask: ['On the server, which file holds the public keys allowed to log in?'],
        right: ['`~/.ssh/authorized_keys`'],
        wrong: ['`~/.ssh/known_hosts`', '`~/.ssh/id_rsa`', '`~/.ssh/config`', '`/etc/passwd`'],
      },
      {
        ask: ['Which command puts your public key on a server to log in without a password?'],
        right: ['`ssh-copy-id ana@host`'],
        wrong: [
          '`ssh-keygen ana@host`',
          '`ssh-add ana@host`',
          '`scp id_rsa ana@host`',
          '`ssh -i ana@host`',
        ],
      },
    ],
    wrong: [
      'Nothing: without the .pub it is useless',
      'Only read your public key, nothing else',
      'Change the password of your account',
    ],
    why: 'The server lets in whoever proves they hold the private key of a public key in authorized_keys: the private key is the real key.',
  },
  'pis-sh00-ls-opts': {
    forms: [
      {
        ask: ['Which ls option separates the names with commas?'],
        right: ['`-m`'],
        wrong: ['`-C`', '`-1`', '`-x`', '`-l`'],
      },
      {
        ask: ['Which ls option puts a slash after each directory?'],
        right: ['`-p`'],
        wrong: ['`-s`', '`-d`', '`-r`', '`-1`'],
      },
      {
        ask: ['Which ls option sorts by modification date, newest first?'],
        right: ['`-t`'],
        wrong: ['`-S`', '`-d`', '`-r`', '`-s`'],
      },
      {
        ask: ['Which ls option sorts by size, largest first?'],
        right: ['`-S`'],
        wrong: ['`-s`', '`-t`', '`-n`', '`-x`'],
      },
    ],
    wrong: ['`-C`', '`-1`', '`-x`'],
    why: 'In ls, -m separates with commas, -p marks directories with /, -t sorts by date and -S by size (-s only shows blocks).',
  },
  'pis-sh00-midls': {
    forms: [
      {
        ask: [
          'Which command lists the current folder separated by commas, by modification date and with a slash after directories?',
        ],
        right: ['`ls -mtp`'],
        wrong: ['`ls -ltp`', '`ls -mSp`', '`ls -mtd`', '`ls -mrR`'],
      },
      {
        ask: ['Which ls option shows hidden files, but not `.` or `..`?'],
        right: ['`-A`'],
        wrong: ['`-a`', '`-h`', '`-o`', '`-d`'],
      },
      {
        ask: ['What makes a file hidden on Unix?'],
        right: ['Its name starting with a dot'],
        wrong: [
          'Having no read permission',
          'Being owned by the root user',
          'Its name ending with a ~',
          'Being inside a hidden folder',
        ],
      },
    ],
    wrong: ['`ls -ltp`', '`ls -mSp`', '`ls -mtd`'],
    why: 'Names starting with a dot do not show in ls; -a shows them all (with . and ..) and -A, all but . and ..',
  },
  'pis-sh00-ls-r': {
    forms: [
      {
        ask: ['Which ls option also goes into every subdirectory?'],
        right: ['`-R`'],
        wrong: ['`-r`', '`-a`', '`-d`', '`-S`'],
      },
      {
        ask: ['What does `ls -r` do?'],
        right: ['It reverses the order of the list'],
        wrong: [
          'It also goes into subdirectories',
          'It deletes what it lists',
          'It shows only readable files',
          'It shows the real path of each file',
        ],
      },
    ],
    wrong: ['`-r`', '`-a`', '`-d`'],
    why: 'In ls, -R (uppercase) is recursive and -r (lowercase) reverses the order: they are not the same.',
  },
  'pis-sh00-git-log': {
    forms: [
      {
        ask: ['Which command shows the full ids of the last 5 commits, one per line?'],
        right: ['`git log -5 --format=%H`', '`git log -n 5 --format=%H`'],
        wrong: [
          '`git log -5 --format=%h`',
          '`git log -5 --format=%an`',
          '`git show -5 --format=%s`',
          '`git status -5 --format=%H`',
        ],
      },
      {
        ask: ['What does `%h` print in a `git log` format?'],
        right: ['The commit hash, shortened'],
        wrong: [
          'The full hash, 40 digits long',
          'The name of who made the commit',
          'The time it was made',
          'The name of the current branch',
        ],
      },
      {
        ask: ['How many characters does a full commit hash (`%H`) have?'],
        right: ['40'],
        wrong: ['7', '32', '64', '20'],
      },
    ],
    wrong: ['`git log -5 --format=%h`', '`git log -5 --format=%an`', '`git show -5 --format=%s`'],
    why: 'git log -n limits the number of commits and --format chooses what to print: %H is the full hash (40 hex digits), %h the short one.',
  },
  'pis-sh00-gitignore': {
    forms: [
      {
        ask: ['Which command lists the files your repository ignores?'],
        right: ['`git ls-files --others --ignored --exclude-standard`'],
        wrong: [
          '`git ls-files --others --exclude-standard`',
          '`git ls-files --cached --ignored --exclude-standard`',
          '`git log --others --ignored --exclude-standard`',
          '`git diff --others --ignored --exclude-standard`',
        ],
      },
      {
        ask: ['What does a `*.o` line in .gitignore do?'],
        right: ['Git stops offering the .o files it does not track yet'],
        wrong: [
          'It deletes every .o file in the repo from disk',
          'It makes git track only the .o files',
          'It removes the already-added .o files from the repo',
          'It compresses the .o files before each commit',
        ],
      },
    ],
    wrong: [
      '`git ls-files --others --exclude-standard`',
      '`git ls-files --cached --ignored --exclude-standard`',
      '`git log --others --ignored --exclude-standard`',
    ],
    why: '.gitignore only affects what git does not track yet: with --others --ignored --exclude-standard, ls-files lists exactly that.',
  },
  'pis-sh00-diff-patch': {
    forms: [
      {
        ask: ['Which command saves in sw.diff what must change to go from a to b?'],
        right: ['`diff a b > sw.diff`'],
        wrong: [
          '`diff b a > sw.diff`',
          '`patch a b > sw.diff`',
          '`diff a b < sw.diff`',
          '`cmp a b > sw.diff`',
        ],
      },
      {
        ask: ['Which command applies to `a` the changes saved in `sw.diff`?'],
        right: ['`patch a sw.diff`', '`patch a < sw.diff`'],
        wrong: [
          '`diff a sw.diff`',
          '`patch sw.diff a`',
          '`cat sw.diff >> a`',
          '`patch -R sw.diff`',
        ],
      },
      {
        ask: ['In the normal output of `diff a b`, what marks a line found only in b?'],
        right: ['`>`'],
        wrong: ['`<`', '`+`', '`!`', '`*`'],
      },
    ],
    wrong: ['`diff b a > sw.diff`', '`patch a b > sw.diff`', '`diff a b < sw.diff`'],
    why: 'diff a b describes how to get from a to b (< what leaves a, > what comes from b) and patch applies that recipe to a.',
  },
  'pis-sh00-find-clean': {
    forms: [
      {
        ask: ['Which command deletes, here and in subfolders, the files ending in ~?'],
        right: ["`find . -type f -name '*~' -delete`"],
        wrong: [
          "`find . -type d -name '*~' -delete`",
          "`find . -type f -name '~*' -delete`",
          "`find . -type f -name '*~' -print`",
          "`find . -type f -name '*~' | rm`",
        ],
      },
      {
        ask: ['Which `-name` pattern finds names that start and end with #?'],
        right: ["`'#*#'`"],
        wrong: ["`'*#*'`", "`'#*'`", "`'*#'`", "`'[#]'`"],
      },
      {
        ask: ['What does `-o` do between two find tests?'],
        right: ['Either one of the two is enough'],
        wrong: [
          'Both must hold at the same time',
          'It writes the result to a file',
          'It negates the test after it',
          'It only searches the parent folder',
        ],
      },
    ],
    wrong: [
      "`find . -type d -name '*~' -delete`",
      "`find . -type f -name '~*' -delete`",
      "`find . -type f -name '*~' -print`",
    ],
    why: 'find walks the subfolders; -type f keeps files, -name a quoted pattern, -o is an “or” and -delete removes what it found.',
  },
  'pis-sh00-find-exec': {
    forms: [
      {
        ask: ['What is the `{}` in this command?'],
        right: ['Each file find comes across'],
        wrong: [
          'The folder where the search starts',
          'An empty block of commands',
          'The options passed to rm',
          'The list of all results together',
        ],
      },
      {
        ask: ['What is the `\\;` at the end for?'],
        right: ['It marks where the -exec command ends'],
        wrong: [
          'It separates two find searches in a row',
          'It stops rm from asking for confirmation',
          'It comments out the rest of the line',
          'It runs rm only once at the end',
        ],
      },
    ],
    wrong: [
      'The folder where the search starts',
      'An empty block of commands',
      'The options passed to rm',
    ],
    why: 'find replaces {} with each path it finds and runs the command up to the ;, escaped with \\ so the shell does not eat it.',
  },
  'pis-sh00-file-magic': {
    forms: [
      {
        ask: ["What does the `file` command look at to tell a file's type?"],
        right: ['Its contents, mostly the first bytes'],
        wrong: [
          'Only the extension in its name',
          'The permissions the file has',
          'The folder it is stored in',
          'The program that created it',
        ],
      },
      {
        ask: ['Which command analyses a.txt using your magic file ft_magic?'],
        right: ['`file -m ft_magic a.txt`'],
        wrong: [
          '`file -f ft_magic a.txt`',
          '`file -b ft_magic a.txt`',
          '`file -i ft_magic a.txt`',
          '`magic -m ft_magic a.txt`',
        ],
      },
      {
        ask: ["What is a file's magic number?"],
        right: ['Fixed bytes that reveal its format'],
        wrong: [
          'A random number the system gives it',
          'The maximum size it can reach',
          'The checksum of its contents',
          'Its inode number on the disk',
        ],
      },
    ],
    wrong: [
      'Only the extension in its name',
      'The permissions the file has',
      'The folder it is stored in',
    ],
    why: 'file does not trust the name: it compares the contents with known signatures (magic numbers), and with -m it can use the ones you write.',
  },
  'pis-sh00-paths': {
    forms: [
      {
        ask: ['You are in /home/ana/piscine. Which folder is `../ex00`?'],
        right: ['`/home/ana/ex00`'],
        wrong: ['`/home/ana/piscine/ex00`', '`/home/ex00`', '`/ex00`', '`/piscine/ex00`'],
      },
      {
        ask: ['Which of these paths is absolute?'],
        right: ['`/tmp/ex00`'],
        wrong: ['`./tmp/ex00`', '`tmp/ex00`', '`../tmp/ex00`', '`.tmp/ex00`'],
      },
      {
        ask: ['Which folder is `~` in the shell?'],
        right: ['Your home folder, the one in HOME'],
        wrong: [
          'The root of the file system',
          'The folder you were in before',
          'The folder where the shell lives',
          'The folder for temporary files',
        ],
      },
    ],
    wrong: ['`/home/ana/piscine/ex00`', '`/home/ex00`', '`/ex00`'],
    why: 'An absolute path starts with /; relative ones start where you are (. is here, .. the parent), and ~ is your home folder.',
  },
  'pis-sh00-mkdir-rm': {
    forms: [
      {
        ask: ['Which command creates a/b/c even if a and b do not exist yet?'],
        right: ['`mkdir -p a/b/c`'],
        wrong: ['`mkdir -r a/b/c`', '`mkdir a/b/c`', '`touch -p a/b/c`', '`mkdir -a a/b/c`'],
      },
      {
        ask: ['Which command deletes a folder with everything inside it?'],
        right: ['`rm -r dir`'],
        wrong: ['`rmdir dir`', '`rm dir`', '`rm -d dir`', '`del -r dir`'],
      },
    ],
    wrong: ['`mkdir -r a/b/c`', '`mkdir a/b/c`', '`touch -p a/b/c`'],
    why: 'mkdir -p also creates the folders in between; rm -r deletes a folder and all its contents (rmdir only works if it is empty).',
  },
  'pis-sh00-cp-mv': {
    forms: [
      {
        ask: ['What does `mv a b` do if b is a folder that already exists?'],
        right: ['It moves a inside b, as b/a'],
        wrong: [
          'It replaces the folder b with a',
          'It fails because b already exists',
          'It copies a into b and keeps the original',
          'It merges the contents of a and b',
        ],
      },
      {
        ask: ['Which command copies the whole src folder, with what is inside?'],
        right: ['`cp -r src dst`'],
        wrong: ['`cp src dst`', '`mv -r src dst`', '`cp -i src dst`', '`cp -n src dst`'],
      },
    ],
    wrong: [
      'It replaces the folder b with a',
      'It fails because b already exists',
      'It copies a into b and keeps the original',
    ],
    why: 'If the target is a folder, mv and cp put the source inside it under its own name; copying a folder needs -r.',
  },
  'pis-sh00-man': {
    forms: [
      {
        ask: ['Which command shows the manual of ls?'],
        right: ['`man ls`'],
        wrong: ['`help ls`', '`ls --manual`', '`ls -h`', '`doc ls`'],
      },
      {
        ask: ['Which command tells you which folder you are in?'],
        right: ['`pwd`'],
        wrong: ['`cwd`', '`whereis`', '`cd`', '`whoami`'],
      },
      {
        ask: ['Which manual section holds user commands such as ls?'],
        right: ['1'],
        wrong: ['2', '3', '8', '5'],
      },
      {
        ask: ['Which manual section holds system calls such as write?'],
        right: ['2'],
        wrong: ['1', '3', '8', '7'],
      },
    ],
    wrong: ['`help ls`', '`ls --manual`', '`ls -h`'],
    why: "man shows a command's manual, by section: 1 commands, 2 system calls, 3 C functions; pwd prints the current folder.",
  },
  'pis-sh01-groups': {
    forms: [
      {
        ask: ['Which command lists the group names of the user stored in FT_USER?'],
        right: ['`id -Gn $FT_USER`', '`groups $FT_USER`'],
        wrong: [
          '`id -u $FT_USER`',
          '`id -gn $FT_USER`',
          '`id -G $FT_USER`',
          '`whoami -G $FT_USER`',
        ],
      },
      {
        ask: ["What does `tr ' ' ','` do to the output of `id -Gn`?"],
        right: ['It turns each space into a comma'],
        wrong: [
          'It deletes spaces and commas',
          'It turns each comma into a space',
          'It adds a comma at the end of the line',
          'It sorts the comma-separated groups',
        ],
      },
      {
        ask: ['Which command removes the newlines from what it reads on its input?'],
        right: ["`tr -d '\\n'`"],
        wrong: ["`tr -s '\\n'`", "`sed 's/\\n//'`", "`cut -d '\\n'`", "`grep -v '\\n'`"],
      },
    ],
    wrong: ['`id -u $FT_USER`', '`id -gn $FT_USER`', '`id -G $FT_USER`'],
    why: 'id -Gn gives the names of all groups separated by spaces; tr swaps character for character, and with -d it deletes them.',
  },
  'pis-sh01-env': {
    forms: [
      {
        ask: ['What does `export FT_USER=nours` do?'],
        right: ['It sets the variable and passes it to programs you run'],
        wrong: [
          'It sets the variable for the shell only, passing it to none',
          'It creates a new system user called nours',
          'It saves the variable in .bashrc for good',
          'It switches user and logs you in as nours',
        ],
      },
      {
        ask: ['After `export NAME=ana`, which command prints ana on screen?'],
        right: ['`echo $NAME`', '`echo "$NAME"`'],
        wrong: ['`echo NAME`', '`echo %NAME%`', '`echo $name`', '`echo &NAME`'],
      },
      {
        ask: ['Which command shows all environment variables?'],
        right: ['`env`', '`printenv`'],
        wrong: ['`echo $ENV`', '`set -e`', '`getenv`', '`ls /env`'],
      },
    ],
    wrong: [
      'It sets the variable for the shell only, passing it to none',
      'It creates a new system user called nours',
      'It saves the variable in .bashrc for good',
    ],
    why: 'A variable is read with $ and is case-sensitive; export puts it in the environment, which programs launched by the shell inherit (env shows it).',
  },
  'pis-sh01-shebang': {
    forms: [
      {
        ask: ['What goes on the first line of a script so that sh runs it?'],
        right: ['`#!/bin/sh`'],
        wrong: ['`#/bin/sh`', '`!#/bin/sh`', '`//bin/sh`', '`#include <sh>`'],
      },
      {
        ask: ['What does a script need to be launched with `./script.sh`?'],
        right: ['Execute permission, with chmod +x'],
        wrong: [
          'Its name must end in .sh',
          'Being in a folder of the PATH',
          'Compiling it first with cc',
          'Being run by the root user',
        ],
      },
      {
        ask: ['Typing `script.sh` alone gives “command not found”, but `./script.sh` works. Why?'],
        right: ['The current folder is not in the PATH'],
        wrong: [
          'The script lacks the x permission',
          'The script lacks the #!/bin/sh line',
          'Only root can launch scripts',
          'The shell does not read .sh files',
        ],
      },
    ],
    wrong: ['`#/bin/sh`', '`!#/bin/sh`', '`//bin/sh`'],
    why: 'The #! shebang says which program reads the script; it needs the x permission, and ./ gives the path because the current folder is not in the PATH.',
  },
  'pis-sh01-args': {
    forms: [
      {
        ask: ['With `./s.sh a b c`, what is `$#` inside the script?'],
        right: ['3'],
        wrong: ['4', '1', '0', '2'],
      },
      {
        ask: ['With `./s.sh a b c`, what is `$2` inside the script?'],
        right: ['`b`'],
        wrong: ['`a`', '`c`', '`./s.sh`', '`a b c`'],
      },
      {
        ask: ['What does `$@` hold in a script?'],
        right: ['All the arguments, each one separately'],
        wrong: [
          'Only the last argument received',
          'The number of arguments received',
          'The name of the running script',
          'The exit status of the last command',
        ],
      },
    ],
    wrong: ['4', '1', '0'],
    why: 'In a script, $1, $2… are the arguments, $# how many there are (not counting the name, which is $0) and $@ all of them.',
  },
  'pis-sh01-find-sh': {
    forms: [
      {
        ask: ['Which command finds, from here and in subfolders, the files ending in .sh?'],
        right: ["`find . -name '*.sh'`", "`find . -type f -name '*.sh'`"],
        wrong: [
          "`find . -name '.sh'`",
          "`ls -R '*.sh'`",
          "`find . -type d -name '*.sh'`",
          "`grep -r '*.sh' .`",
        ],
      },
      {
        ask: ['Which command strips the trailing .sh from each name it reads?'],
        right: ["`sed 's/\\.sh$//'`"],
        wrong: ["`tr -d '.sh'`", '`cut -d . -f 2`', "`sed 's/^\\.sh//'`", "`grep -v '\\.sh$'`"],
      },
    ],
    wrong: ["`find . -name '.sh'`", "`ls -R '*.sh'`", "`find . -type d -name '*.sh'`"],
    why: 'find walks the subfolders matching *.sh; sed with \\.sh$ removes only the trailing .sh, while tr would delete every s, h and dot.',
  },
  'pis-sh01-basename': {
    forms: [
      {
        ask: ['What does this command print?'],
        right: ['`find_sh`'],
        wrong: ['`find_sh.sh`', '`/home/ana/ex02/find_sh`', '`ex02`', '`.sh`'],
      },
      {
        ask: ['What would it print without the last argument, the `.sh`?'],
        right: ['`find_sh.sh`'],
        wrong: [
          '`find_sh`',
          '`/home/ana/ex02`',
          '`ex02/find_sh.sh`',
          '`/home/ana/ex02/find_sh.sh`',
        ],
      },
      {
        ask: ['What would `dirname` print with the same path?'],
        right: ['`/home/ana/ex02`'],
        wrong: ['`ex02`', '`/home/ana`', '`find_sh.sh`', '`/home/ana/ex02/find_sh`'],
      },
    ],
    wrong: ['`/home/ana/ex02/find_sh`', '`ex02`', '`.sh`'],
    why: 'basename keeps the last part of the path and removes the suffix you give it; dirname keeps everything before it.',
  },
  'pis-sh01-count-files': {
    forms: [
      {
        ask: ['Why does `find . | wc -l` count one more than what is inside the folder?'],
        right: ['Because find also lists the folder itself, the .'],
        wrong: [
          'Because wc -l counts an empty line at the end',
          'Because find counts links twice',
          'Because find adds a line with the total',
          'Because wc -l also counts the find command',
        ],
      },
      {
        ask: [
          'A folder has 2 files and a subfolder with 1 file inside. How many lines does `find . | wc -l` give there?',
        ],
        right: ['5'],
        wrong: ['4', '3', '6', '2'],
      },
      {
        ask: ['Which command counts only regular files, here and in subfolders?'],
        right: ['`find . -type f | wc -l`'],
        wrong: [
          '`find . -type d | wc -l`',
          '`ls | wc -l`',
          '`find . -type f | wc -c`',
          '`ls -R | wc -l`',
        ],
      },
    ],
    wrong: [
      'Because wc -l counts an empty line at the end',
      'Because find counts links twice',
      'Because find adds a line with the total',
    ],
    why: 'find prints one path per line, starting with the folder itself (.); wc -l counts those lines, and -type f keeps only files.',
  },
  'pis-sh01-wc': {
    forms: [
      {
        ask: ['What does `wc -c` count?'],
        right: ['Bytes'],
        wrong: ['Lines', 'Words', 'Columns', 'Files'],
      },
      {
        ask: ['What number does `echo hola mundo | wc -w` give?'],
        right: ['2'],
        wrong: ['1', '10', '11', '3'],
      },
      {
        ask: ['What number does `echo hola | wc -c` give?'],
        right: ['5'],
        wrong: ['4', '1', '6', '2'],
      },
    ],
    wrong: ['Lines', 'Words', 'Columns'],
    why: 'wc -l counts lines, -w words and -c bytes; echo adds a newline, which is a byte too.',
  },
  'pis-sh01-mac': {
    forms: [
      {
        ask: ['In the output of `ifconfig`, which word comes before each MAC address?'],
        right: ['`ether`'],
        wrong: ['`inet`', '`inet6`', '`netmask`', '`broadcast`'],
      },
      {
        ask: ['What is a MAC address?'],
        right: ['The physical identifier of a network card'],
        wrong: [
          'The IP address the router gives by DHCP',
          'The machine name on the local network',
          'The serial number of a Mac computer',
          'The address of the network DNS server',
        ],
      },
      {
        ask: ['Which of these has the shape of a MAC address?'],
        right: ['`0a:1b:2c:3d:4e:5f`'],
        wrong: ['`10.12.4.42`', '`fe80::1`', '`255.255.255.0`', '`0a:1b:2c:3d`'],
      },
      {
        ask: ['How many bytes long is a MAC address?'],
        right: ['6'],
        wrong: ['4', '8', '16', '12'],
      },
    ],
    wrong: ['`inet`', '`inet6`', '`netmask`'],
    why: 'The MAC identifies the network card: 6 bytes in hex separated by “:”, which ifconfig shows after the word ether.',
  },
  'pis-sh01-quotes': {
    forms: [
      {
        ask: ['What does a backslash `\\` before a character do in the shell?'],
        right: ['It removes its special meaning'],
        wrong: [
          'It deletes it from the file name',
          'It turns it into uppercase',
          'It turns the rest into a comment',
          'It replaces it with its ASCII code',
        ],
      },
      {
        ask: ['What does the shell expand inside single quotes?'],
        right: ['Nothing: everything stays as is'],
        wrong: [
          'Variables, but not the *',
          'The *, but not variables',
          'Everything, like double quotes',
          'Only the backslashes',
        ],
      },
      {
        ask: ['Inside double quotes, which of these is still special?'],
        right: ['`$`'],
        wrong: ['`*`', "`'`", '`#`', '`~`'],
      },
      {
        ask: ['Which command creates a file whose name has a space, a b?'],
        right: ["`touch 'a b'`", '`touch a\\ b`'],
        wrong: ['`touch a b`', '`touch {a b}`', '`touch a/ b`', '`touch [a b]`'],
      },
    ],
    wrong: [
      'It deletes it from the file name',
      'It turns it into uppercase',
      'It turns the rest into a comment',
    ],
    why: 'Single quotes keep everything literal; double quotes keep $, ` and \\ alive; and \\ protects the character right after it.',
  },
  'pis-sh01-skip': {
    forms: [
      {
        ask: ['Which command keeps one line out of two, starting with the first?'],
        right: ["`sed -n 'p;n'`", "`awk 'NR%2==1'`"],
        wrong: ["`sed -n 'n;p'`", "`awk 'NR%2==0'`", '`head -n 2`', "`sed 'p;n'`"],
      },
      {
        ask: ['What does the `-n` option of sed do?'],
        right: ['Prints nothing except what you ask with p'],
        wrong: [
          'Numbers each line it prints',
          'Works only on the first line',
          'Edits the file itself, no copy',
          'Removes empty lines from the output',
        ],
      },
      {
        ask: ['Which awk variable holds the number of the line being read?'],
        right: ['`NR`'],
        wrong: ['`NF`', '`$0`', '`FS`', '`NL`'],
      },
    ],
    wrong: ["`sed -n 'n;p'`", "`awk 'NR%2==0'`", '`head -n 2`'],
    why: 'With -n sed prints only what you ask: p prints the line and n jumps to the next one without printing it, so lines 1, 3, 5… come out.',
  },
  'pis-sh01-passwd': {
    forms: [
      {
        ask: ['Which command removes the comment lines, those starting with #?'],
        right: ["`grep -v '^#'`"],
        wrong: ["`grep '^#'`", "`grep -v '#$'`", "`grep -c '^#'`", "`sed 's/#//'`"],
      },
      {
        ask: ['Which command extracts the first field of lines separated by “:”?'],
        right: ['`cut -d: -f1`', "`awk -F: '{print $1}'`"],
        wrong: ['`cut -f: -d1`', '`cut -d: -f2`', '`cut -c1`', "`awk '{print $1}'`"],
      },
      {
        ask: ['What is in the first field of each line of /etc/passwd?'],
        right: ['The user name'],
        wrong: ['The encrypted password', 'The home folder', 'The login shell', 'The group number'],
      },
    ],
    wrong: ["`grep '^#'`", "`grep -v '#$'`", "`grep -c '^#'`"],
    why: "/etc/passwd has one user per line with fields separated by “:”, the first being the name; grep -v '^#' drops lines starting with #.",
  },
  'pis-sh01-rev-sort': {
    forms: [
      {
        ask: ['What does `echo hola | rev` print?'],
        right: ['`aloh`'],
        wrong: ['`hola`', '`HOLA`', '`ahol`', '`laoh`'],
      },
      {
        ask: ['What does `sort -r` do?'],
        right: ['It sorts in reverse, highest first'],
        wrong: [
          'It reverses each line, letter by letter',
          'It sorts and removes repeated lines',
          'It sorts the lines at random',
          'It sorts everything in the subfolders',
        ],
      },
      {
        ask: ['Which sort option sorts by numeric value, with 9 before 10?'],
        right: ['`-n`'],
        wrong: ['`-r`', '`-u`', '`-d`', '`-f`'],
      },
    ],
    wrong: ['`hola`', '`HOLA`', '`ahol`'],
    why: 'rev reverses each line letter by letter; sort -r reverses the order of lines and -n compares as numbers, not as text.',
  },
  'pis-sh01-sed-range': {
    forms: [
      {
        ask: ["What does `sed -n '3,5p'` print?"],
        right: ['Lines 3 to 5, both included'],
        wrong: [
          'Lines 3 and 5, but not 4',
          'Five lines, starting at line 3',
          'All except lines 3 to 5',
          'Line 3 five times in a row',
        ],
      },
      {
        ask: ['Why is `"${FT_LINE1},${FT_LINE2}p"` in double quotes?'],
        right: ['So the shell substitutes the variables'],
        wrong: [
          'So the shell leaves the variables alone',
          'Because sed only accepts double quotes',
          'So the lines come out in quotes',
          'So that sed reads the variables itself',
        ],
      },
      {
        ask: ["In a 100-line file, how many lines does `sed -n '7,15p'` print?"],
        right: ['9'],
        wrong: ['8', '15', '7', '22'],
      },
    ],
    wrong: [
      'Lines 3 and 5, but not 4',
      'Five lines, starting at line 3',
      'All except lines 3 to 5',
    ],
    why: "sed -n 'A,Bp' prints from line A to line B, both included; with double quotes the shell fills in the variables first.",
  },
  'pis-sh01-sed-s': {
    forms: [
      {
        ask: ["What does `echo banana | sed 's/a/o/'` print?"],
        right: ['`bonana`'],
        wrong: ['`bonono`', '`banano`', '`obanana`', '`bnn`'],
      },
      {
        ask: ["What does `echo banana | sed 's/a/o/g'` print?"],
        right: ['`bonono`'],
        wrong: ['`bonana`', '`banano`', '`bonona`', '`bnn`'],
      },
      {
        ask: ['What does the `g` at the end of `s/a/b/g` do?'],
        right: ['It replaces every match in the line, not just the first'],
        wrong: [
          'It applies the change to every line, not just the first',
          'It searches without telling upper and lower case apart',
          'It saves the result in the same input file',
          'It prints the line again after changing it',
        ],
      },
    ],
    wrong: ['`banano`', '`obanana`', '`bnn`'],
    why: 'sed s/old/new/ replaces the first match on each line; with g, every match on the line. Every line is processed anyway.',
  },
  'pis-sh01-paste': {
    forms: [
      {
        ask: ['Which command joins all the lines it reads into one, separated by commas?'],
        right: ['`paste -sd, -`', '`paste -s -d, -`'],
        wrong: ['`paste -d, -`', '`cat -sd, -`', '`join -t, -`', '`sort -t, -`'],
      },
      {
        ask: ["What does `sed 's/,/, /g'` do to a line?"],
        right: ['It puts a space after each comma'],
        wrong: [
          'It changes only the first comma',
          'It deletes all commas and spaces',
          'It puts a comma after each space',
          'It joins all lines with commas',
        ],
      },
    ],
    wrong: ['`paste -d, -`', '`cat -sd, -`', '`join -t, -`'],
    why: 'paste -s puts all lines on one and -d picks the separator; then sed turns each “,” into “, ”.',
  },
  'pis-sh01-bc': {
    forms: [
      {
        ask: ["What does `echo 'obase=2; 10' | bc` print?"],
        right: ['`1010`'],
        wrong: ['`2`', '`10`', '`0101`', '`1100`'],
      },
      {
        ask: ["What does `echo 'ibase=2; 101' | bc` print?"],
        right: ['`5`'],
        wrong: ['`101`', '`3`', '`7`', '`1100101`'],
      },
      {
        ask: ['What does `ibase=16` do in bc?'],
        right: ['It reads the numbers you type in base 16'],
        wrong: [
          'It prints the results in base 16',
          'It limits numbers to 16 digits',
          'It uses 16 decimals in divisions',
          'It adds 16 to every number it reads',
        ],
      },
      {
        ask: ['Why should `obase` come before `ibase` in bc?'],
        right: ['If it comes after, its value is read in the new base'],
        wrong: [
          'Because bc reads statements right to left',
          'Because ibase can only be changed once',
          'Because obase wipes whatever ibase set',
          'Because otherwise bc gives a syntax error',
        ],
      },
    ],
    wrong: ['`2`', '`10`', '`0101`'],
    why: 'In bc, ibase is the base it reads and obase the base it writes; once ibase changes, even the obase number is read in the new base.',
  },
  'pis-sh01-tr': {
    forms: [
      {
        ask: ["What does `tr 'abc' '012'` do to its input?"],
        right: ['It turns each a into 0, each b into 1 and each c into 2'],
        wrong: [
          'It turns each 0 into a, each 1 into b and each 2 into c',
          'It replaces the whole word abc with 012, nothing else',
          'It deletes the a, b and c, and appends 012 at the end',
          'It changes only the first a, b and c of each line',
        ],
      },
      {
        ask: ["What does `echo hola | tr 'ol' '01'` print?"],
        right: ['`h01a`'],
        wrong: ['`hola`', '`h10a`', '`01la`', '`h0la`'],
      },
      {
        ask: ["What does `tr -s ' '` do?"],
        right: ['It squeezes runs of spaces into one'],
        wrong: [
          'It deletes every space in the text',
          'It turns each space into a newline',
          'It sorts the space-separated words',
          'It adds a space between every two letters',
        ],
      },
    ],
    wrong: [
      'It turns each 0 into a, each 1 into b and each 2 into c',
      'It replaces the whole word abc with 012, nothing else',
      'It deletes the a, b and c, and appends 012 at the end',
    ],
    why: 'tr swaps character by character: the first of the first list for the first of the second, and so on; -d deletes and -s squeezes repeats.',
  },
  'pis-sh01-grep': {
    forms: [
      {
        ask: ['Which grep option counts the matching lines instead of showing them?'],
        right: ['`-c`'],
        wrong: ['`-n`', '`-l`', '`-v`', '`-o`'],
      },
      {
        ask: ['Which option makes grep ignore upper and lower case?'],
        right: ['`-i`'],
        wrong: ['`-I`', '`-w`', '`-x`', '`-c`'],
      },
      {
        ask: ['What does `grep -v error log.txt` show?'],
        right: ['The lines of log.txt without error'],
        wrong: [
          'The lines of log.txt with error',
          'How many lines of log.txt say error',
          'The grep version and its help',
          'All of log.txt, with error highlighted',
        ],
      },
    ],
    wrong: ['`-n`', '`-l`', '`-v`'],
    why: 'grep shows the matching lines; -v gives those that do not match, -c how many there are and -i ignores case.',
  },
  'pis-sh01-uniq': {
    forms: [
      {
        ask: ['Why is `sort` usually placed before `uniq`?'],
        right: ['uniq only merges repeats that are next to each other'],
        wrong: [
          'uniq only works on reverse-sorted text',
          'uniq needs the lines numbered to work',
          'sort removes the repeats and uniq counts them',
          'Just to make uniq run faster',
        ],
      },
      {
        ask: ['What does `sort -u` do?'],
        right: ['It sorts and removes repeated lines'],
        wrong: [
          'It sorts ignoring case',
          'It sorts and keeps only the repeats',
          'It sorts by the first column only',
          'It sorts by modification date',
        ],
      },
      {
        ask: ['What does `uniq -c` do?'],
        right: ['It prefixes how many times each line occurs'],
        wrong: [
          'It counts how many distinct lines there are',
          'It keeps only the lines that never repeat',
          'It counts the characters of each line',
          'It removes repeats ignoring case',
        ],
      },
    ],
    wrong: [
      'uniq only works on reverse-sorted text',
      'uniq needs the lines numbered to work',
      'sort removes the repeats and uniq counts them',
    ],
    why: 'uniq compares each line with the one before, so it only sees repeats when they are adjacent: that is why it follows sort (or you use sort -u).',
  },
  'pis-sh01-head-tail': {
    forms: [
      {
        ask: ['Which command shows the last 3 lines of f?'],
        right: ['`tail -n 3 f`'],
        wrong: ['`head -n 3 f`', '`tail -c 3 f`', '`tail -n +3 f`', '`head -n -3 f`'],
      },
      {
        ask: ['Which command shows only line 5 of f?'],
        right: ['`head -n 5 f | tail -n 1`', "`sed -n '5p' f`"],
        wrong: [
          '`tail -n 5 f | head -n 1`',
          '`head -n 1 f | tail -n 5`',
          "`sed '5p' f`",
          '`head -n 5 f`',
        ],
      },
    ],
    wrong: ['`head -n 3 f`', '`tail -c 3 f`', '`tail -n +3 f`'],
    why: 'head -n N gives the first N lines and tail -n N the last N; chaining them picks out one specific line.',
  },
  'pis-sh01-xargs': {
    forms: [
      {
        ask: ['What does `xargs` do with what it reads on its input?'],
        right: ['It passes it as arguments to the command you give'],
        wrong: [
          "It passes it as the command's standard input",
          'It stores it in a variable called ARGS',
          'It counts how many arguments the input has',
          'It writes it to a file called xargs.out',
        ],
      },
      {
        ask: ["Why does `find . -name '*.o' | rm` delete nothing?"],
        right: ['rm does not read names from its input: it wants arguments'],
        wrong: [
          'Because rm needs -r to delete single files',
          'Because the pipe only passes the first line',
          'Because find writes the names to standard error',
          'Because rm cannot delete what find has found',
        ],
      },
    ],
    wrong: [
      "It passes it as the command's standard input",
      'It stores it in a variable called ARGS',
      'It counts how many arguments the input has',
    ],
    why: 'A pipe fills standard input, but rm, ls or basename read their arguments; xargs turns those lines into arguments.',
  },
  'pis-sh01-pipeline': {
    forms: [
      {
        ask: ['What does this pipeline output?'],
        right: ['The first 2 user names in alphabetical order'],
        wrong: [
          'The first 2 lines of /etc/passwd, whole',
          'The last 2 user names, sorted',
          'The first 2 comments of /etc/passwd',
          'The passwords of the first 2 users',
        ],
      },
      {
        ask: ['What changes if the `sort` is removed?'],
        right: ['The first 2 come out in file order'],
        wrong: [
          'The last 2 of the file come out, reversed',
          'Nothing: head already sorts its input',
          'It errors: head needs sort before it',
          'The comment lines come out too',
        ],
      },
    ],
    wrong: [
      'The first 2 lines of /etc/passwd, whole',
      'The last 2 user names, sorted',
      'The first 2 comments of /etc/passwd',
    ],
    why: 'Each command works on the output of the previous one: drop comments, keep the name, sort, and keep the first 2.',
  },
  'pis-sh01-cut': {
    forms: [
      {
        ask: ['What does `echo abcdef | cut -c2-4` print?'],
        right: ['`bcd`'],
        wrong: ['`abc`', '`bcde`', '`cd`', '`ef`'],
      },
      {
        ask: ['What does `echo a:b:c | cut -d: -f2` print?'],
        right: ['`b`'],
        wrong: ['`a`', '`a:b`', '`:b:`', '`b:c`'],
      },
      {
        ask: ['What does `echo a:b:c | cut -d: -f1,3` print?'],
        right: ['`a:c`'],
        wrong: ['`a:b`', '`a`', '`b:c`', '`a:b:c`'],
      },
    ],
    wrong: ['`abc`', '`bcde`', '`cd`'],
    why: 'cut -c cuts by character positions and cut -d -f by fields; N-M is N to M included and 1,3 picks separate fields.',
  },
}
