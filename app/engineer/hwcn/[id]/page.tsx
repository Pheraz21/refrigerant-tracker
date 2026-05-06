"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";

const cell = (content: React.ReactNode, style: React.CSSProperties = {}) => (
  <td style={{ border: "1px solid #999", padding: "0.15rem 0.4rem", verticalAlign: "top", fontSize: "0.78rem", lineHeight: 1.1, ...style }}>
    {content}
  </td>
);

const field = (label: string, value?: string, wide = false) => (
  <div style={{ marginBottom: "0.15rem", display: "flex", gap: "0.2rem", alignItems: "baseline" }}>
    <span style={{ fontSize: "0.68rem", color: "#444", whiteSpace: "nowrap", minWidth: wide ? "140px" : "75px" }}>{label}:</span>
    <span style={{ borderBottom: "1px solid #aaa", flex: 1, minHeight: "0.95rem", fontSize: "0.85rem", fontWeight: 500 }}>{value || ""}</span>
  </div>
);

export default function HWCNViewPage() {
  const { id } = useParams();
  const hwcnId = decodeURIComponent(id as string);
  const { user } = useAuth();
  const [hwcn, setHwcn] = useState<any>(null);
  const [usageLogs, setUsageLogs] = useState<any[]>([]);
  const [bottle, setBottle] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);

  const loadData = () => {
    db.getCompanySettings().then(setCompanySettings);
    db.getHWCN(hwcnId).then(data => {
      setHwcn(data);
      if (data?.serial) {
        db.getUsageLogs(data.serial).then(logs => setUsageLogs(logs));
        db.getBottle(data.serial).then(b => setBottle(b));
      }
    });
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleCompletePartE = async (accepted: boolean) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await db.completePartE(hwcnId, {
        receivedBy: user.name,
        receivedSignature: user.name, // Auto-signed
        accepted,
        vehicleReg: hwcn.vehicleReg // Copy from Part C if same
      });
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hwcn) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading HWCN Data...</div>;
  }

  const refrigerantType = bottle?.gasType || hwcn.gasType || "Unknown";
  const capacity = bottle?.initialWeight ? `${bottle.initialWeight.toFixed(2)} kg` : "—";

  const formattedDate = new Date(hwcn.date).toLocaleDateString("en-GB");
  const formattedTime = new Date(hwcn.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const deliveredDate = hwcn.deliveredAt ? new Date(hwcn.deliveredAt).toLocaleDateString("en-GB") : "";
  const deliveredTime = hwcn.deliveredAt ? new Date(hwcn.deliveredAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";

  const primarySite = hwcn.sites?.[0];
  const isOffice = hwcn.destination === "Office/Stores" || hwcn.destination === "Office / Stores";

  return (
    <div className="hwcn-container" style={{ maxWidth: "820px", margin: "0 auto", padding: "0.4rem", background: "#fff", color: "#000", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .hwcn-container, .hwcn-container * { visibility: visible; }
          .hwcn-container { position: absolute; left: 0; top: 0; width: 100%; background: white !important; margin: 0; padding: 0.2rem; }
          .no-print { display: none !important; }
        }
        .hwcn-section { border: 1px solid #888; margin-bottom: 0.25rem; }
        .hwcn-header { background: #ddd; padding: 0.2rem 0.5rem; font-weight: bold; font-size: 0.78rem; text-transform: uppercase; border-bottom: 1px solid #888; }
        .sig-box { border: 1px solid #999; min-height: 1.8rem; }
      `}} />

      {/* ── Nav bar (no-print) ── */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", padding: "0.75rem 1rem", background: "#111", borderRadius: "8px" }}>
        <Link href="/engineer" style={{ color: "#00e5ff", display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", fontSize: "0.9rem" }}>
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
      </div>

      {/* ── HWCN Status Banner (no-print) ── */}
      <div className="no-print" style={{
        marginBottom: "1rem",
        padding: "0.6rem 1rem",
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        fontWeight: 600,
        fontSize: "0.9rem",
        ...(hwcn.hwcnStatus === "complete"
          ? { background: "#d4edda", color: "#155724", border: "1px solid #c3e6cb" }
          : hwcn.hwcnStatus === "awaiting_consignee"
          ? { background: "#fff3cd", color: "#856404", border: "1px solid #ffc107" }
          : { background: "#e2e3e5", color: "#383d41", border: "1px solid #d6d8db" })
      }}>
        <span style={{ fontSize: "1.1rem" }}>
          {hwcn.hwcnStatus === "complete" ? "✅" : hwcn.hwcnStatus === "awaiting_consignee" ? "⏳" : "📋"}
        </span>
        <span>
          {hwcn.hwcnStatus === "complete"
            ? "HWCN Complete — All parts signed and verified."
            : hwcn.hwcnStatus === "awaiting_consignee"
            ? "Awaiting Consignee Completion — Office staff must complete Part E to finalise this HWCN."
            : "Draft — Engineer transfer not yet confirmed."}
        </span>
        
        {hwcn.hwcnStatus === "awaiting_consignee" && (user?.role === "admin" || user?.role === "office") && (
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
            <button 
              disabled={isSubmitting}
              onClick={() => handleCompletePartE(true)}
              style={{ background: "#28a745", color: "#fff", border: "none", padding: "0.4rem 0.8rem", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: "bold" }}
            >
              {isSubmitting ? <Loader2 size={16} className="spinner" /> : <><CheckCircle2 size={16} /> Confirm Receipt & Sign</>}
            </button>
            <button 
              disabled={isSubmitting}
              onClick={() => handleCompletePartE(false)}
              style={{ background: "#dc3545", color: "#fff", border: "none", padding: "0.4rem 0.8rem", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: "bold" }}
            >
              <XCircle size={16} /> Reject
            </button>
          </div>
        )}
      </div>

      {/* ── Document Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.4rem", paddingBottom: "0.4rem", borderBottom: "2px solid #333" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
          <img src="/21-degrees-logo-reports.png" alt="21 Degrees Ltd" style={{ width: "90px", height: "auto", display: "block" }} />
          <div style={{ fontSize: "0.65rem", lineHeight: 1.2, color: "#444", borderLeft: "1px solid #ccc", paddingLeft: "0.75rem" }}>
            <strong style={{ fontSize: "0.75rem", color: "#000" }}>21 Degrees Ltd</strong><br />
            Unit 10, Apollo Court, Monkton Business Park<br />
            Hebburn, Tyne & Wear, NE31 2ES<br />
            Tel: 0191 495 7224
          </div>
        </div>
        
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase" }}>Hazardous Waste Regulations 2005</div>
          <div style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#222", marginBottom: "0.2rem" }}>Consignment Note <span style={{ fontSize: "0.6rem", fontWeight: "normal", color: "#555" }}>(England &amp; Wales)</span></div>
          <div style={{ fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
            <div><span style={{ color: "#555" }}>Note Code: </span><strong style={{ fontFamily: "monospace" }}>{hwcn.id}</strong></div>
            <div><span style={{ color: "#555" }}>Bottle Serial: </span><strong style={{ fontFamily: "monospace" }}>{hwcn.serial}</strong></div>
            <div><span style={{ color: "#555" }}>Date Issued: </span><strong>{formattedDate}</strong></div>
          </div>
        </div>
      </div>

      {/* ─────────── PART A ─────────── */}
      <div className="hwcn-section">
        <div className="hwcn-header">Part A: Notification Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>

          {/* A2 – Removal site */}
          <div style={{ padding: "0.3rem 0.5rem", borderRight: "1px solid #888" }}>
            <div style={{ fontSize: "0.68rem", color: "#555", marginBottom: "0.15rem", fontWeight: "bold" }}>
              2. The waste described below is to be removed from:
            </div>
            {hwcn.sites?.map((site: any, i: number) => (
              <div key={i} style={{ fontSize: "0.78rem", borderBottom: "1px solid #eee", padding: "0.1rem 0", display: "flex", gap: "0.4rem" }}>
                <span style={{ fontWeight: "bold", minWidth: "40px" }}>Site {i + 1}:</span>
                <span style={{ flex: 1 }}>{site.name}, {site.address}, {site.postcode}</span>
              </div>
            )) || <div style={{ height: "1.1rem", borderBottom: "1px solid #eee" }} />}
          </div>

          {/* A3 – Destination + A4 producer */}
          <div style={{ padding: "0.3rem 0.5rem" }}>
            <div style={{ fontSize: "0.68rem", color: "#555", marginBottom: "0.1rem", fontWeight: "bold" }}>3. The waste will be taken to:</div>
            <div style={{ fontSize: "0.78rem", marginBottom: "0.2rem" }}>
              {isOffice ? "21 Degrees Ltd, Unit 10, Apollo Court, Monkton Business Park, NE31 2ES" : hwcn.destination}
            </div>

            <div style={{ borderTop: "1px solid #ccc", marginTop: "0.2rem", paddingTop: "0.2rem" }}>
              <div style={{ fontSize: "0.68rem", color: "#555", marginBottom: "0.1rem", fontWeight: "bold" }}>4. The waste producer was:</div>
              <div style={{ fontSize: "0.78rem" }}>
                21 Degrees Ltd, 10 Monkton Business Park, Apollo Court, Hebburn, NE31 2ES
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────── PART B ─────────── */}
      <div className="hwcn-section">
        <div className="hwcn-header">Part B: Description of the Waste</div>
        <div style={{ padding: "0.3rem 0.6rem" }}>
          <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.25rem", fontSize: "0.78rem" }}>
            <span><strong>1. Process giving rise to waste:</strong> Refrigeration / AC degassing</span>
            <span><strong>2. SIC code:</strong> 33 12/0</span>
          </div>
          <div style={{ fontSize: "0.68rem", marginBottom: "0.2rem", color: "#555" }}>3. Waste details:</div>
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem", minWidth: "600px" }}>
            <thead>
              <tr style={{ background: "#eee" }}>
                {cell("Waste Location", { fontWeight: "bold", width: "80px" })}
                {cell("EWC Code", { fontWeight: "bold", width: "60px" })}
                {cell("Chemical Component", { fontWeight: "bold" })}
                {cell("Form", { fontWeight: "bold", width: "50px" })}
                {cell("Hazard", { fontWeight: "bold", width: "50px" })}
                {cell("Refrigerant", { fontWeight: "bold", width: "70px" })}
                {cell("Weight", { fontWeight: "bold", width: "55px" })}
                {cell("Capacity", { fontWeight: "bold", width: "60px" })}
                {cell("Serial Number", { fontWeight: "bold" })}
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Pre-compute: get all recovery logs sorted chronologically (oldest first)
                const recoveryLogs = usageLogs
                  .filter(l => l.jobType === 'recovery')
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
                if (!hwcn.sites || hwcn.sites.length === 0) return null;

                return hwcn.sites.map((site: any, i: number) => {
                  // Strategy 1: Match by site name
                  const siteLogs = recoveryLogs.filter(l => 
                    (l.siteName || '').trim().toLowerCase() === (site.name || '').trim().toLowerCase() ||
                    (l.siteRef || '').trim().toLowerCase() === (site.name || '').trim().toLowerCase()
                  );
                  
                  let weight: number;
                  if (siteLogs.length > 0) {
                    // Matched by name — sum all recovery weights for this site
                    weight = siteLogs.reduce((sum, l) => sum + Number(l.weightUsed || 0), 0);
                  } else if (recoveryLogs[i]) {
                    // Strategy 2: Fall back to chronological order (Site 1 = 1st log, etc.)
                    weight = Number(recoveryLogs[i].weightUsed || 0);
                  } else {
                    // Strategy 3: Last resort — divide total equally
                    weight = Number(hwcn.fillWeight || 0) / (hwcn.sites?.length || 1);
                  }
                
                  return (
                    <tr key={i}>
                      {cell(`Site ${i + 1}`)}
                      {cell("14 06 01")}
                      {cell("HCFC / HFC / CFC — Up to 100%")}
                      {cell("Liquid")}
                      {cell("HP14")}
                      {cell(refrigerantType)}
                      {cell(`${weight.toFixed(2)} kg`)}
                      {cell(capacity)}
                      {cell(<strong style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>{hwcn.serial}</strong>)}
                    </tr>
                  );
                });
              })() || (
                <tr>
                  {cell("Site 1")}
                  {cell("14 06 01")}
                  {cell("HCFC / HFC / CFC — Up to 100%")}
                  {cell("Liquid")}
                  {cell("HP14")}
                  {cell(refrigerantType)}
                  {cell(hwcn.fillWeight ? `${Number(hwcn.fillWeight).toFixed(2)} kg` : "—")}
                  {cell(capacity)}
                  {cell(<strong style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>{hwcn.serial}</strong>)}
                </tr>
              )}
              {/* Blank rows for print */}
              {[...Array(Math.max(0, 2 - (hwcn.sites?.length || 1)))].map((_, i) => (
                <tr key={`blank-${i}`}>
                  {[...Array(9)].map((_, j) => <td key={j} style={{ border: "1px solid #999", padding: "0.15rem 0.4rem", height: "1.2rem" }} />)}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#555", marginTop: "0.4rem" }}>
            Packing Group: None quoted on ADR 2017, UN 1078 (refrigerant gas N.O.S) UN 3161 (Liquefied Gas, Flammable, N.O.S)
          </div>
        </div>
      </div>

      {/* ─────────── PARTS C & D side by side ─────────── */}
      <div style={{ overflowX: "auto", marginBottom: "0.5rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", minWidth: "520px" }}>

        {/* PART C */}
        <div className="hwcn-section" style={{ margin: 0, minWidth: "240px" }}>
          <div className="hwcn-header">Part C: Carrier's Certificate</div>
          <div style={{ padding: "0.4rem 0.6rem", fontSize: "0.78rem" }}>
            <p style={{ fontSize: "0.68rem", color: "#444", marginBottom: "0.3rem", lineHeight: 1.2 }}>
              I certify that I today collected/delivered the consignment and that the details in A2, A3 and B3 are correct and I have been advised of any specific handling requirements.
            </p>
            {field("1. Carrier's name", hwcn.engineer)}
            {field("2. Carrier's reg no.", companySettings?.carrierReg || "CBDU368286")}
            {field("3. Vehicle reg no.", hwcn.vehicleReg || "VA68 LNE")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", marginTop: "0.3rem" }}>
              {field("Date", formattedDate)}
              {field("Time", formattedTime)}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
              <span style={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}>Signature:</span>
              <div className="sig-box signature" style={{ flex: 1, padding: "0.1rem 0.5rem" }}>
                {hwcn.engineer}
              </div>
            </div>
          </div>
        </div>

        {/* PART D */}
        <div className="hwcn-section" style={{ margin: 0, minWidth: "240px" }}>
          <div className="hwcn-header">Part D: Consignor's Certificate</div>
          <div style={{ padding: "0.4rem 0.6rem", fontSize: "0.78rem" }}>
            <p style={{ fontSize: "0.68rem", color: "#444", marginBottom: "0.3rem", lineHeight: 1.2 }}>
              I certify that the information in A, B and C above is correct, that the carrier is registered or exempt and was advised of the appropriate precautionary measures. All of the waste is packaged and labelled correctly and I have fulfilled my duty to apply the waste hierarchy as required by Regulation 12 of Waste (England and Wales) Regulation 2011.
            </p>
            {field("1. Consignor name", hwcn.engineer ? `${hwcn.engineer} (21 Degrees)` : "")}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.3rem" }}>
              <span style={{ fontSize: "0.68rem", whiteSpace: "nowrap" }}>2. Signature:</span>
              <div className="sig-box signature" style={{ flex: 1, padding: "0.1rem 0.5rem", minHeight: "1.6rem" }}>
                {hwcn.engineer}
              </div>
            </div>
            {field("3. Name", hwcn.engineer)}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", marginTop: "0.3rem" }}>
              {field("Date", formattedDate)}
              {field("Time", formattedTime)}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* ─────────── PART E ─────────── */}
      <div className="hwcn-section">
        <div className="hwcn-header">
          Part E: Consignee's Certificate — To be completed by {isOffice ? "Office / Stores Staff" : "Receiving Staff"}
        </div>
        <div style={{ padding: "0.4rem 0.6rem", fontSize: "0.78rem" }}>
          {/* Top row: EWC / Qty / Accepted / Operation */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
            <div><span style={{ fontSize: "0.68rem", color: "#555" }}>EWC Code: </span><strong>14 06 01</strong></div>
            <div style={{ flex: 1 }}>{field("Quantity kg (as above)", hwcn.fillWeight ? `${Number(hwcn.fillWeight).toFixed(2)} kg` : "")}</div>
            <div>{field("Accepted / Rejected", (hwcn.hwcnStatus === "complete" && hwcn.accepted !== undefined) ? (hwcn.accepted ? "Accepted" : "Rejected") : "")}</div>
            <div><span style={{ fontSize: "0.68rem", color: "#555" }}>Op: </span><strong>R13</strong></div>
          </div>

          <p style={{ fontSize: "0.68rem", color: "#444", marginBottom: "0.3rem", lineHeight: 1.2 }}>
            I received this waste at the address given in A3, authorises the management of the waste described in B at the address given in A3.
          </p>

          <div style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem", minWidth: "360px" }}>
            <div style={{ minWidth: "160px" }}>
              <div style={{ display: "flex", gap: "0.8rem" }}>
                {field("1. Date received", deliveredDate)}
                {field("Time", deliveredTime)}
              </div>
              {field("2. Vehicle reg no.", hwcn.hwcnStatus === "complete" ? (hwcn.vehicleRegConsignee || hwcn.vehicleReg || "") : "")}
              <div style={{ fontSize: "0.68rem", marginTop: "0.2rem", marginBottom: "0.15rem" }}>3. Where waste is rejected please provide details:</div>
              <div style={{ border: "1px solid #bbb", minHeight: "1.2rem", padding: "0.15rem", fontSize: "0.72rem" }}>
                {hwcn.rejectionDetails || ""}
              </div>
              {field("4. Waste exemption no.", companySettings?.exemptionNo || "31Z 3725 34")}
            </div>
            <div style={{ minWidth: "160px" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.3rem" }}>
                <span style={{ fontSize: "0.68rem", whiteSpace: "nowrap" }}>Signature:</span>
                <div className="sig-box signature" style={{ flex: 1, minHeight: "2rem", padding: "0.15rem 0.5rem" }}>
                  {hwcn.hwcnStatus === "complete" ? (hwcn.receivedSignature || "") : ""}
                </div>
              </div>
              {field("Name", hwcn.hwcnStatus === "complete" ? (hwcn.receivedBy || "") : "")}
              <div style={{ display: "flex", gap: "0.8rem", marginTop: "0.3rem" }}>
                {field("Date", deliveredDate)}
                {field("Time", deliveredTime)}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

    </div>
  );
}
