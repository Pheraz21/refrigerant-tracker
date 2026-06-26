"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

export default function Sop001Page() {
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
          #sop-document code { font-family: monospace; background: #f0f0f0; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.85rem; }
        `}</style>

        {/* Header */}
        <div className="doc-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
            <div>
              <h1>SOP-001</h1>
              <p style={{ fontSize: "1.15rem", fontWeight: 600, margin: "0.25rem 0 0", color: "#333" }}>
                New Refrigerant Cylinder — Receipt, Allocation, Use and Return
              </p>
            </div>
            <img src="/21-degrees-logo-reports.png" style={{ width: "110px", height: "auto" }} alt="21 Degrees" />
          </div>
          <table className="control-table">
            <tbody>
              <tr><td>Document Number</td><td>SOP-001</td><td>Version</td><td>1.0</td></tr>
              <tr><td>Issue Date</td><td>26 June 2026</td><td>Next Review</td><td>26 June 2027</td></tr>
              <tr><td>Author</td><td>_________________________</td><td>Approved By</td><td>_________________________</td></tr>
              <tr><td>REFCOM Registration</td><td>REF1010728</td><td>System</td><td>21 Degrees F-Gas Tracker Pro</td></tr>
            </tbody>
          </table>
        </div>

        {/* 1 */}
        <h2>1. Purpose and Scope</h2>
        <p>This procedure describes the controlled process by which <strong>21 Degrees Ltd</strong> receives new virgin refrigerant cylinders from suppliers, allocates them to certified engineers, records their use on site, and manages their return when empty or partially depleted. It establishes the audit trail maintained within the <strong>F-Gas Tracker Pro</strong> system to demonstrate compliance with UK F-Gas regulations.</p>
        <p><strong>Scope:</strong> Applies to all refrigerant cylinders categorised as <strong>New</strong> (virgin gas) within the F-Gas Tracker Pro system. This includes all hydrofluorocarbons (HFCs), hydrochlorofluorocarbons (HCFCs), and other fluorinated gases purchased for use in refrigeration and air conditioning equipment.</p>
        <p>This procedure does <strong>not</strong> cover recovery cylinders (see SOP-002).</p>

        {/* 2 */}
        <h2>2. Regulatory References</h2>
        <table>
          <thead><tr><th>Reference</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>The Fluorinated Greenhouse Gases Regulations 2015 (SI 2015/310)</td><td>UK implementing legislation for F-Gas control; operator record-keeping obligations</td></tr>
            <tr><td>Regulation (EU) No 517/2014 (retained in UK law)</td><td>F-Gas Regulation requiring records of quantities of F-Gas placed on market, used, recovered and destroyed</td></tr>
            <tr><td>BS EN 378</td><td>Safety and environmental requirements for refrigerating systems</td></tr>
            <tr><td>REFCOM Code of Practice</td><td>Register of Companies Competent to Handle Refrigerants — operational standards for registered contractors</td></tr>
            <tr><td>Environment Act 1995</td><td>Reporting obligations for fluorinated gases to the Environment Agency</td></tr>
          </tbody>
        </table>

        {/* 3 */}
        <h2>3. Roles and Responsibilities</h2>
        <table>
          <thead><tr><th>Role</th><th>Responsibility</th></tr></thead>
          <tbody>
            <tr><td>Office / Admin</td><td>Register new cylinders on receipt; process returns to supplier; maintain supplier and PO records in the system</td></tr>
            <tr><td>Engineer</td><td>Collect allocated cylinders; record all on-site usage accurately and promptly; return cylinders to the van/stores after job completion</td></tr>
            <tr><td>Office Manager / Director</td><td>Approve this procedure; ensure all engineers hold valid F-Gas qualifications before handling refrigerant</td></tr>
          </tbody>
        </table>
        <p>All engineers handling F-Gas must hold a current, relevant <strong>F-Gas qualification</strong> (Category I or appropriate category) and be employed by REFCOM-registered company <strong>REF1010728</strong>.</p>

        {/* 4 */}
        <h2>4. Procedure</h2>

        <h3>4.1 Cylinder Receipt and Registration</h3>
        <p>When a new refrigerant cylinder is received from a supplier:</p>
        <ol>
          <li>Inspect the cylinder physically — check for damage, correct labelling, and that the weight label matches the delivery note.</li>
          <li>Log into the <strong>F-Gas Tracker Pro</strong> admin panel and navigate to <strong>Register Cylinder</strong> (or use <strong>Bulk Receive</strong> for multiple cylinders).</li>
          <li>Enter the following mandatory fields:</li>
        </ol>
        <table>
          <thead><tr><th>Field</th><th>Description</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td>Serial Number</td><td>Unique cylinder identifier from the label</td><td><code>8849201A</code></td></tr>
            <tr><td>Category</td><td>Select <strong>New</strong></td><td>New</td></tr>
            <tr><td>Gas Type</td><td>Select from catalogue (e.g. R410A, R32, R134a)</td><td><code>R410A</code></td></tr>
            <tr><td>Initial Weight</td><td>Full weight in kg as shown on cylinder label</td><td>12.00 kg</td></tr>
            <tr><td>Supplier</td><td>Supplier name</td><td>A-Gas</td></tr>
            <tr><td>PO Number</td><td>Purchase order reference</td><td>PO-2026-0441</td></tr>
            <tr><td>Rental Expiry (if applicable)</td><td>Date rental agreement expires</td><td>31/12/2026</td></tr>
          </tbody>
        </table>
        <ol start={4}>
          <li>The system records: <code>registeredAt</code> timestamp, <code>registeredBy</code> (user ID), <code>locationType: &quot;office&quot;</code>, <code>status: &quot;active&quot;</code>, and an immutable movement log entry: action = <code>registered</code>.</li>
          <li>The cylinder is now tracked in the system and visible in the <strong>Stores Inventory</strong>.</li>
        </ol>

        <h3>4.2 Allocation to Engineer's Van</h3>
        <p>When a cylinder is to be issued to a field engineer:</p>
        <ol>
          <li>In the admin panel, locate the cylinder by serial number.</li>
          <li>Use the <strong>Move Cylinder</strong> function to change its location.</li>
          <li>Enter the following fields:</li>
        </ol>
        <table>
          <thead><tr><th>Field</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>New Location Type</td><td>Van</td></tr>
            <tr><td>Engineer</td><td>Select the receiving engineer by name</td></tr>
            <tr><td>Vehicle Registration</td><td>The van registration plate (e.g. VA68 LNE)</td></tr>
          </tbody>
        </table>
        <ol start={4}>
          <li>The system records <code>locationType: &quot;van&quot;</code>, <code>locationId: &quot;&lt;Engineer Name&gt; - Van&quot;</code>, <code>vehicleReg</code>, and an immutable movement log entry (action = <code>moved</code>) with from/to location, engineer name, vehicle reg, and timestamp.</li>
          <li>The cylinder now appears in the engineer's <strong>Van Inventory</strong> in the mobile app.</li>
        </ol>
        <blockquote><strong>Control:</strong> Only one engineer's van is associated with each cylinder at any time. If a cylinder is transferred between vans, a <code>handover</code> movement log entry is created recording both parties.</blockquote>

        <h3>4.3 On-Site Usage</h3>
        <p>When refrigerant is dispensed to a customer's system on site:</p>
        <ol>
          <li>The engineer navigates to the cylinder in the mobile app and selects <strong>Log Usage</strong>.</li>
          <li>The engineer enters:</li>
        </ol>
        <table>
          <thead><tr><th>Field</th><th>Description</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td>Job Number</td><td>Work order / job reference from the CRM</td><td>JOB-88219</td></tr>
            <tr><td>Job Type</td><td>Nature of work</td><td>Installation / Service / Repair</td></tr>
            <tr><td>Site Name</td><td>Customer site name (auto-filled from CRM if available)</td><td>Retail Store #4</td></tr>
            <tr><td>Site Address</td><td>Full site address</td><td>123 High Street, NE1 4XP</td></tr>
            <tr><td>Weight Before (kg)</td><td>Cylinder weight recorded immediately before dispensing</td><td>11.50 kg</td></tr>
            <tr><td>Weight After (kg)</td><td>Cylinder weight recorded immediately after dispensing</td><td>9.20 kg</td></tr>
            <tr><td>Equipment Manufacturer</td><td>Manufacturer of the system being charged</td><td>Daikin</td></tr>
            <tr><td>Equipment Model</td><td>Model number of the system</td><td>FDTC50VF</td></tr>
            <tr><td>Equipment Serial</td><td>Serial number of the system</td><td>9948201B</td></tr>
          </tbody>
        </table>
        <ol start={3}>
          <li>The system <strong>automatically calculates</strong> quantity used: Weight Used = Weight Before − Weight After.</li>
          <li><code>currentWeight</code> on the bottle is updated to reflect the post-usage weight.</li>
        </ol>
        <p><strong>Records created automatically:</strong></p>
        <ul>
          <li>Immutable <strong>Usage Log</strong> entry capturing all fields above, timestamp, and engineer name</li>
          <li>Immutable <strong>Movement Log</strong> entry: action = <code>usage</code>, site ref, vehicle reg</li>
        </ul>
        <blockquote><strong>Control:</strong> Weight before and after are recorded independently to provide a verifiable audit trail. The system does not allow retrospective editing of usage logs — corrections must be logged as separate adjustment entries.</blockquote>

        <h3>4.4 Cylinder Status Monitoring</h3>
        <table>
          <thead><tr><th>Status</th><th>Condition</th><th>Action Required</th></tr></thead>
          <tbody>
            <tr><td>Active</td><td>currentWeight &gt; 0</td><td>Normal use — available for jobs</td></tr>
            <tr><td>Low Gas</td><td>Below configured threshold weight</td><td>Admin and office notified automatically</td></tr>
            <tr><td>Empty</td><td>currentWeight = 0</td><td>Return to stores or supplier</td></tr>
          </tbody>
        </table>
        <p>Cylinder status and weight history are visible at any time via the <strong>Cylinder Detail</strong> page, showing full usage history (date, job number, engineer, quantity used, equipment details) and all movement history (location changes with timestamps).</p>

        <h3>4.5 Return of Empty or Partially Depleted Cylinders</h3>
        <p>When a cylinder is empty or no longer required on a van:</p>
        <ol>
          <li>The engineer returns the cylinder to HQ stores or directly to supplier.</li>
          <li>Office admin navigates to <strong>Returned to Supplier</strong> in the admin panel.</li>
          <li>Admin enters:</li>
        </ol>
        <table>
          <thead><tr><th>Field</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>Cylinder Serial(s)</td><td>One or more cylinders being returned</td></tr>
            <tr><td>Return Weight</td><td>Weight at time of return (for audit reconciliation)</td></tr>
            <tr><td>Supplier Name</td><td>e.g. A-Gas</td></tr>
            <tr><td>Supplier Branch</td><td>e.g. Newcastle</td></tr>
            <tr><td>Supplier Returns Reference</td><td>Supplier's reference number on their returns documentation</td></tr>
            <tr><td>Supplier Documentation Photo</td><td>Optional photo of supplier's return receipt or label</td></tr>
          </tbody>
        </table>
        <ol start={4}>
          <li>The system records: <code>status: &quot;returned&quot;</code>, <code>locationType: &quot;supplier&quot;</code>, <code>returnedAt</code> timestamp, <code>returnedBy</code>, <code>returnHwcnNumber</code>, and an immutable movement log entry: action = <code>returned_to_supplier</code>.</li>
          <li>The cylinder exits active tracking and appears in the <strong>Returned to Supplier</strong> register.</li>
        </ol>
        <blockquote><strong>Note:</strong> New (virgin gas) cylinders contain no hazardous waste. No HWCN is required for their return. Recovery cylinders require the full HWCN process — see SOP-002.</blockquote>

        {/* 5 */}
        <h2>5. Records Generated and Retention</h2>
        <table>
          <thead><tr><th>Record Type</th><th>Where Stored</th><th>Retention</th></tr></thead>
          <tbody>
            <tr><td>Cylinder Registration Record</td><td>bottles table — F-Gas Tracker Pro database</td><td>Minimum 5 years (UK F-Gas Regulations)</td></tr>
            <tr><td>Movement Log</td><td>movement_logs table — append-only</td><td>Minimum 5 years</td></tr>
            <tr><td>Usage Log (per job visit)</td><td>usage_logs table — append-only</td><td>Minimum 5 years</td></tr>
            <tr><td>Equipment Details (per usage log)</td><td>equipment_details field within usage log</td><td>Minimum 5 years</td></tr>
            <tr><td>Return Record</td><td>bottles table — returnedAt, returnedBy, returnHwcnNumber</td><td>Minimum 5 years</td></tr>
          </tbody>
        </table>
        <p>All records are <strong>immutable</strong> — the system does not permit deletion or editing of historical logs. All timestamps are recorded in ISO 8601 format (UTC).</p>
        <p>The following reports can be generated from the system for audit purposes:</p>
        <ul>
          <li><strong>Cylinder Usage Report</strong> — per cylinder, full usage history with equipment details</li>
          <li><strong>Full Job Report</strong> — per job, all cylinders used, quantities, engineers, equipment</li>
          <li><strong>Van Inventory Report</strong> — point-in-time snapshot of all cylinders on a van</li>
          <li><strong>Returned to Supplier Register</strong> — all returned cylinders with reference numbers</li>
        </ul>

        {/* 6 */}
        <h2>6. Compliance Controls</h2>
        <table>
          <thead><tr><th>Control</th><th>How Enforced</th></tr></thead>
          <tbody>
            <tr><td>Weight reconciliation</td><td>Every usage log records weight before and after independently; quantity used is system-calculated, not manually entered</td></tr>
            <tr><td>Engineer qualification</td><td>Only registered, approved users can log usage in the system; role-based access control enforced at login</td></tr>
            <tr><td>Immutable audit trail</td><td>usage_logs and movement_logs tables are append-only; no UPDATE or DELETE operations permitted on historical records</td></tr>
            <tr><td>PO traceability</td><td>Every cylinder is linked to a supplier and PO number at registration</td></tr>
            <tr><td>Equipment record</td><td>Manufacturer, model and serial number captured for every usage event, enabling traceability back to the specific system charged</td></tr>
            <tr><td>Cylinder lifecycle</td><td>Full chain from registeredAt to returnedAt is traceable within the system for any cylinder at any time</td></tr>
          </tbody>
        </table>

        {/* Footer */}
        <div className="footer">
          21 Degrees Ltd &nbsp;|&nbsp; Unit 10, Apollo Court, Monkton Business Park, Hebburn, Tyne &amp; Wear, NE31 2ES &nbsp;|&nbsp; Tel: 0191 495 7224<br />
          REFCOM Registration: REF1010728 &nbsp;|&nbsp; 21 Degrees F-Gas Tracker Pro &nbsp;|&nbsp; &copy; 2026 21 Degrees Ltd
        </div>
      </div>
    </div>
  );
}
