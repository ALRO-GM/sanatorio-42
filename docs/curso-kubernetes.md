# Curso de Kubernetes

Un curso para usar Kubernetes como en un equipo de programación, desde el
lado de quien desarrolla: desplegar, configurar, actualizar sin cortes, mirar
y depurar, y empaquetar por entornos. No es montar ni administrar clústeres.
Sigue la [plantilla de cursos](plantilla-cursos.md): cada conocimiento tiene
**teoría, ejemplo y prueba**, cada bloque acaba en un **jefe contrarreloj** y
cada nivel en un **jefe final** que da su certificado (principiante,
intermedio, avanzado). Está en Aprender, pestaña «Curso de Kubernetes»
(`#/cursok8s`), junto a la de Docker, y los certificados salen también en el
perfil.

La investigación de la que sale (cursos de referencia, temario CKAD, lo que
piden las empresas y preguntan en las entrevistas, qué modelar y la relación
con el curso de Docker, con sus fuentes) está en
[referencia/curso-kubernetes-investigacion.md](referencia/curso-kubernetes-investigacion.md).

## De la investigación al curso

- **El esqueleto de «Learn Kubernetes Basics»** (desplegar → explorar →
  exponer → escalar → actualizar) para el nivel principiante, y el **temario
  CKAD** como lista de cobertura del resto: diseño (Jobs, init, volúmenes),
  despliegue (rolling update, estrategias, Kustomize, Helm), observabilidad
  (sondas, logs, depurar), configuración y seguridad (ConfigMap, Secret,
  requests y limits, ServiceAccount, securityContext) y red (Services,
  NetworkPolicy, Ingress). Del CKA solo se toma el peso de la depuración.
- **Las 34 unidades propuestas, en sus 9 bloques y 3 niveles.** La plantilla
  pide un jefe por bloque, así que entran los dos jefes opcionales de la
  propuesta: «La contraseña está en el repo» (bloque 3) e «Incidencia corta»
  (bloque 6). En total, 34 unidades, 9 jefes y 3 jefes finales: 46 puntos.
- **Validar por el estado final**, como en los cursos de shell y Docker: lo
  que cuenta es cómo queda el clúster (objetos, Pods listos, lo que contesta un
  Service o el Ingress, lo que se ve dentro de un Pod), no las órdenes. Antes
  de comparar se dejan pasar diez minutos de reloj en una copia, así que da
  igual si acabaste antes o después de que terminara un rolling update, y lo
  que se cae (un CrashLoopBackOff, un OOMKilled) se ve.
- **Lo que preguntan en las entrevistas**, repartido en unidades: Pod frente a
  Deployment y ReplicaSet (5), Services, selectores y DNS (7, 8, 24),
  ConfigMap frente a Secret y que base64 no cifra (10, 11), readiness frente
  a liveness y startup (17, 18), requests frente a limits y el 137 (19),
  rolling update y rollback (13, 14, 15), depurar por estado (20 a 24),
  StatefulSet y PVC (25, 26), Helm y Kustomize (32, 33).
- **Ajustes al simulador**: el registro del equipo es `ghcr.io/peer4u` (el
  del curso de Docker), no `ghcr.io/sanatorio42`; `kubectl edit` no abre
  editor (se cambia con `patch`, `set`, `scale` o `apply`); las sesiones
  interactivas (`-it … -- sh`) piden la orden entera (`-- sh -c '…'`); y la
  trampa de la 1.3.0 del examen avanzado se cuenta en la historia, pero lo que
  se comprueba es que el overlay y el clúster acaben en la 1.2.0.
- **GitOps se explica, no se simula**: la teoría de Kustomize (unidad 32)
  cuenta cómo la CI cambia la etiqueta en el overlay y Argo CD o Flux aplican
  solos (lo que pide la parte 3 de Inception-of-Things). Gateway API se
  presenta junto al Ingress (unidad 29), con la equivalencia en `HTTPRoute`.

## Los niveles

El mundo es siempre el mismo: `dev1`, la máquina de trabajo del curso de
Docker, con `kubectl`, `helm` y `kustomize` y el kubeconfig puesto, y dos
clústeres k3s de tres nodos (`nodo-1..3`, 2 CPU y 4 GiB cada uno): `staging`,
el de siempre, y `produccion`, el del examen avanzado. Traen lo que trae k3s:
CoreDNS, Traefik como Ingress, metrics-server y el aprovisionador de volúmenes
`local-path`. La tienda de Peer4U (front, API y Postgres) vive en el namespace
`tienda` y sus manifiestos en `~/tienda`; el token del registro, en
`~/.ghcr-token`.

### Principiante: del compose al clúster

| Bloque | Unidades (qué comprueba su prueba) | Jefe (límite) |
| --- | --- | --- |
| 1. Orientarte en el clúster | contextos y nodos (`~/nodos.txt`) · primer Pod (y borrar otro) · manifiesto YAML con `apply` (y su etiqueta) · namespace y contexto | Primer día en el equipo de plataforma: encontrar un Pod, guardar su registro, limpiar `default` y apuntar a `tienda` (4 min) |
| 2. Desplegar y exponer | Deployment con 2 réplicas · escalar en el clúster y en el YAML (`diff` vacío) · apartar un Pod quitándole la etiqueta · Service y DNS (contesta desde dentro) · `port-forward` y NodePort | Sube el frontend: la imagen del curso de Docker con `imagePullSecrets` y un Service con el selector mal (5 min) |
| 3. Configurar la aplicación | ConfigMap leído por la API · Secret para Postgres · registro privado (`docker-registry`) | La contraseña está en el repo: Secret y manifiestos que lo leen, sin «secreto» en `~/tienda` (5 min) |
| **Jefe final** | Del `compose.yaml` al clúster: el compose y el `.env` del examen de Docker llevados a `tienda` (Secrets, ConfigMap, tres Deployments y tres Services) y `/api/health` contestando por `localhost:8080` | 12 min |

### Intermedio: producción sin sustos

| Bloque | Unidades | Jefe |
| --- | --- | --- |
| 4. Actualizar sin cortes | rolling update con su `change-cause` · rollback de una versión que no arranca · `maxSurge`/`maxUnavailable` y un canary detrás del mismo Service · `diff` y la deriva | Viernes, 17:55: volver atrás, leer qué pide la 1.1.0 y desplegarla desde el YAML (5 min) |
| 5. Salud y recursos | readinessProbe (la 1.2.0 tarda 20 s) · liveness y startupProbe (reinicios en bucle) · requests, limits y OOMKilled | Los lunes se cae: sondas razonables, recursos y el informe sin OOMKilled (6 min) |
| 6. Depurar | CrashLoopBackOff (clave mal escrita en un Secret) · ImagePullBackOff (etiqueta que no existe) · Pending (8 GiB pedidos) · entrar a mirar (`exec`, `cp`, `debug`) · el Service que no llega (selector y `targetPort`) | Incidencia corta: front sin imagen y Service con el puerto mal (5 min) |
| **Jefe final** | Guardia: producción está caída. Cinco fallos encadenados (imagen, Secret, Pending, `targetPort`, liveness) hasta que `/api/health` conteste, y las causas escritas | 15 min |

### Avanzado: como en el trabajo

| Bloque | Unidades | Jefe |
| --- | --- | --- |
| 7. Datos y tareas | PVC (la tabla sobrevive al Pod) · StatefulSet con `volumeClaimTemplates` y Service headless · Job de migraciones y CronJob de copias · contenedor init que espera a la base de datos | Se perdieron los pedidos: StatefulSet, restaurar `backup.sql`, migrar y copia a las 03:00 (7 min) |
| 8. Tráfico, escala y aislamiento | Ingress en `tienda.local` (y Gateway API) · HPA con carga · NetworkPolicies (denegar todo y abrir lo justo) | Sale en la tele mañana: Ingress con TLS, HPA y la base de datos solo para la API (7 min) |
| 9. Empaquetar y desplegar como un equipo | Kustomize con `base/` y un overlay (`diff -k` vacío) · Helm: instalar, subir con values y volver atrás · seguridad del Pod (sin root, sin escalar, solo lectura, ServiceAccount sin token) | Staging y producción: base, dos overlays y Redis con Helm solo en staging (6 min) |
| **Jefe final** | El lanzamiento: en el contexto `produccion`, Secrets, StatefulSet, Job, overlay en la 1.2.0, Ingress con TLS, HPA, NetworkPolicy y `diff -k` vacío | 20 min |

En total: 34 unidades (12 de principiante, 12 de intermedio y 10 de avanzado), 9 jefes y 3 jefes finales: 46 puntos.

## Estrellas y tiempo

- **Unidades**: por comandos. Cuenta cada orden que sale bien y cambia algo
  (`kubectl create`, `apply`, `run`, `expose`, `scale`, `set`, `patch`,
  `delete`, `helm install`, escribir un YAML con `cat > f <<'EOF'`…). Mirar no
  cuenta (`kubectl get`, `describe`, `logs`, `top`, `diff`, `rollout status`,
  `wait`, `auth can-i`, `helm list`). Las formas equivalentes valen igual:
  `kubectl create deployment` o `apply -f` con el YAML en otro orden,
  `deploy` o `deployment`, `pod/web` o `pod web`, `-n tienda` o el namespace
  del contexto, `docker.io/library/nginx:1.27` o `nginx:1.27`; lo comprueba
  `apps/api/tests/unit/k8ssim.test.ts`.
- **Jefes**: por tiempo, con el reloj de la API.
- **Qué se comprueba** se ve como una lista que se marca sola: cómo está una
  carga (listos/deseados, imágenes, rollout), un campo por `jsonpath`, que un
  objeto exista o no, lo que contesta una dirección desde tu máquina o desde
  un Pod, una orden dentro de un Pod, el contexto de `kubectl`, ficheros y
  sondas («kubectl diff ya no encuentra diferencias»).

## Tiempo estimado

Con el modelo común (`docs/plantilla-cursos.md`), a 2026-11-08:

| Nivel | Bloques | Tiempo |
| --- | --- | --- |
| Principiante | 31 + 32 + 24 min, y el jefe final | ~1 h 45 min |
| Intermedio | 29 + 24 + 35 min, y el jefe final | ~1 h 49 min |
| Avanzado | 35 + 27 + 29 min, y el jefe final | ~1 h 58 min |
| **Todo el curso** | | **~5 h 32 min** |

## Orden entre cursos

El orden sugerido es shell → git → Docker → Kubernetes, pero no se bloquea:
si abres el de Kubernetes sin el nivel principiante de Docker, arriba del
camino sale una sugerencia con el enlace (`CourseOrderHint`, regla en la
plantilla). Dentro del curso, el camino se abre de uno en uno.

## Cómo está hecho

- `packages/k8ssim`: Kubernetes simulado, en TypeScript puro, encima de
  `@sanatorio/shellsim` (su sistema de ficheros, el parser y el intérprete,
  con su punto de extensión: `kubectl`, `helm`, `kustomize`, `base64`, qué
  órdenes solo miran y quién contesta en un puerto). El estado va en
  `world.ext.k8s`: contextos, clústeres con sus objetos (JSON con la forma de
  la API de Kubernetes, para que `-o yaml`, `jsonpath`, `patch` y `diff`
  trabajen sobre lo mismo que se ve) y los `port-forward`.
  - `objects.ts`: lo que hace el servidor de la API antes de guardar
    (validación con los errores de verdad, valores por defecto, ClusterIP y
    NodePort).
  - `controllers.ts`: Deployment → ReplicaSet → Pods con `maxSurge` y
    `maxUnavailable`, revisiones y `rollout undo`; StatefulSet en orden con
    sus PVC; Job; HPA (con su espera de 5 minutos para bajar); enlace de PVC
    (`local-path`, `WaitForFirstConsumer`); planificador con requests por
    nodo; arranque de cada Pod (imagen, registro privado, variables, init).
    Van a pasos de unos segundos de reloj (cada orden son 5 s), así que un
    rolling update espera de verdad a que los Pods nuevos estén listos.
  - `runtime.ts`: qué hace cada contenedor con el reloj (cuándo escucha, si
    las sondas lo dan por listo o lo matan, el `CrashLoopBackOff` con su
    espera de 10 s a 5 min, el OOMKilled y el 137) y sus registros.
  - `net.ts`: DNS de Services (y de los Pods de un StatefulSet), endpoints,
    NetworkPolicies como tabla de permitidos, Ingress (Traefik) y lo que
    contesta cada app por HTTP; `podsh.ts`, la shell mínima de dentro de un
    Pod (`env`, `cat`, `wget`, `curl`, `nc -z`, `psql`, `pg_dump`…).
  - `images.ts`: las imágenes. Las públicas (nginx, postgres, redis,
    busybox) salen del catálogo del curso de Docker con su digest; las del
    equipo son las del examen final de Docker y las de práctica (1.1.0 pide
    `REDIS_URL`, 1.2.0 tarda 20 s, 1.3.0 nunca está lista, `informes` se come
    300 MiB). Son privadas: hace falta `imagePullSecrets`.
  - `kubectl.ts` y `ops.ts`: la CLI; `kustomize.ts` y `helm.ts`: Kustomize
    (resources, namespace, namePrefix, labels, images, replicas, patches,
    generadores con hash) y un Helm reducido (`bitnami/redis` y
    `bitnami/postgresql`, con releases y revisiones).
  - `course/`: los bloques, las unidades (castellano e inglés), la tienda que
    preparan (`stack.ts`) y la corrección (`checkAttempt`, `goalOf`,
    `starGoals`, `timeGoalsOf`).
- `apps/api/src/modules/k8scourse`: el mismo servicio que el de shell
  (`createShellCourseService` con el motor de Kubernetes), con `k8s_progress`
  y `k8s_runs` (migración 88). Ver `docs/api.md`.
- `apps/web/src/features/k8scourse`: el camino como `tree`, la unidad
  (teoría, ejemplo y prueba), los jefes y la demostración; usa la terminal,
  las estrellas, los capítulos y `CourseOrderHint` de `shared/course`.

## Qué modela y qué no

- **Sí**: Namespace, Node, Pod, Deployment, ReplicaSet, StatefulSet, Job,
  CronJob (se crea y se lanza a mano con `create job --from`), Service
  (ClusterIP, NodePort, LoadBalancer, headless) con Endpoints y
  EndpointSlices, ConfigMap, Secret (generic, docker-registry, tls),
  ServiceAccount, PVC, PV, StorageClass, Ingress, IngressClass,
  NetworkPolicy, HPA, Event, y Gateway/HTTPRoute guardados (sin
  controlador). Sondas httpGet, tcpSocket y exec; requests y limits;
  securityContext; initContainers; `get` (`-o wide|yaml|json|name|jsonpath|
  custom-columns`, `-l`, `-L`, `--show-labels`, `-A`, `-w` durante un
  minuto), `describe`, `logs` (`--previous`, `--tail`, `-c`), `exec`, `cp`,
  `debug`, `port-forward`, `top`, `wait`, `rollout`, `set`, `patch`
  (estratégico, merge y JSON), `label`, `annotate`, `scale`, `autoscale`,
  `diff`, `auth can-i`, `config`, `explain` de los campos más usados.
- **No**: instalar ni administrar el clúster (kubeadm, etcd, certificados),
  CNI de verdad, RBAC (solo `auth can-i` con reglas fijas: `peer` puede todo
  en staging y una ServiceAccount nueva nada), CRD y operadores, Argo CD y
  Flux, DaemonSet, ResourceQuota, que un CronJob se lance solo por la hora,
  sesiones interactivas y editores, y la salida de `-f` siguiendo los
  registros. Las NetworkPolicies de salida no cortan el DNS. El tiempo es un
  contador (cada orden, 5 s).

## Protección

- **No ejecuta nada de verdad**: todo es JSON en el mundo de la shell; el
  paquete solo importa de sí mismo, de `@sanatorio/shellsim`,
  `@sanatorio/course` y `@sanatorio/dockersim` (lo comprueba un test).
  `kubectl apply -f https://…` avisa de que no hay salida a internet.
- **Topes**: los de la shell (orden de 2000 caracteres y 60 líneas, 300
  órdenes por intento, trabajo por orden, 600 kB de mundo) y los del clúster
  (`LIMITS` en `packages/k8ssim/src/limits.ts`): 260 objetos, 80 Pods, 16
  namespaces, 12 réplicas, 24 documentos por YAML, 10 port-forward, 10
  revisiones de Helm, 60 ficheros por volumen y 160 pasos de controlador por
  orden. Si algo se pasa, la orden falla y el mundo queda como estaba.
- **API**: como en shell y Docker: intentos validados con zod, 30 por persona
  cada diez minutos, 20 salidas de contrarreloj; estrellas y tiempo los pone
  la API.

## Enlace con Docker

- **Las imágenes**: el bloque 2 y los exámenes despliegan
  `ghcr.io/peer4u/api:1.0.0` y `ghcr.io/peer4u/front:1.0.0`, las que deja
  publicadas el jefe final avanzado del curso de Docker, con el mismo token
  (`~/.ghcr-token`). Un test (`k8ssim.test.ts`) ejecuta ese examen de Docker
  con `registryImages` y comprueba que todo lo que publica en
  `ghcr.io/peer4u` existe en el registro de Kubernetes.
- **Compose → manifiestos**: el examen principiante lleva el `compose.yaml` y
  el `.env` del examen de Docker a Deployments, Services, Secrets y un
  ConfigMap; cada unidad dice a qué equivale de Docker (el `environment:` es
  un ConfigMap, el `.env` un Secret, el nombre del servicio un Service, el
  volumen con nombre un PVC, `--scale` las réplicas, `--memory` y el 137 los
  límites y el OOMKilled, `USER` el `runAsNonRoot`, y el `HEALTHCHECK` de la
  imagen, que Kubernetes no mira, las sondas).
- **Orden**: se sugiere hacer antes el nivel principiante de Docker, sin
  bloquear (la investigación lo recomienda así: muchos llegan sabiendo Docker
  por Inception).

## Límites conocidos

- El contenido de las unidades está en castellano e inglés; en catalán y
  euskera se ve en castellano y en francés, en inglés (la interfaz sí está en
  los cinco idiomas).
- Las estimaciones son de partida: el tiempo activo real (`course_times`,
  curso `k8s`) servirá para ajustarlas.
- Si no aprobaste el examen de Docker, el curso usa igualmente las imágenes
  del catálogo (son las mismas etiquetas): no se personalizan con las tuyas.
