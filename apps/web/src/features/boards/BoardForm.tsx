import { useState } from 'react'
import type { ChangeEvent, SyntheticEvent } from 'react'

import type { BoardView } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { lastDay, untilText } from '../../shared/until'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { useConfirm } from '../../shared/ui/useConfirm'
import { dayKey, hhmm } from '../../shared/day'

type BoardFormProps = {
  /** Día con el que se abre el formulario, como `2026-10-10`. */
  defaultDay: string
  /** Si viene, el formulario cambia esa pizarra en vez de proponer una nueva. */
  board?: BoardView
  onCancel: () => void
  onSaved: () => void
}

/** Proponer una pizarra, o cambiar una que ya existe (`board`). */
export function BoardForm({ defaultDay, board, onCancel, onSaved }: BoardFormProps) {
  const { t, lang } = useI18n()
  const { busy, error, run } = useAction()
  const confirm = useConfirm()
  const [form, setForm] = useState(() =>
    board === undefined
      ? {
          title: '',
          topic: '',
          place: '',
          day: defaultDay,
          start: '17:00',
          end: '18:30',
          capacity: '20',
          description: '',
        }
      : {
          title: board.title,
          topic: board.topic ?? '',
          place: board.place,
          day: dayKey(new Date(board.startsAt)),
          start: hhmm(board.startsAt),
          end: hhmm(board.endsAt),
          capacity: String(board.capacity),
          description: board.description ?? '',
        },
  )
  const set =
    (field: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      setForm((current) => ({ ...current, [field]: event.target.value }))
    }

  /** "Va a ser el martes 14 de octubre a las 17:00: dentro de 2 días y 3 horas." */
  const confirmText = (startsAt: string): string =>
    t('event.confirm', {
      when: new Date(startsAt).toLocaleString(localeOf(lang), {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      in: untilText(Date.parse(startsAt) - Date.now(), t),
    })

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault()
    // El día y las horas son las del navegador, que es la hora del campus para
    // quien está allí; a la API viajan como instantes con su zona.
    const at = (time: string): string => new Date(`${form.day}T${time}:00`).toISOString()
    const input = {
      title: form.title,
      topic: form.topic,
      place: form.place,
      description: form.description,
      capacity: Number(form.capacity),
      startsAt: at(form.start),
      endsAt: at(form.end),
    }
    // Antes de guardar se dice cuánto falta: un año o un mes mal puestos se ven
    // aquí. Al retocar una pizarra sin moverle la hora no hace falta.
    const moved = board === undefined || input.startsAt !== new Date(board.startsAt).toISOString()

    if (
      moved &&
      !(await confirm.ask({
        body: confirmText(input.startsAt),
        okText: t(board === undefined ? 'cal.f.create' : 'edit.save'),
      }))
    )
      return

    const ok = await run(() =>
      board === undefined ? api.createBoard(input) : api.updateBoard(board.id, input),
    )
    if (ok) onSaved()
  }

  return (
    <form className="card form" onSubmit={(event) => void submit(event)}>
      <h3>{t(board === undefined ? 'cal.proposeBtn' : 'cal.editTitle')}</h3>
      <div className="form-grid">
        <label className="span-2">
          {t('cal.f.title')}
          <input
            value={form.title}
            onChange={set('title')}
            placeholder={t('cal.f.titleHint')}
            maxLength={80}
            required
          />
        </label>
        <label>
          {t('cal.f.topic')}
          <input
            value={form.topic}
            onChange={set('topic')}
            placeholder={t('cal.f.topicHint')}
            maxLength={30}
          />
        </label>
        <label>
          {t('cal.f.place')}
          <input
            value={form.place}
            onChange={set('place')}
            placeholder={t('cal.f.placeHint')}
            maxLength={80}
            required
          />
        </label>
        <label>
          {t('cal.f.date')}
          <input
            type="date"
            value={form.day}
            onChange={set('day')}
            max={lastDay()}
            title={t('event.horizon')}
            required
          />
        </label>
        <label>
          {t('cal.f.capacity')}
          <input
            type="number"
            min={2}
            max={100}
            value={form.capacity}
            onChange={set('capacity')}
            required
          />
        </label>
        <label>
          {t('cal.f.start')}
          <input type="time" value={form.start} onChange={set('start')} required />
        </label>
        <label>
          {t('cal.f.end')}
          <input type="time" value={form.end} onChange={set('end')} required />
        </label>
        <label className="span-2">
          {t('cal.f.description')}
          <textarea
            rows={2}
            value={form.description}
            onChange={set('description')}
            maxLength={400}
          />
        </label>
      </div>
      <ErrorNote error={error} />
      <div className="actions">
        <button type="submit" className="primary small" disabled={busy}>
          {t(board === undefined ? 'cal.f.create' : 'edit.save')}
        </button>
        <button type="button" className="pill" onClick={onCancel}>
          {t('board.cancel')}
        </button>
      </div>
      {confirm.dialog}
    </form>
  )
}
