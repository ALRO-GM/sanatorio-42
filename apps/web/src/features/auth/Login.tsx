import { useI18n } from '../../shared/i18n'
import { Logo } from '../../shared/ui/Logo'
import { LangSelect } from '../settings/LangSelect'
import { ThemeSelect } from '../settings/ThemeSelect'
import { Icon } from '../../shared/ui/Icon'
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
  const { t } = useI18n()

  return (
    <main className="center">
      <Logo />
      <h1>Sanatorio 42</h1>
      {notice !== null && <p className="estado aviso">{notice}</p>}
      <p>{t('login.pitch')}</p>
      <button className="primary" onClick={onLogin}>
        {t('login.button')}
      </button>
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
        <a className="link" href="#/validar">
          {t('login.staff')}
        </a>
        <p>{t('app.footer')}</p>
      </footer>
    </main>
  )
}
