/** Banco de Not-games en inglés: algoritmos y concurrencia (`../algorithms.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const ALGORITHMS_EN: Readonly<Record<string, ConceptText>> = {
  'algo-sort-complexity': {
    forms: [
      {
        ask: [
          'In the worst case, at least how many comparisons does any comparison sort make?',
          'What is the lowest worst-case cost a comparison sort can reach?',
        ],
        right: ['O(n log n)'],
        wrong: ['O(n)', 'O(1)', 'O(log n)', 'O(n²)'],
      },
      {
        ask: [
          'What does bubble sort cost in the worst case?',
          'Bubble sort, in the worst case, costs…',
        ],
        right: ['O(n²)'],
        wrong: ['O(n log n)', 'O(n)', 'O(log n)', 'O(n³)'],
      },
    ],
    wrong: ['O(n)', 'O(1)', 'O(log n)', 'O(n³)', 'O(2ⁿ)'],
    why: 'Comparing, there are n! possible orders and each comparison splits them in two: about log₂(n!) ≈ n log n are needed.',
  },
  'algo-stack': {
    forms: [
      {
        ask: [
          'In a stack, which element comes out first?',
          'Which one do you take out of a stack first?',
        ],
        right: ['The last one that went in'],
        wrong: ['The first one that went in', 'The smallest one', 'The one in the middle'],
      },
      {
        ask: [
          'In a queue, which element comes out first?',
          'Which one do you take out of a queue first?',
        ],
        right: ['The first one that went in'],
        wrong: ['The last one that went in', 'The smallest one', 'The one in the middle'],
      },
      {
        ask: ['What order does a stack follow?', 'What access policy does a stack have?'],
        right: ['LIFO: last in, first out'],
        wrong: [
          'FIFO: first in, first out',
          'By priority: the largest leaves first',
          'At random: any one leaves',
        ],
      },
    ],
    wrong: ['The smallest one', 'The one in the middle', 'The largest one'],
    why: 'A stack takes out where it puts in (LIFO); a queue puts in at one end and takes out at the other (FIFO).',
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
          'Digit by digit (or bit by bit), without comparing elements with each other',
          'It groups by each bit or digit, starting with the least significant',
        ],
      },
    ],
    wrong: [
      'It compares every pair of elements',
      'It picks a pivot and splits in two',
      'It inserts each element in its place',
      'It shuffles at random until it is sorted',
    ],
    why: 'Radix distributes by each digit or bit; with normalised indexes and bits, it fits well with two stacks.',
  },
  'algo-quicksort': {
    forms: [
      {
        ask: [
          'When does quicksort hit its worst case, O(n²)?',
          'What makes quicksort become quadratic?',
        ],
        right: ['A pivot that is always the minimum or the maximum', 'Very unbalanced partitions'],
        wrong: [
          'Repeated numbers',
          'A very short list',
          'Negative numbers',
          'Nothing: it is always n log n',
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
    wrong: ['Repeated numbers', 'A very short list', 'Negative numbers'],
    why: 'Quicksort depends on the pivot; merge sort always splits in half and always costs n log n.',
  },
  'algo-binary-search': {
    forms: [
      {
        ask: [
          'What does a binary search need to work?',
          'How must the data be to search by halving?',
        ],
        right: ['Sorted'],
        wrong: ['Without duplicates', 'In a linked list', 'An even number of them', 'On the stack'],
      },
      {
        ask: [
          'At most, how many steps does a binary search need in 1000 elements?',
          'Searching by halving among 1000 elements, in how many steps do you get there at most?',
        ],
        right: ['10'],
        wrong: ['500', '1000', '100', '32'],
      },
    ],
    wrong: ['Without duplicates', 'In a linked list', 'An even number of them'],
    why: 'Halving only works if you know which side to look at: it needs order. 2¹⁰ = 1024.',
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
          'The minimum distance from one origin to the other nodes, with weights',
        ],
        wrong: [
          'The minimum spanning tree',
          'A cycle that goes through every node',
          'The topological order',
        ],
      },
      {
        ask: ['When does Dijkstra not work?', 'With what kind of graph can Dijkstra fail?'],
        right: ['With negative-weight edges'],
        wrong: ['With cycles', 'With more than 100 nodes', 'With decimal weights'],
      },
    ],
    wrong: [
      'The minimum spanning tree',
      'A cycle that goes through every node',
      'The topological order',
    ],
    why: 'Dijkstra closes the nearest node for good; a negative weight could later shorten something already closed.',
  },
  'algo-maze-perfect': {
    forms: [
      {
        ask: [
          'What is special about a "perfect" maze?',
          'In a perfect maze, how many paths are there between two cells?',
        ],
        right: ['Exactly one path between each pair of cells'],
        wrong: [
          'It has no exit',
          'It is symmetrical',
          'There are several paths to the exit',
          'It has no dead ends',
        ],
      },
      {
        ask: [
          'Seen as a graph, what is a perfect maze?',
          'What structure do the cells and passages of a perfect maze form?',
        ],
        right: ['A tree'],
        wrong: ['A complete graph', 'A cycle', 'A list'],
      },
    ],
    wrong: ['A complete graph', 'A cycle', 'A list'],
    why: 'No cycles and everything connected: that is a tree, and that is why there is a single path between two points.',
  },
  'algo-maze-gen': {
    forms: [
      {
        ask: [
          'You generate a maze with DFS: from a cell you go to a random unvisited neighbour, knock down the wall and, if none is left, you go back. What comes out?',
          'What does the "recursive backtracker" (DFS knocking down walls) generate?',
        ],
        right: ['A perfect maze, with long corridors', 'A tree that covers every cell'],
      },
    ],
    wrong: [
      'A maze with many cycles',
      'A maze with no solution',
      'Just a straight line',
      'A maze with isolated cells',
    ],
    why: 'It never enters an already visited cell (no cycles) and does not stop until all are visited (everything connected).',
  },
  'thr-race': {
    forms: [
      {
        ask: ['What is a data race?', 'When is there a data race?'],
        right: [
          'When two threads access a piece of data at once, at least one writes and nothing synchronises them',
        ],
        wrong: [
          'When one thread finishes before another',
          'When a thread uses a lot of CPU',
          'When two threads wait for each other forever',
          'When the program runs faster with threads',
        ],
      },
      {
        ask: [
          'Two threads touch the same variable at once, at least one writes and there is no mutex. What is that called?',
        ],
        right: ['Data race'],
        wrong: ['Deadlock', 'Starvation', 'Context switch'],
      },
    ],
    wrong: [
      'When one thread finishes before another',
      'When a thread uses a lot of CPU',
      'When the program runs faster with threads',
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
          'Unknown; usually less than 200000',
        ],
      },
    ],
    wrong: ['Always 200000', 'Always 100000', 'It does not compile', 'Always 0'],
    why: 'count++ is read, add and write: two threads can read the same value and one sum is lost.',
  },
  'thr-deadlock': {
    forms: [
      {
        ask: ['What is a deadlock?', 'When is there a deadlock?'],
        right: ['When several threads wait for each other and none can move on'],
        wrong: [
          'When a thread is very slow',
          'When two threads write at once',
          'When a thread ends too early',
        ],
      },
      {
        ask: [
          'Each thread waits for something another one has, and nobody lets go. What is that called?',
        ],
        right: ['Deadlock'],
        wrong: ['Data race', 'Starvation', 'Memory leak'],
      },
      {
        ask: [
          'Every philosopher takes the fork on their left first. What can happen?',
          'If each philosopher takes their left fork and waits for the right one, what can happen?',
        ],
        right: [
          'They all end up waiting forever',
          'Nobody gets the second fork or lets go of the first',
        ],
        wrong: ['They eat twice in a row', 'They all eat at once', 'Nothing: it is correct'],
      },
    ],
    wrong: [
      'When a thread is very slow',
      'When two threads write at once',
      'When a thread ends too early',
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
          'That threads run faster',
          'That threads start in order',
          'That memory can be shared between processes',
          'That time is measured correctly',
        ],
      },
      {
        ask: [
          'What happens if a thread calls `pthread_mutex_lock` twice in a row on the same normal mutex?',
          'What happens if a thread locks the same (non-recursive) mutex twice?',
        ],
        right: ['It blocks forever, waiting for itself'],
        wrong: [
          'Nothing: the second one is ignored',
          'It gets unlocked',
          'It gives an error and continues',
        ],
      },
    ],
    wrong: [
      'That threads run faster',
      'That threads start in order',
      'That time is measured correctly',
    ],
    why: 'lock waits for the lock to be free; if you already hold it, you wait for yourself.',
  },
  'thr-join-detach': {
    forms: [
      {
        ask: ['What does `pthread_join` do?', 'What is `pthread_join(th, NULL)` for?'],
        right: [
          'It waits for that thread to finish',
          'It waits for the thread and collects what it returns',
        ],
        wrong: [
          'It starts a new thread',
          'It merges two threads into one',
          'It locks a mutex',
          'It puts the thread to sleep',
        ],
      },
      {
        ask: ['What does `pthread_detach` do?', 'What changes when you detach a thread?'],
        right: [
          'Its resources are freed when it ends, without anyone waiting for it',
          'It can no longer be waited for with join',
        ],
        wrong: ['It is waited for until it ends', 'The thread is killed', 'The thread is paused'],
      },
    ],
    wrong: ['It starts a new thread', 'It merges two threads into one', 'It locks a mutex'],
    why: 'Every thread is collected with join or released with detach; otherwise its resources stay.',
  },
  'thr-usleep': {
    forms: [
      {
        ask: [
          'A philosopher dies if 410 ms pass without eating, and your monitor thread calls `usleep(500000)` between checks. What is wrong?',
          'Why is a monitor that sleeps half a second between checks no good?',
        ],
        right: [
          'It announces the death late: it has to check every few milliseconds',
          'It can warn up to 500 ms late, and the death must be announced within 10 ms',
        ],
      },
    ],
    wrong: [
      'Nothing: usleep is exact',
      'The philosopher dies too early',
      'usleep does not work in threads',
      'It blocks every philosopher',
    ],
    why: 'The death has to be announced almost at once; also, usleep can sleep longer than requested.',
  },
  'thr-print': {
    forms: [
      {
        ask: [
          'What is avoided by protecting the printf of the messages with a mutex?',
          'Without a mutex for writing, what can happen to the messages of several threads?',
        ],
        right: [
          'They get mixed or come out after a death is announced',
          'They interrupt each other or come out after the "died"',
        ],
      },
    ],
    wrong: [
      'printf stops working',
      'The program gets slower',
      'The compiler gives a warning',
      'More memory is used',
    ],
    why: 'A message after "died" is a failure; the same mutex also prevents mixed lines.',
  },
}
