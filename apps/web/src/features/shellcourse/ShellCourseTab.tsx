import { useState } from 'react'

import type { ShellCourse } from '@sanatorio/contracts'
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
  UNITS,
} from '@sanatorio/shellsim'
import type { Tier, Unit } from '@sanatorio/shellsim'

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
import { ShellCourseTour } from './ShellCourseTour'
import { UnitView } from './UnitView'

const IDS = UNITS.map((unit) => unit.id)

/**
 * El curso de shell: tres niveles, nueve bloques. Cada bloque es una tubería
 * de unidades que acaba en su jefe contrarreloj, y cada nivel en un jefe final
 * que da su certificado. Los puntos se abren de uno en uno, en orden.
 *
 * Se ve como la salida de `tree` en una terminal: los niveles son carpetas y
 * cada bloque, un capítulo plegado (`CourseChapter`, como los mundos del de
 * git) con de qué trata y quién lo usa en el trabajo; desplegado, sus
 * unidades como ficheros. De entrada, solo el bloque que toca (pedido por
 * Alberto, 2026-10-30: verlo todo de golpe agobiaba).
 */
export function ShellCourseTab() {
  const { t } = useI18n()
  const loaded = useAsync(() => api.getShellCourse(), [])
  const [course, setCourse] = useState<ShellCourse | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const current = course ?? loaded.data ?? null
  const done = (id: string) => current?.stars[id] !== undefined
  const next = firstOpen(IDS, done)
  const chapters = useChapters<number>(UNITS[next]?.block ?? null)

  if (loaded.error !== null) return <ErrorNote error={loaded.error} />
  if (current === null) return <p className="muted">{t('app.loading')}</p>

  const unit = UNITS.find((each) => each.id === open)

  if (unit !== undefined)
    return (
      <UnitView
        key={unit.id}
        unit={unit}
        course={current}
        onCourse={setCourse}
        onBack={() => {
          setOpen(null)
        }}
      />
    )

  const total = IDS.reduce((sum, id) => sum + (current.stars[id] ?? 0), 0)

  return (
    <section className="shell-course">
      <p className="git-pitch">
        {t('shell.pitch')}{' '}
        <InfoTip title={t('notgames.tab.shell')}>
          <ShellCourseTour />
        </InfoTip>
      </p>
      <p className="git-total">
        <span className="course-stars">★</span> {total} / {IDS.length * 3}
      </p>
      <CourseEstimate
        total={estimateOfCourse()}
        parts={TIERS.map((tier) => ({
          id: tier,
          label: t(`shell.tier.${tier}`),
          seconds: estimateOfTier(tier),
        }))}
      />
      <Certificates certificates={current.certificates} />
      <div className="shell-tree">
        <div className="shell-tree-bar" aria-hidden="true">
          <i />
          <i />
          <i />
          <span>~/curso-shell</span>
        </div>
        <p className="shell-tree-cmd" aria-hidden="true">
          <span className="course-prompt">$</span> tree curso-shell
        </p>
        {TIERS.map((tier) => (
          <TierPath
            key={tier}
            tier={tier}
            course={current}
            next={IDS[next] ?? null}
            isOpen={chapters.isOpen}
            onToggle={chapters.toggle}
            onOpen={(id) => {
              setOpen(id)
            }}
          />
        ))}
      </div>
    </section>
  )
}

/** Un nivel: una carpeta con sus bloques y, al final, su jefe final. */
function TierPath({
  tier,
  course,
  next,
  isOpen,
  onToggle,
  onOpen,
}: {
  tier: Tier
  course: ShellCourse
  next: string | null
  isOpen: (block: number) => boolean
  onToggle: (block: number) => void
  onOpen: (id: string) => void
}) {
  const { t } = useI18n()
  const final = UNITS.find((unit) => unit.id === FINALS[tier])

  return (
    <section className={`shell-tier tier-${tier}`} aria-labelledby={`shell-tier-${tier}`}>
      <h3 id={`shell-tier-${tier}`} className="shell-tree-dir">
        {t(`shell.tier.${tier}`)}/ <EstimateBadge seconds={estimateOfTier(tier)} />
      </h3>
      <div className="shell-tree-children">
        {BLOCKS.filter((block) => block.tier === tier).map((block) => (
          <BlockPath
            key={block.n}
            n={block.n}
            course={course}
            next={next}
            open={isOpen(block.n)}
            onToggle={() => {
              onToggle(block.n)
            }}
            onOpen={onOpen}
          />
        ))}
        {final !== undefined && <Stop unit={final} course={course} next={next} onOpen={onOpen} />}
      </div>
    </section>
  )
}

/** Un bloque, plegado: su número, de qué trata, quién lo usa y lo hecho; desplegado, sus unidades. */
function BlockPath({
  n,
  course,
  next,
  open,
  onToggle,
  onOpen,
}: {
  n: number
  course: ShellCourse
  next: string | null
  open: boolean
  onToggle: () => void
  onOpen: (id: string) => void
}) {
  const { t, lang } = useI18n()
  const block = BLOCKS.find((each) => each.n === n)
  const units = UNITS.filter((unit) => unit.block === n && unit.kind !== 'final')
  const first = units[0]

  if (block === undefined || first === undefined) return null

  const text = courseText(block, lang)
  const finished = units.filter((unit) => course.stars[unit.id] !== undefined).length
  const stars = units.reduce((sum, unit) => sum + (course.stars[unit.id] ?? 0), 0)

  return (
    <CourseChapter
      className="shell-block"
      mark={String(n).padStart(2, '0')}
      title={<>{text.title}/</>}
      pitch={text.pitch}
      industry={`${t('shell.jobs')} ${block.jobs.map((job) => t(`shell.job.${job}`)).join(' · ')}`}
      meta={
        <>
          <span>{t('course.chapter.progress', { done: finished, total: units.length })}</span>
          {stars > 0 && <span className="course-stars">★ {stars}</span>}
          <EstimateBadge seconds={estimateOfBlock(n)} />
        </>
      }
      locked={!unlocked(IDS, (id) => course.stars[id] !== undefined, IDS.indexOf(first.id))}
      open={open}
      onToggle={onToggle}
    >
      <ol className="shell-pipe" aria-label={text.title}>
        {units.map((unit) => (
          <li key={unit.id}>
            <Stop unit={unit} course={course} next={next} onOpen={onOpen} />
          </li>
        ))}
      </ol>
    </CourseChapter>
  )
}

/** Un punto del camino: unidad (círculo), jefe (rombo) o jefe final (grande). */
function Stop({
  unit,
  course,
  next,
  onOpen,
}: {
  unit: Unit
  course: ShellCourse
  next: string | null
  onOpen: (id: string) => void
}) {
  const { t, lang } = useI18n()
  const index = IDS.indexOf(unit.id)
  const open = unlocked(IDS, (id) => course.stars[id] !== undefined, index)
  const stars = course.stars[unit.id] ?? 0
  const title = unitIn(unit, lang).title

  return (
    <button
      type="button"
      className={`shell-stop ${unit.kind} ${stars > 0 ? 'done' : ''} ${next === unit.id ? 'current' : ''}`}
      disabled={!open}
      aria-label={title}
      title={open ? title : t('shell.locked')}
      onClick={() => {
        onOpen(unit.id)
      }}
    >
      <span className="shell-stop-mark" aria-hidden="true">
        {!open ? (
          <Icon name="candado" size={14} />
        ) : unit.kind === 'unit' ? (
          index + 1 - UNITS.slice(0, index).filter((each) => each.kind !== 'unit').length
        ) : (
          <Icon
            name={unit.kind === 'boss' ? 'bicho' : 'medalla'}
            size={unit.kind === 'boss' ? 16 : 20}
          />
        )}
      </span>
      <span className="shell-stop-text">
        {unit.kind !== 'unit' && <small>{t(`shell.kind.${unit.kind}`)}</small>}
        <span>{title}</span>
        {stars > 0 ? (
          <span className="course-stars">{starText(stars)}</span>
        ) : (
          <EstimateBadge seconds={estimateOf(unit)} />
        )}
      </span>
    </button>
  )
}
