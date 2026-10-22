"use client";

import { useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  ImageOff,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Send,
  Share,
  BarChart3,
  ThumbsUp,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X_WORD_LIMIT, type Content, type Platform } from "@/lib/types";
import { cn, countWords } from "@/lib/utils";

type Props = { item: Content; imageUrls: string[] };

function body(copy: string | null, hashtags: string | null, link?: string | null) {
  return [copy?.trim(), link?.trim(), hashtags?.trim()].filter(Boolean).join("\n\n");
}

function Hashtagged({ text, tagClass }: { text: string; tagClass: string }) {
  const parts = text.split(/(#[\p{L}\p{N}_]+)/u);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <span key={i} className={tagClass}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function NoImages({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 bg-ice-100 text-sm font-semibold text-muted-foreground", className)}>
      <ImageOff className="size-6 text-blue-600" aria-hidden />
      No images yet
    </div>
  );
}

/** Grid used by LinkedIn and X for 1 to 4 images. */
function ImageGrid({ urls, aspect, rounded }: { urls: string[]; aspect: string; rounded?: string }) {
  if (urls.length === 0) return <NoImages className={cn(aspect, rounded)} />;
  const n = urls.length;
  return (
    <div
      className={cn(
        "grid gap-0.5 overflow-hidden bg-white",
        aspect,
        rounded,
        n === 1 && "grid-cols-1",
        n === 2 && "grid-cols-2",
        n >= 3 && "grid-cols-2 grid-rows-2"
      )}
    >
      {urls.map((u, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={u}
          src={u}
          alt={`Image ${i + 1}`}
          className={cn("size-full min-h-0 object-cover", n === 3 && i === 0 && "row-span-2")}
        />
      ))}
    </div>
  );
}

function LinkedInPreview({ item, imageUrls }: Props) {
  const text = body(item.copy_linkedin, item.hashtags, item.link_url);
  return (
    <article
      aria-label="LinkedIn post preview"
      className="overflow-hidden rounded-xl border border-border bg-white font-[system-ui] text-[#1d2226]"
    >
      <div className="flex items-start gap-2.5 px-4 pt-3.5 pb-2">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-sm bg-navy-800 font-label text-base font-semibold text-white">
          DA
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-bold">DrupalAsia</span>
          <span className="text-xs text-[#5e6670]">Drupal community conference</span>
          <span className="text-xs text-[#5e6670]">Now · Public</span>
        </div>
      </div>
      <p className="px-4 pb-3 text-sm leading-[1.45] whitespace-pre-line">
        <Hashtagged text={text} tagClass="font-semibold text-blue-600" />
      </p>
      <ImageGrid urls={imageUrls} aspect="aspect-[1200/627]" />
      <div className="flex justify-around border-t border-[#e8e8e8] px-2 py-1 text-[13px] font-semibold text-[#5e6670]">
        {[
          [ThumbsUp, "Like"],
          [MessageCircle, "Comment"],
          [Repeat2, "Repost"],
          [Send, "Send"],
        ].map(([Icon, label]) => {
          const I = Icon as typeof ThumbsUp;
          return (
            <span key={label as string} className="flex items-center gap-1.5 px-1.5 py-2.5">
              <I className="size-[18px]" aria-hidden />
              {label as string}
            </span>
          );
        })}
      </div>
    </article>
  );
}

function XPreview({ item, imageUrls }: Props) {
  const text = body(item.copy_x, item.hashtags, item.link_url);
  return (
    <article
      aria-label="X post preview"
      className="flex gap-3 rounded-xl border border-border bg-white px-4 py-3.5 font-[system-ui] text-[#0f1419]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-800 font-label text-sm font-semibold text-white">
        DA
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-1 text-[15px]">
          <span className="font-bold">DrupalAsia</span>
          <span className="text-[#536471]">· now</span>
        </div>
        <p className="text-[15px] leading-snug whitespace-pre-line">
          <Hashtagged text={text} tagClass="text-blue-600" />
        </p>
        <ImageGrid urls={imageUrls} aspect="aspect-video" rounded="rounded-2xl border border-[#cfd9de]" />
        <div className="flex max-w-md justify-between pt-1 text-[#536471]">
          <MessageCircle className="size-[18px]" role="img" aria-label="Reply" />
          <Repeat2 className="size-[18px]" role="img" aria-label="Repost" />
          <Heart className="size-[18px]" role="img" aria-label="Like" />
          <BarChart3 className="size-[18px]" role="img" aria-label="Views" />
          <Share className="size-[18px]" role="img" aria-label="Share" />
        </div>
      </div>
    </article>
  );
}

function InstagramPreview({ item, imageUrls }: Props) {
  const [index, setIndex] = useState(0);
  const text = body(item.copy_instagram, item.hashtags);
  const n = imageUrls.length;
  const current = Math.min(index, Math.max(n - 1, 0));

  return (
    <article
      aria-label="Instagram post preview"
      className="overflow-hidden rounded-xl border border-border bg-white font-[system-ui] text-black"
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-[34px] items-center justify-center rounded-full bg-navy-800 font-label text-xs font-semibold text-white shadow-[0_0_0_2px_#fff,0_0_0_4px_var(--blue-600)]">
            DA
          </span>
          <span className="text-sm font-bold">DrupalAsia</span>
        </div>
        <MoreHorizontal className="size-5" role="img" aria-label="More options" />
      </div>
      <div className="relative aspect-square bg-navy-900">
        {n === 0 ? (
          <NoImages className="size-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrls[current]} alt={`Image ${current + 1} of ${n}`} className="size-full object-cover" />
        )}
        {n > 1 ? (
          <>
            <span className="absolute top-3 right-3 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
              {current + 1}/{n}
            </span>
            {current > 0 ? (
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => setIndex(current - 1)}
                className="absolute top-1/2 left-2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90"
              >
                <ChevronLeft className="size-5" />
              </button>
            ) : null}
            {current < n - 1 ? (
              <button
                type="button"
                aria-label="Next image"
                onClick={() => setIndex(current + 1)}
                className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90"
              >
                <ChevronRight className="size-5" />
              </button>
            ) : null}
          </>
        ) : null}
      </div>
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="flex gap-4">
          <Heart className="size-6" role="img" aria-label="Like" />
          <MessageCircle className="size-6" role="img" aria-label="Comment" />
          <Send className="size-6" role="img" aria-label="Share" />
        </div>
        {n > 1 ? (
          <div className="flex gap-1" aria-hidden>
            {imageUrls.map((u, i) => (
              <span key={u} className={cn("size-1.5 rounded-full", i === current ? "bg-blue-600" : "bg-black/20")} />
            ))}
          </div>
        ) : null}
        <Bookmark className="size-6" role="img" aria-label="Save" />
      </div>
      <p className="px-3 pb-3.5 text-sm leading-[1.45] whitespace-pre-line">
        <span className="font-bold">DrupalAsia</span>{" "}
        <Hashtagged text={text} tagClass="text-blue-800" />
      </p>
    </article>
  );
}

const PREVIEWS: Record<Platform, { label: string; render: (p: Props) => React.ReactNode }> = {
  linkedin: { label: "LinkedIn", render: (p) => <LinkedInPreview {...p} /> },
  x: { label: "X", render: (p) => <XPreview {...p} /> },
  instagram: { label: "Instagram", render: (p) => <InstagramPreview {...p} /> },
};

function PreviewColumn({ p, item, imageUrls }: Props & { p: Platform }) {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-extrabold">{PREVIEWS[p].label}</h3>
        {p === "x" ? (
          <span className="text-[13px] font-semibold text-muted-foreground">
            {countWords(item.copy_x)} / {X_WORD_LIMIT} words
          </span>
        ) : null}
      </div>
      {PREVIEWS[p].render({ item, imageUrls })}
    </div>
  );
}

export function SocialPreviews({ item, imageUrls }: Props) {
  const platforms = item.platforms.length ? item.platforms : (["linkedin", "x", "instagram"] as Platform[]);

  return (
    <section aria-labelledby="previews-h" className="flex flex-col gap-4">
      <Tabs defaultValue="all">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="previews-h" className="text-xl font-extrabold">
            Post previews
          </h2>
          <TabsList aria-label="Preview platform">
            <TabsTrigger value="all">All</TabsTrigger>
            {platforms.map((p) => (
              <TabsTrigger key={p} value={p}>
                {PREVIEWS[p].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="all">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-start gap-6">
            {platforms.map((p) => (
              <PreviewColumn key={p} p={p} item={item} imageUrls={imageUrls} />
            ))}
          </div>
        </TabsContent>
        {platforms.map((p) => (
          <TabsContent key={p} value={p}>
            <PreviewColumn p={p} item={item} imageUrls={imageUrls} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
