import type { CSSProperties, ReactNode } from 'react'

import { useI18n } from '../../shared/i18n'
import { THEME_CHOICES, useLook, usePalette, useStyle, useTheme } from '../../shared/theme'
import { PillGroup } from '../../shared/ui/PillGroup'
import { themesFor } from '../../themes'
import type { ThemeManifest } from '../../themes'

type StylePanelProps = {
  /** Quién eres: hay estilos que solo puede elegir su dueña. */
  me: string
  /** Debajo: con qué estilo ven los demás tu perfil. */
  recordStyle?: ReactNode
}

/** Las variables de la muestra de un estilo, para pintarla sin ponerlo. */
const sample = (theme: ThemeManifest): CSSProperties =>
  ({
    '--sample-bg': theme.preview.bg,
    '--sample-surface': theme.preview.surface,
    '--sample-text': theme.preview.text,
    '--sample-accent': theme.preview.accent,
    '--sample-font': theme.preview.font,
    '--sample-radius': theme.preview.radius,
  }) as CSSProperties

/**
 * El estilo, en el estudio: una tarjeta por estilo con su muestra (una cabecera,
 * una tarjeta y un botón, con sus colores, su letra y sus esquinas), las
 * paletas del elegido como muestras de color, iguales para todos los estilos,
 * y el tema claro u oscuro. Todo se aplica al momento a la web entera (también a
 * la vista previa de al lado): un estilo cambia reglas de CSS de toda la página
 * y no se puede limitar a un trozo sin duplicar cada hoja.
 */
export function StylePanel({ me, recordStyle }: StylePanelProps) {
  const { t, lang } = useI18n()
  const [style, setStyle] = useStyle()
  const [palette, setPalette] = usePalette()
  const [theme, setTheme] = useTheme()
  const { theme: chosen } = useLook()
  const nameOf = (entry: { name: Partial<Record<string, string>> & { es: string } }): string =>
    entry.name[lang] ?? entry.name.es
  const current = chosen.palettes?.find((option) => option.id === palette)

  return (
    <>
      <fieldset className="studio-styles">
        <legend>{t('layout.style')}</legend>
        {themesFor(me).map((option) => (
          <label key={option.id} className="studio-style" style={sample(option)}>
            <input
              type="radio"
              name="studio-style"
              checked={style === option.id}
              onChange={() => {
                setStyle(option.id)
              }}
            />
            <span className="studio-sample" aria-hidden="true">
              <i className="sample-bar" />
              <i className="sample-card">
                <i />
                <i />
              </i>
              <i className="sample-button" />
            </span>
            <strong>{nameOf(option)}</strong>
            <small>{option.hint[lang] ?? option.hint.es}</small>
          </label>
        ))}
      </fieldset>

      {chosen.palettes !== undefined && (
        <fieldset className="studio-palettes">
          <legend>
            {t('layout.palette')}
            {current !== undefined && <strong>{nameOf(current)}</strong>}
          </legend>
          <div>
            {chosen.palettes.map((option) => (
              <label key={option.id} title={nameOf(option)}>
                <input
                  type="radio"
                  name="studio-palette"
                  checked={palette === option.id}
                  onChange={() => {
                    setPalette(option.id)
                  }}
                />
                <i style={{ background: option.swatch }} aria-hidden="true" />
                <span className="sr-only">{nameOf(option)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="studio-row">
        <span>{t('settings.theme')}</span>
        <PillGroup
          options={THEME_CHOICES}
          value={theme}
          onChange={setTheme}
          label={t('settings.theme')}
          text={(option) => t(`settings.theme.${option}`)}
        />
      </div>
      {recordStyle}
    </>
  )
}
