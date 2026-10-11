import { useState } from 'react'
import type { ChangeEvent, SyntheticEvent } from 'react'

import type { GroupKind, GroupView, ProjectSummary } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { clusterName } from '../map/ClusterMapView'
import { SeatPicker } from '../map/SeatPicker'
import { parseSeat } from '../map/seats'
import { shortDay, today } from './days'

type GroupFormProps = {
  projects: readonly ProjectSummary[]
  defaultProject: number | undefined
  /** Si viene, el formulario cambia ese grupo en vez de abrir uno nuevo. */
  group?: GroupView
  onCancel: () => void
  onSaved: () => void
}

type GroupFormState = {
  projectId: string
  place: string
  /** Días concretos de quedada, `YYYY-MM-DD`. */
  dates: string[]
  /** Puestos elegidos en el mapa. */
  seats: string[]
  /** `true` mientras el sitio lo escribe el mapa y no la persona. */
  autoPlace: boolean
  start: string
  end: string
  note: string
  /** `review`: grupo de repaso, para quien ya lo tiene terminado. */
  kind: GroupKind
  /** Cómo lleva el proyecto quien abre el grupo (0-100). */
  progress: number
}

/** Campos que son texto tal cual sale del `<input>`. */
type TextField = Exclude<
  keyof GroupFormState,
  'dates' | 'seats' | 'autoPlace' | 'kind' | 'progress'
>

/** Puestos que puede reservar un grupo, y filas que puede haber entre el primero y el último. Lo mismo que valida la API. */
const MAX_SEATS = 6
const MAX_ROW_SPAN = 2

/** `true` si ese puesto puede añadirse: mismo cluster y sin alejarse más de dos filas del resto. */
function fits(seats: readonly string[], host: string): boolean {
  const places = [...seats, host].map(parseSeat).filter((place) => place !== null)
  const rows = places.map((place) => place.row)

  return (
    new Set(places.map((place) => place.cluster)).size <= 1 &&
    (rows.length === 0 || Math.max(...rows) - Math.min(...rows) <= MAX_ROW_SPAN)
  )
}

/** Días que puede tener un grupo. El mismo tope que la API. */
const MAX_DATES = 14

/**
 * Abrir un grupo de terapia, o cambiar uno que ya existe (`group`).
 *
 * Los días son fechas concretas: se añaden una a una.
 */
export function GroupForm({ projects, defaultProject, group, onCancel, onSaved }: GroupFormProps) {
  const { t, lang } = useI18n()
  const { busy, error, run } = useAction()
  const [form, setForm] = useState<GroupFormState>(() =>
    group === undefined
      ? {
          projectId: defaultProject === undefined ? '' : String(defaultProject),
          place: '',
          dates: [],
          seats: [],
          autoPlace: true,
          start: '16:00',
          end: '18:00',
          note: '',
          kind: 'study',
          progress: 50,
        }
      : {
          projectId: String(group.projectId),
          place: group.place,
          dates: group.dates,
          seats: group.seats,
          // Al editar, el sitio ya lo escribió alguien: el mapa no lo pisa.
          autoPlace: false,
          start: group.start,
          end: group.end,
          note: group.note ?? '',
          kind: group.kind,
          progress: 100,
        },
  )
  // El día que se está eligiendo para añadir.
  const [nextDate, setNextDate] = useState('')
  // Lo que se está tecleando en el campo de puestos; `null` si no se está editando.
  const [seatsText, setSeatsText] = useState<string | null>(null)
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
      }
    })
  }

  /** Añade el puesto si no estaba (y cabe), o lo quita si estaba. */
  const toggleSeat = (host: string): void => {
    updateSeats((seats) => {
      if (seats.includes(host)) {
        return seats.filter((other) => other !== host)
      }

      // Lleno, o demasiado lejos del resto: no se añade.
      return seats.length < MAX_SEATS && fits(seats, host) ? [...seats, host] : [...seats]
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

  const addDate = (): void => {
    if (nextDate === '') return

    setForm((current) => ({
      ...current,
      dates: [...new Set([...current.dates, nextDate])].sort().slice(0, MAX_DATES),
    }))
    setNextDate('')
  }

  const removeDate = (day: string): void => {
    setForm((current) => ({ ...current, dates: current.dates.filter((other) => other !== day) }))
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
    const input = {
      projectId: Number(form.projectId),
      place: form.place,
      dates: form.dates,
      start: form.start,
      end: form.end,
      note: form.note,
      seats: form.seats,
      kind: form.kind,
      progress: form.kind === 'review' ? 100 : form.progress,
    }
    const ok = await run(() =>
      group === undefined ? api.createGroup(input) : api.updateGroup(group.id, input),
    )
    if (ok) onSaved()
  }

  return (
    <form className="card form" onSubmit={(event) => void submit(event)}>
      <h3>{t(group === undefined ? 'therapy.new' : 'therapy.editTitle')}</h3>
      {group === undefined && <p className="hint">{t('therapy.newHint')}</p>}
      {group === undefined && (
        <fieldset className="kind-field">
          <legend>{t('therapy.kind')}</legend>
          <div className="filter-pills">
            {(['study', 'review'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                className={`pill ${form.kind === kind ? 'active' : ''}`}
                aria-pressed={form.kind === kind}
                onClick={() => {
                  setForm((current) => ({ ...current, kind }))
                }}
              >
                {t(`therapy.kind.${kind}`)}
              </button>
            ))}
          </div>
          <p className="hint">{t(`therapy.kind.${form.kind}.hint`)}</p>
          {form.kind === 'study' && (
            <label>
              {t('therapy.progressAsk', { n: form.progress })}
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.progress}
                onChange={(event) => {
                  setForm((current) => ({ ...current, progress: Number(event.target.value) }))
                }}
              />
            </label>
          )}
        </fieldset>
      )}
      <fieldset className="seat-field">
        <legend>{t('therapy.pickSeats')}</legend>
        <p className="hint">{t('therapy.pickSeatsHint')}</p>
        <SeatPicker
          value={form.seats}
          onToggle={toggleSeat}
          when={{ dates: form.dates, start: form.start, end: form.end }}
        />
        <label className="seat-manual">
          {t('therapy.seatsManual')}
          <input
            value={seatsText ?? form.seats.join(', ')}
            onChange={(event) => {
              setSeatsText(event.target.value)
            }}
            onBlur={() => {
              // Se interpreta al salir del campo, no a cada tecla: si no, la coma
              // que se acaba de escribir desaparecería antes de teclear lo siguiente.
              if (seatsText !== null) {
                const typed = seatsText
                  .split(/[\s,;]+/)
                  .map((host) => host.trim().toLowerCase())
                  .filter((host) => host !== '')

                updateSeats(() => [...new Set(typed)].slice(0, MAX_SEATS))
                setSeatsText(null)
              }
            }}
            placeholder="c1r2s3, c1r2s4"
          />
        </label>
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
        <p className="hint">{t('therapy.datesHint')}</p>
        <div className="date-add">
          <input
            type="date"
            value={nextDate}
            min={today()}
            aria-label={t('therapy.addDate')}
            onChange={(event) => {
              setNextDate(event.target.value)
            }}
          />
          <button
            type="button"
            className="pill"
            disabled={nextDate === '' || form.dates.length >= MAX_DATES}
            onClick={addDate}
          >
            {t('therapy.addDate')}
          </button>
        </div>
        {form.dates.length > 0 && (
          <ul className="date-chips">
            {form.dates.map((day) => (
              <li key={day}>
                <span className="chip date-chip">
                  {shortDay(day, lang)}
                  <button
                    type="button"
                    aria-label={t('therapy.removeDate', { day: shortDay(day, lang) })}
                    onClick={() => {
                      removeDate(day)
                    }}
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      <ErrorNote error={error} />
      <div className="actions">
        <button
          type="submit"
          className="primary small"
          disabled={busy || form.dates.length === 0 || form.seats.length === 1}
        >
          {t(group === undefined ? 'therapy.create' : 'therapy.saveEdit')}
        </button>
        <button type="button" className="pill" onClick={onCancel}>
          {t('therapy.cancel')}
        </button>
      </div>
    </form>
  )
}
