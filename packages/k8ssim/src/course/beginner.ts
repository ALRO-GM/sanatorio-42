/**
 * Nivel principiante, «Del compose al clúster»: bloques 1 a 3 y su jefe
 * final. Orientarte (contexto, nodos, Pods, YAML, namespaces), desplegar y
 * exponer (Deployment, escalar, labels, Service, port-forward) y configurar
 * (ConfigMap, Secret, registro privado). El examen lleva a Kubernetes el
 * compose del examen del curso de Docker.
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

const WEB_YAML = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  labels: {app: web}
spec:
  replicas: 2
  selector:
    matchLabels: {app: web}
  template:
    metadata:
      labels: {app: web}
    spec:
      containers:
      - name: nginx
        image: nginx:1.27
`

const WEB = {
  files: { '~/tienda/web.yaml': WEB_YAML },
  run: [...TIENDA, 'kubectl apply -f ~/tienda/web.yaml'],
}

export const BEGINNER: Unit[] = [
  /* ---------- Bloque 1: orientarte en el clúster ---------- */
  {
    id: 'k8s-hola',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Hola, clúster',
      goal: 'Guarda en ~/nodos.txt la lista de nodos del clúster tal como la da kubectl get nodes -o name.',
      theory: {
        what: 'Un clúster de Kubernetes son unas máquinas (nodos) que ejecutan tus contenedores y un plano de control que decide dónde va cada cosa y vigila que se cumpla. kubectl habla con ese plano de control; a qué clúster y con qué usuario lo dice el contexto de tu kubeconfig.',
        how: [
          'kubectl config get-contexts      # a qué clústeres puedes hablar (el * es el actual)',
          'kubectl cluster-info             # dónde está el plano de control',
          'kubectl get nodes -o wide        # los nodos, con su IP y versión',
          'kubectl api-resources | head     # los tipos de objeto que conoce',
        ],
        when: 'Lo primero al llegar a un clúster o a un equipo: saber dónde estás antes de tocar nada.',
        problems:
          'El error más caro es el contexto equivocado: un kubectl delete en producción creyendo que era staging. Mira siempre el contexto (aquí hay staging y produccion).',
      },
      example:
        'Miras los contextos, dónde está el plano de control, los nodos y unos cuantos tipos de objeto.',
      objectives: { 'file:~/nodos.txt': 'Los nodos, en ~/nodos.txt' },
    },
    en: {
      title: 'Hello, cluster',
      goal: 'Save the list of cluster nodes in ~/nodos.txt, exactly as kubectl get nodes -o name prints it.',
      theory: {
        what: 'A Kubernetes cluster is a set of machines (nodes) that run your containers plus a control plane that decides where everything goes and keeps it that way. kubectl talks to that control plane; which cluster and which user is set by the context in your kubeconfig.',
        how: [
          'kubectl config get-contexts      # clusters you can talk to (* is the current one)',
          'kubectl cluster-info             # where the control plane is',
          'kubectl get nodes -o wide        # the nodes, with IP and version',
          'kubectl api-resources | head     # the object types it knows',
        ],
        when: 'First thing when you join a cluster or a team: know where you are before touching anything.',
        problems:
          'The most expensive mistake is the wrong context: a kubectl delete in production thinking it was staging. Always check the context (here there are staging and produccion).',
      },
      example:
        'You look at the contexts, where the control plane is, the nodes and a few object types.',
      objectives: { 'file:~/nodos.txt': 'The nodes, in ~/nodos.txt' },
    },
    example: [
      'kubectl config get-contexts',
      'kubectl cluster-info',
      'kubectl get nodes -o wide',
      'kubectl api-resources | head -n 6',
    ],
    solution: ['kubectl get nodes -o name > ~/nodos.txt'],
    check: { files: ['~/nodos.txt'] },
  },
  {
    id: 'k8s-pods',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    setup: { run: ['kubectl run prueba --image=nginx:1.27-alpine'] },
    es: {
      title: 'Tu primer Pod',
      goal: 'Arranca un Pod llamado web con nginx:1.27 y borra el Pod prueba, que ya no se usa.',
      theory: {
        what: 'El Pod es la unidad mínima de Kubernetes: uno o varios contenedores que comparten red (la misma IP) y volúmenes y van siempre juntos al mismo nodo. kubectl run crea uno suelto.',
        how: [
          'kubectl run web --image=nginx:1.27   # crea el Pod',
          'kubectl get pods -o wide             # su estado, IP y nodo',
          'kubectl describe pod web             # todo lo que sabe de él, con eventos',
          'kubectl logs web                     # lo que escribe el contenedor',
          'kubectl delete pod web               # y nadie lo vuelve a crear',
        ],
        when: 'Para probar algo rápido (una imagen, una conexión) y entender qué hay debajo de todo lo demás.',
        whenNot:
          'Para una app de verdad: un Pod suelto que se borra o cuyo nodo se cae no vuelve. Para eso está el Deployment (bloque 2).',
        problems:
          'En Docker era docker run; aquí la imagen tiene que estar en un registro al que llegue el clúster, no en tu portátil.',
      },
      example: 'Arrancas un Pod de prueba, lo miras con get y logs y lo borras.',
    },
    en: {
      title: 'Your first Pod',
      goal: 'Start a Pod called web with nginx:1.27 and delete the Pod prueba, which is no longer used.',
      theory: {
        what: 'The Pod is the smallest unit in Kubernetes: one or more containers that share the network (the same IP) and volumes and always land together on the same node. kubectl run creates a standalone one.',
        how: [
          'kubectl run web --image=nginx:1.27   # create the Pod',
          'kubectl get pods -o wide             # its status, IP and node',
          'kubectl describe pod web             # everything it knows, with events',
          'kubectl logs web                     # what the container writes',
          'kubectl delete pod web               # and nobody creates it again',
        ],
        when: 'To try something quickly (an image, a connection) and to understand what sits under everything else.',
        whenNot:
          'For a real app: a standalone Pod that gets deleted, or whose node dies, does not come back. That is what Deployments are for (block 2).',
        problems:
          'In Docker it was docker run; here the image must be in a registry the cluster can reach, not on your laptop.',
      },
      example: 'You start a test Pod, look at it with get and logs, and delete it.',
    },
    example: [
      'kubectl run demo --image=nginx:1.27-alpine',
      'kubectl get pods -o wide',
      'kubectl logs demo',
      'kubectl delete pod demo',
      'kubectl get pods',
    ],
    solution: ['kubectl run web --image=nginx:1.27', 'kubectl delete pod prueba'],
    check: { ready: ['default pod/web'], gone: ['default pod/prueba'] },
  },
  {
    id: 'k8s-yaml',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Manifiestos YAML',
      goal: 'Crea el Pod web (nginx:1.27) desde un manifiesto ~/pod.yaml, con la etiqueta equipo=tienda, aplicándolo con kubectl apply.',
      theory: {
        what: 'Un manifiesto describe el estado que quieres (no los pasos): apiVersion, kind, metadata (nombre, etiquetas) y spec. kubectl apply -f se lo da al clúster y él se encarga de que se cumpla. Es lo que se guarda en el repositorio.',
        how: [
          'kubectl run web --image=nginx:1.27 --dry-run=client -o yaml > pod.yaml   # un borrador',
          'kubectl explain pod.spec.containers     # qué campos hay',
          "cat > pod.yaml <<'EOF'                  # o escribirlo a mano",
          'kubectl apply -f pod.yaml               # crear o actualizar',
          'kubectl get pod web -o yaml             # cómo ha quedado (con lo que pone el servidor)',
        ],
        when: 'Siempre que algo tenga que durar: lo que está en un YAML en git se puede revisar, repetir y deshacer.',
        problems:
          'La sangría importa (espacios, nunca tabuladores). Lee el error: si el YAML está mal formado, dice la línea (yaml: line 8); si falta un campo o no vale, dice cuál (spec.containers[0].image).',
      },
      example:
        'Generas un borrador con --dry-run, miras los campos con explain y aplicas un manifiesto escrito a mano.',
      objectives: {
        'get:default pod/web {.metadata.labels.equipo}': 'El Pod web lleva equipo=tienda',
      },
    },
    en: {
      title: 'YAML manifests',
      goal: 'Create the Pod web (nginx:1.27) from a manifest ~/pod.yaml, labelled equipo=tienda, applying it with kubectl apply.',
      theory: {
        what: 'A manifest describes the state you want (not the steps): apiVersion, kind, metadata (name, labels) and spec. kubectl apply -f hands it to the cluster, which makes it happen. It is what lives in the repository.',
        how: [
          'kubectl run web --image=nginx:1.27 --dry-run=client -o yaml > pod.yaml   # a draft',
          'kubectl explain pod.spec.containers     # which fields exist',
          "cat > pod.yaml <<'EOF'                  # or write it by hand",
          'kubectl apply -f pod.yaml               # create or update',
          'kubectl get pod web -o yaml             # how it ended up (with what the server adds)',
        ],
        when: 'Whenever something must last: what is in a YAML file in git can be reviewed, repeated and undone.',
        problems:
          'Indentation matters (spaces, never tabs). Read the error: if the YAML is malformed it gives the line (yaml: line 8); if a field is missing or invalid it names it (spec.containers[0].image).',
      },
      example:
        'You generate a draft with --dry-run, look at the fields with explain and apply a manifest written by hand.',
      objectives: {
        'get:default pod/web {.metadata.labels.equipo}': 'Pod web is labelled equipo=tienda',
      },
    },
    example: [
      'kubectl run demo --image=nginx:1.27 --dry-run=client -o yaml',
      'kubectl explain pod.spec.containers',
      "cat > demo.yaml <<'EOF'\napiVersion: v1\nkind: Pod\nmetadata:\n  name: demo\n  labels: {app: demo}\nspec:\n  containers:\n  - name: nginx\n    image: nginx:1.27-alpine\nEOF",
      'kubectl apply -f demo.yaml',
    ],
    solution: [
      'kubectl run web --image=nginx:1.27 --labels=run=web,equipo=tienda --dry-run=client -o yaml > ~/pod.yaml',
      'kubectl apply -f ~/pod.yaml',
    ],
    check: { ready: ['default pod/web'], get: ['default pod/web {.metadata.labels.equipo}'] },
    requires: [['apply']],
  },
  {
    id: 'k8s-namespaces',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Namespaces y contexto',
      goal: 'Crea el namespace tienda, arranca en él un Pod web con nginx:1.27 y deja kubectl apuntando a tienda.',
      theory: {
        what: 'Un namespace separa objetos de un mismo clúster (por equipo o por entorno): los nombres solo tienen que ser únicos dentro de él. Cada orden va al namespace del contexto, salvo que pongas -n.',
        how: [
          'kubectl get ns                               # los que hay',
          'kubectl create namespace tienda',
          'kubectl run web --image=nginx:1.27 -n tienda',
          'kubectl get pods -A                          # en todos los namespaces',
          'kubectl config set-context --current --namespace=tienda   # el de por defecto',
        ],
        when: 'Para que cada equipo o app tenga lo suyo y no os piséis nombres, cuotas ni permisos.',
        problems:
          '«No resources found» casi siempre es que miras en el namespace que no toca: prueba con -A.',
      },
      example: 'Creas un namespace de pruebas, arrancas algo en él con -n y lo ves con -A.',
    },
    en: {
      title: 'Namespaces and context',
      goal: 'Create the namespace tienda, start a Pod web with nginx:1.27 in it and leave kubectl pointing at tienda.',
      theory: {
        what: 'A namespace separates objects in the same cluster (per team or environment): names only have to be unique inside it. Every command goes to the context namespace unless you pass -n.',
        how: [
          'kubectl get ns                               # the existing ones',
          'kubectl create namespace tienda',
          'kubectl run web --image=nginx:1.27 -n tienda',
          'kubectl get pods -A                          # in every namespace',
          'kubectl config set-context --current --namespace=tienda   # the default one',
        ],
        when: 'So each team or app has its own space and you do not step on names, quotas or permissions.',
        problems:
          '«No resources found» nearly always means you are looking in the wrong namespace: try -A.',
      },
      example: 'You create a test namespace, start something in it with -n and see it with -A.',
    },
    example: [
      'kubectl get ns',
      'kubectl create namespace pruebas',
      'kubectl run demo --image=nginx:1.27-alpine -n pruebas',
      'kubectl get pods',
      'kubectl get pods -A',
    ],
    solution: [
      'kubectl create namespace tienda',
      'kubectl run web --image=nginx:1.27 -n tienda',
      'kubectl config set-context --current --namespace=tienda',
    ],
    check: { ready: ['tienda pod/web'], context: true },
  },
  {
    id: 'k8s-jefe-primer-dia',
    block: 1,
    tier: 'beginner',
    kind: 'boss',
    limit: 240,
    setup: {
      run: [
        'kubectl create namespace tienda',
        'kubectl create namespace pagos',
        'kubectl create namespace analitica',
        'kubectl run web --image=nginx:1.27 -n tienda',
        'kubectl run pagos --image=redis:7 -n pagos',
        'kubectl run cuadros --image=nginx:1.27-alpine -n analitica',
        'kubectl run prueba-de-alguien --image=nginx:1.27-alpine',
        'kubectl run otra-cosa --image=nginx:1.27-alpine',
        'mkdir -p ~/informe',
      ],
    },
    es: {
      title: 'Primer día en el equipo de plataforma',
      goal: 'Encuentra el Pod pagos, guarda su registro, limpia default sin romper nada y apunta a tienda.',
      story:
        'Primer día. Te pasan el kubeconfig de staging y un mensaje: «el Pod pagos hace cosas raras; mira sus registros. Y alguien dejó un Pod de prueba en default, quítalo». Nadie recuerda en qué namespace está pagos.',
      tasks: [
        'Averigua en qué namespace está el Pod pagos.',
        'Guarda sus 10 últimas líneas de registro en ~/informe/pagos.log.',
        'Borra el Pod prueba-de-alguien de default (otra-cosa se queda).',
        'Deja el contexto apuntando al namespace tienda.',
      ],
      objectives: {
        'gone:default pod/prueba-de-alguien': 'prueba-de-alguien ya no está',
        'ready:default pod/otra-cosa': 'otra-cosa sigue corriendo',
      },
    },
    en: {
      title: 'First day in the platform team',
      goal: 'Find Pod pagos, save its log, clean up default without breaking anything and point at tienda.',
      story:
        'First day. You get the staging kubeconfig and a message: «Pod pagos is acting weird; check its logs. And someone left a test Pod in default, remove it». Nobody remembers which namespace pagos is in.',
      tasks: [
        'Find out which namespace Pod pagos lives in.',
        'Save its last 10 log lines in ~/informe/pagos.log.',
        'Delete Pod prueba-de-alguien from default (otra-cosa stays).',
        'Leave the context pointing at namespace tienda.',
      ],
      objectives: {
        'gone:default pod/prueba-de-alguien': 'prueba-de-alguien is gone',
        'ready:default pod/otra-cosa': 'otra-cosa is still running',
      },
    },
    solution: [
      'kubectl get pods -A',
      'kubectl logs pagos -n pagos --tail=10 > ~/informe/pagos.log',
      'kubectl delete pod prueba-de-alguien',
      'kubectl config set-context --current --namespace=tienda',
    ],
    check: {
      files: ['~/informe/pagos.log'],
      gone: ['default pod/prueba-de-alguien'],
      ready: ['default pod/otra-cosa'],
      context: true,
    },
  },

  /* ---------- Bloque 2: desplegar y exponer ---------- */
  {
    id: 'k8s-deployment',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    setup: { run: TIENDA },
    es: {
      title: 'Deployments: que se cuide solo',
      goal: 'Despliega web (nginx:1.27) con 2 réplicas en tienda, con un Deployment.',
      theory: {
        what: 'Un Deployment dice «quiero N copias de este Pod» y un controlador lo cumple siempre: crea un ReplicaSet, que crea los Pods, y si uno muere o lo borras, pone otro. Es la reconciliación: el estado real va solo hacia el deseado.',
        how: [
          'kubectl create deployment web --image=nginx:1.27 --replicas=2',
          'kubectl get deploy,rs,pods        # quién crea qué',
          'kubectl delete pod <uno>          # y vuelve a haber 2',
        ],
        when: 'Para cualquier app sin estado (webs, APIs): es lo que se usa en el día a día, no los Pods sueltos.',
        problems:
          'Los Pods de un Deployment cambian de nombre y de IP cada vez que se recrean: nunca apuntes a uno a mano (para eso están los Services).',
      },
      example: 'Creas un Deployment de prueba, borras uno de sus Pods y ves cómo vuelve.',
      objectives: { 'ready:tienda deploy/web': 'web con sus 2 réplicas listas' },
    },
    en: {
      title: 'Deployments: let it look after itself',
      goal: 'Deploy web (nginx:1.27) with 2 replicas in tienda, using a Deployment.',
      theory: {
        what: 'A Deployment says «I want N copies of this Pod» and a controller keeps it true: it creates a ReplicaSet, which creates the Pods, and if one dies or you delete it, it starts another. That is reconciliation: the real state moves on its own towards the desired one.',
        how: [
          'kubectl create deployment web --image=nginx:1.27 --replicas=2',
          'kubectl get deploy,rs,pods        # who creates what',
          'kubectl delete pod <one>          # and there are 2 again',
        ],
        when: 'For any stateless app (websites, APIs): it is what you use every day, not standalone Pods.',
        problems:
          'Deployment Pods change name and IP every time they are recreated: never point at one by hand (that is what Services are for).',
      },
      example: 'You create a test Deployment, delete one of its Pods and watch it come back.',
      objectives: { 'ready:tienda deploy/web': 'web with its 2 replicas ready' },
    },
    example: [
      'kubectl create deployment demo --image=nginx:1.27-alpine --replicas=2',
      'kubectl get deploy,rs,pods',
      'kubectl delete pod $(kubectl get pods -l app=demo -o name | head -n 1 | cut -d/ -f2)',
      'kubectl get pods',
    ],
    solution: ['kubectl create deployment web --image=nginx:1.27 --replicas=2'],
    check: { ready: ['tienda deploy/web'] },
  },
  {
    id: 'k8s-escalar',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    setup: WEB,
    es: {
      title: 'Escalar',
      goal: 'Deja web con 3 réplicas en el clúster y también en ~/tienda/web.yaml (el fichero del repositorio).',
      theory: {
        what: 'Escalar es cambiar el número de réplicas. Se puede hacer al momento (kubectl scale) o cambiando el YAML y aplicándolo. Kubernetes reparte los Pods entre los nodos.',
        how: [
          'kubectl scale deployment web --replicas=4   # al momento',
          'kubectl get pods -o wide                     # repartidos por nodos',
          "sed -i 's/replicas: 2/replicas: 3/' web.yaml",
          'kubectl apply -f web.yaml                    # lo del repositorio manda',
        ],
        when: 'Cuando llega más tráfico (o menos) y no hay un autoescalado (bloque 8).',
        problems:
          'Si escalas solo a mano, el siguiente apply del YAML del repositorio lo deja como estaba: el cambio tiene que ir al fichero.',
      },
      example:
        'Escalas web a 4 con scale, ves los Pods repartidos y vuelves a lo del fichero con apply.',
      objectives: {
        'get:tienda deploy/web {.spec.replicas}': 'web con 3 réplicas',
        'probe:repo': 'web.yaml dice replicas: 3 y coincide con el clúster',
      },
    },
    en: {
      title: 'Scaling',
      goal: 'Leave web with 3 replicas in the cluster and also in ~/tienda/web.yaml (the repository file).',
      theory: {
        what: 'Scaling means changing the number of replicas. You can do it on the spot (kubectl scale) or by changing the YAML and applying it. Kubernetes spreads the Pods across the nodes.',
        how: [
          'kubectl scale deployment web --replicas=4   # on the spot',
          'kubectl get pods -o wide                     # spread across nodes',
          "sed -i 's/replicas: 2/replicas: 3/' web.yaml",
          'kubectl apply -f web.yaml                    # the repository wins',
        ],
        when: 'When more (or less) traffic arrives and there is no autoscaler (block 8).',
        problems:
          'If you only scale by hand, the next apply of the repository YAML puts it back: the change has to go into the file.',
      },
      example:
        'You scale web to 4 with scale, see the Pods spread out and go back to the file with apply.',
      objectives: {
        'get:tienda deploy/web {.spec.replicas}': 'web with 3 replicas',
        'probe:repo': 'web.yaml says replicas: 3 and matches the cluster',
      },
    },
    example: [
      'kubectl scale deployment web --replicas=4',
      'kubectl get pods -o wide',
      'kubectl apply -f ~/tienda/web.yaml',
      'kubectl get deploy web',
    ],
    solution: [
      "sed -i 's/replicas: 2/replicas: 3/' ~/tienda/web.yaml",
      'kubectl apply -f ~/tienda/web.yaml',
    ],
    check: {
      get: ['tienda deploy/web {.spec.replicas}'],
      probes: {
        repo: [
          "grep -c 'replicas: 3' ~/tienda/web.yaml",
          'kubectl diff -f ~/tienda/web.yaml > /dev/null',
        ],
      },
    },
  },
  {
    id: 'k8s-labels',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    setup: WEB,
    es: {
      title: 'Labels y selectores',
      goal: 'Saca un Pod de web del Deployment para investigarlo: quítale la etiqueta app y ponle investigar=si. web tiene que seguir con 2 Pods.',
      theory: {
        what: 'Las etiquetas (labels) son pares clave=valor en los objetos, y los selectores eligen por ellas. Todo se une así: el ReplicaSet cuenta los Pods que casan con su selector y el Service manda tráfico a los que casan con el suyo.',
        how: [
          'kubectl get pods --show-labels',
          'kubectl get pods -l app=web             # filtrar',
          'kubectl label pod <uno> investigar=si   # poner',
          'kubectl label pod <uno> app-            # quitar (el - del final)',
          'kubectl get pods -L app                 # una columna con su valor',
        ],
        when: 'Para filtrar (por app, versión o equipo) y para apartar un Pod que falla sin borrarlo: deja de recibir tráfico y el ReplicaSet crea otro.',
        problems:
          'Cambiar las etiquetas de la plantilla de un Deployment no vale: el selector no se puede cambiar una vez creado.',
      },
      example: 'Miras las etiquetas, filtras con -l y ves la columna de app con -L.',
      objectives: {
        'probe:apartado': 'Un Pod con investigar=si, fuera de web',
        'ready:tienda deploy/web': 'web sigue con 2 Pods listos',
      },
    },
    en: {
      title: 'Labels and selectors',
      goal: 'Take one web Pod out of the Deployment to investigate it: remove its app label and add investigar=si. web must still have 2 Pods.',
      theory: {
        what: 'Labels are key=value pairs on objects, and selectors pick by them. That is how everything is tied together: the ReplicaSet counts the Pods matching its selector and the Service sends traffic to the ones matching its own.',
        how: [
          'kubectl get pods --show-labels',
          'kubectl get pods -l app=web             # filter',
          'kubectl label pod <one> investigar=si   # add',
          'kubectl label pod <one> app-            # remove (the trailing -)',
          'kubectl get pods -L app                 # a column with its value',
        ],
        when: 'To filter (by app, version or team) and to set a failing Pod aside without deleting it: it stops getting traffic and the ReplicaSet starts another.',
        problems:
          'Changing the labels in a Deployment template does not work: the selector cannot change once created.',
      },
      example: 'You look at the labels, filter with -l and see the app column with -L.',
      objectives: {
        'probe:apartado': 'One Pod with investigar=si, out of web',
        'ready:tienda deploy/web': 'web still has 2 ready Pods',
      },
    },
    example: [
      'kubectl get pods --show-labels',
      'kubectl get pods -l app=web',
      'kubectl get pods -L app',
    ],
    solution: [
      'kubectl label $(kubectl get pods -l app=web -o name | head -n 1) app- investigar=si',
    ],
    check: {
      ready: ['tienda deploy/web'],
      probes: {
        apartado: [
          'kubectl get pods -l investigar=si,!app --no-headers | wc -l',
          'kubectl get pods -l app=web --no-headers | wc -l',
        ],
      },
    },
  },
  {
    id: 'k8s-service',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    setup: WEB,
    es: {
      title: 'Services y DNS',
      goal: 'Crea un Service web en el puerto 80 para que, desde cualquier Pod de tienda, curl web conteste nginx.',
      theory: {
        what: 'Un Service da un nombre y una IP fijos a unos Pods que cambian: reparte el tráfico entre los que casan con su selector y están listos (sus endpoints). Dentro del clúster se llega por DNS: web, web.tienda o web.tienda.svc.cluster.local. Es lo que en Compose era el nombre del servicio.',
        how: [
          'kubectl expose deployment web --port=80              # ClusterIP, el de por defecto',
          'kubectl get svc,endpointslices                       # la IP y los Pods detrás',
          'kubectl run tmp --rm -i --image=curlimages/curl:8.10 --restart=Never -- curl -s web',
        ],
        when: 'Siempre que algo tenga que llegar a tus Pods: otra app del clúster, un Ingress o tú con port-forward.',
        problems:
          'port es el puerto del Service; targetPort, el del contenedor (si no lo pones, el mismo). Un Service sin endpoints casi siempre es un selector que no casa.',
      },
      example:
        'Expones web en el 8080 apuntando al 80, miras sus endpoints y lo pruebas desde un Pod de curl.',
      objectives: { 'reach:tienda web/': 'Desde tienda, curl web contesta nginx' },
    },
    en: {
      title: 'Services and DNS',
      goal: 'Create a Service web on port 80 so that, from any Pod in tienda, curl web answers with nginx.',
      theory: {
        what: 'A Service gives a stable name and IP to Pods that come and go: it spreads traffic across the ones that match its selector and are ready (its endpoints). Inside the cluster you reach it through DNS: web, web.tienda or web.tienda.svc.cluster.local. It is what the service name was in Compose.',
        how: [
          'kubectl expose deployment web --port=80              # ClusterIP, the default',
          'kubectl get svc,endpointslices                       # the IP and the Pods behind it',
          'kubectl run tmp --rm -i --image=curlimages/curl:8.10 --restart=Never -- curl -s web',
        ],
        when: 'Whenever something has to reach your Pods: another app in the cluster, an Ingress or you with port-forward.',
        problems:
          'port is the Service port; targetPort, the container one (same by default). A Service without endpoints is nearly always a selector that does not match.',
      },
      example:
        'You expose web on 8080 pointing to 80, look at its endpoints and try it from a curl Pod.',
      objectives: { 'reach:tienda web/': 'From tienda, curl web answers with nginx' },
    },
    example: [
      'kubectl expose deployment web --name=demo --port=8080 --target-port=80',
      'kubectl get svc,endpointslices',
      'kubectl run tmp --rm -i --image=curlimages/curl:8.10 --restart=Never -- curl -s demo:8080',
    ],
    solution: ['kubectl expose deployment web --port=80'],
    check: { reach: ['tienda web/'], exists: ['tienda svc/web'] },
  },
  {
    id: 'k8s-port-forward',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    setup: { files: WEB.files, run: [...WEB.run, 'kubectl expose deployment web --port=80'] },
    es: {
      title: 'Llegar desde tu máquina',
      goal: 'Haz que curl localhost:8080 en tu máquina conteste el nginx de web y crea además un Service web-np de tipo NodePort.',
      theory: {
        what: 'Un ClusterIP solo se ve desde dentro. Para probar desde tu máquina, kubectl port-forward abre un túnel a un Pod (con svc/ o deploy/, a uno de sus Pods). NodePort abre el mismo puerto (30000–32767) en todos los nodos; LoadBalancer pide una IP pública al proveedor.',
        how: [
          'kubectl port-forward svc/web 8080:80     # tu 8080 → el 80 del Service',
          'curl localhost:8080',
          'kubectl expose deployment web --name=web-np --type=NodePort --port=80',
          'kubectl get svc web-np                   # PORT(S) 80:3xxxx/TCP',
        ],
        when: 'port-forward para depurar o probar algo tuyo; NodePort en un clúster de pruebas; para producción, un Ingress (bloque 8).',
        whenNot:
          'port-forward no es para dar servicio: vive mientras la orden sigue abierta (aquí se queda en segundo plano).',
      },
      example: 'Abres un port-forward al Deployment (a uno de sus Pods) y lo pruebas con curl.',
      objectives: {
        'http:localhost:8080/': 'localhost:8080 contesta nginx',
        'get:tienda svc/web-np {.spec.type}': 'web-np es NodePort',
      },
    },
    en: {
      title: 'Reaching it from your machine',
      goal: "Make curl localhost:8080 on your machine answer with web's nginx and also create a NodePort Service called web-np.",
      theory: {
        what: 'A ClusterIP is only visible from inside. To try it from your machine, kubectl port-forward opens a tunnel to a Pod (with svc/ or deploy/, to one of its Pods). NodePort opens the same port (30000–32767) on every node; LoadBalancer asks the provider for a public IP.',
        how: [
          'kubectl port-forward svc/web 8080:80     # your 8080 → the Service 80',
          'curl localhost:8080',
          'kubectl expose deployment web --name=web-np --type=NodePort --port=80',
          'kubectl get svc web-np                   # PORT(S) 80:3xxxx/TCP',
        ],
        when: 'port-forward to debug or try your own thing; NodePort in a test cluster; for production, an Ingress (block 8).',
        whenNot:
          'port-forward is not for serving traffic: it lives while the command stays open (here it stays in the background).',
      },
      example: 'You open a port-forward to the Deployment (one of its Pods) and try it with curl.',
      objectives: {
        'http:localhost:8080/': 'localhost:8080 answers with nginx',
        'get:tienda svc/web-np {.spec.type}': 'web-np is a NodePort',
      },
    },
    example: [
      'kubectl port-forward deploy/web 9090:80',
      'curl -s localhost:9090',
      'kubectl get svc',
    ],
    solution: [
      'kubectl port-forward svc/web 8080:80',
      'kubectl expose deployment web --name=web-np --type=NodePort --port=80',
    ],
    check: { http: ['localhost:8080/'], get: ['tienda svc/web-np {.spec.type}'] },
  },
  {
    id: 'k8s-jefe-sube-el-front',
    block: 2,
    tier: 'beginner',
    kind: 'boss',
    limit: 300,
    setup: {
      run: [
        ...TIENDA,
        GHCR_SECRET,
        'kubectl create service clusterip front --tcp=80:80 && kubectl patch service front -p \'{"spec":{"selector":{"app":"frontend"}}}\'',
      ],
    },
    es: {
      title: 'Sube el frontend',
      goal: 'El frontend del curso de Docker, desplegado con 2 réplicas, detrás del Service front y contestando en tu localhost:8080.',
      story:
        'La imagen ghcr.io/peer4u/front:1.0.0 (la que publicaste en el curso de Docker) tiene que estar en staging antes de la demo. El Secret del registro, ghcr, ya está. Y alguien dejó un Service front a medias: no tiene endpoints.',
      tasks: [
        'Despliega ghcr.io/peer4u/front:1.0.0 como front, con 2 réplicas y imagePullSecrets ghcr.',
        'Arregla el Service front para que llegue a esos Pods (mira su selector).',
        'Haz que curl localhost:8080 enseñe el front (port-forward).',
      ],
      objectives: {
        'ready:tienda deploy/front': 'front con 2 réplicas listas',
        'http:localhost:8080/': 'localhost:8080 enseña el front',
      },
    },
    en: {
      title: 'Ship the frontend',
      goal: 'The Docker course frontend, deployed with 2 replicas, behind Service front and answering on your localhost:8080.',
      story:
        'Image ghcr.io/peer4u/front:1.0.0 (the one you pushed in the Docker course) has to be in staging before the demo. The registry Secret, ghcr, is already there. And someone left a half-done Service front: it has no endpoints.',
      tasks: [
        'Deploy ghcr.io/peer4u/front:1.0.0 as front, with 2 replicas and imagePullSecrets ghcr.',
        'Fix Service front so it reaches those Pods (look at its selector).',
        'Make curl localhost:8080 show the front (port-forward).',
      ],
      objectives: {
        'ready:tienda deploy/front': 'front with 2 ready replicas',
        'http:localhost:8080/': 'localhost:8080 shows the front',
      },
    },
    solution: [
      'kubectl create deployment front --image=ghcr.io/peer4u/front:1.0.0 --replicas=2',
      'kubectl patch deployment front -p \'{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ghcr"}]}}}}\'',
      'kubectl patch service front -p \'{"spec":{"selector":{"app":"front"}}}\'',
      'kubectl port-forward svc/front 8080:80',
    ],
    check: { ready: ['tienda deploy/front'], http: ['localhost:8080/'] },
  },

  /* ---------- Bloque 3: configurar la aplicación ---------- */
  {
    id: 'k8s-configmap',
    block: 3,
    tier: 'beginner',
    kind: 'unit',
    setup: stack(),
    es: {
      title: 'ConfigMaps',
      goal: 'Crea el ConfigMap api-config con LOG_LEVEL=info y PORT=3000 y haz que la API lo lea como variables de entorno.',
      theory: {
        what: 'Un ConfigMap guarda configuración fuera de la imagen (pares clave-valor o ficheros enteros) para que la misma imagen valga en todos los entornos. Un Pod lo lee como variables (env, envFrom) o montado como ficheros. Es el environment: de Compose.',
        how: [
          'kubectl create configmap api-config --from-literal=LOG_LEVEL=info --from-literal=PORT=3000',
          'kubectl create configmap nginx-conf --from-file=default.conf    # un fichero entero',
          'kubectl set env deployment/api --from=configmap/api-config      # o envFrom en el YAML',
          'kubectl exec deploy/api -- env | grep LOG_LEVEL',
        ],
        when: 'Para lo que cambia entre entornos y no es secreto: niveles de log, URLs de otros servicios, opciones.',
        problems:
          'Cambiar un ConfigMap no reinicia los Pods: las variables se leen al arrancar (kubectl rollout restart deployment/api).',
      },
      example: 'Creas un ConfigMap con dos valores, lo miras en YAML y en describe.',
      objectives: {
        'exec:tienda deploy/api printenv LOG_LEVEL': 'La API ve LOG_LEVEL=info',
        'exists:tienda cm/api-config': 'El ConfigMap api-config',
      },
    },
    en: {
      title: 'ConfigMaps',
      goal: 'Create ConfigMap api-config with LOG_LEVEL=info and PORT=3000 and make the API read it as environment variables.',
      theory: {
        what: "A ConfigMap keeps configuration outside the image (key-value pairs or whole files) so the same image works in every environment. A Pod reads it as variables (env, envFrom) or mounted as files. It is Compose's environment:.",
        how: [
          'kubectl create configmap api-config --from-literal=LOG_LEVEL=info --from-literal=PORT=3000',
          'kubectl create configmap nginx-conf --from-file=default.conf    # a whole file',
          'kubectl set env deployment/api --from=configmap/api-config      # or envFrom in the YAML',
          'kubectl exec deploy/api -- env | grep LOG_LEVEL',
        ],
        when: 'For whatever changes between environments and is not secret: log levels, URLs of other services, options.',
        problems:
          'Changing a ConfigMap does not restart the Pods: variables are read at start-up (kubectl rollout restart deployment/api).',
      },
      example: 'You create a ConfigMap with two values and look at it in YAML and in describe.',
      objectives: {
        'exec:tienda deploy/api printenv LOG_LEVEL': 'The API sees LOG_LEVEL=info',
        'exists:tienda cm/api-config': 'ConfigMap api-config',
      },
    },
    example: [
      'kubectl create configmap demo --from-literal=COLOR=verde --from-literal=MODO=prueba',
      'kubectl get configmap demo -o yaml',
      'kubectl describe configmap demo',
    ],
    solution: [
      'kubectl create configmap api-config --from-literal=LOG_LEVEL=info --from-literal=PORT=3000',
      'kubectl set env deployment/api --from=configmap/api-config',
    ],
    check: {
      exec: ['tienda deploy/api printenv LOG_LEVEL'],
      exists: ['tienda cm/api-config'],
      ready: ['tienda deploy/api'],
    },
  },
  {
    id: 'k8s-secret',
    block: 3,
    tier: 'beginner',
    kind: 'unit',
    setup: {
      files: {
        '~/tienda/db.yaml': DB_YAML.replace('        envFrom: [{secretRef: {name: db}}]\n', ''),
      },
      run: [...TIENDA, 'kubectl apply -f ~/tienda/db.yaml'],
    },
    es: {
      title: 'Secrets',
      goal: 'La base de datos no arranca: le falta la contraseña. Crea el Secret db con POSTGRES_PASSWORD=secreto y dáselo a db.',
      theory: {
        what: 'Un Secret es como un ConfigMap para contraseñas y tokens: se lee igual (env, envFrom, volumen) pero se trata aparte (permisos, no se enseña en describe). Ojo: en base64 no está cifrado, solo codificado. Es el .env de Compose.',
        how: [
          'kubectl create secret generic db --from-literal=POSTGRES_PASSWORD=secreto',
          'kubectl create secret generic db --from-env-file=.env   # o un .env entero (CLAVE=valor)',
          "kubectl get secret db -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d",
          'kubectl set env deployment/db --from=secret/db       # o secretKeyRef en el YAML',
        ],
        when: 'Para todo lo que no puede verse en el repositorio ni en un registro: contraseñas, tokens, certificados.',
        problems:
          'Nunca subas un Secret en claro a git: base64 se deshace en un segundo. Se crean a mano, desde la CI o con herramientas como Sealed Secrets o External Secrets.',
      },
      example:
        'Creas un Secret, lo ves en base64, lo lees con base64 -d y ves que db sigue sin arrancar.',
      objectives: {
        'ready:tienda deploy/db': 'db en marcha',
        'get:tienda secret/db {.data.POSTGRES_PASSWORD}': 'El Secret db guarda la contraseña',
      },
    },
    en: {
      title: 'Secrets',
      goal: 'The database does not start: it is missing its password. Create Secret db with POSTGRES_PASSWORD=secreto and give it to db.',
      theory: {
        what: "A Secret is like a ConfigMap for passwords and tokens: it is read the same way (env, envFrom, volume) but handled separately (permissions, hidden in describe). Careful: base64 is not encryption, just encoding. It is Compose's .env.",
        how: [
          'kubectl create secret generic db --from-literal=POSTGRES_PASSWORD=secreto',
          'kubectl create secret generic db --from-env-file=.env   # or a whole .env (KEY=value)',
          "kubectl get secret db -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d",
          'kubectl set env deployment/db --from=secret/db       # or secretKeyRef in the YAML',
        ],
        when: 'For anything that must not show up in the repository or in a log: passwords, tokens, certificates.',
        problems:
          'Never push a plain Secret to git: base64 is undone in a second. They are created by hand, from CI or with tools like Sealed Secrets or External Secrets.',
      },
      example:
        'You create a Secret, see it in base64, read it with base64 -d and see that db still does not start.',
      objectives: {
        'ready:tienda deploy/db': 'db running',
        'get:tienda secret/db {.data.POSTGRES_PASSWORD}': 'Secret db holds the password',
      },
    },
    example: [
      'kubectl create secret generic demo --from-literal=TOKEN=abc123',
      'kubectl get secret demo -o yaml',
      "kubectl get secret demo -o jsonpath='{.data.TOKEN}' | base64 -d",
      'kubectl get pods',
    ],
    solution: [
      'kubectl create secret generic db --from-literal=POSTGRES_PASSWORD=secreto',
      'kubectl set env deployment/db --from=secret/db',
    ],
    check: { ready: ['tienda deploy/db'], get: ['tienda secret/db {.data.POSTGRES_PASSWORD}'] },
  },
  {
    id: 'k8s-imagenes',
    block: 3,
    tier: 'beginner',
    kind: 'unit',
    setup: {
      files: {
        '~/tienda/db.yaml': DB_YAML,
        '~/tienda/api.yaml': API_YAML('1.0.0', 2).replace(
          '      imagePullSecrets: [{name: ghcr}]\n',
          '',
        ),
      },
      run: [...TIENDA, DB_SECRET, 'kubectl apply -f ~/tienda/'],
    },
    es: {
      title: 'Imágenes privadas y etiquetas',
      goal: 'La API (ghcr.io/peer4u/api:1.0.0) se queda en ImagePullBackOff. Crea el Secret de registro ghcr con tu token y haz que la API lo use.',
      theory: {
        what: 'Para descargar de un registro privado el clúster necesita credenciales: un Secret de tipo docker-registry y, en el Pod, imagePullSecrets (o en la ServiceAccount, y así lo usan todos sus Pods). Las imágenes van siempre con etiqueta fija: la versión y, mejor aún, el commit, como en el curso de Docker.',
        how: [
          'kubectl create secret docker-registry ghcr --docker-server=ghcr.io \\',
          '  --docker-username=peer --docker-password=$(cat ~/.ghcr-token)',
          'kubectl patch deployment api -p \'{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ghcr"}]}}}}\'',
          'kubectl describe pod <api-…>          # Events: 401 Unauthorized si falta',
        ],
        when: 'Con cualquier imagen del equipo: casi nunca son públicas.',
        problems:
          'latest no dice qué versión corre ni deja volver atrás: con etiquetas fijas, imagePullPolicy IfNotPresent basta.',
      },
      example: 'Miras por qué no arranca la API: el evento dice 401 Unauthorized.',
      objectives: { 'ready:tienda deploy/api': 'La API descargada y en marcha' },
    },
    en: {
      title: 'Private images and tags',
      goal: 'The API (ghcr.io/peer4u/api:1.0.0) is stuck in ImagePullBackOff. Create registry Secret ghcr with your token and make the API use it.',
      theory: {
        what: 'To pull from a private registry the cluster needs credentials: a docker-registry Secret and, in the Pod, imagePullSecrets (or on the ServiceAccount, so all its Pods use it). Images always carry a fixed tag: the version and, even better, the commit, as in the Docker course.',
        how: [
          'kubectl create secret docker-registry ghcr --docker-server=ghcr.io \\',
          '  --docker-username=peer --docker-password=$(cat ~/.ghcr-token)',
          'kubectl patch deployment api -p \'{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ghcr"}]}}}}\'',
          'kubectl describe pod <api-…>          # Events: 401 Unauthorized when missing',
        ],
        when: 'With any team image: they are almost never public.',
        problems:
          'latest does not say which version runs nor lets you roll back: with fixed tags, imagePullPolicy IfNotPresent is enough.',
      },
      example: 'You check why the API does not start: the event says 401 Unauthorized.',
      objectives: { 'ready:tienda deploy/api': 'The API pulled and running' },
    },
    example: ['kubectl get pods', 'kubectl describe pod -l app=api | grep -A2 Failed'],
    solution: [
      GHCR_SECRET,
      'kubectl patch deployment api -p \'{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ghcr"}]}}}}\'',
    ],
    check: { ready: ['tienda deploy/api'] },
  },
  {
    id: 'k8s-jefe-config',
    block: 3,
    tier: 'beginner',
    kind: 'boss',
    limit: 300,
    setup: {
      files: {
        '~/tienda/db.yaml': DB_YAML.replace(
          '        envFrom: [{secretRef: {name: db}}]\n',
          '        env:\n        - {name: POSTGRES_PASSWORD, value: secreto}\n',
        ),
        '~/tienda/api.yaml': API_YAML('1.0.0', 2).replace(
          '        envFrom: [{secretRef: {name: db}}]\n',
          `        env:\n        - {name: DATABASE_URL, value: "${DB_URL}"}\n`,
        ),
      },
      run: [...TIENDA, GHCR_SECRET, 'kubectl apply -f ~/tienda/'],
    },
    es: {
      title: 'La contraseña está en el repo',
      goal: 'Saca la contraseña de los YAML: un Secret db con todo y los manifiestos leyéndolo, sin «secreto» en ~/tienda.',
      story:
        'Revisión de código del lunes: db.yaml y api.yaml llevan la contraseña de la base de datos en claro y están en git. Hay que sacarla antes de que alguien haga fork, sin que se caiga nada.',
      tasks: [
        'Crea el Secret db con POSTGRES_PASSWORD=secreto y DATABASE_URL=postgres://postgres:secreto@db:5432/peer4u.',
        'Cambia ~/tienda/db.yaml y ~/tienda/api.yaml para que lo lean del Secret (envFrom o secretKeyRef).',
        'Aplícalos: db y api en marcha y la API llegando a la base de datos.',
        'Que no quede «secreto» en ningún fichero de ~/tienda.',
      ],
      objectives: {
        'probe:limpio': 'Ningún fichero de ~/tienda dice «secreto»',
        'reach:tienda api:3000/health': 'La API llega a la base de datos',
      },
    },
    en: {
      title: 'The password is in the repo',
      goal: 'Take the password out of the YAML: a Secret db with everything and the manifests reading it, with no «secreto» in ~/tienda.',
      story:
        'Monday code review: db.yaml and api.yaml carry the database password in plain text and they are in git. It has to go before someone forks it, without bringing anything down.',
      tasks: [
        'Create Secret db with POSTGRES_PASSWORD=secreto and DATABASE_URL=postgres://postgres:secreto@db:5432/peer4u.',
        'Change ~/tienda/db.yaml and ~/tienda/api.yaml so they read it from the Secret (envFrom or secretKeyRef).',
        'Apply them: db and api running and the API reaching the database.',
        'No «secreto» left in any file under ~/tienda.',
      ],
      objectives: {
        'probe:limpio': 'No file under ~/tienda says «secreto»',
        'reach:tienda api:3000/health': 'The API reaches the database',
      },
    },
    solution: [
      DB_SECRET,
      `sed -i 's/        env:/        envFrom: [{secretRef: {name: db}}]/; /POSTGRES_PASSWORD/d; /DATABASE_URL/d' ~/tienda/db.yaml ~/tienda/api.yaml`,
      'kubectl apply -f ~/tienda/',
    ],
    check: {
      ready: ['tienda deploy/db', 'tienda deploy/api'],
      reach: ['tienda api:3000/health'],
      probes: { limpio: ['grep -rl secreto ~/tienda | wc -l'] },
    },
  },
  {
    id: 'k8s-final-principiante',
    block: 3,
    tier: 'beginner',
    kind: 'final',
    limit: 720,
    setup: {
      files: {
        '~/tienda/compose.yaml': `# El compose del examen del curso de Docker
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
  api:
    image: ghcr.io/peer4u/api:1.0.0
    environment:
      DATABASE_URL: \${DATABASE_URL}
      LOG_LEVEL: info
    depends_on: [db]
  front:
    image: ghcr.io/peer4u/front:1.0.0
    ports: ["8080:80"]
`,
        '~/tienda/.env': `POSTGRES_PASSWORD=secreto\nDATABASE_URL=${DB_URL}\n`,
      },
    },
    es: {
      title: 'Del compose.yaml al clúster',
      goal: 'Lleva a Kubernetes, en el namespace tienda, el compose del examen de Docker: base de datos, API y front, y que /api/health conteste por localhost:8080.',
      story:
        'Examen de principiante. En ~/tienda tienes el compose.yaml y el .env del examen del curso de Docker. El equipo quiere la tienda en staging hoy. Lo que en Compose era un servicio, aquí es un Deployment y un Service con el mismo nombre (el front llama a http://api:3000).',
      tasks: [
        'Namespace tienda (y kubectl apuntando a él).',
        'Secret db desde ~/tienda/.env (sin escribir la contraseña en un YAML) y Secret de registro ghcr.',
        'db: Deployment de postgres:16 con su contraseña y Service db en el 5432.',
        'api: ghcr.io/peer4u/api:1.0.0 con 2 réplicas, DATABASE_URL del Secret, ConfigMap api-config con LOG_LEVEL=info y Service api en el 3000.',
        'front: ghcr.io/peer4u/front:1.0.0 con 2 réplicas y Service front en el 80.',
        'curl localhost:8080/api/health tiene que contestar 200 (port-forward al front).',
      ],
      objectives: {
        'http:localhost:8080/api/health': 'localhost:8080/api/health contesta 200',
        'exists:tienda cm/api-config': 'El ConfigMap api-config',
      },
    },
    en: {
      title: 'From compose.yaml to the cluster',
      goal: 'Bring the Docker exam compose to Kubernetes, in namespace tienda: database, API and front, with /api/health answering on localhost:8080.',
      story:
        'Beginner exam. In ~/tienda you have the compose.yaml and .env from the Docker course exam. The team wants the shop in staging today. What was a service in Compose is a Deployment plus a Service with the same name here (the front calls http://api:3000).',
      tasks: [
        'Namespace tienda (and kubectl pointing at it).',
        'Secret db from ~/tienda/.env (without writing the password in a YAML) and registry Secret ghcr.',
        'db: a postgres:16 Deployment with its password and Service db on 5432.',
        'api: ghcr.io/peer4u/api:1.0.0 with 2 replicas, DATABASE_URL from the Secret, ConfigMap api-config with LOG_LEVEL=info and Service api on 3000.',
        'front: ghcr.io/peer4u/front:1.0.0 with 2 replicas and Service front on 80.',
        'curl localhost:8080/api/health must answer 200 (port-forward to the front).',
      ],
      objectives: {
        'http:localhost:8080/api/health': 'localhost:8080/api/health answers 200',
        'exists:tienda cm/api-config': 'ConfigMap api-config',
      },
    },
    solution: [
      ...TIENDA,
      'kubectl create secret generic db --from-env-file=~/tienda/.env',
      GHCR_SECRET,
      'kubectl create configmap api-config --from-literal=LOG_LEVEL=info',
      `cat > ~/tienda/db.yaml <<'EOF'\n${DB_YAML}EOF`,
      `cat > ~/tienda/api.yaml <<'EOF'\n${API_YAML('1.0.0', 2, '').replace('[{secretRef: {name: db}}]', '[{secretRef: {name: db}}, {configMapRef: {name: api-config}}]')}EOF`,
      `cat > ~/tienda/front.yaml <<'EOF'\n${FRONT_YAML()}EOF`,
      'kubectl apply -f ~/tienda/db.yaml -f ~/tienda/api.yaml -f ~/tienda/front.yaml',
      'kubectl port-forward svc/front 8080:80',
    ],
    check: {
      ready: ['tienda deploy/db', 'tienda deploy/api', 'tienda deploy/front'],
      exists: ['tienda cm/api-config', 'tienda secret/db'],
      http: ['localhost:8080/api/health'],
    },
  },
]
