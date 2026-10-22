import type { ReactNode } from 'react'

import { shows, useDetail } from '../detail'
import { useI18n } from '../i18n'
import { openCustomize } from './customize'
import { PAGES } from './registry'
import type { PageId } from './registry'
import { toggleFold, track, usePageLayout } from './store'

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
  const byId = new Map(blocks.map((block) => [block.id, block]))
  // Lo que no toca en este modo de la interfaz no se pinta.
  const hidden = new Set<string>(
    PAGES[page].filter((block) => !shows(detail, block.from)).map((block) => block.id),
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
      <button type="button" className="link blocks-customize" onClick={openCustomize}>
        {t('layout.customizeHere')}
      </button>
    </>
  )
}
