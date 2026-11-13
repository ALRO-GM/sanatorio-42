import { lazy, Suspense, useCallback, useState } from 'react'

import type { CurrentUser, Profile, ProjectSummary } from '@sanatorio/contracts'

import { PeerList } from '../features/peers/PeerList'
import { ProjectSelect } from '../features/peers/ProjectSelect'
import type { AsyncState } from '../shared/hooks/useAsync'
import { poolAllows, usePoolAccess } from '../shared/pool'
import { waitingHref } from '../shared/links'
import { useI18n } from '../shared/i18n'
import type { Section } from './sections'
import { useEgg } from '../features/clicker/egg'

// Solo la portada (la sala de espera) viaja con la web. El resto de secciones se
// descarga cuando alguien las abre: quien entra a mirar quién le puede ayudar no
// paga el calendario, el grafo del tablón ni la física de la red.
const LegalPage = lazy(() =>
  import('../features/legal/LegalPage').then((m) => ({ default: m.LegalPage })),
)
const ClustersPage = lazy(() =>
  import('../features/map/ClustersPage').then((m) => ({ default: m.ClustersPage })),
)
const CodeClicker = lazy(() =>
  import('../features/clicker/CodeClicker').then((m) => ({ default: m.CodeClicker })),
)
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
const NetworkPage = lazy(() =>
  import('../features/network/NetworkPage').then((m) => ({ default: m.NetworkPage })),
)
const SeatsPage = lazy(() =>
  import('../features/network/SeatsPage').then((m) => ({ default: m.SeatsPage })),
)
const GitCoursePage = lazy(() =>
  import('../features/gitcourse/GitCoursePage').then((m) => ({ default: m.GitCoursePage })),
)
const ShellCoursePage = lazy(() =>
  import('../features/shellcourse/ShellCoursePage').then((m) => ({ default: m.ShellCoursePage })),
)
const DockerCoursePage = lazy(() =>
  import('../features/dockercourse/DockerCoursePage').then((m) => ({
    default: m.DockerCoursePage,
  })),
)
const K8sCoursePage = lazy(() =>
  import('../features/k8scourse/K8sCoursePage').then((m) => ({
    default: m.K8sCoursePage,
  })),
)
const NetCoursePage = lazy(() =>
  import('../features/netcourse/NetCoursePage').then((m) => ({
    default: m.NetCoursePage,
  })),
)
const RagCoursePage = lazy(() =>
  import('../features/ragcourse/RagCoursePage').then((m) => ({
    default: m.RagCoursePage,
  })),
)
const FocusPage = lazy(() =>
  import('../features/focus/FocusPage').then((m) => ({ default: m.FocusPage })),
)
// Los exámenes también perezosos: son ~800 líneas que no toca cargar al entrar.
const ExamsPage = lazy(() =>
  import('../features/exams/ExamsPage').then((m) => ({ default: m.ExamsPage })),
)
const DropoutPage = lazy(() =>
  import('../features/dropout/DropoutPage').then((m) => ({ default: m.DropoutPage })),
)
const ProgressPage = lazy(() =>
  import('../features/stats/ProgressPage').then((m) => ({ default: m.ProgressPage })),
)
// El Avance de un piscinero: la piscina, no el common core (`docs/piscineros.md`).
const PiscineProgressPage = lazy(() =>
  import('../features/stats/PiscineProgressPage').then((m) => ({
    default: m.PiscineProgressPage,
  })),
)
const HelpStatsPage = lazy(() =>
  import('../features/stats/HelpStatsPage').then((m) => ({ default: m.HelpStatsPage })),
)
const NotGamesPage = lazy(() =>
  import('../features/notgames/NotGamesPage').then((m) => ({ default: m.NotGamesPage })),
)
const AgendaPage = lazy(() =>
  import('../features/agenda/AgendaPage').then((m) => ({ default: m.AgendaPage })),
)
const TherapyGroups = lazy(() =>
  import('../features/therapy/TherapyGroups').then((m) => ({ default: m.TherapyGroups })),
)

/** El proyecto que pide la dirección (`#/consulta/1314` → `1314`), o `null`. */
function projectOf(param: string | null): number | null {
  return param !== null && /^\d{1,9}$/.test(param) ? Number(param) : null
}

type SectionViewProps = {
  section: Section
  me: CurrentUser
  profile: AsyncState<Profile>
  /** Todos los proyectos de la persona, para los selectores de terapia. */
  projects: ProjectSummary[]
  /** Proyecto con el que se abre terapia o tablón al llegar desde la sala de espera. */
  focusProject: number | null
  /** El login de `#/expediente/<login>` si es de otra persona; `null` para el propio. */
  otherRecord: string | null
  /** Lo que va detrás de la sección en la dirección (`#/notgames/12` → `12`). */
  param: string | null
  /**
   * El proyecto que se dejó abierto en Peer to peer: quien se va a otra sección
   * (a apuntarse a un sprint, a mirar el calendario) y vuelve sigue en quién le
   * ayuda, no en la lista. Lo guarda `Clinic`, que no se desmonta al cambiar.
   */
  openProject: number | null
  onOpenProject: (project: number | null) => void
  onGo: (section: Section, projectId?: number | null) => void
}

/** La sección abierta. Cada una se descarga la primera vez que se entra en ella. */
export function SectionView({
  section,
  me,
  profile,
  projects,
  focusProject,
  otherRecord,
  param,
  openProject,
  onOpenProject,
  onGo,
}: SectionViewProps) {
  const { t } = useI18n()
  const egg = useEgg()
  const { pool } = usePoolAccess()
  // El proyecto elegido en la sala de espera.
  const [project, setProject] = useState<ProjectSummary | null>(null)
  // Con un solo proyecto en curso no hay nada que elegir: se abre directamente.
  // Al volver a la lista, ya no (si no, «Volver» llevaría otra vez al mismo).
  const [autoPick, setAutoPick] = useState(true)
  // Al llegar, el de la dirección o el que se dejó abierto. Va en la dirección
  // (sin otra entrada en el historial) para que un enlace o una recarga lo abran.
  const wanted = autoPick ? (projectOf(param) ?? openProject) : null
  const pick = useCallback(
    (chosen: ProjectSummary) => {
      onOpenProject(chosen.id)
      setProject(chosen)
      window.location.replace(waitingHref(chosen.id))
    },
    [onOpenProject],
  )

  return (
    <Suspense fallback={<p className="estado">{t('app.loadingSection')}</p>}>
      {section === 'consulta' &&
        (project === null ? (
          <ProjectSelect onSelect={pick} autoPick={autoPick} wanted={wanted} />
        ) : (
          <>
            <button
              className="back-btn"
              onClick={() => {
                onOpenProject(null)
                setAutoPick(false)
                setProject(null)
                window.location.replace(waitingHref())
              }}
            >
              {t('app.back')}
            </button>
            <PeerList
              project={project}
              onOpenTherapy={() => {
                onGo('terapia', project.id)
              }}
            />
          </>
        ))}
      {section === 'terapia' && (
        <TherapyGroups projects={projects} initialProject={focusProject} me={me.login} />
      )}
      {section === 'tablon' && <DoubtBoard initialProject={focusProject} />}
      {section === 'guardia' && <Guardia />}
      {section === 'calendario' && (
        <CalendarPage
          me={me.login}
          focus={param}
          onGo={(next) => {
            onGo(next)
          }}
        />
      )}
      {section === 'pizarras' && <BoardsCalendar />}
      {section === 'notgames' && <NotGamesPage me={me.login} room={param} />}
      {section === 'estadisticas' && <HelpStatsPage me={me.login} />}
      {section === 'red' && <NetworkPage me={me} />}
      {section === 'asientos' && <SeatsPage me={me.login} image={me.image} />}
      {section === 'cursogit' && <GitCoursePage me={me.login} />}
      {section === 'cursoshell' && <ShellCoursePage />}
      {section === 'cursodocker' && <DockerCoursePage />}
      {section === 'cursok8s' && <K8sCoursePage />}
      {section === 'cursonet' && <NetCoursePage />}
      {section === 'cursorag' && <RagCoursePage />}
      {section === 'pomodoro' && <FocusPage />}
      {section === 'avance' &&
        (pool ? (
          <PiscineProgressPage me={me.login} />
        ) : (
          <ProgressPage me={me.login} image={me.image} />
        ))}
      {section === 'agenda' && (
        <AgendaPage
          me={me.login}
          onGo={(next, projectId) => {
            onGo(next, projectId ?? null)
          }}
        />
      )}
      {/* Quien eligió la roja lleva el juego puesto en toda la web: fuera de su
          sección sigue corriendo y solo enseña una ventanita. Con su propia
          espera, para que al cargarse no tape la sección que se está mirando. */}
      {egg.pill === 'red' && (
        <Suspense fallback={null}>
          <CodeClicker
            me={me.login}
            background={section !== 'clicker'}
            onOpen={() => {
              onGo('clicker')
            }}
            onExit={() => {
              onGo('expediente')
            }}
          />
        </Suspense>
      )}
      {/* Para quien no eligió la roja, esta sección no existe. */}
      {section === 'clicker' && egg.pill !== 'red' && egg.ready && (
        <p className="estado">{t('error.404')}</p>
      )}
      {section === 'clusters' && <ClustersPage me={me.login} />}
      {section === 'examenes' && <ExamsPage />}
      {section === 'abandono' && <DropoutPage />}
      {section === 'privacidad' && <LegalPage signedIn />}
      {section === 'gestion' &&
        (profile.data?.admin === true ? (
          <AdminPage campusId={profile.data.campusId} me={me.login} />
        ) : (
          <p className="estado">{t('admin.only')}</p>
        ))}
      {section === 'expediente' &&
        (!poolAllows('expediente') ? (
          <p className="estado">{t('pool.home')}</p>
        ) : otherRecord === null ? (
          <Expediente me={me} profile={profile} />
        ) : (
          <PublicRecord key={otherRecord} login={otherRecord} me={me.login} />
        ))}
    </Suspense>
  )
}
