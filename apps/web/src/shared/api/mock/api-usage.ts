import type { ApiUsage, ApiUsageLimits } from '@sanatorio/contracts'

import type { Api } from '../types'
import { delay } from './state'

const HOUR = 60 * 60_000

/** Lo que gasta cada función en una hora normal de la web de mentira, y quién. */
const FEATURES: { key: string; perHour: number; people: string[] }[] = [
  { key: 'sync:locations', perHour: 60, people: [] },
  { key: 'sync:delta', perHour: 45, people: [] },
  { key: 'sync:backfill', perHour: 380, people: [] },
  { key: 'job:corrections', perHour: 120, people: [] },
  { key: 'network', perHour: 90, people: ['albrodri', 'mgomez', 'lperez'] },
  { key: 'boards', perHour: 40, people: ['mgomez', 'ana'] },
  { key: 'progress', perHour: 35, people: ['lperez'] },
  { key: 'queue:agenda', perHour: 25, people: ['ana', 'eva', 'leo'] },
  { key: 'calendar', perHour: 18, people: ['eva'] },
  { key: 'projects', perHour: 12, people: ['albrodri', 'leo'] },
]

const limits: ApiUsageLimits = { perPerson: 120, people: { lperez: 40 }, features: {} }

/** Una curva de día: poco de madrugada, más por la tarde. */
const shape = (hour: number): number =>
  0.3 + 0.7 * Math.max(0, Math.sin(((hour - 6) / 24) * Math.PI * 2))

/** `true` si la fila es de lo pedido: una función, una persona, o todo. */
const wanted = (
  feature: string,
  login: string,
  query: { feature?: string | undefined; login?: string | undefined },
) =>
  (query.feature === undefined || query.feature === feature) &&
  (query.login === undefined || query.login === login)

/** Los topes con el de `key` cambiado; `null` lo quita. */
function withCap(
  caps: Record<string, number>,
  key: string,
  cap: number | null,
): Record<string, number> {
  const rest = Object.fromEntries(Object.entries(caps).filter(([name]) => name !== key))

  return cap === null ? rest : { ...rest, [key]: cap }
}

export const apiUsageMock: Pick<Api, 'getAdminApiUsage' | 'setAdminApiLimits'> = {
  async getAdminApiUsage(query) {
    await delay(150)

    const start = Math.floor(Date.now() / HOUR) * HOUR
    const rows: { hour: string; feature: string; login: string; requests: number }[] = []

    for (let back = query.hours - 1; back >= 0; back -= 1) {
      const at = start - back * HOUR
      const factor = shape(new Date(at).getUTCHours()) * (back === 0 ? 0.4 : 1)

      for (const { key, perHour, people } of FEATURES) {
        const total = Math.round(perHour * factor)
        const logins = people.length === 0 ? [''] : people

        logins.forEach((login, index) => {
          const requests = Math.round(total / (index + 1.5))

          if (requests > 0 && wanted(key, login, query)) {
            rows.push({
              hour: new Date(at).toISOString().slice(0, 13),
              feature: key,
              login,
              requests,
            })
          }
        })
      }
    }

    const current = new Date(start).toISOString().slice(0, 13)
    const byPerson = query.feature !== undefined && query.login === undefined
    const series = new Map<string, number>()
    const features = new Map<string, ApiUsage['features'][number] & { who: Set<string> }>()
    const people = new Map<
      string,
      { requests: number; thisHour: number; top: Map<string, number> }
    >()

    for (const row of rows) {
      const key = byPerson ? row.login : row.feature
      const id = `${row.hour}\t${key}`
      const now = row.hour === current ? row.requests : 0
      const feature = features.get(row.feature) ?? {
        key: row.feature,
        requests: 0,
        people: 0,
        thisHour: 0,
        who: new Set<string>(),
      }

      series.set(id, (series.get(id) ?? 0) + row.requests)
      feature.requests += row.requests
      feature.thisHour += now
      features.set(row.feature, feature)

      if (row.login === '') continue

      feature.who.add(row.login)

      const person = people.get(row.login) ?? {
        requests: 0,
        thisHour: 0,
        top: new Map<string, number>(),
      }

      person.requests += row.requests
      person.thisHour += now
      person.top.set(row.feature, (person.top.get(row.feature) ?? 0) + row.requests)
      people.set(row.login, person)
    }

    return {
      hours: query.hours,
      hour: {
        start: new Date(start).toISOString(),
        spent: rows
          .filter((row) => row.hour === current)
          .reduce((sum, row) => sum + row.requests, 0),
        resetsAt: new Date(start + HOUR).toISOString(),
      },
      series: [...series].map(([id, requests]) => {
        const [hour = '', key = ''] = id.split('\t')

        return { hour, key, requests }
      }),
      features: [...features.values()]
        .map(({ who, ...feature }) => ({ ...feature, people: who.size }))
        .sort((a, b) => b.requests - a.requests),
      people: [...people]
        .map(([login, person]) => ({
          login,
          requests: person.requests,
          thisHour: person.thisHour,
          top: [...person.top].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other',
          cap: limits.people[login] ?? limits.perPerson,
        }))
        .sort((a, b) => b.requests - a.requests),
      background: rows
        .filter((row) => row.login === '')
        .reduce((sum, row) => sum + row.requests, 0),
      limits: { ...limits, people: { ...limits.people }, features: { ...limits.features } },
    }
  },

  async setAdminApiLimits(change) {
    await delay(150)

    if (change.perPerson !== undefined) limits.perPerson = change.perPerson
    if (change.person !== undefined) {
      limits.people = withCap(limits.people, change.person.login, change.person.cap)
    }
    if (change.feature !== undefined) {
      limits.features = withCap(limits.features, change.feature.key, change.feature.cap)
    }

    return { ...limits }
  },
}
