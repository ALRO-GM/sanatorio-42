/**
 * API de mentira: avisos del edificio. Uno de ejemplo abierto y lo que se avise
 * desde la web; los ven el panel y la página del staff.
 */

import type { FacilityReport } from '@sanatorio/contracts'

import { ME } from './data'
import { delay, fail } from './state'
import type { Api } from '../types'

const reports: FacilityReport[] = [
  {
    id: 1,
    campusId: 22,
    campusName: 'Madrid',
    login: 'jdoe',
    category: 'peripheral',
    place: 'c2r5s3',
    note: 'El teclado no escribe la ñ',
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    resolvedAt: null,
    resolvedBy: null,
  },
]
let nextId = 2

function resolve(id: number, by: string): void {
  const report = reports.find((one) => one.id === id && one.resolvedAt === null)

  if (report === undefined) throw fail(404, 'Ese aviso no existe o ya está resuelto')
  report.resolvedAt = new Date().toISOString()
  report.resolvedBy = by
}

export const facilityMock: Pick<
  Api,
  | 'reportFacility'
  | 'getAdminFacility'
  | 'resolveAdminFacility'
  | 'getStaffFacility'
  | 'resolveStaffFacility'
> = {
  async reportFacility(input) {
    await delay(150)

    if (input.category === 'other' && (input.note ?? '').length < 3) {
      throw fail(400, 'Cuenta qué pasa: con «otro» hace falta una nota')
    }

    const report: FacilityReport = {
      id: nextId++,
      campusId: 22,
      campusName: 'Madrid',
      login: ME.login,
      category: input.category,
      // Como la API: sin decir dónde, el puesto en el que estás (el de mentira).
      place: input.place ?? 'c2r4s6',
      note: input.note ?? null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
    }

    reports.unshift(report)

    return { ...report }
  },
  async getAdminFacility() {
    await delay(100)

    return reports.map((report) => ({ ...report }))
  },
  async resolveAdminFacility(id) {
    await delay(100)
    resolve(id, ME.login)
  },
  async getStaffFacility() {
    await delay(100)

    return reports.map((report) => ({ ...report }))
  },
  async resolveStaffFacility(id) {
    await delay(100)
    resolve(id, 'staff:bocal')
  },
}
