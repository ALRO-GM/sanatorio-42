import { useCallback, useEffect, useState } from 'react'

import type { CurrentUser, ProjectSummary } from '@sanatorio/contracts'

import { BoardsCalendar } from '../features/boards/BoardsCalendar'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { DoubtBoard } from '../features/doubts/DoubtBoard'
import { Guardia } from '../features/help/Guardia'
import { AvailabilityToggle } from '../features/peers/AvailabilityToggle'
import { PeerList } from '../features/peers/PeerList'
import { ProjectSelect } from '../features/peers/ProjectSelect'
import { Expediente } from '../features/profile/Expediente'
import { Settings } from '../features/settings/Settings'
import { TherapyGroups } from '../features/therapy/TherapyGroups'
import { api } from '../shared/api'
import { useAsync } from '../shared/hooks/useAsync'
import { useI18n } from '../shared/i18n'
import { Avatar } from '../shared/ui/Avatar'
import { Logo } from '../shared/ui/Logo'
import { Nav } from './Nav'
import type { Section } from './sections'
import { useRoute } from './useRoute'

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
    <main className="container">
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
        {section === 'expediente' && <Expediente me={me} profile={profile} />}
      </div>

      <footer className="footer">
        <Settings campusId={profile.data?.campusId} onCampusChange={onCampusChange} />
        <p>{t('app.footer')}</p>
      </footer>
    </main>
  )
}
