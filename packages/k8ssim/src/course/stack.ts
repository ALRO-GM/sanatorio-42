/**
 * La tienda de Peer4U en Kubernetes, en trozos que las unidades preparan: el
 * namespace, los Secrets (la base de datos y el registro de ghcr.io) y los
 * manifiestos de `db` (Postgres), `api` y `front`, que son las imágenes que
 * publica el examen final del curso de Docker. Están en `~/tienda`, como en
 * el repositorio del equipo.
 */

/** El namespace de la tienda, y `kubectl` apuntando a él. */
export const TIENDA = [
  'kubectl create namespace tienda',
  'kubectl config set-context --current --namespace=tienda',
]

export const DB_URL = 'postgres://postgres:secreto@db:5432/peer4u'

/** La contraseña de Postgres y la URL con la que la API llega a él. */
export const DB_SECRET = `kubectl create secret generic db --from-literal=POSTGRES_PASSWORD=secreto --from-literal=DATABASE_URL=${DB_URL}`

/** El Secret para descargar del registro privado del equipo (el token del curso de Docker). */
export const GHCR_SECRET =
  'kubectl create secret docker-registry ghcr --docker-server=ghcr.io --docker-username=peer --docker-password=$(cat ~/.ghcr-token)'

export const DB_YAML = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: db
  labels: {app: db}
spec:
  replicas: 1
  selector:
    matchLabels: {app: db}
  template:
    metadata:
      labels: {app: db}
    spec:
      containers:
      - name: postgres
        image: postgres:16
        ports: [{containerPort: 5432}]
        envFrom: [{secretRef: {name: db}}]
---
apiVersion: v1
kind: Service
metadata: {name: db}
spec:
  selector: {app: db}
  ports: [{port: 5432}]
`

type AppSpec = {
  name: 'api' | 'front'
  image: string
  replicas: number
  port: number
  /** Líneas de más para el contenedor (sondas, recursos…), con su sangría de 8 espacios. */
  extra?: string
  /** Lo que va en `envFrom` (la API lee el Secret `db`). */
  envFrom?: string
}

function appYaml(spec: AppSpec): string {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${spec.name}
  labels: {app: ${spec.name}}
spec:
  replicas: ${spec.replicas}
  selector:
    matchLabels: {app: ${spec.name}}
  template:
    metadata:
      labels: {app: ${spec.name}}
    spec:
      imagePullSecrets: [{name: ghcr}]
      containers:
      - name: ${spec.name}
        image: ${spec.image}
        ports: [{containerPort: ${spec.port}}]
${spec.envFrom === undefined ? '' : `        envFrom: ${spec.envFrom}\n`}${spec.extra ?? ''}---
apiVersion: v1
kind: Service
metadata: {name: ${spec.name}}
spec:
  selector: {app: ${spec.name}}
  ports: [{port: ${spec.port}}]
`
}

export const API_YAML = (version = '1.0.0', replicas = 3, extra = ''): string =>
  appYaml({
    name: 'api',
    image: `ghcr.io/peer4u/api:${version}`,
    replicas,
    port: 3000,
    envFrom: '[{secretRef: {name: db}}]',
    extra,
  })

export const FRONT_YAML = (image = 'ghcr.io/peer4u/front:1.0.0', replicas = 2): string =>
  appYaml({ name: 'front', image, replicas, port: 80 })

/** La tienda entera levantada en `tienda`: base de datos, API y front. */
const STACK_FILES = {
  '~/tienda/db.yaml': DB_YAML,
  '~/tienda/api.yaml': API_YAML(),
  '~/tienda/front.yaml': FRONT_YAML(),
}

const STACK = [...TIENDA, DB_SECRET, GHCR_SECRET, 'kubectl apply -f ~/tienda/']

/** Una unidad que parte de la tienda levantada, con ficheros cambiados o de más. */
export const stack = (files: Record<string, string> = {}, run: string[] = []) => ({
  files: { ...STACK_FILES, ...files },
  run: [...STACK, ...run],
})
