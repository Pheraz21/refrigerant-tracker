"use client";

// Prompts the engineer to add the app to their Home Screen. This is REQUIRED for
// offline use in low/no-signal areas (a normal browser tab does not reliably keep
// the service worker / cached data). On Android/Chrome we can trigger the native
// install; on iOS Safari there is no install API, so we show the manual steps.
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "fgas_install_dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed — nothing to do
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    if (isIOS()) {
      setIos(true);
      setShow(true);
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="no-print"
      style={{
        margin: "1rem",
        padding: "1rem",
        borderRadius: "12px",
        border: "1px solid var(--primary)",
        background: "rgba(0, 229, 255, 0.06)",
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
        position: "relative",
      }}
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          position: "absolute",
          top: "0.5rem",
          right: "0.5rem",
          background: "transparent",
          border: "none",
          color: "var(--text-muted)",
          cursor: "pointer",
          padding: "0.25rem",
        }}
      >
        <X size={18} />
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)", fontWeight: 700 }}>
        <Download size={18} /> Enable offline use
      </div>
      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-main)", lineHeight: 1.5, paddingRight: "1.5rem" }}>
        To use the app in plantrooms and other low/no-signal areas, add it to your
        Home Screen. Without this, offline access is not available.
      </p>

      {ios ? (
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
          Tap <Share size={15} style={{ verticalAlign: "middle" }} /> <strong>Share</strong> in Safari, then
          <strong>&nbsp;&ldquo;Add to Home Screen&rdquo;</strong>.
        </p>
      ) : (
        <button
          onClick={install}
          style={{
            marginTop: "0.25rem",
            padding: "0.65rem 1rem",
            borderRadius: "8px",
            border: "none",
            background: "var(--primary)",
            color: "#000",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <Download size={18} /> Add to Home Screen
        </button>
      )}
    </div>
  );
}
