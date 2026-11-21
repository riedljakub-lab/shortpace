import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

/*
 * Accessible form building blocks. Every input has a visible <label>, hints and errors
 * are linked with aria-describedby, and invalid fields get aria-invalid so screen
 * readers announce them. `data-invalid` lets the onboarding move focus to the first error.
 */

function describedBy(...ids: (string | undefined)[]) {
  const joined = ids.filter(Boolean).join(' ')
  return joined || undefined
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-sm font-medium text-danger">
      {children}
    </p>
  )
}

const INPUT =
  'w-full rounded-lg border border-control bg-canvas px-3 py-2 text-base text-ink placeholder:text-muted aria-invalid:border-2 aria-invalid:border-danger'

export function TextField({
  id,
  label,
  hint,
  error,
  className = 'max-w-xs',
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  hint?: string
  error?: string
}) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="flex flex-col gap-1" data-invalid={error ? true : undefined}>
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hintId, errorId)}
        // className sets the input's width (e.g. short for age, wider for text).
        className={`${INPUT} ${className}`}
        {...input}
      />
      {errorId ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}

export function SelectField({
  id,
  label,
  error,
  children,
  ...select
}: SelectHTMLAttributes<HTMLSelectElement> & { id: string; label: string; error?: string }) {
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="flex flex-col gap-1" data-invalid={error ? true : undefined}>
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`${INPUT} max-w-xs`}
        {...select}
      >
        {children}
      </select>
      {errorId ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}

export interface CardOption<T extends string> {
  value: T
  label: string
  description?: string
  visual?: ReactNode
}

/** Radio buttons styled as big tappable cards. Arrow keys move between them. */
export function RadioCards<T extends string>({
  name,
  legend,
  hideLegend = false,
  options,
  value,
  onChange,
  error,
  className = 'grid-cols-1 sm:grid-cols-2',
  compact = false,
}: {
  name: string
  legend: string
  hideLegend?: boolean
  options: readonly CardOption<T>[]
  value: T | null
  onChange: (value: T) => void
  error?: string
  className?: string
  compact?: boolean
}) {
  const errorId = error ? `${name}-error` : undefined
  return (
    <fieldset
      className="flex flex-col gap-2"
      data-invalid={error ? true : undefined}
      aria-describedby={errorId}
    >
      <legend className={hideLegend ? 'sr-only' : 'mb-2 font-medium'}>{legend}</legend>
      <div className={`grid gap-3 ${className}`}>
        {options.map((option) => (
          <label
            key={option.value}
            className={`group relative flex cursor-pointer flex-col gap-1 rounded-xl border border-control bg-canvas hover:bg-surface has-checked:border-2 has-checked:border-accent has-checked:bg-accent-soft has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${
              compact ? 'px-4 py-2.5' : 'p-4'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {/* Check mark: selection is shown by shape too, not only by color. */}
            <span
              aria-hidden="true"
              className="absolute top-2 right-2 hidden size-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-on-accent group-has-checked:flex"
            >
              ✓
            </span>
            {option.visual}
            <span className="pr-6 font-semibold">{option.label}</span>
            {option.description ? (
              <span className="text-sm text-muted">{option.description}</span>
            ) : null}
          </label>
        ))}
      </div>
      {errorId ? <FieldError id={errorId}>{error}</FieldError> : null}
    </fieldset>
  )
}

/** Multi-select pills (e.g. weekdays). `label` is read aloud; `short` is what's shown. */
export function CheckboxChips<T extends string>({
  name,
  legend,
  hint,
  options,
  values,
  onChange,
  error,
}: {
  name: string
  legend: string
  hint?: string
  options: readonly { value: T; label: string; short: string }[]
  values: readonly T[]
  onChange: (values: T[]) => void
  error?: string
}) {
  const hintId = hint ? `${name}-hint` : undefined
  const errorId = error ? `${name}-error` : undefined
  const toggle = (value: T) =>
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value])

  return (
    <fieldset
      className="flex flex-col gap-2"
      data-invalid={error ? true : undefined}
      aria-describedby={describedBy(hintId, errorId)}
    >
      <legend className="mb-1 font-medium">{legend}</legend>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 min-w-14 cursor-pointer items-center justify-center rounded-full border border-control px-3 font-medium hover:bg-surface has-checked:border-accent has-checked:bg-accent has-checked:text-on-accent has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              checked={values.includes(option.value)}
              onChange={() => toggle(option.value)}
              className="sr-only"
            />
            <span aria-hidden="true">{option.short}</span>
            <span className="sr-only">{option.label}</span>
          </label>
        ))}
      </div>
      {errorId ? <FieldError id={errorId}>{error}</FieldError> : null}
    </fieldset>
  )
}

/** Single-choice pills (e.g. effort 1–10). `label` is read aloud; `short` is what's shown. */
export function RadioChips<T extends string>({
  name,
  legend,
  hint,
  options,
  value,
  onChange,
  error,
}: {
  name: string
  legend: string
  hint?: string
  options: readonly { value: T; label: string; short: string }[]
  value: T | null
  onChange: (value: T) => void
  error?: string
}) {
  const hintId = hint ? `${name}-hint` : undefined
  const errorId = error ? `${name}-error` : undefined
  return (
    <fieldset
      className="flex flex-col gap-2"
      data-invalid={error ? true : undefined}
      aria-describedby={describedBy(hintId, errorId)}
    >
      <legend className="mb-1 font-medium">{legend}</legend>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-control font-semibold tabular-nums hover:bg-surface has-checked:border-accent has-checked:bg-accent has-checked:text-on-accent has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span aria-hidden="true">{option.short}</span>
            <span className="sr-only">{option.label}</span>
          </label>
        ))}
      </div>
      {errorId ? <FieldError id={errorId}>{error}</FieldError> : null}
    </fieldset>
  )
}

export function TextArea({
  id,
  label,
  hint,
  error,
  ...textarea
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string
  label: string
  hint?: string
  error?: string
}) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="flex flex-col gap-1" data-invalid={error ? true : undefined}>
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hintId, errorId)}
        className={`${INPUT} min-h-24`}
        {...textarea}
      />
      {errorId ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}
