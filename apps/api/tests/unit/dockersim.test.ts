/**
 * Docker simulado (`packages/dockersim`): que se comporte como Docker en lo
 * que enseña el curso, que las formas equivalentes valgan igual, que los topes
 * paren lo que podría colgar la web o la API y que el motor no toque el sistema.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { checkAttempt, LIMITS, registryImages, run, startOf, UNITS } from '@sanatorio/dockersim'
import type { World } from '@sanatorio/dockersim'
import { describe, expect, it } from 'vitest'

const unit = (id: string) => {
  const found = UNITS.find((each) => each.id === id)

  if (found === undefined) throw new Error(`falta la unidad ${id}`)

  return found
}

const START = unit('docker-hello')

/** Ejecuta varias órdenes desde el mundo de partida y devuelve lo de la última. */
function sh(...entries: string[]): { out: string; code: number; world: World } {
  let world = startOf(START)
  let last = { out: '', code: 0 }

  for (const entry of entries) {
    const result = run(world, entry)

    world = result.world
    last = { out: result.output.join('\n'), code: result.code }
  }

  return { ...last, world }
}

const DOCKERFILE = (body: string) => `cat > Dockerfile <<'EOF'\n${body}\nEOF`

describe('Docker simulado: contenedores', () => {
  it('run, ps, logs, exec, stop y rm se portan como Docker', () => {
    expect(sh('docker run hello-world').out).toContain('Hello from Docker!')
    expect(
      sh('docker run -d --name web -p 8080:80 nginx:1.27', 'curl -s localhost:8080').out,
    ).toContain('Welcome to nginx!')
    expect(
      sh('docker run -d --name web nginx:1.27', 'docker run -d --name web nginx:1.27'),
    ).toMatchObject({ code: 125 })
    expect(sh('docker run -d --name db postgres:16', 'docker logs db').out).toContain(
      'POSTGRES_PASSWORD',
    )
    expect(sh('docker run -d --name web nginx:1.27', 'docker rm web')).toMatchObject({ code: 1 })
    expect(
      sh(
        'docker run -d --name web nginx:1.27',
        'docker stop web',
        "docker inspect -f '{{.State.Status}} {{.State.ExitCode}}' web",
      ).out,
    ).toBe('exited 0')
    expect(
      sh(
        'docker run -d --name a -p 8080:80 nginx:1.27',
        'docker run -d --name b -p 8080:80 nginx:1.27',
      ).out,
    ).toContain('port is already allocated')
    expect(sh('docker run ngnix').out).toContain('pull access denied')
    expect(sh('docker logs nada')).toMatchObject({
      code: 1,
      out: 'Error response from daemon: No such container: nada',
    })
    expect(sh('docker run --rm alpine:3.20 echo hola', 'docker ps -aq | wc -l').out).toBe('0')
    expect(
      sh(
        'docker run -d --name web nginx:1.27-alpine',
        "docker exec web sh -c 'echo hola > /tmp/x && cat /tmp/x'",
      ).out,
    ).toBe('hola')
    expect(sh('docker run -d --name web nginx:1.27', 'docker exec web nada').code).toBe(127)
  })

  it('volúmenes, redes con DNS por nombre y límites de memoria', () => {
    const data = sh(
      'docker run -d --name db -e POSTGRES_PASSWORD=x -v datos:/var/lib/postgresql/data postgres:16',
      "docker exec db psql -U postgres -c 'CREATE TABLE t (x int)'",
      'docker rm -f db',
      'docker run -d --name db -e POSTGRES_PASSWORD=x -v datos:/var/lib/postgresql/data postgres:16',
      "docker exec db psql -U postgres -c '\\dt'",
    )

    expect(data.out).toContain('public | t')

    const lost = sh(
      'docker run -d --name db -e POSTGRES_PASSWORD=x postgres:16',
      "docker exec db psql -U postgres -c 'CREATE TABLE t (x int)'",
      'docker rm -f db',
      'docker run -d --name db -e POSTGRES_PASSWORD=x postgres:16',
      "docker exec db psql -U postgres -c '\\dt'",
    )

    expect(lost.out).toBe('Did not find any relations.')
    expect(
      sh(
        'docker run -d --name db -e POSTGRES_PASSWORD=x postgres:16',
        'docker run -d --name c alpine:3.20 sleep infinity',
        'docker exec c ping -c 1 db',
      ).out,
    ).toContain("bad address 'db'")
    expect(
      sh(
        'docker network create red',
        'docker run -d --name db --network red -e POSTGRES_PASSWORD=x postgres:16',
        'docker run -d --name c --network red alpine:3.20 sleep infinity',
        'docker exec c ping -c 1 db',
      ).out,
    ).toContain('1 packets received')
    expect(
      sh(
        'docker run -d --name api -m 32m node:22-alpine node server.js',
        "docker inspect -f '{{.State.ExitCode}} {{.State.OOMKilled}}' api",
      ).out,
    ).toBe('137 true')
  })

  it('bind mounts: -v crea la carpeta que falta, --mount falla, y un nombre es un volumen', () => {
    expect(sh('docker run -d --name a -v /nueva:/x alpine:3.20 sleep 1', 'ls -d /nueva').out).toBe(
      '/nueva',
    )

    const strict = sh(
      'docker run -d --name a --mount type=bind,source=/nada,target=/x alpine:3.20 sleep 1',
    )

    expect(strict.code).toBe(125)
    expect(strict.out).toContain('bind source path does not exist: /nada')
    expect(run(strict.world, 'docker ps -aq').output).toEqual([])
    expect(
      sh(
        'docker run -d --name a --mount type=bind,source=/home/peer/web,target=/x,readonly alpine:3.20 sleep 1',
        "docker inspect -f '{{range .Mounts}}{{.Type}} {{.RW}}{{end}}' a",
      ).out,
    ).toBe('bind false')
    expect(
      sh('docker run -d --name a -v web:/x alpine:3.20 sleep 1', 'docker volume ls -q').out,
    ).toBe('web')
  })
})

describe('Docker simulado: imágenes y compose', () => {
  it('construye con caché, respeta .dockerignore y publica con login', () => {
    const body =
      'FROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nCMD ["node", "server.js"]'
    const second = sh(
      'cd ~/api',
      DOCKERFILE(body),
      'docker build -t api .',
      "echo '//' >> server.js",
      'docker build -t api .',
    )

    expect(second.out).toContain('CACHED [4/5] RUN npm ci --omit=dev')
    expect(second.out).not.toContain('CACHED [5/5]')
    expect(
      sh('cd ~/api', DOCKERFILE(body), 'docker build -t api .', 'docker run --rm api cat /app/.env')
        .out,
    ).toContain('DATABASE_URL')
    expect(
      sh(
        'cd ~/api',
        DOCKERFILE(body),
        "printf '.env\\nnode_modules\\n' > .dockerignore",
        'docker build -t api .',
        'docker run --rm api cat /app/.env',
      ).code,
    ).toBe(1)
    expect(
      sh('cd ~/api', DOCKERFILE('FROM node:22-alpine\nRUN npm ci'), 'docker build -t x .').out,
    ).toContain('did not complete successfully')
    expect(sh('cd ~/api', DOCKERFILE('FROM nada:1\n'), 'docker build -t x .').code).toBe(1)
    expect(sh('cd ~/api', DOCKERFILE('FORM node:22\n'), 'docker build -t x .').out).toContain(
      'unknown instruction',
    )

    const pushed = sh(
      'cd ~/api',
      DOCKERFILE(body),
      'docker build -t ghcr.io/peer4u/api:1.0.0 .',
      'docker push ghcr.io/peer4u/api:1.0.0',
    )

    expect(pushed.code).toBe(1)

    const logged = sh(
      'cd ~/api',
      DOCKERFILE(`${body}\nHEALTHCHECK CMD wget -qO- http://localhost:3000/health || exit 1`),
      'docker build -t ghcr.io/peer4u/api:1.0.0 .',
      'cat ~/.ghcr-token | docker login ghcr.io -u peer --password-stdin',
      'docker push ghcr.io/peer4u/api:1.0.0',
    )

    expect(logged.code).toBe(0)
    // Lo que se lleva el curso de Kubernetes: lo publicado, con su healthcheck.
    expect(registryImages(logged.world)).toEqual([
      expect.objectContaining({
        ref: 'ghcr.io/peer4u/api:1.0.0',
        ports: [],
        healthcheck: expect.objectContaining({
          test: ['CMD-SHELL', 'wget -qO- http://localhost:3000/health || exit 1'],
        }),
      }),
    ])
  })

  it('compose: variables, orden por salud, recrear solo lo cambiado y down -v', () => {
    const compose = [
      "printf 'PASS=secreto\\n' > .env",
      `cat > compose.yaml <<'EOF'\nservices:\n  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_PASSWORD: \${PASS}\n    volumes: [datos:/var/lib/postgresql/data]\n    healthcheck:\n      test: ["CMD-SHELL", "pg_isready -U postgres"]\n  web:\n    image: nginx:1.27-alpine\n    ports: ["8080:80"]\n    depends_on:\n      db:\n        condition: service_healthy\nvolumes:\n  datos:\nEOF`,
    ]
    const up = sh('mkdir app', 'cd app', ...compose, 'docker compose up -d', 'docker compose ps')

    expect(up.out).toContain('(healthy)')
    expect(sh('mkdir app', 'cd app', ...compose, 'docker compose config').out).toContain(
      'POSTGRES_PASSWORD: secreto',
    )
    expect(
      sh('mkdir app', 'cd app', ...compose, 'docker compose up -d', 'docker compose up -d').out,
    ).toContain('Running')
    expect(
      sh(
        'mkdir app',
        'cd app',
        ...compose,
        'docker compose up -d',
        'docker compose down -v',
        'docker volume ls -q',
      ).out,
    ).toBe('')
    expect(
      sh('mkdir app', 'cd app', 'echo "services: [" > compose.yaml', 'docker compose up -d').code,
    ).toBe(1)
    expect(sh('docker compose up -d').out).toContain('no configuration file provided')
  })
})

describe('Docker simulado: formas equivalentes', () => {
  it('opciones largas, con =, el nombre completo de la imagen y docker container …', () => {
    const detached = unit('docker-detached')

    for (const entry of [
      'docker run -d --name web -p 8080:80 nginx:1.27',
      'docker run --detach --name=web --publish 8080:80 docker.io/library/nginx:1.27',
      'docker container run -dp 8080:80 --name web nginx:1.27',
    ])
      expect(checkAttempt(detached, [entry])).toMatchObject({ done: true, stars: 3 })
  })

  it('parar y borrar en dos pasos vale, con una estrella menos', () => {
    expect(
      checkAttempt(unit('docker-lifecycle'), [
        'docker start cache',
        'docker stop legacy',
        'docker rm legacy',
      ]),
    ).toMatchObject({ done: true, stars: 2 })
  })

  it('el registro con -n o con tail, y la limpieza con system prune', () => {
    expect(checkAttempt(unit('docker-logs'), ['docker logs -n 3 db']).done).toBe(true)
    expect(checkAttempt(unit('docker-logs'), ['docker logs db | tail -n 3']).done).toBe(true)
    expect(checkAttempt(unit('docker-cleanup'), ['docker system prune -f'])).toMatchObject({
      done: true,
      stars: 3,
    })
  })

  it('un Dockerfile con la caché mal ordenada no supera al jefe', () => {
    const boss = unit('docker-boss-dockerize')
    const bad = DOCKERFILE(
      'FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci --omit=dev\nCMD ["node", "server.js"]',
    )
    const good = DOCKERFILE(
      'FROM node:22-alpine\nWORKDIR /app\nCOPY package.json package-lock.json ./\nRUN npm ci --omit=dev\nCOPY . .\nCMD node server.js',
    )
    const rest = ['docker build -t api:1.0.0 .', 'docker run -d --name api -p 3000:3000 api:1.0.0']

    expect(checkAttempt(boss, ['cd ~/api', bad, ...rest], 10).misses).toEqual(['probe:cache'])
    expect(checkAttempt(boss, ['cd ~/api', good, ...rest], 10).done).toBe(true)
  })
})

describe('Docker simulado: como Docker 27/28 de verdad (revisión de 2026-11)', () => {
  it('COPY --from y FROM con una imagen que no hay: el error de BuildKit', () => {
    const stage = sh(
      'cd ~/web',
      DOCKERFILE(
        'FROM alpine:3.20 AS build\nRUN echo hola > /x\nFROM alpine:3.20\nCOPY --from=buidl /x /x',
      ),
      'docker build -t x .',
    )

    expect(stage.code).toBe(1)
    expect(stage.out).toContain('ERROR [internal] load metadata for docker.io/library/buidl:latest')
    expect(stage.out).toContain(
      'ERROR: failed to solve: buidl: failed to resolve source metadata for docker.io/library/buidl:latest: pull access denied, repository does not exist or may require authorization',
    )
    expect(sh('cd ~/web', DOCKERFILE('FROM nginx:9.99\n'), 'docker build -t x .').out).toContain(
      'docker.io/library/nginx:9.99: not found',
    )
  })

  it('COPY no sale del contexto: ../ se resuelve dentro de él', () => {
    expect(
      sh(
        'cd ~/web',
        DOCKERFILE('FROM nginx:1.27-alpine\nCOPY ../front/index.html /usr/share/nginx/html/'),
        'docker build -t x .',
      ).out,
    ).toContain('"/front/index.html": not found')
    expect(
      sh(
        'cd ~/web',
        DOCKERFILE('FROM nginx:1.27-alpine\nCOPY ../index.html /usr/share/nginx/html/'),
        'docker build -t x .',
      ).code,
    ).toBe(0)
  })

  it('ENTRYPOINT en forma shell no recibe ni el CMD ni lo de docker run; sh -c tiene $0, $1 y $?', () => {
    const shell = [
      'mkdir ~/s',
      'cd ~/s',
      DOCKERFILE('FROM alpine:3.20\nENTRYPOINT echo hola\nCMD ["equipo"]'),
      'docker build -t s .',
    ]

    expect(sh(...shell, 'docker run --rm s').out).toBe('hola')
    expect(sh(...shell, 'docker run --rm s otro').out).toBe('hola')
    expect(
      sh('docker pull alpine:3.20', "docker run --rm alpine:3.20 sh -c 'echo $0 $1' a b").out,
    ).toBe('a b')
    expect(
      sh('docker pull alpine:3.20', "docker run --rm alpine:3.20 sh -c 'false; echo $?'").out,
    ).toBe('1')
  })

  it('USER: quien no es root no escribe en lo de root, y el uid es el de alpine', () => {
    const image = [
      'cd ~/api',
      DOCKERFILE(
        'FROM node:22-alpine\nRUN addgroup -S app && adduser -S app -G app\nWORKDIR /app\nCOPY package*.json ./\nCOPY --chown=app:app server.js ./\nUSER app\nCMD ["node", "server.js"]',
      ),
      'docker build -t yo .',
    ]

    expect(sh(...image, "docker run --rm yo sh -c 'echo x > /app/f'").out).toBe(
      "sh: can't create /app/f: Permission denied",
    )
    expect(sh(...image, 'docker run --rm yo touch /app/package.json').out).toBe(
      'touch: /app/package.json: Permission denied',
    )
    expect(
      sh(...image, "docker run --rm yo sh -c 'echo // >> /app/server.js && echo bien'").out,
    ).toBe('bien')
    expect(sh(...image, "docker run --rm yo sh -c 'echo x > /tmp/f && cat /tmp/f'").out).toBe('x')
    expect(sh(...image, 'docker run --rm yo id').out).toBe(
      'uid=100(app) gid=101(app) groups=101(app),101(app)',
    )
    expect(sh(...image, 'docker run --rm -u 0 yo touch /app/f').code).toBe(0)
    // npm ci como node en un /app de root: EACCES, como en Docker.
    expect(
      sh(
        'cd ~/api',
        DOCKERFILE(
          'FROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nUSER node\nRUN npm ci --omit=dev',
        ),
        'docker build -t x .',
      ).out,
    ).toContain("EACCES: permission denied, mkdir '/app/node_modules'")
    // Con USER antes de WORKDIR, BuildKit crea la carpeta de ese usuario.
    expect(
      sh(
        'cd ~/api',
        DOCKERFILE(
          'FROM node:22-alpine\nUSER node\nWORKDIR /home/node/app\nCOPY --chown=node:node package*.json ./\nRUN npm ci --omit=dev',
        ),
        'docker build -t x .',
      ).code,
    ).toBe(0)
    expect(
      sh('cd ~/api', DOCKERFILE('FROM node:22-alpine\nRUN useradd -r app'), 'docker build -t x .')
        .out,
    ).toContain('useradd: not found')
  })

  it('scout: --only-severity filtra todo y mira el registro si no está en local', () => {
    const critical = sh('docker scout cves --only-severity critical --exit-code node:18')

    expect(critical.code).toBe(2)
    expect(critical.out).toContain('a total of 4 vulnerabilities')
    expect(critical.out).toContain('4C   0H   0M   0L')
    expect(sh('docker scout cves node:18').out).toContain('a total of 153 vulnerabilities')
    expect(sh('docker scout cves --exit-code --only-severity critical node:22-alpine').code).toBe(0)
  })

  it('curl a un puerto publicado donde no escucha nadie dentro: «Connection reset by peer»', () => {
    const wrong = sh('docker run -d --name w -p 8080:8080 nginx:1.27-alpine', 'curl localhost:8080')

    expect(wrong).toMatchObject({
      code: 56,
      out: 'curl: (56) Recv failure: Connection reset by peer',
    })
    expect(
      sh('docker run -d --name w -p 8080:8080 nginx:1.27-alpine', 'curl -s localhost:8080'),
    ).toMatchObject({ code: 56, out: '' })
    expect(
      sh(
        'docker run -d --name db -e POSTGRES_PASSWORD=x -p 5432:5432 postgres:16',
        'curl localhost:5432',
      ).out,
    ).toBe('curl: (52) Empty reply from server')
    expect(sh('curl localhost:8080').code).toBe(7)
  })

  it('por nombre se llega con la IP de la red creada, y el contenedor sin programa queda Created', () => {
    expect(
      sh(
        'docker network create n1',
        'docker run -d --name a1 alpine:3.20 sleep infinity',
        'docker run -d --name a2 alpine:3.20 sleep infinity',
        'docker network connect n1 a1',
        'docker network connect n1 a2',
        'docker exec a1 ping -c 1 a2',
      ).out,
    ).toContain('PING a2 (172.18.0.')

    const missing = sh('docker run --name x alpine:3.20 nada')

    expect(missing.code).toBe(127)
    expect(missing.out).toContain(
      'OCI runtime create failed: runc create failed: unable to start container process: exec: "nada": executable file not found in $PATH',
    )
    expect(run(missing.world, "docker ps -a --format '{{.Status}}'").output).toEqual(['Created'])
  })

  it('curl no viene en node:22-alpine (wget sí): el healthcheck con curl no pasa', () => {
    expect(sh('docker run --rm node:22-alpine curl -s localhost').code).toBe(127)
    expect(
      sh(
        "docker run -d --name a --health-cmd 'curl -f http://localhost/ || exit 1' node:22-alpine sleep infinity",
        "docker inspect -f '{{.State.Health.Status}}' a",
      ).out,
    ).toBe('unhealthy')
    expect(
      sh(
        "docker run -d --name a --health-cmd 'wget -qO- http://localhost/ || exit 1' nginx:1.27-alpine",
        "docker inspect -f '{{.State.Health.Status}}' a",
      ).out,
    ).toBe('healthy')
  })

  it('compose config: rutas absolutas y forma larga; version, obsoleto; forma larga al escribir', () => {
    const files = [
      'mkdir ~/c',
      'cd ~/c',
      `cat > compose.yaml <<'EOF'\nversion: "3.8"\nservices:\n  web:\n    image: nginx:1.27-alpine\n    ports:\n      - target: 80\n        published: 8080\n    volumes:\n      - ./html:/usr/share/nginx/html:ro\nEOF`,
    ]
    const config = sh(...files, 'docker compose config')

    expect(config.out).toContain('source: /home/peer/c/html')
    expect(config.out).toContain('read_only: true')
    expect(config.out).toContain('published: "8080"')
    expect(config.out).toContain('the attribute `version` is obsolete')
    expect(sh(...files, 'docker compose up -d', 'curl -s localhost:8080').code).toBe(0)
  })
})

describe('Docker simulado: más formas equivalentes (revisión de 2026-11)', () => {
  it('cada unidad acepta otras formas válidas de llegar al mismo estado', () => {
    const cases: [string, string[]][] = [
      ['docker-hello', ['docker run --rm hello-world']],
      [
        'docker-exec',
        [
          "echo 'Peer4U en mantenimiento' | docker exec -i web tee /usr/share/nginx/html/index.html",
        ],
      ],
      [
        'docker-exec',
        [
          `docker exec web sh -c 'printf "Peer4U en mantenimiento\\n" > /usr/share/nginx/html/index.html'`,
        ],
      ],
      [
        'docker-inspect',
        [`docker inspect -f '{{(index .NetworkSettings.Networks "bridge").IPAddress}}' web`],
      ],
      ['docker-inspect', ["docker inspect -f '{{.NetworkSettings.IPAddress}}' web"]],
      [
        'docker-limits',
        [
          'docker run -d --name api -p 3000:3000 api:2.0',
          'docker update --restart unless-stopped --memory 256m --memory-swap 256m --cpus 0.5 api',
        ],
      ],
      [
        'docker-ci-tags',
        [
          'docker tag api:dev ghcr.io/peer4u/api:1.5.0',
          'docker tag api:dev ghcr.io/peer4u/api:$(git log -1 --format=%h)',
          'docker login ghcr.io -u peer --password-stdin < ~/.ghcr-token',
          'docker push --all-tags ghcr.io/peer4u/api',
        ],
      ],
      [
        'docker-buildx',
        [
          'docker buildx build --push --platform=linux/amd64 --platform=linux/arm64 -t ghcr.io/peer4u/api:1.5.0 .',
        ],
      ],
      [
        'docker-buildx',
        [
          'docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/peer4u/api:1.5.0 --output type=registry .',
        ],
      ],
      [
        'docker-compose-first',
        [
          `cat > ~/web/compose.yaml <<'EOF'\nservices:\n  web:\n    image: nginx:1.27-alpine\n    ports:\n      - "8080:80"\nEOF`,
          'docker compose --project-directory ~/web up -d',
        ],
      ],
      [
        'docker-compose-prod',
        [
          `cat > compose.prod.yaml <<'EOF'\nservices:\n  api:\n    restart: unless-stopped\n    ports:\n      - "8080:3000"\n  db:\n    restart: unless-stopped\nEOF`,
          'COMPOSE_FILE=compose.yaml:compose.prod.yaml docker compose up -d',
        ],
      ],
      [
        'docker-backup',
        [
          'docker cp web:/etc/nginx/conf.d/default.conf ~/copias/',
          'cd ~/copias',
          `docker run --rm -v pgdata:/datos -v "$PWD":/backup alpine:3.20 sh -c 'cd /datos && tar czf /backup/pgdata.tgz .'`,
        ],
      ],
      [
        'docker-nonroot',
        [
          DOCKERFILE(
            'FROM node:22-alpine\nWORKDIR /app\nCOPY --chown=node:node package*.json ./\nRUN npm ci --omit=dev\nCOPY --chown=node:node . .\nUSER node\nCMD ["node", "server.js"]',
          ),
          'docker build -t api:2.0 .',
        ],
      ],
    ]

    for (const [id, entries] of cases)
      expect(checkAttempt(unit(id), entries).misses, `${id}: ${entries.join(' ; ')}`).toEqual([])
  })

  it('una versión más fijada de la misma imagen vale; latest por una fija, no', () => {
    const boss = unit('docker-boss-oncall')
    const fixed = (ref: string) => [
      'docker start cache',
      'docker rm -f old-web web',
      `docker run -d --name web -p 8080:80 ${ref}`,
    ]

    expect(checkAttempt(boss, fixed('nginx:1.27.2'), 10).done).toBe(true)
    expect(checkAttempt(boss, fixed('nginx:latest'), 10).done).toBe(false)
  })

  it('el compose del jefe vale con compose.yml y docker-compose.yml', () => {
    const boss = unit('docker-boss-compose')

    for (const name of ['compose.yml', 'docker-compose.yml']) {
      const entries = boss.solution.map((entry) =>
        entry.replace("cat > compose.yaml <<'EOF'", `cat > ${name} <<'EOF'`),
      )

      expect(checkAttempt(boss, entries, 10).misses, name).toEqual([])
    }
  })
})

describe('Docker simulado: topes y pureza', () => {
  it('lo que se pasa de los topes falla y deja el mundo como estaba', () => {
    let world = startOf(START)

    for (let i = 0; i < LIMITS.containers; i++)
      world = run(world, `docker create --name c${i} alpine:3.20`).world

    const over = run(world, 'docker create --name otro alpine:3.20')

    expect(over.ok).toBe(false)
    expect(over.output.join('\n')).toContain('demasiadas contenedores')
    expect(over.world).toBe(world)
    expect(
      sh(`echo '${'a: b\n'.repeat(4000)}' > compose.yaml`, 'docker compose up -d').code,
    ).not.toBe(0)
    expect(
      sh(
        'cd ~/api',
        DOCKERFILE('FROM alpine:3.20 AS a\n'.repeat(LIMITS.stages + 1)),
        'docker build -t x .',
      ).code,
    ).toBe(1)
    expect(
      sh('for i in $(seq 1 50); do docker run -d alpine:3.20 sleep infinity; done').code,
    ).not.toBe(0)
  })

  it('el motor no importa nada del sistema (ni fs, ni procesos, ni red, ni eval)', () => {
    const dir = fileURLToPath(new URL('../../../../packages/dockersim/src', import.meta.url))
    const files = readdirSync(dir, { recursive: true })
      .map(String)
      .filter((file) => file.endsWith('.ts'))

    expect(files.length).toBeGreaterThan(10)
    for (const file of files) {
      const text = readFileSync(join(dir, file), 'utf8')

      // Solo importa de sí mismo y de los paquetes del curso; nada de eval.
      for (const from of text.matchAll(/^import .* from '([^']+)'/gm))
        expect(from[1], file).toMatch(/^(\.|@sanatorio\/(shellsim|course)$)/)
      expect(text, file).not.toMatch(/\beval\(|new Function\(|globalThis|\bfetch\(/)
    }
  })
})
