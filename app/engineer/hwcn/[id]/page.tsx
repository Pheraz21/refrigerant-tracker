"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, PenTool, X } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import SignaturePad from "@/components/SignaturePad";

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

  // Touch Signature Modals
  const [showPartCDModal, setShowPartCDModal] = useState(false);
  const [partCDSignature, setPartCDSignature] = useState("");
  const [showPartEModal, setShowPartEModal] = useState(false);
  const [partESignature, setPartESignature] = useState("");
  const [partEReceivedBy, setPartEReceivedBy] = useState("");
  const [partEVehicleReg, setPartEVehicleReg] = useState("");

  const [bottleHwcns, setBottleHwcns] = useState<any[]>([]);

  const loadData = () => {
    db.getCompanySettings().then(setCompanySettings);
    db.getHWCN(hwcnId).then(data => {
      setHwcn(data);
      if (data?.receivedBy) setPartEReceivedBy(data.receivedBy);
      if (data?.serial) {
        db.getUsageLogs(data.serial).then(logs => setUsageLogs(logs));
        db.getBottle(data.serial).then(b => setBottle(b));
        db.getHWCNsForBottle(data.serial).then(hwcns => setBottleHwcns(hwcns || []));
      }
    });
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (user?.name && !partEReceivedBy) {
      setPartEReceivedBy(user.name);
    }
  }, [user]);

  const handleSavePartCDSignature = async () => {
    if (!partCDSignature) return;
    setIsSubmitting(true);
    try {
      await db.updateHWCN(hwcnId, {
        carrierSignature: partCDSignature,
        consignorSignature: partCDSignature
      });
      setShowPartCDModal(false);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompletePartE = async (accepted: boolean) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await db.completePartE(hwcnId, {
        receivedBy: partEReceivedBy || user.name || "Office Staff",
        receivedSignature: partESignature || user.name,
        accepted,
        vehicleReg: partEVehicleReg || hwcn.vehicleReg // Copy from Part C if same
      });
      setShowPartEModal(false);
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

  const isOffice = hwcn.destination === "HQ-Stores" || hwcn.destination === "HQ-Stores";

  // Dynamic company fields
  const companyName = companySettings?.companyName || "21 Degrees Ltd";
  const companyAddress = companySettings?.companyAddress || "Unit 10, Apollo Court, Monkton Business Park";
  const companyPostcode = companySettings?.companyPostcode || "NE31 2ES";
  const companyTel = companySettings?.companyTel || "0191 495 7224";
  const carrierReg = companySettings?.carrierReg || "CBDU368286";
  const exemptionNo = companySettings?.exemptionNo || "31Z 3725 34";

  const renderSignatureBox = (signatureVal?: string, fallbackText?: string) => {
    if (signatureVal && signatureVal.startsWith("data:image/")) {
      return (
        <img
          src={signatureVal}
          alt="Signature"
          style={{ maxHeight: "32px", maxWidth: "160px", objectFit: "contain", display: "block" }}
        />
      );
    }
    return (
      <span style={{ fontFamily: "'Brush Script MT', 'Dancing Script', cursive, sans-serif", fontSize: "1.1rem" }}>
        {signatureVal || fallbackText || ""}
      </span>
    );
  };

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
        .sig-box { border: 1px solid #999; min-height: 1.8rem; display: flex; align-items: center; }
      `}} />

      {/* ── Nav bar (no-print) ── */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", padding: "0.75rem 1rem", background: "#111", borderRadius: "8px" }}>
        <Link href="/engineer" style={{ color: "#00e5ff", display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", fontSize: "0.9rem" }}>
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            onClick={() => setShowPartCDModal(true)}
            style={{
              background: "rgba(0,229,255,0.15)",
              color: "#00e5ff",
              border: "1px solid rgba(0,229,255,0.3)",
              padding: "0.4rem 0.8rem",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.85rem",
              fontWeight: 600
            }}
          >
            <PenTool size={14} /> Touch Sign Parts C &amp; D
          </button>
          <button
            onClick={() => window.print()}
            style={{
              background: "#00e5ff",
              color: "#000",
              border: "none",
              padding: "0.4rem 0.85rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 700
            }}
          >
            Print / PDF
          </button>
        </div>
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
              onClick={() => setShowPartEModal(true)}
              style={{ background: "#28a745", color: "#fff", border: "none", padding: "0.4rem 0.8rem", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: "bold" }}
            >
              <CheckCircle2 size={16} /> Complete &amp; Sign Part E
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
          <img src="/21-degrees-logo-reports.png" alt="Company Logo" style={{ width: "90px", height: "auto", display: "block" }} />
          <div style={{ fontSize: "0.65rem", lineHeight: 1.2, color: "#444", borderLeft: "1px solid #ccc", paddingLeft: "0.75rem" }}>
            <strong style={{ fontSize: "0.75rem", color: "#000" }}>{companyName}</strong><br />
            {companyAddress}<br />
            {companyPostcode}<br />
            Tel: {companyTel}
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
                <span style={{ flex: 1 }}>
                  {site.jobNumber ? `[${site.jobNumber}] ` : ""}{[site.name, site.address, site.postcode].filter(Boolean).join(", ")}
                </span>
              </div>
            )) || <div style={{ height: "1.1rem", borderBottom: "1px solid #eee" }} />}
          </div>

          {/* A3 – Destination + A4 producer */}
          <div style={{ padding: "0.3rem 0.5rem" }}>
            <div style={{ fontSize: "0.68rem", color: "#555", marginBottom: "0.1rem", fontWeight: "bold" }}>3. The waste will be taken to:</div>
            <div style={{ fontSize: "0.78rem", marginBottom: "0.2rem" }}>
              {isOffice ? `${companyName}, ${companyAddress}, ${companyPostcode}` : hwcn.destination}
            </div>

            <div style={{ borderTop: "1px solid #ccc", marginTop: "0.2rem", paddingTop: "0.2rem" }}>
              <div style={{ fontSize: "0.68rem", color: "#555", marginBottom: "0.1rem", fontWeight: "bold" }}>4. The waste producer was:</div>
              <div style={{ fontSize: "0.78rem" }}>
                {companyName}, {companyAddress}, {companyPostcode}
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
                const recoveryLogs = usageLogs
                  .filter(l => l.jobType === 'recovery')
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
                if (!hwcn.sites || hwcn.sites.length === 0) return null;

                return hwcn.sites.map((site: any, i: number) => {
                  const siteLogs = recoveryLogs.filter(l => 
                    (site.jobNumber && (l.siteRef || '').trim().toLowerCase() === (site.jobNumber || '').trim().toLowerCase()) ||
                    (l.siteName || '').trim().toLowerCase() === (site.name || '').trim().toLowerCase() ||
                    (l.siteRef || '').trim().toLowerCase() === (site.name || '').trim().toLowerCase()
                  );
                  
                  let weight: number;
                  if (siteLogs.length > 0) {
                    weight = siteLogs.reduce((sum, l) => sum + Number(l.weightUsed || 0), 0);
                  } else if (recoveryLogs[i]) {
                    weight = Number(recoveryLogs[i].weightUsed || 0);
                  } else {
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
                      {cell(Number(hwcn.fillWeight || 0) === 0 ? "Trace" : `${weight.toFixed(2)} kg`)}
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
                  {cell(hwcn.fillWeight ? `${Number(hwcn.fillWeight).toFixed(2)} kg` : "Trace")}
                  {cell(capacity)}
                  {cell(<strong style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>{hwcn.serial}</strong>)}
                </tr>
              )}
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

          {(() => {
            const priorList = bottleHwcns
              .filter((h: any) => h.id !== hwcn.id && new Date(h.date).getTime() < new Date(hwcn.date).getTime() && h.hwcnStatus === "complete")
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            const referencedId = hwcn.priorHWCN || (priorList.length > 0 ? priorList[0].id : null);
            const referencedWeight = hwcn.priorWeight || (priorList.length > 0 ? priorList.reduce((acc: number, x: any) => acc + Number(x.fillWeight || 0), 0) : null);
            
            if (!referencedId) return null;

            return (
              <div style={{
                marginTop: "0.5rem",
                padding: "0.35rem 0.5rem",
                background: "#f8f9fa",
                border: "1px dashed #666",
                borderRadius: "4px",
                fontSize: "0.72rem",
                color: "#222"
              }}>
                <strong>Cross-Reference / Prior Consignment Note:</strong> This cylinder previously underwent waste transfer under{" "}
                <Link href={`/engineer/hwcn/${encodeURIComponent(referencedId)}`} style={{ fontWeight: 700, color: "#0066cc", textDecoration: "underline" }}>
                  {referencedId}
                </Link>
                {referencedWeight ? ` (${Number(referencedWeight).toFixed(2)} kg previously consigned)` : ""}.
                {" "}This consignment covers the incremental recovery from the current producer site(s) without double-counting previous transfers.
              </div>
            );
          })()}

          {(() => {
            const rechargeLogs = (usageLogs || []).filter(
              (l: any) => (l.jobType === "recycled_charge" || l.jobType === "service") &&
                   new Date(l.date).getTime() >= new Date(hwcn.date).getTime()
            ).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

            if (rechargeLogs.length === 0) return null;

            const totalRecharged = rechargeLogs.reduce((sum: number, l: any) => sum + Number(l.weightUsed || 0), 0);
            const initialConsigned = Number(hwcn.fillWeight || hwcn.incrementalWeight || hwcn.totalWeight || 0);
            const netRemaining = Math.max(0, initialConsigned - totalRecharged);

            return (
              <div style={{
                marginTop: "0.35rem",
                padding: "0.3rem 0.5rem",
                background: "#f0fdf4",
                border: "1px dashed #16a34a",
                borderRadius: "4px",
                fontSize: "0.72rem",
                color: "#166534"
              }}>
                <strong>On-Site Re-charge &amp; Waste Reconciliation:</strong> Gas from this consignment was subsequently returned to the original site to re-charge repaired equipment:{" "}
                {rechargeLogs.map((log: any, idx: number) => (
                  <span key={idx} style={{ display: "inline-block", marginRight: "0.5rem" }}>
                    [{Number(log.weightUsed).toFixed(2)} kg on {new Date(log.date).toLocaleDateString("en-GB")} (Job: {log.siteRef || log.siteName || "Site"}) by {log.engineer}]
                  </span>
                ))}
                <div style={{ marginTop: "0.15rem", fontWeight: "bold" }}>
                  Total Re-charged on Site: -{totalRecharged.toFixed(2)} kg | Net Residual Waste: {netRemaining.toFixed(2)} kg
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ─────────── PARTS C & D side by side ─────────── */}
      <div style={{ overflowX: "auto", marginBottom: "0.5rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", minWidth: "520px" }}>

        {/* PART C */}
        <div className="hwcn-section" style={{ margin: 0, minWidth: "240px" }}>
          <div className="hwcn-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Part C: Carrier&apos;s Certificate</span>
            {!hwcn.carrierSignature && (
              <button
                type="button"
                className="no-print"
                onClick={() => setShowPartCDModal(true)}
                style={{ background: "#000", color: "#00e5ff", border: "1px solid #00e5ff", borderRadius: "3px", padding: "0.1rem 0.4rem", fontSize: "0.65rem", cursor: "pointer" }}
              >
                ✍️ Touch Sign
              </button>
            )}
          </div>
          <div style={{ padding: "0.4rem 0.6rem", fontSize: "0.78rem" }}>
            <p style={{ fontSize: "0.68rem", color: "#444", marginBottom: "0.3rem", lineHeight: 1.2 }}>
              I certify that I today collected/delivered the consignment and that the details in A2, A3 and B3 are correct and I have been advised of any specific handling requirements.
            </p>
            {field("1. Carrier's name", hwcn.engineer)}
            {field("2. Carrier's reg no.", carrierReg)}
            {field("3. Vehicle reg no.", hwcn.vehicleReg || "VA68 LNE")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", marginTop: "0.3rem" }}>
              {field("Date", formattedDate)}
              {field("Time", formattedTime)}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
              <span style={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}>Signature:</span>
              <div className="sig-box" style={{ flex: 1, padding: "0.1rem 0.5rem" }}>
                {renderSignatureBox(hwcn.carrierSignature, hwcn.engineer)}
              </div>
            </div>
          </div>
        </div>

        {/* PART D */}
        <div className="hwcn-section" style={{ margin: 0, minWidth: "240px" }}>
          <div className="hwcn-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Part D: Consignor&apos;s Certificate</span>
            {!hwcn.consignorSignature && (
              <button
                type="button"
                className="no-print"
                onClick={() => setShowPartCDModal(true)}
                style={{ background: "#000", color: "#00e5ff", border: "1px solid #00e5ff", borderRadius: "3px", padding: "0.1rem 0.4rem", fontSize: "0.65rem", cursor: "pointer" }}
              >
                ✍️ Touch Sign
              </button>
            )}
          </div>
          <div style={{ padding: "0.4rem 0.6rem", fontSize: "0.78rem" }}>
            <p style={{ fontSize: "0.68rem", color: "#444", marginBottom: "0.3rem", lineHeight: 1.2 }}>
              I certify that the information in A, B and C above is correct, that the carrier is registered or exempt and was advised of the appropriate precautionary measures. All of the waste is packaged and labelled correctly and I have fulfilled my duty to apply the waste hierarchy as required by Regulation 12 of Waste (England and Wales) Regulation 2011.
            </p>
            {field("1. Consignor name", hwcn.engineer ? `${hwcn.engineer} (${companyName})` : "")}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.3rem" }}>
              <span style={{ fontSize: "0.68rem", whiteSpace: "nowrap" }}>2. Signature:</span>
              <div className="sig-box" style={{ flex: 1, padding: "0.1rem 0.5rem", minHeight: "1.6rem" }}>
                {renderSignatureBox(hwcn.consignorSignature, hwcn.engineer)}
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
          Part E: Consignee&apos;s Certificate — To be completed by {isOffice ? "HQ-Stores Staff" : "Receiving Staff"}
        </div>
        <div style={{ padding: "0.4rem 0.6rem", fontSize: "0.78rem" }}>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
            <div><span style={{ fontSize: "0.68rem", color: "#555" }}>EWC Code: </span><strong>14 06 01</strong></div>
            <div style={{ flex: 1 }}>{field("Quantity kg (as above)", hwcn.fillWeight ? `${Number(hwcn.fillWeight).toFixed(2)} kg` : "Trace")}</div>
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
              {field("4. Waste exemption no.", exemptionNo)}
            </div>
            <div style={{ minWidth: "160px" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.3rem" }}>
                <span style={{ fontSize: "0.68rem", whiteSpace: "nowrap" }}>Signature:</span>
                <div className="sig-box" style={{ flex: 1, minHeight: "2rem", padding: "0.15rem 0.5rem" }}>
                  {hwcn.hwcnStatus === "complete" ? renderSignatureBox(hwcn.receivedSignature, hwcn.receivedBy) : ""}
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

      {/* ── Modal: Parts C & D Signature ── */}
      {showPartCDModal && (
        <div className="no-print" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div style={{
            background: "#121b28",
            color: "#fff",
            borderRadius: "12px",
            border: "1px solid rgba(0,229,255,0.3)",
            maxWidth: "480px",
            width: "100%",
            padding: "1.5rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#00e5ff" }}>
                <PenTool size={18} /> Sign Parts C &amp; D
              </h3>
              <button
                onClick={() => setShowPartCDModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)", marginBottom: "1rem" }}>
              Provide your signature below as both the waste carrier and consignor for this consignment.
            </p>
            <SignaturePad
              label="Carrier & Consignor Signature"
              value={partCDSignature}
              onChange={setPartCDSignature}
              height={140}
              theme="dark"
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem" }}>
              <button
                type="button"
                onClick={() => setShowPartCDModal(false)}
                style={{
                  padding: "0.6rem 1rem",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "6px",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.85rem"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !partCDSignature}
                onClick={handleSavePartCDSignature}
                style={{
                  padding: "0.6rem 1.25rem",
                  background: partCDSignature ? "#00e5ff" : "rgba(0,229,255,0.3)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#000",
                  fontWeight: 700,
                  cursor: partCDSignature ? "pointer" : "not-allowed",
                  fontSize: "0.85rem"
                }}
              >
                {isSubmitting ? "Saving..." : "Save Signature"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Part E Consignee Signature ── */}
      {showPartEModal && (
        <div className="no-print" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div style={{
            background: "#121b28",
            color: "#fff",
            borderRadius: "12px",
            border: "1px solid rgba(34,197,94,0.3)",
            maxWidth: "480px",
            width: "100%",
            padding: "1.5rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#22c55e" }}>
                <CheckCircle2 size={18} /> Sign Off Part E (Consignee)
              </h3>
              <button
                onClick={() => setShowPartEModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.3rem" }}>
                Received By (Your Name)
              </label>
              <input
                type="text"
                value={partEReceivedBy}
                onChange={e => setPartEReceivedBy(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "0.9rem",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.3rem" }}>
                Vehicle Registration (Optional - if different from carrier)
              </label>
              <input
                type="text"
                placeholder={hwcn.vehicleReg || "e.g. VA68 LNE"}
                value={partEVehicleReg}
                onChange={e => setPartEVehicleReg(e.target.value.toUpperCase())}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "0.9rem",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <SignaturePad
              label="Consignee Touch Signature"
              value={partESignature}
              onChange={setPartESignature}
              height={130}
              theme="dark"
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem" }}>
              <button
                type="button"
                onClick={() => setShowPartEModal(false)}
                style={{
                  padding: "0.6rem 1rem",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "6px",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.85rem"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !partEReceivedBy}
                onClick={() => handleCompletePartE(true)}
                style={{
                  padding: "0.6rem 1.25rem",
                  background: "#22c55e",
                  border: "none",
                  borderRadius: "6px",
                  color: "#000",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}
              >
                {isSubmitting ? <Loader2 size={16} className="spinner" /> : <><CheckCircle2 size={16} /> Confirm Receipt &amp; Sign</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
