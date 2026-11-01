import type { ReactNode } from 'react'

import { InfoTip } from './InfoTip'

type SectionTitleProps = {
  /** El título, ya traducido. */
  title: string
  /** La explicación del `InfoTip` (casi siempre, la demostración de la sección). */
  children: ReactNode
  /**
   * Nombre de la explicación, si no es el título: Peer to peer se titula
   * «Tus proyectos», pero su demostración es la de la sección entera.
   */
  tipTitle?: string
}

/**
 * El título de una sección con su `InfoTip` al lado, como manda la regla de las
 * explicaciones (`AGENTS.md`): nada de párrafos fijos de ayuda, un icono junto al
 * título que abre la demostración. Antes cada pantalla escribía
 * `<h2>{t(k)}<InfoTip title={t(k)}>…</InfoTip></h2>` a mano.
 */
export function SectionTitle({ title, children, tipTitle }: SectionTitleProps) {
  return (
    <h2>
      {title}
      <InfoTip title={tipTitle ?? title}>{children}</InfoTip>
    </h2>
  )
}
