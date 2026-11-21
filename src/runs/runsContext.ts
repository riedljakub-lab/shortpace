import { createContext, useContext } from 'react'
import type { Run } from '../domain/types'

export interface RunsContextValue {
  /** Newest first. */
  runs: Run[]
  /** Each returns false if the browser refused to save. */
  addRun: (run: Run) => boolean
  deleteRun: (id: string) => boolean
  replaceRuns: (runs: Run[]) => boolean
}

export const RunsContext = createContext<RunsContextValue | null>(null)

export function useRuns(): RunsContextValue {
  const value = useContext(RunsContext)
  if (!value) throw new Error('useRuns must be used inside <RunsProvider>')
  return value
}
