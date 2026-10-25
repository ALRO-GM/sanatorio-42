import { useState } from 'react'

import type { Profile, XpKind } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { Icon } from '../../shared/ui/Icon'
import { Modal } from '../../shared/ui/Modal'

/** Lo que da XP, en el orden en que se explica. */
const RULES = [
  'specialist_help',
  'peer_help',
  'doubt_solved',
  'guide_proposal',
  'guide_review',
  'board_host',
  'therapy_session',
] as const satisfies readonly XpKind[]

type LevelButtonProps = Pick<Profile, 'xp' | 'rules' | 'earned'>

/**
 * El número de tu nivel, que se pulsa para ver cómo se gana XP: cuánto da cada
 * cosa (las cifras vienen de la API, `rules`) y cuánta llevas con cada una.
 * Se cierra con Escape, con su botón o pulsando fuera.
 */
export function LevelButton({ xp, rules, earned }: LevelButtonProps) {
  const { t, tn } = useI18n()
  const [open, setOpen] = useState(false)
  // La barra más larga es la de lo que más XP te ha dado.
  const most = Math.max(1, ...RULES.map((kind) => earned[kind].xp))

  return (
    <>
      <button
        type="button"
        className="level"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('xp.levelHow', { level: xp.level })}
        title={t('xp.howTo')}
        onClick={() => {
          setOpen(true)
        }}
      >
        <span className="eyebrow">
          {t('xp.level')} <Icon name="info" size={12} />
        </span>
        <strong>{xp.level}</strong>
      </button>

      {open && (
        <Modal
          portal
          label={t('xp.howTo')}
          title={t('xp.howTo')}
          className="xp-rules-dialog"
          onClose={() => {
            setOpen(false)
          }}
        >
          <p className="xp-rules-level">
            {xp.next === null
              ? t('xp.max', { xp: xp.total })
              : t('xp.progress', { xp: xp.total, next: xp.next })}
          </p>
          <ul className="xp-breakdown">
            {RULES.map((kind) => (
              <li key={kind} className={earned[kind].times === 0 ? 'none' : ''}>
                <span className="xp-what">{t(`xp.rule.${kind}`, { xp: rules[kind] })}</span>
                <span className="xp-meter" aria-hidden="true">
                  <span style={{ width: `${(earned[kind].xp / most) * 100}%` }} />
                </span>
                <span className="xp-got">
                  <strong>{t('xp.gotXp', { xp: earned[kind].xp })}</strong>
                  <small>{tn('xp.got', earned[kind].times)}</small>
                </span>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </>
  )
}
