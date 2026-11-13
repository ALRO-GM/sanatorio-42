import { useState } from 'react'

import type { NetCourse } from '@sanatorio/contracts'
import { courseText, firstOpen, unlocked } from '@sanatorio/course'
import {
  BLOCKS,
  estimateOf,
  estimateOfBlock,
  estimateOfCourse,
  estimateOfTier,
  FINALS,
  TIERS,
  unitIn,
  unitOf,
  UNITS,
} from '@sanatorio/netsim'
import type { Block, Unit } from '@sanatorio/netsim'

import { api } from '../../shared/api'
import { Certificates } from '../../shared/course/Certificates'
import { CourseChapter, useChapters } from '../../shared/course/Chapter'
import { CourseEstimate, EstimateBadge } from '../../shared/course/Estimate'
import { starText } from '../../shared/course/Stars'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { InfoTip } from '../../shared/ui/InfoTip'
import { NetCourseTour } from './NetCourseTour'
import { UnitView } from './UnitView'

const ORDER = UNITS.map((unit) => unit.id)

/** El número de cada unidad en el camino (los jefes no llevan número). */
const NUMBER = new Map(
  UNITS.filter((unit) => unit.kind === 'unit').map((unit, index) => [unit.id, index + 1]),
)

/** Lo que hace falta saber del progreso para pintar el camino. */
type Progress = {
  stars: NetCourse['stars']
  /** El punto que toca: el primero abierto y sin hacer. */
  next: string | undefined
  open: (id: string) => void
}

/**
 * El curso de NetPractice: tres niveles y nueve bloques, como los demás cursos
 * (la misma plantilla), pintado como una red: cada punto es un nodo y el cable
 * se enciende según avanzas. No sugiere hacer antes ningún otro curso: las
 * redes no dependen de la shell ni de git.
 */
export function NetCourseTab() {
  const { t } = useI18n()
  const loaded = useAsync(() => api.getNetCourse(), [])
  const [fresh, setFresh] = useState<NetCourse | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const course = fresh ?? loaded.data ?? null
  const done = (id: string): boolean => course?.stars[id] !== undefined
  const next = UNITS[firstOpen(ORDER, done)]
  const chapters = useChapters<number>(next?.block ?? null)
  const opened = openId === null ? undefined : unitOf(openId)

  if (loaded.error !== null) return <ErrorNote error={loaded.error} />
  if (course === null) return <p className="muted">{t('app.loading')}</p>
  if (opened !== undefined)
    return (
      <UnitView
        key={opened.id}
        unit={opened}
        course={course}
        onCourse={setFresh}
        onBack={() => {
          setOpenId(null)
        }}
      />
    )

  const progress: Progress = { stars: course.stars, next: next?.id, open: setOpenId }
  const earned = Object.entries(course.stars).reduce(
    (sum, [id, stars]) => sum + (ORDER.includes(id) ? stars : 0),
    0,
  )

  return (
    <section className="net-course">
      <Hero />
      <p className="git-pitch">
        {t('net.pitch')}{' '}
        <InfoTip title={t('nav.cursonet')}>
          <NetCourseTour />
        </InfoTip>
      </p>
      <p className="git-total">
        <span className="course-stars">★</span> {earned} / {ORDER.length * 3}
      </p>
      <CourseEstimate
        total={estimateOfCourse()}
        parts={TIERS.map((tier) => ({
          id: tier,
          label: t(`shell.tier.${tier}`),
          seconds: estimateOfTier(tier),
        }))}
      />
      <Certificates certificates={course.certificates} course="net" />
      {TIERS.map((tier) => {
        const final = unitOf(FINALS[tier])

        return (
          <section
            key={tier}
            className={`net-tier tier-${tier}`}
            aria-labelledby={`net-tier-${tier}`}
          >
            <h3 id={`net-tier-${tier}`}>
              {t(`shell.tier.${tier}`)} <EstimateBadge seconds={estimateOfTier(tier)} />
            </h3>
            {BLOCKS.filter((block) => block.tier === tier).map((block) => (
              <BlockChapter
                key={block.n}
                block={block}
                progress={progress}
                open={chapters.isOpen(block.n)}
                onToggle={() => {
                  chapters.toggle(block.n)
                }}
              />
            ))}
            {final !== undefined && <Stop unit={final} progress={progress} />}
          </section>
        )
      })}
    </section>
  )
}

/** El dibujo de arriba: una máquina, un switch, un router e internet, con un paquete de camino. */
function Hero() {
  return (
    <svg className="net-hero" viewBox="0 0 320 44" aria-hidden="true" focusable="false">
      <path className="net-hero-wire" d="M30 22h260" />
      <circle className="net-hero-packet" cx="30" cy="22" r="4" />
      <g className="net-hero-nodes">
        <rect x="16" y="11" width="28" height="22" rx="4" />
        <rect x="98" y="15" width="36" height="14" rx="4" />
        <circle cx="200" cy="22" r="13" />
        <path d="M276 32a8 8 0 0 1-1-16 10 10 0 0 1 19 3 7 7 0 0 1-1 13z" />
      </g>
    </svg>
  )
}

/** Un bloque, plegado: número, de qué trata, quién lo usa y lo hecho; desplegado, sus puntos en fila. */
function BlockChapter({
  block,
  progress,
  open,
  onToggle,
}: {
  block: Block
  progress: Progress
  open: boolean
  onToggle: () => void
}) {
  const { t, lang } = useI18n()
  const text = courseText(block, lang)
  const points = UNITS.filter((unit) => unit.block === block.n && unit.kind !== 'final')
  const stars: number[] = points.map((unit) => progress.stars[unit.id] ?? 0)
  const first = ORDER.indexOf(points[0]?.id ?? '')
  const earned = stars.reduce((sum, each) => sum + each, 0)

  return (
    <CourseChapter
      className="net-block"
      mark={block.n}
      title={text.title}
      pitch={text.pitch}
      industry={`${t('shell.jobs')} ${block.jobs.map((job) => t(`net.job.${job}`)).join(' · ')}`}
      meta={
        <>
          <span>
            {t('course.chapter.progress', {
              done: stars.filter((each) => each > 0).length,
              total: points.length,
            })}
          </span>
          {earned > 0 && <span className="course-stars">★ {earned}</span>}
          <EstimateBadge seconds={estimateOfBlock(block.n)} />
        </>
      }
      locked={!unlocked(ORDER, (id) => progress.stars[id] !== undefined, first)}
      open={open}
      onToggle={onToggle}
    >
      <ol className="net-stops" aria-label={text.title}>
        {points.map((unit) => (
          <li key={unit.id}>
            <Stop unit={unit} progress={progress} />
          </li>
        ))}
      </ol>
    </CourseChapter>
  )
}

/** Un punto del camino: una unidad (su número), un jefe (el bicho) o el jefe final (la medalla). */
function Stop({ unit, progress }: { unit: Unit; progress: Progress }) {
  const { t, lang } = useI18n()
  const reachable = unlocked(
    ORDER,
    (id) => progress.stars[id] !== undefined,
    ORDER.indexOf(unit.id),
  )
  const got = progress.stars[unit.id]
  const name = unitIn(unit, lang).title
  const state = got !== undefined ? 'done' : progress.next === unit.id ? 'current' : ''
  const mark = !reachable ? (
    <Icon name="candado" size={14} />
  ) : unit.kind === 'unit' ? (
    NUMBER.get(unit.id)
  ) : (
    <Icon name={unit.kind === 'boss' ? 'bicho' : 'medalla'} size={18} />
  )

  return (
    <button
      type="button"
      className={`net-stop ${unit.kind} ${state}`}
      disabled={!reachable}
      aria-label={name}
      title={reachable ? name : t('shell.locked')}
      onClick={() => {
        progress.open(unit.id)
      }}
    >
      <span className="net-stop-mark" aria-hidden="true">
        {mark}
      </span>
      <span className="net-stop-text">
        {unit.kind !== 'unit' && <small>{t(`shell.kind.${unit.kind}`)}</small>}
        <span>{name}</span>
        {got === undefined ? (
          <EstimateBadge seconds={estimateOf(unit)} />
        ) : (
          <span className="course-stars">{starText(got)}</span>
        )}
      </span>
    </button>
  )
}
