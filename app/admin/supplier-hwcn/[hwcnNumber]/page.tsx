"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, Camera, Package, Maximize2 } from "lucide-react";
import Link from "next/link";
import { db, SupplierReturnGroup, Bottle } from "@/lib/db";
import HwcnLightboxModal from "@/components/HwcnLightboxModal";

interface BottleDetail extends Bottle {
  weightReturned: number;
}

export default function SupplierHWCNDetailPage() {
  const params = useParams();
  const hwcnNumber = decodeURIComponent(params.hwcnNumber as string);

  const [group, setGroup] = useState<SupplierReturnGroup | null>(null);
  const [bottles, setBottles] = useState<BottleDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const groups = await db.getSupplierReturnGroups();
      const found = groups.find(g => g.hwcnNumber === hwcnNumber);
      if (!found) { setNotFound(true); setLoading(false); return; }
      setGroup(found);

      const details = await Promise.all(
        found.serials.map(async serial => {
          const b = await db.getBottle(serial);
          return { ...(b || { serial, gasType: "—", currentWeight: 0 } as any), weightReturned: b?.currentWeight ?? 0 } as BottleDetail;
        })
      );
      setBottles(details);
      setLoading(false);
    }
    load();
  }, [hwcnNumber]);

  const formatDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString("en-GB") : "—";
  const formatTime = (iso: string) =>
    iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";

  if (loading) return <p style={{ color: "var(--text-muted)", padding: "2rem" }}>Loading…</p>;
  if (notFound || !group) return (
    <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
      <Package size={48} style={{ opacity: 0.3, marginBottom: "1rem" }} />
      <p>Supplier return note <strong>{hwcnNumber}</strong> not found.</p>
      <Link href="/admin/supplier-returns-waste" style={{ color: "var(--primary)", marginTop: "1rem", display: "inline-block" }}>
        ← Back to Supplier Returns
      </Link>
    </div>
  );

  return (
    <>
      <HwcnLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        photoUrl={group.photoUrl}
        title={`Supplier HWCN — ${hwcnNumber}`}
      />

      <div style={{ maxWidth: "1000px" }}>
        {/* Header bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <Link
            href="/admin/supplier-returns-waste"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", textDecoration: "none", fontSize: "0.88rem" }}
          >
            <ArrowLeft size={16} /> Back to Supplier Returns & Waste
          </Link>
        </div>

        {/* Note Card */}
        <div className="glass-panel" style={{ padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
          <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(168,85,247,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#a855f7", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "0.2rem" }}>
                Hazardous Waste Consignment Note
              </div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, fontFamily: "var(--font-geist-mono)" }}>
                {group.hwcnNumber}
              </h1>
            </div>

            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Returned On</div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{formatDate(group.returnedAt)} <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{formatTime(group.returnedAt)}</span></div>
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Processed By</div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{group.returnedBy}</div>
              </div>
              {group.supplier && (
                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Supplier</div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#00e5ff" }}>{group.supplier} {group.supplierBranch ? `(${group.supplierBranch})` : ""}</div>
                </div>
              )}
            </div>
          </div>

          {/* Serials & gas types list */}
          <div style={{ padding: "1.5rem 2rem" }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "1rem" }}>Cylinders Included ({bottles.length})</h2>
            <div style={{ borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                    <th style={{ padding: "0.6rem 1rem", textAlign: "left", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Serial Number</th>
                    <th style={{ padding: "0.6rem 1rem", textAlign: "left", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Gas Type</th>
                    <th style={{ padding: "0.6rem 1rem", textAlign: "left", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Weight Returned</th>
                    <th style={{ padding: "0.6rem 1rem", textAlign: "left", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Initial Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {bottles.map(b => (
                    <tr key={b.serial} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-geist-mono)", color: "var(--primary)", fontWeight: 700 }}>
                        <Link href={`/admin/bottles/${b.serial}`} style={{ color: "var(--primary)", textDecoration: "none" }}>
                          {b.serial}
                        </Link>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.88rem" }}>{b.gasType}</td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.88rem" }}>
                        {b.weightReturned != null ? `${Number(b.weightReturned).toFixed(2)} kg` : "—"}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.88rem", color: "var(--text-muted)" }}>
                        {b.initialWeight != null ? `${Number(b.initialWeight).toFixed(2)} kg` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
                    <td colSpan={2} style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", fontWeight: 700 }}>Total weight returned</td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.95rem", fontWeight: 800, color: "#a855f7" }}>
                      {group.totalWeight.toFixed(2)} kg
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Photo section */}
          <div style={{ padding: "1.5rem 2rem" }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Camera size={18} /> Supplier HWCN Photo Documentation
            </h2>
            {group.photoUrl ? (() => {
              const photos = group.photoUrl.split(",").map(s => s.trim()).filter(Boolean);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "650px" }}>
                  {photos.map((url, idx) => (
                    <div key={idx} style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(168,85,247,0.25)", background: "rgba(17,24,39,0.4)" }}>
                      <img
                        src={url}
                        alt={`Supplier HWCN ${hwcnNumber} - Page ${idx + 1}`}
                        onClick={() => setIsLightboxOpen(true)}
                        style={{ width: "100%", display: "block", cursor: "pointer" }}
                      />
                      <div style={{ padding: "0.5rem 1rem", background: "rgba(168,85,247,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>
                          {photos.length > 1 ? `Page ${idx + 1} of ${photos.length}` : "Documentation"}
                        </span>
                        <button
                          onClick={() => setIsLightboxOpen(true)}
                          style={{ background: "none", border: "none", color: "#a855f7", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
                        >
                          <Maximize2 size={13} /> Open Lightbox Viewer →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })() : (
              <div style={{ padding: "2rem", textAlign: "center", border: "2px dashed rgba(255,255,255,0.08)", borderRadius: "10px", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                No photo uploaded for this return note.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
