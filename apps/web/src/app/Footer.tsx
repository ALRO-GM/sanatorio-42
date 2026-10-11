import { lazy, Suspense, useState } from 'react'

import { Settings } from '../features/settings/Settings'
import { useI18n } from '../shared/i18n'

const Inbox = lazy(() => import('../features/admin/Inbox').then((m) => ({ default: m.Inbox })))

type FooterProps = {
  campusId: number | undefined
  onCampusChange: (campusId: number) => Promise<void>
}

/** El pie: idioma, tema y campus, y el buzón de incidencias y sugerencias. */
export function Footer({ campusId, onCampusChange }: FooterProps) {
  const { t } = useI18n()
  const [inbox, setInbox] = useState(false)

  return (
    <footer className="footer">
      <Settings campusId={campusId} onCampusChange={onCampusChange} />
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
  )
}
