# Curso de Docker

Un curso para trabajar con Docker como en un equipo de programación:
contenedores, Dockerfiles, Compose y lo que piden producción y CI. Sigue la
[plantilla de cursos](plantilla-cursos.md): cada conocimiento tiene **teoría,
ejemplo y prueba**, cada bloque acaba en un **jefe contrarreloj** y cada nivel
en un **jefe final** que da su certificado (principiante, intermedio,
avanzado). Está en Aprender, pestaña «Curso de Docker» (`#/cursodocker`), junto
a la de shell, y los certificados salen también en el perfil.

La investigación de la que sale (cursos reconocidos, qué piden las empresas,
el temario propuesto y el puente con Kubernetes, con sus fuentes) está en
[referencia/curso-docker-investigacion.md](referencia/curso-docker-investigacion.md).

## De la investigación al curso

- **El orden del taller oficial de Docker** (contenerizar → actualizar →
  compartir → persistir → bind mounts → varios contenedores → Compose → buenas
  prácticas), repartido en los tres niveles de la plantilla en vez de los cinco
  (N0–N4) de la propuesta.
- **Validar por el estado final**, como el curso de shell y los laboratorios de
  KodeKloud: lo que cuenta es cómo quedan contenedores, imágenes, volúmenes y
  registro, y lo que contesta un puerto (`curl localhost:8080`), no las órdenes
  exactas. Lo que no se ve en el estado (que la caché esté bien ordenada, que
  el `.env` no entre en la imagen) se comprueba **por lo que hace**: unas
  sondas que, sobre una copia de tu mundo, cambian el código y reconstruyen, o
  arrancan la imagen y miran dentro.
- **Lo que preguntan en las entrevistas** está repartido en unidades: imagen
  frente a contenedor (1), capas y caché (16 → «Aprovechar la caché»),
  multi-stage, `CMD` frente a `ENTRYPOINT`, volúmenes frente a bind mounts,
  redes con DNS por nombre, `EXPOSE` frente a `-p`, Compose con
  `service_healthy`, depurar con `logs`/`inspect` y el 137, no correr como
  root, secretos fuera de la imagen, etiquetas semver + commit y `buildx`.
- **Jefes como incidencias**, igual que en shell: una historia de trabajo
  («Guardia de noche», «Producción está caída»), unas tareas y un reloj. Los
  dos exámenes de la propuesta son los jefes finales intermedio («Primer día
  en el equipo», el examen A) y avanzado («Entrega para Kubernetes», el examen
  A con lo de producción), y el examen B queda como jefe del bloque 8.
- **Recortes**: de las 42 unidades propuestas quedan 37. `docker-interactivo`
  se junta con `exec` (no hay sesión interactiva: se usa `sh -c`), y se dejan
  para más adelante `docker init`, `--read-only`/`--cap-drop` (opcionales en
  la propuesta) y el fichero de GitHub Actions (el bloque 9 hace lo que haría
  ese fichero: etiquetar, construir para dos plataformas y publicar).

## Los niveles

El mundo es siempre el mismo: `dev1`, la máquina de trabajo del equipo de
Peer4U, con Docker y tres proyectos en la carpeta de `peer`: `~/web` (una web
estática), `~/api` (la API de Node, con su `node_modules` de 180 MB, un `.env`
con secretos y el `.git` con su commit) y `~/front` (el frontend de Vite). El
registro del equipo es `ghcr.io/peer4u`, con el token en `~/.ghcr-token`.
Cada unidad prepara ese mundo a su manera (un contenedor caído, una imagen
que pesa 1 GB, un compose a medias).

### Principiante: contenedores e imágenes

| Bloque | Unidades (qué comprueba su prueba) | Jefe (límite) |
| --- | --- | --- |
| 1. Tus primeros contenedores | `run hello-world` · `-d`, `--name`, `-p` (nginx contesta en el 8080) · `stop`/`start`/`rm -f` · `logs --tail` (la respuesta) · `exec` con `sh -c` (cambiar la portada) | Guardia de noche: caché parada, puerto ocupado y web en el puerto que no toca (4 min) |
| 2. Configurar, inspeccionar y limpiar | `-e` (postgres con contraseña) · `inspect -f` (la IP) · `pull` y `tag` (versión fija) · `prune` y `system df` | La base de datos de pruebas: contraseña, versión fija y limpieza (5 min) |
| 3. Tu primer Dockerfile | `FROM`/`COPY`/`build` (la web) · `WORKDIR`/`RUN`/`EXPOSE`/`CMD` (la API) · `ENTRYPOINT` frente a `CMD` · `ARG`, `ENV` y `LABEL` | Dockeriza la API con la caché bien ordenada (7 min) |
| **Jefe final** | Tu primer encargo: base de datos, web y API con sus imágenes, la API llegando a la base de datos por su IP y nada parado | 10 min |

### Intermedio: datos, redes y Compose

| Bloque | Unidades | Jefe |
| --- | --- | --- |
| 4. Construir mejor | caché de capas · `.dockerignore` · multi-stage (frontend de 1 GB a menos de 60 MB) · `login`, `tag` y `push` al registro | El build de CI tarda 12 minutos (6 min) |
| 5. Datos y redes | volúmenes con nombre (los datos sobreviven) · bind mounts en solo lectura · redes con DNS por nombre · `127.0.0.1:` y puertos ocupados · `docker cp` y copia de un volumen con `tar` | Montaje a mano: red, volumen, base de datos sin puertos, API y front (8 min) |
| 6. Docker Compose | primer `compose.yaml` · varios servicios con `build:` y volumen · `.env` y `config` · healthcheck y `service_healthy` · `exec`, `--scale` y `down` sin `-v` | Del README al compose (10 min) |
| **Jefe final** | Primer día en el equipo: Dockerfiles, compose y `.env`; solo el front publica puerto, sin secretos en el compose | 12 min |

### Avanzado: producción

| Bloque | Unidades | Jefe |
| --- | --- | --- |
| 7. Imágenes de producción | imágenes pequeñas (menos de 300 MB) · sin root (`adduser`, `--chown`, `USER`) · `HEALTHCHECK` · secretos con `RUN --mount=type=secret` | Lista de producción (8 min) |
| 8. Operar y depurar | `--restart`, `--memory`, `--cpus` · depurar un 1 y un 137 (`OOMKilled`) · `docker scout cves` | Producción está caída (8 min) |
| 9. Publicar como en CI | etiquetas semver + `$(git rev-parse --short HEAD)` · `buildx --platform linux/amd64,linux/arm64 --push` · `compose.prod.yaml` con varios `-f` | Día de release (8 min) |
| **Jefe final** | Entrega para Kubernetes: API y frontend 1.0.0 publicados (pequeños, sin root, con healthcheck) y la pila de producción levantada | 15 min |

En total: 37 unidades (13 de principiante, 14 de intermedio y 10 de avanzado), 9 jefes y 3 jefes finales: 49 puntos.

## Estrellas y tiempo

- **Unidades**: por comandos. Cuenta cada orden que sale bien y cambia algo
  (`docker run`, `docker build`, `docker compose up`, escribir un Dockerfile
  con `cat > Dockerfile <<'EOF'`…). Mirar no cuenta (`docker ps`, `logs`,
  `inspect`, `images`, `history`, `system df`, `compose ps/logs/config`, `ls`,
  `cat`). Las formas equivalentes valen igual (`-d` o `--detach`, `--name=web`,
  `docker container run`, `docker.io/library/nginx:1.27`, `system prune` en
  vez de dos `prune`, `--mount` o `-v`, `--env-file` o `-e`, `compose.yml` o
  `compose.yaml`, una versión más fijada de la misma imagen como
  `redis:7.4-alpine` por `redis:7-alpine`); lo comprueba
  `apps/api/tests/unit/dockersim.test.ts`.
- **Jefes**: por tiempo, con el reloj de la API.
- **Qué se comprueba** se ve como una lista que se marca sola: contenedores
  (estado, imagen pedida, puertos y salud), imágenes, datos de `inspect`, lo
  que contesta un puerto, órdenes dentro de un contenedor, volúmenes, redes,
  lo publicado en el registro, ficheros, tamaño de una imagen y sondas con
  nombre («Cambiar el código no reinstala las dependencias»).

## Tiempo estimado

Con el modelo común (`docs/plantilla-cursos.md`), a 2026-11-08:

| Nivel | Bloques | Tiempo |
| --- | --- | --- |
| Principiante | 31 + 27 + 37 min, y el jefe final | ~1 h 50 min |
| Intermedio | 36 + 41 + 48 min, y el jefe final | ~2 h 23 min |
| Avanzado | 38 + 32 + 31 min, y el jefe final | ~2 h 2 min |
| **Todo el curso** | | **~6 h 15 min** |

## Orden entre cursos

El orden sugerido es shell → git → Docker → Kubernetes, pero no se bloquea:
si abres el de Docker sin el nivel principiante de shell, arriba del camino
sale una sugerencia con el enlace (`CourseOrderHint`, regla en la plantilla).
Dentro del curso, el camino se abre de uno en uno.

## Cómo está hecho

- `packages/dockersim`: Docker simulado, en TypeScript puro, encima de
  `@sanatorio/shellsim` (su sistema de ficheros, el parser y el intérprete).
  La shell admite programas de otro motor con un punto de extensión mínimo
  (`extend.ts`: `run(world, entrada, extensión)`, programas que se buscan antes
  que los suyos, cuáles solo miran y quién contesta en un puerto a `curl`), y
  guarda el estado de Docker en `world.ext.docker`.
  - `catalog.ts`: el Docker Hub del simulador (hello-world, alpine, busybox,
    nginx, redis, postgres, node 18/20/22 con sus variantes, python y
    distroless), con capas, tamaños, configuración y vulnerabilidades.
  - `dockerfile.ts` y `build.ts`: el Dockerfile (continuaciones, opciones,
    forma exec y shell, variables) y la construcción: contexto con
    `.dockerignore`, etapas y `COPY --from`, caché por paso (`CACHED`), `ARG`
    que se ve en `history`, `RUN --mount=type=secret`. Los `RUN` no se
    ejecutan: se reconoce lo que hacen `npm ci`/`npm run build`/`npm prune`,
    `apk add`, `apt-get`, `adduser`, `rm -rf`…, con su efecto en ficheros y
    tamaño.
  - `runtime.ts` y `shell.ts`: qué hace el proceso de cada imagen (nginx
    sirve ficheros y hace de proxy, postgres pide contraseña y guarda tablas,
    la API de Node lee su `server.js` y su `DATABASE_URL`), el DNS de las
    redes, el healthcheck y una `sh` mínima para `exec` (`ls`, `cat`, `env`,
    `id`, `ping`, `wget`, `curl`, `psql`, `redis-cli`, `tar`…).
  - `docker.ts` y `compose.ts`: la CLI (contenedores, imágenes, volúmenes,
    redes, registro con `login`/`push`/`pull`, `build`/`buildx`, `prune`,
    `system df`, `scout cves`) y Compose (varios `-f`, override, `.env` e
    interpolación, `depends_on` con condiciones, recrear solo lo cambiado,
    `--scale`, `down -v`, `config`).
  - `users.ts`: las cuentas de cada imagen (los uid y gid que dan `adduser` y
    `addgroup`), de quién es cada ruta y quién puede escribir dónde.
  - `yaml.ts`: el YAML de un compose (bloques, listas y mapas en línea,
    comillas, textos en bloque `|` y `>` como YAML 1.2), con topes. Lo usa
    también `packages/k8ssim` para los manifiestos.
  - `course/`: los bloques, las unidades (castellano e inglés) y la corrección
    (`checkAttempt`, `goalOf`, `starGoals`, `timeGoalsOf`).
- `apps/api/src/modules/dockercourse`: el mismo servicio que el de shell
  (`createShellCourseService` con el motor de Docker), con `docker_progress` y
  `docker_runs` (migración 87). Ver `docs/api.md`.
- `apps/web/src/features/dockercourse`: el camino como `tree`, la unidad
  (teoría, ejemplo y prueba), los jefes y la demostración; usa la terminal,
  las estrellas, los capítulos y `CourseOrderHint` de `shared/course`.

## Qué modela y qué no

- **Sí**: imágenes con capas, etiquetas, digest y tamaño; build con caché,
  multi-stage, `.dockerignore`, `ARG`/`ENV`/`LABEL`/`USER`/`HEALTHCHECK`;
  contenedores con `-d`, `-p` (también `127.0.0.1:`), `--name`, `-e`,
  `--env-file`, `--rm`, `--restart`, `--memory`, `--cpus`, `--entrypoint`,
  `--user`, `--read-only`, volúmenes, bind mounts (con `-v` se crea la carpeta
  que falta; con `--mount`, falla) y tmpfs; códigos de salida
  (1, 125, 126, 127, 137 con `OOMKilled`, 143); puertos ocupados; redes de
  usuario con DNS por nombre (la `bridge` de siempre, solo por IP); registro
  con login, push, pull y varias plataformas; Compose; `prune` y `system df`.
- **Como Docker 27/28** (revisión del 2026-11-09, punto por punto en
  [revision-cursos/docker.md](revision-cursos/docker.md)): dueños y permisos
  dentro de la imagen (`COPY` deja root salvo `--chown`, `WORKDIR` crea la
  carpeta del `USER` de ese momento, «Permission denied» y EACCES en `npm ci`;
  `adduser -S` da `uid=100`); `ENTRYPOINT` en forma shell no recibe ni el
  `CMD` ni los argumentos; `COPY ../x` no sale del contexto; un `--from` que no
  es etapa se busca como imagen; qué imágenes traen `curl` o `wget`; un
  programa que no existe deja el contenedor Created con 127; un puerto
  publicado donde dentro no escucha nadie da «Connection reset by peer»;
  `docker update`; `scout --only-severity` filtra todo y mira el registro;
  Compose con forma larga de puertos y volúmenes, `config` como el de verdad,
  aviso de `version:`, `--project-directory` y `COMPOSE_FILE`.
- **No**: sesiones interactivas (`-it` avisa y sale; se usa `sh -c`), logs
  que siguen corriendo (`-f` enseña lo que hay), `docker events`, Swarm,
  contextos remotos, `docker init`, capacidades de Linux y la ejecución real
  de lo que pone un `RUN` desconocido (pasa sin cambiar nada). El tiempo es un
  contador (cada orden, unos segundos) y la salud se calcula al momento (no
  hay `starting`).

## Protección

- **No ejecuta nada de verdad**: todo es JSON en el mundo de la shell; el
  paquete solo importa de sí mismo, de `@sanatorio/shellsim` y de
  `@sanatorio/course` (lo comprueba un test).
- **Topes**: los de la shell (orden de 2000 caracteres, 300 órdenes por
  intento, trabajo por orden, 600 kB de mundo) y los de Docker (`LIMITS` en
  `packages/dockersim/src/limits.ts`): 40 imágenes, 80 etiquetas, 40
  contenedores, 30 volúmenes, 20 redes, 60 publicadas, 120 instrucciones y 6
  etapas por Dockerfile, 300 ficheros por copia, 12 servicios y 6 réplicas,
  200 líneas de registro por contenedor, 12 000 caracteres de YAML. Si algo
  se pasa, la orden falla y el mundo queda como estaba.
- **API**: como en shell: intentos validados con zod, 30 por persona cada
  diez minutos, 20 salidas de contrarreloj; estrellas y tiempo los pone la API.

## Enlace con Kubernetes

El curso de Kubernetes ([curso-kubernetes.md](curso-kubernetes.md)) parte de
donde acaba este: el jefe final avanzado deja publicadas en el registro
simulado las imágenes que despliegan su bloque 2 y sus exámenes.

- **Imágenes**: `ghcr.io/peer4u/api:1.0.0` (y la misma con el commit corto,
  `ghcr.io/peer4u/api:4f2a9c1`) y `ghcr.io/peer4u/front:1.0.0`. La API sale
  pequeña (menos de 300 MB), sin root, con `HEALTHCHECK` y sin `.env` dentro.
  `registryImages(world)` de `@sanatorio/dockersim` da lo publicado (referencia,
  digest, tamaño, usuario, puertos, entorno, healthcheck y orden), para que
  otro paquete empiece desde ese estado sin repetir el curso.
- **Healthchecks → probes**: el `HEALTHCHECK` de la imagen y el de Compose
  (bloques 6 y 7) pasan a `livenessProbe` y `readinessProbe`; Kubernetes ignora
  el de la imagen, así que hay que escribirlo otra vez.
- **Compose → manifiestos**: el `compose.yaml` + `compose.prod.yaml` del jefe
  final se traduce a Deployment + Service por servicio; `.env` a ConfigMap y
  Secret; el volumen de postgres a PersistentVolumeClaim; `--scale` a
  `replicas`; `--memory`/`--cpus` y el 137 a `resources.limits` y `OOMKilled`;
  `USER` no root a `securityContext.runAsNonRoot`; etiquetas inmutables (semver
  y commit) a `image:` y `imagePullPolicy`.

## Límites conocidos

- El contenido de las unidades está en castellano e inglés; en catalán y
  euskera se ve en castellano y en francés, en inglés (la interfaz sí está en
  los cinco idiomas).
- Las estimaciones de los jefes son de partida: el tiempo activo real
  (`course_times`, curso `docker`) servirá para ajustarlas.
- `docker compose up` sin `-d` no se queda enganchado: enseña los registros y
  vuelve (lo avisa).
