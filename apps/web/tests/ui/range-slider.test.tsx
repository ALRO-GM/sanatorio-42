/**
 * El deslizador de toda la web (`shared/ui/RangeSlider`): arrastrar (con el
 * ajuste fino al alejarse de la barra y el imán de los valores redondos), el
 * teclado, el valor escrito a mano, que los tiradores no se crucen y que se
 * pueda elegir cualquier valor, no solo los que hay en los datos.
 */
import { act, cleanup, fireEvent, render as paint, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import es from 'virtual:textos/es'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../src/shared/i18n'
import { RangeSlider, Slider } from '../../src/shared/ui/RangeSlider'
import type { Curve } from '../../src/shared/ui/range'
import { must } from './must'

/** Pinta con los textos en español, como la web. */
const render = (ui: ReactElement) =>
  paint(ui, {
    wrapper: ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>,
  })
const text = (key: string): string => must(es[key], `el texto ${key}`)
const editName = (what: string): string => text('range.edit').replace('{what}', what)

/** La barra mide 200 px y está arriba a la izquierda: dos píxeles por punto de 0 a 100. */
const WIDTH = 200
const MIDDLE = 10

beforeAll(() => {
  // jsdom no trae `PointerEvent`: sin él, los eventos llegan sin botón ni coordenadas.
  if (!('PointerEvent' in window)) {
    class PointerEventLike extends MouseEvent {
      pointerId: number

      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init)
        this.pointerId = init.pointerId ?? 0
      }
    }

    vi.stubGlobal('PointerEvent', PointerEventLike)
  }
})

beforeEach(() => {
  localStorage.setItem('sanatorio_lang', 'es')
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: WIDTH,
    bottom: MIDDLE * 2,
    width: WIDTH,
    height: MIDDLE * 2,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

type Props = {
  start?: [number, number]
  max?: number
  minGap?: number
  ticks?: number[]
  commit?: 'live' | 'release'
  curve?: Curve
  onChange?: (low: number, high: number) => void
}

/** Un tramo con su estado, como en cualquier pantalla. */
function Range({ start = [20, 80], max = 100, onChange, ...rest }: Props) {
  const [[low, high], setValues] = useState(start)

  return (
    <RangeSlider
      max={max}
      low={low}
      high={high}
      lowLabel="Desde"
      highLabel="Hasta"
      format={(n) => `${n} %`}
      onChange={(nextLow, nextHigh) => {
        onChange?.(nextLow, nextHigh)
        setValues([nextLow, nextHigh])
      }}
      {...rest}
    />
  )
}

const thumb = (name: string): HTMLElement => screen.getByRole('slider', { name })
const now = (name: string): number => Number(thumb(name).getAttribute('aria-valuenow'))
const track = (): HTMLElement =>
  must(document.querySelector<HTMLElement>('.range-track'), 'la barra')

const down = (target: HTMLElement, x: number, y = MIDDLE): void => {
  fireEvent.pointerDown(target, { clientX: x, clientY: y, pointerId: 1, button: 0 })
}
const moveTo = (x: number, y = MIDDLE): void => {
  fireEvent.pointerMove(track(), { clientX: x, clientY: y, pointerId: 1 })
}
const up = (): void => {
  fireEvent.pointerUp(track(), { pointerId: 1 })
}

describe('RangeSlider: arrastrar', () => {
  it('cerca de la barra, el tirador va donde va el puntero, de entero en entero', () => {
    render(<Range />)
    down(thumb('Desde'), 40)
    moveTo(46)
    expect(now('Desde')).toBe(23)
    moveTo(57.9)
    // 28,95: el entero más cercano, sin decimales.
    expect(now('Desde')).toBe(29)
    up()
    expect(now('Desde')).toBe(29)
  })

  it('el imán: al pasar cerca de un valor redondo se pega a él', () => {
    render(<Range />)
    down(thumb('Desde'), 40)
    // 24,6 está a menos de un paso de 25.
    moveTo(49.2)
    expect(now('Desde')).toBe(25)
    expect(thumb('Desde').getAttribute('aria-valuetext')).toBe('25 %')
  })

  it('ajuste fino: lejos de la barra, el mismo movimiento cambia menos y sigue desde donde estaba', () => {
    const { container } = render(<Range />)

    down(thumb('Desde'), 40)
    moveTo(46)
    expect(now('Desde')).toBe(23)
    expect(screen.getByText(text('range.away'))).toBeTruthy()
    // Cuatro veces la distancia en la que empieza: un cuarto de la velocidad.
    moveTo(46, MIDDLE + 128)
    expect(now('Desde')).toBe(23)
    expect(screen.getByText(text('range.fine').replace('{n}', '4'))).toBeTruthy()
    expect(container.querySelector('.range-slider.fine')).not.toBeNull()
    // 8 px a la derecha: un punto (cerca de la barra serían cuatro). No salta a
    // donde está el puntero (27), sigue el movimiento.
    moveTo(54, MIDDLE + 128)
    expect(now('Desde')).toBe(24)
    // Y hacia arriba, igual de fino que hacia abajo.
    moveTo(46, MIDDLE - 128)
    expect(now('Desde')).toBe(23)
    up()
    expect(screen.queryByText(text('range.away'))).toBeNull()
    expect(container.querySelector('.range-slider.fine')).toBeNull()
  })

  it('al pulsar en la barra salta el tirador más cercano', () => {
    render(<Range />)
    down(track(), 140)
    expect(now('Hasta')).toBe(70)
    expect(now('Desde')).toBe(20)
    up()
    down(track(), 20)
    expect(now('Desde')).toBe(10)
    up()
  })

  it('los tiradores no se cruzan, ni arrastrando ni con el teclado', async () => {
    const user = userEvent.setup()

    render(<Range minGap={1} />)
    down(thumb('Desde'), 40)
    moveTo(190)
    expect(now('Desde')).toBe(79)
    // Al volver se mueve en el acto: la posición no se quedó más allá del otro.
    moveTo(150)
    expect(now('Desde')).toBe(75)
    up()
    thumb('Hasta').focus()
    await user.keyboard('{Home}')
    expect(now('Hasta')).toBe(76)
    expect(thumb('Hasta').getAttribute('aria-valuemin')).toBe('76')
    expect(thumb('Desde').getAttribute('aria-valuemax')).toBe('75')
  })

  it('dos tiradores juntos: se mueve el que va hacia donde se arrastra', () => {
    render(<Range start={[50, 50]} />)
    down(must(screen.getAllByRole('slider')[1], 'el de arriba'), 100)
    moveTo(80)
    expect(now('Desde')).toBe(40)
    expect(now('Hasta')).toBe(50)
    up()
  })

  it('si los datos cambian mientras se arrastra, la barra no cambia bajo el puntero', () => {
    const { rerender } = render(<Range />)

    down(thumb('Hasta'), 160)
    // Llegan datos con otro máximo mientras se arrastra.
    rerender(<Range max={200} />)
    moveTo(120)
    expect(now('Hasta')).toBe(60)
    expect(thumb('Hasta').getAttribute('aria-valuemax')).toBe('100')
    up()
    expect(thumb('Hasta').getAttribute('aria-valuemax')).toBe('200')
  })

  it('con `commit="release"` solo avisa al soltar', () => {
    const onChange = vi.fn()

    render(<Range commit="release" onChange={onChange} />)
    down(thumb('Desde'), 40)
    moveTo(60)
    moveTo(66)
    expect(onChange).not.toHaveBeenCalled()
    // El tirador sí se ve donde va.
    expect(now('Desde')).toBe(33)
    up()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(33, 80)
  })

  it('un puntero que no es el que arrastra, o un botón que no es el principal, no hace nada', () => {
    const onChange = vi.fn()

    render(<Range onChange={onChange} />)
    fireEvent.pointerDown(thumb('Desde'), { clientX: 40, clientY: MIDDLE, button: 2 })
    fireEvent.pointerMove(track(), { clientX: 90, clientY: MIDDLE, pointerId: 7 })
    expect(onChange).not.toHaveBeenCalled()
    down(thumb('Desde'), 40)
    fireEvent.pointerMove(track(), { clientX: 90, clientY: MIDDLE, pointerId: 7 })
    fireEvent.pointerCancel(track(), { pointerId: 1 })
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('RangeSlider: teclado y valor escrito', () => {
  it('flechas de uno en uno, Mayúsculas y Re Pág de diez en diez, Inicio y Fin a los extremos', async () => {
    const user = userEvent.setup()

    render(<Range />)
    thumb('Desde').focus()
    await user.keyboard('{ArrowRight}')
    expect(now('Desde')).toBe(21)
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(now('Desde')).toBe(19)
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}')
    expect(now('Desde')).toBe(29)
    await user.keyboard('{PageUp}')
    expect(now('Desde')).toBe(39)
    await user.keyboard('{PageDown}{PageDown}')
    expect(now('Desde')).toBe(19)
    await user.keyboard('{Home}')
    expect(now('Desde')).toBe(0)
    thumb('Hasta').focus()
    await user.keyboard('{End}')
    expect(now('Hasta')).toBe(100)
    await user.keyboard('{ArrowLeft}{ArrowUp}')
    expect(now('Hasta')).toBe(100)
  })

  it('se pulsa el número y se escribe el valor exacto; Escape no cambia nada', async () => {
    const user = userEvent.setup()

    render(<Range />)
    await user.click(screen.getByRole('button', { name: editName('Desde') }))
    const field = screen.getByRole('textbox', { name: 'Desde' })

    expect(document.activeElement).toBe(field)
    await user.keyboard('{Control>}a{/Control}14{Enter}')
    expect(now('Desde')).toBe(14)
    expect(document.activeElement).toBe(thumb('Desde'))
    expect(screen.getByRole('button', { name: editName('Desde') }).textContent).toBe('14 %')

    // Desde el tirador, con Intro.
    await user.keyboard('{Enter}')
    await user.keyboard('{Control>}a{/Control}33{Escape}')
    expect(now('Desde')).toBe(14)
    // Lo que no es un número tampoco.
    await user.keyboard('{Enter}')
    await user.keyboard('{Control>}a{/Control}mucho{Enter}')
    expect(now('Desde')).toBe(14)
    // Ni se pasa del otro tirador ni del máximo.
    await user.click(screen.getByRole('button', { name: editName('Desde') }))
    await user.keyboard('{Control>}a{/Control}95{Enter}')
    expect(now('Desde')).toBe(80)
    // Al salir del campo también se guarda.
    await user.click(screen.getByRole('button', { name: editName('Hasta') }))
    await user.keyboard('{Control>}a{/Control}90,4')
    act(() => {
      screen.getByRole('textbox', { name: 'Hasta' }).blur()
    })
    expect(now('Hasta')).toBe(90)
  })

  it('cualquier valor, no solo los de los datos: estos salen como marcas', async () => {
    const user = userEvent.setup()
    const { container } = render(<Range ticks={[3, 50, 50, 97, 400]} />)

    // Las marcas, sin repetir y solo las que caben.
    expect(container.querySelectorAll('.range-tick')).toHaveLength(3)
    thumb('Desde').focus()
    await user.keyboard('{ArrowRight}')
    expect(now('Desde')).toBe(21)
    await user.click(screen.getByRole('button', { name: editName('Hasta') }))
    await user.keyboard('{Control>}a{/Control}61{Enter}')
    expect(now('Hasta')).toBe(61)
  })

  it('en curva logarítmica también se elige cualquier cantidad', async () => {
    const user = userEvent.setup()

    render(<Range start={[1, 1000]} max={1000} curve="log" />)
    // Lo pequeño ocupa más barra: a un cuarto de la barra ya no es 250.
    down(track(), 50)
    expect(now('Desde')).toBeLessThan(10)
    up()
    await user.click(screen.getByRole('button', { name: editName('Hasta') }))
    await user.keyboard('{Control>}a{/Control}37{Enter}')
    expect(now('Hasta')).toBe(37)
  })
})

describe('Slider: un tirador', () => {
  it('se arrastra, se escribe y, desactivado, no se mueve', async () => {
    const user = userEvent.setup()

    function One({ disabled = false }: { disabled?: boolean }) {
      const [value, setValue] = useState(30)

      return (
        <Slider max={100} value={value} label="Progreso" onChange={setValue} disabled={disabled} />
      )
    }
    const { rerender } = render(<One />)

    expect(thumb('Progreso').getAttribute('aria-valuemin')).toBe('0')
    expect(thumb('Progreso').getAttribute('aria-valuemax')).toBe('100')
    down(thumb('Progreso'), 60)
    moveTo(84)
    expect(now('Progreso')).toBe(42)
    up()
    rerender(<One disabled />)
    thumb('Progreso').focus()
    await user.keyboard('{ArrowRight}')
    down(thumb('Progreso'), 84)
    moveTo(150)
    expect(now('Progreso')).toBe(42)
    expect(thumb('Progreso').getAttribute('aria-disabled')).toBe('true')
  })
})
