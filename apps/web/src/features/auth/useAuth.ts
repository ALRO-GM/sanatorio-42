import { useCallback, useEffect, useState } from 'react'

import type { CurrentUser } from '@sanatorio/contracts'

import { api, ApiError } from '../../shared/api'

/**
 * Quién hay en sesión, con la distinción que importa.
 *
 * `error` solo se llena cuando el problema es del servidor o de la red: un 401
 * no es un error, es que no ha entrado nadie, y corresponde a la pantalla de
 * login. Mezclar los dos haría que un corte de la API se pareciera a un "no
 * estás registrado".
 */
export function useAuth() {
  const [me, setMe] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      setMe(await api.getMe())
    } catch (err) {
      setMe(null)

      // 401 = no hay sesión: es la respuesta normal de un navegador recién
      // abierto. Todo lo demás (sin red, API caída, 500) sí es un fallo que
      // conviene enseñar en vez de esconderlo detrás del login.
      const noSession = err instanceof ApiError && err.status === 401

      setError(noSession ? null : err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async () => {
    await api.login()
    await refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    await api.logout()
    setMe(null)
  }, [])

  return { me, loading, error, login, logout, retry: refresh }
}
