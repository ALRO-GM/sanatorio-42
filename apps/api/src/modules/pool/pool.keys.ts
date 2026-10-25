/**
 * Qué rutas abre cada permiso de piscinero (`docs/piscineros.md`). Con una
 * sesión de piscinero, una ruta que no es de la base ni de un permiso
 * concedido da 403 (`pool.gate.ts`). Una ruta nueva hay que apuntarla aquí:
 * un test (`tests/integration/pool-gate.test.ts`) lo exige.
 */

import type { PoolKey } from '@sanatorio/contracts'

/** Lo que necesita cualquiera con sesión para que la web funcione: entrar, ajustes, legal. */
export const POOL_BASE: readonly string[] = [
  '/auth/callback',
  '/auth/login',
  '/auth/logout',
  '/auth/me',
  '/auth/staff',
  '/health',
  '/health/db',
  '/pool/notice',
  '/pool/access',
  // La vuelta de la vista de piscinero de quien administra: sin la marca firmada, 403.
  '/pool/preview/exit',
  '/pulse',
  '/campuses',
  '/me/settings',
  '/me/legal',
  '/me/legal/accept',
  '/me/export',
  '/me/anonymize',
  '/me/profile',
  '/me/projects',
  '/usage',
  '/usage/clicks',
  '/tours/speed',
  '/tours/speeds',
  '/client-errors',
  '/avatars/:login',
  '/quota',
  '/sync/status',
  // El mantenimiento y los avisos de quien administra (la limpieza de
  // taquillas) son para todo el mundo: también para los piscineros.
  '/maintenance',
  '/countdowns',
  '/countdowns/notices/:id/dismiss',
]

/** Las rutas de cada permiso. Un elemento (`a.b`) necesita además su pestaña (`a`). */
export const POOL_ROUTES: Record<PoolKey, readonly string[]> = {
  expediente: ['/users/:login/profile'],
  'expediente.health': ['/me/health', '/me/health/pace'],
  'expediente.hours': ['/events/report', '/events/report/csv'],
  'expediente.network': ['/network/mine'],
  'expediente.achievements': [],
  'expediente.ranking': ['/leaderboard'],
  // La agenda (`docs/agenda.md`): tus metas, checkpoints, dailies y weeklies.
  agenda: [
    '/agenda',
    '/agenda/goals',
    '/agenda/goals/:id',
    '/agenda/goals/:id/checkpoints',
    '/agenda/goals/:id/checkpoints/:checkpoint',
    '/agenda/goals/:id/entries',
  ],
  // El tablero del sprint: la agenda de tu grupo para su proyecto.
  'agenda.sprint': ['/agenda/sprints/:id'],
  consulta: [
    '/projects/:id/peers',
    '/help/offers',
    '/help/inbox',
    '/help/bookings',
    '/help/bookings/:id',
    '/help/bookings/:id/rating',
    '/help/bookings/:id/seen',
  ],
  'consulta.map': ['/projects/:id/map'],
  guardia: [
    '/help/today',
    '/help/bookings/:id/accept',
    '/help/bookings/:id/decline',
    '/help/blocks',
    '/help/blocks/:login',
    '/help/reputation',
    '/me/availability',
  ],
  tablon: [
    '/doubts/:id',
    '/doubts/:id/answers',
    '/doubts/:id/resolved',
    '/projects/:id/doubts',
    '/projects/:id/guide',
    '/projects/:id/guide/proposals',
    '/guide-changes/:id/flag',
    '/guide-proposals/:id/accept',
    '/guide-proposals/:id/reject',
  ],
  'tablon.graph': ['/doubts/graph'],
  'tablon.corrections': [],
  terapia: ['/groups', '/groups/:id', '/groups/:id/invite', '/groups/:id/join'],
  pizarras: ['/boards', '/boards/:id', '/boards/:id/join'],
  notgames: [
    '/quiz/rooms',
    '/quiz/rooms/:id',
    '/quiz/rooms/:id/answer',
    '/quiz/rooms/:id/join',
    '/quiz/rooms/:id/leave',
    '/quiz/rooms/:id/start',
  ],
  'notgames.chess': [
    '/games/rooms',
    '/games/rooms/:id',
    '/games/rooms/:id/answer',
    '/games/rooms/:id/join',
    '/games/rooms/:id/leave',
    '/games/rooms/:id/move',
    '/games/rooms/:id/resign',
    '/games/rooms/:id/start',
  ],
  'notgames.review': ['/quiz/review'],
  gitcourse: [
    '/gitcourse',
    '/gitcourse/gates/:id/answer',
    '/gitcourse/gates/:id/start',
    '/gitcourse/levels/:id',
  ],
  shellcourse: ['/shellcourse', '/shellcourse/bosses/:id/start', '/shellcourse/units/:id'],
  'gitcourse.groups': [
    '/gitcourse/rooms',
    '/gitcourse/rooms/:id',
    '/gitcourse/rooms/:id/join',
    '/gitcourse/rooms/:id/leave',
    '/gitcourse/rooms/:id/run',
    '/gitcourse/rooms/:id/start',
  ],
  estadisticas: ['/stats'],
  calendario: [
    '/calendar',
    // Fijarse una cuenta atrás sale del calendario (`docs/avisos-cuenta-atras.md`).
    '/countdowns/pins',
    '/countdowns/pins/:id',
    '/events/alerts',
    '/events/alerts/ack',
    '/events/attendance',
    '/events/checkin',
    '/events/messages',
    '/events/thread',
  ],
  clusters: ['/map'],
  'clusters.online': [],
  'clusters.broken': ['/map/seats/:host/broken'],
  'clusters.report': ['/facility/reports'],
  red: ['/network', '/network/people', '/network/pair'],
  'red.rankings': ['/network/strictest'],
  'red.seats': ['/network/seats'],
  avance: ['/stats/progress', '/stats/ranking'],
  'avance.compare': [],
  examenes: [],
  'examenes.live': ['/exams/live', '/exams/live/refresh'],
  'examenes.stats': ['/exams/stats'],
  clicker: [
    '/clicker',
    '/clicker/board',
    '/clicker/capital',
    '/clicker/pill',
    '/clicker/plus',
    '/clicker/reviews',
    '/clicker/reviews/:id',
    '/clicker/save',
    '/clicker/seizure/ack',
  ],
  focus: ['/me/focus', '/me/focus/stay'],
  'focus.stats': ['/me/focus/stats'],
  mailbox: [
    '/notices',
    '/notices/read',
    '/notices/remove',
    '/notices/save',
    '/conversations',
    '/conversations/mark',
  ],
  people: ['/users/search', '/people/:login/card'],
  broadcasts: ['/broadcasts', '/broadcasts/:id/answer'],
  tickets: ['/tickets', '/tickets/:id', '/tickets/mine'],
}

/** Todas las claves, en el orden de la tabla. */
export const POOL_KEYS = Object.keys(POOL_ROUTES) as PoolKey[]

/**
 * Lo que tiene un piscinero al abrir la piscina por primera vez: lo de pedir
 * y dar ayuda, quedar, el calendario, los clústeres y la red, sin juegos,
 * exámenes ni el avance del common core. Se cambia en el panel.
 */
export const POOL_DEFAULT: readonly PoolKey[] = [
  'expediente',
  'expediente.achievements',
  'agenda',
  'agenda.sprint',
  'consulta',
  'consulta.map',
  'guardia',
  'tablon',
  'terapia',
  'pizarras',
  'calendario',
  'clusters',
  'clusters.report',
  'red',
  'red.seats',
  'focus',
  'mailbox',
  'people',
  'broadcasts',
  'tickets',
]

/** La pestaña de un elemento (`consulta.map` → `consulta`), o la propia clave. */
const parentOf = (key: PoolKey): PoolKey => key.split('.')[0] as PoolKey

/** Las claves que valen de verdad: las permitidas cuya pestaña también lo está. */
export function effective(allow: readonly PoolKey[]): Set<PoolKey> {
  const given = new Set(allow)

  return new Set(allow.filter((key) => given.has(parentOf(key))))
}

const BASE = new Set(POOL_BASE)
const OWNER = new Map<string, PoolKey>(
  POOL_KEYS.flatMap((key) => POOL_ROUTES[key].map((route) => [route, key] as const)),
)

/** La clave que abre una ruta, `'base'` si es de la base o `null` si no es de nadie. */
export function keyOfRoute(route: string): PoolKey | 'base' | null {
  if (BASE.has(route)) return 'base'

  return OWNER.get(route) ?? null
}

/** Si un piscinero con esos permisos (ya efectivos) puede usar la ruta. */
export function poolAllows(route: string, allowed: ReadonlySet<PoolKey>): boolean {
  const key = keyOfRoute(route)

  return key === 'base' || (key !== null && allowed.has(key))
}
