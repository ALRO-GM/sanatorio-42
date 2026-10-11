import { lazy, Suspense, useCallback, useEffect, useState } from 'react'

import type { CurrentUser, ProjectSummary } from '@sanatorio/contracts'

import { AlertCenter } from '../features/alerts/AlertCenter'
import { QuotaNotice } from '../features/alerts/QuotaNotice'
import { AvailabilityToggle } from '../features/peers/AvailabilityToggle'
import { PeerList } from '../features/peers/PeerList'
import { ProjectSelect } from '../features/peers/ProjectSelect'
import { Settings } from '../features/settings/Settings'
import { api } from '../shared/api'
import { useAsync } from '../shared/hooks/useAsync'
import { LayoutSettings } from '../shared/layout/LayoutSettings'
import { startUsage, track } from '../shared/layout/store'
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
const PublicRecord = lazy(() =>
  import('../features/profile/PublicRecord').then((m) => ({ default: m.PublicRecord })),
)
const AdminPage = lazy(() =>
  import('../features/admin/AdminPage').then((m) => ({ default: m.AdminPage })),
)
const Inbox = lazy(() => import('../features/admin/Inbox').then((m) => ({ default: m.Inbox })))
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
  const [section, go, param] = useRoute()
  // `#/expediente/<login>` abre el de otra persona; sin login (o con el propio), el tuyo.
  const otherRecord =
    section === 'expediente' && param !== null && param.toLowerCase() !== me.login
      ? param.toLowerCase()
      : null
  const [project, setProject] = useState<ProjectSummary | null>(null)
  // Proyecto con el que se abre terapia o tablón al llegar desde la sala de espera.
  const [focusProject, setFocusProject] = useState<number | null>(null)
  // Cambia al elegir otro campus: todo lo que depende del campus se vuelve a montar.
  const [campusVersion, setCampusVersion] = useState(0)
  const [customizing, setCustomizing] = useState(false)
  const [inbox, setInbox] = useState(false)
  // Al bajar por la página, la cabecera se queda arriba, más estrecha.
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    startUsage()

    const onScroll = (): void => {
      // Con margen entre encoger y volver a crecer, para que no tiemble en el límite.
      setCompact((current) => (current ? window.scrollY > 12 : window.scrollY > 56))
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

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
      <div className={`top-sticky ${compact ? 'compact' : ''}`}>
        <header className="topbar">
          <div className="topbar-brand">
            <Logo
              onMarkClick={() => {
                track('nav.expediente')
                openSection('expediente')
              }}
              markLabel={t('nav.openRecord')}
              markActive={section === 'expediente'}
            />
          </div>
          <div className="topbar-user">
            <Avatar login={me.login} image={me.image} size={compact ? 30 : 40} />
            <span className="user-login">{me.login}</span>
          </div>
          <AvailabilityToggle
            active={section === 'guardia'}
            onOpen={() => {
              track('nav.guardia')
              openSection('guardia')
            }}
            onTurnedOn={() => {
              openSection('guardia')
            }}
          />
          {profile.data?.admin === true && (
            <button
              type="button"
              className={`icon-btn ${section === 'gestion' ? 'active' : ''}`}
              aria-label={t('admin.usage.open')}
              title={t('admin.usage.open')}
              onClick={() => {
                openSection('gestion')
              }}
            >
              📊
            </button>
          )}
          <button
            type="button"
            className="icon-btn"
            aria-label={t('layout.open')}
            title={t('layout.open')}
            onClick={() => {
              setCustomizing(true)
            }}
          >
            ⚙
          </button>
          <button onClick={onLogout}>{t('app.logout')}</button>
        </header>

        <Nav
          section={section}
          onGo={(next) => {
            openSection(next)
          }}
        />
      </div>

      <QuotaNotice />
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
            <TherapyGroups projects={myProjects} initialProject={focusProject} me={me.login} />
          )}
          {section === 'tablon' && <DoubtBoard initialProject={focusProject} />}
          {section === 'guardia' && <Guardia />}
          {section === 'calendario' && (
            <CalendarPage
              me={me.login}
              onGo={(next) => {
                openSection(next)
              }}
            />
          )}
          {section === 'pizarras' && <BoardsCalendar />}
          {section === 'red' && <NetworkPage me={me} />}
          {section === 'gestion' &&
            (profile.data?.admin === true ? (
              <AdminPage />
            ) : (
              <p className="estado">{t('admin.only')}</p>
            ))}
          {section === 'expediente' &&
            (otherRecord === null ? (
              <Expediente me={me} profile={profile} />
            ) : (
              <PublicRecord key={otherRecord} login={otherRecord} />
            ))}
        </Suspense>
      </div>

      <footer className="footer">
        <Settings campusId={profile.data?.campusId} onCampusChange={onCampusChange} />
        <button
          type="button"
          className="link"
          onClick={() => {
            setInbox(true)
          }}
        >
          ✉ {t('inbox.open')}
        </button>
        <p>{t('app.footer')}</p>
        {inbox && (
          <Suspense fallback={null}>
            <Inbox
              onClose={() => {
                setInbox(false)
              }}
            />
          </Suspense>
        )}
      </footer>
    </main>
  )
}
