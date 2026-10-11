import { lazy, Suspense, useCallback, useEffect, useState } from 'react'

import type { CurrentUser, ProjectSummary } from '@sanatorio/contracts'

import { AvailabilityToggle } from '../features/peers/AvailabilityToggle'
import { PeerList } from '../features/peers/PeerList'
import { ProjectSelect } from '../features/peers/ProjectSelect'
import { Settings } from '../features/settings/Settings'
import { api } from '../shared/api'
import { useAsync } from '../shared/hooks/useAsync'
import { useI18n } from '../shared/i18n'
import { Avatar } from '../shared/ui/Avatar'
import { Logo } from '../shared/ui/Logo'
import { Nav } from './Nav'
import type { Section } from './sections'
import { useRoute } from './useRoute'

// Solo la portada (la sala de espera) viaja con la web. El resto de secciones se
// descarga cuando alguien las abre: quien entra a mirar quién le puede ayudar no
// paga el calendario, el grafo del tablón ni la física de la red.
const BoardsCalendar = lazy(() =>
  import('../features/boards/BoardsCalendar').then((m) => ({ default: m.BoardsCalendar })),
)
const CalendarPage = lazy(() =>
  import('../features/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })),
)
const DoubtBoard = lazy(() =>
  import('../features/doubts/DoubtBoard').then((m) => ({ default: m.DoubtBoard })),
)
const Guardia = lazy(() => import('../features/help/Guardia').then((m) => ({ default: m.Guardia })))
const Expediente = lazy(() =>
  import('../features/profile/Expediente').then((m) => ({ default: m.Expediente })),
)
const NetworkPage = lazy(() =>
  import('../features/network/NetworkPage').then((m) => ({ default: m.NetworkPage })),
)
const TherapyGroups = lazy(() =>
  import('../features/therapy/TherapyGroups').then((m) => ({ default: m.TherapyGroups })),
)

type ClinicProps = {
  me: CurrentUser
  onLogout: () => void
}

/** La web con sesión iniciada: cabecera, secciones y pie. */
export function Clinic({ me, onLogout }: ClinicProps) {
  const { t } = useI18n()
  const [section, go] = useRoute()
  const [project, setProject] = useState<ProjectSummary | null>(null)
  // Proyecto con el que se abre terapia o tablón al llegar desde la sala de espera.
  const [focusProject, setFocusProject] = useState<number | null>(null)
  // Cambia al elegir otro campus: todo lo que depende del campus se vuelve a montar.
  const [campusVersion, setCampusVersion] = useState(0)

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
    setProject(null)
    setCampusVersion((version) => version + 1)
  }, [])

  const myProjects = projects.data ?? []

  return (
    // La red de correcciones necesita sitio: es la única sección a todo lo ancho.
    <main className={`container ${section === 'red' ? 'wide' : ''}`}>
      <header className="topbar">
        <div className="topbar-brand">
          <Logo
            onMarkClick={() => {
              openSection('expediente')
            }}
            markLabel={t('nav.openRecord')}
            markActive={section === 'expediente'}
          />
        </div>
        <div className="topbar-user">
          <Avatar login={me.login} image={me.image} size={40} />
          <span className="user-login">{me.login}</span>
        </div>
        <AvailabilityToggle
          onTurnedOn={() => {
            openSection('guardia')
          }}
        />
        <button onClick={onLogout}>{t('app.logout')}</button>
      </header>

      <Nav
        section={section}
        onGo={(next) => {
          openSection(next)
        }}
      />

      <div key={campusVersion}>
        <Suspense fallback={<p className="estado">{t('app.loadingSection')}</p>}>
          {section === 'consulta' &&
            (project === null ? (
              <ProjectSelect onSelect={setProject} />
            ) : (
              <>
                <button
                  className="back-btn"
                  onClick={() => {
                    setProject(null)
                  }}
                >
                  {t('app.back')}
                </button>
                <PeerList
                  project={project}
                  onOpenTherapy={() => {
                    openSection('terapia', project.id)
                  }}
                />
              </>
            ))}
          {section === 'terapia' && (
            <TherapyGroups projects={myProjects} initialProject={focusProject} />
          )}
          {section === 'tablon' && <DoubtBoard initialProject={focusProject} />}
          {section === 'guardia' && <Guardia />}
          {section === 'calendario' && (
            <CalendarPage
              onGo={(next) => {
                openSection(next)
              }}
            />
          )}
          {section === 'pizarras' && <BoardsCalendar />}
          {section === 'red' && <NetworkPage me={me} />}
          {section === 'expediente' && <Expediente me={me} profile={profile} />}
        </Suspense>
      </div>

      <footer className="footer">
        <Settings campusId={profile.data?.campusId} onCampusChange={onCampusChange} />
        <p>{t('app.footer')}</p>
      </footer>
    </main>
  )
}
