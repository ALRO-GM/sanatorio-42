/** Repaso de Not-games en francés: traducción de `../review-core-algo.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_CORE_ALGO_FR: Readonly<Record<string, ReviewEntry>> = {
  'ps-ops': {
    title: 'Les opérations de push_swap',
    definition:
      "sa/sb échangent les deux du haut ; pa/pb passent le sommet d'une pile sur l'autre ; ra/rb tournent vers le haut (le sommet va au fond) et rra/rrb vers le bas. ss, rr et rrr font pareil sur a et b à la fois. S'il n'y a pas assez d'éléments, elles ne font rien.",
    example: 'a = 2 1 3 → sa → 1 2 3 ; avec b vide, pa ne fait rien.',
  },
  'ps-sequence': {
    title: "Suivre une suite d'opérations",
    definition:
      "Elles s'appliquent une par une, dans l'ordre, en regardant toujours le sommet. Le plus simple est d'écrire les deux piles après chaque étape.",
    example: 'a = 3 1 2, b vide → sa → a = 1 3 2 → pb → a = 3 2, b = 1.',
  },
  'ps-limits': {
    title: "Combien d'opérations push_swap accepte",
    definition:
      'La correction mesure la longueur de la liste : pour la note maximale, 100 nombres au hasard en moins de 700 opérations et 500 nombres en 5500 au plus. Au-delà, la note baisse par paliers.',
    example: '100 nombres en 650 opérations : note maximale sur ce test ; en 1200, non.',
  },
  'ps-errors': {
    title: 'Erreurs et arguments dans push_swap',
    definition:
      "Si un argument n'est pas un entier, ne tient pas dans un int ou est en double, push_swap affiche « Error » et un retour à la ligne sur la sortie d'erreur (fd 2). Sans arguments, il n'affiche rien.",
    example: './push_swap 1 2 2 → « Error » sur stderr ; ./push_swap → rien.',
  },
  'ps-output': {
    title: 'Ce que push_swap affiche',
    definition:
      'La liste des instructions, une par ligne sur la sortie standard, pour que checker (ou un autre programme) puisse la lire. Si les nombres sont déjà triés, la liste la plus courte est vide.',
    example: './push_swap 2 1 3 → « sa » ; ./push_swap 1 2 3 → rien.',
  },
  'ps-checker': {
    title: 'Le checker du bonus',
    definition:
      "checker reçoit les nombres en arguments et lit les instructions sur l'entrée standard, une par ligne. Il les applique et affiche OK si a finit triée et b vide, KO sinon, et « Error » sur stderr si quelque chose ne va pas.",
    example: './push_swap 3 2 1 | ./checker 3 2 1 → OK.',
  },
  'philo-args': {
    title: 'Les arguments de philo',
    definition:
      'philo reçoit number_of_philosophers, time_to_die, time_to_eat et time_to_sleep, les temps en millisecondes, plus un cinquième argument facultatif : number_of_times_each_philosopher_must_eat.',
    example: './philo 5 800 200 200 → 5 philosophes qui meurent après 800 ms sans manger.',
  },
  'philo-must-eat': {
    title: "Quand la simulation s'arrête",
    definition:
      "Elle s'arrête quand un philosophe meurt. Si number_of_times_each_philosopher_must_eat est donné, elle s'arrête aussi quand tous ont mangé au moins ce nombre de fois.",
    example: "./philo 5 800 200 200 7 → s'arrête quand les cinq ont mangé 7 fois ou qu'un meurt.",
  },
  'philo-one': {
    title: 'Un seul philosophe',
    definition:
      'Il y a autant de fourchettes que de philosophes. Seul, il a une fourchette et il lui en faut deux pour manger : il la prend, attend et meurt à time_to_die. Le programme ne doit pas rester bloqué à attendre la seconde.',
    example: './philo 1 800 200 200 → « 0 1 has taken a fork » et « 800 1 died ».',
  },
  'philo-bonus': {
    title: 'Le bonus de philosophers',
    definition:
      "Chaque philosophe est un processus (pas un thread) et les fourchettes sont toutes au milieu de la table : un sémaphore compte combien sont libres. Le processus principal n'est pas un philosophe.",
    example: 'sem_open avec la valeur N ; chaque philosophe fait deux sem_wait pour manger.',
  },
  'sl-ber': {
    title: 'La carte .ber de so_long',
    definition:
      'La carte est un fichier .ber fait de cinq caractères : 0 (sol), 1 (mur), C (collectible), E (sortie) et P (position de départ du joueur).',
    example: '11111\n1P0C1\n100E1\n11111',
  },
  'sl-rules': {
    title: 'Quand une carte de so_long est valide',
    definition:
      "Rectangulaire, fermée par des murs, avec une sortie, un joueur et au moins un collectible, et avec un chemin valide. On ne finit par la sortie qu'après avoir ramassé tous les collectibles.",
    example: 'Une carte avec deux E ou une ligne plus courte donne « Error » et un message.',
  },
  'sl-moves': {
    title: 'Déplacements, touches et événements dans so_long',
    definition:
      'À chaque déplacement, le nombre de déplacements faits s’affiche dans le terminal. ESC et la croix de la fenêtre ferment proprement ; mlx_hook branche tes fonctions sur ces événements.',
    example: 'mlx_hook(win, 17, 0, close_game, &game) pour la croix.',
  },
  'fdf-map': {
    title: 'La carte de FdF',
    definition:
      'Chaque nombre du .fdf est un point : sa colonne donne x, sa ligne y et sa valeur la hauteur. Il peut porter une couleur après une virgule.',
    example: '0 0 10,0xFF0000 → trois points ; le troisième à hauteur 10 et en rouge.',
  },
  'fdf-rotate': {
    title: 'Faire tourner des points',
    definition:
      "Tourner (x, y) de θ autour de z donne x′ = x·cos θ − y·sin θ et y′ = x·sin θ + y·cos θ ; z ne change pas. Pour les autres axes, c'est pareil avec les deux autres coordonnées.",
    example: '(1, 0) tourné de 90° → (0, 1).',
  },
  'fdf-projection': {
    title: 'Les projections dans FdF',
    definition:
      "La partie obligatoire demande l'isométrique, sans perspective : même échelle sur les trois axes. Le bonus peut en ajouter une autre, comme la parallèle ou la conique, où ce qui est loin paraît plus petit.",
    example: 'Isométrique : x′ = (x − y) · cos 30°, y′ = (x + y) · sin 30° − z.',
  },
  'fol-zoom': {
    title: 'Zoomer vers la souris',
    definition:
      "Zoomer, c'est mettre à l'échelle le morceau de plan visible : ×2 vers l'avant laisse la moitié de la largeur. Pour suivre la souris, on met à l'échelle autour du point sous le curseur, qui ne bouge pas.",
    example: 'min = souris + (min − souris) / 2, et pareil avec max.',
  },
  'fol-map': {
    title: 'Du pixel au nombre complexe',
    definition:
      "Chaque pixel est ramené au plan par une règle de trois : re = min + x · (max − min) / largeur. Pour la partie imaginaire on retourne la ligne, car à l'écran y grandit vers le bas.",
    example: '800 px pour -2..2 : le pixel 200 vaut -1 et le 400 vaut 0.',
  },
  'fol-iter': {
    title: 'Itérations et couleur',
    definition:
      "On itère jusqu'à ce que le point s'échappe ou qu'on atteigne le maximum. Un maximum plus haut donne plus de détail sur le bord et prend plus de temps ; le nombre d'itérations avant de s'échapper décide la couleur.",
    example: "S'échappe à l'itération 12 sur 100 → couleur 12 de la palette.",
  },
  'cub-file': {
    title: 'Le fichier .cub',
    definition:
      'Il donne les textures de chaque face (NO, SO, WE, EA), les couleurs du sol (F) et du plafond (C) en RGB et, à la fin, la carte, où N, S, E ou W placent le joueur tourné de ce côté.',
    example: 'NO ./north.xpm\nF 220,100,0\nC 225,30,0\n111\n1N1\n111',
  },
  'cub-textures': {
    title: 'Les textures dans un raycaster',
    definition:
      "Le côté du mur touché par le rayon (et sa direction) choisit la texture. La partie décimale du point d'impact le long du mur, fois la largeur de la texture, donne la colonne à peindre.",
    example: 'Impact en x = 3.25 avec une texture de 64 px → colonne 16.',
  },
  'cub-collision': {
    title: 'Les collisions dans cub3d',
    definition:
      "Avant de déplacer le joueur, on regarde si la case d'arrivée est un mur, et on laisse une petite marge pour que la caméra ne se colle pas au mur.",
    example: 'Si map[(int)(y + dy)][(int)(x + dx)] == 1, tu ne bouges pas.',
  },
  'rt-file': {
    title: 'Le fichier .rt',
    definition:
      "Chaque ligne est un élément : A (lumière ambiante), C (caméra) et L (lumière) n'apparaissent qu'une fois ; sp, pl et cy sont des sphères, des plans et des cylindres. La sphère prend centre, diamètre et couleur.",
    example: 'A 0.2 255,255,255\nC -50,0,20 0,0,1 70\nsp 0,0,20.6 12.6 10,0,255',
  },
  'rt-light': {
    title: 'Lumière ambiante et diffuse',
    definition:
      "La partie obligatoire demande l'ambiante (la même partout) et la diffuse (Lambert) : la luminosité est proportionnelle au cosinus entre la normale et la direction de la lumière, et vaut 0 à 90° ou plus.",
    example: 'n · l = 0.5 → la moitié de la lumière du spot, plus l’ambiante.',
  },
  'rt-camera': {
    title: 'La caméra de miniRT',
    definition:
      "La caméra prend une position, un vecteur d'orientation normalisé (chaque axe entre -1 et 1) et le champ de vision horizontal en degrés. À distance 1, la moitié du plan de la caméra mesure tan(FOV / 2).",
    example: 'C 0,0,0 0,0,1 90 → regarde vers +z et le plan va de -1 à 1.',
  },
}
