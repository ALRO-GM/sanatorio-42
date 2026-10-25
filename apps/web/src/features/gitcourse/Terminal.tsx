import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { LIMITS } from '@sanatorio/gitsim'

import { useI18n } from '../../shared/i18n'

/** Una línea escrita y lo que contestó. `counted`: su número si cuenta para las estrellas. */
export type TerminalEntry = { line: string; output: string[]; ok: boolean; counted?: number | null }

type TerminalProps = {
  entries: TerminalEntry[]
  /** Lo que va antes del cursor: `c1r4s2:~/repo (main)$`. */
  prompt: string
  disabled?: boolean
  onRun: (line: string) => void
  onClear: () => void
}

/**
 * Una terminal sencilla: escribes, Intro ejecuta, flechas arriba y abajo para
 * los comandos de antes, y `clear` limpia la pantalla (no el repositorio).
 */
export function Terminal({ entries, prompt, disabled = false, onRun, onClear }: TerminalProps) {
  const { t, tn } = useI18n()
  const [draft, setDraft] = useState('')
  const [back, setBack] = useState(0)
  const screen = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const typed = entries.map((entry) => entry.line)

  useEffect(() => {
    const box = screen.current

    if (box !== null) box.scrollTop = box.scrollHeight
  }, [entries.length])

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      const line = draft.trim()

      setDraft('')
      setBack(0)
      if (line === 'clear') onClear()
      else if (line !== '') onRun(line)
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()

      const next = Math.min(typed.length, Math.max(0, back + (event.key === 'ArrowUp' ? 1 : -1)))

      setBack(next)
      setDraft(next === 0 ? '' : (typed[typed.length - next] ?? ''))
    }
  }

  return (
    // Un clic en cualquier sitio de la terminal pone el cursor en la línea.
    <div className="git-terminal" ref={screen} onClick={() => input.current?.focus()}>
      <p className="git-term-hint">{t('git.term.hint')}</p>
      {entries.map((entry, index) => (
        <div key={index} className="git-term-entry">
          <div className="git-term-line">
            <span className="git-prompt">$</span> {entry.line}
            {typeof entry.counted === 'number' && (
              <span className="git-term-count" title={tn('git.term.counted', entry.counted)}>
                <span aria-hidden="true">{entry.counted}</span>
                <span className="sr-only">{tn('git.term.counted', entry.counted)}</span>
              </span>
            )}
          </div>
          {entry.output.map((text, row) => (
            <div key={row} className={`git-term-out ${entry.ok ? '' : 'error'}`}>
              {text}
            </div>
          ))}
        </div>
      ))}
      <label className="git-term-input">
        <span className="git-prompt">{prompt}</span>
        <input
          ref={input}
          value={draft}
          disabled={disabled}
          maxLength={LIMITS.line}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label={t('git.term.input')}
          onChange={(event) => {
            setDraft(event.target.value)
          }}
          onKeyDown={onKeyDown}
        />
      </label>
    </div>
  )
}
