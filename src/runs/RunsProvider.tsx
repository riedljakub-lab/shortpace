import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Run } from '../domain/types'
import { sortRunsNewestFirst } from '../storage/runSchema'
import { runLog } from '../storage/storage'
import { RunsContext } from './runsContext'

/** Loads saved runs once and shares them with every screen. */
export function RunsProvider({ children }: { children: ReactNode }) {
  const [runs, setRuns] = useState<Run[]>(() => runLog.listRuns())

  const replaceRuns = useCallback((next: Run[]) => {
    const sorted = sortRunsNewestFirst(next)
    setRuns(sorted)
    return runLog.saveRuns(sorted)
  }, [])

  const addRun = useCallback((run: Run) => replaceRuns([run, ...runs]), [runs, replaceRuns])

  const deleteRun = useCallback(
    (id: string) => replaceRuns(runs.filter((r) => r.id !== id)),
    [runs, replaceRuns],
  )

  const value = useMemo(
    () => ({ runs, addRun, deleteRun, replaceRuns }),
    [runs, addRun, deleteRun, replaceRuns],
  )

  return <RunsContext value={value}>{children}</RunsContext>
}
