import type { KeyboardEvent, ReactNode } from 'react'

type Option = string | number

type PillGroupProps<T extends Option> = {
  options: readonly T[]
  /** La opción elegida, o `null` si ninguna. */
  value: T | null
  onChange: (next: T) => void
  /**
   * Nombre del grupo para quien no lo ve. Puede faltar si el grupo ya va dentro
   * de un `<fieldset>` con su `<legend>`.
   */
  label?: string
  /** Texto de cada opción (normalmente `t(\`…${option}\`)`). */
  text: (option: T) => ReactNode
  /**
   * `group` (un filtro: botones con `aria-pressed`) o `tabs` (pestañas que
   * cambian lo que hay debajo: `tablist` con `aria-selected` y foco rotatorio).
   */
  kind?: 'group' | 'tabs'
  className?: string
  /** Si una opción está encendida, cuando no es «la elegida» (varias a la vez). */
  pressed?: (option: T) => boolean
  /** Clase extra de una pastilla (una muestra de color, un punto). */
  pillClass?: (option: T) => string
  title?: (option: T) => string | undefined
  disabled?: (option: T) => boolean
  /** Lo que va delante de las pastillas (un rótulo). */
  before?: ReactNode
  /** Botones extra al final de la misma fila. */
  children?: ReactNode
  /**
   * Con `kind="tabs"`, prefijo de los `id`: cada pestaña es `{id}-tab-{opción}`
   * y apunta con `aria-controls` al panel `{id}-panel-{opción}`.
   */
  id?: string
}

/**
 * El grupo de pastillas de toda la web: el filtro de periodo, las pestañas de
 * una tarjeta, el selector de vista. Antes cada pantalla lo escribía a mano
 * (37 copias), con el teclado y los `aria-*` a medias; aquí van una vez.
 *
 * Con el teclado: las flechas mueven el foco entre las pastillas (y en las
 * pestañas también eligen, como manda WAI-ARIA), `Home` y `End` van a los
 * extremos. El aspecto lo pone `.pill` / `.pill.active`.
 */
export function PillGroup<T extends Option>({
  options,
  value,
  onChange,
  label,
  text,
  kind = 'group',
  className = '',
  pressed,
  pillClass,
  title,
  disabled,
  before,
  children,
  id,
}: PillGroupProps<T>) {
  const tabs = kind === 'tabs'
  const isOn = pressed ?? ((option: T): boolean => option === value)
  const enabled = options.filter((option) => !(disabled?.(option) ?? false))
  // La pestaña que recibe el foco con Tab: la elegida o, si no hay, la primera.
  const focusable = enabled.find(isOn) ?? enabled[0]

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const target = event.target as HTMLElement
    const current = target.dataset.pill

    if (current === undefined || enabled.length === 0) return

    const index = enabled.findIndex((option) => String(option) === current)
    const last = enabled.length - 1
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? (index + 1) % enabled.length
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? (index - 1 + enabled.length) % enabled.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null

    if (next === null) return

    event.preventDefault()

    const option = enabled[next]

    if (option === undefined) return

    event.currentTarget.querySelector<HTMLButtonElement>(`[data-pill="${String(option)}"]`)?.focus()
    if (tabs && !isOn(option)) onChange(option)
  }

  return (
    <div
      className={`filter-pills ${className}`.trim()}
      role={tabs ? 'tablist' : 'group'}
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {before}
      {options.map((option) => {
        const on = isOn(option)
        const name = String(option)

        return (
          <button
            key={name}
            type="button"
            role={tabs ? 'tab' : undefined}
            id={tabs && id !== undefined ? `${id}-tab-${name}` : undefined}
            aria-controls={tabs && id !== undefined ? `${id}-panel-${name}` : undefined}
            aria-selected={tabs ? on : undefined}
            aria-pressed={tabs ? undefined : on}
            tabIndex={tabs ? (option === focusable ? 0 : -1) : undefined}
            data-pill={name}
            className={`pill ${pillClass?.(option) ?? ''} ${on ? 'active' : ''}`
              .replace(/\s+/g, ' ')
              .trim()}
            title={title?.(option)}
            disabled={disabled?.(option)}
            onClick={() => {
              onChange(option)
            }}
          >
            {text(option)}
          </button>
        )
      })}
      {children}
    </div>
  )
}
