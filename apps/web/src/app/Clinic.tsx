import { lazy, Suspense, useCallback, useEffect, useState } from 'react'

import type { CurrentUser } from '@sanatorio/contracts'

import { BroadcastGate } from '../features/admin/BroadcastGate'
import { LegalGate } from '../features/legal/LegalGate'
import { ReviewGate } from '../features/clicker/ReviewGate'
import { calendarHref } from '../shared/links'
import { HelpGate } from '../features/help/HelpGate'
import { Welcome } from '../features/welcome/Welcome'
import { OtherCampusNotice } from '../features/campus/OtherCampusNotice'
import { FocusDialog } from '../features/focus/FocusDialog'
import { FocusTimer } from '../features/focus/FocusTimer'
import { focusing, loadFocus, useFocus } from '../shared/focus'
import { AlertCenter } from '../features/alerts/AlertCenter'
import { EasterEgg } from '../features/clicker/EasterEgg'
import { QuotaNotice } from '../features/alerts/QuotaNotice'
import { onOpenChat } from '../features/notices/conversations'
import { onOpenCustomize } from '../shared/layout/customize'
import { api } from '../shared/api'
import { useAsync } from '../shared/hooks/useAsync'
import { usePulse } from '../shared/hooks/usePulse'
import { LayoutSettings } from '../shared/layout/LayoutSettings'
import { DetailSelect } from '../shared/ui/DetailSelect'
import { ErrorBoundary } from '../shared/ui/ErrorBoundary'
import { DEFAULT_THEME, useStyle } from '../shared/theme'
import { canUseStyle } from '../themes'
import { RecordStylePicker } from '../features/profile/RecordStylePicker'
import { startUsage, viewing } from '../shared/layout/store'
import { Footer } from './Footer'
import { Header } from './Header'
import { SectionView } from './SectionView'
import { HOME, SECTIONS, hiddenInFocus } from './sections'
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
  // La bienvenida, abierta a mano desde el menú de la cuenta.
  const [welcoming, setWelcoming] = useState(false)
  // Qué buzón está abierto: el de avisos, o el de escribir a quien administra.
  const [box, setBox] = useState<'notices' | 'inbox' | null>(null)
  /** La conversación abierta en el buzón, o `null`. */
  const [chat, setChat] = useState<string | null>(null)

  // Cualquier parte de la web puede pedir que se abra una conversación (un
  // puesto del mapa, un expediente): se abre el buzón por ella.
  useEffect(
    () =>
      onOpenChat((id) => {
        setChat(id)
        setBox('notices')
      }),
    [],
  )
  // «Personalizar» también se abre desde el pie de cada página con bloques.
  useEffect(
    () =>
      onOpenCustomize(() => {
        setCustomizing(true)
      }),
    [],
  )
  const { pulse, refresh } = usePulse()
  const focus = useFocus()
  const concentrated = focusing(focus)

  // En Pomodoro no se queda abierta una sección que no se ha elegido: al
  // empezarlo (o al llegar por un enlace), se vuelve al expediente.
  useEffect(() => {
    if (concentrated && hiddenInFocus(section, focus?.settings.sections ?? [])) go(HOME)
  }, [concentrated, focus, section, go])

  useEffect(() => {
    startUsage()
    // El Pomodoro, si lo había empezado (en esta u otra pestaña).
    void loadFocus()
  }, [])
  const [focusOpen, setFocusOpen] = useState(false)

  // El tiempo de uso se apunta a la sección que se está mirando.
  useEffect(() => {
    viewing(section)
  }, [section])

  // Todos los proyectos de la persona (en curso y aprobados). Los usan los
  // selectores de terapia y tablón; se piden una vez y salen de la réplica.
  const projects = useAsync(() => api.getMyProjects(true), [])
  const profile = useAsync(() => api.getProfile(), [campusVersion])
  const [style, setStyle] = useStyle()

  // Un estilo hecho para otra persona no se queda puesto aunque esté guardado
  // en el navegador (a mano, o de otra cuenta en el mismo equipo).
  useEffect(() => {
    if (!canUseStyle(style, me.login)) setStyle(DEFAULT_THEME.id)
  }, [style, me.login, setStyle])

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
        examLive={pulse?.examLive === true}
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
        onWelcome={() => {
          setWelcoming(true)
        }}
        onFocus={() => {
          setFocusOpen(true)
        }}
        onLogout={onLogout}
      />
      {/* El Pomodoro: el temporizador flota a la vista mientras dura. */}
      <FocusTimer />
      {focusOpen && (
        <FocusDialog
          onClose={() => {
            setFocusOpen(false)
          }}
        />
      )}

      {/* La red de correcciones necesita sitio: es la única sección a todo lo ancho. */}
      <main className={`container ${section === 'red' || section === 'clicker' ? 'wide' : ''}`}>
        <QuotaNotice status={pulse?.quota ?? null} />
        <OtherCampusNotice campusId={me.campusId} />
        <LegalGate />
        <BroadcastGate pending={pulse?.broadcasts ?? 0} onChange={refresh} />
        <ReviewGate pending={pulse?.clickerReviews ?? 0} onChange={refresh} />
        {/* Valorar puede esperar: en Pomodoro no se interrumpe, sale al acabar. */}
        <HelpGate pending={concentrated ? 0 : (pulse?.help ?? 0)} onChange={refresh} />
        <Welcome
          open={welcoming}
          onGo={(next) => {
            openSection(next)
          }}
          onClose={() => {
            setWelcoming(false)
          }}
        />
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
            me={me.login}
            onClose={() => {
              setCustomizing(false)
            }}
            interfaceMode={<DetailSelect />}
            recordStyle={
              profile.data !== undefined && (
                <RecordStylePicker
                  me={me.login}
                  current={profile.data.recordStyle}
                  onSaved={() => void reloadProfile()}
                />
              )
            }
          />
        )}

        {/* Con otro campus, la sección se monta de nuevo: también se olvida el proyecto elegido. */}
        <div key={campusVersion}>
          <ErrorBoundary key={section} where={section}>
            <SectionView
              section={section}
              me={me}
              profile={profile}
              projects={projects.data ?? []}
              focusProject={focusProject}
              otherRecord={otherRecord}
              param={param}
              onGo={openSection}
            />
          </ErrorBoundary>
        </div>

        <Footer campusId={profile.data?.campusId} onCampusChange={onCampusChange} />

        <Suspense fallback={null}>
          {box === 'notices' && (
            <Mailbox
              me={me.login}
              chat={chat}
              onChat={setChat}
              onClose={() => {
                setBox(null)
                setChat(null)
                refresh()
              }}
              onChange={refresh}
              onOpen={(target, event) => {
                // Lo que te han respondido está en el buzón de incidencias; lo demás, en su sección.
                if (target === 'inbox') {
                  setBox('inbox')
                } else if (target === 'calendario' && event !== undefined && event !== null) {
                  // Al calendario, con el evento abierto.
                  setBox(null)
                  window.location.hash = calendarHref(event)
                } else if (target !== 'conversations') {
                  // Las conversaciones las abre el propio buzón, sin salir de él.
                  setBox(null)
                  openSection(target)
                }
              }}
            />
          )}
          {box === 'inbox' && (
            <Inbox
              section={section}
              sections={SECTIONS}
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
