import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { formatsFor } from '../../shared/i18n/useFormat'
import { Async } from '../../shared/ui/Async'
import { ErrorNote } from '../../shared/ui/ErrorNote'

/**
 * Panel de gestión, Piscina: si las salas de Not-games se abren a todos los
 * campus (pedido por Alberto, 2026-11-01). De entrada, cerrado: cada campus ve
 * sus salas, y cada grupo (estudiantes o piscineros) las de su grupo. Abrirlo
 * es lo que hará falta para los concursos entre campus. Que los piscineros
 * tengan la pestaña lo decide la lista de arriba (`notgames`).
 */
export function QuizScopePanel() {
  const { t, lang } = useI18n()
  const state = useAsync(() => api.getQuizScope(), [])
  const save = useAction()

  return (
    <article className="card">
      <span className="eyebrow">{t('admin.quizScope.title')}</span>
      <p className="hint">{t('admin.quizScope.hint')}</p>
      <Async state={state}>
        {(scope) => (
          <>
            <label className="net-check">
              <input
                type="checkbox"
                checked={scope.crossCampus}
                disabled={save.busy}
                onChange={(event) => {
                  const crossCampus = event.target.checked

                  void save.run(async () => {
                    state.setData(await api.saveQuizScope({ crossCampus }))
                  })
                }}
              />
              {t('admin.quizScope.cross')}
            </label>
            {scope.updatedBy !== null && scope.updatedAt !== null && (
              <p className="hint">
                {t('admin.quizScope.changed', {
                  who: scope.updatedBy,
                  when: formatsFor(lang).dateTime(scope.updatedAt),
                })}
              </p>
            )}
          </>
        )}
      </Async>
      <ErrorNote error={save.error} />
    </article>
  )
}
