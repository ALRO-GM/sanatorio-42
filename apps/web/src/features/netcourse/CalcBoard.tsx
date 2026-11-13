import { LIMITS, parseIp, parseMask } from '@sanatorio/netsim'
import type { Evaluation, Field, Question, Values } from '@sanatorio/netsim'

import { useI18n } from '../../shared/i18n'
import { AddressBits, MaskBits } from './Bits'

/** Solo se pregunta por la máscara: la ayuda es la de las máscaras, no la de la dirección. */
const aboutMask = (question: Question): boolean =>
  'need' in question || question.ask.every((ask) => ask === 'prefix' || ask === 'decimal')

/**
 * La prueba de cuentas: cada pregunta con su dirección y su máscara, los 32
 * bits para tocar y un campo por cada cosa que se pide. Tras comprobar, cada
 * campo dice si coincide con lo que calcula el motor.
 */
export function CalcBoard({
  questions,
  fields,
  values,
  onChange,
  disabled,
  checked,
}: {
  questions: readonly Question[]
  fields: readonly Field[]
  values: Values
  onChange: (id: string, value: string) => void
  disabled: boolean
  /** La última comprobación: qué campos no coinciden. */
  checked: Evaluation | null
}) {
  const { t } = useI18n()

  return (
    <ol className="net-calc">
      {questions.map((question, index) => {
        const given = 'need' in question ? null : question
        const title =
          given === null
            ? t('net.calc.need', { n: 'need' in question ? question.need : 0 })
            : `${given.ip} ${given.mask}`

        return (
          <li key={index} className="net-calc-question">
            <h4 className="net-calc-given">{title}</h4>
            {given === null || aboutMask(question) ? (
              <MaskBits start={given === null ? 24 : (parseMask(given.mask) ?? 24)} />
            ) : (
              <AddressBits ip={parseIp(given.ip) ?? 0} prefix={parseMask(given.mask) ?? 0} />
            )}
            <div className="net-calc-fields">
              {fields
                .filter((field) => field.question === index)
                .map((field) => {
                  const wrong = checked?.misses.includes(field.id) === true

                  return (
                    <label key={field.id} className={`net-calc-field ${wrong ? 'wrong' : ''}`}>
                      <span>{t(`net.ask.${field.kind}`)}</span>
                      <input
                        className="net-input"
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={LIMITS.value}
                        // Dos preguntas piden lo mismo: el nombre lleva de cuál es.
                        aria-label={`${t(`net.ask.${field.kind}`)}: ${title}`}
                        aria-invalid={wrong}
                        value={values[field.id] ?? ''}
                        disabled={disabled}
                        onChange={(event) => {
                          onChange(field.id, event.target.value)
                        }}
                      />
                      {checked !== null && (
                        <span className="net-calc-mark" aria-hidden={!wrong}>
                          {wrong ? `✕ ${t('net.calc.wrong')}` : '✓'}
                        </span>
                      )}
                    </label>
                  )
                })}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
