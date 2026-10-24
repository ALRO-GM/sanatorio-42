import { afterEach, describe, expect, it } from 'vitest'

import { keyOfRoute, POOL_BASE, POOL_ROUTES } from '../../src/modules/pool/pool.keys.js'
import { makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

const apps: TestApp[] = []

afterEach(async () => {
  for (const built of apps.splice(0)) await built.close()
})

describe('rutas y permisos de piscineros', () => {
  it('cada ruta es de la base, de un permiso, de admins o del staff (y no de dos sitios)', async () => {
    const built = await makeApp()

    apps.push(built)

    const loose = built.routes
      .filter((route) => route.method !== 'OPTIONS')
      .map((route) => route.url)
      .filter((url) => !url.startsWith('/admin/') && !url.startsWith('/staff/') && url !== '/*')
      .filter((url) => keyOfRoute(url) === null)

    expect([...new Set(loose)]).toEqual([])

    const listed = [...POOL_BASE, ...Object.values(POOL_ROUTES).flat()]

    expect(listed.length).toBe(new Set(listed).size)

    // Y nada apuntado que no exista: una ruta borrada se borra también de aquí.
    const real = new Set(built.routes.map((route) => route.url))

    expect(listed.filter((url) => !real.has(url))).toEqual([])
  })
})
