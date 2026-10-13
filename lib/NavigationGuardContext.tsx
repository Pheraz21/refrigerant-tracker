"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Save, X, Trash2 } from "lucide-react";

interface NavigationGuardContextType {
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  requestNavigate: (target: string | (() => void)) => boolean;
  customMessage?: string;
  setCustomMessage: (msg: string | undefined) => void;
}

const NavigationGuardContext = createContext<NavigationGuardContextType>({
  isDirty: false,
  setIsDirty: () => {},
  requestNavigate: () => true,
  customMessage: undefined,
  setCustomMessage: () => {},
});

export function useNavigationGuard() {
  return useContext(NavigationGuardContext);
}

export function NavigationGuardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const [customMessage, setCustomMessage] = useState<string | undefined>(undefined);
  const [pendingTarget, setPendingTarget] = useState<string | (() => void) | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Request navigation: returns true if permitted immediately, false if blocked by dirty state
  const requestNavigate = useCallback(
    (target: string | (() => void)): boolean => {
      if (isDirty) {
        setPendingTarget(() => (typeof target === "function" ? target : target));
        setShowModal(true);
        return false;
      }
      return true;
    },
    [isDirty]
  );

  // Browser beforeunload protection (page refresh, tab close)
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Mobile / browser back button (popstate) trap
  useEffect(() => {
    if (!isDirty) return;

    // Push a dummy state to history so back button triggers popstate
    try {
      window.history.pushState({ guard: true }, "", window.location.href);
    } catch (e) {}

    const handlePopState = () => {
      if (isDirty) {
        setPendingTarget(() => () => {
          setIsDirty(false);
          setShowModal(false);
          window.history.back();
        });
        setShowModal(true);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty]);

  const handleStayAndSave = () => {
    setShowModal(false);
    setPendingTarget(null);
    // Re-arm history trap if isDirty
    if (isDirty) {
      try {
        window.history.pushState({ guard: true }, "", window.location.href);
      } catch (e) {}
    }
    // Dispatch an event to focus / scroll to the submit button on the active form
    window.dispatchEvent(new CustomEvent("focus-save-log-button"));
  };

  const handleDiscardAndLeave = () => {
    setIsDirty(false);
    setShowModal(false);
    const target = pendingTarget;
    setPendingTarget(null);

    if (typeof target === "function") {
      target();
    } else if (typeof target === "string") {
      router.push(target);
    }
  };

  return (
    <NavigationGuardContext.Provider
      value={{
        isDirty,
        setIsDirty,
        requestNavigate,
        customMessage,
        setCustomMessage,
      }}
    >
      {children}

      {/* ── Unsaved Changes Gate Modal ── */}
      {showModal && (
        <div
          className="no-print"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={handleStayAndSave}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1.5px solid rgba(245, 158, 11, 0.5)",
              boxShadow: "0 20px 40px -10px rgba(245, 158, 11, 0.3)",
              borderRadius: "16px",
              maxWidth: "460px",
              width: "100%",
              padding: "1.75rem",
              color: "#fff",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem", marginBottom: "1rem" }}>
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "10px",
                  padding: "0.6rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={24} color="#f59e0b" />
              </div>
              <div>
                <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.15rem", fontWeight: 700, color: "#fff" }}>
                  Unsaved Entry Detected
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#f59e0b", fontWeight: 600 }}>
                  You have entered data that has not been saved yet!
                </p>
              </div>
              <button
                type="button"
                onClick={handleStayAndSave}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  marginLeft: "auto",
                  padding: "0.2rem",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Description */}
            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.5, margin: "0 0 1.5rem" }}>
              {customMessage ||
                "If you navigate away now, your entered refrigerant quantities, equipment details, and visit logs will be lost without updating the cylinder balance."}
            </p>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={handleStayAndSave}
                style={{
                  width: "100%",
                  padding: "0.85rem 1rem",
                  background: "linear-gradient(135deg, #00e5ff 0%, #0088ff 100%)",
                  border: "none",
                  borderRadius: "10px",
                  color: "#000",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  boxShadow: "0 4px 15px rgba(0, 229, 255, 0.3)",
                }}
              >
                <Save size={18} /> Stay on Page &amp; Save Log
              </button>

              <button
                type="button"
                onClick={handleDiscardAndLeave}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "10px",
                  color: "#ef4444",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                <Trash2 size={16} /> Discard Changes &amp; Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </NavigationGuardContext.Provider>
  );
}
