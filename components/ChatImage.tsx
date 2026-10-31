"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

type Props = {
  path: string;
  alt?: string;
};

// Loads a private chat image through /api/chat/image using the signed-in
// user's Firebase ID token, then renders it from a blob URL. The Storage
// object itself is never public, so <img src> cannot point at Storage directly.
export default function ChatImage({ path, alt = "Chat attachment" }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    setStatus("loading");
    setObjectUrl(null);

    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("Not signed in");

        const token = await user.getIdToken();
        const response = await fetch(
          `/api/chat/image?path=${encodeURIComponent(path)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error("Failed to load image");

        const blob = await response.blob();
        if (cancelled) return;

        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [path]);

  if (status === "loading") {
    return (
      <div className="flex h-32 w-48 max-w-full animate-pulse items-center justify-center rounded-lg bg-neutral-700 text-[10px] font-bold uppercase tracking-wider text-neutral-200">
        Loading photo...
      </div>
    );
  }

  if (status === "error" || !objectUrl) {
    return (
      <div className="flex h-24 w-48 max-w-full items-center justify-center rounded-lg border border-neutral-600 bg-neutral-700 px-3 text-center text-[10px] font-bold uppercase tracking-wider text-neutral-200">
        Image unavailable
      </div>
    );
  }

  return (
    <a
      href={objectUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block max-w-full"
      title="Open full size"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={objectUrl}
        alt={alt}
        className="max-h-56 w-auto max-w-full rounded-lg object-contain"
      />
    </a>
  );
}
