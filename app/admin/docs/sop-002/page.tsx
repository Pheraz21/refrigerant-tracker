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
              <tr><td>Document Number</td><td>SOP-002</td><td>Version</td><td>3.1</td></tr>
              <tr><td>Issue Date</td><td>14 October 2026</td><td>Next Review</td><td>14 October 2027</td></tr>
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
            <tr><td>Serial Number</td><td>Unique cylinder identifier</td><td>REC-402</td></tr>
            <tr><td>Category</td><td>Reclaim</td><td>Reclaim</td></tr>
            <tr><td>Gas Type</td><td>Empty / Evacuated — updated when gas type is confirmed on site</td><td>Empty / Evacuated</td></tr>
            <tr><td>Capacity (kg)</td><td>Maximum fill weight of the cylinder</td><td>10.00 kg</td></tr>
            <tr><td>Supplier</td><td>Supplier from whom the cylinder was obtained</td><td>A-Gas</td></tr>
          </tbody>
        </table>
        <p>The system creates a permanent cylinder record and an entry in the audit log at the time of registration.</p>

        <h3>5.2 Cylinder Movements</h3>
        <p><strong>Stores to Van:</strong> When a cylinder is issued to a field engineer, the Engineer records this allocation in F-Gas Tracker Pro. The engineer's name and vehicle registration plate are recorded against the cylinder and a movement log entry is created.</p>
        <blockquote><strong>Control:</strong> Only one engineer's van is associated with each cylinder at any time. If a cylinder is transferred between vans, both parties and the date/time of the handover are recorded in the movement log.</blockquote>
        <p><strong>Van to Site:</strong> When the engineer takes the cylinder to a customer job site, this movement is recorded in F-Gas Tracker Pro. The job reference and site details are recorded and a movement log entry is created.</p>
        <p><strong>Site back to Van:</strong> On completion of recovery work or upon concluding the site visit, the engineer records the movement of the cylinder back to their van in F-Gas Tracker Pro. A movement log entry is created and the cylinder returns to the engineer's Van Inventory.</p>
        <blockquote><strong>Control &amp; Compliance Note:</strong> A Hazardous Waste Consignment Note (HWCN) is <strong>strictly dependent on whether waste refrigerant was actually added/recovered into the cylinder during that site visit</strong>. If a recovery cylinder was taken to a job site but no waste gas was added during the visit (e.g. no recovery performed, inspection only, or on-site recharge/leak check only), moving the cylinder back into the van is a simple physical location transfer. No HWCN is prompted or generated. An HWCN is only raised when hazardous waste has actually been recovered during that visit.</blockquote>

        <h3>5.3 On-Site Refrigerant Recovery</h3>
        <p>When recovering refrigerant from a customer's system on site, the engineer records the recovery in F-Gas Tracker Pro before leaving site. The following information is captured:</p>
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

        <h3>5.4 On-Site Re-charge Restrictions (Waste vs. Clean Recycled Gas)</h3>
        <p>Under UK F-Gas and Hazardous Waste Regulations, strict segregation applies between raw recovered waste and certified recycled stock:</p>
        <ul>
          <li><strong>Raw Recovery / Waste Cylinders (Category: Reclaim):</strong> Uncleaned refrigerant decanted into a reclaim cylinder is legally classified as hazardous waste. It may strictly <strong>ONLY be re-charged into equipment on the exact same job number</strong> from which it was recovered (the statutory on-site repair exemption). F-Gas Tracker Pro programmatically restricts the <em>&quot;Use / Re-charge Recycled Gas on Site&quot;</em> action card so that it will <strong>only appear</strong> when the cylinder is currently located on that exact matching job number. Re-charging raw waste from a reclaim cylinder across different sites or jobs is strictly blocked.</li>
          <li><strong>Certified Recycled Cylinders (Category: Recycled):</strong> Where recovered refrigerant has been transferred to HQ-Stores/Workshop, passed through certified reclamation/filtration rigs, and formally reclassified under the Reclassification Procedure, the cylinder holds clean recycled gas. Certified recycled cylinders may be dispatched and charged into equipment on <strong>any site for any job</strong>.</li>
        </ul>

        <h3>5.5 Equipment Decommissioning Record (Where Applicable)</h3>
        <p>If the system being worked on is being <strong>permanently decommissioned</strong>, the engineer flags this when logging the recovery in F-Gas Tracker Pro. A separate decommissioning record is created capturing the job number, site details, engineer name, equipment manufacturer, model and serial number, weight of gas recovered per unit, and date and time.</p>
        <p>These records are available in the <strong>Decommissioned Equipment Register</strong> for regulatory submissions demonstrating refrigerant removal from circulation.</p>

        {/* 6 */}
        <h2>6. Waste Transfer and Hazardous Waste Consignment Note (HWCN)</h2>
        <p>When an engineer has completed recovery work and the cylinder contains waste refrigerant, a controlled transfer process must be followed before the cylinder leaves the engineer's van. This section describes that process as it operates within F-Gas Tracker Pro.</p>

        <h3>6.1 Initiating a Transfer</h3>
        <p>The engineer opens the cylinder record in the F-Gas Tracker Pro mobile application and selects <strong>Move Cylinder</strong>. The system automatically determines the required transfer route based on the cylinder's contents:</p>
        <ul>
          <li>If the cylinder contains <strong>no gas</strong>, a simple location update is performed with no HWCN required.</li>
          <li>If the cylinder contains <strong>waste refrigerant</strong>, the system checks whether any waste refrigerant was actually recovered into the cylinder during the current site visit:
            <ul>
              <li><strong>No waste added on current visit:</strong> Transferring the cylinder from the job site back into the engineer's van is completed as a direct vehicle stock allocation without prompting for or generating an HWCN.</li>
              <li><strong>Waste recovered on current visit:</strong> The system routes the movement through the required HWCN consignment workflow described below (Route A or Route B).</li>
            </ul>
          </li>
        </ul>

        <h3>6.2 Transfer Routes</h3>
        <p>The system determines the permitted destination based on how many producer sites are associated with the cylinder:</p>
        <table>
          <thead><tr><th>Scenario</th><th>Permitted Destination</th><th>HWCN Type</th></tr></thead>
          <tbody>
            <tr><td><strong>Single producer site</strong> — all gas recovered from one customer site</td><td>Direct to supplier <em>or</em> HQ-Stores</td><td>Supplier's physical HWCN paperwork <em>or</em> System-generated internal HWCN</td></tr>
            <tr><td><strong>Multiple producer sites</strong> — gas recovered from two or more different customer sites</td><td>HQ-Stores only — direct supplier return is blocked</td><td>System-generated internal HWCN</td></tr>
          </tbody>
        </table>
        <h3>6.3 Route A — Direct Transfer to Supplier</h3>
        <p>Where the cylinder contains waste from a single producer site, the engineer may transfer it directly to the supplier.</p>
        <ol>
          <li>The engineer selects <strong>Supplier</strong> as the destination and enters the supplier branch name (e.g. <em>A-Gas Newcastle</em>).</li>
          <li>Before confirming the transfer in the app, the engineer completes the supplier's paper HWCN — filling in the Producer, Consignor, and Carrier sections. The app prompts the engineer to confirm this has been done before the transfer can proceed.</li>
          <li>The system records the cylinder as <em>in transit</em> to the supplier and creates a movement log entry.</li>
          <li>The engineer transports the cylinder to the supplier's premises. The company waste carrier registration <strong>CBDU368286</strong> must be current for the legal transport of waste refrigerant on public roads.</li>
          <li>At the supplier, the engineer hands over the cylinder with the paperwork, where the supplier completes the Consignee section and accepts receipt of the waste cylinder.</li>
          <li>The engineer taps <strong>Complete Transit</strong> in the mobile application and uploads the photo of the supplier's HWCN.</li>
          <li>The system marks the cylinder as <em>returned</em>, records the delivery timestamp, and stores the supplier's HWCN photo. A permanent movement log entry is created.</li>
          <li>The cylinder then appears in the Returned to Supplier register with its full audit trail.</li>
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

        <h3>6.6 Supplier Collection from HQ-Stores</h3>
        <p>Once a waste cylinder has been received at HQ-Stores and Part E has been signed off, office staff contact the supplier to arrange collection of the cylinder.</p>
        <p>When the supplier attends HQ-Stores to collect the waste cylinder, they bring their own HWCN paperwork. This is completed as part of the handover — covering the transfer of the waste from 21 Degrees Ltd to the supplier for reclamation or destruction.</p>
        <p>Office staff photograph the completed supplier paperwork and upload it against the cylinder record in F-Gas Tracker Pro. The system marks the cylinder as returned to the supplier and the photo is stored permanently against the bottle, completing the audit trail.</p>

        <h3>6.7 Cross-Referencing Prior Consignment Notes and Incremental Weight Tracking</h3>
        <p>Where a recovery cylinder undergoes a subsequent transfer (for example, where a cylinder already holding consigned waste receives additional recovery gas from another site, or where residual waste is returned to HQ-Stores/Supplier following site work):</p>
        <ul>
          <li><strong>Prior HWCN Cross-Reference:</strong> F-Gas Tracker Pro automatically checks for prior completed consignment notes for that cylinder. The new HWCN explicitly cross-references the previous note code (e.g. <em>21Degr-XXXXXX</em>) and records the prior consigned weight.</li>
          <li><strong>Incremental Liability Tracking:</strong> To prevent double-counting the initial waste producer&apos;s liability, the system assigns only the incremental/net weight transferred on the new note.</li>
          <li><strong>Field Engineer Transparency:</strong> All prior and active consignment notes linked to a cylinder are displayed directly in the mobile <em>Bottle Action Hub</em> under &quot;Associated Hazardous Waste Notes&quot;, allowing engineers to inspect the note history at any time.</li>
        </ul>

        <h3>6.8 Temporary Holding at HQ-Stores and On-Site Re-charge Reconciliation</h3>
        <p>In standard HVAC service operations, refrigerant may be decanted from a malfunctioning system into a recovery cylinder and transported to HQ-Stores for safe overnight or short-term holding under an internal HWCN while waiting for replacement parts or workshop repairs. Once parts arrive, the cylinder is taken back to the same job site to re-charge the repaired or replaced equipment.</p>
        <p>Under statutory waste rules, an executed HWCN represents a historical point-in-time transfer on the public highway and cannot be altered retroactively. F-Gas Tracker Pro reconciles this lifecycle as follows:</p>
        <ul>
          <li><strong>On-Site Re-charge Action:</strong> When the cylinder is returned to the original job site, the engineer logs the re-charge via <em>&quot;Use / Re-charge Recycled Gas on Site&quot;</em>. The bottle&apos;s physical weight is decremented in real time.</li>
          <li><strong>Automatic Audit Reconciliation:</strong> F-Gas Tracker Pro links the re-charge usage log to the earlier HWCN and generates an <strong>On-Site Re-charge &amp; Waste Reconciliation Log</strong> displayed in both the admin portal and printed on Part B of the official HWCN manifest:
            <blockquote>Original Consigned Weight &minus; Total Re-charged on Site = Net Residual Waste in Cylinder</blockquote>
          </li>
          <li><strong>Residual Waste Handling:</strong> If 100% of the gas is re-charged back into equipment (0.00 kg remaining), the cylinder transitions to an empty reclaim cylinder and is automatically removed from active hazardous waste holding metrics. If residual gas remains, any subsequent consignment note records only the net residual weight.</li>
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
            <tr><td>Producer site capture</td><td>Site name, address and postcode are mandatory fields for all recovery log entries</td></tr>
            <tr><td>Same-job re-charge restriction</td><td>Uncertified waste in reclaim cylinders is programmatically locked to the originating recovery job number; re-charging across different sites is blocked</td></tr>
            <tr><td>Prior consignment cross-referencing</td><td>Subsequent waste transfers automatically cite prior completed HWCN numbers and deduct prior weight to prevent double-counting liabilities</td></tr>
            <tr><td>Net residual waste reconciliation</td><td>HWCN manifests record on-site re-charge deductions to explain differences between initial stores receipts and residual returns</td></tr>
            <tr><td>Equipment traceability</td><td>Manufacturer, model and serial number recorded at every recovery event</td></tr>
            <tr><td>Supplier HWCN reference required</td><td>The supplier's HWCN reference number must be recorded when processing a return; the supplier's document is retained as a photo upload</td></tr>
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
