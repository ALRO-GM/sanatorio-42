/** Repaso de Not-games en inglés: traducción de `../review-core-algo.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_CORE_ALGO_EN: Readonly<Record<string, ReviewEntry>> = {
  'ps-ops': {
    title: 'The push_swap operations',
    definition:
      'sa/sb swap the top two; pa/pb move the top of one stack onto the other; ra/rb rotate up (the top goes to the bottom) and rra/rrb down. ss, rr and rrr do the same on a and b at once. Without enough elements, they do nothing.',
    example: 'a = 2 1 3 → sa → 1 2 3; with b empty, pa does nothing.',
  },
  'ps-sequence': {
    title: 'Following a sequence of operations',
    definition:
      'They apply one at a time, in order, always looking at the top. The easiest way is to write down both stacks after each step.',
    example: 'a = 3 1 2, b empty → sa → a = 1 3 2 → pb → a = 3 2, b = 1.',
  },
  'ps-limits': {
    title: 'How many operations push_swap accepts',
    definition:
      'The evaluation measures the length of the list: for the top grade, 100 random numbers in fewer than 700 operations and 500 numbers in at most 5500. Above that, the grade drops in steps.',
    example: '100 numbers in 650 operations: top grade on that test; in 1200, not.',
  },
  'ps-errors': {
    title: 'Errors and arguments in push_swap',
    definition:
      'If an argument is not an integer, does not fit in an int or is repeated, push_swap prints «Error» and a newline on standard error (fd 2). With no arguments it prints nothing.',
    example: './push_swap 1 2 2 → «Error» on stderr; ./push_swap → nothing.',
  },
  'ps-output': {
    title: 'What push_swap prints',
    definition:
      'The list of instructions, one per line on standard output, so that checker (or another program) can read it. If the numbers are already sorted, the shortest list is empty.',
    example: './push_swap 2 1 3 → «sa»; ./push_swap 1 2 3 → nothing.',
  },
  'ps-checker': {
    title: 'The bonus checker',
    definition:
      'checker takes the numbers as arguments and reads the instructions on standard input, one per line. It applies them and prints OK if a ends up sorted and b empty, KO otherwise, and «Error» on stderr if something is invalid.',
    example: './push_swap 3 2 1 | ./checker 3 2 1 → OK.',
  },
  'philo-args': {
    title: 'The arguments of philo',
    definition:
      'philo takes number_of_philosophers, time_to_die, time_to_eat and time_to_sleep, with times in milliseconds, plus an optional fifth argument: number_of_times_each_philosopher_must_eat.',
    example: './philo 5 800 200 200 → 5 philosophers who die after 800 ms without eating.',
  },
  'philo-must-eat': {
    title: 'When the simulation stops',
    definition:
      'It stops when a philosopher dies. If number_of_times_each_philosopher_must_eat is given, it also stops when all have eaten at least that many times.',
    example: './philo 5 800 200 200 7 → stops when all five have eaten 7 times or one dies.',
  },
  'philo-one': {
    title: 'A single philosopher',
    definition:
      'There are as many forks as philosophers. A lone one has one fork and needs two to eat: he takes it, waits and dies at time_to_die. The program must not hang waiting for the second one.',
    example: './philo 1 800 200 200 → «0 1 has taken a fork» and «800 1 died».',
  },
  'philo-bonus': {
    title: 'The philosophers bonus',
    definition:
      'Each philosopher is a process (not a thread) and the forks are all in the middle of the table: a semaphore counts how many are free. The main process is not a philosopher.',
    example: 'sem_open with value N; each philosopher does sem_wait twice to eat.',
  },
  'sl-ber': {
    title: 'The so_long .ber map',
    definition:
      'The map is a .ber file made of five characters: 0 (floor), 1 (wall), C (collectible), E (exit) and P (player starting position).',
    example: '11111\n1P0C1\n100E1\n11111',
  },
  'sl-rules': {
    title: 'When a so_long map is valid',
    definition:
      'Rectangular, closed by walls, with one exit, one player and at least one collectible, and with a valid path. You only finish at the exit after picking up every collectible.',
    example: 'A map with two E or a shorter row gives «Error» and a message.',
  },
  'sl-moves': {
    title: 'Moves, keys and events in so_long',
    definition:
      'At every move the number of moves made is printed in the terminal. ESC and the window cross close cleanly; mlx_hook ties your functions to those events.',
    example: 'mlx_hook(win, 17, 0, close_game, &game) for the cross.',
  },
  'fdf-map': {
    title: 'The FdF map',
    definition:
      'Each number of the .fdf is a point: its column gives x, its row gives y and its value the height. It can carry a colour after a comma.',
    example: '0 0 10,0xFF0000 → three points; the third at height 10 and in red.',
  },
  'fdf-rotate': {
    title: 'Rotating points',
    definition:
      'Rotating (x, y) by θ around z gives x′ = x·cos θ − y·sin θ and y′ = x·sin θ + y·cos θ; z does not change. For the other axes it is the same with the other two coordinates.',
    example: '(1, 0) rotated 90° → (0, 1).',
  },
  'fdf-projection': {
    title: 'Projections in FdF',
    definition:
      'The mandatory part asks for isometric, with no perspective: same scale on the three axes. The bonus can add another one, such as parallel or conic, where far things look smaller.',
    example: 'Isometric: x′ = (x − y) · cos 30°, y′ = (x + y) · sin 30° − z.',
  },
  'fol-zoom': {
    title: 'Zooming towards the mouse',
    definition:
      'Zooming is scaling the visible piece of the plane: ×2 in leaves half the width. To follow the mouse, you scale around the point under the cursor, which does not move.',
    example: 'min = mouse + (min − mouse) / 2, and the same with max.',
  },
  'fol-map': {
    title: 'From pixel to complex number',
    definition:
      'Each pixel is taken to the plane with a rule of three: re = min + x · (max − min) / width. For the imaginary part the row is flipped, because on screen y grows downwards.',
    example: '800 px for -2..2: pixel 200 is -1 and pixel 400 is 0.',
  },
  'fol-iter': {
    title: 'Iterations and colour',
    definition:
      'You iterate until the point escapes or the maximum is reached. A higher maximum gives more detail on the edge and takes longer; the number of iterations it takes to escape decides the colour.',
    example: 'Escapes at iteration 12 of 100 → colour 12 of the palette.',
  },
  'cub-file': {
    title: 'The .cub file',
    definition:
      'It holds the textures of each face (NO, SO, WE, EA), the floor (F) and ceiling (C) colours in RGB and, last, the map, where N, S, E or W place the player facing that way.',
    example: 'NO ./north.xpm\nF 220,100,0\nC 225,30,0\n111\n1N1\n111',
  },
  'cub-textures': {
    title: 'Textures in a raycaster',
    definition:
      'The side of the wall the ray hits (and where it is going) picks the texture. The decimal part of the hit point along the wall, times the texture width, gives the column to paint.',
    example: 'Hit at x = 3.25 with a 64 px texture → column 16.',
  },
  'cub-collision': {
    title: 'Collisions in cub3d',
    definition:
      'Before moving the player you check whether the target square is a wall, and leave a small margin so that the camera does not stick to the wall.',
    example: 'If map[(int)(y + dy)][(int)(x + dx)] == 1, you do not move.',
  },
  'rt-file': {
    title: 'The .rt file',
    definition:
      'Each line is an element: A (ambient light), C (camera) and L (light) appear only once; sp, pl and cy are spheres, planes and cylinders. The sphere takes centre, diameter and colour.',
    example: 'A 0.2 255,255,255\nC -50,0,20 0,0,1 70\nsp 0,0,20.6 12.6 10,0,255',
  },
  'rt-light': {
    title: 'Ambient and diffuse light',
    definition:
      'The mandatory part asks for ambient (the same everywhere) and diffuse (Lambert): brightness is proportional to the cosine between the normal and the direction to the light, and is 0 at 90° or more.',
    example: 'n · l = 0.5 → half the light of the spot, plus the ambient.',
  },
  'rt-camera': {
    title: 'The miniRT camera',
    definition:
      'The camera takes a position, a normalised orientation vector (each axis between -1 and 1) and the horizontal field of view in degrees. At distance 1, half the camera plane measures tan(FOV / 2).',
    example: 'C 0,0,0 0,0,1 90 → looks towards +z and the plane goes from -1 to 1.',
  },
}
