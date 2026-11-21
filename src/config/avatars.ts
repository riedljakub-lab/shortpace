// Six preset cartoon runners. Only the SHORTS ever change with level (M7);
// everything here stays fixed. `description` is read out by screen readers.

export type HairStyle = 'curly' | 'ponytail' | 'buzz' | 'short' | 'bun' | 'long'
export type Build = 'slim' | 'regular' | 'broad'

export const AVATARS = [
  {
    id: 'look-1',
    description: 'Runner with curly black hair, deep brown skin, orange shirt',
    skin: '#8d5524',
    hair: '#1b1b1b',
    hairStyle: 'curly',
    build: 'regular',
    shirt: '#e4572e',
  },
  {
    id: 'look-2',
    description: 'Runner with an auburn ponytail, light skin, teal shirt',
    skin: '#f1c27d',
    hair: '#a0522d',
    hairStyle: 'ponytail',
    build: 'slim',
    shirt: '#2a9d8f',
  },
  {
    id: 'look-3',
    description: 'Runner with a dark buzz cut, medium brown skin, yellow shirt',
    skin: '#c68642',
    hair: '#3b2a1a',
    hairStyle: 'buzz',
    build: 'broad',
    shirt: '#f4b400',
  },
  {
    id: 'look-4',
    description: 'Runner with short blond hair, fair skin, violet shirt',
    skin: '#ffdbac',
    hair: '#d9b44a',
    hairStyle: 'short',
    build: 'regular',
    shirt: '#6c5ce7',
  },
  {
    id: 'look-5',
    description: 'Runner with a black hair bun, dark brown skin, pink shirt',
    skin: '#5c3a21',
    hair: '#111111',
    hairStyle: 'bun',
    build: 'broad',
    shirt: '#e84393',
  },
  {
    id: 'look-6',
    description: 'Runner with long brown hair, light brown skin, blue shirt',
    skin: '#e0ac69',
    hair: '#4a2c17',
    hairStyle: 'long',
    build: 'slim',
    shirt: '#1e88e5',
  },
] as const satisfies readonly {
  id: string
  description: string
  skin: string
  hair: string
  hairStyle: HairStyle
  build: Build
  shirt: string
}[]

export type AvatarId = (typeof AVATARS)[number]['id']
export const AVATAR_IDS = AVATARS.map((a) => a.id)

export function avatar(id: AvatarId) {
  const found = AVATARS.find((a) => a.id === id)
  if (!found) throw new Error(`Unknown avatar: ${id}`)
  return found
}
