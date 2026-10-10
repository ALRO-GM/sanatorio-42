import { useI18n } from '../../shared/i18n'
import { Logo } from '../../shared/ui/Logo'
import { LangSelect } from '../settings/LangSelect'

type LoginProps = {
  onLogin: () => void
  /** Aviso sobre un intento anterior (permiso denegado, error de 42). */
  notice: string | null
}

const STEPS = [
  { emoji: '🩺', title: 'login.step1', text: 'login.step1d' },
  { emoji: '👀', title: 'login.step2', text: 'login.step2d' },
  { emoji: '🤝', title: 'login.step3', text: 'login.step3d' },
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
                {step.emoji}
              </span>
              <strong>{t(step.title)}</strong>
              <p>{t(step.text)}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="footer">
        <LangSelect />
        <p>{t('app.footer')}</p>
      </footer>
    </main>
  )
}
