"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

export default function Sop002Page() {
  return (
    <div>
      {/* Toolbar */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <Link href="/admin/docs" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: "0.9rem" }}>
          <ArrowLeft size={16} /> Back to Procedures
        </Link>
        <button
          onClick={() => window.print()}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.5rem 1rem", background: "rgba(0,229,255,0.08)",
            border: "1px solid rgba(0,229,255,0.25)", borderRadius: "8px",
            color: "#00e5ff", fontSize: "0.85rem", cursor: "pointer"
          }}
        >
          <Printer size={15} /> Print / Save PDF
        </button>
      </div>

      {/* Document */}
      <div id="sop-document" style={{
        background: "#fff", color: "#111", borderRadius: "8px",
        padding: "3rem 3.5rem", maxWidth: "900px", margin: "0 auto",
        fontFamily: "'Segoe UI', Arial, sans-serif", lineHeight: 1.6,
        boxShadow: "0 4px 32px rgba(0,0,0,0.4)"
      }}>
        <style>{`
          @media print {
            .no-print { display: none !important; }
            #sop-document { box-shadow: none; border-radius: 0; padding: 2rem; }
            body { background: #fff !important; }
          }
          #sop-document h1 { font-size: 1.6rem; font-weight: 700; margin: 0 0 0.25rem; color: #0a0a0a; }
          #sop-document h2 { font-size: 1.1rem; font-weight: 700; margin: 2rem 0 0.75rem; padding-bottom: 0.35rem; border-bottom: 2px solid #0a0a0a; color: #0a0a0a; text-transform: uppercase; letter-spacing: 0.04em; }
          #sop-document h3 { font-size: 0.95rem; font-weight: 700; margin: 1.5rem 0 0.5rem; color: #1a1a1a; }
          #sop-document p { margin: 0.5rem 0; font-size: 0.92rem; color: #222; }
          #sop-document ul, #sop-document ol { margin: 0.5rem 0 0.5rem 1.5rem; font-size: 0.92rem; color: #222; }
          #sop-document li { margin-bottom: 0.3rem; }
          #sop-document table { width: 100%; border-collapse: collapse; margin: 0.75rem 0 1rem; font-size: 0.88rem; }
          #sop-document th { background: #f0f0f0; font-weight: 700; text-align: left; padding: 0.5rem 0.75rem; border: 1px solid #ccc; color: #111; }
          #sop-document td { padding: 0.45rem 0.75rem; border: 1px solid #ccc; vertical-align: top; color: #222; }
          #sop-document td:first-child { font-weight: 500; }
          #sop-document blockquote { border-left: 3px solid #555; margin: 0.75rem 0; padding: 0.5rem 0.75rem 0.5rem 1rem; background: #f7f7f7; font-size: 0.88rem; color: #444; }
          #sop-document .doc-header { border-bottom: 3px solid #111; padding-bottom: 1.5rem; margin-bottom: 2rem; }
          #sop-document .footer { border-top: 1px solid #ccc; margin-top: 3rem; padding-top: 0.75rem; font-size: 0.78rem; color: #777; text-align: center; }
          #sop-document .control-table td { background: #fafafa; }
          #sop-document .control-table td:first-child { width: 35%; font-weight: 600; color: #333; }
          #sop-document pre { font-family: monospace; background: #f5f5f5; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; font-size: 0.82rem; line-height: 1.5; overflow-x: auto; color: #222; white-space: pre; }
        `}</style>

        {/* Header */}
        <div className="doc-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
            <div>
              <h1>SOP-002</h1>
              <p style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0.25rem 0 0", color: "#333" }}>
                Recovery Cylinder — Refrigerant Recovery, Waste Claim (HWCN) and Return to Supplier
              </p>
            </div>
            <img src="/21-degrees-logo-reports.png" style={{ width: "110px", height: "auto" }} alt="21 Degrees" />
          </div>
          <table className="control-table">
            <tbody>
              <tr><td>Document Number</td><td>SOP-002</td><td>Version</td><td>1.0</td></tr>
              <tr><td>Issue Date</td><td>26 June 2026</td><td>Next Review</td><td>26 June 2027</td></tr>
              <tr><td>Author</td><td>_________________________</td><td>Approved By</td><td>_________________________</td></tr>
              <tr><td>F-Gas Certification No.</td><td>REF1010728</td><td>System</td><td>21 Degrees F-Gas Tracker Pro</td></tr>
              <tr><td>Carrier Registration (CBDU)</td><td>CBDU368286</td><td>EWC Code</td><td>14 06 01</td></tr>
            </tbody>
          </table>
        </div>

        {/* 1 */}
        <h2>1. Purpose and Scope</h2>
        <p>This procedure describes the controlled process by which <strong>21 Degrees Ltd</strong> manages the recovery of fluorinated greenhouse gases from customer equipment, records the waste claim under a Hazardous Waste Consignment Note (HWCN), and returns the recovery cylinder to the authorised supplier for reclamation or destruction.</p>
        <p>21 Degrees Ltd utilises a bespoke <strong>F-Gas Tracker Pro</strong> application for the management of all refrigerant cylinders. This system consists of a <strong>web portal</strong> used by office staff and administrators, and a <strong>mobile application</strong> used by field engineers on site. All records are stored centrally and are available for audit at any time.</p>
        <p><strong>Scope:</strong> Applies to all cylinders categorised as <strong>Reclaim / Recovery</strong> within the F-Gas Tracker Pro system. These cylinders contain recovered refrigerant classified as <strong>hazardous waste</strong> under the Hazardous Waste (England and Wales) Regulations 2005 and must not be treated as new product. Upon completion of recovery, cylinders are returned directly to the authorised supplier.</p>

        {/* 2 */}
        <h2>2. Regulatory References</h2>
        <table>
          <thead><tr><th>Reference</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>Hazardous Waste (England and Wales) Regulations 2005 (SI 2005/894)</td><td>Requires Consignment Notes for movement of hazardous waste; defines producer, carrier and consignee obligations</td></tr>
            <tr><td>Environmental Protection Act 1990, Section 34</td><td>Duty of Care — waste must only be transferred to an authorised person with a written description of the waste</td></tr>
            <tr><td>The Fluorinated Greenhouse Gases Regulations 2015 (SI 2015/310)</td><td>Requires recovery of F-Gas before decommissioning equipment; records of quantities recovered must be maintained</td></tr>
            <tr><td>Regulation (EU) No 517/2014 (retained in UK law)</td><td>F-Gas Regulation — recovery, reclamation and destruction obligations</td></tr>
            <tr><td>REFCOM Code of Practice</td><td>Standards for registered contractors performing F-Gas recovery</td></tr>
            <tr><td>The Carriage of Dangerous Goods and Use of Transportable Pressure Equipment Regulations 2009</td><td>Governs transport of fluorinated gases in pressure vessels on public roads</td></tr>
          </tbody>
        </table>

        {/* 3 */}
        <h2>3. Definitions</h2>
        <table>
          <thead><tr><th>Term</th><th>Definition</th></tr></thead>
          <tbody>
            <tr><td>Recovery Cylinder</td><td>A pressure vessel used to collect fluorinated greenhouse gas removed from customer equipment. Categorised as <em>Reclaim</em> in the F-Gas Tracker Pro system.</td></tr>
            <tr><td>Producer Site</td><td>The customer premises where refrigerant was physically recovered. The site name, address and postcode are recorded in F-Gas Tracker Pro against the cylinder.</td></tr>
            <tr><td>Hazardous Waste</td><td>Recovered refrigerant classified under EWC Code <strong>14 06 01</strong> (halogenated refrigerants). Must be handled and transported in accordance with the Hazardous Waste Regulations 2005.</td></tr>
            <tr><td>HWCN</td><td>Hazardous Waste Consignment Note. A document required by law when hazardous waste is transferred from one premises to another. For recovery cylinders returned directly to the supplier, the HWCN is issued by the supplier upon receipt.</td></tr>
            <tr><td>CBDU Number</td><td>Carrier's Registered Waste Carrier number. 21 Degrees Ltd: <strong>CBDU368286</strong>. This must be held by the company and be current at all times when transporting waste refrigerant.</td></tr>
          </tbody>
        </table>

        {/* 4 */}
        <h2>4. Roles and Responsibilities</h2>
        <table>
          <thead><tr><th>Role</th><th>Responsibility</th></tr></thead>
          <tbody>
            <tr><td>Engineer</td><td>Use the F-Gas Tracker Pro mobile application to: register new recovery cylinders upon receipt; record all cylinder movements (van loading, site delivery and returns); perform recovery on site and record all weights, producer site details (name, address, postcode) and equipment details accurately and promptly before leaving site; transport the cylinder to the supplier upon completion and obtain the supplier's HWCN documentation. Engineers must hold a current F-Gas Category I qualification and must not handle refrigerant without logging the event in the system.</td></tr>
            <tr><td>Office / Admin</td><td>Register recovery cylinders received at HQ; record supplier returns in F-Gas Tracker Pro including the supplier's HWCN reference number; maintain copies of supplier HWCN documentation; generate compliance reports for audit purposes</td></tr>
            <tr><td>Office Manager / Director</td><td>Ensure the company's waste carrier registration (CBDU368286) remains current; approve this procedure; maintain company F-Gas certification REF1010728</td></tr>
          </tbody>
        </table>
        <p>All engineers handling F-Gas must hold a current, relevant <strong>F-Gas qualification</strong> (Category I or appropriate category) and work under a company holding F-Gas certification <strong>REF1010728</strong>.</p>

        {/* 5 */}
        <h2>5. Procedure</h2>

        <h3>5.1 Recovery Cylinder Registration and Van Allocation</h3>
        <p>Recovery cylinders must be registered in F-Gas Tracker Pro before being issued to an engineer. Office staff register the cylinder on receipt, or the engineer registers it directly on the mobile app if collecting from the supplier. The following information is recorded:</p>
        <table>
          <thead><tr><th>Field</th><th>Description</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td>Serial Number</td><td>Unique cylinder identifier</td><td>REC-402</td></tr>
            <tr><td>Category</td><td>Reclaim</td><td>Reclaim</td></tr>
            <tr><td>Gas Type</td><td>Mixed/Recovery (updated when the recovered gas type is confirmed on site)</td><td>Mixed/Recovery</td></tr>
            <tr><td>Capacity (kg)</td><td>Maximum fill weight of the cylinder</td><td>10.00 kg</td></tr>
            <tr><td>Supplier</td><td>Supplier from whom the cylinder was obtained</td><td>A-Gas</td></tr>
          </tbody>
        </table>
        <p>Once registered, the cylinder is allocated to the engineer's van in F-Gas Tracker Pro. The engineer's name and vehicle registration plate are recorded against the cylinder (see SOP-001, Section 5.2).</p>

        <h3>5.2 On-Site Refrigerant Recovery</h3>
        <p>When recovering refrigerant from a customer's system on site, the engineer records the recovery in the F-Gas Tracker Pro mobile application before leaving site. The following information is captured:</p>
        <table>
          <thead><tr><th>Field</th><th>Description</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td>Job Number</td><td>Work order / CRM job reference</td><td>JOB-88219</td></tr>
            <tr><td>Job Type</td><td>Recovery</td><td>Recovery</td></tr>
            <tr><td>Gas Type Recovered</td><td>Type of gas removed from the system</td><td>R410A</td></tr>
            <tr><td>Producer Site Name</td><td>Customer / site name</td><td>Retail Store #4</td></tr>
            <tr><td>Producer Site Address</td><td>Full site address</td><td>123 High Street, Newcastle</td></tr>
            <tr><td>Producer Site Postcode</td><td>Postcode of the site</td><td>NE1 4XP</td></tr>
            <tr><td>Weight Before (kg)</td><td>Cylinder weight before connecting to equipment</td><td>2.50 kg</td></tr>
            <tr><td>Weight After (kg)</td><td>Cylinder weight after recovery is complete</td><td>5.20 kg</td></tr>
            <tr><td>Equipment Manufacturer</td><td>Manufacturer of the system recovered from</td><td>Daikin</td></tr>
            <tr><td>Equipment Model</td><td>Model number</td><td>FDTC50VF</td></tr>
            <tr><td>Equipment Serial Number</td><td>Equipment serial number</td><td>9948201B</td></tr>
          </tbody>
        </table>
        <p>The system updates the cylinder's current weight and creates a permanent usage log entry and movement log entry.</p>
        <blockquote><strong>Important:</strong> If the gas type recovered differs from what is already in the cylinder, the engineer must use a different, clean cylinder. Mixing refrigerant types is not permitted.</blockquote>

        <h3>5.3 Equipment Decommissioning Record (Where Applicable)</h3>
        <p>If the system being worked on is being <strong>permanently decommissioned</strong>, the engineer flags this when logging the recovery. The following additional information is recorded in F-Gas Tracker Pro:</p>
        <table>
          <thead><tr><th>Field</th><th>Captured</th></tr></thead>
          <tbody>
            <tr><td>Job Number</td><td>Work order reference</td></tr>
            <tr><td>Site Name, Address, Postcode</td><td>Producer site details</td></tr>
            <tr><td>Engineer</td><td>Name of engineer performing decommissioning</td></tr>
            <tr><td>Equipment details (per unit)</td><td>Manufacturer, model, serial number, weight of gas recovered from each unit</td></tr>
            <tr><td>Gas Type</td><td>Type of refrigerant recovered</td></tr>
            <tr><td>Total Weight Recovered</td><td>Sum of all units in this session</td></tr>
            <tr><td>Date and Time</td><td>Timestamp of the decommissioning event</td></tr>
          </tbody>
        </table>
        <p>These records are available in the <strong>Decommissioned Equipment Register</strong> for regulatory submissions demonstrating refrigerant removal from circulation.</p>

        <h3>5.4 Return of Recovery Cylinder to Supplier</h3>
        <p>On completion of recovery work, the engineer transports the cylinder directly to the authorised supplier's premises. The engineer's vehicle must be a registered waste carrier (CBDU368286) when transporting waste refrigerant on public roads.</p>
        <p>At the supplier, the supplier issues their Hazardous Waste Consignment Note (HWCN) documentation. The engineer retains a copy or photograph of this document.</p>
        <p>On return to HQ, office staff record the supplier return in F-Gas Tracker Pro, entering:</p>
        <table>
          <thead><tr><th>Field</th><th>Description</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td>Cylinder Serial(s)</td><td>Cylinder(s) being returned</td><td>REC-402</td></tr>
            <tr><td>Supplier Name</td><td>Supplier receiving the waste</td><td>A-Gas</td></tr>
            <tr><td>Supplier Branch</td><td>Branch location</td><td>Newcastle</td></tr>
            <tr><td>Return Weight (kg)</td><td>Weight of cylinder at time of return</td><td>5.20 kg</td></tr>
            <tr><td>Supplier HWCN Reference</td><td>Reference number from the supplier's HWCN documentation</td><td>BJJ-123456</td></tr>
            <tr><td>Supplier HWCN Photo</td><td>Photo of the supplier's HWCN document</td><td>Upload</td></tr>
          </tbody>
        </table>
        <p>The system marks the cylinder as returned, records the return date and time and the staff member who processed it, and creates a permanent movement log entry. The cylinder exits active tracking and appears in the <strong>Returned to Supplier</strong> register.</p>

        {/* 6 */}
        <h2>6. Regulatory Reference Data</h2>
        <table>
          <thead><tr><th>Reference</th><th>Value</th><th>Where Used</th></tr></thead>
          <tbody>
            <tr><td>F-Gas Certification No.</td><td>REF1010728</td><td>Company identity on all compliance documents</td></tr>
            <tr><td>Carrier Registration Number (CBDU)</td><td>CBDU368286</td><td>Waste carrier registration — required when transporting waste refrigerant on public roads</td></tr>
            <tr><td>EWC Waste Code</td><td>14 06 01</td><td>Waste description on all HWCN documents (halogenated refrigerants)</td></tr>
            <tr><td>Waste Hazard Code</td><td>HP14</td><td>Ecotoxic — applicable to HFCs / HCFCs</td></tr>
          </tbody>
        </table>

        {/* 7 */}
        <h2>7. Records Generated and Retention</h2>
        <table>
          <thead><tr><th>Record Type</th><th>What it contains</th><th>Retention</th></tr></thead>
          <tbody>
            <tr><td>Cylinder Registration Record</td><td>Serial number, gas type, capacity, supplier, registration date, registering staff member</td><td>Minimum 5 years</td></tr>
            <tr><td>Movement Log</td><td>Every location change — from/to location, engineer, vehicle registration, date and time. Permanent and cannot be edited.</td><td>Minimum 5 years</td></tr>
            <tr><td>Recovery / Usage Log (per job)</td><td>Job number, job type, producer site name, address and postcode, engineer, weight before and after, quantity recovered, equipment details, date and time</td><td>Minimum 5 years</td></tr>
            <tr><td>Decommissioned Equipment Record</td><td>Job number, site details, engineer, equipment manufacturer/model/serial number, weight of gas recovered per unit, date and time</td><td>Minimum 5 years</td></tr>
            <tr><td>Supplier Return Record</td><td>Return date and time, staff member who processed the return, supplier name and branch, supplier's HWCN reference number, photo of supplier's HWCN documentation</td><td>Minimum 5 years</td></tr>
          </tbody>
        </table>
        <p>All records are <strong>permanent and cannot be edited or deleted</strong>. The system maintains a complete, unbroken audit trail for every recovery cylinder from registration through to supplier return.</p>
        <p>The following reports can be generated from the system for audit purposes:</p>
        <ul>
          <li><strong>Full Job Report</strong> — all recovery events on a job, quantities, producer site, equipment details</li>
          <li><strong>Cylinder Usage / Audit Trail</strong> — complete lifecycle per cylinder from registration to return</li>
          <li><strong>Decommissioned Equipment Register</strong> — all decommissioning events by date, site, engineer and equipment</li>
          <li><strong>On-Site Inventory Report</strong> — all cylinders currently located at customer sites, with site details and last engineer</li>
          <li><strong>Van Inventory Report</strong> — cylinders on each engineer's van</li>
          <li><strong>Returned to Supplier Register</strong> — all returned cylinders with supplier HWCN references</li>
        </ul>

        {/* 8 */}
        <h2>8. Compliance Controls</h2>
        <table>
          <thead><tr><th>Control</th><th>How Enforced</th></tr></thead>
          <tbody>
            <tr><td>Mandatory weight recording</td><td>Weight before and after are both required fields; quantity recovered is calculated by the system, not manually entered</td></tr>
            <tr><td>Producer site capture</td><td>Site name, address and postcode are mandatory fields for all recovery log entries</td></tr>
            <tr><td>Equipment traceability</td><td>Manufacturer, model and serial number recorded at every recovery event</td></tr>
            <tr><td>Supplier HWCN reference required</td><td>Office staff must enter the supplier's HWCN reference number when recording a return; the supplier's document is retained as a photo upload</td></tr>
            <tr><td>Immutable audit trail</td><td>All records are permanent — no editing or deletion of historical entries is permitted</td></tr>
            <tr><td>F-Gas qualification</td><td>Only approved, qualified engineers with valid F-Gas certification may log recovery events; role-based access enforced at login</td></tr>
            <tr><td>Waste carrier registration</td><td>Company waste carrier registration CBDU368286 must remain current; required for legal transport of waste refrigerant</td></tr>
          </tbody>
        </table>

        {/* 9 */}
        <h2>9. Process Summary</h2>
        <pre>{`Recovery Cylinder Issued to Engineer (Van)
              │
              ▼
   Engineer Moves Cylinder to Job Site
   (movement recorded in F-Gas Tracker Pro)
              │
              ▼
   Gas Recovered On Site
   (weight before and after recorded,
    producer site details captured,
    equipment details recorded)
              │
              ▼
   Equipment Decommissioned? ── YES ──> Decommissioning record created
              │                          in F-Gas Tracker Pro
              │ NO
              ▼
   Engineer Moves Cylinder Back to Van
   (movement recorded in F-Gas Tracker Pro)
              │
              ▼
   Engineer Transports Cylinder to Supplier
   (company must hold valid waste carrier
    registration CBDU368286)
              │
              ▼
   Supplier Issues HWCN Documentation
   (engineer retains copy / photograph)
              │
              ▼
   Office Staff Record Supplier Return
   in F-Gas Tracker Pro
   (supplier name, branch, HWCN reference,
    photo of HWCN documentation uploaded)
              │
              ▼
   Cylinder Status → Returned
   Lifecycle complete — full audit trail
   preserved in F-Gas Tracker Pro`}</pre>

        {/* Footer */}
        <div className="footer">
          21 Degrees Ltd &nbsp;|&nbsp; Unit 10, Apollo Court, Monkton Business Park, Hebburn, Tyne &amp; Wear, NE31 2ES &nbsp;|&nbsp; Tel: 0191 495 7224<br />
          F-Gas Certification No. REF1010728 &nbsp;|&nbsp; Carrier CBDU368286 &nbsp;|&nbsp; 21 Degrees F-Gas Tracker Pro &nbsp;|&nbsp; &copy; 2026 21 Degrees Ltd
        </div>
      </div>
    </div>
  );
}
