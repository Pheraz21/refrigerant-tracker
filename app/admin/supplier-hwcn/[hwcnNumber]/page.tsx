"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, Camera, Package } from "lucide-react";
import Link from "next/link";
import { db, SupplierReturnGroup, Bottle } from "@/lib/db";

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
      <Link href="/admin/all-hwcns" style={{ color: "#00e5ff", fontSize: "0.9rem" }}>← Back to All HWCNs</Link>
    </div>
  );

  const destination = group.supplier && group.supplierBranch
    ? `${group.supplier} — ${group.supplierBranch}`
    : group.supplier || "Supplier (Returned)";

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; color: #000 !important; }
          .print-card { background: #fff !important; border: 1px solid #ccc !important; color: #000 !important; }
          .print-table th, .print-table td { border-color: #999 !important; color: #000 !important; }
        }
      `}</style>

      {/* Top bar — hidden on print */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <Link href="/admin/all-hwcns" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", textDecoration: "none", fontSize: "0.9rem" }}>
          <ArrowLeft size={16} /> Back to All HWCNs
        </Link>
        <button
          onClick={() => window.print()}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.2rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}
        >
          <Printer size={16} /> Print / PDF
        </button>
      </div>

      {/* Main document */}
      <div className="print-card" style={{ maxWidth: "860px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(168,85,247,0.07)" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a855f7", marginBottom: "0.5rem" }}>
            Hazardous Waste — Supplier Return Note
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "1rem", fontFamily: "var(--font-geist-mono)" }}>
            {hwcnNumber}
          </h1>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
            {[
              { label: "Date", value: formatDate(group.returnedAt) },
              { label: "Time", value: formatTime(group.returnedAt) },
              { label: "Returned by", value: group.returnedBy || "—" },
              { label: "Destination", value: destination },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>{f.label}</div>
                <div style={{ fontSize: "0.92rem", fontWeight: 600 }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottles table */}
        <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Package size={18} /> Bottles Included ({bottles.length})
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table className="print-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "480px" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                  {["Serial", "Gas Type", "Weight Returned (kg)", "Full Bottle Weight (kg)"].map(h => (
                    <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bottles.map((b, i) => (
                  <tr key={b.serial} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                    <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "#00e5ff", fontSize: "0.88rem" }}>{b.serial}</td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.88rem" }}>{b.gasType || "—"}</td>
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
            <Camera size={18} /> Supplier HWCN Photo
          </h2>
          {group.photoUrl ? (
            <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(168,85,247,0.25)", maxWidth: "600px" }}>
              <img
                src={group.photoUrl}
                alt={`Supplier HWCN ${hwcnNumber}`}
                style={{ width: "100%", display: "block" }}
              />
              <div style={{ padding: "0.5rem 1rem", background: "rgba(168,85,247,0.06)", display: "flex", justifyContent: "flex-end" }}>
                <a href={group.photoUrl} target="_blank" rel="noreferrer" style={{ color: "#a855f7", fontSize: "0.82rem", textDecoration: "none", fontWeight: 600 }}>
                  Open full size →
                </a>
              </div>
            </div>
          ) : (
            <div style={{ padding: "2rem", textAlign: "center", border: "2px dashed rgba(255,255,255,0.08)", borderRadius: "10px", color: "var(--text-muted)", fontSize: "0.88rem" }}>
              No photo uploaded for this return note.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
