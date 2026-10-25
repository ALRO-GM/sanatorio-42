/** Repaso de Not-games en inglés (2/2): traducción de `../review-b.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_B_EN: Readonly<Record<string, ReviewEntry>> = {
  'algo-sort-complexity': {
    title: 'The limit of comparison sorting',
    definition:
      'Any sort that only compares elements needs, in the worst case, about n·log n comparisons. You can only beat that by not comparing (radix, counting sort).',
    example:
      '100 numbers: at least about 525 comparisons (log₂ 100!); bubble sort does up to 4950.',
  },
  'algo-stack': {
    title: 'Stacks and queues in push_swap',
    definition:
      'A stack gives back the last thing that went in (LIFO); a queue gives back the first (FIFO). In push_swap the two stacks only let you touch the top, and rotations make them work almost like circular queues.',
    example: 'pb moves the top of a onto the top of b; pa does the opposite.',
  },
  'algo-rotate': {
    title: 'Rotating a stack',
    definition:
      'ra moves every element up one position and the top one goes to the bottom; rra does the opposite: the bottom one goes to the top. rr and rrr do the same on both stacks at once.',
    example: 'a = 1 2 3 → ra → 2 3 1 → rra → 1 2 3.',
  },
  'algo-three': {
    title: 'Sorting three numbers',
    definition:
      'With three elements there are 6 possible orders, and all of them can be solved with two operations at most, by looking at where the largest one is.',
    example: '3 1 2 → ra → 1 2 3. 2 3 1 → rra → 1 2 3. 3 2 1 → sa, rra.',
  },
  'algo-radix': {
    title: 'Radix sort',
    definition:
      'Radix sorts by digits or bits, from the least significant to the most, without comparing elements. In push_swap you usually normalize the numbers to indexes 0..n-1 and split them between the two stacks for each bit.',
    example:
      'For each bit: if it is 0, pb; if it is 1, ra. Then pa everything. With 500 numbers, 9 bits.',
  },
  'algo-quicksort': {
    title: 'Quicksort and merge sort',
    definition:
      'Quicksort picks a pivot, splits into smaller and larger, and sorts each part: fast in practice, but O(n²) if the pivot is always an extreme. Merge sort splits in half and merges: always n·log n.',
    example:
      'Quicksort with the first element as pivot on an already sorted array: the worst case.',
  },
  'algo-binary-search': {
    title: 'Binary search',
    definition:
      'In sorted data, you look at the middle element and throw away the half where the target cannot be. Each step halves the data: about log₂ n steps.',
    example: 'Find 37 in 1..100: 50 → 25 → 37. Three steps.',
  },
  'algo-bfs-dfs': {
    title: 'BFS and DFS',
    definition:
      'BFS (breadth-first) visits layer by layer using a queue: the first time it reaches a place, it does so by the path with the fewest steps. DFS (depth-first) goes all the way down using a stack (or recursion) and then backtracks.',
    example:
      'The closest exit of a maze: BFS. Checking whether everything is connected: either one works.',
  },
  'algo-dijkstra': {
    title: 'Dijkstra',
    definition:
      'Dijkstra computes the shortest paths from a source when edges have non-negative weights: each time it closes the closest pending node and updates its neighbors.',
    example: 'Routes with distances or times (fly-in). With negative weights you use Bellman-Ford.',
  },
  'algo-maze-perfect': {
    title: 'Perfect maze',
    definition:
      'A maze is perfect if there is exactly one path between any two cells: no cycles and no isolated areas. As a graph, it is a tree.',
    example:
      'In a perfect 10 × 10 grid there are 100 cells and exactly 99 knocked-down walls between them.',
  },
  'algo-maze-gen': {
    title: 'Generating mazes with DFS',
    definition:
      'The "recursive backtracker" starts at a cell, moves to a random unvisited neighbor by knocking down the wall, and backs up when there are no more: you get a perfect maze with long corridors.',
    example: 'Randomized Prim or Kruskal also give perfect mazes, with more short branches.',
  },
  'thr-race': {
    title: 'Race condition',
    definition:
      'A race happens when two threads use the same data at the same time and at least one writes, without synchronizing: the result depends on the order in which they interleave. You can detect it with -fsanitize=thread or helgrind.',
    example: 'Two philosophers read and write last_meal at the same time without a mutex.',
  },
  'thr-counter': {
    title: 'Non-atomic operations',
    definition:
      'count++ is three steps: read, add and write. If two threads interleave them, one addition gets lost. Protect it with a mutex or use an atomic operation.',
    example: 'pthread_mutex_lock(&m); count++; pthread_mutex_unlock(&m);',
  },
  'thr-deadlock': {
    title: 'Deadlock',
    definition:
      'Several threads wait for each other in a circle: each one holds something another one needs and nobody lets go. You avoid it by breaking the circle, for example by always taking resources in the same order.',
    example: 'Even philosophers take the right fork first and odd ones take the left.',
  },
  'thr-mutex': {
    title: 'Mutex',
    definition:
      'A mutex is a lock: only one thread at a time can hold it; the others wait in lock. It protects a section that must not run at the same time. A thread that locks the same (non-recursive) mutex twice deadlocks itself.',
    example: 'pthread_mutex_init(&m, NULL); … lock … unlock … pthread_mutex_destroy(&m);',
  },
  'thr-join-detach': {
    title: 'join and detach',
    definition:
      'pthread_join waits for a thread to finish and collects what it returns. pthread_detach lets it go: it frees its resources by itself when it ends and you can no longer wait for it. Every thread must end in one of these two ways.',
    example: 'for (i = 0; i < n; i++) pthread_join(th[i], NULL);',
  },
  'thr-usleep': {
    title: 'Measuring time with threads',
    definition:
      'usleep can sleep longer than asked, and a monitor that sleeps too long reports a death late. Sleep in short slices while checking the clock (gettimeofday), and monitor every few milliseconds.',
    example: 'while (now() - start < ms) usleep(500);',
  },
  'thr-print': {
    title: 'Messages between threads',
    definition:
      'If several threads write at the same time, lines can get mixed up, and a message can appear after the death has been announced. Protect the writing with a mutex and check first whether the simulation is still running.',
    example: 'lock(print); if (!stopped) printf("%ld %d is eating\\n", t, id); unlock(print);',
  },
  'gfx-pixel-offset': {
    title: 'Where a pixel is in memory',
    definition:
      'An image is a strip of bytes, row after row. Pixel (x, y) starts at y × line_length + x × (bits per pixel / 8). line_length can be a bit larger than the width because of padding.',
    example: '*(unsigned int *)(addr + y * line_len + x * (bpp / 8)) = color;',
  },
  'gfx-color': {
    title: 'ARGB colors',
    definition:
      'A color in a 32-bit integer: one byte for transparency and one each for red, green and blue (0xAARRGGBB). You build it by shifting bits.',
    example: 'int color = (r << 16) | (g << 8) | b; 0x00FF00 is green.',
  },
  'gfx-events': {
    title: 'Event loop',
    definition:
      'A graphical program does not follow a script: it waits for events (keys, mouse, closing the window) and calls your functions (hooks). mlx_loop is that loop and it never returns; to exit, you close from a hook.',
    example:
      'mlx_hook(win, 17, 0, close_window, &data); mlx_key_hook(win, on_key, &data); mlx_loop(mlx);',
  },
  'gfx-image-buffer': {
    title: 'Drawing into an image',
    definition:
      'Painting pixel by pixel on the window is slow and you can see it flicker. Draw into an image in memory and put it on the window all at once.',
    example: 'Paint into img.addr and then mlx_put_image_to_window(mlx, win, img.ptr, 0, 0);',
  },
  'gfx-flood-fill': {
    title: 'Flood fill',
    definition:
      'Fill everything reachable from a point, like a paint bucket. It is useful to know whether all the collectibles and the exit can be reached: you fill from the player on a copy of the map and see what is missing.',
    example:
      'fill(x, y): if it is a wall or already visited, stop; otherwise mark it and call fill on the four neighbors.',
  },
  'gfx-isometric': {
    title: 'Isometric projection',
    definition:
      'A way to draw 3D in 2D without perspective: the three axes at 120° and with the same scale. Lines between points are drawn with Bresenham, which decides which pixel to light up using integers.',
    example: "x' = (x - y) × cos(30°); y' = (x + y) × sin(30°) - z.",
  },
  'gfx-mandelbrot': {
    title: 'Mandelbrot set',
    definition:
      'For each point c of the plane, repeat z = z² + c starting at z = 0. If |z| goes past 2, it escapes; the color comes from how many iterations it took. The points that never escape are the set.',
    example: 'c = 0 never escapes; c = 1 gives 0, 1, 2, 5… and escapes.',
  },
  'gfx-julia': {
    title: 'Julia sets',
    definition:
      "The same formula z = z² + c, but c is fixed for the whole image and z starts at the pixel's point. Each c gives a different Julia set.",
    example: 'c = -0.8 + 0.156i gives a Julia set with spirals.',
  },
  'gfx-complex-square': {
    title: 'Complex numbers',
    definition:
      'A complex number is a + bi, with i² = -1. They are added part by part, and when multiplying you use i² = -1. For fractals, the square and the modulus are enough.',
    example:
      '(a + bi)² = (a² - b²) + 2abi. |z|² = a² + b² (compare it with 4 to avoid the square root).',
  },
  'gfx-raycast': {
    title: 'Raycasting',
    definition:
      'For each column of the screen, a ray is cast from the player; DDA steps cell by cell until it hits a wall. The distance decides the height of the strip: far, short; near, tall.',
    example: 'A screen 640 wide means 640 rays per frame.',
  },
  'gfx-fisheye': {
    title: 'Fisheye effect',
    definition:
      'If you use the real distance from the player to the wall, the side rays (which are longer) shrink the walls at the sides. You have to use the distance perpendicular to the camera plane.',
    example: 'perp = distance × cos(ray angle - view angle).',
  },
  'gfx-map-closed': {
    title: 'Closed maps',
    definition:
      'The border of the map has to be wall: otherwise the player or a ray goes outside the map and reads memory that is not theirs. Check it before playing, including the gaps in irregular maps.',
    example: 'No walkable cell may touch the border or an empty space.',
  },
  'gfx-dot-product': {
    title: 'Dot product',
    definition:
      'a · b = ax·bx + ay·by + az·bz = |a|·|b|·cos θ. It is 0 if they are perpendicular and positive if they point the same way: useful for light and for knowing which side something is on.',
    example: 'Diffuse light: intensity = max(0, normal · direction_to_light).',
  },
  'gfx-normalize': {
    title: 'Normalizing a vector',
    definition:
      'Divide a vector by its length (√(x² + y² + z²)) so it measures 1 and only the direction is left. Normals and ray directions are used normalized.',
    example: '(3, 4, 0) has length 5 → normalized (0.6, 0.8, 0).',
  },
  'gfx-ray-sphere': {
    title: 'Ray against sphere',
    definition:
      'Substituting the ray (origin + t · direction) into the sphere equation gives a quadratic in t. Negative discriminant: no hit. If there is one, use the smallest positive t.',
    example: 't = (-b ± √(b² - 4ac)) / 2a; with t = -2 and t = 5, you see the point at t = 5.',
  },
  'gfx-acne': {
    title: 'Shadow acne',
    definition:
      'Because of float precision, the hit point can end up a hair inside the surface and its shadow ray hits itself: you get little black dots. Move the origin a bit (epsilon) along the normal.',
    example: 'shadow_origin = point + normal × 1e-4.',
  },
  'net-mask-hosts': {
    title: 'Masks and hosts per network',
    definition:
      'In /n, the first n bits are the network and the rest are the host: there are 2^(32-n) addresses, minus the network one (all 0) and the broadcast one (all 1).',
    example: '/24 → 254 hosts. /30 → 2 (just enough to link two routers).',
  },
  'net-mask-dotted': {
    title: 'Dotted mask',
    definition:
      '/n is n ones followed by zeros, written byte by byte in decimal. For the last byte, add up the bits set to 1: 128, 192, 224, 240, 248, 252, 254, 255.',
    example: '/26 = 255.255.255.192. /20 = 255.255.240.0.',
  },
  'net-same-network': {
    title: 'Same network?',
    definition:
      'Two addresses are in the same network if they match in the mask bits: AND each one with the mask and compare. If they are in the same one, they talk without a router.',
    example: '/25: 192.168.1.10 → network .0; 192.168.1.200 → network .128. Different networks.',
  },
  'net-private': {
    title: 'Private addresses',
    definition:
      'There are ranges reserved for local networks, which are not routed on the Internet: 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16. 127.0.0.1 is the machine itself.',
    example:
      'Your laptop at home: 192.168.1.34. A public server on the Internet: its address cannot be private.',
  },
  'net-gateway': {
    title: 'Gateway and routes',
    definition:
      'A host sends directly to its own network; for any other, it sends to the router (gateway). The route 0.0.0.0/0 is the default route: it matches everything that has no other route.',
    example: 'ip route → default via 192.168.1.1 dev eth0.',
  },
  'net-tcp-udp': {
    title: 'TCP and UDP',
    definition:
      'TCP is a reliable connection: it delivers everything, in order and without duplicates, resending if needed. UDP sends loose packets with no guarantees, but with less waiting.',
    example: 'HTTP, SSH and IRC run over TCP; DNS and many online games, over UDP.',
  },
  'net-dns': {
    title: 'DNS',
    definition:
      'DNS translates names (intra.42.fr) to IP addresses. Your computer asks a DNS server and keeps the answer for a while.',
    example: 'dig intra.42.fr or nslookup intra.42.fr show the IP.',
  },
  'srv-socket-steps': {
    title: 'A TCP server',
    definition:
      'socket creates the socket, bind ties it to a port, listen makes it listen, and accept waits for a connection and returns a new descriptor to talk only with that client.',
    example:
      'fd = socket(AF_INET, SOCK_STREAM, 0); bind(…6667…); listen(fd, 10); c = accept(fd, …);',
  },
  'srv-poll': {
    title: 'poll',
    definition:
      'poll waits on many descriptors at once and tells you which ones can be read or written without blocking. That way a single thread serves many clients; reading without poll saying so can block the whole server.',
    example: 'poll(fds, n, -1); for (…) if (fds[i].revents & POLLIN) leer(fds[i].fd);',
  },
  'srv-partial': {
    title: 'Messages in pieces',
    definition:
      'TCP is a stream of bytes, not of messages: one recv can bring half a message or several. Accumulate in a buffer per client and process each complete message (up to \\r\\n).',
    example:
      'buffer += recibido; while ((pos = buffer.find("\\r\\n")) != npos) { procesar(buffer.substr(0, pos)); … }',
  },
  'http-status': {
    title: 'HTTP codes',
    definition:
      '2xx good, 3xx redirect, 4xx error from the requester and 5xx error from the server.',
    example:
      '200 OK, 301 Moved, 403 Forbidden, 404 Not Found, 405 Method Not Allowed, 500 Internal Server Error.',
  },
  'http-methods': {
    title: 'HTTP methods',
    definition:
      'GET asks for something without changing anything; POST creates or sends data; PUT and PATCH change; DELETE removes. The body size goes in Content-Length (or in pieces with chunked).',
    example: 'POST /upload with Content-Length: 1024 and the file in the body.',
  },
  'http-chunked': {
    title: 'Transfer-Encoding: chunked',
    definition:
      'The body arrives in pieces: each one starts with its size in hexadecimal and a line; a chunk of size 0 marks the end.',
    example: '4\\r\\nWiki\\r\\n5\\r\\npedia\\r\\n0\\r\\n\\r\\n → "Wikipedia".',
  },
  'http-cgi': {
    title: 'CGI',
    definition:
      'With CGI, the server runs a program (fork and execve) to generate the response: it passes the request in environment variables and on standard input, and returns what the program writes.',
    example:
      'GET /cgi-bin/hola.py → the server runs python3 hola.py with QUERY_STRING, REQUEST_METHOD…',
  },
  'irc-basics': {
    title: 'IRC protocol',
    definition:
      'IRC is text in lines ending in \\r\\n. To get in: PASS, NICK and USER; then JOIN for channels and PRIVMSG to talk. Operators have KICK, INVITE, TOPIC and MODE.',
    example: 'NICK pepe\\r\\nUSER pepe 0 * :Pepe\\r\\nJOIN #42\\r\\nPRIVMSG #42 :hello\\r\\n',
  },
  'docker-image': {
    title: 'Images and containers',
    definition:
      'An image is a read-only template (built with a Dockerfile). A container is an image that is running, with its own write layer, which is lost when you delete it unless you use a volume.',
    example: 'docker build -t nginx-42 . && docker run -d -p 443:443 nginx-42',
  },
  'docker-vm': {
    title: 'Container versus virtual machine',
    definition:
      'A virtual machine emulates a whole computer, with its own kernel. A container is an isolated process that shares the host kernel: it starts in seconds and takes little space. It lives as long as its main process (PID 1).',
    example: 'CMD ["nginx", "-g", "daemon off;"] keeps nginx in the foreground as PID 1.',
  },
  'docker-compose-net': {
    title: 'docker-compose networks',
    definition:
      'The services in a compose file share a network with internal DNS: each service can be found by its name. Inside a container, localhost is the container itself.',
    example: "In wp-config.php: define('DB_HOST', 'mariadb:3306');",
  },
  'web-https': {
    title: 'HTTPS and TLS',
    definition:
      'HTTPS is HTTP inside a TLS connection: it is encrypted and the server proves who it is with a certificate. It listens on 443 (HTTP, on 80).',
    example: 'In nginx: listen 443 ssl; ssl_protocols TLSv1.2 TLSv1.3;',
  },
  'web-sql-injection': {
    title: 'SQL injection',
    definition:
      'Pasting user text inside a query lets what they type change the query. With parameterized queries, data is always just data.',
    example: "db.query('SELECT * FROM users WHERE name = ?', [name])",
  },
  'web-hash-passwords': {
    title: 'Storing passwords',
    definition:
      'They are never stored as they are, nor encrypted with a key: you store a slow, salted hash (bcrypt, argon2). To check, compute it again and compare.',
    example: 'hash = await bcrypt.hash(password, 12); ok = await bcrypt.compare(intento, hash);',
  },
  'web-websocket': {
    title: 'WebSockets',
    definition:
      'A WebSocket keeps a two-way connection open: the server sends data whenever it wants, without the client asking. Great for real-time games and chats.',
    example:
      'const ws = new WebSocket("wss://…/pong"); ws.onmessage = (e) => dibujar(JSON.parse(e.data));',
  },
  'cpp-class-struct': {
    title: 'class and struct',
    definition:
      'In C++ they are almost the same: both have methods, constructors and inheritance. Only the default changes: in class everything is private and in struct, public.',
    example: 'class Contact { std::string name; }; ← name is private.',
  },
  'cpp-reference': {
    title: 'References',
    definition:
      'A reference is another name for something that already exists: it is initialized when created, cannot be null and cannot be reassigned to something else. They are used to pass without copying.',
    example: 'void subir(int &n) { n++; } int x = 1; subir(x); // x is 2',
  },
  'cpp-const-method': {
    title: 'const methods',
    definition:
      'A method marked const at the end promises not to change the object: inside it you cannot modify attributes, and it is the only kind you can call on a const object.',
    example: 'int getValue() const { return _value; }',
  },
  'cpp-new-delete': {
    title: 'new and delete',
    definition:
      'new creates an object (calling its constructor) and delete destroys it. Whatever you create with new[] is freed with delete[], so the destructor of each element is called.',
    example: 'Zombie *z = new Zombie[5]; … delete[] z;',
  },
  'cpp-canonical': {
    title: 'Orthodox canonical form',
    definition:
      'A class with its own resources defines: default constructor, copy constructor, assignment operator and destructor. The copy constructor is used when creating from another object; operator=, when assigning to one that already exists.',
    example: 'A b(a); // copy. A c; c = a; // operator=',
  },
  'cpp-shallow-copy': {
    title: 'Shallow and deep copy',
    definition:
      'The default copy copies the pointers, not what they point to: two objects share the same memory and free it twice when destroyed. A deep copy allocates its own memory and copies the contents.',
    example:
      'Brain(const Brain &o) { ideas = new std::string[100]; for (…) ideas[i] = o.ideas[i]; }',
  },
  'cpp-virtual': {
    title: 'Virtual methods',
    definition:
      'Without virtual, the method that runs depends on the pointer type; with virtual, on the real object. This is what allows polymorphism: an Animal* that is a Dog barks.',
    example:
      'virtual void makeSound() const; in Animal → a->makeSound() says "Woof" if a is a Dog.',
  },
  'cpp-virtual-destructor': {
    title: 'Virtual destructor',
    definition:
      'If a class is used as a polymorphic base, its destructor must be virtual: otherwise, delete through a base pointer does not call the derived class destructor and memory is left unfreed.',
    example: 'virtual ~Animal();',
  },
  'cpp-abstract': {
    title: 'Abstract classes',
    definition:
      'A class with at least one pure virtual method (= 0) is abstract: you cannot create objects of it, only of derived classes that implement those methods. It works as an interface.',
    example: 'class AMateria { public: virtual AMateria *clone() const = 0; };',
  },
  'cpp-diamond': {
    title: 'Diamond inheritance',
    definition:
      'If two classes inherit from the same base and a fourth inherits from both, it would have two copies of the base. With virtual inheritance, the two share a single one.',
    example:
      'class ScavTrap : virtual public ClapTrap {}; class FragTrap : virtual public ClapTrap {};',
  },
  'cpp-exceptions': {
    title: 'Exceptions',
    definition:
      'throw raises an exception: what was being done stops and, going up the calls, a catch of that type is searched for. Your own exceptions inherit from std::exception and explain the error with what().',
    example:
      'class GradeTooHighException : public std::exception { const char *what() const throw() { return "Grade too high"; } };',
  },
  'cpp-catch-ref': {
    title: 'Catching by reference',
    definition:
      'Catch with catch (const std::exception &e): no copy and no losing the real type. By value it is copied as the base and what() would be the base one (slicing).',
    example:
      'try { b.incrementGrade(); } catch (const std::exception &e) { std::cerr << e.what(); }',
  },
  'cpp-casts': {
    title: 'C++ casts',
    definition:
      'static_cast converts between related types (numbers, pointers in the hierarchy) at compile time. dynamic_cast checks at run time the real type of a polymorphic object. reinterpret_cast reinterprets the bits (pointer ↔ integer). const_cast removes or adds const.',
    example: 'int n = static_cast<int>(3.7); uintptr_t raw = reinterpret_cast<uintptr_t>(ptr);',
  },
  'cpp-dynamic-null': {
    title: 'A dynamic_cast that fails',
    definition:
      'With pointers, a dynamic_cast that does not fit returns NULL; with references (which cannot be null) it throws std::bad_cast. This is how you identify the real type.',
    example:
      'if (dynamic_cast<A *>(p)) std::cout << "A"; try { (void)dynamic_cast<B &>(r); } catch (std::exception &) {}',
  },
  'cpp-templates': {
    title: 'Templates',
    definition:
      'A template is generic code: the compiler generates a version for each type it is used with. That is why it goes entirely in the header: it has to see it to generate it.',
    example: 'template <typename T> void swap(T &a, T &b) { T tmp = a; a = b; b = tmp; }',
  },
  'cpp-containers': {
    title: 'STL containers',
    definition:
      'vector: growing array, access by index. list: doubly linked list. map: tree sorted by key. stack and queue: LIFO and FIFO adapters. deque: fast insertion at both ends.',
    example: 'std::map<std::string, float> rates; rates["2011-01-03"] = 0.3;',
  },
  'cpp-iterator-invalid': {
    title: 'Invalidated iterators',
    definition:
      'Some operations invalidate iterators: in a vector, when it grows and moves (push_back), or when erasing. Using an invalid iterator is undefined behavior.',
    example: 'After v.push_back(x) you have to get it = v.begin() again.',
  },
  'cpp-rpn': {
    title: 'Reverse Polish notation',
    definition:
      'Operators come after their operands. You evaluate it with a stack: each number is pushed and each operator pops two, computes and pushes the result.',
    example: '3 4 + 2 * → 7 2 * → 14. 5 1 2 + 4 * + 3 - → 14.',
  },
  'py-mutable-default': {
    title: 'Mutable default values',
    definition:
      'The default value is created only once, when the function is defined. If it is a list or a dictionary, all calls share the same one. Use None and create it inside.',
    example: 'def add(item, items=None):\\n    if items is None:\\n        items = []',
  },
  'py-is-eq': {
    title: '== and is',
    definition:
      '== compares values; is checks whether they are the same object. For None, True and False, use is.',
    example: '[1] == [1] → True; [1] is [1] → False. if x is None: …',
  },
  'py-copy': {
    title: 'Assigning does not copy',
    definition:
      'In Python, variables are names that point to objects: b = a makes both names point to the same list. For a copy: a.copy(), list(a) or a[:] (and copy.deepcopy if there are lists inside).',
    example: 'a = [1, 2]; b = a; b.append(3) → a is also [1, 2, 3].',
  },
  'py-slicing': {
    title: 'Slicing',
    definition:
      'sequence[start:end:step] takes from start (included) to end (not included) with that step. Negative indexes count from the end and step -1 reverses it.',
    example: '"program"[1:4] → "rog"; "program"[-3:] → "ram"; "program"[::-1] → "margorp".',
  },
  'py-dict-get': {
    title: 'Dictionaries',
    definition:
      'd[key] raises KeyError if it is missing; d.get(key, default) returns the default (or None). `in` tells you whether the key exists.',
    example: 'edades.get("ana", 0) + 1; if "ana" in edades: …',
  },
  'py-comprehension': {
    title: 'Comprehensions',
    definition:
      'A short way to build lists, sets or dictionaries: [expression for x in iterable if condition].',
    example: '[x * x for x in range(5) if x % 2 == 0] → [0, 4, 16]. {k: len(k) for k in nombres}',
  },
  'py-generator': {
    title: 'Generators',
    definition:
      'A function with yield returns a generator: it produces values one at a time, when asked, and pauses at each yield. It does not keep the whole sequence in memory.',
    example:
      'def fib():\\n    a, b = 0, 1\\n    while True:\\n        yield a\\n        a, b = b, a + b',
  },
  'py-exceptions': {
    title: 'try, except, else and finally',
    definition:
      'try tries a block; except catches errors of the type you name; else runs if there was no error; finally always runs, error or not.',
    example: 'try:\\n    n = int(texto)\\nexcept ValueError:\\n    print("not a number")',
  },
  'py-classes': {
    title: 'Classes and self',
    definition:
      '__init__ sets up each new object. self is the object the method is called on: obj.method() is the same as Class.method(obj).',
    example: 'class Planta:\\n    def __init__(self, nombre):\\n        self.nombre = nombre',
  },
  'py-abc': {
    title: 'Abstract classes (ABC)',
    definition:
      'By inheriting from ABC and marking methods with @abstractmethod, Python does not let you create objects of the class while any of them is left unimplemented (TypeError).',
    example: 'class Forma(ABC):\\n    @abstractmethod\\n    def area(self) -> float: ...',
  },
  'py-typing': {
    title: 'Type annotations',
    definition:
      'Annotations (x: int, -> str) document the types, but Python does not check them at run time. Tools like mypy check them, before running.',
    example: 'def saluda(nombre: str) -> str: … ; mypy programa.py warns you if you pass an int.',
  },
  'py-scope': {
    title: 'Variable scope',
    definition:
      'Assigning to a name inside a function makes it local throughout the whole function. To change a global variable you need global (or nonlocal for the one in the outer function).',
    example: 'def inc():\\n    global count\\n    count += 1',
  },
  'py-venv': {
    title: 'Virtual environments',
    definition:
      'A venv is a folder with its own Python and its own packages, separate from the system. requirements.txt lists the dependencies so you can install the same ones anywhere.',
    example:
      'python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt',
  },
  'py-main-guard': {
    title: 'if __name__ == "__main__"',
    definition:
      'When you run a file, __name__ is "__main__"; when you import it, it is the module name. The if holds the code that should run only when the file is executed, not when it is imported.',
    example: 'if __name__ == "__main__":\\n    main()',
  },
  'py-json': {
    title: 'JSON',
    definition:
      'JSON is text with objects, lists, strings, numbers, true, false and null. Keys and strings go in double quotes and trailing commas are not allowed. In Python: json.loads reads and json.dumps writes.',
    example: 'json.loads(\'{"name": "fn_add", "args": [1, 2]}\')["args"] → [1, 2]',
  },
  'llm-tokens': {
    title: 'Tokens and constrained decoding',
    definition:
      'A language model generates text token by token, choosing each one by probabilities. If at each step you only allow tokens that keep a format (for example valid JSON), the output always follows the format.',
    example: 'After {"name": the tokens that do not start a string are removed.',
  },
  'llm-function-calling': {
    title: 'Function calling',
    definition:
      'The model does not run anything: it chooses which function to call and with which arguments (usually in JSON), and your program runs it and gives the result back.',
    example: 'Question "What is 2 + 3?" → {"name": "add", "parameters": {"a": 2, "b": 3}}.',
  },
}
