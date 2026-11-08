# Curso de Kubernetes: investigación y temario propuesto

Fecha: 2026-11-08. Documento de referencia para diseñar el curso interactivo de Kubernetes de Sanatorio 42. Sigue la [plantilla de cursos](../plantilla-cursos.md) (unidad = teoría + ejemplo + prueba en terminal simulada, validada por el estado final; jefe contrarreloj por bloque; jefe final por nivel con certificado) y continúa el [curso de Docker](curso-docker-investigacion.md), cuya sección 4 ya enumera los conceptos puente.

Público: estudiantes de 42, hispanohablantes, que ya saben shell, git y (casi siempre) Docker. Objetivo: **cómo se usa Kubernetes en el trabajo desde el lado de quien desarrolla** (desplegar, configurar, actualizar, depurar y empaquetar una aplicación), no montar ni administrar clústeres.

---

## 1. Cursos y temarios de referencia

| Recurso | Qué es | ¿Gratis? | Licencia | ¿Reutilizar o enlazar? |
|---|---|---|---|---|
| **kubernetes.io, «Learn Kubernetes Basics»** (kubernetes.io/docs/tutorials/kubernetes-basics/) y el resto de tutoriales y conceptos de la documentación oficial | 6 módulos: crear un clúster, desplegar una app, explorarla (pods, logs, exec), exponerla (Service), escalarla y actualizarla (rolling update y rollback). Ya no trae terminal propia (Katacoda cerró en 2022): remite a minikube o a los entornos de la página «Learning environment». | Sí | Documentación **CC BY 4.0** (repo `kubernetes/website`); marcas de la Linux Foundation aparte | **Se puede adaptar y traducir citando la fuente** («Basado en la documentación de Kubernetes, CC BY 4.0, © The Kubernetes Authors»). Su orden (desplegar → explorar → exponer → escalar → actualizar) es el esqueleto del nivel principiante. La documentación oficial (conceptos, tareas, referencia de `kubectl`) es la mejor fuente para la teoría corta de cada unidad. |
| **Kubernetes the Hard Way** (Kelsey Hightower, github.com/kelseyhightower/kubernetes-the-hard-way) | 13 laboratorios para montar a mano un clúster v1.32 (certificados, etcd, plano de control, nodos, rutas de red). Ni automatizado ni apto para producción, a propósito. | Sí | Contradictoria: el README dice **CC BY-NC-SA 4.0** y el archivo LICENSE es **Apache-2.0** | **Solo enlazar** (por la cláusula no comercial y porque el tema no es nuestro): es administración de clústeres, no uso. Buena lectura «para saber más» en el nivel avanzado. |
| **Linux Foundation LFS158 «Introduction to Kubernetes»** (training.linuxfoundation.org/training/introduction-to-kubernetes/; también en edX como LFS158x) | 17 capítulos, 15–20 h, a tu ritmo, con laboratorios: microservicios, orquestación, arquitectura, instalación, minikube, bloques básicos, autenticación y autorización, Services, desplegar una app, volúmenes, ConfigMaps y Secrets, Ingress, temas avanzados. Insignia con el 70 % del examen final. | **Sí, sigue siendo gratis** (0 $; ficha actualizada en mayo de 2026; requiere cuenta; acceso de 90 días) | Propietaria | **Solo enlazar.** Confirma el orden de temas y es la recomendación natural para quien quiera teoría larga en vídeo/texto. |
| **KodeKloud** (kodekloud.com) | «Kubernetes for the Absolute Beginners» con laboratorios en el navegador y cuestionarios; «Crash Course: Kubernetes for Absolute Beginners» gratis; laboratorios de muestra de CKA/CKAD; retos «Game of PODs». | El curso completo es de pago (o en Coursera Plus); hay un curso exprés gratuito y laboratorios sueltos | Propietaria | **Solo inspiración de mecánica** (terminal + validación del estado), como en Docker. Las notas públicas (notes.kodekloud.com) no se pueden copiar. |
| **TechWorld with Nana, «Kubernetes Tutorial for Beginners [FULL COURSE in 4 Hours]»** (YouTube, 2020) y «Kubernetes Crash Course for Absolute Beginners» | Vídeos: arquitectura, minikube y kubectl, YAML, Deployment/Service/ConfigMap/Secret con MongoDB + Mongo Express, namespaces, Ingress, Helm, volúmenes, StatefulSet. | Gratis (vídeo) | Licencia estándar de YouTube | **Solo enlazar.** Es el curso gratuito en vídeo más citado (de cientos de miles a millones de visitas según la fuente). Su ejemplo «app web + base de datos con ConfigMap y Secret» es justo el patrón de nuestro primer jefe final. |
| **freeCodeCamp** (YouTube): «Kubernetes Course – Full Beginners Tutorial (Containerize Your Apps!)» (Bogdan Stashchuk, ~3 h), «Docker Containers and Kubernetes Fundamentals» (Guy Barrette, ~6 h), «Docker and Kubernetes» (Nana + Amigoscode, ~4 h), curso de Saiyam Pathak y otros | Cursos en vídeo con práctica en local (minikube, kind). | Gratis | Vídeos con licencia de YouTube; los artículos de freeCodeCamp, con su propia licencia | **Solo enlazar.** Útiles como «para saber más» por nivel. |
| **Killercoda** (killercoda.com) | Escenarios en el navegador con clúster real (kubeadm de 1–2 nodos). Escenarios gratuitos de la comunidad y de Kim Wüstkamp; patio de juegos de Kubernetes. Los cursos CKA/CKAD y sesiones largas son de pago (PLUS/COURSE); la sesión gratuita dura aproximadamente 1 h. | En parte | Escenarios de terceros con licencias variables; plataforma propietaria | **Enlazar** como «practica en un clúster real» al final de cada nivel. Su formato (enunciado + verificación automática) es el más parecido al nuestro. Killer.sh (mismo equipo) es el simulador de examen de pago que viene con la certificación. |
| **iximiuz Labs** (labs.iximiuz.com) | Retos prácticos con verificación (p. ej. «depurar un Pod que falla»), patios de juegos y el curso «Kubernetes the (Very) Hard Way». No hay *roadmap* de Kubernetes como el de Docker; el contenido oficial completo es de pago. | Parte gratuita (tiempo diario limitado de patio de juegos) | Propietaria | **Solo enlazar e inspirarse** en el diseño de retos de depuración realista (arreglar, no solo teclear). |
| **Temarios CKAD y CKA** (github.com/cncf/curriculum, versión v1.37) | Lista oficial de competencias de los exámenes. | Sí | **CC BY 4.0** | **Reutilizable con cita.** Es la lista de control de cobertura del curso (ver sección 2). |
| **Proyecto «Inception-of-Things» de 42** | Proyecto del currículo de 42 tras «Inception» (Docker Compose): K3s con Vagrant (servidor + agente), 3 apps con Ingress por nombre de host, K3d + Argo CD desplegando desde un repositorio de GitHub (namespaces `argocd` y `dev`). | — | Enunciado de 42 | No es material reutilizable, pero **es la razón de ser del curso para nuestro público**: el nivel avanzado prepara justo lo que pide (Ingress por host, namespaces, cambiar la versión de la imagen y que se despliegue sola). |

**Conclusión:** lo único con licencia abierta y reutilizable es la documentación de kubernetes.io (CC BY 4.0) y el temario de la CNCF (CC BY 4.0). Con eso basta para la teoría y la cobertura; el resto se enlaza como «para saber más». Ningún curso gratuito hace lo que hacemos nosotros (terminal simulada, retos con reloj, sin instalar nada ni registrarse), y los que se acercan (KodeKloud, Killercoda, iximiuz) son de pago o limitan el tiempo.

---

## 2. Qué piden las empresas

### Señales del mercado
- **Encuesta anual de la CNCF 2025** (publicada el 20-01-2026): el **82 %** de quienes usan contenedores ya ejecuta Kubernetes **en producción** (66 % dos años antes). La CNCF lo presenta como el «sistema operativo de la IA» (el 66 % de quienes alojan modelos generativos lo usan para inferencia).
- **Encuesta de Stack Overflow**: Docker es casi universal (71 % en 2025); Kubernetes lo usa directamente alrededor de una cuarta parte (26 % en la de 2026, según la prensa). Es decir: **casi todo corre en Kubernetes, pero no todo el equipo lo toca a diario**; quien desarrolla interactúa con él a través de manifiestos, Helm/Kustomize y la CI.
- **Ofertas junior/mid** (muestra pequeña: Endava, Adtelligent, Soitron, Djinni): en DevOps/SRE junior se piden «conocimientos básicos de Kubernetes: Deployments, Services, namespaces, ConfigMaps y Secrets» y «familiaridad con Helm»; en backend y full-stack, Kubernetes y Helm suelen ir en «se valora». Varias guías de carrera de 2026 señalan que en muchas empresas **no se aplica nada a mano**: se despliega con Helm o Kustomize desde GitHub Actions/GitLab CI o con GitOps (Argo CD, Flux). `kubectl` se usa sobre todo para **mirar y depurar**.
- **Ingress NGINX está retirado** (anuncio del 11-11-2025, fin de mantenimiento en marzo de 2026). Ingress sigue siendo la API estable y la que más aparece en clústeres existentes y en el examen, pero lo nuevo va hacia **Gateway API** (incluida en el temario CKA desde la revisión de febrero de 2025). El curso enseña Ingress y presenta Gateway API.

### Temario CKAD v1.37 (CC BY 4.0), resumido
- **20 % Diseño y construcción**: imágenes; elegir la carga adecuada (Deployment, DaemonSet, CronJob…); patrones multicontenedor (sidecar, init); volúmenes persistentes y efímeros.
- **20 % Despliegue**: estrategias (blue/green, canary) con primitivas; Deployments y rolling updates; **Helm para desplegar paquetes existentes**; **Kustomize**.
- **15 % Observabilidad y mantenimiento**: APIs obsoletas; **probes y health checks**; herramientas de la CLI para vigilar; **logs**; **depurar en Kubernetes**.
- **25 % Entorno, configuración y seguridad**: CRD y operadores; autenticación, autorización y admisión; **requests, limits y cuotas**; **ConfigMaps**; **Secrets**; ServiceAccounts; SecurityContext.
- **20 % Servicios y redes**: NetworkPolicies básicas; **dar acceso y depurar Services**; **Ingress**.

El CKA añade administración (instalación con kubeadm, etcd, RBAC del clúster, nodos, almacenamiento) y pesa la **resolución de problemas al 30 %**. Para nuestro público, el CKAD es la referencia; del CKA tomamos solo el enfoque en depuración.

### Lo que se pregunta en entrevistas
Las listas consultadas (DataCamp, Weekday, Cloud Web School, techinterview.org, Simpliaxis) repiten:
1. Pod, ReplicaSet, Deployment: quién crea qué y por qué no se crean Pods sueltos.
2. Tipos de Service (ClusterIP, NodePort, LoadBalancer), selectores y endpoints; DNS del clúster.
3. ConfigMap frente a Secret (y que un Secret solo va en base64, no cifrado).
4. **Readiness frente a liveness** (y startup): qué pasa si te equivocas (reinicios en bucle o tráfico a pods no listos).
5. **Requests frente a limits**: requests para planificar; pasar el límite de CPU frena, pasar el de memoria mata (**OOMKilled, código 137 = 128 + SIGKILL**).
6. **Rolling update y rollback** (`rollout undo`), `maxSurge`/`maxUnavailable`.
7. **Depuración por estado**: `CrashLoopBackOff` (la app sale al arrancar: `logs --previous`, variable o Secret que falta, liveness mal puesta), `ImagePullBackOff` (etiqueta mal escrita o registro privado sin `imagePullSecrets`), `Pending` (sin recursos o PVC sin enlazar), `OOMKilled`. «Cómo distingues un CrashLoopBackOff de un OOMKill» separa a quien ha operado clústeres de quien solo ha leído.
8. Namespaces y contextos; `kubectl describe` y eventos.
9. StatefulSet frente a Deployment para bases de datos; PVC.
10. Helm (chart, release, values, upgrade/rollback) y Kustomize (base y overlays); despliegue desde CI/GitOps.

### Perfil esperado
- **Junior**: moverse con `kubectl` (get/describe/logs/exec/port-forward), leer y escribir un Deployment + Service + ConfigMap/Secret, actualizar la imagen y deshacer, reconocer los estados de error y saber por dónde mirar.
- **Mid**: probes y recursos bien puestos, Ingress, PVC/StatefulSet, Jobs para migraciones, Kustomize por entornos, `helm upgrade --install` con values, seguridad básica (no root, ServiceAccount), entender el flujo CI → registro → GitOps y resolver incidencias sin ayuda.

---

## 3. Temario propuesto (34 unidades, 7 jefes de bloque y 3 jefes finales, 2 de ellos exámenes)

### Convenciones
- Prefijo de slug `k8s-…`. Comandos «para aprobar» = **solución de referencia**; el simulador valida **el estado final** del clúster (objetos, sus campos y el estado de los Pods), no la cadena. Formas equivalentes cuentan igual (`kubectl create deployment` frente a `apply -f` con el YAML equivalente; `-n tienda` frente a cambiar el namespace del contexto; `deploy`/`deployment`/`deployments`).
- **Mundo fijo** (como `web1`/`db1` en shell): un clúster `staging` de 3 nodos (`nodo-1..3`, 2 CPU y 4 GiB cada uno) y, en el nivel avanzado, un contexto `produccion`. Entras con un `kubeconfig` ya configurado. Directorio de trabajo con los manifiestos que cada unidad prepara.
- **Catálogo de imágenes** (comportamiento determinista, igual que en Docker): `nginx:1.27`, `postgres:16`, `redis:7`, `busybox:1.36`, `curlimages/curl:8.10`, y las del examen de Docker: **`ghcr.io/sanatorio42/front:1.0.0`** (nginx en el 80 que sirve el front y hace de proxy de `/api` a `http://api:3000`) y **`ghcr.io/sanatorio42/api:1.0.0`** (Node en el 3000; `/health` responde 200 solo si tiene `DATABASE_URL` y alcanza `db`; sale con código 1 si falta la variable). Versiones trampa: `api:1.1.0` (necesita una variable nueva y sin ella entra en CrashLoopBackOff), `api:1.2.0` (arranca lento: 20 s hasta estar lista, para las probes), `ghcr.io/sanatorio42/informes:1.0.0` (va subiendo de memoria hasta 300 MiB, para OOMKilled). Las imágenes de `ghcr.io/sanatorio42` son **privadas**: hace falta `imagePullSecrets`.
- **Tiempo lógico**: el simulador avanza el reloj al ejecutar órdenes (`rollout status`, `get -w`, `wait`, `sleep`) para que se vean el arranque, las probes, los reinicios con *backoff* y el rolling update sin esperar de verdad.
- Los YAML se escriben con heredoc, como en Docker: `cat > deploy.yaml <<EOF … EOF` y luego `kubectl apply -f deploy.yaml`, o directamente `kubectl apply -f - <<EOF … EOF`.

### NIVEL PRINCIPIANTE: «Del compose al clúster»

#### Bloque 1. Orientarte en el clúster (4 unidades)

| # | Slug | Título | Objetivo | Comandos para aprobar |
|---|---|---|---|---|
| 1 | `k8s-hola` | Hola, clúster | Qué es un clúster (plano de control y nodos), qué hace `kubectl` y qué es el contexto. | `kubectl config get-contexts` → `kubectl cluster-info` → `kubectl get nodes -o wide` → `kubectl api-resources \| head` |
| 2 | `k8s-pods` | Tu primer Pod | El Pod es la unidad mínima; arrancarlo, verlo, leer sus logs y borrarlo (y ver que nadie lo recrea). | `kubectl run web --image=nginx:1.27` → `kubectl get pods -o wide` → `kubectl describe pod web` → `kubectl logs web` → `kubectl delete pod web` → `kubectl get pods` |
| 3 | `k8s-yaml` | Manifiestos YAML | Estado deseado declarativo: `apiVersion`, `kind`, `metadata`, `spec`; generar YAML con `--dry-run=client -o yaml`; `explain`. | `kubectl run web --image=nginx:1.27 --dry-run=client -o yaml > pod.yaml` → `kubectl explain pod.spec.containers` → editar labels con heredoc → `kubectl apply -f pod.yaml` → `kubectl get pod web -o yaml` |
| 4 | `k8s-namespaces` | Namespaces y contexto | Separar entornos o equipos; `-n`, `-A` y fijar el namespace del contexto. | `kubectl get ns` → `kubectl create namespace tienda` → `kubectl run web --image=nginx:1.27 -n tienda` → `kubectl get pods -A` → `kubectl config set-context --current --namespace=tienda` |

**[JEFE] `k8s-jefe-primer-dia`: «Primer día en el equipo de plataforma»** (4 min). En `staging` hay pods repartidos por namespaces. Tareas: encontrar en qué namespace está el pod `pagos`, guardar sus últimas 10 líneas de log en `~/informe/pagos.log`, borrar el pod `prueba-de-alguien` del namespace `default` sin tocar nada más y dejar el contexto apuntando a `tienda`.

#### Bloque 2. Desplegar y exponer (5 unidades)

| # | Slug | Título | Objetivo | Comandos para aprobar |
|---|---|---|---|---|
| 5 | `k8s-deployment` | Deployments: que se cuide solo | Deployment → ReplicaSet → Pods; borrar un Pod y ver que vuelve (reconciliación). | `kubectl create deployment web --image=nginx:1.27 --replicas=2` → `kubectl get deploy,rs,pods` → `kubectl delete pod <uno>` → `kubectl get pods` (vuelven a ser 2) |
| 6 | `k8s-escalar` | Escalar | Cambiar réplicas de forma imperativa y declarativa; por qué gana el YAML del repo. | `kubectl scale deployment web --replicas=4` → `kubectl get pods -o wide` (repartidos por nodos) → `kubectl get deploy web -o yaml > web.yaml` → poner `replicas: 3` → `kubectl apply -f web.yaml` |
| 7 | `k8s-labels` | Labels y selectores | Todo se une por labels: el Deployment a sus Pods, el Service a sus Pods. Filtrar con `-l`. | `kubectl get pods --show-labels` → `kubectl get pods -l app=web` → `kubectl label pod <uno> app-` (sale del ReplicaSet y se crea otro) → `kubectl get pods -L app` |
| 8 | `k8s-service` | Services y DNS | Un Service da nombre y dirección estables a Pods que cambian; ClusterIP, `targetPort`, endpoints, DNS `web.tienda.svc.cluster.local`. Mapa con Compose: «el nombre del servicio» ahora es un Service. | `kubectl expose deployment web --port=80` → `kubectl get svc,endpointslices` → `kubectl run tmp --rm -it --image=curlimages/curl:8.10 --restart=Never -- curl -s web` |
| 9 | `k8s-port-forward` | Llegar desde tu máquina | `port-forward` para probar en local; NodePort y LoadBalancer en una línea (cuándo sí y cuándo no). | `kubectl port-forward svc/web 8080:80` (el simulador lo deja «en segundo plano») → `curl localhost:8080` → `kubectl expose deployment web --name=web-np --type=NodePort --port=80` → `kubectl get svc web-np` |

**[JEFE] `k8s-jefe-sube-el-front`: «Sube el frontend»** (5 min). Primer contacto con la imagen del curso de Docker. Con el Secret de registro ya creado (`ghcr`), desplegar `ghcr.io/sanatorio42/front:1.0.0` con 2 réplicas y `imagePullSecrets`, exponerlo con un Service `front` en el 80 y comprobar con `port-forward` + `curl localhost:8080`. Trampa: el Service que dejó «otra persona» tiene el selector `app: frontend` y no tiene endpoints; hay que corregirlo. ★★★ si se mira `get endpointslices` o `describe svc` antes de tocar.

#### Bloque 3. Configurar la aplicación (3 unidades)

| # | Slug | Título | Objetivo | Comandos para aprobar |
|---|---|---|---|---|
| 10 | `k8s-configmap` | ConfigMaps | Sacar la configuración de la imagen: `--from-literal`, `--from-file`; consumir con `env`, `envFrom` y como archivo montado. Equivale al `environment:` de Compose. | `kubectl create configmap api-config --from-literal=LOG_LEVEL=info --from-literal=PORT=3000` → Deployment con `envFrom: [{configMapRef: {name: api-config}}]` → `kubectl exec deploy/api -- env \| grep LOG_LEVEL` |
| 11 | `k8s-secret` | Secrets | Contraseñas y tokens: `create secret generic`, `secretKeyRef`; base64 no es cifrado; nunca en el repo en claro. Equivale al `.env` de Compose. | `kubectl create secret generic db --from-literal=POSTGRES_PASSWORD=secreto` → `kubectl get secret db -o jsonpath='{.data.POSTGRES_PASSWORD}' \| base64 -d` → `postgres:16` con `env: - name: POSTGRES_PASSWORD, valueFrom: secretKeyRef: {name: db, key: POSTGRES_PASSWORD}` |
| 12 | `k8s-imagenes` | Imágenes privadas y etiquetas | `image:` con etiqueta fija (nunca `latest`), `imagePullPolicy`, registro privado con `imagePullSecrets`. Enlaza con las unidades de registro del curso de Docker. | `kubectl create secret docker-registry ghcr --docker-server=ghcr.io --docker-username=peer --docker-password=$TOKEN` → Deployment `api` con `image: ghcr.io/sanatorio42/api:1.0.0` e `imagePullSecrets: [{name: ghcr}]` → `kubectl get pods` (Running, no ImagePullBackOff) |

**[JEFE FINAL PRINCIPIANTE · EXAMEN 1] `k8s-final-principiante`: «Del `compose.yaml` al clúster»** (12 min). **Enlace con el examen A del curso de Docker**: el directorio de trabajo trae el `compose.yaml` y el `.env` de ese examen (front, API y Postgres). Hay que llevarlo a Kubernetes en el namespace `tienda`:
1. Secret `db` con la contraseña (desde el `.env`, no escrita en el YAML) y Secret `ghcr` para el registro.
2. `db`: Deployment de `postgres:16` (1 réplica, sin persistencia aún: se arregla en el nivel avanzado) y Service `db` en el 5432.
3. `api`: Deployment de `ghcr.io/sanatorio42/api:1.0.0` con 2 réplicas, `DATABASE_URL` montada desde el Secret, ConfigMap `api-config` y Service `api` en el 3000 (el nombre importa: el front hace de proxy a `http://api:3000`).
4. `front`: Deployment de `ghcr.io/sanatorio42/front:1.0.0` con 2 réplicas y Service `front` en el 80.
5. Verificar con `kubectl port-forward svc/front 8080:80` y `curl localhost:8080/api/health`.

Se valida el estado final (objetos, imágenes privadas descargadas, Pods `Running`, `/api/health` responde 200). ★★★ por tiempo, como todos los jefes. Si el estudiante aprobó el examen A de Docker, el enunciado usa **sus** etiquetas (`1.0.0` y el SHA de git que publicó); si no, las del catálogo.

Ejemplo de la solución para la API (lo demás es análogo):

```yaml
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata: {name: api, namespace: tienda, labels: {app: api}}
spec:
  replicas: 2
  selector: {matchLabels: {app: api}}
  template:
    metadata: {labels: {app: api}}
    spec:
      imagePullSecrets: [{name: ghcr}]
      containers:
      - name: api
        image: ghcr.io/sanatorio42/api:1.0.0
        ports: [{containerPort: 3000}]
        envFrom: [{configMapRef: {name: api-config}}]
        env:
        - name: DATABASE_URL
          valueFrom: {secretKeyRef: {name: db, key: DATABASE_URL}}
---
apiVersion: v1
kind: Service
metadata: {name: api, namespace: tienda}
spec:
  selector: {app: api}
  ports: [{port: 3000, targetPort: 3000}]
EOF
```

### NIVEL INTERMEDIO: «Producción sin sustos»

#### Bloque 4. Actualizar sin cortes (4 unidades)

| # | Slug | Título | Objetivo | Comandos para aprobar |
|---|---|---|---|---|
| 13 | `k8s-rolling-update` | Rolling update | Cambiar la imagen y ver cómo se sustituyen los Pods poco a poco; anotar el motivo del cambio. | `kubectl set image deployment/api api=ghcr.io/sanatorio42/api:1.0.1` → `kubectl annotate deployment/api kubernetes.io/change-cause="sube a 1.0.1"` → `kubectl rollout status deployment/api` → `kubectl rollout history deployment/api` |
| 14 | `k8s-rollback` | Deshacer un despliegue | La 1.1.0 entra en CrashLoopBackOff; el rolling update se queda a medias y las réplicas viejas siguen sirviendo. Volver atrás. | `kubectl set image deployment/api api=ghcr.io/sanatorio42/api:1.1.0` → `kubectl rollout status deployment/api --timeout=60s` (falla) → `kubectl get pods` → `kubectl rollout undo deployment/api` (o `--to-revision=2`) → `kubectl rollout history deployment/api` |
| 15 | `k8s-estrategia` | Estrategias de despliegue | `maxSurge`/`maxUnavailable`, `Recreate` (cuándo hace falta), y un canary simple con dos Deployments detrás del mismo Service. | Editar `strategy: {rollingUpdate: {maxSurge: 1, maxUnavailable: 0}}` y `kubectl apply -f api.yaml` → crear `api-canary` (1 réplica, `1.0.2`, mismas labels `app: api`) → `kubectl get endpointslices -l kubernetes.io/service-name=api` (4 + 1) |
| 16 | `k8s-apply-diff` | Declarativo de verdad | `kubectl diff` antes de aplicar; `edit` y `set` cambian el clúster pero no el repo (deriva); el YAML del repo es la fuente de la verdad. | `kubectl edit deployment api` (cambiar réplicas) → `kubectl diff -f api.yaml` (ver la deriva) → `kubectl apply -f api.yaml` → `kubectl diff -f api.yaml` (vacío) |

**[JEFE] `k8s-jefe-viernes`: «Viernes, 17:55»** (5 min). Alguien ha desplegado `api:1.1.0` con `kubectl set image` y la mitad de los Pods están en CrashLoopBackOff. Tareas: volver a la última versión buena, averiguar con `logs --previous` qué variable pide la 1.1.0, añadirla al ConfigMap y al `api.yaml` del repo, y desplegar de nuevo la 1.1.0 **desde el YAML** hasta que el rollout complete.

#### Bloque 5. Salud y recursos (3 unidades)

| # | Slug | Título | Objetivo | Comandos para aprobar |
|---|---|---|---|---|
| 17 | `k8s-readiness` | Readiness: no mandes tráfico antes de tiempo | La 1.2.0 tarda 20 s en arrancar; sin readiness, el Service le manda tráfico y fallan peticiones. Kubernetes ignora el `HEALTHCHECK` del Dockerfile. | Añadir `readinessProbe: {httpGet: {path: /health, port: 3000}, periodSeconds: 5}` → `kubectl apply -f api.yaml` → `kubectl get pods -w` (0/1 → 1/1) → `kubectl get endpointslices` (solo los listos) |
| 18 | `k8s-liveness` | Liveness y startup | Liveness reinicia lo que se cuelga; mal puesta, provoca reinicios en bucle. `startupProbe` para arranques lentos. | Añadir `livenessProbe` con `initialDelaySeconds: 3` → ver reinicios (`RESTARTS` sube, `describe` muestra «Liveness probe failed») → añadir `startupProbe: {httpGet: …, failureThreshold: 30, periodSeconds: 2}` → `kubectl apply -f api.yaml` → reinicios estables |
| 19 | `k8s-recursos` | Requests, limits y OOMKilled | Requests para planificar, limits como techo; CPU se frena, memoria mata (137). Ver consumo. | `kubectl apply -f informes.yaml` (limit 128Mi) → `kubectl get pods -w` → `kubectl describe pod informes-…` (`Last State: Terminated, Reason: OOMKilled, Exit Code: 137`) → poner `resources: {requests: {cpu: 100m, memory: 256Mi}, limits: {memory: 384Mi}}` → `kubectl apply` → `kubectl top pods` |

**[JEFE] `k8s-jefe-picos`: «Los lunes se cae»** (6 min). La API reinicia sin parar en cada arranque (liveness de 1 s sobre una app lenta) y el Pod de informes muere por memoria. Dejar la API con readiness, liveness y startup razonables y requests/limits; informes sin OOMKilled; cero reinicios en los últimos 2 minutos del reloj simulado.

#### Bloque 6. Depurar (5 unidades)

| # | Slug | Título | Objetivo | Comandos para aprobar |
|---|---|---|---|---|
| 20 | `k8s-crashloop` | CrashLoopBackOff | Método: `get` → `describe` (último estado, código de salida) → `logs --previous` → arreglar la causa (Secret con clave equivocada). | `kubectl get pods` → `kubectl describe pod api-…` → `kubectl logs api-… --previous` → `kubectl get secret db -o yaml` → corregir la clave → `kubectl rollout restart deployment/api` |
| 21 | `k8s-imagepull` | ImagePullBackOff y ErrImagePull | Etiqueta mal escrita o falta de `imagePullSecrets`; leerlo en los eventos. | `kubectl describe pod front-…` (Events: `manifest unknown` / `401 Unauthorized`) → `kubectl set image deployment/front front=ghcr.io/sanatorio42/front:1.0.0` → `kubectl patch deployment front -p '{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ghcr"}]}}}}'` |
| 22 | `k8s-pending` | Pods en Pending | El planificador no encuentra sitio: requests demasiado grandes, ConfigMap que no existe (`CreateContainerConfigError`) o nodo cordonado. | `kubectl get pods` → `kubectl describe pod …` (`0/3 nodes are available: Insufficient memory`) → `kubectl describe nodes \| grep -A5 Allocated` → bajar requests → `kubectl get events --sort-by=.lastTimestamp` |
| 23 | `k8s-exec-debug` | Entrar a mirar | `exec` para mirar dentro, `kubectl debug` con contenedor efímero cuando la imagen no trae shell, `cp`. | `kubectl exec -it deploy/api -- sh` → `env`, `wget -qO- localhost:3000/health` → `kubectl debug -it api-… --image=busybox:1.36 --target=api` → `kubectl cp tienda/api-…:/app/config.json ./config.json` |
| 24 | `k8s-red` | El Service no llega | Fallos de red típicos: selector que no casa, `targetPort` equivocado, Service en otro namespace (`db.datos.svc.cluster.local`). | `kubectl get endpointslices` (vacío) → `kubectl get pods --show-labels` → corregir el selector → `kubectl run tmp --rm -it --image=curlimages/curl:8.10 --restart=Never -- curl -s api:3000/health` |

**[JEFE FINAL INTERMEDIO] `k8s-final-intermedio`: «Guardia: producción está caída»** (15 min). Escenario precargado en `tienda` con fallos encadenados: `front` en ImagePullBackOff (etiqueta `1.0` en vez de `1.0.0`), `api` en CrashLoopBackOff (falta la clave `DATABASE_URL` en el Secret), `db` en Pending (pide 8 GiB), el Service `api` con `targetPort: 8080` y una liveness que mata la API cada minuto. Resolver por prioridad hasta que `curl localhost:8080/api/health` responda 200 y escribir en `~/informe/causas.txt` una línea por causa. ★★★ por tiempo; el simulador avisa si se borra el namespace entero («así no se arregla en producción»).

### NIVEL AVANZADO: «Como en el trabajo»

#### Bloque 7. Datos y tareas (4 unidades)

| # | Slug | Título | Objetivo | Comandos para aprobar |
|---|---|---|---|---|
| 25 | `k8s-pvc` | Volúmenes persistentes | El `emptyDir` del examen 1 pierde los datos; PVC, StorageClass y el volumen que sobrevive al Pod (equivale al volumen con nombre de Docker). | `kubectl get storageclass` → crear PVC `pgdata` (`ReadWriteOnce`, 1Gi) → montarlo en `/var/lib/postgresql/data` → `kubectl exec deploy/db -- psql -U postgres -c 'CREATE TABLE t(x int)'` → `kubectl delete pod db-…` → la tabla sigue → `kubectl get pv,pvc` |
| 26 | `k8s-statefulset` | StatefulSet para la base de datos | Identidad estable (`db-0`), `volumeClaimTemplates` y Service *headless*; por qué una base de datos no va en un Deployment (y por qué en producción se suele usar una gestionada). | `kubectl apply -f db-statefulset.yaml` (con `serviceName: db`, `clusterIP: None`) → `kubectl get sts,pods,pvc` → `kubectl delete pod db-0` → vuelve `db-0` con el mismo PVC |
| 27 | `k8s-jobs` | Jobs y CronJobs | Tareas que acaban: migraciones con un Job antes de desplegar; copia diaria con un CronJob. | `kubectl create job migra --image=ghcr.io/sanatorio42/api:1.0.0 -- npm run migrate` → `kubectl wait --for=condition=complete job/migra` → `kubectl logs job/migra` → `kubectl create cronjob copia --image=postgres:16 --schedule="0 3 * * *" -- pg_dump …` → `kubectl create job copia-ya --from=cronjob/copia` |
| 28 | `k8s-init-sidecar` | Contenedores init y sidecar | `initContainers` que esperan a la base de datos o migran; un sidecar que lee los logs. | Añadir `initContainers: [{name: espera-db, image: busybox:1.36, command: ["sh","-c","until nc -z db 5432; do sleep 2; done"]}]` → `kubectl apply -f api.yaml` → `kubectl get pods` (`Init:0/1` → `Running`) → `kubectl logs api-… -c espera-db` |

**[JEFE] `k8s-jefe-datos`: «Se perdieron los pedidos»** (7 min). Postgres del examen 1 sin volumen: pasarlo a StatefulSet con PVC, restaurar `backup.sql` (con `kubectl cp` + `exec psql`), lanzar la migración como Job y dejar un CronJob de copia a las 03:00.

#### Bloque 8. Tráfico, escala y aislamiento (3 unidades)

| # | Slug | Título | Objetivo | Comandos para aprobar |
|---|---|---|---|---|
| 29 | `k8s-ingress` | Ingress (y Gateway API) | Un único punto de entrada HTTP por host y ruta: `/` al front y `/api` a la API; `ingressClassName`; TLS con un Secret. Ingress NGINX está retirado desde marzo de 2026: se enseña el recurso Ingress (estable y en todas partes) y la equivalencia con `Gateway` + `HTTPRoute`. Enlaza con la parte 2 de Inception-of-Things. | `kubectl create ingress tienda --class=traefik --rule="tienda.local/*=front:80" --rule="tienda.local/api*=api:3000"` → `kubectl get ingress` → `curl -H 'Host: tienda.local' http://<ip-ingress>/api/health` → (lectura) el mismo enrutado como `HTTPRoute` |
| 30 | `k8s-hpa` | Escalado automático | HPA por CPU; requiere requests; ver cómo sube con carga simulada y baja después. | `kubectl autoscale deployment api --cpu-percent=70 --min=2 --max=6` → `kubectl run carga --image=busybox:1.36 -- sh -c 'while true; do wget -qO- api:3000; done'` → `kubectl get hpa -w` → `kubectl delete pod carga` |
| 31 | `k8s-networkpolicy` | NetworkPolicies | Por defecto todo habla con todo; denegar todo y permitir solo front → api → db. | `kubectl apply -f deny-all.yaml` (`podSelector: {}`, `policyTypes: [Ingress]`) → la web falla → permitir `app: api` hacia `app: db` en 5432 y `app: front` hacia `app: api` en 3000 → `kubectl run tmp … curl db:5432` falla y la web vuelve |

**[JEFE] `k8s-jefe-lanzamiento`: «Sale en la tele mañana»** (7 min). Exponer la tienda en `tienda.local` con Ingress (front en `/`, API en `/api`, TLS con el Secret `tienda-tls` ya creado), HPA de 2 a 8 réplicas para la API, y que la base de datos solo acepte conexiones de la API.

#### Bloque 9. Empaquetar y desplegar como un equipo (3 unidades)

| # | Slug | Título | Objetivo | Comandos para aprobar |
|---|---|---|---|---|
| 32 | `k8s-kustomize` | Kustomize: un repo, varios entornos | `base/` + `overlays/staging` y `overlays/produccion` (réplicas, etiqueta de imagen, namespace); `kubectl apply -k`; así actualiza la CI la imagen. | `cat > base/kustomization.yaml <<EOF resources: [api.yaml, front.yaml] EOF` → `overlays/produccion/kustomization.yaml` con `resources: [../../base]`, `namespace: produccion`, `replicas: [{name: api, count: 4}]` → `cd overlays/produccion && kustomize edit set image ghcr.io/sanatorio42/api:1.2.0` → `kubectl kustomize .` → `kubectl apply -k .` |
| 33 | `k8s-helm` | Helm: usar charts | Chart, release, values; instalar un chart ajeno (Redis), cambiar values, actualizar y deshacer. Helm para «lo de otros», Kustomize o Helm para lo propio. | `helm repo add bitnami https://charts.bitnami.com/bitnami` → `helm install cache bitnami/redis --set architecture=standalone -n tienda` → `helm list -n tienda` → `helm get values cache -n tienda` → `helm upgrade cache bitnami/redis -f valores.yaml -n tienda` → `helm history cache -n tienda` → `helm rollback cache 1 -n tienda` |
| 34 | `k8s-seguridad` | Seguridad básica del Pod | `securityContext` (`runAsNonRoot`, `readOnlyRootFilesystem`, `allowPrivilegeEscalation: false`), ServiceAccount propia sin token montado, y `kubectl auth can-i` para comprobar permisos. Enlaza con `USER` del curso de Docker. | Añadir `securityContext` al Deployment `api` → `kubectl apply -f api.yaml` → `kubectl exec deploy/api -- id` (no `uid=0`) → `kubectl create serviceaccount api` → `kubectl auth can-i list secrets --as=system:serviceaccount:tienda:api` (`no`) |

La teoría de la unidad 32 cierra con **GitOps** en un párrafo (Argo CD o Flux miran el repo y aplican; la CI solo cambia la etiqueta en el overlay y hace commit), sin simularlo: es lo que pide la parte 3 de Inception-of-Things y lo que se encontrarán en la mayoría de empresas.

**[JEFE] `k8s-jefe-entornos`: «Staging y producción»** (6 min). Pasar los YAML sueltos de `tienda` a `base/` + dos overlays; producción con 4 réplicas de la API y la imagen `1.2.0`, staging con 1 réplica y `1.3.0-rc1`; aplicar ambos; instalar Redis con Helm solo en staging.

**[JEFE FINAL AVANZADO · EXAMEN 2] `k8s-final-avanzado`: «El lanzamiento»** (20 min). Se recibe el repositorio de la tienda con YAML sueltos, sin probes ni recursos, con secretos en claro y la base de datos en un Deployment. Entregar en el contexto `produccion`:
1. Kustomize con `base/` y `overlays/produccion`; ningún secreto en claro en el repo (Secrets creados con `kubectl create secret` o `secretGenerator` desde un archivo ignorado por git).
2. Postgres en StatefulSet con PVC; migraciones con un Job que completa antes de la API (o `initContainer`).
3. API y front con readiness, liveness, requests/limits, `securityContext` sin root y `imagePullSecrets`.
4. Ingress `tienda.local` (`/` y `/api`) con TLS; HPA de la API; NetworkPolicy que aísla la base de datos.
5. Desplegar `api:1.2.0`; después, `api:1.3.0` falla las readiness (trampa): detectarlo con `rollout status`, hacer rollback y dejar el overlay en `1.2.0`.

Puntuación por tiempo como todos los jefes; el simulador comprueba además que `kubectl diff -k overlays/produccion` quede vacío (el repo describe lo que hay en el clúster).

### Resumen de la estructura

| Nivel | Bloques | Unidades | Jefes | Jefe final |
|---|---|---|---|---|
| Principiante | 1. Orientarte · 2. Desplegar y exponer · 3. Configurar | 12 | 2 (+ el final hace de jefe del bloque 3) | **Examen 1**: «Del `compose.yaml` al clúster» (despliega front + API + Postgres del examen de Docker) |
| Intermedio | 4. Actualizar · 5. Salud y recursos · 6. Depurar | 12 | 2 (+ final) | «Guardia: producción está caída» |
| Avanzado | 7. Datos y tareas · 8. Tráfico y escala · 9. Empaquetar | 10 | 3 | **Examen 2**: «El lanzamiento» |

34 unidades, 7 jefes de bloque y 3 jefes finales (44 puntos). Si se prefiere un jefe propio en los bloques 3 y 6, añadir `k8s-jefe-config` («la contraseña está en el repo»: pasar valores a ConfigMap/Secret) y `k8s-jefe-incidencia-corta`. Unidades opcionales para recortar o ampliar: `k8s-daemonset` (agente de logs en cada nodo), `k8s-gateway-api` (unidad propia de `Gateway`/`HTTPRoute` cuando el simulador lo soporte), `k8s-cuotas` (`ResourceQuota` y `LimitRange` por namespace), `k8s-helm-chart` (`helm create` + `helm template` + `helm lint` de un chart propio).

### Qué debe modelar el simulador (y qué no)
- **Sí:** un almacén de objetos de la API (Namespace, Pod, Deployment, ReplicaSet, StatefulSet, Job, CronJob, Service, EndpointSlice, ConfigMap, Secret, PVC/PV/StorageClass, Ingress, HPA, NetworkPolicy, ServiceAccount, Event, Node) con validación de esquema suficiente para dar errores reales de `kubectl apply`; **controladores** deterministas paso a paso (Deployment → ReplicaSet → Pods, rolling update con `maxSurge`/`maxUnavailable`, StatefulSet con PVC, Job, HPA con métrica simulada); **planificador** con capacidad por nodo y requests; **ciclo de vida del contenedor** según el catálogo (pull con o sin secret, `CrashLoopBackOff` con backoff, `OOMKilled` 137, probes con su temporización); DNS de Services; NetworkPolicy como tabla de permitidos; `port-forward`/`curl` resolviendo hasta la «respuesta» de la imagen; Kustomize (resources, namespace, images, replicas, patches simples, secretGenerator) y un Helm reducido (2–3 charts en un repo simulado con sus values y su historial de releases).
- **Salidas** con el formato real de `kubectl get` (columnas), `describe` (incluidos Events), `-o yaml`, `-o jsonpath` básico, `rollout status/history`, `top` y `auth can-i`.
- **No:** instalación del clúster (kubeadm, etcd, certificados: eso es Kubernetes the Hard Way, solo se enlaza), CNI real, RBAC completo (solo `can-i` sobre reglas precargadas), CRD y operadores (se nombran en teoría), Argo CD (se explica, no se simula).

---

## 4. ¿Requisito del curso de Docker o solo enlace?

**Recomendación: enlazarlo como «recomendado» con un aviso, no bloquearlo como requisito; y premiar a quien sí lo hizo.**

Motivos:
1. **Muchos ya saben Docker por otra vía.** En el currículo de 42, *Inception* (Docker Compose con nginx, WordPress y MariaDB) llega antes que *Inception-of-Things* (K3s, K3d, Argo CD). Obligar a repetir 42 unidades de Docker a quien hizo Inception sería un muro sin sentido, y la plantilla ya abre el camino de uno en uno dentro de cada curso.
2. **Lo que el curso de Kubernetes necesita de Docker es poco y concreto**: imagen y etiqueta, registro privado, puertos, variables de entorno, logs, códigos de salida, healthchecks y volúmenes (niveles 0–3 del curso de Docker y su sección 4). No se construyen imágenes en ninguna unidad de Kubernetes. Eso se cubre con una pantalla de entrada («Antes de empezar: esto deberías saber») con enlaces directos a las unidades de Docker correspondientes y, en cada unidad de Kubernetes, un recuadro «En Docker era…» que apunte a la unidad equivalente.
3. **El enlace fuerte va por el contenido, no por el candado**: el bloque 2 y el examen 1 despliegan las imágenes del examen A de Docker. Si la persona aprobó ese examen, el enunciado usa **sus propias etiquetas** (su `1.0.0` y su SHA) y lo dice («las imágenes que publicaste en el curso de Docker»); si no, usa las del catálogo y muestra «¿Quieres construirlas tú? Curso de Docker, examen A».
4. **Si se quiere algún candado**, el razonable es blando: pedir el **certificado de principiante de Docker** solo para el **nivel intermedio** de Kubernetes, o permitir saltarlo superando un jefe de diagnóstico corto («Lee este `docker ps -a` y `docker logs`»). Bloquear todo el curso detrás del certificado avanzado de Docker no aporta nada al aprendizaje de Kubernetes.

---

## 5. Fuentes

Cursos y documentación
- Learn Kubernetes Basics (CC BY 4.0): https://kubernetes.io/docs/tutorials/kubernetes-basics/ ; licencia: https://git.k8s.io/website/LICENSE
- Kubernetes the Hard Way: https://github.com/kelseyhightower/kubernetes-the-hard-way ; LICENSE (Apache-2.0): https://github.com/kelseyhightower/kubernetes-the-hard-way/blob/master/LICENSE
- LFS158 Introduction to Kubernetes (gratis): https://training.linuxfoundation.org/training/introduction-to-kubernetes/ ; edX: https://edx.org/es/course/introduction-kubernetes-linuxfoundationx-lfs158x ; insignia: https://www.credly.com/org/the-linux-foundation/badge/lfs158-introduction-to-kubernetes
- KodeKloud, Kubernetes for the Absolute Beginners: https://www.coursera.org/learn/kubernetes-for-absolute-beginners ; curso exprés gratuito: https://kodekloud.com/courses/crash-course-kubernetes-for-absolute-beginners
- TechWorld with Nana, curso de 4 h: https://dev.to/techworld_with_nana/full-kubernetes-course-free-24hp ; ficha: https://classcentral.com/course/youtube-kubernetes-tutorial-for-beginners-full-course-in-4-hours-108866 ; crash course: https://classcentral.com/course/youtube-kubernetes-crash-course-for-absolute-beginners-new-108861
- freeCodeCamp: https://classcentral.com/course/freecodecamp-kubernetes-course-full-beginners-tutorial-containerize-your-apps-104877 ; https://www.freecodecamp.org/news/learn-docker-and-kubernetes-hands-on-course/ ; https://www.freecodecamp.org/news/course-on-docker-and-kubernetes/ ; https://www.freecodecamp.org/news/master-kubernetes-through-production-ready-practice/
- Killercoda, planes: https://killercoda.com/pricing ; revisión de laboratorios: https://www.develeap.com/?p=3065
- iximiuz Labs: https://labs.iximiuz.com/docs/learning-materials/challenges ; https://newsletter.iximiuz.com/posts/kubernetes-the-very-hard-way-a-new-iximiuz-labs-course-by-mark-sagi-kazar ; https://labs.iximiuz.com/pricing/official-content-pack
- Temario CNCF (CC BY 4.0), CKAD/CKA v1.37: https://github.com/cncf/curriculum ; CKAD: https://www.cncf.io/training/certification/ckad/
- Inception-of-Things (42), resúmenes de estudiantes: https://github.com/AndreIglesias/Inception-of-Things ; https://github.com/iker-gonzalez/inception-of-things

Mercado, tendencias y entrevistas
- Encuesta anual de la CNCF 2025 (informe): https://www.linuxfoundation.org/hubfs/Research%20Reports/CNCF_Annual_Survey_Report_1.15.26.pdf ; nota: https://www.cncf.io/announcements/2026/01/20 ; resumen: https://cioinfluence.com/cloud/kubernetes-established-as-the-de-facto-operating-system-for-ai-as-production-use-hits-82-in-2025-cncf-annual-cloud-native-survey/
- Stack Overflow, encuesta 2025: https://survey.stackoverflow.co/2025/technology/ ; encuesta 2026 (Kubernetes 26 %): https://virtualizationreview.com/articles/2026/10/06/stack-overflow-survey-aws-leads-cloud-usage-azure-and-google-nearly-tied.aspx
- Retirada de Ingress NGINX: https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/ ; declaración de enero de 2026: https://www.kubernetes.io/blog/2026/01/29/ingress-nginx-statement/
- Ofertas de ejemplo: https://www.soitron.com/job_offer/junior-devops-developer-kubernetes/ ; https://djinni.co/jobs/849776-junior-sre-devops-engineer/ ; https://hw.glich.co/jobboard/jobs/junior-devops-engineer-at-endava-y1o32a ; https://careers.adtelligent.com/?p=1979 ; guía de carrera 2026: https://jobrise.io/de/blog/kubernetes-lernen-devops-job-deutschland/
- Preguntas de entrevista: https://www.datacamp.com/blog/kubernetes-interview-questions ; https://www.weekday.works/post/kubernetes-interview-questions ; https://cloudwebschool.com/docs/career/interview-prep/kubernetes-interview-questions/ ; https://www.techinterview.org/post/3233477276/what-kubernetes-interviewers-actually-ask/ ; https://www.simpliaxis.com/resources/kubernetes-interview-questions

Nota de método: las ofertas no se han analizado a escala (muestra pequeña de anuncios y guías de carrera); la sección 2 se apoya sobre todo en el temario CKAD, la encuesta de la CNCF y la coincidencia entre listas de preguntas. Los pesos del CKA (resolución de problemas 30 %) se citan de memoria a partir del temario; conviene contrastarlos con el PDF v1.37. Las cifras de visitas y los planes gratuitos de Killercoda, iximiuz y KodeKloud cambian con frecuencia. La duración de la sesión gratuita de Killercoda (1 h) se deduce de su página de precios.
