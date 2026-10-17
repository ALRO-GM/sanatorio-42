/**
 * Datos de mentira con los que arranca la API simulada.
 */

import type {
  BoardView,
  Booking,
  CampusSummary,
  CurrentUser,
  DoubtAnswer,
  GroupView,
  Guide,
  GuideSection,
  HelpOffer,
  LeaderboardEntry,
  Peer,
  ProjectSummary,
  ReactionKind,
  TimeRange,
  TitleId,
} from '@sanatorio/contracts'

export const ME: CurrentUser = {
  id: 1,
  login: 'plopez-l',
  name: 'P. López',
  image: null,
  campusId: 22,
}

export const PROJECTS: ProjectSummary[] = [
  { id: 1314, name: 'ft_printf', status: 'in_progress' },
  { id: 1337, name: 'get_next_line', status: 'in_progress' },
  { id: 1420, name: 'push_swap', status: 'in_progress' },
  { id: 1312, name: 'Libft', status: 'finished' },
  { id: 3102, name: 'Born2beroot', status: 'finished' },
]

const peer = (
  login: string,
  location: string | null,
  available: boolean,
  status: Peer['status'],
  perfect = false,
): Peer => ({
  login,
  image: null,
  location,
  available,
  status,
  perfect,
  // Quien lo bordó se ofrece a preevaluar.
  preReview: perfect,
})

export const PEERS: Record<number, Peer[]> = {
  1314: [
    peer('jdoe', 'c2r4s6', true, 'finished', true),
    peer('mgarcia', 'c1r2s1', false, 'in_progress'),
    peer('anavarro', 'c1r2s4', true, 'in_progress'),
    peer('llorente', 'c5r3s2', true, 'in_progress'),
  ],
  1337: [
    peer('lruiz', 'c3r1s9', true, 'in_progress'),
    peer('jdoe', null, false, 'in_progress'),
    peer('gmoreno', 'c1r5s7', true, 'in_progress'),
    peer('mgarcia', 'c2r7s3', true, 'finished'),
  ],
  1420: [
    peer('mgarcia', 'c2r7s3', true, 'in_progress'),
    peer('tvega', 'c3r4s5', true, 'in_progress'),
    peer('cfernandez', 'c4r2s8', true, 'finished'),
  ],
}

/**
 * El plan de mentira: el nuevo (C y luego Python), conocido hasta el círculo 3,
 * como le saldría a alguien que va por el círculo 1. Los proyectos de
 * `PROJECTS` llevan su id; el resto, uno inventado.
 */
const CORE_NAMES: [name: string, short: string, id?: number | undefined, hours?: number][][] = [
  [['Libft', 'Libft', 1312, 70]],
  [
    ['Born2beroot', 'B2BR', 3102, 50],
    ['ft_printf', 'printf', 1314, 55],
    ['get_next_line', 'GNL', 1337, 60],
    ['push_swap', 'push_swap', 1420, 80],
  ],
  [
    ['A-Maze-ing', 'Maze', undefined, 70],
    ['Exam Rank 02', 'Exam 02', undefined, 4],
    ...Array.from({ length: 11 }, (_, index): [string, string, undefined, number] => {
      const n = String(index).padStart(2, '0')

      return [`Python Module ${n}`, `Py ${n}`, undefined, 6 + (index % 4) * 3]
    }),
    // La segunda oportunidad del módulo 05: con uno de los dos basta.
    ['Python Module 05 bis', 'Py 05 bis', undefined, 9],
  ],
  [
    ['Call Me Maybe', 'CallMe', undefined, 80],
    ['Codexion', 'Codexion', undefined, 60],
    ['Exam Rank 03', 'Exam 03', undefined, 4],
    ['Fly-in', 'Fly-in', undefined, 120],
  ],
]

/** Círculo por el que va la persona de mentira. */
export const CURRENT_CIRCLE = 1

export const CORE: {
  circle: number
  projects: { id: number; name: string; short: string; hours: number | null }[]
}[] = CORE_NAMES.map((projects, circle) => ({
  circle,
  projects: projects.map(([name, short, id, hours], index) => ({
    id: id ?? 3000 + circle * 100 + index + 10,
    name,
    short,
    hours: hours ?? null,
  })),
}))

export const CAMPUSES: CampusSummary[] = [
  { id: 22, name: 'Madrid', city: 'Madrid', country: 'Spain', tracked: true },
  { id: 58, name: 'Barcelona', city: 'Barcelona', country: 'Spain', tracked: false },
  { id: 1, name: 'Paris', city: 'Paris', country: 'France', tracked: false },
]

export const LEVEL_FLOORS = [0, 50, 120, 250, 500, 800, 1200, 1700, 2300, 3000]

export const TITLES: { id: TitleId; level: number }[] = [
  { id: 'paciente', level: 1 },
  { id: 'interno', level: 2 },
  { id: 'residente', level: 3 },
  { id: 'especialista', level: 5 },
  { id: 'jefe', level: 7 },
]

/** Un grupo tal y como se guarda: los miembros son logins y se anota si ya se fichó. */
/** Gente sentada que no tiene que ver con ningún proyecto de los de mentira. */
export const BYSTANDERS: { login: string; host: string }[] = [
  { login: 'rsoto', host: 'c1r1s2' },
  { login: 'ibanez', host: 'c1r3s5' },
  { login: 'nmartin', host: 'c1r4s1' },
  { login: 'dcano', host: 'c2r2s2' },
  { login: 'vreyes', host: 'c2r5s6' },
  { login: 'opardo', host: 'c3r2s3' },
  { login: 'sgil', host: 'c4r1s4' },
  { login: 'plopez-l', host: 'c1r2s2' },
]

/** Tamaño de cada cluster de mentira: filas × puestos por fila. */
export const CLUSTER_SIZES: Record<string, [rows: number, seats: number]> = {
  c1: [5, 8],
  c2: [7, 8],
  c3: [4, 9],
  c4: [3, 8],
  c5: [3, 6],
}

export type StoredGroup = Omit<
  GroupView,
  'members' | 'joined' | 'mine' | 'canClose' | 'inSession' | 'invited'
> & {
  members: string[]
  /** Cómo llevaba el proyecto cada persona al apuntarse. */
  progress: Record<string, number>
}

export type StoredDoubt = {
  id: number
  projectId: number
  author: string
  body: string
  color: number
  resolved: boolean
  /** La respuesta que la resolvió, o `null`. */
  solvedAnswerId: number | null
  createdAt: string
  replies: DoubtAnswer[]
}

export type StoredProposal = {
  id: number
  projectId: number
  author: string
  section: GuideSection
  body: string
}

/** Un cambio de guía ya validado, con quién lo ha señalado. */
export type StoredChange = {
  id: number
  projectId: number
  section: GuideSection
  body: string
  proposer: string
  validator: string
  acceptedAt: string
  flaggedBy: string[]
}

export type StoredBoard = Omit<BoardView, 'attendees' | 'joined' | 'mine' | 'canCancel'> & {
  attendees: string[]
}

export type MockState = {
  campusId: number
  /** Te ofreces a preevaluar proyectos terminados. */
  preReview: boolean
  title: TitleId
  xp: number
  reactions: Record<ReactionKind, number>
  groups: StoredGroup[]
  guides: Record<number, Guide>
  proposals: StoredProposal[]
  changes: StoredChange[]
  help: {
    windows: TimeRange[]
    maxMinutes: number
    bookings: Booking[]
    blocked: string[]
  }
  doubts: StoredDoubt[]
  boards: StoredBoard[]
}

/** Hoy, como `YYYY-MM-DD`, en la hora del navegador. */
export function today(): string {
  const date = new Date()
  const pad = (value: number): string => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** El día de dentro de `days` días, como `YYYY-MM-DD`, en la hora del navegador. */
function dayIn(days: number): string {
  const date = new Date()
  const pad = (value: number): string => String(value).padStart(2, '0')

  date.setDate(date.getDate() + days)

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Fecha ISO dentro de `days` días a esa hora local. */
export function inDays(days: number, hour: number, minutes = 0): string {
  const date = new Date()

  date.setDate(date.getDate() + days)
  date.setHours(hour, minutes, 0, 0)

  return date.toISOString()
}

export function initialState(): MockState {
  return {
    campusId: 22,
    preReview: false,
    title: 'residente',
    xp: 340,
    reactions: { bug: 7, code: 5, concept: 9, patient: 4 },
    groups: [
      {
        id: 1,
        projectId: 1314,
        projectName: 'ft_printf',
        creator: 'anavarro',
        place: 'Cluster 1 · Planta 2',
        dates: [dayIn(0), dayIn(2), dayIn(7)],
        start: '16:00',
        end: '18:00',
        capacity: 5,
        note: 'Junto a la ventana',
        seats: ['c1r2s3', 'c1r2s4', 'c1r2s5'],
        members: ['anavarro', 'mgarcia', 'llorente'],
        progress: { anavarro: 60, mgarcia: 35 },
        kind: 'study',
      },
      {
        id: 2,
        projectId: 1337,
        projectName: 'get_next_line',
        creator: 'lruiz',
        place: 'Cluster 2',
        dates: [dayIn(1), dayIn(8)],
        start: '10:00',
        end: '12:00',
        capacity: 5,
        note: null,
        seats: [],
        members: ['lruiz', 'gmoreno', 'plopez-l'],
        progress: {},
        kind: 'review',
      },
    ],
    guides: {
      1314: {
        start: [
          'Lee el subject entero antes de escribir código',
          'Monta primero el Makefile',
          'Prueba cada conversión con tu propio main',
        ],
        problems: [
          'Segfault al recibir NULL en %s',
          'Leaks por no liberar memoria',
          'Norminette: funciones demasiado largas',
        ],
        concepts: ['Variádicas', 'va_arg', 'Bases numéricas', 'Makefile'],
        updatedBy: 'jdoe',
        updatedAt: inDays(-3, 12),
      },
      1312: {
        start: ['Empieza por las funciones de ctype y de cadenas'],
        problems: ['Olvidar el terminador en ft_strlcpy'],
        concepts: ['Punteros', 'malloc', 'Listas enlazadas'],
        updatedBy: 'cfernandez',
        updatedAt: inDays(-10, 12),
      },
    },
    proposals: [
      {
        id: 1,
        projectId: 1312,
        author: 'gmoreno',
        section: 'problems',
        body: 'ft_split: cuidado con los separadores seguidos',
      },
    ],
    changes: [
      {
        id: 1,
        projectId: 1312,
        section: 'problems',
        body: 'Olvidar el terminador en ft_strlcpy',
        proposer: 'gmoreno',
        validator: 'cfernandez',
        acceptedAt: inDays(-4, 12),
        // Ya lo ha señalado una persona: con otra señal más se retira.
        flaggedBy: ['tvega'],
      },
    ],
    help: {
      windows: [],
      maxMinutes: 60,
      blocked: [],
      bookings: [
        // Una sesión de esta mañana, hecha y comprobada, que falta valorar.
        {
          id: 1,
          helper: 'jdoe',
          requester: ME.login,
          peer: { login: 'jdoe', image: null },
          role: 'requester',
          projectId: 1314,
          projectName: 'ft_printf',
          day: today(),
          start: '09:00',
          end: '09:30',
          note: 'No me sale %p',
          status: 'confirmed',
          finished: true,
          verified: true,
          ratedByMe: false,
          ratedByPeer: true,
          xp: null,
        },
        // Alguien te ha pedido un rato para esta tarde.
        {
          id: 2,
          helper: ME.login,
          requester: 'gmoreno',
          peer: { login: 'gmoreno', image: null },
          role: 'helper',
          projectId: 1312,
          projectName: 'Libft',
          day: today(),
          start: '23:00',
          end: '23:30',
          note: 'ft_split con varios separadores',
          status: 'pending',
          finished: false,
          verified: false,
          ratedByMe: false,
          ratedByPeer: false,
          xp: null,
        },
      ],
    },
    doubts: [
      {
        id: 1,
        projectId: 1314,
        author: 'anavarro',
        body: '¿Por qué %p me imprime (nil) en Linux y 0x0 en Mac?',
        color: 0,
        resolved: true,
        solvedAnswerId: 1,
        createdAt: inDays(-2, 11),
        replies: [
          {
            id: 1,
            author: 'jdoe',
            body: 'Depende de la libc. El subject pide el comportamiento del printf de tu sistema.',
            specialist: true,
            createdAt: inDays(-2, 12),
          },
        ],
      },
      {
        id: 2,
        projectId: 1314,
        author: 'mgarcia',
        body: 'va_arg con un char: ¿por qué hay que pedir un int?',
        color: 1,
        resolved: false,
        solvedAnswerId: null,
        createdAt: inDays(-1, 17),
        replies: [],
      },
      {
        id: 3,
        projectId: 1314,
        author: 'llorente',
        body: 'Mi Makefile recompila todo cada vez, ¿cómo evito el relink?',
        color: 3,
        resolved: false,
        solvedAnswerId: null,
        createdAt: inDays(-1, 10),
        replies: [
          {
            id: 2,
            author: 'jdoe',
            body: 'Haz que la regla dependa de los .o, no de un nombre que nunca se crea.',
            specialist: true,
            createdAt: inDays(-1, 11),
          },
        ],
      },
      {
        id: 4,
        projectId: 1337,
        author: 'lruiz',
        body: '¿BUFFER_SIZE=1 tiene que funcionar igual que 9999?',
        color: 2,
        resolved: false,
        solvedAnswerId: null,
        createdAt: inDays(-1, 9),
        replies: [],
      },
    ],
    boards: [
      {
        id: 1,
        host: 'jdoe',
        hostImage: null,
        title: 'malloc: dónde vive tu memoria',
        topic: 'malloc',
        description: 'Pila, heap y qué pasa cuando haces free.',
        place: 'Cluster 1, sala de pizarras',
        startsAt: inDays(1, 17),
        endsAt: inDays(1, 18, 30),
        capacity: 20,
        attendees: ['mgarcia', 'tvega'],
      },
      {
        id: 2,
        host: 'cfernandez',
        hostImage: null,
        title: 'Funciones variádicas',
        topic: 'ft_printf',
        description: null,
        place: 'Cluster 1',
        startsAt: inDays(6, 17),
        endsAt: inDays(6, 18),
        capacity: 15,
        attendees: [],
      },
      {
        id: 3,
        host: 'mgarcia',
        hostImage: null,
        title: 'Algoritmia: complejidad y ordenación',
        topic: 'push_swap',
        description: null,
        place: 'Cluster 2',
        startsAt: inDays(8, 17),
        endsAt: inDays(8, 18),
        capacity: 15,
        attendees: ['lruiz'],
      },
    ],
  }
}

/** Ranking de mentira del mes. `plopez-l` entra con lo que lleve ganado. */
export const RANKING: Omit<LeaderboardEntry, 'rank'>[] = [
  { login: 'jdoe', image: null, xp: 410 },
  { login: 'cfernandez', image: null, xp: 325 },
  { login: 'mgarcia', image: null, xp: 180 },
  { login: 'anavarro', image: null, xp: 95 },
  { login: 'lruiz', image: null, xp: 40 },
]

const toTime = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/**
 * Gente que se ofrece hoy, con huecos a partir de la próxima media hora (para
 * que siempre haya algo que reservar, sea la hora que sea).
 */
export function offers(): HelpOffer[] {
  const now = new Date()
  const next = Math.ceil((now.getHours() * 60 + now.getMinutes() + 1) / 30) * 30
  const starts = (count: number): string[] =>
    Array.from({ length: count }, (_, index) => next + index * 30)
      .filter((start) => start + 30 <= 24 * 60)
      .map(toTime)

  return [
    { login: 'jdoe', freeStarts: starts(4), remainingMinutes: 60 },
    { login: 'anavarro', freeStarts: starts(2), remainingMinutes: 30 },
  ].filter((offer) => offer.freeStarts.length > 0)
}
