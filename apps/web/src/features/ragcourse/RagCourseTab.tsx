import { useState } from 'react'

import type { RagCourse } from '@sanatorio/contracts'
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
} from '@sanatorio/ragsim'
import type { Unit } from '@sanatorio/ragsim'

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
import { RagCourseTour } from './RagCourseTour'
import { BuildStep, UnitView } from './UnitView'

const IDS = UNITS.map((unit) => unit.id)

/** La tubería de un RAG, etapa a etapa, y en qué bloque del curso se construye cada una. */
const PIPELINE = [
  ['docs', 1],
  ['chunks', 1],
  ['index', 2],
  ['ranking', 4],
  ['prompt', 5],
  ['answer', 6],
  ['metrics', 7],
] as const

/** El jefe que cierra un bloque: vencido, esa etapa de la tubería ya es tuya. */
const bossOf = (block: number): string =>
  UNITS.find((unit) => unit.block === block && unit.kind === 'boss')?.id ?? ''

/**
 * El curso de RAG: tres niveles y nueve bloques en el orden en que se
 * construye uno (recuperar; prompt y generación; evaluar, afinar y producción),
 * con la misma plantilla que los demás cursos. Arriba, la tubería entera y la
 * guía de construcción: qué pieza de tu propio RAG puedes escribir al acabar
 * cada bloque. No pide haber hecho antes ningún otro curso.
 */
export function RagCourseTab() {
  const { t, lang } = useI18n()
  const loaded = useAsync(() => api.getRagCourse(), [])
  const [course, setCourse] = useState<RagCourse | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const current = course ?? loaded.data ?? null
  const done = (id: string): boolean => current?.stars[id] !== undefined
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

  const stars = (ids: readonly string[]): number =>
    ids.reduce((sum, id) => sum + (current.stars[id] ?? 0), 0)
  const stop = (each: Unit) => (
    <Stop
      unit={each}
      stars={current.stars[each.id] ?? 0}
      open={unlocked(IDS, done, IDS.indexOf(each.id))}
      current={IDS[next] === each.id}
      onOpen={setOpen}
    />
  )

  return (
    <section className="shell-course rag-course">
      <p className="git-pitch">
        {t('rag.pitch')}{' '}
        <InfoTip title={t('nav.cursorag')}>
          <RagCourseTour />
        </InfoTip>
      </p>
      <ol className="rag-map" aria-label={t('rag.pipe.label')}>
        {PIPELINE.map(([stage, block]) => (
          <li key={stage} className={done(bossOf(block)) ? 'done' : ''}>
            <span>{t(`rag.map.${stage}`)}</span>
            <small>{t('rag.map.block', { n: block })}</small>
          </li>
        ))}
      </ol>
      <p className="git-total">
        <span className="course-stars">★</span> {stars(IDS)} / {IDS.length * 3}
      </p>
      <CourseEstimate
        total={estimateOfCourse()}
        parts={TIERS.map((tier) => ({
          id: tier,
          label: t(`shell.tier.${tier}`),
          seconds: estimateOfTier(tier),
        }))}
      />
      <Certificates certificates={current.certificates} course="rag" />
      <details className="rag-guide">
        <summary>{t('rag.guide.title')}</summary>
        <p>{t('rag.guide.intro')}</p>
        {BLOCKS.map((block) => (
          <BuildStep key={block.n} block={block} />
        ))}
      </details>
      <div className="shell-tree">
        <div className="shell-tree-bar" aria-hidden="true">
          <i />
          <i />
          <i />
          <span>~/curso-rag</span>
        </div>
        <p className="shell-tree-cmd" aria-hidden="true">
          <span className="course-prompt">$</span> tree curso-rag
        </p>
        {TIERS.map((tier) => {
          const final = UNITS.find((each) => each.id === FINALS[tier])

          return (
            <section
              key={tier}
              className={`shell-tier tier-${tier}`}
              aria-labelledby={`rag-${tier}`}
            >
              <h3 id={`rag-${tier}`} className="shell-tree-dir">
                {t(`shell.tier.${tier}`)}/ <EstimateBadge seconds={estimateOfTier(tier)} />
              </h3>
              <div className="shell-tree-children">
                {BLOCKS.filter((block) => block.tier === tier).map((block) => {
                  const units = UNITS.filter(
                    (each) => each.block === block.n && each.kind !== 'final',
                  )
                  const ids = units.map((each) => each.id)
                  const text = courseText(block, lang)

                  return (
                    <CourseChapter
                      key={block.n}
                      className="shell-block"
                      mark={String(block.n).padStart(2, '0')}
                      title={<>{text.title}/</>}
                      pitch={text.pitch}
                      industry={`${t('shell.jobs')} ${block.jobs.map((job) => t(`rag.job.${job}`)).join(' · ')}`}
                      meta={
                        <>
                          <span>
                            {t('course.chapter.progress', {
                              done: ids.filter(done).length,
                              total: ids.length,
                            })}
                          </span>
                          {stars(ids) > 0 && <span className="course-stars">★ {stars(ids)}</span>}
                          <EstimateBadge seconds={estimateOfBlock(block.n)} />
                        </>
                      }
                      locked={!unlocked(IDS, done, IDS.indexOf(ids[0] ?? ''))}
                      open={chapters.isOpen(block.n)}
                      onToggle={() => {
                        chapters.toggle(block.n)
                      }}
                    >
                      <ol className="shell-pipe" aria-label={text.title}>
                        {units.map((each) => (
                          <li key={each.id}>{stop(each)}</li>
                        ))}
                      </ol>
                      <BuildStep block={block} />
                    </CourseChapter>
                  )
                })}
                {final !== undefined && stop(final)}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}

/** Un punto del camino: unidad (número), jefe (bicho) o jefe final (medalla). */
function Stop({
  unit,
  stars,
  open,
  current,
  onOpen,
}: {
  unit: Unit
  stars: number
  /** Si ya se puede abrir (el de antes está superado). */
  open: boolean
  /** Si es el que toca. */
  current: boolean
  onOpen: (id: string) => void
}) {
  const { t, lang } = useI18n()
  const title = unitIn(unit, lang).title
  const before = UNITS.slice(0, IDS.indexOf(unit.id))
  const boss = unit.kind !== 'unit'

  return (
    <button
      type="button"
      className={`shell-stop ${unit.kind} ${stars > 0 ? 'done' : ''} ${current ? 'current' : ''}`}
      disabled={!open}
      aria-label={title}
      title={open ? title : t('shell.locked')}
      onClick={() => {
        onOpen(unit.id)
      }}
    >
      <span className="shell-stop-mark" aria-hidden="true">
        {!open && <Icon name="candado" size={14} />}
        {open && !boss && before.filter((each) => each.kind === 'unit').length + 1}
        {open && boss && (
          <Icon
            name={unit.kind === 'boss' ? 'bicho' : 'medalla'}
            size={unit.kind === 'boss' ? 16 : 20}
          />
        )}
      </span>
      <span className="shell-stop-text">
        {boss && <small>{t(`shell.kind.${unit.kind}`)}</small>}
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
