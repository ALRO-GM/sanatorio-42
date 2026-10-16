import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { themesFor } from '../../themes'

type RecordStylePickerProps = {
  me: string
  /** El estilo con el que ven ahora tu expediente, o `null` (cada cual el suyo). */
  current: string | null
  /** Se ha guardado: hay que volver a pedir el expediente. */
  onSaved: () => void
}

/**
 * Con qué estilo ven tu expediente quienes lo visitan: el de cada cual o uno de
 * los que puedes usar (los de todo el mundo y, si te han hecho uno, el tuyo).
 * Lo guarda la API, que no deja poner el estilo de otra persona.
 */
export function RecordStylePicker({ me, current, onSaved }: RecordStylePickerProps) {
  const { t, lang } = useI18n()
  const { busy, error, run } = useAction()

  return (
    <label className="record-style-picker">
      {t('layout.recordStyle')}
      <select
        value={current ?? 'none'}
        disabled={busy}
        onChange={(event) => {
          const recordStyle = event.target.value

          void run(async () => {
            await api.updateSettings({ recordStyle })
            onSaved()
          })
        }}
      >
        <option value="none">{t('layout.recordStyle.none')}</option>
        {themesFor(me).map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.name[lang] ?? theme.name.es}
            {theme.owners === undefined ? '' : ` · ${t('layout.recordStyle.yours')}`}
          </option>
        ))}
      </select>
      <ErrorNote error={error} />
    </label>
  )
}
