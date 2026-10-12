import { useEffect, useRef, useState } from 'react'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { DoubtDetailCard } from './DoubtDetailCard'
import { DoubtForm } from './DoubtForm'
import { firstInProgress } from './graph'
import { GuidePanel } from './GuidePanel'
import { HolyGraph } from './HolyGraph'
import { InfoTip } from '../../shared/ui/InfoTip'
import { BoardTour } from './BoardTour'

type DoubtBoardProps = {
  /** Proyecto con el que se abre, si se llega desde otra sección. */
  initialProject: number | null
}

/**
 * Tablón de dudas: el proyecto se elige en el grafo del common core y debajo se
 * ve su guía y su corcho.
 */
export function DoubtBoard({ initialProject }: DoubtBoardProps) {
  const { t } = useI18n()
  const graph = useAsync(() => api.getDoubtGraph(), [])
  const [projectId, setProjectId] = useState<number | null>(initialProject)
  const boardRef = useRef<HTMLDivElement>(null)

  // Si no se llega con un proyecto ya elegido, se abre el primero que la
  // persona tenga en curso: es donde más probable es que tenga una duda.
  useEffect(() => {
    if (projectId === null && graph.data !== undefined) {
      setProjectId(firstInProgress(graph.data)?.projectId ?? null)
    }
  }, [graph.data, projectId])

  const select = (next: number): void => {
    setProjectId(next)
    // El grafo ocupa casi toda la pantalla: al elegir, se baja hasta el tablón.
    requestAnimationFrame(() => {
      boardRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
    })
  }

  const reloadGraph = graph.reload

  return (
    <section>
      <h2>
        {t('board.title')}
        <InfoTip title={t('board.title')}>
          <BoardTour />
        </InfoTip>
      </h2>

      {graph.loading && <p>{t('graph.loading')}</p>}
      {graph.data === undefined ? (
        <ErrorNote error={graph.error} onRetry={() => void graph.reload()} />
      ) : (
        <HolyGraph graph={graph.data} selected={projectId} onSelect={select} />
      )}

      <div ref={boardRef} className="board-anchor">
        {projectId === null ? (
          graph.data !== undefined && <p className="estado">{t('graph.pick')}</p>
        ) : (
          <ProjectBoard
            key={projectId}
            projectId={projectId}
            // Responder, proponer o guardar la guía cambia los avisos del grafo.
            onChange={() => void reloadGraph()}
          />
        )}
      </div>
    </section>
  )
}

/** La guía y el corcho de un proyecto. */
function ProjectBoard({ projectId, onChange }: { projectId: number; onChange: () => void }) {
  const { t } = useI18n()
  const board = useAsync(() => api.getDoubtBoard(projectId), [projectId])
  const [writing, setWriting] = useState(false)
  const [open, setOpen] = useState<number | null>(null)

  if (board.loading) return <p>{t('board.loading')}</p>
  if (board.data === undefined) {
    return <ErrorNote error={board.error} onRetry={() => void board.reload()} />
  }

  const reload = (): void => {
    void board.reload()
    onChange()
  }

  const { project, guide, canEditGuide, proposals, recentChanges, sanctions, doubts } = board.data

  return (
    <div className="board-layout">
      <GuidePanel
        project={project}
        guide={guide}
        canEdit={canEditGuide}
        proposals={proposals}
        recentChanges={recentChanges}
        sanctions={sanctions}
        onChange={reload}
      />

      <div className="cork">
        <header className="cork-head">
          <span className="eyebrow">{t('board.openDoubts', { project: project.name })}</span>
          <button
            className="primary small"
            onClick={() => {
              setWriting(true)
            }}
          >
            {t('board.newDoubt')}
          </button>
        </header>

        {open !== null && (
          <DoubtDetailCard
            doubtId={open}
            onClose={() => {
              setOpen(null)
            }}
            onChange={reload}
          />
        )}

        <ul className="postits">
          {doubts.map((doubt) => (
            <li key={doubt.id}>
              <button
                className={`postit color-${doubt.color}`}
                onClick={() => {
                  setOpen(doubt.id)
                }}
              >
                <strong>{doubt.body}</strong>
                <span className="postit-foot">
                  <span>
                    {doubt.author} ·{' '}
                    {doubt.answers === 1
                      ? t('board.answers1')
                      : t('board.answersN', { n: doubt.answers })}
                  </span>
                  <span className={`postit-status ${doubt.status}`}>
                    {t(`board.status.${doubt.status}`)}
                  </span>
                </span>
              </button>
            </li>
          ))}
          <li>
            {writing ? (
              <DoubtForm
                projectId={projectId}
                onCancel={() => {
                  setWriting(false)
                }}
                onCreated={() => {
                  setWriting(false)
                  reload()
                }}
              />
            ) : (
              <button
                className="postit empty"
                onClick={() => {
                  setWriting(true)
                }}
              >
                <span aria-hidden="true" className="plus">
                  +
                </span>
                {t('board.pasteHere')}
              </button>
            )}
          </li>
        </ul>
      </div>
    </div>
  )
}
