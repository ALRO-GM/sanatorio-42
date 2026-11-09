/**
 * Kubernetes simulado (`packages/k8ssim`) frente a Kubernetes de verdad
 * (1.31–1.34, k3s, kubectl, Kustomize 5 y Helm 3): lo que la revisión del
 * curso de noviembre de 2026 encontró distinto y se arregló. Cada caso dice lo
 * que hace la herramienta real; si alguien cambia el motor y vuelve a la
 * conducta vieja, falla aquí.
 */
import { run, startOf, UNITS } from '@sanatorio/k8ssim'
import type { World } from '@sanatorio/k8ssim'
import { describe, expect, it } from 'vitest'

const unit = (id: string) => {
  const found = UNITS.find((each) => each.id === id)

  if (found === undefined) throw new Error(`falta la unidad ${id}`)

  return found
}

type Step = { out: string; code: number }

/** Ejecuta las órdenes desde el principio de una unidad y devuelve lo de cada una. */
function steps(from: string, ...entries: string[]): Step[] {
  let world: World = startOf(unit(from))

  return entries.map((entry) => {
    const result = run(world, entry)

    world = result.world

    return { out: result.output.join('\n'), code: result.code }
  })
}

const last = (from: string, ...entries: string[]): Step =>
  steps(from, ...entries).at(-1) ?? { out: '', code: 0 }

const EMPTY = 'k8s-hola'

describe('Kubernetes simulado: variables, registros y reinicios como en el kubelet', () => {
  it('cambiar un ConfigMap no cambia las variables de los Pods que ya corren', () => {
    const out = steps(
      EMPTY,
      'kubectl create configmap cfg --from-literal=COLOR=verde',
      'kubectl create deployment web --image=nginx:1.27',
      'kubectl set env deployment/web --from=configmap/cfg',
      'kubectl rollout status deployment/web',
      'kubectl exec deploy/web -- printenv COLOR',
      'kubectl create configmap cfg --from-literal=COLOR=rojo --dry-run=client -o yaml | kubectl apply -f -',
      'kubectl exec deploy/web -- printenv COLOR',
      'kubectl rollout restart deployment/web',
      'kubectl rollout status deployment/web',
      'kubectl exec deploy/web -- printenv COLOR',
    ).map((step) => step.out)

    expect(out[4]).toBe('verde')
    // Las variables se resuelven al crear el contenedor: hasta reiniciar, la vieja.
    expect(out[6]).toBe('verde')
    expect(out[9]).toBe('rojo')
  })

  it('un contenedor que se reinicia sí lee el Secret arreglado', () => {
    const fixed = steps(
      'k8s-crashloop',
      'kubectl logs deploy/api --previous',
      'kubectl create secret generic db --from-literal=POSTGRES_PASSWORD=secreto --from-literal=DATABASE_URL=postgres://postgres:secreto@db:5432/peer4u --dry-run=client -o yaml | kubectl apply -f -',
      'sleep 1',
      'kubectl wait --for=condition=available deploy/api --timeout=120s',
      'kubectl logs deploy/api',
      'kubectl logs deploy/api --previous',
    )

    expect(fixed[0]?.out).toContain('Error: DATABASE_URL is not set')
    expect(fixed[3]?.code).toBe(0)
    // Ahora corre la instancia buena; la anterior es la que se cayó.
    expect(fixed[4]?.out).toContain('api listening on :3000')
    expect(fixed[5]?.out).toContain('Error: DATABASE_URL is not set')
  })

  it('logs: -c con un contenedor init, --previous sin instancia anterior y los mensajes del servidor', () => {
    const pod = `kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata: {name: bloqueado}
spec:
  initContainers:
  - name: espera-db
    image: busybox:1.36
    command: [sh, -c, "until nc -z db 5432; do sleep 2; done"]
  - name: segundo
    image: busybox:1.36
    command: [sh, -c, "echo hola"]
  containers:
  - name: web
    image: nginx:1.27
EOF`
    const out = steps(
      EMPTY,
      pod,
      'kubectl get pod bloqueado',
      'kubectl logs bloqueado -c espera-db',
      'kubectl logs bloqueado -c segundo',
      'kubectl logs bloqueado',
      'kubectl logs bloqueado -c nada',
      'kubectl run solo --image=nginx:1.27',
      'kubectl logs solo --previous',
      'kubectl exec solo -c nada -- ls',
    )

    expect(out[1]?.out).toMatch(/bloqueado\s+0\/1\s+Init:0\/2/)
    expect(out[2]).toEqual({ out: '', code: 0 })
    expect(out[3]?.out).toBe(
      'Error from server (BadRequest): container "segundo" in pod "bloqueado" is waiting to start: PodInitializing',
    )
    expect(out[4]?.out).toContain(
      'container "web" in pod "bloqueado" is waiting to start: PodInitializing',
    )
    expect(out[5]?.out).toBe(
      'Error from server (BadRequest): container nada is not valid for pod bloqueado',
    )
    expect(out[7]?.out).toBe(
      'Error from server (BadRequest): previous terminated container "solo" in pod "solo" not found',
    )
    expect(out[8]?.out).toBe('error: unable to upgrade connection: container not found ("nada")')

    const done = steps(
      EMPTY,
      'kubectl apply -f - <<\'EOF\'\napiVersion: v1\nkind: Pod\nmetadata: {name: con-init}\nspec:\n  initContainers:\n  - name: saluda\n    image: busybox:1.36\n    command: [sh, -c, "echo preparando"]\n  containers:\n  - name: web\n    image: nginx:1.27\nEOF',
      'kubectl logs con-init -c saluda',
    )

    expect(done[1]?.out).toBe('preparando')
  })

  it('el primer reinicio va enseguida; luego espera 10 s, 20 s… (CrashLoopBackOff)', () => {
    const out = steps(
      EMPTY,
      "kubectl run falla --image=busybox:1.36 -- sh -c 'echo me caigo; exit 1'",
      "kubectl get pod falla -o jsonpath='{.status.containerStatuses[0].restartCount}'",
      'sleep 1',
      'kubectl get pod falla',
      "kubectl get pod falla -o jsonpath='{.status.containerStatuses[0].state.waiting.message} {.status.containerStatuses[0].lastState.terminated.exitCode}'",
      'kubectl logs falla --previous',
    )

    // A los 5 s ya se ha reiniciado una vez (sin espera) y está esperando 10 s.
    expect(out[1]?.out).toBe('1')
    expect(out[3]?.out).toMatch(/falla\s+0\/1\s+(Error|CrashLoopBackOff)\s+2 /)
    expect(out[4]?.out).toMatch(
      /^back-off (10|20)s restarting failed container=falla pod=falla_default\(.+\) 1$/,
    )
    expect(out[5]?.out).toBe('me caigo')
  })

  it('un contenedor sin sondas está 1/1 Running hasta que se cae (el OOMKilled)', () => {
    const out = steps(
      'k8s-recursos',
      'kubectl get pods',
      'sleep 10',
      'kubectl get pods',
      'kubectl get pods',
    )

    expect(out[0]?.out).toMatch(/informes-\S+\s+1\/1\s+Running\s+0/)
    expect(out.map((step) => step.out).join('\n')).toMatch(/0\/1\s+(OOMKilled|CrashLoopBackOff)/)
  })

  it('rollout status no da por bueno un rollout con Pods que no arrancan', () => {
    const out = last('k8s-rollback', 'kubectl rollout status deployment/api --timeout=30s')

    expect(out.code).toBe(1)
    expect(out.out).toContain(
      'Waiting for deployment "api" rollout to finish: 1 out of 3 new replicas have been updated...',
    )
    expect(out.out).toContain('error: timed out waiting for the condition')
    expect(out.out).not.toContain('successfully rolled out')
    // Sin --timeout espera hasta el progressDeadlineSeconds (600 s).
    expect(last('k8s-rollback', 'kubectl rollout status deployment/api').out).toContain(
      'error: deployment "api" exceeded its progress deadline',
    )
  })
})

describe('Kubernetes simulado: sidecars nativos y exec con entrada', () => {
  it('un init con restartPolicy: Always corre junto a la app y cuenta en READY', () => {
    const out = steps(
      EMPTY,
      'kubectl apply -f - <<\'EOF\'\napiVersion: v1\nkind: Pod\nmetadata: {name: con-sidecar}\nspec:\n  initContainers:\n  - name: logs\n    image: busybox:1.36\n    restartPolicy: Always\n    command: [sh, -c, "while true; do sleep 5; done"]\n  containers:\n  - name: web\n    image: nginx:1.27\nEOF',
      'kubectl get pod con-sidecar',
      'kubectl exec con-sidecar -c logs -- echo hola',
    )

    expect(out[1]?.out).toMatch(/con-sidecar\s+2\/2\s+Running/)
    expect(out[2]?.out).toBe('hola')
  })

  it('kubectl exec -i lleva la entrada a la orden de dentro (psql < backup.sql)', () => {
    const out = steps(
      'k8s-jefe-datos',
      'kubectl exec -i deploy/db -- psql -U postgres < ~/backup.sql',
      "kubectl exec deploy/db -- psql -U postgres -c 'SELECT count(*) FROM pedidos'",
      "printf 'echo desde un guion\\n' > ~/guion.sh",
      'kubectl exec -i deploy/db -- sh < ~/guion.sh',
    )

    expect(out[1]?.out).toContain('     5')
    expect(out[3]?.out).toBe('desde un guion')
  })
})

describe('Kubernetes simulado: manifiestos y salidas de kubectl', () => {
  const apply = (body: string, flags = '') => `kubectl apply ${flags}-f - <<'EOF'\n${body}\nEOF`
  const typo =
    'apiVersion: apps/v1\nkind: Deployment\nmetadata: {name: demo}\nspec:\n  replica: 2\n  selector:\n    matchLabels: {app: demo}\n  template:\n    metadata:\n      labels: {app: demo}\n    spec:\n      containers:\n      - name: nginx\n        image: nginx:1.27\n        imagen: nginx'

  it('validación estricta: un campo que no existe es un error, no se ignora', () => {
    const strict = last(EMPTY, apply(typo))

    expect(strict.code).toBe(1)
    expect(strict.out).toBe(
      'Error from server (BadRequest): error when creating "STDIN": Deployment in version "v1" cannot be handled as a Deployment: strict decoding error: unknown field "spec.replica", unknown field "spec.template.spec.containers[0].imagen"',
    )
    // Lo que falta es otro error: el de validación del objeto.
    expect(
      last(
        EMPTY,
        apply('apiVersion: v1\nkind: Pod\nmetadata: {name: x}\nspec:\n  containers:\n  - name: x'),
      ).out,
    ).toBe('The Pod "x" is invalid: spec.containers[0].image: Required value')
    expect(
      last(
        EMPTY,
        apply(
          'apiVersion: v1\nkind: Pod\nmetadata: {name: x}\nspec:\n  initContainers:\n  - name: x\n  containers:\n  - name: y\n    image: nginx:1.27',
        ),
      ).out,
    ).toBe('The Pod "x" is invalid: spec.initContainers[0].image: Required value')

    const warn = steps(EMPTY, apply(typo, '--validate=warn '), 'kubectl get deploy demo -o yaml')

    expect(warn[0]?.out).toContain('Warning: unknown field "spec.replica"')
    expect(warn[0]?.out).toContain('deployment.apps/demo created')
    // El servidor descarta el campo: no se guarda.
    expect(warn[1]?.out).not.toContain('replica:')
    expect(last(EMPTY, apply(typo, '--validate=false ')).out).toBe('deployment.apps/demo created')
    // `--validate` a secas es `--validate=strict` y no se come lo que va detrás.
    expect(last(EMPTY, apply(typo, '--validate ')).out).toBe(strict.out)
    expect(
      last(
        EMPTY,
        `kubectl run x --image=nginx:1.27 --dry-run=client -o yaml > x.yaml`,
        'kubectl apply --validate -f x.yaml',
      ).out,
    ).toBe('pod/x created')
    expect(last(EMPTY, apply(typo, '--dry-run=true ')).out).toContain(
      'Invalid dry-run value (true)',
    )
  })

  it('--dry-run=client -o yaml escribe lo que kubectl: claves en orden, sin namespace salvo con -n', () => {
    const ctx = 'kubectl config set-context --current --namespace=tienda'

    expect(
      last(
        EMPTY,
        'kubectl create namespace tienda',
        ctx,
        'kubectl run web --image=nginx:1.27 --dry-run=client -o yaml',
      ).out,
    ).toBe(
      'apiVersion: v1\nkind: Pod\nmetadata:\n  creationTimestamp: null\n  labels:\n    run: web\n  name: web\nspec:\n  containers:\n  - image: nginx:1.27\n    name: web\n    resources: {}\n  dnsPolicy: ClusterFirst\n  restartPolicy: Always\nstatus: {}',
    )

    const deploy = last(
      EMPTY,
      'kubectl create deployment web --image=nginx:1.27 -n tienda --dry-run=client -o yaml',
    ).out

    expect(deploy).toContain('  name: web\n  namespace: tienda\nspec:')
    expect(deploy).toContain('    metadata:\n      creationTimestamp: null\n      labels:')
    expect(deploy.endsWith('status: {}')).toBe(true)
    expect(
      last(EMPTY, 'kubectl create secret generic s --from-literal=A=1 --dry-run=client -o yaml')
        .out,
    ).toBe(
      'apiVersion: v1\ndata:\n  A: MQ==\nkind: Secret\nmetadata:\n  creationTimestamp: null\n  name: s',
    )
    // Fechas entre comillas y una IP sin ellas, como go-yaml.
    const svc = last('k8s-red', 'kubectl get svc api -o yaml').out

    expect(svc).toMatch(/creationTimestamp: "\d{4}-\d\d-\d\dT[\d:]+Z"/)
    expect(svc).toMatch(/clusterIP: 10\.43\.\d+\.\d+\n/)
  })

  it('crear lo que ya existe: cada orden lo dice como kubectl', () => {
    const out = steps(
      EMPTY,
      'kubectl create job hola --image=busybox:1.36 -- echo hola',
      'kubectl create job hola --image=busybox:1.36 -- echo hola',
      'kubectl create deployment web --image=nginx:1.27',
      'kubectl create deployment web --image=nginx:1.27',
      'kubectl create secret generic s --from-literal=a=b',
      'kubectl create secret generic s --from-literal=a=b',
      'kubectl create namespace tienda',
      'kubectl create namespace tienda',
    ).map((step) => step.out)

    expect(out[1]).toBe('error: failed to create job: jobs.batch "hola" already exists')
    expect(out[3]).toBe('error: failed to create deployment: deployments.apps "web" already exists')
    expect(out[5]).toBe('error: failed to create secret secrets "s" already exists')
    expect(out[7]).toBe('Error from server (AlreadyExists): namespaces "tienda" already exists')
  })

  it('annotate y label avisan distinto sin --overwrite', () => {
    const out = steps(
      EMPTY,
      'kubectl run solo --image=nginx:1.27',
      'kubectl annotate pod solo a=1',
      'kubectl annotate pod solo a=2',
      'kubectl label pod solo a=1',
      'kubectl label pod solo a=2',
    ).map((step) => step.out)

    expect(out[2]).toBe(
      "error: --overwrite is false but found the following declared annotation(s): 'a' already has a value (1)",
    )
    expect(out[4]).toContain("error: 'a' already has a value (1), and --overwrite is false")
  })

  it('una imagen que solo está en tu portátil: Docker Hub contesta que no hay acceso', () => {
    const out = last(EMPTY, 'kubectl run local --image=api:1.0', 'kubectl get events').out

    expect(out).toContain(
      'failed to resolve reference "docker.io/library/api:1.0": pull access denied, repository does not exist or may require authorization',
    )
    expect(last(EMPTY, 'kubectl run web --image=nginx:1.99', 'kubectl get events').out).toContain(
      'docker.io/library/nginx:1.99: not found',
    )
  })

  it('kubectl no expande ~ dentro de --from-env-file=~/…: eso lo hace la shell, al principio de una palabra', () => {
    const out = steps(
      EMPTY,
      "printf 'A=1\\n' > ~/x.env",
      'kubectl create secret generic a --from-env-file=~/x.env',
      'kubectl create secret generic b --from-env-file ~/x.env',
      'kubectl create configmap c --from-file=~/x.env',
    )

    expect(out[1]?.out).toBe('error: error reading ~/x.env: no such file or directory')
    expect(out[2]?.out).toBe('secret/b created')
    expect(out[3]?.out).toBe('error: error reading ~/x.env: no such file or directory')
  })

  it('kubectl events, set selector y set serviceaccount existen', () => {
    expect(last('k8s-imagepull', 'kubectl events --types=Warning').out).toContain('code = NotFound')

    const out = steps(
      'k8s-red',
      'kubectl set selector svc api app=api',
      'kubectl patch svc api --type=json -p \'[{"op":"replace","path":"/spec/ports/0/targetPort","value":3000}]\'',
      'kubectl run tmp --rm -i --image=curlimages/curl:8.10 --restart=Never -- curl -s api:3000/health',
      'kubectl create serviceaccount api',
      'kubectl set serviceaccount deployment api api',
      "kubectl get deploy api -o jsonpath='{.spec.template.spec.serviceAccountName}'",
    ).map((step) => step.out)

    expect(out[0]).toBe('service/api selector updated')
    expect(out[2]).toContain('"status":"ok"')
    expect(out[4]).toBe('deployment.apps/api serviceaccount updated')
    expect(out[5]).toBe('api')
  })
})

describe('Kubernetes simulado: Kustomize y Helm como los de verdad', () => {
  it('replicas solo toca lo que tiene réplicas, y un parche JSON 6902 en línea funciona', () => {
    const overlay = `cat > ~/tienda/overlays/produccion/kustomization.yaml <<'EOF'
resources:
- ../../base
namespace: produccion
images:
- name: ghcr.io/peer4u/api
  newTag: "1.2.0"
patches:
- target:
    kind: Deployment
    name: api
  patch: |-
    - op: replace
      path: /spec/replicas
      value: 4
EOF`
    const out = steps(
      'k8s-kustomize',
      'mkdir -p ~/tienda/overlays/produccion',
      overlay,
      'kubectl apply -k ~/tienda/overlays/produccion',
      "kubectl get deploy api -n produccion -o jsonpath='{.spec.replicas}'",
    )

    expect(out[2]).toEqual({
      out: 'service/api created\nservice/front created\ndeployment.apps/api created\ndeployment.apps/front created',
      code: 0,
    })
    expect(out[3]?.out).toBe('4')

    const edit = steps(
      'k8s-kustomize',
      'mkdir -p ~/tienda/overlays/produccion',
      'cd ~/tienda/overlays/produccion',
      'kustomize create --resources ../../base',
      'kustomize edit set replicas api=4',
      'kustomize build . | kubectl apply -f -',
    )

    expect(edit[4]?.code).toBe(0)
    expect(edit[4]?.out).not.toContain('unknown field')
  })

  it('un overlay que apunta mal da el error de Kustomize 5', () => {
    const out = last(
      'k8s-kustomize',
      'mkdir -p ~/tienda/overlays/produccion',
      "printf 'resources: [../base]\\n' > ~/tienda/overlays/produccion/kustomization.yaml",
      'kubectl kustomize ~/tienda/overlays/produccion',
    )

    expect(out.out).toContain("accumulating resources from '../base'")
    expect(out.out).toContain('lstat /home/peer/tienda/overlays/base: no such file or directory')
  })

  it('los charts de Bitnami por OCI y helm upgrade --install', () => {
    const out = steps(
      'k8s-helm',
      'helm upgrade --install cache oci://registry-1.docker.io/bitnamicharts/redis --set architecture=standalone',
      'helm list',
    )

    expect(out[0]?.out).toContain('Pulled: registry-1.docker.io/bitnamicharts/redis:20.2.1')
    expect(out[0]?.out).toContain('Release "cache" does not exist. Installing it now.')
    expect(out[1]?.out).toMatch(/cache\s+tienda\s+1\s+.*deployed\s+redis-20\.2\.1/)
  })
})

describe('Kubernetes simulado: textos en bloque del YAML', () => {
  it('un fichero de configuración en un ConfigMap (`|`) guarda su sangría', () => {
    const out = steps(
      EMPTY,
      `cat > cm.yaml <<'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: web
data:
  default.conf: |
    server {
      listen 80;
    }
  motd: >-
    hola
    a todos
EOF`,
      'kubectl apply -f cm.yaml',
      "kubectl get cm web -o jsonpath='{.data.default\\.conf}'",
      "kubectl get cm web -o jsonpath='{.data.motd}'",
    )

    expect(out[1]?.out).toBe('configmap/web created')
    expect(out[2]?.out).toBe('server {\n  listen 80;\n}')
    expect(out[3]?.out).toBe('hola a todos')
  })
})
