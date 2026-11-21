import { createContext, useContext } from 'react'
import type { Profile } from '../domain/types'

export interface ProfileContextValue {
  /** null until onboarding is finished. */
  profile: Profile | null
  /** Returns false if the browser refused to save it. */
  saveProfile: (profile: Profile) => boolean
  deleteProfile: () => void
}

export const ProfileContext = createContext<ProfileContextValue | null>(null)

export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext)
  if (!value) throw new Error('useProfile must be used inside <ProfileProvider>')
  return value
}
