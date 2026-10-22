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
        right: [
          'No: /25 splits the last byte into 0–127 and 128–255',
          'No: one falls in the first half and the other in the second',
        ],
        wrong: [
          'Yes: they start the same',
          'Yes, but only through a router',
          'It depends on the gateway',
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
          'No: 250 is out of range',
          'Only through a router',
          'You cannot tell without the MAC',
        ],
      },
    ],
    wrong: [
      'Only through a router',
      'It depends on the gateway',
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
        ask: ['What is 127.0.0.1?', 'Who does the address 127.0.0.1 point to?'],
        right: ['The machine itself (localhost)'],
        wrong: ['The gateway', "Google's DNS", 'The broadcast address'],
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
          'It receives the packets for other networks and forwards them',
          'It is the way out of the local network to the others',
        ],
        wrong: [
          'It translates names into addresses',
          'It hands out IP addresses',
          'It encrypts the traffic',
          'It joins the cables of the local network',
        ],
      },
      {
        ask: [
          'What does the route 0.0.0.0/0 mean?',
          'Which destinations does a 0.0.0.0/0 route lead to?',
        ],
        right: ['All those that have no other route (the default route)'],
        wrong: ['None', 'Only the local network', 'Only the machine itself'],
      },
    ],
    wrong: [
      'It translates names into addresses',
      'It hands out IP addresses',
      'It encrypts the traffic',
    ],
    why: 'What is not on your network goes to the router (gateway); 0.0.0.0/0 matches everything, so it is the default route.',
  },
  'net-tcp-udp': {
    forms: [
      {
        ask: ['What does TCP guarantee that UDP does not?', 'What does TCP give, unlike UDP?'],
        right: [
          'That everything arrives, in order and without duplicates',
          'Reliable, ordered delivery',
        ],
        wrong: [
          'That it is faster',
          'That it is encrypted',
          'That it reaches every host on the network',
          'That no port is needed',
        ],
      },
      {
        ask: ['Which transport protocol does HTTP/1.1 use?', 'What does HTTP/1.1 travel over?'],
        right: ['TCP'],
        wrong: ['UDP', 'ICMP', 'ARP'],
      },
    ],
    wrong: ['That it is faster', 'That it is encrypted', 'That no port is needed'],
    why: 'TCP numbers, acknowledges and resends; UDP sends and forgets.',
  },
  'net-dns': {
    forms: [
      {
        ask: ['What does DNS do?', 'What is DNS for?'],
        right: ['It translates domain names into IP addresses'],
        wrong: [
          'It hands out IP addresses',
          'It encrypts the connection',
          'It routes the packets',
          'It stores the web pages',
        ],
      },
      {
        ask: ['When you type a name like intra.42.fr, which system turns it into an IP?'],
        right: ['DNS'],
        wrong: ['DHCP', 'NAT', 'ARP'],
      },
    ],
    wrong: ['It hands out IP addresses', 'It encrypts the connection', 'It routes the packets'],
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
        right: [
          'A new descriptor to talk to that client',
          'A new socket, just for that connection',
        ],
        wrong: ['The same listening socket', "The client's port", 'The number of clients'],
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
          'Wait on many descriptors at once and know which ones are ready',
          'Serve many clients with a single thread',
        ],
        wrong: [
          'Create threads',
          'Encrypt the connection',
          'Resolve names',
          'Measure the response time',
        ],
      },
      {
        ask: [
          'Why should you not `read` a socket before poll says it is ready?',
          'What happens when you read, in blocking mode, a socket that has nothing?',
        ],
        right: ['It blocks and leaves the other clients unattended', 'It blocks the whole server'],
        wrong: ['It always returns 0', 'It closes the connection', 'Nothing happens'],
      },
    ],
    wrong: ['Create threads', 'Encrypt the connection', 'Resolve names'],
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
          'Keep it in a buffer for that client until the end of line arrives',
          'Pile up what it receives until it has a full line, and then process it',
        ],
      },
    ],
    wrong: [
      'Reject it: it is malformed',
      'Process it as it is',
      'Close the connection',
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
          'Which header says how many bytes the request body has?',
          'Which header carries the size of the body?',
        ],
        right: ['Content-Length'],
        wrong: ['Content-Type', 'Host', 'Accept'],
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
        right: [
          'When a chunk of size 0 arrives',
          'When the chunk «0» arrives followed by an empty line',
        ],
      },
    ],
    wrong: [
      'When the connection is closed',
      'After 1024 bytes',
      'At the first \\r\\n',
      'Never: you have to wait for the timeout',
    ],
    why: 'Each chunk is preceded by its size in hexadecimal; the one of size 0 marks the end.',
  },
  'http-cgi': {
    forms: [
      {
        ask: [
          'What is a CGI in a web server?',
          'What does the server do when a request goes to a CGI?',
        ],
        right: [
          'It runs a separate program and sends back what it writes',
          'It launches a program that builds the response',
        ],
      },
    ],
    wrong: [
      'It keeps the page in a cache',
      'It adds a special header',
      'It encrypts the response',
      'It spreads the load between servers',
    ],
    why: 'The server launches the program (fork + execve) with the request in environment variables and on its input, and sends its output.',
  },
  'irc-basics': {
    forms: [
      {
        ask: [
          'Which IRC command is used to join a channel?',
          'Which command do you send to join #42?',
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
          'The image is the template; the container, a running copy',
          'The container is the image, running',
        ],
        wrong: [
          'They are the same',
          'The container is a full virtual machine',
          'The image is a stopped container',
          'The container is the Dockerfile',
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
      'They are the same',
      'The image is a stopped container',
      'The container is the Dockerfile',
    ],
    why: 'The image does not change; each container adds its own writable layer, which goes away with it unless there is a volume.',
  },
  'docker-vm': {
    forms: [
      {
        ask: [
          'How is a container different from a virtual machine?',
          'What does a virtual machine have that a container does not?',
        ],
        right: ['It shares the kernel of the host system: it has no kernel of its own'],
        wrong: [
          'It is always safer',
          'It emulates the hardware',
          'It only works on Linux with a desktop',
          'It has its own kernel',
        ],
      },
      {
        ask: [
          'Why is `tail -f /dev/null` not acceptable as the main process of a container?',
          'What is wrong with keeping a container alive with an endless loop as PID 1?',
        ],
        right: [
          'It is a hack: the container should run the service in the foreground',
          'That the real service is not the main process',
        ],
        wrong: [
          'That it uses a lot of CPU',
          'That /dev/null does not exist',
          'That the container stops',
        ],
      },
    ],
    wrong: ['It is always safer', 'It emulates the hardware', 'It has its own kernel'],
    why: 'A container is an isolated process on the same kernel; it lives as long as its main process does.',
  },
  'docker-compose-net': {
    forms: [
      {
        ask: [
          'In docker-compose, WordPress has to talk to the database service (MariaDB). What does it put as the host?',
          'Two services on the same compose network. How does one find the other?',
        ],
        right: [
          'The name of the service, which compose resolves',
          'By the service name: compose has an internal DNS',
        ],
      },
    ],
    wrong: [
      'localhost',
      'The address 127.0.0.1',
      'The public IP of the machine',
      'The address 0.0.0.0',
    ],
    why: 'Each container has its own localhost; compose provides an internal DNS where each service is reached by its name.',
  },
  'web-https': {
    forms: [
      {
        ask: ['What does HTTPS add to HTTP?', 'What does the «S» in HTTPS mean?'],
        right: [
          'It encrypts the connection with TLS and proves who the server is',
          'That the connection is encrypted with TLS',
        ],
        wrong: [
          'That it compresses the pages',
          'That the site is faster',
          'That it stores the passwords',
          'That it blocks ads',
        ],
      },
      {
        ask: ['On which port does HTTPS listen by default?', 'What is the HTTPS port?'],
        right: ['443'],
        wrong: ['80', '8080', '22'],
      },
    ],
    wrong: [
      'That it compresses the pages',
      'That the site is faster',
      'That it stores the passwords',
    ],
    why: 'HTTPS is HTTP inside TLS: encryption plus the server certificate. 80 is HTTP; 443, HTTPS.',
  },
  'web-sql-injection': {
    forms: [
      {
        ask: [
          'What is wrong with this query?',
          "What happens if someone types `' OR '1'='1` as the name?",
        ],
        right: [
          'SQL injection: you have to use parameterised queries',
          'That the user can rewrite the SQL and get every record',
        ],
      },
    ],
    wrong: [
      'That it is slow',
      'That a semicolon is missing',
      'That it never returns anything',
      'That it only works with MySQL',
    ],
    why: 'Pasting user text into the SQL lets them rewrite it; parameters always treat it as data.',
  },
  'web-hash-passwords': {
    forms: [
      {
        ask: ['How should passwords be stored?', 'How is a password stored in the database?'],
        right: [
          'With a slow, salted hash (bcrypt, argon2)',
          'Run through bcrypt or argon2, never as they are',
        ],
        wrong: [
          'In plain text, in a separate table',
          'Encrypted with a key written in the code',
          'With MD5',
          'In base64',
        ],
      },
      {
        ask: [
          'What is the «salt» of a password hash?',
          'Why is salt added to a password before hashing it?',
        ],
        right: [
          'A random value per user: two equal passwords give different hashes',
          'So that precomputed tables are useless',
        ],
        wrong: ['To encrypt it with a key', 'To make the hash shorter', 'To be able to recover it'],
      },
    ],
    wrong: ['In plain text, in a separate table', 'With MD5', 'In base64'],
    why: 'A slow, salted hash cannot be undone or tried in bulk; base64 or MD5 do not protect anything.',
  },
  'web-websocket': {
    forms: [
      {
        ask: ['Why use WebSockets for a browser game?', 'What does a WebSocket allow?'],
        right: [
          'That the server sends data without the client asking',
          'A connection that stays open both ways',
        ],
      },
    ],
    wrong: [
      'Encrypting better than HTTPS',
      'Taking less space than an image',
      'Not using TCP',
      'Storing the data in the browser',
    ],
    why: 'HTTP is question and answer; the WebSocket keeps the connection open to send at any time.',
  },
}
