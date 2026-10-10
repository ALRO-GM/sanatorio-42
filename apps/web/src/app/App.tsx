import { useEffect, useState } from 'react'

import { Login } from '../features/auth/Login'
import { useAuth } from '../features/auth/useAuth'
import { useI18n } from '../shared/i18n'
import { Logo } from '../shared/ui/Logo'
import { Clinic } from './Clinic'

const BASE_TITLE = 'Sanatorio 42'

/**
 * Lee el error con el que la API devuelve a casa tras un login fallido.
 *
 * Si el permiso se deniega (o el `state` no cuadra), la API redirige con
 * `?error=...`. Sin esto, la pantalla de login se ve idéntica a una sesión
 * cancelada por accidente y la persona no sabe qué ha pasado.
 *
 * Se limpia la URL después de leerlo, para que no se repita en cada recarga.
 */
function readOAuthError(): string | null {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('error')

  if (code === null) {
    return null
  }

  params.delete('error')
  params.delete('error_description')
  params.delete('status')

  const query = params.toString()

  window.history.replaceState(
    {},
    '',
    `${window.location.pathname}${query === '' ? '' : `?${query}`}${window.location.hash}`,
  )

  return code
}

/** Decide qué pantalla toca: cargando, servidor caído, login o la web. */
export function App() {
  const { t } = useI18n()
  const { me, loading, error, retry, login, logout } = useAuth()
  const [oauthError] = useState(readOAuthError)

  useEffect(() => {
    document.title = me === null ? BASE_TITLE : `${BASE_TITLE} - ${me.login}`
  }, [me])

  if (loading) {
    return <p className="center">{t('app.loading')}</p>
  }

  // No es que no haya sesión: es que no se ha podido preguntar. Mostrar el login
  // aquí mandaría a la gente a entrar cuando lo que falla es el servidor.
  if (error !== null) {
    return (
      <main className="center">
        <Logo />
        <h1>{BASE_TITLE}</h1>
        <p className="estado error" role="alert">
          {t('app.serverDown')}
        </p>
        <button className="primary" onClick={() => void retry()}>
          {t('app.retry')}
        </button>
      </main>
    )
  }

  if (me === null) {
    const notice =
      oauthError === null
        ? null
        : oauthError === 'access_denied'
          ? t('login.cancelled')
          : t('login.failed', { code: oauthError })

    return <Login onLogin={() => void login()} notice={notice} />
  }

  return <Clinic me={me} onLogout={() => void logout()} />
}
