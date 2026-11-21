import type { ComponentType, SVGProps } from 'react'
import type { ThemePreference } from '../theme/theme'
import { useTheme } from '../theme/themeContext'
import { MonitorIcon, MoonIcon, SunIcon } from './icons'

const OPTIONS: {
  value: ThemePreference
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}[] = [
  { value: 'system', label: 'System', Icon: MonitorIcon },
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
]

/**
 * Three real radio buttons, styled as a segmented control.
 * Radios give keyboard support for free: Tab to the group, arrow keys to switch.
 */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme()

  return (
    <fieldset className="flex rounded-full border border-line bg-surface p-0.5">
      <legend className="sr-only">Color theme</legend>
      {OPTIONS.map(({ value, label, Icon }) => (
        <label
          key={value}
          title={label}
          className="flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-sm text-muted hover:text-ink has-checked:bg-canvas has-checked:text-ink has-checked:shadow-sm has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
        >
          <input
            type="radio"
            name="theme"
            value={value}
            checked={preference === value}
            onChange={() => setPreference(value)}
            className="sr-only"
          />
          <Icon width={16} height={16} />
          <span className="sr-only lg:not-sr-only">{label}</span>
        </label>
      ))}
    </fieldset>
  )
}
