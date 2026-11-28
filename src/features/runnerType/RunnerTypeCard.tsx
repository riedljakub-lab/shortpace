import { useEffect, useRef, useState } from 'react'
import { persona as personaInfo, type PersonaId } from '../../config/personas'
import { REVEAL_AFTER_RUNS, TYPE_RULES } from '../../config/runnerTypes'
import { classifyRunner } from '../../domain/runnerType'
import type { Run } from '../../domain/types'
import { Button } from '../../ui/Button'

/** 0.07 → 7 (rounded, so floating point never shows as 7.000000000000001). */
const pct = (share: number) => Math.round(share * 100)

/** The rules in plain words, so the verdict is never a black box. */
const HOW_WE_DECIDE = [
  `Diesel: your pace varies less than ${pct(TYPE_RULES.diesel.maxPaceSpread)}% from run to run.`,
  `Sprinter: at least ${pct(TYPE_RULES.sprinter.minFastShare)}% of runs are fast sessions or races.`,
  `Trail Goat: at least ${pct(TYPE_RULES.trailGoat.minTrailShare)}% of runs mention trails or hills.`,
  `Comeback Kid: a break of ${TYPE_RULES.comebackKid.minBreakDays}+ days, then ${TYPE_RULES.comebackKid.minRunsAfter}+ runs since.`,
  `Weekend Warrior: at least ${pct(TYPE_RULES.weekendWarrior.minWeekendShare)}% of runs on Saturday or Sunday.`,
  `Data Goblin: at least ${pct(TYPE_RULES.dataGoblin.minDetailShare)}% of runs have km splits or heart rate.`,
  'If several fit, the rarer one wins (Comeback Kid first, Diesel last).',
]

export function RunnerTypeCard({ runs, persona }: { runs: readonly Run[]; persona: PersonaId }) {
  const [revealed, setRevealed] = useState(false)
  const resultRef = useRef<HTMLParagraphElement>(null)
  const result = classifyRunner(runs)

  // After the reveal, move focus to the verdict so screen readers announce it.
  useEffect(() => {
    if (revealed) resultRef.current?.focus()
  }, [revealed])

  const picked = personaInfo(persona).name

  return (
    <section
      aria-labelledby="runner-type-heading"
      className="flex flex-col gap-3 rounded-xl border border-line p-5"
    >
      <h2 id="runner-type-heading" className="text-xl font-bold tracking-tight">
        Runner type reveal
      </h2>

      {!result ? (
        <>
          <p className="text-muted">
            Unlocks after {REVEAL_AFTER_RUNS} runs. You’ve logged {runs.length}.
          </p>
          <div
            role="progressbar"
            aria-label="Runs logged towards the reveal"
            aria-valuemin={0}
            aria-valuemax={REVEAL_AFTER_RUNS}
            aria-valuenow={runs.length}
            className="h-1.5 max-w-xs overflow-hidden rounded-full bg-line"
          >
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${(runs.length / REVEAL_AFTER_RUNS) * 100}%` }}
            />
          </div>
        </>
      ) : !revealed ? (
        <>
          <p>Your runs have spoken. Ready to find out what kind of runner you really are?</p>
          <div>
            <Button onClick={() => setRevealed(true)}>Reveal my runner type</Button>
          </div>
        </>
      ) : (
        <>
          <p ref={resultRef} tabIndex={-1} className="text-lg outline-none">
            You picked <strong>{picked}</strong>.{' '}
            {picked === result.name ? 'Your data agrees: ' : 'Your data says: '}
            <strong className="text-2xl">{result.name}</strong>
            {result.clearMatch ? '.' : ' (closest match: no rule fits clearly yet).'}
          </p>
          <p className="text-muted">{result.description}</p>
          <div>
            <h3 className="font-semibold">Why</h3>
            <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-sm">
              {result.facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">How we decide</summary>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted">
              {HOW_WE_DECIDE.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  )
}
