/** Banco de Not-games en inglés: los cursos de shell, Docker y Kubernetes (`../courses.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const COURSES_EN: Readonly<Record<string, ConceptText>> = {
  'shell-cd-rutas': {
    forms: [
      {
        ask: [
          'You are in `/var/log/nginx` and type `cd ../peer4u`. Where do you end up?',
          'From `/var/log/nginx`, `cd ../peer4u` takes you to…',
        ],
        right: ['`/var/log/peer4u`'],
        wrong: ['`/var/log/nginx/peer4u`', '`/peer4u`', '`/var/peer4u`', '`/home/peer/peer4u`'],
      },
      {
        ask: [
          'You are in `/var/log` and `cd /nginx` says "No such file or directory". Why?',
          'From `/var/log`, `ls` shows `nginx`, but `cd /nginx` fails. What is going on?',
        ],
        right: [
          'With `/` in front, it looks for `nginx` in the root',
          'The leading `/` starts from the root',
        ],
        wrong: [
          'You need `sudo` to get into `nginx`',
          'Directories are opened with `ls`, not with `cd`',
          '`cd` cannot enter directories outside your `home`',
          '`nginx` is a file, not a directory',
        ],
      },
      {
        ask: [
          'You are in `/var/log`. Which of these commands does NOT take you to `/var/log/nginx`?',
          'From `/var/log`, all of these take you to `/var/log/nginx` EXCEPT…',
        ],
        right: ['`cd /nginx`'],
        wrong: ['`cd nginx`', '`cd ./nginx`', '`cd /var/log/nginx`', '`cd ../log/nginx`'],
      },
    ],
    wrong: [],
    why: 'A path starting with / starts from the root; without it, from where you are. And .. goes up one directory.',
  },
  'docker-ports': {
    forms: [
      {
        ask: [
          'You start `docker run -d -p 8080:80 nginx`. Which command shows the home page from your machine?',
          'With `docker run -d -p 8080:80 nginx`, from your machine the home page comes from…',
        ],
        right: ['`curl localhost:8080`'],
        wrong: ['`curl localhost:80`', '`curl nginx:8080`', '`curl 0.0.0.0:80`', '`curl nginx:80`'],
      },
      {
        ask: [
          'Your app listens on 3000 inside the container and you want it on 8080 on your machine. What do you add?',
          'To get from 8080 on your machine to 3000 in the container, `docker run` takes…',
        ],
        right: ['`-p 8080:3000`'],
        wrong: ['`-p 3000:8080`', '`-p 8080`', '`-p 3000`', '`--expose 8080:3000`'],
      },
      {
        ask: [
          'You start nginx (listening on 80) with `-p 80:8080` and `curl localhost:80` does not show the page. Why?',
          'With `-p 80:8080` on nginx, which listens on 80, the home page does not show. What is wrong?',
        ],
        right: [
          'It forwards to 8080 in the container, where nothing listens',
          'The numbers are swapped: your machine comes first',
        ],
        wrong: [
          'You need sudo to use port 80',
          'curl cannot reach a container’s ports',
          'nginx takes a few minutes to start',
          'A container can only publish port 8080',
        ],
      },
    ],
    wrong: [],
    why: 'In -p A:B, A is the port on your machine and B the one in the container: you call localhost:A.',
  },
  'k8s-pod-status': {
    forms: [
      {
        ask: [
          '`kubectl get pods` shows a Pod in `CrashLoopBackOff`. What is wrong with it?',
          'A Pod in `CrashLoopBackOff` means that…',
        ],
        right: [
          'Its container starts and exits with an error over and over',
          'It starts, fails and Kubernetes retries it later each time',
        ],
        wrong: [
          'It cannot find the image in the registry',
          'It does not fit on any node of the cluster',
          'It is running but does not get traffic yet',
          'It is being deleted and waits for it to finish',
        ],
      },
      {
        ask: [
          'You deploy `ghcr.io/peer4u/front:1.0`, a tag that was never pushed. Which STATUS do you see?',
          'With an image whose tag does not exist in the registry, `kubectl get pods` shows…',
        ],
        right: ['`ErrImagePull`', '`ImagePullBackOff`'],
        wrong: ['`CrashLoopBackOff`', '`Completed`', '`OOMKilled`', '`Terminating`'],
      },
    ],
    wrong: [],
    why: 'CrashLoopBackOff means it starts and dies (check logs --previous); if the image never downloads, it is ErrImagePull or ImagePullBackOff.',
  },
}
