/**
 * Nivel principiante: bloques 1 a 3 y su jefe final. Primero los
 * contenedores (ejecutar, mirar, parar, entrar), luego configurarlos y
 * limpiar, y al final el Dockerfile: contenerizar la web y la API del equipo.
 */

import { API_SERVER_STRICT } from '../world.js'
import type { Unit } from './types.js'

const WEB_DOCKERFILE =
  "cat > Dockerfile <<'EOF'\nFROM nginx:1.27-alpine\nCOPY index.html /usr/share/nginx/html/\nEOF"

const API_DOCKERFILE =
  'cat > Dockerfile <<\'EOF\'\nFROM node:22-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci --omit=dev\nEXPOSE 3000\nCMD ["node", "server.js"]\nEOF'

const API_CACHED =
  'cat > Dockerfile <<\'EOF\'\nFROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nEXPOSE 3000\nCMD ["node", "server.js"]\nEOF'

export const BEGINNER: Unit[] = [
  /* ---------- Bloque 1: tus primeros contenedores ---------- */
  {
    id: 'docker-hello',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Tu primer contenedor',
      goal: 'Ejecuta un contenedor de la imagen hello-world.',
      theory: {
        what: 'Una imagen es una plantilla de solo lectura (un sistema de ficheros y qué ejecutar); un contenedor se crea a partir de ella para ejecutarla, con su propia capa de escritura. docker run descarga la imagen si no la tienes, crea el contenedor y lo arranca.',
        how: [
          'docker run hello-world      # descarga, crea, ejecuta y termina',
          'docker ps                   # contenedores en marcha',
          'docker ps -a                # también los que ya acabaron',
          'docker images               # imágenes descargadas',
        ],
        when: 'Siempre que quieras ejecutar algo empaquetado (una base de datos, una herramienta, la app del equipo) sin instalarlo en tu máquina.',
        problems:
          'Un contenedor que acaba no desaparece: se queda parado (Exited) hasta que lo borras. Por eso docker ps -a enseña más cosas que docker ps.',
      },
      example:
        'Ejecutas hello-world, ves el contenedor parado con docker ps -a y la imagen con docker images.',
      objectives: { 'probe:ran': 'Un contenedor de hello-world ha terminado bien' },
    },
    en: {
      title: 'Your first container',
      goal: 'Run a container from the hello-world image.',
      theory: {
        what: 'An image is a read-only template (a filesystem and what to run); a container is created from it to run it, with its own writable layer. docker run pulls the image if you do not have it, creates the container and starts it.',
        how: [
          'docker run hello-world      # pull, create, run and exit',
          'docker ps                   # running containers',
          'docker ps -a                # also the ones that finished',
          'docker images               # pulled images',
        ],
        when: 'Whenever you want to run something packaged (a database, a tool, the team app) without installing it on your machine.',
        problems:
          'A container that finishes does not disappear: it stays stopped (Exited) until you remove it. That is why docker ps -a shows more than docker ps.',
      },
      example:
        'You run hello-world, see the stopped container with docker ps -a and the image with docker images.',
      objectives: { 'probe:ran': 'A hello-world container finished successfully' },
    },
    example: ['docker run hello-world', 'docker ps', 'docker ps -a', 'docker images'],
    solution: ['docker run hello-world'],
    check: {
      probes: {
        ran: [
          "docker ps -a --filter ancestor=hello-world --filter exited=0 --format '{{.Image}}' | head -n 1",
        ],
      },
    },
  },
  {
    id: 'docker-detached',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'En segundo plano y con puerto',
      goal: 'Deja nginx:1.27 corriendo en segundo plano con el nombre web y el puerto 8080 de tu máquina llevando a su puerto 80.',
      theory: {
        what: '-d deja el contenedor en segundo plano y te devuelve la terminal; --name le pone un nombre para no usar el id; -p PUERTO_TUYO:PUERTO_DEL_CONTENEDOR publica un puerto para llegar desde fuera.',
        how: [
          'docker run -d --name web -p 8080:80 nginx:1.27',
          'docker ps                   # PORTS: 0.0.0.0:8080->80/tcp',
          'curl localhost:8080         # contesta nginx',
        ],
        when: 'Para servidores (webs, APIs, bases de datos): procesos que se quedan escuchando.',
        whenNot:
          'Para una orden que acaba (una migración, un script) no hace falta -d: quieres ver su salida.',
        problems:
          'Sin -p el contenedor escucha, pero solo dentro de Docker: desde tu máquina no llegas. Y fija siempre la versión (nginx:1.27): latest cambia sin avisar.',
      },
      example:
        'Arrancas un nginx de prueba en el 9090, lo ves en docker ps y le pides la portada con curl.',
      objectives: {},
    },
    en: {
      title: 'Detached and with a port',
      goal: 'Leave nginx:1.27 running in the background named web, with port 8080 on your machine going to its port 80.',
      theory: {
        what: '-d runs the container in the background and gives you the terminal back; --name names it so you do not need the id; -p YOUR_PORT:CONTAINER_PORT publishes a port so you can reach it from outside.',
        how: [
          'docker run -d --name web -p 8080:80 nginx:1.27',
          'docker ps                   # PORTS: 0.0.0.0:8080->80/tcp',
          'curl localhost:8080         # nginx answers',
        ],
        when: 'For servers (websites, APIs, databases): processes that keep listening.',
        whenNot:
          'For a command that finishes (a migration, a script) you do not need -d: you want its output.',
        problems:
          'Without -p the container listens, but only inside Docker: you cannot reach it from your machine. And always pin the version (nginx:1.27): latest changes without warning.',
      },
      example:
        'You start a test nginx on 9090, see it in docker ps and ask for its home page with curl.',
      objectives: {},
    },
    example: [
      'docker run -d --name demo -p 9090:80 nginx:1.27-alpine',
      'docker ps',
      'curl -s localhost:9090',
    ],
    solution: ['docker run -d --name web -p 8080:80 nginx:1.27'],
    check: { containers: ['web'], http: ['localhost:8080/'] },
  },
  {
    id: 'docker-lifecycle',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    setup: {
      run: [
        'docker run -d --name cache redis:7',
        'docker stop cache',
        'docker run -d --name legacy -p 8081:80 nginx:1.27-alpine',
      ],
    },
    es: {
      title: 'Parar, arrancar y borrar',
      goal: 'cache (redis) está parado: arráncalo. legacy ya no se usa: bórralo, aunque esté corriendo.',
      theory: {
        what: 'Un contenedor pasa por created → running → exited → borrado. stop lo para con calma (SIGTERM y, si no acaba, SIGKILL a los 10 s); start lo vuelve a arrancar con la misma configuración; rm lo borra.',
        how: [
          'docker stop web             # parar',
          'docker start web            # volver a arrancar (mismo nombre, puertos y datos)',
          'docker restart web          # stop + start',
          'docker rm web               # borrar uno parado',
          'docker rm -f web            # parar y borrar de una vez',
        ],
        when: 'Para liberar memoria o puertos, aplicar una configuración nueva (se borra y se crea otra vez) o recoger lo que ya no sirve.',
        problems:
          'rm borra la capa propia del contenedor: lo que se escribió dentro y no está en un volumen se pierde. docker rm de uno que corre falla: hay que pararlo antes o usar -f.',
      },
      example:
        'Miras los contenedores, paras legacy, lo ves Exited en docker ps -a y lo vuelves a arrancar.',
      objectives: { 'gone:legacy': 'legacy ya no existe' },
    },
    en: {
      title: 'Stop, start and remove',
      goal: 'cache (redis) is stopped: start it. legacy is no longer used: remove it, even though it is running.',
      theory: {
        what: 'A container goes created → running → exited → removed. stop stops it gently (SIGTERM, then SIGKILL after 10 s); start starts it again with the same configuration; rm removes it.',
        how: [
          'docker stop web             # stop',
          'docker start web            # start again (same name, ports and data)',
          'docker restart web          # stop + start',
          'docker rm web               # remove a stopped one',
          'docker rm -f web            # stop and remove in one go',
        ],
        when: 'To free memory or ports, apply a new configuration (remove it and create it again) or clean up what is no longer needed.',
        problems:
          'rm removes the container layer: whatever was written inside and is not in a volume is gone. docker rm on a running container fails: stop it first or use -f.',
      },
      example:
        'You list the containers, stop legacy, see it Exited in docker ps -a and start it again.',
      objectives: { 'gone:legacy': 'legacy no longer exists' },
    },
    example: ['docker ps -a', 'docker stop legacy', 'docker ps -a', 'docker start legacy'],
    solution: ['docker start cache', 'docker rm -f legacy'],
    check: { containers: ['cache'], gone: ['legacy'] },
  },
  {
    id: 'docker-logs',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    setup: {
      run: ['docker run -d --name db postgres:16', 'docker run -d --name web nginx:1.27-alpine'],
    },
    es: {
      title: 'Leer los registros',
      goal: 'db se ha caído nada más arrancar. Enseña sus 3 últimas líneas de registro: ahí está el porqué.',
      theory: {
        what: 'docker logs enseña lo que el proceso del contenedor escribió en su salida (stdout y stderr), aunque ya esté parado. Es lo primero que se mira cuando algo no arranca.',
        how: [
          'docker logs web             # todo el registro',
          'docker logs --tail 20 web   # las 20 últimas líneas (también -n 20)',
          'docker logs -f web          # seguir mirando lo que va saliendo',
          'docker logs -t web          # con la hora de cada línea',
        ],
        when: 'Siempre que un contenedor sale con un código raro, se reinicia sin parar o no contesta: antes de tocar nada, lee.',
        problems:
          'Solo sale lo que la app escribe en la salida estándar: si escribe en un fichero dentro del contenedor, docker logs no lo ve (por eso las imágenes oficiales mandan los registros a stdout).',
      },
      example: 'Miras los contenedores, ves db parado y lees el registro de web.',
      objectives: { output: 'Has enseñado las 3 últimas líneas del registro de db' },
    },
    en: {
      title: 'Reading the logs',
      goal: 'db crashed right after starting. Show its last 3 log lines: the reason is there.',
      theory: {
        what: 'docker logs shows what the container process wrote to its output (stdout and stderr), even if it already stopped. It is the first thing to look at when something does not start.',
        how: [
          'docker logs web             # the whole log',
          'docker logs --tail 20 web   # the last 20 lines (also -n 20)',
          'docker logs -f web          # keep watching what comes out',
          'docker logs -t web          # with the time of each line',
        ],
        when: 'Whenever a container exits with an odd code, keeps restarting or does not answer: read before touching anything.',
        problems:
          'Only what the app writes to standard output shows up: if it writes to a file inside the container, docker logs cannot see it (that is why official images log to stdout).',
      },
      example: 'You list the containers, see db stopped and read the log of web.',
      objectives: { output: 'You showed the last 3 log lines of db' },
    },
    example: ['docker ps -a', 'docker logs web'],
    solution: ['docker logs --tail 3 db'],
    check: { output: true },
    requires: [['logs']],
  },
  {
    id: 'docker-exec',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    setup: { run: ['docker run -d --name web -p 8080:80 nginx:1.27-alpine'] },
    es: {
      title: 'Ejecutar dentro: exec',
      goal: 'Sin crear otro contenedor, cambia la portada de web para que curl localhost:8080 diga «Peer4U en mantenimiento».',
      theory: {
        what: 'docker exec ejecuta una orden más dentro de un contenedor que ya corre (run, en cambio, crea uno nuevo). Para varias órdenes o redirecciones, pásalas a sh -c.',
        how: [
          'docker exec web ls /usr/share/nginx/html',
          'docker exec web cat /etc/os-release',
          "docker exec web sh -c 'echo hola > /tmp/x && cat /tmp/x'",
          'docker exec -it web sh      # una shell dentro (aquí no hay sesión interactiva)',
        ],
        when: 'Para mirar y depurar: qué ficheros hay, qué variables ve la app, si llega a otro servicio.',
        whenNot:
          'Para cambiar algo que tiene que durar: lo hecho con exec se pierde al recrear el contenedor. Lo que dura va en la imagen (Dockerfile) o en un volumen.',
        problems:
          'La redirección > fuera de comillas la hace tu shell, no la del contenedor: docker exec web echo hola > f escribe f en tu máquina.',
      },
      example: 'Miras qué sirve nginx, lees su portada y pruebas una orden con sh -c.',
      objectives: {},
    },
    en: {
      title: 'Running inside: exec',
      goal: 'Without creating another container, change the home page of web so that curl localhost:8080 says "Peer4U en mantenimiento".',
      theory: {
        what: 'docker exec runs one more command inside a container that is already running (run, instead, creates a new one). For several commands or redirections, pass them to sh -c.',
        how: [
          'docker exec web ls /usr/share/nginx/html',
          'docker exec web cat /etc/os-release',
          "docker exec web sh -c 'echo hi > /tmp/x && cat /tmp/x'",
          'docker exec -it web sh      # a shell inside (no interactive session here)',
        ],
        when: 'To look around and debug: which files are there, which variables the app sees, whether it reaches another service.',
        whenNot:
          'To change something that must last: whatever you do with exec is lost when the container is recreated. What lasts goes in the image (Dockerfile) or in a volume.',
        problems:
          'A > outside the quotes is handled by your shell, not the container one: docker exec web echo hi > f writes f on your machine.',
      },
      example: 'You check what nginx serves, read its home page and try a command with sh -c.',
      objectives: {},
    },
    example: [
      'docker exec web ls /usr/share/nginx/html',
      'docker exec web cat /usr/share/nginx/html/index.html',
      "docker exec web sh -c 'echo hola > /tmp/prueba && cat /tmp/prueba'",
    ],
    solution: [
      "docker exec web sh -c 'echo Peer4U en mantenimiento > /usr/share/nginx/html/index.html'",
    ],
    check: { containers: ['web'], http: ['localhost:8080/'] },
    requires: [['exec', 'cp']],
  },
  {
    id: 'docker-boss-oncall',
    block: 1,
    tier: 'beginner',
    kind: 'boss',
    limit: 240,
    setup: {
      run: [
        'docker run -d --name cache redis:7-alpine',
        'docker stop cache',
        'docker run -d --name old-web -p 8080:80 nginx:1.27-alpine',
        'docker run -d --name web -p 8081:80 nginx:1.27',
      ],
    },
    es: {
      title: 'Guardia de noche',
      goal: 'Deja cache corriendo y web en el 8080, sin old-web.',
      story:
        'Te llaman de guardia: la web no contesta en el 8080 y la caché está caída. Alguien dejó una versión vieja ocupando el puerto y arrancó la nueva en el que no tocaba.',
      tasks: [
        'Arranca cache (está parado).',
        'Borra old-web, que tiene el 8080.',
        'Vuelve a crear web con nginx:1.27 y el 8080 de tu máquina a su 80.',
      ],
      objectives: { 'gone:old-web': 'old-web ya no existe' },
    },
    en: {
      title: 'Night shift',
      goal: 'Leave cache running and web on 8080, without old-web.',
      story:
        'You get paged: the website does not answer on 8080 and the cache is down. Someone left an old version holding the port and started the new one on the wrong port.',
      tasks: [
        'Start cache (it is stopped).',
        'Remove old-web, which holds 8080.',
        'Create web again with nginx:1.27 and your 8080 going to its 80.',
      ],
      objectives: { 'gone:old-web': 'old-web no longer exists' },
    },
    solution: [
      'docker start cache',
      'docker rm -f old-web web',
      'docker run -d --name web -p 8080:80 nginx:1.27',
    ],
    check: { containers: ['cache', 'web'], gone: ['old-web'], http: ['localhost:8080/'] },
  },

  /* ---------- Bloque 2: configurar, inspeccionar y limpiar ---------- */
  {
    id: 'docker-env',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Configurar con variables',
      goal: 'Deja una base de datos postgres:16 corriendo con el nombre db y la contraseña secreto.',
      theory: {
        what: 'Las imágenes se configuran con variables de entorno: -e CLAVE=valor al crear el contenedor (o --env-file fichero). postgres no arranca sin POSTGRES_PASSWORD.',
        how: [
          'docker run -d --name db -e POSTGRES_PASSWORD=secreto postgres:16',
          'docker run --env-file .env …        # muchas de una vez',
          'docker exec db env                  # qué ve el contenedor',
        ],
        when: 'Para todo lo que cambia entre entornos: contraseñas, la URL de la base de datos, el puerto, el modo (desarrollo o producción).',
        problems:
          'Una variable no se cambia en un contenedor que ya existe: hay que borrarlo y crearlo otra vez con el valor nuevo. Y lo que va en -e se ve en docker inspect: no es un sitio seguro para secretos de verdad.',
      },
      example: 'Arrancas postgres sin contraseña, lees por qué se cae y lo creas otra vez bien.',
      objectives: {},
    },
    en: {
      title: 'Configuring with variables',
      goal: 'Leave a postgres:16 database running named db with the password secreto.',
      theory: {
        what: 'Images are configured with environment variables: -e KEY=value when you create the container (or --env-file file). postgres does not start without POSTGRES_PASSWORD.',
        how: [
          'docker run -d --name db -e POSTGRES_PASSWORD=secreto postgres:16',
          'docker run --env-file .env …        # many at once',
          'docker exec db env                  # what the container sees',
        ],
        when: 'For everything that changes between environments: passwords, the database URL, the port, the mode (development or production).',
        problems:
          'You cannot change a variable on an existing container: remove it and create it again with the new value. And whatever goes in -e shows in docker inspect: not a safe place for real secrets.',
      },
      example:
        'You start postgres without a password, read why it crashes and create it again properly.',
      objectives: {},
    },
    example: [
      'docker run -d --name prueba postgres:16',
      'docker logs prueba',
      'docker rm prueba',
      'docker run -d --name prueba -e POSTGRES_PASSWORD=demo postgres:16',
      'docker ps',
    ],
    solution: ['docker run -d --name db -e POSTGRES_PASSWORD=secreto postgres:16'],
    check: { containers: ['db'], exec: ['db pg_isready'] },
  },
  {
    id: 'docker-inspect',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    setup: {
      run: ['docker run -d --name web -p 8080:80 --restart unless-stopped nginx:1.27-alpine'],
    },
    es: {
      title: 'Inspeccionar',
      goal: 'Saca con una plantilla solo la IP de web (y nada más).',
      theory: {
        what: 'docker inspect da todo lo que Docker sabe de un contenedor, una imagen, un volumen o una red, en JSON. Con -f y una plantilla de Go sacas solo un dato.',
        how: [
          'docker inspect web',
          "docker inspect -f '{{.State.Status}}' web",
          "docker inspect -f '{{.NetworkSettings.IPAddress}}' web",
          "docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' web",
          "docker inspect -f '{{json .Config.Env}}' web",
          'docker port web             # los puertos publicados',
        ],
        when: 'Para responder sin adivinar: qué variables tiene, con qué se arrancó, por qué salió (State.ExitCode, State.OOMKilled), dónde están sus datos (Mounts).',
        problems:
          'Las mayúsculas cuentan: {{.State.status}} no existe. Mira el JSON entero una vez para saber el camino.',
      },
      example: 'Miras el estado, la política de reinicio y los puertos de web.',
      objectives: { output: 'Has sacado la IP de web con una plantilla' },
    },
    en: {
      title: 'Inspecting',
      goal: 'Use a template to print only the IP address of web (and nothing else).',
      theory: {
        what: 'docker inspect gives everything Docker knows about a container, an image, a volume or a network, as JSON. With -f and a Go template you print just one field.',
        how: [
          'docker inspect web',
          "docker inspect -f '{{.State.Status}}' web",
          "docker inspect -f '{{.NetworkSettings.IPAddress}}' web",
          "docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' web",
          "docker inspect -f '{{json .Config.Env}}' web",
          'docker port web             # published ports',
        ],
        when: 'To answer without guessing: which variables it has, how it was started, why it exited (State.ExitCode, State.OOMKilled), where its data lives (Mounts).',
        problems:
          'Case matters: {{.State.status}} does not exist. Look at the whole JSON once to learn the path.',
      },
      example: 'You check the status, the restart policy and the ports of web.',
      objectives: { output: 'You printed the IP of web with a template' },
    },
    example: [
      "docker inspect -f '{{.State.Status}}' web",
      "docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' web",
      'docker port web',
    ],
    solution: ["docker inspect -f '{{.NetworkSettings.IPAddress}}' web"],
    check: { output: true },
    requires: [['inspect']],
  },
  {
    id: 'docker-tags',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Imágenes, etiquetas y versiones',
      goal: 'Descarga nginx con la versión 1.27 en su variante alpine y ponle también la etiqueta peer4u/web:1.0.',
      theory: {
        what: 'Una imagen se nombra repositorio:etiqueta (nginx:1.27-alpine). La etiqueta es un nombre que se puede mover; el digest (sha256:…) es la huella exacta. Las variantes -alpine y -slim pesan mucho menos.',
        how: [
          'docker pull nginx:1.27-alpine',
          'docker images',
          'docker tag nginx:1.27-alpine peer4u/web:1.0   # otro nombre, la misma imagen',
          "docker image inspect -f '{{.RepoDigests}}' nginx:1.27-alpine",
        ],
        when: 'Fija siempre una versión en lo que despliegas: así sabes qué corre y puedes volver atrás.',
        whenNot:
          'latest no es «la última»: es la etiqueta por defecto. Úsala para probar, nunca en producción.',
        problems:
          'docker tag no copia nada: dos nombres, el mismo IMAGE ID. Borrar un nombre (docker rmi) no borra la imagen mientras le quede otro.',
      },
      example: 'Comparas lo que pesan nginx:1.27 y nginx:1.27-alpine y miras su digest.',
      objectives: {},
    },
    en: {
      title: 'Images, tags and versions',
      goal: 'Pull nginx version 1.27 in its alpine flavour and also tag it peer4u/web:1.0.',
      theory: {
        what: 'An image is named repository:tag (nginx:1.27-alpine). The tag is a name that can move; the digest (sha256:…) is the exact fingerprint. The -alpine and -slim flavours weigh much less.',
        how: [
          'docker pull nginx:1.27-alpine',
          'docker images',
          'docker tag nginx:1.27-alpine peer4u/web:1.0   # another name, same image',
          "docker image inspect -f '{{.RepoDigests}}' nginx:1.27-alpine",
        ],
        when: 'Always pin a version in what you deploy: you know what runs and you can roll back.',
        whenNot:
          'latest is not "the newest": it is just the default tag. Use it to try things, never in production.',
        problems:
          'docker tag copies nothing: two names, the same IMAGE ID. Removing one name (docker rmi) does not remove the image while it has another.',
      },
      example: 'You compare the size of nginx:1.27 and nginx:1.27-alpine and look at the digest.',
      objectives: {},
    },
    example: [
      'docker pull nginx:1.27',
      'docker pull nginx:1.27-alpine',
      'docker images',
      "docker image inspect -f '{{.RepoDigests}}' nginx:1.27-alpine",
    ],
    solution: ['docker pull nginx:1.27-alpine', 'docker tag nginx:1.27-alpine peer4u/web:1.0'],
    check: { images: ['nginx:1.27-alpine', 'peer4u/web:1.0'], inspect: ['peer4u/web:1.0 {{.Id}}'] },
  },
  {
    id: 'docker-cleanup',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    setup: {
      files: {
        '~/web/Dockerfile': 'FROM nginx:1.27-alpine\nCOPY index.html /usr/share/nginx/html/\n',
      },
      run: [
        'docker build -t web:dev ~/web',
        "echo '<p>v2</p>' >> ~/web/index.html",
        'docker build -t web:dev ~/web',
        "echo '<p>v3</p>' >> ~/web/index.html",
        'docker build -t web:dev ~/web',
        'docker run hello-world',
        'docker run alpine:3.20 echo prueba',
        'docker run -d --name web -p 8080:80 web:dev',
      ],
    },
    es: {
      title: 'Limpiar la casa',
      goal: 'Borra los contenedores parados y las imágenes colgantes (<none>) sin tocar web, que sigue corriendo.',
      theory: {
        what: 'Cada build que reutiliza una etiqueta deja la imagen vieja sin nombre (<none>, «colgante»), y cada docker run sin --rm deja un contenedor parado. docker system df dice cuánto ocupa todo y cuánto se puede recuperar.',
        how: [
          'docker system df                # qué ocupa y qué se puede borrar',
          'docker container prune -f       # contenedores parados',
          'docker image prune -f           # imágenes colgantes',
          'docker image prune -a -f        # todas las que no usa ningún contenedor',
          'docker system prune -f          # parados, colgantes, redes sin uso y caché',
          'docker rmi hello-world          # una en concreto',
        ],
        when: 'Cuando el disco de tu máquina o del servidor de CI se llena (pasa más de lo que parece).',
        problems:
          'prune -a borra también imágenes que querrás mañana (y habrá que descargarlas otra vez). Los volúmenes no se tocan salvo que lo pidas: ahí viven los datos.',
      },
      example: 'Miras cuánto ocupa todo, las imágenes colgantes y los contenedores parados.',
      objectives: {
        'probe:stopped': 'No queda ningún contenedor parado',
        'probe:dangling': 'No queda ninguna imagen colgante',
      },
    },
    en: {
      title: 'Cleaning up',
      goal: 'Remove the stopped containers and the dangling images (<none>) without touching web, which is still running.',
      theory: {
        what: 'Each build that reuses a tag leaves the old image without a name (<none>, "dangling"), and each docker run without --rm leaves a stopped container. docker system df tells you how much everything takes and how much you can reclaim.',
        how: [
          'docker system df                # what takes space and what can go',
          'docker container prune -f       # stopped containers',
          'docker image prune -f           # dangling images',
          'docker image prune -a -f        # every image no container uses',
          'docker system prune -f          # stopped, dangling, unused networks and cache',
          'docker rmi hello-world          # one in particular',
        ],
        when: 'When the disk of your machine or the CI server fills up (it happens more than you think).',
        problems:
          'prune -a also removes images you will want tomorrow (and they must be pulled again). Volumes are left alone unless you ask: that is where data lives.',
      },
      example:
        'You check how much everything takes, the dangling images and the stopped containers.',
      objectives: {
        'probe:stopped': 'No stopped container left',
        'probe:dangling': 'No dangling image left',
      },
    },
    example: ['docker system df', 'docker images', 'docker ps -a'],
    solution: ['docker container prune -f', 'docker image prune -f'],
    check: {
      containers: ['web'],
      images: ['web:dev'],
      probes: {
        stopped: ['docker ps -aq --filter status=exited | wc -l'],
        dangling: ['docker images -q --filter dangling=true | wc -l'],
      },
    },
  },
  {
    id: 'docker-boss-config',
    block: 2,
    tier: 'beginner',
    kind: 'boss',
    limit: 300,
    setup: {
      run: [
        'docker run -d --name db postgres:16',
        'docker run -d --name web -p 8080:80 nginx:latest',
        'docker run alpine:3.20 echo migración 1',
        'docker run alpine:3.20 echo migración 2',
      ],
    },
    es: {
      title: 'La base de datos de pruebas',
      goal: 'db corriendo con contraseña, web con una versión fija y ningún contenedor parado.',
      story:
        'QA no puede probar: la base de datos de pruebas no arranca y la web corre con latest, que esta mañana cambió de versión. Y las migraciones de ayer dejaron contenedores parados por todas partes.',
      tasks: [
        'Mira por qué db no arranca y créalo otra vez con la contraseña secreto (postgres:16).',
        'Cambia web por nginx:1.27-alpine, también en el 8080.',
        'Borra los contenedores parados que quedan.',
      ],
      objectives: { 'probe:stopped': 'No queda ningún contenedor parado' },
    },
    en: {
      title: 'The test database',
      goal: 'db running with a password, web on a pinned version and no stopped containers.',
      story:
        'QA cannot test: the test database does not start and the website runs latest, which changed version this morning. And yesterday’s migrations left stopped containers everywhere.',
      tasks: [
        'Find out why db does not start and create it again with the password secreto (postgres:16).',
        'Replace web with nginx:1.27-alpine, also on 8080.',
        'Remove the stopped containers left over.',
      ],
      objectives: { 'probe:stopped': 'No stopped container left' },
    },
    solution: [
      'docker rm -f db web',
      'docker run -d --name db -e POSTGRES_PASSWORD=secreto postgres:16',
      'docker run -d --name web -p 8080:80 nginx:1.27-alpine',
      'docker container prune -f',
    ],
    check: {
      containers: ['db', 'web'],
      http: ['localhost:8080/'],
      probes: { stopped: ['docker ps -aq --filter status=exited | wc -l'] },
    },
  },

  /* ---------- Bloque 3: tu primer Dockerfile ---------- */
  {
    id: 'docker-dockerfile',
    block: 3,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Tu primer Dockerfile',
      goal: 'En ~/web, construye la imagen miweb:1.0 (nginx:1.27-alpine con tu index.html) y déjala corriendo como miweb en el 8080.',
      theory: {
        what: 'Un Dockerfile es la receta de una imagen: FROM dice de qué imagen partes y COPY mete ficheros de tu carpeta (el contexto). docker build -t nombre:versión CARPETA la construye.',
        how: [
          "cat > Dockerfile <<'EOF'",
          'FROM nginx:1.27-alpine',
          'COPY index.html /usr/share/nginx/html/',
          'EOF',
          'docker build -t miweb:1.0 .        # el punto: el contexto es esta carpeta',
          'docker run -d --name miweb -p 8080:80 miweb:1.0',
        ],
        when: 'En cuanto tu código tiene que correr igual en tu máquina, en la de otra persona, en CI y en producción.',
        problems:
          'COPY solo ve lo que hay dentro del contexto: COPY ../otro no funciona. Si cambias el Dockerfile o los ficheros, hay que construir otra vez.',
      },
      example:
        'Escribes un Dockerfile de dos líneas en ~/web, lo construyes como prueba:1 y miras la imagen.',
      objectives: {},
    },
    en: {
      title: 'Your first Dockerfile',
      goal: 'In ~/web, build the image miweb:1.0 (nginx:1.27-alpine with your index.html) and leave it running as miweb on 8080.',
      theory: {
        what: 'A Dockerfile is the recipe of an image: FROM says which image you start from and COPY adds files from your folder (the context). docker build -t name:version FOLDER builds it.',
        how: [
          "cat > Dockerfile <<'EOF'",
          'FROM nginx:1.27-alpine',
          'COPY index.html /usr/share/nginx/html/',
          'EOF',
          'docker build -t miweb:1.0 .        # the dot: this folder is the context',
          'docker run -d --name miweb -p 8080:80 miweb:1.0',
        ],
        when: 'As soon as your code has to run the same on your machine, someone else’s, CI and production.',
        problems:
          'COPY only sees what is inside the context: COPY ../other does not work. If you change the Dockerfile or the files, build again.',
      },
      example:
        'You write a two-line Dockerfile in ~/web, build it as prueba:1 and look at the image.',
      objectives: {},
    },
    example: ['cd ~/web', WEB_DOCKERFILE, 'docker build -t prueba:1 .', 'docker images prueba'],
    solution: [
      'cd ~/web',
      WEB_DOCKERFILE,
      'docker build -t miweb:1.0 .',
      'docker run -d --name miweb -p 8080:80 miweb:1.0',
    ],
    check: { images: ['miweb:1.0'], containers: ['miweb'], http: ['localhost:8080/'] },
  },
  {
    id: 'docker-containerize',
    block: 3,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Contenerizar la API',
      goal: 'Construye api:1.0 desde ~/api (Node 22 alpine, npm ci sin dependencias de desarrollo, node server.js) y déjala corriendo como api en el 3000.',
      theory: {
        what: 'WORKDIR fija la carpeta de trabajo de la imagen, RUN ejecuta una orden al construir (instalar dependencias), EXPOSE documenta el puerto y CMD dice qué ejecutar al arrancar un contenedor.',
        how: [
          'FROM node:22-alpine',
          'WORKDIR /app',
          'COPY . .',
          'RUN npm ci --omit=dev',
          'EXPOSE 3000',
          'CMD ["node", "server.js"]',
        ],
        when: 'Para cualquier servicio del equipo: así no hace falta tener Node (ni su versión) en ninguna máquina.',
        problems:
          'RUN es al construir y CMD al arrancar: un RUN node server.js colgaría el build. EXPOSE no publica nada: -p sigue haciendo falta.',
      },
      example:
        'Miras el package.json y el server.js de la API para saber qué instalar y qué arrancar.',
      objectives: {},
    },
    en: {
      title: 'Containerising the API',
      goal: 'Build api:1.0 from ~/api (Node 22 alpine, npm ci without dev dependencies, node server.js) and leave it running as api on 3000.',
      theory: {
        what: 'WORKDIR sets the working folder of the image, RUN runs a command at build time (install dependencies), EXPOSE documents the port and CMD says what to run when a container starts.',
        how: [
          'FROM node:22-alpine',
          'WORKDIR /app',
          'COPY . .',
          'RUN npm ci --omit=dev',
          'EXPOSE 3000',
          'CMD ["node", "server.js"]',
        ],
        when: 'For any team service: nobody needs Node (or its exact version) on any machine.',
        problems:
          'RUN is at build time and CMD at start time: RUN node server.js would hang the build. EXPOSE publishes nothing: you still need -p.',
      },
      example:
        'You read the package.json and server.js of the API to know what to install and what to start.',
      objectives: {},
    },
    example: ['cd ~/api', 'ls -a', 'cat package.json', 'head -n 5 server.js'],
    solution: [
      'cd ~/api',
      API_DOCKERFILE,
      'docker build -t api:1.0 .',
      'docker run -d --name api -p 3000:3000 api:1.0',
    ],
    check: {
      images: ['api:1.0'],
      containers: ['api'],
      http: ['localhost:3000/', 'localhost:3000/health'],
    },
  },
  {
    id: 'docker-cmd-entrypoint',
    block: 3,
    tier: 'beginner',
    kind: 'unit',
    setup: {
      files: {
        '~/pinger/README.md':
          '# pinger\n\nUna imagen que hace 3 pings: a localhost si no le dices a quién.\n',
      },
    },
    es: {
      title: 'CMD frente a ENTRYPOINT',
      goal: 'En ~/pinger, construye la imagen pinger (alpine:3.20): siempre hace ping -c 3 y, si no le dices a quién, a localhost.',
      theory: {
        what: 'ENTRYPOINT fija el programa; CMD da los argumentos por defecto. Lo que escribes tras la imagen en docker run sustituye al CMD, no al ENTRYPOINT (eso se cambia con --entrypoint).',
        how: [
          'ENTRYPOINT ["ping", "-c", "3"]',
          'CMD ["localhost"]',
          'docker run --rm pinger              # ping -c 3 localhost',
          'docker run --rm pinger peer4u.dev   # ping -c 3 peer4u.dev',
          'docker run --rm --entrypoint cat pinger /etc/os-release',
        ],
        when: 'ENTRYPOINT para imágenes que son una herramienta (se usan como un programa); solo CMD para servicios que a veces arrancas con otra orden.',
        problems:
          'Escríbelos en forma exec (["a", "b"]). En forma shell (CMD localhost) Docker pone /bin/sh -c delante y el ENTRYPOINT recibe argumentos que no esperabas.',
      },
      example: 'Con una imagen de alpine ves que lo que escribes tras el nombre sustituye al CMD.',
      objectives: {
        'probe:default': 'Sin argumentos hace 3 pings a localhost',
        'probe:other': 'Con un nombre, 3 pings a ese nombre',
      },
    },
    en: {
      title: 'CMD versus ENTRYPOINT',
      goal: 'In ~/pinger, build the image pinger (alpine:3.20): it always runs ping -c 3 and, if you do not say to whom, to localhost.',
      theory: {
        what: 'ENTRYPOINT sets the program; CMD gives the default arguments. Whatever you type after the image in docker run replaces CMD, not ENTRYPOINT (that one changes with --entrypoint).',
        how: [
          'ENTRYPOINT ["ping", "-c", "3"]',
          'CMD ["localhost"]',
          'docker run --rm pinger              # ping -c 3 localhost',
          'docker run --rm pinger peer4u.dev   # ping -c 3 peer4u.dev',
          'docker run --rm --entrypoint cat pinger /etc/os-release',
        ],
        when: 'ENTRYPOINT for images that are a tool (used like a program); only CMD for services you sometimes start with another command.',
        problems:
          'Write them in exec form (["a", "b"]). In shell form (CMD localhost) Docker adds /bin/sh -c and the ENTRYPOINT receives arguments you did not expect.',
      },
      example: 'With an alpine image you see that whatever you type after the name replaces CMD.',
      objectives: {
        'probe:default': 'Without arguments it pings localhost 3 times',
        'probe:other': 'With a name, it pings that name 3 times',
      },
    },
    example: [
      'docker run --rm alpine:3.20 echo hola',
      'docker run --rm alpine:3.20 cat /etc/os-release',
    ],
    solution: [
      'cd ~/pinger',
      'cat > Dockerfile <<\'EOF\'\nFROM alpine:3.20\nENTRYPOINT ["ping", "-c", "3"]\nCMD ["localhost"]\nEOF',
      'docker build -t pinger .',
    ],
    check: {
      images: ['pinger:latest'],
      probes: { default: ['docker run --rm pinger'], other: ['docker run --rm pinger peer4u.dev'] },
    },
  },
  {
    id: 'docker-arg-env',
    block: 3,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'ARG, ENV y LABEL',
      goal: 'En ~/api, haz que la versión de Node sea un ARG (22 por defecto), que la imagen tenga NODE_ENV=production y la etiqueta org.opencontainers.image.source=https://github.com/peer4u/api, y construye api:node20 con Node 20.',
      theory: {
        what: 'ARG es una variable solo para construir (se cambia con --build-arg); ENV queda dentro de la imagen y la ven los contenedores; LABEL añade metadatos (de dónde sale, quién la mantiene).',
        how: [
          'ARG NODE_VERSION=22',
          'FROM node:${NODE_VERSION}-alpine',
          'ENV NODE_ENV=production',
          'LABEL org.opencontainers.image.source=https://github.com/peer4u/api',
          'docker build --build-arg NODE_VERSION=20 -t api:node20 .',
          "docker inspect -f '{{json .Config.Labels}}' api:node20",
        ],
        when: 'ARG para lo que cambia al construir (versión de la base, el commit); ENV para lo que la app necesita al correr y es igual en todos los entornos.',
        problems:
          'Un ARG o un ENV con una contraseña queda guardado en el historial de la imagen (docker history): los secretos no van aquí (se ve en el nivel avanzado).',
      },
      example: 'Miras las variables y las etiquetas que traen las imágenes oficiales.',
      objectives: {
        'probe:node': 'El contenedor corre Node 20',
        'probe:env': 'Dentro, NODE_ENV vale production',
      },
    },
    en: {
      title: 'ARG, ENV and LABEL',
      goal: 'In ~/api, make the Node version an ARG (22 by default), give the image NODE_ENV=production and the label org.opencontainers.image.source=https://github.com/peer4u/api, and build api:node20 with Node 20.',
      theory: {
        what: 'ARG is a build-time variable (change it with --build-arg); ENV stays in the image and containers see it; LABEL adds metadata (where it comes from, who maintains it).',
        how: [
          'ARG NODE_VERSION=22',
          'FROM node:${NODE_VERSION}-alpine',
          'ENV NODE_ENV=production',
          'LABEL org.opencontainers.image.source=https://github.com/peer4u/api',
          'docker build --build-arg NODE_VERSION=20 -t api:node20 .',
          "docker inspect -f '{{json .Config.Labels}}' api:node20",
        ],
        when: 'ARG for what changes at build time (base version, the commit); ENV for what the app needs at run time and is the same everywhere.',
        problems:
          'An ARG or ENV holding a password is stored in the image history (docker history): secrets do not go here (more in the advanced level).',
      },
      example: 'You look at the variables and labels that official images ship with.',
      objectives: {
        'probe:node': 'The container runs Node 20',
        'probe:env': 'Inside, NODE_ENV is production',
      },
    },
    example: [
      'docker run --rm node:22-alpine node -v',
      "docker inspect -f '{{json .Config.Env}}' node:22-alpine",
    ],
    solution: [
      'cd ~/api',
      'cat > Dockerfile <<\'EOF\'\nARG NODE_VERSION=22\nFROM node:${NODE_VERSION}-alpine\nENV NODE_ENV=production\nLABEL org.opencontainers.image.source=https://github.com/peer4u/api\nWORKDIR /app\nCOPY . .\nRUN npm ci --omit=dev\nCMD ["node", "server.js"]\nEOF',
      'docker build --build-arg NODE_VERSION=20 -t api:node20 .',
    ],
    check: {
      images: ['api:node20'],
      inspect: ['api:node20 {{index .Config.Labels "org.opencontainers.image.source"}}'],
      probes: {
        node: ['docker run --rm api:node20 node -v'],
        env: ['docker run --rm api:node20 printenv NODE_ENV'],
      },
    },
  },
  {
    id: 'docker-boss-dockerize',
    block: 3,
    tier: 'beginner',
    kind: 'boss',
    limit: 420,
    es: {
      title: 'Dockeriza la API',
      goal: 'api:1.0.0 construida desde ~/api con la caché bien ordenada, corriendo como api en el 3000.',
      story:
        'El equipo quiere dejar de oír «en mi máquina funciona». Te toca la imagen de la API, y cada build en CI tarda una eternidad porque reinstala las dependencias aunque solo cambie una línea de código.',
      tasks: [
        'Escribe el Dockerfile de ~/api: Node 22 alpine, primero package.json y package-lock.json, luego npm ci --omit=dev y después el código.',
        'Construye api:1.0.0.',
        'Déjala corriendo como api, con el 3000 publicado, y comprueba /health con curl.',
      ],
      objectives: { 'probe:cache': 'Cambiar el código no reinstala las dependencias' },
    },
    en: {
      title: 'Dockerise the API',
      goal: 'api:1.0.0 built from ~/api with a well-ordered cache, running as api on 3000.',
      story:
        'The team wants to stop hearing "it works on my machine". The API image is yours, and every CI build takes forever because it reinstalls dependencies even when one line of code changes.',
      tasks: [
        'Write the Dockerfile of ~/api: Node 22 alpine, first package.json and package-lock.json, then npm ci --omit=dev, then the code.',
        'Build api:1.0.0.',
        'Leave it running as api with 3000 published, and check /health with curl.',
      ],
      objectives: { 'probe:cache': 'Changing the code does not reinstall the dependencies' },
    },
    solution: [
      'cd ~/api',
      API_CACHED,
      'docker build -t api:1.0.0 .',
      'docker run -d --name api -p 3000:3000 api:1.0.0',
    ],
    check: {
      containers: ['api'],
      http: ['localhost:3000/health'],
      probes: {
        cache: [
          "echo '// cambio' >> ~/api/server.js",
          "docker build -t sonda ~/api | grep -c 'CACHED.*npm ci'",
        ],
      },
    },
  },
  {
    id: 'docker-final-beginner',
    block: 3,
    tier: 'beginner',
    kind: 'final',
    limit: 600,
    setup: {
      files: { '~/api/server.js': API_SERVER_STRICT },
      run: ['docker run alpine:3.20 echo turno de noche', 'docker run -d --name db postgres:16'],
    },
    es: {
      title: 'Tu primer encargo',
      goal: 'La base de datos, la web y la API corriendo con sus imágenes, y nada parado.',
      story:
        'Primer encargo en solitario: montar en dev1 lo que el equipo usa para enseñar Peer4U a la gente nueva. El turno de noche dejó una base de datos caída y contenedores parados. La API de ~/api ya no arranca sin su DATABASE_URL.',
      tasks: [
        'Vuelve a crear db (postgres:16) con la contraseña secreto.',
        'Construye peer4u/web:1.0 desde ~/web (nginx:1.27-alpine con el index.html) y déjala como web en el 8080.',
        'Construye peer4u/api:1.0 desde ~/api y déjala como api en el 3000, con DATABASE_URL=postgres://postgres:secreto@IP:5432/postgres, donde IP es la de db (en la red de siempre no se encuentran por nombre; eso llega en el nivel intermedio).',
        'Borra los contenedores parados.',
      ],
      objectives: { 'probe:stopped': 'No queda ningún contenedor parado' },
    },
    en: {
      title: 'Your first assignment',
      goal: 'The database, the website and the API running with their images, and nothing stopped.',
      story:
        'First solo assignment: set up on dev1 what the team uses to show Peer4U to new people. The night shift left a crashed database and stopped containers. The API in ~/api no longer starts without its DATABASE_URL.',
      tasks: [
        'Create db again (postgres:16) with the password secreto.',
        'Build peer4u/web:1.0 from ~/web (nginx:1.27-alpine with index.html) and run it as web on 8080.',
        'Build peer4u/api:1.0 from ~/api and run it as api on 3000, with DATABASE_URL=postgres://postgres:secreto@IP:5432/postgres, where IP is the one of db (on the default network containers do not find each other by name; that comes in the intermediate level).',
        'Remove the stopped containers.',
      ],
      objectives: { 'probe:stopped': 'No stopped container left' },
    },
    solution: [
      'docker rm -f db',
      'docker run -d --name db -e POSTGRES_PASSWORD=secreto postgres:16',
      'cd ~/web',
      WEB_DOCKERFILE,
      'docker build -t peer4u/web:1.0 .',
      'docker run -d --name web -p 8080:80 peer4u/web:1.0',
      'cd ~/api',
      API_CACHED,
      'docker build -t peer4u/api:1.0 .',
      "docker run -d --name api -p 3000:3000 -e DATABASE_URL=postgres://postgres:secreto@$(docker inspect -f '{{.NetworkSettings.IPAddress}}' db):5432/postgres peer4u/api:1.0",
      'docker container prune -f',
    ],
    check: {
      containers: ['db', 'web', 'api'],
      http: ['localhost:8080/', 'localhost:3000/health'],
      probes: { stopped: ['docker ps -aq --filter status=exited | wc -l'] },
    },
  },
]
