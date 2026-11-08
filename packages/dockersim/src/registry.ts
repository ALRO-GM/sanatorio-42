/**
 * Lo publicado en el registro simulado, para que otro curso parta de ahí: el
 * de Kubernetes despliega las imágenes que deja publicadas el examen final de
 * este (`docs/curso-docker.md`, «Enlace con Kubernetes»). Solo lo que un
 * manifiesto necesita saber de una imagen, sin sus ficheros.
 */

import type { World } from '@sanatorio/shellsim'

import { repoDigest } from './catalog.js'
import type { HealthSpec } from './model.js'
import { dockerOf, imageSize } from './model.js'

export type PublishedImage = {
  /** `ghcr.io/peer4u/api:1.0.0`. */
  ref: string
  digest: string
  size: number
  /** Usuario con el que corre (vacío: root). */
  user: string
  /** Puertos que declara (`3000/tcp`). */
  ports: string[]
  /** Variables de entorno de la imagen. */
  env: string[]
  /** Su HEALTHCHECK, que en Kubernetes pasa a ser una `livenessProbe`/`readinessProbe`. */
  healthcheck: HealthSpec | null
  cmd: string[]
}

export function registryImages(world: World): PublishedImage[] {
  const state = dockerOf(world)

  return Object.entries(state.registry.tags)
    .flatMap(([ref, id]) => {
      const image = state.registry.images[id]

      if (image === undefined) return []

      return [
        {
          ref,
          digest: repoDigest(image),
          size: imageSize(image),
          user: image.config.user,
          ports: image.config.exposed,
          env: image.config.env,
          healthcheck: image.config.healthcheck,
          cmd: [...(image.config.entrypoint ?? []), ...(image.config.cmd ?? [])],
        },
      ]
    })
    .sort((a, b) => (a.ref < b.ref ? -1 : 1))
}
