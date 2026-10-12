/**
 * Sirve el front compilado desde el mismo proceso que la API.
 *
 * En una máquina propia no hay CDN delante: un solo proceso atiende la web y la
 * API, y así comparten dominio (las cookies de sesión viajan sin CORS) y hay una
 * sola cosa que desplegar.
 *
 * Los ficheros se leen **una vez al arrancar** y se sirven de memoria: el front
 * compilado son cuatro o cinco ficheros que suman menos de 1 MB. La compresión
 * la hace el proxy de delante (Caddy), que lo hace mejor.
 */

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
}

/**
 * La demostración pública: la misma web compilada con los datos de mentira, en
 * su propia carpeta. No habla con la API, así que se puede enseñar a cualquiera.
 */
const DEMO = '/demo'

type StaticFile = { body: Buffer; type: string; immutable: boolean }

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

      files.set(route, {
        body: readFileSync(path),
        type: TYPES[extname(name)] ?? 'application/octet-stream',
        // Vite pone un hash en el nombre de todo lo que va en `assets/`: si el
        // contenido cambia, cambia el nombre, así que se puede cachear para siempre.
        immutable: route.startsWith('/assets/') || route.startsWith(`${DEMO}/assets/`),
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
      return reply
        .header('Content-Type', file.type)
        .header(
          'Cache-Control',
          file.immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
        )
        .send(file.body)
    }

    // Cualquier otra ruta de navegador es la propia web, que decide qué enseñar.
    // Lo que tenga extensión y no exista es un 404 de verdad, no la portada, y
    // lo que se pidió bajo `/api` es una ruta de la API que no existe.
    const isApi = request.originalUrl.startsWith('/api/')

    const page = path === DEMO || path.startsWith(`${DEMO}/`) ? demoIndex : index

    if (wantsPage && !isApi && page !== undefined && extname(path) === '') {
      return reply
        .header('Content-Type', page.type)
        .header('Cache-Control', 'no-cache')
        .send(page.body)
    }

    return reply.code(404).send({ error: 'not_found', message: `No existe ${path}` })
  })

  return files.size
}
