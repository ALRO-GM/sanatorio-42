/**
 * Los nueve bloques del curso, por nivel. Cada bloque junta unas unidades
 * que se apoyan unas en otras y acaba en un jefe contrarreloj; cada nivel
 * acaba en un jefe final que da su certificado. Los perfiles de trabajo
 * salen de la investigación (`docs/curso-shell-investigacion.md`).
 */

import type { Block } from './types.js'

export const BLOCKS: Block[] = [
  {
    n: 1,
    tier: 'beginner',
    es: {
      title: 'Orientarte en el servidor',
      pitch: 'Dónde estás, qué hay y cómo leerlo sin romper nada.',
    },
    en: {
      title: 'Finding your way around',
      pitch: 'Where you are, what is there and how to read it without breaking anything.',
    },
    jobs: ['support', 'sysadmin', 'backend', 'data', 'security'],
  },
  {
    n: 2,
    tier: 'beginner',
    es: {
      title: 'Ficheros y carpetas',
      pitch: 'Crear, copiar, mover, borrar y escribir, también con comodines.',
    },
    en: {
      title: 'Files and directories',
      pitch: 'Create, copy, move, delete and write, wildcards included.',
    },
    jobs: ['support', 'sysadmin', 'backend', 'devops'],
  },
  {
    n: 3,
    tier: 'beginner',
    es: {
      title: 'Permisos y usuarios',
      pitch: 'Quién puede qué: rwx, chmod, chown, sudo, usuarios y grupos.',
    },
    en: {
      title: 'Permissions and users',
      pitch: 'Who can do what: rwx, chmod, chown, sudo, users and groups.',
    },
    jobs: ['sysadmin', 'support', 'security', 'devops'],
  },
  {
    n: 4,
    tier: 'intermediate',
    es: {
      title: 'Texto y tuberías',
      pitch: 'grep, cut, sort, uniq, sed y awk unidos con |: los registros hablan.',
    },
    en: {
      title: 'Text and pipes',
      pitch: 'grep, cut, sort, uniq, sed and awk joined with |: make the logs talk.',
    },
    jobs: ['sre', 'devops', 'data', 'security', 'backend'],
  },
  {
    n: 5,
    tier: 'intermediate',
    es: {
      title: 'Buscar, empaquetar y disco',
      pitch: 'find, xargs, tar, gzip, du y df: el disco lleno de las 4 de la mañana.',
    },
    en: {
      title: 'Find, archive and disk',
      pitch: 'find, xargs, tar, gzip, du and df: the 4 a.m. full disk.',
    },
    jobs: ['sysadmin', 'sre', 'devops', 'cloud'],
  },
  {
    n: 6,
    tier: 'intermediate',
    es: {
      title: 'Procesos y entorno',
      pitch: 'ps, kill y señales; variables, PATH y códigos de salida.',
    },
    en: {
      title: 'Processes and environment',
      pitch: 'ps, kill and signals; variables, PATH and exit codes.',
    },
    jobs: ['sre', 'sysadmin', 'backend', 'devops'],
  },
  {
    n: 7,
    tier: 'advanced',
    es: {
      title: 'Guiones de bash',
      pitch: 'Variables, condiciones, bucles, argumentos y set -euo pipefail.',
    },
    en: {
      title: 'Bash scripts',
      pitch: 'Variables, conditions, loops, arguments and set -euo pipefail.',
    },
    jobs: ['devops', 'sre', 'sysadmin', 'data', 'cloud'],
  },
  {
    n: 8,
    tier: 'advanced',
    es: {
      title: 'Servicios, registros y cron',
      pitch: 'systemctl, journalctl y tareas programadas: la guardia de verdad.',
    },
    en: {
      title: 'Services, logs and cron',
      pitch: 'systemctl, journalctl and scheduled jobs: real on-call.',
    },
    jobs: ['sysadmin', 'sre', 'devops'],
  },
  {
    n: 9,
    tier: 'advanced',
    es: { title: 'Redes y otras máquinas', pitch: 'ss, curl, ssh, scp y rsync entre web1 y db1.' },
    en: {
      title: 'Networks and other machines',
      pitch: 'ss, curl, ssh, scp and rsync between web1 and db1.',
    },
    jobs: ['sre', 'devops', 'cloud', 'sysadmin', 'security'],
  },
]

export function blockOf(n: number): Block | undefined {
  return BLOCKS.find((block) => block.n === n)
}
