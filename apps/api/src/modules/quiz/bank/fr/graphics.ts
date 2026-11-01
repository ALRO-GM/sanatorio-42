/** Banco de Not-games en francés: gráficos (`../graphics.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const GRAPHICS_FR: Readonly<Record<string, ConceptText>> = {
  'gfx-pixel-offset': {
    forms: [
      {
        ask: [
          'Une image de 800 px de large, 4 octets par pixel et sans padding. À quel octet commence le pixel (x = 10, y = 2) ?',
          'Avec line_length = 3200 et 4 octets par pixel, à quel octet commence le pixel (10, 2) ?',
        ],
        right: ['6440'],
      },
    ],
    wrong: ['1610', '820', '6410', '3210', '2010'],
    why: 'Tu sautes y lignes entières (y · line_length) puis x pixels (x · octets par pixel) : 2 · 3200 + 10 · 4 = 6440.',
  },
  'gfx-color': {
    forms: [
      {
        ask: [
          'Quelle couleur est 0x00FF0000 au format ARGB ?',
          'En 0xAARRGGBB, quelle couleur est 0x00FF0000 ?',
        ],
        right: ['Rouge'],
        wrong: ['Vert', 'Bleu', 'Blanc', 'Noir'],
      },
      {
        ask: [
          'Quelle couleur est 0x0000FF00 au format ARGB ?',
          'En 0xAARRGGBB, quelle couleur est 0x0000FF00 ?',
        ],
        right: ['Vert'],
        wrong: ['Rouge', 'Bleu', 'Blanc', 'Noir'],
      },
    ],
    wrong: ['Bleu', 'Blanc', 'Noir', 'Jaune'],
    why: 'Chaque canal occupe un octet : AA RR GG BB. FF dans celui du rouge donne du rouge ; dans celui du vert, du vert.',
  },
  'gfx-events': {
    forms: [
      {
        ask: ['Que fait `mlx_loop` ?', "Après l'appel à mlx_loop, que fait le programme ?"],
        right: [
          'Il attend des événements et appelle tes hooks',
          "Il entre dans la boucle d'événements et n'en revient pas",
        ],
        wrong: [
          'Il dessine dans la fenêtre tout ce qui attend',
          'Il ouvre une nouvelle fenêtre à sa taille',
          'Il charge les images qui ont été demandées',
          'Il ferme la connexion et termine le programme',
        ],
      },
      {
        ask: [
          "Pourquoi faut-il gérer l'événement de fermeture de la fenêtre (la croix) ?",
          "Que se passe-t-il si la croix de la fenêtre n'est pas gérée ?",
        ],
        right: [
          'Le programme ne se termine pas quand tu cliques dessus',
          'Tu ne quittes pas proprement en fermant la fenêtre',
        ],
        wrong: [
          "La fenêtre se déplace toute seule sur l'écran",
          'La fenêtre ne peut plus être redimensionnée',
          'Le programme ralentit à chaque nouveau dessin',
        ],
      },
    ],
    wrong: [
      'Il dessine dans la fenêtre tout ce qui attend',
      'Il ouvre une nouvelle fenêtre à sa taille',
    ],
    why: "Les programmes graphiques réagissent à des événements ; la boucle d'événements appelle tes hooks et c'est toi qui décides quand quitter.",
  },
  'gfx-image-buffer': {
    forms: [
      {
        ask: [
          "Pourquoi dessiner dans une image et l'afficher d'un coup plutôt que d'utiliser `mlx_pixel_put` pixel par pixel ?",
          "Que gagnes-tu à dessiner dans une image et à l'afficher en entier ?",
        ],
        right: [
          'Beaucoup de vitesse, et aucun scintillement visible',
          'Un seul appel lent au lieu d’un par pixel',
        ],
      },
    ],
    wrong: [
      'On peut utiliser plus de couleurs à la fois',
      'La fenêtre prend moins de mémoire',
      'Les pixels paraissent plus nets',
      'Seule cette façon respecte la norme de 42',
    ],
    why: "Peindre en mémoire et afficher en une fois évite des milliers d'appels et le scintillement d'un dessin à moitié fait.",
  },
  'gfx-flood-fill': {
    forms: [
      {
        ask: [
          'Comment vérifies-tu que tous les collectibles et la sortie de la carte sont accessibles ?',
          "Qu'utilise-t-on en général pour savoir si la carte a une solution ?",
        ],
        right: [
          'Un flood fill depuis le joueur, en regardant ce qui manque',
          'Un parcours depuis le joueur, comme un BFS',
        ],
      },
    ],
    wrong: [
      "Vérifier qu'il y a plus de sol que de murs",
      'Vérifier que la carte est rectangulaire et fermée',
      'Essayer des déplacements au hasard un moment',
      "Vérifier qu'il y a une sortie et un joueur",
    ],
    why: "En remplissant depuis le joueur, tu marques tout ce qui est accessible ; s'il manque quelque chose, il n'y a pas de solution.",
  },
  'gfx-isometric': {
    forms: [
      {
        ask: [
          "Qu'a de particulier la projection isométrique ?",
          'Comment apparaissent les trois axes dans une projection isométrique ?',
        ],
        right: ['Raccourcis pareil et à 120° entre eux', 'À 120° et à la même échelle'],
        wrong: [
          'Ce qui est loin paraît plus petit',
          'On ne voit la carte que de dessus',
          'Ils ont deux points de fuite',
          "L'un des trois axes disparaît",
        ],
      },
      {
        ask: ["Que fait l'algorithme de Bresenham ?", 'À quoi sert Bresenham ?'],
        right: [
          'Il trace une droite pixel par pixel, rien qu’avec des entiers',
          'Il trace des droites en pixels sans décimales',
        ],
        wrong: [
          "Il remplit de couleur l'intérieur d'un polygone",
          'Il fait tourner la carte autour de son centre',
          'Il calcule la perspective de chaque point',
          'Il adoucit les bords des lignes avec des gris',
        ],
      },
    ],
    wrong: ['Ce qui est loin paraît plus petit', 'On ne voit la carte que de dessus'],
    why: "La vue isométrique n'a pas de perspective : même échelle sur les trois axes. Bresenham décide quel pixel allumer à chaque pas.",
  },
  'gfx-mandelbrot': {
    forms: [
      {
        ask: [
          "Quelle formule répète-t-on pour l'ensemble de Mandelbrot ?",
          "Qu'est-ce qu'on itère dans Mandelbrot ?",
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
          "Quand considère-t-on qu'un point s'échappe (qu'il n'est pas dans l'ensemble) ?",
          "Quand arrêtes-tu d'itérer sur un point ?",
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
          'En quoi Julia est-il différent de Mandelbrot ?',
          "Julia utilise la même formule. Qu'est-ce qui change ?",
        ],
        right: [
          "c est fixe et z part du point de l'écran",
          'c ne bouge pas et le z de départ est le pixel',
        ],
        wrong: [
          'Il itère z³ + c au lieu de z² + c',
          "Il ne se dessine qu'en noir et blanc",
          'On ne peut pas zoomer : il n’a pas de détail',
          "C'est le même Mandelbrot, tourné de 90 degrés",
        ],
      },
      {
        ask: ['Que vaut i² ?', "Que vaut l'unité imaginaire au carré ?"],
        right: ['-1'],
        wrong: ['1', '0', '2'],
      },
    ],
    wrong: ['Il itère z³ + c au lieu de z² + c', "Il ne se dessine qu'en noir et blanc"],
    why: 'Dans Mandelbrot, c est le pixel et z part de 0 ; dans Julia, c est fixe et z part du pixel.',
  },
  'gfx-complex-square': {
    forms: [
      {
        ask: ['Si z = a + bi, que vaut z² ?', 'À quoi est égal (a + bi)² ?'],
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
          'Dans un raycaster comme Wolfenstein 3D, combien de rayons lance-t-on ?',
          "Combien de rayons le raycaster lance-t-il pour peindre l'écran ?",
        ],
        right: ["Un par colonne de l'écran", 'Autant que de pixels en largeur'],
        wrong: [
          "Un par pixel de l'écran",
          'Un seul, dans la direction du regard',
          'Un par mur de la carte',
          'Un par degré que tourne le joueur',
        ],
      },
      {
        ask: ['À quoi sert le DDA dans cub3d ?', "Que trouve l'algorithme DDA ?"],
        right: [
          'Le premier mur que touche chaque rayon',
          "Les cases que traverse le rayon jusqu'à un mur",
        ],
        wrong: [
          'La couleur du plafond selon la direction',
          'Quelle texture de sol mettre sur chaque ligne',
          'La position du joueur à chaque image',
        ],
      },
    ],
    wrong: ["Un par pixel de l'écran", 'Un par mur de la carte'],
    why: "Chaque colonne est un rayon ; la distance jusqu'au mur touché donne la hauteur de cette bande.",
  },
  'gfx-fisheye': {
    forms: [
      {
        ask: [
          'Tes murs sont courbés, comme avec un fish-eye. Pourquoi ?',
          "Un mur droit paraît bombé dans ton raycaster. Qu'est-ce que tu fais de travers ?",
        ],
        right: [
          'Tu prends la distance réelle, pas la perpendiculaire à la caméra',
          'Tu ne corriges pas la distance avec le cosinus du rayon',
        ],
      },
    ],
    wrong: [
      'La texture du mur a été mal chargée',
      'Le champ de vision est beaucoup trop petit',
      'Tu lances trop peu de rayons pour la largeur',
      "La carte n'est pas entièrement fermée par des murs",
    ],
    why: 'Les rayons sur les côtés sont plus longs même si le mur est à la même distance : il faut utiliser la distance perpendiculaire.',
  },
  'gfx-map-closed': {
    forms: [
      {
        ask: [
          'Pourquoi faut-il vérifier que la carte est fermée par des murs ?',
          'Que peut-il se passer si la carte a un trou sur le bord ?',
        ],
        right: [
          'Un rayon ou le joueur sort et on lit hors de la carte',
          'On lit de la mémoire hors de la carte en la quittant',
        ],
      },
    ],
    wrong: [
      "La carte est moins jolie à l'écran",
      "La MiniLibX refuse d'ouvrir la fenêtre",
      'La carte met plus de temps à se charger',
      'Le compteur de déplacements déborde',
    ],
    why: 'Un trou laisse un rayon ou le joueur sortir de la carte et lire au-delà de ce qui a été alloué.',
  },
  'gfx-dot-product': {
    forms: [
      {
        ask: [
          'Combien vaut le produit scalaire de deux vecteurs perpendiculaires ?',
          'Deux vecteurs forment un angle de 90°. Combien vaut a · b ?',
        ],
        right: ['0'],
        wrong: ['1', '-1', '90'],
      },
      {
        ask: [
          'Combien vaut (1, 2, 3) · (4, 5, 6) ?',
          'Quel est le produit scalaire de (1, 2, 3) et (4, 5, 6) ?',
        ],
        right: ['32'],
        wrong: ['21', '15', '90', '6'],
      },
      {
        ask: ['Si a · b = 0, comment sont les vecteurs a et b ?'],
        right: ['Perpendiculaires'],
        wrong: ['Parallèles', 'De même longueur', 'Opposés'],
      },
    ],
    wrong: ['1', '-1', '90'],
    why: 'a · b = |a| · |b| · cos θ : à 90°, le cosinus vaut 0. Par composantes : 4 + 10 + 18 = 32.',
  },
  'gfx-normalize': {
    forms: [
      {
        ask: [
          'Que veut dire normaliser un vecteur ?',
          'Que fais-tu à un vecteur quand tu le normalises ?',
        ],
        right: [
          "Le diviser par sa longueur pour qu'il mesure 1",
          'Lui donner une longueur de 1 en gardant sa direction',
        ],
        wrong: [
          "Le rendre perpendiculaire à ce qu'il était",
          'Rendre toutes ses composantes positives',
          'Arrondir ses composantes à des entiers',
          "Le tourner jusqu'à ce qu'il vise la caméra",
        ],
      },
      {
        ask: ['Quelle est la longueur du vecteur (3, 4, 0) ?', 'Combien mesure (3, 4, 0) ?'],
        right: ['5'],
        wrong: ['7', '12', '25'],
      },
    ],
    wrong: ["Le rendre perpendiculaire à ce qu'il était", 'Arrondir ses composantes à des entiers'],
    why: 'Longueur = √(x² + y² + z²) ; en divisant par elle, il reste la direction avec une longueur de 1.',
  },
  'gfx-ray-sphere': {
    forms: [
      {
        ask: [
          "L'intersection d'un rayon et d'une sphère donne une équation du second degré. Que signifie un discriminant négatif ?",
          "Si b² - 4ac < 0 quand tu calcules l'intersection du rayon et de la sphère, que se passe-t-il ?",
        ],
        right: [
          'Le rayon ne touche pas la sphère',
          "Il n'y a pas d'intersection : le rayon passe à côté",
        ],
        wrong: [
          'Il la touche en un seul point, en la frôlant',
          "La caméra est à l'intérieur de la sphère",
          'La sphère est derrière la caméra',
          'Il la touche en deux points distincts',
        ],
      },
      {
        ask: [
          'Il y a deux intersections avec la sphère, en t = -2 et en t = 5. Laquelle voit-on ?',
          'Avec les solutions t = -2 et t = 5, quelle intersection est visible ?',
        ],
        right: ['Celle en t = 5 : la négative est derrière'],
        wrong: [
          "Celle en t = -2, parce que c'est la plus proche",
          'Les deux, avec les couleurs mélangées',
          "Aucune : un t négatif annule l'intersection",
        ],
      },
    ],
    wrong: ["La caméra est à l'intérieur de la sphère", 'La sphère est derrière la caméra'],
    why: "Sans racine réelle, pas d'intersection. Parmi les racines, c'est la plus petite positive qui compte : les négatives sont derrière.",
  },
  'gfx-acne': {
    forms: [
      {
        ask: [
          'Les surfaces sont couvertes de petits points noirs (shadow acne). Comment corriger ça ?',
          "Le rayon d'ombre touche l'objet même dont il part. Comment corriger ça ?",
        ],
        right: [
          "En sortant l'origine du rayon d'un epsilon le long de la normale",
          'En décalant un peu le point de départ vers l’extérieur',
        ],
      },
    ],
    wrong: [
      'En montant la lumière ambiante pour cacher les points',
      'En retirant des lumières jusqu’à ce qu’ils partent',
      "En augmentant la résolution de l'image",
      'En éloignant la caméra des objets',
    ],
    why: "Avec des floats, le point d'intersection peut se retrouver un poil sous la surface : le rayon d'ombre la touche à nouveau.",
  },
  'sl-ber': {
    forms: [
      {
        ask: [
          'Quelle extension doit avoir le fichier de carte de so_long ?',
          'so_long reçoit une carte en argument. Avec quelle extension ?',
        ],
        right: ['.ber'],
        wrong: ['.map', '.cub', '.txt', '.fdf'],
      },
      {
        ask: [
          'Que représente la lettre C dans une carte de so_long ?',
          "Dans un .ber, qu'est-ce que chaque C ?",
        ],
        right: ['Un collectible'],
        wrong: ['La sortie de la carte', 'Un sol vide', 'Un ennemi qui patrouille'],
      },
      {
        ask: [
          'Dans une carte de so_long, quelle lettre marque le départ du joueur ?',
          'Quelle lettre donne la position de départ dans un .ber ?',
        ],
        right: ['P'],
        wrong: ['S', 'E', 'J'],
      },
    ],
    wrong: ['0', '1'],
    why: 'La carte est un .ber avec 0 (sol), 1 (mur), C (collectible), E (sortie) et P (position de départ).',
  },
  'sl-rules': {
    forms: [
      {
        ask: [
          'Combien de sorties (E) doit avoir une carte valide de so_long ?',
          'Dans un .ber valide, combien de E doit-il y avoir ?',
        ],
        right: ['1'],
        wrong: ['0', '2', '4', '3'],
      },
      {
        ask: [
          'Quelle forme doit avoir la carte de so_long ?',
          'Comment doivent être les lignes d’une carte de so_long ?',
        ],
        right: ['Rectangulaire : lignes de même longueur'],
        wrong: [
          "N'importe laquelle, si elle est fermée",
          'Symétrique par rapport au centre',
          'Avec plus de lignes que de colonnes',
        ],
      },
      {
        ask: [
          'Dans so_long, quand peut-on sortir par la E ?',
          'Que faut-il pour finir la partie à la sortie de so_long ?',
        ],
        right: ['Avoir ramassé tous les collectibles'],
        wrong: [
          "Rien : il suffit d'y arriver",
          'Avoir ramassé au moins la moitié',
          'Avoir fait autant de pas que de cases',
        ],
      },
    ],
    wrong: ['Que le joueur commence à côté de la E'],
    why: "Une carte valide est rectangulaire, fermée, avec une sortie, un joueur et des collectibles ; la sortie ne marche qu'une fois tout ramassé.",
  },
  'sl-moves': {
    forms: [
      {
        ask: [
          'Dans la partie obligatoire de so_long, où affiche-t-on le nombre de déplacements ?',
          'Où so_long (sans bonus) demande-t-il d’afficher le compteur de déplacements ?',
        ],
        right: ['Dans le terminal, à chaque déplacement'],
        wrong: [
          'Dans la fenêtre, au-dessus de la carte',
          'Seulement à la fin, en arrivant à la sortie',
          'Dans un fichier de log à la fermeture',
        ],
      },
      {
        ask: [
          'Dans so_long, quelle touche doit fermer la fenêtre et quitter proprement ?',
          'Avec quelle touche quitte-t-on so_long, selon le sujet ?',
        ],
        right: ['ESC'],
        wrong: ['Q', 'Espace', 'Entrée'],
      },
      {
        ask: ['À quoi sert `mlx_hook` ?', 'Que fais-tu avec `mlx_hook(win, 17, 0, f, p)` ?'],
        right: ['Il lie une de tes fonctions à un événement de la fenêtre'],
        wrong: [
          'Il dessine un pixel à une position de la fenêtre',
          'Il charge une image XPM et renvoie son pointeur',
          'Il ouvre la fenêtre avec sa taille et son titre',
        ],
      },
    ],
    wrong: ["Rien : ce n'est pas nécessaire"],
    why: 'so_long affiche le compteur dans le terminal à chaque pas, ESC et la croix ferment proprement, et mlx_hook branche tes fonctions sur ces événements.',
  },
  'fdf-map': {
    forms: [
      {
        ask: [
          'Dans une carte .fdf, que donne chaque nombre ?',
          "Qu'est-ce que la valeur de chaque nombre dans un fichier de FdF ?",
        ],
        right: ['La hauteur de ce point'],
        wrong: [
          'La couleur de ce point',
          "L'ordre dans lequel il se dessine",
          'Sa distance à la caméra',
        ],
      },
      {
        ask: [
          'Que signifie « 10,0xFF0000 » dans une carte de FdF ?',
          "Un .fdf contient « 10,0xFF0000 ». Qu'est-ce que c'est ?",
        ],
        right: ['Hauteur 10 et couleur rouge'],
        wrong: [
          'Hauteur 10 et couleur verte',
          'Colonne 10 et couleur rouge',
          'Hauteur 10 et opacité maximale',
        ],
      },
      {
        ask: [
          'Combien de points a une carte de FdF de 10 lignes de 12 nombres chacune ?',
          'Un .fdf a 10 lignes de 12 nombres. Combien de points faut-il dessiner ?',
        ],
        right: ['120'],
        wrong: ['22', '144', '100', '132'],
      },
    ],
    wrong: ['Son nombre de voisins'],
    why: 'Chaque nombre est un point : sa colonne donne x, sa ligne y et sa valeur la hauteur ; une couleur peut suivre la virgule.',
  },
  'fdf-rotate': {
    forms: [
      {
        ask: [
          'Tu tournes le point (1, 0) de 90° dans le sens antihoraire (y vers le haut). Où arrive-t-il ?',
          'Avec y vers le haut, où va (1, 0) après une rotation de 90° dans le sens antihoraire ?',
        ],
        right: ['(0, 1)'],
        wrong: ['(1, 0)', '(-1, 0)', '(0, -1)', '(1, 1)'],
      },
      {
        ask: [
          "En tournant (x, y) d'un angle θ autour de l'axe z, quel est le nouveau x ?",
          "Quelle formule donne le x d'un point (x, y) tourné de θ autour de l'axe z ?",
        ],
        right: ['x·cos θ − y·sin θ'],
        wrong: ['x·sin θ + y·cos θ', 'x·cos θ + y·sin θ', 'x·cos θ − y·cos θ'],
      },
    ],
    wrong: ['x + θ'],
    why: 'Une rotation de θ autour de z donne x′ = x·cos θ − y·sin θ et y′ = x·sin θ + y·cos θ ; à 90°, (1, 0) devient (0, 1).',
  },
  'fdf-projection': {
    forms: [
      {
        ask: [
          'Quelle projection demande la partie obligatoire de FdF ?',
          'Dans FdF sans bonus, comment faut-il projeter la carte ?',
        ],
        right: ["L'isométrique"],
        wrong: ['La conique, avec perspective', 'La parallèle vue de dessus', 'La cavalière'],
      },
      {
        ask: [
          'Avec une projection conique (avec perspective), comment voit-on ce qui est plus loin ?',
          "En perspective conique, qu'arrive-t-il à un point qui s'éloigne de la caméra ?",
        ],
        right: ['Plus petit'],
        wrong: ['Aussi grand', 'Plus grand', 'Plus haut'],
      },
    ],
    wrong: ['Plus sombre'],
    why: "L'obligatoire est l'isométrique, sans perspective ; dans la conique on divise par la profondeur et ce qui est loin rétrécit.",
  },
  'fol-zoom': {
    forms: [
      {
        ask: [
          'Pour zoomer vers la souris, quel point du plan doit rester immobile ?',
          "Quand le zoom suit la souris, quel point ne bouge pas à l'écran ?",
        ],
        right: ['Celui qui est sous le curseur'],
        wrong: ['Le centre de la fenêtre', 'Le coin en haut à gauche', "L'origine, 0 + 0i"],
      },
      {
        ask: [
          'Tu zoomes ×2 avec la molette. Que devient la largeur du plan visible ?',
          'Après un zoom ×2 vers l’avant, comment change la largeur du morceau de plan visible ?',
        ],
        right: ['Elle est divisée par 2'],
        wrong: ['Elle est multipliée par 2', 'Elle reste la même', 'Elle est divisée par 4'],
      },
    ],
    wrong: ['Elle perd 2'],
    why: 'Zoomer ×2 montre une largeur moitié moindre, et pour suivre la souris on met à l’échelle autour du point qui est dessous.',
  },
  'fol-map': {
    forms: [
      {
        ask: [
          'La fenêtre fait 800 px de large et montre la partie réelle de -2 à 2. Quelle partie réelle a le pixel x = 200 ?',
          'Avec 800 px de large pour la partie réelle de -2 à 2, quelle valeur réelle tombe en x = 200 ?',
        ],
        right: ['-1'],
        wrong: ['-1.5', '0', '1', '0.5'],
      },
      {
        ask: [
          'Pourquoi inverse-t-on en général le y pour passer du pixel au nombre complexe ?',
          "En passant la ligne d'un pixel en partie imaginaire, pourquoi la retourne-t-on ?",
        ],
        right: ["À l'écran y descend ; dans le plan, la partie imaginaire monte"],
        wrong: [
          "Parce que la MiniLibX dessine l'image à l'envers",
          'Parce que la partie imaginaire est toujours négative',
          'Pour que la fractale sorte tournée de 90 degrés',
        ],
      },
    ],
    wrong: ['-2'],
    why: "re = min + x · (max − min) / largeur : -2 + 200 · 4 / 800 = -1 ; et les lignes descendent, à l'inverse de l'axe imaginaire.",
  },
  'fol-iter': {
    forms: [
      {
        ask: [
          "Que se passe-t-il quand tu montes le maximum d'itérations dans fract-ol ?",
          "Si tu passes de 50 à 500 itérations au maximum, qu'est-ce qui change ?",
        ],
        right: ['Plus de détail sur le bord, mais plus lent'],
        wrong: [
          'Plus de zoom, mais moins de couleurs visibles',
          "La forme de tout l'ensemble change",
          "C'est plus rapide, car ça s'échappe plus tôt",
        ],
      },
      {
        ask: [
          "Qu'utilise-t-on normalement pour colorer un point qui s'échappe ?",
          "Dans fract-ol, de quoi dépend en général la couleur d'un pixel hors de l'ensemble ?",
        ],
        right: ["Du nombre d'itérations qu'il a mis à s'échapper"],
        wrong: [
          'De sa distance au centre de la fenêtre',
          'Du signe de sa partie imaginaire',
          'Du signe positif ou négatif de sa partie réelle',
        ],
      },
    ],
    wrong: ["De l'heure à laquelle on le dessine"],
    why: "Plus d'itérations séparent mieux ce qui s'échappe tard (plus de détail) au prix du temps ; ces itérations donnent la couleur.",
  },
  'cub-file': {
    forms: [
      {
        ask: [
          'Dans un fichier .cub, que donne la ligne « F 220,100,0 » ?',
          "Qu'est-ce que « F 220,100,0 » dans une scène de cub3d ?",
        ],
        right: ['La couleur du sol, en RGB'],
        wrong: [
          'La couleur du plafond, en RGB',
          'La position de départ du joueur',
          'La taille de la fenêtre en pixels',
        ],
      },
      {
        ask: [
          'Que donne « NO ./textures/north.xpm » dans un .cub ?',
          'Dans une scène de cub3d, à quoi sert la ligne qui commence par NO ?',
        ],
        right: ['La texture de la face nord des murs'],
        wrong: [
          'La couleur du ciel vers le nord',
          'La direction de départ du joueur',
          'La texture du sol de la moitié nord',
        ],
      },
      {
        ask: [
          "Dans la carte de cub3d, quelle lettre place le joueur face à l'ouest ?",
          "Quel caractère d'une carte .cub place le joueur regardant vers l'ouest ?",
        ],
        right: ['W'],
        wrong: ['O', 'WE', 'P'],
      },
      {
        ask: [
          "Qu'est-ce qui doit toujours venir en dernier dans un fichier .cub ?",
          'Dans une scène de cub3d, quelle partie va à la fin du fichier ?',
        ],
        right: ['La carte'],
        wrong: ['Les couleurs', 'Les textures', 'La résolution'],
      },
    ],
    wrong: ['E'],
    why: 'Un .cub donne les textures NO, SO, WE et EA, les couleurs F (sol) et C (plafond) puis, à la fin, la carte avec N, S, E ou W pour le joueur.',
  },
  'cub-textures': {
    forms: [
      {
        ask: [
          "Pour choisir la colonne de la texture, quelle donnée du point d'impact utilise-t-on ?",
          "Qu'est-ce qui décide quelle colonne de texture peindre sur une bande de mur ?",
        ],
        right: ['La partie décimale de la coordonnée le long du mur'],
        wrong: [
          "La distance du joueur au point d'impact",
          "Le numéro de la colonne de l'écran",
          'La partie entière de la case touchée',
        ],
      },
      {
        ask: [
          'La texture fait 64 px de large et le rayon touche le mur à 0.25 de son bord. Quelle colonne de la texture utilises-tu ?',
          'Avec une texture de 64 px et un impact à 0.25 du bord du mur, quelle colonne est-ce ?',
        ],
        right: ['16'],
        wrong: ['25', '4', '32', '8'],
      },
      {
        ask: [
          'Comment sais-tu quelle texture (NO, SO, WE ou EA) va sur un impact ?',
          "Dans cub3d, qu'est-ce qui décide qu'une bande prend la texture nord, sud, est ou ouest ?",
        ],
        right: ['Le côté du mur touché et le sens du rayon'],
        wrong: [
          'La distance entre le joueur et le mur',
          "La colonne de l'écran qu'on peint",
          'La case où le joueur a commencé',
        ],
      },
    ],
    wrong: ['64'],
    why: "Le côté touché (x ou y) et le signe du rayon donnent la texture ; la partie décimale de l'impact, fois la largeur de la texture, donne la colonne.",
  },
  'cub-collision': {
    forms: [
      {
        ask: [
          "Comment empêche-t-on d'habitude le joueur de traverser les murs dans cub3d ?",
          'Dans le bonus de collisions de cub3d, que fait-on avant de déplacer le joueur ?',
        ],
        right: ["On regarde si la case d'arrivée est un mur"],
        wrong: [
          'On baisse la vitesse près des murs',
          'On dessine les murs plus épais',
          'On bloque la rotation de la caméra près d’eux',
        ],
      },
      {
        ask: [
          "Pourquoi vaut-il mieux laisser une marge en vérifiant la case d'arrivée ?",
          "Pour les collisions, pourquoi regarder un peu au-delà de l'arrivée ?",
        ],
        right: ['Pour ne pas coller au mur au point de mal le voir'],
        wrong: [
          'Pour que le joueur avance plus vite',
          'Pour économiser des rayons dans les coins',
          'Parce que la carte commence à compter à 1',
        ],
      },
    ],
    wrong: ['Pour que la carte prenne moins de mémoire'],
    why: 'Avant de bouger, on regarde la case où irait le joueur, avec une petite marge pour que la caméra ne finisse pas collée au mur.',
  },
  'rt-file': {
    forms: [
      {
        ask: [
          "Dans un fichier .rt, qu'est-ce que la ligne « A 0.2 255,255,255 » ?",
          'Que déclare « A 0.2 255,255,255 » dans une scène de miniRT ?',
        ],
        right: ['La lumière ambiante, de ratio 0.2, blanche'],
        wrong: [
          "Une lumière ponctuelle à l'origine, blanche",
          'La caméra, avec 0.2 de zoom et un fond blanc',
          'Un plan à 0.2 de la caméra, de couleur blanche',
        ],
      },
      {
        ask: [
          'Combien de caméras (C) peut-on déclarer dans un .rt ?',
          'Dans une scène de miniRT, combien de fois peut apparaître le C majuscule ?',
        ],
        right: ['1'],
        wrong: ['0', '2', '4', '8'],
      },
      {
        ask: [
          'Que déclare « sp 0,0,20.6 12.6 10,0,255 » dans un .rt ?',
          "Dans miniRT, qu'est-ce que la ligne « sp 0,0,20.6 12.6 10,0,255 » ?",
        ],
        right: ['Une sphère en (0, 0, 20.6) de diamètre 12.6'],
        wrong: [
          'Une sphère en (0, 0, 20.6) de rayon 12.6',
          'Un spot en (0, 0, 20.6) de luminosité 12.6',
          'Un plan par (0, 0, 20.6) de normale 12.6',
        ],
      },
    ],
    wrong: ['Un cylindre sans hauteur'],
    why: "Les majuscules (A, C, L) n'apparaissent qu'une fois : A est l'ambiante (ratio et couleur) et sp prend centre, diamètre et couleur.",
  },
  'rt-light': {
    forms: [
      {
        ask: [
          'Quelles lumières demande la partie obligatoire de miniRT ?',
          'Sans bonus, quelles parties du modèle de Phong faut-il faire dans miniRT ?',
        ],
        right: ["L'ambiante et la diffuse"],
        wrong: [
          'La diffuse et la spéculaire',
          "L'ambiante et la spéculaire",
          'Seulement la spéculaire',
        ],
      },
      {
        ask: [
          "Dans l'éclairage diffus, de quoi dépend la luminosité d'un point ?",
          "Qu'est-ce qui fixe la quantité de lumière diffuse reçue par un point d'une surface ?",
        ],
        right: ["De l'angle entre la normale et la lumière"],
        wrong: [
          'De la distance du point à la caméra',
          "De l'angle entre la normale et la caméra",
          'De la couleur du fond de la scène',
        ],
      },
      {
        ask: [
          'Si la normale et la direction de la lumière forment 90°, combien de lumière diffuse reçoit le point ?',
          'Avec une lumière rasante, à 90° de la normale, quelle intensité diffuse obtient-on ?',
        ],
        right: ['0'],
        wrong: ['1', '0.5', '90'],
      },
    ],
    wrong: ["De la taille de l'objet"],
    why: "La diffuse est proportionnelle à n · l, le cosinus entre la normale et la direction de la lumière : à 90°, elle s'annule.",
  },
  'rt-camera': {
    forms: [
      {
        ask: [
          "Dans « C -50,0,20 0,0,1 70 », qu'est-ce que le 70 ?",
          "Dans la ligne de la caméra d'un .rt, que donne le dernier nombre ?",
        ],
        right: ['Le champ de vision horizontal, en degrés'],
        wrong: [
          "La distance de la caméra à l'origine",
          'Le zoom de la caméra, en pourcentage',
          'Le champ de vision vertical, en radians',
        ],
      },
      {
        ask: [
          "Que doit respecter le vecteur d'orientation de la caméra dans un .rt ?",
          'Dans « C -50,0,20 0,0,1 70 », comment doit être le vecteur 0,0,1 ?',
        ],
        right: ['Être normalisé, chaque axe entre -1 et 1'],
        wrong: [
          "Viser toujours l'origine de la scène",
          'Avoir toutes ses composantes positives',
          'Mesurer autant que le champ de vision',
        ],
      },
      {
        ask: [
          'Avec un FOV de 90°, que vaut tan(FOV / 2) ?',
          "Avec un champ de vision de 90°, que vaut la tangente de la moitié de l'angle ?",
        ],
        right: ['1'],
        wrong: ['0.5', '2', '45'],
      },
    ],
    wrong: ['Être en degrés'],
    why: 'La caméra prend une position, une orientation normalisée et le FOV horizontal en degrés ; la moitié du plan mesure tan(FOV / 2).',
  },
}
