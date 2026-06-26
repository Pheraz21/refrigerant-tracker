"use client";

import Link from "next/link";
import { BookOpen, FileText, ChevronRight } from "lucide-react";

const documents = [
  {
    id: "sop-001",
    code: "SOP-001",
    title: "New Refrigerant Cylinder — Receipt, Allocation, Use and Return",
    version: "1.0",
    issued: "26 June 2026",
    review: "26 June 2027",
    description: "Covers the controlled process for receiving new virgin refrigerant cylinders from suppliers, allocating to certified engineers, recording on-site usage, and managing returns.",
    regulatory: "UK F-Gas Regulations 2015 (SI 2015/310) · Regulation (EU) 517/2014 (retained) · REFCOM REF1010728",
    href: "/admin/docs/sop-001",
  },
  {
    id: "sop-002",
    code: "SOP-002",
    title: "Recovery Cylinder — Refrigerant Recovery, Waste Claim (HWCN) and Return to Supplier",
    version: "1.0",
    issued: "26 June 2026",
    review: "26 June 2027",
    description: "Covers the full lifecycle of recovery cylinders: on-site refrigerant recovery, single-site vs. multi-site determination, HWCN generation, Part E sign-off, and return to authorised supplier.",
    regulatory: "Hazardous Waste Regs 2005 (SI 2005/894) · Environmental Protection Act 1990 · UK F-Gas Regulations 2015 · EWC 14 06 01",
    href: "/admin/docs/sop-002",
  },
];

export default function DocsPage() {
  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <BookOpen size={28} /> Procedures &amp; SOPs
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          REFCOM REF1010728 &mdash; F-Gas compliance procedures for external audit. Open any document to read online or copy to Word.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {documents.map(doc => (
          <Link key={doc.id} href={doc.href} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="glass-panel" style={{
              padding: "1.5rem",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.08)",
              transition: "border-color 0.15s, background 0.15s",
              cursor: "pointer",
              display: "flex",
              alignItems: "flex-start",
              gap: "1.25rem",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,229,255,0.3)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              <div style={{
                width: "48px", height: "48px", borderRadius: "10px",
                background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
              }}>
                <FileText size={22} color="#00e5ff" />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
                    color: "#00e5ff", textTransform: "uppercase",
                    background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)",
                    padding: "0.15rem 0.5rem", borderRadius: "4px"
                  }}>{doc.code}</span>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>
                    Version {doc.version} &bull; Issued {doc.issued} &bull; Review {doc.review}
                  </span>
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 600, color: "#fff", marginBottom: "0.4rem" }}>{doc.title}</div>
                <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.55)", marginBottom: "0.5rem", lineHeight: 1.5 }}>{doc.description}</div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.4 }}>{doc.regulatory}</div>
              </div>

              <ChevronRight size={20} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginTop: "0.25rem" }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
