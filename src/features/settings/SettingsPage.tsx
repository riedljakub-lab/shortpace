import { useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import { useProfile } from '../../profile/profileContext'
import { useRuns } from '../../runs/runsContext'
import { backupFileName, buildBackup, parseBackup, type ImportResult } from '../../storage/backup'
import { useTheme } from '../../theme/themeContext'
import { EMPTY_WALLET } from '../../domain/wallet'
import { useWallet } from '../../wallet/walletContext'
import { Button } from '../../ui/Button'
import { downloadTextFile } from '../../ui/download'
import { Notice } from '../../ui/Notice'

type ReadyImport = Extract<ImportResult, { ok: true }>

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function formatExportDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? 'an unknown date'
    : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        date,
      )
}

export function SettingsPage() {
  const { profile, saveProfile, deleteProfile } = useProfile()
  const { runs, replaceRuns } = useRuns()
  const { preference, setPreference } = useTheme()
  const { wallet, saveWallet } = useWallet()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<ReadyImport | null>(null)
  const [message, setMessage] = useState<{ tone: 'info' | 'warning'; text: string } | null>(null)

  function handleExport() {
    const backup = buildBackup({ profile, runs, theme: preference, wallet })
    downloadTextFile(backupFileName(), JSON.stringify(backup, null, 2))
    setMessage({ tone: 'info', text: `Backup downloaded with ${plural(runs.length, 'run')}.` })
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // lets you pick the same file again
    if (!file) return
    const result = parseBackup(await file.text())
    setPending(result.ok ? result : null)
    setMessage(result.ok ? null : { tone: 'warning', text: result.error })
  }

  function applyImport() {
    if (!pending) return
    const {
      profile: importedProfile,
      runs: importedRuns,
      theme,
      wallet: importedWallet,
    } = pending.data
    if (importedProfile) saveProfile(importedProfile)
    else deleteProfile()
    replaceRuns(importedRuns)
    saveWallet(importedWallet)
    setPreference(theme)
    setPending(null)
    setMessage({ tone: 'info', text: `Imported ${plural(importedRuns.length, 'run')}.` })
  }

  function deleteAll() {
    const ok = window.confirm(
      'Delete your profile, all runs and shop purchases from this browser? This can’t be undone. Export a backup first if you might want them back.',
    )
    if (!ok) return
    replaceRuns([])
    saveWallet(EMPTY_WALLET)
    deleteProfile()
    navigate('/onboarding', { replace: true })
  }

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>

      <section aria-labelledby="data-heading" className="flex flex-col gap-4">
        <h2 id="data-heading" className="text-xl font-bold tracking-tight">
          Your data
        </h2>
        <p className="text-muted">
          Everything stays in this browser. Nothing is sent anywhere. Export a backup to keep it
          safe or to move to another device.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleExport}>Export backup</Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Import backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            aria-label="Choose a ShortPace backup file"
            className="sr-only"
            tabIndex={-1}
            onChange={handleFile}
          />
        </div>

        {pending ? (
          <Notice tone="warning">
            <div className="flex flex-col gap-3">
              <p>
                <strong>Replace your data?</strong> This backup from{' '}
                {formatExportDate(pending.exportedAt)} has{' '}
                {pending.data.profile ? 'a profile' : 'no profile'} and{' '}
                {plural(pending.data.runs.length, 'run')}. Importing replaces everything in this
                browser ({plural(runs.length, 'run')} now).
                {pending.skippedRuns
                  ? ` ${plural(pending.skippedRuns, 'damaged run')} will be skipped.`
                  : ''}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={applyImport}>Replace my data</Button>
                <Button variant="secondary" onClick={() => setPending(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Notice>
        ) : null}

        <div role="status">
          {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
        </div>
      </section>

      <section aria-labelledby="danger-heading" className="flex flex-col gap-4">
        <h2 id="danger-heading" className="text-xl font-bold tracking-tight">
          Start over
        </h2>
        <p className="text-muted">
          Deletes your profile, all runs and shop purchases from this browser.
        </p>
        <div>
          <Button variant="secondary" className="border-danger text-danger" onClick={deleteAll}>
            Delete all data
          </Button>
        </div>
      </section>
    </div>
  )
}
