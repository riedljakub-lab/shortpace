import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Profile } from '../domain/types'
import { profiles } from '../storage/storage'
import { ProfileContext } from './profileContext'

/** Loads the saved profile once and shares it with every screen. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(() => profiles.getProfile())

  const saveProfile = useCallback((next: Profile) => {
    setProfile(next)
    return profiles.saveProfile(next)
  }, [])

  const deleteProfile = useCallback(() => {
    profiles.deleteProfile()
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({ profile, saveProfile, deleteProfile }),
    [profile, saveProfile, deleteProfile],
  )

  return <ProfileContext value={value}>{children}</ProfileContext>
}
