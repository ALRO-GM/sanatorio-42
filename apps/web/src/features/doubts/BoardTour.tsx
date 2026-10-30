import { useI18n } from '../../shared/i18n'
import { MiniGraph } from '../../shared/tour/MiniGraph'
import { click, cut, defineTour, Tour, typing } from '../../shared/tour/Tour'
import { Icon } from '../../shared/ui/Icon'

type Board = {
  picked: boolean
  form: boolean
  /** Letras de la duda que ya se han escrito. */
  typed: number
  posted: boolean
  solved: boolean
}

const START: Board = { picked: false, form: false, typed: 0, posted: false, solved: false }

/** Letras que se teclean como mucho: la duda se corta ahí si es más larga. */
const LETTERS = 24

export const TOUR = defineTour<Board>(
  'board',
  START,
  [
    ...click<Board>(600, 'node', { picked: true }),
    [1800, { caption: 2 }],
    [3300, { caption: 3 }],
    ...click<Board>(3300, 'new', { form: true }),
    ...typing<Board>(4300, 'typed', LETTERS),
    ...click<Board>(6000, 'post', { posted: true, form: false }),
    ...cut<Board>(7800, { scene: 1, caption: 4, cursor: 'rest' }),
    [9800, { caption: 5 }],
    ...click<Board>(9800, 'solve', { solved: true }),
  ],
  // De qué sitio de la página habla cada paso: soltando ahí el interrogante,
  // la demostración empieza en él.
  {
    1: '.holy-graph, .correction-graph, .graph-views',
    2: '.board-layout > .guide, .postits',
    3: '.cork-head .primary, .postit.empty, .postit.writing',
    4: '.appbar .mailbox-btn',
    5: '.doubt-detail .replies',
  },
)

/**
 * Cómo funciona el tablón: eliges un proyecto en el grafo, ves su guía y sus
 * dudas, preguntas la tuya y, cuando te responden, marcas la que te sirvió.
 */
export function BoardTour() {
  const { t } = useI18n()
  const question = t('tour.board.q')

  return (
    <Tour
      tour={TOUR}
      tab={() => t('nav.cat.ayuda')}
      sub={() => t('nav.tablon')}
      bell={(shot) => (shot.scene === 1 && !shot.solved ? 1 : 0)}
    >
      {(shot) => (
        <div className="tour-scene wide">
          <MiniGraph picked={shot.picked} />
          {shot.picked && (
            <div className="tour-pop tour-side">
              <strong>{t('board.guide', { project: 'push_swap' })}</strong>
              {shot.scene === 0 && !shot.form && !shot.posted && (
                <span className="tour-row">
                  <span className="tour-button" data-tour="new">
                    {t('board.newDoubt')}
                  </span>
                </span>
              )}
              {shot.form && (
                <>
                  <span className="tour-input typing">{question.slice(0, shot.typed)}</span>
                  <span className="tour-row">
                    <span className="tour-button" data-tour="post">
                      {t('board.post')}
                    </span>
                  </span>
                </>
              )}
              {shot.posted && (
                <span className="tour-item tour-in">
                  <Icon name="pregunta" size={14} />
                  <span>{question}</span>
                </span>
              )}
              {shot.scene === 1 && (
                <>
                  <span className={`tour-item ${shot.solved ? 'on' : ''}`}>
                    <span className="tour-avatar" style={{ ['--hue' as string]: 280 }}>
                      L
                    </span>
                    <span>{t('tour.board.a')}</span>
                  </span>
                  <span className="tour-row">
                    {shot.solved ? (
                      <span className="tour-saved">
                        <Icon name="hecho" size={13} /> +XP
                      </span>
                    ) : (
                      <span className="tour-button" data-tour="solve">
                        {t('board.solvedByThis')}
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Tour>
  )
}
