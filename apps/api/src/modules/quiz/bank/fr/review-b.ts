/** Repaso de Not-games en francés (2/2): traducción de `../review-b.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_B_FR: Readonly<Record<string, ReviewEntry>> = {
  'algo-sort-complexity': {
    title: 'La limite du tri par comparaisons',
    definition:
      "Tout tri qui ne fait que comparer des éléments a besoin, dans le pire des cas, de l'ordre de n·log n comparaisons. On ne descend en dessous qu'en ne comparant pas (radix, counting sort).",
    example:
      "100 nombres : au moins 525 comparaisons environ (log₂ 100!) ; le tri à bulles en fait jusqu'à 4950.",
  },
  'algo-stack': {
    title: 'Piles et files dans push_swap',
    definition:
      "Une pile rend le dernier élément entré (LIFO) ; une file, le premier (FIFO). Dans push_swap, les deux piles ne laissent toucher que le sommet, et les rotations permettent de s'en servir presque comme de files circulaires.",
    example: "pb déplace le sommet de a sur le sommet de b ; pa fait l'inverse.",
  },
  'algo-rotate': {
    title: 'Faire tourner une pile',
    definition:
      "ra fait monter tous les éléments d'une position et celui du sommet passe tout en bas ; rra fait l'inverse : celui du bas passe au sommet. rr et rrr font la même chose sur les deux piles à la fois.",
    example: 'a = 1 2 3 → ra → 2 3 1 → rra → 1 2 3.',
  },
  'algo-three': {
    title: 'Trier trois nombres',
    definition:
      'Avec trois éléments, il y a 6 ordres possibles, et tous se règlent en deux opérations au plus, selon la place du plus grand.',
    example: '3 1 2 → ra → 1 2 3. 2 3 1 → rra → 1 2 3. 3 2 1 → sa, rra.',
  },
  'algo-radix': {
    title: 'Radix sort',
    definition:
      'Le radix trie chiffre par chiffre ou bit par bit, du moins significatif au plus significatif, sans comparer les éléments. Dans push_swap, on ramène en général les nombres à des indices 0..n-1, puis on les répartit entre les deux piles pour chaque bit.',
    example:
      "Pour chaque bit : s'il vaut 0, pb ; s'il vaut 1, ra. Ensuite, pa pour tout. Avec 500 nombres, 9 bits.",
  },
  'algo-quicksort': {
    title: 'Quicksort et merge sort',
    definition:
      'Le quicksort choisit un pivot, sépare les plus petits des plus grands et trie chaque partie : rapide en pratique, mais O(n²) si le pivot tombe toujours sur un extrême. Le merge sort coupe en deux et fusionne : toujours n·log n.',
    example:
      'Un quicksort qui prend le premier élément comme pivot, sur un tableau déjà trié : le pire cas.',
  },
  'algo-binary-search': {
    title: 'Recherche dichotomique',
    definition:
      "Sur des données triées, on regarde l'élément du milieu et on écarte la moitié où la cible ne peut pas être. Chaque étape divise les données par deux : environ log₂ n étapes.",
    example: 'Trouver 37 dans 1..100 : 50 → 25 → 37. Trois étapes.',
  },
  'algo-bfs-dfs': {
    title: 'BFS et DFS',
    definition:
      "Le BFS (parcours en largeur) avance couche par couche avec une file : la première fois qu'il atteint une case, c'est par le chemin le plus court en nombre d'étapes. Le DFS (parcours en profondeur) va jusqu'au bout avec une pile (ou la récursion), puis revient en arrière.",
    example:
      "La sortie la plus proche d'un labyrinthe : BFS. Vérifier que tout est connecté : les deux conviennent.",
  },
  'algo-dijkstra': {
    title: 'Dijkstra',
    definition:
      'Dijkstra calcule les plus courts chemins depuis une source quand les arêtes ont des poids positifs ou nuls : à chaque tour, il fixe le nœud en attente le plus proche et met à jour ses voisins.',
    example:
      'Des trajets avec des distances ou des durées (fly-in). Avec des poids négatifs, on utilise Bellman-Ford.',
  },
  'algo-maze-perfect': {
    title: 'Labyrinthe parfait',
    definition:
      "Un labyrinthe est parfait s'il existe exactement un chemin entre deux cases quelconques : pas de cycle ni de zone isolée. Vu comme un graphe, c'est un arbre.",
    example:
      'Dans une grille parfaite de 10 × 10, il y a 100 cases et exactement 99 murs abattus entre elles.',
  },
  'algo-maze-gen': {
    title: 'Générer un labyrinthe avec un DFS',
    definition:
      "Le « recursive backtracker » part d'une case, passe à une voisine non visitée au hasard en abattant le mur, et revient en arrière quand il n'y en a plus : on obtient un labyrinthe parfait aux longs couloirs.",
    example:
      'Les versions aléatoires de Prim ou de Kruskal donnent aussi des labyrinthes parfaits, avec plus de petites impasses.',
  },
  'thr-race': {
    title: 'Data race',
    definition:
      "Il y a une data race quand deux threads utilisent la même donnée en même temps, que l'un d'eux au moins écrit, et que rien ne les synchronise : le résultat dépend de l'ordre dans lequel ils s'entremêlent. On la détecte avec -fsanitize=thread ou helgrind.",
    example: 'Deux philosophes lisent et écrivent last_meal en même temps, sans mutex.',
  },
  'thr-counter': {
    title: 'Opérations non atomiques',
    definition:
      "count++, c'est trois étapes : lire, ajouter, écrire. Si deux threads les entremêlent, une addition se perd. On la protège avec un mutex, ou on utilise une opération atomique.",
    example: 'pthread_mutex_lock(&m); count++; pthread_mutex_unlock(&m);',
  },
  'thr-deadlock': {
    title: 'Interblocage (deadlock)',
    definition:
      "Plusieurs threads s'attendent en cercle : chacun tient ce dont un autre a besoin, et personne ne lâche rien. On l'évite en cassant le cercle, par exemple en prenant toujours les ressources dans le même ordre.",
    example:
      "Les philosophes pairs prennent d'abord la fourchette de droite, les impairs celle de gauche.",
  },
  'thr-mutex': {
    title: 'Mutex',
    definition:
      "Un mutex est un verrou : un seul thread à la fois peut le tenir, les autres attendent dans lock. Il protège une section qui ne doit pas s'exécuter en parallèle. Un thread qui verrouille deux fois le même mutex (non récursif) se bloque lui-même.",
    example: 'pthread_mutex_init(&m, NULL); … lock … unlock … pthread_mutex_destroy(&m);',
  },
  'thr-join-detach': {
    title: 'join et detach',
    definition:
      "pthread_join attend la fin d'un thread et récupère ce qu'il renvoie. pthread_detach le laisse partir : il libère ses ressources tout seul en se terminant, et on ne peut plus l'attendre. Chaque thread doit finir de l'une de ces deux façons.",
    example: 'for (i = 0; i < n; i++) pthread_join(th[i], NULL);',
  },
  'thr-usleep': {
    title: 'Mesurer le temps avec des threads',
    definition:
      "usleep peut dormir plus longtemps que demandé, et un thread de surveillance qui dort trop annonce une mort en retard. Dors par petites tranches en vérifiant l'horloge (gettimeofday), et surveille à quelques millisecondes d'intervalle.",
    example: 'while (now() - start < ms) usleep(500);',
  },
  'thr-print': {
    title: 'Messages entre threads',
    definition:
      "Si plusieurs threads écrivent en même temps, les lignes peuvent se mélanger, et un message peut sortir après l'annonce d'une mort. Protège l'écriture avec un mutex et vérifie d'abord que la simulation continue.",
    example: 'lock(print); if (!stopped) printf("%ld %d is eating\\n", t, id); unlock(print);',
  },
  'gfx-pixel-offset': {
    title: 'Où se trouve un pixel en mémoire',
    definition:
      "Une image est une bande d'octets, ligne après ligne. Le pixel (x, y) commence à y × line_length + x × (bits par pixel / 8). line_length peut être un peu plus grand que la largeur, à cause du padding.",
    example: '*(unsigned int *)(addr + y * line_len + x * (bpp / 8)) = color;',
  },
  'gfx-color': {
    title: 'Couleurs ARGB',
    definition:
      'Une couleur dans un entier de 32 bits : un octet pour la transparence et un pour chaque composante, rouge, vert et bleu (0xAARRGGBB). On la construit en décalant des bits.',
    example: "int color = (r << 16) | (g << 8) | b; 0x00FF00, c'est du vert.",
  },
  'gfx-events': {
    title: "Boucle d'événements",
    definition:
      'Un programme graphique ne suit pas un script : il attend des événements (touches, souris, fermeture de la fenêtre) et appelle tes fonctions (hooks). mlx_loop est cette boucle, et elle ne rend jamais la main : pour quitter, on ferme depuis un hook.',
    example:
      'mlx_hook(win, 17, 0, close_window, &data); mlx_key_hook(win, on_key, &data); mlx_loop(mlx);',
  },
  'gfx-image-buffer': {
    title: 'Dessiner dans une image',
    definition:
      "Peindre pixel par pixel dans la fenêtre est lent, et on voit l'écran clignoter. Dessine dans une image en mémoire, puis affiche-la d'un coup dans la fenêtre.",
    example: 'Peindre dans img.addr, puis mlx_put_image_to_window(mlx, win, img.ptr, 0, 0);',
  },
  'gfx-flood-fill': {
    title: 'Flood fill',
    definition:
      "Remplir tout ce qu'on peut atteindre depuis un point, comme le pot de peinture. Ça sert à savoir si tous les objets à ramasser et la sortie sont accessibles : on remplit depuis le joueur sur une copie de la carte, et on regarde ce qui manque.",
    example:
      "fill(x, y) : si c'est un mur ou une case déjà visitée, on s'arrête ; sinon, on la marque et on appelle fill sur les quatre voisines.",
  },
  'gfx-isometric': {
    title: 'Projection isométrique',
    definition:
      "Une façon de dessiner de la 3D en 2D sans perspective : les trois axes à 120° et à la même échelle. Les segments entre les points se tracent avec Bresenham, qui choisit quel pixel allumer en ne calculant qu'avec des entiers.",
    example: "x' = (x - y) × cos(30°) ; y' = (x + y) × sin(30°) - z.",
  },
  'gfx-mandelbrot': {
    title: 'Ensemble de Mandelbrot',
    definition:
      "Pour chaque point c du plan, on répète z = z² + c en partant de z = 0. Si |z| dépasse 2, le point s'échappe ; la couleur dépend du nombre d'itérations qu'il a fallu. Les points qui ne s'échappent jamais forment l'ensemble.",
    example: "c = 0 ne s'échappe jamais ; c = 1 donne 0, 1, 2, 5… et s'échappe.",
  },
  'gfx-julia': {
    title: 'Ensembles de Julia',
    definition:
      "La même formule z = z² + c, mais c est fixe pour toute l'image et z part du point du pixel. Chaque c donne un ensemble de Julia différent.",
    example: 'c = -0,8 + 0,156i donne un ensemble de Julia en spirales.',
  },
  'gfx-complex-square': {
    title: 'Nombres complexes',
    definition:
      "Un nombre complexe s'écrit a + bi, avec i² = -1. On les additionne partie par partie, et pour les multiplier on utilise i² = -1. Pour les fractales, le carré et le module suffisent.",
    example:
      '(a + bi)² = (a² - b²) + 2abi. |z|² = a² + b² (on le compare à 4 pour éviter la racine carrée).',
  },
  'gfx-raycast': {
    title: 'Raycasting',
    definition:
      "Pour chaque colonne de l'écran, on lance un rayon depuis le joueur ; le DDA avance case par case jusqu'à toucher un mur. La distance fixe la hauteur de la bande : loin, elle est courte ; près, elle est haute.",
    example: 'Un écran de 640 pixels de large, ce sont 640 rayons par image.',
  },
  'gfx-fisheye': {
    title: 'Effet fish-eye',
    definition:
      'Si tu prends la distance réelle entre le joueur et le mur, les rayons latéraux (plus longs) rapetissent les murs sur les côtés. Il faut prendre la distance perpendiculaire au plan de la caméra.',
    example: 'perp = distance × cos(angle du rayon - angle de vue).',
  },
  'gfx-map-closed': {
    title: 'Cartes fermées',
    definition:
      'Le bord de la carte doit être un mur : sinon, le joueur ou un rayon sort de la carte et lit de la mémoire qui ne lui appartient pas. Vérifie-le avant de jouer, y compris les trous des cartes irrégulières.',
    example: 'Aucune case praticable ne doit toucher le bord ni un espace vide.',
  },
  'gfx-dot-product': {
    title: 'Produit scalaire',
    definition:
      "a · b = ax·bx + ay·by + az·bz = |a|·|b|·cos θ. Il vaut 0 si les vecteurs sont perpendiculaires et il est positif s'ils vont dans le même sens : utile pour la lumière et pour savoir de quel côté se trouve quelque chose.",
    example: 'Lumière diffuse : intensité = max(0, normale · direction_vers_la_lumière).',
  },
  'gfx-normalize': {
    title: 'Normaliser un vecteur',
    definition:
      "Diviser un vecteur par sa longueur (√(x² + y² + z²)) pour qu'il mesure 1 et ne garde que sa direction. Les normales et les directions des rayons s'utilisent normalisées.",
    example: '(3, 4, 0) a pour longueur 5 → normalisé : (0,6 ; 0,8 ; 0).',
  },
  'gfx-ray-sphere': {
    title: 'Rayon contre sphère',
    definition:
      "En remplaçant le rayon (origine + t · direction) dans l'équation de la sphère, on obtient une équation du second degré en t. Discriminant négatif : pas d'intersection. S'il y en a une, on garde le plus petit t positif.",
    example: 't = (-b ± √(b² - 4ac)) / 2a ; avec t = -2 et t = 5, on voit le point en t = 5.',
  },
  'gfx-acne': {
    title: 'Shadow acne',
    definition:
      "À cause de la précision des float, le point d'intersection peut se retrouver un poil sous la surface, et son rayon d'ombre la touche elle-même : on voit apparaître de petits points noirs. Décale un peu l'origine (epsilon) le long de la normale.",
    example: 'origine_ombre = point + normale × 1e-4.',
  },
  'net-mask-hosts': {
    title: 'Masques et hôtes par réseau',
    definition:
      "Dans un /n, les n premiers bits désignent le réseau et le reste l'hôte : il y a 2^(32-n) adresses, moins celle du réseau (tout à 0) et celle de broadcast (tout à 1).",
    example: "/24 → 254 hôtes. /30 → 2 (juste ce qu'il faut pour relier deux routeurs).",
  },
  'net-mask-dotted': {
    title: 'Masque en notation pointée',
    definition:
      'Un /n, ce sont n bits à 1 suivis de zéros, écrits octet par octet en décimal. Pour le dernier octet, additionne les bits à 1 : 128, 192, 224, 240, 248, 252, 254, 255.',
    example: '/26 = 255.255.255.192. /20 = 255.255.240.0.',
  },
  'net-same-network': {
    title: 'Même réseau ?',
    definition:
      'Deux adresses sont dans le même réseau si elles coïncident sur les bits du masque : fais un AND de chacune avec le masque et compare. Si elles sont dans le même réseau, elles se parlent sans routeur.',
    example: '/25 : 192.168.1.10 → réseau .0 ; 192.168.1.200 → réseau .128. Réseaux différents.',
  },
  'net-private': {
    title: 'Adresses privées',
    definition:
      "Certaines plages sont réservées aux réseaux locaux et ne sont pas routées sur Internet : 10.0.0.0/8, 172.16.0.0/12 et 192.168.0.0/16. 127.0.0.1, c'est la machine elle-même.",
    example:
      'Ton portable à la maison : 192.168.1.34. Un serveur public sur Internet : son adresse ne peut pas être privée.',
  },
  'net-gateway': {
    title: 'Passerelle et routes',
    definition:
      "Un hôte envoie directement à son propre réseau ; pour tous les autres, il passe par le routeur (la passerelle). La route 0.0.0.0/0 est la route par défaut : elle couvre tout ce qui n'a pas d'autre route.",
    example: 'ip route → default via 192.168.1.1 dev eth0.',
  },
  'net-tcp-udp': {
    title: 'TCP et UDP',
    definition:
      "TCP est une connexion fiable : il achemine tout, dans l'ordre et sans doublon, en renvoyant si besoin. UDP envoie des paquets isolés, sans garantie, mais avec moins d'attente.",
    example: 'HTTP, SSH et IRC passent par TCP ; le DNS et beaucoup de jeux en ligne, par UDP.',
  },
  'net-dns': {
    title: 'DNS',
    definition:
      'Le DNS traduit des noms (intra.42.fr) en adresses IP. Ton ordinateur interroge un serveur DNS et garde la réponse en cache un moment.',
    example: "dig intra.42.fr ou nslookup intra.42.fr affichent l'IP.",
  },
  'srv-socket-steps': {
    title: 'Un serveur TCP',
    definition:
      "socket crée la socket, bind l'associe à un port, listen la met en écoute, et accept attend une connexion et renvoie un nouveau descripteur de fichier pour parler uniquement avec ce client.",
    example:
      'fd = socket(AF_INET, SOCK_STREAM, 0); bind(…6667…); listen(fd, 10); c = accept(fd, …);',
  },
  'srv-poll': {
    title: 'poll',
    definition:
      "poll surveille plusieurs descripteurs de fichier à la fois et te dit lesquels peuvent être lus ou écrits sans bloquer. Comme ça, un seul thread sert beaucoup de clients ; lire sans que poll l'ait signalé peut bloquer tout le serveur.",
    example: 'poll(fds, n, -1); for (…) if (fds[i].revents & POLLIN) lire(fds[i].fd);',
  },
  'srv-partial': {
    title: 'Messages en morceaux',
    definition:
      "TCP est un flux d'octets, pas de messages : un recv peut apporter un demi-message ou plusieurs. Accumule dans un buffer par client et traite chaque message complet (jusqu'au \\r\\n).",
    example:
      'buffer += recu; while ((pos = buffer.find("\\r\\n")) != npos) { traiter(buffer.substr(0, pos)); … }',
  },
  'http-status': {
    title: 'Codes HTTP',
    definition:
      '2xx : succès, 3xx : redirection, 4xx : erreur côté client, 5xx : erreur côté serveur.',
    example:
      '200 OK, 301 Moved, 403 Forbidden, 404 Not Found, 405 Method Not Allowed, 500 Internal Server Error.',
  },
  'http-methods': {
    title: 'Méthodes HTTP',
    definition:
      'GET demande quelque chose sans rien modifier ; POST crée ou envoie des données ; PUT et PATCH modifient ; DELETE supprime. La taille du corps va dans Content-Length (ou en morceaux avec chunked).',
    example: 'POST /upload avec Content-Length: 1024 et le fichier dans le corps.',
  },
  'http-chunked': {
    title: 'Transfer-Encoding: chunked',
    definition:
      "Le corps arrive en morceaux : chacun commence par sa taille en hexadécimal suivie d'un saut de ligne ; un morceau de taille 0 marque la fin.",
    example: '4\\r\\nWiki\\r\\n5\\r\\npedia\\r\\n0\\r\\n\\r\\n → « Wikipedia ».',
  },
  'http-cgi': {
    title: 'CGI',
    definition:
      "Avec la CGI, le serveur lance un programme (fork et execve) pour produire la réponse : il lui passe la requête dans des variables d'environnement et sur l'entrée standard, et renvoie ce que le programme écrit.",
    example:
      'GET /cgi-bin/hola.py → le serveur lance python3 hola.py avec QUERY_STRING, REQUEST_METHOD…',
  },
  'irc-basics': {
    title: 'Le protocole IRC',
    definition:
      "IRC, c'est du texte en lignes terminées par \\r\\n. Pour se connecter : PASS, NICK et USER ; ensuite, JOIN pour les canaux et PRIVMSG pour parler. Les opérateurs disposent de KICK, INVITE, TOPIC et MODE.",
    example: 'NICK pepe\\r\\nUSER pepe 0 * :Pepe\\r\\nJOIN #42\\r\\nPRIVMSG #42 :salut\\r\\n',
  },
  'docker-image': {
    title: 'Images et conteneurs',
    definition:
      "Une image est un modèle en lecture seule (construit avec un Dockerfile). Un conteneur est une image en cours d'exécution, avec sa propre couche d'écriture, qu'on perd en le supprimant si on n'utilise pas de volume.",
    example: 'docker build -t nginx-42 . && docker run -d -p 443:443 nginx-42',
  },
  'docker-vm': {
    title: 'Conteneur ou machine virtuelle',
    definition:
      "Une machine virtuelle émule un ordinateur entier, avec son propre noyau. Un conteneur est un processus isolé qui partage le noyau de l'hôte : il démarre en quelques secondes et prend peu de place. Il vit aussi longtemps que son processus principal (PID 1).",
    example: 'CMD ["nginx", "-g", "daemon off;"] garde nginx au premier plan, en PID 1.',
  },
  'docker-compose-net': {
    title: 'Réseaux de docker-compose',
    definition:
      "Les services d'un fichier compose partagent un réseau avec un DNS interne : chaque service se trouve par son nom. Dans un conteneur, localhost désigne le conteneur lui-même.",
    example: "Dans wp-config.php : define('DB_HOST', 'mariadb:3306');",
  },
  'web-https': {
    title: 'HTTPS et TLS',
    definition:
      "HTTPS, c'est du HTTP dans une connexion TLS : c'est chiffré, et le serveur prouve son identité avec un certificat. Il écoute sur le port 443 (HTTP, sur le 80).",
    example: 'Dans nginx : listen 443 ssl; ssl_protocols TLSv1.2 TLSv1.3;',
  },
  'web-sql-injection': {
    title: 'Injection SQL',
    definition:
      "Coller le texte de l'utilisateur dans une requête permet à ce qu'il tape de modifier la requête. Avec des requêtes paramétrées, une donnée reste toujours une donnée.",
    example: "db.query('SELECT * FROM users WHERE name = ?', [name])",
  },
  'web-hash-passwords': {
    title: 'Stocker les mots de passe',
    definition:
      'On ne les stocke jamais tels quels, ni chiffrés avec une clé : on stocke un hash lent et salé (bcrypt, argon2). Pour vérifier, on le recalcule et on compare.',
    example: 'hash = await bcrypt.hash(password, 12); ok = await bcrypt.compare(essai, hash);',
  },
  'web-websocket': {
    title: 'WebSockets',
    definition:
      'Une WebSocket garde ouverte une connexion dans les deux sens : le serveur envoie des données quand il veut, sans que le client les demande. Idéal pour les jeux et les chats en temps réel.',
    example:
      'const ws = new WebSocket("wss://…/pong"); ws.onmessage = (e) => dessiner(JSON.parse(e.data));',
  },
  'cpp-class-struct': {
    title: 'class et struct',
    definition:
      "En C++, c'est presque la même chose : les deux ont des méthodes, des constructeurs et de l'héritage. Seul le comportement par défaut change : dans une class tout est private, dans une struct tout est public.",
    example: 'class Contact { std::string name; }; ← name est private.',
  },
  'cpp-reference': {
    title: 'Références',
    definition:
      "Une référence est un autre nom pour quelque chose qui existe déjà : elle s'initialise à sa création, ne peut pas être nulle et ne peut pas être réassignée à autre chose. On s'en sert pour passer sans copier.",
    example: 'void augmenter(int &n) { n++; } int x = 1; augmenter(x); // x vaut 2',
  },
  'cpp-const-method': {
    title: 'Méthodes const',
    definition:
      "Une méthode marquée const à la fin promet de ne pas modifier l'objet : à l'intérieur, on ne peut pas changer les attributs, et c'est le seul genre de méthode qu'on peut appeler sur un objet const.",
    example: 'int getValue() const { return _value; }',
  },
  'cpp-new-delete': {
    title: 'new et delete',
    definition:
      'new crée un objet (en appelant son constructeur) et delete le détruit. Ce qui est créé avec new[] se libère avec delete[], pour que le destructeur de chaque élément soit appelé.',
    example: 'Zombie *z = new Zombie[5]; … delete[] z;',
  },
  'cpp-canonical': {
    title: 'Forme canonique orthodoxe',
    definition:
      "Une classe qui gère ses propres ressources définit : constructeur par défaut, constructeur de copie, opérateur d'affectation et destructeur. Le constructeur de copie sert à créer un objet à partir d'un autre ; operator=, à affecter un objet qui existe déjà.",
    example: 'A b(a); // copie. A c; c = a; // operator=',
  },
  'cpp-shallow-copy': {
    title: 'Copie superficielle et copie profonde',
    definition:
      "La copie par défaut copie les pointeurs, pas ce qu'ils pointent : deux objets partagent la même mémoire et la libèrent deux fois en étant détruits. Une copie profonde alloue sa propre mémoire et en copie le contenu.",
    example:
      'Brain(const Brain &o) { ideas = new std::string[100]; for (…) ideas[i] = o.ideas[i]; }',
  },
  'cpp-virtual': {
    title: 'Méthodes virtuelles',
    definition:
      "Sans virtual, la méthode exécutée dépend du type du pointeur ; avec virtual, de l'objet réel. C'est ce qui permet le polymorphisme : un Animal* qui est un Dog aboie.",
    example:
      'virtual void makeSound() const; dans Animal → a->makeSound() dit « Ouaf » si a est un Dog.',
  },
  'cpp-virtual-destructor': {
    title: 'Destructeur virtuel',
    definition:
      "Si une classe sert de base polymorphe, son destructeur doit être virtual : sinon, un delete via un pointeur sur la base n'appelle pas le destructeur de la classe dérivée, et de la mémoire reste non libérée.",
    example: 'virtual ~Animal();',
  },
  'cpp-abstract': {
    title: 'Classes abstraites',
    definition:
      "Une classe qui a au moins une méthode virtuelle pure (= 0) est abstraite : on ne peut pas en créer d'objets, seulement des classes dérivées qui implémentent ces méthodes. Elle sert d'interface.",
    example: 'class AMateria { public: virtual AMateria *clone() const = 0; };',
  },
  'cpp-diamond': {
    title: 'Héritage en diamant',
    definition:
      "Si deux classes héritent de la même base et qu'une quatrième hérite des deux, elle aurait deux copies de la base. Avec l'héritage virtuel, les deux en partagent une seule.",
    example:
      'class ScavTrap : virtual public ClapTrap {}; class FragTrap : virtual public ClapTrap {};',
  },
  'cpp-exceptions': {
    title: 'Exceptions',
    definition:
      "throw lève une exception : ce qui était en cours s'arrête et on remonte les appels jusqu'à trouver un catch de ce type. Tes propres exceptions héritent de std::exception et décrivent l'erreur avec what().",
    example:
      'class GradeTooHighException : public std::exception { const char *what() const throw() { return "Grade too high"; } };',
  },
  'cpp-catch-ref': {
    title: 'Attraper par référence',
    definition:
      "Attrape avec catch (const std::exception &e) : pas de copie, et le type réel est conservé. Par valeur, l'exception est copiée comme la base, et what() serait celui de la base (slicing).",
    example:
      'try { b.incrementGrade(); } catch (const std::exception &e) { std::cerr << e.what(); }',
  },
  'cpp-casts': {
    title: 'Les casts en C++',
    definition:
      "static_cast convertit entre types liés (nombres, pointeurs de la hiérarchie) à la compilation. dynamic_cast vérifie à l'exécution le type réel d'un objet polymorphe. reinterpret_cast réinterprète les bits (pointeur ↔ entier). const_cast enlève ou ajoute const.",
    example: 'int n = static_cast<int>(3.7); uintptr_t raw = reinterpret_cast<uintptr_t>(ptr);',
  },
  'cpp-dynamic-null': {
    title: 'Un dynamic_cast qui échoue',
    definition:
      "Avec des pointeurs, un dynamic_cast qui ne correspond pas renvoie NULL ; avec des références (qui ne peuvent pas être nulles), il lance std::bad_cast. C'est comme ça qu'on identifie le type réel.",
    example:
      'if (dynamic_cast<A *>(p)) std::cout << "A"; try { (void)dynamic_cast<B &>(r); } catch (std::exception &) {}',
  },
  'cpp-templates': {
    title: 'Templates',
    definition:
      "Un template, c'est du code générique : le compilateur en génère une version pour chaque type avec lequel on l'utilise. C'est pour ça qu'il va entièrement dans le header : le compilateur doit le voir pour le générer.",
    example: 'template <typename T> void swap(T &a, T &b) { T tmp = a; a = b; b = tmp; }',
  },
  'cpp-containers': {
    title: 'Conteneurs de la STL',
    definition:
      'vector : tableau qui grandit, accès par indice. list : liste doublement chaînée. map : arbre trié par clé. stack et queue : adaptateurs LIFO et FIFO. deque : insertion rapide aux deux bouts.',
    example: 'std::map<std::string, float> rates; rates["2011-01-03"] = 0.3;',
  },
  'cpp-iterator-invalid': {
    title: 'Itérateurs invalidés',
    definition:
      'Certaines opérations invalident les itérateurs : dans un vector, quand il grandit et change de place en mémoire (push_back), ou quand on efface. Utiliser un itérateur invalide est un comportement indéfini.',
    example: 'Après v.push_back(x), il faut redemander it = v.begin().',
  },
  'cpp-rpn': {
    title: 'Notation polonaise inverse',
    definition:
      "Les opérateurs viennent après leurs opérandes. On l'évalue avec une pile : chaque nombre est empilé, et chaque opérateur en dépile deux, calcule et empile le résultat.",
    example: '3 4 + 2 * → 7 2 * → 14. 5 1 2 + 4 * + 3 - → 14.',
  },
  'py-mutable-default': {
    title: 'Valeurs par défaut mutables',
    definition:
      "La valeur par défaut n'est créée qu'une fois, quand la fonction est définie. Si c'est une liste ou un dictionnaire, tous les appels partagent le même. Mets None et crée-la à l'intérieur.",
    example: 'def add(item, items=None):\\n    if items is None:\\n        items = []',
  },
  'py-is-eq': {
    title: '== et is',
    definition:
      "== compare des valeurs ; is vérifie s'il s'agit du même objet. Pour None, True et False, utilise is.",
    example: '[1] == [1] → True ; [1] is [1] → False. if x is None: …',
  },
  'py-copy': {
    title: "Affecter n'est pas copier",
    definition:
      "En Python, les variables sont des noms qui désignent des objets : b = a fait pointer les deux noms vers la même liste. Pour une copie : a.copy(), list(a) ou a[:] (et copy.deepcopy s'il y a des listes à l'intérieur).",
    example: 'a = [1, 2]; b = a; b.append(3) → a vaut aussi [1, 2, 3].',
  },
  'py-slicing': {
    title: 'Slicing',
    definition:
      'sequence[début:fin:pas] prend du début (inclus) à la fin (exclue) avec ce pas. Les indices négatifs comptent depuis la fin, et un pas de -1 inverse la séquence.',
    example: '"program"[1:4] → "rog" ; "program"[-3:] → "ram" ; "program"[::-1] → "margorp".',
  },
  'py-dict-get': {
    title: 'Dictionnaires',
    definition:
      "d[clé] lève KeyError si la clé n'existe pas ; d.get(clé, défaut) renvoie la valeur par défaut (ou None). `in` te dit si la clé existe.",
    example: 'ages.get("ana", 0) + 1; if "ana" in ages: …',
  },
  'py-comprehension': {
    title: 'Compréhensions',
    definition:
      'Une façon courte de construire des listes, des ensembles ou des dictionnaires : [expression for x in iterable if condition].',
    example: '[x * x for x in range(5) if x % 2 == 0] → [0, 4, 16]. {k: len(k) for k in noms}',
  },
  'py-generator': {
    title: 'Générateurs',
    definition:
      'Une fonction avec yield renvoie un générateur : il produit les valeurs une à une, à la demande, et se met en pause à chaque yield. Il ne garde pas toute la séquence en mémoire.',
    example:
      'def fib():\\n    a, b = 0, 1\\n    while True:\\n        yield a\\n        a, b = b, a + b',
  },
  'py-exceptions': {
    title: 'try, except, else et finally',
    definition:
      "try essaie un bloc ; except attrape les erreurs du type que tu indiques ; else s'exécute s'il n'y a pas eu d'erreur ; finally s'exécute toujours, erreur ou pas.",
    example: 'try:\\n    n = int(texte)\\nexcept ValueError:\\n    print("pas un nombre")',
  },
  'py-classes': {
    title: 'Classes et self',
    definition:
      "__init__ prépare chaque nouvel objet. self est l'objet sur lequel on appelle la méthode : obj.methode() revient à Classe.methode(obj).",
    example: 'class Planta:\\n    def __init__(self, nombre):\\n        self.nombre = nombre',
  },
  'py-abc': {
    title: 'Classes abstraites (ABC)',
    definition:
      "En héritant de ABC et en marquant des méthodes avec @abstractmethod, Python t'empêche de créer des objets de la classe tant qu'il en reste une non implémentée (TypeError).",
    example: 'class Forme(ABC):\\n    @abstractmethod\\n    def area(self) -> float: ...',
  },
  'py-typing': {
    title: 'Annotations de type',
    definition:
      "Les annotations (x: int, -> str) documentent les types, mais Python ne les vérifie pas à l'exécution. Ce sont des outils comme mypy qui les vérifient, avant l'exécution.",
    example: 'def saluer(nom: str) -> str: … ; mypy programme.py te prévient si tu passes un int.',
  },
  'py-scope': {
    title: 'Portée des variables',
    definition:
      "Affecter un nom à l'intérieur d'une fonction le rend local dans toute la fonction. Pour modifier une variable globale, il faut global (ou nonlocal pour celle de la fonction englobante).",
    example: 'def inc():\\n    global count\\n    count += 1',
  },
  'py-venv': {
    title: 'Environnements virtuels',
    definition:
      "Un venv est un dossier avec son propre Python et ses propres paquets, séparé du système. requirements.txt liste les dépendances pour installer les mêmes n'importe où.",
    example:
      'python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt',
  },
  'py-main-guard': {
    title: 'if __name__ == "__main__"',
    definition:
      'Quand tu exécutes un fichier, __name__ vaut "__main__" ; quand tu l\'importes, c\'est le nom du module. Le if contient le code qui ne doit tourner que si le fichier est exécuté, pas importé.',
    example: 'if __name__ == "__main__":\\n    main()',
  },
  'py-json': {
    title: 'JSON',
    definition:
      "JSON, c'est du texte avec des objets, des listes, des chaînes de caractères, des nombres, true, false et null. Les clés et les chaînes vont entre guillemets doubles, et les virgules finales sont interdites. En Python : json.loads lit et json.dumps écrit.",
    example: 'json.loads(\'{"name": "fn_add", "args": [1, 2]}\')["args"] → [1, 2]',
  },
  'llm-tokens': {
    title: 'Tokens et décodage contraint',
    definition:
      "Un modèle de langage génère du texte token par token, en choisissant chacun selon des probabilités. Si, à chaque étape, on n'autorise que les tokens qui respectent un format (du JSON valide, par exemple), la sortie respecte toujours ce format.",
    example: 'Après {"name": on retire les tokens qui ne commencent pas une chaîne.',
  },
  'llm-function-calling': {
    title: 'Function calling',
    definition:
      "Le modèle n'exécute rien : il choisit quelle fonction appeler et avec quels arguments (en général en JSON), et c'est ton programme qui l'exécute et lui renvoie le résultat.",
    example: 'Question « Combien font 2 + 3 ? » → {"name": "add", "parameters": {"a": 2, "b": 3}}.',
  },
}
