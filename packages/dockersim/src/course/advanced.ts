/**
 * Nivel avanzado: bloques 7 a 9 y su jefe final. Imágenes de producción
 * (pequeñas, sin root, con HEALTHCHECK y sin secretos), operar y depurar lo
 * que se cae (reinicios, memoria, el 137, vulnerabilidades) y publicar como
 * lo haría CI. El jefe final deja en el registro las imágenes que desplegará
 * el curso de Kubernetes (`docs/curso-docker.md`).
 */

import { API_SERVER_STRICT } from '../world.js'
import type { Unit } from './types.js'

const IGNORE = 'node_modules\n.git\n.env\n*.log\nlogs\n'

/** Una imagen de la API ya decente: alpine, caché ordenada y sin dependencias de desarrollo. */
const API_BASE =
  'FROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nEXPOSE 3000\nCMD ["node", "server.js"]\n'

/** La de producción: además, sin root y con HEALTHCHECK. */
const API_PROD =
  'FROM node:22-alpine\nRUN addgroup -S app && adduser -S app -G app\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY --chown=app:app . .\nUSER app\nEXPOSE 3000\nHEALTHCHECK --interval=10s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1\nCMD ["node", "server.js"]\n'

const write = (file: string, text: string): string => `cat > ${file} <<'EOF'\n${text}EOF`

/** El frontend: se compila en una etapa con Node y se sirve con nginx. */
const FRONT =
  'FROM node:22-alpine AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM nginx:1.27-alpine\nCOPY --from=build /app/dist /usr/share/nginx/html\nCOPY default.conf /etc/nginx/conf.d/default.conf\n'

const FRONT_CONF =
  'server {\n    listen 80;\n    root /usr/share/nginx/html;\n\n    location /api/ {\n        proxy_pass http://api:3000/;\n    }\n\n    location / {\n        try_files $uri /index.html;\n    }\n}\n'

/** Un paquete con una dependencia privada: `npm ci` necesita el token de `.npmrc`. */
const PRIVATE_PACKAGE = `{
  "name": "peer4u-api",
  "version": "1.6.0",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": { "express": "^4.21.1", "pg": "^8.13.0", "@peer4u/ui": "^2.0.0" }
}
`
const NPMRC =
  '@peer4u:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=npm_peer4uSecreto42\n'
const LEAKY =
  'FROM node:22\nARG NPM_TOKEN\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nCMD ["node", "server.js"]\n'

const WORKER =
  '// Procesa las correcciones del día en un solo lote.\nconst BATCH_MB = 300\nconsole.log(`worker: lote de ${BATCH_MB} MB`)\n'

const LOGIN = 'cat ~/.ghcr-token | docker login ghcr.io -u peer --password-stdin'
const SHA = '4f2a9c1'

const DEPLOY_BASE = `services:
  api:
    image: ghcr.io/peer4u/api:1.5.0
    environment:
      DATABASE_URL: postgres://postgres:\${POSTGRES_PASSWORD}@db:5432/postgres
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
volumes:
  pgdata:
`
const DEPLOY_DEV = `services:
  api:
    build: ../api
    ports:
      - "3000:3000"
    volumes:
      - ../api:/app
`
const DEPLOY_PROD = `services:
  api:
    restart: unless-stopped
    ports:
      - "8080:3000"
  db:
    restart: unless-stopped
`

const FINAL_BASE = `services:
  front:
    image: ghcr.io/peer4u/front:1.0.0
    ports:
      - "8080:80"
    depends_on:
      api:
        condition: service_healthy
  api:
    image: ghcr.io/peer4u/api:1.0.0
    environment:
      DATABASE_URL: postgres://postgres:\${POSTGRES_PASSWORD}@db:5432/postgres
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
volumes:
  pgdata:
`
const FINAL_PROD = `services:
  front:
    restart: unless-stopped
  api:
    restart: unless-stopped
  db:
    restart: unless-stopped
`

const NOT_ROOT = (image: string): string[] => [`docker run --rm ${image} id | grep -c 'uid=0('`]
const NO_TOKEN = (image: string): string[] => [
  `docker history --no-trunc ${image} | grep -c npm_peer4u`,
]
const NO_NPMRC = (image: string): string[] => [
  `docker run --rm ${image} ls -a /app | grep -c npmrc`,
]
const NO_CRITICAL = (image: string): string[] => [
  `docker scout cves --exit-code --only-severity critical ${image} > /dev/null; echo $?`,
]
const PLATFORMS = (ref: string): string[] => [
  `docker buildx imagetools inspect ${ref} | grep Platform`,
]

export const ADVANCED: Unit[] = [
  /* ---------- Bloque 7: imágenes de producción ---------- */
  {
    id: 'docker-small',
    block: 7,
    tier: 'advanced',
    kind: 'unit',
    setup: {
      files: {
        '~/api/.dockerignore': IGNORE,
        '~/api/Dockerfile':
          'FROM node:22\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nCMD ["node", "server.js"]\n',
      },
      run: ['docker build -t api:fat ~/api'],
      cwd: '~/api',
    },
    es: {
      title: 'Imágenes pequeñas',
      goal: 'api:fat pesa más de 1 GB. Construye api:slim desde ~/api que pese menos de 300 MB y siga contestando en /health.',
      theory: {
        what: 'Lo que más pesa es la imagen base y las dependencias. node:22 trae compiladores y herramientas (más de 1 GB); node:22-slim y node:22-alpine, solo lo justo. Y en producción no hacen falta las dependencias de desarrollo (--omit=dev).',
        how: [
          'docker images api                   # cuánto pesa cada versión',
          'docker image history api:fat        # qué capa pesa',
          'FROM node:22-alpine                 # base pequeña',
          'RUN npm ci --omit=dev               # sin eslint, vite…',
          'RUN apk add --no-cache curl         # sin dejar la caché de apk',
        ],
        when: 'Siempre en lo que se despliega: se descarga antes, arranca antes en cada nodo, ocupa menos en el registro y trae menos paquetes con vulnerabilidades.',
        whenNot:
          'Para una imagen de herramientas de desarrollo (con compiladores, depuradores) pesar más es lo normal.',
        problems:
          'Borrar en otro RUN no adelgaza: la capa de antes sigue en la imagen. Limpia en el mismo RUN que ensucia. Alpine usa musl en vez de glibc: algún módulo nativo puede necesitar compilarse distinto.',
      },
      example: 'Comparas lo que pesan las bases de Node y miras qué capas tiene api:fat.',
      objectives: { 'probe:works': 'api:slim arranca y contesta en /health' },
    },
    en: {
      title: 'Small images',
      goal: 'api:fat weighs over 1 GB. Build api:slim from ~/api weighing under 300 MB and still answering on /health.',
      theory: {
        what: 'What weighs most is the base image and the dependencies. node:22 ships compilers and tools (over 1 GB); node:22-slim and node:22-alpine, just enough. And production does not need dev dependencies (--omit=dev).',
        how: [
          'docker images api                   # size of each version',
          'docker image history api:fat        # which layer is heavy',
          'FROM node:22-alpine                 # small base',
          'RUN npm ci --omit=dev               # no eslint, vite…',
          'RUN apk add --no-cache curl         # without keeping the apk cache',
        ],
        when: 'Always for what you deploy: it downloads faster, starts faster on every node, takes less registry space and ships fewer vulnerable packages.',
        whenNot: 'For a dev tooling image (compilers, debuggers) being bigger is normal.',
        problems:
          'Deleting in another RUN does not shrink anything: the earlier layer is still in the image. Clean up in the same RUN that makes the mess. Alpine uses musl instead of glibc: some native module may need a different build.',
      },
      example: 'You compare the size of the Node bases and look at the layers of api:fat.',
      objectives: { 'probe:works': 'api:slim starts and answers on /health' },
    },
    example: ['docker pull node:22-alpine', 'docker images', 'docker image history api:fat'],
    solution: [write('Dockerfile', API_BASE), 'docker build -t api:slim .'],
    check: {
      size: ['api:slim 300'],
      probes: {
        works: [
          'docker run -d --name sonda -p 3999:3000 api:slim > /dev/null',
          'curl -s localhost:3999/health',
        ],
      },
    },
  },
  {
    id: 'docker-nonroot',
    block: 7,
    tier: 'advanced',
    kind: 'unit',
    setup: { files: { '~/api/.dockerignore': IGNORE, '~/api/Dockerfile': API_BASE }, cwd: '~/api' },
    es: {
      title: 'No correr como root',
      goal: 'Construye api:2.0 desde ~/api para que el proceso no corra como root (y siga contestando).',
      theory: {
        what: 'Si nadie dice otra cosa, el proceso del contenedor es root. Con USER corre con otro usuario: si alguien entra por un fallo de la app, no es root ni dentro ni ante el núcleo.',
        how: [
          'RUN addgroup -S app && adduser -S app -G app   # en alpine (useradd en debian)',
          'COPY --chown=app:app . .                        # que los ficheros sean suyos',
          'USER app',
          'docker run --rm api:2.0 id                      # uid distinto de 0',
          'docker run --rm -u 0 api:2.0 id                 # para depurar, root a mano',
        ],
        when: 'En toda imagen que vaya a producción. Kubernetes puede exigirlo (runAsNonRoot) y muchas empresas lo comprueban en CI.',
        problems:
          'Sin root no se escucha en puertos por debajo de 1024 (usa 3000 u 8080) ni se escribe donde no es tuyo: si la app guarda ficheros, dale su carpeta con --chown. Las imágenes oficiales de Node ya traen el usuario node.',
      },
      example: 'Miras con qué usuario corren las imágenes oficiales.',
      objectives: {
        'probe:root': 'El proceso no corre como root',
        'probe:works': 'La API sigue contestando',
      },
    },
    en: {
      title: 'Not running as root',
      goal: 'Build api:2.0 from ~/api so that the process does not run as root (and still answers).',
      theory: {
        what: 'Unless told otherwise, the container process is root. With USER it runs as another user: if someone gets in through an app bug, they are not root inside nor in front of the kernel.',
        how: [
          'RUN addgroup -S app && adduser -S app -G app   # on alpine (useradd on debian)',
          'COPY --chown=app:app . .                        # files owned by it',
          'USER app',
          'docker run --rm api:2.0 id                      # uid other than 0',
          'docker run --rm -u 0 api:2.0 id                 # root on purpose, to debug',
        ],
        when: 'In every image that goes to production. Kubernetes can require it (runAsNonRoot) and many companies check it in CI.',
        problems:
          'Without root you cannot listen below port 1024 (use 3000 or 8080) or write where you do not own: if the app saves files, give it its folder with --chown. The official Node images already include the node user.',
      },
      example: 'You check which user the official images run as.',
      objectives: {
        'probe:root': 'The process does not run as root',
        'probe:works': 'The API still answers',
      },
    },
    example: ['docker run --rm node:22-alpine id', 'docker run --rm nginx:1.27-alpine whoami'],
    solution: [
      write(
        'Dockerfile',
        'FROM node:22-alpine\nRUN addgroup -S app && adduser -S app -G app\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY --chown=app:app . .\nUSER app\nCMD ["node", "server.js"]\n',
      ),
      'docker build -t api:2.0 .',
    ],
    check: {
      images: ['api:2.0'],
      probes: {
        root: NOT_ROOT('api:2.0'),
        works: [
          'docker run -d --name sonda -p 3999:3000 api:2.0 > /dev/null',
          'curl -s localhost:3999/',
        ],
      },
    },
  },
  {
    id: 'docker-healthcheck',
    block: 7,
    tier: 'advanced',
    kind: 'unit',
    setup: { files: { '~/api/.dockerignore': IGNORE, '~/api/Dockerfile': API_BASE }, cwd: '~/api' },
    es: {
      title: 'HEALTHCHECK en la imagen',
      goal: 'Construye api:2.1 con un HEALTHCHECK que pregunte a /health y déjala corriendo como api en el 3000, healthy.',
      theory: {
        what: 'Que el proceso viva no quiere decir que la app conteste. HEALTHCHECK le da a Docker una orden que mira de verdad (pedir /health); el contenedor pasa a healthy o unhealthy y compose puede esperar a que lo esté.',
        how: [
          'HEALTHCHECK --interval=10s --timeout=3s \\',
          '  CMD wget -qO- http://localhost:3000/health || exit 1',
          'docker ps                                   # Up 1 minute (healthy)',
          "docker inspect -f '{{.State.Health.Status}}' api",
          'docker run --health-cmd "…" …               # también al arrancar',
        ],
        when: 'En toda imagen de un servicio: es lo que usan compose (depends_on con service_healthy) y los orquestadores para no mandar tráfico a quien no está listo.',
        problems:
          'La orden corre dentro del contenedor: tiene que existir allí (wget viene en alpine; curl, no siempre). Kubernetes ignora el HEALTHCHECK de la imagen: allí se escribe como probe en el manifiesto.',
      },
      example: 'Arrancas un nginx con --health-cmd y ves cómo docker ps enseña su salud.',
      objectives: {},
    },
    en: {
      title: 'HEALTHCHECK in the image',
      goal: 'Build api:2.1 with a HEALTHCHECK that asks /health and leave it running as api on 3000, healthy.',
      theory: {
        what: 'A living process does not mean the app answers. HEALTHCHECK gives Docker a command that really checks (ask /health); the container becomes healthy or unhealthy and compose can wait for it.',
        how: [
          'HEALTHCHECK --interval=10s --timeout=3s \\',
          '  CMD wget -qO- http://localhost:3000/health || exit 1',
          'docker ps                                   # Up 1 minute (healthy)',
          "docker inspect -f '{{.State.Health.Status}}' api",
          'docker run --health-cmd "…" …               # also when starting',
        ],
        when: 'In every service image: compose (depends_on with service_healthy) and orchestrators use it to avoid sending traffic to what is not ready.',
        problems:
          'The command runs inside the container: it must exist there (wget ships with alpine; curl, not always). Kubernetes ignores the image HEALTHCHECK: there it is written as a probe in the manifest.',
      },
      example: 'You start an nginx with --health-cmd and see docker ps show its health.',
      objectives: {},
    },
    example: [
      "docker run -d --name demo --health-cmd 'wget -qO- http://localhost/ || exit 1' nginx:1.27-alpine",
      'docker ps',
      "docker inspect -f '{{.State.Health.Status}}' demo",
    ],
    solution: [
      write(
        'Dockerfile',
        'FROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nHEALTHCHECK --interval=10s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1\nCMD ["node", "server.js"]\n',
      ),
      'docker build -t api:2.1 .',
      'docker run -d --name api -p 3000:3000 api:2.1',
    ],
    check: { containers: ['api'], inspect: ['api {{.State.Health.Status}}'] },
  },
  {
    id: 'docker-secrets',
    block: 7,
    tier: 'advanced',
    kind: 'unit',
    setup: {
      files: {
        '~/api/package.json': PRIVATE_PACKAGE,
        '~/api/.npmrc': { text: NPMRC, mode: 0o600 },
        '~/api/.dockerignore': IGNORE,
        '~/api/Dockerfile': LEAKY,
      },
      run: ['docker build --build-arg NPM_TOKEN=npm_peer4uSecreto42 -t api:leaky ~/api'],
      cwd: '~/api',
    },
    es: {
      title: 'Secretos fuera de la imagen',
      goal: 'api:leaky lleva el token de npm a la vista. Construye api:2.2 desde ~/api con el token como secreto de construcción: que no salga en su historial ni haya un .npmrc en /app.',
      theory: {
        what: 'Todo lo que pasa por ARG, ENV o COPY queda en la imagen y cualquiera que la descargue lo lee (docker history, docker inspect, o abriendo la capa). Un secreto de BuildKit se monta solo mientras dura ese RUN y no se guarda en ninguna capa.',
        how: [
          'docker history --no-trunc api:leaky        # el token, a la vista',
          'RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci --omit=dev',
          'docker build --secret id=npmrc,src=.npmrc -t api:2.2 .',
          'echo .npmrc >> .dockerignore              # y que COPY . . no lo meta',
        ],
        when: 'Para lo que hace falta al construir: tokens de registros privados de npm o pip, claves para clonar un repositorio.',
        whenNot:
          'Los secretos de cuando la app corre (la contraseña de la base de datos) no van en la imagen: se pasan al arrancar (variables, secrets de compose, Secrets de Kubernetes).',
        problems:
          'Un token que ya se publicó en una imagen está filtrado: además de arreglar el Dockerfile, hay que revocarlo y crear otro.',
      },
      example: 'Buscas el token en el historial de api:leaky y dentro de su carpeta /app.',
      objectives: {
        'probe:history': 'El token no sale en el historial de api:2.2',
        'probe:npmrc': 'No hay ningún .npmrc dentro de /app',
      },
    },
    en: {
      title: 'Secrets out of the image',
      goal: 'api:leaky exposes the npm token. Build api:2.2 from ~/api with the token as a build secret: it must not show in its history and there must be no .npmrc in /app.',
      theory: {
        what: 'Everything passed through ARG, ENV or COPY stays in the image and anyone who pulls it can read it (docker history, docker inspect, or opening the layer). A BuildKit secret is mounted only while that RUN lasts and is not saved in any layer.',
        how: [
          'docker history --no-trunc api:leaky        # the token, in plain sight',
          'RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci --omit=dev',
          'docker build --secret id=npmrc,src=.npmrc -t api:2.2 .',
          'echo .npmrc >> .dockerignore              # and keep COPY . . from adding it',
        ],
        when: 'For what is needed at build time: tokens for private npm or pip registries, keys to clone a repository.',
        whenNot:
          'Run-time secrets (the database password) do not go in the image: pass them at start (variables, compose secrets, Kubernetes Secrets).',
        problems:
          'A token already published in an image is leaked: besides fixing the Dockerfile, revoke it and create a new one.',
      },
      example: 'You look for the token in the history of api:leaky and inside its /app folder.',
      objectives: {
        'probe:history': 'The token does not show in the history of api:2.2',
        'probe:npmrc': 'There is no .npmrc inside /app',
      },
    },
    example: ['docker history --no-trunc api:leaky', 'docker run --rm api:leaky ls -a /app'],
    solution: [
      'echo .npmrc >> .dockerignore',
      write(
        'Dockerfile',
        'FROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci --omit=dev\nCOPY . .\nCMD ["node", "server.js"]\n',
      ),
      'docker build --secret id=npmrc,src=.npmrc -t api:2.2 .',
    ],
    check: {
      images: ['api:2.2'],
      probes: { history: NO_TOKEN('api:2.2'), npmrc: NO_NPMRC('api:2.2') },
    },
  },
  {
    id: 'docker-boss-prod',
    block: 7,
    tier: 'advanced',
    kind: 'boss',
    limit: 480,
    setup: {
      files: {
        '~/api/package.json': PRIVATE_PACKAGE,
        '~/api/.npmrc': { text: NPMRC, mode: 0o600 },
        '~/api/.dockerignore': 'node_modules\n.git\n.env\n',
        '~/api/Dockerfile': LEAKY,
      },
      run: ['docker build --build-arg NPM_TOKEN=npm_peer4uSecreto42 -t api:2.9 ~/api'],
      cwd: '~/api',
    },
    es: {
      title: 'Lista de producción',
      goal: 'api:3.0 pequeña, sin root, con HEALTHCHECK y sin el token, corriendo como api en el 3000 y healthy.',
      story:
        'Seguridad ha revisado api:2.9 antes de subirla: pesa más de 1 GB, corre como root, nadie sabe si está viva y el token de npm sale en su historial. El token ya está revocado; la imagen nueva no puede repetir nada de eso.',
      tasks: [
        'Reescribe el Dockerfile de ~/api: node:22-alpine, caché ordenada y sin dependencias de desarrollo.',
        'Un usuario sin privilegios y un HEALTHCHECK a /health.',
        'El token de .npmrc como secreto de construcción, y .npmrc fuera de la imagen.',
        'Construye api:3.0 (menos de 300 MB) y déjala como api en el 3000.',
      ],
      objectives: {
        'probe:root': 'El proceso no corre como root',
        'probe:history': 'El token no sale en el historial',
        'probe:npmrc': 'No hay ningún .npmrc dentro de /app',
      },
    },
    en: {
      title: 'Production checklist',
      goal: 'api:3.0 small, non-root, with a HEALTHCHECK and without the token, running as api on 3000 and healthy.',
      story:
        'Security reviewed api:2.9 before release: it weighs over 1 GB, runs as root, nobody knows whether it is alive and the npm token shows in its history. The token is already revoked; the new image cannot repeat any of that.',
      tasks: [
        'Rewrite the Dockerfile of ~/api: node:22-alpine, ordered cache and no dev dependencies.',
        'A non-privileged user and a HEALTHCHECK on /health.',
        'The .npmrc token as a build secret, and .npmrc out of the image.',
        'Build api:3.0 (under 300 MB) and run it as api on 3000.',
      ],
      objectives: {
        'probe:root': 'The process does not run as root',
        'probe:history': 'The token does not show in the history',
        'probe:npmrc': 'There is no .npmrc inside /app',
      },
    },
    solution: [
      'echo .npmrc >> .dockerignore',
      write(
        'Dockerfile',
        API_PROD.replace(
          'RUN npm ci --omit=dev',
          'RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci --omit=dev',
        ),
      ),
      'docker build --secret id=npmrc,src=.npmrc -t api:3.0 .',
      'docker run -d --name api -p 3000:3000 api:3.0',
    ],
    check: {
      containers: ['api'],
      size: ['api:3.0 300'],
      probes: {
        root: NOT_ROOT('api:3.0'),
        history: NO_TOKEN('api:3.0'),
        npmrc: NO_NPMRC('api:3.0'),
      },
    },
  },

  /* ---------- Bloque 8: operar y depurar ---------- */
  {
    id: 'docker-limits',
    block: 8,
    tier: 'advanced',
    kind: 'unit',
    setup: {
      files: { '~/api/.dockerignore': IGNORE, '~/api/Dockerfile': API_BASE },
      run: ['docker build -t api:2.0 ~/api'],
    },
    es: {
      title: 'Reinicios y límites',
      goal: 'Deja api:2.0 corriendo como api en el 3000, que vuelva sola si se cae (salvo que la pares tú), con 256 MB de memoria y media CPU como mucho.',
      theory: {
        what: '--restart dice qué hace Docker cuando el proceso muere; --memory y --cpus ponen techo a lo que gasta, para que un fallo no se coma la máquina entera.',
        how: [
          'docker run -d --restart unless-stopped --memory 256m --cpus 0.5 …',
          'docker stats --no-stream           # consumo frente al límite',
          "docker inspect -f '{{.HostConfig.Memory}} {{.HostConfig.NanoCpus}}' api",
          "docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' api",
        ],
        when: 'En cualquier servidor que no sea Kubernetes (una máquina con compose o docker run): sin --restart, tras un reinicio de la máquina o un fallo, el servicio no vuelve.',
        whenNot:
          'always vuelve a arrancar también lo que paraste a mano al reiniciar Docker; unless-stopped respeta tu stop. Para tareas que acaban, on-failure.',
        problems:
          'Si el proceso pasa del límite de memoria, el núcleo lo mata: sale con 137 y OOMKilled a true (siguiente unidad). Un límite demasiado justo es un reinicio detrás de otro.',
      },
      example: 'Arrancas un nginx con un límite de memoria y miras su consumo y su configuración.',
      objectives: {},
    },
    en: {
      title: 'Restarts and limits',
      goal: 'Leave api:2.0 running as api on 3000, coming back on its own if it crashes (unless you stop it), with at most 256 MB of memory and half a CPU.',
      theory: {
        what: '--restart says what Docker does when the process dies; --memory and --cpus cap what it uses, so a bug cannot eat the whole machine.',
        how: [
          'docker run -d --restart unless-stopped --memory 256m --cpus 0.5 …',
          'docker stats --no-stream           # usage against the limit',
          "docker inspect -f '{{.HostConfig.Memory}} {{.HostConfig.NanoCpus}}' api",
          "docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' api",
        ],
        when: 'On any server that is not Kubernetes (a machine with compose or docker run): without --restart, after a reboot or a crash the service does not come back.',
        whenNot:
          'always also restarts what you stopped by hand when Docker restarts; unless-stopped respects your stop. For jobs that finish, on-failure.',
        problems:
          'If the process goes over the memory limit, the kernel kills it: it exits with 137 and OOMKilled true (next unit). A limit that is too tight means restart after restart.',
      },
      example: 'You start an nginx with a memory limit and look at its usage and configuration.',
      objectives: {},
    },
    example: [
      'docker run -d --name demo --memory 64m nginx:1.27-alpine',
      'docker stats --no-stream',
      "docker inspect -f '{{.HostConfig.Memory}} {{.HostConfig.RestartPolicy.Name}}' demo",
    ],
    solution: [
      'docker run -d --name api -p 3000:3000 --restart unless-stopped --memory 256m --cpus 0.5 api:2.0',
    ],
    check: {
      containers: ['api'],
      inspect: [
        'api {{.HostConfig.RestartPolicy.Name}} {{.HostConfig.Memory}} {{.HostConfig.NanoCpus}}',
      ],
    },
  },
  {
    id: 'docker-debug',
    block: 8,
    tier: 'advanced',
    kind: 'unit',
    setup: {
      files: {
        '~/api/server.js': API_SERVER_STRICT,
        '~/api/worker.js': WORKER,
        '~/api/.dockerignore': IGNORE,
        '~/api/Dockerfile': API_BASE,
      },
      run: [
        'docker build -t api:2.0 ~/api',
        'docker run -d --name api -p 3000:3000 api:2.0',
        'docker run -d --name worker --memory 128m api:2.0 node worker.js',
      ],
    },
    es: {
      title: 'Depurar lo que se cae',
      goal: 'api y worker (los dos de api:2.0) salen nada más arrancar. Averigua por qué y déjalos corriendo con el mismo nombre: api en el 3000.',
      theory: {
        what: 'El método: docker ps -a para ver el código de salida, docker logs para leer qué dijo y docker inspect para lo que no dice (OOMKilled, límites, variables). 1 suele ser un error de la app; 137 es que lo mataron (SIGKILL), casi siempre por memoria; 143, que lo pararon (SIGTERM).',
        how: [
          'docker ps -a                                   # Exited (1), Exited (137)',
          'docker logs api',
          "docker inspect -f '{{.State.ExitCode}} {{.State.OOMKilled}}' worker",
          "docker inspect -f '{{.HostConfig.Memory}}' worker",
          'docker run --rm -it --entrypoint sh api:2.0    # entrar en la imagen sin su CMD',
        ],
        when: 'Cada vez que algo no arranca o se reinicia sin parar: primero mirar, luego cambiar una sola cosa y volver a mirar.',
        problems:
          'Con 137 los registros no dicen nada (al proceso lo matan de golpe): por eso hay que mirar OOMKilled. Para cambiar una variable o un límite hay que crear el contenedor otra vez.',
      },
      example: 'Un contenedor de alpine que sale con 3: lo ves en docker ps -a y en su inspect.',
      objectives: {},
    },
    en: {
      title: 'Debugging what crashes',
      goal: 'api and worker (both from api:2.0) exit right after starting. Find out why and leave them running with the same names: api on 3000.',
      theory: {
        what: 'The method: docker ps -a to see the exit code, docker logs to read what it said and docker inspect for what it does not say (OOMKilled, limits, variables). 1 is usually an app error; 137 means it was killed (SIGKILL), almost always for memory; 143, that it was stopped (SIGTERM).',
        how: [
          'docker ps -a                                   # Exited (1), Exited (137)',
          'docker logs api',
          "docker inspect -f '{{.State.ExitCode}} {{.State.OOMKilled}}' worker",
          "docker inspect -f '{{.HostConfig.Memory}}' worker",
          'docker run --rm -it --entrypoint sh api:2.0    # get into the image without its CMD',
        ],
        when: 'Every time something does not start or keeps restarting: look first, then change one thing and look again.',
        problems:
          'With 137 the logs say nothing (the process is killed outright): that is why you check OOMKilled. To change a variable or a limit you must create the container again.',
      },
      example:
        'An alpine container that exits with 3: you see it in docker ps -a and in its inspect.',
      objectives: {},
    },
    example: [
      "docker run --name falla alpine:3.20 sh -c 'exit 3'",
      'docker ps -a',
      "docker inspect -f '{{.State.ExitCode}} {{.State.OOMKilled}}' falla",
    ],
    solution: [
      'docker logs api',
      "docker inspect -f '{{.State.OOMKilled}}' worker",
      'docker rm api worker',
      'docker run -d --name api -p 3000:3000 -e DATABASE_URL=postgres://postgres:secreto@db:5432/peer4u api:2.0',
      'docker run -d --name worker --memory 512m api:2.0 node worker.js',
    ],
    check: { containers: ['api', 'worker'], http: ['localhost:3000/'] },
    requires: [['logs', 'inspect']],
  },
  {
    id: 'docker-scan',
    block: 8,
    tier: 'advanced',
    kind: 'unit',
    setup: {
      files: {
        '~/api/.dockerignore': IGNORE,
        '~/api/Dockerfile': API_BASE.replace('node:22-alpine', 'node:18'),
      },
      run: ['docker build -t api:old ~/api'],
      cwd: '~/api',
    },
    es: {
      title: 'Escanear vulnerabilidades',
      goal: 'api:old tiene vulnerabilidades críticas. Construye api:2.3 desde ~/api sin ninguna crítica.',
      theory: {
        what: 'Un escáner (docker scout, trivy, grype) compara los paquetes de la imagen con las bases de vulnerabilidades conocidas (CVE). Casi todas vienen de la imagen base: subir de versión o cambiar a una más pequeña quita la mayoría.',
        how: [
          'docker scout cves api:old',
          'docker scout cves --only-severity critical,high api:old',
          'docker scout cves --exit-code --only-severity critical api:2.3   # 2 si hay alguna: corta el CI',
          'trivy image api:old                                              # la otra herramienta habitual',
        ],
        when: 'En CI, en cada build: que la tubería falle si aparece una crítica. Y de vez en cuando sobre lo que ya está desplegado, porque salen CVE nuevas cada día.',
        problems:
          'Cero críticas hoy no es para siempre. Una versión fija (node:22-alpine) hay que actualizarla; fijarla por digest (@sha256:…) da builds repetibles, pero también hay que moverla a mano.',
      },
      example: 'Escaneas api:old y una base alpine para comparar.',
      objectives: { 'probe:critical': 'api:2.3 no tiene vulnerabilidades críticas' },
    },
    en: {
      title: 'Scanning for vulnerabilities',
      goal: 'api:old has critical vulnerabilities. Build api:2.3 from ~/api with none.',
      theory: {
        what: 'A scanner (docker scout, trivy, grype) compares the image packages with known vulnerability databases (CVE). Most come from the base image: upgrading it or moving to a smaller one removes most of them.',
        how: [
          'docker scout cves api:old',
          'docker scout cves --only-severity critical,high api:old',
          'docker scout cves --exit-code --only-severity critical api:2.3   # 2 if any: breaks CI',
          'trivy image api:old                                              # the other usual tool',
        ],
        when: 'In CI, on every build: make the pipeline fail when a critical one shows up. And now and then on what is already deployed, because new CVEs appear every day.',
        problems:
          'Zero critical today is not forever. A pinned version (node:22-alpine) must be updated; pinning by digest (@sha256:…) gives repeatable builds, but you still move it by hand.',
      },
      example: 'You scan api:old and an alpine base to compare.',
      objectives: { 'probe:critical': 'api:2.3 has no critical vulnerabilities' },
    },
    example: [
      'docker scout cves api:old',
      'docker pull node:22-alpine',
      'docker scout cves node:22-alpine',
    ],
    solution: ["sed -i 's/node:18/node:22-alpine/' Dockerfile", 'docker build -t api:2.3 .'],
    check: { images: ['api:2.3'], probes: { critical: NO_CRITICAL('api:2.3') } },
  },
  {
    id: 'docker-boss-incident',
    block: 8,
    tier: 'advanced',
    kind: 'boss',
    limit: 480,
    setup: {
      files: {
        '~/api/server.js': API_SERVER_STRICT,
        '~/api/worker.js': WORKER,
        '~/api/.dockerignore': IGNORE,
        '~/api/Dockerfile': API_BASE.replace('node:22-alpine', 'node:18'),
      },
      run: [
        'docker build -t api:old ~/api',
        'docker run -d --name api -p 3000:3000 --restart unless-stopped api:old',
        'docker run -d --name worker --memory 128m api:old node worker.js',
      ],
      cwd: '~/api',
    },
    es: {
      title: 'Producción está caída',
      goal: 'api y worker corriendo desde api:2.4 (sin vulnerabilidades críticas), api con reinicio y límite de memoria.',
      story:
        'Son las 7:58 y el panel de estado está en rojo: la API entra y sale sin parar, el worker de las correcciones muere al empezar el lote y, para rematar, el informe de seguridad de anoche marca críticas en la imagen. La DATABASE_URL es postgres://postgres:secreto@db:5432/peer4u.',
      tasks: [
        'Mira por qué caen api y worker (registros e inspect).',
        'Construye api:2.4 desde ~/api sobre node:22-alpine: sin críticas.',
        'Vuelve a crear api desde api:2.4: 3000 publicado, DATABASE_URL, --restart unless-stopped y 256 MB.',
        'Vuelve a crear worker desde api:2.4 (node worker.js) con memoria suficiente para su lote.',
      ],
      objectives: { 'probe:critical': 'api:2.4 no tiene vulnerabilidades críticas' },
    },
    en: {
      title: 'Production is down',
      goal: 'api and worker running from api:2.4 (no critical vulnerabilities), api with restart and a memory limit.',
      story:
        'It is 7:58 and the status page is red: the API keeps coming and going, the corrections worker dies when its batch starts and, to top it off, last night’s security report flags critical issues in the image. The DATABASE_URL is postgres://postgres:secreto@db:5432/peer4u.',
      tasks: [
        'Find out why api and worker crash (logs and inspect).',
        'Build api:2.4 from ~/api on node:22-alpine: no critical issues.',
        'Create api again from api:2.4: 3000 published, DATABASE_URL, --restart unless-stopped and 256 MB.',
        'Create worker again from api:2.4 (node worker.js) with enough memory for its batch.',
      ],
      objectives: { 'probe:critical': 'api:2.4 has no critical vulnerabilities' },
    },
    solution: [
      "sed -i 's/node:18/node:22-alpine/' Dockerfile",
      'docker build -t api:2.4 .',
      'docker rm -f api worker',
      'docker run -d --name api -p 3000:3000 -e DATABASE_URL=postgres://postgres:secreto@db:5432/peer4u --restart unless-stopped --memory 256m api:2.4',
      'docker run -d --name worker --memory 512m api:2.4 node worker.js',
    ],
    check: {
      containers: ['api', 'worker'],
      inspect: ['api {{.HostConfig.RestartPolicy.Name}} {{.HostConfig.Memory}}'],
      http: ['localhost:3000/'],
      probes: { critical: NO_CRITICAL('api:2.4') },
    },
  },

  /* ---------- Bloque 9: publicar como en CI ---------- */
  {
    id: 'docker-ci-tags',
    block: 9,
    tier: 'advanced',
    kind: 'unit',
    setup: {
      files: { '~/api/.dockerignore': IGNORE, '~/api/Dockerfile': API_PROD },
      run: ['docker build -t api:dev ~/api'],
      cwd: '~/api',
    },
    es: {
      title: 'Etiquetas de versión y de commit',
      goal: 'Publica api:dev en ghcr.io/peer4u/api con dos etiquetas: 1.5.0 y el commit corto de ~/api.',
      theory: {
        what: 'En CI cada imagen se etiqueta con la versión (1.5.0, para las personas) y con el commit (4f2a9c1, para saber exactamente qué código lleva). Las dos apuntan a la misma imagen; la del commit no se mueve nunca.',
        how: [
          'git rev-parse --short HEAD',
          'docker tag api:dev ghcr.io/peer4u/api:1.5.0',
          'docker tag api:dev ghcr.io/peer4u/api:$(git rev-parse --short HEAD)',
          'echo "$TOKEN" | docker login ghcr.io -u USUARIO --password-stdin',
          'docker push ghcr.io/peer4u/api:1.5.0',
          'docker push --all-tags ghcr.io/peer4u/api',
        ],
        when: 'En la tubería que corre en cada fusión a main: así se puede desplegar o volver a cualquier versión exacta.',
        whenNot:
          'Nada de desplegar latest ni una etiqueta que se reescribe (main, prod): no sabrías qué corre.',
        problems:
          'Con --password el token queda en el historial de la shell: mejor --password-stdin. Y una etiqueta de versión ya publicada no se vuelve a usar para otra imagen.',
      },
      example: 'Miras el commit de ~/api y las etiquetas que ya tiene api:dev.',
      objectives: {},
    },
    en: {
      title: 'Version and commit tags',
      goal: 'Publish api:dev to ghcr.io/peer4u/api with two tags: 1.5.0 and the short commit of ~/api.',
      theory: {
        what: 'In CI every image is tagged with the version (1.5.0, for people) and with the commit (4f2a9c1, to know exactly which code it holds). Both point to the same image; the commit one never moves.',
        how: [
          'git rev-parse --short HEAD',
          'docker tag api:dev ghcr.io/peer4u/api:1.5.0',
          'docker tag api:dev ghcr.io/peer4u/api:$(git rev-parse --short HEAD)',
          'echo "$TOKEN" | docker login ghcr.io -u USER --password-stdin',
          'docker push ghcr.io/peer4u/api:1.5.0',
          'docker push --all-tags ghcr.io/peer4u/api',
        ],
        when: 'In the pipeline that runs on every merge to main: you can deploy or roll back to any exact version.',
        whenNot:
          'Never deploy latest or a tag that gets rewritten (main, prod): you would not know what runs.',
        problems:
          'With --password the token stays in the shell history: prefer --password-stdin. And a version tag already published is never reused for another image.',
      },
      example: 'You check the commit of ~/api and the tags api:dev already has.',
      objectives: {},
    },
    example: ['git rev-parse --short HEAD', 'git log --oneline -1', 'docker images api'],
    solution: [
      'docker tag api:dev ghcr.io/peer4u/api:1.5.0',
      'docker tag api:dev ghcr.io/peer4u/api:$(git rev-parse --short HEAD)',
      LOGIN,
      'docker push ghcr.io/peer4u/api:1.5.0',
      'docker push ghcr.io/peer4u/api:$(git rev-parse --short HEAD)',
    ],
    check: { registry: ['ghcr.io/peer4u/api:1.5.0', `ghcr.io/peer4u/api:${SHA}`] },
  },
  {
    id: 'docker-buildx',
    block: 9,
    tier: 'advanced',
    kind: 'unit',
    setup: {
      files: { '~/api/.dockerignore': IGNORE, '~/api/Dockerfile': API_PROD },
      run: [LOGIN],
      cwd: '~/api',
    },
    es: {
      title: 'Varias plataformas con buildx',
      goal: 'Publica ghcr.io/peer4u/api:1.5.0 desde ~/api para linux/amd64 y linux/arm64 a la vez.',
      theory: {
        what: 'Los portátiles con Apple Silicon y muchos servidores en la nube son arm64; los de siempre, amd64. docker buildx build --platform construye para varias y publica una sola etiqueta con una variante por plataforma (un manifest list).',
        how: [
          'docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/peer4u/api:1.5.0 --push .',
          'docker buildx imagetools inspect ghcr.io/peer4u/api:1.5.0   # las plataformas publicadas',
          'docker buildx ls',
        ],
        when: 'Cuando la imagen la usan máquinas distintas: el equipo con Mac y la producción en amd64, o nodos arm baratos en la nube.',
        problems:
          'Varias plataformas no caben en la lista local de imágenes: hay que publicarlas a la vez (--push). Construir para la otra arquitectura va emulado y tarda más; en CI se cachea.',
      },
      example: 'Ves qué constructores hay y qué pasa si pides dos plataformas sin publicar.',
      objectives: { 'probe:platforms': 'La etiqueta publicada tiene amd64 y arm64' },
    },
    en: {
      title: 'Multi-platform with buildx',
      goal: 'Publish ghcr.io/peer4u/api:1.5.0 from ~/api for linux/amd64 and linux/arm64 at once.',
      theory: {
        what: 'Apple Silicon laptops and many cloud servers are arm64; the classic ones, amd64. docker buildx build --platform builds for several and publishes a single tag with one variant per platform (a manifest list).',
        how: [
          'docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/peer4u/api:1.5.0 --push .',
          'docker buildx imagetools inspect ghcr.io/peer4u/api:1.5.0   # published platforms',
          'docker buildx ls',
        ],
        when: 'When different machines use the image: the team on Macs and production on amd64, or cheap arm nodes in the cloud.',
        problems:
          'Several platforms do not fit in the local image list: they must be pushed at once (--push). Building for the other architecture is emulated and slower; CI caches it.',
      },
      example:
        'You check the builders and what happens if you ask for two platforms without pushing.',
      objectives: { 'probe:platforms': 'The published tag has amd64 and arm64' },
    },
    example: [
      'docker buildx ls',
      'docker buildx build --platform linux/amd64,linux/arm64 -t prueba .',
    ],
    solution: [
      'docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/peer4u/api:1.5.0 --push .',
    ],
    check: {
      registry: ['ghcr.io/peer4u/api:1.5.0'],
      probes: { platforms: PLATFORMS('ghcr.io/peer4u/api:1.5.0') },
    },
  },
  {
    id: 'docker-compose-prod',
    block: 9,
    tier: 'advanced',
    kind: 'unit',
    setup: {
      files: {
        '~/api/.dockerignore': IGNORE,
        '~/api/Dockerfile': API_PROD,
        '~/deploy/compose.yaml': DEPLOY_BASE,
        '~/deploy/compose.override.yaml': DEPLOY_DEV,
        '~/deploy/.env': 'POSTGRES_PASSWORD=secreto\n',
      },
      run: [
        'docker build -t ghcr.io/peer4u/api:1.5.0 ~/api',
        LOGIN,
        'docker push ghcr.io/peer4u/api:1.5.0',
      ],
      cwd: '~/deploy',
    },
    es: {
      title: 'Compose de producción',
      goal: 'En ~/deploy, escribe compose.prod.yaml (api y db con restart: unless-stopped, api en el 8080) y levanta producción con compose.yaml y él, sin el override de desarrollo.',
      theory: {
        what: 'compose.yaml tiene lo común; compose.override.yaml se añade solo y trae lo de desarrollo (build, bind mounts, puertos de depurar). Para producción se dicen los ficheros con -f: el común y uno de producción con lo suyo (reinicios, el puerto público).',
        how: [
          'docker compose config                                    # común + override',
          'docker compose -f compose.yaml -f compose.prod.yaml config',
          'docker compose -f compose.yaml -f compose.prod.yaml up -d',
          'restart: unless-stopped                                  # en cada servicio',
        ],
        when: 'Cuando la misma aplicación se levanta en tu máquina y en un servidor: un fichero común y lo que cambia aparte, sin copiar todo dos veces.',
        whenNot:
          'En producción nada de build ni bind mounts: se usa la imagen publicada, la misma que pasó CI.',
        problems:
          'Con -f el override ya no entra solo: si lo quieres, hay que nombrarlo. Las listas (ports, volumes) se suman entre ficheros: un override no puede quitar un bind mount del común.',
      },
      example: 'Ves qué servicios hay y cómo queda la configuración de desarrollo.',
      objectives: {},
    },
    en: {
      title: 'Production compose',
      goal: 'In ~/deploy, write compose.prod.yaml (api and db with restart: unless-stopped, api on 8080) and bring up production with compose.yaml and it, without the dev override.',
      theory: {
        what: 'compose.yaml holds what is shared; compose.override.yaml is added automatically and carries dev things (build, bind mounts, debug ports). For production you name the files with -f: the shared one and a production one with its own (restarts, the public port).',
        how: [
          'docker compose config                                    # shared + override',
          'docker compose -f compose.yaml -f compose.prod.yaml config',
          'docker compose -f compose.yaml -f compose.prod.yaml up -d',
          'restart: unless-stopped                                  # in every service',
        ],
        when: 'When the same app runs on your machine and on a server: one shared file and the differences apart, without copying everything twice.',
        whenNot:
          'In production no build and no bind mounts: you use the published image, the same one that passed CI.',
        problems:
          'With -f the override is no longer added on its own: name it if you want it. Lists (ports, volumes) add up across files: an override cannot remove a bind mount from the shared file.',
      },
      example: 'You check the services and how the development configuration looks.',
      objectives: {},
    },
    example: [
      'docker compose config --services',
      'cat compose.override.yaml',
      'docker compose config',
    ],
    solution: [
      write('compose.prod.yaml', DEPLOY_PROD),
      'docker compose -f compose.yaml -f compose.prod.yaml up -d',
    ],
    check: {
      containers: ['deploy-api-1', 'deploy-db-1'],
      inspect: [
        'deploy-api-1 {{.HostConfig.RestartPolicy.Name}} {{len .Mounts}}',
        'deploy-db-1 {{.HostConfig.RestartPolicy.Name}}',
      ],
      http: ['localhost:8080/health'],
    },
  },
  {
    id: 'docker-boss-release',
    block: 9,
    tier: 'advanced',
    kind: 'boss',
    limit: 480,
    setup: {
      files: {
        '~/api/.dockerignore': IGNORE,
        '~/api/Dockerfile': API_PROD,
        '~/front/.dockerignore': 'node_modules\n.git\n',
        '~/front/Dockerfile': FRONT,
        '~/front/default.conf': FRONT_CONF,
      },
    },
    es: {
      title: 'Día de release',
      goal: 'API 1.6.0 (y su commit) y frontend 2.1.0 publicados en ghcr.io para amd64 y arm64.',
      story:
        'El runner de CI está caído justo el día de la release y te toca hacer a mano lo que hace la tubería. Los Dockerfile de ~/api y ~/front ya están bien; la mitad del equipo despliega en arm64.',
      tasks: [
        'Inicia sesión en ghcr.io con el token de ~/.ghcr-token.',
        'Publica la API como ghcr.io/peer4u/api:1.6.0 y ghcr.io/peer4u/api:<commit corto>, para linux/amd64 y linux/arm64.',
        'Publica el frontend como ghcr.io/peer4u/front:2.1.0, para las dos plataformas.',
      ],
      objectives: {
        'probe:api': 'La API publicada tiene amd64 y arm64',
        'probe:front': 'El frontend publicado tiene amd64 y arm64',
      },
    },
    en: {
      title: 'Release day',
      goal: 'API 1.6.0 (and its commit) and frontend 2.1.0 published on ghcr.io for amd64 and arm64.',
      story:
        'The CI runner is down on release day and you have to do by hand what the pipeline does. The Dockerfiles in ~/api and ~/front are fine; half the team deploys on arm64.',
      tasks: [
        'Log in to ghcr.io with the token in ~/.ghcr-token.',
        'Publish the API as ghcr.io/peer4u/api:1.6.0 and ghcr.io/peer4u/api:<short commit>, for linux/amd64 and linux/arm64.',
        'Publish the frontend as ghcr.io/peer4u/front:2.1.0, for both platforms.',
      ],
      objectives: {
        'probe:api': 'The published API has amd64 and arm64',
        'probe:front': 'The published frontend has amd64 and arm64',
      },
    },
    solution: [
      LOGIN,
      'cd ~/api',
      'docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/peer4u/api:1.6.0 -t ghcr.io/peer4u/api:$(git rev-parse --short HEAD) --push .',
      'docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/peer4u/front:2.1.0 --push ~/front',
    ],
    check: {
      registry: [
        'ghcr.io/peer4u/api:1.6.0',
        `ghcr.io/peer4u/api:${SHA}`,
        'ghcr.io/peer4u/front:2.1.0',
      ],
      probes: {
        api: [...PLATFORMS('ghcr.io/peer4u/api:1.6.0'), ...PLATFORMS(`ghcr.io/peer4u/api:${SHA}`)],
        front: PLATFORMS('ghcr.io/peer4u/front:2.1.0'),
      },
    },
  },
  {
    id: 'docker-final-advanced',
    block: 9,
    tier: 'advanced',
    kind: 'final',
    limit: 900,
    setup: {
      files: {
        '~/front/default.conf': FRONT_CONF,
        '~/deploy/compose.yaml': FINAL_BASE,
        '~/deploy/compose.prod.yaml': FINAL_PROD,
        '~/deploy/.env': 'POSTGRES_PASSWORD=secreto\n',
      },
    },
    es: {
      title: 'Entrega para Kubernetes',
      goal: 'La API y el frontend 1.0.0 publicados como imágenes de producción y la pila de ~/deploy levantada con ellas.',
      story:
        'Peer4U se muda a Kubernetes y el equipo de plataforma solo pide una cosa: imágenes de producción en el registro. Las que publiques hoy, ghcr.io/peer4u/api:1.0.0 y ghcr.io/peer4u/front:1.0.0, son las que desplegará el primer reto del curso de Kubernetes, y su HEALTHCHECK será allí la probe. Antes de dar el visto bueno, ensaya con el compose de producción de ~/deploy.',
      tasks: [
        'Dockerfile de ~/api para producción: node:22-alpine, caché ordenada, sin node_modules ni .env en el contexto, sin dependencias de desarrollo, usuario sin privilegios y HEALTHCHECK a /health (menos de 300 MB).',
        'Publica la API como ghcr.io/peer4u/api:1.0.0 y con el commit corto de ~/api.',
        'Dockerfile multi-stage de ~/front: npm ci y npm run build en node:22-alpine; dist en nginx:1.27-alpine, con default.conf en /etc/nginx/conf.d/. Publícalo como ghcr.io/peer4u/front:1.0.0.',
        'En ~/deploy, levanta compose.yaml con compose.prod.yaml y comprueba localhost:8080/api/health.',
      ],
      objectives: {
        'probe:root': 'La API no corre como root',
        'probe:env': 'El .env no está dentro de la imagen',
      },
    },
    en: {
      title: 'Handover to Kubernetes',
      goal: 'API and frontend 1.0.0 published as production images and the ~/deploy stack running with them.',
      story:
        'Peer4U is moving to Kubernetes and the platform team asks for one thing: production images in the registry. The ones you publish today, ghcr.io/peer4u/api:1.0.0 and ghcr.io/peer4u/front:1.0.0, are what the first challenge of the Kubernetes course will deploy, and their HEALTHCHECK becomes the probe there. Before signing off, rehearse with the production compose in ~/deploy.',
      tasks: [
        'Production Dockerfile for ~/api: node:22-alpine, ordered cache, no node_modules or .env in the context, no dev dependencies, a non-privileged user and a HEALTHCHECK on /health (under 300 MB).',
        'Publish the API as ghcr.io/peer4u/api:1.0.0 and with the short commit of ~/api.',
        'Multi-stage Dockerfile for ~/front: npm ci and npm run build on node:22-alpine; dist on nginx:1.27-alpine, with default.conf in /etc/nginx/conf.d/. Publish it as ghcr.io/peer4u/front:1.0.0.',
        'In ~/deploy, bring up compose.yaml with compose.prod.yaml and check localhost:8080/api/health.',
      ],
      objectives: {
        'probe:root': 'The API does not run as root',
        'probe:env': 'The .env is not inside the image',
      },
    },
    solution: [
      LOGIN,
      'cd ~/api',
      write('.dockerignore', IGNORE),
      write('Dockerfile', API_PROD),
      'docker build -t ghcr.io/peer4u/api:1.0.0 -t ghcr.io/peer4u/api:$(git rev-parse --short HEAD) .',
      'docker push --all-tags ghcr.io/peer4u/api',
      'cd ~/front',
      "printf 'node_modules\\n.git\\n' > .dockerignore",
      write('Dockerfile', FRONT),
      'docker build -t ghcr.io/peer4u/front:1.0.0 .',
      'docker push ghcr.io/peer4u/front:1.0.0',
      'cd ~/deploy',
      'docker compose -f compose.yaml -f compose.prod.yaml up -d',
    ],
    check: {
      registry: [
        'ghcr.io/peer4u/api:1.0.0',
        `ghcr.io/peer4u/api:${SHA}`,
        'ghcr.io/peer4u/front:1.0.0',
      ],
      size: ['ghcr.io/peer4u/api:1.0.0 300'],
      containers: ['deploy-front-1', 'deploy-api-1', 'deploy-db-1'],
      http: ['localhost:8080/', 'localhost:8080/api/health'],
      probes: {
        root: NOT_ROOT('ghcr.io/peer4u/api:1.0.0'),
        env: ["docker run --rm ghcr.io/peer4u/api:1.0.0 ls -a /app | grep -c '^\\.env$'"],
      },
    },
  },
]
