/**
 * Las pruebas de grupo del curso de git y el jefe final: varias personas, cada
 * una con su repositorio y un remoto común. Con varias personas el orden de los
 * merges cambia la historia, así que no se compara una forma exacta: se
 * comprueban **misiones** sobre origin (qué ficheros hay en cada rama, qué tags
 * y dónde están, de quién son los commits por su prefijo).
 *
 * Todas las personas hacen todo: cada misión se comprueba **por persona**, así
 * que nadie supera la prueba sin haber usado cada concepto con sus manos. Las
 * tareas van con `{login}` y `{n}` (el número de cada cual: 1, 2, 3…), que se
 * cambian por los de cada persona.
 */

import { ancestors, clone, emptyRepo, GitError, isAncestor } from '../model.js'
import type { Commit, Remote, Repo } from '../model.js'
import { runAll } from '../run.js'
import type { World } from '../run.js'
import type { Gate } from './gates.js'

export type GroupPlayer = {
  login: string
  /** El prefijo de sus ids de commit (`a`, `b`, `d`…). */
  prefix: string
  /** Su número en la sala, desde 1 (para nombres que no choquen: `v1.{n}`). */
  n: number
}

export type MissionItem = {
  text: string
  done: boolean
  /** De quién es la misión (si es de una persona). */
  login: string | null
}

export type GroupMission = {
  gate: Gate['id']
  title: string
  /** La historia, en dos o tres frases. */
  story: string
  /** Minutos para cumplirla. */
  minutes: number
  /** Jefe final: puestos separados y sin ver lo que escriben los demás. */
  apart: boolean
  /** Lo que monta origin antes de clonar (lo hace una «compañera», commits `o1`…). */
  setup: (count: number) => string[]
  /** Lo que sube la compañera cuando ya habéis clonado (para que nadie parta de lo último). */
  after?: string[]
  locked: string[]
  /** Lo que hace cada persona, paso a paso. */
  tasks: string[]
  /** Comandos que vienen bien, uno por línea. */
  hints: string[]
  check: (remote: Remote, players: readonly GroupPlayer[]) => MissionItem[]
}

/** Los prefijos de los ids de cada persona, por orden de llegada (`c` y `o` ya se usan). */
export const PREFIXES = ['a', 'b', 'd', 'e', 'f', 'g'] as const
export const MAX_PLAYERS = PREFIXES.length

// --- Lo que se mira en origin ---------------------------------------------------

const prefixOf = (id: string): string => /^[a-z]+/.exec(id)?.[0] ?? ''

/** Los ficheros de un commit (vacío si no existe). */
const filesAt = (remote: Remote, id: string | undefined): Record<string, string> =>
  id === undefined ? {} : (remote.commits[id]?.files ?? {})

/** Los commits de la historia de una rama de origin. */
function historyOf(remote: Remote, branch: string): Commit[] {
  const tip = remote.branches[branch]

  if (tip === undefined) return []

  return [...ancestors(remote.commits, tip)]
    .map((id) => remote.commits[id])
    .filter((commit) => commit !== undefined)
}

const isPullRequest = (commit: Commit) => commit.message.startsWith('Merge pull request')

/** Un merge hecho por esa persona en su repositorio (no el botón de un pull request). */
const ownMerge = (commit: Commit, p: GroupPlayer) =>
  prefixOf(commit.id) === p.prefix && commit.parents.length > 1 && !isPullRequest(commit)

/** Un tag de origin que está en la historia de todas esas ramas. */
function taggedIn(remote: Remote, tag: string, branches: string[]): boolean {
  const id = remote.tags[tag]

  return (
    id !== undefined &&
    branches.every((branch) => {
      const tip = remote.branches[branch]

      return tip !== undefined && isAncestor(remote.commits, id, tip)
    })
  )
}

const item = (text: string, done: boolean, login: string | null = null): MissionItem => ({
  text,
  done,
  login,
})

/** Una misión por persona: `text` con `{login}` y `{n}`. */
const each = (
  players: readonly GroupPlayer[],
  text: string,
  done: (p: GroupPlayer) => boolean,
): MissionItem[] => players.map((p) => item(filled(text, p), done(p), p.login))

/** Cambia `{login}` y `{n}` por los de esa persona. */
export function filled(text: string, p: Pick<GroupPlayer, 'login' | 'n'>): string {
  return text.replaceAll('{login}', p.login).replaceAll('{n}', String(p.n))
}

// --- Las pruebas -----------------------------------------------------------------

const GROUP_1: GroupMission = {
  gate: 'group1',
  title: 'Cada cual su rama, y todas a main',
  story:
    'Compartís un repositorio en origin y ya lo tenéis clonado. Cada cual saca una rama con su login, guarda en ella un fichero suyo y la sube. Después, cada cual une su rama en main con un commit de merge y sube main: quien llega tarde se encuentra main cambiada y tiene que traerla antes.',
  minutes: 45,
  apart: false,
  setup: () => [
    'echo "# Equipo" > README.md',
    'git add README.md',
    'git commit -m "README"',
    'git push',
  ],
  locked: [],
  tasks: [
    'git switch -c {login}',
    'echo "hola" > {login}.txt, git add {login}.txt y git commit -m "Mi fichero"',
    'git push origin {login}',
    'git switch main y git pull (trae lo que hayan subido las demás)',
    'git merge --no-ff {login} (un commit de merge, aunque pudiera avanzar sin él)',
    'git push. Si lo rechazan porque alguien subió antes: git pull y otra vez git push',
  ],
  hints: ['git switch -c rama', 'git push origin rama', 'git pull', 'git merge --no-ff rama'],
  check(remote, players) {
    const main = historyOf(remote, 'main')
    const files = filesAt(remote, remote.branches.main)

    return [
      ...each(
        players,
        'origin/{login} tiene un commit de {login} con {login}.txt',
        (p) =>
          filesAt(remote, remote.branches[p.login])[`${p.login}.txt`] !== undefined &&
          historyOf(remote, p.login).some((c) => prefixOf(c.id) === p.prefix),
      ),
      ...each(
        players,
        '{login} ha unido su rama en main con un merge y lo ha subido',
        (p) => main.some((c) => ownMerge(c, p)) && files[`${p.login}.txt`] !== undefined,
      ),
    ]
  },
}

const GROUP_2: GroupMission = {
  gate: 'group2',
  title: 'GitHub flow con conflictos',
  story:
    'main está protegida: solo se entra con un pull request. Cada cual se apunta al final de equipo.txt desde su rama. Pero mientras trabajáis, alguien cambia ese mismo final en main: a todas os va a chocar. Hay que traer main a la rama, resolver el conflicto dejando todas las líneas, subirla y aceptar el pull request.',
  minutes: 60,
  apart: false,
  setup: () => [
    'echo "# Equipo" > equipo.txt',
    'git add equipo.txt',
    'git commit -m "Lista del equipo"',
    'git push',
  ],
  after: [
    'echo "- coordinación" >> equipo.txt',
    'git add equipo.txt',
    'git commit -m "Coordinación"',
    'git push',
  ],
  locked: ['main'],
  tasks: [
    'git switch -c {login}',
    'echo "- {login}" >> equipo.txt, git add equipo.txt y git commit -m "Me apunto"',
    'git push origin {login} y gh pr merge {login}: el pull request choca con main',
    'git pull origin main: conflicto en equipo.txt (míralo con cat equipo.txt)',
    'Deja equipo.txt con todas las líneas, sin las marcas (echo "…" > equipo.txt y echo "…" >> equipo.txt), git add equipo.txt y git commit',
    'git push origin {login} y otra vez gh pr merge {login} (si vuelve a chocar, repite desde git pull origin main)',
  ],
  hints: ['git switch -c rama', 'gh pr merge rama', 'git pull origin main', 'cat equipo.txt'],
  check(remote, players) {
    const main = historyOf(remote, 'main')
    const list = (filesAt(remote, remote.branches.main)['equipo.txt'] ?? '').split('\n')
    const clean = !list.some((line) => /^(<{7}|={7}|>{7})/.test(line))

    return [
      ...each(players, '{login} ha traído main a su rama y ha resuelto el conflicto', (p) =>
        main.some((c) => ownMerge(c, p)),
      ),
      ...each(
        players,
        '{login} está en equipo.txt de main, por pull request',
        (p) =>
          list.some((line) => line.trim() === `- ${p.login}`) &&
          main.some((c) => prefixOf(c.id) === p.prefix && isPullRequest(c)),
      ),
      item(
        'equipo.txt de main conserva «- coordinación» y no tiene marcas de conflicto',
        clean && list.some((line) => line.trim() === '- coordinación'),
      ),
    ]
  },
}

const GROUP_3: GroupMission = {
  gate: 'group3',
  title: 'Gitflow: funcionalidad, hotfix y versión',
  story:
    'En main está la versión 1.0 y en develop se prepara la siguiente. Cada cual hace las tres cosas de Gitflow: una funcionalidad que entra en develop, un arreglo urgente que sale de main y una versión que sale de develop. Cada arreglo y cada versión acaban en main con su tag y vuelven a develop.',
  minutes: 60,
  apart: false,
  setup: () => [
    'echo "1.0" > version.txt',
    'git add version.txt',
    'git commit -m "Versión 1.0"',
    'git tag v1.0',
    'git switch -c develop',
    'git push origin develop',
    'git push origin main',
    'git push --tags',
  ],
  locked: [],
  tasks: [
    'Funcionalidad: git switch develop, git switch -c feature/{login}, echo "hecho" > {login}.txt, git add y git commit',
    'git switch develop, git pull, git merge --no-ff feature/{login} y git push origin develop',
    'Hotfix: git switch main, git pull, git switch -c hotfix/1.0.{n}, echo "arreglado" > arreglo-{login}.txt, git add y git commit',
    'git switch main, git merge --no-ff hotfix/1.0.{n}, git tag v1.0.{n}; git switch develop, git pull y git merge --no-ff hotfix/1.0.{n}',
    'Versión: git switch -c release/1.{n} (desde develop, con tu funcionalidad), echo "notas" > notas-1.{n}.txt, git add y git commit',
    'git switch main, git pull, git merge --no-ff release/1.{n}, git tag v1.{n}; git switch develop, git pull y git merge --no-ff release/1.{n}',
    'git push origin main, git push origin develop y git push --tags (si te rechazan, git pull en esa rama y otra vez)',
  ],
  hints: [
    'git switch -c feature/rama',
    'git merge --no-ff rama',
    'git tag v1.0.1',
    'git push --tags',
    'git pull',
  ],
  check(remote, players) {
    const develop = historyOf(remote, 'develop')
    const files = filesAt(remote, remote.branches.develop)

    return [
      ...each(
        players,
        'feature/{login} unida en develop con un merge',
        (p) => files[`${p.login}.txt`] !== undefined && develop.some((c) => ownMerge(c, p)),
      ),
      ...each(players, 'v1.0.{n}: el arreglo de {login}, en main y en develop', (p) => {
        const tagged = filesAt(remote, remote.tags[`v1.0.${String(p.n)}`])

        // El tag va en el merge de main; develop une la rama, así que ahí se mira el fichero.
        return (
          taggedIn(remote, `v1.0.${String(p.n)}`, ['main']) &&
          tagged[`arreglo-${p.login}.txt`] !== undefined &&
          files[`arreglo-${p.login}.txt`] !== undefined
        )
      }),
      ...each(
        players,
        'v1.{n}: la versión de {login}, con su funcionalidad, en main y en develop',
        (p) => {
          const tagged = filesAt(remote, remote.tags[`v1.${String(p.n)}`])

          return (
            taggedIn(remote, `v1.${String(p.n)}`, ['main']) &&
            tagged[`notas-1.${String(p.n)}.txt`] !== undefined &&
            tagged[`${p.login}.txt`] !== undefined &&
            files[`notas-1.${String(p.n)}.txt`] !== undefined
          )
        },
      ),
    ]
  },
}

const BOSS: GroupMission = {
  gate: 'boss',
  title: 'Jefe final: todo, sin hablar',
  story:
    'Cada cual en su puesto, lejos de los demás y sin hablar: solo veis origin. main está protegida y tiene un commit roto por persona. Cada cual deshace el suyo sin reescribir la historia, mete en develop su funcionalidad en un solo commit y encima de lo último (sin merges), y, cuando todo esté en develop y main esté arreglada, publica su versión.',
  minutes: 30,
  apart: true,
  setup: (count) => [
    'echo "1.0" > version.txt',
    'git add version.txt',
    'git commit -m "Versión 1.0"',
    'git tag v1.0',
    'git switch -c develop',
    'echo "pendiente" > notas.txt',
    'git add notas.txt',
    'git commit -m "Notas"',
    'git push origin develop',
    'git switch main',
    ...Array.from({ length: count }, (_, i) => [
      `echo "roto" > rompe-${String(i + 1)}.txt`,
      `git add rompe-${String(i + 1)}.txt`,
      `git commit -m "Rompe ${String(i + 1)}"`,
    ]).flat(),
    'git push origin main',
    'git push --tags',
  ],
  locked: ['main'],
  tasks: [
    'Deshaz «Rompe {n}»: git switch -c fix/{login}, búscalo con git log, git revert <su id>, git push origin fix/{login} y gh pr merge fix/{login}',
    'Funcionalidad: git switch develop, git switch -c feature/{login}, dos commits en {login}.txt («uno» y luego «dos» con >>)',
    'Júntalos en uno: git reset --soft HEAD~2 y git commit -m "Funcionalidad de {login}"',
    'Ponla encima de lo último: git fetch y git rebase origin/develop',
    'git switch develop, git pull, git merge feature/{login} (tiene que avanzar sin merge) y git push origin develop. Si develop se movió: git reset --hard origin/develop, vuelve a la rama, rebase y otra vez',
    'Cuando develop tenga todas las funcionalidades y main ya no tenga ningún rompe-*.txt: gh pr merge develop, git switch main, git pull, git tag v2.{n} y git push --tags',
  ],
  hints: [
    'git log',
    'git revert id',
    'git reset --soft HEAD~2',
    'git rebase origin/develop',
    'gh pr merge rama',
  ],
  check(remote, players) {
    const main = historyOf(remote, 'main')
    const develop = historyOf(remote, 'develop')
    const mainFiles = filesAt(remote, remote.branches.main)
    const developFiles = filesAt(remote, remote.branches.develop)

    return [
      ...each(players, '{login} ha deshecho «Rompe {n}» con un revert, por pull request', (p) => {
        const broken = main.find((c) => c.message === `Rompe ${String(p.n)}`)

        return (
          broken !== undefined &&
          mainFiles[`rompe-${String(p.n)}.txt`] === undefined &&
          main.some((c) => prefixOf(c.id) === p.prefix && c.message.startsWith('Revert'))
        )
      }),
      ...each(
        players,
        'La funcionalidad de {login}, en develop en un solo commit y sin merges',
        (p) => {
          const mine = develop.filter((c) => prefixOf(c.id) === p.prefix)

          return (
            (developFiles[`${p.login}.txt`] ?? '').includes('dos') &&
            mine.length === 1 &&
            mine.every((c) => c.parents.length === 1)
          )
        },
      ),
      ...each(players, 'v2.{n}: en main, con todas las funcionalidades y sin nada roto', (p) => {
        const tagged = filesAt(remote, remote.tags[`v2.${String(p.n)}`])

        return (
          taggedIn(remote, `v2.${String(p.n)}`, ['main']) &&
          players.every((other) => tagged[`${other.login}.txt`] !== undefined) &&
          !Object.keys(tagged).some((path) => path.startsWith('rompe-'))
        )
      }),
    ]
  },
}

export const GROUP_MISSIONS: readonly GroupMission[] = [GROUP_1, GROUP_2, GROUP_3, BOSS]

export function missionOf(gate: string): GroupMission | undefined {
  return GROUP_MISSIONS.find((mission) => mission.gate === gate)
}

function must(world: World, lines: readonly string[], what: string): World {
  const result = runAll(world, lines)

  if (!result.ok || result.remote === null)
    throw new GitError(`${what}: ${result.output.join(' / ')}`)

  return { repo: result.repo, remote: result.remote }
}

/**
 * Empieza una prueba: la compañera monta origin, cada persona lo clona con
 * sus ids y, si la prueba lo pide, la compañera sube algo más después.
 */
export function groupStart(
  mission: GroupMission,
  players: readonly GroupPlayer[],
): { remote: Remote; repos: Record<string, Repo> } {
  let mate = must(
    {
      repo: emptyRepo('o'),
      remote: { commits: emptyRepo().commits, branches: { main: 'c0' }, tags: {}, locked: [] },
    },
    ['git clone', ...mission.setup(players.length)],
    mission.gate,
  )
  const repos = Object.fromEntries(
    players.map((p) => [
      p.login,
      must({ repo: emptyRepo(p.prefix), remote: clone(mate.remote) }, ['git clone'], p.login).repo,
    ]),
  )

  if (mission.after !== undefined) mate = must(mate, mission.after, `${mission.gate} (después)`)

  const remote = mate.remote ?? { commits: {}, branches: {}, tags: {}, locked: [] }

  return { remote: { ...remote, locked: [...mission.locked] }, repos }
}

/** Si ya está todo. */
export function missionDone(items: readonly MissionItem[]): boolean {
  return items.every((each) => each.done)
}

/**
 * Jefe final: dos puestos están lo bastante lejos si son de clústeres
 * distintos o se separan al menos 4 filas y 4 columnas (`c1r4s2`: clúster 1,
 * fila 4, puesto 2). Un nombre de puesto que no se entiende no cuenta como lejos.
 */
export function farApart(a: string, b: string): boolean {
  const parse = (seat: string) => /^c(\d+)r(\d+)s(\d+)$/i.exec(seat)?.slice(1).map(Number)
  const [ca, ra, sa] = parse(a) ?? []
  const [cb, rb, sb] = parse(b) ?? []

  if (ca === undefined || cb === undefined || ra === undefined || rb === undefined) return false
  if (ca !== cb) return true

  return Math.abs(ra - rb) >= 4 && Math.abs((sa ?? 0) - (sb ?? 0)) >= 4
}
