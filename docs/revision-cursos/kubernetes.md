# Revisión del curso de Kubernetes (2026-11-09)

Revisión punto por punto del [curso de Kubernetes](../curso-kubernetes.md)
frente a Kubernetes 1.31–1.34 (k3s), kubectl, Kustomize 5 y Helm 3: (a) que
lo que dice cada unidad sea cierto; (b) que lo que enseña sea la forma de
trabajar de hoy; (c) que las formas válidas de llegar al mismo sitio valgan.
Cada alternativa de la tabla se ha ejecutado con `checkAttempt` (el corrector
de la web y de la API) y sale con el objetivo cumplido; lo que cambió en el
motor tiene su test en `apps/api/tests/unit/k8ssim-fidelity.test.ts`.

No había clúster de verdad a mano (Docker no puede arrancar k3s aquí): los
mensajes se han contrastado con el código de kubectl, del kubelet y de
Kustomize que se conocen, no con una ejecución real. Lo dudoso está en
«Lo que se queda distinto».

## Lo que se arregló en el motor (`packages/k8ssim`)

| Qué hacía | Qué hace ahora (como el de verdad) |
| --- | --- |
| Cambiar un ConfigMap o un Secret cambiaba al momento las variables de los Pods que corrían | Las variables se resuelven al crear el contenedor y se guardan: cambian al reiniciarse el contenedor (un CrashLoop que se arregla solo) o al recrear el Pod (`rollout restart`). Los ficheros montados de un ConfigMap siguen al día |
| `kubectl logs -c <init>` fallaba si el init no había acabado; los mensajes de un contenedor que no ha arrancado decían «trying and failing to pull image» para todo | Un init en marcha da sus registros (vacíos si no escribe); uno que aún no ha empezado, `is waiting to start: PodInitializing`; un `-c` que no existe, `Error from server (BadRequest): container X is not valid for pod Y` (en `exec`, `unable to upgrade connection: container not found`) |
| `logs` y `logs --previous` enseñaban lo mismo | `logs` es la instancia que corre (lo que lleva escrito); si está esperando a reiniciarse, la última que acabó; `--previous`, siempre la última que acabó, también la de antes de un arreglo, y el error del servidor si no hay ninguna |
| El primer reinicio esperaba 10 s | El primero va enseguida y luego 10 s, 20 s, 40 s… hasta 5 min (`back-off 10s restarting failed container=…`) |
| Un contenedor que iba a caerse salía 0/1 mientras corría | Sin sondas está 1/1 Running hasta que se cae (el informe que acaba en OOMKilled); lo que muere en menos de un segundo no llega a verse listo, así que un rollout con una imagen que no arranca sigue atascado: `Waiting for deployment "api" rollout to finish: 1 out of 3 new replicas have been updated...` y, con `--timeout`, `error: timed out waiting for the condition` |
| Un campo mal escrito (`replica:`, `imagen:`) se aceptaba y se ignoraba | Validación estricta, la de fábrica desde la 1.27: `Error from server (BadRequest): error when creating "STDIN": Deployment in version "v1" cannot be handled as a Deployment: strict decoding error: unknown field "spec.replica"`; `--validate=warn` avisa y `--validate=false` lo descarta. Lo que falta sigue dando `spec.containers[0].image: Required value` (y en un init, `spec.initContainers[0]…`, que antes salía mal numerado) |
| `--dry-run=client -o yaml` ponía el namespace del contexto y las claves en otro orden | Claves en orden alfabético (como todo `-o yaml` y `diff`), `creationTimestamp: null`, `status: {}`, sin `namespace` salvo con `-n`, y `create secret generic` sin `type`; las fechas entre comillas y las IP sin ellas |
| `kubectl apply --dry-run=client -o yaml` no escribía el objeto; `--dry-run=true` creaba de verdad | Escribe el YAML; `--dry-run=server` existe; un valor que no vale da `Invalid dry-run value` |
| Crear lo que ya existe daba siempre el error de `create -f` | Cada orden lo dice como kubectl: `error: failed to create job: jobs.batch "hola" already exists`, `failed to create secret secrets "s" already exists`, y `Error from server (AlreadyExists): namespaces "tienda" already exists` |
| `annotate` sin `--overwrite` decía lo mismo que `label` | `error: --overwrite is false but found the following declared annotation(s): …` |
| Una imagen que no existe en Docker Hub decía `not found` | Repositorio desconocido: `pull access denied, repository does not exist or may require authorization`; etiqueta que no existe en un repositorio que sí: `docker.io/library/nginx:1.99: not found` (con la referencia entera, como containerd) |
| `--from-env-file=~/x` funcionaba | kubectl no expande `~` (lo hace la shell, al principio de una palabra): `error: error reading ~/x: no such file or directory`. Los exámenes usan `--from-env-file ~/tienda/.env` |
| Kustomize ponía `replicas` también al Service del mismo nombre, perdía la sangría de un parche en línea (`patch: \|-`), no leía `kustomize create --resources a` (con espacio) y escribía en el orden de los ficheros | `replicas` solo a Deployments, StatefulSets y ReplicaSets; parches JSON 6902 y estratégicos en línea; las dos formas de la opción; orden «legacy» (Services antes que Deployments). Un `../base` que no existe da el error de Kustomize 5 (`accumulating resources … lstat …: no such file or directory`) |
| `helm install … oci://registry-1.docker.io/bitnamicharts/redis` no valía | Los charts de Bitnami por OCI son los mismos que `bitnami/redis`; `helm upgrade --install` dice `Release "cache" does not exist. Installing it now.` |
| No existían `kubectl events`, `kubectl set selector` ni `kubectl set serviceaccount` (salían en la ayuda) | Existen, con `--for` y `--types` en `events` |
| Un init con `restartPolicy: Always` (sidecar nativo, estable en la 1.33) se trataba como un init que acaba | Corre junto a la app y cuenta en READY (2/2); se puede entrar con `exec -c` |
| `kubectl exec -i … < fichero` no pasaba la entrada | `psql < backup.sql` y `sh < guion.sh` funcionan |
| `sh -c '…; exit 1'` en un contenedor salía con 127 | `exit N` acaba el guion con ese código |

## Punto por punto

(a) ¿Es cierto lo que dice? (b) ¿Es la práctica de hoy? (c) Alternativas
que se han probado y valen. «Cambio» es lo que se tocó en la unidad.

| Punto | (a) | (b) | (c) Alternativas aceptadas | Cambio |
| --- | --- | --- | --- | --- |
| k8s-hola | Sí | Sí: mirar el contexto antes de tocar | `kubectl get no -o name > ~/nodos.txt` (el fichero tiene que ser la salida de `-o name`, lo pide el objetivo) | — |
| k8s-pods | Sí (`ErrImagePull` → `ImagePullBackOff`) | Sí | `po`, `pod/prueba`, `docker.io/library/nginx:1.27`, `apply -f` de un Pod | El evento de la imagen local ahora es el de Docker Hub (`pull access denied`) |
| k8s-yaml | Sí (tabulador y `Required value` literales) | Sí: YAML en git y `apply -f` | `apply -f` o `create -f` de un `~/pod.yaml` escrito a mano o con `--dry-run=client -o yaml` | Antes exigía `apply`; ahora vale `create -f` y se comprueba que `~/pod.yaml` coincide con el Pod (`kubectl diff`) |
| k8s-namespaces | Sí | Sí | `ns`, `--namespace=`, `set-context staging --namespace=…`, Namespace por YAML | — |
| k8s-jefe-primer-dia | Sí | Sí | `--all-namespaces`, `pod/pagos`, `--tail 10` o `logs \| tail -n 10`, `-n default` | — |
| k8s-deployment | Sí | Sí | `create deploy` + `scale`, `apply -f` | — |
| k8s-escalar | Sí (`apply` deshace el `scale`) | Sí: lo que dura, al YAML | `scale` y cambiar el fichero; solo `scale` no vale (el fichero no coincide), como pide | — |
| k8s-labels | Sí | Sí | `label` en dos órdenes, con `jsonpath` | — |
| k8s-service | Sí | Sí | `expose --target-port`, `create service clusterip --tcp=80:80`, Service por YAML | — |
| k8s-port-forward | Sí | Sí: `port-forward` para ti, Ingress en producción | `deploy/`, `service/` o un Pod; NodePort con `create service nodeport` o YAML | — |
| k8s-jefe-sube-el-front | Sí | Sí | `imagePullSecrets` en el Pod o en la ServiceAccount; `set selector` o borrar y `expose`; Deployment por YAML | Nuevo `kubectl set selector` |
| k8s-configmap | Sí | Sí | `envFrom` por `patch` o en el YAML, `set env --from=cm/…`, ConfigMap por YAML | `how` añade `rollout restart` tras cambiarlo: las variables no se releen (lo nuevo del motor) |
| k8s-secret | Sí (base64 no cifra; `describe` enseña bytes) | Sí; en equipos, además, External Secrets o Sealed Secrets (no se simulan) | `stringData` en YAML, `secretKeyRef` por `patch` | — |
| k8s-imagenes | Sí (`401 Unauthorized`) | Sí: etiquetas fijas | `imagePullSecrets` en la ServiceAccount + `rollout restart`; editar el YAML | — |
| k8s-jefe-config | Sí | Sí | `envFrom` o `secretKeyRef` | — |
| k8s-final-principiante | Sí | Sí | Todo imperativo (`create`, `set env`, `expose`) o todo YAML | La solución usaba `--from-env-file=~/tienda/.env`, que en una shell de verdad no funciona: ahora `--from-env-file ~/tienda/.env` |
| k8s-rolling-update | Sí | Sí: `change-cause` con `annotate` (`--record` está obsoleto) | `apply` del YAML con la imagen nueva + `annotate --overwrite`; `patch --type=json` | El error literal de `annotate` sin `--overwrite` es el de verdad |
| k8s-rollback | Sí | Sí | `rollout undo --to-revision=1`, `set image` a la buena, `apply -f` del YAML | — |
| k8s-estrategia | Sí | Sí | Estrategia en el YAML; canary con `create --dry-run` + `sed` + `patch` | Texto inglés recortado al límite de palabras |
| k8s-apply-diff | Sí (`diff` sale 1 con diferencias) | Sí | `scale` de vuelta, `apply --server-side` | — |
| k8s-jefe-viernes | Sí | Sí: arreglar desde el repositorio | `undo --to-revision`, `printf >>`, aplicar por separado | — |
| k8s-readiness | Sí (Kubernetes no lee el HEALTHCHECK) | Sí | `initialDelaySeconds`, sonda en bloque | — |
| k8s-liveness | Sí | Sí: startupProbe para arranques lentos | Subir `initialDelaySeconds` (vale, aunque la unidad sugiere startup); startup por `tcpSocket` | — |
| k8s-recursos | Sí (137, OOMKilled) | Sí | `patch`, YAML, `cpu=0.1` | — |
| k8s-jefe-picos | Sí | Sí | Sondas con puerto con nombre (`port: http`), liveness `tcpSocket`, `patch --type=json` | — |
| k8s-crashloop | Sí | Sí: get → describe → logs --previous | Arreglar el Secret con `--dry-run=client -o yaml \| apply` sin reiniciar (el contenedor lo lee al reiniciarse), o borrar los Pods | — |
| k8s-imagepull | Sí | Sí | Corregir el YAML y aplicar; diagnosticar con `kubectl events` | Acepta `events` para diagnosticar |
| k8s-pending | Sí | Sí: pedir lo que se usa | `patch`, YAML | Acepta `events` para diagnosticar |
| k8s-exec-debug | Sí | Sí | `kubectl cp`, `exec` a un Pod concreto | — |
| k8s-red | Sí (`<unset>`, nombre corto en otro namespace) | Sí | YAML, `set selector` + `patch --type=json`, borrar y `expose` | — |
| k8s-jefe-incidencia | Sí | Sí | `patch --type=json`, `port-forward deploy/front` | — |
| k8s-final-intermedio | Sí | Sí | Arreglarlo todo en los YAML y `apply -f ~/tienda/` | — |
| k8s-pvc | Sí (RWO = un nodo; `Bound` al usarse con `WaitForFirstConsumer`) | Sí; para una base de datos, StatefulSet (lo dice) | PVC por `create -f`, montaje por YAML o `patch --type=json`, `wait --for=condition=available` | — |
| k8s-statefulset | Sí | Sí: headless + `volumeClaimTemplates` | `secretKeyRef`, `storageClassName: local-path` explícito | — |
| k8s-jobs | Sí | Sí. Un CronJob va en la zona del controlador (UTC en k3s) salvo `spec.timeZone` (estable desde la 1.27); no se dice por el límite de palabras | Job y CronJob por YAML, `restartPolicy: OnFailure`, `args` | — |
| k8s-init-sidecar | Sí | Sí; el sidecar nativo es un init con `restartPolicy: Always` | `patch` del Deployment, nombre largo del Service | `what` dice qué es un sidecar nativo; el motor lo corre (2/2) |
| k8s-jefe-datos | Sí | Sí | `exec -i db-0 -- psql < ~/backup.sql` en vez de `cp` + `psql -f` | Nuevo `exec -i` con entrada |
| k8s-ingress | Sí (`Prefix` casa `/api/health` y no `/apiv2`) | Ingress es estable pero ya no crece; lo nuevo es Gateway API | Ingress por YAML | `when` presenta Gateway API (Gateway y HTTPRoute), que el documento del curso prometía y la unidad no decía |
| k8s-hpa | Sí (`<unknown>/70%` sin requests; baja con 5 min de calma) | Sí | HPA `autoscaling/v2` por YAML, `--cpu=70%` (la forma nueva) | — |
| k8s-networkpolicy | Sí (k3s aplica NetworkPolicies) | Sí: denegar todo y abrir lo justo | Políticas con otros nombres y `policyTypes` explícitos | — |
| k8s-jefe-lanzamiento | Sí | Sí | Ingress con `tls`, HPA y NetworkPolicy en un solo YAML | — |
| k8s-kustomize | Sí | Sí: `apply -k` (o `kustomize build \| kubectl apply -f -`) | `kustomize create/edit` + `build \| apply`, `patches` JSON 6902 en línea | El error literal de un `../base` que no existe es el de Kustomize 5 |
| k8s-helm | Sí | Sí, con un aviso: Bitnami publica sus charts por OCI y desde 2025 limita sus imágenes gratuitas | `helm upgrade --install`, `oci://registry-1.docker.io/bitnamicharts/redis` sin `repo add`, `--values` | `when` y `whenNot` hablan de `upgrade --install` y de OCI; `problems`, de `--reuse-values` (con `-f` también se olvida lo anterior) |
| k8s-seguridad | Sí | Sí; el perfil «restricted» pide además `capabilities.drop: [ALL]` y `seccompProfile: RuntimeDefault` (se aceptan; no se dicen por el límite de palabras) | SA por YAML, `set serviceaccount`, `patch --type=json` con más campos | Nuevo `kubectl set serviceaccount` |
| k8s-jefe-entornos | Sí | Sí | `kustomize build \| kubectl apply -f -`, Redis por OCI con `upgrade --install` | — |
| k8s-final-avanzado | Sí (la 1.3.0 no pasa las readiness) | Sí | `--from-env-file /ruta/absoluta`, `kustomize create --namespace`, `--cpu=70%`, Job con `OnFailure` | La solución usaba `--from-env-file=~/…` y `--cert=~/…`: ahora van separados por espacio |

## Lo que se queda distinto, y por qué

- **`rollout status` puede acabar bien con una liveness que mata la app.**
  Sin readinessProbe, el kubelet da por listo un contenedor en cuanto corre;
  si los tres Pods están arriba a la vez antes de que la liveness los mate, el
  Deployment cuenta 3 disponibles y `rollout status` dice que acabó. Es lo
  que pasa de verdad (por eso la unidad de readiness insiste en la sonda); lo
  que no acaba nunca es un rollout cuyos Pods mueren al arrancar.
- **Los ficheros montados de un ConfigMap cambian al momento**; en un
  clúster tardan hasta un minuto (lo que tarda el kubelet en sincronizar).
  Con `subPath` no cambiarían nunca; el motor no lo distingue.
- **Un contenedor que se reinicia relee sus variables solo desde su segundo
  reinicio** (en el primero, que va enseguida, no hay hueco); el resultado a
  los diez minutos de la corrección es el mismo.
- **`--validate` sin valor** necesita `=`: kubectl acepta `--validate` solo
  (vale `strict`); aquí pide argumento.
- **Generación de los Services**: el motor pone `metadata.generation` también
  a los Services; el servidor no lo hace. No cambia ninguna comprobación.
- **`creationTimestamp: null`** en `--dry-run=client -o yaml` es lo de
  kubectl 1.31–1.33; versiones más nuevas pueden omitirlo.
- **`kubectl autoscale --cpu-percent`** se sigue enseñando: funciona en todas
  las versiones del rango, aunque las más nuevas prefieren `--cpu=70%` (que
  también vale).
- **El tiempo** va a saltos de 5 s por orden: los tiempos exactos (`AGE`,
  `1 (2s ago)`) son aproximados.

## Lo que hace falta en otros paquetes

- `@sanatorio/dockersim` (`parseYaml`): los textos en bloque (`|`, `|-`,
  `>`) pierden la sangría relativa de cada línea. Aquí se esquiva pasando el
  bloque a una línea entre comillas antes de leerlo (`unfoldBlocks` en
  `packages/k8ssim/src/yaml.ts`); arreglado allí, ese rodeo sobra.
- `@sanatorio/shellsim`: `echo a=~/b` debería dar `a=/home/peer/b` (bash, sin
  modo POSIX, expande `~` tras el `=` de una palabra con forma de
  asignación); `sed` ignora en silencio la orden `r fichero`.
