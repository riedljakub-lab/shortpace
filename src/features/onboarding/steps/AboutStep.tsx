import { RadioCards, TextField } from '../../../ui/form'
import { Notice } from '../../../ui/Notice'
import type { Sex } from '../../../domain/types'
import type { StepProps } from '../stepProps'
import { YES_NO, fromYesNo, toYesNo } from '../yesNo'

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'unspecified', label: 'Prefer not to say' },
]

export function AboutStep({ draft, update, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <RadioCards
          name="sex"
          legend="Which category should we compare you with?"
          options={SEX_OPTIONS}
          value={draft.sex}
          onChange={(sex) => update({ sex })}
          error={errors.sex}
          className="grid-cols-1 sm:grid-cols-3"
          compact
        />
        <p className="text-sm text-muted">
          {draft.sex === 'unspecified'
            ? 'No problem. For record and top-percent comparisons we’ll use the men’s numbers as a neutral default.'
            : 'Only used to compare you with the record ghost and runners like you.'}
        </p>
      </div>

      <TextField
        id="age"
        label="Age"
        hint="We compare you with your own age group."
        inputMode="numeric"
        autoComplete="off"
        value={draft.age}
        onChange={(e) => update({ age: e.target.value })}
        error={errors.age}
        className="max-w-40"
      />

      <div className="flex flex-col gap-3">
        <RadioCards
          name="hasInjury"
          legend="Any current injuries?"
          options={YES_NO}
          value={toYesNo(draft.hasInjury)}
          onChange={(v) => update({ hasInjury: fromYesNo(v) })}
          error={errors.hasInjury}
          className="grid-cols-2 max-w-xs"
          compact
        />
        {draft.hasInjury ? (
          <Notice tone="warning">
            Please get it checked by a doctor or physio before you start training. We’ll keep things
            gentle.
          </Notice>
        ) : null}
      </div>
    </div>
  )
}
