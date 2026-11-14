/** Repaso de Not-games en inglés: los cursos, traducción de `../review-courses.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_COURSES_EN: Readonly<Record<string, ReviewEntry>> = {
  'shell-cd-rutas': {
    title: 'Absolute and relative paths',
    definition:
      'A path starting with / is absolute: it starts from the root. Without the /, it is relative: it starts from the directory you are in. And .. is the directory above.',
    example: 'cd /var/log && cd nginx → /var/log/nginx; cd /nginx → "No such file or directory"',
  },
  'docker-ports': {
    title: 'Publishing a port (-p)',
    definition:
      'docker run -p A:B connects port A on your machine to port B in the container. From your machine you call localhost:A.',
    example: 'docker run -d -p 8080:80 nginx && curl localhost:8080',
  },
  'k8s-pod-status': {
    title: 'A Pod’s STATUS',
    definition:
      'CrashLoopBackOff: the container starts and dies over and over (check kubectl logs --previous). ErrImagePull or ImagePullBackOff: the image cannot be downloaded (wrong name or tag, or never pushed).',
    example: 'kubectl get pods → api-… 0/1 CrashLoopBackOff',
  },

  // Curso de NetPractice.
  'net-network-address': {
    title: 'The network address',
    definition:
      'The network address is the IP with the host bits at 0. The mask says how many bits belong to the network: it is not always the first three numbers.',
    example: '172.20.7.9/16 → 172.20.0.0; 192.168.1.77/26 → 192.168.1.64',
  },
  'net-mask-valid': {
    title: 'A valid mask',
    definition:
      'A mask is contiguous ones followed by zeros. It is written as a prefix (/27) or in dotted decimal (255.255.255.224); an octet can only be 0, 128, 192, 224, 240, 248, 252, 254 or 255.',
    example: '/27 = 255.255.255.224; 255.255.255.100 is not a mask',
  },
  'net-hosts-fit': {
    title: 'How many machines fit',
    definition:
      'With h host bits, 2^h − 2 machines fit (the network and broadcast addresses are not handed out). When picking a mask, count the router too: it uses one.',
    example: '/27 → 30 machines; 31 addresses → /26 (62)',
  },
  'net-unusable-address': {
    title: 'Addresses nobody gets',
    definition:
      'The network address (host at 0), the broadcast address (host at 1) and reserved ranges such as loopback 127.x cannot be given to a machine.',
    example: '10.0.0.4/30 → only 10.0.0.5 and 10.0.0.6 are valid',
  },
  'net-switch-role': {
    title: 'The switch',
    definition:
      'A switch joins the machines of one network. It has no IP, no routes and is not a gateway: if a machine does not answer, check its IP and mask.',
    example: 'ana, leo and cache on a switch, all in 10.0.1.0/24',
  },
  'net-gateway-side': {
    title: 'The gateway, on your network',
    definition:
      'The gateway is the router IP on the network of the machine: a neighbour on its wire. The router face on the other network is no use to it.',
    example: 'ana 10.0.1.10/24 → gateway 10.0.1.1 (not 10.0.2.1)',
  },
  'net-route-destination': {
    title: 'The destination of a route',
    definition:
      'A route destination is a network with its prefix, with the host bits at 0, or default (0.0.0.0/0), which covers everything that has no other route.',
    example: '10.0.2.0/24 via 10.0.0.2; default via 10.0.0.2',
  },
  'net-return-path': {
    title: 'There and back',
    definition:
      'A ping goes there and back, and each node decides with its own settings. If the way there arrives and the way back dies, the fault is at the destination or in the routes to the source.',
    example: 'back: r2 has no route to 10.0.1.10 → a route on r2 to 10.0.1.0/24',
  },
  'net-longest-prefix': {
    title: 'The most specific route wins',
    definition:
      'If several routes match a destination, the router uses the longest prefix, wherever it sits in the table. The default route (/0) is the last resort.',
    example: '10.0.0.0/16 and 10.0.5.0/24: to 10.0.5.7 the /24 wins',
  },
  'net-internet-exit': {
    title: 'Getting out to the internet',
    definition:
      'The router goes out with a default route to the provider, its neighbour on the outside wire. Only public addresses travel outside: the simulator has no NAT.',
    example: 'r1: default via 163.5.20.1; 172.20.0.5 → the internet drops it',
  },
  'net-mask-too-wide': {
    title: 'The mask that is too wide',
    definition:
      'With a mask that is too wide, a machine treats another network as its neighbour: it looks for it on its own wire and never hands it to the gateway.',
    example: 'ana 10.0.1.10/16 → looks for 10.0.2.10 on its wire; with /24, goes via r1',
  },
  'net-supernet': {
    title: 'Summarising routes',
    definition:
      'Several consecutive networks leaving via the same neighbour fit in one route with a shorter prefix, if the first starts on a multiple of the block: four /24s make a /22.',
    example: '10.8.0.0/24 … 10.8.3.0/24 → 10.8.0.0/22; 10.8.1.0/22 is not a network',
  },
  'net-routing-loop': {
    title: 'Routing loops',
    definition:
      'If two routers point at each other for the same destination, the packet goes back and forth until it runs out of hops (the TTL) and is dropped.',
    example: 'r1: default via r2; r2: 10.0.3.0/24 via r1 → loop',
  },
  'net-vlsm-order': {
    title: 'Subnets of different sizes',
    definition:
      'Each subnet starts on a multiple of its size. Handing them out from largest to smallest, all of them fit aligned and with no gaps.',
    example: '192.168.10.0/24 → .0/25 (100), .128/26 (50), .192/27 (20)',
  },

  // Curso de RAG.
  'rag-context': {
    title: 'Search before you answer',
    definition:
      'With no context, a model answers from memory, with confidence and with facts that may be stale. RAG finds the right chunks in your documents and hands them over so it answers by reading and cites.',
    example: 'chunks = search(question, k=3); answer = model(chunks + question)',
  },
  'rag-corpus-filter': {
    title: 'What gets indexed',
    definition:
      'Whatever you index can end up in an answer. Leave out secrets (.env), noise (.lock) and the evaluation questions, which inflate the score.',
    example: 'docs/*.md and src/**/*.py, yes; .env, poetry.lock and eval/, no',
  },
  'rag-chunk-cut': {
    title: 'The cut that splits the answer',
    definition:
      'If a cut splits the answer sentence, no chunk holds it whole and no search can save it. Bigger chunks or a little overlap fix it.',
    example: '10-word chunks → "Lost while chunking"; with overlap, whole',
  },
  'rag-normalize': {
    title: 'Normalising tokens',
    definition:
      'Normalising removes what does not matter when comparing words: case, accents and plurals. Without it, "LIMITE" and "Límite" are different words.',
    example: '"LIMITE DE TAMANO" → limite, tamano → finds "Límite de tamaño"',
  },
  'rag-idf': {
    title: 'IDF: the rare word decides',
    definition:
      'IDF measures how much a word tells chunks apart: almost zero if it is in every chunk, high if it is in few. In BM25 it multiplies each term.',
    example: 'idf = ln(1 + (N − df + 0.5) / (df + 0.5))',
  },
  'rag-bm25-k1': {
    title: 'BM25: k1',
    definition:
      'k1 says how much repeating a word in a chunk keeps adding. With a high k1 whoever repeats it most wins; with a low k1, repetition saturates quickly.',
    example: 'k1 = 3 → the .lock that repeats "retry" wins; k1 = 0.4 → the guide wins',
  },
  'rag-search-kind': {
    title: 'Lexical, semantic or hybrid',
    definition:
      'Lexical search (BM25) gets exact words and identifiers right; semantic search (embeddings), other wording or another language. Hybrid search joins both lists.',
    example: '"backoff_seconds" → lexical; "volver a intentarlo" → semantic',
  },
  'rag-rrf': {
    title: 'Reciprocal rank fusion (RRF)',
    definition:
      'RRF joins two lists looking only at ranks: each chunk adds 1/(k + rank) for every list it is in. Adding BM25 and cosine does not work: they are different scales.',
    example: '1st and 3rd with k = 60 → 1/61 + 1/63',
  },
  'rag-prompt-budget': {
    title: 'The prompt budget',
    definition:
      'The prompt is filled in order: the fixed part (instructions and question) and each chunk with its label, while it fits. The first that does not fit cuts, so fill it from best to worst.',
    example: '100 tokens, 40 fixed, chunks of 25 → 2 get in',
  },
  'rag-idk': {
    title: 'Knowing how to say "I do not know"',
    definition:
      'The minimum support is how much the context must back an answer to give it. Below it, the bot says "I do not know" instead of giving the closest thing.',
    example: '"How much does the licence cost?" → "I do not know"',
  },
  'rag-recall-mrr': {
    title: 'recall@k, MRR and precision',
    definition:
      'recall@k: in what share of the questions the right chunk is in the top k. MRR: the mean of 1/rank of the first hit. Precision@k: what share of the k is useful.',
    example: 'ranks 1, 2 and 4 → MRR = (1 + 1/2 + 1/4) / 3 = 0.58',
  },
  'rag-eval-split': {
    title: 'Tuning without overfitting',
    definition:
      'You tune on the development questions and with the mean over several folds (cross-validation). The test questions are looked at once, at the end: tune on them and they stop measuring.',
    example: 'folds 1.00, 0.50 and 0.60 → worth 0.70',
  },
  'rag-cache': {
    title: 'Query cache',
    definition:
      'The cache returns the answer to a question already asked without searching or generating. It is cleared on reindexing, or it serves stale answers, and its key is the normalised question.',
    example: 'key = normalised question; reindex → clear the cache',
  },
  'rag-api': {
    title: 'The API of a RAG',
    definition:
      'The API validates before working: an empty query or an out-of-range k is a 422, not a search that takes the service down.',
    example: 'POST /answer with k = 1000 → 422 k_out_of_range',
  },
  'rag-stages': {
    title: 'Diagnosis by stages',
    definition:
      'A bad answer is lost at one stage: if the sentence is not whole in a chunk, chunking; if it is not in the top k, the search; if it does not get in, the prompt; if it gets in and does not come out, generation.',
    example: 'whole? → in the top k? → in the prompt? → in the answer?',
  },
}
