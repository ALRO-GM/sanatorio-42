import type { CourseCertificate } from '@sanatorio/contracts'

import { api } from '../api'
import { useAsync } from '../hooks/useAsync'
import { useI18n } from '../i18n'
import { useFormat } from '../i18n/useFormat'
import { Icon } from '../ui/Icon'
import { clock, starText } from './Stars'

/** Los textos de cada curso (escritos enteros: así la tabla sabe que se usan). */
const TEXTS = {
  shell: { title: 'shell.certs.title', name: 'shell.certs.name' },
  docker: { title: 'docker.certs.title', name: 'docker.certs.name' },
} as const

/**
 * Los niveles certificados de un curso (jefes finales superados). Sale en el
 * curso y en el perfil; por eso vive en `shared/`.
 */
export function Certificates({
  certificates,
  course = 'shell',
}: {
  certificates: CourseCertificate[]
  /** De qué curso son (sus textos: `shell.certs.*`, `docker.certs.*`). */
  course?: 'shell' | 'docker'
}) {
  const { t } = useI18n()
  const format = useFormat()

  if (certificates.length === 0) return null

  return (
    <ul className="course-certificates" aria-label={t(TEXTS[course].title)}>
      {certificates.map((cert) => (
        <li key={cert.tier} className={`course-certificate tier-${cert.tier}`}>
          <Icon name="medalla" size={22} />
          <span>
            <strong>{t(TEXTS[course].name, { tier: t(`shell.tier.${cert.tier}`) })}</strong>
            <small>
              <span className="course-stars">{starText(cert.stars)}</span> {clock(cert.seconds)}
              {cert.at === '' ? '' : ` · ${format.date(cert.at, 'medium')}`}
            </small>
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Los certificados de shell de quien mira, para su perfil (nada si aún no tiene). */
export function MyShellCertificates() {
  const course = useAsync(() => api.getShellCourse(), [])

  return <Certificates certificates={course.data?.certificates ?? []} />
}

/** Los certificados de Docker de quien mira, para su perfil (nada si aún no tiene). */
export function MyDockerCertificates() {
  const course = useAsync(() => api.getDockerCourse(), [])

  return <Certificates certificates={course.data?.certificates ?? []} course="docker" />
}
