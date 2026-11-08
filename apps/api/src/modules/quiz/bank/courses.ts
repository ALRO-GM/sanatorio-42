/**
 * Banco de Not-games: preguntas de los cursos de shell, Docker y Kubernetes
 * (las de git están en `git.ts`). Generales, como las de git, y con el `id`
 * empezando por el del curso. Siguen `docs/plantilla-preguntas.md`: la mala
 * principal de cada una es el error típico de su unidad, y lo afirmado se ha
 * comprobado en el motor del curso (2026-11-08).
 */

import type { Concept } from './types.js'

export const COURSES: readonly Concept[] = [
  {
    // Unidad cd del curso de shell (el ejemplo 1 de la plantilla).
    id: 'shell-cd-rutas',
    topic: 'shell',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        // Predicción (motor: pwd → /var/log/peer4u): sin subir, desde la raíz, sube dos, desde casa.
        ask: [
          'Estás en `/var/log/nginx` y escribes `cd ../peer4u`. ¿Dónde acabas?',
          'Desde `/var/log/nginx`, `cd ../peer4u` te lleva a…',
        ],
        right: ['`/var/log/peer4u`'],
        wrong: ['`/var/log/nginx/peer4u`', '`/peer4u`', '`/var/peer4u`', '`/home/peer/peer4u`'],
      },
      {
        // Diagnóstico (motor: «bash: cd: /nginx: No such file or directory»).
        ask: [
          'Estás en `/var/log` y `cd /nginx` dice «No such file or directory». ¿Por qué?',
          'Desde `/var/log`, `ls` enseña `nginx`, pero `cd /nginx` falla. ¿Qué pasa?',
        ],
        right: [
          'Con `/` delante, busca `nginx` en la raíz',
          'La `/` del principio parte de la raíz',
        ],
        wrong: [
          'Hace falta `sudo` para entrar en `nginx`',
          'Las carpetas se abren con `ls`, no con `cd`',
          '`cd` no entra en carpetas fuera de tu `home`',
          '`nginx` es un fichero, no una carpeta',
        ],
      },
      {
        // Negativa: la buena es la única que NO lleva; las malas son ciertas.
        ask: [
          'Estás en `/var/log`. ¿Cuál de estas órdenes NO te lleva a `/var/log/nginx`?',
          'Desde `/var/log`, todas te llevan a `/var/log/nginx` EXCEPTO…',
        ],
        right: ['`cd /nginx`'],
        wrong: ['`cd nginx`', '`cd ./nginx`', '`cd /var/log/nginx`', '`cd ../log/nginx`'],
      },
    ],
    wrong: [],
    why: 'Una ruta con / delante parte de la raíz; sin ella, de donde estás. Y .. sube una carpeta.',
  },
  {
    // Unidad docker-ports: -p anfitrión:contenedor.
    id: 'docker-ports',
    topic: 'contenedores',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        // Predicción (motor: curl localhost:8080 da la portada; localhost:80, «Couldn't connect to server»).
        ask: [
          'Arrancas `docker run -d -p 8080:80 nginx`. ¿Qué orden te enseña la portada desde tu máquina?',
          'Con `docker run -d -p 8080:80 nginx`, desde tu máquina la portada sale con…',
        ],
        right: ['`curl localhost:8080`'],
        // Orden al revés, nombre del contenedor desde fuera, la IP de docker ps con el puerto de dentro.
        wrong: ['`curl localhost:80`', '`curl nginx:8080`', '`curl 0.0.0.0:80`', '`curl nginx:80`'],
      },
      {
        // Inversa.
        ask: [
          'Tu app escucha en el 3000 dentro del contenedor y la quieres en el 8080 de tu máquina. ¿Qué pones?',
          'Para llegar desde el 8080 de tu máquina al 3000 del contenedor, `docker run` lleva…',
        ],
        right: ['`-p 8080:3000`'],
        wrong: ['`-p 3000:8080`', '`-p 8080`', '`-p 3000`', '`--expose 8080:3000`'],
      },
      {
        // Diagnóstico: los dos números al revés.
        ask: [
          'Arrancas nginx (que escucha en el 80) con `-p 80:8080` y `curl localhost:80` no da la portada. ¿Por qué?',
          'Con `-p 80:8080` sobre nginx, que escucha en el 80, la portada no sale. ¿Qué pasa?',
        ],
        right: [
          'Manda al 8080 del contenedor, donde nadie escucha',
          'Los números van al revés: primero el de tu máquina',
        ],
        wrong: [
          'Hace falta sudo para usar el puerto 80',
          'curl no llega a los puertos de un contenedor',
          'nginx tarda unos minutos en arrancar',
          'Un contenedor solo puede publicar el 8080',
        ],
      },
    ],
    wrong: [],
    why: 'En -p A:B, A es el puerto de tu máquina y B el del contenedor: se llama a localhost:A.',
  },
  {
    // Unidades k8s-crashloop y k8s-imagepull: leer el STATUS de kubectl get pods.
    id: 'k8s-pod-status',
    topic: 'kubernetes',
    needs: {},
    kind: 'quick',
    level: 3,
    forms: [
      {
        // Diagnóstico: cada mala es lo que dice otro STATUS.
        ask: [
          '`kubectl get pods` enseña un Pod en `CrashLoopBackOff`. ¿Qué le pasa?',
          'Un Pod en `CrashLoopBackOff` quiere decir que…',
        ],
        right: [
          'Su contenedor arranca y sale con error una y otra vez',
          'Arranca, falla y Kubernetes lo reintenta cada vez más tarde',
        ],
        wrong: [
          'No encuentra la imagen en el registro',
          'No cabe en ningún nodo del clúster',
          'Está en marcha, pero aún no recibe tráfico',
          'Lo están borrando y espera a que acabe',
        ],
      },
      {
        // Predicción (motor: el front con una etiqueta que no existe sale en ErrImagePull).
        ask: [
          'Despliegas `ghcr.io/peer4u/front:1.0`, una etiqueta que nunca se publicó. ¿Qué STATUS ves?',
          'Con una imagen cuya etiqueta no existe en el registro, `kubectl get pods` enseña…',
        ],
        right: ['`ErrImagePull`', '`ImagePullBackOff`'],
        wrong: ['`CrashLoopBackOff`', '`Completed`', '`OOMKilled`', '`Terminating`'],
      },
    ],
    wrong: [],
    why: 'CrashLoopBackOff es que arranca y muere (mira logs --previous); si no llega a bajar la imagen, es ErrImagePull o ImagePullBackOff.',
  },
]
