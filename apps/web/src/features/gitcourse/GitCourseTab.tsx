import { useState } from 'react'
import type { KeyboardEvent } from 'react'

import type { GitCourse } from '@sanatorio/contracts'
import { GATES, LEVELS } from '@sanatorio/gitsim'
import type { Gate, Level } from '@sanatorio/gitsim'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { GateView } from './GateView'
import { LevelView } from './LevelView'

/** Un color por mundo: cada mundo es una rama que sale del tronco y vuelve. */
const WORLD_COLORS = ['#e8590c', '#2f9e44', '#1971c2', '#ae3ec9', '#f08c00', '#0c8599']
const TRUNK_X = 34
const LANE_X = 92
const ROW = 62

type Stop =
  | { kind: 'level'; level: Level; index: number; x: number; y: number; color: string }
  | { kind: 'gate'; gate: Gate; x: number; y: number }

/** El camino de arriba abajo: los pasos de cada mundo en su rama, y el mundo en el tronco. */
function stopsOf(): Stop[] {
  const stops: Stop[] = []
  let y = 30

  LEVELS.forEach((level, index) => {
    const color = WORLD_COLORS[level.world % WORLD_COLORS.length] ?? '#888'
    const onTrunk = level.kind === 'world'

    stops.push({ kind: 'level', level, index, x: onTrunk ? TRUNK_X : LANE_X, y, color })
    y += ROW
    if (onTrunk) {
      for (const gate of GATES.filter((each) => each.after === level.id)) {
        stops.push({ kind: 'gate', gate, x: TRUNK_X, y })
        y += ROW
      }
    }
  })

  return stops
}

const STOPS = stopsOf()
/** El tronco (main): de un punto gordo al siguiente, en línea recta. */
const TRUNK = STOPS.filter((stop) => stop.x === TRUNK_X)

/**
 * El curso de git: un camino con forma de ramas de git. Cada mundo sale del
 * tronco, tiene sus pasos y vuelve a unirse en un punto gordo. Los puntos se
 * desbloquean en orden y se marcan con estrellas.
 */
export function GitCourseTab({ onReview }: { onReview: () => void }) {
  const { t } = useI18n()
  const loaded = useAsync(() => api.getGitCourse(), [])
  const [course, setCourse] = useState<GitCourse | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const current = course ?? loaded.data ?? null

  if (loaded.error !== null) return <ErrorNote error={loaded.error} />
  if (current === null) return <p className="muted">{t('app.loading')}</p>

  const done = (id: string) => current.stars[id] !== undefined
  const unlocked = (index: number) => {
    const previous = LEVELS[index - 1]

    return previous === undefined || done(previous.id)
  }
  const next = LEVELS.findIndex((level, index) => unlocked(index) && !done(level.id))
  const level = LEVELS.find((each) => each.id === open)
  const gate = GATES.find((each) => each.id === open)

  if (gate !== undefined) {
    return (
      <GateView
        gate={gate}
        course={current}
        onCourse={setCourse}
        onReview={onReview}
        onBack={() => {
          setOpen(null)
        }}
      />
    )
  }

  if (level !== undefined) {
    return (
      <LevelView
        key={level.id}
        level={level}
        best={current.stars[level.id] ?? 0}
        seat={current.seat}
        onDone={(result) => {
          setCourse(result.course)
        }}
        onBack={() => {
          setOpen(null)
        }}
      />
    )
  }

  const height = (STOPS.at(-1)?.y ?? 0) + 50
  const total = Object.values(current.stars).reduce((sum, stars) => sum + stars, 0)

  return (
    <section className="git-course">
      <p className="git-pitch">{t('git.pitch')}</p>
      {current.seat === null ? (
        <p className="notice">{t('git.needSeat')}</p>
      ) : (
        <p className="muted">{t('git.atSeat', { seat: current.seat })}</p>
      )}
      <p className="git-total">
        <span className="git-stars">★</span> {total} / {LEVELS.length * 3}
      </p>
      <svg
        className="git-path"
        viewBox={`0 0 380 ${height}`}
        role="list"
        aria-label={t('git.path')}
      >
        {TRUNK.slice(1).map((stop, i) => {
          const from = TRUNK[i]

          return from === undefined ? null : (
            <line
              key={`trunk-${i}`}
              className="git-trunk"
              x1={from.x}
              y1={from.y}
              x2={stop.x}
              y2={stop.y}
            />
          )
        })}
        {STOPS.slice(1).map((stop, i) => {
          const from = STOPS[i]

          if (from === undefined) return null

          const mid = (from.y + stop.y) / 2
          const color =
            stop.kind === 'level' && stop.x === LANE_X
              ? stop.color
              : from.kind === 'level' && from.x === LANE_X
                ? from.color
                : 'var(--border)'
          const reached =
            stop.kind === 'level'
              ? unlocked(stop.index)
              : from.kind === 'level' && done(from.level.id)

          return (
            <path
              key={i}
              className={`git-path-line ${reached ? 'reached' : ''}`}
              d={`M${from.x},${from.y} C${from.x},${mid} ${stop.x},${mid} ${stop.x},${stop.y}`}
              stroke={color}
            />
          )
        })}
        {STOPS.map((stop) =>
          stop.kind === 'level' ? (
            <LevelStop
              key={stop.level.id}
              stop={stop}
              stars={current.stars[stop.level.id] ?? 0}
              open={unlocked(stop.index)}
              current={stop.index === next}
              onOpen={() => {
                setOpen(stop.level.id)
              }}
            />
          ) : (
            <GateStop
              key={stop.gate.id}
              stop={stop}
              open={done(stop.gate.after)}
              passed={current.gates[stop.gate.id]?.passed === true}
              onOpen={() => {
                setOpen(stop.gate.id)
              }}
            />
          ),
        )}
      </svg>
    </section>
  )
}

/** Abrir un punto con Intro o espacio, como un botón. */
const pressed = (onOpen: () => void) => (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onOpen()
  }
}

/** Una prueba de grupo (o el jefe): una estrella en el tronco. */
function GateStop({
  stop,
  open,
  passed,
  onOpen,
}: {
  stop: Extract<Stop, { kind: 'gate' }>
  open: boolean
  passed: boolean
  onOpen: () => void
}) {
  const { t } = useI18n()
  const name = t(`git.${stop.gate.kind}`, { n: stop.gate.min })

  return (
    <g
      className={`git-stop gate ${open ? '' : 'locked'} ${passed ? 'done' : ''}`}
      role="listitem"
      transform={`translate(${stop.x},${stop.y})`}
    >
      <g
        role="button"
        tabIndex={open ? 0 : -1}
        aria-disabled={!open}
        aria-label={name}
        onClick={open ? onOpen : undefined}
        onKeyDown={open ? pressed(onOpen) : undefined}
      >
        <polygon points="0,-17 5,-6 17,-5 8,3 11,15 0,9 -11,15 -8,3 -17,-5 -5,-6" />
        <text x={28} y={-2} className="git-stop-title big">
          {name}
        </text>
        <text x={28} y={13} className="git-stop-sub">
          {passed ? `✓ ${t('git.gate.testPassed')}` : t('git.gate.test')}
        </text>
      </g>
    </g>
  )
}

function LevelStop({
  stop,
  stars,
  open,
  current,
  onOpen,
}: {
  stop: Extract<Stop, { kind: 'level' }>
  stars: number
  open: boolean
  current: boolean
  onOpen: () => void
}) {
  const big = stop.level.kind === 'world'
  const r = big ? 17 : 11

  return (
    <g
      className={`git-stop ${open ? '' : 'locked'} ${stars > 0 ? 'done' : ''} ${current ? 'current' : ''}`}
      transform={`translate(${stop.x},${stop.y})`}
      role="listitem"
    >
      <g
        role="button"
        tabIndex={open ? 0 : -1}
        aria-disabled={!open}
        aria-label={stop.level.title}
        onClick={open ? onOpen : undefined}
        onKeyDown={open ? pressed(onOpen) : undefined}
      >
        {current && <circle className="git-stop-ring" r={r + 6} stroke={stop.color} />}
        <circle
          r={r}
          fill={stars > 0 || current ? stop.color : 'var(--surface)'}
          stroke={stop.color}
        />
        {big && (
          <text className="git-stop-world" y={5}>
            {stop.level.world}
          </text>
        )}
        <text x={r + 10} y={stars > 0 ? -2 : 4} className={`git-stop-title ${big ? 'big' : ''}`}>
          {stop.level.title}
        </text>
        {stars > 0 && (
          <text x={r + 10} y={13} className="git-stop-stars">
            {'★'.repeat(stars)}
            {'☆'.repeat(3 - stars)}
          </text>
        )}
      </g>
    </g>
  )
}
