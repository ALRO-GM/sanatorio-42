import type { GraphProject, HolyGraph } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import type { Translate, TranslateCount } from '../../shared/i18n'
import { Icon } from '../../shared/ui/Icon'
import { mainSignal, SIGNAL_GLYPH, SIGNALS } from './graph'

type PiscineGraphProps = {
  graph: HolyGraph
  /** Proyecto abierto en el tablón, o `null`. */
  selected: number | null
  onSelect: (projectId: number) => void
}

const DAY_MS = 86_400_000

/** Lo que lee un lector de pantalla (y la barra de detalle) de un proyecto de la piscina. */
function describe(project: GraphProject, t: Translate, tn: TranslateCount): string {
  const parts = [
    project.name,
    t(`piscine.group.${project.group ?? 'c'}`),
    t(project.perfect ? 'graph.perfect' : `graph.status.${project.status}`),
  ]

  if (project.signals.unanswered > 0)
    parts.push(tn('graph.todo.unanswered', project.signals.unanswered))
  if (project.signals.proposals > 0)
    parts.push(tn('graph.todo.proposals', project.signals.proposals))
  if (project.signals.missingGuide) parts.push(t('graph.signal.missingGuide'))

  return parts.join(' · ')
}

/**
 * El grafo del tablón de un piscinero (`docs/piscineros.md`): la piscina como
 * en su grafo de la intra. Arriba, el camino de los proyectos que cuentan para
 * el avance, en orden: azul claro los de shell, azul oscuro los de C. Abajo,
 * aparte, los rushes y BSQ (en grupo, el fin de semana) y los exámenes, que no
 * cuentan pero tienen su tablón como cualquier otro.
 *
 * Cada nodo dice cómo vas: relleno si lo aprobaste, con aro si lo estás
 * haciendo y desvaído si aún no; y, como mucho, una marca de lo que pide una
 * mano (las mismas reglas que el grafo del common core).
 */
export function PiscineGraph({ graph, selected, onSelect }: PiscineGraphProps) {
  const { t, tn } = useI18n()
  const [progress, apart] = [
    graph.circles[0]?.projects ?? [],
    graph.circles.slice(1).flatMap((ring) => ring.projects),
  ]
  const done = progress.filter((project) => project.status === 'finished').length
  const day =
    graph.startedAt === null
      ? null
      : Math.max(0, Math.floor((Date.now() - Date.parse(graph.startedAt)) / DAY_MS))
  const open = [...progress, ...apart].find((project) => project.projectId === selected)
  const signals = SIGNALS.filter((signal) =>
    [...progress, ...apart].some((project) => mainSignal(project.signals) === signal),
  )

  const node = (project: GraphProject) => {
    const signal = mainSignal(project.signals)

    return (
      <li key={project.projectId}>
        <button
          type="button"
          className={`piscine-node ${project.group ?? 'c'} ${project.status} ${project.perfect ? 'perfect' : ''} ${project.projectId === selected ? 'selected' : ''}`}
          aria-pressed={project.projectId === selected}
          aria-label={describe(project, t, tn)}
          title={describe(project, t, tn)}
          onClick={() => {
            onSelect(project.projectId)
          }}
        >
          {project.status === 'finished' && <Icon name="hecho" size={12} />}
          <span className="piscine-node-name">{project.short}</span>
          {signal !== null && (
            <span className={`graph-mark ${signal}`} aria-hidden="true">
              {signal === 'unanswered' ? project.signals.unanswered : SIGNAL_GLYPH[signal]}
            </span>
          )}
        </button>
      </li>
    )
  }

  return (
    <div className="card holy-graph piscine-graph" data-feedback="tablon.graph">
      <header className="graph-head">
        <span className="graph-track piscine">{t('piscine.title')}</span>
        {day !== null && <span className="graph-here">{t('piscine.day', { n: day + 1 })}</span>}
        <span className="graph-here">{t('piscine.done', { done, total: progress.length })}</span>
      </header>

      <section aria-label={t('piscine.progress')}>
        <span className="eyebrow">{t('piscine.progress')}</span>
        <ol className="piscine-path">{progress.map(node)}</ol>
      </section>

      {apart.length > 0 && (
        <section className="piscine-apart" aria-label={t('piscine.apart')}>
          <span className="eyebrow">{t('piscine.apart')}</span>
          <p className="hint">{t('piscine.apartHint')}</p>
          <ul className="piscine-extras">{apart.map(node)}</ul>
        </section>
      )}

      <p className="graph-detail" aria-live="polite">
        {open === undefined ? t('graph.pick') : describe(open, t, tn)}
      </p>

      <ul className="graph-legend">
        <li>
          <span className="piscine-swatch shell" aria-hidden="true" />
          {t('piscine.group.shell')}
        </li>
        <li>
          <span className="piscine-swatch c" aria-hidden="true" />
          {t('piscine.group.c')}
        </li>
        <li>
          <span className="piscine-swatch rush" aria-hidden="true" />
          {t('piscine.group.rush')} · {t('piscine.group.exam')}
        </li>
        <li>
          <span className="piscine-swatch c finished" aria-hidden="true" />
          {t('graph.status.finished')}
        </li>
        <li>
          <span className="piscine-swatch c in_progress" aria-hidden="true" />
          {t('graph.status.in_progress')}
        </li>
        <li>
          <span className="piscine-swatch c todo" aria-hidden="true" />
          {t('graph.status.todo')}
        </li>
        {signals.map((signal) => (
          <li key={signal}>
            <span className={`graph-mark ${signal}`} aria-hidden="true">
              {SIGNAL_GLYPH[signal]}
            </span>
            {t(`graph.signal.${signal}`)}
          </li>
        ))}
      </ul>
    </div>
  )
}
