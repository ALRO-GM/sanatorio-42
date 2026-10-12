import { useI18n } from '../../shared/i18n'
import { click, Tour } from '../../shared/tour/Tour'
import type { Cue } from '../../shared/tour/Tour'
import { Icon } from '../../shared/ui/Icon'

type Agenda = {
  /** Las terapias, ocultas con su botón de tipo. */
  hidden: boolean
  sheet: boolean
  going: boolean
}

const START: Agenda = { hidden: false, sheet: false, going: false }

export const SCRIPT: readonly Cue<Agenda>[] = [
  [1800, { caption: 2 }],
  ...click<Agenda>(1800, 'kind', { hidden: true }),
  ...click<Agenda>(3700, 'kind', { hidden: false }),
  [5200, { caption: 3 }],
  ...click<Agenda>(5200, 'ev', { sheet: true }),
  [7200, { caption: 4 }],
  ...click<Agenda>(7600, 'going', { going: true }),
]

const KINDS = [
  { id: 'evaluation', color: '#d9822b' },
  { id: 'board', color: '#7c5cd6' },
  { id: 'therapy', color: '#2f9e6b' },
  { id: 'help', color: '#00a9ab' },
] as const

type Kind = (typeof KINDS)[number]['id']

/** La semana de mentira: qué hay cada día. */
const WEEK: readonly (readonly { kind: Kind; at: string }[])[] = [
  [{ kind: 'therapy', at: '16:00' }],
  [
    { kind: 'evaluation', at: '11:15' },
    { kind: 'help', at: '17:00' },
  ],
  [{ kind: 'board', at: '17:00' }],
  [{ kind: 'therapy', at: '16:00' }],
  [{ kind: 'evaluation', at: '10:30' }],
]

const colorOf = (kind: Kind): string => KINDS.find((entry) => entry.id === kind)?.color ?? ''

/**
 * Cómo funciona el calendario: todo lo tuyo junto, se oculta por tipos y cada
 * evento se abre para ver los detalles y decir si vas.
 */
export function AgendaTour() {
  const { t } = useI18n()
  const days = t('tour.days').split(',')

  return (
    <Tour
      name="agenda"
      start={START}
      script={SCRIPT}
      steps={[1, 2, 3, 4]}
      tab={() => t('nav.calendario')}
    >
      {(shot) => (
        <>
          <div className="tour-row">
            {KINDS.map(({ id, color }) => (
              <span
                key={id}
                data-tour={id === 'therapy' ? 'kind' : undefined}
                className={`tour-pill ${id === 'therapy' && shot.hidden ? 'off' : ''}`}
                style={{ borderColor: color }}
              >
                {t(`agenda.kind.${id}`)}
              </span>
            ))}
          </div>
          <div className="tour-week">
            {WEEK.map((events, day) => (
              <div key={day}>
                <span className="tour-muted">{days[day]}</span>
                {events.map(({ kind, at }) => (
                  <span
                    key={at}
                    data-tour={kind === 'board' ? 'ev' : undefined}
                    className={`tour-ev ${kind === 'therapy' && shot.hidden ? 'off' : ''}`}
                    style={{ ['--kind' as string]: colorOf(kind) }}
                  >
                    {at}
                  </span>
                ))}
              </div>
            ))}
          </div>
          {shot.sheet && (
            <div
              className="tour-pop tour-alert"
              style={{ ['--kind' as string]: colorOf('board'), top: '46%' }}
            >
              <span className="tour-kind">{t('agenda.kind.board')}</span>
              <strong>{t('tour.boards.topic')}</strong>
              <span>17:00 · Cluster 2 · mgarcia</span>
              <span className="tour-row">
                {shot.going ? (
                  <span className="tour-saved">
                    <Icon name="hecho" size={13} /> {t('meet.seen')}
                  </span>
                ) : (
                  <>
                    <span className="tour-button" data-tour="going">
                      {t('meet.seen')}
                    </span>
                    <span className="tour-pill">{t('meet.late')}</span>
                    <span className="tour-pill">{t('meet.absent')}</span>
                  </>
                )}
              </span>
            </div>
          )}
        </>
      )}
    </Tour>
  )
}
