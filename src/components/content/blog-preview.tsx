import { ExternalLink } from "lucide-react";

import type { Content } from "@/lib/types";

/** How the blog reads: cover, title, summary and text. */
export function BlogPreview({ item, imageUrls }: { item: Content; imageUrls: string[] }) {
  const [cover, ...rest] = imageUrls;
  return (
    <section aria-labelledby="blog-preview-h" className="flex flex-col gap-4">
      <h2 id="blog-preview-h" className="text-xl font-extrabold">
        Blog preview
      </h2>
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-5 rounded-2xl border border-border bg-white p-6 sm:p-10">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="w-full rounded-xl bg-navy-900 object-contain" />
        ) : (
          <div className="flex aspect-[2/1] items-center justify-center rounded-xl border-2 border-dashed border-input bg-ice-100 text-sm font-bold text-muted-foreground">
            No cover image yet
          </div>
        )}
        <h3 className="text-[32px] leading-tight font-extrabold tracking-[-0.01em]">{item.title}</h3>
        {item.brief ? <p className="text-lg leading-relaxed text-muted-foreground">{item.brief}</p> : null}
        {item.body ? (
          <div className="text-[17px] leading-[1.75] whitespace-pre-wrap">{item.body}</div>
        ) : (
          <p className="rounded-md bg-ice-100 px-4 py-3 text-sm font-semibold">
            Not written yet. This is still an idea: open Edit to write it.
          </p>
        )}
        {rest.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {rest.map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt={`Image ${i + 2}`} className="w-full rounded-md bg-navy-900 object-contain" />
            ))}
          </div>
        ) : null}
        {item.keywords || item.link_url ? (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
            {item.keywords ? (
              <span>
                <span className="font-bold">Keywords: </span>
                {item.keywords}
              </span>
            ) : (
              <span />
            )}
            {item.link_url ? (
              <a
                href={item.link_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-bold text-blue-600"
              >
                Published link <ExternalLink className="size-4" aria-hidden />
              </a>
            ) : null}
          </footer>
        ) : null}
      </article>
    </section>
  );
}
