/**
 * Slack: lo que se manda al canal del staff no puede llevar menciones que
 * suenen a todo el mundo, porque parte del texto lo escribe cualquiera.
 */
import { describe, expect, it, vi } from 'vitest'

import { createSlackPoster, escapeSlack } from '../../src/integrations/slack.js'

describe('aviso a Slack', () => {
  it('escapa lo que Slack interpreta, y conserva el resto', () => {
    expect(escapeSlack('<!channel> hola <@U1> & *negrita*')).toBe(
      '&lt;!channel&gt; hola &lt;@U1&gt; &amp; *negrita*',
    )
  })

  it('manda el texto escapado y no rompe a quien lo pidió si Slack falla', async () => {
    const sent: string[] = []
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      sent.push(typeof init?.body === 'string' ? init.body : '')

      return new Response('', { status: 500 })
    })

    vi.stubGlobal('fetch', fetchMock)

    const log = vi.fn()
    const post = createSlackPoster('https://hooks.slack.com/x', log)

    expect(post).not.toBeNull()
    await post?.('Avería en c3 <!here>')
    expect(JSON.parse(sent[0] ?? '{}')).toEqual({ text: 'Avería en c3 &lt;!here&gt;' })
    expect(log).toHaveBeenCalledWith('Slack respondió 500')
    expect(createSlackPoster('')).toBeNull()

    vi.unstubAllGlobals()
  })
})
