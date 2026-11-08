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
