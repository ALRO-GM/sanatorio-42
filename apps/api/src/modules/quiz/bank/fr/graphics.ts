/** Banco de Not-games en francés: gráficos (`../graphics.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const GRAPHICS_FR: Readonly<Record<string, ConceptText>> = {
  'gfx-pixel-offset': {
    forms: [
      {
        ask: [
          'Une image de 800 px de large, 4 octets par pixel et sans padding. À quel octet commence le pixel (x = 10, y = 2) ?',
          'Avec line_length = 3200 et 4 octets par pixel, à quel octet commence le pixel (10, 2) ?',
        ],
        right: ['6440'],
      },
    ],
    wrong: ['1610', '820', '6410', '3210', '2010'],
    why: 'Tu sautes y lignes entières (y · line_length) puis x pixels (x · octets par pixel) : 2 · 3200 + 10 · 4 = 6440.',
  },
  'gfx-color': {
    forms: [
      {
        ask: [
          'Quelle couleur est 0x00FF0000 au format ARGB ?',
          'En 0xAARRGGBB, quelle couleur est 0x00FF0000 ?',
        ],
        right: ['Rouge'],
        wrong: ['Vert', 'Bleu', 'Blanc', 'Noir'],
      },
      {
        ask: [
          'Quelle couleur est 0x0000FF00 au format ARGB ?',
          'En 0xAARRGGBB, quelle couleur est 0x0000FF00 ?',
        ],
        right: ['Vert'],
        wrong: ['Rouge', 'Bleu', 'Blanc', 'Noir'],
      },
    ],
    wrong: ['Bleu', 'Blanc', 'Noir', 'Jaune'],
    why: 'Chaque canal occupe un octet : AA RR GG BB. FF dans celui du rouge donne du rouge ; dans celui du vert, du vert.',
  },
  'gfx-events': {
    forms: [
      {
        ask: ['Que fait `mlx_loop` ?', "Après l'appel à mlx_loop, que fait le programme ?"],
        right: [
          'Il attend des événements et appelle tes fonctions (hooks)',
          "Il entre dans la boucle d'événements et n'en revient pas",
        ],
        wrong: [
          'Il dessine un pixel',
          'Il ouvre une fenêtre',
          'Il charge une image',
          'Il termine le programme',
        ],
      },
      {
        ask: [
          "Pourquoi faut-il gérer l'événement de fermeture de la fenêtre (la croix) ?",
          "Que se passe-t-il si la croix de la fenêtre n'est pas gérée ?",
        ],
        right: [
          'Le programme ne se termine pas quand tu cliques dessus',
          'Tu ne quittes pas proprement en fermant la fenêtre',
        ],
        wrong: [
          'La fenêtre bouge toute seule',
          'On ne peut pas la redimensionner',
          'Le programme tourne plus lentement',
        ],
      },
    ],
    wrong: ['Il dessine un pixel', 'Il ouvre une fenêtre', 'Il charge une image'],
    why: "Les programmes graphiques réagissent à des événements ; la boucle d'événements appelle tes hooks et c'est toi qui décides quand quitter.",
  },
  'gfx-image-buffer': {
    forms: [
      {
        ask: [
          "Pourquoi dessiner dans une image et l'afficher d'un coup plutôt que d'utiliser `mlx_pixel_put` pixel par pixel ?",
          "Que gagnes-tu à dessiner dans une image et à l'afficher en entier ?",
        ],
        right: [
          'Énormément de vitesse, et aucun scintillement visible',
          "Chaque pixel n'est plus un appel lent : tout est peint en une fois",
        ],
      },
    ],
    wrong: [
      'On peut utiliser des couleurs',
      'Ça utilise moins de mémoire',
      'Le rendu est plus pixelisé',
      'Ça respecte la norme',
    ],
    why: "Peindre en mémoire et afficher en une fois évite des milliers d'appels et le scintillement d'un dessin à moitié fait.",
  },
  'gfx-flood-fill': {
    forms: [
      {
        ask: [
          'Comment vérifies-tu que tous les collectibles et la sortie de la carte sont accessibles ?',
          "Qu'utilise-t-on en général pour savoir si la carte a une solution ?",
        ],
        right: [
          "Un flood fill depuis le joueur, puis regarder ce qui n'a pas été atteint",
          'Un parcours depuis le joueur, comme un BFS ou un flood fill',
        ],
      },
    ],
    wrong: [
      'Compter les murs',
      'Vérifier que la carte est rectangulaire',
      'Essayer des déplacements au hasard',
      "Vérifier qu'il n'y a qu'une seule sortie",
    ],
    why: "En remplissant depuis le joueur, tu marques tout ce qui est accessible ; s'il manque quelque chose, il n'y a pas de solution.",
  },
  'gfx-isometric': {
    forms: [
      {
        ask: [
          "Qu'a de particulier la projection isométrique ?",
          'Comment apparaissent les trois axes dans une projection isométrique ?',
        ],
        right: [
          'Raccourcis de la même façon et à 120° les uns des autres',
          'À 120° et à la même échelle',
        ],
        wrong: [
          'Ce qui est loin paraît plus petit',
          'On ne la voit que de dessus',
          'Avec deux points de fuite',
          "L'un d'eux disparaît",
        ],
      },
      {
        ask: ["Que fait l'algorithme de Bresenham ?", 'À quoi sert Bresenham ?'],
        right: [
          'Il trace une ligne entre deux points pixel par pixel, uniquement avec des entiers',
          'Il trace des droites en pixels sans utiliser de décimales',
        ],
        wrong: [
          'Il remplit des polygones',
          'Il fait tourner la carte',
          'Il calcule la perspective',
        ],
      },
    ],
    wrong: [
      'Ce qui est loin paraît plus petit',
      'On ne la voit que de dessus',
      'Avec deux points de fuite',
    ],
    why: "La vue isométrique n'a pas de perspective : même échelle sur les trois axes. Bresenham décide quel pixel allumer à chaque pas.",
  },
  'gfx-mandelbrot': {
    forms: [
      {
        ask: [
          "Quelle formule répète-t-on pour l'ensemble de Mandelbrot ?",
          "Qu'est-ce qu'on itère dans Mandelbrot ?",
        ],
        right: ['z = z² + c, en partant de z = 0'],
        wrong: [
          'z = 2z + c, en partant de z = 0',
          'z = z³ - 1, en partant de z = c',
          'z = c² + z, en partant de z = 1',
        ],
      },
      {
        ask: [
          "Quand considère-t-on qu'un point s'échappe (qu'il n'est pas dans l'ensemble) ?",
          "Quand arrêtes-tu d'itérer sur un point ?",
        ],
        right: ['Quand |z| dépasse 2'],
        wrong: ['Quand |z| atteint 1', 'Quand z est négatif', 'Après 2 itérations'],
      },
    ],
    wrong: ['z = 2z + c', 'z = z³ - 1', 'z = c² + z'],
    why: "Si |z| dépasse 2, il part forcément à l'infini. Le nombre d'itérations que ça prend donne la couleur.",
  },
  'gfx-julia': {
    forms: [
      {
        ask: [
          'En quoi Julia est-il différent de Mandelbrot ?',
          "Julia utilise la même formule. Qu'est-ce qui change ?",
        ],
        right: [
          "c est fixe et le point de l'écran est le z de départ",
          'c ne bouge pas et z part du pixel',
        ],
        wrong: [
          'Il utilise z³ au lieu de z²',
          "Il ne se voit qu'en noir et blanc",
          'On ne peut pas zoomer dedans',
          "C'est Mandelbrot tourné",
        ],
      },
      {
        ask: ['Combien vaut i² ?', "Combien vaut l'unité imaginaire au carré ?"],
        right: ['-1'],
        wrong: ['1', '0', '2'],
      },
    ],
    wrong: [
      'Il utilise z³ au lieu de z²',
      "Il ne se voit qu'en noir et blanc",
      "C'est Mandelbrot tourné",
    ],
    why: 'Dans Mandelbrot, c est le pixel et z part de 0 ; dans Julia, c est fixe et z part du pixel.',
  },
  'gfx-complex-square': {
    forms: [
      {
        ask: ['Si z = a + bi, combien vaut z² ?', 'Combien vaut (a + bi)² ?'],
        right: ['a² - b² + 2abi'],
      },
    ],
    wrong: ['a² + b² + 2abi', 'a² + b²i', 'a² - b²', '2a + 2bi'],
    why: '(a + bi)² = a² + 2abi + b²i², et comme i² = -1, il reste a² - b² + 2abi.',
  },
  'gfx-raycast': {
    forms: [
      {
        ask: [
          'Dans un raycaster comme Wolfenstein 3D, combien de rayons lance-t-on ?',
          "Combien de rayons le raycaster lance-t-il pour peindre l'écran ?",
        ],
        right: ["Un par colonne de l'écran", 'Autant que de pixels en largeur'],
        wrong: [
          "Un par pixel de l'écran",
          'Un seul',
          'Un par mur de la carte',
          'Un par direction du joueur',
        ],
      },
      {
        ask: ['À quoi sert le DDA dans cub3d ?', "Que trouve l'algorithme DDA ?"],
        right: [
          'Le premier mur que touche le rayon, case par case',
          "Les cases que traverse le rayon jusqu'à toucher un mur",
        ],
        wrong: ['La couleur du ciel', 'La texture du sol', 'La position du joueur'],
      },
    ],
    wrong: ["Un par pixel de l'écran", 'Un seul', 'Un par mur de la carte'],
    why: "Chaque colonne est un rayon ; la distance jusqu'au mur touché donne la hauteur de cette bande.",
  },
  'gfx-fisheye': {
    forms: [
      {
        ask: [
          'Tes murs sont courbés, comme avec un fish-eye. Pourquoi ?',
          "Un mur droit paraît bombé dans ton raycaster. Qu'est-ce que tu fais de travers ?",
        ],
        right: [
          "Tu utilises la distance réelle jusqu'au point, pas la distance perpendiculaire au plan de la caméra",
          "Tu ne corriges pas la distance avec le cosinus de l'angle du rayon",
        ],
      },
    ],
    wrong: [
      'La texture est mal chargée',
      'Le champ de vision est petit',
      'Il manque des rayons',
      "La carte n'est pas fermée",
    ],
    why: 'Les rayons sur les côtés sont plus longs même si le mur est à la même distance : il faut utiliser la distance perpendiculaire.',
  },
  'gfx-map-closed': {
    forms: [
      {
        ask: [
          'Pourquoi faut-il vérifier que la carte est fermée par des murs ?',
          'Que peut-il se passer si la carte a un trou sur le bord ?',
        ],
        right: [
          'Le joueur ou les rayons sortent et on lit la mémoire en dehors de la carte',
          "Quelque chose s'échappe de la carte et le programme lit là où il ne devrait pas",
        ],
      },
    ],
    wrong: [
      "C'est moins joli",
      "La MiniLibX refuse de l'ouvrir",
      'Elle se charge plus lentement',
      "Il n'y a pas de sortie",
    ],
    why: 'Un trou laisse un rayon ou le joueur sortir de la carte et lire au-delà de ce qui a été alloué.',
  },
  'gfx-dot-product': {
    forms: [
      {
        ask: [
          'Combien vaut le produit scalaire de deux vecteurs perpendiculaires ?',
          'Deux vecteurs forment un angle de 90°. Combien vaut a · b ?',
        ],
        right: ['0'],
        wrong: ['1', '-1', '90'],
      },
      {
        ask: [
          'Combien vaut (1, 2, 3) · (4, 5, 6) ?',
          'Quel est le produit scalaire de (1, 2, 3) et (4, 5, 6) ?',
        ],
        right: ['32'],
        wrong: ['21', '15', '90', '6'],
      },
      {
        ask: ['Si a · b = 0, comment sont les vecteurs a et b ?'],
        right: ['Perpendiculaires'],
        wrong: ['Parallèles', 'Égaux', 'Opposés'],
      },
    ],
    wrong: ['1', '-1', '90'],
    why: 'a · b = |a| · |b| · cos θ : à 90°, le cosinus vaut 0. Par composantes : 4 + 10 + 18 = 32.',
  },
  'gfx-normalize': {
    forms: [
      {
        ask: [
          'Que veut dire normaliser un vecteur ?',
          'Que fais-tu à un vecteur quand tu le normalises ?',
        ],
        right: [
          "Le diviser par sa longueur pour qu'il mesure 1",
          'Lui donner une longueur de 1 en gardant sa direction',
        ],
        wrong: [
          'Le rendre perpendiculaire',
          'Rendre ses composantes positives',
          'Arrondir ses composantes',
          'Le tourner vers la caméra',
        ],
      },
      {
        ask: ['Quelle est la longueur du vecteur (3, 4, 0) ?', 'Combien mesure (3, 4, 0) ?'],
        right: ['5'],
        wrong: ['7', '12', '25'],
      },
    ],
    wrong: [
      'Le rendre perpendiculaire',
      'Rendre ses composantes positives',
      'Arrondir ses composantes',
    ],
    why: 'Longueur = √(x² + y² + z²) ; en divisant par elle, il reste la direction avec une longueur de 1.',
  },
  'gfx-ray-sphere': {
    forms: [
      {
        ask: [
          "L'intersection d'un rayon et d'une sphère donne une équation du second degré. Que signifie un discriminant négatif ?",
          "Si b² - 4ac < 0 quand tu calcules l'intersection du rayon et de la sphère, que se passe-t-il ?",
        ],
        right: [
          'Le rayon ne touche pas la sphère',
          "Il n'y a pas d'intersection : le rayon passe à côté",
        ],
        wrong: [
          'Il la touche en un seul point',
          "La caméra est à l'intérieur",
          'La sphère est derrière',
          'Il la touche en deux points',
        ],
      },
      {
        ask: [
          'Il y a deux intersections avec la sphère, en t = -2 et en t = 5. Laquelle voit-on ?',
          'Avec les solutions t = -2 et t = 5, quelle intersection est visible ?',
        ],
        right: ['Celle en t = 5 : celle avec t négatif est derrière la caméra'],
        wrong: [
          "Celle en t = -2, parce que c'est la plus petite",
          'Les deux, mélangées',
          'Aucune des deux',
        ],
      },
    ],
    wrong: [
      'Il la touche en un seul point',
      "La caméra est à l'intérieur",
      'La sphère est derrière',
    ],
    why: "Sans racine réelle, pas d'intersection. Parmi les racines, c'est la plus petite positive qui compte : les négatives sont derrière.",
  },
  'gfx-acne': {
    forms: [
      {
        ask: [
          "Les surfaces sont couvertes de petits points noirs (shadow acne). Qu'est-ce qui ne va pas ?",
          "Le rayon d'ombre touche l'objet même dont il part. Comment corriger ça ?",
        ],
        right: [
          "Il faut éloigner un peu (epsilon) l'origine du rayon d'ombre de la surface",
          "Il faut décaler un peu l'origine du rayon d'ombre le long de la normale",
        ],
      },
    ],
    wrong: [
      'Il manque la lumière ambiante',
      'Il y a trop de lumières',
      'La résolution est basse',
      'La caméra est mal placée',
    ],
    why: "Avec des floats, le point d'intersection peut se retrouver un poil sous la surface : le rayon d'ombre la touche à nouveau.",
  },
}
