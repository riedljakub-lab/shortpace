// Personas are for fun and flavor the training plan (M5 reads `planFlavor`).
// Any persona is for anyone, regardless of sex. No real brand names.

export const PERSONAS = [
  {
    id: 'couch-potato',
    name: 'Couch Potato',
    tagline: 'Starting from the sofa. Respect.',
    planFlavor: 'novice-start',
  },
  {
    id: 'gym-girlie',
    name: 'Gym Girlie',
    tagline: 'Lifts first, runs second. Adds strength days.',
    planFlavor: 'strength-days',
  },
  {
    id: 'cloud-shoe-bro',
    name: 'Cloud-Shoe Bro',
    tagline: 'Fancy foam shoes. Lives for tempo runs.',
    planFlavor: 'tempo',
  },
  {
    id: 'trail-goat',
    name: 'Trail Goat',
    tagline: 'Hills? Yes please.',
    planFlavor: 'hills',
  },
  {
    id: 'track-rat',
    name: 'Track Rat',
    tagline: 'Laps, splits and intervals on the oval.',
    planFlavor: 'intervals',
  },
  {
    id: 'weekend-warrior',
    name: 'Weekend Warrior',
    tagline: 'Busy week, big weekend.',
    planFlavor: 'weekend-long',
  },
] as const

export type PersonaId = (typeof PERSONAS)[number]['id']
export const PERSONA_IDS = PERSONAS.map((p) => p.id)

export function persona(id: PersonaId) {
  const found = PERSONAS.find((p) => p.id === id)
  if (!found) throw new Error(`Unknown persona: ${id}`)
  return found
}
