/**
 * Slack: un mensaje a un canal por un «incoming webhook». Solo si quien
 * despliega lo configura (`SLACK_WEBHOOK_URL`); si no, no hace nada. Un fallo
 * de Slack nunca rompe lo que lo pidió: se apunta en el registro y ya.
 */

const TIMEOUT_MS = 5_000

export type SlackPoster = (text: string) => Promise<void>

export function createSlackPoster(
  url: string,
  log: (message: string) => void = () => undefined,
): SlackPoster | null {
  if (url === '') return null

  return async (text) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })

      if (!response.ok) log(`Slack respondió ${response.status}`)
    } catch (error) {
      log(`Slack no respondió: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
