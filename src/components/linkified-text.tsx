import { Fragment } from "react";

// http(s) links and bare www. links. Trailing punctuation stays outside the link.
const URL_RE = /((?:https?:\/\/|www\.)[^\s<>"]+)/gi;
const TRAILING = /[.,!?;:'")\]}>]+$/;

/** Plain text with any web links turned into clickable links that open in a new tab. */
export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_RE);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const trail = part.match(TRAILING)?.[0] ?? "";
        const url = trail ? part.slice(0, -trail.length) : part;
        const href = url.toLowerCase().startsWith("www.") ? `https://${url}` : url;
        return (
          <Fragment key={i}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold break-all text-blue-600 underline underline-offset-2"
            >
              {url}
            </a>
            {trail}
          </Fragment>
        );
      })}
    </span>
  );
}
