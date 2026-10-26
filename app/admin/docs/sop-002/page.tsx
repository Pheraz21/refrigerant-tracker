"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

export default function Sop002Page() {
  const router = useRouter();

  return (
    <div>
      {/* Toolbar */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/admin/docs");
            }
          }}
          style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "0.9rem" }}
          title="Go back"
        >
          <ArrowLeft size={16} /> Back to Procedures
        </button>
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
          @page { margin: 0; }
          @media print {
            .no-print { display: none !important; }
            html, body, body > div { background: #fff !important; overflow: visible !important; height: auto !important; }
            main { margin: 0 !important; padding: 0 !important; overflow: visible !important; height: auto !important; }
            #sop-document { box-shadow: none; border-radius: 0; padding: 2.5cm 3cm; max-width: none; width: 100%; margin: 0; box-sizing: border-box; }
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
              <h1>SOP-002</h1>
              <p style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0.25rem 0 0", color: "#333" }}>
                Recovery Cylinder — Refrigerant Recovery, Waste Claim (HWCN) and Return to Supplier
              </p>
            </div>
            <img src="/21-degrees-logo-reports.png" style={{ width: "110px", height: "auto" }} alt="21 Degrees" />
          </div>
          <table className="control-table">
            <tbody>
              <tr><td>Document Number</td><td>SOP-002</td><td>Version</td><td>3.2</td></tr>
              <tr><td>Issue Date</td><td>26 October 2026</td><td>Next Review</td><td>26 October 2027</td></tr>
              <tr><td>Author</td><td>_________________________</td><td>Approved By</td><td>_________________________</td></tr>
              <tr><td>F-Gas Certification No.</td><td>REF1010728</td><td>System</td><td>21 Degrees F-Gas Tracker Pro</td></tr>
              <tr><td>Carrier Registration (CBDU)</td><td>CBDU368286</td><td>EWC Waste Code</td><td>14 06 01</td></tr>
            </tbody>
          </table>
        </div>

        {/* 1 */}
        <h2>1. Purpose and Scope</h2>
        <p>This procedure describes the controlled process by which <strong>21 Degrees Ltd</strong> receives recovery cylinders, recovers fluorinated greenhouse gases from customer equipment on site, raises a Hazardous Waste Consignment Note (HWCN), and returns the cylinder to the authorised supplier for reclamation or destruction.</p>
        <p>21 Degrees Ltd utilises a bespoke <strong>F-Gas Tracker Pro</strong> application for the management of all refrigerant cylinders. This system consists of a <strong>web portal</strong> used by office staff and administrators, and a <strong>mobile application</strong> used by field engineers on site. All records are stored centrally and are available for audit at any time.</p>
        <p><strong>Scope:</strong> Applies to all cylinders categorised as <strong>Reclaim / Recovery</strong> within F-Gas Tracker Pro. These cylinders contain recovered refrigerant classified as hazardous waste (EWC Code 14 06 01) under the Hazardous Waste (England and Wales) Regulations 2005 and must not be treated as new product. Upon completion of recovery, cylinders are returned directly to the authorised supplier.</p>

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
        <h2>3. Procurement</h2>
        <p>All refrigerant cylinder purchases are initiated through <strong>Clik4</strong>, the company's CRM system. Purchase orders are raised within Clik4 and emailed directly to the relevant supplier. The purchase order number is recorded in F-Gas Tracker Pro when the cylinder is registered on receipt, maintaining a continuous chain from procurement through to disposal.</p>
        <p>No refrigerant cylinder may enter service without a corresponding purchase order reference recorded in the system.</p>

        {/* 4 */}
        <h2>4. Roles and Responsibilities</h2>
        <table>
          <thead><tr><th>Role</th><th>Responsibility</th></tr></thead>
          <tbody>
            <tr><td>Engineer</td><td>Use the F-Gas Tracker Pro mobile application to: register new recovery cylinders upon receipt; record all cylinder movements (van loading, site delivery and returns); record all on-site recovery accurately and promptly including weights, producer site details and equipment details; transport cylinders to the supplier on completion and obtain the supplier's HWCN documentation. Engineers must hold a current F-Gas Category I qualification and must not handle refrigerant without logging the event in the system.</td></tr>
            <tr><td>Office / Admin</td><td>Register recovery cylinders received at HQ; record supplier returns in F-Gas Tracker Pro including the supplier's HWCN reference number; retain copies of supplier HWCN documentation; generate compliance reports for audit purposes</td></tr>
            <tr><td>Office Manager / Director</td><td>Ensure the company's waste carrier registration (CBDU368286) remains current; approve this procedure; maintain company F-Gas certification REF1010728</td></tr>
          </tbody>
        </table>
        <p>All engineers handling F-Gas must hold a current, relevant <strong>F-Gas qualification</strong> (Category I or appropriate category) and work under a company holding F-Gas certification <strong>REF1010728</strong>.</p>

        {/* 5 */}
        <h2>5. Procedure</h2>

        <h3>5.1 Cylinder Receipt and Registration</h3>
        <p>Recovery cylinders enter 21 Degrees Ltd's possession by one of two routes:</p>
        <p><strong>Route A — Delivery to HQ Stores:</strong> Where a cylinder is delivered to Unit 10, Apollo Court, Hebburn, office staff inspect the cylinder on receipt and register it in F-Gas Tracker Pro. The cylinder is assigned to Stores and becomes available for allocation to engineers.</p>
        <p><strong>Route B — Direct Collection from Supplier:</strong> Where an engineer collects a cylinder directly from the supplier, the engineer registers the cylinder in the F-Gas Tracker Pro mobile application at the point of collection. The same information is recorded as Route A.</p>
        <p><strong>Route C — Direct Delivery by Supplier to Job Site:</strong> Where the Supplier delivers the cylinder direct to the job site — for example when a specific gas type is needed immediately on site — the engineer registers the bottle in the F-Gas Tracker Pro mobile application at the point of delivery. The same information is recorded as Route A.</p>
        <p>In all cases, the following information is recorded at registration:</p>
        <table>
          <thead><tr><th>Field</th><th>Description</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td>Serial Number</td><td>Unique cylinder identifier</td><td>1N051418</td></tr>
            <tr><td>Category</td><td>Reclaim</td><td>Reclaim</td></tr>
            <tr><td>Gas Type</td><td>Unused — updated automatically when a specific refrigerant is recovered on site</td><td>Unused</td></tr>
            <tr><td>Capacity (kg)</td><td>Maximum fill weight of the cylinder</td><td>10.00 kg</td></tr>
            <tr><td>Supplier</td><td>Supplier from whom the cylinder was obtained</td><td>Kooltech / A-Gas</td></tr>
          </tbody>
        </table>
        <p>The system creates a permanent cylinder record with an initial status and gas type of <strong>Unused</strong> (`0.00 kg`) and an entry in the audit log at the time of registration.</p>
        <blockquote><strong>Supplier Serial Format Check:</strong> At registration, F-Gas Tracker Pro checks the entered serial number against the selected supplier&apos;s standard format (e.g. BOC 8 digits + 1&ndash;2 letters; Beijer Ref / HRP / Dean &amp; Wood / Kooltech 2 letters/digits + 6 digits or RR + 8 digits; A-Gas / TF Solutions AG + digits; Climate Center CC + digits). If an unusual format is entered, a warning prompt requires explicit confirmation before registering. Cylinders owned by <strong>21 Degrees</strong> (company-purchased bottles) or <strong>Other</strong> are exempt.</blockquote>

        <h3>5.2 Recovery Cylinder Classifications (Unused, Active Waste, Trace, and Empty / Evacuated)</h3>
        <p>Throughout its lifecycle, a recovery cylinder (`category: Reclaim`) is classified into one of four states in F-Gas Tracker Pro, which determines whether a Hazardous Waste Consignment Note (HWCN) is legally required when moving or returning the cylinder:</p>
        <table>
          <thead><tr><th>Classification</th><th>Gas Type &amp; Weight</th><th>Definition &amp; HWCN Requirement</th></tr></thead>
          <tbody>
            <tr><td><strong>Unused</strong></td><td>Gas Type: <code>Unused</code><br />Weight: <code>0.00 kg</code></td><td>A newly registered recovery cylinder that has never had waste refrigerant recovered into it. Contains no hazardous waste; may be moved between Stores, Vans, and Supplier with <strong>no HWCN required</strong>.</td></tr>
            <tr><td><strong>Active Waste</strong></td><td>Gas Type: e.g. <code>R410A</code>, <code>R32</code>, <code>Mixed</code><br />Weight: <code>&gt; 0.00 kg</code></td><td>Contains weighed recovered waste refrigerant. Legally classified as Hazardous Waste (EWC 14 06 01) — <strong>requires an HWCN</strong> when transferred to HQ-Stores or returned to a Supplier.</td></tr>
            <tr><td><strong>Trace</strong></td><td>Gas Type: Retained (e.g. <code>R410A</code>)<br />Weight displayed as: <code>Trace</code> (<code>0.00 kg</code>)</td><td>A recovery cylinder that previously held waste refrigerant and has been emptied of weighed gas (`0.00 kg`) via on-site re-charge or workshop decant, <strong>without being evacuated to a full vacuum (not vacced)</strong>. Residual refrigerant vapour remains inside the vessel. The cylinder retains its gas classification, displays its weight as <strong>Trace</strong>, and <strong>remains legally classified as Hazardous Waste — requiring a Paper Supplier HWCN when returned to the supplier</strong> (with quantity recorded as <em>Trace</em> on Part B of the HWCN).</td></tr>
            <tr><td><strong>Empty / Evacuated</strong></td><td>Gas Type: <code>Empty / Evacuated</code><br />Weight: <code>0.00 kg</code></td><td>A recovery cylinder that has been emptied to `0.00 kg` <strong>and confirmed as pulled down to a full vacuum (vacced)</strong> on site or during workshop decant. Its gas type is reset to <code>Empty / Evacuated</code>, its producer site history is cleared, and it can be reused for any refrigerant type or moved with <strong>no HWCN required</strong>.</td></tr>
          </tbody>
        </table>

        <h3>5.3 Cylinder Movements</h3>
        <p><strong>Stores to Van:</strong> When a cylinder is issued to a field engineer, the Engineer records this allocation in F-Gas Tracker Pro. The engineer's name and vehicle registration plate are recorded against the cylinder and a movement log entry is created.</p>
        <blockquote><strong>Control:</strong> Only one engineer's van is associated with each cylinder at any time. If a cylinder is transferred between vans, both parties and the date/time of the handover are recorded in the movement log.</blockquote>
        <p><strong>Van to Site:</strong> When the engineer takes the cylinder to a customer job site, this movement is recorded in F-Gas Tracker Pro. The job reference and recognized CRM site details (Site Name and Job Name) are displayed on the cylinder card and recorded, and a movement log entry is created.</p>
        <p><strong>Site back to Van:</strong> On completion of recovery work or upon concluding the site visit, the engineer records the movement of the cylinder back to their van in F-Gas Tracker Pro. A movement log entry is created and the cylinder returns to the engineer's Van Inventory.</p>
        <blockquote><strong>Control &amp; Compliance Note:</strong> A Hazardous Waste Consignment Note (HWCN) when leaving a site is <strong>strictly dependent on whether waste refrigerant was actually added/recovered into the cylinder during that site visit</strong>. If a recovery cylinder was taken to a job site but no waste gas was added during the visit (e.g. no recovery performed, inspection only, or on-site recharge/leak check only), moving the cylinder back into the van is a simple physical location transfer. No HWCN is prompted or generated.</blockquote>

        <h3>5.4 On-Site Refrigerant Recovery</h3>
        <p>When recovering refrigerant from a customer's system on site, the engineer records the recovery in F-Gas Tracker Pro before leaving site. If the cylinder is already located at a job site, the <strong>Job Number</strong> is automatically populated from its site location and locked to prevent accidental changes (modifiable only via an explicit <em>Edit</em> button). The following information is captured:</p>
        <table>
          <thead><tr><th>Field</th><th>Description</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td>Job Number</td><td>Work order reference</td><td>JOB-88219</td></tr>
            <tr><td>Job Type</td><td>Recovery</td><td>Recovery</td></tr>
            <tr><td>Gas Type Recovered</td><td>Type of gas removed from the system</td><td>R410A</td></tr>
            <tr><td>Producer Site Name</td><td>Customer / site name</td><td>Retail Store #4</td></tr>
            <tr><td>Producer Site Address &amp; Postcode</td><td>Full address of the site where gas was recovered</td><td>123 High Street, NE1 4XP</td></tr>
            <tr><td>Weight Before (kg)</td><td>Cylinder weight before connecting to equipment</td><td>2.50 kg</td></tr>
            <tr><td>Weight After (kg)</td><td>Cylinder weight after recovery is complete</td><td>5.20 kg</td></tr>
            <tr><td>Equipment Manufacturer</td><td>Manufacturer of the system recovered from</td><td>Daikin</td></tr>
            <tr><td>Equipment Model</td><td>Model number</td><td>FDTC50VF</td></tr>
            <tr><td>Equipment Serial Number</td><td>Equipment serial number</td><td>9948201B</td></tr>
          </tbody>
        </table>
        <p>The quantity recovered is calculated automatically as Weight After minus Weight Before. A permanent usage log and movement log entry are created in the system.</p>
        <blockquote><strong>Control:</strong> Weight before and after are recorded independently to provide a verifiable audit trail. If the gas type recovered differs from what is already in the cylinder, a different clean cylinder must be used. Mixing refrigerant types is not permitted.</blockquote>

        <h3>5.5 On-Site Re-charge Restrictions (Waste vs. Clean Recycled Gas)</h3>
        <p>Under UK F-Gas and Hazardous Waste Regulations, strict segregation applies between raw recovered waste and certified recycled stock:</p>
        <ul>
          <li><strong>Raw Recovery / Waste Cylinders (Category: Reclaim):</strong> Uncleaned refrigerant decanted into a reclaim cylinder is legally classified as hazardous waste. It may strictly <strong>ONLY be re-charged into equipment on the exact same job number</strong> (`locationId`) from which that batch of waste gas was recovered (the statutory on-site repair exemption). F-Gas Tracker Pro programmatically restricts the <em>&quot;Use / Re-charge Recovered Gas&quot;</em> button on both the <strong>Bottle Actions</strong> screen and the <strong>Log Gas Recovery / Usage</strong> screen so that it is <strong>only available when the cylinder is currently located on that exact matching job number</strong> (e.g. if waste gas was recovered on job <code>C38038</code>, the re-charge option is hidden if the bottle is moved to job <code>C38037</code>, even at the same customer premises).</li>
          <li><strong>Evacuation Check When Re-charging to 0.00 kg:</strong> If an on-site re-charge empties the recovery cylinder down to <code>0.00 kg</code>, the mobile app prompts the engineer to confirm whether the cylinder was <strong>pulled to a full vacuum (Evacuated / Vacced)</strong>. If evacuated, the cylinder is reset to <code>Empty / Evacuated</code>; if not evacuated, it retains its gas type and is classified as <strong>Trace</strong> (still subject to a Supplier HWCN on return).</li>
          <li><strong>Certified Recycled Cylinders (Category: Recycled):</strong> Where recovered refrigerant has been transferred to HQ-Stores/Workshop, passed through certified reclamation/filtration rigs, and formally reclassified under the Reclassification Procedure, the cylinder holds clean recycled gas. Certified recycled cylinders may be dispatched and charged into equipment on <strong>any site for any job</strong>.</li>
        </ul>

        <h3>5.6 Equipment Decommissioning Record (Where Applicable)</h3>
        <p>If the system being worked on is being <strong>permanently decommissioned</strong>, the engineer flags this when logging the recovery in F-Gas Tracker Pro. A separate decommissioning record is created capturing the job number, site details, engineer name, equipment manufacturer, model and serial number, weight of gas recovered per unit, and date and time.</p>
        <p>These records are available in the <strong>Decommissioned Equipment Register</strong> for regulatory submissions demonstrating refrigerant removal from circulation.</p>

        {/* 6 */}
        <h2>6. Waste Transfer and Hazardous Waste Consignment Note (HWCN)</h2>
        <p>When an engineer has completed recovery work and the cylinder contains waste refrigerant (including <strong>Trace</strong> residual vapour), a controlled transfer process must be followed. This section describes that process as it operates within F-Gas Tracker Pro.</p>

        <h3>6.1 Initiating a Transfer</h3>
        <p>The engineer opens the cylinder record in the F-Gas Tracker Pro mobile application and selects <strong>Move Cylinder</strong>. The system automatically determines the required transfer route based on the cylinder's classification and contents:</p>
        <ul>
          <li>If the cylinder is classified as <strong>Unused</strong> or <strong>Empty / Evacuated</strong> (`0.00 kg` vacced), a simple location update is performed with no HWCN required.</li>
          <li>If the cylinder contains <strong>waste refrigerant (`&gt; 0.00 kg`)</strong> or is classified as <strong>Trace (`0.00 kg` non-evacuated with retained gas type)</strong>, the system enforces hazardous waste consignment rules:
            <ul>
              <li><strong>Site to Van (No waste added on current visit):</strong> Transferring the cylinder from the job site back into the engineer's van is completed as a direct vehicle stock allocation without prompting for or generating an HWCN.</li>
              <li><strong>Transfer to HQ-Stores or Return to Supplier (from Site, Van, or after signing out of HQ-Stores):</strong> The system routes the movement through the mandatory HWCN consignment workflow described below (Route A or Route B).</li>
            </ul>
          </li>
        </ul>

        <h3>6.2 Transfer Routes</h3>
        <p>The system determines the permitted destination based on how many producer sites are associated with the cylinder:</p>
        <table>
          <thead><tr><th>Scenario</th><th>Permitted Destination</th><th>HWCN Type</th></tr></thead>
          <tbody>
            <tr><td><strong>Single producer site (or Trace cylinder from Stores/Van)</strong> — waste or Trace gas from one source</td><td>Direct to supplier <em>or</em> HQ-Stores</td><td>Supplier's physical paper HWCN (e.g. <code>21DEGR/A XXXX</code>) <em>or</em> System-generated internal HWCN (to HQ-Stores)</td></tr>
            <tr><td><strong>Multiple producer sites</strong> — gas recovered from two or more different customer sites</td><td>HQ-Stores only — direct supplier return is blocked</td><td>System-generated internal HWCN (to HQ-Stores), followed by consolidated Supplier paper HWCN on return from Stores</td></tr>
          </tbody>
        </table>
        <h3>6.3 Route A — Transfer to Supplier (From Van or After Signing Out of HQ-Stores) &amp; Paper HWCN Capture</h3>
        <p>Where a waste cylinder (`&gt; 0.00 kg`) or a <strong>Trace</strong> cylinder (`0.00 kg` non-evacuated) is transferred to a supplier by an engineer — whether directly following a single-site recovery or after signing a waste/Trace bottle out of HQ-Stores into their van to drop off at a supplier branch — a <strong>Paper Supplier HWCN</strong> is mandatory:</p>
        <ol>
          <li>The engineer selects <strong>Supplier</strong> as the destination and enters the supplier branch name (e.g. <em>Kooltech Gateshead</em> or <em>A-Gas Newcastle</em>).</li>
          <li>The engineer completes the supplier's physical paper HWCN (e.g. <code>21DEGR/A XXXX</code>) — filling in Part A (Notification Details), Part B (Description of Waste — entering the weighed kg or <strong>Trace</strong> alongside the cylinder serial number and gas type), Part C (Carrier's Certificate including vehicle registration and CBDU368286), and Part D (Consignor's Certificate).</li>
          <li>The system places the cylinder into <strong>Supplier Transit</strong> and immediately prompts the engineer to photograph and upload the completed Paper Supplier HWCN once the supplier branch has signed Part E (Consignee's Certificate).</li>
          <li>When the engineer uploads the photo of the completed paper HWCN and confirms delivery, the system:
            <ul>
              <li>Marks the cylinder status as <code>returned</code> and location as <code>supplier</code></li>
              <li>Automatically stamps <code>returned_by</code> (engineer name) and <code>returned_at</code> (return timestamp)</li>
              <li>Stores the uploaded HWCN photo permanently against the cylinder record and movement log</li>
            </ul>
          </li>
          <li>The cylinder then appears in the <strong>Returned to Supplier</strong> register showing its gas type, weight (or <strong>Trace</strong>), Return Date, Returned By, Supplier, and linked HWCN photo.</li>
        </ol>

        <h3>6.4 Route B — Transfer to HQ-Stores with Internal HWCN</h3>
        <p>The engineer has the option to return the waste bottle to 21 Degrees HQ-Stores. The system generates an internal HWCN automatically.</p>
        <ol>
          <li>The engineer reviews and confirms the following information before proceeding:</li>
        </ol>
        <table>
          <thead><tr><th>Section</th><th>Field</th><th>Source</th></tr></thead>
          <tbody>
            <tr><td>Part A — Producer Sites</td><td>Name, address, and postcode for each site where gas was recovered</td><td>Auto-populated from recovery logs; engineer confirms or corrects</td></tr>
            <tr><td>Part C — Carrier Certificate</td><td>Carrier name</td><td>Auto-populated from engineer's profile; editable</td></tr>
            <tr><td>Part C — Carrier Certificate</td><td>Vehicle registration</td><td>Auto-populated from engineer's profile; editable</td></tr>
          </tbody>
        </table>
        <ol start={2}>
          <li>The engineer confirms the transfer. The system:
            <ul>
              <li>Generates an internal HWCN with a unique reference number in the format <strong>21Degr-XXXXXX</strong></li>
              <li>Sets the HWCN status to <em>In Transit</em></li>
              <li>Records the cylinder's intended destination as HQ-Stores</li>
              <li>Creates a movement log entry referencing the HWCN number</li>
            </ul>
          </li>
          <li>The engineer transports the cylinder to HQ-Stores (Unit 10, Apollo Court, Hebburn). The internal HWCN can be printed from the admin panel if a paper copy is required during transit.</li>
          <li>On arrival at HQ-Stores, the engineer taps <strong>Complete Transit</strong> in the mobile application. The system:
            <ul>
              <li>Updates the cylinder location to HQ-Stores</li>
              <li>Advances the HWCN status to <em>awaiting consignee sign-off</em></li>
              <li>Records the delivery timestamp</li>
              <li>Creates a movement log entry</li>
            </ul>
          </li>
        </ol>

        <h3>6.5 Part E Sign-Off by Office Staff (Route B)</h3>
        <p>Once a cylinder has been delivered to HQ-Stores under Route B, office staff must complete the consignee section (Part E) of the internal HWCN before the cylinder can proceed to the supplier.</p>
        <ol>
          <li>Office staff navigate to the <strong>HWCN Queue</strong> in the admin panel. Consignment notes awaiting sign-off are displayed with an <em>Awaiting Part E</em> status.</li>
          <li>Staff open the relevant HWCN record and verify the details shown (cylinder serial, gas type, weight, producer sites, carrier details, and delivery timestamp).</li>
          <li>Staff complete Part E by entering the following:</li>
        </ol>
        <table>
          <thead><tr><th>Field</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>Received By</td><td>Name of the office staff member accepting the waste cylinder</td></tr>
            <tr><td>Waste Exemption Number</td><td>Pre-populated: <strong>31Z 3725 34</strong> (immutable)</td></tr>
            <tr><td>Acceptance Decision</td><td>Accept or Reject. If rejected, a reason must be entered and the cylinder remains at HQ-Stores pending resolution.</td></tr>
          </tbody>
        </table>
        <ol start={4}>
          <li>On submission, the system sets the HWCN status to <em>complete</em>, records the sign-off timestamp, and the cylinder becomes available for onward collection by the supplier (see section 6.6).</li>
        </ol>
        <blockquote><strong>Note:</strong> The internal HWCN print template pre-populates all mandatory regulatory reference numbers (CBDU368286, waste exemption 31Z 3725 34, EWC Code 14 06 01). These values are immutable and cannot be changed by users.</blockquote>

        <h3>6.6 Returning Waste or Trace Cylinders from HQ-Stores to Supplier</h3>
        <p>Once a waste cylinder (or <strong>Trace</strong> cylinder) has been received at HQ-Stores and Part E of any internal HWCN has been signed off, it may be returned to the supplier by either of two methods — both of which require a <strong>Paper Supplier HWCN</strong>:</p>
        <ul>
          <li><strong>Method 1 — Office / Admin Return from HQ-Stores (Return Waste to Supplier):</strong> When the supplier collects from HQ-Stores or office staff process a batch return from Stores, the paper Supplier HWCN (e.g. <code>21DEGR/A XXXX</code>) is completed with 21 Degrees Ltd (Unit 10, Apollo Court, Hebburn, NE31 2ES) as the waste remover/consignor and the supplier branch as consignee. Multiple cylinders (including both weighed waste cylinders and <strong>Trace</strong> cylinders) may be listed on Part B of the same paper HWCN. Office staff open <strong>HQ-Stores &rarr; Return Waste to Supplier</strong>, select the cylinder(s), enter the Supplier Name, Supplier Branch, and Paper HWCN Number, and upload the photograph(s) of the signed paper HWCN.</li>
          <li><strong>Method 2 — Engineer Takes Waste / Trace Cylinder from HQ-Stores to Supplier Branch:</strong> Where an engineer signs a waste or <strong>Trace</strong> cylinder out of HQ-Stores into their van to drop off at a supplier branch in person, selecting <strong>Supplier</strong> on the cylinder transfer screen automatically triggers the <strong>Paper Supplier HWCN</strong> capture flow (Section 6.3), requiring the engineer to photograph and upload the completed and signed paper HWCN at the supplier branch.</li>
        </ul>

        <h3>6.7 Cross-Referencing Prior Consignment Notes and Incremental Weight Tracking</h3>
        <p>Where a recovery cylinder undergoes a subsequent transfer (for example, where a cylinder already holding consigned waste receives additional recovery gas from another site, or where residual waste is returned to HQ-Stores/Supplier following site work):</p>
        <ul>
          <li><strong>Prior HWCN Cross-Reference:</strong> F-Gas Tracker Pro automatically checks for prior completed consignment notes for that cylinder. The new HWCN explicitly cross-references the previous note code (e.g. <em>21Degr-XXXXXX</em>) and records the prior consigned weight.</li>
          <li><strong>Incremental Liability Tracking:</strong> To prevent double-counting the initial waste producer&apos;s liability, the system assigns only the incremental/net weight transferred on the new note.</li>
          <li><strong>Field Engineer Transparency:</strong> All prior and active consignment notes linked to a cylinder are displayed directly in the mobile <em>Bottle Action Hub</em> under &quot;Associated Hazardous Waste Notes&quot;, allowing engineers to inspect the note history at any time.</li>
        </ul>

        <h3>6.8 Temporary Holding at HQ-Stores, On-Site Re-charge Reconciliation, and Workshop Decanting</h3>
        <p>In standard HVAC service operations, refrigerant may be decanted from a malfunctioning system into a recovery cylinder and transported to HQ-Stores for safe overnight or short-term holding under an internal HWCN while waiting for replacement parts or workshop repairs. Once parts arrive, the cylinder is taken back to the same job site to re-charge the repaired or replaced equipment.</p>
        <p>Under statutory waste rules, an executed HWCN represents a historical point-in-time transfer on the public highway and cannot be altered retroactively. F-Gas Tracker Pro reconciles this lifecycle as follows:</p>
        <ul>
          <li><strong>On-Site Re-charge Action:</strong> When the cylinder is returned to the original job site (matching the exact job number where the waste was recovered), the engineer logs the re-charge via <em>&quot;Use / Re-charge Recovered Gas&quot;</em>. The bottle&apos;s physical weight is decremented in real time.</li>
          <li><strong>Automatic Audit Reconciliation:</strong> F-Gas Tracker Pro links the re-charge usage log to the earlier HWCN and generates an <strong>On-Site Re-charge &amp; Waste Reconciliation Log</strong> displayed in both the admin portal and printed on Part B of the official HWCN manifest:
            <blockquote>Original Consigned Weight &minus; Total Re-charged on Site = Net Residual Waste in Cylinder</blockquote>
          </li>
          <li><strong>Residual Waste vs. Evacuation Handling (0.00 kg):</strong> When a recovery cylinder is emptied to <code>0.00 kg</code> (either via on-site re-charge or via <strong>Workshop Decant</strong> into a Recycled cylinder in HQ-Stores), the user is prompted to confirm whether the donor cylinder was <strong>evacuated to vacuum (vacced)</strong>:
            <ul>
              <li><strong>Evacuated (Vacced):</strong> The cylinder is reset to <code>Empty / Evacuated</code> and its producer sites are cleared.</li>
              <li><strong>Not Evacuated (Residual Vapour Remains):</strong> The cylinder retains its gas type and is classified as <strong>Trace</strong> (`0.00 kg`). It remains subject to a Paper Supplier HWCN (recorded as <em>Trace</em>) when returned to the supplier.</li>
            </ul>
          </li>
        </ul>

        {/* 7 */}
        <h2>7. Records Generated and Retention</h2>
        <table>
          <thead><tr><th>Record Type</th><th>What it contains</th><th>Retention</th></tr></thead>
          <tbody>
            <tr><td>Cylinder Registration Record</td><td>Serial number, gas type, capacity, supplier, registration date, registering staff member</td><td>Minimum 5 years</td></tr>
            <tr><td>Movement Log</td><td>Every location change — from/to location, engineer, vehicle registration, date and time. Permanent and cannot be edited.</td><td>Minimum 5 years</td></tr>
            <tr><td>Recovery / Usage Log (per job)</td><td>Job number, producer site name, address and postcode, engineer, weight before and after, quantity recovered, equipment details, date and time</td><td>Minimum 5 years</td></tr>
            <tr><td>Decommissioned Equipment Record</td><td>Job number, site details, engineer, equipment manufacturer/model/serial number, weight recovered per unit, date and time</td><td>Minimum 5 years</td></tr>
            <tr><td>Internal Consignment Note (HWCN)</td><td>Unique code, parts A–E, carrier signature, vehicle reg, producer sites, incremental weight, and prior HWCN cross-reference</td><td>Minimum 5 years</td></tr>
            <tr><td>On-Site Re-charge Reconciliation Log</td><td>Linked HWCN code, date, quantity re-charged into equipment, job number, engineer, and net residual waste calculation</td><td>Minimum 5 years</td></tr>
            <tr><td>Supplier Return Record</td><td>Return date and time, staff member who processed the return, supplier name and branch, supplier's HWCN reference number, photo of supplier's HWCN documentation</td><td>Minimum 5 years</td></tr>
          </tbody>
        </table>
        <p>All records are <strong>permanent and cannot be edited or deleted</strong>. The system maintains a complete, unbroken audit trail for every recovery cylinder from registration through to supplier return.</p>
        <p>The following reports can be generated from the system for audit purposes:</p>
        <ul>
          <li><strong>Full Job Report</strong> — all recovery events on a job, quantities, producer site and equipment details</li>
          <li><strong>Cylinder Usage / Audit Trail</strong> — complete lifecycle per cylinder from registration to return</li>
          <li><strong>Hazardous Waste Consignment Notes (HWCNs)</strong> — full registry with digital Part E signatures, prior HWCN references, and on-site re-charge reconciliation</li>
          <li><strong>Decommissioned Equipment Register</strong> — all decommissioning events by date, site, engineer and equipment</li>
          <li><strong>On-Site Inventory Report</strong> — all cylinders currently at customer sites, with site details and last engineer</li>
          <li><strong>Van Inventory Report</strong> — cylinders on each engineer's van</li>
          <li><strong>Haz Waste in Company Summary</strong> — live dynamic hazardous waste holdings across vans, sites and stores</li>
          <li><strong>Returned to Supplier Register</strong> — all returned cylinders with supplier HWCN references</li>
        </ul>

        {/* 8 */}
        <h2>8. Compliance Controls</h2>
        <table>
          <thead><tr><th>Control</th><th>How Enforced</th></tr></thead>
          <tbody>
            <tr><td>Mandatory weight recording</td><td>Weight before and after are both required fields; quantity recovered is calculated by the system, not manually entered</td></tr>
            <tr><td>Unused vs. Trace vs. Empty/Evacuated distinction</td><td>Newly registered reclaim bottles start as <code>Unused</code>. Emptying a waste bottle to 0 kg without vacuum evacuation retains its gas type and classifies it as <strong>Trace</strong> (subject to a Paper Supplier HWCN on return); only confirmed vacuum evacuation resets it to <code>Empty / Evacuated</code></td></tr>
            <tr><td>Producer site capture &amp; locked Job Number</td><td>Site name, address and postcode are mandatory fields; auto-populated Job Numbers on site are locked behind an explicit <em>Edit</em> button to prevent accidental changes</td></tr>
            <tr><td>Strict same-job re-charge restriction</td><td>Uncertified waste in reclaim cylinders is programmatically locked to the exact originating recovery job number (`locationId`); the re-charge option is hidden on any other job number</td></tr>
            <tr><td>Prior consignment cross-referencing</td><td>Subsequent waste transfers automatically cite prior completed HWCN numbers and deduct prior weight to prevent double-counting liabilities</td></tr>
            <tr><td>Net residual waste reconciliation</td><td>HWCN manifests record on-site re-charge deductions to explain differences between initial stores receipts and residual returns</td></tr>
            <tr><td>Equipment traceability</td><td>Manufacturer, model and serial number recorded at every recovery event</td></tr>
            <tr><td>Mandatory Paper Supplier HWCN &amp; Return Attribution</td><td>Returning any waste or <strong>Trace</strong> cylinder to a supplier (from Van or HQ-Stores) requires a Paper Supplier HWCN photo upload and automatically records <code>returned_by</code> and <code>returned_at</code></td></tr>
            <tr><td>Immutable audit trail</td><td>All records are permanent — no editing or deletion of historical entries is permitted</td></tr>
            <tr><td>Engineer qualification</td><td>Only approved, qualified engineers with valid F-Gas certification may log recovery events; role-based access enforced at login</td></tr>
            <tr><td>Waste carrier registration</td><td>Company waste carrier registration CBDU368286 must remain current; required for legal transport of waste refrigerant on public roads</td></tr>
          </tbody>
        </table>

        {/* Footer */}
        <div className="footer">
          21 Degrees Ltd &nbsp;|&nbsp; Unit 10, Apollo Court, Monkton Business Park, Hebburn, Tyne &amp; Wear, NE31 2ES &nbsp;|&nbsp; Tel: 0191 495 7224<br />
          F-Gas Certification No. REF1010728 &nbsp;|&nbsp; Carrier CBDU368286 &nbsp;|&nbsp; 21 Degrees F-Gas Tracker Pro &nbsp;|&nbsp; &copy; 2026 21 Degrees Ltd
        </div>
      </div>
    </div>
  );
}
