import { ChartIcon, HomeIcon, LogIcon, PlanIcon } from '../ui/icons'

/** One list feeds both the desktop top nav and the mobile bottom tab bar. */
export const NAV_ITEMS = [
  { to: '/', label: 'Home', Icon: HomeIcon },
  { to: '/plan', label: 'Plan', Icon: PlanIcon },
  { to: '/log', label: 'Log', Icon: LogIcon },
  { to: '/dashboard', label: 'Dashboard', Icon: ChartIcon },
] as const
