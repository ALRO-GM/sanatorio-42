/** Banco de Not-games en inglés: lo general (`../general.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const GENERAL_EN: Readonly<Record<string, ConceptText>> = {
  'gen-binary-8': {
    forms: [
      {
        ask: [
          'What is binary 1000 in decimal?',
          'The binary number 1000, in decimal, is…',
          'Convert 0b1000 to base 10.',
        ],
        right: ['8'],
        wrong: ['16', '4', '10', '2', '7'],
      },
      {
        ask: ['How do you write 8 in binary?', 'Decimal 8, in base 2, is…'],
        right: ['1000', '0b1000'],
        wrong: ['111', '0b111', '1001', '100', '0b10000'],
      },
    ],
    wrong: ['16', '4', '10', '2', '7'],
    why: 'Each position is worth twice the previous one: 1000 is 1 × 2³ = 8.',
  },
  'gen-hex-ff': {
    forms: [
      {
        ask: [
          'What decimal value does 0xFF have?',
          'Hexadecimal FF, in decimal, is…',
          'If a byte is 0xFF, what is it unsigned in base 10?',
        ],
        right: ['255'],
      },
      {
        ask: [
          'What is the largest value that fits in an unsigned byte?',
          'An unsigned char goes up to, at most…',
        ],
        right: ['255'],
      },
    ],
    wrong: ['256', '15', '128', '510', '100', '127', '1515'],
    why: 'F is 15: 15 × 16 + 15 = 255, the largest value of an unsigned byte (8 bits set to 1).',
  },
  'gen-byte-bits': {
    forms: [
      {
        ask: ['How many bits are in a byte?', 'How many bits make an octet?'],
        right: ['8'],
        wrong: ['4', '16', '10', '32', '64'],
      },
      {
        ask: [
          'How many different values fit in a byte?',
          'How many different combinations do 8 bits give?',
        ],
        right: ['256'],
        wrong: ['255', '128', '512', '64'],
      },
    ],
    wrong: ['4', '16', '10', '32', '64'],
    why: 'A byte is 8 bits, and 8 bits give 2⁸ = 256 combinations.',
  },
  'gen-shift-left': {
    forms: [
      {
        ask: [
          'What does `x << 1` do to a small positive integer?',
          'Shifting an integer one bit to the left is the same as…',
        ],
        right: ['Multiplying it by 2', 'Doubling it'],
        wrong: ['Dividing it by 2', 'Adding 1 to it', 'Squaring it', 'Changing its sign'],
      },
      {
        ask: [
          'What does `x >> 1` do to a positive integer?',
          'Shifting a positive integer one bit to the right is the same as…',
        ],
        right: ['Dividing it by 2 (rounding down)', 'Halving it, without decimals'],
        wrong: [
          'Multiplying it by 2',
          'Subtracting 1 from it',
          'Flipping all its bits',
          'Changing its sign',
        ],
      },
    ],
    wrong: ['Adding 1 to it', 'Squaring it', 'Changing its sign', 'Subtracting 1 from it'],
    why: 'Each bit moves up (or down) one position, and each position is worth twice the previous one.',
  },
  'gen-and-mask': {
    forms: [
      {
        ask: ['What is `13 & 6`?', 'The bitwise AND of 13 and 6 is…'],
        right: ['4'],
        wrong: ['19', '15', '2', '7', '1'],
      },
      {
        ask: ['What is `13 | 6`?', 'The bitwise OR of 13 and 6 is…'],
        right: ['15'],
        wrong: ['4', '19', '11', '7', '78'],
      },
    ],
    wrong: ['19', '11', '2', '78', '7', '1'],
    why: '13 is 1101 and 6 is 0110: AND keeps only the bit set in both (0100 = 4); OR keeps all of them (1111 = 15).',
  },
  'gen-complexity-binary-search': {
    forms: [
      {
        ask: [
          'What is the complexity of binary search in a sorted array?',
          'Searching a sorted array by halving it each time costs…',
        ],
        right: ['O(log n)'],
        wrong: ['O(n)', 'O(n²)', 'O(1)', 'O(n log n)'],
      },
      {
        ask: [
          'What condition must an array meet to use binary search?',
          'Before searching by halving, the array has to…',
        ],
        right: ['Be sorted'],
        wrong: ['Have a power-of-2 size', 'Have no duplicates', 'Be on the heap'],
      },
    ],
    wrong: ['O(n)', 'O(n²)', 'O(1)', 'O(n log n)'],
    why: 'Each step discards half (that is why it needs order): with n elements, about log₂ n steps are enough.',
  },
  'gen-complexity-nested': {
    forms: [
      {
        ask: [
          'What is the complexity of this snippet?',
          'In big O notation, this double loop costs…',
          'How does the work of this code grow with n?',
        ],
        right: ['O(n²)'],
      },
    ],
    wrong: ['O(n)', 'O(n log n)', 'O(log n)', 'O(n³)', 'O(1)', 'O(2ⁿ)'],
    why: 'The body runs n + (n-1) + … + 1 = n(n+1)/2 times: it grows like n².',
  },
  'gen-sort-complexity': {
    forms: [
      {
        ask: [
          'At the very least, how much does sorting by comparing elements cost in general?',
          'In the worst case, an algorithm that sorts by comparing cannot go below…',
        ],
        right: ['O(n log n)'],
        wrong: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'],
      },
      {
        ask: [
          'What is the worst-case complexity of bubble sort?',
          'Bubble sort, in the worst case, costs…',
        ],
        right: ['O(n²)'],
        wrong: ['O(n log n)', 'O(n)', 'O(log n)', 'O(n³)'],
      },
    ],
    wrong: ['O(n)', 'O(log n)', 'O(1)', 'O(n³)', 'O(2ⁿ)'],
    why: 'With comparisons there are n! possible orders and each comparison gives one bit: about n log n are needed. Bubble sort compares everything with everything.',
  },
  'gen-stack-lifo': {
    forms: [
      {
        ask: ['In what order do elements leave a stack?', 'What access policy does a stack have?'],
        right: ['LIFO: last in, first out'],
        wrong: [
          'FIFO: first in, first out',
          'By priority: the largest leaves first',
          'At random: any one leaves',
        ],
      },
      {
        ask: [
          'In a stack, which element comes out first?',
          'Which one do you take out of a stack first?',
        ],
        right: ['The last one pushed'],
        wrong: ['The first one pushed', 'The smallest one', 'The one in the middle'],
      },
      {
        ask: ['You push 1, 2 and 3 onto a stack, in that order. Which do you pop first?'],
        right: ['The 3'],
        wrong: ['The 1', 'The 2', 'Any of the three'],
      },
    ],
    wrong: ['The smallest one', 'The largest one', 'One at random'],
    why: 'A stack is like a pile of plates: you take the top one, the last one put there.',
  },
  'gen-queue-fifo': {
    forms: [
      {
        ask: ['In what order do elements leave a queue?', 'What access policy does a queue have?'],
        right: ['FIFO: first in, first out'],
        wrong: [
          'LIFO: last in, first out',
          'By priority: the largest leaves first',
          'At random: any one leaves',
        ],
      },
      {
        ask: [
          'In a queue, which element is served first?',
          'Which one do you take out of a queue first?',
        ],
        right: ['The one that has been waiting longest'],
        wrong: ['The last one added', 'The smallest one', 'The one in the middle'],
      },
      {
        ask: ['You add 1, 2 and 3 to a queue, in that order. Which comes out first?'],
        right: ['The 1'],
        wrong: ['The 3', 'The 2', 'Any of the three'],
      },
    ],
    wrong: ['The smallest one', 'The largest one', 'One at random'],
    why: 'Like a supermarket queue: people are served in order of arrival.',
  },
  'gen-list-vs-array': {
    forms: [
      {
        ask: [
          'What does it cost to access element i of a linked list?',
          'Reaching position i of a linked list costs…',
        ],
        right: ['O(i)'],
        wrong: ['O(1)', 'O(log i)', 'O(i²)'],
      },
      {
        ask: [
          'What does it cost to access element i of an array?',
          'Reading `a[i]` in an array costs…',
        ],
        right: ['O(1)'],
        wrong: ['O(i)', 'O(log i)', 'O(i²)'],
      },
    ],
    wrong: ['O(log i)', 'O(i²)', 'O(n)'],
    why: 'An array is contiguous in memory (address = start + i × size); a list has to be walked node by node from the start.',
  },
  'gen-recursion-base': {
    forms: [
      {
        ask: [
          'What is missing in a recursive function that never ends?',
          'For a recursive function to finish, it needs…',
        ],
        right: ['A base case', 'A stop condition that does not call it again'],
        wrong: ['A while loop', 'A global variable', 'A return value', 'More memory'],
      },
      {
        ask: [
          'What usually happens in C with a recursion that never ends?',
          'A function that calls itself forever ends up…',
        ],
        right: ['Overflowing the stack (stack overflow)'],
        wrong: [
          'With a compilation error',
          'With a heap memory leak',
          'Returning 0',
          'In a loop that uses no memory',
        ],
      },
    ],
    wrong: ['A while loop', 'A global variable', 'A return value'],
    why: 'Each call takes room on the stack; without a case that stops calling, the stack runs out.',
  },
  'gen-recursion-trace': {
    forms: [
      { ask: ['What does f(4) return?', 'What value does f(4) give?'], right: ['24'] },
      {
        ask: ['What does f(5) return?', 'What value does f(5) give?'],
        right: ['120'],
        wrong: ['24'],
      },
      {
        ask: ['What does this function compute?', 'What does f do with a positive n?'],
        right: ['The factorial of n'],
        wrong: ['The sum from 1 to n', 'n squared', 'The n-th Fibonacci number'],
      },
    ],
    wrong: ['10', '4', '16', '1', '60'],
    why: 'f(n) = n × f(n-1) and f(1) = 1: it is the factorial (4! = 24, 5! = 120).',
  },
  'gen-git-push': {
    forms: [
      {
        ask: ['What does `git push` do?', 'What is `git push` for?'],
        right: [
          'It sends your commits to the remote repository',
          'It uploads your local commits to the remote',
        ],
        wrong: [
          'It saves the changes in a local commit',
          'It downloads the changes from the remote',
          'It adds files to the index',
          'It creates a new branch',
        ],
      },
      {
        ask: [
          'After `git commit`, which command takes your changes to the server?',
          'To get your commit to the remote repository, you use…',
        ],
        right: ['git push'],
        wrong: ['git commit', 'git pull', 'git add', 'git fetch'],
      },
    ],
    wrong: [
      'It saves the changes in a local commit',
      'It downloads the changes from the remote',
      'It creates a new branch',
    ],
    why: '`commit` saves into your copy of the repository; `push` sends it to the remote.',
  },
  'gen-git-add': {
    forms: [
      {
        ask: ['What does `git add file` do?', 'What is `git add` for, with a changed file?'],
        right: [
          'It prepares it for the next commit',
          'It puts it in the index (staging) for the next commit',
        ],
        wrong: [
          'It uploads it to the server',
          'It deletes it from the repository',
          'It makes git ignore it forever',
          'It copies it to another branch',
        ],
      },
      {
        ask: [
          'Before committing a changed file, which command prepares it?',
          'Which command puts a change in the index?',
        ],
        right: ['git add'],
        wrong: ['git push', 'git commit', 'git stash', 'git log'],
      },
    ],
    wrong: [
      'It uploads it to the server',
      'It deletes it from the repository',
      'It copies it to another branch',
    ],
    why: 'The index is the list of what will go into the next commit.',
  },
  'gen-git-conflict': {
    forms: [
      {
        ask: ['When is there a conflict when merging?', 'What causes a conflict in git?'],
        right: [
          'Both branches changed the same lines in different ways',
          'Two changes touch the same part of a file and git cannot tell which to keep',
        ],
        wrong: [
          'A file is too big',
          'The remote branch has been deleted',
          'Two commits have the same message',
          'Any merge, always',
        ],
      },
      {
        ask: [
          'With what markers does git separate the two versions in a conflict?',
          'In a conflicted file, the two versions appear between…',
        ],
        right: ['<<<<<<<, ======= and >>>>>>>'],
        wrong: ['/* conflict */ and /* end */', '### MERGE ###', '[[[ and ]]]'],
      },
    ],
    wrong: [
      'A file is too big',
      'The remote branch has been deleted',
      'Two commits have the same message',
    ],
    why: 'Git only merges what does not overlap; if two branches change the same thing, it leaves both versions marked for you to choose.',
  },
  'gen-shell-pipe': {
    forms: [
      {
        ask: ['In the shell, what does `ls | wc -l` do?', 'What result does `ls | wc -l` give?'],
        right: [
          'It counts how many lines ls prints',
          'It passes the output of ls to wc, which counts its lines',
        ],
        wrong: [
          'It runs ls and wc at the same time, without connecting them',
          'It saves the output of ls in a file called wc',
          'It only runs wc if ls fails',
          'It counts the hidden files',
        ],
      },
      {
        ask: [
          'In `cmd1 | cmd2`, what happens to the output of cmd1?',
          'What does the `|` symbol do between two commands?',
        ],
        right: [
          'It becomes the input of the second command',
          'It connects the output of the first with the input of the second',
        ],
        wrong: [
          'It is thrown away',
          'It is a logical OR between the two commands',
          'It only runs the second if the first fails',
          'It is written to a temporary file called pipe',
        ],
      },
    ],
    wrong: [
      'It is thrown away',
      'It only runs the second if the first fails',
      'It is a logical OR',
    ],
    why: 'A pipe connects the standard output of one command to the standard input of the next.',
  },
  'gen-shell-redirect': {
    forms: [
      {
        ask: [
          'What is the difference between `>` and `>>`?',
          'How do `echo hi > f` and `echo hi >> f` differ?',
        ],
        right: [
          '`>` overwrites and `>>` appends at the end',
          '`>>` appends without deleting what was there; `>` empties it',
        ],
        wrong: [
          '`>` appends and `>>` overwrites',
          '`>>` redirects the input',
          '`>>` redirects the errors',
          '`>` only works with new files',
        ],
      },
      {
        ask: [
          'Which redirection appends to the end of a file without deleting it?',
          'To write after what is already in a file, you use…',
        ],
        right: ['>>'],
        wrong: ['>', '<<', '<', '|'],
      },
    ],
    wrong: [
      '`>` appends and `>>` overwrites',
      '`>>` redirects the input',
      '`>>` redirects the errors',
    ],
    why: '`>` empties the file before writing; `>>` writes after what is there.',
  },
  'gen-shell-exit-status': {
    forms: [
      {
        ask: ['What does `$?` hold in bash?', 'What does the special variable `$?` contain?'],
        right: [
          'The exit code of the last command',
          'How the last command ended (0 if it went well)',
        ],
        wrong: [
          'The PID of the shell',
          'The number of arguments',
          'The last argument',
          'The name of the script',
        ],
      },
      {
        ask: [
          'What exit code does a command that went well give?',
          'By convention, a command that ends without error exits with…',
        ],
        right: ['0'],
        wrong: ['1', '-1', '255', '42'],
      },
    ],
    wrong: ['The PID of the shell', 'The number of arguments', 'The last argument'],
    why: '`$?` is the exit status: 0 means success, and any other number, error.',
  },
  'gen-chmod': {
    forms: [
      {
        ask: [
          'What permissions does `chmod 755 file` give?',
          'How do permissions 755 look in `ls -l`?',
        ],
        right: ['rwxr-xr-x'],
        wrong: ['rwxrwxrwx', 'r--r--r--', 'rw-rw-rw-', 'rwxr--r--'],
      },
      {
        ask: [
          'What chmod number gives `rw-r--r--`?',
          'How are the permissions rw-r--r-- written in octal?',
        ],
        right: ['644'],
        wrong: ['755', '666', '444', '777'],
      },
    ],
    wrong: ['rwxrwxrwx', 'r--r--r--', 'rw-rw-rw-'],
    why: 'Each digit is owner, group and others: read is 4, write 2 and execute 1 (7 = 4 + 2 + 1, 5 = 4 + 1).',
  },
  'gen-ascii-a': {
    forms: [
      {
        ask: ['What ASCII code does the letter `A` have?', "In ASCII, 'A' is…"],
        right: ['65'],
        wrong: ['97', '64', '48', '90'],
      },
      {
        ask: ['What ASCII code does lowercase `a` have?', "In ASCII, 'a' is…"],
        right: ['97'],
        wrong: ['65', '122', '96', '48'],
      },
      {
        ask: [
          'How far apart are a lowercase letter and its uppercase in ASCII?',
          "What is the distance between 'a' and 'A' in the ASCII table?",
        ],
        right: ['32'],
        wrong: ['26', '1', '64', '16'],
      },
    ],
    wrong: ['64', '48', '41', '90', '122'],
    why: 'Uppercase starts at 65 (A) and lowercase at 97 (a): they differ by 32, a single bit.',
  },
  'gen-hash-collision': {
    forms: [
      {
        ask: [
          'In a hash table, what is a collision?',
          'When is there a collision in a hash table?',
        ],
        right: [
          'When two different keys give the same hash',
          'When two keys land in the same slot',
        ],
        wrong: [
          'When you look for a key that is not there',
          'When the table is completely full',
          'When a key is deleted twice',
          'When the hash does not fit in an int',
        ],
      },
      {
        ask: [
          'What do you call two different keys landing in the same slot of a hash table?',
          'If two different keys give the same hash, there is…',
        ],
        right: ['A collision'],
        wrong: ['A rehash', 'An overflow', 'A dangling pointer', 'A duplicate'],
      },
      {
        ask: [
          'On average, what does a lookup cost in a well-sized hash table?',
          'A lookup in a hash table costs, on average…',
        ],
        right: ['O(1)'],
        wrong: ['O(n)', 'O(log n)', 'O(n log n)'],
      },
    ],
    wrong: ['A rehash', 'An overflow', 'A duplicate'],
    why: 'The hash gives the slot directly; collisions (unavoidable) are solved by chaining or by looking for another free slot.',
  },
}
