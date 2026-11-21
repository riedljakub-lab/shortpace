/** Temporary screen for sections that later milestones will build. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted">Coming soon.</p>
    </section>
  )
}
