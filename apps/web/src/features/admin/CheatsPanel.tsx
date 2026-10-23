import { useState } from 'react'

import type { ClickerCheatEntry, ClickerCheater } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { DataTable } from '../../shared/ui/DataTable'
import type { Column } from '../../shared/ui/DataTable'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { useConfirm } from '../../shared/ui/useConfirm'
import { PillGroup } from '../../shared/ui/PillGroup'
import { Icon } from '../../shared/ui/Icon'
import { directChatId, openChat } from '../notices/conversations'
import { Figure } from './Figure'

const DAY = 86_400_000

type CheatsPanelProps = {
  /** Quien administra: para abrir una conversación directa. */
  me: string
  /** Ver la partida de alguien (en la vista de uso). */
  onWatch: (login: string) => void
}

/** La pastilla «de cualquier motivo» del filtro; no choca con los motivos, que son palabras. */
const ANY_WHY = '*'

/**
 * Las trampas de Code Clicker: quién las ha hecho, cuándo, cómo se vieron y
 * qué se le requisó, con lo que se puede hacer con cada cual (escribirle, ver
 * su partida, indultar) y un comunicado solo para quienes salen en la lista.
 */
export function CheatsPanel({ me, onWatch }: CheatsPanelProps) {
  const { t } = useI18n()
  const { data, error, loading, reload } = useAsync(() => api.getClickerCheats(), [])
  const [why, setWhy] = useState<string | null>(null)
  const [writing, setWriting] = useState(false)
  const action = useAction()
  const confirm = useConfirm()
  const { compact: compactOf, dateTime } = useFormat()
  const compact = { format: compactOf }
  const when = { format: dateTime }
  const date = (iso: string): string => when.format(new Date(iso))
  const whyText = (value: string): string => t(`admin.clicker.why.${value}`)

  if (loading && data === undefined) return <p className="estado">{t('app.loading')}</p>
  if (data === undefined) return <ErrorNote error={error} onRetry={() => void reload()} />

  const entries = why === null ? data.entries : data.entries.filter((entry) => entry.why === why)
  const people =
    why === null ? data.people : data.people.filter((person) => person.whys.includes(why))
  const live = data.entries.filter((entry) => entry.pardonedAt === null)
  const recent = live.filter((entry) => Date.now() - Date.parse(entry.at) < 30 * DAY)
  const whys = [...new Set(data.entries.map((entry) => entry.why))]

  const pardon = async (id: number): Promise<void> => {
    if (
      !(await confirm.ask({
        body: t('admin.clicker.pardonAsk'),
        okText: t('admin.clicker.pardon'),
      }))
    )
      return
    if (await action.run(() => api.pardonClickerCheat(id))) await reload()
  }

  const peopleColumns: Column<ClickerCheater>[] = [
    {
      id: 'login',
      label: t('admin.stats.person'),
      cell: (row) => row.login,
      sort: (row) => row.login,
      first: 'asc',
    },
    {
      id: 'times',
      label: t('admin.cheats.times'),
      cell: (row) => row.times,
      sort: (row) => row.times,
    },
    {
      id: 'last',
      label: t('admin.cheats.last'),
      cell: (row) => date(row.last),
      sort: (row) => row.last,
    },
    {
      id: 'first',
      label: t('admin.cheats.first'),
      cell: (row) => date(row.first),
      sort: (row) => row.first,
    },
    {
      id: 'whys',
      label: t('admin.cheats.whys'),
      cell: (row) => row.whys.map(whyText).join(', '),
      sort: (row) => row.whys.map(whyText).join(', '),
      first: 'asc',
    },
    {
      id: 'seized',
      label: t('admin.cheats.seized'),
      cell: (row) => (row.seized > 0 ? compact.format(row.seized) : '—'),
      sort: (row) => row.seized,
    },
    {
      id: 'wealth',
      label: t('admin.clicker.wealth'),
      cell: (row) => (row.wealth > 0 ? compact.format(row.wealth) : '—'),
      sort: (row) => row.wealth,
    },
    {
      id: 'review',
      label: t('admin.cheats.review'),
      cell: (row) => (row.review === null ? '—' : t(`admin.cheats.review.${row.review}`)),
      sort: (row) => row.review,
    },
    {
      id: 'actions',
      label: '',
      cell: (row) => (
        <span className="row-actions">
          <button
            type="button"
            className="link"
            title={t('record.write', { login: row.login })}
            onClick={() => {
              openChat(directChatId(me, row.login))
            }}
          >
            <Icon name="chat" size={14} /> {t('clusters.write')}
          </button>
          <button
            type="button"
            className="link"
            onClick={() => {
              onWatch(row.login)
            }}
          >
            {t('admin.clicker.watch')}
          </button>
        </span>
      ),
    },
  ]

  const logColumns: Column<ClickerCheatEntry>[] = [
    { id: 'at', label: t('admin.cheats.when'), cell: (row) => date(row.at), sort: (row) => row.at },
    {
      id: 'login',
      label: t('admin.stats.person'),
      cell: (row) => row.login,
      sort: (row) => row.login,
      first: 'asc',
    },
    {
      id: 'how',
      label: t('admin.cheats.how'),
      cell: (row) => t(`admin.cheats.how.${row.how}`),
      sort: (row) => row.how,
      first: 'asc',
    },
    {
      id: 'why',
      label: t('admin.clicker.why'),
      cell: (row) => (row.note === null ? whyText(row.why) : `${whyText(row.why)}: «${row.note}»`),
      sort: (row) => whyText(row.why),
      first: 'asc',
    },
    {
      id: 'total',
      label: t('admin.clicker.lines'),
      cell: (row) => (row.total === null ? '—' : compact.format(row.total)),
      sort: (row) => row.total,
    },
    {
      id: 'perSecond',
      label: t('admin.clicker.perSecond'),
      cell: (row) => (row.perSecond === null ? '—' : compact.format(row.perSecond)),
      sort: (row) => row.perSecond,
    },
    {
      id: 'seized',
      label: t('admin.cheats.seized'),
      cell: (row) => (row.seized > 0 ? compact.format(row.seized) : '—'),
      sort: (row) => row.seized,
    },
    {
      id: 'state',
      label: t('admin.cheats.state'),
      cell: (row) =>
        row.pardonedAt !== null ? (
          t('admin.cheats.pardoned', { date: date(row.pardonedAt) })
        ) : row.copyId !== null ? (
          <button
            type="button"
            className="link"
            disabled={action.busy}
            onClick={() => void pardon(row.copyId ?? 0)}
          >
            {t('admin.clicker.pardon')}
          </button>
        ) : (
          t('admin.cheats.standing')
        ),
      sort: (row) => (row.pardonedAt === null ? 0 : 1),
    },
  ]

  return (
    <>
      <div className="stat-cards">
        <Figure label={t('admin.cheats.people')} value={String(data.people.length)} />
        <Figure label={t('admin.cheats.total')} value={String(live.length)} />
        <Figure label={t('admin.cheats.recent')} value={String(recent.length)} />
        <Figure
          label={t('admin.cheats.pardonedCount')}
          value={String(data.entries.length - live.length)}
        />
        <Figure
          label={t('admin.cheats.seized')}
          value={compact.format(live.reduce((sum, entry) => sum + entry.seized, 0))}
        />
      </div>

      {whys.length > 1 && (
        <PillGroup
          options={[ANY_WHY, ...whys]}
          value={why ?? ANY_WHY}
          onChange={(option) => {
            setWhy(option === ANY_WHY ? null : option)
          }}
          label={t('admin.clicker.why')}
          text={(option) => (option === ANY_WHY ? t('admin.inbox.allKinds') : whyText(option))}
        />
      )}

      <article className="card">
        <div className="card-head-row">
          <span className="eyebrow">{t('admin.cheats.who')}</span>
          {people.length > 0 && (
            <button
              type="button"
              className="pill"
              onClick={() => {
                setWriting((open) => !open)
              }}
            >
              <Icon name="buzon" size={14} /> {t('admin.cheats.writeAll', { n: people.length })}
            </button>
          )}
        </div>
        {writing && (
          <WriteToCheaters
            logins={people.map((person) => person.login)}
            onSent={() => {
              setWriting(false)
            }}
          />
        )}
        {people.length === 0 ? (
          <p className="estado">{t('admin.cheats.none')}</p>
        ) : (
          <DataTable
            id="clicker-cheaters"
            rows={people}
            columns={peopleColumns}
            rowKey={(row) => row.login}
          />
        )}
      </article>

      <article className="card">
        <span className="eyebrow">{t('admin.cheats.log')}</span>
        <ErrorNote error={action.error} />
        {entries.length === 0 ? (
          <p className="estado">{t('admin.cheats.none')}</p>
        ) : (
          <DataTable
            id="clicker-cheat-log"
            rows={entries}
            columns={logColumns}
            rowKey={(row) => String(row.id)}
            rowClass={(row) => (row.pardonedAt === null ? '' : 'faded')}
          />
        )}
      </article>
      {confirm.dialog}
    </>
  )
}

/** Un comunicado solo para quienes salen en la lista de trampas. */
function WriteToCheaters({ logins, onSent }: { logins: string[]; onSent: () => void }) {
  const { t } = useI18n()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const { busy, error, run } = useAction()

  return (
    <form
      className="cheat-write"
      onSubmit={(event) => {
        event.preventDefault()
        void run(async () => {
          await api.sendBroadcast({ title, body, audience: { kind: 'logins', logins } })
          onSent()
        })
      }}
    >
      <p className="hint">{t('admin.cheats.writeTo', { logins: logins.join(', ') })}</p>
      <label>
        {t('admin.cast.title')}
        <input
          value={title}
          required
          maxLength={120}
          onChange={(event) => {
            setTitle(event.target.value)
          }}
        />
      </label>
      <label>
        {t('admin.cast.body')}
        <textarea
          value={body}
          required
          rows={4}
          maxLength={4000}
          onChange={(event) => {
            setBody(event.target.value)
          }}
        />
      </label>
      <ErrorNote error={error} />
      <div className="actions">
        <button type="submit" className="primary small" disabled={busy}>
          {t('admin.cast.send')}
        </button>
      </div>
    </form>
  )
}
