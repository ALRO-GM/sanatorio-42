import { useI18n } from '../../shared/i18n'
import { Logo } from '../../shared/ui/Logo'
import { LangSelect } from '../../shared/ui/LangSelect'
import { ThemeSelect } from '../../shared/ui/ThemeSelect'
import { Icon } from '../../shared/ui/Icon'
import { MadeFor } from '../../shared/ui/MadeFor'
import type { IconName } from '../../shared/ui/Icon'

type LoginProps = {
  onLogin: () => void
  /** Aviso sobre un intento anterior (permiso denegado, error de 42). */
  notice: string | null
}

const STEPS: readonly { icon: IconName; title: string; text: string }[] = [
  { icon: 'consulta', title: 'login.step1', text: 'login.step1d' },
  { icon: 'visto', title: 'login.step2', text: 'login.step2d' },
  { icon: 'corazon', title: 'login.step3', text: 'login.step3d' },
] as const

export function Login({ onLogin, notice }: LoginProps) {
  const { t, lang } = useI18n()

  return (
    <main className="center">
      <Logo />
      <h1>Peer4U</h1>
      {notice !== null && <p className="estado aviso">{notice}</p>}
      <p>{t('login.pitch')}</p>
      <button className="primary" onClick={onLogin}>
        {t('login.button')}
      </button>
      {/* Quien no es de 42 no puede entrar: que pueda al menos ver cómo es. */}
      {import.meta.env.VITE_DEMO !== 'true' && (
        <a className="link" href="/demo/">
          {t('login.demo')}
        </a>
      )}
      <section className="howto">
        <h2>{t('login.how')}</h2>
        <div className="steps">
          {STEPS.map((step) => (
            <div key={step.title} className="step-card">
              <span className="step-emoji" aria-hidden="true">
                <Icon name={step.icon} size={30} />
              </span>
              <strong>{t(step.title)}</strong>
              <p>{t(step.text)}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="footer">
        <LangSelect />
        <ThemeSelect />
        {/* La portada pública de su idioma: qué es Peer4U, para quien no lo sabe. */}
        <a className="link" href={`/${lang}/`}>
          {t('login.about')}
        </a>
        <a className="link" href="#/validar">
          {t('login.staff')}
        </a>
        <a className="link" href="#/privacidad">
          {t('legal.link')}
        </a>
        <p>
          <MadeFor />
        </p>
      </footer>
    </main>
  )
}
