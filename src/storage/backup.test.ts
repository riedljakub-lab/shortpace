import { describe, expect, it } from 'vitest'
import { SAMPLE_PROFILE, sampleRun } from '../test/fixtures'
import { backupFileName, buildBackup, parseBackup, type AppData } from './backup'
import { buyShorts, EMPTY_WALLET } from '../domain/wallet'

const DATA: AppData = {
  profile: SAMPLE_PROFILE,
  runs: [
    sampleRun({ id: 'b', date: '2026-11-20', splitsSecPerKm: [330, 331] }),
    sampleRun({ id: 'a', date: '2026-11-18', avgHeartRate: 148, notes: 'Hills' }),
  ],
  theme: 'dark',
  wallet: buyShorts(EMPTY_WALLET, 'volt', '2026-11-20', 'p1'),
}
const NOW = new Date('2026-11-21T10:00:00.000Z')

describe('backup export/import', () => {
  it('round-trips everything exactly', () => {
    const text = JSON.stringify(buildBackup(DATA, NOW))
    expect(parseBackup(text)).toEqual({
      ok: true,
      data: DATA,
      exportedAt: NOW.toISOString(),
      skippedRuns: 0,
    })
  })

  it('works before onboarding (no profile yet)', () => {
    const text = JSON.stringify(
      buildBackup({ profile: null, runs: [], theme: 'system', wallet: EMPTY_WALLET }, NOW),
    )
    const result = parseBackup(text)
    expect(result.ok && result.data.profile).toBeNull()
  })

  it('names the file with the date', () => {
    expect(backupFileName(new Date(2026, 10, 21))).toBe('shortpace-backup-2026-11-21.json')
  })

  it('rejects files that are not ShortPace backups, with a clear reason', () => {
    const cases: [string, RegExp][] = [
      ['not json', /isn’t valid JSON/],
      ['[1,2,3]', /isn’t a ShortPace backup/],
      [JSON.stringify({ app: 'otherapp', backupVersion: 1, runs: [] }), /isn’t a ShortPace/],
      [JSON.stringify({ ...buildBackup(DATA, NOW), backupVersion: 99 }), /newer version/],
      [JSON.stringify({ ...buildBackup(DATA, NOW), runs: 'none' }), /runs are missing/],
      [
        JSON.stringify({ ...buildBackup(DATA, NOW), profile: { name: 'hacked' } }),
        /profile isn’t valid/,
      ],
    ]
    for (const [text, reason] of cases) {
      const result = parseBackup(text)
      expect(result.ok, text.slice(0, 30)).toBe(false)
      if (!result.ok) expect(result.error).toMatch(reason)
    }
  })

  it('skips damaged runs, keeps the rest, and counts what it skipped', () => {
    const backup = buildBackup(DATA, NOW)
    const text = JSON.stringify({ ...backup, runs: [...backup.runs, { id: 'bad', effort: 99 }] })
    const result = parseBackup(text)
    expect(result.ok && result.data.runs).toHaveLength(2)
    expect(result.ok && result.skippedRuns).toBe(1)
  })

  it('falls back to the system theme if the theme is unknown', () => {
    const text = JSON.stringify({ ...buildBackup(DATA, NOW), theme: 'neon' })
    expect(parseBackup(text).ok && (parseBackup(text) as { data: AppData }).data.theme).toBe(
      'system',
    )
  })

  it('imports older backups without a wallet as an empty wallet', () => {
    const { wallet: _ignored, ...withoutWallet } = buildBackup(DATA, NOW)
    void _ignored
    const result = parseBackup(JSON.stringify(withoutWallet))
    expect(result.ok && result.data.wallet).toEqual(EMPTY_WALLET)
  })
})
