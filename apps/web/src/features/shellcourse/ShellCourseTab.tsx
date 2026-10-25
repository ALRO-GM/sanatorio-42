import { useState } from 'react'

import type { ShellCourse } from '@sanatorio/contracts'
import { firstOpen, unlocked } from '@sanatorio/course'
import { BLOCKS, FINALS, TIERS, unitIn, UNITS } from '@sanatorio/shellsim'
import type { Tier, Unit } from '@sanatorio/shellsim'

import { api } from '../../shared/api'
import { Certificates } from '../../shared/course/Certificates'
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
 */
export function ShellCourseTab() {
  const { t } = useI18n()
  const loaded = useAsync(() => api.getShellCourse(), [])
  const [course, setCourse] = useState<ShellCourse | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const current = course ?? loaded.data ?? null

  if (loaded.error !== null) return <ErrorNote error={loaded.error} />
  if (current === null) return <p className="muted">{t('app.loading')}</p>

  const done = (id: string) => current.stars[id] !== undefined
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

  const next = firstOpen(IDS, done)
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
      <Certificates certificates={current.certificates} />
      {TIERS.map((tier) => (
        <TierPath
          key={tier}
          tier={tier}
          course={current}
          next={IDS[next] ?? null}
          onOpen={(id) => {
            setOpen(id)
          }}
        />
      ))}
    </section>
  )
}

function TierPath({
  tier,
  course,
  next,
  onOpen,
}: {
  tier: Tier
  course: ShellCourse
  next: string | null
  onOpen: (id: string) => void
}) {
  const { t } = useI18n()
  const final = UNITS.find((unit) => unit.id === FINALS[tier])

  return (
    <section className={`shell-tier tier-${tier}`} aria-labelledby={`shell-tier-${tier}`}>
      <h3 id={`shell-tier-${tier}`}>{t(`shell.tier.${tier}`)}</h3>
      {BLOCKS.filter((block) => block.tier === tier).map((block) => (
        <BlockPath key={block.n} n={block.n} course={course} next={next} onOpen={onOpen} />
      ))}
      {final !== undefined && <Stop unit={final} course={course} next={next} onOpen={onOpen} />}
    </section>
  )
}

function BlockPath({
  n,
  course,
  next,
  onOpen,
}: {
  n: number
  course: ShellCourse
  next: string | null
  onOpen: (id: string) => void
}) {
  const { t, lang } = useI18n()
  const block = BLOCKS.find((each) => each.n === n)
  const units = UNITS.filter((unit) => unit.block === n && unit.kind !== 'final')

  if (block === undefined) return null

  const text = lang === 'en' ? block.en : block.es

  return (
    <div className="shell-block">
      <h4>
        <span className="shell-block-n">{t('shell.block', { n })}</span> {text.title}
      </h4>
      <p className="muted">{text.pitch}</p>
      <p className="shell-jobs">
        <span>{t('shell.jobs')}</span>
        {block.jobs.map((job) => (
          <span key={job} className="shell-job">
            {t(`shell.job.${job}`)}
          </span>
        ))}
      </p>
      <ol className="shell-pipe" aria-label={text.title}>
        {units.map((unit) => (
          <li key={unit.id}>
            <Stop unit={unit} course={course} next={next} onOpen={onOpen} />
          </li>
        ))}
      </ol>
    </div>
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
        <span className="course-stars">{stars > 0 ? starText(stars) : ' '}</span>
      </span>
    </button>
  )
}
