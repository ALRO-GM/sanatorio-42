/**
 * Nivel intermedio, «Producción sin sustos»: bloques 4 a 6 y su jefe final.
 * Actualizar sin cortes (rolling update, rollback, estrategias, diff), salud
 * y recursos (readiness, liveness, startup, requests, limits, OOMKilled) y
 * depurar por estado (CrashLoopBackOff, ImagePullBackOff, Pending, entrar a
 * mirar, Services que no llegan). El examen es una guardia con cinco fallos.
 */

import {
  API_YAML,
  DB_SECRET,
  DB_URL,
  DB_YAML,
  FRONT_YAML,
  GHCR_SECRET,
  stack,
  TIENDA,
} from './stack.js'
import type { Unit } from './types.js'

const API_CM = API_YAML().replace(
  '[{secretRef: {name: db}}]',
  '[{secretRef: {name: db}}, {configMapRef: {name: api-config}}]',
)

const CONFIG_YAML =
  'apiVersion: v1\nkind: ConfigMap\nmetadata: {name: api-config}\ndata:\n  LOG_LEVEL: info\n'

const READINESS = `        readinessProbe:
          httpGet: {path: /health, port: 3000}
          periodSeconds: 5
`

const BAD_LIVENESS = `        livenessProbe:
          httpGet: {path: /health, port: 3000}
          initialDelaySeconds: 3
          periodSeconds: 2
          failureThreshold: 1
`

const STARTUP = `        startupProbe:
          httpGet: {path: /health, port: 3000}
          periodSeconds: 2
          failureThreshold: 30
`

const LIVENESS = `        livenessProbe:
          httpGet: {path: /health, port: 3000}
          periodSeconds: 10
`

const API_RESOURCES = `        resources:
          requests: {cpu: 100m, memory: 128Mi}
          limits: {memory: 256Mi}
`

const INFORMES_YAML = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: informes
  labels: {app: informes}
spec:
  replicas: 1
  selector:
    matchLabels: {app: informes}
  template:
    metadata:
      labels: {app: informes}
    spec:
      imagePullSecrets: [{name: ghcr}]
      containers:
      - name: informes
        image: ghcr.io/peer4u/informes:1.0.0
        resources:
          limits: {memory: 128Mi}
`

const CANARY = `cat <<'EOF' | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-canary
spec:
  replicas: 1
  selector:
    matchLabels: {app: api, track: canary}
  template:
    metadata:
      labels: {app: api, track: canary}
    spec:
      imagePullSecrets: [{name: ghcr}]
      containers:
      - name: api
        image: ghcr.io/peer4u/api:1.0.2
        envFrom: [{secretRef: {name: db}}]
EOF`

const write = (path: string, text: string): string => `cat > ${path} <<'EOF'\n${text}EOF`

/** El Service de la API roto: un selector que no casa y el puerto del contenedor mal. */
const BROKEN_SVC = (yaml: string): string =>
  yaml.replace(
    '  selector: {app: api}\n  ports: [{port: 3000}]',
    '  selector: {app: api-v2}\n  ports: [{port: 3000, targetPort: 8080}]',
  )

export const INTERMEDIATE: Unit[] = [
  /* ---------- Bloque 4: actualizar sin cortes ---------- */
  {
    id: 'k8s-rolling-update',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    setup: stack(),
    es: {
      title: 'Rolling update',
      goal: 'Sube la API a ghcr.io/peer4u/api:1.0.1, anota el motivo («sube a 1.0.1») y deja el rollout terminado.',
      theory: {
        what: 'Cambiar la imagen de un Deployment crea un ReplicaSet nuevo y sustituye los Pods poco a poco: arranca uno nuevo, espera a que esté listo, quita uno viejo. Siempre hay Pods sirviendo. Cada cambio es una revisión que se puede ver y deshacer.',
        how: [
          'kubectl set image deployment/api api=ghcr.io/peer4u/api:1.0.1',
          'kubectl annotate deployment/api kubernetes.io/change-cause="sube a 1.0.1"',
          'kubectl rollout status deployment/api     # espera a que acabe',
          'kubectl rollout history deployment/api    # las revisiones con su motivo',
        ],
        when: 'En cada despliegue de una versión nueva. En un equipo lo hace la CI o GitOps cambiando la etiqueta en el YAML (bloque 9).',
        problems:
          'La anotación change-cause se queda en el Deployment y se copia a la revisión siguiente si no la cambias: ponla en cada despliegue.',
      },
      example: 'Subes la API a 1.0.1 y miras el rollout y las revisiones.',
      objectives: {
        'ready:tienda deploy/api': 'La API en 1.0.1, con sus 3 réplicas',
        'get:tienda deploy/api {.metadata.annotations.kubernetes\\.io/change-cause}':
          'El motivo del cambio anotado',
      },
    },
    en: {
      title: 'Rolling update',
      goal: 'Move the API to ghcr.io/peer4u/api:1.0.1, record the reason («sube a 1.0.1») and leave the rollout finished.',
      theory: {
        what: 'Changing a Deployment image creates a new ReplicaSet and replaces the Pods gradually: start a new one, wait until it is ready, remove an old one. There are always Pods serving. Every change is a revision you can see and undo.',
        how: [
          'kubectl set image deployment/api api=ghcr.io/peer4u/api:1.0.1',
          'kubectl annotate deployment/api kubernetes.io/change-cause="sube a 1.0.1"',
          'kubectl rollout status deployment/api     # wait until it finishes',
          'kubectl rollout history deployment/api    # revisions with their reason',
        ],
        when: 'On every release. In a team, CI or GitOps does it by changing the tag in the YAML (block 9).',
        problems:
          'The change-cause annotation stays on the Deployment and is copied to the next revision unless you change it: set it on every release.',
      },
      example: 'You move the API to 1.0.1 and look at the rollout and the revisions.',
      objectives: {
        'ready:tienda deploy/api': 'The API on 1.0.1, with its 3 replicas',
        'get:tienda deploy/api {.metadata.annotations.kubernetes\\.io/change-cause}':
          'The change reason recorded',
      },
    },
    example: [
      'kubectl set image deployment/api api=ghcr.io/peer4u/api:1.0.1',
      'kubectl rollout status deployment/api',
      'kubectl rollout history deployment/api',
      'kubectl get rs',
    ],
    solution: [
      'kubectl set image deployment/api api=ghcr.io/peer4u/api:1.0.1',
      'kubectl annotate deployment/api kubernetes.io/change-cause="sube a 1.0.1"',
    ],
    check: {
      ready: ['tienda deploy/api'],
      get: ['tienda deploy/api {.metadata.annotations.kubernetes\\.io/change-cause}'],
    },
  },
  {
    id: 'k8s-rollback',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    setup: stack({}, ['kubectl set image deployment/api api=ghcr.io/peer4u/api:1.1.0']),
    es: {
      title: 'Deshacer un despliegue',
      goal: 'Alguien ha subido la API a 1.1.0 y los Pods nuevos no arrancan. Vuelve a la versión buena (1.0.0) y deja el rollout terminado.',
      theory: {
        what: 'Si los Pods nuevos no llegan a estar listos, el rolling update se para a medias: los viejos siguen sirviendo. kubectl rollout undo vuelve a la plantilla de la revisión anterior (o a la que digas) con otro rolling update.',
        how: [
          'kubectl rollout status deployment/api --timeout=60s   # no acaba',
          'kubectl get pods                                       # los nuevos, en CrashLoopBackOff',
          'kubectl rollout undo deployment/api                    # a la anterior',
          'kubectl rollout undo deployment/api --to-revision=1    # o a una concreta',
        ],
        when: 'Cuando una versión rompe algo en producción: primero vuelves atrás y luego investigas con calma.',
        problems:
          'undo cambia el clúster, no el repositorio: si el YAML dice 1.1.0, el siguiente apply lo vuelve a romper. Arréglalo también en el YAML.',
      },
      example: 'Ves el rollout atascado, los Pods nuevos fallando y las revisiones.',
      objectives: { 'ready:tienda deploy/api': 'La API en 1.0.0, con el rollout terminado' },
    },
    en: {
      title: 'Undo a rollout',
      goal: 'Someone moved the API to 1.1.0 and the new Pods do not start. Go back to the good version (1.0.0) and leave the rollout finished.',
      theory: {
        what: 'If the new Pods never become ready, the rolling update stops half-way: the old ones keep serving. kubectl rollout undo goes back to the previous revision template (or the one you name) with another rolling update.',
        how: [
          'kubectl rollout status deployment/api --timeout=60s   # never finishes',
          'kubectl get pods                                       # new ones in CrashLoopBackOff',
          'kubectl rollout undo deployment/api                    # back to the previous one',
          'kubectl rollout undo deployment/api --to-revision=1    # or a given one',
        ],
        when: 'When a version breaks something in production: first roll back, then investigate calmly.',
        problems:
          'undo changes the cluster, not the repository: if the YAML says 1.1.0, the next apply breaks it again. Fix the YAML too.',
      },
      example: 'You see the stuck rollout, the new Pods failing and the revisions.',
      objectives: { 'ready:tienda deploy/api': 'The API on 1.0.0, with the rollout finished' },
    },
    example: [
      'kubectl rollout status deployment/api --timeout=30s',
      'kubectl get pods',
      'kubectl rollout history deployment/api',
    ],
    solution: ['kubectl rollout undo deployment/api'],
    check: { ready: ['tienda deploy/api'] },
  },
  {
    id: 'k8s-estrategia',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    setup: stack(),
    es: {
      title: 'Estrategias de despliegue',
      goal: 'Que la API no pierda nunca capacidad al actualizarse (maxSurge 1, maxUnavailable 0) y añade un canary api-canary con 1 réplica de la 1.0.2 detrás del mismo Service.',
      theory: {
        what: 'El rolling update se regula con maxSurge (cuántos Pods de más puede haber) y maxUnavailable (cuántos pueden faltar). Recreate para todo y arranca lo nuevo (para lo que no aguanta dos versiones a la vez). Un canary es un segundo Deployment con pocas réplicas y las mismas etiquetas que mira el Service: le llega una parte del tráfico.',
        how: [
          'kubectl patch deployment api -p \'{"spec":{"strategy":{"rollingUpdate":{"maxSurge":1,"maxUnavailable":0}}}}\'',
          'kubectl apply -f api-canary.yaml       # labels app: api, track: canary',
          'kubectl describe svc api               # Endpoints: los 3 + el canary',
        ],
        when: 'maxUnavailable 0 cuando no sobra capacidad; un canary para probar una versión con tráfico real antes de darle todo.',
        problems:
          'Si el canary no lleva la etiqueta que mira el Service, no le llega nada; si lleva exactamente las mismas que el Deployment principal, se pelean por los Pods.',
      },
      example: 'Miras la estrategia actual de la API y los endpoints de su Service.',
      objectives: {
        'get:tienda deploy/api {.spec.strategy.rollingUpdate.maxSurge} {.spec.strategy.rollingUpdate.maxUnavailable}':
          'maxSurge 1 y maxUnavailable 0',
        'ready:tienda deploy/api-canary': 'api-canary con la 1.0.2',
        'probe:endpoints': 'El Service api reparte entre 4 Pods',
      },
    },
    en: {
      title: 'Deployment strategies',
      goal: 'Make sure the API never loses capacity while updating (maxSurge 1, maxUnavailable 0) and add a canary api-canary with 1 replica of 1.0.2 behind the same Service.',
      theory: {
        what: 'A rolling update is tuned with maxSurge (how many extra Pods may exist) and maxUnavailable (how many may be missing). Recreate stops everything and starts the new one (for apps that cannot run two versions at once). A canary is a second Deployment with few replicas and the labels the Service selects: it gets a slice of the traffic.',
        how: [
          'kubectl patch deployment api -p \'{"spec":{"strategy":{"rollingUpdate":{"maxSurge":1,"maxUnavailable":0}}}}\'',
          'kubectl apply -f api-canary.yaml       # labels app: api, track: canary',
          'kubectl describe svc api               # Endpoints: the 3 + the canary',
        ],
        when: 'maxUnavailable 0 when there is no spare capacity; a canary to try a version with real traffic before giving it everything.',
        problems:
          'If the canary lacks the label the Service selects, it gets nothing; if it has exactly the same labels as the main Deployment, they fight over Pods.',
      },
      example: 'You look at the API current strategy and at its Service endpoints.',
      objectives: {
        'get:tienda deploy/api {.spec.strategy.rollingUpdate.maxSurge} {.spec.strategy.rollingUpdate.maxUnavailable}':
          'maxSurge 1 and maxUnavailable 0',
        'ready:tienda deploy/api-canary': 'api-canary on 1.0.2',
        'probe:endpoints': 'Service api spreads over 4 Pods',
      },
    },
    example: ["kubectl get deploy api -o jsonpath='{.spec.strategy}'", 'kubectl describe svc api'],
    solution: [
      'kubectl patch deployment api -p \'{"spec":{"strategy":{"rollingUpdate":{"maxSurge":1,"maxUnavailable":0}}}}\'',
      CANARY,
    ],
    check: {
      get: [
        'tienda deploy/api {.spec.strategy.rollingUpdate.maxSurge} {.spec.strategy.rollingUpdate.maxUnavailable}',
      ],
      ready: ['tienda deploy/api-canary', 'tienda deploy/api'],
      probes: { endpoints: ["kubectl describe svc api | grep Endpoints | tr ',' '\\n' | wc -l"] },
    },
  },
  {
    id: 'k8s-apply-diff',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    setup: stack({}, ['kubectl scale deployment api --replicas=5']),
    es: {
      title: 'Declarativo de verdad',
      goal: 'Alguien escaló la API a mano y el clúster ya no es lo que dice ~/tienda/api.yaml. Vuelve a lo del repositorio y compruébalo con kubectl diff.',
      theory: {
        what: 'kubectl diff enseña qué cambiaría un apply: la diferencia entre el clúster y tus ficheros. scale, set, patch o edit cambian el clúster pero no el repositorio: eso es la deriva (drift). La fuente de la verdad es el YAML en git.',
        how: [
          'kubectl diff -f api.yaml       # sale 1 si hay diferencias, 0 si no',
          'kubectl apply -f api.yaml      # el clúster vuelve a lo del fichero',
          'kubectl diff -f api.yaml       # ya no enseña nada',
        ],
        when: 'Antes de cada apply (sobre todo en producción) y para encontrar cambios hechos a mano.',
        problems:
          'Un cambio a mano que arregla una urgencia se pierde en el siguiente despliegue si no se lleva al YAML.',
      },
      example: 'Miras la deriva de la API con diff.',
      objectives: {
        'get:tienda deploy/api {.spec.replicas}': 'La API con las réplicas del YAML',
        'probe:diff': 'kubectl diff ya no encuentra diferencias',
      },
    },
    en: {
      title: 'Truly declarative',
      goal: 'Someone scaled the API by hand and the cluster no longer matches ~/tienda/api.yaml. Go back to what the repository says and check it with kubectl diff.',
      theory: {
        what: 'kubectl diff shows what an apply would change: the difference between the cluster and your files. scale, set, patch or edit change the cluster but not the repository: that is drift. The source of truth is the YAML in git.',
        how: [
          'kubectl diff -f api.yaml       # exits 1 if there are differences, 0 otherwise',
          'kubectl apply -f api.yaml      # the cluster goes back to the file',
          'kubectl diff -f api.yaml       # shows nothing now',
        ],
        when: 'Before every apply (above all in production) and to find manual changes.',
        problems:
          'A manual fix for an emergency is lost on the next release unless it goes into the YAML.',
      },
      example: 'You look at the API drift with diff.',
      objectives: {
        'get:tienda deploy/api {.spec.replicas}': 'The API with the YAML replicas',
        'probe:diff': 'kubectl diff finds no differences',
      },
    },
    example: ['kubectl diff -f ~/tienda/api.yaml'],
    solution: ['kubectl apply -f ~/tienda/api.yaml', 'kubectl diff -f ~/tienda/api.yaml'],
    check: {
      get: ['tienda deploy/api {.spec.replicas}'],
      probes: { diff: ['kubectl diff -f ~/tienda/api.yaml > /dev/null'] },
    },
    requires: [['diff']],
  },
  {
    id: 'k8s-jefe-viernes',
    block: 4,
    tier: 'intermediate',
    kind: 'boss',
    limit: 300,
    setup: stack({ '~/tienda/api.yaml': API_CM, '~/tienda/api-config.yaml': CONFIG_YAML }, [
      'kubectl set image deployment/api api=ghcr.io/peer4u/api:1.1.0',
    ]),
    es: {
      title: 'Viernes, 17:55',
      goal: 'Vuelve a la versión buena, averigua qué pide la 1.1.0 y despliégala bien desde el YAML.',
      story:
        'Viernes, 17:55. Alguien ha desplegado la API 1.1.0 con kubectl set image y se ha ido. El rollout está atascado y los Pods nuevos fallan. Hay que dejar producción bien antes de irse, y desde el repositorio.',
      tasks: [
        'Vuelve a la última versión buena de la API.',
        'Averigua con logs --previous qué variable pide la 1.1.0 (la caché de Redis está en redis://cache:6379).',
        'Añádela a ~/tienda/api-config.yaml y pon la 1.1.0 en ~/tienda/api.yaml.',
        'Aplica los dos ficheros hasta que el rollout acabe.',
      ],
      objectives: {
        'ready:tienda deploy/api': 'La API en 1.1.0, con el rollout terminado',
        'get:tienda cm/api-config {.data.REDIS_URL}': 'api-config con la variable que faltaba',
        'probe:repo': 'api.yaml dice 1.1.0',
      },
    },
    en: {
      title: 'Friday, 17:55',
      goal: 'Go back to the good version, find out what 1.1.0 needs and ship it properly from the YAML.',
      story:
        'Friday, 17:55. Someone shipped API 1.1.0 with kubectl set image and left. The rollout is stuck and the new Pods fail. Production has to be fine before you leave, and from the repository.',
      tasks: [
        'Roll the API back to the last good version.',
        'Find out with logs --previous which variable 1.1.0 needs (the Redis cache is at redis://cache:6379).',
        'Add it to ~/tienda/api-config.yaml and put 1.1.0 in ~/tienda/api.yaml.',
        'Apply both files until the rollout finishes.',
      ],
      objectives: {
        'ready:tienda deploy/api': 'The API on 1.1.0, with the rollout finished',
        'get:tienda cm/api-config {.data.REDIS_URL}': 'api-config with the missing variable',
        'probe:repo': 'api.yaml says 1.1.0',
      },
    },
    solution: [
      'kubectl rollout undo deployment/api',
      "echo '  REDIS_URL: redis://cache:6379' >> ~/tienda/api-config.yaml",
      "sed -i 's/api:1.0.0/api:1.1.0/' ~/tienda/api.yaml",
      'kubectl apply -f ~/tienda/api-config.yaml -f ~/tienda/api.yaml',
    ],
    check: {
      ready: ['tienda deploy/api'],
      get: ['tienda cm/api-config {.data.REDIS_URL}'],
      probes: { repo: ['grep -c api:1.1.0 ~/tienda/api.yaml'] },
    },
  },

  /* ---------- Bloque 5: salud y recursos ---------- */
  {
    id: 'k8s-readiness',
    block: 5,
    tier: 'intermediate',
    kind: 'unit',
    setup: stack({ '~/tienda/api.yaml': API_YAML('1.2.0') }),
    es: {
      title: 'Readiness: no mandes tráfico antes de tiempo',
      goal: 'La 1.2.0 tarda 20 s en escuchar y el Service le manda peticiones antes. Añade en ~/tienda/api.yaml una readinessProbe HTTP a /health en el 3000 y aplícalo.',
      theory: {
        what: 'La readinessProbe dice cuándo un Pod puede recibir tráfico: hasta que pasa, no está en los endpoints del Service. Sin ella, el Pod cuenta como listo en cuanto arranca el contenedor, aunque la app aún no escuche. Kubernetes no mira el HEALTHCHECK de la imagen de Docker: hay que escribirlo otra vez.',
        how: [
          'readinessProbe:',
          '  httpGet: {path: /health, port: 3000}',
          '  periodSeconds: 5',
          'kubectl get pods -w                 # 0/1 y luego 1/1',
          'kubectl describe svc api            # solo los listos en Endpoints',
        ],
        when: 'En toda app que tarde en arrancar o dependa de otra cosa (base de datos, caché).',
        problems:
          'Si la sonda nunca pasa (puerto o ruta mal), el Pod se queda en 0/1 para siempre y el rollout no acaba.',
      },
      example: 'Ves los Pods de la 1.2.0 «listos» mientras la API todavía no contesta.',
      objectives: {
        'get:tienda deploy/api {.spec.template.spec.containers[0].readinessProbe.httpGet.path} {.spec.template.spec.containers[0].readinessProbe.httpGet.port}':
          'readinessProbe a /health en el 3000',
        'probe:repo': 'api.yaml coincide con el clúster',
      },
    },
    en: {
      title: 'Readiness: no traffic before it is time',
      goal: 'Version 1.2.0 takes 20 s to listen and the Service sends it requests before that. Add an HTTP readinessProbe to /health on 3000 in ~/tienda/api.yaml and apply it.',
      theory: {
        what: 'The readinessProbe says when a Pod may receive traffic: until it passes, the Pod is not among the Service endpoints. Without it, the Pod counts as ready as soon as the container starts, even if the app is not listening yet. Kubernetes ignores the Docker image HEALTHCHECK: you write it again.',
        how: [
          'readinessProbe:',
          '  httpGet: {path: /health, port: 3000}',
          '  periodSeconds: 5',
          'kubectl get pods -w                 # 0/1 and then 1/1',
          'kubectl describe svc api            # only the ready ones under Endpoints',
        ],
        when: 'In every app that is slow to start or depends on something else (database, cache).',
        problems:
          'If the probe never passes (wrong port or path), the Pod stays 0/1 forever and the rollout never finishes.',
      },
      example: 'You see the 1.2.0 Pods «ready» while the API does not answer yet.',
      objectives: {
        'get:tienda deploy/api {.spec.template.spec.containers[0].readinessProbe.httpGet.path} {.spec.template.spec.containers[0].readinessProbe.httpGet.port}':
          'readinessProbe to /health on 3000',
        'probe:repo': 'api.yaml matches the cluster',
      },
    },
    example: [
      'kubectl rollout restart deployment/api',
      'kubectl get pods',
      'kubectl run tmp --rm -i --image=curlimages/curl:8.10 --restart=Never -- curl -s api:3000/health',
    ],
    solution: [
      write('~/tienda/api.yaml', API_YAML('1.2.0', 3, READINESS)),
      'kubectl apply -f ~/tienda/api.yaml',
    ],
    check: {
      get: [
        'tienda deploy/api {.spec.template.spec.containers[0].readinessProbe.httpGet.path} {.spec.template.spec.containers[0].readinessProbe.httpGet.port}',
      ],
      ready: ['tienda deploy/api'],
      probes: { repo: ['kubectl diff -f ~/tienda/api.yaml > /dev/null'] },
    },
  },
  {
    id: 'k8s-liveness',
    block: 5,
    tier: 'intermediate',
    kind: 'unit',
    setup: stack({ '~/tienda/api.yaml': API_YAML('1.2.0', 3, BAD_LIVENESS) }),
    es: {
      title: 'Liveness y startup',
      goal: 'La livenessProbe mata la API antes de que acabe de arrancar y entra en bucle. Arréglalo sin quitarla (una startupProbe es lo indicado) y aplica ~/tienda/api.yaml.',
      theory: {
        what: 'La livenessProbe reinicia un contenedor que se ha colgado. Mal puesta (poco margen en una app lenta) lo mata una y otra vez: RESTARTS sube y acaba en CrashLoopBackOff. La startupProbe da tiempo al arranque: hasta que pasa, no se mira la liveness.',
        how: [
          'startupProbe:',
          '  httpGet: {path: /health, port: 3000}',
          '  failureThreshold: 30     # 30 × 2 s de margen para arrancar',
          '  periodSeconds: 2',
          'kubectl describe pod <api-…>   # «Liveness probe failed», «will be restarted»',
        ],
        when: 'Liveness para lo que se puede colgar sin morirse; startup para lo que tarda en arrancar.',
        whenNot:
          'No hagas que la liveness dependa de otros servicios: si se cae la base de datos, reiniciar la API no arregla nada.',
        problems:
          'Readiness mal: no llega tráfico. Liveness mal: reinicios en bucle. Saber distinguirlos es media guardia.',
      },
      example: 'Ves los reinicios y los eventos de la liveness que falla.',
      objectives: {
        'ready:tienda deploy/api': 'La API estable, sin reinicios en bucle',
        'get:tienda deploy/api {.spec.template.spec.containers[0].livenessProbe.httpGet.path}':
          'Sigue teniendo livenessProbe',
      },
    },
    en: {
      title: 'Liveness and startup',
      goal: 'The livenessProbe kills the API before it finishes starting and it loops. Fix it without removing it (a startupProbe is the right tool) and apply ~/tienda/api.yaml.',
      theory: {
        what: 'The livenessProbe restarts a container that hung. Badly set (too little margin on a slow app) it kills it again and again: RESTARTS climbs and it ends in CrashLoopBackOff. The startupProbe gives start-up time: until it passes, liveness is not checked.',
        how: [
          'startupProbe:',
          '  httpGet: {path: /health, port: 3000}',
          '  failureThreshold: 30     # 30 × 2 s of margin to start',
          '  periodSeconds: 2',
          'kubectl describe pod <api-…>   # «Liveness probe failed», «will be restarted»',
        ],
        when: 'Liveness for what can hang without dying; startup for what is slow to start.',
        whenNot:
          'Do not make liveness depend on other services: if the database goes down, restarting the API fixes nothing.',
        problems:
          'Bad readiness: no traffic. Bad liveness: restart loops. Telling them apart is half of on-call.',
      },
      example: 'You see the restarts and the events of the failing liveness.',
      objectives: {
        'ready:tienda deploy/api': 'The API stable, no restart loops',
        'get:tienda deploy/api {.spec.template.spec.containers[0].livenessProbe.httpGet.path}':
          'It still has a livenessProbe',
      },
    },
    example: ['kubectl get pods', 'kubectl describe pod -l app=api | grep -A4 Events | head -n 8'],
    solution: [
      write('~/tienda/api.yaml', API_YAML('1.2.0', 3, BAD_LIVENESS + STARTUP)),
      'kubectl apply -f ~/tienda/api.yaml',
    ],
    check: {
      ready: ['tienda deploy/api'],
      get: ['tienda deploy/api {.spec.template.spec.containers[0].livenessProbe.httpGet.path}'],
    },
  },
  {
    id: 'k8s-recursos',
    block: 5,
    tier: 'intermediate',
    kind: 'unit',
    setup: {
      files: { '~/tienda/informes.yaml': INFORMES_YAML },
      run: [...TIENDA, GHCR_SECRET, 'kubectl apply -f ~/tienda/informes.yaml'],
    },
    es: {
      title: 'Requests, limits y OOMKilled',
      goal: 'informes muere por memoria (OOMKilled). Dale requests de 100m de CPU y 256Mi de memoria y un límite de 384Mi.',
      theory: {
        what: 'requests es lo que se reserva para el Pod (el planificador lo usa para elegir nodo); limits es el techo. Pasarse de CPU solo frena; pasarse de memoria mata el contenedor: OOMKilled, código 137 (128 + SIGKILL), como en el curso de Docker.',
        how: [
          'kubectl describe pod <informes-…>   # Last State: Terminated, Reason: OOMKilled, Exit Code: 137',
          'kubectl set resources deployment informes --requests=cpu=100m,memory=256Mi --limits=memory=384Mi',
          'kubectl top pods                    # lo que usa de verdad',
        ],
        when: 'Siempre en producción: sin requests el planificador no sabe dónde cabe nada y sin límites un Pod se come el nodo.',
        problems:
          'Un OOMKilled se parece a un CrashLoopBackOff, pero describe dice OOMKilled y 137: no es un fallo de la app, es memoria. Sube el límite o arregla la fuga.',
      },
      example: 'Ves informes reiniciándose y el OOMKilled en describe.',
      objectives: {
        'ready:tienda deploy/informes': 'informes en marcha sin OOMKilled',
        'get:tienda deploy/informes {.spec.template.spec.containers[0].resources.requests.memory} {.spec.template.spec.containers[0].resources.limits.memory}':
          'requests 256Mi y límite 384Mi',
      },
    },
    en: {
      title: 'Requests, limits and OOMKilled',
      goal: 'informes dies of memory (OOMKilled). Give it requests of 100m CPU and 256Mi memory and a 384Mi limit.',
      theory: {
        what: 'requests is what is reserved for the Pod (the scheduler uses it to pick a node); limits is the ceiling. Going over CPU only throttles; going over memory kills the container: OOMKilled, exit code 137 (128 + SIGKILL), as in the Docker course.',
        how: [
          'kubectl describe pod <informes-…>   # Last State: Terminated, Reason: OOMKilled, Exit Code: 137',
          'kubectl set resources deployment informes --requests=cpu=100m,memory=256Mi --limits=memory=384Mi',
          'kubectl top pods                    # what it really uses',
        ],
        when: 'Always in production: without requests the scheduler cannot tell where things fit and without limits one Pod can eat the node.',
        problems:
          'An OOMKilled looks like a CrashLoopBackOff, but describe says OOMKilled and 137: it is not an app bug, it is memory. Raise the limit or fix the leak.',
      },
      example: 'You see informes restarting and OOMKilled in describe.',
      objectives: {
        'ready:tienda deploy/informes': 'informes running without OOMKilled',
        'get:tienda deploy/informes {.spec.template.spec.containers[0].resources.requests.memory} {.spec.template.spec.containers[0].resources.limits.memory}':
          'requests 256Mi and limit 384Mi',
      },
    },
    example: [
      'kubectl get pods',
      "kubectl describe pod -l app=informes | grep -A3 'Last State'",
      'kubectl top pods',
    ],
    solution: [
      'kubectl set resources deployment informes --requests=cpu=100m,memory=256Mi --limits=memory=384Mi',
    ],
    check: {
      ready: ['tienda deploy/informes'],
      get: [
        'tienda deploy/informes {.spec.template.spec.containers[0].resources.requests.memory} {.spec.template.spec.containers[0].resources.limits.memory}',
      ],
    },
  },
  {
    id: 'k8s-jefe-picos',
    block: 5,
    tier: 'intermediate',
    kind: 'boss',
    limit: 360,
    setup: stack({
      '~/tienda/api.yaml': API_YAML('1.2.0', 3, BAD_LIVENESS),
      '~/tienda/informes.yaml': INFORMES_YAML,
    }),
    es: {
      title: 'Los lunes se cae',
      goal: 'API con readiness, liveness, startup y recursos, estable; informes sin OOMKilled.',
      story:
        'Cada lunes, con el pico de tráfico, la API se reinicia sin parar (una liveness de 1 s sobre una app que tarda 20 en arrancar) y el informe semanal muere por memoria. Hoy es lunes.',
      tasks: [
        'API (~/tienda/api.yaml): readinessProbe, livenessProbe y startupProbe razonables sobre /health en el 3000.',
        'API: requests de 100m de CPU y 128Mi; límite de 256Mi de memoria.',
        'informes sin OOMKilled (límite de 384Mi o más).',
        'Todo estable: sin reinicios en bucle.',
      ],
      objectives: {
        'get:tienda deploy/api {.spec.template.spec.containers[0].readinessProbe.httpGet.path} {.spec.template.spec.containers[0].resources.requests.cpu}':
          'La API con readiness y requests',
      },
    },
    en: {
      title: 'It falls over on Mondays',
      goal: 'API with readiness, liveness, startup and resources, stable; informes without OOMKilled.',
      story:
        'Every Monday, at the traffic peak, the API restarts non-stop (a 1 s liveness on an app that takes 20 to start) and the weekly report dies of memory. Today is Monday.',
      tasks: [
        'API (~/tienda/api.yaml): sensible readinessProbe, livenessProbe and startupProbe on /health port 3000.',
        'API: requests of 100m CPU and 128Mi; 256Mi memory limit.',
        'informes without OOMKilled (a 384Mi limit or more).',
        'Everything stable: no restart loops.',
      ],
      objectives: {
        'get:tienda deploy/api {.spec.template.spec.containers[0].readinessProbe.httpGet.path} {.spec.template.spec.containers[0].resources.requests.cpu}':
          'The API with readiness and requests',
      },
    },
    solution: [
      write(
        '~/tienda/api.yaml',
        API_YAML('1.2.0', 3, READINESS + LIVENESS + STARTUP + API_RESOURCES),
      ),
      'kubectl apply -f ~/tienda/api.yaml',
      'kubectl set resources deployment informes --limits=memory=384Mi',
    ],
    check: {
      ready: ['tienda deploy/api', 'tienda deploy/informes'],
      get: [
        'tienda deploy/api {.spec.template.spec.containers[0].readinessProbe.httpGet.path} {.spec.template.spec.containers[0].resources.requests.cpu}',
      ],
    },
  },

  /* ---------- Bloque 6: depurar ---------- */
  {
    id: 'k8s-crashloop',
    block: 6,
    tier: 'intermediate',
    kind: 'unit',
    setup: {
      files: { '~/tienda/db.yaml': DB_YAML, '~/tienda/api.yaml': API_YAML('1.0.0', 2) },
      run: [
        ...TIENDA,
        DB_SECRET.replace('--from-literal=DATABASE_URL', '--from-literal=DATABASE_ULR'),
        GHCR_SECRET,
        'kubectl apply -f ~/tienda/',
      ],
    },
    es: {
      title: 'CrashLoopBackOff',
      goal: 'La API está en CrashLoopBackOff. Encuentra la causa con el método (get → describe → logs --previous) y arréglala.',
      theory: {
        what: 'CrashLoopBackOff: el contenedor arranca, sale con error y Kubernetes espera cada vez más antes de reintentarlo (10 s, 20 s, 40 s… hasta 5 min). La causa está casi siempre en lo que escribió antes de morir.',
        how: [
          'kubectl get pods                         # STATUS y RESTARTS',
          'kubectl describe pod <api-…>             # Last State, Exit Code y eventos',
          'kubectl logs <api-…> --previous          # lo que escribió la vez anterior',
          'kubectl get secret db -o yaml            # ¿está la clave que pide?',
          'kubectl rollout restart deployment/api   # Pods nuevos con lo arreglado',
        ],
        when: 'Cada vez que un Pod no se queda en Running: el orden es siempre el mismo.',
        problems:
          'Sin --previous ves el arranque de ahora, que quizá aún no ha fallado. Una clave con otro nombre en un Secret (o una variable que falta) es el clásico.',
      },
      example: 'Sigues el método sobre la API que falla.',
      objectives: { 'ready:tienda deploy/api': 'La API en marcha' },
    },
    en: {
      title: 'CrashLoopBackOff',
      goal: 'The API is in CrashLoopBackOff. Find the cause with the method (get → describe → logs --previous) and fix it.',
      theory: {
        what: 'CrashLoopBackOff: the container starts, exits with an error and Kubernetes waits longer each time before retrying (10 s, 20 s, 40 s… up to 5 min). The cause is nearly always in what it wrote before dying.',
        how: [
          'kubectl get pods                         # STATUS and RESTARTS',
          'kubectl describe pod <api-…>             # Last State, Exit Code and events',
          'kubectl logs <api-…> --previous          # what it wrote last time',
          'kubectl get secret db -o yaml            # is the key it asks for there?',
          'kubectl rollout restart deployment/api   # new Pods with the fix',
        ],
        when: 'Every time a Pod does not stay Running: the order is always the same.',
        problems:
          'Without --previous you see the current start, which may not have failed yet. A key with another name in a Secret (or a missing variable) is the classic.',
      },
      example: 'You follow the method on the failing API.',
      objectives: { 'ready:tienda deploy/api': 'The API running' },
    },
    example: [
      'kubectl get pods',
      "kubectl describe pod -l app=api | grep -A3 'Last State' | head -n 4",
      'kubectl logs deploy/api --previous',
      "kubectl get secret db -o jsonpath='{.data}'",
    ],
    solution: [
      'kubectl describe pod -l app=api',
      'kubectl delete secret db',
      DB_SECRET,
      'kubectl rollout restart deployment/api',
    ],
    check: { ready: ['tienda deploy/api'] },
    requires: [['logs', 'describe']],
  },
  {
    id: 'k8s-imagepull',
    block: 6,
    tier: 'intermediate',
    kind: 'unit',
    setup: stack({ '~/tienda/front.yaml': FRONT_YAML('ghcr.io/peer4u/front:1.0') }),
    es: {
      title: 'ImagePullBackOff y ErrImagePull',
      goal: 'El front no arranca: ImagePullBackOff. Lee el porqué en los eventos y arréglalo.',
      theory: {
        what: 'ErrImagePull e ImagePullBackOff: el nodo no puede descargar la imagen. Los eventos dicen por qué: «not found» (la etiqueta o el nombre no existen) o «401 Unauthorized» (registro privado sin imagePullSecrets o con el token mal).',
        how: [
          'kubectl describe pod <front-…>     # Events: Failed to pull image …',
          'kubectl get events --sort-by=.lastTimestamp',
          'kubectl set image deployment/front front=ghcr.io/peer4u/front:1.0.0',
        ],
        when: 'Justo después de un despliegue, cuando los Pods nuevos no llegan ni a arrancar.',
        problems:
          'Una etiqueta que existe en tu portátil (docker images) no tiene por qué estar en el registro: comprueba que la publicaste (docker push).',
      },
      example: 'Miras los eventos del front.',
      objectives: { 'ready:tienda deploy/front': 'El front descargado y en marcha' },
    },
    en: {
      title: 'ImagePullBackOff and ErrImagePull',
      goal: 'The front does not start: ImagePullBackOff. Read why in the events and fix it.',
      theory: {
        what: 'ErrImagePull and ImagePullBackOff: the node cannot pull the image. The events say why: «not found» (the tag or name does not exist) or «401 Unauthorized» (private registry without imagePullSecrets or with a bad token).',
        how: [
          'kubectl describe pod <front-…>     # Events: Failed to pull image …',
          'kubectl get events --sort-by=.lastTimestamp',
          'kubectl set image deployment/front front=ghcr.io/peer4u/front:1.0.0',
        ],
        when: 'Right after a release, when the new Pods do not even start.',
        problems:
          'A tag that exists on your laptop (docker images) is not necessarily in the registry: check you pushed it (docker push).',
      },
      example: 'You look at the front events.',
      objectives: { 'ready:tienda deploy/front': 'The front pulled and running' },
    },
    example: ['kubectl get pods', 'kubectl get events --sort-by=.lastTimestamp | tail -n 4'],
    solution: [
      'kubectl describe pod -l app=front',
      'kubectl set image deployment/front front=ghcr.io/peer4u/front:1.0.0',
    ],
    check: { ready: ['tienda deploy/front'] },
    requires: [['describe', 'get']],
  },
  {
    id: 'k8s-pending',
    block: 6,
    tier: 'intermediate',
    kind: 'unit',
    setup: {
      files: {
        '~/tienda/db.yaml': DB_YAML.replace(
          '        envFrom: [{secretRef: {name: db}}]\n',
          '        envFrom: [{secretRef: {name: db}}]\n        resources:\n          requests: {memory: 8Gi}\n',
        ),
      },
      run: [...TIENDA, DB_SECRET, 'kubectl apply -f ~/tienda/db.yaml'],
    },
    es: {
      title: 'Pods en Pending',
      goal: 'La base de datos se queda en Pending. Averigua por qué y haz que quepa (pide 512Mi de memoria).',
      theory: {
        what: 'Pending: el planificador no encuentra un nodo donde quepa el Pod. Los motivos de siempre: pide más CPU o memoria de la que queda libre, un PVC que no existe o no se enlaza, o nodos que no aceptan Pods.',
        how: [
          'kubectl describe pod <db-…>        # 0/3 nodes are available: 3 Insufficient memory',
          'kubectl describe nodes | grep -A6 Allocated   # lo pedido en cada nodo',
          'kubectl set resources deployment db --requests=memory=512Mi',
        ],
        when: 'Cuando un Pod nuevo no llega ni a tener nodo (columna NODE vacía en -o wide).',
        problems:
          'requests es una reserva, no un uso: pedir de más deja nodos vacíos que no aceptan nada. Pide lo que de verdad usa (kubectl top) con algo de margen.',
      },
      example: 'Miras el evento de la base de datos y lo que hay pedido en los nodos.',
      objectives: { 'ready:tienda deploy/db': 'La base de datos planificada y en marcha' },
    },
    en: {
      title: 'Pods stuck in Pending',
      goal: 'The database stays Pending. Find out why and make it fit (ask for 512Mi of memory).',
      theory: {
        what: 'Pending: the scheduler cannot find a node where the Pod fits. The usual reasons: it asks for more CPU or memory than is free, a PVC that does not exist or does not bind, or nodes that do not take Pods.',
        how: [
          'kubectl describe pod <db-…>        # 0/3 nodes are available: 3 Insufficient memory',
          'kubectl describe nodes | grep -A6 Allocated   # what each node has reserved',
          'kubectl set resources deployment db --requests=memory=512Mi',
        ],
        when: 'When a new Pod does not even get a node (empty NODE column in -o wide).',
        problems:
          'requests is a reservation, not usage: asking too much leaves empty nodes that accept nothing. Ask for what it really uses (kubectl top) plus some margin.',
      },
      example: 'You look at the database event and at what is reserved on the nodes.',
      objectives: { 'ready:tienda deploy/db': 'The database scheduled and running' },
    },
    example: [
      'kubectl get pods -o wide',
      'kubectl describe pod -l app=db | tail -n 2',
      'kubectl describe node nodo-2 | grep -A5 Allocated',
    ],
    solution: [
      'kubectl describe pod -l app=db',
      'kubectl set resources deployment db --requests=memory=512Mi',
    ],
    check: { ready: ['tienda deploy/db'] },
    requires: [['describe', 'get']],
  },
  {
    id: 'k8s-exec-debug',
    block: 6,
    tier: 'intermediate',
    kind: 'unit',
    setup: stack(),
    es: {
      title: 'Entrar a mirar',
      goal: 'Trae a tu máquina el /app/config.json de un Pod de la API, como ~/config.json.',
      theory: {
        what: 'kubectl exec ejecuta una orden dentro de un contenedor que corre (como docker exec); kubectl cp copia ficheros entre tu máquina y un Pod. Si la imagen no trae shell (distroless), kubectl debug añade un contenedor efímero con herramientas junto al de la app.',
        how: [
          'kubectl exec deploy/api -- env                        # sus variables',
          'kubectl exec deploy/api -- wget -qO- localhost:3000/health',
          "kubectl exec -it deploy/api -- sh -c 'ls /app'",
          'kubectl cp tienda/<api-…>:/app/config.json ./config.json',
          'kubectl debug <api-…> --image=busybox:1.36 --target=api -- sh -c env',
        ],
        when: 'Para ver lo que ve la app desde dentro: sus variables, sus ficheros, si llega a otro servicio.',
        whenNot:
          'Para arreglar: lo que cambies dentro se pierde cuando se recrea el Pod. El arreglo va a la imagen o al YAML.',
      },
      example: 'Miras las variables de la API, su salud desde dentro y sus ficheros.',
      objectives: { 'file:~/config.json': 'El config.json de la API en ~/config.json' },
    },
    en: {
      title: 'Looking inside',
      goal: 'Bring the /app/config.json of an API Pod to your machine, as ~/config.json.',
      theory: {
        what: 'kubectl exec runs a command inside a running container (like docker exec); kubectl cp copies files between your machine and a Pod. If the image has no shell (distroless), kubectl debug adds an ephemeral container with tools next to the app one.',
        how: [
          'kubectl exec deploy/api -- env                        # its variables',
          'kubectl exec deploy/api -- wget -qO- localhost:3000/health',
          "kubectl exec -it deploy/api -- sh -c 'ls /app'",
          'kubectl cp tienda/<api-…>:/app/config.json ./config.json',
          'kubectl debug <api-…> --image=busybox:1.36 --target=api -- sh -c env',
        ],
        when: 'To see what the app sees from inside: its variables, its files, whether it reaches another service.',
        whenNot:
          'To fix things: whatever you change inside is lost when the Pod is recreated. The fix goes into the image or the YAML.',
      },
      example: 'You look at the API variables, its health from inside and its files.',
      objectives: { 'file:~/config.json': 'The API config.json in ~/config.json' },
    },
    example: [
      'kubectl exec deploy/api -- printenv DATABASE_URL',
      'kubectl exec deploy/api -- wget -qO- localhost:3000/health',
      "kubectl exec deploy/api -- sh -c 'ls /app'",
    ],
    solution: ['kubectl exec deploy/api -- cat /app/config.json > ~/config.json'],
    check: { files: ['~/config.json'] },
  },
  {
    id: 'k8s-red',
    block: 6,
    tier: 'intermediate',
    kind: 'unit',
    setup: stack({ '~/tienda/api.yaml': BROKEN_SVC(API_YAML()) }),
    es: {
      title: 'El Service no llega',
      goal: 'Desde dentro del clúster, api:3000 no contesta. Arregla el Service api para que /health conteste.',
      theory: {
        what: 'Cuando un Service no llega, casi siempre es una de tres: el selector no casa con las etiquetas de los Pods (no hay endpoints), el targetPort no es el puerto en el que escucha el contenedor, o lo buscas desde otro namespace (entonces es api.tienda).',
        how: [
          'kubectl get endpointslices              # <unset>: el selector no casa',
          'kubectl get pods --show-labels          # qué etiquetas tienen',
          'kubectl describe svc api                # Selector, TargetPort y Endpoints',
          'kubectl patch service api -p \'{"spec":{"selector":{"app":"api"}}}\'',
        ],
        when: 'Cada vez que una app dice «connection refused», «timeout» o «could not resolve host» hablando con otra.',
        problems:
          'Desde otro namespace el nombre corto no existe: usa api.tienda o api.tienda.svc.cluster.local.',
      },
      example: 'Miras los endpoints, las etiquetas y el Service, y lo pruebas desde un Pod.',
      objectives: { 'reach:tienda api:3000/health': 'api:3000/health contesta desde dentro' },
    },
    en: {
      title: 'The Service does not connect',
      goal: 'From inside the cluster, api:3000 does not answer. Fix Service api so /health answers.',
      theory: {
        what: 'When a Service does not connect it is nearly always one of three: the selector does not match the Pod labels (no endpoints), the targetPort is not the port the container listens on, or you look for it from another namespace (then it is api.tienda).',
        how: [
          'kubectl get endpointslices              # <unset>: the selector does not match',
          'kubectl get pods --show-labels          # which labels they have',
          'kubectl describe svc api                # Selector, TargetPort and Endpoints',
          'kubectl patch service api -p \'{"spec":{"selector":{"app":"api"}}}\'',
        ],
        when: 'Whenever an app says «connection refused», «timeout» or «could not resolve host» talking to another.',
        problems:
          'From another namespace the short name does not exist: use api.tienda or api.tienda.svc.cluster.local.',
      },
      example: 'You look at the endpoints, the labels and the Service, and try it from a Pod.',
      objectives: { 'reach:tienda api:3000/health': 'api:3000/health answers from inside' },
    },
    example: [
      'kubectl get endpointslices',
      'kubectl get pods --show-labels',
      'kubectl describe svc api',
      'kubectl run tmp --rm -i --image=curlimages/curl:8.10 --restart=Never -- curl -s api:3000/health',
    ],
    solution: [
      'kubectl patch service api -p \'{"spec":{"selector":{"app":"api"},"ports":[{"port":3000,"targetPort":3000}]}}\'',
    ],
    check: { reach: ['tienda api:3000/health'] },
  },
  {
    id: 'k8s-jefe-incidencia',
    block: 6,
    tier: 'intermediate',
    kind: 'boss',
    limit: 300,
    setup: stack({
      '~/tienda/front.yaml': FRONT_YAML('ghcr.io/peer4u/front:1.0').replace(
        'ports: [{port: 80}]',
        'ports: [{port: 80, targetPort: 8080}]',
      ),
    }),
    es: {
      title: 'Incidencia corta',
      goal: 'El front no carga: arréglalo y que localhost:8080/api/health conteste 200.',
      story:
        'Te llega una alerta: «la web de staging no carga». La API y la base de datos están bien. Tienes cinco minutos antes de la reunión.',
      tasks: [
        'Haz que los Pods del front arranquen (mira sus eventos).',
        'Haz que el Service front llegue a ellos (mira su targetPort).',
        'curl localhost:8080/api/health tiene que dar 200 (port-forward al front).',
      ],
      objectives: { 'http:localhost:8080/api/health': 'La web contesta y llega a la API' },
    },
    en: {
      title: 'Quick incident',
      goal: 'The front does not load: fix it and make localhost:8080/api/health answer 200.',
      story:
        'An alert comes in: «the staging site does not load». The API and the database are fine. You have five minutes before the meeting.',
      tasks: [
        'Get the front Pods to start (look at their events).',
        'Make Service front reach them (look at its targetPort).',
        'curl localhost:8080/api/health must give 200 (port-forward to the front).',
      ],
      objectives: { 'http:localhost:8080/api/health': 'The site answers and reaches the API' },
    },
    solution: [
      'kubectl set image deployment/front front=ghcr.io/peer4u/front:1.0.0',
      'kubectl patch service front -p \'{"spec":{"ports":[{"port":80,"targetPort":80}]}}\'',
      'kubectl port-forward svc/front 8080:80',
    ],
    check: { ready: ['tienda deploy/front'], http: ['localhost:8080/api/health'] },
  },
  {
    id: 'k8s-final-intermedio',
    block: 6,
    tier: 'intermediate',
    kind: 'final',
    limit: 900,
    setup: {
      files: {
        '~/tienda/db.yaml': DB_YAML.replace(
          '        envFrom: [{secretRef: {name: db}}]\n',
          '        envFrom: [{secretRef: {name: db}}]\n        resources:\n          requests: {memory: 8Gi}\n',
        ),
        '~/tienda/api.yaml': API_YAML(
          '1.0.0',
          2,
          '        livenessProbe:\n          httpGet: {path: /healthz, port: 3000}\n          initialDelaySeconds: 10\n          periodSeconds: 10\n',
        ).replace('ports: [{port: 3000}]', 'ports: [{port: 3000, targetPort: 8080}]'),
        '~/tienda/front.yaml': FRONT_YAML('ghcr.io/peer4u/front:1.0'),
      },
      run: [
        ...TIENDA,
        'kubectl create secret generic db --from-literal=POSTGRES_PASSWORD=secreto',
        GHCR_SECRET,
        'kubectl apply -f ~/tienda/',
        'mkdir -p ~/informe',
      ],
    },
    es: {
      title: 'Guardia: producción está caída',
      goal: 'Encuentra y arregla los cinco fallos encadenados hasta que localhost:8080/api/health conteste 200, y apunta las causas.',
      story:
        'Examen intermedio. 03:12, te toca la guardia. La tienda está caída entera: el front no arranca, la API se reinicia, la base de datos no tiene sitio… Arréglalo por orden de prioridad, sin borrar el namespace (así no se arregla en producción), y deja escrito qué ha pasado.',
      tasks: [
        'Front: los Pods no descargan la imagen.',
        'API: se cae nada más arrancar (mira qué variable le falta al Secret db: DATABASE_URL=postgres://postgres:secreto@db:5432/peer4u).',
        'Base de datos: se queda en Pending (pide 512Mi).',
        'Service api: no llega a los Pods.',
        'API: una liveness que la mata cada poco (la ruta buena es /health).',
        'localhost:8080/api/health tiene que dar 200 (port-forward al front).',
        'Escribe ~/informe/causas.txt con una línea por causa (al menos cinco).',
      ],
      objectives: {
        'http:localhost:8080/api/health': 'La tienda contesta y llega a la base de datos',
        'probe:causas': 'Cinco causas o más en ~/informe/causas.txt',
      },
    },
    en: {
      title: 'On call: production is down',
      goal: 'Find and fix the five chained failures until localhost:8080/api/health answers 200, and write down the causes.',
      story:
        'Intermediate exam. 03:12, you are on call. The whole shop is down: the front does not start, the API restarts, the database has no room… Fix it in order of priority, without deleting the namespace (that is not how production gets fixed), and write down what happened.',
      tasks: [
        'Front: the Pods cannot pull their image.',
        'API: it dies right after starting (check which variable Secret db is missing: DATABASE_URL=postgres://postgres:secreto@db:5432/peer4u).',
        'Database: it stays Pending (ask for 512Mi).',
        'Service api: it does not reach the Pods.',
        'API: a liveness that keeps killing it (the right path is /health).',
        'localhost:8080/api/health must give 200 (port-forward to the front).',
        'Write ~/informe/causas.txt with one line per cause (at least five).',
      ],
      objectives: {
        'http:localhost:8080/api/health': 'The shop answers and reaches the database',
        'probe:causas': 'Five causes or more in ~/informe/causas.txt',
      },
    },
    solution: [
      'kubectl set image deployment/front front=ghcr.io/peer4u/front:1.0.0',
      `kubectl create secret generic db --from-literal=POSTGRES_PASSWORD=secreto --from-literal=DATABASE_URL=${DB_URL} --dry-run=client -o yaml | kubectl apply -f -`,
      'kubectl set resources deployment db --requests=memory=512Mi',
      'kubectl patch service api -p \'{"spec":{"ports":[{"port":3000,"targetPort":3000}]}}\'',
      'kubectl patch deployment api --type=json -p \'[{"op":"replace","path":"/spec/template/spec/containers/0/livenessProbe/httpGet/path","value":"/health"}]\'',
      'kubectl port-forward svc/front 8080:80',
      "cat > ~/informe/causas.txt <<'EOF'\nfront: etiqueta 1.0 en vez de 1.0.0 (ImagePullBackOff)\napi: al Secret db le faltaba DATABASE_URL (CrashLoopBackOff)\ndb: pedía 8Gi de memoria y no cabía en ningún nodo (Pending)\nsvc api: targetPort 8080 en vez de 3000\napi: liveness a /healthz, que no existe\nEOF",
    ],
    check: {
      ready: ['tienda deploy/front', 'tienda deploy/api', 'tienda deploy/db'],
      http: ['localhost:8080/api/health'],
      probes: { causas: ['test $(wc -l < ~/informe/causas.txt) -ge 5 && echo ok'] },
    },
  },
]
