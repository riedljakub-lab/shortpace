import { PERSONAS } from '../../../config/personas'
import { RadioCards } from '../../../ui/form'
import type { StepProps } from '../stepProps'

export function PersonaStep({ draft, update, errors }: StepProps) {
  return (
    <RadioCards
      name="persona"
      legend="Your persona"
      hideLegend
      options={PERSONAS.map((p) => ({ value: p.id, label: p.name, description: p.tagline }))}
      value={draft.persona}
      onChange={(persona) => update({ persona })}
      error={errors.persona}
    />
  )
}
