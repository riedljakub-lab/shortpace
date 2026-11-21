import { distanceClass } from '../../../config/distances'
import { TextField } from '../../../ui/form'
import type { StepProps } from '../stepProps'

export function GoalStep({ draft, update, errors }: StepProps) {
  const target = draft.distanceClass ? distanceClass(draft.distanceClass).label : 'your race'
  return (
    <TextField
      id="goalPace"
      label="Goal pace (min/km)"
      hint={`One pace for everything: the speed you want to hold for the ${target}. Format minutes:seconds, like 5:30.`}
      placeholder="5:30"
      autoComplete="off"
      value={draft.goalPace}
      onChange={(e) => update({ goalPace: e.target.value })}
      error={errors.goalPace}
      className="max-w-56"
    />
  )
}
