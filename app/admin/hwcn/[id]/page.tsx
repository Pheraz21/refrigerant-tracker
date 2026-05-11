"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AdminHWCNDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [hwcn, setHwcn] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Part E form
  const [receivedBy, setReceivedBy] = useState("");
  const [accepted, setAccepted] = useState(true);
  const [rejectionDetails, setRejectionDetails] = useState("");
  const [vehicleReg, setVehicleReg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const hwcnId = decodeURIComponent(id as string);

  useEffect(() => {
    db.getHWCN(hwcnId).then(data => {
      setHwcn(data);
      setLoading(false);
      if (data?.receivedBy) setReceivedBy(data.receivedBy);
    });
  }, [id]);

  const handleSubmitPartE = async () => {
    setSubmitting(true);
    await db.completePartE(hwcnId, {
      receivedBy: receivedBy || user?.name || "Office Staff",
      accepted,
      rejectionDetails: !accepted ? rejectionDetails : undefined,
      vehicleReg: vehicleReg || undefined
    });
    setSubmitting(false);
    setSuccess(true);
  };

  if (loading) return <div style={{padding: "2rem", color: "var(--text-muted)"}}>Loading...</div>;
  if (!hwcn) return <div style={{padding: "2rem", color: "var(--error)"}}>HWCN not found</div>;

  const formattedDate = new Date(hwcn.date).toLocaleDateString("en-GB");
  const formattedTime = new Date(hwcn.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const deliveredDate = hwcn.deliveredAt ? new Date(hwcn.deliveredAt).toLocaleDateString("en-GB") : "—";
  const deliveredTime = hwcn.deliveredAt ? new Date(hwcn.deliveredAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
  const primarySite = hwcn.sites?.[0];
  const isOffice = hwcn.destination === "HQ-Stores";
  const isPending = hwcn.hwcnStatus === "awaiting_consignee";

  if (success) {
    return (
      <div style={{maxWidth: "600px", margin: "4rem auto", textAlign: "center"}}>
        <CheckCircle2 size={64} color="#22c55e" style={{marginBottom: "1rem"}} />
        <h2 style={{fontSize: "1.5rem", marginBottom: "0.5rem"}}>Part E Complete</h2>
        <p style={{color: "var(--text-muted)", marginBottom: "2rem"}}>HWCN {hwcn.id} has been fully signed off.</p>
        <Link href="/admin/hwcn">
          <button style={{padding: "0.75rem 2rem", background: "#00e5ff", color: "#000", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem"}}>
            Back to HWCN Queue
          </button>
        </Link>
      </div>
    );
  }

  const field = (label: string, value?: string) => (
    <div style={{ marginBottom: "0.35rem", display: "flex", gap: "0.25rem", alignItems: "baseline" }}>
      <span style={{ fontSize: "0.72rem", color: "#444", whiteSpace: "nowrap", minWidth: "80px" }}>{label}:</span>
      <span style={{ borderBottom: "1px solid #aaa", flex: 1, minHeight: "1.1rem", fontSize: "0.9rem", fontWeight: 500 }}>{value || ""}</span>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem"}}>
        <div style={{display: "flex", alignItems: "center", gap: "1rem"}}>
          <button onClick={() => router.back()} style={{background: "none", border: "none", padding: 0, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.9rem"}}>
            <ArrowLeft size={18} /> Back
          </button>
          <span style={{fontFamily: "var(--font-geist-mono)", fontSize: "1.3rem", fontWeight: 800, color: "#00e5ff"}}>{hwcn.id}</span>
          {(() => {
            const s = hwcn.hwcnStatus;
            const badge = s === "complete"
              ? { bg: "rgba(34,197,94,0.12)", color: "#22c55e", label: "Complete" }
              : s === "awaiting_consignee"
              ? { bg: "rgba(255,193,7,0.15)", color: "#ffc107", label: "Awaiting Part E" }
              : { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", label: "In Transit" };
            return <span style={{background: badge.bg, color: badge.color, padding: "0.3rem 0.85rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600}}>{badge.label}</span>;
          })()}
        </div>
        <button onClick={() => router.push(`/admin/hwcn/${encodeURIComponent(hwcn.id)}/print`)} style={{padding: "0.6rem 1.25rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", cursor: "pointer", fontSize: "0.85rem"}}>
          View Printable HWCN →
        </button>
      </div>

      {/* HWCN Summary */}
      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem"}}>
        {/* Left: Parts A-B summary */}
        <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.5rem"}}>
          <h3 style={{fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", color: "#00e5ff"}}>Consignment Details</h3>
          <div style={{display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.9rem"}}>
            <div><span style={{color: "var(--text-muted)", fontSize: "0.78rem"}}>Bottle Serial</span><div style={{fontFamily: "var(--font-geist-mono)", fontWeight: 700}}>{hwcn.serial}</div></div>
            <div><span style={{color: "var(--text-muted)", fontSize: "0.78rem"}}>Gas Type</span><div>{hwcn.gasType || "Mixed / Unknown"}</div></div>
            <div><span style={{color: "var(--text-muted)", fontSize: "0.78rem"}}>Fill Weight</span><div>{hwcn.fillWeight ? `${hwcn.fillWeight} kg` : "—"}</div></div>
            <div><span style={{color: "var(--text-muted)", fontSize: "0.78rem"}}>Removal Site(s)</span>
              {hwcn.sites?.map((s: any, i: number) => (
                <div key={i} style={{fontSize: "0.85rem"}}>{s.name}, {s.address} {s.postcode}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Parts C-D summary */}
        <div style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.5rem"}}>
          <h3 style={{fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", color: "#00e5ff"}}>Transport Details</h3>
          <div style={{display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.9rem"}}>
            <div><span style={{color: "var(--text-muted)", fontSize: "0.78rem"}}>Carrier (Engineer)</span><div style={{fontWeight: 600}}>{hwcn.engineer}</div></div>
            <div><span style={{color: "var(--text-muted)", fontSize: "0.78rem"}}>Vehicle Registration</span><div style={{fontFamily: "var(--font-geist-mono)"}}>{hwcn.vehicleReg || "—"}</div></div>
            <div><span style={{color: "var(--text-muted)", fontSize: "0.78rem"}}>Destination</span><div>{hwcn.destination}</div></div>
            <div><span style={{color: "var(--text-muted)", fontSize: "0.78rem"}}>Consignment Date</span><div>{formattedDate} at {formattedTime}</div></div>
            <div><span style={{color: "var(--text-muted)", fontSize: "0.78rem"}}>Delivered</span><div style={{fontWeight: 600, color: hwcn.deliveredAt ? "#22c55e" : "#ffc107"}}>{deliveredDate} {deliveredTime}</div></div>
          </div>
        </div>
      </div>

      {/* Part E - Editable if pending */}
      <div style={{
        background: isPending ? "rgba(255,193,7,0.04)" : "rgba(34,197,94,0.03)",
        border: `1px solid ${isPending ? "rgba(255,193,7,0.2)" : "rgba(34,197,94,0.15)"}`,
        borderRadius: "12px",
        padding: "1.5rem"
      }}>
        <h3 style={{fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.25rem", color: isPending ? "#ffc107" : "#22c55e"}}>
          Part E: Consignee&apos;s Certificate
        </h3>
        <p style={{fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1.5rem"}}>
          {hwcn.hwcnStatus === "draft" 
            ? "This consignment is currently in transit. Has it arrived at your location?" 
            : isPending 
            ? "Complete the fields below to sign off this consignment." 
            : "This section has been completed."}
        </p>

        {hwcn.hwcnStatus === "draft" && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem'}}>
            <button 
              onClick={async () => {
                setSubmitting(true);
                // Call completeTransit from the office side
                await db.completeTransit(hwcn.serial, undefined, user?.name || "Office Staff");
                // Refresh local data
                const updatedHwcn = await db.getHWCN(hwcnId);
                setHwcn(updatedHwcn);
                setSubmitting(false);
              }}
              disabled={submitting}
              style={{
                width: "100%", padding: "0.85rem", background: "var(--primary)", color: "#000", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer"
              }}
            >
              {submitting ? <Loader2 size={18} className="spinner" /> : "Confirm Arrival / Receive Bottle"}
            </button>
            <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center'}}>
              This will update the bottle location to your office and move the HWCN to 'Awaiting Part E'.
            </p>
          </div>
        )}

        {isPending ? (
          <div style={{display: "flex", flexDirection: "column", gap: "1.25rem"}}>
            <div>
              <label style={{display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.4rem", fontWeight: 600}}>Received By (Your Name)</label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder={user?.name || "Enter your name"}
                style={{width: "100%", padding: "0.7rem 1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", fontSize: "0.95rem", outline: "none", boxSizing: "border-box"}}
              />
            </div>

            <div>
              <label style={{display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.4rem", fontWeight: 600}}>Accepted or Rejected?</label>
              <div style={{display: "flex", gap: "0.5rem"}}>
                <button onClick={() => setAccepted(true)} style={{flex: 1, padding: "0.65rem", borderRadius: "8px", border: `2px solid ${accepted ? "#22c55e" : "rgba(255,255,255,0.1)"}`, background: accepted ? "rgba(34,197,94,0.1)" : "transparent", color: accepted ? "#22c55e" : "rgba(255,255,255,0.5)", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem"}}>
                  ✓ Accepted
                </button>
                <button onClick={() => setAccepted(false)} style={{flex: 1, padding: "0.65rem", borderRadius: "8px", border: `2px solid ${!accepted ? "#ff3366" : "rgba(255,255,255,0.1)"}`, background: !accepted ? "rgba(255,51,102,0.1)" : "transparent", color: !accepted ? "#ff3366" : "rgba(255,255,255,0.5)", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem"}}>
                  ✗ Rejected
                </button>
              </div>
            </div>

            {!accepted && (
              <div>
                <label style={{display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.4rem", fontWeight: 600}}>Rejection Details</label>
                <textarea
                  value={rejectionDetails}
                  onChange={(e) => setRejectionDetails(e.target.value)}
                  placeholder="Provide details for rejection..."
                  rows={3}
                  style={{width: "100%", padding: "0.7rem 1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,51,102,0.3)", borderRadius: "8px", color: "#fff", fontSize: "0.9rem", outline: "none", resize: "vertical", boxSizing: "border-box"}}
                />
              </div>
            )}

            <div>
              <label style={{display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.4rem", fontWeight: 600}}>Vehicle Registration (if different from carrier&apos;s)</label>
              <input
                type="text"
                value={vehicleReg}
                onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                placeholder="Optional — leave blank if same"
                style={{width: "100%", padding: "0.7rem 1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", fontSize: "0.95rem", outline: "none", boxSizing: "border-box"}}
              />
            </div>

            <button
              onClick={handleSubmitPartE}
              disabled={submitting || !receivedBy}
              style={{
                width: "100%",
                padding: "0.85rem",
                background: submitting || !receivedBy ? "rgba(0,229,255,0.3)" : "linear-gradient(135deg, #00e5ff 0%, #0088ff 100%)",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: submitting ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                marginTop: "0.5rem"
              }}
            >
              {submitting ? <><Loader2 size={18} style={{animation: "spin 1s linear infinite"}} /> Submitting...</> : "Complete Part E — Sign Off Consignment"}
            </button>
          </div>
        ) : (
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.9rem"}}>
            <div><span style={{color: "var(--text-muted)", fontSize: "0.78rem"}}>Received By</span><div style={{fontWeight: 600}}>{hwcn.receivedBy}</div></div>
            <div><span style={{color: "var(--text-muted)", fontSize: "0.78rem"}}>Status</span><div style={{fontWeight: 600, color: hwcn.accepted !== false ? "#22c55e" : "#ff3366"}}>{hwcn.accepted !== false ? "Accepted" : "Rejected"}</div></div>
            <div><span style={{color: "var(--text-muted)", fontSize: "0.78rem"}}>Completed</span><div>{hwcn.partECompletedAt ? new Date(hwcn.partECompletedAt).toLocaleString("en-GB") : "—"}</div></div>
            {hwcn.rejectionDetails && <div><span style={{color: "var(--text-muted)", fontSize: "0.78rem"}}>Rejection Details</span><div style={{color: "#ff3366"}}>{hwcn.rejectionDetails}</div></div>}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `@keyframes spin { to { transform: rotate(360deg); } }`}} />
    </div>
  );
}
