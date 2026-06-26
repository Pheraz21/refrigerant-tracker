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
          #sop-document code { font-family: monospace; background: #f0f0f0; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.85rem; }
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
              <tr><td>REFCOM Registration</td><td>REF1010728</td><td>System</td><td>21 Degrees F-Gas Tracker Pro</td></tr>
              <tr><td>Carrier Registration (CBDU)</td><td>CBDU368286</td><td>Waste Exemption No.</td><td>31Z 3725 34</td></tr>
              <tr><td>EWC Code</td><td colSpan={3}>14 06 01 — Halogenated refrigerants</td></tr>
            </tbody>
          </table>
        </div>

        {/* 1 */}
        <h2>1. Purpose and Scope</h2>
        <p>This procedure describes the controlled process by which <strong>21 Degrees Ltd</strong> manages the recovery of fluorinated greenhouse gases from customer equipment, raises Hazardous Waste Consignment Notes (HWCNs), transports waste refrigerant, and returns recovery cylinders to the authorised supplier for reclamation or destruction.</p>
        <p>21 Degrees Ltd utilises a bespoke <strong>F-Gas Tracker Pro</strong> application for the management of all refrigerant cylinders. This system consists of a <strong>web portal</strong> (used by office staff and administrators to register cylinders, manage movements, process HWCN Part E sign-offs, process supplier returns and generate compliance reports) and a <strong>mobile application</strong> (used by field engineers on site to register new bottles, record all bottle movements, log recovery weights, capture producer site details and equipment information, and initiate the HWCN process). All records are stored centrally and are available for audit at any time.</p>
        <p><strong>Scope:</strong> Applies to all cylinders categorised as <strong>Reclaim / Recovery</strong> within the F-Gas Tracker Pro system. These cylinders contain recovered refrigerant classified as <strong>hazardous waste</strong> under the Hazardous Waste (England and Wales) Regulations 2005 and must not be treated as new product.</p>
        <p>This procedure covers: single-site recovery, multi-site recovery (mandatory HWCN routing via HQ-Stores), equipment decommissioning associated with recovery events, and the full HWCN lifecycle: generation, transit, Part E sign-off, and supplier return.</p>

        {/* 2 */}
        <h2>2. Regulatory References</h2>
        <table>
          <thead><tr><th>Reference</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>Hazardous Waste (England and Wales) Regulations 2005 (SI 2005/894)</td><td>Requires Consignment Notes for movement of hazardous waste; defines producer, carrier and consignee obligations</td></tr>
            <tr><td>Environmental Protection Act 1990, Section 34</td><td>Duty of Care — waste must only be transferred to an authorised person with a written description of the waste</td></tr>
            <tr><td>The Fluorinated Greenhouse Gases Regulations 2015 (SI 2015/310)</td><td>Requires recovery of F-Gas before decommissioning; records of quantities recovered</td></tr>
            <tr><td>Regulation (EU) No 517/2014 (retained in UK law)</td><td>F-Gas Regulation — recovery, reclamation and destruction obligations</td></tr>
            <tr><td>REFCOM Code of Practice</td><td>Standards for registered contractors performing F-Gas recovery</td></tr>
            <tr><td>The Carriage of Dangerous Goods and Use of Transportable Pressure Equipment Regulations 2009</td><td>Governs transport of fluorinated gases in pressure vessels</td></tr>
          </tbody>
        </table>

        {/* 3 */}
        <h2>3. Definitions</h2>
        <table>
          <thead><tr><th>Term</th><th>Definition</th></tr></thead>
          <tbody>
            <tr><td>Recovery Cylinder</td><td>A pressure vessel used to collect fluorinated greenhouse gas removed from customer equipment. Categorised as <em>Reclaim</em> in the system.</td></tr>
            <tr><td>Producer Site</td><td>The customer premises where refrigerant was physically recovered. Each recovery event is tagged with the producer's name, address and postcode.</td></tr>
            <tr><td>Hazardous Waste</td><td>Recovered refrigerant classified under EWC Code <strong>14 06 01</strong> (halogenated refrigerants, foam/aerosol blowing agents).</td></tr>
            <tr><td>HWCN</td><td>Hazardous Waste Consignment Note. A multi-part document required by law whenever hazardous waste is transferred from one premises to another.</td></tr>
            <tr><td>Part C</td><td>The Carrier's Certificate section of the HWCN — signed by the engineer transporting the waste.</td></tr>
            <tr><td>Part E</td><td>The Consignee's Certificate section of the HWCN — signed by the receiving party (HQ-Stores staff or supplier).</td></tr>
            <tr><td>CBDU Number</td><td>Carrier's Registered Waste Carrier number. 21 Degrees Ltd: <strong>CBDU368286</strong>.</td></tr>
            <tr><td>Waste Exemption</td><td>EA-registered exemption under which waste is received/stored at HQ. 21 Degrees Ltd: <strong>31Z 3725 34</strong>.</td></tr>
            <tr><td>HQ-Stores</td><td>21 Degrees Ltd premises (Unit 10, Apollo Court, Hebburn) acting as interim consignee for multi-site waste.</td></tr>
            <tr><td>Single-Site Recovery</td><td>A recovery cylinder that has received gas from only one producer site. May be returned directly to supplier.</td></tr>
            <tr><td>Multi-Site Recovery</td><td>A recovery cylinder that has received gas from two or more producer sites. Must be returned to HQ-Stores first; cannot go direct to supplier.</td></tr>
          </tbody>
        </table>

        {/* 4 */}
        <h2>4. Roles and Responsibilities</h2>
        <table>
          <thead><tr><th>Role</th><th>Responsibility</th></tr></thead>
          <tbody>
            <tr><td>Engineer</td><td>Use the F-Gas Tracker Pro mobile application to: register new bottles upon receipt; record all bottle movements (including van loading, site delivery and returns); perform recovery on site and record all weights, producer site details (name, address, postcode) and equipment details accurately and promptly; initiate the HWCN transit process in the app and carry the cylinder (with HWCN documentation) to HQ-Stores or supplier; return cylinders to the supplier once usage or recovery is complete. Engineers must hold a current F-Gas Category I qualification and must not handle refrigerant without logging the event in the system.</td></tr>
            <tr><td>Office / Admin</td><td>Generate and print HWCNs; complete Part E sign-off on receipt at HQ-Stores; process supplier returns; record supplier HWCN reference numbers; manage waste exemption documentation</td></tr>
            <tr><td>Office Manager / Director</td><td>Ensure carrier registration (CBDU368286) and waste exemption (31Z 3725 34) remain current; approve this procedure; maintain REFCOM registration REF1010728</td></tr>
          </tbody>
        </table>

        {/* 5 */}
        <h2>5. Procedure</h2>

        <h3>5.1 Recovery Cylinder Registration and Van Allocation</h3>
        <p>Recovery cylinders must be registered in the system <strong>before</strong> being issued to an engineer.</p>
        <ol>
          <li>Office admin navigates to <strong>Register Cylinder</strong> in the F-Gas Tracker Pro admin panel.</li>
          <li>Enter the following mandatory fields:</li>
        </ol>
        <table>
          <thead><tr><th>Field</th><th>Description</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td>Serial Number</td><td>Unique cylinder identifier</td><td><code>REC-402</code></td></tr>
            <tr><td>Category</td><td>Select <strong>Reclaim</strong></td><td>Reclaim</td></tr>
            <tr><td>Gas Type</td><td>Leave as Mixed/Recovery (updated when gas type confirmed on site)</td><td>Mixed/Recovery</td></tr>
            <tr><td>Initial Weight (capacity)</td><td>Maximum fill weight in kg (cylinder capacity)</td><td>10.00 kg</td></tr>
            <tr><td>Current Weight</td><td>0.00 kg — cylinder is empty on issue</td><td>0.00 kg</td></tr>
            <tr><td>Supplier</td><td>Supplier from whom this cylinder was obtained</td><td>A-Gas</td></tr>
          </tbody>
        </table>
        <ol start={3}>
          <li>Allocate the cylinder to the engineer's van using the <strong>Move Cylinder</strong> function (see SOP-001, Section 4.2). The engineer's name, vehicle registration, and timestamp are recorded.</li>
        </ol>

        <h3>5.2 On-Site Refrigerant Recovery</h3>
        <p>When recovering refrigerant from a customer's system on site:</p>
        <ol>
          <li>The engineer navigates to the recovery cylinder in the mobile app and selects <strong>Log Recovery</strong>.</li>
          <li>The engineer enters:</li>
        </ol>
        <table>
          <thead><tr><th>Field</th><th>Description</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td>Job Number</td><td>Work order / CRM job reference</td><td>JOB-88219</td></tr>
            <tr><td>Job Type</td><td>Select Recovery</td><td>Recovery</td></tr>
            <tr><td>Gas Type Recovered</td><td>Type of gas removed from the system</td><td>R410A</td></tr>
            <tr><td>Producer Site Name</td><td>Customer/site name</td><td>Retail Store #4</td></tr>
            <tr><td>Producer Site Address</td><td>Full site address</td><td>123 High Street, Newcastle</td></tr>
            <tr><td>Producer Site Postcode</td><td>Postcode (required for HWCN Part A)</td><td>NE1 4XP</td></tr>
            <tr><td>Weight Before (kg)</td><td>Cylinder weight before connecting to equipment</td><td>2.50 kg</td></tr>
            <tr><td>Weight After (kg)</td><td>Cylinder weight after recovery complete</td><td>5.20 kg</td></tr>
            <tr><td>Equipment Manufacturer</td><td>Manufacturer of the system recovered from</td><td>Daikin</td></tr>
            <tr><td>Equipment Model</td><td>Model number</td><td>FDTC50VF</td></tr>
            <tr><td>Equipment Serial</td><td>Equipment serial number</td><td>9948201B</td></tr>
          </tbody>
        </table>
        <ol start={3}>
          <li>The system updates <code>currentWeight</code>, creates an immutable Usage Log, appends the producer site (name, address, postcode) to the cylinder's <code>producerSites</code> array, and creates an immutable Movement Log entry.</li>
        </ol>
        <blockquote><strong>Important:</strong> If the gas type recovered differs from what is already in the cylinder (e.g. R410A added to a cylinder used for R32), the engineer must use a different, clean cylinder. Mixing refrigerant types is not permitted.</blockquote>

        <h3>5.3 Equipment Decommissioning Record (Where Applicable)</h3>
        <p>If the system being worked on is being <strong>permanently decommissioned</strong>:</p>
        <ol>
          <li>During the recovery logging step, the engineer ticks <strong>"Flag Equipment as Decommissioned"</strong>.</li>
          <li>The system creates an additional immutable <strong>Decommissioned Equipment</strong> record containing job number, site details, engineer name, equipment details (manufacturer, model, serial number, weight of gas recovered per unit), gas type, total weight recovered, and timestamp.</li>
          <li>These records are visible in the <strong>Decommissioned Equipment Register</strong> and are available for regulatory submissions demonstrating refrigerant removal from circulation.</li>
        </ol>

        <h3>5.4 Single-Site vs. Multi-Site Determination</h3>
        <p>After recovery is logged, the system automatically determines the required return route:</p>
        <table>
          <thead><tr><th>Scenario</th><th>Definition</th><th>Required Route</th></tr></thead>
          <tbody>
            <tr><td><strong>Single-site</strong></td><td>All gas in the cylinder was recovered from <strong>one</strong> customer site</td><td>Cylinder may be returned <strong>directly to supplier</strong></td></tr>
            <tr><td><strong>Multi-site</strong></td><td>Gas was recovered from <strong>two or more</strong> different customer sites</td><td>Cylinder <strong>must</strong> be returned to <strong>HQ-Stores</strong> first; cannot go direct to supplier</td></tr>
          </tbody>
        </table>
        <p><strong>Multi-site trigger:</strong> When the engineer logs a recovery from a site different from any previously recorded producer site on that cylinder, the system displays a <strong>"2nd Waste Producer Detected"</strong> warning. The engineer must acknowledge this. The system then automatically generates an internal HWCN, sets the cylinder's intended destination to HQ-Stores, and records a movement log entry.</p>
        <blockquote><strong>Reason:</strong> The Hazardous Waste Regulations require that where waste is collected from multiple producers in a single vehicle journey, a separate consignment note is required. Aggregating multi-site waste must go through the registered consignee at HQ before onward transfer to the supplier.</blockquote>

        <h3>5.5 Internal HWCN Generation (Multi-Site Route)</h3>
        <p>When the multi-site route is triggered, a digital HWCN is generated automatically. The consignment note contains:</p>
        <p><strong>Part A — Notification Details:</strong> All producer sites (name, address, postcode, weight recovered from each); destination (HQ-Stores); total waste quantity (kg); waste description: EWC Code <strong>14 06 01</strong>; gas type.</p>
        <p><strong>Part C — Carrier's Certificate:</strong> Engineer (carrier) name; vehicle registration; 21 Degrees Ltd carrier registration <strong>CBDU368286</strong>; date and time of collection.</p>
        <p><strong>Part E — Consignee's Certificate</strong> (completed on delivery, see Section 5.6): Receiving staff member name; waste exemption number <strong>31Z 3725 34</strong>; date received; accepted/rejected status.</p>
        <p>The HWCN can be printed from the admin panel at any time and <strong>must travel with the cylinder during transport</strong>.</p>

        <h3>5.6 Transit to HQ-Stores and Part E Sign-Off (Multi-Site Route)</h3>
        <ol>
          <li>The engineer loads the cylinder into their vehicle. The HWCN (printed or digital) must accompany the waste during transit.</li>
          <li>On arrival at HQ-Stores, the engineer opens the cylinder record on the mobile app and taps <strong>Complete Transit</strong>.</li>
          <li>The system sets HWCN status from <code>draft</code> → <code>awaiting_consignee</code>, records <code>deliveredAt</code> timestamp, clears the cylinder's transit state, and updates cylinder location to HQ-Stores.</li>
          <li>An office staff member navigates to the HWCN in the admin panel and completes <strong>Part E</strong>:</li>
        </ol>
        <table>
          <thead><tr><th>Field</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>Received By</td><td>Name of the staff member accepting the waste</td></tr>
            <tr><td>Date Received</td><td>Confirmed automatically from deliveredAt timestamp</td></tr>
            <tr><td>Accepted</td><td>Confirm acceptance (or reject with reason)</td></tr>
            <tr><td>Waste Exemption Number</td><td><strong>31Z 3725 34</strong> (pre-populated)</td></tr>
            <tr><td>Vehicle Reg (Consignee)</td><td>If applicable</td></tr>
          </tbody>
        </table>
        <ol start={5}>
          <li>On completion: HWCN status → <code>complete</code>; <code>partECompletedAt</code> timestamp recorded; <code>accepted: true</code>. The digital HWCN is now legally complete and stored in the system.</li>
        </ol>
        <blockquote><strong>Rejected Consignment:</strong> If Part E is rejected, the office staff enters rejection details. The HWCN is retained with <code>accepted: false</code>. The cylinder remains at HQ-Stores pending resolution.</blockquote>

        <h3>5.7 Direct Supplier Return (Single-Site Route)</h3>
        <p>Where a cylinder contains gas from a <strong>single producer site only</strong>, it may be returned directly to the supplier without transiting through HQ-Stores.</p>
        <ol>
          <li>The engineer (or office admin) drives the cylinder to the supplier's branch.</li>
          <li>At the supplier, the supplier issues their own HWCN paperwork. The engineer retains/photographs this document.</li>
          <li>On return, office admin navigates to <strong>Supplier Returns</strong> in the admin panel and enters:</li>
        </ol>
        <table>
          <thead><tr><th>Field</th><th>Description</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td>Cylinder Serial(s)</td><td>All cylinders being returned in this batch</td><td>REC-402</td></tr>
            <tr><td>Supplier Name</td><td>Supplier receiving the waste</td><td>A-Gas</td></tr>
            <tr><td>Supplier Branch</td><td>Branch location</td><td>Newcastle</td></tr>
            <tr><td>Return Weight</td><td>Weight of cylinder at time of return</td><td>5.20 kg</td></tr>
            <tr><td>Supplier HWCN Reference</td><td>Reference number from the supplier's HWCN</td><td>BJJ-123456</td></tr>
            <tr><td>Supplier HWCN Photo</td><td>Photo of supplier's HWCN document</td><td>Upload</td></tr>
          </tbody>
        </table>
        <ol start={4}>
          <li>On clicking <strong>Complete Supplier Return</strong>, the system sets <code>status: &quot;returned&quot;</code>, records <code>returnedAt</code> timestamp, <code>returnedBy</code>, <code>returnHwcnNumber</code>, <code>supplierHwcnPhotoUrl</code>, and creates an immutable movement log entry: action = <code>returned_to_supplier</code>.</li>
        </ol>
        <blockquote><strong>Supplier Lock:</strong> Once the first cylinder is added to a return batch, all subsequent cylinders in that batch must be from the <strong>same supplier</strong>. The system enforces this automatically to prevent cross-supplier HWCN errors.</blockquote>

        <h3>5.8 Supplier Return Following HQ-Stores Transit (Multi-Site Route Completion)</h3>
        <p>After a multi-site cylinder has been received at HQ-Stores and Part E signed off, office admin batches cylinders for onward return to the supplier. Follow the same process as Section 5.7. The supplier's HWCN reference and photo are recorded in the system against each cylinder. The cylinder's lifecycle is complete, with its full audit trail preserved: registration → recovery events (with producer sites) → internal HWCN → Part E sign-off → supplier return.</p>

        {/* 6 */}
        <h2>6. HWCN Reference Data</h2>
        <table>
          <thead><tr><th>Reference</th><th>Value</th><th>Where Used</th></tr></thead>
          <tbody>
            <tr><td>REFCOM Registration</td><td>REF1010728</td><td>Company identity on all compliance documents</td></tr>
            <tr><td>Carrier Registration Number (CBDU)</td><td>CBDU368286</td><td>Part C of HWCN — carrier's certificate</td></tr>
            <tr><td>Waste Exemption Number</td><td>31Z 3725 34</td><td>Part E of HWCN — consignee's certificate</td></tr>
            <tr><td>EWC Waste Code</td><td>14 06 01</td><td>Waste description on all HWCN parts (halogenated refrigerants)</td></tr>
            <tr><td>Waste Hazard Code</td><td>HP14</td><td>Ecotoxic — applicable to HFCs / HCFCs</td></tr>
          </tbody>
        </table>
        <p>These values are pre-populated in the F-Gas Tracker Pro HWCN print template.</p>

        {/* 7 */}
        <h2>7. Records Generated and Retention</h2>
        <table>
          <thead><tr><th>Record Type</th><th>Where Stored</th><th>Retention</th></tr></thead>
          <tbody>
            <tr><td>Recovery Cylinder Registration</td><td>bottles table — F-Gas Tracker Pro database</td><td>Minimum 5 years</td></tr>
            <tr><td>Movement Logs</td><td>movement_logs table — append-only</td><td>Minimum 5 years</td></tr>
            <tr><td>Recovery / Usage Logs (per job)</td><td>usage_logs table — append-only, with producer site and equipment details</td><td>Minimum 5 years</td></tr>
            <tr><td>Producer Sites Array</td><td>producer_sites JSONB field on bottle record</td><td>Retained for life of record</td></tr>
            <tr><td>Internal HWCN (digital)</td><td>hwcns table — includes all parts, timestamps, signatures</td><td>Minimum 5 years</td></tr>
            <tr><td>HWCN Part E Sign-Off</td><td>Within HWCN record: receivedBy, partECompletedAt, accepted</td><td>Minimum 5 years</td></tr>
            <tr><td>Supplier Return Record</td><td>bottles table — returnedAt, returnHwcnNumber, supplierHwcnPhotoUrl</td><td>Minimum 5 years</td></tr>
            <tr><td>Supplier HWCN Photo</td><td>Cloud storage (URL stored in supplierHwcnPhotoUrl)</td><td>Minimum 5 years</td></tr>
            <tr><td>Decommissioned Equipment Records</td><td>decommissioned_equipment table</td><td>Minimum 5 years</td></tr>
          </tbody>
        </table>
        <p><strong>Reports available for audit:</strong></p>
        <ul>
          <li><strong>Full Job Report</strong> — per job, all recovery events, quantities, producer sites, equipment details</li>
          <li><strong>Cylinder Usage / Audit Trail</strong> — per cylinder, complete lifecycle from registration to return</li>
          <li><strong>Decommissioned Equipment Register</strong> — all decommissioning events by date, site, engineer, equipment</li>
          <li><strong>HWCN Print</strong> — printable four-part consignment note per consignment</li>
          <li><strong>Returned to Supplier Register</strong> — all returned cylinders with supplier HWCN references</li>
          <li><strong>On-Site Inventory Report</strong> — cylinders currently at customer sites</li>
          <li><strong>Van Inventory Report</strong> — cylinders on each engineer's van</li>
        </ul>

        {/* 8 */}
        <h2>8. Compliance Controls</h2>
        <table>
          <thead><tr><th>Control</th><th>How Enforced</th></tr></thead>
          <tbody>
            <tr><td>Mandatory weight recording</td><td>Engineer cannot submit a recovery log without entering weight before and weight after; quantity recovered is system-calculated</td></tr>
            <tr><td>Producer site capture</td><td>Site name, address and postcode are mandatory fields for all recovery log entries</td></tr>
            <tr><td>Multi-site routing enforcement</td><td>System automatically detects second producer site; cylinder is locked to HQ-Stores routing — cannot be changed to direct supplier</td></tr>
            <tr><td>HWCN generation</td><td>HWCN is generated automatically by the system on multi-site trigger; cannot be bypassed</td></tr>
            <tr><td>Part E sign-off required</td><td>HWCN remains in awaiting_consignee status until office staff completes Part E; appears as open item in admin panel</td></tr>
            <tr><td>Supplier lock on returns</td><td>All cylinders in a return batch must match the same supplier — enforced by the system</td></tr>
            <tr><td>Immutable audit trail</td><td>All logs are append-only; no records can be deleted or edited retrospectively</td></tr>
            <tr><td>Equipment traceability</td><td>Manufacturer, model and serial number recorded at every recovery event</td></tr>
            <tr><td>F-Gas qualification</td><td>Only system-approved, REFCOM-registered engineers can log recovery events</td></tr>
          </tbody>
        </table>

        {/* 9 */}
        <h2>9. Process Summary</h2>
        <pre>{`Recovery Cylinder Issued to Engineer (Van)
              │
              ▼
     Gas Recovered On Site
     (weight before → after, producer site recorded)
              │
              ▼
  ┌───────────────────────────────┐
  │  More than one producer site  │
  │  on this cylinder?            │
  └───────────────────────────────┘
         │                  │
        YES                 NO
         │                  │
         ▼                  ▼
  Internal HWCN        Cylinder ready for
  Generated            direct supplier return
  (destination:        (see Section 5.7)
  HQ-Stores)
         │
         ▼
  Engineer transits to HQ-Stores
  (HWCN must travel with cylinder)
         │
         ▼
  Engineer completes transit in app
  (HWCN status: awaiting_consignee)
         │
         ▼
  Office staff completes HWCN Part E
  (received by, accepted, exemption no. 31Z 3725 34)
  (HWCN status: complete)
         │
         ▼
  Admin processes Supplier Return
  (enters supplier HWCN ref + photo)
         │
         ▼
  Cylinder status → "returned"
  Lifecycle complete — full audit trail
  preserved in F-Gas Tracker Pro`}</pre>

        {/* Footer */}
        <div className="footer">
          21 Degrees Ltd &nbsp;|&nbsp; Unit 10, Apollo Court, Monkton Business Park, Hebburn, Tyne &amp; Wear, NE31 2ES &nbsp;|&nbsp; Tel: 0191 495 7224<br />
          REFCOM: REF1010728 &nbsp;|&nbsp; Carrier: CBDU368286 &nbsp;|&nbsp; 21 Degrees F-Gas Tracker Pro &nbsp;|&nbsp; &copy; 2026 21 Degrees Ltd
        </div>
      </div>
    </div>
  );
}
