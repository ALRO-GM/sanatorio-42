/**
 * API de mentira: documentos verificables y cuentas de staff.
 *
 * En la web de mentira vale cualquier clave que empiece por `s42-`, y el único
 * documento que existe es el del código `K7QF`, que es el que lleva el CSV de
 * ejemplo.
 */

import type { StaffAccount, StaffDocument } from '@sanatorio/contracts'

import type { Api } from '../types'
import { ME } from './data'
import { delay, fail } from './state'

const DEMO_CODE = 'K7QF'
const DAY = 24 * 60 * 60_000
const dayOf = (at: number): string => new Date(at).toISOString().slice(0, 10)

let session: string | null = null

const accounts: StaffAccount[] = [
  {
    id: 1,
    name: 'Bocal Madrid',
    createdBy: ME.login,
    createdAt: new Date(Date.now() - 12 * DAY).toISOString(),
    lastUsedAt: new Date(Date.now() - 2 * DAY).toISOString(),
    revokedAt: null,
  },
]

const HEADER = [
  'login',
  'rol',
  'tipo',
  'evento',
  'titulo',
  'fecha',
  'inicio',
  'fin',
  'minutos_validados',
  'minutos_previstos',
  'con',
]

const demoLines = (): string[][] => [
  [
    ME.login,
    'organiza',
    'pizarra',
    'board:1',
    'malloc: dónde vive tu memoria',
    dayOf(Date.now() - 9 * DAY),
    '16:30',
    '18:00',
    '90',
    '90',
    'jdoe mgarcia',
  ],
  [
    ME.login,
    'asiste',
    'ayuda',
    'help:booking:4',
    'ft_printf',
    dayOf(Date.now() - 6 * DAY),
    '11:00',
    '11:30',
    '30',
    '30',
    'agarcia',
  ],
  [
    ME.login,
    'asiste',
    'pizarra',
    'board:3',
    'Punteros a función',
    dayOf(Date.now() - 2 * DAY),
    '17:00',
    '18:10',
    '70',
    '90',
    'lruiz',
  ],
]

function demoDocument(): StaffDocument {
  const lines = demoLines()
  const from = dayOf(Date.now() - 30 * DAY)
  const to = dayOf(Date.now())

  return {
    code: DEMO_CODE,
    login: ME.login,
    requestedBy: ME.login,
    from,
    to,
    totalMinutes: lines.reduce((sum, line) => sum + Number(line[8]), 0),
    rows: lines.length,
    issuedAt: new Date(Date.now() - DAY).toISOString(),
    fileName: `horas-validadas_${ME.login}_${from}_${to}_${DEMO_CODE}.csv`,
    header: HEADER,
    lines,
  }
}

const normalise = (code: string): string => code.replace(/[\s-]/g, '').toUpperCase()

export const staffMock: Pick<
  Api,
  | 'staffLogin'
  | 'getStaffMe'
  | 'getStaffDocument'
  | 'compareStaffDocument'
  | 'getStaffAccounts'
  | 'createStaffAccount'
  | 'revokeStaffAccount'
> = {
  async staffLogin(key) {
    await delay()

    if (!key.trim().startsWith('s42-')) throw fail(401, 'Esa clave no vale')

    session = 'Bocal Madrid'
  },

  async getStaffMe() {
    await delay(80)

    if (session === null) throw fail(401, 'No hay sesión iniciada')

    return { name: session }
  },

  async getStaffDocument(code) {
    await delay()

    if (normalise(code) !== DEMO_CODE) {
      throw fail(404, 'Ese código no corresponde a ningún documento emitido')
    }

    return demoDocument()
  },

  async compareStaffDocument(code, content) {
    await delay()

    if (normalise(code) !== DEMO_CODE) {
      throw fail(404, 'Ese código no corresponde a ningún documento emitido')
    }

    // El de mentira se da por bueno si lleva su código y no se le ha añadido nada raro.
    return { identical: content.includes(DEMO_CODE) && content.split('\n').length <= 5 }
  },

  async getStaffAccounts() {
    await delay()

    return { accounts: [...accounts] }
  },

  async createStaffAccount(name) {
    await delay()

    if (accounts.some((account) => account.name.toLowerCase() === name.trim().toLowerCase())) {
      throw fail(409, 'Ya hay una cuenta de staff con ese nombre')
    }

    const account: StaffAccount = {
      id: accounts.length + 1,
      name: name.trim(),
      createdBy: ME.login,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      revokedAt: null,
    }

    accounts.unshift(account)

    return { account, key: `s42-${account.id}-clave-de-ejemplo-que-no-abre-nada-de-verdad` }
  },

  async revokeStaffAccount(id) {
    await delay()

    const account = accounts.find((entry) => entry.id === id)

    if (account?.revokedAt !== null) {
      throw fail(404, 'Esa cuenta no existe o ya no tenía acceso')
    }

    account.revokedAt = new Date().toISOString()
  },
}

/** Cierra la sesión de staff de mentira. La llama el `logout` de mentira. */
export function closeStaffSession(): void {
  session = null
}
