/** Shown straight away while a signed-in page loads its data. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
      <span className="sr-only">Loading…</span>
      <div aria-hidden className="flex flex-col gap-3">
        <div className="h-3 w-48 animate-pulse rounded-full bg-ice-100" />
        <div className="h-8 w-72 animate-pulse rounded-md bg-ice-100" />
      </div>
      <div aria-hidden className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-white" />
        ))}
      </div>
      <div aria-hidden className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-white" />
        ))}
      </div>
    </div>
  );
}
