/** Banco de Not-games en inglés: algoritmos y concurrencia (`../algorithms.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const ALGORITHMS_EN: Readonly<Record<string, ConceptText>> = {
  'ps-ops': {
    forms: [
      {
        ask: ['What does `sa` do in push_swap?', 'In push_swap, what does the `sa` operation do?'],
        right: ['Swaps the first two elements of a'],
        wrong: [
          'Moves the top of a onto the top of b',
          'Shifts a up and the first one goes last',
          'Swaps the first of a with the first of b',
          'Swaps the first and the last of stack a',
        ],
      },
      {
        ask: ['What does `pb` do in push_swap?', 'In push_swap, what does the `pb` operation do?'],
        right: ['Moves the top of a onto the top of b'],
        wrong: [
          'Moves the top of b onto the top of a',
          'Swaps the first two elements of b',
          'Shifts b down and the last one goes up',
        ],
      },
      {
        ask: ['What does `rr` do in push_swap?', 'In push_swap, what does the `rr` operation do?'],
        right: ['Does ra and rb at once'],
        wrong: ['Does rra and rrb at once', 'Does ra twice in a row', 'Rotates a downwards'],
      },
      {
        ask: [
          'What does `rrr` do in push_swap?',
          'In push_swap, what does the `rrr` operation do?',
        ],
        right: ['Does rra and rrb at once'],
        wrong: ['Does ra and rb at once', 'Does rra three times in a row', 'Does rr and then rra'],
      },
      {
        ask: ['What does `pa` do if stack b is empty?', 'With b empty, what happens on `pa`?'],
        right: ['Nothing at all'],
        wrong: ['Prints «Error» and exits', 'Pushes a 0 onto the top of a', 'Does pb instead'],
      },
    ],
    wrong: [
      'Empties the whole stack b',
      'Sorts the first three of a',
      'Reverses the whole stack a',
    ],
    why: 'sa swaps the top two of a, pb moves the top of a to b, ra rotates up and rra down; ss, rr and rrr do the same on both stacks.',
  },
  'ps-sequence': {
    forms: [
      {
        ask: [
          'a = 3 1 2 (top on the left) and b is empty. What are they after `sa` and `pb`?',
          'With a = 3 1 2 (the 3 on top) and b empty, you do `sa` and then `pb`. What do the stacks look like?',
        ],
        right: ['a = 3 2, b = 1'],
        wrong: ['a = 1 2, b = 3', 'a = 1 3, b = 2', 'a = 2 3, b = 1', 'a = 3 1, b = 2'],
      },
      {
        ask: [
          'a = 1 2 3 and b = 4 5 (tops on the left). What is a after `pa` and `rra`?',
          'With a = 1 2 3 and b = 4 5 (the 1 and the 4 on top), you do `pa` and then `rra`. What is a?',
        ],
        right: ['3 4 1 2'],
        wrong: ['4 1 2 3', '1 2 3 4', '4 3 1 2', '3 5 1 2'],
      },
    ],
    wrong: ['Same as before', 'Both empty'],
    why: 'They apply in order: sa swaps the top two, pb and pa move the top from one stack to the other and rra brings the bottom one up.',
  },
  'ps-limits': {
    forms: [
      {
        ask: [
          'For the top push_swap grade, in fewer than how many operations must you sort 100 random numbers?',
          'With 100 random numbers, below how many operations does push_swap ask you to stay for the top grade?',
        ],
        right: ['700'],
        wrong: ['1100', '500', '1500', '300'],
      },
      {
        ask: [
          'For the top push_swap grade, at most how many operations are accepted with 500 random numbers?',
          'With 500 random numbers, what is the push_swap operation limit for the top grade?',
        ],
        right: ['5500'],
        wrong: ['7000', '3500', '11500', '8500'],
      },
    ],
    wrong: ['1000', '2000', '10000'],
    why: 'The evaluation counts operations: the top grade needs fewer than 700 with 100 numbers and no more than 5500 with 500.',
  },
  'ps-errors': {
    forms: [
      {
        ask: [
          'You give push_swap a duplicate number. What does it do?',
          'What does push_swap do if an argument is not an integer, like «12a»?',
          'What does push_swap do with a number that does not fit in an int?',
        ],
        right: ['Prints «Error» and a newline on stderr'],
        wrong: [
          'Skips it and sorts the other numbers',
          'Prints «Error» on standard output',
          'Prints «KO» followed by a newline',
          'Goes on and leaves that number in place',
        ],
      },
      {
        ask: [
          'What does push_swap do if you run it with no arguments?',
          'You run `./push_swap` with nothing else. What must happen?',
        ],
        right: ['Prints nothing and exits'],
        wrong: [
          'Prints «Error» on stderr',
          'Waits for numbers on stdin',
          'Prints how to use the program',
        ],
      },
    ],
    wrong: ['Hangs forever', 'Sorts an empty stack and prints OK'],
    why: 'The subject asks for «Error» and a newline on standard error for any bad argument, and nothing when there are no arguments.',
  },
  'ps-output': {
    forms: [
      {
        ask: [
          'How does push_swap print the list of instructions?',
          'Where and in what format does push_swap output the operations?',
        ],
        right: ['One per line, on standard output'],
        wrong: [
          'All on one line, separated by commas',
          'One per line, on standard error',
          'In a file that checker reads later',
        ],
      },
      {
        ask: [
          'What does push_swap print if the numbers are already sorted?',
          'With `./push_swap 1 2 3`, what comes out?',
        ],
        right: ['Nothing: no instructions'],
        wrong: ['OK and a newline', '«Error» on standard error', 'An sa to check'],
      },
    ],
    wrong: ['The stacks after each step'],
    why: 'push_swap prints the shortest list it finds, one instruction per line on stdout; if already sorted, the shortest is doing nothing.',
  },
  'ps-checker': {
    forms: [
      {
        ask: [
          'What does `checker` print if, after the instructions, a is sorted and b is empty?',
          'The instructions leave a sorted and b empty. What does checker answer?',
        ],
        right: ['OK'],
        wrong: ['KO', 'Error', 'Nothing'],
      },
      {
        ask: [
          'What does `checker` print if a ends up sorted but b is not empty?',
          'The instructions leave a sorted, but there are numbers left in b. What does checker answer?',
        ],
        right: ['KO'],
        wrong: ['OK', 'Error', 'Nothing'],
      },
      {
        ask: [
          'Where does `checker` read the instructions from?',
          'In the push_swap bonus, how do the operations reach checker?',
        ],
        right: ['From standard input, one per line'],
        wrong: [
          'From the arguments, after the numbers',
          'From a file called instructions.txt',
          'From the standard error of push_swap',
        ],
      },
    ],
    wrong: ['Sorted', 'Done'],
    why: 'checker reads the instructions on stdin, applies them and prints OK only if a is sorted and b is empty; otherwise, KO.',
  },
  'algo-rotate': {
    forms: [
      {
        ask: [
          'Stack a is 1 2 3 4 5, with the 1 on top. What does it look like after `ra`?',
          'With a = 1 2 3 4 5 (top on the left), what does rotating up once give?',
        ],
        right: ['2 3 4 5 1'],
        wrong: ['5 1 2 3 4', '5 4 3 2 1', '2 1 3 4 5', '1 5 2 3 4'],
      },
      {
        ask: [
          'Stack a is 1 2 3 4 5, with the 1 on top. What does it look like after `rra`?',
          'With a = 1 2 3 4 5 (top on the left), what does rotating down once give?',
        ],
        right: ['5 1 2 3 4'],
        wrong: ['2 3 4 5 1', '5 4 3 2 1', '2 1 3 4 5', '1 5 2 3 4'],
      },
    ],
    wrong: ['5 4 3 2 1', '2 1 3 4 5', '1 5 2 3 4'],
    why: 'ra moves everything up and the top one goes to the bottom; rra does the opposite: the bottom one goes to the top.',
  },
  'algo-three': {
    forms: [
      {
        ask: [
          'At most, how many operations does sorting 3 numbers take in push_swap?',
          'In the worst case, how many operations does sorting a stack of 3 elements cost?',
        ],
        right: ['2'],
      },
    ],
    wrong: ['1', '3', '4', '6'],
    why: 'There are 6 possible orders and all of them are fixed with sa, ra, rra or a pair of them: never more than 2.',
  },
  'algo-radix': {
    forms: [
      {
        ask: ['How does radix sort sort?', 'What does radix sort do to sort?'],
        right: [
          'By bits or digits, one at a time, without comparing',
          'It groups by each bit, from the least significant up',
        ],
      },
    ],
    wrong: [
      'It compares each pair of neighbours and swaps them',
      'It picks a pivot and splits the list in two halves',
      'It inserts each element in its place, one by one',
      'It splits in halves, sorts each and merges them',
    ],
    why: 'Radix distributes by each digit or bit; with normalised indices and bits, it fits two stacks well.',
  },
  'algo-quicksort': {
    forms: [
      {
        ask: [
          'When does quicksort hit its worst case, O(n²)?',
          'What makes quicksort become quadratic?',
        ],
        right: [
          'The pivot always being the minimum or the maximum',
          'Partitions that come out very unbalanced',
        ],
        wrong: [
          'The numbers being very large integers',
          'The list having fewer than ten elements',
          'Mixing negative and positive numbers',
          'Nothing: quicksort always costs n log n',
        ],
      },
      {
        ask: [
          'Which sort splits the list in two, sorts each half and joins them?',
          'What is sorting by splitting in two, sorting each half and merging them called?',
        ],
        right: ['Merge sort'],
        wrong: ['Quicksort', 'Bubble sort', 'Insertion sort', 'Radix sort'],
      },
    ],
    wrong: ['The numbers being very large integers', 'Mixing negative and positive numbers'],
    why: 'Quicksort depends on the pivot; merge sort always splits in the middle and always costs n log n.',
  },
  'algo-binary-search': {
    forms: [
      {
        ask: [
          'At most, how many steps does a binary search need in 1000 elements?',
          'Searching by halves among 1000 elements, in at most how many steps do you get there?',
        ],
        right: ['10'],
        wrong: ['500', '1000', '100', '32'],
      },
    ],
    wrong: ['20', '50'],
    why: 'Each step discards half of what is left, and 2¹⁰ = 1024 is already over 1000: 10 are enough.',
  },
  'algo-bfs-dfs': {
    forms: [
      {
        ask: [
          'Which traversal finds the shortest path (in steps) in a maze?',
          'To reach the exit in the fewest steps, how do you traverse?',
        ],
        right: ['Breadth first (BFS)'],
        wrong: ['Depth first (DFS)', 'At random', 'Following the right wall'],
      },
      {
        ask: [
          'What structure does a depth-first search (DFS) use without recursion?',
          'Where does a hand-written DFS keep the nodes still to visit?',
        ],
        right: ['In a stack'],
        wrong: ['In a queue', 'In a heap', 'In a hash table'],
      },
    ],
    wrong: ['Depth first (DFS)', 'At random', 'Following the right wall'],
    why: 'BFS advances in layers (with a queue): the first to arrive arrives by the shortest path. DFS goes deep (with a stack).',
  },
  'algo-dijkstra': {
    forms: [
      {
        ask: ["What is Dijkstra's algorithm for?", 'What does Dijkstra find?'],
        right: [
          'The shortest path with non-negative weights',
          'The minimum distance from a source to each node',
        ],
        wrong: [
          'The minimum spanning tree of the graph',
          'A cycle that goes once through every node',
          'The topological order of a directed graph',
        ],
      },
      {
        ask: [
          'In which case does Dijkstra not work?',
          'With what kind of graph can Dijkstra fail?',
        ],
        right: ['With negative weights'],
        wrong: ['With decimal weights', 'With directed cycles', 'With over a thousand nodes'],
      },
    ],
    wrong: ['The minimum spanning tree of the graph', 'The topological order of a directed graph'],
    why: 'Dijkstra closes the nearest node for good; a negative weight could later shorten something already closed.',
  },
  'algo-maze-perfect': {
    forms: [
      {
        ask: [
          'What is special about a «perfect» maze?',
          'What must a maze meet to be called perfect?',
        ],
        right: ['There is a single path between two cells'],
        wrong: [
          'It has no exit at all on the border',
          'It is symmetric around its centre',
          'There are several paths to the exit',
          'It has no dead ends anywhere',
        ],
      },
      {
        ask: [
          'In a perfect maze, how many paths are there between two cells?',
          'How many different paths join the entry and the exit of a perfect maze?',
        ],
        right: ['1'],
        wrong: ['0', '2', '4', '8'],
      },
      {
        ask: [
          'Seen as a graph, what is a perfect maze?',
          'What structure do the cells and passages of a perfect maze form?',
        ],
        right: ['A tree'],
        wrong: ['A complete graph', 'A cycle', 'A graph with cycles'],
      },
    ],
    wrong: ['A complete graph', 'A cycle'],
    why: 'No cycles and everything connected: that is a tree, and that is why there is a single path between two points.',
  },
  'algo-maze-gen': {
    forms: [
      {
        ask: [
          'You generate a maze with DFS: from a cell you go to a random unvisited neighbour, knock down the wall and, if none is left, you backtrack. What comes out?',
          'What does the «recursive backtracker» (DFS knocking down walls) generate?',
        ],
        right: ['A perfect maze, with long corridors', 'A tree that covers every cell'],
      },
    ],
    wrong: [
      'A maze with many cycles and shortcuts',
      'A maze that has no solution',
      'A straight corridor from side to side',
      'A maze with isolated areas',
    ],
    why: 'It never enters an already visited cell (no cycles) and does not stop until all are visited (everything connected).',
  },
  'thr-race': {
    forms: [
      {
        ask: ['What is a data race?', 'When is there a data race?'],
        right: ['When two threads touch data at once, one writes, and no mutex'],
        wrong: [
          'When one thread ends before another one starts',
          'When one thread uses almost all the process CPU',
          'When two threads wait for each other forever',
          'When the program runs faster with threads than without',
        ],
      },
      {
        ask: [
          'Two threads touch the same variable at the same time, at least one writes and there is no mutex. What is that called?',
        ],
        right: ['Data race'],
        wrong: ['Deadlock', 'Starvation', 'Context switch'],
      },
    ],
    wrong: [
      'When one thread ends before another one starts',
      'When one thread uses almost all the process CPU',
    ],
    why: 'Without a mutex (or other synchronisation), the result depends on how the threads interleave.',
  },
  'thr-counter': {
    code: 'int count = 0;\n\nvoid *add(void *arg)\n{\n    for (int i = 0; i < 100000; i++)\n        count++;\n    return NULL;\n}\n\n/* main starts two threads with add and waits for both */',
    forms: [
      {
        ask: ['What is `count` at the end?', 'When both threads finish, what is count?'],
        right: [
          'It can be less than 200000: count++ is not atomic',
          'Unknown, but it usually comes out below 200000',
        ],
      },
    ],
    wrong: [
      'Always 200000: each thread adds 100000',
      'Always 100000: only the last thread counts',
      'Always 200000, because main waits for both',
      'Always 0: each thread adds to its own copy',
    ],
    why: 'count++ is read, add and write: two threads can read the same value and one addition is lost.',
  },
  'thr-deadlock': {
    forms: [
      {
        ask: ['What is a deadlock?', 'When is there a deadlock?'],
        right: ['When several threads wait for each other and none moves on'],
        wrong: [
          'When one thread is much slower than the others',
          'When two threads write the same data at once',
          'When one thread ends before main is done',
        ],
      },
      {
        ask: [
          'Each thread waits for something another one holds, and nobody lets go. What is that called?',
        ],
        right: ['Deadlock'],
        wrong: ['Data race', 'Starvation', 'Memory leak'],
      },
      {
        ask: [
          'All the philosophers pick up their left fork first. What can happen?',
          'If each philosopher takes their left fork and waits for the right one, what can happen?',
        ],
        right: ['They all end up waiting forever', 'Nobody gets the second one or drops the first'],
        wrong: [
          'Each one eats twice in a row without stopping',
          'They all eat at once with a single fork',
          'Nothing: it is the right way to avoid locks',
        ],
      },
    ],
    wrong: [
      'When one thread is much slower than the others',
      'When two threads write the same data at once',
    ],
    why: 'With circular waiting nobody moves on. Breaking the cycle (for example, even ones take the other fork first) avoids it.',
  },
  'thr-mutex': {
    forms: [
      {
        ask: ['What is a mutex for?', 'What does a mutex guarantee?'],
        right: [
          'That only one thread at a time enters a section',
          'That only one thread at a time holds the lock',
        ],
        wrong: [
          'That threads run faster when sharing',
          'That threads start in the order of the code',
          'That memory can be shared between processes',
          'That time is measured well in each thread',
        ],
      },
      {
        ask: [
          'What happens if a thread calls `pthread_mutex_lock` twice in a row on the same normal mutex?',
          'A thread locks the same normal-type mutex twice in a row. What happens?',
        ],
        right: ['It blocks forever, waiting for itself'],
        wrong: [
          'Nothing: the second lock is just ignored',
          'It unlocks, because lock toggles the state',
          'The second lock passes and the mutex counts two',
        ],
      },
    ],
    wrong: ['That threads run faster when sharing', 'That threads start in the order of the code'],
    why: 'lock waits for the lock to be free; if you already hold it, you wait for yourself.',
  },
  'thr-join-detach': {
    forms: [
      {
        ask: ['What does `pthread_join` do?', 'What is `pthread_join(th, NULL)` for?'],
        right: ['Waits for that thread to finish', 'Waits for the thread and collects its result'],
        wrong: [
          'Starts a new thread with that function',
          'Merges two threads into one',
          "Locks that thread's mutex",
          'Puts the current thread to sleep a while',
        ],
      },
      {
        ask: ['What does `pthread_detach` do?', 'What changes when you detach a thread?'],
        right: [
          'It frees itself when it ends, with nobody waiting for it',
          'It can no longer be waited for with join',
        ],
        wrong: [
          'The current thread waits for it to finish',
          'The thread is killed right at that moment',
          'The thread pauses until it is signalled',
        ],
      },
    ],
    wrong: ['Starts a new thread with that function', 'Merges two threads into one'],
    why: 'Every thread is collected with join or released with detach; otherwise, its resources stay.',
  },
  'thr-usleep': {
    forms: [
      {
        ask: [
          'A philosopher dies if 410 ms pass without eating, and your monitor thread does `usleep(500000)` between checks. What goes wrong?',
          'Why does a monitor that sleeps half a second between checks not work?',
        ],
        right: [
          'It reports the death late: check every few ms',
          'It can be 500 ms late, and the limit is 10 ms',
        ],
      },
    ],
    wrong: [
      'Nothing: usleep sleeps exactly what you ask',
      'The philosopher dies early because of usleep',
      'usleep cannot be used inside a thread',
      'It blocks all the philosophers at once',
    ],
    why: 'The death must be reported at most 10 ms after it happens; also, usleep can sleep longer than asked.',
  },
  'thr-print': {
    forms: [
      {
        ask: [
          'What does protecting the printf of the messages with a mutex prevent?',
          'Without a mutex for writing, what can happen to messages from several threads?',
        ],
        right: [
          'That they mix or come out after a death',
          'That they cut each other or follow the «died»',
        ],
      },
    ],
    wrong: [
      'That printf stops working in the other threads',
      'That the program gets slower when writing',
      'That the compiler warns about a race',
      'That more memory goes into the buffer',
    ],
    why: 'A message after «died» is a bug; the same mutex also prevents mixed-up lines.',
  },
  'philo-args': {
    forms: [
      {
        ask: [
          'How many mandatory arguments does `philo` take?',
          'Not counting the optional one, how many arguments does `./philo` take?',
        ],
        right: ['4'],
        wrong: ['5', '3', '6', '2'],
      },
      {
        ask: [
          'In what unit are time_to_die, time_to_eat and time_to_sleep?',
          'In `./philo 5 800 200 200`, in what unit are the 800 and the 200s?',
        ],
        right: ['In milliseconds'],
        wrong: ['In microseconds', 'In seconds', 'In tenths of a second'],
      },
      {
        ask: [
          'In what order do the arguments of `philo` go?',
          'What order do the mandatory arguments of philosophers follow?',
        ],
        right: ['Philosophers, die, eat, sleep'],
        wrong: [
          'Philosophers, eat, sleep, die',
          'Philosophers, sleep, eat, die',
          'Die, eat, sleep, philosophers',
        ],
      },
    ],
    wrong: ['Eat, sleep, die, philosophers'],
    why: 'They are number_of_philosophers, time_to_die, time_to_eat and time_to_sleep, in milliseconds, plus an optional fifth.',
  },
  'philo-must-eat': {
    forms: [
      {
        ask: [
          'What does the fifth argument, number_of_times_each_philosopher_must_eat, do?',
          'If you give number_of_times_each_philosopher_must_eat, when does the simulation stop?',
        ],
        right: ['It stops when all have eaten at least that many times'],
        wrong: [
          'Each philosopher dies after eating that many times',
          'It stops when the first one has eaten that many times',
          'It is the number of forks on the table',
        ],
      },
      {
        ask: [
          'If number_of_times_each_philosopher_must_eat is not given, when does the simulation end?',
          'Without the optional argument, what makes philo stop?',
        ],
        right: ['A philosopher dies'],
        wrong: ['Each one has eaten once', 'A full minute goes by', 'All have slept once'],
      },
    ],
    wrong: ['It never stops: you must kill it with Ctrl+C'],
    why: 'The simulation stops at the first death or, if the fifth argument is given, when all have eaten at least that many times.',
  },
  'philo-one': {
    forms: [
      {
        ask: [
          'With a single philosopher (`./philo 1 800 200 200`), what must happen?',
          'You run philo with 1 philosopher and time_to_die = 800. What is correct?',
        ],
        right: ['Takes a fork, cannot eat and dies at 800 ms'],
        wrong: [
          'Eats with a single fork and lives forever',
          'The program errors out: at least 2 are needed',
          'Keeps thinking and never dies: nobody takes anything',
        ],
      },
      {
        ask: [
          'In the mandatory part, how many forks are there at a table of N philosophers?',
          'How many forks are on the table with N philosophers?',
        ],
        right: ['As many as philosophers'],
        wrong: [
          'One fewer than philosophers',
          'Twice as many as philosophers',
          'Half as many as philosophers',
        ],
      },
    ],
    wrong: ['It hangs without printing anything'],
    why: 'There is one fork per philosopher; alone, he has one and needs two, so he does not eat and dies at time_to_die.',
  },
  'philo-bonus': {
    forms: [
      {
        ask: [
          'In the philosophers bonus, what is each philosopher?',
          'In philo_bonus, how is each philosopher started?',
        ],
        right: ['A process'],
        wrong: ['A thread', 'A semaphore', 'A signal'],
      },
      {
        ask: [
          'In the philosophers bonus, what keeps count of the free forks?',
          'In philo_bonus, what represents the number of forks left?',
        ],
        right: ['A counting semaphore'],
        wrong: ['A mutex for each fork', 'A pipe between neighbours', 'A file in /tmp'],
      },
      {
        ask: [
          'In the philosophers bonus, where are the forks?',
          'In philo_bonus, how are the forks placed on the table?',
        ],
        right: ['All in the middle of the table'],
        wrong: [
          'One between every two philosophers',
          'Two in front of each philosopher',
          'In the hands of the parent process',
        ],
      },
    ],
    wrong: ['A shared global variable'],
    why: 'In the bonus each philosopher is a process and the forks are in the middle: a semaphore holds how many there are.',
  },
}
