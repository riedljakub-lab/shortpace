import { LogoMark } from '../ui/Logo'

export function HomePage() {
  return (
    <section className="flex flex-col items-center gap-4 py-12 text-center">
      <LogoMark className="h-24 w-24 text-accent" />
      <h1 className="text-4xl font-bold tracking-tight">Hello ShortPace</h1>
      <p className="text-lg text-muted">Shorter shorts. Faster pace.</p>
    </section>
  )
}
