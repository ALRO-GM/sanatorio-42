# Sanatorio 42 en una sola imagen: la API y la web compilada, servidas por el
# mismo proceso de Node. La base (SQLite) vive en el volumen /data.
#
# Se construye desde la raíz del repositorio:
#
#   docker build -f infra/docker/Dockerfile -t sanatorio-42 .
#
# Vale igual para x86 y para ARM (las máquinas Ampere de Oracle): no se compila
# nada nativo, libSQL trae binarios precompilados para las dos.

# --- Compilación -------------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /repo

# Primero solo los manifiestos: mientras no cambien las dependencias, Docker
# reutiliza esta capa y no vuelve a instalar nada.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
COPY packages/gitsim/package.json packages/gitsim/
COPY packages/course/package.json packages/course/
COPY packages/shellsim/package.json packages/shellsim/
COPY packages/clicker/package.json packages/clicker/
COPY packages/startup/package.json packages/startup/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages packages
COPY apps apps
RUN npm run build

# --- Dependencias de ejecución -----------------------------------------------
# Solo las de la API y sin las de desarrollo: ni React, ni Vite, ni TypeScript.
FROM node:22-slim AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
COPY packages/gitsim/package.json packages/gitsim/
COPY packages/course/package.json packages/course/
COPY packages/shellsim/package.json packages/shellsim/
COPY packages/clicker/package.json packages/clicker/
COPY packages/startup/package.json packages/startup/
RUN npm ci --omit=dev --workspace @sanatorio/api

# --- Ejecución ---------------------------------------------------------------
FROM node:22-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    STATIC_DIR=/app/web \
    DATABASE_URL=file:/data/sanatorio.db

WORKDIR /app
COPY --from=deps /repo/node_modules node_modules
COPY --from=build /repo/apps/api/package.json ./
COPY --from=build /repo/apps/api/dist dist
COPY --from=build /repo/apps/web/dist web
# El git simulado del curso de git, compilado: node_modules/@sanatorio/gitsim
# es un enlace a ../../packages/gitsim (el workspace).
COPY --from=build /repo/packages/gitsim/package.json packages/gitsim/
COPY --from=build /repo/packages/gitsim/dist packages/gitsim/dist
# La plantilla de los cursos (estrellas) y la shell simulada del curso de shell.
COPY --from=build /repo/packages/course/package.json packages/course/
COPY --from=build /repo/packages/course/dist packages/course/dist
COPY --from=build /repo/packages/shellsim/package.json packages/shellsim/
COPY --from=build /repo/packages/shellsim/dist packages/shellsim/dist
# Y el motor del Code Clicker, que la API usa para rehacer las cuentas.
COPY --from=build /repo/packages/clicker/package.json packages/clicker/
COPY --from=build /repo/packages/clicker/dist packages/clicker/dist
# Y el de la startup del Pomodoro, que la API usa para hacer cumplir las reglas.
COPY --from=build /repo/packages/startup/package.json packages/startup/
COPY --from=build /repo/packages/startup/dist packages/startup/dist

# El commit que se está construyendo: `GET /health/db` lo devuelve y quien
# despliega comprueba que responde lo que subió. Va en la última etapa y al
# final a propósito: cambia en cada commit y no debe invalidar las capas de
# compilación ni de dependencias.
ARG GIT_SHA=
ENV GIT_SHA=$GIT_SHA

# Sin root: el proceso solo necesita escribir en /data.
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

# Las variables llegan del entorno del contenedor, no de un `.env`.
CMD ["node", "dist/main.js"]
