/**
 * Repaso de Not-games: los conceptos de los cursos de shell, Docker y
 * Kubernetes (`courses.ts`). Lo que se ve en «Repaso» si se fallan.
 */

import type { ReviewEntry } from './types.js'

export const REVIEW_COURSES: Record<string, ReviewEntry> = {
  'shell-cd-rutas': {
    title: 'Rutas absolutas y relativas',
    definition:
      'Una ruta que empieza por / es absoluta: parte de la raíz. Sin la /, es relativa: parte de la carpeta en la que estás. Y .. es la carpeta de arriba.',
    example: 'cd /var/log && cd nginx → /var/log/nginx; cd /nginx → «No such file or directory»',
  },
  'docker-ports': {
    title: 'Publicar un puerto (-p)',
    definition:
      'docker run -p A:B une el puerto A de tu máquina con el B del contenedor. Desde tu máquina se llama a localhost:A.',
    example: 'docker run -d -p 8080:80 nginx && curl localhost:8080',
  },
  'k8s-pod-status': {
    title: 'El STATUS de un Pod',
    definition:
      'CrashLoopBackOff: el contenedor arranca y muere una y otra vez (mira kubectl logs --previous). ErrImagePull o ImagePullBackOff: la imagen no se puede bajar (nombre o etiqueta mal, o sin publicar).',
    example: 'kubectl get pods → api-… 0/1 CrashLoopBackOff',
  },
}
