"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Printer, FileText, Maximize2 } from "lucide-react";

interface HwcnLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl?: string | string[] | null;
  title?: string;
}

export default function HwcnLightboxModal({ isOpen, onClose, photoUrl, title = "Hazardous Waste Consignment Note" }: HwcnLightboxModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const urls = useMemo(() => {
    if (!photoUrl) return [];
    if (Array.isArray(photoUrl)) return photoUrl.filter(Boolean);
    return photoUrl.split(",").map(s => s.trim()).filter(Boolean);
  }, [photoUrl]);

  useEffect(() => {
    setActiveIndex(0);
    setZoom(1);
    setRotation(0);
  }, [photoUrl, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && activeIndex > 0) setActiveIndex(prev => prev - 1);
      if (e.key === "ArrowRight" && activeIndex < urls.length - 1) setActiveIndex(prev => prev + 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeIndex, urls.length, onClose]);

  if (!isOpen || urls.length === 0) return null;

  const currentUrl = urls[activeIndex] || urls[0];

  const handlePrintAll = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const imgsHtml = urls.map((u, i) => `
      <div style="page-break-after: always; text-align: center; margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px;">Document Page ${i + 1} of ${urls.length}</div>
        <img src="${u}" style="max-width: 100%; display: inline-block;" />
      </div>
    `).join("");
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} — Print View</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 10mm; background: #fff; color: #000; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${imgsHtml}</body>
      </html>
    `);
    win.document.close();
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(5, 8, 15, 0.92)",
        backdropFilter: "blur(12px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      {/* ── Top Header Toolbar ────────────────────────────────────────────── */}
      <div
        style={{
          padding: "1rem 1.5rem",
          background: "rgba(17, 24, 39, 0.8)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <FileText size={20} color="#00e5ff" />
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>{title}</div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Document Page <strong style={{ color: "#00e5ff" }}>{activeIndex + 1}</strong> of <strong>{urls.length}</strong>
            </div>
          </div>
        </div>

        {/* Toolbar Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          {/* Zoom Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "6px", padding: "0.25rem 0.5rem" }}>
            <button
              onClick={() => setZoom(z => Math.max(+(z - 0.25).toFixed(2), 0.5))}
              title="Zoom Out"
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", padding: "0.15rem" }}
            >
              <ZoomOut size={16} />
            </button>
            <span style={{ fontSize: "0.78rem", color: "#fff", fontWeight: 600, minWidth: "40px", textAlign: "center", fontFamily: "var(--font-geist-mono)" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(+(z + 0.25).toFixed(2), 4))}
              title="Zoom In"
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", padding: "0.15rem" }}
            >
              <ZoomIn size={16} />
            </button>
            {zoom !== 1 && (
              <button
                onClick={() => setZoom(1)}
                style={{ background: "none", border: "none", color: "#00e5ff", cursor: "pointer", fontSize: "0.72rem", padding: "0.15rem 0.3rem", fontWeight: 700 }}
              >
                Reset
              </button>
            )}
          </div>

          {/* Rotate Control */}
          <button
            onClick={handleRotate}
            title="Rotate 90°"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "6px",
              padding: "0.4rem 0.75rem",
              color: "#fff",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RotateCw size={15} /> Rotate
          </button>

          {/* Print All Control */}
          <button
            onClick={handlePrintAll}
            title="Print Paperwork"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "rgba(0, 229, 255, 0.1)",
              border: "1px solid rgba(0, 229, 255, 0.3)",
              borderRadius: "6px",
              padding: "0.4rem 0.85rem",
              color: "#00e5ff",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Printer size={15} /> Print All ({urls.length})
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            title="Close Lightbox (Esc)"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              background: "rgba(255, 51, 102, 0.15)",
              border: "1px solid rgba(255, 51, 102, 0.3)",
              borderRadius: "50%",
              color: "#ff3366",
              cursor: "pointer",
              marginLeft: "0.5rem",
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── Center Main Interactive Image Viewer ─────────────────────────── */}
      <div style={{ position: "relative", flex: 1, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        {/* Previous Button */}
        {urls.length > 1 && (
          <button
            onClick={() => setActiveIndex(prev => Math.max(prev - 1, 0))}
            disabled={activeIndex === 0}
            style={{
              position: "absolute",
              left: "1.5rem",
              zIndex: 10,
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: activeIndex === 0 ? "rgba(255,255,255,0.02)" : "rgba(17, 24, 39, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: activeIndex === 0 ? "rgba(255,255,255,0.2)" : "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: activeIndex === 0 ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              transition: "all 0.2s",
            }}
          >
            <ChevronLeft size={28} />
          </button>
        )}

        {/* Image Container with Zoom & Rotate transforms */}
        <div style={{ maxWidth: "90vw", maxHeight: "75vh", overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px" }}>
          <img
            src={currentUrl}
            alt={`Paperwork page ${activeIndex + 1}`}
            style={{
              maxWidth: zoom === 1 ? "100%" : "none",
              maxHeight: zoom === 1 ? "75vh" : "none",
              width: zoom > 1 ? `${zoom * 100}%` : "auto",
              transform: `rotate(${rotation}deg)`,
              transition: "transform 0.2s ease-out, width 0.15s ease-out",
              borderRadius: "6px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
              display: "block",
            }}
          />
        </div>

        {/* Next Button */}
        {urls.length > 1 && (
          <button
            onClick={() => setActiveIndex(prev => Math.min(prev + 1, urls.length - 1))}
            disabled={activeIndex === urls.length - 1}
            style={{
              position: "absolute",
              right: "1.5rem",
              zIndex: 10,
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: activeIndex === urls.length - 1 ? "rgba(255,255,255,0.02)" : "rgba(17, 24, 39, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: activeIndex === urls.length - 1 ? "rgba(255,255,255,0.2)" : "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: activeIndex === urls.length - 1 ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              transition: "all 0.2s",
            }}
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      {/* ── Bottom Page Carousel & Thumbnail Navigation ───────────────────── */}
      {urls.length > 1 && (
        <div
          style={{
            padding: "0.85rem 1.5rem",
            background: "rgba(17, 24, 39, 0.85)",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.85rem",
            overflowX: "auto",
          }}
        >
          {urls.map((url, index) => {
            const isSelected = index === activeIndex;
            return (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                style={{
                  position: "relative",
                  width: "60px",
                  height: "70px",
                  borderRadius: "6px",
                  overflow: "hidden",
                  border: isSelected ? "2px solid #00e5ff" : "1px solid rgba(255, 255, 255, 0.15)",
                  background: "rgba(0, 0, 0, 0.4)",
                  padding: 0,
                  cursor: "pointer",
                  opacity: isSelected ? 1 : 0.6,
                  transition: "all 0.15s",
                  boxShadow: isSelected ? "0 0 12px rgba(0, 229, 255, 0.4)" : "none",
                }}
              >
                <img src={url} alt={`Thumbnail ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: isSelected ? "#00e5ff" : "rgba(0,0,0,0.7)", color: isSelected ? "#0a0e17" : "#fff", fontSize: "0.65rem", fontWeight: 800, textAlign: "center", padding: "1px 0" }}>
                  Page {index + 1}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
