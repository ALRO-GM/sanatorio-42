/**
 * Un Helm reducido: lo que se usa para instalar «lo de otros» (un Redis, un
 * Postgres) y llevarlo como una release con revisiones. Dos charts en un
 * repositorio simulado (`bitnami/redis` y `bitnami/postgresql`), con sus
 * values por defecto; `install`, `upgrade [--install]`, `list`, `get values`,
 * `history`, `rollback`, `uninstall`, `template`, `status`, `show values` y
 * `repo add/list/update`, `search repo`. Lo que pinta cada chart se aplica al
 * clúster como lo haría `kubectl apply`.
 */

import { Fail } from '@sanatorio/shellsim'
import type { CommandFn, Ctx } from '@sanatorio/shellsim'

import type { Args } from './cli.js'
import { parseArgs } from './cli.js'
import { envFor, readHost, store } from './common.js'
import { sync } from './controllers.js'
import { deleteObject } from './kubectl.js'
import { merge } from './kustomize.js'
import { LIMITS, own } from './limits.js'
import type { HelmRevision, Json, JsonObject } from './model.js'
import { keyOf } from './model.js'
import { obj, str } from './spec.js'
import type { Env } from './store.js'
import { getObject } from './store.js'
import { encode64, isoAt, suffix, table } from './util.js'
import { parseDocs, toYaml } from './yaml.js'

const BITNAMI = 'https://charts.bitnami.com/bitnami'

type Chart = {
  name: string
  version: string
  appVersion: string
  description: string
  defaults: JsonObject
  render: (release: string, ns: string, values: JsonObject) => JsonObject[]
}

const labels = (release: string, chart: string, component: string): Record<string, string> => ({
  'app.kubernetes.io/name': chart,
  'app.kubernetes.io/instance': release,
  'app.kubernetes.io/managed-by': 'Helm',
  'app.kubernetes.io/component': component,
})

const selector = (release: string, chart: string, component: string): Record<string, string> => ({
  'app.kubernetes.io/name': chart,
  'app.kubernetes.io/instance': release,
  'app.kubernetes.io/component': component,
})

const at = (values: JsonObject, path: string): Json | undefined => {
  let current: Json | undefined = values

  for (const key of path.split('.')) current = obj(current)[key]

  return current
}

function statefulSet(
  release: string,
  ns: string,
  chart: string,
  component: string,
  image: string,
  port: number,
  replicas: number,
  env: JsonObject[],
  persistence: JsonObject,
  resources: Json,
  mount: string,
): JsonObject {
  const name = `${release}-${chart}${component === 'primary' && chart === 'postgresql' ? '' : `-${component}`}`
  const enabled = persistence.enabled !== false

  return {
    apiVersion: 'apps/v1',
    kind: 'StatefulSet',
    metadata: { name, namespace: ns, labels: labels(release, chart, component) },
    spec: {
      replicas,
      serviceName: `${release}-${chart}-headless`,
      selector: { matchLabels: selector(release, chart, component) },
      template: {
        metadata: { labels: labels(release, chart, component) },
        spec: {
          securityContext: { runAsNonRoot: true, runAsUser: 1001 },
          containers: [
            {
              name: chart,
              image,
              ports: [
                { name: chart === 'redis' ? 'redis' : 'tcp-postgresql', containerPort: port },
              ],
              env,
              readinessProbe: { tcpSocket: { port }, periodSeconds: 5 },
              resources: resources ?? {},
              volumeMounts: [{ name: 'data', mountPath: mount }],
            },
          ],
          ...(enabled ? {} : { volumes: [{ name: 'data', emptyDir: {} }] }),
        },
      },
      ...(enabled
        ? {
            volumeClaimTemplates: [
              {
                metadata: { name: 'data' },
                spec: {
                  accessModes: ['ReadWriteOnce'],
                  resources: { requests: { storage: str(persistence.size, '8Gi') } },
                },
              },
            ],
          }
        : {}),
    },
  }
}

const service = (
  release: string,
  ns: string,
  name: string,
  chart: string,
  component: string,
  port: number,
  headless = false,
): JsonObject => ({
  apiVersion: 'v1',
  kind: 'Service',
  metadata: { name, namespace: ns, labels: labels(release, chart, component) },
  spec: {
    ...(headless ? { clusterIP: 'None' } : {}),
    selector: selector(release, chart, component),
    ports: [{ name: chart === 'redis' ? 'tcp-redis' : 'tcp-postgresql', port, targetPort: port }],
  },
})

const password = (release: string, given: string): string =>
  given === '' ? suffix(`helm:${release}`, 10) : given

const CHARTS: Record<string, Chart> = {
  'bitnami/redis': {
    name: 'redis',
    version: '20.2.1',
    appVersion: '7.4.1',
    description:
      'Redis(R) is an open source, advanced key-value store. It is often referred to as a data structure server…',
    defaults: {
      architecture: 'replication',
      auth: { enabled: true, password: '' },
      master: { persistence: { enabled: true, size: '8Gi' }, resources: {} },
      replica: { replicaCount: 3, persistence: { enabled: true, size: '8Gi' }, resources: {} },
    },
    render: (release, ns, values) => {
      const auth = at(values, 'auth.enabled') !== false
      const secret = `${release}-redis`
      const env = auth
        ? [
            {
              name: 'REDIS_PASSWORD',
              valueFrom: { secretKeyRef: { name: secret, key: 'redis-password' } },
            },
          ]
        : [{ name: 'ALLOW_EMPTY_PASSWORD', value: 'yes' }]
      const docs: JsonObject[] = [
        ...(auth
          ? [
              {
                apiVersion: 'v1',
                kind: 'Secret',
                metadata: {
                  name: secret,
                  namespace: ns,
                  labels: labels(release, 'redis', 'secret'),
                },
                type: 'Opaque',
                data: {
                  'redis-password': encode64(password(release, str(at(values, 'auth.password')))),
                },
              },
            ]
          : []),
        service(release, ns, `${release}-redis-headless`, 'redis', 'master', 6379, true),
        service(release, ns, `${release}-redis-master`, 'redis', 'master', 6379),
        statefulSet(
          release,
          ns,
          'redis',
          'master',
          'bitnami/redis:7.4',
          6379,
          1,
          env,
          obj(at(values, 'master.persistence')),
          at(values, 'master.resources') ?? {},
          '/data',
        ),
      ]

      if (str(at(values, 'architecture')) === 'replication')
        docs.push(
          service(release, ns, `${release}-redis-replicas`, 'redis', 'replica', 6379),
          statefulSet(
            release,
            ns,
            'redis',
            'replica',
            'bitnami/redis:7.4',
            6379,
            Math.min(LIMITS.replicas, Number(at(values, 'replica.replicaCount') ?? 3)),
            env,
            obj(at(values, 'replica.persistence')),
            at(values, 'replica.resources') ?? {},
            '/data',
          ),
        )

      return docs
    },
  },
  'bitnami/postgresql': {
    name: 'postgresql',
    version: '16.1.0',
    appVersion: '16.4.0',
    description:
      'PostgreSQL (Postgres) is an open source object-relational database known for reliability and data integrity…',
    defaults: {
      auth: { postgresPassword: '', database: '' },
      primary: { persistence: { enabled: true, size: '8Gi' }, resources: {} },
    },
    render: (release, ns, values) => {
      const secret = `${release}-postgresql`

      return [
        {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: secret,
            namespace: ns,
            labels: labels(release, 'postgresql', 'secret'),
          },
          type: 'Opaque',
          data: {
            'postgres-password': encode64(
              password(release, str(at(values, 'auth.postgresPassword'))),
            ),
          },
        },
        service(release, ns, `${release}-postgresql-headless`, 'postgresql', 'primary', 5432, true),
        service(release, ns, `${release}-postgresql`, 'postgresql', 'primary', 5432),
        statefulSet(
          release,
          ns,
          'postgresql',
          'primary',
          'bitnami/postgresql:16',
          5432,
          1,
          [
            {
              name: 'POSTGRES_PASSWORD',
              valueFrom: { secretKeyRef: { name: secret, key: 'postgres-password' } },
            },
          ],
          obj(at(values, 'primary.persistence')),
          at(values, 'primary.resources') ?? {},
          '/var/lib/postgresql/data',
        ),
      ]
    },
  },
}

/** `a.b.c=valor` → `{a: {b: {c: valor}}}` (números y booleanos como tales). */
function setValue(values: JsonObject, path: string, raw: string): void {
  const keys = path.split('.')
  const last = keys.pop() ?? ''
  let current = values

  for (const key of keys) {
    const next = obj(current[key])

    current[key] = next
    current = next
  }
  current[last] = /^-?\d+$/.test(raw)
    ? Number(raw)
    : raw === 'true'
      ? true
      : raw === 'false'
        ? false
        : raw
}

function userValues(ctx: Ctx, args: Args): JsonObject {
  let values: JsonObject = {}

  for (const file of args.all('values'))
    values = obj(merge(values, parseDocs(readHost(ctx, file, 'Error'), file)[0] ?? {}))
  for (const pairs of [...args.all('set'), ...args.all('set-string')])
    for (const pair of pairs.split(',')) {
      const eq = pair.indexOf('=')

      if (eq <= 0) throw new Fail(`Error: failed parsing --set data: key "${pair}" has no value`, 1)
      setValue(values, pair.slice(0, eq), pair.slice(eq + 1))
    }

  return values
}

function chartOf(env: Env, ref: string): Chart {
  const chart = own(CHARTS, ref)
  const repo = ref.split('/')[0] ?? ''

  if (ref.startsWith('oci://'))
    throw new Fail(
      `Error: este simulador no descarga charts de internet: usa bitnami/redis o bitnami/postgresql`,
      1,
    )
  if (!ref.includes('/')) throw new Fail(`Error: INSTALLATION FAILED: repo ${ref} not found`, 1)
  if (own(env.state.repos, repo) === undefined)
    throw new Fail(`Error: INSTALLATION FAILED: repo ${repo} not found`, 1)
  if (chart === undefined)
    throw new Fail(
      `Error: INSTALLATION FAILED: chart "${ref.split('/')[1] ?? ''}" matching  not found in ${repo} index. (try 'helm repo update'): no chart name found`,
      1,
    )

  return chart
}

const releaseKey = (ns: string, name: string): string => `${ns}/${name}`

/** Aplica lo que pinta una revisión y borra lo que la anterior tenía y esta no. */
function deploy(
  env: Env,
  chart: Chart,
  release: string,
  values: JsonObject,
  previous: HelmRevision | undefined,
): string[] {
  const docs = chart.render(release, env.ns, obj(merge(chart.defaults, values)))
  const keys: string[] = []

  for (const doc of docs) {
    const meta = obj(doc.metadata)

    meta.annotations = {
      'meta.helm.sh/release-name': release,
      'meta.helm.sh/release-namespace': env.ns,
    }
    doc.metadata = meta

    const { object } = store(env, doc, `${chart.name} chart`, false, 'replace')

    keys.push(keyOf(object.kind, object.metadata.namespace ?? '', object.metadata.name))
  }
  for (const key of previous?.objects ?? []) {
    if (keys.includes(key)) continue

    const [kind = '', ns = '', name = ''] = key.split('/')
    const object = getObject(env.cluster, kind, ns, name)

    if (object !== undefined) deleteObject(env, object)
  }

  return keys
}

function notes(ctx: Ctx, env: Env, name: string, revision: HelmRevision, chart: Chart): void {
  ctx.io.out(
    `NAME: ${name}\nLAST DEPLOYED: ${isoAt(revision.updated).replace('T', ' ').replace('Z', '')}\nNAMESPACE: ${env.ns}\nSTATUS: ${revision.status}\nREVISION: ${revision.revision}\nTEST SUITE: None\nNOTES:\nCHART NAME: ${chart.name}\nCHART VERSION: ${chart.version}\nAPP VERSION: ${chart.appVersion}\n\n** Please be patient while the chart is being deployed **\n\n${chart.name === 'redis' ? `Redis can be accessed via port 6379 on the following DNS name from within your cluster:\n\n    ${name}-redis-master.${env.ns}.svc.cluster.local\n` : `PostgreSQL can be accessed via port 5432 on the following DNS name from within your cluster:\n\n    ${name}-postgresql.${env.ns}.svc.cluster.local\n`}`,
  )
}

const HELM = {
  values: [
    'set',
    'set-string',
    'values',
    'version',
    'output',
    'kube-context',
    'timeout',
    'description',
    'max',
  ],
  flags: [
    'install',
    'create-namespace',
    'reuse-values',
    'reset-values',
    'all',
    'all-namespaces',
    'wait',
    'atomic',
    'dry-run',
    'debug',
    'force-update',
  ],
  shorts: { f: 'values', n: 'namespace', o: 'output', A: 'all-namespaces', a: 'all' },
}

export const helm: CommandFn = (ctx) => {
  if (ctx.sh.world.ext?.k8s === undefined) throw new Fail('helm: command not found', 127)

  const [what = '', ...raw] = ctx.args
  const args = parseArgs(raw, HELM, `helm ${what}`)
  const env = envFor(ctx, {
    ...args,
    one: (name) => (name === 'context' ? args.one('kube-context') : args.one(name)),
  })

  sync(ctx.sh.world)

  const releases = env.cluster.releases
  const current = (name: string): HelmRevision[] | undefined =>
    own(releases, releaseKey(env.ns, name))
  const last = (name: string): HelmRevision | undefined =>
    current(name)
      ?.filter((rev) => rev.status !== 'uninstalled')
      .at(-1)

  switch (what) {
    case 'version':
      ctx.io.out(
        'version.BuildInfo{Version:"v3.16.2", GitCommit:"13654a52f7c70a143b1dd51416d633e1071faffb", GitTreeState:"clean", GoVersion:"go1.22.7"}\n',
      )

      return 0
    case 'repo': {
      const [sub = '', name = '', url = ''] = args.rest

      if (sub === 'add') {
        if (url !== BITNAMI)
          throw new Fail(
            `Error: looks like "${url}" is not a valid chart repository or cannot be reached: este simulador solo conoce ${BITNAMI}`,
            1,
          )
        env.state.repos[name] = url
        ctx.io.out(`"${name}" has been added to your repositories\n`)

        return 0
      }
      if (sub === 'update') {
        ctx.io.out(
          `Hang tight while we grab the latest from your chart repositories...\n${Object.keys(
            env.state.repos,
          )
            .map((repo) => `...Successfully got an update from the "${repo}" chart repository\n`)
            .join('')}Update Complete. ⎈Happy Helming!⎈\n`,
        )

        return 0
      }
      if (sub === 'list' || sub === 'ls') {
        if (Object.keys(env.state.repos).length === 0)
          throw new Fail('Error: no repositories to show', 1)
        ctx.io.out(table(['NAME', 'URL'], Object.entries(env.state.repos)))

        return 0
      }

      throw new Fail(`Error: unknown command "${sub}" for "helm repo"`, 1)
    }
    case 'search': {
      const query = (args.rest[1] ?? '').toLowerCase()
      const rows = Object.entries(CHARTS)
        .filter(
          ([ref]) =>
            own(env.state.repos, ref.split('/')[0] ?? '') !== undefined && ref.includes(query),
        )
        .map(([ref, chart]) => [ref, chart.version, chart.appVersion, chart.description])

      if (rows.length === 0) ctx.io.out('No results found\n')
      else ctx.io.out(table(['NAME', 'CHART VERSION', 'APP VERSION', 'DESCRIPTION'], rows))

      return 0
    }
    case 'show':
    case 'inspect': {
      const chart = chartOf(env, args.rest[1] ?? '')

      ctx.io.out(
        args.rest[0] === 'values'
          ? toYaml(chart.defaults)
          : `apiVersion: v2\nappVersion: ${chart.appVersion}\nname: ${chart.name}\nversion: ${chart.version}\n`,
      )

      return 0
    }
    case 'template': {
      const [name = '', ref = ''] = args.rest
      const chart = chartOf(env, ref)

      ctx.io.out(
        chart
          .render(name, env.ns, obj(merge(chart.defaults, userValues(ctx, args))))
          .map(
            (doc) =>
              `---\n# Source: ${chart.name}/templates/${str(doc.kind).toLowerCase()}.yaml\n${toYaml(doc)}`,
          )
          .join(''),
      )

      return 0
    }
    case 'install':
    case 'upgrade': {
      const [name = '', ref = ''] = args.rest

      if (name === '' || ref === '')
        throw new Fail(
          `Error: "helm ${what}" requires 2 arguments\n\nUsage:  helm ${what} [RELEASE] [CHART] [flags]`,
          1,
        )

      const chart = chartOf(env, ref)
      const before = last(name)

      if (what === 'install' && before !== undefined)
        throw new Fail('Error: INSTALLATION FAILED: cannot re-use a name that is still in use', 1)
      if (what === 'upgrade' && before === undefined && !args.has('install'))
        throw new Fail(`Error: UPGRADE FAILED: "${name}" has no deployed releases`, 1)
      if (getObject(env.cluster, 'Namespace', '', env.ns) === undefined) {
        if (!args.has('create-namespace'))
          throw new Fail(
            `Error: INSTALLATION FAILED: create: failed to create: namespaces "${env.ns}" not found`,
            1,
          )
        store(
          env,
          { apiVersion: 'v1', kind: 'Namespace', metadata: { name: env.ns } },
          'helm',
          false,
        )
      }

      const values =
        args.has('reuse-values') && before !== undefined
          ? obj(merge(before.values, userValues(ctx, args)))
          : userValues(ctx, args)
      const history = current(name) ?? []
      const revision: HelmRevision = {
        revision: (history.at(-1)?.revision ?? 0) + 1,
        chart: `${chart.name}-${chart.version}`,
        version: chart.version,
        appVersion: chart.appVersion,
        values,
        status: 'deployed',
        description: before === undefined ? 'Install complete' : 'Upgrade complete',
        updated: env.now,
        objects: deploy(env, chart, name, values, before),
      }

      for (const rev of history) if (rev.status === 'deployed') rev.status = 'superseded'
      releases[releaseKey(env.ns, name)] = [...history, revision].slice(-LIMITS.helmRevisions)
      sync(ctx.sh.world)
      if (before !== undefined) ctx.io.out(`Release "${name}" has been upgraded. Happy Helming!\n`)
      notes(ctx, env, name, revision, chart)

      return 0
    }
    case 'list':
    case 'ls': {
      const rows = Object.entries(releases)
        .filter(([key]) => args.has('all-namespaces') || key.startsWith(`${env.ns}/`))
        .flatMap(([key, revs]) => {
          const rev = revs.filter((each) => each.status !== 'uninstalled').at(-1)

          return rev === undefined
            ? []
            : [
                [
                  key.split('/')[1] ?? '',
                  key.split('/')[0] ?? '',
                  String(rev.revision),
                  isoAt(rev.updated).replace('T', ' ').replace('Z', ' +0000 UTC'),
                  rev.status,
                  rev.chart,
                  rev.appVersion,
                ],
              ]
        })

      ctx.io.out(
        table(['NAME', 'NAMESPACE', 'REVISION', 'UPDATED', 'STATUS', 'CHART', 'APP VERSION'], rows),
      )

      return 0
    }
    case 'status':
    case 'get':
    case 'history':
    case 'rollback':
    case 'uninstall':
    case 'delete': {
      const name = what === 'get' ? (args.rest[1] ?? '') : (args.rest[0] ?? '')
      const history = current(name)
      const rev = last(name)

      if (history === undefined || rev === undefined) throw new Fail(`Error: release: not found`, 1)

      const chart = Object.values(CHARTS).find(
        (each) => rev.chart === `${each.name}-${each.version}`,
      )

      if (chart === undefined) throw new Fail('Error: chart not found', 1)
      if (what === 'status') notes(ctx, env, name, rev, chart)
      else if (what === 'get') {
        const sub = args.rest[0] ?? ''

        if (sub === 'values')
          ctx.io.out(
            args.has('all')
              ? `COMPUTED VALUES:\n${toYaml(obj(merge(chart.defaults, rev.values)))}`
              : `USER-SUPPLIED VALUES:\n${Object.keys(rev.values).length === 0 ? 'null\n' : toYaml(rev.values)}`,
          )
        else if (sub === 'manifest')
          ctx.io.out(
            chart
              .render(name, env.ns, obj(merge(chart.defaults, rev.values)))
              .map((doc) => `---\n${toYaml(doc)}`)
              .join(''),
          )
        else throw new Fail(`Error: unknown command "${sub}" for "helm get"`, 1)
      } else if (what === 'history')
        ctx.io.out(
          table(
            ['REVISION', 'UPDATED', 'STATUS', 'CHART', 'APP VERSION', 'DESCRIPTION'],
            history.map((each) => [
              String(each.revision),
              isoAt(each.updated),
              each.status,
              each.chart,
              each.appVersion,
              each.description,
            ]),
          ),
        )
      else if (what === 'rollback') {
        const wanted = args.rest[1]
        const target =
          wanted === undefined
            ? history.filter((each) => each !== rev).at(-1)
            : history.find((each) => String(each.revision) === wanted)

        if (target === undefined)
          throw new Fail(`Error: release has no ${wanted ?? 'previous'} version`, 1)

        const revision: HelmRevision = {
          ...target,
          revision: (history.at(-1)?.revision ?? 0) + 1,
          status: 'deployed',
          description: `Rollback to ${target.revision}`,
          updated: env.now,
          objects: deploy(env, chart, name, target.values, rev),
        }

        for (const each of history) if (each.status === 'deployed') each.status = 'superseded'
        releases[releaseKey(env.ns, name)] = [...history, revision].slice(-LIMITS.helmRevisions)
        sync(ctx.sh.world)
        ctx.io.out('Rollback was a success! Happy Helming!\n')
      } else {
        for (const key of rev.objects) {
          const [kind = '', ns = '', objectName = ''] = key.split('/')
          const object = getObject(env.cluster, kind, ns, objectName)

          if (object !== undefined) deleteObject(env, object)
        }
        Reflect.deleteProperty(releases, releaseKey(env.ns, name))
        sync(ctx.sh.world)
        ctx.io.out(`release "${name}" uninstalled\n`)
      }

      return 0
    }
    default:
      throw new Fail(`Error: unknown command "${what}" for "helm"\nRun 'helm --help' for usage.`, 1)
  }
}
