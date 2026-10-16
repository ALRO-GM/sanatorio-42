import { useEffect, useState } from 'react'

import { Login } from '../features/auth/Login'
import { LegalPage } from '../features/legal/LegalPage'
import { useAuth } from '../features/auth/useAuth'
import { StaffPage } from '../features/staff/StaffPage'
import { useI18n } from '../shared/i18n'
import { Logo } from '../shared/ui/Logo'
import { Clinic } from './Clinic'
import { DemoBadge } from './DemoBadge'

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
  const staff = useStaffRoute()

  // La pantalla del staff no es de la web de la gente: tiene su propia entrada
  // y no pregunta por la sesión de nadie.
  return (
    <>
      {staff ? <StaffPage /> : <StudentApp />}
      <DemoBadge />
    </>
  )
}

/** `true` mientras la dirección sea la de validar documentos (`#/validar`). */
function useStaffRoute(): boolean {
  const read = (): boolean => /^#\/?validar(\/|$)/.test(window.location.hash)
  const [staff, setStaff] = useState(read)

  useEffect(() => {
    const onChange = (): void => {
      setStaff(read())
    }

    window.addEventListener('hashchange', onChange)

    return () => {
      window.removeEventListener('hashchange', onChange)
    }
  }, [])

  return staff
}

function StudentApp() {
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

  // Sin sesión también se puede leer qué se hace con los datos antes de entrar.
  if (me === null && /^#\/?privacidad(\/|$)/.test(window.location.hash)) {
    return (
      <main className="container">
        <PublicLegal />
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

/** La privacidad sin sesión, con una vuelta a la entrada. */
function PublicLegal() {
  const { t } = useI18n()

  return (
    <>
      <a className="link" href="#/">
        {t('legal.back')}
      </a>
      <LegalPage signedIn={false} />
    </>
  )
}
