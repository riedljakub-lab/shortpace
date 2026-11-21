import { AVATARS } from '../../../config/avatars'
import { Avatar } from '../../../ui/Avatar'
import { RadioCards } from '../../../ui/form'
import type { StepProps } from '../stepProps'

export function AvatarStep({ draft, update, errors }: StepProps) {
  return (
    <RadioCards
      name="avatarId"
      legend="Pick your look"
      hideLegend
      className="grid-cols-2 sm:grid-cols-3"
      options={AVATARS.map((look, i) => ({
        value: look.id,
        label: `Look ${i + 1}`,
        description: undefined,
        visual: <Avatar avatarId={look.id} className="mx-auto h-40 w-auto" />,
      }))}
      value={draft.avatarId}
      onChange={(avatarId) => update({ avatarId })}
      error={errors.avatarId}
    />
  )
}
