/** Banco de Not-games en inglés: redes, servidores y web (`../network.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const NETWORK_EN: Readonly<Record<string, ConceptText>> = {
  'net-mask-hosts': {
    forms: [
      {
        ask: [
          'How many host addresses fit in a /24 network?',
          'How many hosts does the mask 255.255.255.0 leave room for?',
        ],
        right: ['254'],
        wrong: ['256', '255', '24', '128'],
      },
      {
        ask: [
          'How many host addresses fit in a /30 network?',
          'How many hosts does the mask 255.255.255.252 leave room for?',
        ],
        right: ['2'],
        wrong: ['4', '30', '1', '3'],
      },
    ],
    wrong: ['256', '255', '24', '128', '512'],
    why: '32 - n bits are left for hosts: 2^(32-n) addresses, minus the network address and the broadcast one.',
  },
  'net-mask-dotted': {
    forms: [
      {
        ask: ['Which mask is /26?', 'How is /26 written with dots?'],
        right: ['255.255.255.192'],
        wrong: ['255.255.255.128', '255.255.255.224', '255.255.255.26', '255.255.255.0'],
      },
      {
        ask: ['Which mask is /16?', 'How is /16 written with dots?'],
        right: ['255.255.0.0'],
        wrong: ['255.0.0.0', '255.255.255.0', '255.255.16.0'],
      },
    ],
    wrong: ['255.255.255.128', '255.255.255.224', '255.255.255.0'],
    why: 'It is n ones in a row: /26 = 24 + 2 bits in the last byte = 11000000 = 192.',
  },
  'net-same-network': {
    forms: [
      {
        ask: [
          'Are 192.168.1.10/25 and 192.168.1.200/25 on the same network?',
          'With a /25 mask, can 192.168.1.10 and 192.168.1.200 talk directly?',
        ],
        right: ['No: /25 cuts the last byte into 0–127 and 128–255', 'No: each falls in one half'],
        wrong: [
          'Yes: the first three bytes are the same',
          'Yes, but only through a router',
          'It depends on the gateway they have',
          'You cannot tell without the MAC',
        ],
      },
      {
        ask: [
          'Are 10.0.0.5/24 and 10.0.0.250/24 on the same network?',
          'With a /24 mask, can 10.0.0.5 and 10.0.0.250 talk directly?',
        ],
        right: ['Yes: they share the first three bytes', 'Yes: both are 10.0.0.x'],
        wrong: [
          'No: /24 splits the last byte into two halves',
          'No: 250 is outside the host range',
          'Only through a router',
          'You cannot tell without the MAC',
        ],
      },
    ],
    wrong: [
      'Only through a router',
      'It depends on the gateway they have',
      'You cannot tell without the MAC',
    ],
    why: 'Same network = same bits in the mask part. With /25, the top bit of the last byte counts.',
  },
  'net-private': {
    forms: [
      {
        ask: [
          'Which of these addresses is private (does not go out to the Internet as it is)?',
          'Which of these is a private local network address?',
        ],
        right: ['192.168.0.10', '10.1.2.3', '172.16.5.4'],
        wrong: ['8.8.8.8', '1.1.1.1', '80.58.61.250', '142.250.1.1'],
      },
      {
        ask: ['What does the address 127.0.0.1 point to?', 'Who gets what you send to 127.0.0.1?'],
        right: ['The machine itself', 'The same host that sends it'],
        wrong: [
          'The gateway',
          "Google's DNS",
          'Every host on the network',
          'The first router on the network',
        ],
      },
    ],
    wrong: ['8.8.8.8', '1.1.1.1', '80.58.61.250'],
    why: '10/8, 172.16/12 and 192.168/16 are private; 127.0.0.1 is you.',
  },
  'net-gateway': {
    forms: [
      {
        ask: ['What is the gateway for?', 'What role does the gateway of a network play?'],
        right: [
          'It takes what goes to other networks and forwards it',
          'It is the way out of the local network to the others',
        ],
        wrong: [
          'It translates domain names into IPs',
          'It hands out an IP address to each host',
          'It encrypts the traffic leaving the network',
          'It gives a name to each host on the network',
        ],
      },
      {
        ask: [
          'Which destinations does the route 0.0.0.0/0 apply to?',
          'Which destinations does a 0.0.0.0/0 route lead to?',
        ],
        right: ['All those that match no other route'],
        wrong: [
          'None: it is a disabled route',
          'Only the hosts on the local network',
          'Only the machine itself, like 127.0.0.1',
        ],
      },
    ],
    wrong: [
      'It translates domain names into IPs',
      'It hands out an IP address to each host',
      'It encrypts the traffic leaving the network',
    ],
    why: 'What is not on your network goes to the router (gateway); 0.0.0.0/0 matches everything, so it is the default route.',
  },
  'net-tcp-udp': {
    forms: [
      {
        ask: ['What does TCP guarantee that UDP does not?', 'What does TCP give, unlike UDP?'],
        right: ['That it all arrives, in order, with no duplicates', 'Reliable, ordered delivery'],
        wrong: [
          'That it is faster because it never waits',
          'That it is encrypted end to end',
          'That it reaches every host on the network',
          'That you do not need to open any port',
        ],
      },
      {
        ask: ['Which transport protocol does HTTP/1.1 use?', 'What does HTTP/1.1 travel over?'],
        right: ['TCP'],
        wrong: ['UDP', 'ICMP', 'ARP'],
      },
    ],
    wrong: [
      'That it is faster because it never waits',
      'That it is encrypted end to end',
      'That you do not need to open any port',
    ],
    why: 'TCP numbers, acknowledges and resends; UDP sends and forgets.',
  },
  'net-dns': {
    forms: [
      {
        ask: ['What does DNS do?', 'What is DNS for?'],
        right: ['It turns names into IP addresses'],
        wrong: [
          'It hands out IP addresses',
          'It encrypts the connection to the server',
          'It routes the packets',
          'It keeps a copy of the web pages',
        ],
      },
      {
        ask: ['When you type a name like intra.42.fr, which system turns it into an IP?'],
        right: ['DNS'],
        wrong: ['DHCP', 'NAT', 'ARP'],
      },
    ],
    wrong: [
      'It hands out IP addresses',
      'It encrypts the connection to the server',
      'It routes the packets',
    ],
    why: 'DNS is the address book of the Internet: from name to address.',
  },
  'srv-socket-steps': {
    forms: [
      {
        ask: [
          'In which order does a TCP server set up its socket?',
          'Which steps do you take to start accepting connections?',
        ],
        right: ['socket, bind, listen, accept'],
        wrong: [
          'socket, listen, bind, accept',
          'bind, socket, accept, listen',
          'socket, connect, listen, accept',
          'listen, socket, bind, accept',
        ],
      },
      {
        ask: [
          'What does `accept` return?',
          'Each time it accepts a connection, what does accept return?',
        ],
        right: ['A new descriptor for that client', 'A new socket, just for that connection'],
        wrong: [
          'The same listening socket',
          'The port the client comes from',
          'The number of connected clients',
        ],
      },
    ],
    wrong: [
      'socket, listen, bind, accept',
      'bind, socket, accept, listen',
      'listen, socket, bind, accept',
    ],
    why: 'It is created, bound to a port, set to listen, and connections are accepted, each with its own descriptor.',
  },
  'srv-poll': {
    forms: [
      {
        ask: [
          'What is `poll` (or select, epoll, kqueue) for in a server?',
          'What does poll let a server do?',
        ],
        right: [
          'Know which descriptors are ready without blocking',
          'Serve many clients with a single thread',
        ],
        wrong: [
          'Create a new thread for each client',
          'Encrypt the connection of each client',
          'Resolve the name of each client',
          'Measure how long each response takes',
        ],
      },
      {
        ask: [
          'What happens when you `read` a blocking socket that has nothing?',
          'Without asking poll, you read an empty blocking socket. What happens?',
        ],
        right: [
          'It blocks and the other clients are left waiting',
          'The whole server stops until something arrives',
        ],
        wrong: [
          'It returns 0 and moves on to the next client',
          'It closes the connection with that client',
          'It returns -1 and goes on with the other clients',
          'It reads what was left in the old buffer',
        ],
      },
    ],
    wrong: [
      'Create a new thread for each client',
      'Encrypt the connection of each client',
      'Resolve the name of each client',
    ],
    why: 'With a single loop and poll, the server only reads or writes where it will not block.',
  },
  'srv-partial': {
    forms: [
      {
        ask: [
          'A client sends «PRIVMSG #42 :hello\\r\\n», but `recv` only gives you «PRIVMSG #4». What do you do?',
          'recv returns half a message. What should the server do?',
        ],
        right: [
          "Keep it in that client's buffer until the end of line",
          'Pile it up until there is a full line, then process it',
        ],
      },
    ],
    wrong: [
      'Reject it: it is malformed and you must warn',
      'Process it as it is and drop what comes later',
      'Close the connection because the client failed',
      'Wait with sleep for the rest to arrive',
    ],
    why: 'TCP is a stream of bytes, not of messages: the cuts do not match your lines.',
  },
  'http-status': {
    forms: [
      {
        ask: [
          'Which HTTP code means «not found»?',
          'Which code does a page that does not exist answer with?',
        ],
        right: ['404'],
        wrong: ['200', '301', '500', '403'],
      },
      {
        ask: [
          'Which HTTP code means «method not allowed»?',
          'Which code does a DELETE get where only GET is accepted?',
        ],
        right: ['405'],
        wrong: ['404', '403', '500', '400'],
      },
      {
        ask: [
          'Which family of HTTP codes means a server error?',
          'If the fault is the server’s, which family is the code from?',
        ],
        right: ['5xx'],
        wrong: ['4xx', '3xx', '2xx'],
      },
    ],
    wrong: ['200', '301', '500', '403', '201'],
    why: '2xx is fine, 3xx redirects, 4xx is a client error (404 not there, 405 method not allowed) and 5xx, a server one.',
  },
  'http-methods': {
    forms: [
      {
        ask: [
          'Which HTTP method should not change anything on the server?',
          'Which HTTP method is only for asking, without changing anything?',
        ],
        right: ['GET'],
        wrong: ['POST', 'DELETE', 'PUT', 'PATCH'],
      },
      {
        ask: [
          'Which header gives the size in bytes of the request body?',
          'Which header carries the size of the body?',
        ],
        right: ['Content-Length'],
        wrong: ['Content-Type', 'Content-Encoding', 'Host', 'Accept'],
      },
    ],
    wrong: ['POST', 'DELETE', 'PUT', 'PATCH'],
    why: 'GET only asks; POST, PUT, PATCH and DELETE change things. Content-Length (or chunked) says where the body ends.',
  },
  'http-chunked': {
    forms: [
      {
        ask: [
          'A request comes with `Transfer-Encoding: chunked`. How do you know where the body ends?',
          'With chunked there is no Content-Length. When does the body end?',
        ],
        right: ['When a chunk of size 0 arrives', 'With the chunk «0» and an empty line'],
      },
    ],
    wrong: [
      'When the client closes the connection',
      'When it reaches 1024 bytes',
      'At the first \\r\\n that arrives',
      'Never: you have to wait for the timeout',
    ],
    why: 'Each chunk is preceded by its size in hexadecimal; the one of size 0 marks the end.',
  },
  'http-cgi': {
    forms: [
      {
        ask: [
          'What does the server do when a request goes to a CGI?',
          'With a CGI, how does the server get the response?',
        ],
        right: [
          'It runs a program and sends back what it writes',
          'It launches a program that builds the response',
        ],
      },
    ],
    wrong: [
      'It keeps the page in a cache and serves it',
      'It adds a special header to the page',
      'It encrypts the response before sending it',
      'It spreads the load across several servers',
    ],
    why: 'The server launches the program (fork + execve) with the request in environment variables and on its input, and sends its output.',
  },
  'irc-basics': {
    forms: [
      {
        ask: [
          'Which IRC command makes you a member of a channel?',
          'Which command do you send to get into #42?',
        ],
        right: ['JOIN'],
        wrong: ['ENTER', 'PRIVMSG', 'NICK', 'CONNECT'],
      },
      {
        ask: ['How does each message end in the IRC protocol?', 'What do IRC lines end with?'],
        right: ['\\r\\n'],
        wrong: ['\\n alone', '\\0', ';'],
      },
    ],
    wrong: ['ENTER', 'PRIVMSG', 'NICK', 'CONNECT'],
    why: 'IRC is text in lines ended with CRLF; JOIN joins, PRIVMSG talks and NICK sets the name.',
  },
  'docker-image': {
    forms: [
      {
        ask: [
          'What is the difference between a Docker image and a container?',
          'How is a container related to its image?',
        ],
        right: [
          'The image is the template; the container, a live copy',
          'The container is the image, up and running',
        ],
        wrong: [
          'They are the same thing with two names',
          'The container is a full virtual machine',
          'The image is a container that has stopped',
          'The container is the compiled Dockerfile',
        ],
      },
      {
        ask: [
          'What happens to what was written inside a container without a volume when you delete it?',
          'Without a volume, what happens to its data when you delete the container?',
        ],
        right: ['It is lost with it'],
        wrong: [
          'It is saved in the image',
          'It goes to the next container',
          'It is uploaded to Docker Hub',
        ],
      },
    ],
    wrong: [
      'They are the same thing with two names',
      'The image is a container that has stopped',
      'The container is the compiled Dockerfile',
    ],
    why: 'The image does not change; each container adds its own writable layer, which goes away with it unless there is a volume.',
  },
  'docker-vm': {
    forms: [
      {
        ask: [
          'How is a container different from a virtual machine?',
          'What makes a container lighter than a virtual machine?',
        ],
        right: ["It uses the host's kernel, not one of its own"],
        wrong: [
          'It is always safer than a VM',
          'It emulates all of the hardware',
          'It only works on Linux with a desktop',
          'It has its own, smaller kernel',
        ],
      },
      {
        ask: [
          'Why is `tail -f /dev/null` not acceptable as the main process of a container?',
          'What is wrong with keeping a container alive with an endless loop as PID 1?',
        ],
        right: [
          'It is a hack: the service must run in the foreground',
          'The real service is not the main process',
        ],
        wrong: [
          'It burns a lot of CPU looping for nothing',
          '/dev/null does not exist inside the container',
          'The container stops right after starting',
        ],
      },
    ],
    wrong: [
      'It is always safer than a VM',
      'It emulates all of the hardware',
      'It has its own, smaller kernel',
    ],
    why: 'A container is an isolated process on the same kernel; it lives as long as its main process does.',
  },
  'docker-compose-net': {
    forms: [
      {
        ask: [
          'In docker-compose, WordPress has to talk to the database service (MariaDB). What does it put as the host?',
          'Two services on the same compose network. Which address does one use to reach the other?',
        ],
        right: [
          'The service name, which compose resolves',
          'The name the service has in the compose',
        ],
      },
    ],
    wrong: [
      'localhost, as on your own machine',
      'The address 127.0.0.1 of the host',
      'The public IP of the machine',
      'The address 0.0.0.0, which reaches everyone',
    ],
    why: 'Each container has its own localhost; compose provides an internal DNS where each service is reached by its name.',
  },
  'web-https': {
    forms: [
      {
        ask: [
          'What does HTTPS add to HTTP?',
          'What does a site gain by moving from HTTP to HTTPS?',
        ],
        right: [
          'It encrypts with TLS and proves who the server is',
          'It wraps HTTP in a connection encrypted with TLS',
        ],
        wrong: [
          'It compresses the pages so they weigh less',
          'It makes the site load faster',
          'It stores the passwords on the server',
          'It blocks the ads and the trackers',
        ],
      },
      {
        ask: ['On which port does HTTPS listen by default?', 'What is the HTTPS port?'],
        right: ['443'],
        wrong: ['80', '8080', '22'],
      },
    ],
    wrong: [
      'It compresses the pages so they weigh less',
      'It makes the site load faster',
      'It stores the passwords on the server',
    ],
    why: 'HTTPS is HTTP inside TLS: encryption plus the server certificate. 80 is HTTP; 443, HTTPS.',
  },
  'web-sql-injection': {
    forms: [
      {
        ask: ['What is wrong with this query?', 'What is the flaw in building the query this way?'],
        right: [
          'SQL injection: the name can rewrite the query',
          'Whoever types the name can get every row',
        ],
      },
    ],
    wrong: [
      'That it is slow because it uses no index',
      'That a semicolon is missing at the end',
      'That it returns nothing if the name has accents',
      'That it works with MySQL but not with PostgreSQL',
    ],
    why: 'Pasting user text into the SQL lets them rewrite it; parameters always treat it as data.',
  },
  'web-hash-passwords': {
    forms: [
      {
        ask: ['How should passwords be stored?', 'How is a password stored in the database?'],
        right: [
          'With a slow, salted hash like bcrypt or argon2',
          'With bcrypt or argon2, never as is',
        ],
        wrong: [
          'In plain text, in a separate table',
          'Encrypted with a key written in the code',
          'With MD5, which is quick to compute',
          'In base64, so it cannot be read at a glance',
        ],
      },
      {
        ask: [
          'Why is salt added to a password before hashing it?',
          'What do you gain by salting the hash of each password?',
        ],
        right: [
          'Two equal passwords give different hashes',
          'Precomputed hash tables become useless',
        ],
        wrong: [
          'It can be decrypted if the user forgets it',
          'The hash takes less space in the database',
          'It ends up encrypted with a server key',
        ],
      },
    ],
    wrong: [
      'In plain text, in a separate table',
      'With MD5, which is quick to compute',
      'In base64, so it cannot be read at a glance',
    ],
    why: 'A slow, salted hash cannot be undone or tried in bulk; base64 or MD5 do not protect anything.',
  },
  'web-websocket': {
    forms: [
      {
        ask: ['Why use WebSockets for a browser game?', 'What does a WebSocket allow?'],
        right: [
          'The server can send data nobody asked for',
          'A connection that stays open both ways',
        ],
      },
    ],
    wrong: [
      'Encrypting better than HTTPS, with no certificate',
      'Data taking less space than in HTTP',
      'Going without TCP, so nothing is ever lost',
      'Storing the game data in the browser',
    ],
    why: 'HTTP is question and answer; the WebSocket keeps the connection open to send at any time.',
  },
  'np-net-broadcast': {
    forms: [
      {
        ask: [
          'What is the broadcast address of 192.168.10.77/26?',
          'A host has 192.168.10.77/26. What is the broadcast of its network?',
        ],
        right: ['192.168.10.127'],
        wrong: ['192.168.10.255', '192.168.10.63', '192.168.10.128', '192.168.10.191'],
      },
      {
        ask: [
          'What is the network address of 192.168.10.77/26?',
          'A host has 192.168.10.77/26. Which network is it on?',
        ],
        right: ['192.168.10.64'],
        wrong: ['192.168.10.0', '192.168.10.76', '192.168.10.65', '192.168.10.128'],
      },
    ],
    wrong: ['192.168.10.255', '192.168.10.0', '192.168.10.128'],
    why: '/26 makes blocks of 64 in the last byte (0, 64, 128, 192): 77 falls in 64–127, so the network is .64 and the broadcast, .127.',
  },
  'np-host-range': {
    forms: [
      {
        ask: [
          'On the network 172.16.0.32/28, what is the last IP a host can have?',
          'What is the highest host IP in 172.16.0.32/28?',
        ],
        right: ['172.16.0.46'],
        wrong: ['172.16.0.47', '172.16.0.48', '172.16.0.62', '172.16.0.63'],
      },
      {
        ask: [
          'Which of these IPs can a host on the network 172.16.0.32/28 have?',
          'Which address is valid for a host in 172.16.0.32/28?',
        ],
        right: ['172.16.0.33', '172.16.0.40', '172.16.0.45'],
        wrong: ['172.16.0.47', '172.16.0.48', '172.16.0.31', '172.16.0.50'],
      },
    ],
    wrong: ['172.16.0.47', '172.16.0.48', '172.16.0.31'],
    why: '/28 makes blocks of 16: from .32 to .47; the first is the network and the last the broadcast, so hosts go from .33 to .46.',
  },
  'np-next-hop': {
    forms: [
      {
        ask: [
          'In a routing table, what is the next hop?',
          'What does the next hop of a route say?',
        ],
        right: [
          'The IP of the router the packet is handed to',
          'The neighbouring router that gets the packet',
        ],
        wrong: [
          'The IP of the final destination of the packet',
          'The last network the packet goes through',
          'The hops it has left to the destination',
          'The mask of the destination network',
        ],
      },
      {
        ask: [
          'What must the next hop of a route meet for it to work?',
          'Where must the next hop you put in a route be?',
        ],
        right: [
          'On a network the host reaches directly',
          'On the same network as one of the host’s interfaces',
        ],
        wrong: [
          'On the same network as the final destination',
          'On a public network, never a private one',
          'On any network, if the router knows it',
          'It must end in .1, like every router',
        ],
      },
    ],
    wrong: [
      'The IP of the final destination of the packet',
      'The last network the packet goes through',
      'The hops it has left to the destination',
    ],
    why: 'The next hop is who gets the packet: it must be on one of your networks, because you can only hand it over without another router in between.',
  },
  'np-router-interfaces': {
    forms: [
      {
        ask: [
          'Can two interfaces of the same router be on the same network?',
          'A router has two interfaces. Can you put them on the same subnet?',
        ],
        right: [
          'No: each interface goes to a different network',
          'No: the router would not know which one to use',
        ],
        wrong: [
          'Yes, if both have the same mask',
          'Yes: that way the router balances the load',
          'Only if the two IPs are consecutive',
          'Yes, if one of them is the gateway',
        ],
      },
      {
        ask: [
          'A router joins 10.0.1.0/24 and 10.0.2.0/24. Which IP can its interface on the second network have?',
          'One interface of a router faces 10.0.2.0/24 and the other, 10.0.1.0/24. Which IP do you give the first one?',
        ],
        right: ['10.0.2.1', '10.0.2.254'],
        wrong: ['10.0.1.1', '10.0.2.0', '10.0.2.255', '10.0.3.1'],
      },
    ],
    wrong: [
      'Yes, if both have the same mask',
      'Yes: that way the router balances the load',
      'Only if the two IPs are consecutive',
    ],
    why: 'A router joins different networks: each interface is the door of one network, and with two on the same one it would not know where to send the packet.',
  },
  'ws-config': {
    forms: [
      {
        ask: [
          'A request body goes over client_max_body_size. Which code is the answer?',
          'Which HTTP code does NGINX return if the body goes over the configured limit?',
        ],
        right: ['413'],
        wrong: ['400', '403', '411', '500'],
      },
      {
        ask: [
          'In NGINX, which directive shows the list of files of a directory with no index?',
          'Which NGINX directive turns on directory listing?',
        ],
        right: ['`autoindex on`'],
        wrong: ['`index on`', '`listing on`', '`root on`', '`dirlist on`'],
      },
      {
        ask: [
          'In NGINX, which directive picks the page sent with a 404?',
          'Which NGINX directive sets your own custom 404 page?',
        ],
        right: ['`error_page`'],
        wrong: ['`error_log`', '`return`', '`default_page`', '`try_files`'],
      },
      {
        ask: [
          'In NGINX, which directive says which port a server block uses?',
          'Which directive puts an NGINX server block on port 8080?',
        ],
        right: ['`listen`'],
        wrong: ['`server_name`', '`port`', '`bind`', '`root`'],
      },
    ],
    wrong: ['`server_name`', '`location`', '`index`'],
    why: '413 is «content too large»; autoindex lists the directory, error_page sets your error pages and listen, the port.',
  },
  'ws-poll-only': {
    forms: [
      {
        ask: [
          'How many poll calls (or equivalent) can webserv use for all its I/O?',
          'In webserv, how many poll calls serve the clients and the listening sockets?',
        ],
        right: ['One for everything, listening included'],
        wrong: [
          'One for each connected client',
          'One for each port it listens on',
          'None: each client runs in a thread',
          'Two: one to read and one to write',
        ],
      },
      {
        ask: [
          'In webserv, when can you read or write on a socket?',
          'What has to happen before reading or writing on a webserv socket?',
        ],
        right: ['Poll must have marked it ready', 'Only when poll says it is ready'],
        wrong: [
          'Nothing, if the socket is non-blocking',
          'errno must be EAGAIN',
          'Nothing: a short timeout is enough',
          'The client must have closed its side',
        ],
      },
      {
        ask: [
          'After a read or a write on a socket, what does the webserv subject forbid?',
          'What can you not do in webserv after a read or a write?',
        ],
        right: ['Check errno to decide what to do'],
        wrong: [
          'Call poll again in the loop',
          'Close the socket if read returns 0',
          "Keep what was read in the client's buffer",
        ],
      },
    ],
    wrong: [
      'One for each connected client',
      'One for each port it listens on',
      'None: each client runs in a thread',
    ],
    why: 'A single poll watches both the listening sockets and the client ones at once, and you only read or write where it says you can.',
  },
  'ws-redirect': {
    forms: [
      {
        ask: [
          'Which HTTP code is a permanent redirect?',
          'A page has moved for good. Which code do you answer with?',
        ],
        right: ['301'],
        wrong: ['302', '307', '304', '404'],
      },
      {
        ask: [
          'In a 301 response, which header carries the new address?',
          'In which header of a redirect does the target go?',
        ],
        right: ['Location'],
        wrong: ['Referer', 'Host', 'Redirect', 'Origin'],
      },
    ],
    wrong: ['302', '307', '304'],
    why: '301 is «moved permanently» (302 and 307 are temporary) and the browser goes to the address in the Location header.',
  },
  'ws-upload': {
    forms: [
      {
        ask: [
          'An HTML form uploads a file with POST. Which Content-Type does the request carry?',
          'What kind of body does the browser send when uploading a file from a form?',
        ],
        right: ['`multipart/form-data`'],
        wrong: [
          '`application/json`',
          '`text/plain`',
          '`application/x-www-form-urlencoded`',
          '`application/octet-stream`',
        ],
      },
      {
        ask: [
          'In a multipart body, how do you know where each part ends?',
          'How does multipart/form-data separate the parts of the body?',
        ],
        right: [
          'With the boundary the Content-Type announces',
          'With a delimiter given in the header',
        ],
        wrong: [
          'With an empty line between each part',
          'With the Content-Length of each part',
          'With a chunk of size 0 between parts',
          'Each part comes in a separate request',
        ],
      },
    ],
    wrong: ['`application/json`', '`text/plain`', '`application/x-www-form-urlencoded`'],
    why: 'A form with files goes as multipart/form-data: the parts are split by the boundary the Content-Type announces.',
  },
  'irc-register': {
    forms: [
      {
        ask: [
          'Which commands does a client send to register with the server?',
          'When connecting to your ft_irc, what must the client send first of all?',
        ],
        right: ['PASS, NICK and USER'],
        wrong: [
          'LOGIN, NICK and JOIN',
          'PASS, JOIN and USER',
          'AUTH, NICK and USER',
          'NICK, JOIN and PRIVMSG',
        ],
      },
      {
        ask: [
          'When registering, which command carries the server password?',
          'With which command does the client give the password of your ft_irc?',
        ],
        right: ['PASS'],
        wrong: ['AUTH', 'LOGIN', 'USER', 'OPER'],
      },
    ],
    wrong: ['LOGIN, NICK and JOIN', 'PASS, JOIN and USER', 'AUTH, NICK and USER'],
    why: 'PASS gives the server password, NICK the nickname and USER the user name: until then the client is not registered.',
  },
  'irc-modes': {
    forms: [
      {
        ask: [
          'Which channel mode lets people in only if they are invited?',
          'Which mode closes a channel to anyone not invited?',
        ],
        right: ['+i'],
        wrong: ['+t', '+k', '+o', '+l'],
      },
      {
        ask: [
          'Which channel mode sets a password to get in?',
          'Which mode makes a channel ask for a key on the way in?',
        ],
        right: ['+k'],
        wrong: ['+i', '+p', '+l', '+o'],
      },
      {
        ask: ['What does mode +l do on a channel?', 'If you set +l on a channel, what changes?'],
        right: ['It caps the number of users in the channel'],
        wrong: [
          'Only the channel operators can speak',
          'It locks the topic for non-operators',
          'It keeps a log of everything said',
        ],
      },
      {
        ask: ['What does mode +t do on a channel?', 'If you set +t on a channel, what changes?'],
        right: ['Only operators can change the topic'],
        wrong: [
          'Only operators are allowed to speak',
          'The channel closes after a while',
          'You can only get in with an invitation',
        ],
      },
    ],
    wrong: ['+m', '+s', '+b'],
    why: '+i is invite-only, +t leaves the topic to operators, +k asks for a key, +o makes an operator and +l caps the users.',
  },
  'irc-operator': {
    forms: [
      {
        ask: [
          'Which operator command throws someone out of a channel?',
          'With which command does an operator remove a user from the channel?',
        ],
        right: ['KICK'],
        wrong: ['BAN', 'PART', 'REMOVE', 'QUIT'],
      },
      {
        ask: [
          'Which operator command lets someone into a +i channel?',
          'The channel is closed to outsiders. Which command does the operator use to let someone in?',
        ],
        right: ['INVITE'],
        wrong: ['JOIN', 'ALLOW', 'KNOCK', 'ADD'],
      },
      {
        ask: [
          'Which command shows or changes what a channel is about?',
          'With which command do you set the subject line of a channel?',
        ],
        right: ['TOPIC'],
        wrong: ['TITLE', 'INFO', 'NAMES', 'MOTD'],
      },
      {
        ask: [
          'With which command does an operator give +o to another user?',
          'Which command changes the modes of a channel?',
        ],
        right: ['MODE'],
        wrong: ['OPER', 'OP', 'GRANT', 'SET'],
      },
    ],
    wrong: ['BAN', 'GRANT', 'ALLOW'],
    why: 'Channel operators have KICK to throw out, INVITE to invite, TOPIC for the topic and MODE for the modes.',
  },
  'irc-privmsg': {
    forms: [
      {
        ask: [
          'How do you send «hi» privately to the nick pepe?',
          'Which line sends a message only to pepe?',
        ],
        right: ['`PRIVMSG pepe :hi`'],
        wrong: ['`PRIVMSG #pepe :hi`', '`MSG pepe hi`', '`SEND pepe :hi`', '`PRIVMSG :pepe hi`'],
      },
      {
        ask: [
          'How do you send «hi» to everyone in the channel #42?',
          'Which line sends a message to the whole #42 channel?',
        ],
        right: ['`PRIVMSG #42 :hi`'],
        wrong: ['`PRIVMSG 42 :hi`', '`JOIN #42 :hi`', '`SAY #42 :hi`', '`PRIVMSG :#42 hi`'],
      },
    ],
    wrong: ['`MSG pepe hi`', '`SEND pepe :hi`', '`SAY #42 :hi`'],
    why: 'PRIVMSG goes to a nick or to a channel (with #), and the text goes after the colon.',
  },
  'irc-server-rules': {
    forms: [
      {
        ask: [
          'In ft_irc, can you use fork to serve each client?',
          'Is a child process per client fine in ft_irc?',
        ],
        right: ['No: it all runs in one process, with one poll'],
        wrong: [
          'Yes: one child process for each client',
          'Yes, if the children share the socket',
          'Only for the users who are not operators',
        ],
      },
      {
        ask: [
          'With nc you send «com», ^D, «man», ^D and «d» with Enter. What should the server do?',
          'You test with nc, splitting a command with ^D. What must ft_irc do?',
        ],
        right: ['Join the pieces and process the whole command'],
        wrong: [
          'Process each piece as a separate command',
          'Close the connection at the first ^D',
          'Drop what came before the last ^D',
        ],
      },
    ],
    wrong: [
      'Yes: one child process for each client',
      'Process each piece as a separate command',
      'Close the connection at the first ^D',
    ],
    why: 'The subject forbids fork and asks for a single poll; and since ^D sends half a message, you pile up until the end of line.',
  },
  'inc-one-service': {
    forms: [
      {
        ask: [
          'How many services does each container run in Inception?',
          'In Inception, how many services go in the same container?',
        ],
        right: ['One: each service in its own container'],
        wrong: [
          'All in one, with supervisord',
          'Two: WordPress next to MariaDB',
          'As many as you like if they share a network',
        ],
      },
      {
        ask: [
          'In Inception, which container does php-fpm go in?',
          'Where is php-fpm installed in Inception?',
        ],
        right: ["WordPress's, without NGINX"],
        wrong: [
          "NGINX's, which runs it",
          "MariaDB's, next to the database",
          'One of its own, apart from WordPress',
        ],
      },
      {
        ask: [
          'What must Inception containers do if they crash?',
          'An Inception container crashes. What should happen?',
        ],
        right: ['Start again on their own, with restart'],
        wrong: [
          'Stay stopped until you check on them',
          'Delete themselves and pull the image again',
          'Stop all the other containers too',
        ],
      },
    ],
    wrong: [
      'All in one, with supervisord',
      'Two: WordPress next to MariaDB',
      'As many as you like if they share a network',
    ],
    why: 'NGINX, WordPress with php-fpm and MariaDB each go in their own container, and they restart on their own if they crash.',
  },
  'inc-nginx-tls': {
    forms: [
      {
        ask: [
          'Through which port does traffic enter the Inception infrastructure?',
          'In Inception, which port is open to the outside?',
        ],
        right: ['443'],
        wrong: ['80', '8080', '3306', '9000'],
      },
      {
        ask: [
          'Which TLS versions can NGINX accept in Inception?',
          'In Inception, which protocols does NGINX encrypt with?',
        ],
        right: ['TLSv1.2 or TLSv1.3'],
        wrong: ['Any, SSLv3 included', 'Only TLSv1.0 and TLSv1.1', 'TLSv1.1 or TLSv1.2'],
      },
      {
        ask: [
          'Which container is the only way into Inception from outside?',
          'In Inception, which service gets every connection from outside?',
        ],
        right: ['NGINX'],
        wrong: ['WordPress', 'MariaDB', 'php-fpm', 'Adminer'],
      },
    ],
    wrong: ['80', '8080', '3306'],
    why: 'NGINX is the only door: only through 443 and only with TLSv1.2 or TLSv1.3.',
  },
  'inc-volumes': {
    forms: [
      {
        ask: [
          'In which folder of the host do the Inception volumes go?',
          'In Inception, where on the machine is the volume data kept?',
        ],
        right: ['`/home/login/data`'],
        wrong: ['`/var/lib/docker/volumes`', '`/srv/data`', '`/home/login/volumes`', '`/tmp/data`'],
      },
      {
        ask: ['Which volumes does Inception ask for?', 'What data do the Inception volumes keep?'],
        right: ['The WordPress database and the site files'],
        wrong: [
          'The NGINX certificates and its logs',
          'The logs of each service and its cache',
          'The already built images of each service',
        ],
      },
    ],
    wrong: ['`/var/lib/docker/volumes`', '`/srv/data`', '`/tmp/data`'],
    why: 'One volume keeps the WordPress database and another the site files, both in /home/login/data on the host.',
  },
  'inc-rules': {
    forms: [
      {
        ask: [
          'Which image can your Dockerfiles start from in Inception?',
          'In Inception, what do you put in the FROM of your Dockerfiles?',
        ],
        right: ['Alpine or Debian, nothing else'],
        wrong: [
          'The official nginx image',
          'Any image that is on Docker Hub',
          'The ready-made WordPress one',
        ],
      },
      {
        ask: [
          'Where do the passwords go in Inception?',
          'In Inception, where do you keep the MariaDB password?',
        ],
        right: ['In the .env or in secrets, not in the Dockerfile'],
        wrong: [
          'In the Dockerfile, with ENV, to have it at hand',
          'In docker-compose.yml, written as it is',
          'In the git repository, in a separate file',
        ],
      },
      {
        ask: [
          'What does Inception forbid for connecting the containers?',
          'In Inception, what can you not use to join containers?',
        ],
        right: ['`network: host` and `--link`'],
        wrong: [
          '`networks:` in the compose file',
          '`depends_on` and `restart`',
          '`expose` and `ports`',
        ],
      },
      {
        ask: [
          'How do you keep NGINX in the foreground in its container?',
          'Which CMD keeps NGINX as PID 1 with no hacks?',
        ],
        right: ['`nginx -g "daemon off;"`'],
        wrong: [
          '`nginx &`',
          '`service nginx start`',
          '`nginx; tail -f /dev/null`',
          '`nginx -s reload`',
        ],
      },
    ],
    wrong: [
      'Any image that is on Docker Hub',
      'In docker-compose.yml, written as it is',
      'The ready-made WordPress one',
    ],
    why: 'Everything is built from Alpine or Debian, with no passwords in the Dockerfiles, a Docker network of its own and the service in the foreground.',
  },
  'tr-pong': {
    forms: [
      {
        ask: [
          'Where is the ft_transcendence Pong played?',
          'In ft_transcendence, where do you play Pong from?',
        ],
        right: ['On the website itself, in the browser'],
        wrong: [
          'In a separate desktop app',
          'In the terminal, with ncurses',
          'In a client you have to install',
        ],
      },
      {
        ask: [
          'In the ft_transcendence tournament, what must be clear on the site?',
          'What must the site show during an ft_transcendence tournament?',
        ],
        right: ['Who plays against whom, and in what order'],
        wrong: [
          'The world ranking of each player',
          'The IP of each connected player',
          'Who won last year’s tournament',
        ],
      },
    ],
    wrong: [
      'In a separate desktop app',
      'In the terminal, with ncurses',
      'In a client you have to install',
    ],
    why: 'Pong is played on the website, in the browser, and the tournament must show the matchups and their order.',
  },
  'tr-2fa': {
    forms: [
      {
        ask: [
          'What does the 6-digit code of a 2FA app (TOTP) depend on?',
          'In TOTP, what is each code computed from?',
        ],
        right: ['A shared secret and the current time'],
        wrong: [
          "The user's password and their IP",
          'A number the server sends by SMS',
          'The MAC address of the phone',
        ],
      },
      {
        ask: [
          'How often does a TOTP code usually change?',
          'In an authenticator app, how long does each code last?',
        ],
        right: ['30 s'],
        wrong: ['5 s', '10 min', '24 h', '1 h'],
      },
      {
        ask: [
          'In two-step authentication, what is the second factor?',
          'What does 2FA add to the password?',
        ],
        right: ['Something you have, like your phone'],
        wrong: [
          'A second, different password',
          'Typing the password twice',
          'A secret question from sign-up',
        ],
      },
    ],
    wrong: [
      "The user's password and their IP",
      'A number the server sends by SMS',
      'The MAC address of the phone',
    ],
    why: 'TOTP mixes a secret shared by server and phone with the time (in 30 s steps): no phone, no code.',
  },
  'tr-auth-tokens': {
    forms: [
      {
        ask: ['What does the signature of a JWT guarantee?', 'What is the signature of a JWT for?'],
        right: ['Nobody changed it without the key'],
        wrong: [
          'Nobody can read what it carries',
          'It only works in a browser',
          'The server keeps it in the database',
        ],
      },
      {
        ask: [
          'Can you read the content of a JWT without the key?',
          'Someone without the key steals a JWT. Can they see what is inside?',
        ],
        right: ['Yes: it is base64url, not encrypted'],
        wrong: [
          "No: it is encrypted with the server's key",
          'No: you only see it with the public key',
          'Only if the token has already expired',
        ],
      },
      {
        ask: [
          'When you log in with your 42 account (OAuth), what does your site get?',
          'With OAuth, what reaches your backend after the user agrees?',
        ],
        right: ['A code it swaps for a token', 'An access token, never the password'],
        wrong: [
          "The user's 42 password, encrypted",
          'A copy of the profile and its password',
          "The intra's session cookie",
        ],
      },
    ],
    wrong: [
      'Nobody can read what it carries',
      'It only works in a browser',
      "The intra's session cookie",
    ],
    why: 'A JWT is signed, not encrypted: it can be read but not changed without the key; with OAuth your site gets a token, never the password.',
  },
  'tr-xss': {
    forms: [
      {
        ask: ['What is an XSS attack?', 'What does cross-site scripting consist of?'],
        right: ["Slipping in JavaScript that runs in others' browsers"],
        wrong: [
          'Flooding the server with lots of requests',
          'Rewriting an SQL query with what you type',
          'Stealing the session by sniffing open wifi',
        ],
      },
      {
        ask: [
          "How do you prevent XSS when showing a user's text?",
          'A user puts `<script>` in their name. What stops it from running?',
        ],
        right: ['Escaping it before putting it in the HTML'],
        wrong: [
          'Storing it hashed in the database',
          'Always sending it over HTTPS',
          'Using SQL queries with parameters',
        ],
      },
      {
        ask: [
          'The site runs over HTTPS. Which scheme do its WebSockets use?',
          'How does the address of an encrypted WebSocket start?',
        ],
        right: ['`wss://`'],
        wrong: ['`ws://`', '`https://`', '`tcp://`', '`ssl://`'],
      },
    ],
    wrong: [
      'Flooding the server with lots of requests',
      'Rewriting an SQL query with what you type',
      'Always sending it over HTTPS',
    ],
    why: "With XSS one user's text runs as code in another's browser; escaping it keeps it as text, and everything goes encrypted (https and wss).",
  },
}
