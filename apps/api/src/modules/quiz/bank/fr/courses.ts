/** Banco de Not-games en francés: los cursos de shell, Docker y Kubernetes (`../courses.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const COURSES_FR: Readonly<Record<string, ConceptText>> = {
  'shell-cd-rutas': {
    forms: [
      {
        ask: [
          'Tu es dans `/var/log/nginx` et tu tapes `cd ../peer4u`. Où arrives-tu ?',
          'Depuis `/var/log/nginx`, `cd ../peer4u` t’emmène dans…',
        ],
        right: ['`/var/log/peer4u`'],
        wrong: ['`/var/log/nginx/peer4u`', '`/peer4u`', '`/var/peer4u`', '`/home/peer/peer4u`'],
      },
      {
        ask: [
          'Tu es dans `/var/log` et `cd /nginx` répond « No such file or directory ». Pourquoi ?',
          'Depuis `/var/log`, `ls` montre `nginx`, mais `cd /nginx` échoue. Que se passe-t-il ?',
        ],
        right: [
          'Avec `/` devant, il cherche `nginx` à la racine',
          'Le `/` du début part de la racine',
        ],
        wrong: [
          'Il faut `sudo` pour entrer dans `nginx`',
          'Les dossiers s’ouvrent avec `ls`, pas avec `cd`',
          '`cd` n’entre pas dans les dossiers hors de ton `home`',
          '`nginx` est un fichier, pas un dossier',
        ],
      },
      {
        ask: [
          'Tu es dans `/var/log`. Laquelle de ces commandes ne t’emmène PAS dans `/var/log/nginx` ?',
          'Depuis `/var/log`, toutes t’emmènent dans `/var/log/nginx` SAUF…',
        ],
        right: ['`cd /nginx`'],
        wrong: ['`cd nginx`', '`cd ./nginx`', '`cd /var/log/nginx`', '`cd ../log/nginx`'],
      },
    ],
    wrong: [],
    why: 'Un chemin qui commence par / part de la racine ; sans lui, de là où tu es. Et .. remonte d’un dossier.',
  },
  'docker-ports': {
    forms: [
      {
        ask: [
          'Tu lances `docker run -d -p 8080:80 nginx`. Quelle commande montre la page d’accueil depuis ta machine ?',
          'Avec `docker run -d -p 8080:80 nginx`, depuis ta machine, la page d’accueil s’obtient avec…',
        ],
        right: ['`curl localhost:8080`'],
        wrong: ['`curl localhost:80`', '`curl nginx:8080`', '`curl 0.0.0.0:80`', '`curl nginx:80`'],
      },
      {
        ask: [
          'Ton appli écoute sur le 3000 dans le conteneur et tu la veux sur le 8080 de ta machine. Que mets-tu ?',
          'Pour aller du 8080 de ta machine au 3000 du conteneur, `docker run` prend…',
        ],
        right: ['`-p 8080:3000`'],
        wrong: ['`-p 3000:8080`', '`-p 8080`', '`-p 3000`', '`--expose 8080:3000`'],
      },
      {
        ask: [
          'Tu lances nginx (qui écoute sur le 80) avec `-p 80:8080` et `curl localhost:80` ne montre pas la page. Pourquoi ?',
          'Avec `-p 80:8080` sur nginx, qui écoute sur le 80, la page d’accueil ne sort pas. Que se passe-t-il ?',
        ],
        right: [
          'Il renvoie vers le 8080 du conteneur, où rien n’écoute',
          'Les nombres sont inversés : ta machine vient d’abord',
        ],
        wrong: [
          'Il faut sudo pour utiliser le port 80',
          'curl n’atteint pas les ports d’un conteneur',
          'nginx met quelques minutes à démarrer',
          'Un conteneur ne peut publier que le 8080',
        ],
      },
    ],
    wrong: [],
    why: 'Dans -p A:B, A est le port de ta machine et B celui du conteneur : on appelle localhost:A.',
  },
  'k8s-pod-status': {
    forms: [
      {
        ask: [
          '`kubectl get pods` montre un Pod en `CrashLoopBackOff`. Qu’est-ce qui lui arrive ?',
          'Un Pod en `CrashLoopBackOff` veut dire que…',
        ],
        right: [
          'Son conteneur démarre et sort en erreur encore et encore',
          'Il démarre, échoue et Kubernetes le relance de plus en plus tard',
        ],
        wrong: [
          'Il ne trouve pas l’image dans le registre',
          'Il ne tient sur aucun nœud du cluster',
          'Il tourne, mais ne reçoit pas encore de trafic',
          'Il est en cours de suppression et attend la fin',
        ],
      },
      {
        ask: [
          'Tu déploies `ghcr.io/peer4u/front:1.0`, un tag jamais publié. Quel STATUS vois-tu ?',
          'Avec une image dont le tag n’existe pas dans le registre, `kubectl get pods` montre…',
        ],
        right: ['`ErrImagePull`', '`ImagePullBackOff`'],
        wrong: ['`CrashLoopBackOff`', '`Completed`', '`OOMKilled`', '`Terminating`'],
      },
    ],
    wrong: [],
    why: 'CrashLoopBackOff, c’est qu’il démarre et meurt (regarde logs --previous) ; si l’image ne se télécharge pas, c’est ErrImagePull ou ImagePullBackOff.',
  },
}
