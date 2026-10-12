import { lazy, Suspense, useCallback, useEffect, useState } from 'react'

import type { CurrentUser } from '@sanatorio/contracts'

import { BroadcastGate } from '../features/admin/BroadcastGate'
import { AlertCenter } from '../features/alerts/AlertCenter'
import { EasterEgg } from '../features/clicker/EasterEgg'
import { QuotaNotice } from '../features/alerts/QuotaNotice'
import { api } from '../shared/api'
import { useAsync } from '../shared/hooks/useAsync'
import { usePulse } from '../shared/hooks/usePulse'
import { LayoutSettings } from '../shared/layout/LayoutSettings'
import { startUsage, viewing } from '../shared/layout/store'
import { Footer } from './Footer'
import { Header } from './Header'
import { SectionView } from './SectionView'
import type { Section } from './sections'
import { useRoute } from './useRoute'

// Los dos buzones se descargan cuando alguien los abre.
const Mailbox = lazy(() =>
  import('../features/notices/Mailbox').then((m) => ({ default: m.Mailbox })),
)
const Inbox = lazy(() => import('../features/admin/Inbox').then((m) => ({ default: m.Inbox })))

type ClinicProps = {
  me: CurrentUser
  onLogout: () => void
}

/**
 * La web con sesión iniciada. Aquí vive lo que comparten sus tres partes
 * (cabecera, sección abierta y pie): la ruta, el expediente y el campus.
 */
export function Clinic({ me, onLogout }: ClinicProps) {
  const [section, go, param] = useRoute()
  // `#/expediente/<login>` abre el de otra persona; sin login (o con el propio), el tuyo.
  const otherRecord =
    section === 'expediente' && param !== null && param.toLowerCase() !== me.login
      ? param.toLowerCase()
      : null
  // Proyecto con el que se abre terapia o tablón al llegar desde la sala de espera.
  const [focusProject, setFocusProject] = useState<number | null>(null)
  // Cambia al elegir otro campus: todo lo que depende del campus se vuelve a montar.
  const [campusVersion, setCampusVersion] = useState(0)
  const [customizing, setCustomizing] = useState(false)
  // Qué buzón está abierto: el de avisos, o el de escribir a quien administra.
  const [box, setBox] = useState<'notices' | 'inbox' | null>(null)
  const { pulse, refresh } = usePulse()

  useEffect(() => {
    startUsage()
  }, [])

  // El tiempo de uso se apunta a la sección que se está mirando.
  useEffect(() => {
    viewing(section)
  }, [section])

  // Todos los proyectos de la persona (en curso y aprobados). Los usan los
  // selectores de terapia y tablón; se piden una vez y salen de la réplica.
  const projects = useAsync(() => api.getMyProjects(true), [])
  const profile = useAsync(() => api.getProfile(), [campusVersion])

  // El expediente cambia por lo que se hace en otras secciones (fichar, recibir
  // una reacción): al entrar en él se vuelve a pedir, en vez de enseñar el de
  // cuando se abrió la web.
  const reloadProfile = profile.reload

  useEffect(() => {
    if (section === 'expediente') void reloadProfile()
  }, [section, reloadProfile])

  const openSection = useCallback(
    (next: Section, projectId: number | null = null) => {
      setFocusProject(projectId)
      go(next)
    },
    [go],
  )

  const onCampusChange = useCallback(async (campusId: number) => {
    await api.updateSettings({ campusId })
    setCampusVersion((version) => version + 1)
  }, [])

  return (
    <>
      <Header
        me={me}
        section={section}
        admin={profile.data?.admin === true}
        unread={pulse?.unread ?? 0}
        onMailbox={() => {
          setBox('notices')
        }}
        onGo={(next) => {
          openSection(next)
        }}
        onCustomize={() => {
          setCustomizing(true)
        }}
        onInbox={() => {
          setBox('inbox')
        }}
        onLogout={onLogout}
      />

      {/* La red de correcciones necesita sitio: es la única sección a todo lo ancho. */}
      <main className={`container ${section === 'red' || section === 'clicker' ? 'wide' : ''}`}>
        <QuotaNotice status={pulse?.quota ?? null} />
        <BroadcastGate pending={pulse?.broadcasts ?? 0} onChange={refresh} />
        <EasterEgg
          onRed={() => {
            openSection('clicker')
          }}
        />
        <AlertCenter
          me={me.login}
          onGo={(next) => {
            openSection(next)
          }}
        />

        {customizing && (
          <LayoutSettings
            onClose={() => {
              setCustomizing(false)
            }}
          />
        )}

        {/* Con otro campus, la sección se monta de nuevo: también se olvida el proyecto elegido. */}
        <div key={campusVersion}>
          <SectionView
            section={section}
            me={me}
            profile={profile}
            projects={projects.data ?? []}
            focusProject={focusProject}
            otherRecord={otherRecord}
            chatWith={section === 'clusters' && param !== null ? param.toLowerCase() : null}
            onGo={openSection}
          />
        </div>

        <Footer campusId={profile.data?.campusId} onCampusChange={onCampusChange} />

        <Suspense fallback={null}>
          {box === 'notices' && (
            <Mailbox
              onClose={() => {
                setBox(null)
                refresh()
              }}
              onChange={refresh}
              onOpen={(target) => {
                // Lo que te han respondido está en el buzón de incidencias; lo demás, en su sección.
                if (target === 'inbox') {
                  setBox('inbox')
                } else {
                  setBox(null)
                  openSection(target)
                }
              }}
            />
          )}
          {box === 'inbox' && (
            <Inbox
              onClose={() => {
                setBox(null)
                refresh()
              }}
            />
          )}
        </Suspense>
      </main>
    </>
  )
}
