import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import type { ClickerSeizure, Lang } from '@sanatorio/contracts'
import { Icon } from '../../shared/ui/Icon'
import { Tile } from './art'
import { bustText, fill, policeText, short, textsOf } from './texts'

/**
 * Una trampa pillada: la que hace `n`, lo cobrado si se ha vendido todo y, si
 * la policía del código ha requisado los edificios, qué y por qué.
 */
export type Busted = { n: number; sold: number | null; seizure: ClickerSeizure | null }

/**
 * La ventana que sale cuando la API pilla una trampa: qué ha pasado con el
 * título del banner y, a partir de la tercera, por cuánto se ha vendido todo.
 */
export function Bust({ bust, lang, onClose }: { bust: Busted; lang: Lang; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const ui = textsOf(lang).ui
  const [bustTitle, bustBody] = bustText(bust.n, lang)
  const { seizure } = bust
  // Un aviso guardado antes de que llevara la cuenta usa la de la ventana.
  const [policeTitle, policeBody] = policeText(seizure?.n ?? bust.n, lang)
  // Una sanción a mano trae su propio mensaje.
  const note = seizure?.by === 'admin' ? (seizure.note ?? '') : null
  const title = seizure === null ? bustTitle : note !== null ? (ui.policeNote ?? '') : policeTitle
  const evidence = seizure?.evidence ?? null
  // Lo que no cuadró, con las cifras (no cómo se ha visto).
  const text =
    seizure === null
      ? bustBody
      : (note ??
        (seizure.by === 'auto' || evidence === null
          ? policeBody
          : `${policeBody} ${ui.policeReview ?? ''} ${fill(ui.policeJump ?? '', {
              from: short(evidence.from, lang),
              to: short(evidence.to, lang),
              seconds: evidence.seconds,
              rate: short(evidence.perSecond, lang),
            })}${evidence.golden ? '' : `, ${ui.policeNoGolden ?? ''}`}.`))

  useEffect(() => {
    if (dialog.current?.open === false) dialog.current.showModal()
  }, [])

  return createPortal(
    <dialog ref={dialog} className="layout-dialog cc-bust" aria-label={title} onClose={onClose}>
      <span className="cc-bust-icon" aria-hidden="true">
        {seizure === null ? <Icon name="escudo" size={28} /> : <Tile icon="loot" size={40} />}
      </span>
      <span className="eyebrow">{seizure === null ? ui.bustEyebrow : ui.policeEyebrow}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {seizure !== null && note === null && (
        <p className="cc-bust-sold">
          {fill(ui.policeMoney ?? '', {
            // Lo cobrado de verdad al vender, si se acaba de vender; si no, la cuenta de la API.
            n: short(bust.sold ?? seizure.amount, lang),
            people: seizure.shared,
          })}
        </p>
      )}
      {seizure === null && bust.sold !== null && (
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
