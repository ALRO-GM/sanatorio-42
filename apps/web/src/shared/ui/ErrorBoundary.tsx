import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

import { reportError } from '../errors'
import { useI18n } from '../i18n'

type Props = {
  /** Dónde está (la sección): va en el aviso que llega al servidor. */
  where: string
  children: ReactNode
}

/**
 * Si algo de dentro falla al pintarse, en vez de la pantalla en blanco sale
 * «esta parte ha fallado» con un botón para volver a probar, y el fallo se
 * manda al servidor (`reportError`). El resto de la web sigue funcionando.
 */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(this.props.where, error, info.componentStack ?? undefined)
  }

  override render(): ReactNode {
    return this.state.failed ? (
      <Failed
        onRetry={() => {
          this.setState({ failed: false })
        }}
      />
    ) : (
      this.props.children
    )
  }
}

function Failed({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n()

  return (
    <p className="estado error" role="alert">
      {t('app.sectionFailed')}{' '}
      <button type="button" className="pill" onClick={onRetry}>
        {t('app.retry')}
      </button>
    </p>
  )
}
