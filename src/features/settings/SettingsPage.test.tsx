import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { PROFILE_KEY, PROFILE_VERSION, RUNS_KEY } from '../../storage/storage'
import { SAMPLE_PROFILE, sampleRun } from '../../test/fixtures'

const RUNS = [sampleRun({ id: 'a' }), sampleRun({ id: 'b', date: '2026-11-18' })]

function seed() {
  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({ version: PROFILE_VERSION, profile: SAMPLE_PROFILE }),
  )
  localStorage.setItem(RUNS_KEY, JSON.stringify({ version: 1, runs: RUNS }))
}

function openSettings() {
  window.location.hash = '#/settings'
  render(<App />)
}

/** jsdom can't really download files, so we capture what would be downloaded. */
function captureDownloads() {
  const blobs: Blob[] = []
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    blobs.push(blob as Blob)
    return 'blob:test'
  })
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  return blobs
}

function chooseFile(text: string) {
  const input = screen.getByLabelText('Choose a ShortPace backup file')
  fireEvent.change(input, {
    target: { files: [new File([text], 'backup.json', { type: 'application/json' })] },
  })
}

describe('Settings: backup and delete', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
  })
  afterEach(() => vi.restoreAllMocks())

  it('exports a backup, and importing it into an empty browser restores everything', async () => {
    seed()
    const blobs = captureDownloads()
    openSettings()
    fireEvent.click(screen.getByRole('button', { name: 'Export backup' }))
    expect(screen.getByRole('status')).toHaveTextContent('Backup downloaded with 2 runs.')
    const backupText = await blobs[0]?.text()
    expect(JSON.parse(backupText ?? '{}')).toMatchObject({ app: 'shortpace', runs: RUNS })

    // Fresh browser: wipe everything, then import.
    localStorage.clear()
    window.location.hash = '#/settings'
    document.body.innerHTML = ''
    render(<App />)
    chooseFile(backupText ?? '')
    expect(await screen.findByText('Replace your data?')).toBeInTheDocument()
    expect(screen.getByText(/has a profile and 2 runs/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Replace my data' }))
    expect(screen.getByRole('status')).toHaveTextContent('Imported 2 runs.')
    expect(JSON.parse(localStorage.getItem(RUNS_KEY) ?? '{}').runs).toEqual(RUNS)
    expect(JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}').profile).toEqual(SAMPLE_PROFILE)
  })

  it('refuses a file that is not a backup, and changes nothing', async () => {
    seed()
    openSettings()
    chooseFile('{"hello": "world"}')
    expect(await screen.findByText('This file isn’t a ShortPace backup.')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(RUNS_KEY) ?? '{}').runs).toHaveLength(2)
  })

  it('cancelling an import changes nothing', async () => {
    seed()
    openSettings()
    chooseFile(
      JSON.stringify({
        app: 'shortpace',
        backupVersion: 1,
        profile: null,
        runs: [],
        theme: 'dark',
      }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(JSON.parse(localStorage.getItem(RUNS_KEY) ?? '{}').runs).toHaveLength(2)
  })

  it('deletes all data after confirming and goes back to onboarding', () => {
    seed()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    openSettings()
    fireEvent.click(screen.getByRole('button', { name: 'Delete all data' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Pick your runner' })).toBeInTheDocument()
    expect(localStorage.getItem(PROFILE_KEY)).toBeNull()
    expect(JSON.parse(localStorage.getItem(RUNS_KEY) ?? '{}').runs).toEqual([])
  })
})
