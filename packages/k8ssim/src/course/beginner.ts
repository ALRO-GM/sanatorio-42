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
        what: 'kubectl habla con el plano de control de un clúster, que decide en qué nodo (máquina) corre cada contenedor. El contexto dice a qué clúster hablas.',
        how: [
          'kubectl config get-contexts      # el * marca el actual',
          'kubectl config current-context   # solo su nombre',
          'kubectl cluster-info             # dónde está el plano de control',
          'kubectl get nodes                # las máquinas y si están Ready',
        ],
        when: 'Lo primero al llegar a un equipo: saber a qué clúster hablas antes de tocar nada.',
        whenNot:
          'kubectl config use-context produccion cambia de clúster para todas las órdenes siguientes, no solo para una.',
        problems:
          'Creer que estás en staging y estar en producción: un delete ahí sale caro. Antes de borrar, mira que current-context diga «staging».',
      },
      example:
        'Antes de verlo: hay dos contextos, staging y produccion. ¿Cuál lleva el * de actual?',
      objectives: { 'file:~/nodos.txt': 'Los nodos, en ~/nodos.txt' },
    },
    en: {
      title: 'Hello, cluster',
      goal: 'Save the list of cluster nodes in ~/nodos.txt, exactly as kubectl get nodes -o name prints it.',
      theory: {
        what: 'kubectl talks to the control plane of a cluster, which decides on which node (machine) each container runs. The context says which cluster you talk to.',
        how: [
          'kubectl config get-contexts      # the * marks the current one',
          'kubectl config current-context   # just its name',
          'kubectl cluster-info             # where the control plane is',
          'kubectl get nodes                # the machines and whether Ready',
        ],
        when: 'First thing when you join a team: know which cluster you talk to before touching anything.',
        whenNot:
          'kubectl config use-context produccion switches cluster for every following command, not just one.',
        problems:
          'Thinking you are on staging while on production: a delete there costs dearly. Before deleting, check that current-context says "staging".',
      },
      example:
        'Before you look: there are two contexts, staging and produccion. Which one has the current *?',
      objectives: { 'file:~/nodos.txt': 'The nodes, in ~/nodos.txt' },
    },
    example: [
      'kubectl config get-contexts',
      'kubectl config current-context',
      'kubectl cluster-info',
      'kubectl get nodes',
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
        what: 'Un Pod es uno o varios contenedores que van juntos al mismo nodo y comparten IP. kubectl run crea uno suelto.',
        how: [
          'kubectl run web --image=nginx:1.27   # crea el Pod',
          'kubectl get pods -o wide             # estado, IP y nodo',
          'kubectl logs web                     # lo que escribe',
          'kubectl delete pod web               # y no vuelve',
        ],
        when: 'Para probar rápido una imagen o una conexión dentro del clúster.',
        whenNot:
          'Un Pod suelto que borras no vuelve. Para una app que se cuide sola está el Deployment (bloque 2).',
        problems:
          'Usar una imagen que solo está en tu portátil: el clúster no la encuentra y get pods enseña «ErrImagePull» y luego «ImagePullBackOff». Súbela antes a un registro.',
      },
      example:
        'Antes de verlo: arrancas demo con nginx y local con api:1.0, que no está en ningún registro. ¿Qué STATUS tendrá cada uno?',
    },
    en: {
      title: 'Your first Pod',
      goal: 'Start a Pod called web with nginx:1.27 and delete the Pod prueba, which is no longer used.',
      theory: {
        what: 'A Pod is one or more containers that go together to the same node and share an IP. kubectl run creates a standalone one.',
        how: [
          'kubectl run web --image=nginx:1.27   # create the Pod',
          'kubectl get pods -o wide             # status, IP and node',
          'kubectl logs web                     # what it writes',
          'kubectl delete pod web               # and it does not come back',
        ],
        when: 'To quickly try an image or a connection inside the cluster.',
        whenNot:
          'A standalone Pod you delete does not come back. For an app that looks after itself there is the Deployment (block 2).',
        problems:
          'Using an image that only exists on your laptop: the cluster cannot find it and get pods shows "ErrImagePull" and then "ImagePullBackOff". Push it to a registry first.',
      },
      example:
        'Before you look: you start demo with nginx and local with api:1.0, which is in no registry. What STATUS will each have?',
    },
    example: [
      'kubectl run demo --image=nginx:1.27-alpine',
      'kubectl run local --image=api:1.0',
      'kubectl get pods',
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
      goal: 'Crea el Pod web (nginx:1.27) desde un manifiesto ~/pod.yaml, con la etiqueta equipo=tienda, aplicándolo con kubectl apply -f (o create -f).',
      theory: {
        what: 'Un manifiesto YAML describe lo que quieres (apiVersion, kind, metadata y spec), no los pasos. kubectl apply -f lo crea o lo cambia hasta que coincida.',
        how: [
          'kubectl run web --image=nginx:1.27 --dry-run=client -o yaml > pod.yaml   # borrador',
          'kubectl explain pod.spec.containers   # qué campos hay',
          'kubectl apply -f pod.yaml             # crear o actualizar',
          'kubectl get pod web -o yaml           # cómo ha quedado',
        ],
        when: 'Para todo lo que tiene que durar: el YAML vive en git, se revisa y se repite igual.',
        whenNot:
          'kubectl run crea al momento pero no deja nada escrito; con apply -f manda el fichero, y se puede volver a aplicar.',
        problems:
          'Sangrar con un tabulador: apply responde «yaml: line 8: found character that cannot start any token». Usa espacios. Si falta un campo, lo nombra: «spec.containers[0].image: Required value».',
      },
      example:
        'Antes de verlo: el primer demo.yaml sangra image con un tabulador. ¿Qué dirá apply?',
      objectives: {
        'get:default pod/web {.metadata.labels.equipo}': 'El Pod web lleva equipo=tienda',
        'probe:manifiesto': '~/pod.yaml coincide con el Pod del clúster',
      },
    },
    en: {
      title: 'YAML manifests',
      goal: 'Create the Pod web (nginx:1.27) from a manifest ~/pod.yaml, labelled equipo=tienda, applying it with kubectl apply -f (or create -f).',
      theory: {
        what: 'A YAML manifest describes what you want (apiVersion, kind, metadata and spec), not the steps. kubectl apply -f creates or changes it until it matches.',
        how: [
          'kubectl run web --image=nginx:1.27 --dry-run=client -o yaml > pod.yaml   # draft',
          'kubectl explain pod.spec.containers   # which fields exist',
          'kubectl apply -f pod.yaml             # create or update',
          'kubectl get pod web -o yaml           # how it ended up',
        ],
        when: 'For anything that must last: the YAML lives in git, gets reviewed and repeats the same way.',
        whenNot:
          'kubectl run creates on the spot but leaves nothing written; with apply -f the file rules, and you can apply it again.',
        problems:
          'Indenting with a tab: apply answers "yaml: line 8: found character that cannot start any token". Use spaces. If a field is missing it names it: "spec.containers[0].image: Required value".',
      },
      example:
        'Before you look: the first demo.yaml indents image with a tab. What will apply say?',
      objectives: {
        'get:default pod/web {.metadata.labels.equipo}': 'Pod web is labelled equipo=tienda',
        'probe:manifiesto': '~/pod.yaml matches the Pod in the cluster',
      },
    },
    example: [
      'kubectl run demo --image=nginx:1.27 --dry-run=client -o yaml',
      "cat > demo.yaml <<'EOF'\napiVersion: v1\nkind: Pod\nmetadata:\n  name: demo\nspec:\n  containers:\n  - name: nginx\n\timage: nginx:1.27-alpine\nEOF",
      'kubectl apply -f demo.yaml',
      "cat > demo.yaml <<'EOF'\napiVersion: v1\nkind: Pod\nmetadata:\n  name: demo\nspec:\n  containers:\n  - name: nginx\n    image: nginx:1.27-alpine\nEOF",
      'kubectl apply -f demo.yaml',
    ],
    solution: [
      'kubectl run web --image=nginx:1.27 --labels=run=web,equipo=tienda --dry-run=client -o yaml > ~/pod.yaml',
      'kubectl apply -f ~/pod.yaml',
    ],
    check: {
      ready: ['default pod/web'],
      get: ['default pod/web {.metadata.labels.equipo}'],
      // Que el Pod salga del fichero: da igual crearlo con apply -f o con create -f.
      probes: { manifiesto: ['kubectl diff -f ~/pod.yaml > /dev/null && echo igual'] },
    },
    requires: [['apply', 'create']],
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
        what: 'Un namespace separa objetos dentro del mismo clúster: puede haber un web en tienda y otro en pagos. Cada orden va al namespace del contexto, salvo con -n.',
        how: [
          'kubectl create namespace tienda',
          'kubectl run web --image=nginx:1.27 -n tienda',
          'kubectl get pods -A                 # en todos los namespaces',
          'kubectl config set-context --current --namespace=tienda   # el de siempre',
        ],
        when: 'Cuando varios equipos o apps comparten clúster y no queréis pisaros los nombres.',
        whenNot:
          '-n vale para una orden; set-context --current --namespace cambia el de todas las siguientes.',
        problems:
          'Crear en un namespace y mirar en otro: get pods dice «No resources found in default namespace.» Añade -n tienda o mira todo con -A.',
      },
      example:
        'Antes de verlo: creas demo con -n pruebas y luego escribes kubectl get pods, sin -n. ¿Qué sale?',
    },
    en: {
      title: 'Namespaces and context',
      goal: 'Create the namespace tienda, start a Pod web with nginx:1.27 in it and leave kubectl pointing at tienda.',
      theory: {
        what: 'A namespace separates objects inside the same cluster: there can be a web in tienda and another in pagos. Every command goes to the context namespace unless you pass -n.',
        how: [
          'kubectl create namespace tienda',
          'kubectl run web --image=nginx:1.27 -n tienda',
          'kubectl get pods -A                 # in every namespace',
          'kubectl config set-context --current --namespace=tienda   # the default',
        ],
        when: 'When several teams or apps share a cluster and must not step on each other’s names.',
        whenNot:
          '-n works for one command; set-context --current --namespace changes it for all the following ones.',
        problems:
          'Creating in one namespace and looking in another: get pods says "No resources found in default namespace." Add -n tienda or look everywhere with -A.',
      },
      example:
        'Before you look: you create demo with -n pruebas and then type kubectl get pods, without -n. What comes out?',
    },
    example: [
      'kubectl create namespace pruebas',
      'kubectl run demo --image=nginx:1.27-alpine -n pruebas',
      'kubectl get pods',
      'kubectl get pods -n pruebas',
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
        what: 'Un Deployment mantiene N copias de un Pod: si una muere o la borras, crea otra. El estado real va solo hacia el que pides.',
        how: [
          'kubectl create deployment web --image=nginx:1.27 --replicas=2',
          'kubectl get deploy,pods         # quién crea qué',
          'kubectl delete pod <uno>        # y vuelve a haber 2',
          'kubectl delete deployment web   # se lleva sus Pods',
        ],
        when: 'Para cualquier API o web del día a día; los Pods sueltos quedan para pruebas.',
        whenNot:
          'Por eso el nombre de un Pod no sirve para llegar a él: cambia en cada recreación. Para eso está el Service (bloque 2).',
        problems:
          'Borrar un Pod para parar la app: get pods enseña otro nuevo, con otro nombre y «AGE 5s». Para pararla, borra el Deployment.',
      },
      example:
        'Antes de verlo: demo tiene 2 Pods y borras uno. ¿Cuántos enseñará get pods después, y con qué nombres?',
      objectives: { 'ready:tienda deploy/web': 'web con sus 2 réplicas listas' },
    },
    en: {
      title: 'Deployments: let it look after itself',
      goal: 'Deploy web (nginx:1.27) with 2 replicas in tienda, using a Deployment.',
      theory: {
        what: 'A Deployment keeps N copies of a Pod: if one dies or you delete it, it creates another. The real state moves on its own towards the one you ask for.',
        how: [
          'kubectl create deployment web --image=nginx:1.27 --replicas=2',
          'kubectl get deploy,pods         # who creates what',
          'kubectl delete pod <one>        # and there are 2 again',
          'kubectl delete deployment web   # takes its Pods along',
        ],
        when: 'For any everyday API or website; standalone Pods are for tests.',
        whenNot:
          'That is why a Pod name is no way to reach it: it changes on every re-creation. That is what Services are for (block 2).',
        problems:
          'Deleting a Pod to stop the app: get pods shows a new one, with another name and "AGE 5s". To stop it, delete the Deployment.',
      },
      example:
        'Before you look: demo has 2 Pods and you delete one. How many will get pods show afterwards, and with what names?',
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
        what: 'Escalar es cambiar el número de réplicas: al momento con kubectl scale, o cambiando replicas en el YAML y aplicándolo.',
        how: [
          'kubectl scale deployment web --replicas=4   # al momento',
          "sed -i 's/replicas: 2/replicas: 3/' web.yaml",
          'kubectl apply -f web.yaml                    # manda el fichero',
          'kubectl get deploy web                       # READY 3/3',
        ],
        when: 'Cuando llega más tráfico (o menos) y no hay autoescalado (bloque 8).',
        whenNot: 'scale sirve para un apuro; lo que tiene que durar va al YAML del repositorio.',
        problems:
          'Escalar solo a mano: el siguiente apply del YAML lo deshace y READY vuelve de «4/4» a «2/2». Cambia también el fichero.',
      },
      example:
        'Antes de verlo: escalas web a 4 y luego aplicas web.yaml, que dice replicas: 2. ¿Qué READY saldrá al final?',
      objectives: {
        'get:tienda deploy/web {.spec.replicas}': 'web con 3 réplicas',
        'probe:repo': 'web.yaml dice replicas: 3 y coincide con el clúster',
      },
    },
    en: {
      title: 'Scaling',
      goal: 'Leave web with 3 replicas in the cluster and also in ~/tienda/web.yaml (the repository file).',
      theory: {
        what: 'Scaling means changing the number of replicas: on the spot with kubectl scale, or by changing replicas in the YAML and applying it.',
        how: [
          'kubectl scale deployment web --replicas=4   # on the spot',
          "sed -i 's/replicas: 2/replicas: 3/' web.yaml",
          'kubectl apply -f web.yaml                    # the file rules',
          'kubectl get deploy web                       # READY 3/3',
        ],
        when: 'When more (or less) traffic arrives and there is no autoscaler (block 8).',
        whenNot: 'scale is for an emergency; whatever must last goes into the repository YAML.',
        problems:
          'Scaling only by hand: the next apply of the YAML undoes it and READY goes back from "4/4" to "2/2". Change the file too.',
      },
      example:
        'Before you look: you scale web to 4 and then apply web.yaml, which says replicas: 2. What READY comes out at the end?',
      objectives: {
        'get:tienda deploy/web {.spec.replicas}': 'web with 3 replicas',
        'probe:repo': 'web.yaml says replicas: 3 and matches the cluster',
      },
    },
    example: [
      'kubectl scale deployment web --replicas=4',
      'kubectl get deploy web',
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
        what: 'Una etiqueta (label) es un par clave=valor en un objeto; un selector elige objetos por sus etiquetas. Así sabe un Deployment qué Pods son suyos.',
        how: [
          'kubectl get pods --show-labels',
          'kubectl get pods -l app=web             # filtrar',
          'kubectl label pod <uno> investigar=si   # poner',
          'kubectl label pod <uno> app-            # quitar (el - final)',
          'kubectl get pods -L app                 # una columna APP',
        ],
        when: 'Para filtrar por app o por equipo, y para apartar un Pod que falla sin borrarlo.',
        whenNot:
          'Quitarle app a un Pod no lo borra: el Deployment deja de contarlo y crea otro, y el apartado sigue vivo para investigarlo.',
        problems:
          'Un selector con otra letra no casa: kubectl get pods -l app=Web dice «No resources found in tienda namespace.» Las etiquetas distinguen mayúsculas.',
      },
      example:
        'Antes de verlo: web tiene 2 Pods y a uno le quitas la etiqueta app. ¿Cuántos Pods saldrán después?',
      objectives: {
        'probe:apartado': 'Un Pod con investigar=si, fuera de web',
        'ready:tienda deploy/web': 'web sigue con 2 Pods listos',
      },
    },
    en: {
      title: 'Labels and selectors',
      goal: 'Take one web Pod out of the Deployment to investigate it: remove its app label and add investigar=si. web must still have 2 Pods.',
      theory: {
        what: 'A label is a key=value pair on an object; a selector picks objects by their labels. That is how a Deployment knows which Pods are its own.',
        how: [
          'kubectl get pods --show-labels',
          'kubectl get pods -l app=web             # filter',
          'kubectl label pod <one> investigar=si   # add',
          'kubectl label pod <one> app-            # remove (trailing -)',
          'kubectl get pods -L app                 # an APP column',
        ],
        when: 'To filter by app or team, and to set a failing Pod aside without deleting it.',
        whenNot:
          'Removing app from a Pod does not delete it: the Deployment stops counting it and creates another, and the set-aside one stays alive to investigate.',
        problems:
          'A selector with a different letter matches nothing: kubectl get pods -l app=Web says "No resources found in tienda namespace." Labels are case-sensitive.',
      },
      example:
        'Before you look: web has 2 Pods and you remove the app label from one. How many Pods will show afterwards?',
      objectives: {
        'probe:apartado': 'One Pod with investigar=si, out of web',
        'ready:tienda deploy/web': 'web still has 2 ready Pods',
      },
    },
    example: [
      'kubectl get pods --show-labels',
      'kubectl get pods -l app=Web',
      'kubectl label $(kubectl get pods -l app=web -o name | head -n 1) app-',
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
        what: 'Un Service da un nombre y una IP fijos a los Pods que casan con su selector y reparte el tráfico entre ellos. Dentro del clúster se llega por su nombre.',
        how: [
          'kubectl expose deployment web --port=80   # ClusterIP',
          'kubectl get svc,endpointslices            # la IP y los Pods detrás',
          'kubectl run tmp --rm -i --image=curlimages/curl:8.10 --restart=Never -- curl -s web',
        ],
        when: 'Siempre que algo tenga que llegar a tus Pods: otra app, un Ingress o tú.',
        whenNot:
          'port es el puerto del Service y targetPort el del contenedor; si no pones targetPort, vale lo mismo que port.',
        problems:
          "Poner --port=8080 sin --target-port cuando nginx escucha en el 80: curl responde «Couldn't connect to server». Añade --target-port=80.",
      },
      example:
        'Antes de verlo: demo escucha en el 8080 sin --target-port y nginx, en el 80. ¿Contestará curl demo:8080?',
      objectives: { 'reach:tienda web/': 'Desde tienda, curl web contesta nginx' },
    },
    en: {
      title: 'Services and DNS',
      goal: 'Create a Service web on port 80 so that, from any Pod in tienda, curl web answers with nginx.',
      theory: {
        what: 'A Service gives a fixed name and IP to the Pods matching its selector and spreads traffic across them. Inside the cluster you reach it by name.',
        how: [
          'kubectl expose deployment web --port=80   # ClusterIP',
          'kubectl get svc,endpointslices            # the IP and the Pods behind',
          'kubectl run tmp --rm -i --image=curlimages/curl:8.10 --restart=Never -- curl -s web',
        ],
        when: 'Whenever something must reach your Pods: another app, an Ingress or you.',
        whenNot:
          'port is the Service port and targetPort the container one; without targetPort it takes the same value as port.',
        problems:
          'Setting --port=8080 without --target-port while nginx listens on 80: curl answers "Couldn\'t connect to server". Add --target-port=80.',
      },
      example:
        'Before you look: demo listens on 8080 without --target-port and nginx on 80. Will curl demo:8080 answer?',
      objectives: { 'reach:tienda web/': 'From tienda, curl web answers with nginx' },
    },
    example: [
      'kubectl expose deployment web --name=demo --port=8080',
      'kubectl run tmp --rm -i --image=curlimages/curl:8.10 --restart=Never -- curl -s demo:8080',
      'kubectl expose deployment web --name=bien --port=8080 --target-port=80',
      'kubectl get svc,endpointslices',
      'kubectl run tmp --rm -i --image=curlimages/curl:8.10 --restart=Never -- curl -s bien:8080',
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
        what: 'kubectl port-forward abre un túnel desde un puerto de tu máquina hasta un Pod (con svc/ o deploy/, uno de los suyos). Un ClusterIP solo se ve desde dentro.',
        how: [
          'kubectl port-forward svc/web 8080:80   # tu 8080 → el 80',
          'curl localhost:8080',
          'kubectl expose deployment web --name=web-np --type=NodePort --port=80',
          'kubectl get svc web-np                 # PORT(S) 80:30080/TCP',
        ],
        when: 'Para probar desde tu máquina algo que solo se ve dentro del clúster.',
        whenNot:
          'port-forward es para ti y vive mientras la orden sigue abierta; NodePort abre el puerto en todos los nodos, y en producción va un Ingress (bloque 8).',
        problems:
          'Probar en tu máquina sin túnel: curl localhost:9090 dice «Failed to connect to localhost port 9090». Abre antes el port-forward.',
      },
      example:
        'Antes de verlo: web solo tiene un ClusterIP. ¿Qué responde curl localhost:9090 antes y después del port-forward?',
      objectives: {
        'http:localhost:8080/': 'localhost:8080 contesta nginx',
        'get:tienda svc/web-np {.spec.type}': 'web-np es NodePort',
      },
    },
    en: {
      title: 'Reaching it from your machine',
      goal: "Make curl localhost:8080 on your machine answer with web's nginx and also create a NodePort Service called web-np.",
      theory: {
        what: 'kubectl port-forward opens a tunnel from a port on your machine to a Pod (with svc/ or deploy/, one of theirs). A ClusterIP is only visible from inside.',
        how: [
          'kubectl port-forward svc/web 8080:80   # your 8080 → the 80',
          'curl localhost:8080',
          'kubectl expose deployment web --name=web-np --type=NodePort --port=80',
          'kubectl get svc web-np                 # PORT(S) 80:30080/TCP',
        ],
        when: 'To try from your machine something only visible inside the cluster.',
        whenNot:
          'port-forward is for you and lives while the command stays open; NodePort opens the port on every node, and production uses an Ingress (block 8).',
        problems:
          'Trying on your machine without a tunnel: curl localhost:9090 says "Failed to connect to localhost port 9090". Open the port-forward first.',
      },
      example:
        'Before you look: web only has a ClusterIP. What does curl localhost:9090 answer before and after the port-forward?',
      objectives: {
        'http:localhost:8080/': 'localhost:8080 answers with nginx',
        'get:tienda svc/web-np {.spec.type}': 'web-np is a NodePort',
      },
    },
    example: [
      'curl localhost:9090',
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
        what: 'Un ConfigMap guarda configuración fuera de la imagen, en pares clave-valor o ficheros enteros. Un Pod lo lee como variables o como ficheros montados.',
        how: [
          'kubectl create configmap api-config --from-literal=LOG_LEVEL=info --from-literal=PORT=3000',
          'kubectl get configmap api-config -o yaml   # data, con los valores',
          'kubectl set env deployment/api --from=configmap/api-config',
          'kubectl exec deploy/api -- printenv LOG_LEVEL   # info',
          'kubectl rollout restart deployment/api   # tras cambiarlo: las variables no se releen',
        ],
        when: 'Para lo que cambia entre entornos y no es secreto: el nivel de log, la URL de otro servicio.',
        whenNot:
          'Para contraseñas, no: un ConfigMap se lee en claro con get -o yaml. Van en un Secret (siguiente unidad).',
        problems:
          'Escribir mal el nombre al dárselo a la app: set env responde «Error from server (NotFound): configmaps "demos" not found». Míralo con kubectl get configmap.',
      },
      example:
        'Antes de verlo: el ConfigMap se llama demo y escribes --from=configmap/demos. ¿Qué responde set env?',
      objectives: {
        'exec:tienda deploy/api printenv LOG_LEVEL': 'La API ve LOG_LEVEL=info',
        'exists:tienda cm/api-config': 'El ConfigMap api-config',
      },
    },
    en: {
      title: 'ConfigMaps',
      goal: 'Create ConfigMap api-config with LOG_LEVEL=info and PORT=3000 and make the API read it as environment variables.',
      theory: {
        what: 'A ConfigMap keeps configuration outside the image, as key-value pairs or whole files. A Pod reads it as variables or as mounted files.',
        how: [
          'kubectl create configmap api-config --from-literal=LOG_LEVEL=info --from-literal=PORT=3000',
          'kubectl get configmap api-config -o yaml   # data, with the values',
          'kubectl set env deployment/api --from=configmap/api-config',
          'kubectl exec deploy/api -- printenv LOG_LEVEL   # info',
          'kubectl rollout restart deployment/api   # after a change: variables are not reread',
        ],
        when: 'For whatever changes between environments and is not secret: log level, another service’s URL.',
        whenNot:
          'Not for passwords: a ConfigMap reads in plain text with get -o yaml. They go in a Secret (next unit).',
        problems:
          'Misspelling the name when giving it to the app: set env answers "Error from server (NotFound): configmaps "demos" not found". Check it with kubectl get configmap.',
      },
      example:
        'Before you look: the ConfigMap is called demo and you type --from=configmap/demos. What does set env answer?',
      objectives: {
        'exec:tienda deploy/api printenv LOG_LEVEL': 'The API sees LOG_LEVEL=info',
        'exists:tienda cm/api-config': 'ConfigMap api-config',
      },
    },
    example: [
      'kubectl create configmap demo --from-literal=COLOR=verde --from-literal=MODO=prueba',
      'kubectl get configmap demo -o yaml',
      'kubectl set env deployment/api --from=configmap/demos',
      'kubectl set env deployment/api --from=configmap/demo',
      'kubectl exec deploy/api -- printenv COLOR',
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
        what: 'Un Secret guarda contraseñas y tokens; un Pod lo lee igual que un ConfigMap, pero describe no enseña los valores. Va en base64: codificado, no cifrado.',
        how: [
          'kubectl create secret generic db --from-literal=POSTGRES_PASSWORD=secreto',
          'kubectl get secret db -o yaml        # el valor, en base64',
          "kubectl get secret db -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d",
          'kubectl set env deployment/db --from=secret/db',
        ],
        when: 'Para lo que no puede verse en el repositorio: contraseñas, tokens, certificados.',
        whenNot:
          'describe secret solo enseña el tamaño («TOKEN:  6 bytes»): sirve para mirar sin destapar el valor.',
        problems:
          'Creer que base64 protege y subir el YAML a git: «YWJjMTIz» se lee «abc123» con base64 -d. Los Secrets se crean a mano o desde la CI, no en el repositorio.',
      },
      example:
        'Antes de verlo: guardas TOKEN=abc123. ¿Qué enseña get -o yaml, y qué devuelve base64 -d?',
      objectives: {
        'ready:tienda deploy/db': 'db en marcha',
        'get:tienda secret/db {.data.POSTGRES_PASSWORD}': 'El Secret db guarda la contraseña',
      },
    },
    en: {
      title: 'Secrets',
      goal: 'The database does not start: it is missing its password. Create Secret db with POSTGRES_PASSWORD=secreto and give it to db.',
      theory: {
        what: 'A Secret holds passwords and tokens; a Pod reads it like a ConfigMap, but describe hides the values. It is base64: encoded, not encrypted.',
        how: [
          'kubectl create secret generic db --from-literal=POSTGRES_PASSWORD=secreto',
          'kubectl get secret db -o yaml        # the value, in base64',
          "kubectl get secret db -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d",
          'kubectl set env deployment/db --from=secret/db',
        ],
        when: 'For whatever must not show up in the repository: passwords, tokens, certificates.',
        whenNot:
          'describe secret only shows the size ("TOKEN:  6 bytes"): useful to look without revealing the value.',
        problems:
          'Believing base64 protects it and pushing the YAML to git: "YWJjMTIz" reads "abc123" with base64 -d. Secrets are created by hand or from CI, not in the repository.',
      },
      example:
        'Before you look: you store TOKEN=abc123. What does get -o yaml show, and what does base64 -d return?',
      objectives: {
        'ready:tienda deploy/db': 'db running',
        'get:tienda secret/db {.data.POSTGRES_PASSWORD}': 'Secret db holds the password',
      },
    },
    example: [
      'kubectl create secret generic demo --from-literal=TOKEN=abc123',
      'kubectl get secret demo -o yaml',
      "kubectl get secret demo -o jsonpath='{.data.TOKEN}' | base64 -d",
      'kubectl describe secret demo',
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
        what: 'Para bajar de un registro privado, el clúster necesita un Secret de tipo docker-registry y que el Pod lo nombre en imagePullSecrets.',
        how: [
          'kubectl create secret docker-registry ghcr --docker-server=ghcr.io \\',
          '  --docker-username=peer --docker-password=$(cat ~/.ghcr-token)',
          'kubectl patch deployment api -p \'{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ghcr"}]}}}}\'',
          'kubectl describe pod <api-…>   # Events: 401 Unauthorized si falta',
        ],
        when: 'Con casi cualquier imagen del equipo: pocas son públicas.',
        whenNot:
          'Etiqueta fija (1.0.0), no latest: latest no dice qué versión corre ni deja volver a la anterior.',
        problems:
          'Crear el Secret y no nombrarlo en el Pod: sigue en «ImagePullBackOff» y Events dice «401 Unauthorized». Añade imagePullSecrets con patch.',
      },
      example:
        'Antes de verlo: creas el Secret ghcr pero no tocas la API. ¿Saldrá de ImagePullBackOff?',
      objectives: { 'ready:tienda deploy/api': 'La API descargada y en marcha' },
    },
    en: {
      title: 'Private images and tags',
      goal: 'The API (ghcr.io/peer4u/api:1.0.0) is stuck in ImagePullBackOff. Create registry Secret ghcr with your token and make the API use it.',
      theory: {
        what: 'To pull from a private registry, the cluster needs a docker-registry Secret and the Pod has to name it in imagePullSecrets.',
        how: [
          'kubectl create secret docker-registry ghcr --docker-server=ghcr.io \\',
          '  --docker-username=peer --docker-password=$(cat ~/.ghcr-token)',
          'kubectl patch deployment api -p \'{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ghcr"}]}}}}\'',
          'kubectl describe pod <api-…>   # Events: 401 Unauthorized if missing',
        ],
        when: 'With almost any team image: few are public.',
        whenNot:
          'A fixed tag (1.0.0), not latest: latest does not say which version runs nor lets you go back to the previous one.',
        problems:
          'Creating the Secret but not naming it in the Pod: it stays in "ImagePullBackOff" and Events says "401 Unauthorized". Add imagePullSecrets with patch.',
      },
      example:
        'Before you look: you create Secret ghcr but leave the API alone. Will it leave ImagePullBackOff?',
      objectives: { 'ready:tienda deploy/api': 'The API pulled and running' },
    },
    example: [
      'kubectl get pods',
      'kubectl create secret docker-registry ghcr --docker-server=ghcr.io --docker-username=peer --docker-password=$(cat ~/.ghcr-token)',
      'kubectl get pods',
      "kubectl describe pod -l app=api | grep -m1 -o '401 Unauthorized'",
    ],
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
      'kubectl create secret generic db --from-env-file ~/tienda/.env',
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
