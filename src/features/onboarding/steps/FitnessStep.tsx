import { DISTANCE_CLASSES, type DistanceClassId } from '../../../config/distances'
import { RadioCards, SelectField, TextField } from '../../../ui/form'
import type { BaselineKind } from '../draft'
import type { StepProps } from '../stepProps'
import { YES_NO, fromYesNo, toYesNo } from '../yesNo'

const BASELINE_OPTIONS: { value: BaselineKind; label: string; description: string }[] = [
  { value: 'race', label: 'A recent race time', description: 'From the last few months' },
  { value: 'easyPace', label: 'My easy pace', description: 'A pace you can chat at' },
  { value: 'unknown', label: 'I don’t know', description: 'Totally fine. We’ll learn as you log.' },
]

export function FitnessStep({ draft, update, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-8">
      <TextField
        id="longestRunKm"
        label="Longest run in the last 30 days (km)"
        hint="Enter 0 if you haven’t run. This keeps your first long runs safe."
        inputMode="decimal"
        autoComplete="off"
        value={draft.longestRunKm}
        onChange={(e) => update({ longestRunKm: e.target.value })}
        error={errors.longestRunKm}
        className="max-w-48"
      />

      <RadioCards
        name="canRun30Min"
        legend="Can you run 30 minutes non-stop?"
        options={YES_NO}
        value={toYesNo(draft.canRun30Min)}
        onChange={(v) => update({ canRun30Min: fromYesNo(v) })}
        error={errors.canRun30Min}
        className="grid-cols-2 max-w-xs"
        compact
      />

      <RadioCards
        name="ranRegularly3Months"
        legend="Have you run regularly (most weeks) in the last 3 months?"
        options={YES_NO}
        value={toYesNo(draft.ranRegularly3Months)}
        onChange={(v) => update({ ranRegularly3Months: fromYesNo(v) })}
        error={errors.ranRegularly3Months}
        className="grid-cols-2 max-w-xs"
        compact
      />

      <div className="flex flex-col gap-4">
        <RadioCards
          name="baselineKind"
          legend="What do you know about your current speed?"
          options={BASELINE_OPTIONS}
          value={draft.baselineKind}
          onChange={(baselineKind) => update({ baselineKind })}
          error={errors.baselineKind}
          className="grid-cols-1 sm:grid-cols-3"
        />

        {draft.baselineKind === 'race' ? (
          <div className="flex flex-wrap gap-4">
            <SelectField
              id="raceDistance"
              label="Race distance"
              value={draft.raceDistance}
              onChange={(e) => update({ raceDistance: e.target.value as DistanceClassId })}
            >
              {DISTANCE_CLASSES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </SelectField>
            <TextField
              id="raceTime"
              label="Finish time"
              hint="mm:ss or h:mm:ss"
              placeholder="27:40"
              autoComplete="off"
              value={draft.raceTime}
              onChange={(e) => update({ raceTime: e.target.value })}
              error={errors.raceTime}
              className="max-w-48"
            />
          </div>
        ) : null}

        {draft.baselineKind === 'easyPace' ? (
          <TextField
            id="easyPace"
            label="Easy pace (min/km)"
            hint="minutes:seconds per km"
            placeholder="6:30"
            autoComplete="off"
            value={draft.easyPace}
            onChange={(e) => update({ easyPace: e.target.value })}
            error={errors.easyPace}
            className="max-w-48"
          />
        ) : null}
      </div>
    </div>
  )
}
