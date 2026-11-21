import type { DraftErrors, OnboardingDraft } from './draft'

/** Every step screen gets the same three things. */
export interface StepProps {
  draft: OnboardingDraft
  update: (patch: Partial<OnboardingDraft>) => void
  errors: DraftErrors
}
