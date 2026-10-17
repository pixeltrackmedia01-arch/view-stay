export function PageIntro({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="max-w-3xl space-y-3">
      {eyebrow && <p className="text-sm font-semibold tracking-wide text-accent-hover uppercase">{eyebrow}</p>}
      <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">{title}</h1>
      {children && <div className="text-lg leading-relaxed text-ink-2">{children}</div>}
    </header>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return <div className="max-w-3xl space-y-4 leading-relaxed text-ink-2 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_a]:text-primary [&_a]:underline">{children}</div>;
}
