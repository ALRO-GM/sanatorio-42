import { useEffect, useRef, useState } from 'react'

/**
 * La cola de una ventana obligatoria (comunicados, peticiones de ayuda,
 * revisiones de Code Clicker): el pulso dice cuántas cosas hay pendientes, la
 * lista se pide solo cuando hay alguna y la ventana se abre sola mientras
 * quede algo.
 *
 * @param pending Cuántas cosas pendientes dice el pulso.
 * @param load Pide la lista. Se llama al cambiar `pending`, no al cambiar ella.
 */
export function useGateQueue<T>(pending: number, load: () => Promise<T[]>) {
  const [queue, setQueue] = useState<T[]>([])
  const dialog = useRef<HTMLDialogElement>(null)
  const loader = useRef(load)
  /** Las que quedan, a mano para `onClose` (que no se rehace). */
  const left = useRef(0)
  const current = queue[0]

  loader.current = load
  left.current = queue.length

  useEffect(() => {
    if (pending === 0) return

    let alive = true

    loader.current().then(
      (list) => {
        if (alive) setQueue(list)
      },
      () => undefined,
    )

    return () => {
      alive = false
    }
  }, [pending])

  useEffect(() => {
    if (current !== undefined && dialog.current?.open === false) dialog.current.showModal()
  }, [current])

  return { queue, setQueue, current, dialog, left }
}
