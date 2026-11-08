import { useState } from 'react'

import type { K8sCourse } from '@sanatorio/contracts'
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
} from '@sanatorio/k8ssim'
import type { Tier, Unit } from '@sanatorio/k8ssim'

import { api } from '../../shared/api'
import { Certificates } from '../../shared/course/Certificates'
import { CourseChapter, useChapters } from '../../shared/course/Chapter'
import { CourseOrderHint } from '../../shared/course/CourseOrderHint'
import { CourseEstimate, EstimateBadge } from '../../shared/course/Estimate'
import { starText } from '../../shared/course/Stars'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { InfoTip } from '../../shared/ui/InfoTip'
import { KubernetesCourseTour } from './KubernetesCourseTour'
import { UnitView } from './UnitView'

const IDS = UNITS.map((unit) => unit.id)

/**
 * El curso de Kubernetes: tres niveles, nueve bloques, como los de shell y
 * Docker (la misma plantilla y el mismo aspecto de `tree`). Arriba, si aún no
 * has hecho el nivel principiante del curso de Docker, una sugerencia que no
 * bloquea (shell → git → Docker → Kubernetes, decidido con Alberto el 2026-11-08).
 */
export function K8sCourseTab() {
  const { t } = useI18n()
  const loaded = useAsync(() => api.getK8sCourse(), [])
  const docker = useAsync(() => api.getDockerCourse(), [])
  const [course, setCourse] = useState<K8sCourse | null>(null)
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
    <section className="shell-course k8s-course">
      {/* Mientras no se sabe cómo va el de Docker, no se sugiere nada (no parpadea). */}
      <CourseOrderHint
        done={docker.data?.certificates.some((cert) => cert.tier === 'beginner') ?? true}
        before={t('k8s.order.before')}
        href="#/cursodocker"
        course={t('nav.cursodocker')}
      />
      <p className="git-pitch">
        {t('k8s.pitch')}{' '}
        <InfoTip title={t('nav.cursok8s')}>
          <KubernetesCourseTour />
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
      <Certificates certificates={current.certificates} course="k8s" />
      <div className="shell-tree">
        <div className="shell-tree-bar" aria-hidden="true">
          <i />
          <i />
          <i />
          <span>~/curso-kubernetes</span>
        </div>
        <p className="shell-tree-cmd" aria-hidden="true">
          <span className="course-prompt">$</span> tree curso-kubernetes
        </p>
        {TIERS.map((tier) => (
          <TierPath
            key={tier}
            tier={tier}
            course={current}
            next={IDS[next] ?? null}
            isOpen={chapters.isOpen}
            onToggle={chapters.toggle}
            onOpen={setOpen}
          />
        ))}
      </div>
    </section>
  )
}

type PathProps = {
  course: K8sCourse
  next: string | null
  onOpen: (id: string) => void
}

/** Un nivel: una carpeta con sus bloques y, al final, su jefe final. */
function TierPath({
  tier,
  isOpen,
  onToggle,
  ...rest
}: PathProps & {
  tier: Tier
  isOpen: (block: number) => boolean
  onToggle: (block: number) => void
}) {
  const { t } = useI18n()
  const final = UNITS.find((unit) => unit.id === FINALS[tier])

  return (
    <section className={`shell-tier tier-${tier}`} aria-labelledby={`k8s-tier-${tier}`}>
      <h3 id={`k8s-tier-${tier}`} className="shell-tree-dir">
        {t(`shell.tier.${tier}`)}/ <EstimateBadge seconds={estimateOfTier(tier)} />
      </h3>
      <div className="shell-tree-children">
        {BLOCKS.filter((block) => block.tier === tier).map((block) => (
          <BlockPath
            key={block.n}
            n={block.n}
            open={isOpen(block.n)}
            onToggle={() => {
              onToggle(block.n)
            }}
            {...rest}
          />
        ))}
        {final !== undefined && <Stop unit={final} {...rest} />}
      </div>
    </section>
  )
}

/** Un bloque, plegado: número, de qué trata, quién lo usa y lo hecho; desplegado, sus unidades. */
function BlockPath({
  n,
  open,
  onToggle,
  ...rest
}: PathProps & { n: number; open: boolean; onToggle: () => void }) {
  const { t, lang } = useI18n()
  const block = BLOCKS.find((each) => each.n === n)
  const units = UNITS.filter((unit) => unit.block === n && unit.kind !== 'final')
  const first = units[0]

  if (block === undefined || first === undefined) return null

  const text = courseText(block, lang)
  const finished = units.filter((unit) => rest.course.stars[unit.id] !== undefined).length
  const stars = units.reduce((sum, unit) => sum + (rest.course.stars[unit.id] ?? 0), 0)

  return (
    <CourseChapter
      className="shell-block"
      mark={String(n).padStart(2, '0')}
      title={<>{text.title}/</>}
      pitch={text.pitch}
      industry={`${t('shell.jobs')} ${block.jobs.map((job) => t(`k8s.job.${job}`)).join(' · ')}`}
      meta={
        <>
          <span>{t('course.chapter.progress', { done: finished, total: units.length })}</span>
          {stars > 0 && <span className="course-stars">★ {stars}</span>}
          <EstimateBadge seconds={estimateOfBlock(n)} />
        </>
      }
      locked={!unlocked(IDS, (id) => rest.course.stars[id] !== undefined, IDS.indexOf(first.id))}
      open={open}
      onToggle={onToggle}
    >
      <ol className="shell-pipe" aria-label={text.title}>
        {units.map((unit) => (
          <li key={unit.id}>
            <Stop unit={unit} {...rest} />
          </li>
        ))}
      </ol>
    </CourseChapter>
  )
}

/** Un punto del camino: unidad (número), jefe (bicho) o jefe final (medalla). */
function Stop({ unit, course, next, onOpen }: PathProps & { unit: Unit }) {
  const { t, lang } = useI18n()
  const index = IDS.indexOf(unit.id)
  const open = unlocked(IDS, (id) => course.stars[id] !== undefined, index)
  const stars = course.stars[unit.id] ?? 0
  const title = unitIn(unit, lang).title
  const number = index + 1 - UNITS.slice(0, index).filter((each) => each.kind !== 'unit').length

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
          number
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
