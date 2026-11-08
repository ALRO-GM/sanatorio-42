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
        what: 'docker run crea un contenedor a partir de una imagen (la plantilla, de solo lectura) y lo arranca. Si no tienes la imagen, antes la descarga.',
        how: [
          'docker run hello-world   # descarga, ejecuta y acaba',
          'docker ps                # solo los que corren',
          'docker ps -a             # también los acabados',
          'docker images            # las imágenes descargadas',
        ],
        when: 'Para usar una base de datos, una herramienta o la app del equipo sin instalarla en tu máquina.',
        whenNot:
          'Repetir docker run no reutiliza el contenedor: crea otro, con otro nombre al azar, y docker ps -a enseña los dos.',
        problems:
          'Creer que el contenedor desaparece al acabar. docker ps sale vacío, pero docker ps -a lo enseña como «Exited (0)»: sigue ahí, parado, hasta que lo borras.',
      },
      example:
        'Antes de verlo: hello-world escribe su saludo y acaba. ¿Saldrá en docker ps, en docker ps -a o en ninguno?',
      objectives: { 'probe:ran': 'Un contenedor de hello-world ha terminado bien' },
    },
    en: {
      title: 'Your first container',
      goal: 'Run a container from the hello-world image.',
      theory: {
        what: 'docker run creates a container from an image (the read-only template) and starts it. If you do not have the image, it pulls it first.',
        how: [
          'docker run hello-world   # pull, run and exit',
          'docker ps                # only running ones',
          'docker ps -a             # finished ones too',
          'docker images            # pulled images',
        ],
        when: 'To use a database, a tool or the team app without installing it on your machine.',
        whenNot:
          'Running docker run again does not reuse the container: it creates another, with another random name, and docker ps -a shows both.',
        problems:
          'Thinking the container disappears when it ends. docker ps is empty, but docker ps -a shows it as "Exited (0)": it stays there, stopped, until you remove it.',
      },
      example:
        'Before you look: hello-world prints its greeting and exits. Will it show in docker ps, in docker ps -a or in neither?',
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
        what: '-d deja el contenedor en segundo plano, --name le pone nombre y -p 8080:80 lleva el puerto 8080 de tu máquina al 80 del contenedor.',
        how: [
          'docker run -d --name web -p 8080:80 nginx:1.27',
          'docker ps            # PORTS: 0.0.0.0:8080->80/tcp',
          'curl localhost:8080  # contesta nginx',
        ],
        when: 'Para servidores (webs, APIs, bases de datos), que se quedan escuchando mientras sigues usando la terminal.',
        whenNot:
          'Una orden que acaba (una migración, un guion) no necesita -d: quieres ver su salida. Y fija la versión: latest cambia sin avisar.',
        problems:
          'Olvidar -p: el contenedor escucha, pero solo dentro de Docker. docker ps enseña «80/tcp» sin flecha y curl dice «Failed to connect to localhost port 9090». Créalo otra vez con -p.',
      },
      example:
        'Antes de verlo: arrancas nginx sin -p y le pides la portada con curl en el 9090. ¿Contestará?',
      objectives: {},
    },
    en: {
      title: 'Detached and with a port',
      goal: 'Leave nginx:1.27 running in the background named web, with port 8080 on your machine going to its port 80.',
      theory: {
        what: '-d leaves the container in the background, --name gives it a name and -p 8080:80 sends port 8080 on your machine to port 80 in the container.',
        how: [
          'docker run -d --name web -p 8080:80 nginx:1.27',
          'docker ps            # PORTS: 0.0.0.0:8080->80/tcp',
          'curl localhost:8080  # nginx answers',
        ],
        when: 'For servers (websites, APIs, databases), which keep listening while you go on using the terminal.',
        whenNot:
          'A command that ends (a migration, a script) does not need -d: you want its output. And pin the version: latest changes without warning.',
        problems:
          'Forgetting -p: the container listens, but only inside Docker. docker ps shows "80/tcp" with no arrow and curl says "Failed to connect to localhost port 9090". Create it again with -p.',
      },
      example:
        'Before you look: you start nginx without -p and ask curl for its home page on 9090. Will it answer?',
      objectives: {},
    },
    example: [
      'docker run -d --name sinpuerto nginx:1.27-alpine',
      'curl localhost:9090',
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
        what: 'stop para un contenedor (queda Exited), start lo arranca otra vez con su misma configuración y rm lo borra.',
        how: [
          'docker stop web     # parar: queda Exited',
          'docker start web    # arrancar con lo mismo',
          'docker rm web       # borrar uno parado',
          'docker rm -f web    # parar y borrar a la vez',
        ],
        when: 'Para liberar memoria o puertos, o quitar lo que ya no sirve.',
        whenNot:
          'stop conserva lo escrito dentro del contenedor; rm lo borra, y lo que no esté en un volumen se pierde.',
        problems:
          'Borrar uno que corre: docker rm legacy responde «cannot remove container "/legacy": container is running». Páralo antes o usa docker rm -f.',
      },
      example: 'Antes de verlo: legacy está corriendo y escribes docker rm legacy. ¿Lo borra?',
      objectives: { 'gone:legacy': 'legacy ya no existe' },
    },
    en: {
      title: 'Stop, start and remove',
      goal: 'cache (redis) is stopped: start it. legacy is no longer used: remove it, even though it is running.',
      theory: {
        what: 'stop stops a container (it becomes Exited), start starts it again with the same configuration and rm removes it.',
        how: [
          'docker stop web     # stop: becomes Exited',
          'docker start web    # start with the same setup',
          'docker rm web       # remove a stopped one',
          'docker rm -f web    # stop and remove at once',
        ],
        when: 'To free memory or ports, or to get rid of what is no longer needed.',
        whenNot:
          'stop keeps what was written inside the container; rm removes it, and whatever is not in a volume is lost.',
        problems:
          'Removing a running one: docker rm legacy answers "cannot remove container "/legacy": container is running". Stop it first or use docker rm -f.',
      },
      example: 'Before you look: legacy is running and you type docker rm legacy. Does it go?',
      objectives: { 'gone:legacy': 'legacy no longer exists' },
    },
    example: [
      'docker ps -a',
      'docker rm legacy',
      'docker stop legacy',
      'docker ps -a',
      'docker start legacy',
    ],
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
        what: 'docker logs enseña lo que el proceso del contenedor escribió en su salida, aunque el contenedor ya esté parado.',
        how: [
          'docker ps -a               # quién está Exited',
          'docker logs web            # todo el registro',
          'docker logs --tail 20 web  # las 20 últimas',
          'docker logs -f web         # seguir lo que sale',
        ],
        when: 'Cuando un contenedor se cae, se reinicia sin parar o no contesta: antes de tocar nada, lees su registro.',
        whenNot:
          'docker logs solo ve lo que la app escribe en su salida: si escribe en un fichero dentro del contenedor, ahí no sale.',
        problems:
          'Pedir el registro por la imagen y no por el contenedor: docker logs postgres:16 responde «No such container: postgres:16». Usa el nombre de la última columna de docker ps -a.',
      },
      example:
        'Antes de verlo: db sale Exited en docker ps -a. ¿Tendrá registro aunque esté parado?',
      objectives: { output: 'Has enseñado las 3 últimas líneas del registro de db' },
    },
    en: {
      title: 'Reading the logs',
      goal: 'db crashed right after starting. Show its last 3 log lines: the reason is there.',
      theory: {
        what: 'docker logs shows what the container process wrote to its output, even if the container already stopped.',
        how: [
          'docker ps -a               # who is Exited',
          'docker logs web            # the whole log',
          'docker logs --tail 20 web  # the last 20 lines',
          'docker logs -f web         # follow what comes out',
        ],
        when: 'When a container crashes, keeps restarting or does not answer: read its log before touching anything.',
        whenNot:
          'docker logs only sees what the app writes to its output: if it writes to a file inside the container, it does not show up.',
        problems:
          'Asking for the log by image instead of by container: docker logs postgres:16 answers "No such container: postgres:16". Use the name in the last column of docker ps -a.',
      },
      example:
        'Before you look: db is Exited in docker ps -a. Will it have a log even though it stopped?',
      objectives: { output: 'You showed the last 3 log lines of db' },
    },
    example: ['docker ps -a', 'docker logs --tail 1 db', 'docker logs postgres:16'],
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
        what: 'docker exec ejecuta una orden más dentro de un contenedor que ya corre; docker run, en cambio, crea uno nuevo.',
        how: [
          'docker exec web ls /usr/share/nginx/html',
          "docker exec web sh -c 'echo hola > /tmp/x'",
          'docker exec web cat /tmp/x   # hola',
        ],
        when: 'Para mirar y depurar: qué ficheros hay, qué variables ve la app, si llega a otro servicio.',
        whenNot:
          'Lo hecho con exec se pierde al recrear el contenedor: lo que tiene que durar va en la imagen o en un volumen.',
        problems:
          "Dejar > fuera de comillas: en docker exec web echo hola > f redirige tu shell, y f aparece en tu máquina, no en el contenedor. Mete la orden en sh -c '…'.",
      },
      example:
        'Antes de verlo: escribes docker exec web echo hola > f. ¿Dónde aparece f, en el contenedor o en tu máquina?',
      objectives: {},
    },
    en: {
      title: 'Running inside: exec',
      goal: 'Without creating another container, change the home page of web so that curl localhost:8080 says "Peer4U en mantenimiento".',
      theory: {
        what: 'docker exec runs one more command inside a container that is already running; docker run, instead, creates a new one.',
        how: [
          'docker exec web ls /usr/share/nginx/html',
          "docker exec web sh -c 'echo hola > /tmp/x'",
          'docker exec web cat /tmp/x   # hola',
        ],
        when: 'To look around and debug: which files are there, which variables the app sees, whether it reaches another service.',
        whenNot:
          'Whatever you do with exec is lost when the container is recreated: what must last goes in the image or in a volume.',
        problems:
          "Leaving > outside the quotes: in docker exec web echo hola > f your shell redirects, and f appears on your machine, not in the container. Wrap the command in sh -c '…'.",
      },
      example:
        'Before you look: you type docker exec web echo hola > f. Where does f appear, in the container or on your machine?',
      objectives: {},
    },
    example: [
      'docker exec web echo hola > f',
      'cat f',
      'docker exec web ls /tmp',
      "docker exec web sh -c 'echo hola > /tmp/x'",
      'docker exec web cat /tmp/x',
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
        what: '-e CLAVE=valor da una variable de entorno al crear el contenedor: así se configuran las imágenes. postgres, por ejemplo, no arranca sin POSTGRES_PASSWORD.',
        how: [
          'docker run -d --name db -e POSTGRES_PASSWORD=secreto postgres:16',
          'docker exec db env            # lo que ve dentro',
          'docker run --env-file .env …  # muchas de una vez',
        ],
        when: 'Para lo que cambia entre entornos: contraseñas, la URL de la base de datos, el modo de desarrollo o producción.',
        whenNot:
          'Lo que pasas con -e se ve en docker inspect: vale para configuración, no para secretos de producción.',
        problems:
          'Cambiar una variable creando otro contenedor con el mismo nombre: «Conflict. The container name "/db" is already in use». Borra el viejo con docker rm -f y créalo otra vez.',
      },
      example:
        'Antes de verlo: arrancas postgres sin POSTGRES_PASSWORD. ¿Seguirá corriendo, y qué dirá su registro?',
      objectives: {},
    },
    en: {
      title: 'Configuring with variables',
      goal: 'Leave a postgres:16 database running named db with the password secreto.',
      theory: {
        what: '-e KEY=value gives an environment variable when creating the container: that is how images are configured. postgres, for one, does not start without POSTGRES_PASSWORD.',
        how: [
          'docker run -d --name db -e POSTGRES_PASSWORD=secreto postgres:16',
          'docker exec db env            # what it sees inside',
          'docker run --env-file .env …  # many at once',
        ],
        when: 'For what changes between environments: passwords, the database URL, development or production mode.',
        whenNot:
          'What you pass with -e shows in docker inspect: fine for configuration, not for production secrets.',
        problems:
          'Changing a variable by creating another container with the same name: "Conflict. The container name "/db" is already in use". Remove the old one with docker rm -f and create it again.',
      },
      example:
        'Before you look: you start postgres without POSTGRES_PASSWORD. Will it keep running, and what will its log say?',
      objectives: {},
    },
    example: [
      'docker run -d --name prueba postgres:16',
      'docker ps -a',
      'docker logs prueba',
      'docker rm prueba',
      'docker run -d --name prueba -e POSTGRES_PASSWORD=demo postgres:16',
      'docker exec prueba env',
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
        what: 'docker inspect da en JSON todo lo que Docker sabe de un contenedor o una imagen. Con -f y una plantilla sacas un solo dato.',
        how: [
          'docker inspect web     # el JSON entero',
          "docker inspect -f '{{.State.Status}}' web",
          "docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' web",
          'docker port web        # los puertos publicados',
        ],
        when: 'Para responder sin adivinar: con qué se arrancó, por qué salió (State.ExitCode), qué variables tiene.',
        whenNot:
          'docker ps resume todos los contenedores en una tabla; inspect da uno solo, con todo el detalle.',
        problems:
          "Equivocar las mayúsculas del camino: -f '{{.State.status}}' no da error, imprime «<no value>». Mira el JSON entero una vez y copia el camino tal cual.",
      },
      example:
        'Antes de verlo: pides {{.State.status}}, con la s minúscula. ¿Qué imprime docker inspect?',
      objectives: { output: 'Has sacado la IP de web con una plantilla' },
    },
    en: {
      title: 'Inspecting',
      goal: 'Use a template to print only the IP address of web (and nothing else).',
      theory: {
        what: 'docker inspect gives, as JSON, everything Docker knows about a container or an image. With -f and a template you print a single field.',
        how: [
          'docker inspect web     # the whole JSON',
          "docker inspect -f '{{.State.Status}}' web",
          "docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' web",
          'docker port web        # published ports',
        ],
        when: 'To answer without guessing: how it was started, why it exited (State.ExitCode), which variables it has.',
        whenNot:
          'docker ps sums up every container in a table; inspect gives just one, in full detail.',
        problems:
          'Getting the case of the path wrong: -f \'{{.State.status}}\' gives no error, it prints "<no value>". Look at the whole JSON once and copy the path as it is.',
      },
      example:
        'Before you look: you ask for {{.State.status}}, with a lowercase s. What does docker inspect print?',
      objectives: { output: 'You printed the IP of web with a template' },
    },
    example: [
      "docker inspect -f '{{.State.status}}' web",
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
        what: 'Una imagen se nombra repositorio:etiqueta (nginx:1.27-alpine). docker tag le pone otro nombre a la misma imagen, sin copiarla.',
        how: [
          'docker pull nginx:1.27-alpine',
          'docker tag nginx:1.27-alpine peer4u/web:1.0',
          'docker images      # el mismo IMAGE ID dos veces',
          'docker rmi peer4u/web:1.0   # quita solo el nombre',
        ],
        when: 'Para fijar la versión de lo que despliegas: sabes qué corre y puedes volver atrás.',
        whenNot:
          'latest no es «la última versión»: es la etiqueta por defecto y cambia sin avisar. Para probar vale; en producción, una versión fija.',
        problems:
          'Creer que docker tag duplica la imagen. docker images enseña el mismo IMAGE ID y tamaño en los dos nombres, y docker rmi de uno solo dice «Untagged: peer4u/demo:1.0».',
      },
      example:
        'Antes de verlo: etiquetas nginx:1.27-alpine como peer4u/demo:1.0. ¿Cuánto más ocupará en docker images?',
      objectives: {},
    },
    en: {
      title: 'Images, tags and versions',
      goal: 'Pull nginx version 1.27 in its alpine flavour and also tag it peer4u/web:1.0.',
      theory: {
        what: 'An image is named repository:tag (nginx:1.27-alpine). docker tag gives the same image another name, without copying it.',
        how: [
          'docker pull nginx:1.27-alpine',
          'docker tag nginx:1.27-alpine peer4u/web:1.0',
          'docker images      # the same IMAGE ID twice',
          'docker rmi peer4u/web:1.0   # removes only the name',
        ],
        when: 'To pin the version of what you deploy: you know what runs and you can roll back.',
        whenNot:
          'latest is not "the newest version": it is the default tag and changes without warning. Fine for trying; in production, a pinned version.',
        problems:
          'Thinking docker tag duplicates the image. docker images shows the same IMAGE ID and size under both names, and docker rmi of one just says "Untagged: peer4u/demo:1.0".',
      },
      example:
        'Before you look: you tag nginx:1.27-alpine as peer4u/demo:1.0. How much more space will docker images show?',
      objectives: {},
    },
    example: [
      'docker pull nginx:1.27',
      'docker pull nginx:1.27-alpine',
      'docker tag nginx:1.27-alpine peer4u/demo:1.0',
      'docker images',
      'docker rmi peer4u/demo:1.0',
      'docker images',
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
        what: 'Cada build que reutiliza una etiqueta deja la imagen vieja sin nombre (<none>, «colgante»), y cada docker run deja un contenedor parado. prune los borra.',
        how: [
          'docker system df           # qué ocupa y qué sobra',
          'docker container prune -f  # contenedores parados',
          'docker image prune -f      # imágenes colgantes',
          'docker image prune -a -f   # también las que no se usan',
        ],
        when: 'Cuando se llena el disco de tu máquina o del servidor de CI, que pasa más de lo que parece.',
        whenNot:
          'prune -a borra también imágenes que querrás mañana. Los volúmenes no los toca: ahí viven los datos.',
        problems:
          'Borrar a mano la imagen de un contenedor que corre: docker rmi web:dev responde «conflict: unable to remove repository reference "web:dev" (must force)». prune ya se salta lo que está en uso.',
      },
      example:
        'Antes de verlo: web:dev se ha construido tres veces. ¿Cuántas imágenes <none> saldrán en docker images?',
      objectives: {
        'probe:stopped': 'No queda ningún contenedor parado',
        'probe:dangling': 'No queda ninguna imagen colgante',
      },
    },
    en: {
      title: 'Cleaning up',
      goal: 'Remove the stopped containers and the dangling images (<none>) without touching web, which is still running.',
      theory: {
        what: 'Each build that reuses a tag leaves the old image without a name (<none>, "dangling"), and each docker run leaves a stopped container. prune removes them.',
        how: [
          'docker system df           # what takes space',
          'docker container prune -f  # stopped containers',
          'docker image prune -f      # dangling images',
          'docker image prune -a -f   # unused ones too',
        ],
        when: 'When the disk of your machine or the CI server fills up, which happens more than you think.',
        whenNot:
          'prune -a also removes images you will want tomorrow. It leaves volumes alone: that is where data lives.',
        problems:
          'Removing by hand the image of a running container: docker rmi web:dev answers "conflict: unable to remove repository reference "web:dev" (must force)". prune already skips what is in use.',
      },
      example:
        'Before you look: web:dev was built three times. How many <none> images will docker images show?',
      objectives: {
        'probe:stopped': 'No stopped container left',
        'probe:dangling': 'No dangling image left',
      },
    },
    example: ['docker system df', 'docker images', 'docker ps -a', 'docker rmi web:dev'],
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
        what: 'Un Dockerfile es la receta de una imagen: FROM dice de qué imagen partes y COPY mete ficheros de la carpeta que construyes (el contexto).',
        how: [
          "cat > Dockerfile <<'EOF'",
          'FROM nginx:1.27-alpine',
          'COPY index.html /usr/share/nginx/html/',
          'EOF',
          'docker build -t miweb:1.0 .   # el punto: el contexto',
          'docker run -d --name miweb -p 8080:80 miweb:1.0',
        ],
        when: 'En cuanto tu código tiene que correr igual en tu máquina, en CI y en producción.',
        whenNot:
          'Cambiar index.html no cambia la imagen ya construida: hay que volver a hacer docker build.',
        problems:
          'Copiar algo de fuera del contexto: con COPY ../index.html el build acaba en «ERROR: failed to solve» y «not found». Pon el fichero dentro de la carpeta que construyes.',
      },
      example:
        'Antes de verlo: el Dockerfile copia ../index.html, de fuera de ~/web. ¿Se construirá la imagen?',
      objectives: {},
    },
    en: {
      title: 'Your first Dockerfile',
      goal: 'In ~/web, build the image miweb:1.0 (nginx:1.27-alpine with your index.html) and leave it running as miweb on 8080.',
      theory: {
        what: 'A Dockerfile is the recipe of an image: FROM says which image you start from and COPY adds files from the folder you build (the context).',
        how: [
          "cat > Dockerfile <<'EOF'",
          'FROM nginx:1.27-alpine',
          'COPY index.html /usr/share/nginx/html/',
          'EOF',
          'docker build -t miweb:1.0 .   # the dot: the context',
          'docker run -d --name miweb -p 8080:80 miweb:1.0',
        ],
        when: 'As soon as your code has to run the same on your machine, in CI and in production.',
        whenNot:
          'Changing index.html does not change the image already built: run docker build again.',
        problems:
          'Copying something outside the context: with COPY ../index.html the build ends in "ERROR: failed to solve" and "not found". Put the file inside the folder you build.',
      },
      example:
        'Before you look: the Dockerfile copies ../index.html, from outside ~/web. Will the image build?',
      objectives: {},
    },
    example: [
      'cd ~/web',
      "cat > Dockerfile <<'EOF'\nFROM nginx:1.27-alpine\nCOPY ../index.html /usr/share/nginx/html/\nEOF",
      'docker build -t prueba:0 .',
      WEB_DOCKERFILE,
      'docker build -t prueba:1 .',
      'docker images prueba',
    ],
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
        what: 'WORKDIR fija la carpeta de trabajo, RUN ejecuta una orden al construir, EXPOSE documenta el puerto y CMD dice qué arranca el contenedor.',
        how: [
          'FROM node:22-alpine',
          'WORKDIR /app',
          'COPY . .',
          'RUN npm ci --omit=dev',
          'EXPOSE 3000',
          'CMD ["node", "server.js"]',
        ],
        when: 'Para cualquier servicio del equipo: ninguna máquina necesita Node, ni su versión exacta.',
        whenNot:
          'RUN es al construir y CMD al arrancar: RUN node server.js dejaría el build esperando al servidor.',
        problems:
          'Creer que EXPOSE publica el puerto. docker ps enseña solo «3000/tcp» y curl dice «Failed to connect to localhost port 3000». Hace falta -p 3000:3000.',
      },
      example:
        'Antes de verlo: construyes la API con EXPOSE 3000 y la arrancas sin -p. ¿Contestará curl localhost:3000/health?',
      objectives: {},
    },
    en: {
      title: 'Containerising the API',
      goal: 'Build api:1.0 from ~/api (Node 22 alpine, npm ci without dev dependencies, node server.js) and leave it running as api on 3000.',
      theory: {
        what: 'WORKDIR sets the working folder, RUN runs a command at build time, EXPOSE documents the port and CMD says what the container starts.',
        how: [
          'FROM node:22-alpine',
          'WORKDIR /app',
          'COPY . .',
          'RUN npm ci --omit=dev',
          'EXPOSE 3000',
          'CMD ["node", "server.js"]',
        ],
        when: 'For any team service: no machine needs Node, or its exact version.',
        whenNot:
          'RUN is at build time and CMD at start time: RUN node server.js would leave the build waiting for the server.',
        problems:
          'Thinking EXPOSE publishes the port. docker ps shows only "3000/tcp" and curl says "Failed to connect to localhost port 3000". You need -p 3000:3000.',
      },
      example:
        'Before you look: you build the API with EXPOSE 3000 and start it without -p. Will curl localhost:3000/health answer?',
      objectives: {},
    },
    example: [
      'cd ~/api',
      'cat package.json',
      API_DOCKERFILE,
      'docker build -t prueba:1 .',
      'docker run -d --name prueba prueba:1',
      'docker ps',
      'curl localhost:3000/health',
    ],
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
        what: 'ENTRYPOINT fija el programa y CMD da sus argumentos por defecto. Lo que escribes tras la imagen en docker run sustituye al CMD, no al ENTRYPOINT.',
        how: [
          'ENTRYPOINT ["echo", "hola"]',
          'CMD ["equipo"]',
          'docker run --rm saludo         # hola equipo',
          'docker run --rm saludo peer4u  # hola peer4u',
        ],
        when: 'ENTRYPOINT para imágenes que se usan como una herramienta; solo CMD para servicios que a veces arrancas con otra orden.',
        whenNot:
          'Escríbelos en forma exec, con corchetes: en forma shell (CMD echo hola) Docker pone /bin/sh -c delante.',
        problems:
          'Con solo CMD, lo que escribes sustituye al programa entero: docker run --rm alpine:3.20 peer4u falla con «exec: "peer4u": executable file not found in $PATH».',
      },
      example:
        'Antes de verlo: saludo tiene ENTRYPOINT echo hola y CMD equipo. ¿Qué escribe docker run --rm saludo peer4u?',
      objectives: {
        'probe:default': 'Sin argumentos hace 3 pings a localhost',
        'probe:other': 'Con un nombre, 3 pings a ese nombre',
      },
    },
    en: {
      title: 'CMD versus ENTRYPOINT',
      goal: 'In ~/pinger, build the image pinger (alpine:3.20): it always runs ping -c 3 and, if you do not say to whom, to localhost.',
      theory: {
        what: 'ENTRYPOINT sets the program and CMD gives its default arguments. Whatever you type after the image in docker run replaces CMD, not ENTRYPOINT.',
        how: [
          'ENTRYPOINT ["echo", "hola"]',
          'CMD ["equipo"]',
          'docker run --rm saludo         # hola equipo',
          'docker run --rm saludo peer4u  # hola peer4u',
        ],
        when: 'ENTRYPOINT for images used like a tool; only CMD for services you sometimes start with another command.',
        whenNot:
          'Write them in exec form, with brackets: in shell form (CMD echo hola) Docker puts /bin/sh -c in front.',
        problems:
          'With only CMD, what you type replaces the whole program: docker run --rm alpine:3.20 peer4u fails with "exec: "peer4u": executable file not found in $PATH".',
      },
      example:
        'Before you look: saludo has ENTRYPOINT echo hola and CMD equipo. What does docker run --rm saludo peer4u print?',
      objectives: {
        'probe:default': 'Without arguments it pings localhost 3 times',
        'probe:other': 'With a name, it pings that name 3 times',
      },
    },
    example: [
      'mkdir ~/saludo',
      'cd ~/saludo',
      'cat > Dockerfile <<\'EOF\'\nFROM alpine:3.20\nENTRYPOINT ["echo", "hola"]\nCMD ["equipo"]\nEOF',
      'docker build -t saludo .',
      'docker run --rm saludo',
      'docker run --rm saludo peer4u',
      'docker run --rm alpine:3.20 peer4u',
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
        what: 'ARG es una variable solo para construir (se cambia con --build-arg); ENV queda en la imagen y la ven los contenedores; LABEL añade metadatos.',
        how: [
          'ARG NODE_VERSION=22',
          'FROM node:${NODE_VERSION}-alpine',
          'ENV NODE_ENV=production',
          'LABEL org.opencontainers.image.source=https://github.com/peer4u/api',
          'docker build --build-arg NODE_VERSION=20 -t api:node20 .',
        ],
        when: 'ARG para lo que cambia al construir (la versión de la base); ENV para lo que la app lee al correr.',
        whenNot:
          'Ni ARG ni ENV sirven para contraseñas: docker history enseña la línea «ENV MODO=production» a quien tenga la imagen, y igual una clave.',
        problems:
          'Esperar un ARG dentro del contenedor: printenv enseña «MODO=production» pero no COMMIT, que solo existe al construir. Si la app lo necesita, pásalo a un ENV.',
      },
      example:
        'Antes de verlo: el Dockerfile tiene ARG COMMIT y ENV MODO. ¿Cuál de los dos enseña printenv dentro del contenedor?',
      objectives: {
        'probe:node': 'El contenedor corre Node 20',
        'probe:env': 'Dentro, NODE_ENV vale production',
      },
    },
    en: {
      title: 'ARG, ENV and LABEL',
      goal: 'In ~/api, make the Node version an ARG (22 by default), give the image NODE_ENV=production and the label org.opencontainers.image.source=https://github.com/peer4u/api, and build api:node20 with Node 20.',
      theory: {
        what: 'ARG is a build-only variable (change it with --build-arg); ENV stays in the image and containers see it; LABEL adds metadata.',
        how: [
          'ARG NODE_VERSION=22',
          'FROM node:${NODE_VERSION}-alpine',
          'ENV NODE_ENV=production',
          'LABEL org.opencontainers.image.source=https://github.com/peer4u/api',
          'docker build --build-arg NODE_VERSION=20 -t api:node20 .',
        ],
        when: 'ARG for what changes at build time (the base version); ENV for what the app reads at run time.',
        whenNot:
          'Neither ARG nor ENV is for passwords: docker history shows the line "ENV MODO=production" to anyone with the image, and a key just the same.',
        problems:
          'Expecting an ARG inside the container: printenv shows "MODO=production" but no COMMIT, which only exists while building. If the app needs it, copy it into an ENV.',
      },
      example:
        'Before you look: the Dockerfile has ARG COMMIT and ENV MODO. Which one does printenv show inside the container?',
      objectives: {
        'probe:node': 'The container runs Node 20',
        'probe:env': 'Inside, NODE_ENV is production',
      },
    },
    example: [
      'mkdir ~/vars',
      'cd ~/vars',
      'cat > Dockerfile <<\'EOF\'\nFROM alpine:3.20\nARG COMMIT=abc123\nENV MODO=production\nCMD ["printenv"]\nEOF',
      'docker build -t vars .',
      'docker run --rm vars',
      'docker history vars',
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
