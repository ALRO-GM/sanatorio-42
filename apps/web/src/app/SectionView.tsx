import { lazy, Suspense, useState } from 'react'

import type { CurrentUser, Profile, ProjectSummary } from '@sanatorio/contracts'

import { PeerList } from '../features/peers/PeerList'
import { ProjectSelect } from '../features/peers/ProjectSelect'
import type { AsyncState } from '../shared/hooks/useAsync'
import { useI18n } from '../shared/i18n'
import type { Section } from './sections'

// Solo la portada (la sala de espera) viaja con la web. El resto de secciones se
// descarga cuando alguien las abre: quien entra a mirar quién le puede ayudar no
// paga el calendario, el grafo del tablón ni la física de la red.
const ClustersPage = lazy(() =>
  import('../features/map/ClustersPage').then((m) => ({ default: m.ClustersPage })),
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
const TherapyGroups = lazy(() =>
  import('../features/therapy/TherapyGroups').then((m) => ({ default: m.TherapyGroups })),
)

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
  /** Con quién abrir el chat directo al entrar en los clusters. */
  chatWith: string | null
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
  chatWith,
  onGo,
}: SectionViewProps) {
  const { t } = useI18n()
  // El proyecto elegido en la sala de espera.
  const [project, setProject] = useState<ProjectSummary | null>(null)

  return (
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
          onGo={(next) => {
            onGo(next)
          }}
        />
      )}
      {section === 'pizarras' && <BoardsCalendar />}
      {section === 'red' && <NetworkPage me={me} />}
      {section === 'clusters' && <ClustersPage me={me.login} initialPeer={chatWith} />}
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
  )
}
