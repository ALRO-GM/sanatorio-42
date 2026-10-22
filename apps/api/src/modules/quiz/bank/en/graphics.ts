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
          'It waits for events and calls your functions (hooks)',
          'It enters the event loop and does not come back',
        ],
        wrong: [
          'It draws a pixel',
          'It opens a window',
          'It loads an image',
          'It ends the program',
        ],
      },
      {
        ask: [
          'Why do you have to handle the close-window event (the cross)?',
          'What happens if the window cross is not handled?',
        ],
        right: [
          'The program does not end when you click it',
          'You do not exit cleanly when closing the window',
        ],
        wrong: ['The window moves by itself', 'It cannot be resized', 'The program runs slower'],
      },
    ],
    wrong: ['It draws a pixel', 'It opens a window', 'It loads an image'],
    why: 'Graphical programs react to events; the event loop calls your hooks and you decide when to exit.',
  },
  'gfx-image-buffer': {
    forms: [
      {
        ask: [
          'Why do you draw on an image and put it all at once instead of using `mlx_pixel_put` pixel by pixel?',
          'What do you gain by drawing on an image and dumping it whole?',
        ],
        right: [
          'A huge amount of speed, and no visible flicker',
          'Each pixel is not a slow call: everything is painted at once',
        ],
      },
    ],
    wrong: [
      'That you can use colours',
      'That it uses less memory',
      'That it looks more pixelated',
      'That it follows the norm',
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
          'A flood fill from the player, and seeing what is left untouched',
          'A traversal from the player, such as BFS or flood fill',
        ],
      },
    ],
    wrong: [
      'Counting the walls',
      'Checking that the map is rectangular',
      'Trying random moves',
      'Checking that there is only one exit',
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
          'Far things look smaller',
          'It is only seen from above',
          'With two vanishing points',
          'One of them disappears',
        ],
      },
      {
        ask: ["What does Bresenham's algorithm do?", 'What is Bresenham for?'],
        right: [
          'It draws a line between two points pixel by pixel, with integers only',
          'It draws straight lines with pixels without using decimals',
        ],
        wrong: ['It fills polygons', 'It rotates the map', 'It works out the perspective'],
      },
    ],
    wrong: ['Far things look smaller', 'It is only seen from above', 'With two vanishing points'],
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
          'When is a point taken to escape (not to be in the set)?',
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
          'c is fixed and the screen point is the starting z',
          'What is fixed: c does not change and z starts at the pixel',
        ],
        wrong: [
          'It uses z³ instead of z²',
          'It is only seen in black and white',
          'You cannot zoom into it',
          'It is Mandelbrot rotated',
        ],
      },
      {
        ask: ['What is i²?', 'What is the imaginary unit squared?'],
        right: ['-1'],
        wrong: ['1', '0', '2'],
      },
    ],
    wrong: [
      'It uses z³ instead of z²',
      'It is only seen in black and white',
      'It is Mandelbrot rotated',
    ],
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
          'Only one',
          'One for each wall of the map',
          "One for each of the player's directions",
        ],
      },
      {
        ask: ['What is DDA for in cub3d?', 'What does the DDA algorithm find?'],
        right: [
          'The first wall the ray hits, square by square',
          'Which squares the ray goes through until it hits a wall',
        ],
        wrong: ['The colour of the sky', 'The texture of the floor', 'The position of the player'],
      },
    ],
    wrong: ['One for each pixel of the screen', 'Only one', 'One for each wall of the map'],
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
          'You use the real distance to the point, not the perpendicular one to the camera plane',
          'You do not correct the distance with the cosine of the ray angle',
        ],
      },
    ],
    wrong: [
      'The texture is loaded wrong',
      'The field of view is small',
      'Rays are missing',
      'The map is not closed',
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
          'The player or the rays get out and memory is read outside the map',
          'Something escapes the map and the program reads where it should not',
        ],
      },
    ],
    wrong: [
      'It looks less nice',
      'MiniLibX refuses to open it',
      'It loads more slowly',
      'There is no exit',
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
        wrong: ['Parallel', 'Equal', 'Opposite'],
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
          'Make it perpendicular',
          'Make its components positive',
          'Round its components',
          'Turn it towards the camera',
        ],
      },
      {
        ask: ['How long is the vector (3, 4, 0)?', 'What is the length of (3, 4, 0)?'],
        right: ['5'],
        wrong: ['7', '12', '25'],
      },
    ],
    wrong: ['Make it perpendicular', 'Make its components positive', 'Round its components'],
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
          'It touches it at a single point',
          'The camera is inside',
          'The sphere is behind',
          'It touches it at two points',
        ],
      },
      {
        ask: [
          'There are two hits with the sphere, at t = -2 and at t = 5. Which one is seen?',
          'With solutions t = -2 and t = 5, which is the visible point?',
        ],
        right: ['The one at t = 5: the one with negative t is behind the camera'],
        wrong: ['The one at t = -2, because it is the smallest', 'Both, mixed', 'Neither of them'],
      },
    ],
    wrong: ['It touches it at a single point', 'The camera is inside', 'The sphere is behind'],
    why: 'Without real roots there is no hit. Among the roots, the smallest positive one counts: negative ones are behind.',
  },
  'gfx-acne': {
    forms: [
      {
        ask: [
          'The surfaces come out full of little black dots (shadow acne). What is wrong?',
          'The shadow ray hits the same object it starts from. How is it fixed?',
        ],
        right: [
          'You have to move the origin of the shadow ray a little (epsilon) away from the surface',
          'You have to move the origin of the shadow ray a little along the normal',
        ],
      },
    ],
    wrong: [
      'There is no ambient light',
      'There are too many lights',
      'The resolution is low',
      'The camera is badly placed',
    ],
    why: 'With floats, the hit point can end up a hair below the surface: the shadow ray touches it again.',
  },
}
