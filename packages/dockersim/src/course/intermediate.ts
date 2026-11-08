/**
 * Nivel intermedio: bloques 4 a 6 y su jefe final. Construir mejor (caché,
 * .dockerignore, multi-stage y registro), los datos y las redes (volúmenes,
 * bind mounts, DNS por nombre, puertos y copias) y, al final, Docker Compose:
 * el entorno de desarrollo entero en un fichero.
 */

import { API_PACKAGE, API_SERVER_STRICT } from '../world.js'
import type { Unit } from './types.js'

/** `cat > FICHERO <<'EOF'` con estas líneas. */
const heredoc = (file: string, lines: string[]): string =>
  `cat > ${file} <<'EOF'\n${lines.join('\n')}\nEOF`

const API_SLOW =
  'FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci --omit=dev\nEXPOSE 3000\nCMD ["node", "server.js"]\n'

const API_LINES = [
  'FROM node:22-alpine',
  'WORKDIR /app',
  'COPY package*.json ./',
  'RUN npm ci --omit=dev',
  'COPY . .',
  'EXPOSE 3000',
  'CMD ["node", "server.js"]',
]
const API_FILE = `${API_LINES.join('\n')}\n`
const IGNORE = 'node_modules\n.git\n.env\n*.log\nlogs\n'
const IGNORE_CMD = "printf 'node_modules\\n.git\\n.env\\n*.log\\nlogs\\n' > .dockerignore"

const FRONT_LINES = [
  'FROM node:22 AS build',
  'WORKDIR /app',
  'COPY package*.json ./',
  'RUN npm ci',
  'COPY . .',
  'RUN npm run build',
  '',
  'FROM nginx:1.27-alpine',
  'COPY --from=build /app/dist /usr/share/nginx/html',
]

/** nginx delante de la API: lo que empieza por /api/ va a `api:3000` sin el prefijo. */
const PROXY_CONF = `server {
    listen 80;
    location /api/ {
        proxy_pass http://api:3000/;
    }
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri /index.html;
    }
}
`

const FRONT_PACKAGE = `{
  "name": "peer4u-front",
  "version": "2.1.0",
  "scripts": { "dev": "vite", "build": "vite build" },
  "dependencies": { "vue": "^3.5.12" },
  "devDependencies": { "vite": "^5.4.10" }
}
`

const LOCK = (name: string) => `{ "name": "${name}", "lockfileVersion": 3, "packages": {} }\n`

/** El compose de la API con su base de datos (la solución de «Varios servicios»). */
const COMPOSE_MULTI = [
  'services:',
  '  api:',
  '    build: .',
  '    ports:',
  '      - "3000:3000"',
  '    environment:',
  '      DATABASE_URL: postgres://postgres:secreto@db:5432/postgres',
  '  db:',
  '    image: postgres:16-alpine',
  '    environment:',
  '      POSTGRES_PASSWORD: secreto',
  '    volumes:',
  '      - pgdata:/var/lib/postgresql/data',
  'volumes:',
  '  pgdata:',
]

const COMPOSE_ENV = [
  'services:',
  '  api:',
  '    build: .',
  '    ports:',
  '      - "${API_PORT}:3000"',
  '    environment:',
  '      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@db:5432/postgres',
  '    depends_on:',
  '      - db',
  '  db:',
  '    image: postgres:16-alpine',
  '    environment:',
  '      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}',
  '    volumes:',
  '      - pgdata:/var/lib/postgresql/data',
  'volumes:',
  '  pgdata:',
]

const COMPOSE_HEALTH = [
  'services:',
  '  api:',
  '    build: .',
  '    ports:',
  '      - "${API_PORT}:3000"',
  '    environment:',
  '      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@db:5432/postgres',
  '    depends_on:',
  '      db:',
  '        condition: service_healthy',
  '  db:',
  '    image: postgres:16-alpine',
  '    environment:',
  '      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}',
  '    volumes:',
  '      - pgdata:/var/lib/postgresql/data',
  '    healthcheck:',
  '      test: ["CMD-SHELL", "pg_isready -U postgres"]',
  '      interval: 5s',
  '      retries: 5',
  'volumes:',
  '  pgdata:',
]

const COMPOSE_OPS = [
  ...COMPOSE_HEALTH.slice(0, -2),
  '  worker:',
  '    image: alpine:3.20',
  '    command: sleep infinity',
  'volumes:',
  '  pgdata:',
]

const API_PROJECT = {
  '~/api/Dockerfile': API_FILE,
  '~/api/.dockerignore': IGNORE,
}

/** Un proyecto de dos carpetas (api y front) para los jefes de Compose. */
const projectFiles = (
  dir: string,
  withDockerfiles: boolean,
): Record<string, string | { text: string; size: number }> => ({
  [`${dir}/api/package.json`]: API_PACKAGE,
  [`${dir}/api/package-lock.json`]: LOCK('peer4u-api'),
  [`${dir}/api/server.js`]: API_SERVER_STRICT,
  [`${dir}/api/.env`]: 'API_SECRET=no-lo-subas\n',
  [`${dir}/api/node_modules/.package-lock.json`]: {
    text: '{"dev": true}\n',
    size: 180 * 1024 * 1024,
  },
  [`${dir}/front/package.json`]: FRONT_PACKAGE,
  [`${dir}/front/package-lock.json`]: LOCK('peer4u-front'),
  [`${dir}/front/index.html`]:
    '<!doctype html>\n<title>Peer4U</title>\n<div id="app">Peer4U</div>\n',
  [`${dir}/front/default.conf`]: PROXY_CONF,
  ...(withDockerfiles
    ? {
        [`${dir}/api/Dockerfile`]: API_FILE,
        [`${dir}/api/.dockerignore`]: IGNORE,
        [`${dir}/front/Dockerfile`]:
          'FROM nginx:1.27-alpine\nCOPY default.conf /etc/nginx/conf.d/default.conf\nCOPY index.html /usr/share/nginx/html/\n',
      }
    : {}),
})

const STACK_LINES = [
  'services:',
  '  front:',
  '    build: ./front',
  '    ports:',
  '      - "8080:80"',
  '    depends_on:',
  '      - api',
  '  api:',
  '    build: ./api',
  '    environment:',
  '      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@db:5432/postgres',
  '    depends_on:',
  '      db:',
  '        condition: service_healthy',
  '  db:',
  '    image: postgres:16-alpine',
  '    environment:',
  '      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}',
  '    volumes:',
  '      - pgdata:/var/lib/postgresql/data',
  '    healthcheck:',
  '      test: ["CMD-SHELL", "pg_isready -U postgres"]',
  '      interval: 5s',
  '      retries: 5',
]

/** Cuántos contenedores publican un puerto hacia fuera (todas las interfaces). */
const PUBLISHED = "docker ps --format '{{.Ports}}' | grep -c 0.0.0.0"

export const INTERMEDIATE: Unit[] = [
  /* ---------- Bloque 4: construir mejor ---------- */
  {
    id: 'docker-cache',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    setup: { files: { '~/api/Dockerfile': API_SLOW } },
    es: {
      title: 'Aprovechar la caché',
      goal: 'Reordena el Dockerfile de ~/api para que cambiar el código no reinstale las dependencias, y construye api:1.1.',
      theory: {
        what: 'Cada paso del Dockerfile tiene caché: si no cambia ni él ni lo que copia, sale CACHED. Si uno cambia, se rehacen todos los de debajo.',
        how: [
          'COPY package*.json ./   # antes, las dependencias',
          'RUN npm ci --omit=dev   # solo si cambian esas',
          'COPY . .                # el código, al final',
        ],
        when: 'Arriba lo que cambia poco; abajo, lo que cambia mucho. En CI ahorra minutos.',
        whenNot: '--no-cache ignora la caché entera, para cuando guarda algo viejo.',
        problems:
          'Poner COPY . . antes de npm ci: cambiar una línea de server.js rehace «[4/4] RUN npm ci --omit=dev», sin CACHED. Copia antes solo package*.json.',
      },
      example:
        'Antes de verlo: con COPY . . arriba, cambias una línea de server.js y construyes otra vez. ¿Saldrá CACHED el npm ci?',
      objectives: { 'probe:cache': 'Cambiar el código no reinstala las dependencias' },
    },
    en: {
      title: 'Using the cache',
      goal: 'Reorder the Dockerfile in ~/api so that changing the code does not reinstall the dependencies, and build api:1.1.',
      theory: {
        what: 'Each Dockerfile step is cached: if neither it nor what it copies changes, it says CACHED. If one changes, every step below is rebuilt.',
        how: [
          'COPY package*.json ./   # dependencies first',
          'RUN npm ci --omit=dev   # only if those change',
          'COPY . .                # the code, last',
        ],
        when: 'What rarely changes at the top; what often changes, at the bottom. In CI it saves minutes.',
        whenNot: '--no-cache ignores the whole cache, for when it holds something stale.',
        problems:
          'Putting COPY . . before npm ci: changing one line of server.js reruns "[4/4] RUN npm ci --omit=dev", with no CACHED. Copy only package*.json first.',
      },
      example:
        'Before you look: with COPY . . at the top, you change one line of server.js and build again. Will npm ci say CACHED?',
      objectives: { 'probe:cache': 'Changing the code does not reinstall the dependencies' },
    },
    example: [
      'cd ~/api',
      'cat Dockerfile',
      'docker build -t api:lenta .',
      "echo '// cambio' >> server.js",
      'docker build -t api:lenta .',
    ],
    solution: ['cd ~/api', heredoc('Dockerfile', API_LINES), 'docker build -t api:1.1 .'],
    check: {
      images: ['api:1.1'],
      probes: {
        cache: [
          "echo '// cambio' >> ~/api/server.js",
          "docker build -t sonda ~/api | grep -c 'CACHED.*npm ci'",
        ],
      },
    },
  },
  {
    id: 'docker-dockerignore',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    setup: { files: { '~/api/Dockerfile': API_FILE } },
    es: {
      title: '.dockerignore',
      goal: 'Haz que node_modules, .git, .env y los registros (la carpeta logs y los *.log) no entren en el contexto de ~/api, y construye api:1.2.',
      theory: {
        what: 'Antes de construir, Docker manda la carpeta entera (el contexto) al constructor. .dockerignore dice qué no mandar, con patrones como los de .gitignore.',
        how: [
          'node_modules   # se instalan dentro',
          '.git',
          '.env           # secretos: nunca en la imagen',
          '*.log',
          'logs',
        ],
        when: 'En todo proyecto con Dockerfile: builds más rápidos y sin secretos ni basura dentro de la imagen.',
        whenNot:
          '.gitignore no cuenta aquí: Docker solo lee .dockerignore, y sin él manda «transferring context: 191MB».',
        problems:
          'Ignorar algo que el Dockerfile copia: con *.json en .dockerignore, COPY package*.json falla con «"/package*.json": not found». Ignora solo lo que la imagen no necesita.',
      },
      example:
        'Antes de verlo: ~/api no tiene .dockerignore y sí un .env. ¿Acabará el .env dentro de la imagen?',
      objectives: {
        'probe:env': 'El .env no está dentro de la imagen',
        'probe:git': 'El .git no está dentro de la imagen',
        'probe:modules': 'Los node_modules de tu máquina no pisan los de la imagen',
        'probe:context': 'El contexto que se manda pesa kilobytes',
      },
    },
    en: {
      title: '.dockerignore',
      goal: 'Keep node_modules, .git, .env and the logs (the logs folder and *.log) out of the ~/api context, and build api:1.2.',
      theory: {
        what: 'Before building, Docker sends the whole folder (the context) to the builder. .dockerignore says what not to send, with patterns like .gitignore.',
        how: [
          'node_modules   # installed inside',
          '.git',
          '.env           # secrets: never in the image',
          '*.log',
          'logs',
        ],
        when: 'In every project with a Dockerfile: faster builds and no secrets or junk inside the image.',
        whenNot:
          '.gitignore does not count here: Docker only reads .dockerignore, and without it sends "transferring context: 191MB".',
        problems:
          'Ignoring something the Dockerfile copies: with *.json in .dockerignore, COPY package*.json fails with ""/package*.json": not found". Ignore only what the image does not need.',
      },
      example:
        'Before you look: ~/api has no .dockerignore but has a .env. Will the .env end up inside the image?',
      objectives: {
        'probe:env': 'The .env is not inside the image',
        'probe:git': 'The .git is not inside the image',
        'probe:modules': 'The node_modules from your machine do not overwrite the image ones',
        'probe:context': 'The context sent weighs kilobytes',
      },
    },
    example: [
      'cd ~/api',
      'docker build -t api:gorda .',
      'docker run --rm api:gorda cat /app/.env',
      "printf '*.json\\n' > .dockerignore",
      'docker build -t api:rota .',
    ],
    solution: ['cd ~/api', IGNORE_CMD, 'docker build -t api:1.2 .'],
    check: {
      images: ['api:1.2'],
      probes: {
        env: ['docker run --rm api:1.2 cat /app/.env'],
        git: ['docker run --rm api:1.2 ls /app/.git'],
        modules: ['docker run --rm api:1.2 cat /app/node_modules/.package-lock.json'],
        context: ["docker build -t sonda ~/api | grep -c 'context: [0-9.]*kB'"],
      },
    },
  },
  {
    id: 'docker-multistage',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Multi-stage',
      goal: 'En ~/front, construye front:1.0 en dos etapas (compilar con node:22 y servir dist con nginx:1.27-alpine), que pese menos de 60 MB, y déjala corriendo como front en el 8080.',
      theory: {
        what: 'Un Dockerfile con varios FROM tiene varias etapas. Compilas en una con todas las herramientas y COPY --from copia solo el resultado a otra mínima.',
        how: [
          'FROM node:22 AS build',
          'RUN npm ci && npm run build   # tras WORKDIR y COPY',
          'FROM nginx:1.27-alpine',
          'COPY --from=build /app/dist /usr/share/nginx/html',
        ],
        when: 'Con compilación (frontends, Go, TypeScript): de 1,47 GB a unos 50 MB.',
        whenNot: 'Sin compilación (una API de Node sin build), basta una etapa.',
        problems:
          'Copiar de la etapa una ruta que no está: COPY --from=build /dist (y no /app/dist) acaba en «"/dist": not found». Va la ruta de dentro, tras WORKDIR.',
      },
      example:
        'Antes de verlo: construyes el front en una sola etapa con node:22. ¿Cuánto pesará al lado de los 50 MB de nginx?',
      objectives: {},
    },
    en: {
      title: 'Multi-stage',
      goal: 'In ~/front, build front:1.0 in two stages (compile with node:22 and serve dist with nginx:1.27-alpine), under 60 MB, and leave it running as front on 8080.',
      theory: {
        what: 'A Dockerfile with several FROM has several stages. You compile in one with every tool and COPY --from copies only the result into a minimal one.',
        how: [
          'FROM node:22 AS build',
          'RUN npm ci && npm run build   # after WORKDIR, COPY',
          'FROM nginx:1.27-alpine',
          'COPY --from=build /app/dist /usr/share/nginx/html',
        ],
        when: 'With a compile step (frontends, Go, TypeScript): from 1.47 GB to about 50 MB.',
        whenNot: 'Without a compile step (a Node API with no build), one stage is enough.',
        problems:
          'Copying a path the stage lacks: COPY --from=build /dist (not /app/dist) ends in ""/dist": not found". Use the path inside, after WORKDIR.',
      },
      example:
        'Before you look: you build the front in a single stage with node:22. How big will it be next to the 50 MB of nginx?',
      objectives: {},
    },
    example: [
      'cd ~/front',
      heredoc('Dockerfile', [
        'FROM node:22',
        'WORKDIR /app',
        'COPY . .',
        'RUN npm ci',
        'RUN npm run build',
      ]),
      'docker build -t front:gorda .',
      'docker images front',
    ],
    solution: [
      'cd ~/front',
      heredoc('Dockerfile', FRONT_LINES),
      'docker build -t front:1.0 .',
      'docker run -d --name front -p 8080:80 front:1.0',
    ],
    check: {
      images: ['front:1.0'],
      size: ['front:1.0 60'],
      containers: ['front'],
      http: ['localhost:8080/'],
    },
  },
  {
    id: 'docker-registry',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    setup: { files: API_PROJECT, run: ['docker build -t api:1.4 ~/api'] },
    es: {
      title: 'Publicar en un registro',
      goal: 'Publica la imagen api:1.4 en el registro del equipo como ghcr.io/peer4u/api:1.4.0. El token está en ~/.ghcr-token.',
      theory: {
        what: 'Un registro guarda imágenes para otras máquinas. El nombre dice dónde: ghcr.io/peer4u/api:1.4.0. docker login da acceso y docker push sube las capas.',
        how: [
          'docker tag api:1.4 ghcr.io/peer4u/api:1.4.0',
          'cat ~/.ghcr-token | docker login ghcr.io -u peer --password-stdin',
          'docker push ghcr.io/peer4u/api:1.4.0',
        ],
        when: 'Para que CI, el servidor o Kubernetes usen la misma imagen que probaste, sin construirla otra vez.',
        whenNot:
          'Sin registro delante, el nombre va a Docker Hub: docker push api:1.4 responde «denied: requested access to the resource is denied».',
        problems:
          'Subir sin docker login: el push responde «unauthorized: unauthenticated». Entra antes, con el token por la entrada (--password-stdin) y no en la orden.',
      },
      example:
        'Antes de verlo: etiquetas una prueba para ghcr.io y la subes sin docker login. ¿Qué responde el registro?',
      objectives: {},
    },
    en: {
      title: 'Pushing to a registry',
      goal: 'Publish the image api:1.4 to the team registry as ghcr.io/peer4u/api:1.4.0. The token is in ~/.ghcr-token.',
      theory: {
        what: 'A registry stores images for other machines. The name says where: ghcr.io/peer4u/api:1.4.0. docker login gives access and docker push uploads the layers.',
        how: [
          'docker tag api:1.4 ghcr.io/peer4u/api:1.4.0',
          'cat ~/.ghcr-token | docker login ghcr.io -u peer --password-stdin',
          'docker push ghcr.io/peer4u/api:1.4.0',
        ],
        when: 'So that CI, the server or Kubernetes use the same image you tested, without building it again.',
        whenNot:
          'With no registry in front, the name goes to Docker Hub: docker push api:1.4 answers "denied: requested access to the resource is denied".',
        problems:
          'Pushing without docker login: the push answers "unauthorized: unauthenticated". Log in first, with the token on the input (--password-stdin).',
      },
      example:
        'Before you look: you tag a test image for ghcr.io and push it without docker login. What does the registry answer?',
      objectives: {},
    },
    example: [
      'docker tag api:1.4 ghcr.io/peer4u/prueba:0.1',
      'docker images ghcr.io/peer4u/prueba',
      'docker push ghcr.io/peer4u/prueba:0.1',
      'docker push api:1.4',
    ],
    solution: [
      'docker tag api:1.4 ghcr.io/peer4u/api:1.4.0',
      'cat ~/.ghcr-token | docker login ghcr.io -u peer --password-stdin',
      'docker push ghcr.io/peer4u/api:1.4.0',
    ],
    check: {
      registry: ['ghcr.io/peer4u/api:1.4.0'],
      inspect: ['ghcr.io/peer4u/api:1.4.0 {{.Id}}'],
    },
  },
  {
    id: 'docker-boss-build',
    block: 4,
    tier: 'intermediate',
    kind: 'boss',
    limit: 360,
    setup: { files: { '~/api/Dockerfile': API_SLOW } },
    es: {
      title: 'El build de CI tarda 12 minutos',
      goal: 'ghcr.io/peer4u/api:1.5.0 publicada, construida con la caché bien ordenada y sin el .env dentro.',
      story:
        'El pipeline de la API tarda una eternidad: manda 190 MB de contexto, reinstala dependencias en cada commit y, para colmo, alguien vio el .env de producción dentro de la imagen. Hay que arreglarlo y publicar la 1.5.0 antes de la demo.',
      tasks: [
        'Escribe ~/api/.dockerignore (sin node_modules, .git, .env ni los registros).',
        'Reordena el Dockerfile: primero package*.json y npm ci --omit=dev, después el código.',
        'Construye ghcr.io/peer4u/api:1.5.0 y publícala (el token está en ~/.ghcr-token).',
      ],
      objectives: {
        'probe:cache': 'Cambiar el código no reinstala las dependencias',
        'probe:env': 'El .env no está dentro de la imagen',
      },
    },
    en: {
      title: 'The CI build takes 12 minutes',
      goal: 'ghcr.io/peer4u/api:1.5.0 published, built with a well-ordered cache and without the .env inside.',
      story:
        'The API pipeline takes forever: it sends 190 MB of context, reinstalls dependencies on every commit and, to top it off, someone saw the production .env inside the image. Fix it and publish 1.5.0 before the demo.',
      tasks: [
        'Write ~/api/.dockerignore (no node_modules, .git, .env or logs).',
        'Reorder the Dockerfile: first package*.json and npm ci --omit=dev, then the code.',
        'Build ghcr.io/peer4u/api:1.5.0 and push it (the token is in ~/.ghcr-token).',
      ],
      objectives: {
        'probe:cache': 'Changing the code does not reinstall the dependencies',
        'probe:env': 'The .env is not inside the image',
      },
    },
    solution: [
      'cd ~/api',
      IGNORE_CMD,
      heredoc('Dockerfile', API_LINES),
      'docker build -t ghcr.io/peer4u/api:1.5.0 .',
      'cat ~/.ghcr-token | docker login ghcr.io -u peer --password-stdin',
      'docker push ghcr.io/peer4u/api:1.5.0',
    ],
    check: {
      registry: ['ghcr.io/peer4u/api:1.5.0'],
      probes: {
        env: ['docker run --rm ghcr.io/peer4u/api:1.5.0 cat /app/.env'],
        cache: [
          "echo '// cambio' >> ~/api/server.js",
          "docker build -t sonda ~/api | grep -c 'CACHED.*npm ci'",
        ],
      },
    },
  },

  /* ---------- Bloque 5: datos y redes ---------- */
  {
    id: 'docker-volumes',
    block: 5,
    tier: 'intermediate',
    kind: 'unit',
    setup: {
      run: [
        'docker volume create pgdata',
        'docker run -d --name db -e POSTGRES_PASSWORD=secreto -v pgdata:/var/lib/postgresql/data postgres:16',
        "docker exec db psql -U postgres -c 'CREATE TABLE notas (id int)'",
        'docker rm -f db',
      ],
    },
    es: {
      title: 'Volúmenes con nombre',
      goal: 'Alguien borró el contenedor db, pero sus datos estaban en el volumen pgdata. Vuelve a crear db (postgres:16, contraseña secreto) con esos datos: la tabla notas tiene que seguir ahí.',
      theory: {
        what: 'Lo que un contenedor escribe muere con él. Un volumen con nombre vive aparte: sobrevive a docker rm y se monta con -v nombre:/ruta.',
        how: [
          'docker volume create pgdata',
          'docker run -d --name db -e POSTGRES_PASSWORD=secreto \\',
          '  -v pgdata:/var/lib/postgresql/data postgres:16',
          'docker volume ls',
        ],
        when: 'Para los datos que deben durar: bases de datos, ficheros subidos, colas.',
        whenNot:
          'docker volume rm sí borra los datos; con un contenedor usándolo, dice «volume is in use».',
        problems:
          'Montarlo en otra ruta: con -v datos:/data, postgres escribe en su capa y \\dt dice «Did not find any relations». Usa la ruta de datos de la imagen.',
      },
      example:
        'Antes de verlo: creas una tabla en un postgres sin volumen, lo borras y lo creas otra vez. ¿Seguirá la tabla?',
      objectives: {},
    },
    en: {
      title: 'Named volumes',
      goal: 'Someone removed the db container, but its data was in the pgdata volume. Create db again (postgres:16, password secreto) with that data: the notas table must still be there.',
      theory: {
        what: 'What a container writes dies with it. A named volume lives apart: it survives docker rm and is mounted with -v name:/path.',
        how: [
          'docker volume create pgdata',
          'docker run -d --name db -e POSTGRES_PASSWORD=secreto \\',
          '  -v pgdata:/var/lib/postgresql/data postgres:16',
          'docker volume ls',
        ],
        when: 'For data that must last: databases, files people upload, queues.',
        whenNot:
          'docker volume rm does delete the data; while a container uses it, it answers "volume is in use".',
        problems:
          'Mounting it on another path: with -v datos:/data, postgres keeps writing to its layer and \\dt says "Did not find any relations". Use the path where the image keeps its data.',
      },
      example:
        'Before you look: you create a table in a postgres without a volume, remove it and create it again. Is the table still there?',
      objectives: {},
    },
    example: [
      'docker run -d --name prueba -e POSTGRES_PASSWORD=demo postgres:16',
      "docker exec prueba psql -U postgres -c 'CREATE TABLE t (x int)'",
      'docker rm -f prueba',
      'docker run -d --name prueba -e POSTGRES_PASSWORD=demo postgres:16',
      "docker exec prueba psql -U postgres -c '\\dt'",
      'docker rm -f prueba',
      'docker run -d --name prueba -e POSTGRES_PASSWORD=demo -v datos:/var/lib/postgresql/data postgres:16',
      "docker exec prueba psql -U postgres -c 'CREATE TABLE t (x int)'",
      'docker rm -f prueba',
      'docker run -d --name prueba -e POSTGRES_PASSWORD=demo -v datos:/var/lib/postgresql/data postgres:16',
      "docker exec prueba psql -U postgres -c '\\dt'",
    ],
    solution: [
      'docker run -d --name db -e POSTGRES_PASSWORD=secreto -v pgdata:/var/lib/postgresql/data postgres:16',
    ],
    check: { containers: ['db'], volumes: ['pgdata'], exec: ['db psql -U postgres -c \\dt'] },
  },
  {
    id: 'docker-bind-mounts',
    block: 5,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Bind mounts para desarrollar',
      goal: 'Sirve ~/web con un contenedor dev (nginx:1.27-alpine) en el 8081 que la monte en solo lectura, y cambia ~/web/index.html para que diga «Peer4U en desarrollo» sin reconstruir nada.',
      theory: {
        what: 'Un bind mount monta una carpeta de tu máquina en el contenedor: los dos ven los mismos ficheros. Con :ro, el contenedor no escribe.',
        how: [
          'docker run -d --name dev -p 8081:80 \\',
          '  -v ~/web:/usr/share/nginx/html:ro nginx:1.27-alpine',
          'echo hola > ~/web/index.html   # se ve al momento',
        ],
        when: 'En desarrollo: editas en tu editor y el contenedor lo ve sin reconstruir.',
        whenNot: 'En producción el código va en la imagen: un bind mount lo ata a una máquina.',
        problems:
          'Escribir la ruta sin /, ./ ni ~: -v web:/… crea un volumen vacío llamado web, y nginx sirve su portada de fábrica, «Welcome to nginx!».',
      },
      example:
        'Antes de verlo: cambias ~/web/index.html con el contenedor en marcha. ¿Lo servirá nginx sin reconstruir?',
      objectives: {},
    },
    en: {
      title: 'Bind mounts for development',
      goal: 'Serve ~/web with a container dev (nginx:1.27-alpine) on 8081 that mounts it read-only, and change ~/web/index.html so it says "Peer4U en desarrollo" without rebuilding anything.',
      theory: {
        what: 'A bind mount mounts a folder of your machine in the container: both see the same files. With :ro, the container cannot write.',
        how: [
          'docker run -d --name dev -p 8081:80 \\',
          '  -v ~/web:/usr/share/nginx/html:ro nginx:1.27-alpine',
          'echo hola > ~/web/index.html   # shows at once',
        ],
        when: 'In development: you edit and the container sees it without a rebuild.',
        whenNot:
          'In production the code goes in the image: a bind mount ties the container to a folder on one machine.',
        problems:
          'Writing the path without /, ./ or ~: -v web:/… creates an empty volume called web, and nginx serves its stock page, "Welcome to nginx!".',
      },
      example:
        'Before you look: you change ~/web/index.html with the container running. Will nginx serve it without a rebuild?',
      objectives: {},
    },
    example: [
      'docker run -d --name prueba -p 9090:80 -v ~/web:/usr/share/nginx/html:ro nginx:1.27-alpine',
      'curl -s localhost:9090',
      "echo 'cambiado' > ~/web/index.html",
      'curl -s localhost:9090',
      "docker exec prueba sh -c 'echo x > /usr/share/nginx/html/x.html'",
      'docker run -d --name p2 -p 9091:80 -v web:/usr/share/nginx/html nginx:1.27-alpine',
      'curl -s localhost:9091',
    ],
    solution: [
      'docker run -d --name dev -p 8081:80 -v ~/web:/usr/share/nginx/html:ro nginx:1.27-alpine',
      "echo 'Peer4U en desarrollo' > ~/web/index.html",
    ],
    check: {
      containers: ['dev'],
      http: ['localhost:8081/'],
      inspect: ['dev {{range .Mounts}}{{.Type}} {{.Destination}} {{.RW}}{{end}}'],
    },
  },
  {
    id: 'docker-networks',
    block: 5,
    tier: 'intermediate',
    kind: 'unit',
    setup: { files: API_PROJECT, run: ['docker build -t api:1.4 ~/api'] },
    es: {
      title: 'Redes con nombre',
      goal: 'Crea la red peer4u y pon en ella db (postgres:16-alpine, contraseña secreto) y api (api:1.4, puerto 3000 publicado, DATABASE_URL=postgres://postgres:secreto@db:5432/postgres). /health tiene que decir db up.',
      theory: {
        what: 'En una red creada por ti, los contenedores se encuentran por nombre. En la red de siempre, solo por IP.',
        how: [
          'docker network create peer4u',
          'docker run -d --name db --network peer4u …',
          'docker run -d --name api --network peer4u …  # usa @db:5432',
        ],
        when: 'Cuando dos contenedores hablan: la API y su base de datos, nginx y la API.',
        whenNot: 'La base de datos no necesita -p: dentro de la red ya llegas a su 5432.',
        problems:
          "Dejarlos en la red de siempre y llamarse por nombre: ping responde «ping: bad address 'a2'». Crea una red y conéctalos a ella.",
      },
      example:
        'Antes de verlo: a1 y a2 están en la red de siempre. ¿Contestará docker exec a1 ping -c 1 a2?',
      objectives: {},
    },
    en: {
      title: 'Named networks',
      goal: 'Create the peer4u network and put db (postgres:16-alpine, password secreto) and api (api:1.4, port 3000 published, DATABASE_URL=postgres://postgres:secreto@db:5432/postgres) on it. /health must say db up.',
      theory: {
        what: 'On a network you create, containers find each other by name. On the default network, only by IP.',
        how: [
          'docker network create peer4u',
          'docker run -d --name db --network peer4u …',
          'docker run -d --name api --network peer4u …  # uses @db:5432',
        ],
        when: 'Whenever two containers talk: the API and its database, nginx and the API.',
        whenNot: 'The database needs no -p: inside the network you already reach its 5432.',
        problems:
          'Leaving them on the default network and calling by name: ping answers "ping: bad address \'a2\'". Create a network and connect them to it.',
      },
      example:
        'Before you look: a1 and a2 are on the default network. Will docker exec a1 ping -c 1 a2 answer?',
      objectives: {},
    },
    example: [
      'docker run -d --name a1 alpine:3.20 sleep infinity',
      'docker run -d --name a2 alpine:3.20 sleep infinity',
      'docker exec a1 ping -c 1 a2',
      'docker network create demo',
      'docker network connect demo a1',
      'docker network connect demo a2',
      'docker exec a1 ping -c 1 a2',
    ],
    solution: [
      'docker network create peer4u',
      'docker run -d --name db --network peer4u -e POSTGRES_PASSWORD=secreto postgres:16-alpine',
      'docker run -d --name api --network peer4u -p 3000:3000 -e DATABASE_URL=postgres://postgres:secreto@db:5432/postgres api:1.4',
    ],
    check: { networks: ['peer4u'], containers: ['db', 'api'], http: ['localhost:3000/health'] },
  },
  {
    id: 'docker-ports',
    block: 5,
    tier: 'intermediate',
    kind: 'unit',
    setup: { run: ['docker run -d --name web -p 8080:80 nginx:1.27-alpine'] },
    es: {
      title: 'Puertos: EXPOSE, -p y seguridad',
      goal: 'Arranca cache (redis:7-alpine) con su 6379 publicado solo para tu máquina (127.0.0.1), y web-nueva (nginx:1.27-alpine) en el 8090, porque el 8080 lo tiene web y tiene que seguir así.',
      theory: {
        what: '-p 8080:80 publica en todas las interfaces; -p 127.0.0.1:6379:6379, solo en tu máquina. Cada puerto del anfitrión es de un contenedor.',
        how: [
          'docker run -d --name cache -p 127.0.0.1:6379:6379 redis:7-alpine',
          'docker port cache   # 6379/tcp -> 127.0.0.1:6379',
          'docker run -d -p 8090:80 …   # el 8080 está cogido',
        ],
        when: 'Publica solo lo que debe llegar de fuera; lo tuyo, en 127.0.0.1.',
        whenNot: 'EXPOSE en el Dockerfile solo documenta: el que publica es -p.',
        problems:
          'Usar un puerto ocupado: «Bind for 0.0.0.0:8080 failed: port is already allocated», y el contenedor queda Created, sin arrancar. Bórralo y créalo con otro puerto.',
      },
      example:
        'Antes de verlo: web ya tiene el 8080 y arrancas otro nginx en el 8080. ¿Qué queda en docker ps -a?',
      objectives: {},
    },
    en: {
      title: 'Ports: EXPOSE, -p and security',
      goal: 'Start cache (redis:7-alpine) with its 6379 published only for your machine (127.0.0.1), and web-nueva (nginx:1.27-alpine) on 8090, because 8080 belongs to web and must stay that way.',
      theory: {
        what: '-p 8080:80 publishes on every interface; -p 127.0.0.1:6379:6379, only on your machine. Each host port belongs to one container.',
        how: [
          'docker run -d --name cache -p 127.0.0.1:6379:6379 redis:7-alpine',
          'docker port cache   # 6379/tcp -> 127.0.0.1:6379',
          'docker run -d -p 8090:80 …   # 8080 is taken',
        ],
        when: 'Publish only what must be reached from outside; your own things, on 127.0.0.1.',
        whenNot: 'EXPOSE in the Dockerfile only documents: -p is what publishes.',
        problems:
          'Using a taken port: "Bind for 0.0.0.0:8080 failed: port is already allocated", and the container stays Created, not started. Remove it and create it on another port.',
      },
      example:
        'Before you look: web already holds 8080 and you start another nginx on 8080. What is left in docker ps -a?',
      objectives: {},
    },
    example: [
      'docker run -d --name prueba -p 8080:80 nginx:1.27-alpine',
      'docker ps -a',
      'docker rm prueba',
    ],
    solution: [
      'docker run -d --name cache -p 127.0.0.1:6379:6379 redis:7-alpine',
      'docker run -d --name web-nueva -p 8090:80 nginx:1.27-alpine',
    ],
    check: { containers: ['web', 'cache', 'web-nueva'], http: ['localhost:8090/'] },
  },
  {
    id: 'docker-backup',
    block: 5,
    tier: 'intermediate',
    kind: 'unit',
    setup: {
      files: { '~/copias/LEEME.txt': 'Aquí van las copias de seguridad.\n' },
      run: [
        'docker run -d --name db -e POSTGRES_PASSWORD=secreto -v pgdata:/var/lib/postgresql/data postgres:16',
        "docker exec db psql -U postgres -c 'CREATE TABLE pedidos (id int)'",
        'docker run -d --name web -p 8080:80 nginx:1.27-alpine',
      ],
    },
    es: {
      title: 'Copiar ficheros y copias de seguridad',
      goal: 'Deja en ~/copias la configuración de nginx de web (/etc/nginx/conf.d/default.conf) y una copia del volumen pgdata en ~/copias/pgdata.tgz.',
      theory: {
        what: 'docker cp copia ficheros entre contenedor y anfitrión. Un volumen se monta en un contenedor de usar y tirar y se empaqueta con tar.',
        how: [
          'docker cp web:/etc/nginx/conf.d/default.conf ~/copias/',
          'docker run --rm -v pgdata:/datos -v ~/copias:/backup alpine:3.20 \\',
          '  tar czf /backup/pgdata.tgz -C /datos .',
          'tar -tzf ~/copias/pgdata.tgz',
        ],
        when: 'Antes de actualizar una base de datos o mover datos a otra máquina.',
        whenNot:
          'Con la base de datos en uso, mejor pg_dump o pararla: un tar en caliente pilla ficheros a medias.',
        problems:
          'Pasarle el volumen a docker cp: docker cp pgdata:/ ~/copias/ responde «No such container: pgdata». cp solo habla con contenedores.',
      },
      example:
        'Antes de verlo: pgdata es un volumen, no un contenedor. ¿Qué responde docker cp pgdata:/ ~/copias/?',
      objectives: { 'probe:backup': 'La copia lleva los ficheros de la base de datos' },
    },
    en: {
      title: 'Copying files and backups',
      goal: 'Put in ~/copias the nginx configuration of web (/etc/nginx/conf.d/default.conf) and a copy of the pgdata volume as ~/copias/pgdata.tgz.',
      theory: {
        what: 'docker cp copies files between a container and your machine. A volume is mounted in a throwaway container and packed with tar.',
        how: [
          'docker cp web:/etc/nginx/conf.d/default.conf ~/copias/',
          'docker run --rm -v pgdata:/datos -v ~/copias:/backup alpine:3.20 \\',
          '  tar czf /backup/pgdata.tgz -C /datos .',
          'tar -tzf ~/copias/pgdata.tgz',
        ],
        when: 'Before upgrading a database or moving data to another machine.',
        whenNot:
          'With the database in use, prefer pg_dump or stop it first: a live tar can catch half-written files.',
        problems:
          'Giving the volume to docker cp: docker cp pgdata:/ ~/copias/ answers "No such container: pgdata". cp only talks to containers.',
      },
      example:
        'Before you look: pgdata is a volume, not a container. What does docker cp pgdata:/ ~/copias/ answer?',
      objectives: { 'probe:backup': 'The copy holds the database files' },
    },
    example: [
      'docker volume ls',
      'docker run --rm -v pgdata:/datos alpine:3.20 ls /datos',
      'docker cp pgdata:/ ~/copias/',
    ],
    solution: [
      'docker cp web:/etc/nginx/conf.d/default.conf ~/copias/',
      'docker run --rm -v pgdata:/datos -v ~/copias:/backup alpine:3.20 tar czf /backup/pgdata.tgz -C /datos .',
    ],
    check: {
      files: ['~/copias/default.conf'],
      exists: ['~/copias/pgdata.tgz'],
      probes: { backup: ['tar -tzf ~/copias/pgdata.tgz | grep -c PG_VERSION'] },
    },
    requires: [['cp']],
  },
  {
    id: 'docker-boss-manual',
    block: 5,
    tier: 'intermediate',
    kind: 'boss',
    limit: 480,
    setup: {
      files: {
        ...API_PROJECT,
        '~/tienda/default.conf': PROXY_CONF,
        '~/tienda/index.html': '<h1>Tienda Peer4U</h1>\n',
        '~/tienda/Dockerfile':
          'FROM nginx:1.27-alpine\nCOPY default.conf /etc/nginx/conf.d/default.conf\nCOPY index.html /usr/share/nginx/html/\n',
      },
      run: ['docker build -t api:1.4 ~/api', 'docker build -t tienda-front:1.0 ~/tienda'],
    },
    es: {
      title: 'Montaje a mano',
      goal: 'La tienda entera en la red tienda: db con su volumen y sin puertos, api y front en el 8080, y /api/health diciendo db up.',
      story:
        'Mañana hay demo de la tienda y Compose aún no está aprobado en este servidor: toca montarla a mano. El front (tienda-front:1.0) es un nginx que manda lo de /api/ a un contenedor llamado api; si al arrancar no lo encuentra, se cae.',
      tasks: [
        'Crea la red tienda y el volumen tienda-db.',
        'db: postgres:16-alpine, contraseña secreto, datos en tienda-db y sin publicar ningún puerto.',
        'api: api:1.4 con DATABASE_URL=postgres://postgres:secreto@db:5432/postgres, sin puertos publicados.',
        'front: tienda-front:1.0 en el 8080. Comprueba localhost:8080/api/health.',
      ],
      objectives: { 'probe:published': 'Solo front publica un puerto' },
    },
    en: {
      title: 'Wiring it by hand',
      goal: 'The whole shop on the tienda network: db with its volume and no ports, api, and front on 8080, with /api/health saying db up.',
      story:
        'There is a shop demo tomorrow and Compose is not approved on this server yet: you have to wire it by hand. The front (tienda-front:1.0) is an nginx that sends /api/ to a container called api; if it cannot find it when starting, it crashes.',
      tasks: [
        'Create the tienda network and the tienda-db volume.',
        'db: postgres:16-alpine, password secreto, data in tienda-db and no published port.',
        'api: api:1.4 with DATABASE_URL=postgres://postgres:secreto@db:5432/postgres, no published ports.',
        'front: tienda-front:1.0 on 8080. Check localhost:8080/api/health.',
      ],
      objectives: { 'probe:published': 'Only front publishes a port' },
    },
    solution: [
      'docker network create tienda',
      'docker volume create tienda-db',
      'docker run -d --name db --network tienda -e POSTGRES_PASSWORD=secreto -v tienda-db:/var/lib/postgresql/data postgres:16-alpine',
      'docker run -d --name api --network tienda -e DATABASE_URL=postgres://postgres:secreto@db:5432/postgres api:1.4',
      'docker run -d --name front --network tienda -p 8080:80 tienda-front:1.0',
    ],
    check: {
      networks: ['tienda'],
      volumes: ['tienda-db'],
      containers: ['db', 'api', 'front'],
      inspect: ['db {{range .Mounts}}{{.Name}}{{end}}'],
      http: ['localhost:8080/', 'localhost:8080/api/health'],
      probes: { published: [PUBLISHED] },
    },
  },

  /* ---------- Bloque 6: Docker Compose ---------- */
  {
    id: 'docker-compose-first',
    block: 6,
    tier: 'intermediate',
    kind: 'unit',
    setup: {
      files: {
        '~/demo/compose.yaml':
          'services:\n  hola:\n    image: nginx:1.27-alpine\n    ports:\n      - "9090:80"\n',
      },
    },
    es: {
      title: 'Tu primer compose.yaml',
      goal: 'En ~/web, escribe un compose.yaml con un servicio web (nginx:1.27-alpine, 8080 a su 80) y levántalo en segundo plano.',
      theory: {
        what: 'Compose describe en compose.yaml lo que harías con varios docker run. docker compose up -d lo crea y docker compose down lo quita.',
        how: [
          'services:',
          '  web:',
          '    image: nginx:1.27-alpine',
          '    ports:',
          '      - "8080:80"',
          'docker compose up -d   # red y contenedores',
          'docker compose down',
        ],
        when: 'En cuanto hay más de un contenedor: el fichero va al repositorio y todo el equipo levanta lo mismo.',
        whenNot:
          'Para probar algo una vez basta docker run. Y en YAML, sangrías de espacios, nunca tabuladores.',
        problems:
          'Lanzarlo desde otra carpeta: docker compose up -d en ~ responde «no configuration file provided: not found». Compose busca compose.yaml donde estás.',
      },
      example:
        'Antes de verlo: en ~/demo el servicio se llama hola. ¿Qué nombre tendrá su contenedor en docker ps?',
      objectives: {},
    },
    en: {
      title: 'Your first compose.yaml',
      goal: 'In ~/web, write a compose.yaml with a web service (nginx:1.27-alpine, 8080 to its 80) and bring it up in the background.',
      theory: {
        what: 'Compose describes in compose.yaml what you would do with several docker run. docker compose up -d creates it and docker compose down removes it.',
        how: [
          'services:',
          '  web:',
          '    image: nginx:1.27-alpine',
          '    ports:',
          '      - "8080:80"',
          'docker compose up -d   # network and containers',
          'docker compose down',
        ],
        when: 'With more than one container: the file goes in the repository and the whole team starts the same.',
        whenNot:
          'To try something once, docker run is enough. In YAML, indent with spaces, never tabs.',
        problems:
          'Running it from another folder: docker compose up -d in ~ answers "no configuration file provided: not found". Compose looks for compose.yaml where you are.',
      },
      example:
        'Before you look: in ~/demo the service is called hola. What name will its container have in docker ps?',
      objectives: {},
    },
    example: [
      'cd ~/demo',
      'cat compose.yaml',
      'docker compose up -d',
      'docker ps',
      'docker compose down',
      'cd ~',
      'docker compose up -d',
    ],
    solution: [
      'cd ~/web',
      heredoc('compose.yaml', [
        'services:',
        '  web:',
        '    image: nginx:1.27-alpine',
        '    ports:',
        '      - "8080:80"',
      ]),
      'docker compose up -d',
    ],
    check: { containers: ['web-web-1'], http: ['localhost:8080/'] },
  },
  {
    id: 'docker-compose-multi',
    block: 6,
    tier: 'intermediate',
    kind: 'unit',
    setup: { files: API_PROJECT },
    es: {
      title: 'Varios servicios',
      goal: 'En ~/api, un compose.yaml con api (construida desde la carpeta, 3000 publicado, DATABASE_URL=postgres://postgres:secreto@db:5432/postgres) y db (postgres:16-alpine, contraseña secreto, datos en el volumen pgdata). Levántalo: /health tiene que decir db up.',
      theory: {
        what: 'build: construye la imagen del servicio desde una carpeta; image: usa una ya hecha. Los servicios se encuentran por su nombre, y los volúmenes se declaran abajo.',
        how: [
          'services:',
          '  api:',
          '    build: .',
          '    environment:',
          '      DATABASE_URL: postgres://postgres:secreto@db:5432/postgres',
          '  db:',
          '    image: postgres:16-alpine',
          '    volumes:',
          '      - pgdata:/var/lib/postgresql/data',
          'volumes:',
          '  pgdata:',
        ],
        when: 'Para el entorno de desarrollo de un servicio con lo que necesita: base de datos, caché, colas.',
        whenNot:
          'Si cambias el código, up -d no reconstruye: hace falta docker compose up -d --build.',
        problems:
          'Usar un volumen sin declararlo: up responde «service "db" refers to undefined volume datos». Añádelo en volumes:, al final del fichero.',
      },
      example:
        'Antes de verlo: el compose monta el volumen datos, pero no lo declara en volumes:. ¿Arrancará db?',
      objectives: {},
    },
    en: {
      title: 'Several services',
      goal: 'In ~/api, a compose.yaml with api (built from the folder, 3000 published, DATABASE_URL=postgres://postgres:secreto@db:5432/postgres) and db (postgres:16-alpine, password secreto, data in the pgdata volume). Bring it up: /health must say db up.',
      theory: {
        what: 'build: builds the service image from a folder; image: uses a ready one. Services find each other by name, and volumes are declared at the bottom.',
        how: [
          'services:',
          '  api:',
          '    build: .',
          '    environment:',
          '      DATABASE_URL: postgres://postgres:secreto@db:5432/postgres',
          '  db:',
          '    image: postgres:16-alpine',
          '    volumes:',
          '      - pgdata:/var/lib/postgresql/data',
          'volumes:',
          '  pgdata:',
        ],
        when: 'For the development setup of a service with what it needs: database, cache, queues.',
        whenNot:
          'If you change the code, up -d does not rebuild: you need docker compose up -d --build.',
        problems:
          'Using a volume without declaring it: up answers "service "db" refers to undefined volume datos". Add it under volumes:, at the end of the file.',
      },
      example:
        'Before you look: the compose mounts the volume datos but does not declare it in volumes:. Will db start?',
      objectives: {},
    },
    example: [
      'cd ~/api',
      'cat README.md',
      heredoc('compose.yaml', [
        'services:',
        '  db:',
        '    image: postgres:16-alpine',
        '    environment:',
        '      POSTGRES_PASSWORD: demo',
        '    volumes:',
        '      - datos:/var/lib/postgresql/data',
      ]),
      'docker compose up -d',
    ],
    solution: ['cd ~/api', heredoc('compose.yaml', COMPOSE_MULTI), 'docker compose up -d'],
    check: {
      containers: ['api-api-1', 'api-db-1'],
      volumes: ['api_pgdata'],
      http: ['localhost:3000/health'],
    },
  },
  {
    id: 'docker-compose-env',
    block: 6,
    tier: 'intermediate',
    kind: 'unit',
    setup: {
      files: { ...API_PROJECT, '~/api/compose.yaml': `${COMPOSE_MULTI.join('\n')}\n` },
      run: ['cd ~/api && docker compose up -d'],
    },
    es: {
      title: 'Variables y .env',
      goal: 'Saca la contraseña y el puerto de ~/api/compose.yaml a un .env (POSTGRES_PASSWORD=secreto, API_PORT=3000) y usa ${POSTGRES_PASSWORD} y ${API_PORT} en el compose: en él no puede quedar «secreto».',
      theory: {
        what: 'Compose cambia ${VAR} por la variable de tu shell o, si no está, por la del fichero .env del proyecto. docker compose config enseña el resultado.',
        how: [
          "printf 'POSTGRES_PASSWORD=secreto\\nAPI_PORT=3000\\n' > .env",
          '      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}',
          '      - "${API_PORT}:3000"',
          'docker compose config   # ya sustituido',
        ],
        when: 'Para que compose.yaml vaya al repositorio y las contraseñas y puertos de cada cual, no.',
        whenNot:
          '${API_PORT:-3000} pone un valor por defecto. Y el .env no se sube: va en .gitignore.',
        problems:
          'Una variable que falta se queda vacía con solo un aviso: «The "CLAVE" variable is not set. Defaulting to a blank string.». Mira docker compose config antes de up.',
      },
      example:
        'Antes de verlo: cambias secreto por ${CLAVE} y CLAVE no existe. ¿Qué contraseña enseñará docker compose config?',
      objectives: {
        'probe:secret': 'La contraseña ya no está escrita en compose.yaml',
        'probe:port': 'El puerto sale de API_PORT',
        'probe:env': 'El .env tiene la contraseña',
        'probe:valid': 'El compose sigue siendo válido',
      },
    },
    en: {
      title: 'Variables and .env',
      goal: 'Move the password and the port out of ~/api/compose.yaml into a .env (POSTGRES_PASSWORD=secreto, API_PORT=3000) and use ${POSTGRES_PASSWORD} and ${API_PORT} in the compose: "secreto" must not remain in it.',
      theory: {
        what: 'Compose replaces ${VAR} with the variable from your shell or, if missing, from the project .env file. docker compose config shows the result.',
        how: [
          "printf 'POSTGRES_PASSWORD=secreto\\nAPI_PORT=3000\\n' > .env",
          '      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}',
          '      - "${API_PORT}:3000"',
          'docker compose config   # already replaced',
        ],
        when: 'So that compose.yaml goes in the repository and everyone’s own passwords and ports do not.',
        whenNot:
          '${API_PORT:-3000} sets a default if it is missing. And the .env is not committed: it goes in .gitignore.',
        problems:
          'A missing variable becomes empty with just a warning: "The "CLAVE" variable is not set. Defaulting to a blank string.". Check docker compose config before up.',
      },
      example:
        'Before you look: you replace secreto with ${CLAVE} and CLAVE does not exist. Which password will docker compose config show?',
      objectives: {
        'probe:secret': 'The password is no longer written in compose.yaml',
        'probe:port': 'The port comes from API_PORT',
        'probe:env': 'The .env holds the password',
        'probe:valid': 'The compose is still valid',
      },
    },
    example: [
      'cd ~/api',
      "sed -i 's/secreto/${CLAVE}/' compose.yaml",
      'docker compose config',
      "printf 'CLAVE=demo\\n' > .env",
      'docker compose config',
    ],
    solution: [
      'cd ~/api',
      "printf 'POSTGRES_PASSWORD=secreto\\nAPI_PORT=3000\\n' > .env",
      heredoc('compose.yaml', COMPOSE_ENV),
      'docker compose config',
      'docker compose up -d',
    ],
    check: {
      containers: ['api-api-1', 'api-db-1'],
      http: ['localhost:3000/health'],
      probes: {
        secret: ['grep -c secreto ~/api/compose.yaml'],
        port: ['grep -c API_PORT ~/api/compose.yaml'],
        env: ['grep -c POSTGRES_PASSWORD=secreto ~/api/.env'],
        valid: ['docker compose -f ~/api/compose.yaml config -q'],
      },
    },
  },
  {
    id: 'docker-compose-health',
    block: 6,
    tier: 'intermediate',
    kind: 'unit',
    setup: {
      files: {
        ...API_PROJECT,
        '~/api/.env': 'POSTGRES_PASSWORD=secreto\nAPI_PORT=3000\n',
        '~/api/compose.yaml': `${COMPOSE_ENV.join('\n')}\n`,
      },
      run: ['cd ~/api && docker compose up -d'],
    },
    es: {
      title: 'Healthchecks y orden de arranque',
      goal: 'Añade a db un healthcheck con pg_isready -U postgres y haz que api espere a que db esté sana (condition: service_healthy). Aplícalo.',
      theory: {
        what: 'depends_on solo ordena el arranque; no espera a que la base de datos acepte conexiones. Con un healthcheck y condition: service_healthy, sí.',
        how: [
          '    healthcheck:',
          '      test: ["CMD-SHELL", "pg_isready -U postgres"]',
          '    depends_on:',
          '      db:',
          '        condition: service_healthy',
          'docker compose ps   # Up (healthy)',
        ],
        when: 'Cuando un servicio necesita a otro listo al arrancar: la API y su base de datos, unas migraciones.',
        whenNot:
          'Sin healthcheck, docker compose ps solo dice Up: corre, pero no sabes si responde.',
        problems:
          'Una prueba que nunca pasa: db queda «(unhealthy)» y up responde «dependency failed to start: container api-db-1 is unhealthy». La prueba corre dentro del contenedor: usa lo que haya ahí.',
      },
      example:
        'Antes de verlo: la prueba de db hace curl al 5432 de postgres. ¿Arrancará api, que espera a db sana?',
      objectives: { 'probe:waits': 'api espera a que db esté sana' },
    },
    en: {
      title: 'Healthchecks and start order',
      goal: 'Add a healthcheck with pg_isready -U postgres to db and make api wait until db is healthy (condition: service_healthy). Apply it.',
      theory: {
        what: 'depends_on only orders the start; it does not wait for the database to accept connections. With a healthcheck and condition: service_healthy, it does.',
        how: [
          '    healthcheck:',
          '      test: ["CMD-SHELL", "pg_isready -U postgres"]',
          '    depends_on:',
          '      db:',
          '        condition: service_healthy',
          'docker compose ps   # Up (healthy)',
        ],
        when: 'When a service needs another one ready at start: the API and its database, some migrations.',
        whenNot:
          'Without a healthcheck, docker compose ps only says Up: it runs, but you do not know if it answers.',
        problems:
          'A test that never passes: db stays "(unhealthy)" and up answers "dependency failed to start: container api-db-1 is unhealthy". The test runs inside the container.',
      },
      example:
        'Before you look: the db test runs curl against postgres on 5432. Will api, which waits for a healthy db, start?',
      objectives: { 'probe:waits': 'api waits until db is healthy' },
    },
    example: [
      'cd ~/api',
      'docker compose ps',
      'docker compose down',
      heredoc('compose.yaml', [
        'services:',
        '  api:',
        '    build: .',
        '    depends_on:',
        '      db:',
        '        condition: service_healthy',
        '  db:',
        '    image: postgres:16-alpine',
        '    environment:',
        '      POSTGRES_PASSWORD: demo',
        '    healthcheck:',
        '      test: ["CMD-SHELL", "curl -f localhost:5432"]',
        '      interval: 5s',
        '      retries: 3',
      ]),
      'docker compose up -d',
      'docker compose ps',
    ],
    solution: ['cd ~/api', heredoc('compose.yaml', COMPOSE_HEALTH), 'docker compose up -d'],
    check: {
      inspect: ['api-db-1 {{.State.Health.Status}}'],
      http: ['localhost:3000/health'],
      probes: { waits: ['docker compose -f ~/api/compose.yaml config | grep -c service_healthy'] },
    },
  },
  {
    id: 'docker-compose-ops',
    block: 6,
    tier: 'intermediate',
    kind: 'unit',
    setup: {
      files: {
        ...API_PROJECT,
        '~/api/.env': 'POSTGRES_PASSWORD=secreto\nAPI_PORT=3000\n',
        '~/api/compose.yaml': `${COMPOSE_OPS.join('\n')}\n`,
      },
      run: ['cd ~/api && docker compose up -d'],
    },
    es: {
      title: 'Operar un stack',
      goal: 'En ~/api: crea la tabla pedidos en db con compose exec, pon 3 réplicas de worker y comprueba que, tras un down y un up, la tabla sigue ahí.',
      theory: {
        what: 'Compose también sirve a diario: exec por nombre de servicio, --scale para réplicas y down, que lo quita todo menos los volúmenes.',
        how: [
          "docker compose exec db psql -U postgres -c '\\dt'",
          'docker compose up -d --scale worker=3',
          'docker compose down -v   # también los volúmenes',
        ],
        when: 'A diario en desarrollo: mirar, reiniciar, probar con más workers.',
        whenNot:
          'down -v borra la base de datos: tras otro up, \\dt dice «Did not find any relations».',
        problems:
          'Usar docker exec con el nombre del servicio: docker exec db responde «No such container: db», porque el contenedor se llama api-db-1. Usa docker compose exec db.',
      },
      example:
        'Antes de verlo: creas una tabla, haces docker compose down -v y lo levantas otra vez. ¿Seguirá la tabla?',
      objectives: {},
    },
    en: {
      title: 'Operating a stack',
      goal: 'In ~/api: create the pedidos table in db with compose exec, run 3 worker replicas and check that, after a down and an up, the table is still there.',
      theory: {
        what: 'Compose also helps every day: exec by service name, --scale for replicas and down, which removes everything but the volumes.',
        how: [
          "docker compose exec db psql -U postgres -c '\\dt'",
          'docker compose up -d --scale worker=3',
          'docker compose down -v   # volumes too',
        ],
        when: 'Every day in development: look, restart, try with more workers.',
        whenNot:
          'down -v deletes the database: after another up, \\dt says "Did not find any relations".',
        problems:
          'Using docker exec with the service name: docker exec db answers "No such container: db", because the container is called api-db-1. Use docker compose exec db.',
      },
      example:
        'Before you look: you create a table, run docker compose down -v and bring it up again. Is the table still there?',
      objectives: {},
    },
    example: [
      'cd ~/api',
      'docker compose ps',
      "docker compose exec db psql -U postgres -c 'CREATE TABLE t (x int)'",
      'docker compose down -v',
      'docker compose up -d',
      "docker compose exec db psql -U postgres -c '\\dt'",
      "docker exec db psql -U postgres -c '\\dt'",
    ],
    solution: [
      'cd ~/api',
      "docker compose exec db psql -U postgres -c 'CREATE TABLE pedidos (id int)'",
      'docker compose down',
      'docker compose up -d --scale worker=3',
    ],
    check: {
      containers: ['api-db-1', 'api-api-1', 'api-worker-1', 'api-worker-2', 'api-worker-3'],
      exec: ['api-db-1 psql -U postgres -c \\dt'],
    },
  },
  {
    id: 'docker-boss-compose',
    block: 6,
    tier: 'intermediate',
    kind: 'boss',
    limit: 600,
    setup: {
      files: {
        ...projectFiles('~/tienda', true),
        '~/tienda/README.md':
          '# Tienda Peer4U\n\n- front: nginx (carpeta front) en el 8080; manda /api/ a api:3000.\n- api: Node (carpeta api); necesita DATABASE_URL.\n- db: PostgreSQL 16 con sus datos en un volumen.\n- cache: Redis 7.\n\nSolo el front se publica. Las contraseñas, en .env.\n',
      },
    },
    es: {
      title: 'Del README al compose',
      goal: 'La tienda de ~/tienda levantada con Compose: front en el 8080 llegando a la API, db sana y con volumen, cache, y la contraseña solo en .env.',
      story:
        'La tienda tiene README pero no compose: cada persona nueva tarda un día en levantarla. Escríbelo tú y que con un up baste. El front se cae si arranca antes que la API, y la API necesita la base de datos lista.',
      tasks: [
        'Escribe ~/tienda/.env con POSTGRES_PASSWORD=secreto.',
        'compose.yaml: db (postgres:16-alpine, volumen, healthcheck con pg_isready), cache (redis:7-alpine), api (build ./api, DATABASE_URL hacia db, espera a db sana) y front (build ./front, 8080:80, después de api).',
        'Solo front publica puerto; en compose.yaml no puede estar «secreto».',
        'Levántalo y comprueba localhost:8080/api/health.',
      ],
      objectives: {
        'probe:published': 'Solo front publica un puerto',
        'probe:secret': 'La contraseña no está escrita en compose.yaml',
      },
    },
    en: {
      title: 'From the README to compose',
      goal: 'The shop in ~/tienda up with Compose: front on 8080 reaching the API, db healthy with a volume, cache, and the password only in .env.',
      story:
        'The shop has a README but no compose: every new person spends a day getting it running. Write it so that one up is enough. The front crashes if it starts before the API, and the API needs the database ready.',
      tasks: [
        'Write ~/tienda/.env with POSTGRES_PASSWORD=secreto.',
        'compose.yaml: db (postgres:16-alpine, volume, healthcheck with pg_isready), cache (redis:7-alpine), api (build ./api, DATABASE_URL to db, waits for db healthy) and front (build ./front, 8080:80, after api).',
        'Only front publishes a port; "secreto" must not appear in compose.yaml.',
        'Bring it up and check localhost:8080/api/health.',
      ],
      objectives: {
        'probe:published': 'Only front publishes a port',
        'probe:secret': 'The password is not written in compose.yaml',
      },
    },
    solution: [
      'cd ~/tienda',
      "echo 'POSTGRES_PASSWORD=secreto' > .env",
      heredoc('compose.yaml', [
        ...STACK_LINES,
        '  cache:',
        '    image: redis:7-alpine',
        'volumes:',
        '  pgdata:',
      ]),
      'docker compose up -d',
    ],
    check: {
      containers: ['tienda-front-1', 'tienda-api-1', 'tienda-db-1', 'tienda-cache-1'],
      http: ['localhost:8080/', 'localhost:8080/api/health'],
      probes: { published: [PUBLISHED], secret: ['grep -c secreto ~/tienda/compose.yaml'] },
    },
  },
  {
    id: 'docker-final-intermediate',
    block: 6,
    tier: 'intermediate',
    kind: 'final',
    limit: 720,
    setup: { files: projectFiles('~/equipo', false) },
    es: {
      title: 'Primer día en el equipo',
      goal: 'El proyecto de ~/equipo con sus Dockerfiles y su compose: front compilado en dos etapas en el 8080, api sin secretos dentro y db sana con volumen.',
      story:
        'Primer día: te dan el repositorio de ~/equipo, con una API de Node y un frontend de Vite, y ni rastro de Docker. Lo que dejes hoy es lo que levantará cada persona que llegue después. El front ya trae su default.conf, que manda /api/ a api:3000.',
      tasks: [
        'api: .dockerignore (sin node_modules, .git ni .env) y Dockerfile con la caché bien ordenada (Node 22 alpine).',
        'front: Dockerfile en dos etapas (node:22 compila con npm run build; nginx:1.27-alpine sirve dist con su default.conf en /etc/nginx/conf.d/).',
        'compose.yaml y .env (POSTGRES_PASSWORD=secreto): db con volumen y healthcheck, api esperando a db sana, front en el 8080 después de api.',
        'Levántalo y comprueba localhost:8080 y localhost:8080/api/health.',
      ],
      objectives: {
        'probe:env': 'El .env de la API no está dentro de su imagen',
        'probe:published': 'Solo front publica un puerto',
        'probe:secret': 'La contraseña no está escrita en compose.yaml',
      },
    },
    en: {
      title: 'First day on the team',
      goal: 'The ~/equipo project with its Dockerfiles and compose: front built in two stages on 8080, api without secrets inside and db healthy with a volume.',
      story:
        'First day: you get the ~/equipo repository, with a Node API and a Vite frontend, and no trace of Docker. What you leave today is what everyone joining later will bring up. The front already has its default.conf, which sends /api/ to api:3000.',
      tasks: [
        'api: .dockerignore (no node_modules, .git or .env) and a Dockerfile with a well-ordered cache (Node 22 alpine).',
        'front: two-stage Dockerfile (node:22 compiles with npm run build; nginx:1.27-alpine serves dist with its default.conf in /etc/nginx/conf.d/).',
        'compose.yaml and .env (POSTGRES_PASSWORD=secreto): db with a volume and a healthcheck, api waiting for db healthy, front on 8080 after api.',
        'Bring it up and check localhost:8080 and localhost:8080/api/health.',
      ],
      objectives: {
        'probe:env': 'The API .env is not inside its image',
        'probe:published': 'Only front publishes a port',
        'probe:secret': 'The password is not written in compose.yaml',
      },
    },
    solution: [
      'cd ~/equipo/api',
      IGNORE_CMD,
      heredoc('Dockerfile', API_LINES),
      'cd ~/equipo/front',
      heredoc('Dockerfile', [...FRONT_LINES, 'COPY default.conf /etc/nginx/conf.d/default.conf']),
      'cd ~/equipo',
      "echo 'POSTGRES_PASSWORD=secreto' > .env",
      heredoc('compose.yaml', [...STACK_LINES, 'volumes:', '  pgdata:']),
      'docker compose up -d',
    ],
    check: {
      containers: ['equipo-front-1', 'equipo-api-1', 'equipo-db-1'],
      http: ['localhost:8080/', 'localhost:8080/api/health'],
      probes: {
        env: ['docker run --rm equipo-api cat /app/.env'],
        published: [PUBLISHED],
        secret: ['grep -c secreto ~/equipo/compose.yaml'],
      },
    },
  },
]
