import { useState } from 'react'
import type { KeyboardEvent } from 'react'

import type { GitCourse } from '@sanatorio/contracts'
import {
  estimateOfGate,
  estimateOfGitCourse,
  estimateOfLevel,
  estimateOfWorld,
  GATES,
  levelIn,
  LEVELS,
  WORLDS,
} from '@sanatorio/gitsim'
import type { Gate, Level } from '@sanatorio/gitsim'

import { api } from '../../shared/api'
import { CourseChapter, useChapters } from '../../shared/course/Chapter'
import { CourseEstimate, useDuration } from '../../shared/course/Estimate'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { InfoTip } from '../../shared/ui/InfoTip'
import { PersonLink } from '../../shared/ui/PersonLink'
import { GateView } from './GateView'
import { GitCourseTour } from './GitCourseTour'
import { LevelView } from './LevelView'

/** Un color por mundo: cada mundo es una rama que sale del tronco y vuelve. */
const WORLD_COLORS = ['#e8590c', '#2f9e44', '#1971c2', '#ae3ec9', '#f08c00', '#0c8599']
const TRUNK_X = 34
const LANE_X = 92
const ROW = 62

type Stop =
  | { kind: 'level'; level: Level; index: number; x: number; y: number; color: string }
  | { kind: 'gate'; gate: Gate; x: number; y: number }

const colorOf = (world: number): string => WORLD_COLORS[world % WORLD_COLORS.length] ?? '#888'

/**
 * El camino de un mundo, de arriba abajo: sus pasos en su rama y el punto gordo
 * en el tronco, con las pruebas de grupo que van detrás.
 */
function stopsOf(world: number): Stop[] {
  const stops: Stop[] = []
  let y = 30

  LEVELS.forEach((level, index) => {
    if (level.world !== world) return

    const onTrunk = level.kind === 'world'

    stops.push({
      kind: 'level',
      level,
      index,
      x: onTrunk ? TRUNK_X : LANE_X,
      y,
      color: colorOf(world),
    })
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

/** Las pruebas de grupo (y el jefe) que cierran cada mundo. */
const gatesOf = (world: number): Gate[] =>
  GATES.filter((gate) => gate.after === `w${String(world)}-world`)

/**
 * El curso de git: un camino con forma de ramas de git. Cada mundo sale del
 * tronco, tiene sus pasos y vuelve a unirse en un punto gordo. Los puntos se
 * desbloquean en orden y se marcan con estrellas.
 *
 * Cada mundo va plegado en su capítulo (`CourseChapter`): de qué trata, para
 * qué sirve en la industria, lo hecho y cuánta gente hace falta en su prueba
 * de grupo; de entrada se despliega el que toca, y uno al que aún no se ha
 * llegado no se despliega. En cada prueba de grupo, quién de tu campus la
 * espera, para quedar y hacerla juntos (pedido por Alberto, 2026-10-30).
 */
export function GitCourseTab({ me, onReview }: { me: string; onReview: () => void }) {
  const { t, lang } = useI18n()
  const loaded = useAsync(() => api.getGitCourse(), [])
  const [course, setCourse] = useState<GitCourse | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const current = course ?? loaded.data ?? null
  const done = (id: string) => current?.stars[id] !== undefined
  const unlocked = (index: number) => {
    const previous = LEVELS[index - 1]

    return previous === undefined || done(previous.id)
  }
  const next = LEVELS.findIndex((level, index) => unlocked(index) && !done(level.id))
  const chapters = useChapters<number>(LEVELS[next]?.world ?? null)

  if (loaded.error !== null) return <ErrorNote error={loaded.error} />
  if (current === null) return <p className="muted">{t('app.loading')}</p>

  const found = LEVELS.find((each) => each.id === open)
  const level = found === undefined ? undefined : levelIn(found, lang)
  const gate = GATES.find((each) => each.id === open)

  if (gate !== undefined) {
    return (
      <GateView
        gate={gate}
        me={me}
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

  // Las pruebas de grupo también se guardan como estrellas; aquí cuentan solo los puntos.
  const total = LEVELS.reduce((sum, each) => sum + (current.stars[each.id] ?? 0), 0)

  return (
    <section className="git-course">
      <p className="git-pitch">
        {t('git.pitch')}{' '}
        <InfoTip title={t('notgames.tab.git')}>
          <GitCourseTour />
        </InfoTip>
      </p>
      {current.seat === null ? (
        <p className="notice">{t('git.needSeat')}</p>
      ) : (
        <p className="muted">{t('git.atSeat', { seat: current.seat })}</p>
      )}
      <p className="git-total">
        <span className="course-stars">★</span> {total} / {LEVELS.length * 3}
      </p>
      <CourseEstimate
        total={estimateOfGitCourse()}
        parts={WORLDS.map((world) => ({
          id: String(world),
          label: t('git.worldN', { n: world }),
          seconds: estimateOfWorld(world),
        }))}
      />
      <div className="git-worlds" role="list" aria-label={t('git.path')}>
        {WORLDS.map((world) => {
          const levels = LEVELS.map((level, index) => ({ level, index })).filter(
            ({ level }) => level.world === world,
          )
          const first = levels[0]?.index ?? 0
          const finished = levels.filter(({ level }) => done(level.id)).length
          const stars = levels.reduce((sum, { level }) => sum + (current.stars[level.id] ?? 0), 0)
          const gates = gatesOf(world)

          return (
            <div key={world} role="listitem" style={{ ['--world' as string]: colorOf(world) }}>
              <CourseChapter
                className="git-world"
                mark={world}
                title={t(`git.world.${String(world)}.name`)}
                pitch={t(`git.world.${String(world)}.pitch`)}
                industry={t('course.chapter.industry', {
                  text: t(`git.world.${String(world)}.industry`),
                })}
                meta={
                  <>
                    <span>
                      {t('course.chapter.progress', { done: finished, total: levels.length })}
                    </span>
                    {stars > 0 && <span className="course-stars">★ {stars}</span>}
                    {gates.map((gate) => (
                      <span key={gate.id} className="git-world-people">
                        <Icon name="persona" size={13} />
                        {t(`git.${gate.kind}`, { n: gate.min })}
                      </span>
                    ))}
                  </>
                }
                locked={!unlocked(first)}
                open={chapters.isOpen(world)}
                onToggle={() => {
                  chapters.toggle(world)
                }}
              >
                <WorldPath
                  world={world}
                  course={current}
                  next={next}
                  done={done}
                  unlocked={unlocked}
                  onOpen={setOpen}
                />
                {gates.map(
                  (gate) =>
                    done(gate.after) && !done(gate.id) && <GatePeople key={gate.id} gate={gate} />,
                )}
              </CourseChapter>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** El camino de un mundo: el tronco, su rama de color y sus puntos. */
function WorldPath({
  world,
  course,
  next,
  done,
  unlocked,
  onOpen,
}: {
  world: number
  course: GitCourse
  next: number
  done: (id: string) => boolean
  unlocked: (index: number) => boolean
  onOpen: (id: string) => void
}) {
  const { t } = useI18n()
  const stops = stopsOf(world)
  const height = (stops.at(-1)?.y ?? 0) + 30

  return (
    <svg
      className="git-path"
      viewBox={`0 0 380 ${String(height)}`}
      role="list"
      aria-label={t('git.worldN', { n: world })}
    >
      {/* El tronco (main) viene de arriba y sigue hacia abajo: los mundos van seguidos. */}
      <line className="git-trunk" x1={TRUNK_X} y1={0} x2={TRUNK_X} y2={height} />
      {/* La rama sale del tronco arriba y vuelve en el punto gordo. */}
      {stops.map((stop, i) => {
        const from: Stop | { x: number; y: number } = stops[i - 1] ?? { x: TRUNK_X, y: 0 }

        if (stop.x !== LANE_X && from.x !== LANE_X) return null

        const mid = (from.y + stop.y) / 2
        const reached =
          stop.kind === 'level'
            ? unlocked(stop.index)
            : 'kind' in from && from.kind === 'level' && done(from.level.id)

        return (
          <path
            key={i}
            className={`git-path-line ${reached ? 'reached' : ''}`}
            d={`M${String(from.x)},${String(from.y)} C${String(from.x)},${String(mid)} ${String(stop.x)},${String(mid)} ${String(stop.x)},${String(stop.y)}`}
            stroke={colorOf(world)}
          />
        )
      })}
      {stops.map((stop) =>
        stop.kind === 'level' ? (
          <LevelStop
            key={stop.level.id}
            stop={stop}
            stars={course.stars[stop.level.id] ?? 0}
            open={unlocked(stop.index)}
            current={stop.index === next}
            onOpen={() => {
              onOpen(stop.level.id)
            }}
          />
        ) : (
          <GateStop
            key={stop.gate.id}
            stop={stop}
            open={done(stop.gate.after)}
            passed={course.gates[stop.gate.id]?.passed === true}
            won={done(stop.gate.id)}
            onOpen={() => {
              onOpen(stop.gate.id)
            }}
          />
        ),
      )}
    </svg>
  )
}

/**
 * Quién de tu campus ha llegado a esta prueba de grupo y aún no la ha hecho:
 * con sus perfiles, para escribirles y quedar para hacerla juntos.
 */
function GatePeople({ gate }: { gate: Gate }) {
  const { t, tn } = useI18n()
  const people = useAsync(() => api.getGitGatePeople(gate.id), [gate.id])
  const list = people.data?.people ?? []

  return (
    <aside className="git-gate-people" aria-label={t('git.gate.people.title')}>
      <h4>
        <Icon name="persona" size={15} /> {t(`git.${gate.kind}`, { n: gate.min })}
      </h4>
      <p className="hint">{t('git.gate.people.hint')}</p>
      {people.error !== null ? (
        <ErrorNote error={people.error} />
      ) : people.data === undefined ? (
        <p className="muted">{t('app.loading')}</p>
      ) : list.length === 0 ? (
        <p className="muted">{t('git.gate.people.none')}</p>
      ) : (
        <>
          <p className="muted">{tn('git.gate.people.count', list.length)}</p>
          <ul className="git-gate-list">
            {list.map((person) => (
              <li key={person.login}>
                <Avatar login={person.login} image={person.image} size={32} />
                <PersonLink login={person.login} />
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
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
  won,
  onOpen,
}: {
  stop: Extract<Stop, { kind: 'gate' }>
  open: boolean
  passed: boolean
  /** La prueba de grupo, superada. */
  won: boolean
  onOpen: () => void
}) {
  const { t } = useI18n()
  const duration = useDuration()
  const name = t(`git.${stop.gate.kind}`, { n: stop.gate.min })

  return (
    <g
      className={`git-stop gate ${open ? '' : 'locked'} ${passed ? 'done' : ''} ${won ? 'won' : ''}`}
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
          {won
            ? `★ ${t('git.room.done')}`
            : passed
              ? `✓ ${t('git.gate.testPassed')}`
              : `${t('git.gate.test')} · ${duration(estimateOfGate())}`}
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
  const { lang } = useI18n()
  const duration = useDuration()
  const title = levelIn(stop.level, lang).title
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
        aria-label={title}
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
        <text x={r + 10} y={-2} className={`git-stop-title ${big ? 'big' : ''}`}>
          {title}
        </text>
        {stars > 0 ? (
          <text x={r + 10} y={13} className="git-stop-stars">
            {'★'.repeat(stars)}
            {'☆'.repeat(3 - stars)}
          </text>
        ) : (
          <text x={r + 10} y={13} className="git-stop-sub">
            {duration(estimateOfLevel(stop.level))}
          </text>
        )}
      </g>
    </g>
  )
}
