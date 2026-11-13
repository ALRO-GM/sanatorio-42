/**
 * Lo que comparten las unidades al escribirse: la forma corta de una unidad y
 * de un jefe, y las tres redes de ejemplo que se repiten a lo largo del curso
 * (la misma red conocida, cada vez con un fallo distinto: así lo nuevo es el
 * fallo y no el dibujo).
 */

import type { Goal, Network } from '../model.js'
import { host, internet, net, router } from './build.js'
import type { Example, Test, Tier, Unit, UnitText } from './types.js'

/** Una unidad: teoría, ejemplo y prueba. */
export const unitIn =
  (tier: Tier) =>
  (id: string, block: number, es: UnitText, en: UnitText, example: Example, test: Test): Unit => ({
    id,
    block,
    tier,
    kind: 'unit',
    es,
    en,
    example,
    test,
  })

/** Un jefe contrarreloj (o, con `final`, el jefe final del nivel). */
export const bossIn =
  (tier: Tier) =>
  (
    id: string,
    block: number,
    limit: number,
    es: UnitText,
    en: UnitText,
    test: Test,
    kind: 'boss' | 'final' = 'boss',
  ): Unit => ({ id, block, tier, kind, es, en, test, limit })

/** Los objetivos, en corto: `reach('ana>db', 'leo>db')`. */
export const reach = (...pairs: string[]): Goal[] =>
  pairs.map((pair) => {
    const at = pair.indexOf('>')

    return { from: pair.slice(0, at), to: pair.slice(at + 1) }
  })

/** Dos redes y un router en medio: `ana — r1 — db`. */
export const twoLans = (): Network =>
  net(
    [
      host('ana', 0, 0, '10.0.1.10/24', '10.0.1.1'),
      router('r1', 1, 0, { a: '10.0.1.1/24', b: '10.0.2.1/24' }),
      host('db', 2, 0, '10.0.2.10/24', '10.0.2.1'),
    ],
    ['ana-r1.a', 'r1.b-db'],
  )

/** Dos routers en fila, cada uno con su red: `ana — r1 — r2 — db`. */
export const chain = (): Network =>
  net(
    [
      host('ana', 0, 0, '10.0.1.10/24', '10.0.1.1'),
      router('r1', 1, 0, { lan: '10.0.1.1/24', enl: '10.0.0.1/30' }, [['10.0.2.0/24', '10.0.0.2']]),
      router('r2', 2, 0, { enl: '10.0.0.2/30', lan: '10.0.2.1/24' }, [['10.0.1.0/24', '10.0.0.1']]),
      host('db', 3, 0, '10.0.2.10/24', '10.0.2.1'),
    ],
    ['ana-r1.lan', 'r1.enl-r2.enl', 'r2.lan-db'],
  )

/** Una red pública que sale a internet: `web — r1 — internet`. */
export const exit = (): Network =>
  net(
    [
      host('web', 0, 0, '163.5.20.9/24', '163.5.20.1'),
      router('r1', 1, 0, { lan: '163.5.20.1/24', wan: '80.10.0.2/30' }, [['default', '80.10.0.1']]),
      internet('internet', 2, 0, { dns: '8.8.8.8/32', wan: '80.10.0.1/30' }, [
        ['163.5.20.0/24', '80.10.0.2'],
      ]),
    ],
    ['web-r1.lan', 'r1.wan-internet.wan'],
  )
