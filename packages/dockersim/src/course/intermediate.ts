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
        what: 'Cada instrucción del Dockerfile es una capa. Si una instrucción y lo que copia no cambian, Docker reutiliza la capa (CACHED); en cuanto una cambia, todas las de debajo se rehacen.',
        how: [
          'COPY package*.json ./      # primero solo lo que define las dependencias',
          'RUN npm ci --omit=dev      # se rehace solo si cambian esos ficheros',
          'COPY . .                   # el código, que cambia a cada commit, al final',
          'docker build -t api:1.1 .  # mira qué pasos salen CACHED',
        ],
        when: 'Siempre: lo que cambia poco arriba y lo que cambia mucho abajo. En CI ahorra minutos en cada build.',
        problems:
          'Un COPY . . antes de instalar invalida la caché con cualquier cambio (hasta un README). --no-cache la ignora entera cuando sospechas de ella.',
      },
      example:
        'Construyes el Dockerfile lento, cambias una línea de código, vuelves a construir y ves que npm ci se repite.',
      objectives: { 'probe:cache': 'Cambiar el código no reinstala las dependencias' },
    },
    en: {
      title: 'Using the cache',
      goal: 'Reorder the Dockerfile in ~/api so that changing the code does not reinstall the dependencies, and build api:1.1.',
      theory: {
        what: 'Each Dockerfile instruction is a layer. If an instruction and what it copies do not change, Docker reuses the layer (CACHED); as soon as one changes, every layer below it is rebuilt.',
        how: [
          'COPY package*.json ./      # first only what defines the dependencies',
          'RUN npm ci --omit=dev      # rebuilt only if those files change',
          'COPY . .                   # the code, which changes every commit, last',
          'docker build -t api:1.1 .  # look at which steps say CACHED',
        ],
        when: 'Always: what rarely changes at the top and what often changes at the bottom. In CI it saves minutes on every build.',
        problems:
          'A COPY . . before installing invalidates the cache with any change (even a README). --no-cache ignores it completely when you suspect it.',
      },
      example:
        'You build the slow Dockerfile, change one line of code, build again and see npm ci run again.',
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
          'node_modules       # se instalan dentro con npm ci',
          '.git',
          '.env               # secretos: nunca dentro de una imagen',
          '*.log',
          'logs',
          'docker build -t api:1.2 .   # «transferring context» baja de MB a kB',
        ],
        when: 'En todo proyecto con Dockerfile: builds más rápidos y sin colar secretos ni basura en la imagen.',
        problems:
          '*.log solo vale para la raíz: para cualquier carpeta, **/*.log. Si ignoras un fichero que el Dockerfile copia, el COPY falla con «not found».',
      },
      example: 'Construyes sin .dockerignore: mandas 190 MB y el .env acaba dentro de la imagen.',
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
          'node_modules       # installed inside with npm ci',
          '.git',
          '.env               # secrets: never inside an image',
          '*.log',
          'logs',
          'docker build -t api:1.2 .   # "transferring context" drops from MB to kB',
        ],
        when: 'In every project with a Dockerfile: faster builds and no secrets or junk sneaking into the image.',
        problems:
          '*.log only applies to the root: for any folder, **/*.log. If you ignore a file the Dockerfile copies, the COPY fails with "not found".',
      },
      example:
        'You build without .dockerignore: you send 190 MB and the .env ends up inside the image.',
      objectives: {
        'probe:env': 'The .env is not inside the image',
        'probe:git': 'The .git is not inside the image',
        'probe:modules': 'The node_modules from your machine do not overwrite the image ones',
        'probe:context': 'The context sent weighs kilobytes',
      },
    },
    example: ['cd ~/api', 'docker build -t api:gorda .', 'docker run --rm api:gorda cat /app/.env'],
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
        what: 'Un Dockerfile puede tener varias etapas (varios FROM). Compilas en una con todas las herramientas y copias solo el resultado a otra mínima con COPY --from: la imagen final no lleva ni Node ni node_modules.',
        how: [
          'FROM node:22 AS build',
          'WORKDIR /app',
          'COPY package*.json ./',
          'RUN npm ci',
          'COPY . .',
          'RUN npm run build',
          'FROM nginx:1.27-alpine',
          'COPY --from=build /app/dist /usr/share/nginx/html',
        ],
        when: 'Siempre que haya un paso de compilación: frontends, Go, Java, TypeScript. La imagen pasa de más de 1 GB a unos 50 MB.',
        problems:
          'En la etapa de compilar hacen falta las dependencias de desarrollo (npm ci sin --omit=dev): vite está ahí. --target build construye solo esa etapa, útil para depurar.',
      },
      example: 'Construyes el front en una sola etapa con node:22 y ves lo que pesa.',
      objectives: {},
    },
    en: {
      title: 'Multi-stage',
      goal: 'In ~/front, build front:1.0 in two stages (compile with node:22 and serve dist with nginx:1.27-alpine), under 60 MB, and leave it running as front on 8080.',
      theory: {
        what: 'A Dockerfile can have several stages (several FROM). You compile in one with every tool and copy only the result into a minimal one with COPY --from: the final image carries neither Node nor node_modules.',
        how: [
          'FROM node:22 AS build',
          'WORKDIR /app',
          'COPY package*.json ./',
          'RUN npm ci',
          'COPY . .',
          'RUN npm run build',
          'FROM nginx:1.27-alpine',
          'COPY --from=build /app/dist /usr/share/nginx/html',
        ],
        when: 'Whenever there is a compile step: frontends, Go, Java, TypeScript. The image goes from over 1 GB to about 50 MB.',
        problems:
          'The compile stage needs the dev dependencies (npm ci without --omit=dev): vite lives there. --target build builds just that stage, handy for debugging.',
      },
      example: 'You build the front in a single stage with node:22 and look at its size.',
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
        what: 'Un registro guarda imágenes para que otras máquinas las descarguen. El nombre completo dice dónde: registro/organización/repo:etiqueta. docker tag pone ese nombre, docker login da acceso y docker push sube las capas que falten.',
        how: [
          'docker tag api:1.4 ghcr.io/peer4u/api:1.4.0',
          'cat ~/.ghcr-token | docker login ghcr.io -u peer --password-stdin',
          'docker push ghcr.io/peer4u/api:1.4.0',
          'docker pull ghcr.io/peer4u/api:1.4.0     # desde cualquier otra máquina',
        ],
        when: 'Para que CI, el servidor o Kubernetes usen la misma imagen que probaste, sin construirla otra vez.',
        problems:
          'Sin login, el push da «unauthorized». Nunca pongas el token en la orden (-p queda en el historial de la shell): por la entrada, con --password-stdin.',
      },
      example: 'Etiquetas una prueba para ghcr.io e intentas subirla sin haber entrado.',
      objectives: {},
    },
    en: {
      title: 'Pushing to a registry',
      goal: 'Publish the image api:1.4 to the team registry as ghcr.io/peer4u/api:1.4.0. The token is in ~/.ghcr-token.',
      theory: {
        what: 'A registry stores images so other machines can pull them. The full name says where: registry/organisation/repo:tag. docker tag sets that name, docker login grants access and docker push uploads the missing layers.',
        how: [
          'docker tag api:1.4 ghcr.io/peer4u/api:1.4.0',
          'cat ~/.ghcr-token | docker login ghcr.io -u peer --password-stdin',
          'docker push ghcr.io/peer4u/api:1.4.0',
          'docker pull ghcr.io/peer4u/api:1.4.0     # from any other machine',
        ],
        when: 'So that CI, the server or Kubernetes use the very image you tested, without building it again.',
        problems:
          'Without login, push says "unauthorized". Never put the token in the command (-p stays in the shell history): pipe it in with --password-stdin.',
      },
      example: 'You tag a test image for ghcr.io and try to push it without logging in.',
      objectives: {},
    },
    example: [
      'docker tag api:1.4 ghcr.io/peer4u/prueba:0.1',
      'docker images ghcr.io/peer4u/prueba',
      'docker push ghcr.io/peer4u/prueba:0.1',
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
        what: 'Lo que un contenedor escribe en su capa muere con él. Un volumen con nombre vive aparte: lo gestiona Docker, sobrevive a docker rm y se monta en el contenedor que lo pida.',
        how: [
          'docker volume create pgdata',
          'docker run -d --name db -e POSTGRES_PASSWORD=secreto \\',
          '  -v pgdata:/var/lib/postgresql/data postgres:16',
          'docker volume ls',
          'docker volume inspect pgdata',
        ],
        when: 'Para los datos que tienen que durar: bases de datos, ficheros que suben los usuarios, colas.',
        whenNot:
          'Para el código en desarrollo es mejor un bind mount (siguiente unidad): ves y editas los ficheros desde tu máquina.',
        problems:
          'docker volume rm, docker compose down -v y system prune --volumes borran datos de verdad. Montar el volumen en otra ruta es como no montarlo.',
      },
      example:
        'Sin volumen, creas una tabla, borras el contenedor y al recrearlo la tabla ya no está.',
      objectives: {},
    },
    en: {
      title: 'Named volumes',
      goal: 'Someone removed the db container, but its data was in the pgdata volume. Create db again (postgres:16, password secreto) with that data: the notas table must still be there.',
      theory: {
        what: 'What a container writes to its layer dies with it. A named volume lives apart: Docker manages it, it survives docker rm and it is mounted in whichever container asks for it.',
        how: [
          'docker volume create pgdata',
          'docker run -d --name db -e POSTGRES_PASSWORD=secreto \\',
          '  -v pgdata:/var/lib/postgresql/data postgres:16',
          'docker volume ls',
          'docker volume inspect pgdata',
        ],
        when: 'For data that must last: databases, files users upload, queues.',
        whenNot:
          'For code in development a bind mount is better (next unit): you see and edit the files from your machine.',
        problems:
          'docker volume rm, docker compose down -v and system prune --volumes delete real data. Mounting the volume on another path is like not mounting it.',
      },
      example:
        'Without a volume, you create a table, remove the container and when you recreate it the table is gone.',
      objectives: {},
    },
    example: [
      'docker run -d --name prueba -e POSTGRES_PASSWORD=demo postgres:16',
      "docker exec prueba psql -U postgres -c 'CREATE TABLE t (x int)'",
      'docker rm -f prueba',
      'docker run -d --name prueba -e POSTGRES_PASSWORD=demo postgres:16',
      "docker exec prueba psql -U postgres -c '\\dt'",
      'docker volume ls',
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
        what: 'Un bind mount monta una carpeta de tu máquina dentro del contenedor: los dos ven los mismos ficheros. Con :ro, el contenedor no puede escribir en ella.',
        how: [
          'docker run -d --name dev -p 8081:80 \\',
          '  -v ~/web:/usr/share/nginx/html:ro nginx:1.27-alpine',
          'docker run -v "$PWD":/app …                 # la carpeta en la que estás',
          '--mount type=bind,source=$HOME/web,target=/usr/share/nginx/html,readonly',
        ],
        when: 'En desarrollo: editas en tu editor y el contenedor lo ve al momento (recarga en caliente). También para pasar una configuración.',
        whenNot:
          'En producción el código va dentro de la imagen: un bind mount ata el contenedor a una carpeta de una máquina concreta.',
        problems:
          'Docker usa la ruta del anfitrión tal cual: ./web en -v necesita una ruta absoluta o $PWD. Si la carpeta no existe, la crea vacía (y de root).',
      },
      example: 'Montas ~/web en un nginx y miras lo que sirve.',
      objectives: {},
    },
    en: {
      title: 'Bind mounts for development',
      goal: 'Serve ~/web with a container dev (nginx:1.27-alpine) on 8081 that mounts it read-only, and change ~/web/index.html so it says "Peer4U en desarrollo" without rebuilding anything.',
      theory: {
        what: 'A bind mount mounts a folder of your machine inside the container: both see the same files. With :ro, the container cannot write to it.',
        how: [
          'docker run -d --name dev -p 8081:80 \\',
          '  -v ~/web:/usr/share/nginx/html:ro nginx:1.27-alpine',
          'docker run -v "$PWD":/app …                 # the folder you are in',
          '--mount type=bind,source=$HOME/web,target=/usr/share/nginx/html,readonly',
        ],
        when: 'In development: you edit in your editor and the container sees it at once (hot reload). Also to pass in a configuration.',
        whenNot:
          'In production the code goes inside the image: a bind mount ties the container to a folder on one particular machine.',
        problems:
          'Docker uses the host path as is: ./web in -v needs an absolute path or $PWD. If the folder does not exist, it creates it empty (and owned by root).',
      },
      example: 'You mount ~/web on an nginx and look at what it serves.',
      objectives: {},
    },
    example: [
      'docker run -d --name prueba -p 9090:80 -v ~/web:/usr/share/nginx/html:ro nginx:1.27-alpine',
      'curl -s localhost:9090',
      "docker exec prueba sh -c 'echo x > /usr/share/nginx/html/x.html'",
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
        what: 'En una red creada por ti, los contenedores se encuentran por su nombre: Docker tiene un DNS interno. En la red bridge de siempre, no: solo por IP, que cambia.',
        how: [
          'docker network create peer4u',
          'docker run -d --name db --network peer4u … postgres:16-alpine',
          'docker run -d --name api --network peer4u -e DATABASE_URL=postgres://…@db:5432/… api:1.4',
          'docker exec api ping -c 1 db',
          'docker network connect peer4u web   # meter uno que ya corre',
          'docker network inspect peer4u',
        ],
        when: 'Siempre que dos contenedores hablen entre sí (la API y su base de datos, nginx y la API).',
        problems:
          'La base de datos no necesita -p: dentro de la red ya se llega a su 5432. Publicarla abre el puerto a todo el que llegue a tu máquina.',
      },
      example:
        'Dos contenedores en la red de siempre no se encuentran por nombre; en una red propia, sí.',
      objectives: {},
    },
    en: {
      title: 'Named networks',
      goal: 'Create the peer4u network and put db (postgres:16-alpine, password secreto) and api (api:1.4, port 3000 published, DATABASE_URL=postgres://postgres:secreto@db:5432/postgres) on it. /health must say db up.',
      theory: {
        what: 'On a network you create, containers find each other by name: Docker runs an internal DNS. On the default bridge network they do not: only by IP, which changes.',
        how: [
          'docker network create peer4u',
          'docker run -d --name db --network peer4u … postgres:16-alpine',
          'docker run -d --name api --network peer4u -e DATABASE_URL=postgres://…@db:5432/… api:1.4',
          'docker exec api ping -c 1 db',
          'docker network connect peer4u web   # add one that is already running',
          'docker network inspect peer4u',
        ],
        when: 'Whenever two containers talk to each other (the API and its database, nginx and the API).',
        problems:
          'The database does not need -p: inside the network its 5432 is reachable. Publishing it opens the port to anyone who reaches your machine.',
      },
      example:
        'Two containers on the default network cannot find each other by name; on a network of your own, they can.',
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
        what: 'EXPOSE en el Dockerfile solo documenta. -p publica: -p 8080:80 escucha en todas las interfaces de tu máquina; -p 127.0.0.1:6379:6379 solo en ella misma. Un puerto del anfitrión solo lo puede tener un contenedor.',
        how: [
          'docker run -d --name cache -p 127.0.0.1:6379:6379 redis:7-alpine',
          'docker port cache           # 6379/tcp -> 127.0.0.1:6379',
          'docker run -d -p 8090:80 …  # el 8080 ya está cogido: otro puerto',
          'docker ps                   # columna PORTS',
        ],
        when: 'Publica solo lo que tiene que llegar desde fuera. Lo que es solo para ti (una caché, una base de datos de pruebas), en 127.0.0.1.',
        problems:
          '«port is already allocated»: el contenedor se crea pero no arranca. Bórralo (o usa otro nombre) y créalo con otro puerto.',
      },
      example:
        'Intentas otro nginx en el 8080 ocupado, ves el error y el contenedor creado sin arrancar.',
      objectives: {},
    },
    en: {
      title: 'Ports: EXPOSE, -p and security',
      goal: 'Start cache (redis:7-alpine) with its 6379 published only for your machine (127.0.0.1), and web-nueva (nginx:1.27-alpine) on 8090, because 8080 belongs to web and must stay that way.',
      theory: {
        what: 'EXPOSE in the Dockerfile only documents. -p publishes: -p 8080:80 listens on every interface of your machine; -p 127.0.0.1:6379:6379 only on the machine itself. A host port can belong to one container only.',
        how: [
          'docker run -d --name cache -p 127.0.0.1:6379:6379 redis:7-alpine',
          'docker port cache           # 6379/tcp -> 127.0.0.1:6379',
          'docker run -d -p 8090:80 …  # 8080 is taken: another port',
          'docker ps                   # PORTS column',
        ],
        when: 'Publish only what must be reached from outside. What is just for you (a cache, a test database), on 127.0.0.1.',
        problems:
          '"port is already allocated": the container is created but does not start. Remove it (or use another name) and create it with another port.',
      },
      example:
        'You try another nginx on the busy 8080, see the error and the container created but not started.',
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
        what: 'docker cp copia ficheros entre un contenedor y tu máquina. Un volumen no se copia así: se monta en un contenedor de usar y tirar junto a una carpeta tuya y se empaqueta con tar.',
        how: [
          'docker cp web:/etc/nginx/conf.d/default.conf ~/copias/',
          'docker cp nuevo.conf web:/etc/nginx/conf.d/default.conf',
          'docker run --rm -v pgdata:/datos -v ~/copias:/backup alpine:3.20 \\',
          '  tar czf /backup/pgdata.tgz -C /datos .',
          'tar -tzf ~/copias/pgdata.tgz',
        ],
        when: 'Antes de actualizar una base de datos, de borrar un volumen o de mover datos a otra máquina.',
        problems:
          'Para una base de datos en uso, lo seguro es su propia herramienta (pg_dump) o pararla antes: un tar en caliente puede pillar ficheros a medias.',
      },
      example: 'Miras qué hay dentro del volumen con un contenedor de usar y tirar.',
      objectives: { 'probe:backup': 'La copia lleva los ficheros de la base de datos' },
    },
    en: {
      title: 'Copying files and backups',
      goal: 'Put in ~/copias the nginx configuration of web (/etc/nginx/conf.d/default.conf) and a copy of the pgdata volume as ~/copias/pgdata.tgz.',
      theory: {
        what: 'docker cp copies files between a container and your machine. A volume is not copied that way: you mount it in a throwaway container next to a folder of yours and pack it with tar.',
        how: [
          'docker cp web:/etc/nginx/conf.d/default.conf ~/copias/',
          'docker cp new.conf web:/etc/nginx/conf.d/default.conf',
          'docker run --rm -v pgdata:/datos -v ~/copias:/backup alpine:3.20 \\',
          '  tar czf /backup/pgdata.tgz -C /datos .',
          'tar -tzf ~/copias/pgdata.tgz',
        ],
        when: 'Before upgrading a database, removing a volume or moving data to another machine.',
        problems:
          'For a database in use, the safe way is its own tool (pg_dump) or stopping it first: a hot tar can catch half-written files.',
      },
      example: 'You look at what is inside the volume with a throwaway container.',
      objectives: { 'probe:backup': 'The copy holds the database files' },
    },
    example: ['docker volume ls', 'docker run --rm -v pgdata:/datos alpine:3.20 ls /datos'],
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
        what: 'Compose describe en un fichero lo que harías con varios docker run: servicios, puertos, variables, volúmenes. docker compose up lo lleva a ese estado; down lo quita. El proyecto se llama como la carpeta.',
        how: [
          'services:',
          '  web:',
          '    image: nginx:1.27-alpine',
          '    ports:',
          '      - "8080:80"',
          'docker compose up -d        # crea la red del proyecto y los contenedores',
          'docker compose ps',
          'docker compose logs web',
          'docker compose down',
        ],
        when: 'En cuanto hay más de un contenedor o una orden de docker run que ya no cabe en la cabeza: el fichero va al repositorio y todo el equipo levanta lo mismo.',
        problems:
          'YAML va por sangrías de espacios (nunca tabuladores). Pon los puertos entre comillas: "8080:80".',
      },
      example: 'En ~/demo levantas un compose de un servicio, lo miras y lo quitas.',
      objectives: {},
    },
    en: {
      title: 'Your first compose.yaml',
      goal: 'In ~/web, write a compose.yaml with a web service (nginx:1.27-alpine, 8080 to its 80) and bring it up in the background.',
      theory: {
        what: 'Compose describes in a file what you would do with several docker run: services, ports, variables, volumes. docker compose up brings everything to that state; down removes it. The project is named after the folder.',
        how: [
          'services:',
          '  web:',
          '    image: nginx:1.27-alpine',
          '    ports:',
          '      - "8080:80"',
          'docker compose up -d        # creates the project network and the containers',
          'docker compose ps',
          'docker compose logs web',
          'docker compose down',
        ],
        when: 'As soon as there is more than one container or a docker run line nobody can remember: the file goes in the repository and the whole team brings up the same thing.',
        problems: 'YAML relies on space indentation (never tabs). Quote the ports: "8080:80".',
      },
      example: 'In ~/demo you bring up a one-service compose, look at it and remove it.',
      objectives: {},
    },
    example: [
      'cd ~/demo',
      'cat compose.yaml',
      'docker compose up -d',
      'docker compose ps',
      'docker compose down',
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
        what: 'build: construye la imagen del servicio desde una carpeta; image: usa una ya hecha. Todos los servicios van a la red del proyecto y se encuentran por el nombre del servicio. Los volúmenes con nombre se declaran abajo, en volumes:.',
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
          'docker compose up -d --build   # vuelve a construir si cambió el código',
        ],
        when: 'Para el entorno de desarrollo de un servicio con sus dependencias: base de datos, caché, colas.',
        problems:
          'Si cambias el código, up -d no reconstruye solo: --build. Un volumen usado y no declarado en volumes: da error.',
      },
      example: 'Miras el Dockerfile y la configuración que espera la API.',
      objectives: {},
    },
    en: {
      title: 'Several services',
      goal: 'In ~/api, a compose.yaml with api (built from the folder, 3000 published, DATABASE_URL=postgres://postgres:secreto@db:5432/postgres) and db (postgres:16-alpine, password secreto, data in the pgdata volume). Bring it up: /health must say db up.',
      theory: {
        what: 'build: builds the service image from a folder; image: uses a ready one. Every service joins the project network and finds the others by service name. Named volumes are declared at the bottom, under volumes:.',
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
          'docker compose up -d --build   # rebuild if the code changed',
        ],
        when: 'For the development environment of a service with its dependencies: database, cache, queues.',
        problems:
          'If you change the code, up -d does not rebuild by itself: --build. A volume used but not declared under volumes: is an error.',
      },
      example: 'You read the Dockerfile and the configuration the API expects.',
      objectives: {},
    },
    example: ['cd ~/api', 'cat Dockerfile', 'cat README.md'],
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
        what: 'Compose sustituye ${VAR} con las variables de tu shell y, si no están, con las del fichero .env de la carpeta del proyecto. docker compose config enseña el resultado ya sustituido.',
        how: [
          "printf 'POSTGRES_PASSWORD=secreto\\nAPI_PORT=3000\\n' > .env",
          '      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}',
          '      - "${API_PORT}:3000"',
          '${API_PORT:-3000}          # con valor por defecto',
          'docker compose config      # el compose tal como lo entiende',
        ],
        when: 'Para que el compose.yaml vaya al repositorio y lo que cambia por persona o entorno (contraseñas, puertos) no.',
        problems:
          'El .env no se sube: va en .gitignore. Una variable que falta se queda vacía con un aviso (WARN): mira siempre docker compose config.',
      },
      example: 'Miras el compose con la contraseña escrita y cómo lo entiende Compose.',
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
        what: 'Compose replaces ${VAR} with your shell variables and, if missing, with those in the .env file of the project folder. docker compose config shows the result already replaced.',
        how: [
          "printf 'POSTGRES_PASSWORD=secreto\\nAPI_PORT=3000\\n' > .env",
          '      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}',
          '      - "${API_PORT}:3000"',
          '${API_PORT:-3000}          # with a default value',
          'docker compose config      # the compose as Compose understands it',
        ],
        when: 'So that compose.yaml goes into the repository and what changes per person or environment (passwords, ports) does not.',
        problems:
          'The .env is not committed: it goes in .gitignore. A missing variable becomes empty with a warning (WARN): always check docker compose config.',
      },
      example: 'You look at the compose with the password written in and how Compose reads it.',
      objectives: {
        'probe:secret': 'The password is no longer written in compose.yaml',
        'probe:port': 'The port comes from API_PORT',
        'probe:env': 'The .env holds the password',
        'probe:valid': 'The compose is still valid',
      },
    },
    example: ['cd ~/api', 'cat compose.yaml', 'docker compose config'],
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
        what: 'depends_on solo ordena el arranque: no espera a que la base de datos acepte conexiones. Con un healthcheck, Docker sabe si el servicio responde, y condition: service_healthy hace esperar a quien depende de él.',
        how: [
          '    healthcheck:',
          '      test: ["CMD-SHELL", "pg_isready -U postgres"]',
          '      interval: 5s',
          '      retries: 5',
          '    depends_on:',
          '      db:',
          '        condition: service_healthy',
          'docker compose ps          # STATUS: Up (healthy)',
        ],
        when: 'Siempre que un servicio necesite a otro listo al arrancar: la API y su base de datos, unas migraciones.',
        problems:
          'Un healthcheck que siempre falla deja el servicio unhealthy y los que dependen de él no arrancan («dependency failed to start»). La prueba se ejecuta dentro del contenedor: tiene que existir ahí.',
      },
      example: 'Miras el estado de los servicios: ninguno dice si está sano.',
      objectives: { 'probe:waits': 'api espera a que db esté sana' },
    },
    en: {
      title: 'Healthchecks and start order',
      goal: 'Add a healthcheck with pg_isready -U postgres to db and make api wait until db is healthy (condition: service_healthy). Apply it.',
      theory: {
        what: 'depends_on only orders the start: it does not wait for the database to accept connections. With a healthcheck, Docker knows whether the service answers, and condition: service_healthy makes its dependants wait.',
        how: [
          '    healthcheck:',
          '      test: ["CMD-SHELL", "pg_isready -U postgres"]',
          '      interval: 5s',
          '      retries: 5',
          '    depends_on:',
          '      db:',
          '        condition: service_healthy',
          'docker compose ps          # STATUS: Up (healthy)',
        ],
        when: 'Whenever a service needs another one ready when it starts: the API and its database, some migrations.',
        problems:
          'A healthcheck that always fails leaves the service unhealthy and its dependants do not start ("dependency failed to start"). The test runs inside the container: it must exist there.',
      },
      example: 'You look at the services status: none says whether it is healthy.',
      objectives: { 'probe:waits': 'api waits until db is healthy' },
    },
    example: ['cd ~/api', 'docker compose ps', "docker inspect -f '{{.State.Status}}' api-db-1"],
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
        what: 'Compose también sirve para el día a día: exec entra en un servicio por su nombre, logs junta los registros de todos, restart reinicia, --scale cambia cuántas réplicas hay y down lo quita todo menos los volúmenes.',
        how: [
          "docker compose exec db psql -U postgres -c '\\dt'",
          'docker compose logs --tail 20 api',
          'docker compose restart api',
          'docker compose up -d --scale worker=3',
          'docker compose down        # los datos siguen en el volumen',
          'docker compose down -v     # borra también los volúmenes: cuidado',
        ],
        when: 'Cada día con el entorno de desarrollo: mirar, reiniciar lo que cambió, probar con más workers.',
        problems:
          'down -v borra la base de datos. --scale de un servicio con un puerto fijo publicado choca: solo una réplica puede tener ese puerto.',
      },
      example: 'Miras los registros de la API y reinicias el worker.',
      objectives: {},
    },
    en: {
      title: 'Operating a stack',
      goal: 'In ~/api: create the pedidos table in db with compose exec, run 3 worker replicas and check that, after a down and an up, the table is still there.',
      theory: {
        what: 'Compose is for daily work too: exec gets into a service by its name, logs gathers everyone’s logs, restart restarts, --scale changes the number of replicas and down removes everything but the volumes.',
        how: [
          "docker compose exec db psql -U postgres -c '\\dt'",
          'docker compose logs --tail 20 api',
          'docker compose restart api',
          'docker compose up -d --scale worker=3',
          'docker compose down        # the data stays in the volume',
          'docker compose down -v     # also removes the volumes: careful',
        ],
        when: 'Every day with the development environment: look around, restart what changed, try more workers.',
        problems:
          'down -v deletes the database. --scale on a service with a fixed published port clashes: only one replica can own that port.',
      },
      example: 'You read the API logs and restart the worker.',
      objectives: {},
    },
    example: [
      'cd ~/api',
      'docker compose ps',
      'docker compose logs --tail 5 api',
      'docker compose restart worker',
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
