/** Banco de Not-games en inglés: el curso de NetPractice (`../course-net.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const COURSE_NET_EN: Readonly<Record<string, ConceptText>> = {
  'net-network-address': {
    forms: [
      {
        ask: [
          'What is the network address of `172.20.7.9/16`?',
          'With a /16 mask, the network of `172.20.7.9` is…',
        ],
        right: ['`172.20.0.0`'],
        wrong: ['`172.20.7.0`', '`172.0.0.0`', '`172.20.255.255`', '`172.20.7.255`'],
      },
      {
        ask: [
          'Which network address does `192.168.1.77/26` have?',
          'With /26, `192.168.1.77` belongs to the network…',
        ],
        right: ['`192.168.1.64`'],
        wrong: [
          '`192.168.1.0`',
          '`192.168.1.76`',
          '`192.168.1.127`',
          '`192.168.1.128`',
          '`192.168.1.32`',
        ],
      },
      {
        ask: [
          'With a /26 mask, which of these addresses is in the same network as `192.168.1.77`?',
          'A new machine joins the network of `192.168.1.77/26`. Which address do you give it?',
        ],
        right: ['`192.168.1.100`', '`192.168.1.90`'],
        wrong: ['`192.168.1.130`', '`192.168.1.20`', '`192.168.1.200`', '`192.168.1.60`'],
      },
    ],
    wrong: [],
    why: 'The network is the bits the mask marks, with the rest at 0: with /16, two octets; with /26, steps of 64. It is not always the first three numbers.',
  },
  'net-mask-valid': {
    forms: [
      {
        ask: ['Which of these is NOT a valid mask?', 'All of these are valid masks EXCEPT…'],
        right: ['`255.255.255.100`'],
        wrong: [
          '`255.255.255.192`',
          '`255.255.255.252`',
          '`255.255.254.0`',
          '`255.255.255.128`',
          '`255.255.255.240`',
        ],
      },
      {
        ask: [
          'How is /27 written in dotted decimal?',
          'The /27 mask, written as four numbers, is…',
        ],
        right: ['`255.255.255.224`'],
        wrong: [
          '`255.255.255.27`',
          '`255.255.255.240`',
          '`255.255.255.192`',
          '`255.255.224.0`',
          '`255.255.255.32`',
        ],
      },
      {
        ask: [
          'You give a machine the mask `255.255.255.100` and the packet never leaves. Why?',
          'The simulator rejects the mask `255.255.255.100`. What is wrong with it?',
        ],
        right: ['Its ones are not contiguous', 'In binary, its ones are not together'],
        wrong: [
          'Its last octet goes above 255',
          'It leaves room for fewer than 2 machines',
          'Masks can only be written as a prefix',
          'Its last octet would have to be 0',
        ],
      },
    ],
    wrong: [],
    why: 'A mask is contiguous ones followed by zeros: an octet can only be 0, 128, 192, 224, 240, 248, 252, 254 or 255.',
  },
  'net-hosts-fit': {
    forms: [
      {
        ask: [
          'What is the smallest network that fits 31 machines?',
          'For 31 machines, the longest prefix that works is…',
        ],
        right: ['`/26`'],
        wrong: ['`/27`', '`/25`', '`/28`', '`/24`', '`/31`'],
      },
      {
        ask: [
          'How many machines fit in a /27 network?',
          'With the mask `255.255.255.224`, how many machines fit?',
        ],
        right: ['30'],
        wrong: ['32', '31', '27', '62', '5'],
      },
      {
        ask: [
          'A network will hold 30 machines plus its router interface. What is the smallest network that is enough?',
          'You need room for 30 machines plus the router. Which network, as small as possible, do you pick?',
        ],
        right: ['`/26`'],
        wrong: ['`/27`', '`/25`', '`/28`', '`/29`'],
      },
    ],
    wrong: [],
    why: 'With h host bits, 2^h − 2 machines fit: a /27 leaves 30. Count the router too, which uses one address.',
  },
  'net-unusable-address': {
    forms: [
      {
        ask: [
          'In the diagram, a machine with `10.0.0.7/30` sends nothing. Why?',
          'You give `10.0.0.7/30` to a machine and the packet never leaves. What is going on?',
        ],
        right: [
          'It is the broadcast address of its network',
          'It is the broadcast of that /30 network',
        ],
        wrong: [
          'It is the network address of its subnet',
          'A /30 leaves no room for machines',
          'It has no default gateway',
          'It is a private address',
        ],
      },
      {
        ask: [
          'Which address can you give a machine in the network `10.0.0.4/30`?',
          'In the network `10.0.0.4/30`, a machine can have…',
        ],
        right: ['`10.0.0.5`', '`10.0.0.6`'],
        wrong: ['`10.0.0.4`', '`10.0.0.7`', '`10.0.0.8`', '`10.0.0.3`', '`10.0.0.9`'],
      },
      {
        ask: [
          'You number a network with `127.0.0.5/24` because "localhost works". What happens?',
          'A machine in the diagram has `127.0.0.5/24`. What does the packet do?',
        ],
        right: ['It never leaves: 127.x is loopback', 'It never leaves: it is a loopback address'],
        wrong: [
          'It leaves: it is private, like 10.x',
          'It leaves if the mask is /8',
          'It leaves if the router also uses 127.x',
          'It leaves, but only towards the internet',
        ],
      },
    ],
    wrong: [],
    why: 'The network address (host at 0), the broadcast address (host at 1) and the 127.x range go to nobody: the packet never leaves.',
  },
  'net-switch-role': {
    forms: [
      {
        ask: ['What is a switch for?', 'In a network, a switch is used to…'],
        right: [
          'Join machines of one network, without an IP',
          'Put the machines of one network on one wire',
        ],
        wrong: [
          'Join two different networks, like a router',
          'Give an IP to every machine that plugs in',
          'Act as the gateway of its network',
          'Forward according to its routing table',
        ],
      },
      {
        ask: [
          'Three machines hang off a switch: two talk to each other and the third does not. What do you check first?',
          'On a switch, ana and leo talk to each other and cache does not. What do you check first?',
        ],
        right: [
          'The IP and mask of the one that does not answer',
          'The address and the mask of that machine',
        ],
        wrong: [
          'The IP address of the switch',
          'The routing table of the switch',
          'The gateway of the switch',
          'The mask of the switch',
        ],
      },
    ],
    wrong: [],
    why: 'A switch has no IP and decides nothing: it joins everything plugged into it into one network. If a machine does not answer, check its IP and mask.',
  },
  'net-gateway-side': {
    forms: [
      {
        ask: [
          'r1 joins `10.0.1.0/24` and `10.0.2.0/24`, with `.1` in each. Which gateway do you give a machine in the first one?',
          'A router has `.1` in `10.0.1.0/24` and in `10.0.2.0/24`. A machine in the first network goes out through…',
        ],
        right: ['`10.0.1.1`'],
        wrong: ['`10.0.2.1`', '`10.0.1.0`', '`10.0.1.255`', '`10.0.2.0`', '`10.0.1.254`'],
      },
      {
        ask: [
          'The simulator says on ana: "next hop 10.0.2.1 is not in any of its networks". What is wrong?',
          'ana, on `10.0.1.10/24`, has `10.0.2.1` as its gateway and nothing leaves. Why?',
        ],
        right: [
          'Its gateway is the router face on the other network',
          'You gave it the router IP on the far network',
        ],
        wrong: [
          'The router has no route to the network of ana',
          'The router is missing the return route',
          'The IP of ana is duplicated on another machine',
          'ana is missing a default route',
        ],
      },
    ],
    wrong: [],
    why: 'The gateway is the router IP on your own network: a neighbour on your wire, not the face that looks onto the other network.',
  },
  'net-route-destination': {
    forms: [
      {
        ask: [
          'Which destination do you put in a route so that it works for any address?',
          'A route for everything that has no more specific route has as its destination…',
        ],
        right: ['`0.0.0.0/0`', '`default`'],
        wrong: ['`0.0.0.0/24`', '`0.0.0.0/32`', '`255.255.255.255/32`', '`255.255.255.0/24`'],
      },
      {
        ask: [
          'r1 has the route `10.0.2.10/24 via 10.0.0.2` and the simulator says it is badly written. Why?',
          'You write `10.0.2.10/24` as a destination and the route is rejected. What is wrong with it?',
        ],
        right: [
          'The destination has host bits: it is not a network',
          'It is a machine with a mask, not a network address',
        ],
        wrong: [
          'The next hop is not a neighbour of the router',
          'A route does not accept the /24 prefix',
          'The mask must be written in dotted decimal',
          'It needs the word default in front',
        ],
      },
    ],
    wrong: [],
    why: 'A route destination is a network with its prefix (10.0.2.0/24) or default (0.0.0.0/0); 0.0.0.0/24 only covers 0.0.0.0 to 0.0.0.255.',
  },
  'net-return-path': {
    forms: [
      {
        ask: [
          'The trace says "back: r2 has no route to 10.0.1.10". Where is the fault?',
          'The ping reaches db, but the reply dies at r2 for lack of a route. What do you fix?',
        ],
        right: [
          'The routing table of r2, which cannot get back',
          'The routes of r2 towards the source network',
        ],
        wrong: [
          'The IP and the mask of the source',
          'The outbound route of r1 to db',
          'The gateway of the source',
          'The cable between db and r2',
        ],
      },
      {
        ask: [
          'The trip from ana to db arrives and the way back dies. What do you check?',
          'The packet reaches db, but ana gets no reply. Where do you look?',
        ],
        right: [
          'Gateway, mask and return routes of db',
          'How db answers: its gateway and routes to ana',
        ],
        wrong: [
          'The IP and the mask of ana',
          'The gateway of ana',
          'The route of r1 to the network of db',
          'The cable from ana to its router',
        ],
      },
    ],
    wrong: [],
    why: 'A ping goes there and back, and each node decides with its own settings: if the way back dies, the fault is at the destination or in the routes to the source.',
  },
  'net-longest-prefix': {
    forms: [
      {
        ask: [
          'r1 has, in this order, `10.0.0.0/16 via 10.9.0.2` and `10.0.5.0/24 via 10.9.0.6`. Which way does a packet to `10.0.5.7` go?',
          'With `10.0.0.0/16 via 10.9.0.2` first and `10.0.5.0/24 via 10.9.0.6` after, a packet to `10.0.5.7` goes…',
        ],
        right: [
          'Through the /24 route, which is more specific',
          'Through the /24: the longest prefix wins',
        ],
        wrong: [
          'Through the /16 route, which comes first',
          'Through both, sharing the traffic',
          'Through neither: the two routes overlap',
          'Through the default route, if there is one',
        ],
      },
      {
        ask: [
          'If several routes match a destination, which one does the router use?',
          'When two routes cover the same destination, the router picks…',
        ],
        right: ['The one with the longest prefix', 'The most specific one, with more bits'],
        wrong: [
          'The one listed first in the table',
          'The one with the shortest prefix',
          'The default route',
          'The last one that was added',
          'The one with the closest next hop',
        ],
      },
    ],
    wrong: [],
    why: 'The most specific route (the longest prefix) wins wherever it sits in the table; the default one, /0, is the last resort.',
  },
  'net-internet-exit': {
    forms: [
      {
        ask: [
          'r1 reaches the internet through `163.5.20.2/30`; the provider is `163.5.20.1`. Which route do you put on r1?',
          'r1 has `163.5.20.2/30` on the provider wire (`163.5.20.1`). To reach `8.8.8.8`, r1 needs…',
        ],
        right: ['`default via 163.5.20.1`'],
        wrong: [
          '`default via 8.8.8.8`',
          '`default via 163.5.20.2`',
          '`8.8.8.8/32 via 8.8.8.8`',
          '`0.0.0.0/24 via 163.5.20.1`',
        ],
      },
      {
        ask: [
          'From `172.20.0.5` you ping `8.8.8.8` and the packet dies as it enters the internet. Why?',
          'The ping from `172.20.0.5` to `8.8.8.8` reaches the internet and is dropped there. What is going on?',
        ],
        right: [
          '172.20.x is private and the internet drops it',
          'It is a private address: it does not travel outside',
        ],
        wrong: [
          'The machine is missing its default route',
          'The provider has no route to 8.8.8.8',
          '172.20.x is public and duplicated',
          'The internet does not answer outside pings',
        ],
      },
    ],
    wrong: [],
    why: 'r1 goes out through its default route to the provider, which is a neighbour; and only public addresses travel outside (there is no NAT here).',
  },
  'net-mask-too-wide': {
    forms: [
      {
        ask: [
          'ana shows "by its mask, 10.0.2.10 is a neighbour of ana, but it lives in another network". What do you fix?',
          'ana reaches its neighbours, but not `10.0.2.10`, behind the router: it thinks it is a neighbour. What do you change?',
        ],
        right: ['The mask of ana, which is too wide', 'The mask of ana: it covers too much'],
        wrong: [
          'The mask of ana, which is too narrow',
          'The gateway of ana',
          'The IP 10.0.2.10, which is duplicated',
          'The routing table of the router',
        ],
      },
      {
        ask: [
          'ana goes from `10.0.1.10/24` to `/16` and sends a packet to `10.0.2.10`, behind r1. What does ana do?',
          'With `10.0.1.10/16` and gateway `10.0.1.1`, ana sends something to `10.0.2.10`, on another network. What happens?',
        ],
        right: [
          'It looks for it on its own wire and does not find it',
          'It looks on its wire and skips the gateway',
        ],
        wrong: [
          'It hands it to its gateway',
          'It delivers it: /16 covers both networks',
          'It sends it to everyone with a broadcast',
          'It drops it: it has no route to that network',
        ],
      },
    ],
    wrong: [],
    why: 'A mask that is too wide makes a machine treat another network as its neighbour: it looks on its own wire and never uses the gateway.',
  },
  'net-supernet': {
    forms: [
      {
        ask: [
          'Which route covers `10.8.0.0/24`, `10.8.1.0/24`, `10.8.2.0/24` and `10.8.3.0/24`, and nothing else?',
          'A single route for those four consecutive /24s, from `10.8.0.0` to `10.8.3.0`, without covering others, has as its destination…',
        ],
        right: ['`10.8.0.0/22`'],
        wrong: [
          '`10.8.0.0/16`',
          '`10.8.0.0/23`',
          '`10.8.0.0/20`',
          '`10.8.3.0/22`',
          '`10.8.0.0/26`',
        ],
      },
      {
        ask: [
          'To summarise `10.8.1.0/24` to `10.8.4.0/24` you write `10.8.1.0/22` and it comes out badly written. Why?',
          'The route `10.8.1.0/22 via 10.0.0.2` is rejected. What is wrong with it?',
        ],
        right: [
          'A /22 starts on a multiple of 4 in the third octet',
          'That address does not open any /22 block',
        ],
        wrong: [
          'A summary only works for two networks',
          'The prefix must be written in dotted decimal',
          'A summary only accepts /16 or /8',
          'Those networks do not leave via the same neighbour',
        ],
      },
    ],
    wrong: [],
    why: 'Four consecutive /24s fit in a /22 only if the first one starts on a multiple of 4: 10.8.0.0/22 goes from 10.8.0.0 to 10.8.3.255.',
  },
  'net-routing-loop': {
    forms: [
      {
        ask: [
          'r1 sends everything to r2 by default, and r2 sends `10.0.3.0/24` back to r1. What happens to a packet for `10.0.3.10`?',
          'r1: `default via r2`. r2: `10.0.3.0/24 via r1`. A packet to `10.0.3.10`…',
        ],
        right: [
          'It bounces between r1 and r2 until it runs out of hops',
          'It goes back and forth until its TTL runs out',
        ],
        wrong: [
          'r2 delivers it on the 10.0.3.0/24 network',
          'r1 drops it for lack of a specific route',
          'r2 sends it back and r1 sends it to the internet',
          'It is lost at the first hop, at r1',
        ],
      },
      {
        ask: [
          'The trace says "the packet goes round in circles between routers and runs out of hops". What do you look for?',
          'A packet bounces between two routers until it is dropped. What must be wrong?',
        ],
        right: [
          'A route that sends it back to the previous router',
          'A hop that sends it backwards',
        ],
        wrong: [
          'A mask that is too wide at the source',
          'A duplicated IP at the destination',
          'A missing default route',
          'A badly written route destination',
        ],
      },
    ],
    wrong: [],
    why: 'If two routers point at each other for the same destination, the packet goes back and forth until the TTL runs out: find who sends it backwards.',
  },
  'net-vlsm-order': {
    forms: [
      {
        ask: [
          'You split a /24 from the start and with no gaps for 100, 50 and 20 machines. In which order?',
          'When you split a /24 with no gaps into subnets of 100, 50 and 20 machines, you go…',
        ],
        right: ['From the largest to the smallest', 'First the 100 one, then 50, then 20'],
        wrong: [
          'From the smallest to the largest',
          'First the 50 one, then 100, then 20',
          'First the 100 one, then 20, then 50',
          'All with the same mask, /26',
        ],
      },
      {
        ask: [
          'In `192.168.10.0/24` you already gave `192.168.10.0/27` to 20 machines. Where can the /25 for 100 start?',
          'With `192.168.10.0/27` already taken, the /25 for 100 machines inside `192.168.10.0/24` starts at…',
        ],
        right: ['`192.168.10.128`'],
        wrong: [
          '`192.168.10.32`',
          '`192.168.10.0`',
          '`192.168.10.33`',
          '`192.168.10.64`',
          '`192.168.10.100`',
        ],
      },
    ],
    wrong: [],
    why: 'Each subnet starts on a multiple of its size: handing them out from largest to smallest, all of them fit aligned and with no gaps.',
  },
}
