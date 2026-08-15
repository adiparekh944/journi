import React, { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";

/**
 * A full-screen frame for an external booking page, with a way back.
 *
 * Kept inside the app rather than opening a tab so the demo never leaves
 * Journi. Some sites refuse to be framed via X-Frame-Options or a CSP
 * frame-ancestors rule; the frame stays blank in that case, so there is always
 * a visible escape hatch to open the page properly.
 */
export default function InAppBrowser({ open, url, title, onClose }) {
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setLoading(true);
    setSlow(false);

    // If nothing has loaded by now the site is most likely blocking framing.
    const timer = setTimeout(() => setSlow(true), 4000);

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, url, onClose]);

  if (!open || !url) return null;

  let host = url;
  try {
    host = new URL(url).host.replace(/^www\./, "");
  } catch {
    // Leave the raw string if it will not parse.
  }

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-border bg-card px-2 py-2">
        <button
          type="button"
          onClick={onClose}
          className="tap-highlight flex h-9 items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-sm font-semibold text-foreground">
            {title ?? "Tickets"}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{host}</div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          title="Open in a new tab"
          className="tap-highlight flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </header>

      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading {host}…</p>
            {slow && (
              <p className="max-w-xs px-6 text-center text-xs text-muted-foreground">
                Taking a while. Some ticket sites block being shown inside
                another app — use the arrow above to open it directly.
              </p>
            )}
          </div>
        )}
        <iframe
          key={url}
          src={url}
          title={title ?? "Tickets"}
          onLoad={() => setLoading(false)}
          className="h-full w-full border-0"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
