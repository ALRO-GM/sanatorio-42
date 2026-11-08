/**
 * Nivel avanzado, «Como en el trabajo»: bloques 7 a 9 y su jefe final.
 * Datos y tareas (PVC, StatefulSet, Job, CronJob, init), tráfico, escala y
 * aislamiento (Ingress y Gateway API, HPA, NetworkPolicy) y empaquetar como
 * un equipo (Kustomize, Helm, seguridad del Pod; GitOps se explica). El
 * examen entrega la tienda en el clúster de producción.
 */

import { API_YAML, DB_SECRET, DB_YAML, FRONT_YAML, GHCR_SECRET, stack, TIENDA } from './stack.js'
import type { Unit } from './types.js'

const write = (path: string, text: string): string => `cat > ${path} <<'EOF'\n${text}EOF`
const applyIt = (text: string): string => `cat <<'EOF' | kubectl apply -f -\n${text}EOF`

const PVC = `apiVersion: v1
kind: PersistentVolumeClaim
metadata: {name: pgdata}
spec:
  accessModes: [ReadWriteOnce]
  resources: {requests: {storage: 1Gi}}
`

const MOUNT_PATCH =
  'kubectl patch deployment db -p \'{"spec":{"template":{"spec":{"volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"pgdata"}}],"containers":[{"name":"postgres","volumeMounts":[{"name":"data","mountPath":"/var/lib/postgresql/data"}]}]}}}}\''

const STATEFUL_DB = `apiVersion: v1
kind: Service
metadata: {name: db}
spec:
  clusterIP: None
  selector: {app: db}
  ports: [{port: 5432}]
---
apiVersion: apps/v1
kind: StatefulSet
metadata: {name: db}
spec:
  serviceName: db
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
        envFrom: [{secretRef: {name: db}}]
        volumeMounts: [{name: data, mountPath: /var/lib/postgresql/data}]
  volumeClaimTemplates:
  - metadata: {name: data}
    spec:
      accessModes: [ReadWriteOnce]
      resources: {requests: {storage: 1Gi}}
`

/** Solo el StatefulSet (cuando el Service db ya existe). */
const STATEFUL_ONLY = STATEFUL_DB.slice(STATEFUL_DB.indexOf('apiVersion: apps/v1'))

const MIGRA = `apiVersion: batch/v1
kind: Job
metadata: {name: migra}
spec:
  backoffLimit: 6
  template:
    spec:
      restartPolicy: Never
      imagePullSecrets: [{name: ghcr}]
      containers:
      - name: migra
        image: ghcr.io/peer4u/api:1.0.0
        command: [npm, run, migrate]
        envFrom: [{secretRef: {name: db}}]
`

const COPIA =
  'kubectl create cronjob copia --image=postgres:16 --schedule="0 3 * * *" -- pg_dump -h db -U postgres peer4u'

const INIT = `      initContainers:
      - name: espera-db
        image: busybox:1.36
        command: ["sh", "-c", "until nc -z db 5432; do sleep 2; done"]
`

const withInit = (yaml: string): string =>
  yaml.replace('      containers:\n', `${INIT}      containers:\n`)

const RESOURCES = `        resources:
          requests: {cpu: 100m, memory: 128Mi}
          limits: {memory: 256Mi}
`

const PROBES = `        readinessProbe:
          httpGet: {path: /health, port: 3000}
          periodSeconds: 5
        livenessProbe:
          httpGet: {path: /health, port: 3000}
          periodSeconds: 10
        startupProbe:
          httpGet: {path: /health, port: 3000}
          periodSeconds: 2
          failureThreshold: 30
`

const SECURE = `        securityContext:
          runAsNonRoot: true
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
`

const POLICIES = `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: default-deny}
spec:
  podSelector: {}
  policyTypes: [Ingress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: front-abierto}
spec:
  podSelector: {matchLabels: {app: front}}
  ingress: [{}]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: api-desde-front}
spec:
  podSelector: {matchLabels: {app: api}}
  ingress:
  - from: [{podSelector: {matchLabels: {app: front}}}]
    ports: [{port: 3000}]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: db-desde-api}
spec:
  podSelector: {matchLabels: {app: db}}
  ingress:
  - from: [{podSelector: {matchLabels: {app: api}}}]
    ports: [{port: 5432}]
`

const DB_ONLY_API = POLICIES.slice(
  POLICIES.indexOf(
    'apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: {name: db-desde-api}',
  ),
)

const BASE_KUSTOMIZATION = 'resources:\n- api.yaml\n- front.yaml\n'

const overlay = (ns: string, replicas: number, tag: string): string => `resources:
- ../../base
namespace: ${ns}
replicas:
- name: api
  count: ${replicas}
images:
- name: ghcr.io/peer4u/api
  newTag: ${tag}
`

const CERT =
  '-----BEGIN CERTIFICATE-----\nMIIBszCCAVmgAwIBAgIUTiendaLocalDePruebas0123456789wCgYIKoZIzj0EAwIw\n-----END CERTIFICATE-----\n'
const KEY =
  '-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgTiendaLocalClave\n-----END PRIVATE KEY-----\n'

/** Una tienda con su base de datos en un namespace (para los entornos y Kustomize). */
const shopIn = (ns: string): string[] => [
  `kubectl create namespace ${ns}`,
  `${DB_SECRET} -n ${ns}`,
  `${GHCR_SECRET} -n ${ns}`,
  `kubectl apply -f ~/tienda/db.yaml -n ${ns}`,
]

export const ADVANCED: Unit[] = [
  /* ---------- Bloque 7: datos y tareas ---------- */
  {
    id: 'k8s-pvc',
    block: 7,
    tier: 'advanced',
    kind: 'unit',
    setup: stack(),
    es: {
      title: 'Volúmenes persistentes',
      goal: 'Monta en db un PVC pgdata (ReadWriteOnce, 1Gi) en /var/lib/postgresql/data, crea la tabla pedidos y comprueba que sobrevive a borrar el Pod.',
      theory: {
        what: 'Lo que un contenedor escribe en su disco se pierde cuando se recrea el Pod. Un PersistentVolumeClaim pide almacenamiento que vive aparte (el StorageClass lo aprovisiona: en k3s, local-path) y se monta en el Pod. Es el volumen con nombre del curso de Docker.',
        how: [
          'kubectl get storageclass                 # local-path (default)',
          'kubectl apply -f pvc.yaml                # accessModes y resources.requests.storage',
          '# en el Pod: volumes (persistentVolumeClaim) + volumeMounts en el contenedor',
          'kubectl get pv,pvc                       # Bound cuando un Pod lo usa',
        ],
        when: 'Para cualquier dato que tenga que sobrevivir: bases de datos, ficheros subidos, colas.',
        problems:
          'ReadWriteOnce se monta en un nodo a la vez: en una base de datos usa la estrategia Recreate o, mejor, un StatefulSet (siguiente unidad).',
      },
      example:
        'Creas una tabla en la base de datos sin volumen, borras el Pod y ves que ya no está.',
      objectives: {
        'exec:tienda deploy/db psql -U postgres -c \\dt': 'La tabla pedidos sigue ahí',
        'get:tienda pvc/pgdata {.status.phase}': 'pgdata enlazado (Bound)',
      },
    },
    en: {
      title: 'Persistent volumes',
      goal: 'Mount a PVC pgdata (ReadWriteOnce, 1Gi) on /var/lib/postgresql/data in db, create the table pedidos and check it survives deleting the Pod.',
      theory: {
        what: 'Whatever a container writes to its disk is lost when the Pod is recreated. A PersistentVolumeClaim asks for storage that lives apart (the StorageClass provisions it: local-path on k3s) and is mounted into the Pod. It is the named volume from the Docker course.',
        how: [
          'kubectl get storageclass                 # local-path (default)',
          'kubectl apply -f pvc.yaml                # accessModes and resources.requests.storage',
          '# in the Pod: volumes (persistentVolumeClaim) + volumeMounts in the container',
          'kubectl get pv,pvc                       # Bound once a Pod uses it',
        ],
        when: 'For any data that must survive: databases, uploaded files, queues.',
        problems:
          'ReadWriteOnce mounts on one node at a time: for a database use the Recreate strategy or, better, a StatefulSet (next unit).',
      },
      example:
        'You create a table in the database without a volume, delete the Pod and see it is gone.',
      objectives: {
        'exec:tienda deploy/db psql -U postgres -c \\dt': 'Table pedidos is still there',
        'get:tienda pvc/pgdata {.status.phase}': 'pgdata bound',
      },
    },
    example: [
      "kubectl exec deploy/db -- psql -U postgres -c 'CREATE TABLE prueba(id int)'",
      'kubectl delete pod -l app=db',
      "kubectl exec deploy/db -- psql -U postgres -c '\\dt'",
      'kubectl get storageclass',
    ],
    solution: [
      applyIt(PVC),
      MOUNT_PATCH,
      'kubectl rollout status deployment/db',
      "kubectl exec deploy/db -- psql -U postgres -c 'CREATE TABLE pedidos(id int)'",
      'kubectl delete pod -l app=db',
    ],
    check: {
      exec: ['tienda deploy/db psql -U postgres -c \\dt'],
      get: ['tienda pvc/pgdata {.status.phase}'],
    },
  },
  {
    id: 'k8s-statefulset',
    block: 7,
    tier: 'advanced',
    kind: 'unit',
    setup: { run: [...TIENDA, DB_SECRET] },
    es: {
      title: 'StatefulSet para la base de datos',
      goal: 'Levanta Postgres como StatefulSet db (1 réplica, con un Service headless db y un volumeClaimTemplate data de 1Gi).',
      theory: {
        what: 'Un StatefulSet es como un Deployment para lo que tiene estado: cada Pod tiene nombre fijo (db-0, db-1…), arranca en orden y su propio PVC (de volumeClaimTemplates), que vuelve a ser suyo si se recrea. Con un Service headless (clusterIP: None), cada uno tiene DNS propio: db-0.db.',
        how: [
          'kubectl apply -f db-statefulset.yaml     # serviceName: db y volumeClaimTemplates',
          'kubectl get sts,pods,pvc                 # db-0 y data-db-0',
          'kubectl delete pod db-0                  # vuelve db-0 con el mismo PVC',
        ],
        when: 'Bases de datos, colas y todo lo que necesita identidad y disco propios.',
        whenNot:
          'En producción, la base de datos casi siempre es un servicio gestionado (RDS, Cloud SQL): operar Postgres en Kubernetes es un trabajo en sí.',
      },
      example: 'Miras qué StorageClass hay y cómo se ve un StatefulSet.',
      objectives: {
        'ready:tienda sts/db': 'db-0 en marcha',
        'get:tienda pvc/data-db-0 {.status.phase}': 'data-db-0 enlazado',
        'get:tienda svc/db {.spec.clusterIP}': 'Service db headless',
      },
    },
    en: {
      title: 'A StatefulSet for the database',
      goal: 'Run Postgres as StatefulSet db (1 replica, with a headless Service db and a 1Gi volumeClaimTemplate called data).',
      theory: {
        what: 'A StatefulSet is like a Deployment for stateful things: each Pod has a fixed name (db-0, db-1…), starts in order and gets its own PVC (from volumeClaimTemplates), which is its again if recreated. With a headless Service (clusterIP: None) each gets its own DNS name: db-0.db.',
        how: [
          'kubectl apply -f db-statefulset.yaml     # serviceName: db and volumeClaimTemplates',
          'kubectl get sts,pods,pvc                 # db-0 and data-db-0',
          'kubectl delete pod db-0                  # db-0 comes back with the same PVC',
        ],
        when: 'Databases, queues and anything that needs its own identity and disk.',
        whenNot:
          'In production the database is nearly always a managed service (RDS, Cloud SQL): running Postgres on Kubernetes is a job in itself.',
      },
      example: 'You check which StorageClass exists and what a StatefulSet looks like.',
      objectives: {
        'ready:tienda sts/db': 'db-0 running',
        'get:tienda pvc/data-db-0 {.status.phase}': 'data-db-0 bound',
        'get:tienda svc/db {.spec.clusterIP}': 'Service db is headless',
      },
    },
    example: ['kubectl get storageclass', 'kubectl explain deployment.spec'],
    solution: [applyIt(STATEFUL_DB)],
    check: {
      ready: ['tienda sts/db'],
      get: ['tienda pvc/data-db-0 {.status.phase}', 'tienda svc/db {.spec.clusterIP}'],
    },
  },
  {
    id: 'k8s-jobs',
    block: 7,
    tier: 'advanced',
    kind: 'unit',
    setup: stack(),
    es: {
      title: 'Jobs y CronJobs',
      goal: 'Lanza las migraciones como el Job migra (la API con npm run migrate y el Secret db) hasta que acabe, y deja un CronJob copia que haga pg_dump a las 03:00.',
      theory: {
        what: 'Un Job ejecuta Pods hasta que acaban bien (con reintentos: backoffLimit); un CronJob crea Jobs según un horario cron. Las migraciones van en un Job antes de desplegar; las copias, en un CronJob.',
        how: [
          'kubectl apply -f migra.yaml                         # restartPolicy: Never',
          'kubectl wait --for=condition=complete job/migra',
          'kubectl logs job/migra',
          'kubectl create cronjob copia --image=postgres:16 --schedule="0 3 * * *" -- pg_dump …',
          'kubectl create job copia-ya --from=cronjob/copia    # probarlo sin esperar',
        ],
        when: 'Para tareas que acaban: migraciones, informes, copias, limpiezas.',
        problems:
          'Un Job no se vuelve a ejecutar si lo aplicas igual: para repetirlo, bórralo y créalo, o usa otro nombre.',
      },
      example: 'Lanzas un Job sencillo, esperas a que acabe y lees sus registros.',
      objectives: {
        'ready:tienda job/migra': 'migra terminado',
        'get:tienda cj/copia {.spec.schedule}': 'copia a las 03:00',
      },
    },
    en: {
      title: 'Jobs and CronJobs',
      goal: 'Run the migrations as Job migra (the API with npm run migrate and Secret db) until it completes, and leave a CronJob copia that runs pg_dump at 03:00.',
      theory: {
        what: 'A Job runs Pods until they finish successfully (with retries: backoffLimit); a CronJob creates Jobs on a cron schedule. Migrations go in a Job before releasing; backups, in a CronJob.',
        how: [
          'kubectl apply -f migra.yaml                         # restartPolicy: Never',
          'kubectl wait --for=condition=complete job/migra',
          'kubectl logs job/migra',
          'kubectl create cronjob copia --image=postgres:16 --schedule="0 3 * * *" -- pg_dump …',
          'kubectl create job copia-ya --from=cronjob/copia    # try it without waiting',
        ],
        when: 'For tasks that finish: migrations, reports, backups, clean-ups.',
        problems:
          'A Job does not run again if you apply it unchanged: to repeat it, delete and recreate it, or use another name.',
      },
      example: 'You run a simple Job, wait for it and read its logs.',
      objectives: {
        'ready:tienda job/migra': 'migra finished',
        'get:tienda cj/copia {.spec.schedule}': 'copia at 03:00',
      },
    },
    example: [
      'kubectl create job hola --image=busybox:1.36 -- echo hola desde un Job',
      'kubectl wait --for=condition=complete job/hola',
      'kubectl logs job/hola',
      'kubectl get jobs',
    ],
    solution: [
      applyIt(MIGRA),
      'kubectl wait --for=condition=complete job/migra --timeout=60s',
      COPIA,
    ],
    check: { ready: ['tienda job/migra'], get: ['tienda cj/copia {.spec.schedule}'] },
  },
  {
    id: 'k8s-init-sidecar',
    block: 7,
    tier: 'advanced',
    kind: 'unit',
    setup: stack(),
    es: {
      title: 'Contenedores init y sidecar',
      goal: 'Añade a la API (en ~/tienda/api.yaml) un contenedor init espera-db (busybox:1.36) que espere a que db:5432 conteste, y aplícalo.',
      theory: {
        what: 'Los initContainers se ejecutan en orden antes que los de la app y tienen que acabar bien: esperar a otro servicio, migrar, preparar ficheros. Un sidecar es un contenedor más que acompaña a la app todo el rato (leer sus registros, un proxy).',
        how: [
          'initContainers:',
          '- name: espera-db',
          '  image: busybox:1.36',
          '  command: ["sh", "-c", "until nc -z db 5432; do sleep 2; done"]',
          'kubectl get pods                  # Init:0/1 y luego Running',
          'kubectl logs <api-…> -c espera-db',
        ],
        when: 'Cuando la app falla si arranca antes que lo que necesita, o para preparar algo antes.',
        problems:
          'Un init que no acaba deja el Pod en Init:0/1 para siempre: mira sus registros con -c.',
      },
      example: 'Paras la base de datos y ves qué hace la API mientras tanto.',
      objectives: {
        'get:tienda deploy/api {.spec.template.spec.initContainers[0].name} {.spec.template.spec.initContainers[0].image}':
          'espera-db con busybox:1.36',
        'ready:tienda deploy/api': 'La API en marcha',
      },
    },
    en: {
      title: 'Init and sidecar containers',
      goal: 'Add to the API (in ~/tienda/api.yaml) an init container espera-db (busybox:1.36) that waits until db:5432 answers, and apply it.',
      theory: {
        what: 'initContainers run in order before the app ones and must finish successfully: wait for another service, migrate, prepare files. A sidecar is one more container that runs alongside the app all the time (reading its logs, a proxy).',
        how: [
          'initContainers:',
          '- name: espera-db',
          '  image: busybox:1.36',
          '  command: ["sh", "-c", "until nc -z db 5432; do sleep 2; done"]',
          'kubectl get pods                  # Init:0/1 and then Running',
          'kubectl logs <api-…> -c espera-db',
        ],
        when: 'When the app fails if it starts before what it needs, or to prepare something beforehand.',
        problems:
          'An init that never finishes leaves the Pod at Init:0/1 forever: read its logs with -c.',
      },
      example: 'You stop the database and see what the API does meanwhile.',
      objectives: {
        'get:tienda deploy/api {.spec.template.spec.initContainers[0].name} {.spec.template.spec.initContainers[0].image}':
          'espera-db with busybox:1.36',
        'ready:tienda deploy/api': 'The API running',
      },
    },
    example: [
      'kubectl scale deployment db --replicas=0',
      'kubectl rollout restart deployment/api',
      'kubectl get pods',
      'kubectl scale deployment db --replicas=1',
    ],
    solution: [
      write('~/tienda/api.yaml', withInit(API_YAML())),
      'kubectl apply -f ~/tienda/api.yaml',
    ],
    check: {
      get: [
        'tienda deploy/api {.spec.template.spec.initContainers[0].name} {.spec.template.spec.initContainers[0].image}',
      ],
      ready: ['tienda deploy/api'],
    },
  },
  {
    id: 'k8s-jefe-datos',
    block: 7,
    tier: 'advanced',
    kind: 'boss',
    limit: 420,
    setup: stack({
      '~/backup.sql':
        'CREATE TABLE pedidos (id integer);\nINSERT INTO pedidos VALUES (1), (2), (3), (4), (5);\n',
    }),
    es: {
      title: 'Se perdieron los pedidos',
      goal: 'Postgres en un StatefulSet con disco, los pedidos restaurados, la migración hecha y una copia diaria.',
      story:
        'Se reinició el nodo y la base de datos (un Deployment sin volumen) volvió vacía. Por suerte hay ~/backup.sql de anoche. Que no vuelva a pasar.',
      tasks: [
        'Cambia el Deployment db por un StatefulSet db con un volumeClaimTemplate data de 1Gi (el Service db se queda).',
        'Restaura ~/backup.sql en db-0 (kubectl cp y psql -f).',
        'Lanza el Job migra (ghcr.io/peer4u/api:1.0.0, npm run migrate, Secret db) hasta que acabe.',
        'Deja un CronJob copia (postgres:16) que haga pg_dump a las 03:00.',
      ],
      objectives: {
        "exec:tienda sts/db psql -U postgres -c 'SELECT count(*) FROM pedidos'":
          'Los 5 pedidos restaurados',
        'gone:tienda deploy/db': 'Sin el Deployment db',
        'get:tienda cj/copia {.spec.schedule}': 'copia a las 03:00',
      },
    },
    en: {
      title: 'The orders are gone',
      goal: 'Postgres in a StatefulSet with a disk, orders restored, migration done and a daily backup.',
      story:
        "The node restarted and the database (a Deployment without a volume) came back empty. Luckily there is last night's ~/backup.sql. It must not happen again.",
      tasks: [
        'Replace Deployment db with a StatefulSet db with a 1Gi volumeClaimTemplate called data (Service db stays).',
        'Restore ~/backup.sql into db-0 (kubectl cp and psql -f).',
        'Run Job migra (ghcr.io/peer4u/api:1.0.0, npm run migrate, Secret db) until it completes.',
        'Leave a CronJob copia (postgres:16) running pg_dump at 03:00.',
      ],
      objectives: {
        "exec:tienda sts/db psql -U postgres -c 'SELECT count(*) FROM pedidos'":
          'The 5 orders restored',
        'gone:tienda deploy/db': 'No Deployment db',
        'get:tienda cj/copia {.spec.schedule}': 'copia at 03:00',
      },
    },
    solution: [
      'kubectl delete deployment db',
      applyIt(STATEFUL_ONLY),
      'kubectl wait --for=condition=ready pod/db-0 --timeout=60s',
      'kubectl cp ~/backup.sql tienda/db-0:/tmp/backup.sql',
      'kubectl exec db-0 -- psql -U postgres -f /tmp/backup.sql',
      applyIt(MIGRA),
      COPIA,
    ],
    check: {
      exec: ["tienda sts/db psql -U postgres -c 'SELECT count(*) FROM pedidos'"],
      gone: ['tienda deploy/db'],
      ready: ['tienda job/migra'],
      get: ['tienda cj/copia {.spec.schedule}'],
    },
  },

  /* ---------- Bloque 8: tráfico, escala y aislamiento ---------- */
  {
    id: 'k8s-ingress',
    block: 8,
    tier: 'advanced',
    kind: 'unit',
    setup: stack(),
    es: {
      title: 'Ingress (y Gateway API)',
      goal: 'Publica la tienda en tienda.local con un Ingress tienda (clase traefik): / al front y /api a la API.',
      theory: {
        what: 'Un Ingress es la puerta HTTP del clúster: según el host y la ruta manda cada petición a un Service. Lo atiende un controlador (en k3s, Traefik). Ingress NGINX está retirado desde marzo de 2026 y lo nuevo es Gateway API (Gateway + HTTPRoute), pero Ingress sigue siendo lo que hay en casi todos los clústeres.',
        how: [
          'kubectl create ingress tienda --class=traefik \\',
          '  --rule="tienda.local/*=front:80" --rule="tienda.local/api*=api:3000"',
          'kubectl get ingress                     # ADDRESS: las IP de los nodos',
          'curl -H "Host: tienda.local" http://10.0.0.11/api/health',
          '# Gateway API: kind: HTTPRoute, parentRefs: [{name: web}],',
          '#   rules: [{matches: [{path: {value: /api}}], backendRefs: [{name: api, port: 3000}]}]',
        ],
        when: 'Para exponer varias apps web por un solo punto de entrada, con nombres y TLS.',
        problems:
          'pathType Prefix casa por trozos de ruta (/api casa /api/health, no /apiv2); Exact solo la ruta exacta. Sin ingressClassName, lo coge la clase por defecto (si la hay).',
      },
      example: 'Miras la clase de Ingress del clúster y pruebas un host que aún no existe.',
      objectives: {
        'http:tienda.local/': 'tienda.local enseña el front',
        'http:tienda.local/api/health': 'tienda.local/api llega a la API',
      },
    },
    en: {
      title: 'Ingress (and Gateway API)',
      goal: 'Publish the shop on tienda.local with an Ingress called tienda (class traefik): / to the front and /api to the API.',
      theory: {
        what: 'An Ingress is the HTTP door of the cluster: by host and path it sends each request to a Service. A controller serves it (Traefik on k3s). Ingress NGINX has been retired since March 2026 and the new thing is Gateway API (Gateway + HTTPRoute), but Ingress is still what nearly every cluster runs.',
        how: [
          'kubectl create ingress tienda --class=traefik \\',
          '  --rule="tienda.local/*=front:80" --rule="tienda.local/api*=api:3000"',
          'kubectl get ingress                     # ADDRESS: the node IPs',
          'curl -H "Host: tienda.local" http://10.0.0.11/api/health',
          '# Gateway API: kind: HTTPRoute, parentRefs: [{name: web}],',
          '#   rules: [{matches: [{path: {value: /api}}], backendRefs: [{name: api, port: 3000}]}]',
        ],
        when: 'To expose several web apps through a single entry point, with names and TLS.',
        problems:
          'pathType Prefix matches by path segments (/api matches /api/health, not /apiv2); Exact only the exact path. Without ingressClassName the default class (if any) takes it.',
      },
      example: 'You look at the cluster Ingress class and try a host that does not exist yet.',
      objectives: {
        'http:tienda.local/': 'tienda.local shows the front',
        'http:tienda.local/api/health': 'tienda.local/api reaches the API',
      },
    },
    example: ['kubectl get ingressclass', 'curl -s -H "Host: tienda.local" http://10.0.0.11/'],
    solution: [
      'kubectl create ingress tienda --class=traefik --rule="tienda.local/*=front:80" --rule="tienda.local/api*=api:3000"',
    ],
    check: { http: ['tienda.local/', 'tienda.local/api/health'] },
  },
  {
    id: 'k8s-hpa',
    block: 8,
    tier: 'advanced',
    kind: 'unit',
    setup: stack({ '~/tienda/api.yaml': API_YAML('1.0.0', 2, RESOURCES) }),
    es: {
      title: 'Escalado automático',
      goal: 'Crea un HPA para la API (CPU al 70 %, de 2 a 6 réplicas), comprueba con un Pod carga que sube y, al acabar, quita la carga.',
      theory: {
        what: 'Un HorizontalPodAutoscaler cambia las réplicas de un Deployment según una métrica (la más común, el uso de CPU respecto a lo pedido en requests). Sube rápido y baja con calma (espera unos 5 minutos sin carga).',
        how: [
          'kubectl autoscale deployment api --cpu-percent=70 --min=2 --max=6',
          "kubectl run carga --image=busybox:1.36 -- sh -c 'while true; do wget -qO- api:3000; done'",
          'kubectl get hpa                 # TARGETS cpu: 250%/70%, REPLICAS sube',
          'kubectl delete pod carga',
        ],
        when: 'Para apps con tráfico que sube y baja (horas punta, campañas).',
        problems:
          'Sin requests de CPU el HPA no puede calcular nada (<unknown>/70%). Y si el YAML del repositorio fija replicas, cada apply pelea con el HPA: quítalas del YAML.',
      },
      example: 'Miras el uso de los Pods con top.',
      objectives: {
        'get:tienda hpa/api {.spec.minReplicas} {.spec.maxReplicas} {.spec.metrics[0].resource.target.averageUtilization}':
          'HPA de 2 a 6 réplicas al 70 %',
        'gone:tienda pod/carga': 'Sin el Pod carga',
      },
    },
    en: {
      title: 'Autoscaling',
      goal: 'Create an HPA for the API (CPU at 70 %, 2 to 6 replicas), check with a Pod called carga that it scales up and, when done, remove the load.',
      theory: {
        what: 'A HorizontalPodAutoscaler changes a Deployment replica count from a metric (most often CPU usage relative to the requests). It goes up fast and down calmly (it waits about 5 minutes without load).',
        how: [
          'kubectl autoscale deployment api --cpu-percent=70 --min=2 --max=6',
          "kubectl run carga --image=busybox:1.36 -- sh -c 'while true; do wget -qO- api:3000; done'",
          'kubectl get hpa                 # TARGETS cpu: 250%/70%, REPLICAS goes up',
          'kubectl delete pod carga',
        ],
        when: 'For apps whose traffic goes up and down (rush hours, campaigns).',
        problems:
          'Without CPU requests the HPA cannot compute anything (<unknown>/70%). And if the repository YAML pins replicas, every apply fights the HPA: drop them from the YAML.',
      },
      example: 'You look at the Pods usage with top.',
      objectives: {
        'get:tienda hpa/api {.spec.minReplicas} {.spec.maxReplicas} {.spec.metrics[0].resource.target.averageUtilization}':
          'HPA from 2 to 6 replicas at 70 %',
        'gone:tienda pod/carga': 'No carga Pod',
      },
    },
    example: ['kubectl top pods', 'kubectl top nodes'],
    solution: [
      'kubectl autoscale deployment api --cpu-percent=70 --min=2 --max=6',
      "kubectl run carga --image=busybox:1.36 -- sh -c 'while true; do wget -qO- api:3000; done'",
      'kubectl get hpa',
      'kubectl delete pod carga',
    ],
    check: {
      get: [
        'tienda hpa/api {.spec.minReplicas} {.spec.maxReplicas} {.spec.metrics[0].resource.target.averageUtilization}',
      ],
      gone: ['tienda pod/carga'],
    },
    requires: [['run']],
  },
  {
    id: 'k8s-networkpolicy',
    block: 8,
    tier: 'advanced',
    kind: 'unit',
    setup: stack({}, ['kubectl port-forward svc/front 8080:80']),
    es: {
      title: 'NetworkPolicies',
      goal: 'En tienda, deniega todo el tráfico de entrada y permite solo lo necesario: al front, cualquiera; a la API, el front (3000); a la base de datos, la API (5432).',
      theory: {
        what: 'Por defecto todos los Pods hablan con todos. Una NetworkPolicy elige unos Pods (podSelector) y dice de quién aceptan tráfico (ingress) o a quién pueden hablar (egress). En cuanto una política elige un Pod, a ese Pod solo le llega lo permitido.',
        how: [
          'podSelector: {}               # todos los Pods del namespace',
          'policyTypes: [Ingress]        # sin reglas: no entra nada',
          'ingress:',
          '- from: [{podSelector: {matchLabels: {app: api}}}]',
          '  ports: [{port: 5432}]',
        ],
        when: 'Para que, si alguien entra en un Pod, no pueda llegar a todo (la base de datos solo para la API).',
        problems:
          'Hace falta un plugin de red que las aplique (en k3s viene). Si niegas todo y te olvidas de algo, la web deja de ir: prueba cada paso.',
      },
      example: 'Compruebas que hoy el front llega a la base de datos (y no debería).',
      objectives: {
        'http:localhost:8080/api/health': 'La tienda sigue funcionando',
        'exec:tienda deploy/front nc -z -w 2 db 5432': 'El front ya no llega a la base de datos',
        'exec:tienda deploy/api nc -z -w 2 db 5432': 'La API sí llega a la base de datos',
      },
    },
    en: {
      title: 'NetworkPolicies',
      goal: 'In tienda, deny all incoming traffic and allow only what is needed: anyone to the front; the front to the API (3000); the API to the database (5432).',
      theory: {
        what: 'By default every Pod talks to every Pod. A NetworkPolicy picks some Pods (podSelector) and says who they accept traffic from (ingress) or who they can talk to (egress). As soon as a policy selects a Pod, that Pod only gets what is allowed.',
        how: [
          'podSelector: {}               # every Pod in the namespace',
          'policyTypes: [Ingress]        # no rules: nothing comes in',
          'ingress:',
          '- from: [{podSelector: {matchLabels: {app: api}}}]',
          '  ports: [{port: 5432}]',
        ],
        when: 'So that if someone gets into a Pod they cannot reach everything (the database only for the API).',
        problems:
          'You need a network plugin that enforces them (k3s ships one). If you deny everything and forget something, the site stops working: test each step.',
      },
      example: 'You check that today the front reaches the database (and it should not).',
      objectives: {
        'http:localhost:8080/api/health': 'The shop still works',
        'exec:tienda deploy/front nc -z -w 2 db 5432': 'The front no longer reaches the database',
        'exec:tienda deploy/api nc -z -w 2 db 5432': 'The API does reach the database',
      },
    },
    example: ['kubectl exec deploy/front -- nc -z -w 2 db 5432', 'kubectl get networkpolicies'],
    solution: [applyIt(POLICIES)],
    check: {
      http: ['localhost:8080/api/health'],
      exec: ['tienda deploy/front nc -z -w 2 db 5432', 'tienda deploy/api nc -z -w 2 db 5432'],
    },
  },
  {
    id: 'k8s-jefe-lanzamiento',
    block: 8,
    tier: 'advanced',
    kind: 'boss',
    limit: 420,
    setup: stack(
      {
        '~/tienda/api.yaml': API_YAML('1.0.0', 2, RESOURCES),
        '~/tls/tienda.crt': CERT,
        '~/tls/tienda.key': KEY,
      },
      ['kubectl create secret tls tienda-tls --cert=tls/tienda.crt --key=tls/tienda.key'],
    ),
    es: {
      title: 'Sale en la tele mañana',
      goal: 'tienda.local con Ingress y TLS, la API autoescalada y la base de datos solo para la API.',
      story:
        'Mañana sale Peer4U en la tele y marketing espera un pico de visitas. La tienda tiene que estar en tienda.local, con HTTPS, aguantar el tráfico y no dejar la base de datos abierta a cualquiera.',
      tasks: [
        'Ingress tienda (traefik) en tienda.local: / al front y /api a la API, con TLS del Secret tienda-tls.',
        'HPA para la API de 2 a 8 réplicas al 70 % de CPU.',
        'NetworkPolicy: a la base de datos solo le llega la API (5432).',
      ],
      objectives: {
        'http:tienda.local/api/health': 'tienda.local/api contesta',
        'get:tienda ing/tienda {.spec.tls[0].secretName}': 'Ingress con TLS de tienda-tls',
        'get:tienda hpa/api {.spec.minReplicas} {.spec.maxReplicas}': 'HPA de 2 a 8',
        'exec:tienda deploy/front nc -z -w 2 db 5432': 'El front no llega a la base de datos',
        'exec:tienda deploy/api nc -z -w 2 db 5432': 'La API sí',
      },
    },
    en: {
      title: 'On TV tomorrow',
      goal: 'tienda.local with Ingress and TLS, the API autoscaled and the database only for the API.',
      story:
        'Peer4U is on TV tomorrow and marketing expects a spike. The shop has to be on tienda.local, with HTTPS, cope with the traffic and not leave the database open to anyone.',
      tasks: [
        'Ingress tienda (traefik) on tienda.local: / to the front and /api to the API, with TLS from Secret tienda-tls.',
        'HPA for the API from 2 to 8 replicas at 70 % CPU.',
        'NetworkPolicy: only the API reaches the database (5432).',
      ],
      objectives: {
        'http:tienda.local/api/health': 'tienda.local/api answers',
        'get:tienda ing/tienda {.spec.tls[0].secretName}': 'Ingress with TLS from tienda-tls',
        'get:tienda hpa/api {.spec.minReplicas} {.spec.maxReplicas}': 'HPA from 2 to 8',
        'exec:tienda deploy/front nc -z -w 2 db 5432': 'The front does not reach the database',
        'exec:tienda deploy/api nc -z -w 2 db 5432': 'The API does',
      },
    },
    solution: [
      'kubectl create ingress tienda --class=traefik --rule="tienda.local/*=front:80,tls=tienda-tls" --rule="tienda.local/api*=api:3000"',
      'kubectl autoscale deployment api --cpu-percent=70 --min=2 --max=8',
      applyIt(DB_ONLY_API),
    ],
    check: {
      http: ['tienda.local/api/health'],
      get: [
        'tienda ing/tienda {.spec.tls[0].secretName}',
        'tienda hpa/api {.spec.minReplicas} {.spec.maxReplicas}',
      ],
      exec: ['tienda deploy/front nc -z -w 2 db 5432', 'tienda deploy/api nc -z -w 2 db 5432'],
    },
  },

  /* ---------- Bloque 9: empaquetar y desplegar como un equipo ---------- */
  {
    id: 'k8s-kustomize',
    block: 9,
    tier: 'advanced',
    kind: 'unit',
    setup: {
      files: {
        '~/tienda/db.yaml': DB_YAML,
        '~/tienda/base/api.yaml': API_YAML('1.0.0', 2),
        '~/tienda/base/front.yaml': FRONT_YAML(),
        '~/tienda/base/kustomization.yaml': BASE_KUSTOMIZATION,
      },
      run: shopIn('produccion'),
    },
    es: {
      title: 'Kustomize: un repo, varios entornos',
      goal: 'Crea ~/tienda/overlays/produccion encima de base/: namespace produccion, 4 réplicas de la API y la imagen 1.2.0. Aplícalo con kubectl apply -k.',
      theory: {
        what: 'Kustomize junta manifiestos y los ajusta por entorno sin plantillas: una base común y un overlay por entorno que cambia namespace, réplicas, etiquetas de imagen o lo que haga falta (patches). Viene dentro de kubectl (-k).',
        how: [
          'base/kustomization.yaml:            resources: [api.yaml, front.yaml]',
          'overlays/produccion/kustomization.yaml: resources: [../../base], namespace,',
          '  replicas: [{name: api, count: 4}], images: [{name: ghcr.io/peer4u/api, newTag: 1.2.0}]',
          'kustomize edit set image ghcr.io/peer4u/api:1.2.0   # lo que hace la CI',
          'kubectl kustomize overlays/produccion   # ver lo que sale',
          'kubectl apply -k overlays/produccion',
        ],
        when: 'Cuando el mismo despliegue va a varios entornos (staging, producción) con pocas diferencias.',
        problems:
          'GitOps: en muchos equipos nadie hace apply a mano. La CI construye la imagen, cambia la etiqueta en el overlay y hace commit; Argo CD o Flux ven el repositorio y aplican solos. Es lo que pide la parte 3 de Inception-of-Things.',
      },
      example: 'Ves lo que sale de la base con kubectl kustomize.',
      objectives: {
        'ready:produccion deploy/api': 'La API en produccion: 4 réplicas de la 1.2.0',
        'probe:diff': 'El overlay coincide con el clúster (diff vacío)',
      },
    },
    en: {
      title: 'Kustomize: one repo, several environments',
      goal: 'Create ~/tienda/overlays/produccion on top of base/: namespace produccion, 4 API replicas and image 1.2.0. Apply it with kubectl apply -k.',
      theory: {
        what: 'Kustomize gathers manifests and adjusts them per environment without templates: a shared base and an overlay per environment that changes namespace, replicas, image tags or whatever is needed (patches). It ships inside kubectl (-k).',
        how: [
          'base/kustomization.yaml:            resources: [api.yaml, front.yaml]',
          'overlays/produccion/kustomization.yaml: resources: [../../base], namespace,',
          '  replicas: [{name: api, count: 4}], images: [{name: ghcr.io/peer4u/api, newTag: 1.2.0}]',
          'kustomize edit set image ghcr.io/peer4u/api:1.2.0   # what CI does',
          'kubectl kustomize overlays/produccion   # see the output',
          'kubectl apply -k overlays/produccion',
        ],
        when: 'When the same deployment goes to several environments (staging, production) with small differences.',
        problems:
          'GitOps: in many teams nobody applies by hand. CI builds the image, changes the tag in the overlay and commits; Argo CD or Flux watch the repository and apply on their own. It is what part 3 of Inception-of-Things asks for.',
      },
      example: 'You see what comes out of the base with kubectl kustomize.',
      objectives: {
        'ready:produccion deploy/api': 'The API in produccion: 4 replicas of 1.2.0',
        'probe:diff': 'The overlay matches the cluster (empty diff)',
      },
    },
    example: [
      'cat ~/tienda/base/kustomization.yaml',
      'kubectl kustomize ~/tienda/base | head -n 12',
    ],
    solution: [
      'mkdir -p ~/tienda/overlays/produccion',
      write('~/tienda/overlays/produccion/kustomization.yaml', overlay('produccion', 4, '1.2.0')),
      'kubectl apply -k ~/tienda/overlays/produccion',
    ],
    check: {
      ready: ['produccion deploy/api', 'produccion deploy/front'],
      probes: { diff: ['kubectl diff -k ~/tienda/overlays/produccion > /dev/null'] },
    },
  },
  {
    id: 'k8s-helm',
    block: 9,
    tier: 'advanced',
    kind: 'unit',
    setup: {
      files: { '~/valores.yaml': 'architecture: standalone\nauth:\n  password: s3creto\n' },
      run: TIENDA,
    },
    es: {
      title: 'Helm: usar charts',
      goal: 'Instala Redis como la release cache (bitnami/redis, architecture=standalone), súbela con ~/valores.yaml y vuelve después a la revisión 1.',
      theory: {
        what: 'Helm instala paquetes (charts) de otros: plantillas con valores por defecto que cambias con --set o con un fichero de values. Cada instalación es una release con revisiones que se pueden ver y deshacer.',
        how: [
          'helm repo add bitnami https://charts.bitnami.com/bitnami',
          'helm install cache bitnami/redis --set architecture=standalone',
          'helm list ; helm get values cache',
          'helm upgrade cache bitnami/redis -f valores.yaml',
          'helm history cache ; helm rollback cache 1',
        ],
        when: 'Para lo de otros (Redis, Postgres, un Ingress, monitorización): el chart ya sabe cómo montarlo. Para lo tuyo, Kustomize o un chart propio.',
        problems:
          'upgrade sin --reuse-values vuelve a los valores por defecto en lo que no digas: pasa siempre tu fichero de values.',
      },
      example: 'Buscas el chart de Redis y miras sus valores por defecto.',
      objectives: {
        'probe:release': 'cache en la revisión 3, con los valores de la 1',
        'ready:tienda sts/cache-redis-master': 'Redis en marcha',
      },
    },
    en: {
      title: 'Helm: using charts',
      goal: 'Install Redis as release cache (bitnami/redis, architecture=standalone), upgrade it with ~/valores.yaml and then roll back to revision 1.',
      theory: {
        what: "Helm installs other people's packages (charts): templates with default values you change with --set or a values file. Each install is a release with revisions you can list and undo.",
        how: [
          'helm repo add bitnami https://charts.bitnami.com/bitnami',
          'helm install cache bitnami/redis --set architecture=standalone',
          'helm list ; helm get values cache',
          'helm upgrade cache bitnami/redis -f valores.yaml',
          'helm history cache ; helm rollback cache 1',
        ],
        when: "For other people's software (Redis, Postgres, an Ingress, monitoring): the chart already knows how to set it up. For your own, Kustomize or your own chart.",
        problems:
          'upgrade without --reuse-values goes back to the defaults for whatever you do not say: always pass your values file.',
      },
      example: 'You search for the Redis chart and look at its default values.',
      objectives: {
        'probe:release': 'cache on revision 3, with revision 1 values',
        'ready:tienda sts/cache-redis-master': 'Redis running',
      },
    },
    example: [
      'helm repo add bitnami https://charts.bitnami.com/bitnami',
      'helm search repo redis',
      'helm show values bitnami/redis',
    ],
    solution: [
      'helm repo add bitnami https://charts.bitnami.com/bitnami',
      'helm install cache bitnami/redis --set architecture=standalone',
      'helm upgrade cache bitnami/redis -f ~/valores.yaml',
      'helm rollback cache 1',
    ],
    check: {
      ready: ['tienda sts/cache-redis-master'],
      probes: {
        release: ["helm history cache | tail -n 1 | awk '{print $1, $3}'", 'helm get values cache'],
      },
    },
    requires: [['upgrade'], ['rollback']],
  },
  {
    id: 'k8s-seguridad',
    block: 9,
    tier: 'advanced',
    kind: 'unit',
    setup: stack(),
    es: {
      title: 'Seguridad básica del Pod',
      goal: 'Que la API corra con su propia ServiceAccount api (sin token montado) y con securityContext: runAsNonRoot, sin escalar privilegios y con el disco de solo lectura.',
      theory: {
        what: 'securityContext dice cómo corre el contenedor: no como root (runAsNonRoot, como el USER del curso de Docker), sin poder ganar privilegios y con el sistema de ficheros de solo lectura. Una ServiceAccount propia, sin token si la app no habla con la API de Kubernetes, limita lo que puede hacer quien entre en el Pod.',
        how: [
          'securityContext: {runAsNonRoot: true, allowPrivilegeEscalation: false, readOnlyRootFilesystem: true}',
          'kubectl create serviceaccount api',
          'kubectl patch serviceaccount api -p \'{"automountServiceAccountToken":false}\'',
          'kubectl exec deploy/api -- id                # uid=1000, no 0',
          'kubectl auth can-i list secrets --as=system:serviceaccount:tienda:api   # no',
        ],
        when: 'En todo lo que va a producción: es lo primero que mira una auditoría de seguridad.',
        problems:
          'runAsNonRoot con una imagen que corre como root no arranca (CreateContainerConfigError): hace falta USER en el Dockerfile o runAsUser.',
      },
      example: 'Miras con qué usuario corre la API y qué puede hacer su ServiceAccount.',
      objectives: {
        'exec:tienda deploy/api id': 'La API no corre como root',
        'get:tienda deploy/api {.spec.template.spec.serviceAccountName} {.spec.template.spec.containers[0].securityContext.runAsNonRoot} {.spec.template.spec.containers[0].securityContext.allowPrivilegeEscalation} {.spec.template.spec.containers[0].securityContext.readOnlyRootFilesystem}':
          'ServiceAccount api y securityContext',
        'get:tienda sa/api {.automountServiceAccountToken}': 'Sin token montado',
      },
    },
    en: {
      title: 'Basic Pod security',
      goal: 'Make the API run with its own ServiceAccount api (no token mounted) and with a securityContext: runAsNonRoot, no privilege escalation and a read-only filesystem.',
      theory: {
        what: 'securityContext says how the container runs: not as root (runAsNonRoot, like USER in the Docker course), unable to gain privileges and with a read-only filesystem. Its own ServiceAccount, with no token if the app does not talk to the Kubernetes API, limits what someone who gets into the Pod can do.',
        how: [
          'securityContext: {runAsNonRoot: true, allowPrivilegeEscalation: false, readOnlyRootFilesystem: true}',
          'kubectl create serviceaccount api',
          'kubectl patch serviceaccount api -p \'{"automountServiceAccountToken":false}\'',
          'kubectl exec deploy/api -- id                # uid=1000, not 0',
          'kubectl auth can-i list secrets --as=system:serviceaccount:tienda:api   # no',
        ],
        when: 'In everything that goes to production: it is the first thing a security audit looks at.',
        problems:
          'runAsNonRoot with an image that runs as root does not start (CreateContainerConfigError): it needs USER in the Dockerfile or runAsUser.',
      },
      example: 'You check which user the API runs as and what its ServiceAccount can do.',
      objectives: {
        'exec:tienda deploy/api id': 'The API does not run as root',
        'get:tienda deploy/api {.spec.template.spec.serviceAccountName} {.spec.template.spec.containers[0].securityContext.runAsNonRoot} {.spec.template.spec.containers[0].securityContext.allowPrivilegeEscalation} {.spec.template.spec.containers[0].securityContext.readOnlyRootFilesystem}':
          'ServiceAccount api and securityContext',
        'get:tienda sa/api {.automountServiceAccountToken}': 'No token mounted',
      },
    },
    example: [
      'kubectl exec deploy/api -- id',
      'kubectl exec deploy/front -- id',
      'kubectl auth can-i list secrets --as=system:serviceaccount:tienda:default',
    ],
    solution: [
      'kubectl create serviceaccount api',
      'kubectl patch serviceaccount api -p \'{"automountServiceAccountToken":false}\'',
      'kubectl patch deployment api -p \'{"spec":{"template":{"spec":{"serviceAccountName":"api","containers":[{"name":"api","securityContext":{"runAsNonRoot":true,"allowPrivilegeEscalation":false,"readOnlyRootFilesystem":true}}]}}}}\'',
    ],
    check: {
      exec: ['tienda deploy/api id'],
      get: [
        'tienda deploy/api {.spec.template.spec.serviceAccountName} {.spec.template.spec.containers[0].securityContext.runAsNonRoot} {.spec.template.spec.containers[0].securityContext.allowPrivilegeEscalation} {.spec.template.spec.containers[0].securityContext.readOnlyRootFilesystem}',
        'tienda sa/api {.automountServiceAccountToken}',
      ],
      ready: ['tienda deploy/api'],
    },
  },
  {
    id: 'k8s-jefe-entornos',
    block: 9,
    tier: 'advanced',
    kind: 'boss',
    limit: 360,
    setup: {
      files: {
        '~/tienda/db.yaml': DB_YAML,
        '~/tienda/api.yaml': API_YAML('1.0.0', 2),
        '~/tienda/front.yaml': FRONT_YAML(),
      },
      run: [...shopIn('staging'), ...shopIn('produccion')],
    },
    es: {
      title: 'Staging y producción',
      goal: 'Pasa los YAML sueltos a base/ y dos overlays, despliega los dos entornos y un Redis con Helm solo en staging.',
      story:
        'El equipo despliega ya en dos namespaces, staging y produccion, copiando YAML a mano. Esta semana toca ordenarlo antes de que alguien suba a producción lo de staging.',
      tasks: [
        'Mueve ~/tienda/api.yaml y ~/tienda/front.yaml a ~/tienda/base, con su kustomization.yaml.',
        'overlays/staging: namespace staging, 1 réplica de la API, imagen 1.3.0-rc1.',
        'overlays/produccion: namespace produccion, 4 réplicas de la API, imagen 1.2.0.',
        'Aplica los dos overlays.',
        'Instala Redis (bitnami/redis, release cache, architecture=standalone) solo en staging.',
      ],
      objectives: {
        'ready:staging deploy/api': 'staging: 1 réplica de la 1.3.0-rc1',
        'ready:produccion deploy/api': 'produccion: 4 réplicas de la 1.2.0',
        'ready:staging sts/cache-redis-master': 'Redis en staging',
        'gone:produccion sts/cache-redis-master': 'Sin Redis en produccion',
      },
    },
    en: {
      title: 'Staging and production',
      goal: 'Turn the loose YAML into base/ plus two overlays, deploy both environments and a Redis with Helm only in staging.',
      story:
        'The team already deploys to two namespaces, staging and produccion, copying YAML by hand. This week it gets tidied up before someone ships staging stuff to production.',
      tasks: [
        'Move ~/tienda/api.yaml and ~/tienda/front.yaml to ~/tienda/base, with its kustomization.yaml.',
        'overlays/staging: namespace staging, 1 API replica, image 1.3.0-rc1.',
        'overlays/produccion: namespace produccion, 4 API replicas, image 1.2.0.',
        'Apply both overlays.',
        'Install Redis (bitnami/redis, release cache, architecture=standalone) only in staging.',
      ],
      objectives: {
        'ready:staging deploy/api': 'staging: 1 replica of 1.3.0-rc1',
        'ready:produccion deploy/api': 'produccion: 4 replicas of 1.2.0',
        'ready:staging sts/cache-redis-master': 'Redis in staging',
        'gone:produccion sts/cache-redis-master': 'No Redis in produccion',
      },
    },
    solution: [
      'mkdir -p ~/tienda/base ~/tienda/overlays/staging ~/tienda/overlays/produccion',
      'mv ~/tienda/api.yaml ~/tienda/front.yaml ~/tienda/base/',
      write('~/tienda/base/kustomization.yaml', BASE_KUSTOMIZATION),
      write('~/tienda/overlays/staging/kustomization.yaml', overlay('staging', 1, '1.3.0-rc1')),
      write('~/tienda/overlays/produccion/kustomization.yaml', overlay('produccion', 4, '1.2.0')),
      'kubectl apply -k ~/tienda/overlays/staging',
      'kubectl apply -k ~/tienda/overlays/produccion',
      'helm repo add bitnami https://charts.bitnami.com/bitnami',
      'helm install cache bitnami/redis --set architecture=standalone -n staging',
    ],
    check: {
      ready: ['staging deploy/api', 'produccion deploy/api', 'staging sts/cache-redis-master'],
      gone: ['produccion sts/cache-redis-master'],
    },
  },
  {
    id: 'k8s-final-avanzado',
    block: 9,
    tier: 'advanced',
    kind: 'final',
    limit: 1200,
    setup: {
      files: {
        '~/tienda/base/api.yaml': API_YAML('1.0.0', 2, PROBES + RESOURCES + SECURE).replace(
          '  replicas: 2\n',
          '',
        ),
        '~/tienda/base/front.yaml': FRONT_YAML(),
        '~/tienda/base/kustomization.yaml': BASE_KUSTOMIZATION,
        '~/tienda/.env': `POSTGRES_PASSWORD=secreto\nDATABASE_URL=postgres://postgres:secreto@db:5432/peer4u\n`,
        '~/tienda/.gitignore': '.env\n',
        '~/tienda/tls/tienda.crt': CERT,
        '~/tienda/tls/tienda.key': KEY,
      },
    },
    es: {
      title: 'El lanzamiento',
      goal: 'Entrega la tienda en el clúster de producción, como se hace en un equipo: datos persistentes, migraciones, Kustomize, Ingress con TLS, HPA y la base de datos aislada.',
      story:
        'Examen avanzado. Te dan el repositorio de la tienda (~/tienda/base, ya con sondas, recursos y securityContext) y el .env, que git ignora. Todo va al contexto produccion, namespace tienda. Aviso del equipo: la 1.3.0 no pasa las readiness; si la pruebas, vuelve atrás y deja el overlay en la 1.2.0.',
      tasks: [
        'kubectl apuntando al contexto produccion y al namespace tienda (créalo).',
        'Secret db desde ~/tienda/.env, Secret de registro ghcr y Secret TLS tienda-tls desde ~/tienda/tls.',
        'Postgres como StatefulSet db con PVC y Service headless db.',
        'Job migra (ghcr.io/peer4u/api:1.0.0, npm run migrate, Secret db) terminado.',
        '~/tienda/overlays/produccion: namespace tienda e imagen de la API 1.2.0; aplicado con -k.',
        'Ingress tienda en tienda.local (/ al front, /api a la API) con TLS; HPA de la API de 2 a 6 al 70 %.',
        'NetworkPolicy: a la base de datos solo le llega la API. Y kubectl diff -k del overlay, vacío.',
      ],
      objectives: {
        context: 'kubectl en produccion/tienda',
        'http:tienda.local/api/health': 'tienda.local/api llega a la base de datos',
        'exec:tienda deploy/front nc -z -w 2 db 5432': 'El front no llega a la base de datos',
        'probe:diff': 'El overlay coincide con el clúster',
        'get:tienda hpa/api {.spec.minReplicas} {.spec.maxReplicas}': 'HPA de 2 a 6',
      },
    },
    en: {
      title: 'The launch',
      goal: 'Ship the shop to the production cluster the way a team does it: persistent data, migrations, Kustomize, Ingress with TLS, HPA and an isolated database.',
      story:
        'Advanced exam. You get the shop repository (~/tienda/base, already with probes, resources and securityContext) and the .env, which git ignores. Everything goes to context produccion, namespace tienda. Heads-up from the team: 1.3.0 fails its readiness; if you try it, roll back and leave the overlay on 1.2.0.',
      tasks: [
        'kubectl pointing at context produccion and namespace tienda (create it).',
        'Secret db from ~/tienda/.env, registry Secret ghcr and TLS Secret tienda-tls from ~/tienda/tls.',
        'Postgres as StatefulSet db with a PVC and a headless Service db.',
        'Job migra (ghcr.io/peer4u/api:1.0.0, npm run migrate, Secret db) completed.',
        '~/tienda/overlays/produccion: namespace tienda and API image 1.2.0; applied with -k.',
        'Ingress tienda on tienda.local (/ to the front, /api to the API) with TLS; API HPA from 2 to 6 at 70 %.',
        'NetworkPolicy: only the API reaches the database. And kubectl diff -k of the overlay, empty.',
      ],
      objectives: {
        context: 'kubectl on produccion/tienda',
        'http:tienda.local/api/health': 'tienda.local/api reaches the database',
        'exec:tienda deploy/front nc -z -w 2 db 5432': 'The front does not reach the database',
        'probe:diff': 'The overlay matches the cluster',
        'get:tienda hpa/api {.spec.minReplicas} {.spec.maxReplicas}': 'HPA from 2 to 6',
      },
    },
    solution: [
      'kubectl config use-context produccion',
      ...TIENDA,
      'kubectl create secret generic db --from-env-file=~/tienda/.env',
      GHCR_SECRET,
      'kubectl create secret tls tienda-tls --cert=~/tienda/tls/tienda.crt --key=~/tienda/tls/tienda.key',
      applyIt(STATEFUL_DB),
      applyIt(MIGRA),
      'mkdir -p ~/tienda/overlays/produccion',
      write(
        '~/tienda/overlays/produccion/kustomization.yaml',
        'resources:\n- ../../base\nnamespace: tienda\nimages:\n- name: ghcr.io/peer4u/api\n  newTag: 1.2.0\n',
      ),
      'kubectl apply -k ~/tienda/overlays/produccion',
      'kubectl create ingress tienda --class=traefik --rule="tienda.local/*=front:80,tls=tienda-tls" --rule="tienda.local/api*=api:3000"',
      'kubectl autoscale deployment api --cpu-percent=70 --min=2 --max=6',
      applyIt(DB_ONLY_API),
    ],
    check: {
      context: true,
      ready: ['tienda sts/db', 'tienda job/migra', 'tienda deploy/api', 'tienda deploy/front'],
      http: ['tienda.local/api/health'],
      exec: ['tienda deploy/front nc -z -w 2 db 5432'],
      get: ['tienda hpa/api {.spec.minReplicas} {.spec.maxReplicas}'],
      probes: { diff: ['kubectl diff -k ~/tienda/overlays/produccion > /dev/null'] },
    },
  },
]
