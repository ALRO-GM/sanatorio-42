/**
 * Sirve el front compilado desde el mismo proceso que la API.
 *
 * En una máquina propia no hay CDN delante: un solo proceso atiende la web y la
 * API, y así comparten dominio (las cookies de sesión viajan sin CORS) y hay una
 * sola cosa que desplegar.
 *
 * Los ficheros se leen **una vez al arrancar** y se sirven de memoria. La
 * compresión la hace el proxy de delante (Caddy), que lo hace mejor.
 *
 * La caché del navegador (`docs/rendimiento.md`, «Caché»):
 *
 * - `assets/` lleva un hash en el nombre: se guarda un año sin preguntar.
 * - `sounds/` (los del Pomodoro) también un año: un sonido que cambie cambia de
 *   nombre. Responden a `Range`, que el navegador usa para ir al principio de
 *   un audio sin bajarlo otra vez.
 * - Lo demás (la portada, `sw.js`, el manifiesto) se revalida cada vez, pero con
 *   `ETag`: si no ha cambiado, la respuesta es un `304` sin cuerpo.
 */

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'

import type { FastifyInstance } from 'fastify'

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.m4a': 'audio/mp4',
}

/** Lo que se guarda un año: lo que cambia de nombre si cambia su contenido. */
const LASTING = ['/assets/', '/sounds/']

/**
 * La demostración pública: la misma web compilada con los datos de mentira, en
 * su propia carpeta. No habla con la API, así que se puede enseñar a cualquiera.
 */
const DEMO = '/demo'

type StaticFile = { body: Buffer; type: string; immutable: boolean; etag: string }

/** Lee una carpeta entera a memoria, indexada por su ruta web. */
function loadFiles(root: string): Map<string, StaticFile> {
  const files = new Map<string, StaticFile>()

  const walk = (directory: string): void => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name)

      if (statSync(path).isDirectory()) {
        walk(path)
        continue
      }

      const route = `/${relative(root, path).split(sep).join('/')}`

      const body = readFileSync(path)

      files.set(route, {
        body,
        type: TYPES[extname(name)] ?? 'application/octet-stream',
        // Vite pone un hash en el nombre de todo lo que va en `assets/`: si el
        // contenido cambia, cambia el nombre, así que se puede cachear para siempre.
        immutable: LASTING.some(
          (prefix) => route.startsWith(prefix) || route.startsWith(`${DEMO}${prefix}`),
        ),
        etag: `"${createHash('sha1').update(body).digest('base64url').slice(0, 20)}"`,
      })
    }
  }

  walk(root)

  return files
}

/**
 * Registra el front como respuesta a todo lo que no sea una ruta de la API.
 *
 * Va en el `notFoundHandler` y no como rutas propias para no pisar ninguna de la
 * API: Fastify prueba primero las suyas y solo llega aquí lo que no existe.
 *
 * @returns Cuántos ficheros sirve.
 */
export function registerStatic(app: FastifyInstance, root: string): number {
  const files = loadFiles(root)
  const index = files.get('/index.html')
  const demoIndex = files.get(`${DEMO}/index.html`)

  app.setNotFoundHandler((request, reply) => {
    const path = request.url.split('?')[0] ?? '/'
    const wantsPage = request.method === 'GET' || request.method === 'HEAD'
    const file = wantsPage ? files.get(path) : undefined

    if (file !== undefined) {
      void reply
        .header('Content-Type', file.type)
        .header(
          'Cache-Control',
          file.immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
        )
        .header('ETag', file.etag)
        .header('Accept-Ranges', 'bytes')

      if (request.headers['if-none-match'] === file.etag) {
        return reply.code(304).send()
      }

      const range = rangeOf(request.headers.range, file.body.length)

      if (range === 'invalid') {
        return reply
          .code(416)
          .header('Content-Range', `bytes */${String(file.body.length)}`)
          .send()
      }
      if (range !== null) {
        return reply
          .code(206)
          .header(
            'Content-Range',
            `bytes ${String(range.start)}-${String(range.end)}/${String(file.body.length)}`,
          )
          .send(file.body.subarray(range.start, range.end + 1))
      }

      return reply.send(file.body)
    }

    // Cualquier otra ruta de navegador es la propia web, que decide qué enseñar.
    // Lo que tenga extensión y no exista es un 404 de verdad, no la portada, y
    // lo que se pidió bajo `/api` es una ruta de la API que no existe.
    const isApi = request.originalUrl.startsWith('/api/')

    const page = path === DEMO || path.startsWith(`${DEMO}/`) ? demoIndex : index

    if (wantsPage && !isApi && page !== undefined && extname(path) === '') {
      void reply
        .header('Content-Type', page.type)
        .header('Cache-Control', 'no-cache')
        .header('ETag', page.etag)

      return request.headers['if-none-match'] === page.etag
        ? reply.code(304).send()
        : reply.send(page.body)
    }

    return reply.code(404).send({ error: 'not_found', message: `No existe ${path}` })
  })

  return files.size
}

/**
 * El trozo que pide una cabecera `Range` (`bytes=0-`, `bytes=100-199`,
 * `bytes=-500`), `null` si no pide ninguno (o pide varios, que se sirven
 * enteros) e `invalid` si se sale del fichero.
 */
function rangeOf(
  header: string | undefined,
  size: number,
): { start: number; end: number } | null | 'invalid' {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header ?? '')

  if (match === null) return null

  const [, from = '', to = ''] = match

  if (from === '' && to === '') return null

  const start = from === '' ? Math.max(0, size - Number(to)) : Number(from)
  const end = from === '' || to === '' ? size - 1 : Math.min(Number(to), size - 1)

  return start > end || start >= size ? 'invalid' : { start, end }
}
