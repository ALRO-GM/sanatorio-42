/**
 * Los fallos del navegador al servidor (`shared/errors.ts`): como mucho cinco
 * por carga, recortados, con una sección válida o `page`, y sin insistir si el
 * envío falla.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const reportClientError = vi.fn<(body: unknown) => Promise<void>>()

vi.mock('../src/shared/api', () => ({ api: { reportClientError } }))

beforeEach(() => {
  vi.resetModules()
  reportClientError.mockReset()
  reportClientError.mockResolvedValue(undefined)
})

const load = async () => (await import('../src/shared/errors')).reportError

describe('reportError', () => {
  it('manda el nombre, el mensaje y la pila de un Error', async () => {
    const reportError = await load()
    const error = new TypeError('se rompió')

    reportError('peers', error, 'en la lista')
    expect(reportClientError).toHaveBeenCalledWith({
      message: 'TypeError: se rompió',
      where: 'peers',
      stack: `${error.stack}\nen la lista`,
    })
  })

  it('lo que no es un Error va como texto y sin pila', async () => {
    const reportError = await load()

    reportError('page', 42)
    reportError('page', null)
    expect(reportClientError.mock.calls).toEqual([
      [{ message: '42', where: 'page' }],
      [{ message: 'null', where: 'page' }],
    ])
  })

  it('una sección rara se apunta como `page`', async () => {
    const reportError = await load()

    for (const where of ['', 'Peers', '../admin', 'a'.repeat(41), 'sección']) {
      reportError(where, 'x')
    }
    expect(reportClientError.mock.calls.map(([body]) => (body as { where: string }).where)).toEqual(
      ['page', 'page', 'page', 'page', 'page'],
    )
  })

  it('recorta el mensaje a 300 y la pila a 2000', async () => {
    const reportError = await load()

    reportError('page', 'm'.repeat(5000), 's'.repeat(5000))
    const body = reportClientError.mock.calls[0]?.[0] as { message: string; stack: string }

    expect(body.message).toHaveLength(300)
    expect(body.stack).toHaveLength(2000)
  })

  it('como mucho cinco por carga de página', async () => {
    const reportError = await load()

    for (let i = 0; i < 12; i += 1) reportError('page', `fallo ${i}`)
    expect(reportClientError).toHaveBeenCalledTimes(5)
  })

  it('si el envío falla, no lanza ni insiste', async () => {
    const reportError = await load()

    reportClientError.mockRejectedValue(new Error('sin red'))
    expect(() => {
      reportError('page', 'x')
    }).not.toThrow()
    await Promise.resolve()
    expect(reportClientError).toHaveBeenCalledTimes(1)
  })
})
