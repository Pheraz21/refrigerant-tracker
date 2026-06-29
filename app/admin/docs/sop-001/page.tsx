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
          @page { margin: 1.5cm; }
          @media print {
            .no-print { display: none !important; }
            html, body, body > div { background: #fff !important; overflow: visible !important; height: auto !important; }
            main { margin: 0 !important; padding: 0 !important; overflow: visible !important; height: auto !important; }
            #sop-document { box-shadow: none; border-radius: 0; padding: 0; max-width: none; width: 100%; margin: 0; }
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
              <tr><td>F-Gas Certification No.</td><td>REF1010728</td><td>System</td><td>21 Degrees F-Gas Tracker Pro</td></tr>
            </tbody>
          </table>
        </div>

        {/* 1 */}
        <h2>1. Purpose and Scope</h2>
        <p>This procedure describes the controlled process by which <strong>21 Degrees Ltd</strong> procures, receives, allocates, uses, and returns new virgin refrigerant cylinders. It establishes the audit trail that demonstrates compliance with UK F-Gas regulations throughout the full cylinder lifecycle.</p>
        <p>21 Degrees Ltd utilises a bespoke <strong>F-Gas Tracker Pro</strong> application for the management of all refrigerant cylinders. This system consists of a <strong>web portal</strong> used by office staff and administrators, and a <strong>mobile application</strong> used by field engineers on site. All records are stored centrally and are available for audit at any time.</p>
        <p><strong>Scope:</strong> Applies to all new (virgin gas) refrigerant cylinders including hydrofluorocarbons (HFCs), hydrochlorofluorocarbons (HCFCs), and other fluorinated gases purchased for use in refrigeration and air conditioning equipment. Recovery cylinders are covered under SOP-002.</p>

        {/* 2 */}
        <h2>2. Regulatory References</h2>
        <table>
          <thead><tr><th>Reference</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>The Fluorinated Greenhouse Gases Regulations 2015 (SI 2015/310)</td><td>UK implementing legislation for F-Gas control; operator record-keeping obligations</td></tr>
            <tr><td>Regulation (EU) No 517/2014 (retained in UK law)</td><td>F-Gas Regulation requiring records of quantities used, recovered and destroyed</td></tr>
            <tr><td>BS EN 378</td><td>Safety and environmental requirements for refrigerating systems</td></tr>
            <tr><td>REFCOM Code of Practice</td><td>Register of Companies Competent to Handle Refrigerants — operational standards for registered contractors</td></tr>
            <tr><td>Environment Act 1995</td><td>Reporting obligations for fluorinated gases to the Environment Agency</td></tr>
          </tbody>
        </table>

        {/* 3 */}
        <h2>3. Procurement</h2>
        <p>All refrigerant cylinder purchases are initiated through <strong>Clik4</strong>, the company's CRM system. Purchase orders are raised within Clik4 and emailed directly to the relevant supplier. The purchase order number is recorded in F-Gas Tracker Pro when the cylinder is registered on receipt, maintaining a continuous chain from procurement through to disposal.</p>
        <p>No refrigerant cylinder may enter service without a corresponding purchase order reference recorded in the system.</p>

        {/* 4 */}
        <h2>4. Roles and Responsibilities</h2>
        <table>
          <thead><tr><th>Role</th><th>Responsibility</th></tr></thead>
          <tbody>
            <tr><td>Office / Admin</td><td>Raise purchase orders in Clik4; register cylinders received at HQ into F-Gas Tracker Pro; record van allocations; process returns to supplier; maintain supplier records</td></tr>
            <tr><td>Engineer</td><td>Use the F-Gas Tracker Pro mobile application to: register new bottles upon direct collection from supplier; record all bottle movements (van loading, site delivery and returns); record all on-site usage accurately and promptly; capture equipment details (manufacturer, model, serial number) at every usage event; and return cylinders to the supplier once usage is complete. Engineers must not handle refrigerant without logging the event in the system.</td></tr>
            <tr><td>Office Manager / Director</td><td>Approve this procedure; ensure all engineers hold valid F-Gas qualifications before handling refrigerant; maintain F-Gas certification REF1010728</td></tr>
          </tbody>
        </table>
        <p>All engineers handling F-Gas must hold a current, relevant <strong>F-Gas qualification</strong> (Category I or appropriate category) and work under a company holding F-Gas certification <strong>REF1010728</strong>.</p>

        {/* 5 */}
        <h2>5. Procedure</h2>

        <h3>5.1 Cylinder Receipt and Registration</h3>
        <p>New refrigerant cylinders enter 21 Degrees Ltd's possession by one of two routes:</p>

        <p><strong>Route A — Delivery to HQ Stores:</strong> Where a cylinder is delivered to Unit 10, Apollo Court, Hebburn, office staff inspect the cylinder on receipt (checking for damage, correct labelling, and that the weight matches the delivery note) and register it in F-Gas Tracker Pro. The cylinder is assigned to Stores and becomes available for allocation to engineers.</p>

        <p><strong>Route B — Direct Collection from Supplier:</strong> Where an engineer collects a cylinder directly from a supplier — for example when a specific gas type is needed immediately — the engineer registers the bottle in the F-Gas Tracker Pro mobile application at the point of collection. The same information is recorded as Route A.</p>

        <p>In both cases, the following information is recorded at registration:</p>
        <table>
          <thead><tr><th>Field</th><th>Description</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td>Serial Number</td><td>Unique cylinder identifier from the label</td><td>8849201A</td></tr>
            <tr><td>Gas Type</td><td>Refrigerant type</td><td>R410A</td></tr>
            <tr><td>Initial Weight (kg)</td><td>Full weight as shown on cylinder label</td><td>12.00 kg</td></tr>
            <tr><td>Supplier</td><td>Supplier name</td><td>A-Gas</td></tr>
            <tr><td>Purchase Order Number</td><td>PO reference from Clik4</td><td>PO-2026-0441</td></tr>
            <tr><td>Rental Expiry Date (if applicable)</td><td>Date the rental agreement expires</td><td>31/12/2026</td></tr>
          </tbody>
        </table>
        <p>The system creates a permanent cylinder record and an entry in the audit log at the time of registration.</p>

        <h3>5.2 Cylinder Movements</h3>
        <p><strong>Stores to Van:</strong> When a cylinder is to be issued from Stores to a field engineer, this allocation is recorded in F-Gas Tracker Pro by the Engineer. The engineer's name and vehicle registration plate are recorded against the cylinder, and a movement log entry is created. The cylinder then appears in the engineer's Van Inventory on the mobile app.</p>
        <blockquote><strong>Control:</strong> Only one engineer's van is associated with each cylinder at any time. If a cylinder is transferred between vans, both parties and the date/time of the handover are recorded in the movement log.</blockquote>
        <p><strong>Van to Site:</strong> When an engineer takes a cylinder from their van to a customer job site, this movement is recorded in F-Gas Tracker Pro by the Engineer. The job reference and site details are recorded against the cylinder, and a movement log entry is created. The cylinder is shown as located at that job site until it is moved again.</p>
        <p><strong>Site back to Van:</strong> On completion of work at the site — whether the cylinder is fully used or has remaining gas — the engineer records the movement of the cylinder back to their van in F-Gas Tracker Pro. A movement log entry is created. The cylinder returns to the engineer's Van Inventory.</p>

        <h3>5.3 On-Site Usage</h3>
        <p>When refrigerant is dispensed to a customer's system on site, the engineer records the usage in the F-Gas Tracker Pro mobile application before leaving site. The following information is captured:</p>
        <table>
          <thead><tr><th>Field</th><th>Description</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td>Job Number</td><td>Work order reference from Clik4</td><td>JOB-88219</td></tr>
            <tr><td>Job Type</td><td>Nature of work</td><td>Installation / Service / Repair</td></tr>
            <tr><td>Site Name</td><td>Customer site name</td><td>Retail Store #4</td></tr>
            <tr><td>Site Address</td><td>Full site address</td><td>123 High Street, NE1 4XP</td></tr>
            <tr><td>Weight Before (kg)</td><td>Cylinder weight immediately before use</td><td>11.50 kg</td></tr>
            <tr><td>Weight After (kg)</td><td>Cylinder weight immediately after use</td><td>9.20 kg</td></tr>
            <tr><td>Equipment Manufacturer</td><td>Manufacturer of the system being charged</td><td>Daikin</td></tr>
            <tr><td>Equipment Model</td><td>Model number</td><td>FDTC50VF</td></tr>
            <tr><td>Equipment Serial Number</td><td>Serial number of the system</td><td>9948201B</td></tr>
          </tbody>
        </table>
        <p>The quantity used is calculated automatically as Weight Before minus Weight After. A permanent usage log entry and movement log entry are created in the system.</p>
        <blockquote><strong>Control:</strong> Weight before and after are recorded independently to provide a verifiable audit trail. Usage records cannot be edited after submission — corrections are logged as separate adjustment entries.</blockquote>

        <h3>5.4 Cylinder Status Monitoring</h3>
        <p>F-Gas Tracker Pro continuously tracks each cylinder's status. Office staff and admin are notified automatically when a cylinder falls below the minimum weight threshold.</p>
        <table>
          <thead><tr><th>Status</th><th>Condition</th><th>Action Required</th></tr></thead>
          <tbody>
            <tr><td>Active</td><td>Cylinder has remaining gas</td><td>Normal use — available for jobs</td></tr>
            <tr><td>Low Gas</td><td>Remaining weight is below the minimum threshold</td><td>Admin and office notified automatically</td></tr>
            <tr><td>Empty</td><td>No remaining gas</td><td>Return to stores or supplier</td></tr>
          </tbody>
        </table>

        <h3>5.5 Return of Empty or Depleted Cylinders</h3>
        <p>When a cylinder is empty or no longer required on a van, it is returned to the supplier by one of two routes:</p>

        <p><strong>Route A — Direct Return to Supplier by Engineer:</strong> The engineer takes the cylinder directly to the supplier's premises. On completion of the return, the engineer records the movement in F-Gas Tracker Pro, entering the supplier's name, branch, and the supplier's reference number for the return. A photo of the supplier's returns documentation may also be uploaded. The cylinder is marked as returned and a permanent movement log entry is created.</p>

        <p><strong>Route B — Return to Stores, Office Arranges Collection:</strong> The engineer moves the cylinder back to HQ Stores and records this movement in F-Gas Tracker Pro. The cylinder is shown as located in Stores. Office staff then organise the return to the supplier. When the cylinder leaves for the supplier, office staff record the final movement in F-Gas Tracker Pro, entering the supplier's name, branch, and the supplier's reference number. The cylinder is marked as returned and a permanent movement log entry is created.</p>

        <p>In both routes, the cylinder exits active tracking and appears in the <strong>Returned to Supplier</strong> register once the return is recorded.</p>
        <blockquote><strong>Note:</strong> New (virgin gas) cylinders contain no hazardous waste. No Hazardous Waste Consignment Note (HWCN) is required for their return. Recovery cylinders require the full HWCN process — see SOP-002.</blockquote>

        {/* 6 */}
        <h2>6. Records Generated and Retention</h2>
        <table>
          <thead><tr><th>Record Type</th><th>What it contains</th><th>Retention</th></tr></thead>
          <tbody>
            <tr><td>Cylinder Registration Record</td><td>Serial number, gas type, initial weight, supplier, PO number, registration date, registering staff member</td><td>Minimum 5 years (UK F-Gas Regulations)</td></tr>
            <tr><td>Movement Log</td><td>Every location change — from/to location, engineer, vehicle registration, date and time. Permanent and cannot be edited.</td><td>Minimum 5 years</td></tr>
            <tr><td>Usage Log (per job visit)</td><td>Job number, job type, site name and address, engineer, weight before and after, quantity used, date and time</td><td>Minimum 5 years</td></tr>
            <tr><td>Equipment Details (per usage log)</td><td>Manufacturer, model number and serial number of every system charged during the visit</td><td>Minimum 5 years</td></tr>
            <tr><td>Return Record</td><td>Return date and time, staff member who processed the return, supplier name and branch, supplier's reference number, photo of supplier documentation</td><td>Minimum 5 years</td></tr>
          </tbody>
        </table>
        <p>All records are <strong>permanent and cannot be edited or deleted</strong>. The system maintains a complete, unbroken audit trail for every cylinder from registration through to return.</p>
        <p>The following reports can be generated from the system for audit purposes:</p>
        <ul>
          <li><strong>Cylinder Usage Report</strong> — full usage history per cylinder, including equipment details</li>
          <li><strong>Full Job Report</strong> — all cylinders used on a job, quantities, engineers, equipment</li>
          <li><strong>Van Inventory Report</strong> — point-in-time snapshot of all cylinders on a van</li>
          <li><strong>On-Site Inventory Report</strong> — all cylinders currently located at customer sites, with site details and last engineer</li>
          <li><strong>Returned to Supplier Register</strong> — all returned cylinders with supplier reference numbers</li>
        </ul>

        {/* 7 */}
        <h2>7. Compliance Controls</h2>
        <table>
          <thead><tr><th>Control</th><th>How Enforced</th></tr></thead>
          <tbody>
            <tr><td>Procurement trail</td><td>Every cylinder is linked to a Clik4 purchase order number at registration</td></tr>
            <tr><td>Weight reconciliation</td><td>Weight before and after are recorded independently; quantity used is calculated by the system, not manually entered</td></tr>
            <tr><td>Engineer qualification</td><td>Only approved, qualified users may log usage; role-based access enforced at login</td></tr>
            <tr><td>Immutable audit trail</td><td>Usage and movement records are permanent — no editing or deletion of historical entries is permitted</td></tr>
            <tr><td>Equipment traceability</td><td>Manufacturer, model and serial number of the serviced system recorded at every usage event</td></tr>
            <tr><td>Full lifecycle traceability</td><td>Every cylinder is traceable from the original purchase order through to supplier return</td></tr>
          </tbody>
        </table>

        {/* Footer */}
        <div className="footer">
          21 Degrees Ltd &nbsp;|&nbsp; Unit 10, Apollo Court, Monkton Business Park, Hebburn, Tyne &amp; Wear, NE31 2ES &nbsp;|&nbsp; Tel: 0191 495 7224<br />
          F-Gas Certification No. REF1010728 &nbsp;|&nbsp; 21 Degrees F-Gas Tracker Pro &nbsp;|&nbsp; &copy; 2026 21 Degrees Ltd
        </div>
      </div>
    </div>
  );
}
