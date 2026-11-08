/**
 * Los nueve bloques del curso de Docker, por nivel. Cada bloque acaba en un
 * jefe contrarreloj y cada nivel en un jefe final con su certificado. El
 * orden sale de la investigación (`docs/referencia/curso-docker-investigacion.md`):
 * el taller oficial de Docker, lo que preguntan en las entrevistas y lo que
 * se usa a diario en un equipo.
 */

import type { Block } from './types.js'

export const BLOCKS: Block[] = [
  {
    n: 1,
    tier: 'beginner',
    es: {
      title: 'Tus primeros contenedores',
      pitch: 'run, ps, puertos, parar y borrar, logs y exec: el día a día.',
    },
    en: {
      title: 'Your first containers',
      pitch: 'run, ps, ports, stop and remove, logs and exec: the daily routine.',
    },
    jobs: ['backend', 'fullstack', 'devops', 'qa'],
  },
  {
    n: 2,
    tier: 'beginner',
    es: {
      title: 'Configurar, inspeccionar y limpiar',
      pitch: 'Variables, inspect, etiquetas y versiones, y el disco que se llena.',
    },
    en: {
      title: 'Configure, inspect and clean up',
      pitch: 'Variables, inspect, tags and versions, and the disk that fills up.',
    },
    jobs: ['backend', 'devops', 'sre', 'qa'],
  },
  {
    n: 3,
    tier: 'beginner',
    es: {
      title: 'Tu primer Dockerfile',
      pitch: 'FROM, COPY, RUN, CMD y ENTRYPOINT: contenerizar la API del equipo.',
    },
    en: {
      title: 'Your first Dockerfile',
      pitch: 'FROM, COPY, RUN, CMD and ENTRYPOINT: containerise the team API.',
    },
    jobs: ['backend', 'fullstack', 'devops'],
  },
  {
    n: 4,
    tier: 'intermediate',
    es: {
      title: 'Construir mejor',
      pitch: 'Caché de capas, .dockerignore, multi-stage y publicar en un registro.',
    },
    en: {
      title: 'Build better',
      pitch: 'Layer cache, .dockerignore, multi-stage and pushing to a registry.',
    },
    jobs: ['backend', 'devops', 'platform'],
  },
  {
    n: 5,
    tier: 'intermediate',
    es: {
      title: 'Datos y redes',
      pitch: 'Volúmenes, bind mounts, redes con DNS por nombre, puertos y copias.',
    },
    en: {
      title: 'Data and networks',
      pitch: 'Volumes, bind mounts, networks with DNS by name, ports and backups.',
    },
    jobs: ['backend', 'devops', 'sre', 'data'],
  },
  {
    n: 6,
    tier: 'intermediate',
    es: {
      title: 'Docker Compose',
      pitch: 'El entorno de desarrollo entero en un fichero: up, healthchecks y .env.',
    },
    en: {
      title: 'Docker Compose',
      pitch: 'The whole dev environment in one file: up, healthchecks and .env.',
    },
    jobs: ['backend', 'fullstack', 'devops', 'qa'],
  },
  {
    n: 7,
    tier: 'advanced',
    es: {
      title: 'Imágenes de producción',
      pitch: 'Pequeñas, sin root, con HEALTHCHECK y sin secretos dentro.',
    },
    en: {
      title: 'Production images',
      pitch: 'Small, non-root, with a HEALTHCHECK and no secrets inside.',
    },
    jobs: ['devops', 'platform', 'security', 'backend'],
  },
  {
    n: 8,
    tier: 'advanced',
    es: {
      title: 'Operar y depurar',
      pitch: 'Reinicios, límites de memoria, el 137 y las vulnerabilidades.',
    },
    en: {
      title: 'Operate and debug',
      pitch: 'Restarts, memory limits, exit 137 and vulnerabilities.',
    },
    jobs: ['sre', 'devops', 'platform', 'security'],
  },
  {
    n: 9,
    tier: 'advanced',
    es: {
      title: 'Publicar como en CI',
      pitch: 'Versión y commit en la etiqueta, varias plataformas y compose de producción.',
    },
    en: {
      title: 'Ship it like CI',
      pitch: 'Version and commit in the tag, multi-platform and production compose.',
    },
    jobs: ['devops', 'platform', 'backend'],
  },
]

export function blockOf(n: number): Block | undefined {
  return BLOCKS.find((block) => block.n === n)
}
