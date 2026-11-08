/** Repaso de Not-games en francés: los cursos, traducción de `../review-courses.ts`, con las mismas claves. */

import type { ReviewEntry } from '../types.js'

export const REVIEW_COURSES_FR: Readonly<Record<string, ReviewEntry>> = {
  'shell-cd-rutas': {
    title: 'Chemins absolus et relatifs',
    definition:
      'Un chemin qui commence par / est absolu : il part de la racine. Sans le /, il est relatif : il part du dossier où tu es. Et .. est le dossier du dessus.',
    example: 'cd /var/log && cd nginx → /var/log/nginx ; cd /nginx → « No such file or directory »',
  },
  'docker-ports': {
    title: 'Publier un port (-p)',
    definition:
      'docker run -p A:B relie le port A de ta machine au port B du conteneur. Depuis ta machine, on appelle localhost:A.',
    example: 'docker run -d -p 8080:80 nginx && curl localhost:8080',
  },
  'k8s-pod-status': {
    title: 'Le STATUS d’un Pod',
    definition:
      'CrashLoopBackOff : le conteneur démarre et meurt encore et encore (regarde kubectl logs --previous). ErrImagePull ou ImagePullBackOff : l’image ne se télécharge pas (nom ou tag faux, ou jamais publiée).',
    example: 'kubectl get pods → api-… 0/1 CrashLoopBackOff',
  },
}
