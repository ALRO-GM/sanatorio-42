import type { ReactNode } from 'react'

import type { PoolKey } from '@sanatorio/contracts'

import { shows, useDetail } from '../detail'
import { poolAllows, usePoolAccess } from '../pool'
import { useI18n } from '../i18n'
import { openCustomize } from './customize'
import { PAGES } from './registry'
import type { PageId } from './registry'
import { toggleFold, track, usePageLayout } from './store'

/** El permiso de piscinero de los bloques que lo tienen (`docs/piscineros.md`). */
const POOL_BLOCKS: Partial<Record<string, PoolKey>> = {
  'expediente.health': 'expediente.health',
  'expediente.network': 'expediente.network',
  'expediente.achievements': 'expediente.achievements',
  'expediente.ranking': 'expediente.ranking',
  'red.endogamy': 'red.rankings',
  'red.pairs': 'red.rankings',
  'red.strictest': 'red.rankings',
  'red.projects': 'red.rankings',
}

type Block = {
  id: string
  content: ReactNode
  /**
   * `false` si el bloque ya trae su propio título y su forma de plegarse: aquí
   * solo se le pone en su sitio y se cuenta su uso.
   */
  chrome?: boolean
}

type BlocksProps = {
  page: PageId
  /** Los bloques que hay ahora mismo. Uno que no venga (sin datos) no se pinta. */
  blocks: readonly Block[]
}

/**
 * Los bloques de una página, en el orden que la persona ha elegido (o en el
 * automático), cada uno con su cabecera para plegarlo. Solo los que tocan en
 * el modo de la interfaz.
 *
 * Cada clic dentro de un bloque cuenta como un uso suyo: de ahí sale la
 * ordenación automática.
 */
export function Blocks({ page, blocks }: BlocksProps) {
  const { t } = useI18n()
  const { order, folded } = usePageLayout(page)
  const detail = useDetail()
  const pool = usePoolAccess()
  const byId = new Map(blocks.map((block) => [block.id, block]))
  // Lo que no toca en este modo de la interfaz no se pinta.
  const hidden = new Set<string>(
    PAGES[page]
      .filter((block) => {
        const key = POOL_BLOCKS[`${page}.${block.id}`]

        return !shows(detail, block.from) || (key !== undefined && !poolAllows(key, pool))
      })
      .map((block) => block.id),
  )

  return (
    <>
      {order.map((id) => {
        const block = byId.get(id)

        if (block === undefined || hidden.has(id)) return null

        const isFolded = folded.includes(id)

        return (
          <div
            key={id}
            className={`block ${block.chrome === false ? 'bare' : ''} ${isFolded ? 'folded' : ''}`}
            // Para la burbuja de sugerencias: el bloque se reconoce por su id.
            data-feedback={`${page}.${id}`}
            onClickCapture={() => {
              track(`${page}.${id}`)
            }}
          >
            {block.chrome !== false && (
              <button
                type="button"
                className="block-head"
                aria-expanded={!isFolded}
                onClick={() => {
                  toggleFold(page, id)
                }}
              >
                <span className="block-arrow" aria-hidden="true">
                  ▾
                </span>
                {t(`layout.${page}.${id}`)}
              </button>
            )}
            {(block.chrome === false || !isFolded) && block.content}
          </div>
        )
      })}
      <button
        type="button"
        className="link blocks-customize"
        onClick={() => {
          openCustomize('order')
        }}
      >
        {t('layout.customizeHere')}
      </button>
    </>
  )
}
