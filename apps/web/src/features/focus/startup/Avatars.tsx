import { AVATAR_KEYS, AVATAR_PARTS, avatarKey, avatarOf } from '@sanatorio/startup'
import type { Avatar, AvatarPart, Role, StartupAction, StartupState } from '@sanatorio/startup'
import { useState } from 'react'

import { useI18n } from '../../../shared/i18n'
import { PixelArt } from './pixel/PixelArt'
import { swatchOf } from './pixel/toon'

type Act = (action: StartupAction) => Promise<boolean>

/** Alguien a quien se le puede cambiar el aspecto: tú (`index` -1) o alguien de la plantilla. */
type Someone = { index: number; look: number; avatar: Avatar | undefined; role: Role | undefined }

/**
 * El configurador de personajes (`docs/pomodoro-startup.md`): eliges a
 * alguien (tú o alguien de la plantilla), cambias cada parte de su aspecto
 * (formas y colores del catálogo, `AVATAR_PARTS`) mirándolo en grande, y lo
 * guardas en la partida. Quien no lo ha tocado sale de su `look`, como siempre.
 */
export function AvatarEditor({
  state,
  me,
  busy,
  onAct,
}: {
  state: StartupState
  /** El aspecto de quien juega cuando no lo ha elegido (sale de su login). */
  me: number
  busy: boolean
  onAct: Act
}) {
  const { t } = useI18n()
  const people: Someone[] = [
    { index: -1, look: me, avatar: state.me, role: undefined },
    ...state.team.map((hire, index) => ({
      index,
      look: hire.look,
      avatar: hire.avatar,
      role: hire.role,
    })),
  ]
  const [who, setWho] = useState(-1)
  const [draft, setDraft] = useState<Avatar | null>(null)
  const person = people.find((one) => one.index === who) ?? people[0]

  if (person === undefined) return null

  const saved = person.avatar ?? avatarOf(person.look)
  const current = draft ?? saved
  const changed = avatarKey(current) !== avatarKey(saved)
  const nameOf = (one: Someone): string =>
    one.index === -1
      ? t('startup.avatar.you')
      : t('startup.avatar.member', { n: String(one.index + 1) })
  const choose = (part: AvatarPart, option: number): void => {
    setDraft({ ...current, [part]: option })
  }

  return (
    <div className="su-editor su-avatars" role="group" aria-label={t('startup.avatar')}>
      <ul className="su-pieces">
        {people.map((one) => (
          <li key={one.index}>
            <button
              type="button"
              className={`small su-piece ${one.index === who ? 'on' : ''}`.trim()}
              aria-pressed={one.index === who}
              aria-label={nameOf(one)}
              title={nameOf(one)}
              onClick={() => {
                setWho(one.index)
                setDraft(null)
              }}
            >
              <PixelArt
                model="person"
                props={{ avatar: avatarKey(one.avatar ?? avatarOf(one.look)), role: one.role }}
                size={28}
              />
            </button>
          </li>
        ))}
      </ul>

      <div className="su-avatar">
        <div className="su-avatar-preview">
          <PixelArt
            model="person"
            props={{ avatar: avatarKey(current), role: person.role }}
            size={96}
          />
          <strong>{nameOf(person)}</strong>
        </div>
        <div className="su-avatar-parts">
          {AVATAR_KEYS.map((part) => (
            <div
              key={part}
              className="su-avatar-part"
              role="group"
              aria-label={t(`startup.avatar.part.${part}`)}
            >
              <span>{t(`startup.avatar.part.${part}`)}</span>
              <div className="su-avatar-options">
                {Array.from({ length: AVATAR_PARTS[part] }, (_, option) => {
                  const swatch = swatchOf(part, option)
                  const on = current[part] === option

                  return swatch === null ? (
                    <button
                      key={option}
                      type="button"
                      className={`small ${on ? 'on' : ''}`.trim()}
                      aria-pressed={on}
                      onClick={() => {
                        choose(part, option)
                      }}
                    >
                      {t(`startup.avatar.${part}.${String(option)}`)}
                    </button>
                  ) : (
                    <button
                      key={option}
                      type="button"
                      className={`su-swatch ${on ? 'on' : ''}`.trim()}
                      style={{ background: swatch }}
                      aria-pressed={on}
                      aria-label={t('startup.avatar.color', { n: String(option + 1) })}
                      title={t('startup.avatar.color', { n: String(option + 1) })}
                      onClick={() => {
                        choose(part, option)
                      }}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="su-avatar-actions">
        <button
          type="button"
          className="small"
          onClick={() => {
            setDraft(avatarOf(Math.floor(Math.random() * 100_000)))
          }}
        >
          {t('startup.avatar.random')}
        </button>
        <button
          type="button"
          className="small"
          disabled={!changed}
          onClick={() => {
            setDraft(null)
          }}
        >
          {t('startup.avatar.undo')}
        </button>
        <button
          type="button"
          className="small primary"
          disabled={!changed || busy}
          onClick={() => {
            void onAct({ type: 'avatar', index: person.index, avatar: current }).then((done) => {
              if (done) setDraft(null)
            })
          }}
        >
          {t('startup.avatar.save')}
        </button>
      </div>
    </div>
  )
}
