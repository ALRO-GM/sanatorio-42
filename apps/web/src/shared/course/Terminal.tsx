import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { useI18n } from '../i18n'

/**
 * Una línea escrita y lo que contestó. `counted`: su número si cuenta para las
 * estrellas. Una orden puede tener varias líneas (un heredoc, un bucle).
 */
export type TerminalEntry = { line: string; output: string[]; ok: boolean; counted?: number | null }

type TerminalProps = {
  entries: TerminalEntry[]
  /** Lo que va antes del cursor: `c1r4s2:~/repo (main)$`. */
  prompt: string
  /** La ayuda de arriba (qué se puede escribir). */
  hint: string
  /** Caracteres que caben en una línea (el tope del motor). */
  maxLength: number
  /** Líneas de una orden a medias (la shell espera el resto con `>`). */
  pending?: string[]
  disabled?: boolean
  onRun: (line: string) => void
  onClear: () => void
}

/**
 * La terminal de los cursos (git y shell): escribes, Intro ejecuta, flechas
 * arriba y abajo para lo de antes y `clear` limpia la pantalla (no el mundo).
 * Lo que se ejecuta lo decide quien la usa: aquí solo se escribe y se ve.
 */
export function Terminal({
  entries,
  prompt,
  hint,
  maxLength,
  pending = [],
  disabled = false,
  onRun,
  onClear,
}: TerminalProps) {
  const { t, tn } = useI18n()
  const [draft, setDraft] = useState('')
  const [back, setBack] = useState(0)
  const screen = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const typed = entries.map((entry) => entry.line)

  useEffect(() => {
    const box = screen.current

    if (box !== null) box.scrollTop = box.scrollHeight
  }, [entries.length, pending.length])

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      const line = pending.length > 0 ? draft : draft.trim()

      setDraft('')
      setBack(0)
      if (line === 'clear' && pending.length === 0) onClear()
      else if (line !== '' || pending.length > 0) onRun(line)
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()

      const next = Math.min(typed.length, Math.max(0, back + (event.key === 'ArrowUp' ? 1 : -1)))

      setBack(next)
      setDraft(next === 0 ? '' : (typed[typed.length - next] ?? ''))
    }
  }

  return (
    // Un clic en cualquier sitio de la terminal pone el cursor en la línea.
    <div className="course-terminal" ref={screen} onClick={() => input.current?.focus()}>
      <p className="course-term-hint">{hint}</p>
      {entries.map((entry, index) => (
        <div key={index} className="course-term-entry">
          {entry.line.split('\n').map((part, row) => (
            <div key={row} className="course-term-line">
              <span className="course-prompt">{row === 0 ? '$' : '>'}</span> {part}
              {row === 0 && typeof entry.counted === 'number' && (
                <span
                  className="course-term-count"
                  title={tn('course.term.counted', entry.counted)}
                >
                  <span aria-hidden="true">{entry.counted}</span>
                  <span className="sr-only">{tn('course.term.counted', entry.counted)}</span>
                </span>
              )}
            </div>
          ))}
          {entry.output.map((text, row) => (
            <div key={row} className={`course-term-out ${entry.ok ? '' : 'error'}`}>
              {text}
            </div>
          ))}
        </div>
      ))}
      {pending.map((part, row) => (
        <div key={`p${row}`} className="course-term-line">
          <span className="course-prompt">{row === 0 ? '$' : '>'}</span> {part}
        </div>
      ))}
      <label className="course-term-input">
        <span className="course-prompt">{pending.length > 0 ? '>' : prompt}</span>
        <input
          ref={input}
          value={draft}
          disabled={disabled}
          maxLength={maxLength}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label={t('course.term.input')}
          onChange={(event) => {
            setDraft(event.target.value)
          }}
          onKeyDown={onKeyDown}
        />
      </label>
    </div>
  )
}
