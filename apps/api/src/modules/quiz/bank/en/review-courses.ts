/** Repaso de Not-games en inglés: los cursos, traducción de `../review-courses.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_COURSES_EN: Readonly<Record<string, ReviewEntry>> = {
  'shell-cd-rutas': {
    title: 'Absolute and relative paths',
    definition:
      'A path starting with / is absolute: it starts from the root. Without the /, it is relative: it starts from the directory you are in. And .. is the directory above.',
    example: 'cd /var/log && cd nginx → /var/log/nginx; cd /nginx → "No such file or directory"',
  },
  'docker-ports': {
    title: 'Publishing a port (-p)',
    definition:
      'docker run -p A:B connects port A on your machine to port B in the container. From your machine you call localhost:A.',
    example: 'docker run -d -p 8080:80 nginx && curl localhost:8080',
  },
  'k8s-pod-status': {
    title: 'A Pod’s STATUS',
    definition:
      'CrashLoopBackOff: the container starts and dies over and over (check kubectl logs --previous). ErrImagePull or ImagePullBackOff: the image cannot be downloaded (wrong name or tag, or never pushed).',
    example: 'kubectl get pods → api-… 0/1 CrashLoopBackOff',
  },
}
