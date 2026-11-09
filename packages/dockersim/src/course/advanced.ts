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
        what: 'Lo que más pesa es la base: node:22 trae compiladores; node:22-alpine, lo justo.',
        how: [
          'docker image history api:fat   # qué capa pesa',
          'FROM node:22-alpine',
          'RUN npm ci --omit=dev          # sin eslint ni vite',
        ],
        when: 'En lo que despliegas: baja y arranca antes, con menos vulnerabilidades.',
        whenNot: 'Una imagen de herramientas de desarrollo puede pesar más.',
        problems:
          'Borrar en otro RUN: RUN rm -rf node_modules sale con «0B» en docker image history y la imagen sigue en 1.37GB. Limpia en el mismo RUN.',
      },
      example:
        'Antes de verlo: tras npm ci, añades RUN rm -rf node_modules. ¿Cuánto bajará la imagen?',
      objectives: { 'probe:works': 'api:slim arranca y contesta en /health' },
    },
    en: {
      title: 'Small images',
      goal: 'api:fat weighs over 1 GB. Build api:slim from ~/api weighing under 300 MB and still answering on /health.',
      theory: {
        what: 'The heaviest part is the base: node:22 ships compilers; node:22-alpine, just enough.',
        how: [
          'docker image history api:fat   # which layer weighs',
          'FROM node:22-alpine',
          'RUN npm ci --omit=dev          # no eslint or vite',
        ],
        when: 'In what you deploy: it pulls and starts faster, with fewer vulnerabilities.',
        whenNot: 'An image of development tools may weigh more.',
        problems:
          'Deleting in another RUN: RUN rm -rf node_modules shows "0B" in docker image history and the image stays at 1.37GB. Clean up in the same RUN.',
      },
      example:
        'Before you look: after npm ci, you add RUN rm -rf node_modules. How much smaller will the image get?',
      objectives: { 'probe:works': 'api:slim starts and answers on /health' },
    },
    example: [
      'docker images api',
      'docker pull node:22-alpine',
      'docker images node',
      'cat > Dockerfile <<\'EOF\'\nFROM node:22\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nRUN rm -rf node_modules\nCOPY . .\nCMD ["node", "server.js"]\nEOF',
      'docker build -t api:x .',
      'docker images api',
      'docker image history api:x',
    ],
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
        what: 'Por defecto el contenedor corre como root. Con USER corre como otro usuario, y un fallo de la app no da root.',
        how: [
          'RUN addgroup -S app && adduser -S app -G app',
          'USER app',
          'docker run --rm api:2.0 id   # uid=100(app)',
        ],
        when: 'En toda imagen de producción: Kubernetes puede exigirlo (runAsNonRoot).',
        whenNot: 'Para depurar, docker run -u 0 da root esa vez.',
        problems:
          'USER sin crear el usuario: docker run responde «unable to find user app: no matching entries in passwd file».',
      },
      example:
        'Antes de verlo: ni node:22-alpine ni nginx:1.27-alpine dicen USER. ¿Con qué usuario corren?',
      objectives: {
        'probe:root': 'El proceso no corre como root',
        'probe:works': 'La API sigue contestando',
      },
    },
    en: {
      title: 'Not running as root',
      goal: 'Build api:2.0 from ~/api so that the process does not run as root (and still answers).',
      theory: {
        what: 'By default the container runs as root. With USER it runs as another user, so an app bug gives no root.',
        how: [
          'RUN addgroup -S app && adduser -S app -G app',
          'USER app',
          'docker run --rm api:2.0 id   # uid=100(app)',
        ],
        when: 'In every production image: Kubernetes may require it (runAsNonRoot).',
        whenNot: 'To debug, docker run -u 0 gives root that once.',
        problems:
          'USER without creating the user: docker run answers "unable to find user app: no matching entries in passwd file".',
      },
      example:
        'Before you look: neither node:22-alpine nor nginx:1.27-alpine sets USER. Which user do they run as?',
      objectives: {
        'probe:root': 'The process does not run as root',
        'probe:works': 'The API still answers',
      },
    },
    example: [
      'docker run --rm node:22-alpine id',
      'docker run --rm nginx:1.27-alpine whoami',
      'cat > Dockerfile <<\'EOF\'\nFROM node:22-alpine\nWORKDIR /app\nCOPY . .\nUSER app\nCMD ["node", "server.js"]\nEOF',
      'docker build -t api:x .',
      'docker run --rm api:x id',
    ],
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
        what: 'Que el proceso viva no quiere decir que conteste. HEALTHCHECK da a Docker una orden que lo comprueba: healthy o unhealthy.',
        how: [
          'HEALTHCHECK --interval=10s --timeout=3s \\',
          '  CMD wget -qO- http://localhost:3000/health || exit 1',
          'docker ps   # Up … (healthy)',
        ],
        when: 'En todo servicio: nadie manda tráfico a quien no está sano.',
        whenNot: 'Kubernetes ignora el HEALTHCHECK: allí va como probe del manifiesto.',
        problems:
          'Una orden que la imagen no trae: node:22-alpine no tiene curl, y con curl -f queda «(unhealthy)». Usa wget.',
      },
      example:
        'Antes de verlo: la prueba de un contenedor de node:22-alpine usa curl -f. ¿Saldrá healthy?',
      objectives: {},
    },
    en: {
      title: 'HEALTHCHECK in the image',
      goal: 'Build api:2.1 with a HEALTHCHECK that asks /health and leave it running as api on 3000, healthy.',
      theory: {
        what: 'A living process does not mean an answering app. HEALTHCHECK gives Docker a command that checks it: healthy or unhealthy.',
        how: [
          'HEALTHCHECK --interval=10s --timeout=3s \\',
          '  CMD wget -qO- http://localhost:3000/health || exit 1',
          'docker ps   # Up … (healthy)',
        ],
        when: 'In every service: no traffic goes to what is not healthy.',
        whenNot: 'Kubernetes ignores HEALTHCHECK: there it is a probe in the manifest.',
        problems:
          'A command the image lacks: node:22-alpine has no curl, and with curl -f it stays "(unhealthy)". Use wget.',
      },
      example:
        'Before you look: the test of a node:22-alpine container uses curl -f. Will it be healthy?',
      objectives: {},
    },
    example: [
      "docker run -d --name demo --health-cmd 'wget -qO- http://localhost/ || exit 1' nginx:1.27-alpine",
      "docker run -d --name demo2 --health-cmd 'curl -f http://localhost/ || exit 1' node:22-alpine sleep infinity",
      'docker ps',
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
        what: 'ARG, ENV y COPY dejan su contenido en la imagen; un secreto de BuildKit solo existe durante su RUN.',
        how: [
          'RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci',
          'docker build --secret id=npmrc,src=.npmrc -t api:2.2 .',
          'echo .npmrc >> .dockerignore',
        ],
        when: 'Para lo que hace falta al construir: tokens de npm o pip.',
        whenNot: 'Los secretos de la app en marcha se pasan al arrancar, no en la imagen.',
        problems:
          'Pasar el token con --build-arg: docker history --no-trunc enseña «NPM_TOKEN=npm_peer4uSecreto42». Revócalo y usa --secret.',
      },
      example:
        'Antes de verlo: api:leaky recibió el token con --build-arg. ¿Saldrá en docker history?',
      objectives: {
        'probe:history': 'El token no sale en el historial de api:2.2',
        'probe:npmrc': 'No hay ningún .npmrc dentro de /app',
      },
    },
    en: {
      title: 'Secrets out of the image',
      goal: 'api:leaky exposes the npm token. Build api:2.2 from ~/api with the token as a build secret: it must not show in its history and there must be no .npmrc in /app.',
      theory: {
        what: 'ARG, ENV and COPY leave their content in the image; a BuildKit secret only exists during its RUN.',
        how: [
          'RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci',
          'docker build --secret id=npmrc,src=.npmrc -t api:2.2 .',
          'echo .npmrc >> .dockerignore',
        ],
        when: 'For what is needed at build time: npm or pip tokens.',
        whenNot: 'Secrets of the running app are passed at start, not in the image.',
        problems:
          'Passing the token with --build-arg: docker history --no-trunc shows "NPM_TOKEN=npm_peer4uSecreto42". Revoke it and use --secret.',
      },
      example:
        'Before you look: api:leaky got the token with --build-arg. Will it show in docker history?',
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
        what: '--restart dice qué hace Docker cuando el proceso muere; --memory y --cpus ponen techo a lo que gasta.',
        how: [
          'docker run -d --restart unless-stopped --memory 256m --cpus 0.5 …',
          'docker stats --no-stream   # consumo frente al límite',
        ],
        when: 'En un servidor sin Kubernetes: sin --restart, tras un fallo, el servicio no vuelve.',
        whenNot: 'always arranca también lo que paraste tú; unless-stopped respeta tu stop.',
        problems:
          'Olvidar la unidad: --memory 256 son bytes, y Docker responde «Minimum memory limit allowed is 6MB». Escribe 256m.',
      },
      example:
        'Antes de verlo: arrancas un nginx con --memory 256, sin unidad. ¿Qué límite tendrá?',
      objectives: {},
    },
    en: {
      title: 'Restarts and limits',
      goal: 'Leave api:2.0 running as api on 3000, coming back on its own if it crashes (unless you stop it), with at most 256 MB of memory and half a CPU.',
      theory: {
        what: '--restart says what Docker does when the process dies; --memory and --cpus cap what it uses.',
        how: [
          'docker run -d --restart unless-stopped --memory 256m --cpus 0.5 …',
          'docker stats --no-stream   # usage against the limit',
        ],
        when: 'On a server without Kubernetes: without --restart, after a crash, the service does not come back.',
        whenNot: 'always also restarts what you stopped; unless-stopped respects your stop.',
        problems:
          'Forgetting the unit: --memory 256 means bytes, and Docker answers "Minimum memory limit allowed is 6MB". Write 256m.',
      },
      example:
        'Before you look: you start nginx with --memory 256, with no unit. What limit will it get?',
      objectives: {},
    },
    example: [
      'docker run -d --name demo --memory 64m nginx:1.27-alpine',
      'docker stats --no-stream',
      "docker inspect -f '{{.HostConfig.Memory}} {{.HostConfig.RestartPolicy.Name}}' demo",
      'docker run -d --name poco --memory 256 nginx:1.27-alpine',
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
        what: 'ps -a da el código de salida; logs, lo que dijo; inspect, lo que calla. 137 es que lo mataron, casi siempre por memoria.',
        how: [
          'docker ps -a     # Exited (137)',
          'docker logs api',
          "docker inspect -f '{{.State.OOMKilled}}' worker",
        ],
        when: 'Cuando algo no arranca: mirar, cambiar una cosa y volver a mirar.',
        whenNot: 'Con 137, docker logs no lo explica: mira OOMKilled.',
        problems:
          'Arrancarlo sin cambiar nada: tras docker start worker, sigue «Exited (137)». Crea el contenedor otra vez con el límite nuevo.',
      },
      example:
        'Antes de verlo: worker salió con 137 y lo arrancas con docker start. ¿Seguirá corriendo?',
      objectives: {},
    },
    en: {
      title: 'Debugging what crashes',
      goal: 'api and worker (both from api:2.0) exit right after starting. Find out why and leave them running with the same names: api on 3000.',
      theory: {
        what: 'ps -a gives the exit code; logs, what it said; inspect, what it hides. 137 means it was killed, almost always for memory.',
        how: [
          'docker ps -a     # Exited (137)',
          'docker logs api',
          "docker inspect -f '{{.State.OOMKilled}}' worker",
        ],
        when: 'When something does not start: look, change one thing and look again.',
        whenNot: 'With 137, docker logs does not explain it: check OOMKilled.',
        problems:
          'Starting it unchanged: after docker start worker, it is still "Exited (137)". Create the container again with the new limit.',
      },
      example:
        'Before you look: worker exited with 137 and you start it with docker start. Will it keep running?',
      objectives: {},
    },
    example: [
      "docker run --name falla alpine:3.20 sh -c 'exit 3'",
      'docker ps -a',
      "docker inspect -f '{{.State.ExitCode}} {{.State.OOMKilled}}' falla",
      'docker start worker',
      'docker ps -a',
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
        what: 'docker scout cves cruza los paquetes de la imagen con las vulnerabilidades conocidas (CVE). Casi todas vienen de la base.',
        how: [
          'docker scout cves api:old   # 4C 37H 112M 0L',
          'docker scout cves --exit-code --only-severity critical api:2.3',
        ],
        when: 'En CI, en cada build: salen CVE nuevas cada día.',
        whenNot: 'Cero críticas hoy no es para siempre: reconstruye a menudo.',
        problems:
          'Escanear en CI sin --exit-code: dice «153 vulnerabilities», pero sale con 0 y la tubería sigue. Con --exit-code, sale con 2.',
      },
      example:
        'Antes de verlo: api:old parte de node:18. ¿Cuántas críticas tendrá, y cuántas node:22-alpine?',
      objectives: { 'probe:critical': 'api:2.3 no tiene vulnerabilidades críticas' },
    },
    en: {
      title: 'Scanning for vulnerabilities',
      goal: 'api:old has critical vulnerabilities. Build api:2.3 from ~/api with none.',
      theory: {
        what: 'docker scout cves checks the image packages against known vulnerabilities (CVE). Most come from the base.',
        how: [
          'docker scout cves api:old   # 4C 37H 112M 0L',
          'docker scout cves --exit-code --only-severity critical api:2.3',
        ],
        when: 'In CI, on every build: new CVEs appear every day.',
        whenNot: 'Zero criticals today is not forever: rebuild often.',
        problems:
          'Scanning in CI without --exit-code: it says "153 vulnerabilities" but exits with 0 and the pipeline goes on. With --exit-code, it exits with 2.',
      },
      example:
        'Before you look: api:old starts from node:18. How many criticals will it have, and node:22-alpine?',
      objectives: { 'probe:critical': 'api:2.3 has no critical vulnerabilities' },
    },
    example: [
      'docker scout cves api:old',
      'echo $?',
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
        what: 'En CI cada imagen lleva la versión (1.5.0), para las personas, y el commit (4f2a9c1), que dice qué código lleva.',
        how: [
          'docker tag api:dev ghcr.io/peer4u/api:1.5.0',
          'docker tag api:dev ghcr.io/peer4u/api:$(git rev-parse --short HEAD)',
          'docker push ghcr.io/peer4u/api:1.5.0',
        ],
        when: 'En cada fusión a main: así despliegas o vuelves a una versión exacta.',
        whenNot: 'Nada de desplegar latest: no sabrías qué corre.',
        problems:
          'Subir una etiqueta sin crearla antes con docker tag: el push responde «An image does not exist locally with the tag».',
      },
      example:
        'Antes de verlo: subes ghcr.io/peer4u/api:4f2a9c1 sin haberla etiquetado. ¿Qué responde docker push?',
      objectives: {},
    },
    en: {
      title: 'Version and commit tags',
      goal: 'Publish api:dev to ghcr.io/peer4u/api with two tags: 1.5.0 and the short commit of ~/api.',
      theory: {
        what: 'In CI each image gets the version (1.5.0), for people, and the commit (4f2a9c1), which says what code it carries.',
        how: [
          'docker tag api:dev ghcr.io/peer4u/api:1.5.0',
          'docker tag api:dev ghcr.io/peer4u/api:$(git rev-parse --short HEAD)',
          'docker push ghcr.io/peer4u/api:1.5.0',
        ],
        when: 'On every merge to main: so you can deploy or roll back to an exact version.',
        whenNot: 'Never deploy latest: you would not know what runs.',
        problems:
          'Pushing a tag you never created with docker tag: the push answers "An image does not exist locally with the tag".',
      },
      example:
        'Before you look: you push ghcr.io/peer4u/api:4f2a9c1 without tagging it. What does docker push answer?',
      objectives: {},
    },
    example: [
      'git rev-parse --short HEAD',
      'docker images api',
      LOGIN,
      'docker push ghcr.io/peer4u/api:4f2a9c1',
    ],
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
        what: 'Los Mac con Apple Silicon son arm64; muchos servidores, amd64. buildx --platform construye para varias bajo una sola etiqueta.',
        how: [
          'docker buildx build --platform linux/amd64,linux/arm64 \\',
          '  -t ghcr.io/peer4u/api:1.5.0 --push .',
          'docker buildx imagetools inspect ghcr.io/peer4u/api:1.5.0',
        ],
        when: 'Cuando la usan máquinas distintas: el equipo con Mac y producción en amd64.',
        whenNot: 'Para una sola plataforma basta docker build.',
        problems:
          'Pedir dos plataformas sin --push: «ERROR: docker exporter does not currently support exporting manifest lists». Se publican a la vez, con --push.',
      },
      example: 'Antes de verlo: pides amd64 y arm64 sin --push. ¿Dónde se guardará la imagen?',
      objectives: { 'probe:platforms': 'La etiqueta publicada tiene amd64 y arm64' },
    },
    en: {
      title: 'Multi-platform with buildx',
      goal: 'Publish ghcr.io/peer4u/api:1.5.0 from ~/api for linux/amd64 and linux/arm64 at once.',
      theory: {
        what: 'Apple Silicon Macs are arm64; many servers, amd64. buildx --platform builds for several under a single tag.',
        how: [
          'docker buildx build --platform linux/amd64,linux/arm64 \\',
          '  -t ghcr.io/peer4u/api:1.5.0 --push .',
          'docker buildx imagetools inspect ghcr.io/peer4u/api:1.5.0',
        ],
        when: 'When different machines use it: the team on Macs and production on amd64.',
        whenNot: 'For a single platform docker build is enough.',
        problems:
          'Asking for two platforms without --push: "ERROR: docker exporter does not currently support exporting manifest lists". They are published at once, with --push.',
      },
      example:
        'Before you look: you ask for amd64 and arm64 without --push. Where will the image be kept?',
      objectives: { 'probe:platforms': 'The published tag has amd64 and arm64' },
    },
    example: [
      'docker buildx ls',
      'docker buildx build --platform linux/amd64,linux/arm64 -t prueba .',
      'docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/peer4u/prueba:0.1 --push .',
      'docker buildx imagetools inspect ghcr.io/peer4u/prueba:0.1',
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
        what: 'compose.override.yaml se suma solo y trae lo de desarrollo. Con -f eliges tú: el común y uno de producción.',
        how: [
          'docker compose -f compose.yaml -f compose.prod.yaml up -d',
          'restart: unless-stopped   # en cada servicio',
        ],
        when: 'Cuando la misma app corre en tu máquina y en un servidor.',
        whenNot: 'En producción, ni build ni bind mounts.',
        problems:
          'Solo -f compose.prod.yaml: le falta lo común y responde «service "api" has neither an image nor a build context specified». Nombra los dos.',
      },
      example:
        'Antes de verlo: prueba.yaml solo dice restart. ¿Qué pasa si lo usas con -f sin compose.yaml?',
      objectives: {},
    },
    en: {
      title: 'Production compose',
      goal: 'In ~/deploy, write compose.prod.yaml (api and db with restart: unless-stopped, api on 8080) and bring up production with compose.yaml and it, without the dev override.',
      theory: {
        what: 'compose.override.yaml is added on its own and brings the development bits. With -f you pick: the common file and a production one.',
        how: [
          'docker compose -f compose.yaml -f compose.prod.yaml up -d',
          'restart: unless-stopped   # in every service',
        ],
        when: 'When the same app runs on your machine and on a server.',
        whenNot: 'In production, no build and no bind mounts.',
        problems:
          'Only -f compose.prod.yaml: it lacks the common part and answers "service "api" has neither an image nor a build context specified". Name both.',
      },
      example:
        'Before you look: prueba.yaml only says restart. What happens if you use it with -f without compose.yaml?',
      objectives: {},
    },
    example: [
      'docker compose config --services',
      'cat compose.override.yaml',
      "cat > prueba.yaml <<'EOF'\nservices:\n  api:\n    restart: unless-stopped\nEOF",
      'docker compose -f prueba.yaml config',
      'docker compose -f compose.yaml -f prueba.yaml config',
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
        'Peer4U se muda a Kubernetes y el equipo de plataforma solo pide una cosa: imágenes de producción en el registro. Las que publiques hoy, ghcr.io/peer4u/api:1.0.0 y ghcr.io/peer4u/front:1.0.0, son las que desplegará el primer reto del curso de Kubernetes, y lo que mira su HEALTHCHECK (/health) será allí la probe, escrita en el manifiesto. Antes de dar el visto bueno, ensaya con el compose de producción de ~/deploy.',
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
        'Peer4U is moving to Kubernetes and the platform team asks for one thing: production images in the registry. The ones you publish today, ghcr.io/peer4u/api:1.0.0 and ghcr.io/peer4u/front:1.0.0, are what the first challenge of the Kubernetes course will deploy, and what their HEALTHCHECK checks (/health) becomes the probe there, written in the manifest. Before signing off, rehearse with the production compose in ~/deploy.',
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
