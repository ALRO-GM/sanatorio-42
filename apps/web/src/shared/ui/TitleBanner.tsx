import type { CourseAchievementId, TitleId } from '@sanatorio/contracts'

import { courseIcon, isCourseAchievement } from '../courseTitles'
import { Icon } from './Icon'
import type { IconName } from './Icon'

/**
 * El icono de cada título en su banner. El dibujo de fondo (patrón y color)
 * está en `styles/banners.css`, por `data-title`. Los de los cursos llevan el
 * icono de su curso (`shared/courseTitles.ts`) y el patrón va por prefijo.
 */
const BANNER_ICON = new Map<string, IconName>(
  Object.entries({
    paciente: 'terminal',
    interno: 'chispa',
    residente: 'capas',
    especialista: 'medalla',
    jefe: 'despegue',
    maestro: 'estrella',
    hacker_etico: 'escudo',
    hacker_poco_etico: 'bicho',
    hacker_cazado: 'lupa',
  } satisfies Record<Exclude<TitleId, CourseAchievementId>, IconName>),
)

const iconOf = (title: string): IconName | null =>
  BANNER_ICON.get(title) ?? (isCourseAchievement(title) ? courseIcon(title) : null)

type TitleBannerProps = {
  /** El título que luce la persona (el de su expediente). */
  title: string
  /** La muestra pequeña del desplegable de títulos, en vez de la franja entera. */
  mini?: boolean
  /** Un título aún sin conseguir: la muestra sale apagada. */
  locked?: boolean
}

/**
 * La franja de arriba del perfil, con el dibujo del título que luce cada cual:
 * cada título trae el suyo. Sale en tu perfil, en el de los demás y en la ficha
 * que aparece al pasar por un login. Es decoración: no se lee en voz alta.
 */
export function TitleBanner({ title, mini = false, locked = false }: TitleBannerProps) {
  // Un título que la web aún no conoce sale con la franja de siempre.
  const icon = iconOf(title)

  return (
    <div
      className={`${mini ? 'title-banner mini' : 'banner title-banner'}${locked ? ' locked' : ''}`}
      data-title={icon === null ? undefined : title}
      aria-hidden="true"
    >
      {icon !== null && (
        <>
          <span className="banner-art" />
          <span className="banner-icon">
            <Icon name={icon} size={mini ? 14 : 30} />
          </span>
        </>
      )}
    </div>
  )
}
