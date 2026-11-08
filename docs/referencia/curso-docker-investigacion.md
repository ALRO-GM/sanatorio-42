# Curso de Docker: investigación y temario propuesto

Fecha: 2026-11-08. Documento de referencia para diseñar el curso interactivo de Docker de Sanatorio 42, con el mismo formato que los cursos de shell y git: teoría corta, reto en terminal simulada y solución. La API repite los comandos con un simulador y da de 1 a 3 estrellas.

Público: estudiantes de 42, hispanohablantes, que ya saben shell y git. Objetivo: lo que piden las empresas y cómo se usa Docker a diario en el trabajo, no la teoría interna del kernel.

---

## 1. Cursos y temarios de referencia

| Recurso | Qué es | ¿Gratis/abierto? | Licencia | Valoración y uso para nosotros |
|---|---|---|---|---|
| **Docker Docs, «Get started» y Docker Workshop** (docs.docker.com/get-started/workshop) | Taller oficial de unos 45 min: contenerizar una app de tareas, actualizarla, compartirla en Docker Hub, persistir con volúmenes, bind mounts, apps multicontenedor y Compose, buenas prácticas de imagen. | Sí | Docs: **Apache-2.0** (repo `docker/docs`). App de ejemplo `docker/getting-started-todo-app`: Apache-2.0 | La referencia canónica. Su orden (contenerizar → actualizar → compartir → persistir → bind mount → multicontenedor → Compose → buenas prácticas) es el esqueleto natural del curso. Se puede adaptar citando la fuente. |
| **Docker Docs, «Building best practices»** (docs.docker.com/build/building/best-practices/) | Lista oficial de buenas prácticas: multi-stage, imagen base mínima, `.dockerignore`, caché, fijar versiones (incluso por digest), `USER` sin root, `COPY` mejor que `ADD`, CMD en forma exec, compilar y probar en CI. | Sí | Apache-2.0 | Base del nivel de producción. Ojo: no trata `HEALTHCHECK`, que sale de la referencia del Dockerfile y de Compose. |
| **Play with Docker Classroom** (training.play-with-docker.com) y **docker/labs** | Laboratorios gratuitos en el navegador, de principiante a avanzado. | Sí | `docker/labs`: Apache-2.0, **archivado** (el contenido nuevo va a la Classroom) | Buena fuente de ejercicios clásicos (12-factor, redes, seguridad). Parte del material está anticuado (Swarm, `docker-compose` v1). |
| **docker-curriculum.com** (Prakhar Srivastav, repo `prakhar1989/docker-curriculum`) | Tutorial largo de principiante: busybox, webapp estática, Dockerfile, Docker Hub, multicontenedor con Compose, despliegue en la nube. | Sí | **MIT**, ~6,1 k estrellas | Muy citado y valorado como primer contacto. Algunas partes (AWS Beanstalk/ECS) quedan fuera de nuestro alcance. |
| **TechWorld with Nana: «Docker Tutorial for Beginners»** (YouTube, ~3 h) y **freeCodeCamp: «Docker and Kubernetes» (4 h, Nana + Amigoscode)**, **«Docker full course» (7 h)** | Vídeos con el ciclo completo de desarrollo: imágenes, contenedores, Compose, Dockerfile, registros privados, volúmenes. | Gratis (vídeo) | Estándar de YouTube; no se puede reutilizar el contenido | Muy bien valorados (cerca de un millón de visitas en el de Nana). Útiles como orden de temas y para enlazar como «para saber más». |
| **KodeKloud «Docker for the Absolute Beginner»** | Curso con laboratorios en navegador y cuestionarios (run, Dockerfile, Compose, redes, volúmenes, registro). | Versión gratuita en su plataforma (requiere registro); en Coursera es de pago | Propietaria | Sus laboratorios son el modelo más parecido a nuestro formato (terminal + validación). Inspiración de mecánica, no de contenido. |
| **Docker Mastery (Bret Fisher, Udemy)** + repo `BretFisher/udemy-docker-mastery` | Curso de pago muy popular (~4,6/5 con más de 65 000 valoraciones; «Docker Endorsed»). El repo con ejercicios y soluciones es libre. | Curso: de pago. Repo: sí | Repo: **MIT** | Su temario (contenedores, imágenes, redes con DNS, volúmenes, Compose, Swarm/K8s) confirma el orden. Los ejercicios del repo (p. ej. «assignment» de Compose con Drupal/Postgres) son buena inspiración para retos jefe. |
| **roadmap.sh/docker** | Mapa de temas: introducción, prerrequisitos de Linux, qué son los contenedores, tecnologías subyacentes (namespaces, cgroups, union FS), instalación, persistencia (FS efímero, volúmenes, bind mounts), uso de imágenes de terceros, construir imágenes (Dockerfile, caché eficiente, tamaño y seguridad), registros (Docker Hub, GHCR/ECR…, buenas prácticas de etiquetado), ejecutar contenedores (`docker run`, Compose, opciones de ejecución), seguridad (imagen y ejecución), CLI (contenedores, imágenes, volúmenes, redes), experiencia de desarrollo (hot reload, depuradores, tests, CI), despliegue (PaaS, Kubernetes, Swarm, Nomad). | Se puede consultar gratis | **Propietaria**: solo uso personal; prohibido copiar el contenido. Se puede enlazar. | Lo usamos solo como lista de control de cobertura; no copiar texto ni imágenes. |
| **iximiuz Labs, «Docker roadmap»** (labs.iximiuz.com/roadmaps/docker) | 112 retos prácticos en 5 módulos (ejecutar contenedores, construir imágenes, pull/push, redes, almacenamiento) con niveles «Must-have / Deep dive / Full». | Parte gratuita, parte de pago (no queda claro en la página) | Propietaria | Excelente referencia de **diseño de retos** basados en problemas reales (depurar, no solo teclear). |
| **Collabnix Docker Labs** (dockerlabs.collabnix.com) | Cientos de laboratorios comunitarios. | Sí | Apache-2.0 (la web) / MIT (GitHub): contradictorio | Material abundante pero desigual. Consulta puntual. |
| **Linux Foundation / CNCF en edX** (LFS158 «Introduction to Kubernetes», LFS151 «Introduction to Cloud Infrastructure Technologies») | Cursos introductorios gratuitos en modo oyente. | Gratis en modo oyente (no lo he podido verificar en esta búsqueda) | Propietaria | Más útiles para el futuro curso de Kubernetes que para este. |

**Conclusión:** el material abierto y reutilizable con licencia clara es el de Docker Docs (Apache-2.0), docker/labs (Apache-2.0), docker-curriculum (MIT) y los ejercicios de Bret Fisher (MIT). Los demás sirven para validar el temario y enlazar como lectura extra, sin copiar contenido.

---

## 2. Qué piden las empresas

### Señales del mercado
- **Encuesta de Stack Overflow 2025:** Docker lo usa ~71 % de los encuestados (73,8 % de los profesionales), +17 puntos sobre 2024: el mayor salto de toda la categoría de nube e infraestructura. En 2024 ya era la herramienta más usada y deseada. Para un junior, en la práctica, se da por supuesto.
- En las ofertas de backend, full-stack y DevOps junior/mid, Docker aparece casi siempre junto a **Docker Compose, CI/CD (GitHub Actions/GitLab CI), un registro (Docker Hub, GHCR, ECR)** y, como «se valora», **Kubernetes**.

### Lo que preguntan en entrevistas (según las listas de preguntas consultadas)
Las preguntas se repiten entre fuentes (KodeKloud, Simplilearn, Turing, Linux Handbook, PracHub, TechPrep):

1. **Imagen frente a contenedor**, contenedor frente a máquina virtual.
2. **Capas y caché de construcción**: por qué el orden del Dockerfile importa (copiar `package.json` antes que el código).
3. **Multi-stage builds**: sacar las herramientas de compilación de la imagen final para que pese menos y sea más segura.
4. **`COPY` frente a `ADD`**, **`CMD` frente a `ENTRYPOINT`**, forma exec frente a forma shell.
5. **Volúmenes frente a bind mounts frente a tmpfs**: cuándo usar cada uno y cómo no perder los datos de la base de datos.
6. **Redes**: bridge, host, overlay; red por defecto frente a red definida por el usuario (DNS por nombre de servicio); `EXPOSE` frente a `-p`.
7. **Docker Compose**: qué define (servicios, redes, volúmenes), `depends_on` y healthchecks, variables de entorno y `.env`.
8. **Depuración**: contenedor que se cae al arrancar (`docker logs`, `docker inspect`, códigos de salida 137/OOM, 1), entrar con `docker exec`.
9. **Seguridad**: no ejecutar como root, no meter secretos en la imagen, imágenes mínimas, escanear CVE, fijar versiones.
10. **Etiquetado y registros**: por qué no usar `latest` en producción; etiquetar con versión semántica y SHA de git; `push`/`pull` a un registro privado.
11. **Docker en CI**: construir y publicar la imagen en cada push; caché en CI; multiplataforma (`buildx`, amd64/arm64).
12. **Recursos y reinicios**: `--restart`, límites de memoria y CPU.

### Perfil esperado
- **Junior**: ejecutar y depurar contenedores; escribir un Dockerfile correcto para su lenguaje; levantar el entorno local con Compose (app + base de datos + caché); entender puertos, volúmenes y variables de entorno; usar imágenes de Docker Hub con criterio.
- **Mid**: Dockerfile de producción (multi-stage, sin root, pequeño, con caché bien ordenada, `.dockerignore`); healthchecks; etiquetado y publicación desde CI; gestión de secretos; escaneo de vulnerabilidades; depuración de incidencias; base para pasar a Kubernetes.

---

## 3. Temario propuesto (42 unidades, 4 de ellas retos jefe, + 2 exámenes)

Convenciones:
- El slug sigue el estilo de los otros cursos (`docker-…`). Se puede ajustar al prefijo que use la base de datos.
- «Comandos para aprobar» indica la **solución de referencia**. El simulador debería validar **el estado final** (contenedor `web` corriendo con el puerto 8080→80, imagen `app:1.0` con `USER app`, etc.) y no la cadena exacta, igual que en git. Las estrellas pueden premiar el número mínimo de comandos o no usar atajos prohibidos.
- Imágenes del simulador: un catálogo pequeño y fijo (`hello-world`, `alpine:3.20`, `busybox`, `nginx:1.27`/`nginx:1.27-alpine`, `redis:7`, `postgres:16`, `node:22`/`node:22-alpine`, `python:3.12`/`python:3.12-slim`, `gcr.io/distroless/nodejs22`) con tamaños y capas ficticios pero realistas.

### Nivel 0. Contenedores: lo básico (9 unidades)

| # | Slug | Título | Objetivo | Comandos para aprobar |
|---|---|---|---|---|
| 1 | `docker-hola` | Tu primer contenedor | Entender imagen frente a contenedor: `run` descarga la imagen si falta, crea el contenedor, lo ejecuta y termina. | `docker run hello-world` → `docker ps -a` → `docker images` |
| 2 | `docker-interactivo` | Entrar en un contenedor | Ejecutar una shell interactiva y ver que el sistema de archivos es efímero y aislado. | `docker run -it --rm alpine:3.20 sh` → dentro: `cat /etc/os-release`, `touch /tmp/hola`, `exit` → `docker ps -a` (no queda nada por `--rm`) |
| 3 | `docker-segundo-plano` | Servicios en segundo plano y puertos | Arrancar un servidor en segundo plano, ponerle nombre y publicar un puerto. | `docker run -d -p 8080:80 --name web nginx:1.27` → `docker ps` → `curl localhost:8080` |
| 4 | `docker-ciclo-vida` | Parar, arrancar y borrar | Ciclo de vida: created → running → exited → removed; `stop` frente a `kill`; `rm -f`. | `docker stop web` → `docker ps -a` → `docker start web` → `docker restart web` → `docker rm -f web` |
| 5 | `docker-logs` | Leer los logs | Ver la salida estándar del proceso: la forma de depurar número uno. | `docker run -d --name web -p 8080:80 nginx:1.27` → `curl localhost:8080` → `docker logs web` → `docker logs --tail 5 -f web` |
| 6 | `docker-exec` | Ejecutar comandos dentro | Diferencia entre `run` (contenedor nuevo) y `exec` (proceso en uno que ya corre). | `docker exec web ls /usr/share/nginx/html` → `docker exec -it web sh` → `echo hola > /usr/share/nginx/html/index.html` → `exit` → `curl localhost:8080` |
| 7 | `docker-inspect` | Inspeccionar contenedores | Sacar estado, IP, puertos y variables con `inspect` y plantillas Go. | `docker inspect web` → `docker inspect -f '{{.State.Status}}' web` → `docker port web` |
| 8 | `docker-variables` | Configurar con variables de entorno | Las imágenes oficiales se configuran con `-e`; si falta una obligatoria, el contenedor se cae. | `docker run -d --name db postgres:16` → `docker ps -a` (Exited) → `docker logs db` (pide `POSTGRES_PASSWORD`) → `docker rm db` → `docker run -d --name db -e POSTGRES_PASSWORD=secreto postgres:16` |
| 9 | `docker-limpieza` | Limpiar la casa | Ver cuánto ocupa Docker y borrar contenedores, imágenes colgantes y basura. | `docker system df` → `docker container prune -f` → `docker image prune -f` → `docker rmi hello-world` |

**[JEFE] 10 `docker-jefe-guardia`: «Guardia de noche».** Hay tres contenedores (escenario precargado): `cache` (redis) parado, `api` en bucle de reinicios porque le falta `DATABASE_URL`, y `web` con el puerto equivocado. El alumno debe dejar `redis` corriendo, recrear `api` con la variable y publicar `web` en 8080. Se valida el estado final; 3 estrellas si diagnostica con `logs` o `inspect` antes de tocar nada.

### Nivel 1. Imágenes y Dockerfile (9 unidades)

| # | Slug | Título | Objetivo | Comandos para aprobar |
|---|---|---|---|---|
| 11 | `docker-imagenes-tags` | Imágenes, etiquetas y versiones | `repo:tag`, por qué `latest` es una trampa, variantes `-alpine`/`-slim`, digest. | `docker pull nginx:1.27-alpine` → `docker images` → `docker image inspect -f '{{.RepoDigests}}' nginx:1.27-alpine` |
| 12 | `docker-capas` | Capas | Una imagen es una pila de capas de solo lectura; el contenedor añade una capa escribible. | `docker image history nginx:1.27-alpine` → `docker run -d --name w nginx:1.27-alpine` → `docker exec w touch /nuevo` → `docker diff w` |
| 13 | `docker-primer-dockerfile` | Tu primer Dockerfile | `FROM`, `COPY`, `docker build -t`, contexto de construcción. | `cat > index.html <<EOF … EOF` → `cat > Dockerfile <<EOF`<br>`FROM nginx:1.27-alpine`<br>`COPY index.html /usr/share/nginx/html/`<br>`EOF` → `docker build -t miweb:1.0 .` → `docker run -d -p 8080:80 --name miweb miweb:1.0` → `curl localhost:8080` |
| 14 | `docker-dockerfile-app` | Contenerizar una app | `WORKDIR`, `COPY`, `RUN`, `EXPOSE`, `CMD` con una app Node (o Python) de ejemplo ya presente en el directorio. | Dockerfile: `FROM node:22-alpine` / `WORKDIR /app` / `COPY . .` / `RUN npm ci --omit=dev` / `EXPOSE 3000` / `CMD ["node", "server.js"]` → `docker build -t api:1.0 .` → `docker run -d -p 3000:3000 api:1.0` |
| 15 | `docker-cmd-entrypoint` | CMD frente a ENTRYPOINT | Forma exec frente a shell; `ENTRYPOINT` fija el ejecutable, `CMD` da los argumentos por defecto; sobrescribirlos. | Dockerfile con `ENTRYPOINT ["ping"]` y `CMD ["-c","3","localhost"]` → `docker build -t pinger .` → `docker run pinger` → `docker run pinger -c 1 example.com` → `docker run --entrypoint sh -it pinger` |
| 16 | `docker-cache` | Aprovechar la caché | Ordenar instrucciones: primero dependencias y luego código, para que un cambio de código no reinstale todo. | Reescribir el Dockerfile con `COPY package*.json ./` → `RUN npm ci` → `COPY . .` → `docker build -t api:1.1 .` → modificar `server.js` → `docker build -t api:1.2 .` (el simulador muestra `CACHED` en los pasos de dependencias) |
| 17 | `docker-dockerignore` | .dockerignore | Sacar `node_modules`, `.git`, `.env` y logs del contexto: builds más rápidos y sin secretos filtrados. | `cat > .dockerignore <<EOF`<br>`node_modules`<br>`.git`<br>`.env`<br>`*.log`<br>`EOF` → `docker build -t api:1.3 .` (el contexto pasa de MB a KB) |
| 18 | `docker-arg-env-label` | ARG, ENV y LABEL | Diferenciar variables de construcción (`ARG`) y de ejecución (`ENV`); metadatos con `LABEL`. | Dockerfile con `ARG NODE_VERSION=22`, `FROM node:${NODE_VERSION}-alpine`, `ENV NODE_ENV=production`, `LABEL org.opencontainers.image.source=…` → `docker build --build-arg NODE_VERSION=20 -t api:node20 .` → `docker inspect -f '{{.Config.Env}}' api:node20` |
| 19 | `docker-registro` | Etiquetar y publicar en un registro | Nombre completo `registro/usuario/repo:tag`; etiquetas semver + SHA de git; `login`, `push`, `pull`. | `docker tag api:1.3 ghcr.io/sanatorio42/api:1.3.0` → `docker tag api:1.3 ghcr.io/sanatorio42/api:$(git rev-parse --short HEAD)` → `docker login ghcr.io` → `docker push ghcr.io/sanatorio42/api:1.3.0` → `docker rmi …` → `docker pull …` |

**[JEFE] 20 `docker-jefe-dockerizar`: «Dockeriza la API».** Repositorio con una API Python/Flask (`requirements.txt`, `app.py`). Sin plantilla: escribir `.dockerignore` y Dockerfile con la caché bien ordenada, construir `api:1.0.0`, ejecutar con el puerto 5000 publicado, comprobar con `curl` y publicarla en el registro simulado. 3 estrellas si la caché queda bien ordenada y no se copia `.env`.

### Nivel 2. Datos y redes (5 unidades)

| # | Slug | Título | Objetivo | Comandos para aprobar |
|---|---|---|---|---|
| 21 | `docker-volumenes` | Volúmenes con nombre | Los datos del contenedor mueren con él; un volumen sobrevive. Es el caso típico de la base de datos. | `docker volume create pgdata` → `docker run -d --name db -e POSTGRES_PASSWORD=secreto -v pgdata:/var/lib/postgresql/data postgres:16` → `docker exec db psql -U postgres -c 'CREATE TABLE t(x int)'` → `docker rm -f db` → recrear con el mismo volumen → la tabla sigue → `docker volume ls`, `docker volume inspect pgdata` |
| 22 | `docker-bind-mounts` | Bind mounts para desarrollar | Montar una carpeta del anfitrión (hot reload); `:ro`; sintaxis `--mount`; tmpfs en una línea. | `docker run -d -p 8080:80 --name dev -v "$PWD/html":/usr/share/nginx/html:ro nginx:1.27-alpine` → editar `html/index.html` → `curl localhost:8080` cambia sin reconstruir |
| 23 | `docker-redes` | Redes definidas por el usuario | En una red propia los contenedores se encuentran por nombre (DNS); en la red por defecto, no. | `docker network create appnet` → `docker run -d --name db --network appnet -e POSTGRES_PASSWORD=secreto postgres:16` → `docker run -d --name api --network appnet -e DATABASE_URL=postgres://postgres:secreto@db:5432/postgres -p 3000:3000 api:1.3` → `docker exec api ping -c1 db` → `docker network inspect appnet` |
| 24 | `docker-puertos` | Puertos: EXPOSE, -p y seguridad | `EXPOSE` solo documenta; `-p` publica; `127.0.0.1:` para no exponer al mundo; la base de datos no necesita puerto publicado; conflicto de puertos. | `docker run -d -p 127.0.0.1:6379:6379 --name cache redis:7` → `docker port cache` → `docker run -d -p 8080:80 nginx` falla si 8080 está ocupado → resolver con otro puerto |
| 25 | `docker-copia-backup` | Copiar archivos y hacer copias de seguridad | `docker cp`; copia de un volumen con un contenedor auxiliar. | `docker cp web:/etc/nginx/nginx.conf .` → `docker run --rm -v pgdata:/datos -v "$PWD":/backup alpine tar czf /backup/pgdata.tgz -C /datos .` → `ls pgdata.tgz` |

**[JEFE] 26 `docker-jefe-stack-manual`: «Montaje a mano».** Sin Compose: red `tienda`, volumen `tienda-db`, `postgres:16` sin puerto publicado, `api` conectada por nombre de servicio y `nginx` publicado en 8080 como proxy. Al final borrar y recrear `db` y comprobar que los datos siguen. Prepara la motivación de Compose: «esto son 4 comandos larguísimos».

### Nivel 3. Docker Compose (6 unidades)

| # | Slug | Título | Objetivo | Comandos y archivos para aprobar |
|---|---|---|---|---|
| 27 | `docker-compose-primero` | Tu primer compose.yaml | Pasar el `docker run` del nivel 0 a declarativo; `up -d`, `ps`, `logs`, `down`. | `cat > compose.yaml <<EOF`<br>`services:`<br>`  web:`<br>`    image: nginx:1.27-alpine`<br>`    ports: ["8080:80"]`<br>`EOF` → `docker compose up -d` → `docker compose ps` → `docker compose logs web` → `docker compose down` |
| 28 | `docker-compose-multi` | Varios servicios | API + base de datos + volumen; red por defecto del proyecto; `build:` frente a `image:`. | compose con `api` (`build: .`, `ports`, `environment: DATABASE_URL`), `db` (`image: postgres:16`, `volumes: [pgdata:/var/lib/postgresql/data]`) y `volumes: {pgdata: {}}` → `docker compose up -d --build` → `curl localhost:3000/health` |
| 29 | `docker-compose-env` | Variables y .env | Interpolación `${VAR}`, archivo `.env`, `env_file`; ver el resultado con `config`; `.env` fuera de git. | `cat > .env <<EOF`<br>`POSTGRES_PASSWORD=secreto`<br>`API_PORT=3000`<br>`EOF` → usar `${POSTGRES_PASSWORD}` y `"${API_PORT}:3000"` → `docker compose config` → `echo .env >> .gitignore` |
| 30 | `docker-compose-salud` | Healthchecks y orden de arranque | `depends_on` solo ordena; con `condition: service_healthy` espera a que la base de datos esté lista. | En `db`: `healthcheck: {test: ["CMD-SHELL","pg_isready -U postgres"], interval: 5s, retries: 5}`; en `api`: `depends_on: {db: {condition: service_healthy}}` → `docker compose up -d` → `docker compose ps` (muestra `healthy`) |
| 31 | `docker-compose-dev-prod` | Desarrollo frente a producción | `compose.override.yaml` (bind mount y hot reload, o `develop.watch`) frente a un `compose.prod.yaml`; varios `-f`; `restart: unless-stopped`. | Crear `compose.override.yaml` con `volumes: ["./src:/app/src"]` → `docker compose up -d` → `docker compose -f compose.yaml -f compose.prod.yaml config` |
| 32 | `docker-compose-operar` | Operar un stack | Comandos diarios: `exec`, `logs -f`, `restart`, `build`, `pull`, `down -v` (y su peligro), `--scale`. | `docker compose exec db psql -U postgres -c '\dt'` → `docker compose logs -f --tail 20 api` → `docker compose restart api` → `docker compose up -d --scale worker=3` → `docker compose down` (sin `-v`, para conservar los datos) |

**[JEFE] 33 `docker-jefe-compose`: «Del README al compose».** Escenario realista: el README de un proyecto describe 3 servicios (frontend nginx, API, Postgres) más Redis. Escribir `compose.yaml` y `.env` con healthchecks, volumen persistente, base de datos sin puerto publicado y solo el frontend expuesto; levantarlo y verificar. 3 estrellas si `docker compose config` no tiene secretos en claro (usa `.env`) y nada salvo el frontend publica puertos.

### Nivel 4. Producción y buenas prácticas (9 unidades)

| # | Slug | Título | Objetivo | Comandos y archivos para aprobar |
|---|---|---|---|---|
| 34 | `docker-multi-stage` | Multi-stage builds | Compilar en una etapa y copiar solo el resultado a una imagen final mínima. | Dockerfile: `FROM node:22 AS build` / `WORKDIR /app` / `COPY package*.json ./` / `RUN npm ci` / `COPY . .` / `RUN npm run build` / `FROM nginx:1.27-alpine` / `COPY --from=build /app/dist /usr/share/nginx/html` → `docker build -t front:1.0 .` → `docker images front` (de ~1 GB a ~50 MB) |
| 35 | `docker-imagen-pequena` | Imágenes pequeñas | Comparar `node:22`, `-slim`, `-alpine` y distroless; `--omit=dev`; limpiar en la misma capa `RUN`; `--target`. | `docker build -t api:full -f Dockerfile.full .` → `docker build -t api:slim .` → `docker images api` → `docker image history api:slim` (el reto pide bajar de un umbral, p. ej. < 200 MB) |
| 36 | `docker-no-root` | No ejecutar como root | `USER` con UID fijo; permisos con `COPY --chown`; puertos por encima de 1024. | Añadir `RUN addgroup -S app && adduser -S app -G app`, `COPY --chown=app:app . .`, `USER app` → `docker build -t api:2.0 .` → `docker run --rm api:2.0 id` (no muestra `uid=0`) |
| 37 | `docker-healthcheck` | HEALTHCHECK en la imagen | Que Docker (y luego el orquestador) sepa si la app responde, no solo si el proceso vive. | `HEALTHCHECK --interval=10s --timeout=3s CMD wget -qO- http://localhost:3000/health \|\| exit 1` → build → run → `docker ps` (healthy) → `docker inspect -f '{{.State.Health.Status}}' api` |
| 38 | `docker-reinicio-recursos` | Reinicios y límites de recursos | `--restart unless-stopped`, `--memory`, `--cpus`; ver consumo; qué significa el código de salida 137. | `docker run -d --name api --restart unless-stopped --memory 256m --cpus 0.5 api:2.0` → `docker stats --no-stream` → `docker inspect -f '{{.HostConfig.Memory}}' api` |
| 39 | `docker-secretos` | Secretos: lo que nunca va en la imagen | `ENV`/`ARG` con contraseñas se quedan en `docker history`; usar variables en tiempo de ejecución, `secrets:` de Compose o `--secret` de BuildKit. | `docker image history --no-trunc mala:1.0` (aparece el token) → reescribir con `RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci` → `docker build --secret id=npmrc,src=.npmrc -t buena:1.0 .` → `docker image history buena:1.0` limpio |
| 40 | `docker-depurar` | Depurar contenedores que fallan | Método: `ps -a` → código de salida → `logs` → `inspect` → arrancar con `--entrypoint sh` → `events`. | Escenario: `api` en Exited (1) y `worker` en Exited (137). `docker ps -a` → `docker logs api` → `docker inspect -f '{{.State.ExitCode}} {{.State.OOMKilled}}' worker` → `docker run --rm -it --entrypoint sh api:2.0` → arreglar (variable o límite de memoria) |
| 41 | `docker-escaneo` | Escanear vulnerabilidades | Leer un informe de CVE y arreglarlo actualizando la imagen base o fijando versiones; fijar por digest. | `docker scout cves api:2.0` (o `trivy image api:2.0`) → cambiar `FROM node:18` por `FROM node:22-alpine` → rebuild → volver a escanear sin CVE críticas |
| 42 | `docker-ci` | Docker en CI | Construir, etiquetar (semver + SHA) y publicar en cada push; caché de CI; multiplataforma con `buildx`. | `docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/sanatorio42/api:1.0.0 --push .` → escribir `.github/workflows/docker.yml` con `docker/login-action`, `docker/metadata-action` y `docker/build-push-action` (el simulador valida el YAML: disparador, etiquetas, `push: true`) |

Unidades opcionales si hace falta recortar o ampliar: `docker-init` (generar Dockerfile y Compose con `docker init`), `docker-tmpfs-readonly` (`--read-only` + `--tmpfs /tmp`, `--cap-drop ALL`), `docker-contextos` (`docker context` para operar un servidor remoto).

### Exámenes finales

**Examen A, `docker-examen-entrega`: «Primer día en el equipo».**
Se recibe un repositorio con una API Node y un frontend estático, sin nada de Docker. Hay que entregar:
1. `.dockerignore` correcto.
2. Dockerfile multi-stage del frontend (build → nginx) y Dockerfile de la API con caché ordenada, usuario no root y `HEALTHCHECK`.
3. `compose.yaml` + `.env` con Postgres (volumen, healthcheck, sin puerto publicado), la API (`depends_on: service_healthy`) y el frontend en 8080.
4. Imágenes etiquetadas `1.0.0` y con el SHA de git, publicadas en el registro simulado.
5. Verificación con `curl localhost:8080` y `curl localhost:8080/api/health`.

Puntuación: 1 estrella si funciona; 2 si además la imagen de la API pesa menos del umbral y no corre como root; 3 si además no hay secretos en ninguna capa y todo está fijado a versión (sin `latest`).

**Examen B, `docker-examen-incidencia`: «Producción está caída».**
Escenario precargado con fallos encadenados: la API en bucle de reinicios (falta una variable), la base de datos «perdió los datos» al recrearse (no tenía volumen; hay que restaurar un `backup.tgz`), el frontend no conecta con la API (están en redes distintas), la imagen de la API pesa 1,4 GB, corre como root y tiene una CVE crítica. Resolverlo por orden de prioridad (primero servicio, luego datos, luego higiene) y dejar el `compose.yaml` corregido. Se valida el estado final y las estrellas dependen de cuántos problemas de «higiene» se arreglen.

### Qué debe modelar el simulador (resumen para implementarlo)
- **Estado:** imágenes (repo, tags, digest, capas con instrucción y tamaño, Config: User/Env/Cmd/Entrypoint/ExposedPorts/Healthcheck), contenedores (nombre, imagen, estado, código de salida, OOMKilled, puertos, mounts, redes, env, restart policy, límites, salud, logs simulados), volúmenes, redes, registro remoto simulado (tags publicados) y sistema de archivos del directorio de trabajo (Dockerfile, compose.yaml, .env, .dockerignore, código de ejemplo).
- **Parser de Dockerfile** con las instrucciones `FROM [AS]`, `WORKDIR`, `COPY [--from] [--chown]`, `ADD`, `RUN [--mount=type=secret]`, `ENV`, `ARG`, `LABEL`, `EXPOSE`, `USER`, `HEALTHCHECK`, `CMD`, `ENTRYPOINT`, `VOLUME`; caché por capa (hash de instrucción + archivos copiados) para que la unidad 16 muestre `CACHED`.
- **Parser de compose.yaml** con `services` (`image`, `build`, `ports`, `environment`, `env_file`, `volumes`, `networks`, `depends_on` con `condition`, `healthcheck`, `restart`, `secrets`), `volumes`, `networks`, interpolación desde `.env` y combinación de varios `-f`.
- **Comportamiento de las imágenes del catálogo:** `postgres` sale con código 1 si falta `POSTGRES_PASSWORD`; `nginx` sirve lo que hay en `/usr/share/nginx/html`; la app de ejemplo responde en `/health` si tiene `DATABASE_URL` y alcanza `db` por DNS.
- **Salidas «de cartón»** para `stats`, `scout cves`/`trivy`, `buildx` y `login`: deterministas y dependientes del estado (versión de la imagen base, por ejemplo).

---

## 4. Puente con el futuro curso de Kubernetes

Conceptos que el curso de Docker deja preparados y que el de Kubernetes puede enlazar directamente:

| Docker (este curso) | Kubernetes (curso futuro) |
|---|---|
| Imágenes, etiquetas inmutables (semver + SHA), digest, registro privado y `docker login` (unidades 11, 19, 42) | `image:` en el Pod, `imagePullPolicy`, `imagePullSecrets`; por qué `latest` rompe los despliegues. |
| `HEALTHCHECK` y healthchecks de Compose (30, 37) | `livenessProbe`, `readinessProbe`, `startupProbe` (Kubernetes ignora el `HEALTHCHECK` de la imagen: hay que redefinirlo). |
| Compose declarativo: `docker compose up` converge al estado deseado (27–33) | Manifiestos YAML y `kubectl apply`: mismo modelo mental de estado deseado. Mapa directo: servicio de Compose → Deployment + Service. |
| Variables, `.env` y secretos (8, 29, 39) | ConfigMap y Secret; `envFrom`. |
| Volúmenes con nombre (21) | PersistentVolumeClaim; StatefulSet para bases de datos. |
| Redes y DNS por nombre de servicio (23) | Service y DNS del clúster (`db.default.svc.cluster.local`). |
| `--memory`/`--cpus`, código 137 OOM (38, 40) | `resources.requests/limits`, `OOMKilled` en `kubectl describe`. |
| `--restart unless-stopped` (38) | `restartPolicy` y reconciliación del controlador. |
| `USER` no root, `--read-only`, `--cap-drop` (36, opcional) | `securityContext` (`runAsNonRoot`, `readOnlyRootFilesystem`). |
| `--scale` en Compose (32) | `replicas` y HorizontalPodAutoscaler. |
| `logs`, `exec`, `inspect` (5–7) | `kubectl logs`, `kubectl exec`, `kubectl describe`. |

Propuesta práctica: que el examen A del curso de Docker produzca las imágenes `ghcr.io/sanatorio42/api:1.0.0` y `front:1.0.0` que el primer reto de Kubernetes despliega, y que el curso de Kubernetes empiece traduciendo el `compose.yaml` del examen a manifiestos.

---

## 5. Fuentes

Cursos y documentación
- Docker Workshop (oficial): https://docs.docker.com/get-started/workshop/
- Docker «Get started», visión general: https://docs.docker.com/get-started/hands-on-overview/
- Docker, buenas prácticas de construcción: https://docs.docker.com/build/building/best-practices/
- Repositorio de la documentación de Docker (licencia Apache-2.0): https://github.com/docker/docs
- App de ejemplo del taller: https://github.com/docker/getting-started-todo-app
- Play with Docker Classroom: https://training.play-with-docker.com/ ; blog de Docker: https://www.docker.com/blog/best-way-learn-docker-free-play-docker-pwd/
- docker/labs (Apache-2.0, archivado): https://github.com/docker/labs
- docker-curriculum (MIT): https://docker-curriculum.com/ ; https://github.com/prakhar1989/docker-curriculum
- TechWorld with Nana, curso gratuito: https://dev.to/techworld_with_nana/full-docker-course-free-4hl3 ; ficha en Class Central: https://classcentral.com/course/youtube-docker-tutorial-for-beginners-full-course-in-3-hours-108867
- freeCodeCamp, Docker y Kubernetes: https://www.freecodecamp.org/news/course-on-docker-and-kubernetes/ ; curso completo: https://www.freecodecamp.org/news/docker-full-course ; Docker DevOps: https://www.freecodecamp.org/news/docker-devops-course/
- KodeKloud, Docker for the Absolute Beginner: https://kodekloud.com/p/docker-for-the-absolute-beginner-hands-on ; notas: https://notes.kodekloud.com/docs/Docker-Training-Course-for-the-Absolute-Beginner/Introduction/Introduction
- Bret Fisher, Docker Mastery: https://www.udemy.com/course/docker-mastery/ ; repo (MIT): https://github.com/BretFisher/udemy-docker-mastery
- roadmap.sh Docker (licencia propietaria, solo enlazar): https://roadmap.sh/docker ; licencia: https://github.com/nilbuild/developer-roadmap/blob/master/license
- iximiuz Labs, Docker roadmap: https://labs.iximiuz.com/roadmaps/docker
- Collabnix Docker Labs: https://collabnix.readthedocs.io/en/latest/

Mercado y entrevistas
- Stack Overflow Developer Survey 2025 (nota de prensa): https://stackoverflow.co/company/press/archive/stack-overflow-2025-developer-survey/
- Resumen del 71 % de adopción: https://byteiota.com/docker-hits-71-adoption-largest-tech-surge-in-2025-survey/
- Docker sobre la encuesta de 2024: https://www.docker.com/white-papers/2024-stack-overflow-developer-survey/
- KodeKloud, preguntas de entrevista: https://kodekloud.com/blog/docker-interview-questions/
- Simplilearn, 35 preguntas: https://www.simplilearn.com/tutorials/docker-tutorial/docker-interview-questions
- Turing: https://turing.com/interview-questions/docker
- Linux Handbook: https://linuxhandbook.com/docker-interview-questions/
- PracHub (imágenes, redes, volúmenes, depuración): https://prachub.com/resources/docker-interview-questions-for-platform-engineers-images-networking-volumes-and-debugging
- TechPrep, 121 preguntas: https://www.techprep.app/blog/docker-interview-questions

Nota de método: las ofertas de empleo no se han analizado una a una. La sección 2 se apoya en la encuesta de Stack Overflow, en listas de preguntas de entrevista (de calidad desigual y con fechas de 2025–2026) y en la coincidencia de temas entre cursos y roadmaps. Las cifras de visitas y valoraciones son instantáneas que cambian con el tiempo.
