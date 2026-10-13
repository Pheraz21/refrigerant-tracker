"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, Bottle } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import {
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
  Archive,
  CheckCircle2,
  FileText,
  Truck,
  RotateCcw,
  Loader2,
  Info
} from "lucide-react";
import Link from "next/link";

export default function BottleArchivePage() {
  const { serial } = useParams();
  const serialStr = decodeURIComponent(serial as string);
  const router = useRouter();
  const { user } = useAuth();

  const [bottle, setBottle] = useState<Bottle | null>(null);
  const [usageLogs, setUsageLogs] = useState<any[]>([]);
  const [movementLogs, setMovementLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [reasonCategory, setReasonCategory] = useState("condemned");
  const [customDetails, setCustomDetails] = useState("");
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!serialStr) return;
    Promise.all([
      db.getBottle(serialStr),
      db.getUsageLogs(serialStr),
      db.getMovementLogs(serialStr)
    ]).then(([b, u, m]) => {
      setBottle(b);
      setUsageLogs(u || []);
      setMovementLogs(m || []);
      setLoading(false);
    });
  }, [serialStr]);

  const handleExecuteArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!confirmCheckbox) {
      setError("You must tick the confirmation box to confirm this compliance action.");
      return;
    }
    if (!customDetails.trim()) {
      setError("Please provide specific audit details explaining why this cylinder is being archived.");
      return;
    }

    setIsSubmitting(true);
    try {
      const categoryLabels: Record<string, string> = {
        condemned: "Condemned / Destroyed (Failed PSSR/ADR Pressure Re-test)",
        lost_stolen: "Lost or Stolen from Site/Van",
        registration_error: "Registration Error / Duplicate Serial",
        obsolete: "Obsolete / Permanently Decommissioned Cylinder",
        other: "Other Administrative Compliance Exception"
      };

      const fullReason = `[${categoryLabels[reasonCategory] || "Compliance Archive"}] ${customDetails.trim()}`;
      await db.purgeBottleWithLogs(serialStr, user?.name || "Admin", fullReason);
      
      router.push(`/admin/bottles/${encodeURIComponent(serialStr)}`);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to archive cylinder. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
        <Loader2 size={32} className="spinner" style={{ margin: "0 auto 1rem" }} />
        Loading cylinder compliance history...
      </div>
    );
  }

  if (!bottle) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <h2>Cylinder Not Found</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>No cylinder found for serial {serialStr}.</p>
        <Link href="/admin/bottles">
          <button style={{ padding: "0.6rem 1.2rem", background: "#00e5ff", color: "#000", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>
            Back to Inventory
          </button>
        </Link>
      </div>
    );
  }

  const isAlreadyArchived = bottle.status === "archived";

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", paddingBottom: "4rem" }}>
      {/* Top back navigation */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href={`/admin/bottles/${encodeURIComponent(serialStr)}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--text-muted)",
            textDecoration: "none",
            fontSize: "0.9rem",
            marginBottom: "0.75rem"
          }}
        >
          <ArrowLeft size={16} /> Back to Cylinder {serialStr}
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <ShieldAlert size={28} color="#f59e0b" />
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: 0 }}>
            Compliance Archive &mdash; <span style={{ color: "#00e5ff", fontFamily: "monospace" }}>{bottle.serial}</span>
          </h1>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.35rem" }}>
          Statutory F-Gas Compliance Vault &bull; 5-Year Regulatory Data Retention
        </p>
      </div>

      {isAlreadyArchived ? (
        <div style={{
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "12px",
          padding: "2rem",
          textAlign: "center"
        }}>
          <Archive size={48} color="#ef4444" style={{ margin: "0 auto 1rem" }} />
          <h2 style={{ color: "#ef4444", fontSize: "1.4rem", marginBottom: "0.5rem" }}>This Cylinder is Already Archived</h2>
          <p style={{ color: "rgba(255,255,255,0.8)", maxWidth: "600px", margin: "0 auto 1.5rem" }}>
            Cylinder <strong>{bottle.serial}</strong> has already been soft-archived. Its complete historical audit trail ({usageLogs.length} usage logs and {movementLogs.length} movement records) is permanently preserved in the compliance vault.
          </p>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            <strong>Archived By:</strong> {bottle.archivedBy || "Admin"} &bull; <strong>Date:</strong> {bottle.archivedAt ? new Date(bottle.archivedAt).toLocaleString("en-GB") : "Recorded"}
            {bottle.archiveReason && (
              <div style={{ marginTop: "0.5rem", fontStyle: "italic", color: "#fca5a5" }}>
                &ldquo;{bottle.archiveReason}&rdquo;
              </div>
            )}
          </div>
          <Link href={`/admin/bottles/${encodeURIComponent(serialStr)}`}>
            <button style={{ padding: "0.7rem 1.5rem", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
              Return to Cylinder Details
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* 1. CRITICAL OPERATIONAL WARNING (RETURN VS ARCHIVE) */}
          <div style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "2px solid #f59e0b",
            borderRadius: "12px",
            padding: "1.5rem",
            position: "relative"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <AlertTriangle size={24} color="#f59e0b" />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f59e0b", margin: 0 }}>
                STOP AND VERIFY: Are you returning this cylinder to a gas supplier?
              </h3>
            </div>
            <p style={{ fontSize: "0.92rem", lineHeight: 1.5, color: "rgba(255,255,255,0.9)", margin: "0 0 1rem" }}>
              If this cylinder was simply emptied or used for gas recovery and has been returned (or collected) by a gas wholesaler (e.g. <strong>BOC, A-Gas, Harp, Climalife</strong>):
            </p>
            <div style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1rem"
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", marginBottom: "0.6rem" }}>
                <span style={{ fontSize: "1.1rem" }}>❌</span>
                <div>
                  <strong>DO NOT ARCHIVE THIS CYLINDER:</strong> Archiving permanently retires the serial and will prevent automatic cylinder recirculation when the wholesaler delivers the refilled serial back in the future.
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.1rem" }}>✅</span>
                <div>
                  <strong>USE &ldquo;RETURN TO SUPPLIER&rdquo; INSTEAD:</strong> Normal supplier returns must be processed via the engineer van return flow or via{" "}
                  <Link href="/admin/stores-collection" style={{ color: "#00e5ff", fontWeight: 700, textDecoration: "underline" }}>
                    HQ Stores Supplier Collection
                  </Link>{" "}
                  to satisfy Environment Agency Hazardous Waste / Duty of Care records.
                </div>
              </div>
            </div>
          </div>

          {/* 2. REGULATORY EXPLANATION (WHY HARD DELETE IS FORBIDDEN) */}
          <div style={{
            background: "rgba(14, 165, 233, 0.06)",
            border: "1px solid rgba(14, 165, 233, 0.25)",
            borderRadius: "12px",
            padding: "1.25rem 1.5rem"
          }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#38bdf8", margin: "0 0 0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Info size={18} /> Statutory F-Gas Retention Requirement (UK F-Gas Regs 2015 &amp; Retained EU 517/2014)
            </h4>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.45, margin: 0 }}>
              Under <strong>Article 6</strong> of the F-Gas Regulations and <strong>Hazardous Waste Regulations 2005</strong>, hard-deleting records is strictly prohibited. Archiving isolates this cylinder from active engineer dropdowns while permanently securing all <strong>{usageLogs.length} usage logs</strong> and <strong>{movementLogs.length} movement logs</strong> for a minimum of <strong>5 years</strong> for Environment Agency audits.
            </p>
          </div>

          {/* 3. CYLINDER SUMMARY CARD */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            padding: "1.25rem 1.5rem"
          }}>
            <h4 style={{ fontSize: "0.9rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 1rem" }}>
              Cylinder Details &amp; Linked Compliance Records
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Serial Number</span>
                <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1.1rem", color: "#00e5ff" }}>{bottle.serial}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Gas Type / Category</span>
                <div style={{ fontWeight: 600 }}>{bottle.gasType} ({bottle.category})</div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Current Weight</span>
                <div style={{ fontWeight: 600 }}>{bottle.currentWeight} kg (Initial: {bottle.initialWeight} kg)</div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Current Location</span>
                <div style={{ fontWeight: 600 }}>{bottle.locationType} &bull; {bottle.locationId}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Usage Visits Logged</span>
                <div style={{ fontWeight: 700, color: "#22c55e" }}>{usageLogs.length} statutory records</div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Movement History</span>
                <div style={{ fontWeight: 700, color: "#22c55e" }}>{movementLogs.length} movement entries</div>
              </div>
            </div>
          </div>

          {/* 4. ARCHIVING FORM */}
          <form onSubmit={handleExecuteArchive} style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            padding: "1.5rem"
          }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem", color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Archive size={18} color="#f59e0b" /> Complete Compliance Archive Justification
            </h3>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: "0.5rem" }}>
                Reason for Archiving <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={reasonCategory}
                onChange={e => setReasonCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.95rem",
                  outline: "none"
                }}
              >
                <option value="condemned">Condemned / Destroyed (Failed 10-year hydraulic pressure re-test / PSSR / ADR)</option>
                <option value="lost_stolen">Lost or Stolen (Missing from customer site or van)</option>
                <option value="registration_error">Registration Typo / Duplicate Serial Record</option>
                <option value="obsolete">Obsolete / Scrapped (End of statutory operational service life)</option>
                <option value="other">Other Administrative Compliance Exception</option>
              </select>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: "0.5rem" }}>
                Specific Audit Justification &amp; Notes <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                required
                rows={4}
                value={customDetails}
                onChange={e => setCustomDetails(e.target.value)}
                placeholder="Provide specific justification (e.g. Test house destruction certificate ref, police crime reference for theft, or reason for serial deprecation)..."
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.9rem",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box"
                }}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.3rem", display: "block" }}>
                This statement is written into the permanent <code>movement_logs</code> under your name: <strong>{user?.name || "Admin"}</strong>.
              </span>
            </div>

            <div style={{
              marginBottom: "1.5rem",
              background: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "8px",
              padding: "1rem"
            }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={confirmCheckbox}
                  onChange={e => setConfirmCheckbox(e.target.checked)}
                  style={{ marginTop: "0.2rem", width: "16px", height: "16px", accentColor: "#ef4444" }}
                />
                <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.9)", lineHeight: 1.4 }}>
                  <strong>Mandatory Compliance Declaration:</strong> I confirm this cylinder is <u>NOT</u> a standard supplier return. I understand this action isolates the cylinder from operational picklists while permanently preserving all {usageLogs.length + movementLogs.length} historical audit records in compliance with UK F-Gas and Hazardous Waste regulations.
                </span>
              </label>
            </div>

            {error && (
              <div style={{
                padding: "0.75rem 1rem",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid #ef4444",
                borderRadius: "8px",
                color: "#fca5a5",
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", alignItems: "center" }}>
              <Link href={`/admin/bottles/${encodeURIComponent(serialStr)}`} style={{ textDecoration: "none" }}>
                <button
                  type="button"
                  style={{
                    padding: "0.75rem 1.25rem",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "0.9rem",
                    cursor: "pointer"
                  }}
                >
                  Cancel &mdash; Keep Cylinder Active
                </button>
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !confirmCheckbox}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: !confirmCheckbox || isSubmitting ? "rgba(239, 68, 68, 0.3)" : "#ef4444",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: !confirmCheckbox || isSubmitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                {isSubmitting ? (
                  <><Loader2 size={18} className="spinner" /> Archiving...</>
                ) : (
                  <><Archive size={18} /> Confirm &amp; Archive Cylinder</>
                )}
              </button>
            </div>
          </form>

        </div>
      )}
    </div>
  );
}
