import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import type { Lang } from '@sanatorio/contracts'
import { Icon } from '../../shared/ui/Icon'
import { bustText, fill, short, textsOf } from './texts'

/** Una trampa pillada: la que hace `n`, y lo cobrado si se ha vendido todo. */
export type Busted = { n: number; sold: number | null }

/**
 * La ventana que sale cuando la API pilla una trampa: qué ha pasado con el
 * título del banner y, a partir de la tercera, por cuánto se ha vendido todo.
 */
export function Bust({ bust, lang, onClose }: { bust: Busted; lang: Lang; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const ui = textsOf(lang).ui
  const [title, text] = bustText(bust.n, lang)

  useEffect(() => {
    if (dialog.current?.open === false) dialog.current.showModal()
  }, [])

  return createPortal(
    <dialog ref={dialog} className="layout-dialog cc-bust" aria-label={title} onClose={onClose}>
      <span className="cc-bust-icon" aria-hidden="true">
        <Icon name="escudo" size={28} />
      </span>
      <span className="eyebrow">{ui.bustEyebrow}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {bust.sold !== null && (
        <p className="cc-bust-sold">{fill(ui.bustSold ?? '', { n: short(bust.sold, lang) })}</p>
      )}
      <button
        type="button"
        className="pill active"
        onClick={() => {
          dialog.current?.close()
        }}
      >
        {ui.bustOk}
      </button>
    </dialog>,
    document.body,
  )
}
