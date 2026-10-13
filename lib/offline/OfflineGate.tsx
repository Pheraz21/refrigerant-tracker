"use client";

import React from "react";
import { useOffline } from "./OfflineContext";

export function useOfflineGate() {
  const { isOnline, openOfflineGateModal } = useOffline();

  const isDisconnected = !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

  const gateAction = (reason: string, title: string = "Signal Required", action?: () => void) => {
    if (isDisconnected) {
      openOfflineGateModal(reason, title);
      return false;
    }
    if (action) action();
    return true;
  };

  return {
    isOnline: !isDisconnected,
    gateAction,
    openOfflineGateModal,
  };
}

interface OfflineGateProps {
  children: React.ReactNode;
  reason: string;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  className?: string;
  badgeText?: string;
  badgePosition?: "top-right" | "inline";
  disabled?: boolean;
}

export function OfflineGate({
  children,
  reason,
  title = "Signal Required",
  onClick,
  style,
  className,
  badgeText = "☁️ Online only",
  badgePosition = "top-right",
  disabled = false,
}: OfflineGateProps) {
  const { isOnline, gateAction } = useOfflineGate();

  const handleClick = (e: React.MouseEvent) => {
    if (!isOnline) {
      e.preventDefault();
      e.stopPropagation();
      gateAction(reason, title);
      return;
    }
    if (onClick && !disabled) {
      onClick(e);
    }
  };

  if (isOnline) {
    return (
      <div
        onClick={handleClick}
        className={className}
        style={{ display: "inline-block", width: "100%", ...style }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={className}
      style={{
        display: "inline-block",
        width: "100%",
        position: "relative",
        opacity: 0.65,
        filter: "saturate(0.65)",
        cursor: "pointer",
        ...style,
      }}
    >
      {badgePosition === "top-right" && (
        <span
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            fontSize: "0.68rem",
            fontWeight: 700,
            padding: "0.15rem 0.45rem",
            borderRadius: "4px",
            background: "rgba(245, 158, 11, 0.2)",
            color: "var(--warning, #f59e0b)",
            border: "1px solid rgba(245, 158, 11, 0.4)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          {badgeText}
        </span>
      )}
      {children}
    </div>
  );
}
