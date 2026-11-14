import type { Lang, QuizSettings, TurnSettings } from '@sanatorio/contracts'

import type { Translate } from '../../shared/i18n'

/** La temática de una sala, si tiene (las de antes no la llevan, y «De todo» no se dice). */
function languageText(t: Translate, settings: QuizSettings | TurnSettings): string {
  const language = settings.language ?? 'any'

  return language === 'any' ? '' : t(`notgames.language.${language}`)
}

/** Los ajustes de una sala en una línea: «Solo C · Rápidas y largas · De fácil a difícil · 10 preguntas». */
export function settingsText(t: Translate, settings: QuizSettings): string {
  return [
    languageText(t, settings),
    t(`notgames.kinds.${settings.kinds}`),
    t(`notgames.difficulty.${settings.difficulty}`),
    t(`notgames.pool.${settings.pool}`),
    t('notgames.nQuestions', { n: settings.questions }),
    settings.competitive ? t('notgames.competitiveShort') : '',
    settings.minCircle === null ? '' : t('notgames.fromCircle', { n: settings.minCircle }),
  ]
    .filter((part) => part !== '')
    .join(' · ')
}

/** Lo mismo para una partida de ajedrez: «5 min · Solo git · Lo que sabe todo el grupo». */
export function turnSettingsText(t: Translate, settings: TurnSettings): string {
  return [
    t('notgames.minutesN', { n: settings.minutes }),
    languageText(t, settings),
    t(`notgames.pool.${settings.pool}`),
    settings.minCircle === null ? '' : t('notgames.fromCircle', { n: settings.minCircle }),
  ]
    .filter((part) => part !== '')
    .join(' · ')
}

/**
 * Por qué no puedes entrar en una sala. La API lo explica en español; en los
 * demás idiomas, como sus errores, se dice sin el motivo (`AGENTS.md`, «Pendiente»).
 */
export function whyNotText(t: Translate, lang: Lang, whyNot: string): string {
  return lang === 'es' ? whyNot : t('notgames.cantJoin')
}
