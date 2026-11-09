/**
 * Las imágenes que se pueden desplegar y qué hace cada una al arrancar. Las
 * públicas salen del catálogo del curso de Docker (`fromCatalog` de
 * `@sanatorio/dockersim`: nginx, postgres, redis, busybox), con su digest.
 * Las del equipo, `ghcr.io/peer4u/…`, son las que publica el jefe final
 * avanzado de ese curso (`api` y `front` 1.0.0, y la API con el commit
 * corto), más las versiones que el curso necesita para practicar: una que
 * pide una variable nueva, una lenta, una que nunca está lista y un informe
 * que se come la memoria. Son privadas: hace falta `imagePullSecrets`.
 */

import { fromCatalog, normalizeRef, repoDigest, validRef } from '@sanatorio/dockersim'

import { MI } from './model.js'
import { digest } from './util.js'

export type Behaviour =
  'nginx' | 'front' | 'api' | 'postgres' | 'redis' | 'busybox' | 'curl' | 'informes'

export type ImageInfo = {
  ref: string
  behaviour: Behaviour
  /** Del registro del equipo: hace falta un Secret de registro para descargarla. */
  private: boolean
  /** Puerto en el que escucha (si es un servidor). */
  port: number | null
  /** El usuario con el que corre (0 = root). */
  uid: number
  user: string
  /** Versión de la app (la API la dice en `/`). */
  version: string
  /** Segundos desde que arranca hasta que escucha (la 1.2.0 tarda 20). */
  readyAfter: number
  /** Variables sin las que sale con código 1. */
  needs: string[]
  /** `/health` contesta siempre 503 (la 1.3.0: «migraciones pendientes»). */
  unhealthy: boolean
  /** Memoria y CPU que usa sin carga. */
  memory: number
  cpu: number
  digest: string
  /** Ficheros que trae (lo que se ve con `exec cat` y `cp`). */
  files: Record<string, string>
}

const TEAM = 'ghcr.io/peer4u'
/** El token del registro, el mismo que en el curso de Docker (`~/.ghcr-token`). */
export const GHCR_TOKEN = 'ghp_peer4uDemoToken0000000000000000000'

const API_FILES = (version: string): Record<string, string> => ({
  '/app/package.json': `{ "name": "peer4u-api", "version": "${version}", "main": "server.js" }\n`,
  '/app/server.js':
    "const express = require('express')\n// …\napp.listen(process.env.PORT || 3000)\n",
  '/app/config.json': '{ "logLevel": "info", "pool": 10 }\n',
})

const NGINX_INDEX =
  '<!DOCTYPE html>\n<html>\n<head><title>Welcome to nginx!</title></head>\n<body>\n<h1>Welcome to nginx!</h1>\n</body>\n</html>\n'

export const FRONT_INDEX =
  '<!doctype html>\n<title>Peer4U</title>\n<div id="app">Peer4U</div>\n<script type="module" src="/assets/index.js"></script>\n'

type Spec = Partial<Omit<ImageInfo, 'ref' | 'digest'>> & { behaviour: Behaviour }

const BASE: Omit<ImageInfo, 'ref' | 'digest' | 'behaviour'> = {
  private: false,
  port: null,
  uid: 0,
  user: 'root',
  version: '',
  readyAfter: 0,
  needs: [],
  unhealthy: false,
  memory: 4 * MI,
  cpu: 1,
  files: {},
}

const PUBLIC: Record<string, Spec> = {
  'nginx:1.27': {
    behaviour: 'nginx',
    port: 80,
    memory: 6 * MI,
    files: { '/usr/share/nginx/html/index.html': NGINX_INDEX },
  },
  'nginx:1.27-alpine': {
    behaviour: 'nginx',
    port: 80,
    memory: 4 * MI,
    files: { '/usr/share/nginx/html/index.html': NGINX_INDEX },
  },
  'nginx:latest': { behaviour: 'nginx', port: 80, memory: 6 * MI },
  'postgres:16': { behaviour: 'postgres', port: 5432, memory: 42 * MI, cpu: 4 },
  'postgres:16-alpine': { behaviour: 'postgres', port: 5432, memory: 36 * MI, cpu: 4 },
  'redis:7': { behaviour: 'redis', port: 6379, memory: 8 * MI, cpu: 3 },
  'redis:7-alpine': { behaviour: 'redis', port: 6379, memory: 6 * MI, cpu: 3 },
  'busybox:1.37': { behaviour: 'busybox', memory: 1 * MI },
  'busybox:latest': { behaviour: 'busybox', memory: 1 * MI },
}

/** Las que no están en el catálogo del curso de Docker (solo se despliegan, no se construyen). */
const EXTRA: Record<string, Spec> = {
  'busybox:1.36': { behaviour: 'busybox', memory: 1 * MI },
  'curlimages/curl:8.10': { behaviour: 'curl', uid: 100, user: 'curl_user', memory: 2 * MI },
  'bitnami/redis:7.4': {
    behaviour: 'redis',
    port: 6379,
    uid: 1001,
    user: '1001',
    memory: 9 * MI,
    cpu: 3,
  },
  'bitnami/postgresql:16': {
    behaviour: 'postgres',
    port: 5432,
    uid: 1001,
    user: '1001',
    memory: 40 * MI,
    cpu: 4,
  },
}

const api = (version: string, extra: Partial<Spec> = {}): Spec => ({
  behaviour: 'api',
  private: true,
  port: 3000,
  uid: 1000,
  user: 'node',
  version,
  needs: ['DATABASE_URL'],
  memory: 64 * MI,
  cpu: 8,
  files: API_FILES(version),
  ...extra,
})

/** Lo que publica el curso de Docker y las versiones de práctica (`docs/curso-kubernetes.md`). */
const TEAM_IMAGES: Record<string, Spec> = {
  [`${TEAM}/api:1.0.0`]: api('1.0.0'),
  [`${TEAM}/api:4f2a9c1`]: api('1.0.0'),
  [`${TEAM}/api:1.0.1`]: api('1.0.1'),
  [`${TEAM}/api:1.0.2`]: api('1.0.2'),
  [`${TEAM}/api:1.1.0`]: api('1.1.0', { needs: ['DATABASE_URL', 'REDIS_URL'] }),
  [`${TEAM}/api:1.2.0`]: api('1.2.0', { readyAfter: 20 }),
  [`${TEAM}/api:1.3.0-rc1`]: api('1.3.0-rc1', { readyAfter: 20 }),
  [`${TEAM}/api:1.3.0`]: api('1.3.0', { readyAfter: 20, unhealthy: true }),
  [`${TEAM}/front:1.0.0`]: {
    behaviour: 'front',
    private: true,
    port: 80,
    uid: 101,
    user: 'nginx',
    version: '1.0.0',
    memory: 5 * MI,
    files: { '/usr/share/nginx/html/index.html': FRONT_INDEX },
  },
  [`${TEAM}/informes:1.0.0`]: {
    behaviour: 'informes',
    private: true,
    uid: 1000,
    user: 'node',
    version: '1.0.0',
    memory: 300 * MI,
    cpu: 40,
  },
}

/** Una referencia en su forma corta (`docker.io/library/nginx:1.27` → `nginx:1.27`). */
export const shortRef = (ref: string): string => normalizeRef(ref)

/** ¿Se puede escribir así una imagen? (`Nginx:1.27` no). */
export const wellFormed = (ref: string): boolean => validRef(ref)

/** La imagen, o `undefined` si en el registro no existe esa etiqueta (`manifest unknown`). */
export function imageInfo(ref: string): ImageInfo | undefined {
  const name = shortRef(ref)
  const spec = PUBLIC[name] ?? EXTRA[name] ?? TEAM_IMAGES[name]

  if (spec === undefined) return undefined

  // Las públicas llevan el digest del catálogo del curso de Docker: es la misma imagen.
  const catalog = Object.hasOwn(PUBLIC, name) ? fromCatalog(name) : undefined

  return {
    ...BASE,
    ...spec,
    ref: name,
    digest: catalog === undefined ? digest(`image:${name}`) : repoDigest(catalog),
  }
}

/** ¿Hay alguna etiqueta de ese repositorio? (si no, el registro ni lo conoce). */
export function knownRepo(ref: string): boolean {
  const repo = shortRef(ref).replace(/[:@][^/:@]+$/, '')

  return [...Object.keys(PUBLIC), ...Object.keys(EXTRA), ...Object.keys(TEAM_IMAGES)].some(
    (each) => each.replace(/:[^/:]+$/, '') === repo,
  )
}

/** La referencia entera, como la escribe containerd (`api:1.0` → `docker.io/library/api:1.0`). */
export function fullRef(ref: string): string {
  const [first = '', ...rest] = ref.split('/')

  if (rest.length > 0 && (first.includes('.') || first.includes(':') || first === 'localhost'))
    return ref

  return rest.length === 0 ? `docker.io/library/${ref}` : `docker.io/${ref}`
}

/** Las del registro del equipo (para comprobar que coinciden con lo que publica el curso de Docker). */
export const teamImages = (): string[] => Object.keys(TEAM_IMAGES)
