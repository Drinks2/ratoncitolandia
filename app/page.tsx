export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-6 py-24 text-center sm:py-32">
        <p className="mb-4 rounded-full border border-border px-4 py-1 text-sm">
          Next.js + React + Vercel
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Landing de una sola página, rápida y lista para producción
        </h1>
        <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Proyecto base preparado con npm, App Router, TypeScript y despliegue
          en Vercel. Desde aquí puedes crecer a una web completa paso a paso.
        </p>
        <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href="https://vercel.com/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-md bg-foreground px-6 font-medium text-background transition-opacity hover:opacity-90"
          >
            Desplegar en Vercel
          </a>
          <a
            href="https://github.com/Drinks2"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-md border border-border px-6 font-medium transition-colors hover:bg-accent"
          >
            Ver GitHub
          </a>
        </div>
      </section>
    </main>
  );
}
