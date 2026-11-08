/**
 * Kubernetes simulado (`packages/k8ssim`): que se comporte como Kubernetes en
 * lo que enseña el curso (controladores, estados de error, red, rollouts,
 * Kustomize y Helm), que las formas equivalentes valgan igual, que los topes
 * paren lo que podría colgar la web o la API, que el motor no toque el
 * sistema y que despliegue lo que publica el curso de Docker.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { registryImages, tally as dockerTally, unitOf as dockerUnit } from '@sanatorio/dockersim'
import { checkAttempt, LIMITS, run, startOf, teamImages, UNITS } from '@sanatorio/k8ssim'
import type { World } from '@sanatorio/k8ssim'
import { describe, expect, it } from 'vitest'

const unit = (id: string) => {
  const found = UNITS.find((each) => each.id === id)

  if (found === undefined) throw new Error(`falta la unidad ${id}`)

  return found
}

/** Ejecuta varias órdenes desde el mundo de partida de una unidad y devuelve lo de la última. */
function sh(from: string, ...entries: string[]): { out: string; code: number; world: World } {
  let world = startOf(unit(from))
  let last = { out: '', code: 0 }

  for (const entry of entries) {
    const result = run(world, entry)

    world = result.world
    last = { out: result.output.join('\n'), code: result.code }
  }

  return { ...last, world }
}

const EMPTY = 'k8s-hola'
const SHOP = 'k8s-configmap'

describe('Kubernetes simulado: lo básico', () => {
  it('Pods, Deployments y su reconciliación', () => {
    expect(sh(EMPTY, 'kubectl run web --image=nginx:1.27', 'kubectl get pods').out).toMatch(
      /web\s+1\/1\s+Running/,
    )
    expect(sh(EMPTY, 'kubectl run web --image=nginx:1.27', 'kubectl logs web').out).toContain(
      'Configuration complete',
    )
    expect(sh(EMPTY, 'kubectl get pod nada')).toMatchObject({
      code: 1,
      out: 'Error from server (NotFound): pods "nada" not found',
    })
    expect(sh(EMPTY, 'kubectl get pods').out).toBe('No resources found in default namespace.')
    expect(sh(EMPTY, 'kubectl get deploymnets').out).toContain("doesn't have a resource type")

    const deploy = sh(
      EMPTY,
      'kubectl create deployment web --image=nginx:1.27 --replicas=3',
      'kubectl delete pod $(kubectl get pods -o name | head -n 1 | cut -d/ -f2)',
      'kubectl get pods --no-headers | wc -l',
    )

    expect(deploy.out).toBe('3')
    expect(
      sh(EMPTY, 'kubectl create deployment web --image=nginx:1.27', 'kubectl get deploy,rs,pods')
        .out,
    ).toMatch(/deployment\.apps\/web\s+1\/1/)
    expect(sh(EMPTY, 'kubectl run web --image=nginx:1.27 --dry-run=client -o yaml').out).toContain(
      'kind: Pod',
    )
    expect(sh(EMPTY, "kubectl get nodes -o jsonpath='{.items[*].metadata.name}'").out).toBe(
      'nodo-1 nodo-2 nodo-3',
    )
  })

  it('manifiestos: validación con los errores de verdad', () => {
    const bad = (body: string) => sh(EMPTY, `kubectl apply -f - <<'EOF'\n${body}\nEOF`).out

    expect(bad('kind: Pod\nmetadata: {name: x}')).toContain('apiVersion not set')
    expect(bad('apiVersion: apps/v1\nkind: Deploymnet\nmetadata: {name: x}')).toContain(
      'no matches for kind "Deploymnet"',
    )
    expect(
      bad(
        'apiVersion: apps/v1\nkind: Deployment\nmetadata: {name: x}\nspec:\n  template:\n    metadata: {labels: {app: x}}\n    spec: {containers: [{name: x, image: nginx:1.27}]}',
      ),
    ).toContain('spec.selector: Required value')
    expect(
      bad(
        'apiVersion: apps/v1\nkind: Deployment\nmetadata: {name: x}\nspec:\n  selector: {matchLabels: {app: y}}\n  template:\n    metadata: {labels: {app: x}}\n    spec: {containers: [{name: x, image: nginx:1.27}]}',
      ),
    ).toContain('does not match template')
    expect(
      bad('apiVersion: v1\nkind: Pod\nmetadata: {name: x}\nspec:\n\tcontainers: []'),
    ).toContain('error parsing')
  })

  it('estados de error: ImagePullBackOff, CrashLoopBackOff, OOMKilled y Pending', () => {
    expect(
      sh(
        EMPTY,
        'kubectl run web --image=nginx:1.99',
        'kubectl get pods',
        'kubectl get pods',
        'kubectl get pods',
      ).out,
    ).toContain('ImagePullBackOff')
    expect(
      sh(
        EMPTY,
        'kubectl run db --image=postgres:16',
        'sleep 1',
        'kubectl get pods',
        'kubectl get pods',
      ).out,
    ).toContain('CrashLoopBackOff')
    expect(sh(EMPTY, 'kubectl run db --image=postgres:16', 'kubectl logs db').out).toContain(
      'POSTGRES_PASSWORD',
    )

    const oom = sh(
      'k8s-recursos',
      'kubectl get pods',
      'kubectl get pods',
      'kubectl get pods',
      "kubectl describe pod -l app=informes | grep -A2 'Last State'",
    )

    expect(oom.out).toContain('OOMKilled')
    expect(sh('k8s-pending', 'kubectl describe pod -l app=db').out).toContain('Insufficient memory')
    expect(sh('k8s-imagenes', 'kubectl describe pod -l app=api').out).toContain('401 Unauthorized')
  })

  it('red: Services, endpoints, port-forward, NetworkPolicy e Ingress', () => {
    expect(
      sh(
        SHOP,
        'kubectl run tmp --rm -i --image=curlimages/curl:8.10 --restart=Never -- curl -s api:3000/health',
      ).out,
    ).toContain('{"status":"ok","db":"up"}')
    expect(
      sh(
        SHOP,
        'kubectl run tmp --rm -i --image=curlimages/curl:8.10 --restart=Never -- curl -s nada',
      ).out,
    ).toContain('Could not resolve host')
    expect(sh(SHOP, 'curl -s localhost:8080').code).not.toBe(0)
    expect(
      sh(SHOP, 'kubectl port-forward svc/front 8080:80', 'curl -s localhost:8080/api/').out,
    ).toContain('peer4u-api')
    expect(sh('k8s-red', 'kubectl get endpointslices').out).toMatch(
      /api-\w+\s+IPv4\s+8080\s+<unset>/,
    )

    const policies = sh(
      'k8s-networkpolicy',
      unit('k8s-networkpolicy').solution[0] ?? '',
      'kubectl exec deploy/front -- nc -z -w 2 db 5432',
    )

    expect(policies.code).toBe(1)
    expect(sh(SHOP, 'kubectl exec deploy/front -- nc -z -w 2 db 5432').code).toBe(0)
    expect(
      sh(
        'k8s-ingress',
        unit('k8s-ingress').solution[0] ?? '',
        'curl -s -H "Host: tienda.local" http://10.0.0.11/api/health',
      ).out,
    ).toBe('{"status":"ok","db":"up"}')
    expect(sh('k8s-ingress', 'curl -s -H "Host: otra.local" http://10.0.0.11/').out).toBe(
      '404 page not found',
    )
  })

  it('rollouts: atascado con una versión que falla, undo, historia y diff', () => {
    const stuck = sh('k8s-rollback', 'kubectl rollout status deployment/api --timeout=30s')

    expect(stuck).toMatchObject({ code: 1 })
    expect(stuck.out).toContain('timed out')
    expect(sh('k8s-rollback', 'kubectl logs deploy/api --previous').out).toBeTruthy()
    expect(
      sh(
        'k8s-rollback',
        'kubectl rollout undo deployment/api',
        'kubectl rollout status deployment/api',
      ).out,
    ).toContain('successfully rolled out')
    expect(sh('k8s-apply-diff', 'kubectl diff -f ~/tienda/api.yaml')).toMatchObject({ code: 1 })
    expect(
      sh(
        'k8s-apply-diff',
        'kubectl apply -f ~/tienda/api.yaml',
        'kubectl diff -f ~/tienda/api.yaml',
      ),
    ).toMatchObject({ code: 0, out: '' })
    expect(sh(SHOP, 'kubectl apply -f ~/tienda/api.yaml').out).toContain(
      'deployment.apps/api unchanged',
    )
  })

  it('datos: un PVC sobrevive al Pod; sin él, la tabla se pierde', () => {
    const lost = sh(
      'k8s-pvc',
      "kubectl exec deploy/db -- psql -U postgres -c 'CREATE TABLE t(x int)'",
      'kubectl delete pod -l app=db',
      "kubectl exec deploy/db -- psql -U postgres -c '\\dt'",
    )

    expect(lost.out).toContain('Did not find any relations')
    expect(
      sh(
        'k8s-statefulset',
        ...unit('k8s-statefulset').solution,
        "kubectl exec db-0 -- psql -U postgres -c 'CREATE TABLE t(x int)'",
        'kubectl delete pod db-0',
        'kubectl get pods',
        "kubectl exec db-0 -- psql -U postgres -c '\\dt'",
      ).out,
    ).toContain(' public | t ')
  })

  it('Kustomize y Helm', () => {
    const built = sh('k8s-kustomize', 'kubectl kustomize ~/tienda/base')

    expect(built.out).toContain('kind: Deployment')
    expect(sh('k8s-helm', 'helm install cache bitnami/redis').out).toContain(
      'repo bitnami not found',
    )
    expect(
      sh(
        'k8s-helm',
        'helm repo add bitnami https://charts.bitnami.com/bitnami',
        'helm install cache bitnami/redis --set architecture=standalone',
        'helm list',
      ).out,
    ).toMatch(/cache\s+tienda\s+1/)
  })

  it('explain y los eventos de planificar, como en un clúster de verdad', () => {
    // El ejemplo del StatefulSet enseña sus campos (antes no tenía ayuda y se sugería a sí mismo).
    const sts = sh(EMPTY, 'kubectl explain statefulset.spec').out

    expect(sts).toContain('volumeClaimTemplates')
    expect(sts).toContain('serviceName')

    // Sin ayuda para ese campo, se sugiere uno que sí la tiene, nunca el mismo que se pidió.
    expect(sh(EMPTY, 'kubectl explain cronjob.spec').out).toContain('kubectl explain pod.spec')
    expect(sh(EMPTY, 'kubectl explain statefulset').out).toContain(
      'kubectl explain statefulset.spec',
    )

    // Dónde va un Pod lo decide el planificador, no el kubelet.
    const pending = sh('k8s-pending', 'kubectl describe pod -l app=db').out

    expect(pending).toMatch(/FailedScheduling\s+\S+.*default-scheduler/)
    expect(pending).not.toMatch(/FailedScheduling.*kubelet/)
    expect(sh(EMPTY, 'kubectl run web --image=nginx:1.27', 'kubectl describe pod web').out).toMatch(
      /Scheduled\s+\S+\s+default-scheduler/,
    )
  })
})

describe('Kubernetes simulado: formas equivalentes', () => {
  it('create o apply con el YAML en otro orden valen igual', () => {
    const yaml = `kubectl apply -f - <<'EOF'\nkind: Deployment\napiVersion: apps/v1\nspec:\n  template:\n    spec:\n      containers: [{image: nginx:1.27, name: nginx}]\n    metadata:\n      labels: {app: web}\n  selector: {matchLabels: {app: web}}\n  replicas: 2\nmetadata: {name: web}\nEOF`

    expect(checkAttempt(unit('k8s-deployment'), [yaml])).toMatchObject({ done: true, stars: 3 })
    expect(
      checkAttempt(unit('k8s-pods'), [
        'kubectl run web --image=docker.io/library/nginx:1.27',
        'kubectl delete po/prueba',
      ]),
    ).toMatchObject({ done: true, stars: 3 })
    expect(
      checkAttempt(unit('k8s-namespaces'), [
        'kubectl create ns tienda',
        'kubectl config set-context --current --namespace=tienda',
        'kubectl run web --image=nginx:1.27',
      ]),
    ).toMatchObject({ done: true, stars: 3 })
  })

  it('Services, Secrets y rollbacks de varias maneras', () => {
    const service = `cat <<'EOF' | kubectl apply -f -\napiVersion: v1\nkind: Service\nmetadata: {name: web}\nspec:\n  ports: [{port: 80, targetPort: 80}]\n  selector: {app: web}\nEOF`

    expect(checkAttempt(unit('k8s-service'), [service])).toMatchObject({ done: true, stars: 3 })
    expect(
      checkAttempt(unit('k8s-secret'), [
        'kubectl create secret generic db --from-literal=POSTGRES_PASSWORD=secreto',
        'kubectl patch deployment db -p \'{"spec":{"template":{"spec":{"containers":[{"name":"postgres","envFrom":[{"secretRef":{"name":"db"}}]}]}}}}\'',
      ]),
    ).toMatchObject({ done: true, stars: 3 })
    expect(
      checkAttempt(unit('k8s-rollback'), ['kubectl rollout undo deployment/api --to-revision=1']),
    ).toMatchObject({ done: true, stars: 3 })
    expect(
      checkAttempt(unit('k8s-imagenes'), [
        'kubectl create secret docker-registry ghcr --docker-server=https://ghcr.io --docker-username=peer --docker-password=$(cat ~/.ghcr-token)',
        'kubectl patch serviceaccount default -p \'{"imagePullSecrets":[{"name":"ghcr"}]}\'',
        'kubectl rollout restart deployment/api',
      ]),
    ).toMatchObject({ done: true })
  })

  it('lo que no llega al objetivo no vale', () => {
    expect(
      checkAttempt(unit('k8s-imagenes'), [
        'kubectl create secret docker-registry ghcr --docker-server=ghcr.io --docker-username=peer --docker-password=otro',
        'kubectl patch deployment api -p \'{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ghcr"}]}}}}\'',
      ]).done,
    ).toBe(false)
    expect(
      checkAttempt(unit('k8s-escalar'), ['kubectl scale deployment web --replicas=3']).misses,
    ).toContain('probe:repo')
    expect(
      checkAttempt(unit('k8s-rolling-update'), [
        'kubectl set image deployment/api api=ghcr.io/peer4u/api:1.1.0',
      ]).done,
    ).toBe(false)
  })
})

describe('Kubernetes simulado: topes y pureza', () => {
  it('lo que se pasa de los topes falla y deja el mundo como estaba', () => {
    let world = startOf(unit(EMPTY))

    for (let i = 0; i < 40; i++)
      world = run(world, `kubectl create configmap c${i} --from-literal=a=b`).world

    expect(run(world, 'kubectl scale deployment x --replicas=99').ok).toBe(false)
    expect(
      sh(
        EMPTY,
        'kubectl create deployment web --image=nginx:1.27',
        `kubectl scale deployment web --replicas=${LIMITS.replicas + 1}`,
      ).code,
    ).toBe(1)
    expect(
      sh(
        EMPTY,
        `for i in $(seq 1 ${LIMITS.objects}); do kubectl create configmap c$i --from-literal=a=b; done`,
      ).code,
    ).not.toBe(0)
    expect(
      sh(EMPTY, `echo '${'a: b\n'.repeat(4000)}' > big.yaml`, 'kubectl apply -f big.yaml').code,
    ).not.toBe(0)
    expect(sh(EMPTY, 'kubectl apply -f https://example.com/x.yaml').out).toContain(
      'no tiene salida a internet',
    )
    expect(sh(EMPTY, 'kubectl exec -it nada -- sh').code).toBe(1)
  })

  it('el motor no importa nada del sistema (ni fs, ni procesos, ni red, ni eval)', () => {
    const dir = fileURLToPath(new URL('../../../../packages/k8ssim/src', import.meta.url))
    const files = readdirSync(dir, { recursive: true })
      .map(String)
      .filter((file) => file.endsWith('.ts'))

    expect(files.length).toBeGreaterThan(10)
    for (const file of files) {
      const text = readFileSync(join(dir, file), 'utf8')

      for (const from of text.matchAll(/^import .* from '([^']+)'/gm))
        expect(from[1], file).toMatch(/^(\.|@sanatorio\/(shellsim|course|dockersim)$)/)
      expect(text, file).not.toMatch(/\beval\(|new Function\(|globalThis|\bfetch\(/)
    }
  })
})

describe('Kubernetes simulado: el enlace con el curso de Docker', () => {
  it('despliega las imágenes que publica el examen final avanzado de Docker', () => {
    const final = dockerUnit('docker-final-advanced')

    if (final === undefined) throw new Error('falta el examen final de Docker')

    const published = registryImages(dockerTally(final, final.solution).world).map(
      (image) => image.ref,
    )

    expect(published).toEqual(
      expect.arrayContaining(['ghcr.io/peer4u/api:1.0.0', 'ghcr.io/peer4u/front:1.0.0']),
    )
    for (const ref of published.filter((each) => each.startsWith('ghcr.io/peer4u/')))
      expect(teamImages()).toContain(ref)
  })
})
