// Yes/no questions use radio cards, which work with strings.

export type YesNo = 'yes' | 'no'

export const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
] as const satisfies readonly { value: YesNo; label: string }[]

export const toYesNo = (value: boolean | null): YesNo | null =>
  value === null ? null : value ? 'yes' : 'no'

export const fromYesNo = (value: YesNo): boolean => value === 'yes'
