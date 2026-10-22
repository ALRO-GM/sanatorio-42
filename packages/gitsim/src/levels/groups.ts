/**
 * Las pruebas de grupo del curso de git: varias personas, cada una con su
 * repositorio y un remoto común. Con varias personas el orden de los merges
 * cambia la historia, así que no se compara una forma exacta: se comprueban
 * **misiones** sobre origin (qué ficheros hay en cada rama, qué tags, de quién
 * son los commits). Las misiones `extra` no hacen falta para acabar.
 *
 * Cada cual tiene un papel según el orden en que entró; quien sobra repite el
 * último. Los textos van con `{login}`, que se cambia por el de cada cual.
 */

import { ancestors, clone, emptyRepo, GitError, isAncestor } from '../model.js'
import type { Remote, Repo } from '../model.js'
import { runAll } from '../run.js'
import type { Gate } from './gates.js'

export type GroupRole = {
  id: string
  title: string
  /** Lo que hace este papel, paso a paso. */
  tasks: string[]
}

export type GroupPlayer = { login: string; prefix: string; role: string }

export type MissionItem = {
  text: string
  done: boolean
  /** De quién es la misión (si es de una persona). */
  login: string | null
  extra: boolean
}

export type GroupMission = {
  gate: Gate['id']
  title: string
  /** La historia, en dos o tres frases. */
  story: string
  /** Lo que monta origin antes de empezar (lo hace una «compañera», commits `o1`…). */
  setup: string[]
  locked: string[]
  roles: GroupRole[]
  /** Comandos que vienen bien, uno por línea. */
  hints: string[]
  check: (remote: Remote, players: readonly GroupPlayer[]) => MissionItem[]
}

/** Los prefijos de los ids de cada persona, por orden de llegada (`c` y `o` ya se usan). */
export const PREFIXES = ['a', 'b', 'd', 'e', 'f', 'g'] as const
export const MAX_PLAYERS = PREFIXES.length

/** Los ficheros de la punta de una rama de origin (vacío si no existe). */
function tipFiles(remote: Remote, branch: string): Record<string, string> {
  const id = remote.branches[branch]

  return id === undefined ? {} : (remote.commits[id]?.files ?? {})
}

/** Si en la historia de `id` hay algún commit de `prefix`. */
function hasCommitBy(remote: Remote, id: string | undefined, prefix: string): boolean {
  if (id === undefined) return false

  return [...ancestors(remote.commits, id)].some((each) => /^[a-z]+/.exec(each)?.[0] === prefix)
}

const item = (text: string, done: boolean, login: string | null = null, extra = false) => ({
  text,
  done,
  login,
  extra,
})

const GROUP_1: GroupMission = {
  gate: 'group1',
  title: 'Cada cual su rama, y todas a main',
  story:
    'Compartís un repositorio en origin y ya lo tenéis clonado. Cada cual saca una rama con su login, guarda en ella un fichero suyo y la sube. Después, una persona trae las ramas de las demás, las une en main y sube main.',
  setup: ['echo "# Equipo" > README.md', 'git add README.md', 'git commit -m "README"', 'git push'],
  locked: [],
  roles: [
    {
      id: 'all',
      title: 'Todas las personas',
      tasks: [
        'git switch -c {login}',
        'echo "hola" > {login}.txt, git add {login}.txt y git commit -m "Mi fichero"',
        'git push origin {login}',
        'Una sola persona: git switch main, git fetch, git merge origin/<cada rama> y git push',
      ],
    },
  ],
  hints: [
    'git switch -c rama',
    'git push origin rama',
    'git fetch',
    'git merge origin/rama',
    'git push',
  ],
  check(remote, players) {
    const main = tipFiles(remote, 'main')
    const merged = [...ancestors(remote.commits, remote.branches.main ?? '')].some(
      (id) => (remote.commits[id]?.parents.length ?? 0) > 1,
    )

    return [
      ...players.map((p) =>
        item(
          `origin/${p.login} tiene un commit de ${p.login} con ${p.login}.txt`,
          tipFiles(remote, p.login)[`${p.login}.txt`] !== undefined &&
            hasCommitBy(remote, remote.branches[p.login], p.prefix),
          p.login,
        ),
      ),
      item(
        'main de origin tiene los ficheros de todas las personas',
        players.every((p) => main[`${p.login}.txt`] !== undefined),
      ),
      item('main de origin tiene un commit de merge', merged),
    ]
  },
}

const GROUP_2: GroupMission = {
  gate: 'group2',
  title: 'GitHub flow con un conflicto',
  story:
    'main está protegida: solo se entra con un pull request. Cada cual se apunta en equipo.txt desde su rama, la sube y acepta su pull request. Como todas tocáis la misma línea, el segundo pull request ya choca: hay que traer main a la rama, resolver el conflicto y volver a subirla.',
  setup: [
    'echo "# Equipo" > equipo.txt',
    'git add equipo.txt',
    'git commit -m "Lista del equipo"',
    'git push',
  ],
  locked: ['main'],
  roles: [
    {
      id: 'all',
      title: 'Todas las personas',
      tasks: [
        'git switch -c {login}',
        'echo "- {login}" >> equipo.txt, git add equipo.txt y git commit -m "Me apunto"',
        'git push origin {login} y gh pr merge {login}',
        'Si hay conflicto: git pull origin main, deja equipo.txt con todas las líneas (cat equipo.txt, echo … > equipo.txt), git add, git commit, git push origin {login} y otra vez gh pr merge {login}',
      ],
    },
  ],
  hints: [
    'git switch -c rama',
    'echo "- yo" >> equipo.txt',
    'gh pr merge rama',
    'git pull origin main',
    'cat equipo.txt',
  ],
  check(remote, players) {
    const list = (tipFiles(remote, 'main')['equipo.txt'] ?? '').split('\n')
    const resolved = [...ancestors(remote.commits, remote.branches.main ?? '')].some((id) => {
      const commit = remote.commits[id]

      return (
        commit !== undefined &&
        commit.parents.length > 1 &&
        !commit.message.startsWith('Merge pull request')
      )
    })

    return [
      ...players.map((p) =>
        item(
          `${p.login} está en equipo.txt de main, por pull request`,
          list.some((line) => line.trim() === `- ${p.login}`) &&
            hasCommitBy(remote, remote.branches.main, p.prefix),
          p.login,
        ),
      ),
      item(
        'equipo.txt de main no tiene marcas de conflicto',
        !list.some((line) => /^(<{7}|={7}|>{7})/.test(line)),
      ),
      item('Alguien trajo main a su rama y resolvió un conflicto', resolved, null, true),
    ]
  },
}

const GROUP_3: GroupMission = {
  gate: 'group3',
  title: 'Gitflow: una versión y un hotfix a la vez',
  story:
    'En main está la versión 1.0 y en develop se trabaja en la siguiente. A la vez: una persona prepara la versión 1.1 desde develop, otra arregla un fallo urgente de la 1.0 desde main, y el resto mete sus funcionalidades en develop. Cada versión acaba en main con su tag y vuelve a develop.',
  setup: [
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
  roles: [
    {
      id: 'release',
      title: 'Versión 1.1',
      tasks: [
        'git switch develop y git switch -c release/1.1',
        'echo "1.1" > version.txt, git add version.txt y git commit -m "Versión 1.1"',
        'git switch main, git merge release/1.1 y git tag v1.1',
        'git switch develop y git merge release/1.1',
        'git push origin main, git push origin develop y git push --tags (si te rechazan, git pull y otra vez)',
      ],
    },
    {
      id: 'hotfix',
      title: 'Hotfix 1.0.1',
      tasks: [
        'git switch -c hotfix/1.0.1 (desde main)',
        'echo "arreglado" > arreglo.txt, git add arreglo.txt y git commit -m "Arreglo urgente"',
        'git switch main, git merge hotfix/1.0.1 y git tag v1.0.1',
        'git switch develop y git merge hotfix/1.0.1',
        'git push origin main, git push origin develop y git push --tags (si te rechazan, git pull y otra vez)',
      ],
    },
    {
      id: 'feature',
      title: 'Funcionalidad',
      tasks: [
        'git switch develop y git switch -c feature/{login}',
        'echo "hecho" > {login}.txt, git add {login}.txt y git commit -m "Mi funcionalidad"',
        'git switch develop, git merge feature/{login} y git push origin develop (si te rechazan, git pull y otra vez)',
      ],
    },
  ],
  hints: [
    'git switch develop',
    'git switch -c release/1.1',
    'git tag v1.1',
    'git push --tags',
    'git pull',
  ],
  check(remote, players) {
    const main = remote.branches.main
    const develop = remote.branches.develop
    const tagged = (name: string) => {
      const id = remote.tags[name]

      return {
        files: id === undefined ? {} : (remote.commits[id]?.files ?? {}),
        everywhere:
          id !== undefined &&
          main !== undefined &&
          develop !== undefined &&
          isAncestor(remote.commits, id, main) &&
          isAncestor(remote.commits, id, develop),
      }
    }
    const hotfix = tagged('v1.0.1')
    const release = tagged('v1.1')
    const developFiles = tipFiles(remote, 'develop')
    const mainFiles = tipFiles(remote, 'main')

    return [
      item(
        'v1.0.1 en origin: el arreglo sobre la 1.0, unido en main y en develop',
        hotfix.everywhere &&
          hotfix.files['arreglo.txt'] !== undefined &&
          hotfix.files['version.txt'] === '1.0',
      ),
      item(
        'v1.1 en origin: la versión 1.1, unida en main y de vuelta en develop',
        release.everywhere && release.files['version.txt'] === '1.1',
      ),
      item(
        'main de origin tiene el arreglo y la versión 1.1',
        mainFiles['arreglo.txt'] !== undefined && mainFiles['version.txt'] === '1.1',
      ),
      ...players
        .filter((p) => p.role === 'feature')
        .map((p) =>
          item(
            `La funcionalidad de ${p.login} está en develop`,
            developFiles[`${p.login}.txt`] !== undefined,
            p.login,
          ),
        ),
    ]
  },
}

export const GROUP_MISSIONS: readonly GroupMission[] = [GROUP_1, GROUP_2, GROUP_3]

export function missionOf(gate: string): GroupMission | undefined {
  return GROUP_MISSIONS.find((mission) => mission.gate === gate)
}

/** El papel de quien entra en `index`-ésimo lugar. */
export function roleOf(mission: GroupMission, index: number): GroupRole {
  const role = mission.roles[Math.min(index, mission.roles.length - 1)]

  if (role === undefined) throw new GitError(`${mission.gate}: sin papeles`)

  return role
}

/** El origin con el que empieza la prueba. */
export function groupRemote(mission: GroupMission): Remote {
  const mate = runAll(
    {
      repo: emptyRepo('o'),
      remote: { commits: emptyRepo().commits, branches: { main: 'c0' }, tags: {}, locked: [] },
    },
    ['git clone', ...mission.setup],
  )

  if (!mate.ok || mate.remote === null)
    throw new GitError(`${mission.gate}: ${mate.output.join(' / ')}`)

  return { ...mate.remote, locked: [...mission.locked] }
}

/** El repositorio de una persona al empezar: origin ya clonado, con sus ids. */
export function groupRepo(remote: Remote, prefix: string): Repo {
  const cloned = runAll({ repo: emptyRepo(prefix), remote: clone(remote) }, ['git clone'])

  return cloned.repo
}

/** Si ya están todas las misiones que hacen falta. */
export function missionDone(items: readonly MissionItem[]): boolean {
  return items.every((each) => each.extra || each.done)
}
