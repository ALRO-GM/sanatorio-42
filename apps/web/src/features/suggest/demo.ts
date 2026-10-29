/**
 * La demostración de un sitio de la web, para el interrogante de la cabecera.
 *
 * Cada panel lleva su demostración animada en el icono de información
 * (`InfoTip`) de su título. Se busca el más cercano al sitio, de dentro hacia
 * fuera: el del bloque, si tiene; si no, el de la tarjeta o la sección que lo
 * contiene. No depende de dónde esté el panel ni de cómo estén ordenadas las
 * pestañas: va con el panel.
 */

/** Los iconos de información, también los escondidos desde Personalizar. */
const TIP = '.info-tip'

/** El icono de información más cercano a `from`, o `null` si no hay ninguno alrededor. */
export function tipNear(from: Element | null): HTMLElement | null {
  for (let node = from; node !== null && node !== document.body; node = node.parentElement) {
    const tip = node.matches(TIP) ? node : node.querySelector(TIP)

    if (tip instanceof HTMLElement) return tip
  }

  return null
}

/** El de la página abierta: el primero del contenido. */
export function pageTip(): HTMLElement | null {
  const tip = document.querySelector(`main ${TIP}`)

  return tip instanceof HTMLElement ? tip : null
}
