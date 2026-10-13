"use client";

import React, { useRef, useState, useEffect } from "react";
import { RotateCcw, Check, PenTool } from "lucide-react";

interface SignaturePadProps {
  label?: string;
  value?: string; // Data URL or text
  onChange?: (dataUrl: string) => void;
  width?: number | string;
  height?: number;
  readOnly?: boolean;
  theme?: "dark" | "light";
  penColor?: string;
}

export default function SignaturePad({
  label = "Signature",
  value,
  onChange,
  width = "100%",
  height = 140,
  readOnly = false,
  theme = "dark",
  penColor,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  const defaultPenColor = penColor || (theme === "light" ? "#0f172a" : "#00e5ff");

  // If initial value is an image data URL and canvas is blank, draw it
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value || !value.startsWith("data:image/")) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHasDrawn(true);
    };
    img.src = value;
  }, [value]);

  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getCanvasCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = defaultPenColor;

    setIsDrawing(true);
    setIsTouched(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // pointer might already be released
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    onChange?.(dataUrl);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setIsTouched(false);
    onChange?.("");
  };

  // If read-only and value is text rather than image data URL
  if (readOnly && value && !value.startsWith("data:image/")) {
    return (
      <div style={{ width }}>
        {label && (
          <label
            style={{
              display: "block",
              fontSize: "0.78rem",
              color: theme === "light" ? "#475569" : "var(--text-muted)",
              marginBottom: "0.35rem",
              fontWeight: 600,
            }}
          >
            {label}
          </label>
        )}
        <div
          style={{
            padding: "0.75rem 1rem",
            background: theme === "light" ? "#f8fafc" : "rgba(255,255,255,0.03)",
            border: theme === "light" ? "1px dashed #cbd5e1" : "1px dashed rgba(255,255,255,0.2)",
            borderRadius: "8px",
            fontFamily: "'Brush Script MT', 'Dancing Script', cursive, sans-serif",
            fontSize: "1.4rem",
            color: theme === "light" ? "#0f172a" : "#00e5ff",
          }}
        >
          {value}
        </div>
      </div>
    );
  }

  const isLight = theme === "light";

  return (
    <div style={{ width, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {label && (
          <span
            style={{
              fontSize: "0.78rem",
              color: isLight ? "#334155" : "var(--text-muted)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <PenTool size={13} color={isLight ? "#0284c7" : "#00e5ff"} /> {label}
          </span>
        )}
        {!readOnly && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {hasDrawn && (
              <span style={{ fontSize: "0.72rem", color: "#16a34a", display: "flex", alignItems: "center", gap: "0.2rem", fontWeight: 600 }}>
                <Check size={12} /> Captured
              </span>
            )}
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)",
                border: isLight ? "1px solid #cbd5e1" : "1px solid rgba(255,255,255,0.15)",
                color: isLight ? "#475569" : "rgba(255,255,255,0.7)",
                borderRadius: "6px",
                padding: "0.25rem 0.5rem",
                fontSize: "0.72rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <RotateCcw size={11} /> Clear
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          position: "relative",
          background: isLight ? "#ffffff" : "rgba(10, 16, 26, 0.85)",
          border: isLight
            ? `1.5px ${hasDrawn ? "solid #0284c7" : "dashed #94a3b8"}`
            : `1.5px ${hasDrawn ? "solid #00e5ff" : "dashed rgba(255,255,255,0.2)"}`,
          borderRadius: "8px",
          overflow: "hidden",
          touchAction: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          width={500}
          height={height}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          style={{
            width: "100%",
            height: `${height}px`,
            display: "block",
            cursor: readOnly ? "default" : "crosshair",
            touchAction: "none",
          }}
        />
        {!hasDrawn && !isTouched && !readOnly && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              color: isLight ? "#94a3b8" : "rgba(255,255,255,0.3)",
              fontSize: "0.85rem",
              fontStyle: "italic",
            }}
          >
            Draw signature here (finger, stylus, or mouse)
          </div>
        )}
      </div>
    </div>
  );
}
