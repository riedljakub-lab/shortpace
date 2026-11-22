/** "+20 s", "−5 s", "±0 s" per km vs goal. */
export function signedSec(sec: number): string {
  if (sec === 0) return '±0 s'
  return sec > 0 ? `+${sec} s` : `−${Math.abs(sec)} s`
}
