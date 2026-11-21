import { DISTANCE_CLASSES } from '../../../config/distances'
import { CLASS_LOCK_DAYS } from '../../../config/profileRules'
import { RadioCards } from '../../../ui/form'
import { Notice } from '../../../ui/Notice'
import type { StepProps } from '../stepProps'

export function ClassStep({ draft, update, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <RadioCards
        name="distanceClass"
        legend="Your distance"
        hideLegend
        options={DISTANCE_CLASSES.map((d) => ({
          value: d.id,
          label: d.label,
          description: d.blurb,
        }))}
        value={draft.distanceClass}
        onChange={(distanceClass) => update({ distanceClass })}
        error={errors.distanceClass}
      />
      <Notice>
        Your first {CLASS_LOCK_DAYS} days are locked to this choice. After that you can switch, for
        a few coins.
      </Notice>
    </div>
  )
}
