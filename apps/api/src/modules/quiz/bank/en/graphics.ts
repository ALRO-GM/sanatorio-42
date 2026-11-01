/** Banco de Not-games en inglés: gráficos (`../graphics.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const GRAPHICS_EN: Readonly<Record<string, ConceptText>> = {
  'gfx-pixel-offset': {
    forms: [
      {
        ask: [
          'An image 800 px wide, 4 bytes per pixel and no padding. At which byte does the pixel (x = 10, y = 2) start?',
          'With line_length = 3200 and 4 bytes per pixel, at which byte does the pixel (10, 2) start?',
        ],
        right: ['6440'],
      },
    ],
    wrong: ['1610', '820', '6410', '3210', '2010'],
    why: 'You skip y whole rows (y · line_length) and then x pixels (x · bytes per pixel): 2 · 3200 + 10 · 4 = 6440.',
  },
  'gfx-color': {
    forms: [
      {
        ask: [
          'Which colour is 0x00FF0000 in ARGB format?',
          'In 0xAARRGGBB, which colour is 0x00FF0000?',
        ],
        right: ['Red'],
        wrong: ['Green', 'Blue', 'White', 'Black'],
      },
      {
        ask: [
          'Which colour is 0x0000FF00 in ARGB format?',
          'In 0xAARRGGBB, which colour is 0x0000FF00?',
        ],
        right: ['Green'],
        wrong: ['Red', 'Blue', 'White', 'Black'],
      },
    ],
    wrong: ['Blue', 'White', 'Black', 'Yellow'],
    why: 'Each channel takes one byte: AA RR GG BB. FF in the red one gives red; in the green one, green.',
  },
  'gfx-events': {
    forms: [
      {
        ask: ['What does `mlx_loop` do?', 'After calling mlx_loop, what does the program do?'],
        right: [
          'It waits for events and calls your hooks',
          'It enters the event loop and never returns',
        ],
        wrong: [
          'It draws everything pending on the window',
          'It opens a new window with its size',
          'It loads the images that were requested',
          'It closes the connection and ends the program',
        ],
      },
      {
        ask: [
          'Why do you have to handle the close-window event (the X button)?',
          "What happens if the window's close button is not handled?",
        ],
        right: [
          'The program does not end when you click it',
          'You do not exit cleanly when closing the window',
        ],
        wrong: [
          'The window moves around the screen by itself',
          'The window can no longer be resized',
          'The program gets slower when redrawing',
        ],
      },
    ],
    wrong: ['It draws everything pending on the window', 'It opens a new window with its size'],
    why: 'Graphical programs react to events; the event loop calls your hooks and you decide when to exit.',
  },
  'gfx-image-buffer': {
    forms: [
      {
        ask: [
          'Why do you draw on an image and put it all at once instead of using `mlx_pixel_put` pixel by pixel?',
          'What do you gain by drawing on an image and dumping it whole?',
        ],
        right: ['A lot of speed, and no visible flicker', 'One slow call instead of one per pixel'],
      },
    ],
    wrong: [
      'That you can use more colours at once',
      'That the window takes less memory',
      'That the pixels look sharper',
      'That only this way follows the 42 norm',
    ],
    why: 'Painting in memory and dumping it once avoids thousands of calls and the flicker of seeing the drawing half done.',
  },
  'gfx-flood-fill': {
    forms: [
      {
        ask: [
          'How do you check that every collectible and the exit of the map can be reached?',
          'What is usually used to know whether the map can be solved?',
        ],
        right: [
          'A flood fill from the player, checking what is missed',
          'A traversal from the player, such as a BFS',
        ],
      },
    ],
    wrong: [
      'Checking there is more floor than walls',
      'Checking the map is rectangular and closed',
      'Trying random moves for a while',
      'Checking there is one exit and one player',
    ],
    why: 'Filling from the player marks everything reachable; if something is missing, there is no solution.',
  },
  'gfx-isometric': {
    forms: [
      {
        ask: [
          'What is special about the isometric projection?',
          'How do the three axes look in an isometric projection?',
        ],
        right: [
          'Equally foreshortened and at 120° from each other',
          'At 120° and with the same scale',
        ],
        wrong: [
          'Things far away look smaller than near ones',
          'The map is only seen from straight above',
          'They meet at two vanishing points',
          'One of the three axes disappears',
        ],
      },
      {
        ask: ["What does Bresenham's algorithm do?", 'What is Bresenham for?'],
        right: [
          'It draws a line pixel by pixel, with integers only',
          'It draws straight lines with pixels without decimals',
        ],
        wrong: [
          'It fills the inside of a polygon with colour',
          'It rotates the map around its centre',
          'It works out the perspective of each point',
          'It smooths the edges of lines with greys',
        ],
      },
    ],
    wrong: [
      'Things far away look smaller than near ones',
      'The map is only seen from straight above',
    ],
    why: 'The isometric view has no perspective: same scale on the three axes. Bresenham decides which pixel to light at each step.',
  },
  'gfx-mandelbrot': {
    forms: [
      {
        ask: [
          'Which formula is repeated for the Mandelbrot set?',
          'What is iterated in Mandelbrot?',
        ],
        right: ['z = z² + c, starting with z = 0'],
        wrong: [
          'z = 2z + c, starting with z = 0',
          'z = z³ - 1, starting with z = c',
          'z = c² + z, starting with z = 1',
        ],
      },
      {
        ask: [
          'When do you consider that a point escapes (is not in the set)?',
          'When do you stop iterating a point?',
        ],
        right: ['When |z| goes over 2'],
        wrong: ['When |z| reaches 1', 'When z is negative', 'After 2 iterations'],
      },
    ],
    wrong: ['z = 2z + c', 'z = z³ - 1', 'z = c² + z'],
    why: 'If |z| goes over 2, it surely goes off to infinity. The number of iterations it takes gives the colour.',
  },
  'gfx-julia': {
    forms: [
      {
        ask: [
          'How is Julia different from Mandelbrot?',
          'Julia uses the same formula. What changes?',
        ],
        right: [
          'c is fixed and z starts at the screen point',
          'c stays put and the starting z is the pixel',
        ],
        wrong: [
          'It iterates z³ + c instead of z² + c',
          'It can only be drawn in black and white',
          'You cannot zoom into it: it has no detail',
          'It is the same Mandelbrot, rotated 90 degrees',
        ],
      },
      {
        ask: ['What is i²?', 'What is the imaginary unit squared?'],
        right: ['-1'],
        wrong: ['1', '0', '2'],
      },
    ],
    wrong: ['It iterates z³ + c instead of z² + c', 'It can only be drawn in black and white'],
    why: 'In Mandelbrot, c is the pixel and z starts at 0; in Julia, c is fixed and z starts at the pixel.',
  },
  'gfx-complex-square': {
    forms: [
      {
        ask: ['If z = a + bi, what is z²?', 'What is (a + bi)²?'],
        right: ['a² - b² + 2abi'],
      },
    ],
    wrong: ['a² + b² + 2abi', 'a² + b²i', 'a² - b²', '2a + 2bi'],
    why: '(a + bi)² = a² + 2abi + b²i², and since i² = -1 you get a² - b² + 2abi.',
  },
  'gfx-raycast': {
    forms: [
      {
        ask: [
          'In a raycaster like Wolfenstein 3D, how many rays are cast?',
          'How many rays does the raycaster cast to paint the screen?',
        ],
        right: ['One for each column of the screen', 'As many as pixels across'],
        wrong: [
          'One for each pixel of the screen',
          'One only, in the viewing direction',
          'One for each wall of the map',
          'One for each degree the player turns',
        ],
      },
      {
        ask: ['What is DDA for in cub3d?', 'What does the DDA algorithm find?'],
        right: ['The first wall each ray hits', 'The squares the ray crosses until a wall'],
        wrong: [
          'The ceiling colour for each direction',
          'Which floor texture goes on each row',
          'The position of the player in each frame',
        ],
      },
    ],
    wrong: ['One for each pixel of the screen', 'One for each wall of the map'],
    why: 'Each column is a ray; the distance to the wall it hits gives the height of that strip.',
  },
  'gfx-fisheye': {
    forms: [
      {
        ask: [
          'Your walls come out curved, like a fisheye. Why?',
          'A straight wall looks bulging in your raycaster. What are you doing wrong?',
        ],
        right: [
          'You use the real distance, not the perpendicular one',
          'You do not correct it with the cosine of the ray',
        ],
      },
    ],
    wrong: [
      'The wall texture has been loaded wrong',
      'The field of view is far too small',
      'You cast too few rays for the screen width',
      'The map is not fully closed by walls',
    ],
    why: 'The rays on the sides are longer even if the wall is just as far: you have to use the perpendicular distance.',
  },
  'gfx-map-closed': {
    forms: [
      {
        ask: [
          'Why do you have to check that the map is closed by walls?',
          'What can happen if the map has a gap on the edge?',
        ],
        right: [
          'A ray or the player gets out and reads past it',
          'Memory outside the map is read when leaving it',
        ],
      },
    ],
    wrong: [
      'The map looks less nice on the screen',
      'MiniLibX refuses to open the window',
      'The map takes longer to load from the file',
      'The move counter overflows',
    ],
    why: 'A gap lets a ray or the player get out of the map and read beyond what was allocated.',
  },
  'gfx-dot-product': {
    forms: [
      {
        ask: [
          'What is the dot product of two perpendicular vectors?',
          'Two vectors are at 90°. What is a · b?',
        ],
        right: ['0'],
        wrong: ['1', '-1', '90'],
      },
      {
        ask: [
          'What is (1, 2, 3) · (4, 5, 6)?',
          'What is the dot product of (1, 2, 3) and (4, 5, 6)?',
        ],
        right: ['32'],
        wrong: ['21', '15', '90', '6'],
      },
      {
        ask: ['If a · b = 0, how are the vectors a and b?'],
        right: ['Perpendicular'],
        wrong: ['Parallel', 'Of the same length', 'Opposite'],
      },
    ],
    wrong: ['1', '-1', '90'],
    why: 'a · b = |a| · |b| · cos θ: at 90° the cosine is 0. By components: 4 + 10 + 18 = 32.',
  },
  'gfx-normalize': {
    forms: [
      {
        ask: ['What is normalising a vector?', 'What do you do to a vector when you normalise it?'],
        right: [
          'Divide it by its length so that it measures 1',
          'Leave it with length 1 and the same direction',
        ],
        wrong: [
          'Make it perpendicular to what it was',
          'Make all its components positive',
          'Round its components to integers',
          'Turn it until it points at the camera',
        ],
      },
      {
        ask: ['How long is the vector (3, 4, 0)?', 'What is the length of (3, 4, 0)?'],
        right: ['5'],
        wrong: ['7', '12', '25'],
      },
    ],
    wrong: ['Make it perpendicular to what it was', 'Round its components to integers'],
    why: 'Length = √(x² + y² + z²); dividing by it keeps the direction with length 1.',
  },
  'gfx-ray-sphere': {
    forms: [
      {
        ask: [
          'Intersecting a ray with a sphere gives a quadratic equation. What does a negative discriminant mean?',
          'If b² - 4ac < 0 when crossing the ray with the sphere, what happens?',
        ],
        right: ['The ray does not touch the sphere', 'There is no hit: the ray goes past'],
        wrong: [
          'It touches it at a single point, grazing it',
          'The camera is inside the sphere',
          'The sphere is behind the camera',
          'It touches it at two different points',
        ],
      },
      {
        ask: [
          'There are two hits with the sphere, at t = -2 and at t = 5. Which one is seen?',
          'With solutions t = -2 and t = 5, which is the visible point?',
        ],
        right: ['The one at t = 5: the negative is behind'],
        wrong: [
          'The one at t = -2, because it is the closest',
          'Both, with their colours mixed',
          'Neither: a negative t cancels the hit',
        ],
      },
    ],
    wrong: ['The camera is inside the sphere', 'The sphere is behind the camera'],
    why: 'Without real roots there is no hit. Among the roots, the smallest positive one counts: negative ones are behind.',
  },
  'gfx-acne': {
    forms: [
      {
        ask: [
          'The surfaces come out full of little black dots (shadow acne). How is it fixed?',
          'The shadow ray hits the same object it starts from. How is it fixed?',
        ],
        right: [
          'Moving the ray origin out by an epsilon along the normal',
          'Shifting the starting point slightly outwards',
        ],
      },
    ],
    wrong: [
      'Raising the ambient light to hide the dots',
      'Removing lights until the dots go away',
      'Raising the resolution of the image',
      'Moving the camera away from the objects',
    ],
    why: 'With floats, the hit point can end up a hair below the surface: the shadow ray touches it again.',
  },
  'sl-ber': {
    forms: [
      {
        ask: [
          'What extension must the so_long map file have?',
          'so_long takes a map as an argument. With what extension?',
        ],
        right: ['.ber'],
        wrong: ['.map', '.cub', '.txt', '.fdf'],
      },
      {
        ask: ['What does the letter C stand for in a so_long map?', 'In a .ber, what is each C?'],
        right: ['A collectible'],
        wrong: ['The exit of the map', 'An empty floor', 'A patrolling enemy'],
      },
      {
        ask: [
          'In a so_long map, which letter marks where the player starts?',
          'Which letter sets the starting position in a .ber?',
        ],
        right: ['P'],
        wrong: ['S', 'E', 'J'],
      },
    ],
    wrong: ['0', '1'],
    why: 'The map is a .ber with 0 (floor), 1 (wall), C (collectible), E (exit) and P (starting position).',
  },
  'sl-rules': {
    forms: [
      {
        ask: [
          'How many exits (E) must a valid so_long map have?',
          'In a valid .ber, how many E must there be?',
        ],
        right: ['1'],
        wrong: ['0', '2', '4', '3'],
      },
      {
        ask: [
          'What shape must the so_long map have?',
          'What must the rows of a so_long map be like?',
        ],
        right: ['Rectangular: rows of equal length'],
        wrong: [
          'Any shape, if it is closed by walls',
          'Symmetric around its centre',
          'With more rows than columns',
        ],
      },
      {
        ask: [
          'In so_long, when can you leave through the E?',
          'What is needed to finish the game at the so_long exit?',
        ],
        right: ['Having picked up every collectible'],
        wrong: [
          'Nothing: reaching it is enough',
          'Having picked up at least half',
          'Having taken as many steps as cells',
        ],
      },
    ],
    wrong: ['The player starting next to the E'],
    why: 'A valid map is rectangular, closed, with one exit, one player and some collectibles; the exit only works once all are taken.',
  },
  'sl-moves': {
    forms: [
      {
        ask: [
          'In the mandatory part of so_long, where is the number of moves shown?',
          'Where does so_long (without bonus) ask you to print the move counter?',
        ],
        right: ['In the terminal, at every move'],
        wrong: [
          'In the window, above the map',
          'Only at the end, on reaching the exit',
          'In a log file when closing',
        ],
      },
      {
        ask: [
          'In so_long, which key must close the window and quit cleanly?',
          'Which key quits so_long, according to the subject?',
        ],
        right: ['ESC'],
        wrong: ['Q', 'Space', 'Enter'],
      },
      {
        ask: ['What is `mlx_hook` for?', 'What do you do with `mlx_hook(win, 17, 0, f, p)`?'],
        right: ['It ties one of your functions to a window event'],
        wrong: [
          'It draws a pixel at a position of the window',
          'It loads an XPM image and returns its pointer',
          'It opens the window with its size and title',
        ],
      },
    ],
    wrong: ['Nothing: it is not needed'],
    why: 'so_long prints the counter in the terminal at each step, ESC and the cross close cleanly, and mlx_hook ties your functions to those events.',
  },
  'fdf-map': {
    forms: [
      {
        ask: [
          'In a .fdf map, what does each number give?',
          'What is the value of each number in an FdF file?',
        ],
        right: ['The height of that point'],
        wrong: [
          'The colour of that point',
          'The order it is drawn in',
          'Its distance to the camera',
        ],
      },
      {
        ask: [
          'What does «10,0xFF0000» mean in an FdF map?',
          'A .fdf contains «10,0xFF0000». What is it?',
        ],
        right: ['Height 10 and colour red'],
        wrong: [
          'Height 10 and colour green',
          'Column 10 and colour red',
          'Height 10 and full opacity',
        ],
      },
      {
        ask: [
          'How many points does an FdF map of 10 rows with 12 numbers each have?',
          'A .fdf has 10 lines of 12 numbers. How many points must be drawn?',
        ],
        right: ['120'],
        wrong: ['22', '144', '100', '132'],
      },
    ],
    wrong: ['Its number of neighbours'],
    why: 'Each number is a point: its column gives x, its row gives y and its value the height; a colour can follow the comma.',
  },
  'fdf-rotate': {
    forms: [
      {
        ask: [
          'You rotate the point (1, 0) by 90° anticlockwise (y pointing up). Where does it end up?',
          'With y pointing up, where does (1, 0) go when rotated 90° anticlockwise?',
        ],
        right: ['(0, 1)'],
        wrong: ['(1, 0)', '(-1, 0)', '(0, -1)', '(1, 1)'],
      },
      {
        ask: [
          'Rotating (x, y) by an angle θ around the z axis, what is the new x?',
          'Which formula gives the x of a point (x, y) rotated by θ about the z axis?',
        ],
        right: ['x·cos θ − y·sin θ'],
        wrong: ['x·sin θ + y·cos θ', 'x·cos θ + y·sin θ', 'x·cos θ − y·cos θ'],
      },
    ],
    wrong: ['x + θ'],
    why: 'Rotating by θ around z gives x′ = x·cos θ − y·sin θ and y′ = x·sin θ + y·cos θ; at 90°, (1, 0) becomes (0, 1).',
  },
  'fdf-projection': {
    forms: [
      {
        ask: [
          'Which projection does the mandatory part of FdF ask for?',
          'In FdF without bonus, how must the map be projected?',
        ],
        right: ['Isometric'],
        wrong: ['Conic, with perspective', 'Parallel, seen from above', 'Cavalier'],
      },
      {
        ask: [
          'With a conic projection (with perspective), how do things further away look?',
          'In conic perspective, what happens to a point moving away from the camera?',
        ],
        right: ['Smaller'],
        wrong: ['Just as big', 'Bigger', 'Higher up'],
      },
    ],
    wrong: ['Darker'],
    why: 'The mandatory one is isometric, with no perspective; in the conic one you divide by depth and far things shrink.',
  },
  'fol-zoom': {
    forms: [
      {
        ask: [
          'To zoom towards the mouse, which point of the plane must stay still?',
          'When the zoom follows the mouse, which point does not move on screen?',
        ],
        right: ['The one under the cursor'],
        wrong: ['The centre of the window', 'The top left corner', 'The origin, 0 + 0i'],
      },
      {
        ask: [
          'You zoom in ×2 with the wheel. What happens to the width of the visible plane?',
          'After a ×2 zoom in, how does the visible piece of the plane change in width?',
        ],
        right: ['It is divided by 2'],
        wrong: ['It is multiplied by 2', 'It stays the same', 'It is divided by 4'],
      },
    ],
    wrong: ['It loses 2'],
    why: 'Zooming in ×2 shows half the width, and to follow the mouse you scale around the point under it.',
  },
  'fol-map': {
    forms: [
      {
        ask: [
          'The window is 800 px wide and shows the real part from -2 to 2. What real part does pixel x = 200 have?',
          'With 800 px of width for the real part from -2 to 2, what real value falls at x = 200?',
        ],
        right: ['-1'],
        wrong: ['-1.5', '0', '1', '0.5'],
      },
      {
        ask: [
          'Why is y usually flipped when going from pixel to complex number?',
          'When turning a pixel row into the imaginary part, why is it flipped?',
        ],
        right: ['On screen y goes down; on the plane, the imaginary part goes up'],
        wrong: [
          'Because MiniLibX draws the image upside down',
          'Because the imaginary part is always negative',
          'So that the fractal comes out rotated 90 degrees',
        ],
      },
    ],
    wrong: ['-2'],
    why: 're = min + x · (max − min) / width: -2 + 200 · 4 / 800 = -1; and rows grow downwards, unlike the imaginary axis.',
  },
  'fol-iter': {
    forms: [
      {
        ask: [
          'What happens when you raise the maximum number of iterations in fract-ol?',
          'If you go from 50 to 500 maximum iterations, what changes?',
        ],
        right: ['More detail on the edge, but slower'],
        wrong: [
          'More zoom, but fewer colours show',
          'The shape of the whole set changes',
          'It gets faster, since points escape sooner',
        ],
      },
      {
        ask: [
          'What is normally used to colour a point that escapes?',
          'In fract-ol, what does the colour of a pixel outside the set usually depend on?',
        ],
        right: ['On how many iterations it took to escape'],
        wrong: [
          'On its distance to the centre of the window',
          'On the sign of its imaginary part',
          'On whether its real part is positive or negative',
        ],
      },
    ],
    wrong: ['On the time it is drawn at'],
    why: 'More iterations tell apart what escapes late (more detail) at the cost of time; those iterations give the colour.',
  },
  'cub-file': {
    forms: [
      {
        ask: [
          'In a .cub file, what does the line «F 220,100,0» give?',
          'What is «F 220,100,0» in a cub3d scene?',
        ],
        right: ['The floor colour, in RGB'],
        wrong: [
          'The ceiling colour, in RGB',
          'The starting position of the player',
          'The size of the window in pixels',
        ],
      },
      {
        ask: [
          'What does «NO ./textures/north.xpm» give in a .cub?',
          'In a cub3d scene, what is the line starting with NO for?',
        ],
        right: ['The texture of the north face of walls'],
        wrong: [
          'The colour of the sky to the north',
          'The starting direction of the player',
          'The floor texture of the northern half',
        ],
      },
      {
        ask: [
          'In the cub3d map, which letter places the player facing west?',
          'Which character of a .cub map places the player looking west?',
        ],
        right: ['W'],
        wrong: ['O', 'WE', 'P'],
      },
      {
        ask: [
          'What must always come last in a .cub file?',
          'In a cub3d scene, which part goes at the end of the file?',
        ],
        right: ['The map'],
        wrong: ['The colours', 'The textures', 'The resolution'],
      },
    ],
    wrong: ['E'],
    why: 'A .cub holds the NO, SO, WE and EA textures, the F (floor) and C (ceiling) colours and, last, the map with N, S, E or W for the player.',
  },
  'cub-textures': {
    forms: [
      {
        ask: [
          'To pick the texture column, which value of the hit point is used?',
          'What decides which texture column to paint on a wall strip?',
        ],
        right: ['The decimal part of the coordinate along the wall'],
        wrong: [
          'The distance from the player to the hit point',
          'The number of the screen column',
          'The integer part of the square that is hit',
        ],
      },
      {
        ask: [
          'The texture is 64 px wide and the ray hits the wall at 0.25 from its edge. Which texture column do you use?',
          'With a 64 px texture and a hit at 0.25 from the edge of the wall, which column is it?',
        ],
        right: ['16'],
        wrong: ['25', '4', '32', '8'],
      },
      {
        ask: [
          'How do you know which texture (NO, SO, WE or EA) a hit gets?',
          'In cub3d, what decides whether a strip gets the north, south, east or west texture?',
        ],
        right: ['The side of the wall hit and where the ray goes'],
        wrong: [
          'The distance between the player and the wall',
          'The screen column being painted',
          'The square where the player started',
        ],
      },
    ],
    wrong: ['64'],
    why: 'The side hit (x or y) and the sign of the ray give the texture; the decimal part of the hit, times the texture width, gives the column.',
  },
  'cub-collision': {
    forms: [
      {
        ask: [
          'How do you usually stop the player from walking through walls in cub3d?',
          'In the cub3d collision bonus, what is done before moving the player?',
        ],
        right: ['Checking if the target square is a wall'],
        wrong: [
          'Lowering the speed near the walls',
          'Drawing the walls thicker',
          'Not letting the camera turn near them',
        ],
      },
      {
        ask: [
          'Why is it good to leave a margin when checking the target square?',
          'When checking collisions, why look a little beyond the target?',
        ],
        right: ['So you do not get so close the wall looks wrong'],
        wrong: [
          'So that the player moves faster',
          'To save rays in the corners',
          'Because the map starts counting at 1',
        ],
      },
    ],
    wrong: ['So that the map takes less memory'],
    why: 'Before moving, you check the square the player would reach, with a small margin so the camera does not end up against the wall.',
  },
  'rt-file': {
    forms: [
      {
        ask: [
          'In a .rt file, what is the line «A 0.2 255,255,255»?',
          'What does «A 0.2 255,255,255» declare in a miniRT scene?',
        ],
        right: ['The ambient light, with ratio 0.2, white'],
        wrong: [
          'A point light at the origin, white in colour',
          'The camera, with 0.2 of zoom and white background',
          'A plane at 0.2 from the camera, white in colour',
        ],
      },
      {
        ask: [
          'How many cameras (C) can be declared in a .rt?',
          'In a miniRT scene, how many times can the capital C appear?',
        ],
        right: ['1'],
        wrong: ['0', '2', '4', '8'],
      },
      {
        ask: [
          'What does «sp 0,0,20.6 12.6 10,0,255» declare in a .rt?',
          'In miniRT, what is the line «sp 0,0,20.6 12.6 10,0,255»?',
        ],
        right: ['A sphere at (0, 0, 20.6) with diameter 12.6'],
        wrong: [
          'A sphere at (0, 0, 20.6) with radius 12.6',
          'A spot at (0, 0, 20.6) with brightness 12.6',
          'A plane through (0, 0, 20.6) with normal 12.6',
        ],
      },
    ],
    wrong: ['A cylinder with no height'],
    why: 'Capitals (A, C, L) appear only once: A is the ambient light (ratio and colour) and sp takes centre, diameter and colour.',
  },
  'rt-light': {
    forms: [
      {
        ask: [
          'Which lights does the mandatory part of miniRT ask for?',
          'Without bonus, which parts of the Phong model must be done in miniRT?',
        ],
        right: ['Ambient and diffuse'],
        wrong: ['Diffuse and specular', 'Ambient and specular', 'Specular only'],
      },
      {
        ask: [
          'In diffuse lighting, what does the brightness of a point depend on?',
          'What decides how much diffuse light a point of a surface gets?',
        ],
        right: ['The angle between the normal and the light'],
        wrong: [
          'The distance from the point to the camera',
          'The angle between the normal and the camera',
          'The background colour of the scene',
        ],
      },
      {
        ask: [
          'If the normal and the direction to the light are at 90°, how much diffuse light does the point get?',
          'With grazing light, at 90° from the normal, what diffuse intensity comes out?',
        ],
        right: ['0'],
        wrong: ['1', '0.5', '90'],
      },
    ],
    wrong: ['The size of the object'],
    why: 'Diffuse light is proportional to n · l, the cosine between the normal and the direction to the light: at 90° it is 0.',
  },
  'rt-camera': {
    forms: [
      {
        ask: [
          'In «C -50,0,20 0,0,1 70», what is the 70?',
          'In the camera line of a .rt, what does the last number give?',
        ],
        right: ['The horizontal field of view, in degrees'],
        wrong: [
          'The distance from the camera to the origin',
          'The zoom of the camera, as a percentage',
          'The vertical field of view, in radians',
        ],
      },
      {
        ask: [
          'What must the camera orientation vector meet in a .rt?',
          'In «C -50,0,20 0,0,1 70», what must the vector 0,0,1 be like?',
        ],
        right: ['Normalised, with each axis between -1 and 1'],
        wrong: [
          'Always pointing at the origin of the scene',
          'With all its components positive',
          'As long as the field of view',
        ],
      },
      {
        ask: [
          'With a FOV of 90°, what is tan(FOV / 2)?',
          'With a 90° field of view, what is the tangent of half the angle?',
        ],
        right: ['1'],
        wrong: ['0.5', '2', '45'],
      },
    ],
    wrong: ['In degrees'],
    why: 'The camera takes a position, a normalised orientation and the horizontal FOV in degrees; half the plane measures tan(FOV / 2).',
  },
}
