import { useEffect, useRef, useState, type ComponentType, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { Navigate, useNavigate } from 'react-router'
import { useProfile } from '../../profile/profileContext'
import { Button } from '../../ui/Button'
import {
  draftToProfile,
  INITIAL_DRAFT,
  STEP_IDS,
  validateStep,
  type DraftErrors,
  type OnboardingDraft,
  type StepId,
} from './draft'
import type { StepProps } from './stepProps'
import { AboutStep } from './steps/AboutStep'
import { AvatarStep } from './steps/AvatarStep'
import { ClassStep } from './steps/ClassStep'
import { FitnessStep } from './steps/FitnessStep'
import { GoalStep } from './steps/GoalStep'
import { PersonaStep } from './steps/PersonaStep'
import { ScheduleStep } from './steps/ScheduleStep'

const STEPS: Record<
  StepId,
  { title: string; intro?: string; Component: ComponentType<StepProps> }
> = {
  avatar: {
    title: 'Pick your runner',
    intro: 'Only the shorts will ever change. They get shorter as your pace gets faster.',
    Component: AvatarStep,
  },
  class: {
    title: 'Choose your distance',
    intro: 'This is your class: the race you’re training for.',
    Component: ClassStep,
  },
  persona: {
    title: 'What kind of runner are you?',
    intro: 'Just for fun, and it flavors your plan. Any persona is for anyone.',
    Component: PersonaStep,
  },
  about: { title: 'A bit about you', Component: AboutStep },
  schedule: { title: 'When can you run?', Component: ScheduleStep },
  fitness: {
    title: 'Where are you starting from?',
    intro: 'Honest answers keep your plan safe.',
    Component: FitnessStep,
  },
  goal: { title: 'Set your goal pace', Component: GoalStep },
}

export function OnboardingPage() {
  const { profile, saveProfile } = useProfile()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<OnboardingDraft>(INITIAL_DRAFT)
  const [stepIndex, setStepIndex] = useState(0)
  const [errors, setErrors] = useState<DraftErrors>({})
  const formRef = useRef<HTMLFormElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const isFirstRender = useRef(true)

  // On every step change, move focus to the new title so screen readers announce it.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    headingRef.current?.focus()
  }, [stepIndex])

  // Already onboarded (e.g. typed the URL): no second chance to change class during the lock.
  if (profile) return <Navigate to="/" replace />

  const stepId = STEP_IDS[stepIndex] ?? 'avatar'
  const { title, intro, Component } = STEPS[stepId]
  const isLast = stepIndex === STEP_IDS.length - 1

  function update(patch: Partial<OnboardingDraft>) {
    setDraft((d) => ({ ...d, ...patch }))
    // Clear the error of any field the user just changed.
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => !(key in patch))))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const stepErrors = validateStep(stepId, draft)
    if (Object.keys(stepErrors).length > 0) {
      flushSync(() => setErrors(stepErrors)) // render the errors now, so we can focus them
      const firstInvalid = formRef.current?.querySelector(
        '[data-invalid] input, [data-invalid] select',
      )
      if (firstInvalid instanceof HTMLElement) firstInvalid.focus()
      return
    }
    setErrors({})
    if (!isLast) {
      setStepIndex((i) => i + 1)
      return
    }
    const saved = saveProfile(draftToProfile(draft))
    navigate('/', { replace: true, state: { saveFailed: !saved } })
  }

  function handleBack() {
    setErrors({})
    setStepIndex((i) => Math.max(0, i - 1))
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto flex max-w-2xl flex-col gap-6"
    >
      <div>
        <p className="text-sm font-medium text-muted">
          Step {stepIndex + 1} of {STEP_IDS.length}
        </p>
        <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${((stepIndex + 1) / STEP_IDS.length) * 100}%` }}
          />
        </div>
      </div>

      <header>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-bold tracking-tight outline-none sm:text-3xl"
        >
          {title}
        </h1>
        {intro ? <p className="mt-2 text-muted">{intro}</p> : null}
      </header>

      <Component draft={draft} update={update} errors={errors} />

      <div className="flex items-center justify-between gap-3 border-t border-line pt-6">
        {stepIndex > 0 ? (
          <Button variant="secondary" onClick={handleBack}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit">{isLast ? 'Finish' : 'Next'}</Button>
      </div>
    </form>
  )
}
