import { useEffect, useState } from 'react'
import { preferences } from '../../storage/storage'
import { LevelUpMoment } from './LevelUpMoment'

/**
 * Shows the level-up moment once for each new level.
 * First visit: remembers the current level quietly (nothing to celebrate yet).
 * Level went down (regress): remembers quietly too, so coming back up is celebrated again.
 */
export function LevelUpGate({ level }: { level: number }) {
  const [lastSeen, setLastSeen] = useState(() => preferences.getLastSeenLevel())

  useEffect(() => {
    if (lastSeen === null || level < lastSeen) preferences.setLastSeenLevel(level)
  }, [lastSeen, level])

  if (lastSeen === null || level <= lastSeen) return null

  return (
    <LevelUpMoment
      from={lastSeen}
      to={level}
      onDone={() => {
        preferences.setLastSeenLevel(level)
        setLastSeen(level)
      }}
    />
  )
}
