import { useState } from 'react'
import type { ChangeEvent, SyntheticEvent } from 'react'

import type { ProjectSummary } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { clusterName } from '../map/ClusterMapView'
import { SeatPicker } from '../map/SeatPicker'
import { parseSeat } from '../map/seats'

type GroupFormProps = {
  projects: readonly ProjectSummary[]
  defaultProject: number | undefined
  onCancel: () => void
  onCreated: () => void
}

type GroupFormState = {
  projectId: string
  place: string
  days: number[]
  /** Puestos elegidos en el mapa. */
  seats: string[]
  /** `true` mientras el sitio lo escribe el mapa y no la persona. */
  autoPlace: boolean
  start: string
  end: string
  capacity: string
  note: string
}

/** Campos que son texto tal cual sale del `<input>`. */
type TextField = Exclude<keyof GroupFormState, 'days' | 'seats' | 'autoPlace'>

/** Plazas mínimas y máximas de un grupo. Las mismas que valida la API. */
const MIN_CAPACITY = 2
const MAX_CAPACITY = 12

export function GroupForm({ projects, defaultProject, onCancel, onCreated }: GroupFormProps) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()
  const [form, setForm] = useState<GroupFormState>({
    projectId: defaultProject === undefined ? '' : String(defaultProject),
    place: '',
    days: [],
    seats: [],
    autoPlace: true,
    start: '16:00',
    end: '18:00',
    capacity: '5',
    note: '',
  })
  const shortDays = t('days.short').split(',')
  const longDays = t('days.long').split(',')
  const set =
    (field: TextField) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
        // Si escribe el sitio a mano, el mapa deja de pisárselo.
        autoPlace: field === 'place' ? false : current.autoPlace,
      }))
    }

  /**
   * Cambia los puestos elegidos. De ellos salen el sitio ("Cluster 1 · fila 2")
   * y las plazas, que se pueden corregir después a mano.
   *
   * Recibe una función y no una lista para partir siempre del estado más
   * reciente: dos pulsaciones seguidas en el mapa no se pisan.
   */
  const updateSeats = (change: (seats: readonly string[]) => string[]): void => {
    setForm((current) => {
      const seats = change(current.seats)

      return {
        ...current,
        seats,
        place: current.autoPlace ? describePlace(seats) : current.place,
        capacity:
          seats.length === 0 ? current.capacity : String(Math.max(MIN_CAPACITY, seats.length)),
      }
    })
  }

  /** Añade el puesto si no estaba (y cabe), o lo quita si estaba. */
  const toggleSeat = (host: string): void => {
    updateSeats((seats) => {
      if (seats.includes(host)) {
        return seats.filter((other) => other !== host)
      }

      return seats.length < MAX_CAPACITY ? [...seats, host] : [...seats]
    })
  }

  /** "Cluster 1 · fila 2", o varias salas y filas si los puestos están repartidos. */
  const describePlace = (seats: readonly string[]): string => {
    const positions = seats.map(parseSeat).filter((position) => position !== null)
    const clusters = [...new Set(positions.map((position) => clusterName(position.cluster, t)))]
    const rows = [...new Set(positions.map((position) => position.row))].sort((a, b) => a - b)

    if (clusters.length === 0) {
      return ''
    }

    return clusters.length === 1
      ? `${clusters[0] ?? ''} · ${t(rows.length === 1 ? 'map.rowLong' : 'map.rowsLong', { rows: rows.join(', ') })}`
      : clusters.join(', ')
  }

  const toggleDay = (day: number): void => {
    setForm((current) => ({
      ...current,
      days: current.days.includes(day)
        ? current.days.filter((other) => other !== day)
        : [...current.days, day],
    }))
  }

  if (projects.length === 0) {
    return (
      <div className="card form">
        <p className="estado">{t('therapy.needProject')}</p>
        <button className="pill" onClick={onCancel}>
          {t('therapy.cancel')}
        </button>
      </div>
    )
  }

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault()
    const ok = await run(() =>
      api.createGroup({
        projectId: Number(form.projectId),
        place: form.place,
        days: form.days,
        start: form.start,
        end: form.end,
        capacity: Number(form.capacity),
        note: form.note,
        seats: form.seats,
      }),
    )
    if (ok) onCreated()
  }

  return (
    <form className="card form" onSubmit={(event) => void submit(event)}>
      <h3>{t('therapy.new')}</h3>
      <p className="hint">{t('therapy.newHint')}</p>
      <fieldset className="seat-field">
        <legend>{t('therapy.pickSeats')}</legend>
        <p className="hint">{t('therapy.pickSeatsHint')}</p>
        <SeatPicker value={form.seats} onToggle={toggleSeat} />
        {form.seats.length > 0 && (
          <p className="picked-seats" role="status">
            <span>{t('therapy.pickedSeats', { n: form.seats.length })}</span>
            {form.seats.map((host) => (
              <span key={host} className="chip seat-chip">
                {host}
              </span>
            ))}
            <button
              type="button"
              className="link"
              onClick={() => {
                updateSeats(() => [])
              }}
            >
              {t('therapy.clearSeats')}
            </button>
          </p>
        )}
      </fieldset>
      <div className="form-grid">
        <label>
          {t('therapy.project')}
          <select value={form.projectId} onChange={set('projectId')} required>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('therapy.place')}
          <input
            value={form.place}
            onChange={set('place')}
            placeholder={t('therapy.placeHint')}
            maxLength={80}
            required
          />
        </label>
        <label>
          {t('therapy.start')}
          <input type="time" value={form.start} onChange={set('start')} required />
        </label>
        <label>
          {t('therapy.end')}
          <input type="time" value={form.end} onChange={set('end')} required />
        </label>
        <label>
          {t('therapy.capacity')}
          <input
            type="number"
            min={Math.max(MIN_CAPACITY, form.seats.length)}
            max={MAX_CAPACITY}
            value={form.capacity}
            onChange={set('capacity')}
            required
          />
        </label>
        <label>
          {t('therapy.note')}
          <input
            value={form.note}
            onChange={set('note')}
            placeholder={t('therapy.noteHint')}
            maxLength={200}
          />
        </label>
      </div>
      <fieldset className="days-field">
        <legend>{t('therapy.days')}</legend>
        <div className="days">
          {shortDays.map((label, index) => (
            <button
              type="button"
              key={label}
              className={`day ${form.days.includes(index + 1) ? 'active' : ''}`}
              aria-pressed={form.days.includes(index + 1)}
              aria-label={longDays[index]}
              onClick={() => {
                toggleDay(index + 1)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <ErrorNote error={error} />
      <div className="actions">
        <button type="submit" className="primary small" disabled={busy || form.days.length === 0}>
          {t('therapy.create')}
        </button>
        <button type="button" className="pill" onClick={onCancel}>
          {t('therapy.cancel')}
        </button>
      </div>
    </form>
  )
}
