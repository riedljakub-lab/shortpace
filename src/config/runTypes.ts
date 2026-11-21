// The four run types a runner can log. "fast" covers tempo, intervals and hills.

export const RUN_TYPES = [
  { id: 'easy', label: 'Easy', description: 'Relaxed, chatty pace' },
  { id: 'long', label: 'Long', description: 'Your longest run of the week' },
  { id: 'fast', label: 'Fast', description: 'Tempo, intervals, hills' },
  { id: 'race', label: 'Race', description: 'Race or time trial' },
] as const

export type RunType = (typeof RUN_TYPES)[number]['id']
export const RUN_TYPE_IDS = RUN_TYPES.map((t) => t.id)

export function runTypeLabel(id: RunType): string {
  return RUN_TYPES.find((t) => t.id === id)?.label ?? id
}
