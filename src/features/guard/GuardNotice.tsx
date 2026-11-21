import { todayIso } from '../../domain/dates'
import { restDayAdvice, restDayMessage, type GuardMessage } from '../../domain/guard'
import { useRuns } from '../../runs/runsContext'
import { Notice } from '../../ui/Notice'

/**
 * Shows a guard warning. Deliberately has NO dismiss or "pay to skip" button:
 * safety warnings can't be bought away with coins.
 */
export function GuardNotice({ message }: { message: GuardMessage }) {
  return (
    <Notice tone={message.tone}>
      <strong>{message.title}</strong> {message.body}
    </Notice>
  )
}

/** "Time for a rest day" when 2+ easy runs felt 8/10 or harder this week. Renders nothing otherwise. */
export function RestDayAlert() {
  const { runs } = useRuns()
  const advice = restDayAdvice(runs, todayIso())
  if (!advice) return null
  return (
    <section aria-label="Rest day recommended">
      <GuardNotice message={restDayMessage(advice)} />
    </section>
  )
}
