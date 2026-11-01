/** Repaso de Not-games en inglés: traducción de `../review-core-net.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_CORE_NET_EN: Readonly<Record<string, ReviewEntry>> = {
  'np-net-broadcast': {
    title: 'Network and broadcast address',
    definition:
      'The mask splits the last byte into blocks (of 64 with /26, of 16 with /28). The network address is the start of the block the IP falls in, and the broadcast address, its end.',
    example: '192.168.10.77/26 → block 64–127: network 192.168.10.64, broadcast 192.168.10.127.',
  },
  'np-host-range': {
    title: 'Valid IPs on a network',
    definition:
      'A host can have any IP of the block except the first (the network) and the last (the broadcast). An IP outside the block belongs to another network.',
    example: '172.16.0.32/28 goes from .32 to .47: hosts, from .33 to .46.',
  },
  'np-next-hop': {
    title: 'Routing table and next hop',
    definition:
      'Each route says: for this destination, hand the packet to this router (next hop). That router must be on a network you reach directly, or there is no way to give it the packet.',
    example: 'Host 192.168.1.2/24 → route «default → 192.168.1.1»: router .1 is on its network.',
  },
  'np-router-interfaces': {
    title: 'Interfaces of a router',
    definition:
      'A router joins different networks: each interface has an IP of its own network, and two interfaces of the same router cannot be on the same network, because it would not know which one to send the packet out of.',
    example: 'A router with 10.0.1.1/24 on one interface and 10.0.2.1/24 on the other.',
  },
  'ws-config': {
    title: 'NGINX-style configuration',
    definition:
      'The webserv file looks like an NGINX server block: listen sets the port, server_name the name, root the folder, index the default file, autoindex the listing and error_page the error pages. If the body goes over client_max_body_size, the answer is 413.',
    example:
      'server { listen 8080; root /var/www; index index.html; client_max_body_size 1M; error_page 404 /404.html; }',
  },
  'ws-poll-only': {
    title: 'One poll for everything',
    definition:
      'webserv uses a single poll (or equivalent) for the listening sockets and the client ones, and only reads or writes on a socket when poll says it is ready. After a read or a write, errno is not checked.',
    example: 'poll(fds, n, -1); if fds[i].revents & POLLIN → recv; if POLLOUT → send.',
  },
  'ws-redirect': {
    title: 'HTTP redirects',
    definition:
      'A redirect answers with a 3xx code and the new address in the Location header. 301 is permanent (the browser remembers it); 302 and 307 are temporary.',
    example: 'HTTP/1.1 301 Moved Permanently\\r\\nLocation: /new/\\r\\n',
  },
  'ws-upload': {
    title: 'Uploading files with POST',
    definition:
      'A form that uploads files sends the body as multipart/form-data: each part has its own headers and content, and they are separated by the boundary the Content-Type announces.',
    example: 'Content-Type: multipart/form-data; boundary=----abc → parts split by ------abc.',
  },
  'irc-register': {
    title: 'Registering on IRC',
    definition:
      'On connecting, the client sends PASS with the server password, NICK with its nickname and USER with its name. Until it has all three, the server lets it do nothing else.',
    example: 'PASS secret\\r\\nNICK pepe\\r\\nUSER pepe 0 * :Pepe\\r\\n',
  },
  'irc-modes': {
    title: 'Channel modes',
    definition:
      'MODE changes how a channel works: +i invite-only, +t only operators change the topic, +k asks for a key, +o makes someone an operator and +l caps the number of users.',
    example: 'MODE #42 +k key → to get in: JOIN #42 key.',
  },
  'irc-operator': {
    title: 'Operator commands',
    definition:
      'A channel operator has KICK to throw someone out, INVITE to invite to a +i channel, TOPIC to change the topic and MODE for the channel modes.',
    example: 'KICK #42 pepe :spam / INVITE pepe #42 / TOPIC #42 :Exam on Monday',
  },
  'irc-privmsg': {
    title: 'PRIVMSG',
    definition:
      'PRIVMSG sends a message to a nick (privately) or to a channel (starting with #, it reaches all its members). The text goes after the colon.',
    example: 'PRIVMSG pepe :hi / PRIVMSG #42 :hi everyone',
  },
  'irc-server-rules': {
    title: 'The rules of the ft_irc server',
    definition:
      'ft_irc cannot use fork: a single process with a single poll serves everyone. And since messages can arrive in pieces (nc with ^D), they are piled up per client until the \\r\\n.',
    example: 'nc -C 127.0.0.1 6667 → «com» ^D «man» ^D «d» Enter: the server processes «command».',
  },
  'inc-one-service': {
    title: 'One container per service',
    definition:
      'In Inception, NGINX, WordPress with php-fpm and MariaDB each go in their own container, each with its own Dockerfile, and they restart on their own if they crash (restart in the compose file).',
    example: 'services: nginx, wordpress, mariadb; each with restart: always.',
  },
  'inc-nginx-tls': {
    title: 'NGINX as the only entry point',
    definition:
      'Only NGINX is open to the outside, only on port 443 and only with TLSv1.2 or TLSv1.3. WordPress and MariaDB are only seen inside the Docker network.',
    example: 'listen 443 ssl; ssl_protocols TLSv1.2 TLSv1.3;',
  },
  'inc-volumes': {
    title: 'Inception volumes',
    definition:
      'There are two volumes: one with the WordPress database and one with the site files. On the host, both live in /home/login/data (with your login).',
    example: '/home/pepe/data/mariadb and /home/pepe/data/wordpress.',
  },
  'inc-rules': {
    title: 'What Inception forbids',
    definition:
      'Images are built from Alpine or Debian, without pulling ready-made ones; passwords go in a .env or in secrets, not in the Dockerfile; no network: host or --link; and the service runs in the foreground as PID 1.',
    example: 'FROM debian:… and CMD ["nginx", "-g", "daemon off;"]',
  },
  'tr-pong': {
    title: 'Pong and tournament',
    definition:
      'ft_transcendence is a website where you play Pong right in the browser. The tournament pits several players against each other, and the site must make clear who plays whom and in what order.',
    example: 'A 4-player tournament: A against B, C against D, and the final between the winners.',
  },
  'tr-2fa': {
    title: '2FA with TOTP',
    definition:
      'Two-step authentication asks, on top of the password, for something you have. With TOTP, the phone and the server share a secret and use the time to compute a 6-digit code that changes every 30 s.',
    example: 'You scan a QR code with the authenticator app and then type the code it shows.',
  },
  'tr-auth-tokens': {
    title: 'JWT and OAuth',
    definition:
      'A JWT (header, payload and signature) is signed, not encrypted: anyone can read it, but nobody can change it without the key. With OAuth, your site gets a code it swaps for a token: it never sees the 42 password.',
    example: 'Authorization: Bearer eyJhbGciOi… (what goes between the dots is base64url).',
  },
  'tr-xss': {
    title: 'XSS',
    definition:
      'XSS is slipping JavaScript into the site so that it runs in other people’s browsers. It is avoided by escaping what each user writes before putting it in the HTML. And the whole site goes encrypted: https and wss.',
    example: 'Name «<script>steal()</script>» → shown as &lt;script&gt;…, not run.',
  },
}
