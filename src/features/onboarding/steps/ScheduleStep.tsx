import { sortWeekdays, WEEKDAYS, weekdayLabel, type Weekday } from '../../../domain/dates'
import { CheckboxChips, SelectField } from '../../../ui/form'
import type { StepProps } from '../stepProps'

/** Suggest Sunday or Saturday for the long run, else the last chosen day. */
function suggestLongRunDay(days: Weekday[]): Weekday | null {
  if (days.includes('sun')) return 'sun'
  if (days.includes('sat')) return 'sat'
  return sortWeekdays(days).at(-1) ?? null
}

export function ScheduleStep({ draft, update, errors }: StepProps) {
  const chosen = sortWeekdays(draft.runDays)

  function setDays(runDays: Weekday[]) {
    // Keep a long-run day the user picked themselves; otherwise keep suggesting the best one.
    const keep = draft.longRunDayPicked && draft.longRunDay && runDays.includes(draft.longRunDay)
    update({
      runDays,
      longRunDay: keep ? draft.longRunDay : suggestLongRunDay(runDays),
      longRunDayPicked: Boolean(keep),
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <CheckboxChips
        name="runDays"
        legend="Which days can you run?"
        hint="Pick the days that really work. Rest days count too: they earn XP."
        options={WEEKDAYS.map((d) => ({ value: d.id, label: d.label, short: d.short }))}
        values={draft.runDays}
        onChange={setDays}
        error={errors.runDays}
      />

      <SelectField
        id="longRunDay"
        label="Long-run day"
        value={draft.longRunDay ?? ''}
        onChange={(e) =>
          update({
            longRunDay: (e.target.value || null) as Weekday | null,
            longRunDayPicked: e.target.value !== '',
          })
        }
        error={errors.longRunDay}
        disabled={chosen.length === 0}
      >
        <option value="">{chosen.length ? 'Choose a day' : 'Pick your days first'}</option>
        {chosen.map((day) => (
          <option key={day} value={day}>
            {weekdayLabel(day)}
          </option>
        ))}
      </SelectField>
    </div>
  )
}
