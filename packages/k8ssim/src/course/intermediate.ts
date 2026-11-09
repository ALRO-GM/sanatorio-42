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
        what: 'Cambiar la imagen de un Deployment sustituye los Pods poco a poco: arranca uno nuevo, espera a que esté listo y quita uno viejo.',
        how: [
          'kubectl set image deployment/api api=ghcr.io/peer4u/api:1.0.1',
          'kubectl annotate deployment/api kubernetes.io/change-cause="sube a 1.0.1"',
          'kubectl rollout status deployment/api    # espera a que acabe',
          'kubectl rollout history deployment/api   # revisiones y su motivo',
        ],
        when: 'En cada despliegue de una versión nueva.',
        whenNot: 'Sin anotar, CHANGE-CAUSE dice «<none>»: nadie sabrá qué trajo cada revisión.',
        problems:
          'Anotar otra vez sin --overwrite: «--overwrite is false but found the following declared annotation(s)», y la revisión nueva hereda el motivo viejo.',
      },
      example:
        'Antes de verlo: subes a 1.0.1 sin anotar nada. ¿Qué dirá CHANGE-CAUSE en rollout history?',
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
        what: 'Changing a Deployment image replaces the Pods bit by bit: it starts a new one, waits until it is ready and removes an old one.',
        how: [
          'kubectl set image deployment/api api=ghcr.io/peer4u/api:1.0.1',
          'kubectl annotate deployment/api kubernetes.io/change-cause="sube a 1.0.1"',
          'kubectl rollout status deployment/api    # waits until done',
          'kubectl rollout history deployment/api   # revisions and why',
        ],
        when: 'On every release of a new version.',
        whenNot:
          'Without an annotation, CHANGE-CAUSE says "<none>": nobody will know what each revision brought.',
        problems:
          'Annotating again without --overwrite: "--overwrite is false but found the following declared annotation(s)", and the new revision inherits the old reason.',
      },
      example:
        'Before you look: you move to 1.0.1 without annotating. What will CHANGE-CAUSE say in rollout history?',
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
        what: 'Si los Pods nuevos no llegan a estar listos, el rolling update se queda a medias y los viejos siguen sirviendo. rollout undo vuelve a la revisión anterior.',
        how: [
          'kubectl rollout status deployment/api --timeout=30s   # no acaba',
          'kubectl rollout undo deployment/api                    # a la anterior',
        ],
        when: 'Cuando una versión rompe producción: vuelves atrás y luego investigas.',
        whenNot:
          'undo cambia el clúster, no el YAML: si el fichero dice 1.1.0, el siguiente apply lo rompe otra vez.',
        problems:
          'Esperar a que se arregle solo: status acaba en «error: timed out waiting for the condition» y el Pod nuevo sigue en «CrashLoopBackOff». Haz undo.',
      },
      example:
        'Antes de verlo: la 1.1.0 no arranca. ¿Cuántos Pods de la 1.0.0 seguirán en Running mientras tanto?',
      objectives: { 'ready:tienda deploy/api': 'La API en 1.0.0, con el rollout terminado' },
    },
    en: {
      title: 'Undo a rollout',
      goal: 'Someone moved the API to 1.1.0 and the new Pods do not start. Go back to the good version (1.0.0) and leave the rollout finished.',
      theory: {
        what: 'If the new Pods never get ready, the rolling update stalls halfway and the old ones keep serving. rollout undo goes back to the previous revision.',
        how: [
          'kubectl rollout status deployment/api --timeout=30s   # does not finish',
          'kubectl rollout undo deployment/api                    # to the previous one',
        ],
        when: 'When a version breaks production: roll back, then investigate.',
        whenNot:
          'undo changes the cluster, not the YAML: if the file says 1.1.0, the next apply breaks it again.',
        problems:
          'Waiting for it to fix itself: status ends with "error: timed out waiting for the condition" and the new Pod stays in "CrashLoopBackOff". Run undo.',
      },
      example:
        'Before you look: 1.1.0 does not start. How many 1.0.0 Pods will still be Running meanwhile?',
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
        what: 'maxSurge dice cuántos Pods de más puede haber al actualizar y maxUnavailable cuántos pueden faltar. Un canary es otro Deployment pequeño que el Service también elige.',
        how: [
          'kubectl patch deployment api -p \'{"spec":{"strategy":{"rollingUpdate":{"maxSurge":1,"maxUnavailable":0}}}}\'',
          'kubectl apply -f api-canary.yaml   # app: api, track: canary',
          'kubectl describe svc api           # Endpoints: 3 + el canary',
        ],
        when: 'maxUnavailable 0 si no sobra capacidad; un canary, para probar con poco tráfico real.',
        whenNot:
          'Recreate para los Pods viejos antes de arrancar los nuevos: hay corte, sin versiones mezcladas.',
        problems:
          'Crear el canary con create deployment api-canary: sus Pods llevan «app=api-canary» y Endpoints sigue con 3 IP. Ponle app: api.',
      },
      example:
        'Antes de verlo: el Service api tiene 3 IP en Endpoints y aplicas un canary con app: api. ¿Cuántas tendrá después?',
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
        what: 'maxSurge says how many extra Pods may exist during an update and maxUnavailable how many may be missing. A canary is another small Deployment the Service also selects.',
        how: [
          'kubectl patch deployment api -p \'{"spec":{"strategy":{"rollingUpdate":{"maxSurge":1,"maxUnavailable":0}}}}\'',
          'kubectl apply -f api-canary.yaml   # app: api, track: canary',
          'kubectl describe svc api           # Endpoints: 3 + the canary',
        ],
        when: 'maxUnavailable 0 without spare capacity; a canary, to try with little real traffic.',
        whenNot:
          'Recreate stops the old Pods before starting new ones: downtime, no mixed versions.',
        problems:
          'Creating the canary with create deployment api-canary: its Pods get "app=api-canary" and Endpoints keeps 3 IPs. Give it app: api.',
      },
      example:
        'Before you look: Service api has 3 IPs in Endpoints and you apply a canary with app: api. How many will it have afterwards?',
      objectives: {
        'get:tienda deploy/api {.spec.strategy.rollingUpdate.maxSurge} {.spec.strategy.rollingUpdate.maxUnavailable}':
          'maxSurge 1 and maxUnavailable 0',
        'ready:tienda deploy/api-canary': 'api-canary on 1.0.2',
        'probe:endpoints': 'Service api spreads over 4 Pods',
      },
    },
    example: [
      "kubectl get deploy api -o jsonpath='{.spec.strategy}'",
      'kubectl describe svc api | grep Endpoints',
      "cat <<'EOF' | kubectl apply -f -\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: api-canary\nspec:\n  replicas: 1\n  selector:\n    matchLabels: {app: api, track: canary}\n  template:\n    metadata:\n      labels: {app: api, track: canary}\n    spec:\n      imagePullSecrets: [{name: ghcr}]\n      containers:\n      - name: api\n        image: ghcr.io/peer4u/api:1.0.2\n        envFrom: [{secretRef: {name: db}}]\nEOF",
      'kubectl get pods -l app=api -L track',
      'kubectl describe svc api | grep Endpoints',
    ],
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
        what: 'kubectl diff enseña qué cambiaría un apply. Un cambio a mano que no está en el YAML es deriva (drift).',
        how: [
          'kubectl diff -f api.yaml    # sale 1 si hay diferencias',
          'kubectl apply -f api.yaml   # el clúster vuelve al fichero',
          'kubectl diff -f api.yaml    # sin salida, y sale 0',
        ],
        when: 'Antes de cada apply en producción.',
        whenNot: 'scale, set y patch cambian el clúster; la verdad es el YAML en git.',
        problems:
          'Arreglar una urgencia con scale y no llevarlo al YAML: diff enseña «-  replicas: 5» y el siguiente apply lo deshace.',
      },
      example:
        'Antes de verlo: alguien escaló la API a 5 y api.yaml dice 3. ¿Qué líneas marcará diff con - y +?',
      objectives: {
        'get:tienda deploy/api {.spec.replicas}': 'La API con las réplicas del YAML',
        'probe:diff': 'kubectl diff ya no encuentra diferencias',
      },
    },
    en: {
      title: 'Truly declarative',
      goal: 'Someone scaled the API by hand and the cluster no longer matches ~/tienda/api.yaml. Go back to what the repository says and check it with kubectl diff.',
      theory: {
        what: 'kubectl diff shows what an apply would change. A manual change missing from the YAML is drift.',
        how: [
          'kubectl diff -f api.yaml    # exits 1 if there are differences',
          'kubectl apply -f api.yaml   # the cluster goes back to the file',
          'kubectl diff -f api.yaml    # no output, exits 0',
        ],
        when: 'Before every apply in production.',
        whenNot: 'scale, set and patch change the cluster; the truth is the YAML in git.',
        problems:
          'Fixing an emergency with scale and not taking it to the YAML: diff shows "-  replicas: 5" and the next apply undoes it.',
      },
      example:
        'Before you look: someone scaled the API to 5 and api.yaml says 3. Which lines will diff mark with - and +?',
      objectives: {
        'get:tienda deploy/api {.spec.replicas}': 'The API with the YAML replicas',
        'probe:diff': 'kubectl diff finds no differences',
      },
    },
    example: [
      'kubectl get deploy api',
      'kubectl diff -f ~/tienda/api.yaml',
      'kubectl apply -f ~/tienda/api.yaml',
      'kubectl diff -f ~/tienda/api.yaml; echo $?',
    ],
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
        what: 'La readinessProbe dice cuándo un Pod puede recibir tráfico: hasta que pasa, no entra en los endpoints del Service. Kubernetes no lee el HEALTHCHECK de la imagen.',
        how: [
          'readinessProbe:',
          '  httpGet: {path: /health, port: 3000}',
          '  periodSeconds: 5',
          'kubectl get pods   # 0/1 hasta que pasa, luego 1/1',
        ],
        when: 'En toda app que tarde en arrancar o dependa de otra (base de datos, caché).',
        whenNot:
          'Una sonda que nunca pasa (puerto o ruta mal) deja el Pod en 0/1 y el rollout sin acabar.',
        problems:
          "Creer que «1/1 Running» es que contesta: sin sonda, el Service le manda tráfico y curl dice «Couldn't connect to server».",
      },
      example:
        'Antes de verlo: la 1.2.0 tarda 20 s en escuchar y no tiene sonda. ¿Qué READY saldrá, y contestará curl?',
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
        what: 'The readinessProbe says when a Pod may get traffic: until it passes, the Pod is not in the Service endpoints. Kubernetes ignores the image HEALTHCHECK.',
        how: [
          'readinessProbe:',
          '  httpGet: {path: /health, port: 3000}',
          '  periodSeconds: 5',
          'kubectl get pods   # 0/1 until it passes, then 1/1',
        ],
        when: 'In any app that is slow to start or depends on another (database, cache).',
        whenNot:
          'A probe that never passes (wrong port or path) leaves the Pod at 0/1 and the rollout unfinished.',
        problems:
          'Thinking "1/1 Running" means it answers: without a probe the Service sends it traffic and curl says "Couldn\'t connect to server".',
      },
      example:
        'Before you look: 1.2.0 takes 20 s to listen and has no probe. What READY will show, and will curl answer?',
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
        what: 'La livenessProbe reinicia un contenedor colgado. La startupProbe da tiempo al arranque: mientras no pasa, la liveness no se mira.',
        how: [
          'startupProbe:',
          '  httpGet: {path: /health, port: 3000}',
          '  failureThreshold: 30   # 30 × 2 s para arrancar',
          '  periodSeconds: 2',
        ],
        when: 'Liveness para lo que se cuelga sin morirse; startup para lo que tarda en arrancar.',
        whenNot:
          'Readiness mal: no llega tráfico. Liveness mal: reinicios en bucle. Y la liveness no depende de la base de datos.',
        problems:
          'Una liveness con poco margen en una app lenta: describe dice «failed liveness probe, will be restarted» y acaba en «CrashLoopBackOff». Añade una startupProbe.',
      },
      example:
        'Antes de verlo: la liveness empieza a los 3 s y la API tarda 20 en escuchar. ¿Qué STATUS tendrán sus Pods?',
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
        what: 'The livenessProbe restarts a hung container. The startupProbe gives start-up time: until it passes, liveness is not checked.',
        how: [
          'startupProbe:',
          '  httpGet: {path: /health, port: 3000}',
          '  failureThreshold: 30   # 30 × 2 s to start',
          '  periodSeconds: 2',
        ],
        when: 'Liveness for what can hang without dying; startup for what is slow to start.',
        whenNot:
          'Bad readiness: no traffic. Bad liveness: restart loop. And liveness must not depend on the database.',
        problems:
          'A tight liveness on a slow app: describe says "failed liveness probe, will be restarted" and it ends in "CrashLoopBackOff". Add a startupProbe.',
      },
      example:
        'Before you look: liveness starts at 3 s and the API takes 20 to listen. What STATUS will its Pods have?',
      objectives: {
        'ready:tienda deploy/api': 'The API stable, no restart loops',
        'get:tienda deploy/api {.spec.template.spec.containers[0].livenessProbe.httpGet.path}':
          'It still has a livenessProbe',
      },
    },
    example: [
      'kubectl get pods -l app=api -w | tail -n 4',
      "kubectl describe pod -l app=api | grep -E 'Unhealthy|Killing' | head -n 2",
    ],
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
        what: 'requests es lo que se reserva para el Pod; limits, el techo. Pasarse de CPU frena; pasarse de memoria mata el contenedor.',
        how: [
          'kubectl describe pod <informes-…>   # Last State y Reason',
          'kubectl set resources deployment informes --requests=cpu=100m,memory=256Mi --limits=memory=384Mi',
          'kubectl top pods                    # lo que usa de verdad',
        ],
        when: 'Siempre en producción: sin límites, un Pod se come el nodo.',
        whenNot:
          'Un OOMKilled también acaba en CrashLoopBackOff; lo que lo distingue es el 137 de describe.',
        problems:
          'Buscar un fallo de la app cuando es memoria: describe dice «Reason: OOMKilled» y «Exit Code: 137». Sube el límite o arregla la fuga.',
      },
      example:
        'Antes de verlo: informes tiene un límite de 128Mi. ¿Qué Reason y qué Exit Code dará describe?',
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
        what: 'requests is what gets reserved for the Pod; limits, the ceiling. Going over CPU slows it down; going over memory kills the container.',
        how: [
          'kubectl describe pod <informes-…>   # Last State and Reason',
          'kubectl set resources deployment informes --requests=cpu=100m,memory=256Mi --limits=memory=384Mi',
          'kubectl top pods                    # what it really uses',
        ],
        when: 'Always in production: without limits, a Pod eats the node.',
        whenNot:
          'An OOMKilled also ends in CrashLoopBackOff; what tells them apart is the 137 in describe.',
        problems:
          'Hunting an app bug when it is memory: describe says "Reason: OOMKilled" and "Exit Code: 137". Raise the limit or fix the leak.',
      },
      example:
        'Before you look: informes has a 128Mi limit. What Reason and Exit Code will describe give?',
      objectives: {
        'ready:tienda deploy/informes': 'informes running without OOMKilled',
        'get:tienda deploy/informes {.spec.template.spec.containers[0].resources.requests.memory} {.spec.template.spec.containers[0].resources.limits.memory}':
          'requests 256Mi and limit 384Mi',
      },
    },
    example: [
      'kubectl get pods -w',
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
        'Cada lunes, con el pico de tráfico, la API se reinicia sin parar (una liveness que la da por muerta a los 3 s, en una app que tarda 20 s en arrancar) y el informe semanal muere por memoria. Hoy es lunes.',
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
        'Every Monday, at the traffic peak, the API restarts non-stop (a liveness that gives up on it after 3 s, on an app that takes 20 s to start) and the weekly report dies of memory. Today is Monday.',
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
        what: 'CrashLoopBackOff: el contenedor arranca, sale con error y Kubernetes espera cada vez más antes de reintentar. La causa suele estar en lo que escribió antes de morir.',
        how: [
          'kubectl get pods                       # STATUS y RESTARTS',
          'kubectl describe pod <api-…>           # Exit Code y eventos',
          'kubectl logs <api-…> --previous        # la vez anterior',
        ],
        when: 'Cuando un Pod no se queda en Running: get, describe y logs.',
        whenNot: 'Si describe dice OOMKilled y 137, no es la app sino la memoria (bloque 5).',
        problems:
          'Reiniciar sin leer: los Pods nuevos vuelven a «CrashLoopBackOff». logs decía «Error: DATABASE_URL is not set» y el Secret guarda DATABASE_ULR.',
      },
      example:
        'Antes de verlo: la API pide DATABASE_URL y el Secret db trae otra clave. ¿Qué dirán sus logs?',
      objectives: { 'ready:tienda deploy/api': 'La API en marcha' },
    },
    en: {
      title: 'CrashLoopBackOff',
      goal: 'The API is in CrashLoopBackOff. Find the cause with the method (get → describe → logs --previous) and fix it.',
      theory: {
        what: 'CrashLoopBackOff: the container starts, exits with an error and Kubernetes waits longer each time before retrying. The cause is usually in what it wrote before dying.',
        how: [
          'kubectl get pods                       # STATUS and RESTARTS',
          'kubectl describe pod <api-…>           # Exit Code and events',
          'kubectl logs <api-…> --previous        # the previous run',
        ],
        when: 'When a Pod does not stay Running: get, describe and logs.',
        whenNot: 'If describe says OOMKilled and 137, it is not the app but memory (block 5).',
        problems:
          'Restarting without reading: the new Pods go back to "CrashLoopBackOff". logs said "Error: DATABASE_URL is not set" and the Secret holds DATABASE_ULR.',
      },
      example:
        'Before you look: the API wants DATABASE_URL and Secret db brings another key. What will its logs say?',
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
        what: 'ErrImagePull e ImagePullBackOff: el nodo no puede bajar la imagen. Los eventos dicen por qué: no existe (NotFound) o falta permiso (401 Unauthorized).',
        how: [
          'kubectl describe pod <front-…>   # Events: Failed to pull image',
          'kubectl get events --sort-by=.lastTimestamp',
          'kubectl set image deployment/front front=ghcr.io/peer4u/front:1.0.0',
        ],
        when: 'Justo después de un despliegue, cuando los Pods nuevos ni arrancan.',
        whenNot:
          '«401 Unauthorized» es otra cosa: la imagen existe pero falta imagePullSecrets o el token está mal.',
        problems:
          'Una etiqueta que no se publicó (1.0 en vez de 1.0.0): el evento dice «code = NotFound». Corrige la etiqueta; no hace falta tocar el Secret.',
      },
      example:
        'Antes de verlo: el front pide ghcr.io/peer4u/front:1.0, que nunca se publicó. ¿Qué code dará el evento?',
      objectives: { 'ready:tienda deploy/front': 'El front descargado y en marcha' },
    },
    en: {
      title: 'ImagePullBackOff and ErrImagePull',
      goal: 'The front does not start: ImagePullBackOff. Read why in the events and fix it.',
      theory: {
        what: 'ErrImagePull and ImagePullBackOff: the node cannot pull the image. Events say why: it does not exist (NotFound) or permission is missing (401 Unauthorized).',
        how: [
          'kubectl describe pod <front-…>   # Events: Failed to pull image',
          'kubectl get events --sort-by=.lastTimestamp',
          'kubectl set image deployment/front front=ghcr.io/peer4u/front:1.0.0',
        ],
        when: 'Right after a release, when the new Pods do not even start.',
        whenNot:
          '"401 Unauthorized" is something else: the image exists but imagePullSecrets is missing or the token is wrong.',
        problems:
          'A tag that was never pushed (1.0 instead of 1.0.0): the event says "code = NotFound". Fix the tag; the Secret needs no change.',
      },
      example:
        'Before you look: front asks for ghcr.io/peer4u/front:1.0, never pushed. What code will the event give?',
      objectives: { 'ready:tienda deploy/front': 'The front pulled and running' },
    },
    example: ['kubectl get pods', 'kubectl get events --sort-by=.lastTimestamp | tail -n 4'],
    solution: [
      'kubectl describe pod -l app=front',
      'kubectl set image deployment/front front=ghcr.io/peer4u/front:1.0.0',
    ],
    check: { ready: ['tienda deploy/front'] },
    requires: [['describe', 'get', 'events']],
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
        what: 'Pending: el planificador no encuentra un nodo donde quepa el Pod. Lo de siempre: pide más CPU o memoria de la que queda libre.',
        how: [
          'kubectl get pods -o wide            # NODE <none>',
          'kubectl describe pod <db-…>         # FailedScheduling',
          'kubectl set resources deployment db --requests=memory=512Mi',
        ],
        when: 'Cuando un Pod nuevo no llega a tener nodo.',
        whenNot:
          'Pending no ha arrancado nunca; CrashLoopBackOff sí arranca y se cae. Uno se mira en describe, el otro en logs.',
        problems:
          'Pedir 8Gi «por si acaso»: el evento dice «0/3 nodes are available: 3 Insufficient memory». Pide lo que usa, con margen.',
      },
      example:
        'Antes de verlo: db pide 8Gi de memoria y los nodos son pequeños. ¿Qué NODE saldrá en get pods -o wide?',
      objectives: { 'ready:tienda deploy/db': 'La base de datos planificada y en marcha' },
    },
    en: {
      title: 'Pods stuck in Pending',
      goal: 'The database stays Pending. Find out why and make it fit (ask for 512Mi of memory).',
      theory: {
        what: 'Pending: the scheduler cannot find a node where the Pod fits. The usual cause: it asks for more CPU or memory than is free.',
        how: [
          'kubectl get pods -o wide            # NODE <none>',
          'kubectl describe pod <db-…>         # FailedScheduling',
          'kubectl set resources deployment db --requests=memory=512Mi',
        ],
        when: 'When a new Pod does not even get a node.',
        whenNot:
          'Pending never started; CrashLoopBackOff starts and falls over. One is read in describe, the other in logs.',
        problems:
          'Asking for 8Gi "just in case": the event says "0/3 nodes are available: 3 Insufficient memory". Ask for what it uses, with margin.',
      },
      example:
        'Before you look: db asks for 8Gi of memory and the nodes are small. What NODE will get pods -o wide show?',
      objectives: { 'ready:tienda deploy/db': 'The database scheduled and running' },
    },
    example: [
      'kubectl get pods -o wide',
      'kubectl describe pod -l app=db | grep FailedScheduling',
      'kubectl describe node nodo-2 | grep -A5 Allocated',
    ],
    solution: [
      'kubectl describe pod -l app=db',
      'kubectl set resources deployment db --requests=memory=512Mi',
    ],
    check: { ready: ['tienda deploy/db'] },
    requires: [['describe', 'get', 'events']],
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
        what: 'kubectl exec ejecuta una orden dentro de un contenedor que corre, como docker exec. Con > detrás, la salida se guarda en tu máquina.',
        how: [
          'kubectl exec deploy/api -- printenv DATABASE_URL',
          "kubectl exec deploy/api -- sh -c 'ls /app'",
          'kubectl exec deploy/api -- cat /app/config.json > config.json',
        ],
        when: 'Para ver lo que ve la app desde dentro: variables y ficheros.',
        whenNot: 'Aquí no hay sesión interactiva (-it): escribe la orden detrás de --.',
        problems:
          'Arreglar dentro con exec: tras un rollout restart, ls /app enseña «config.json package.json server.js», sin nota.txt. Lo que dura va a la imagen o al YAML.',
      },
      example:
        'Antes de verlo: escribes nota.txt dentro de la API y reinicias el Deployment. ¿Seguirá en /app?',
      objectives: { 'file:~/config.json': 'El config.json de la API en ~/config.json' },
    },
    en: {
      title: 'Looking inside',
      goal: 'Bring the /app/config.json of an API Pod to your machine, as ~/config.json.',
      theory: {
        what: 'kubectl exec runs a command inside a running container, like docker exec. With > after it, the output is saved on your machine.',
        how: [
          'kubectl exec deploy/api -- printenv DATABASE_URL',
          "kubectl exec deploy/api -- sh -c 'ls /app'",
          'kubectl exec deploy/api -- cat /app/config.json > config.json',
        ],
        when: 'To see what the app sees from inside: variables and files.',
        whenNot: 'There is no interactive session (-it) here: write the command after --.',
        problems:
          'Fixing things inside with exec: after a rollout restart, ls /app shows "config.json package.json server.js", no nota.txt. What must last goes into the image or the YAML.',
      },
      example:
        'Before you look: you write nota.txt inside the API and restart the Deployment. Will it still be in /app?',
      objectives: { 'file:~/config.json': 'The API config.json in ~/config.json' },
    },
    example: [
      'kubectl exec deploy/api -- printenv DATABASE_URL',
      "kubectl exec deploy/api -- sh -c 'echo x > /app/nota.txt; ls /app'",
      'kubectl rollout restart deployment/api',
      'kubectl rollout status deployment/api',
      'kubectl exec deploy/api -- ls /app',
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
        what: 'Si un Service no llega, casi siempre es una de tres: el selector no casa (sin endpoints), el targetPort no es el del contenedor, o llamas desde otro namespace.',
        how: [
          'kubectl get endpointslices       # <unset>: el selector no casa',
          'kubectl get pods --show-labels   # qué etiquetas tienen',
          'kubectl describe svc api         # Selector y TargetPort',
        ],
        when: 'Cuando una app no llega a otra.',
        whenNot:
          "«Couldn't connect to server» sí encuentra el nombre: falla el selector o el puerto, no el DNS.",
        problems:
          'Desde otro namespace el nombre corto no existe: curl dice «Could not resolve host: api». Usa api.tienda.',
      },
      example:
        'Antes de verlo: el Service elige app=api-v2 y los Pods llevan app=api. ¿Qué ENDPOINTS tendrá?',
      objectives: { 'reach:tienda api:3000/health': 'api:3000/health contesta desde dentro' },
    },
    en: {
      title: 'The Service does not connect',
      goal: 'From inside the cluster, api:3000 does not answer. Fix Service api so /health answers.',
      theory: {
        what: 'When a Service does not reach, it is nearly always one of three: the selector does not match (no endpoints), targetPort is not the container port, or you call from another namespace.',
        how: [
          'kubectl get endpointslices       # <unset>: selector does not match',
          'kubectl get pods --show-labels   # which labels they have',
          'kubectl describe svc api         # Selector and TargetPort',
        ],
        when: 'When an app cannot reach another.',
        whenNot:
          '"Couldn\'t connect to server" does find the name: the selector or the port fails, not DNS.',
        problems:
          'From another namespace the short name does not exist: curl says "Could not resolve host: api". Use api.tienda.',
      },
      example:
        'Before you look: the Service selects app=api-v2 and the Pods carry app=api. What ENDPOINTS will it have?',
      objectives: { 'reach:tienda api:3000/health': 'api:3000/health answers from inside' },
    },
    example: [
      'kubectl get endpointslices',
      'kubectl get pods --show-labels',
      'kubectl describe svc api',
      'kubectl run tmp --rm -i --image=curlimages/curl:8.10 --restart=Never -- curl -s api:3000/health',
      'kubectl create namespace otro',
      'kubectl run tmp -n otro --rm -i --image=curlimages/curl:8.10 --restart=Never -- curl -s api:3000/health',
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
