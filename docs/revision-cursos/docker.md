# Revisión del curso de Docker (2026-11-09)

Repaso nivel a nivel de las 37 unidades, 9 jefes y 3 jefes finales del
[curso de Docker](../curso-docker.md) contra Docker Engine 27/28, Compose v2 y
BuildKit: (a) que lo que dice cada punto sea cierto, (b) que lo que enseña sea
la práctica de hoy y (c) que se acepten las otras formas válidas de llegar al
mismo estado. Lo comprobado está en `apps/api/tests/unit/dockersim.test.ts`
(«como Docker 27/28 de verdad» y «más formas equivalentes»); las afirmaciones
sobre la herramienta real se probaron con Docker 29.1 y `node:22-alpine` en la
máquina de desarrollo cuando se podía (permisos, uid de `adduser -S`, `curl`
y `wget` en las imágenes, forma shell de `ENTRYPOINT`, el campo `IPAddress`).

Leyenda: ✓ cierto y actual · ✎ se corrigió (texto, solución, comprobación o
motor) · ≈ cierto con un matiz que se apunta abajo.

## Principiante

| Bloque | Punto | Afirmaciones | Práctica | Alternativas que valen (comprobadas) | Cambios |
| --- | --- | --- | --- | --- | --- |
| 1 | `docker-hello` | ✓ | ✓ | `docker run --rm hello-world`, `docker container run`, `docker.io/library/hello-world:latest` | ✎ Se comprueba por la salida (el saludo), no por un contenedor parado: con `--rm` no fallaba por nada |
| 1 | `docker-detached` | ✓ | ✓ versión fija | opciones en cualquier orden, `--publish=`, `--name=`, `-dp`, `create` + `start`, `0.0.0.0:8080:80`, `8080:80/tcp`, `nginx:1.27.2` | — |
| 1 | `docker-lifecycle` | ✓ | ✓ | `docker container start/rm`, `--force`, `kill` + `rm`, `stop` + `rm` | — |
| 1 | `docker-logs` | ✓ | ✓ | `docker container logs`, `--tail=3`, `-n 3`, `\| tail -n 3` | — |
| 1 | `docker-exec` | ✓ | ✓ | `docker container exec`, `/bin/sh -c`, comillas dobles, `docker cp`, `printf`, `echo … \| docker exec -i web tee …` | ✎ La `sh` de dentro gana `printf`, `tee`, `cd`, `$0`/`$1`/`$?` y `docker exec -i` pasa la entrada |
| 1 | Jefe `docker-boss-oncall` | ✓ | ✓ | `stop` + `rm`, cualquier orden de pasos, `nginx:1.27.2` | — |
| 2 | `docker-env` | ✓ | ✓ | `--env`, `--env=`, `-e CLAVE` con la variable exportada, `--env-file` | — |
| 2 | `docker-inspect` | ≈ | ✎ | `{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}`, `{{.NetworkSettings.Networks.bridge.IPAddress}}`, `(index … "bridge").IPAddress`, `--format`, `docker container inspect`, y aún `{{.NetworkSettings.IPAddress}}` | ✎ La solución usa `range … Networks`: el campo de arriba está obsoleto (vacío fuera de `bridge` y quitado en Docker 29). El motor entiende `(…)`, `$` y `range $k, $v :=` |
| 2 | `docker-tags` | ✓ | ✓ | `docker image pull/tag`, `docker.io/peer4u/web:1.0`, bajar con un `run` | — |
| 2 | `docker-cleanup` | ✓ | ✓ | `system prune -f`, `--force`, `rm $(docker ps -aq -f status=exited)`, `image rm $(… dangling=true)` | — |
| 2 | Jefe `docker-boss-config` | ✓ | ✓ | `stop` + `rm`, `rm $(…)`, `system prune -f` | — |
| 3 | `docker-dockerfile` | ✎ | ✓ | `docker build -f otro.Dockerfile`, `docker image build`, `docker buildx build --load`, construir desde `~` con la ruta, `COPY ./index.html …/index.html` | ✎ «`COPY ../index.html` da not found» era falso: BuildKit no sale del contexto y `../index.html` copia el `index.html` de dentro. Ahora el error típico es `COPY ../front/index.html` → «"/front/index.html": not found», y el motor resuelve `..` igual |
| 3 | `docker-containerize` | ✓ | ✓ | `CMD node server.js`, `CMD ["npm", "start"]`, `ENTRYPOINT ["node", "server.js"]`, `npm install --omit=dev`, `--production`, ruta absoluta del script | — |
| 3 | `docker-cmd-entrypoint` | ✎ | ✓ | `["ping", "-c3"]`, `/bin/ping`, `pinger:latest` | ✎ El motor pasaba el CMD y los argumentos a un `ENTRYPOINT` en forma shell; ahora, como Docker, `sh -c` los toma por `$0`… y no llegan. El texto lo dice |
| 3 | `docker-arg-env` | ✓ | ✓ | `$NODE_VERSION`, `ENV clave valor`, `LABEL` con comillas, `--build-arg=`, `--build-arg NODE_VERSION` exportada | — |
| 3 | Jefe `docker-boss-dockerize` | ✓ | ✓ | `package.json package-lock.json` por separado, `CMD` en forma shell | — |
| — | Final `docker-final-beginner` | ✓ | ✎ | IP con `range`, `--env-file`, `rm $(…)` | ✎ La solución saca la IP con `range … Networks` |

## Intermedio

| Bloque | Punto | Afirmaciones | Práctica | Alternativas que valen (comprobadas) | Cambios |
| --- | --- | --- | --- | --- | --- |
| 4 | `docker-cache` | ✓ | ✓ | ficheros por nombre, destino `/app/`, `COPY` en forma exec | — |
| 4 | `docker-dockerignore` | ✓ | ✓ | `/node_modules`, `.git/`, `**/*.log`, `logs/`, `.env*`, comentarios, varios `echo >>` | — |
| 4 | `docker-multistage` | ✓ | ✓ | etapa `builder` en alpine, `--from=0`, `dist/` con barra | ✎ Un `--from` que no es etapa ni imagen da el error de BuildKit (`load metadata for docker.io/library/buidl:latest` … `pull access denied`), no un «not found» del contexto |
| 4 | `docker-registry` | ✓ | ✓ `--password-stdin` | `docker image tag/push`, `--password-stdin < ~/.ghcr-token`, `-p $(cat …)`, `push --all-tags` | — |
| 4 | Jefe `docker-boss-build` | ✓ | ✓ | `build` + `tag` + `push`, `buildx build --push`, `build --push` | — |
| 5 | `docker-volumes` | ✓ | ✓ | `--mount type=volume,source=…,target=…`, `src`/`destination`, `--volume=` | — |
| 5 | `docker-bind-mounts` | ✓ | ✓ | `--mount type=bind,…,readonly` (o `ro=true`), `"$(pwd)"`, `./` | ✎ El error de escribir en `:ro` es el de busybox: «sh: can't create …: Read-only file system» |
| 5 | `docker-networks` | ✓ | ✓ | `--network=`, `--net`, `network connect` después, `--driver bridge`, `--env-file` | ✎ Tras `network connect`, el nombre resuelve a la IP de la red creada (172.18…), no a la de `bridge` |
| 5 | `docker-ports` | ✓ | ✓ | `--publish 127.0.0.1:6379:6379`, `--publish=` | ✎ `-p 8080:8080` a un nginx (escucha en el 80) da «curl: (56) Recv failure: Connection reset by peer», y a postgres «(52) Empty reply from server», no «Couldn't connect» |
| 5 | `docker-backup` | ✓ | ✓ | `docker container cp`, destino con nombre, `--mount`, `busybox`, `-v …:ro`, `tar -czf`, `"$PWD"` y `sh -c 'cd /datos && tar …'` | ✎ `cd` dentro del contenedor |
| 5 | Jefe `docker-boss-manual` | ✓ | ✓ | `--mount`, `--network=`, volumen creado por el `run` | — |
| 6 | `docker-compose-first` | ✓ | ✓ sin `version:` | `compose.yml`, `docker-compose.yml`, `-f` desde otra carpeta, `--project-directory`, `--detach`, puertos en forma larga | ✎ `version:` avisa como Compose v2 («the attribute \`version\` is obsolete…»); `--project-directory` ya no se ignoraba en silencio |
| 6 | `docker-compose-multi` | ✓ | ✓ | `environment` en lista, `build.context`, volumen en forma larga, `up -d --build`, `build` + `up` | ✎ Volúmenes y puertos en forma larga (`type`/`source`/`target`, `target`/`published`) se ignoraban |
| 6 | `docker-compose-env` | ✓ | ✓ | `${API_PORT:-3000}`, `${VAR:?…}`, `sed -i` sobre el fichero | ✎ `config` enseña como Compose: rutas absolutas, puertos y volúmenes en forma larga, `depends_on` con `required`, la red `default` |
| 6 | `docker-compose-health` | ✓ | ✓ | `test` como cadena o `["CMD", …]`, `timeout`/`start_period`, `restart: true`, `up -d --wait` | ✎ Las comprobaciones usan `--project-directory`, no el nombre `compose.yaml` |
| 6 | `docker-compose-ops` | ✓ | ✓ | `exec -T`, `docker exec api-db-1`, `--scale` antes y después del `down` | — |
| 6 | Jefe `docker-boss-compose` | ✓ | ✓ | `compose.yml`/`docker-compose.yml`, `env_file`, `depends_on` en lista, `test` como cadena, `redis:7.4-alpine` | ✎ «No queda secreto en el compose» miraba solo `compose.yaml`: con `compose.yml` fallaba; y una versión más fijada de la imagen pedida cuenta como ella |
| — | Final `docker-final-intermediate` | ✓ | ✓ | las de los bloques 4–6 | ✎ Igual que el jefe: cualquier nombre de compose |

## Avanzado

| Bloque | Punto | Afirmaciones | Práctica | Alternativas que valen (comprobadas) | Cambios |
| --- | --- | --- | --- | --- | --- |
| 7 | `docker-small` | ✓ | ✓ | `node:22-slim`, multi-stage a distroless, `node:22.11.0-alpine`, `npm cache clean` | ✎ Etiquetas fijadas del catálogo (`node:22.11.0-alpine`, `nginx:1.27.2-alpine`, `postgres:16.4-alpine`, `redis:7.4-alpine`…) |
| 7 | `docker-nonroot` | ✎ | ✓ | `USER node` con `COPY --chown=node:node`, `USER 1000`, `RUN chown -R app:app /app` + `USER app:app`, `USER` antes de `WORKDIR` | ✎ «`id` → uid=1001(app)» era falso: `adduser -S` en alpine da `uid=100(app) gid=101(app) groups=101(app),101(app)`. El motor modela dueños: `COPY` deja root salvo `--chown`, `WORKDIR` crea la carpeta del `USER` de ese momento, y sin permiso «Permission denied» (`sh`, `touch`, `mkdir`, `rm`, `npm ci` con EACCES). `useradd` no existe en alpine |
| 7 | `docker-healthcheck` | ✓ | ✓ wget | `wget --spider -q`, forma exec, `--retries`, `--health-cmd` al arrancar | ✎ La afirmación «node:22-alpine no tiene curl» era cierta, pero el motor tenía `curl` en todas: ahora alpine trae solo el `wget` de busybox, las `-slim` ninguno, `node:22` los dos y nginx `curl`; lo instalado con `apk add`/`apt-get install` cuenta |
| 7 | `docker-secrets` | ✓ | ✓ | `source=`, `dst=`, `target=/app/.npmrc`, sin `target` (`/run/secrets/npmrc`), `src=$HOME/…` | — |
| 7 | Jefe `docker-boss-prod` | ✓ | ✓ | `USER node`, secreto con otro destino | — |
| 8 | `docker-limits` | ✓ | ✓ | `-m 256m`, `256M`, `--cpus=.5`, `--restart=`, `docker update` sobre el que corre | ✎ `docker update` (reinicio, memoria, CPU) |
| 8 | `docker-debug` | ✓ | ✓ | `inspect` entero, `--env-file`, `--memory 1g`, sin límite al worker | — |
| 8 | `docker-scan` | ✎ | ✓ | `FROM node:22-slim`, reescribir el Dockerfile, opciones en otro orden | ✎ `--only-severity` no filtraba el resumen; ahora filtra recuento, resumen y `--exit-code`, y como `image://` mira el registro si la imagen no está. La salida y el texto dicen «a total of 153 vulnerabilities», como Scout |
| 8 | Jefe `docker-boss-incident` | ✓ | ✓ | `stop` + `rm`, `--restart=`, `-m`, `--env` | — |
| 9 | `docker-ci-tags` | ✓ | ✓ | `--short=7`, `git log -1 --format=%h`, en variable, `push --all-tags` | ✎ El `git` mínimo entiende `--short=N` y `log --format=%h`/`--pretty=…` |
| 9 | `docker-buildx` | ≈ | ✓ | opciones en otro orden, `--platform` repetido, `--output type=registry`, `docker build --platform … --push` | ✎ `--platform` repetido se quedaba con el último y `--output type=registry` no publicaba |
| 9 | `docker-compose-prod` | ✓ | ✓ | `--file`, `--detach`, servicios en otro orden, `COMPOSE_FILE=compose.yaml:compose.prod.yaml` | ✎ `COMPOSE_FILE` y `COMPOSE_PROJECT_NAME` |
| 9 | Jefe `docker-boss-release` | ✓ | ✓ | commit en variable, login con `<`, push por separado | — |
| — | Final `docker-final-advanced` | ✓ | ✓ | `USER node`, `buildx --push` para dos plataformas, `build` + `tag` + `push` | — |

## Otros arreglos del motor

- `docker run` deja lo de descargar la imagen en stderr (stdout es del
  contenedor), como el cliente de verdad.
- Un programa que no existe (`docker run alpine nada`) ya no «arranca y sale
  con 127»: Docker no puede crear la tarea, el contenedor queda **Created** con
  `ExitCode` 127 y el error es «failed to create task for container: … exec:
  "nada": executable file not found in $PATH»; una ruta que no es programa da
  «permission denied» y 126.
- Códigos de salida: `docker run` sin imagen sale con 1 (no 125); un usuario que
  no existe, con 125 (no 126); `--restart` desconocido, con el mensaje del
  daemon.
- `ls -a` dentro enseña `.` y `..`, `ls -A` los ocultos, `ls -l` el dueño y
  `ls -d` la carpeta; `whoami` con un uid sin nombre falla como en busybox.
- `psql` solo existe en las imágenes de postgres (o si se instala el cliente).
- Los textos en bloque del YAML (`|`, `|-`, `|+`, `>`, `>-`, con sangría en
  la cabecera como `|2`) siguen YAML 1.2 (2026-11-09): guardan la sangría
  relativa de cada línea, `>` junta solo las líneas normales, el final se
  recorta o se guarda según `-`/`+`, y dentro del bloque `#` es texto. Antes
  se perdía la sangría (un `sh -c` con un `if` dentro de `command:` llegaba
  aplanado). Comprobado contra el paquete `yaml` (YAML 1.2).
- Compose acepta claves `x-*` en servicios y las válidas que no modela
  (`cap_drop`, `security_opt`, `logging`, `tmpfs`, `extra_hosts`…), en vez de
  rechazarlas como desconocidas.

## Divergencias que se quedan

- **Versión**: el motor imita Engine 27 (la que dice `docker version`). En
  Docker 29, `{{.NetworkSettings.IPAddress}}` ya no existe y los mensajes de la
  CLI cambian de forma («'docker run' requires at least 1 argument»); con el
  almacén de containerd (por defecto en instalaciones nuevas de 29),
  `docker build --platform a,b` sin `--push` sí funciona. El curso enseña lo que
  vale en las tres (la plantilla con `range`, publicar con `--push`).
- **Salud al momento**: no hay `(health: starting)` ni `interval` real; la
  prueba se evalúa al mirar.
- **`docker scout`** no pide iniciar sesión en Docker Hub, que en la vida real
  sí hace falta.
- **Permisos**: lo montado (volúmenes y carpetas del anfitrión) se escribe con
  cualquier usuario; en Docker depende del dueño de la carpeta. `COPY --chown`
  no cambia el dueño de una carpeta de destino que ya existía (se supone, como
  dice la documentación: solo lo nuevo).
- **`curl` en nginx de debian**: se da por instalado (sí lo está en
  `nginx:alpine`).
- **Imágenes de Docker 29 con `docker pull` sin red**: el catálogo es fijo
  (Docker Hub del simulador); otra etiqueta da «manifest unknown».
- **El mensaje de ghcr sin `docker login`** («unauthorized: unauthenticated…»)
  no se ha podido comprobar contra el registro de verdad.
- Las de antes siguen: sin sesión interactiva, `logs -f` y `compose up` sin
  `-d` vuelven, y un `RUN` desconocido pasa sin cambiar nada
  ([curso-docker.md](../curso-docker.md), «Qué modela y qué no»).

## Shell

No hizo falta tocar `packages/shellsim`. La diferencia entre «Connection reset»
y «Couldn't connect» se resuelve con un `curl` propio del motor de Docker (el
punto de extensión deja sustituir órdenes) que delega en el de la shell para lo
demás. Si algún día la shell deja que `http` devuelva un error de conexión
(reset, respuesta vacía), ese `curl` sobra.
