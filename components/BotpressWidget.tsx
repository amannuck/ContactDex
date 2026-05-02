"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    botpress?: {
      init: (config: Record<string, unknown>) => void;
      on?: (evt: string, cb: () => void) => void;
    };
  }
}

/**
 * Loads Botpress Webchat v3 CDN and calls `window.botpress.init` with JSON from
 * `NEXT_PUBLIC_BOTPRESS_WEBCHAT_CONFIG` (paste the object from Botpress Cloud embed).
 *
 * Docs: https://botpress.com/docs/webchat/get-started/embedding-webchat.md
 */
export default function BotpressWidget() {
  useEffect(() => {
    const raw = process.env.NEXT_PUBLIC_BOTPRESS_WEBCHAT_CONFIG;
    if (!raw) return;
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }

    if (
      document.querySelector(
        'script[src*="cdn.botpress.cloud/webchat"][src*="inject.js"]',
      )
    )
      return;

    const inject = document.createElement("script");
    inject.src = "https://cdn.botpress.cloud/webchat/v3.3/inject.js";
    inject.async = true;
    inject.onload = () => {
      window.botpress?.init(config);
    };
    document.body.appendChild(inject);
  }, []);

  return null;
}
