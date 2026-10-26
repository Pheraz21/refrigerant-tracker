# SOP-002: Recovery Cylinder — Refrigerant Recovery, Waste Claim (HWCN) and Return to Supplier

---

| | |
|---|---|
| **Document Number** | SOP-002 |
| **Version** | 3.2 |
| **Issue Date** | 26 October 2026 |
| **Next Review Date** | 26 October 2027 |
| **Author** | _________________________ |
| **Approved By** | _________________________ |
| **REFCOM Registration** | REF1010728 |
| **System** | 21 Degrees F-Gas Tracker Pro |
| **Carrier Registration (CBDU)** | CBDU368286 |
| **Waste Exemption Number** | 31Z 3725 34 |
| **EWC Code** | 14 06 01 |

---

## 1. Purpose and Scope

This procedure describes the controlled process by which **21 Degrees Ltd** manages the recovery of fluorinated greenhouse gases from customer equipment, raises Hazardous Waste Consignment Notes (HWCNs), transports waste refrigerant, and returns recovery cylinders to the authorised supplier for reclamation or destruction.

**Scope:** Applies to all cylinders categorised as **Reclaim / Recovery** within the F-Gas Tracker Pro system. These cylinders contain recovered refrigerant which is classified as **hazardous waste** under the Hazardous Waste (England and Wales) Regulations 2005 and must not be treated as new product.

This procedure covers:
- Single-site recovery (gas recovered from one customer site only)
- Multi-site recovery (gas aggregated from more than one customer site)
- Equipment decommissioning associated with recovery events
- The full HWCN lifecycle: generation, transit, Part E sign-off, and supplier return

---

## 2. Regulatory References

| Reference | Description |
|---|---|
| Hazardous Waste (England and Wales) Regulations 2005 (SI 2005/894) | Requires Consignment Notes for movement of hazardous waste; defines producer, carrier and consignee obligations |
| Environmental Protection Act 1990, Section 34 | Duty of Care — waste must only be transferred to an authorised person with a written description of the waste |
| The Fluorinated Greenhouse Gases Regulations 2015 (SI 2015/310) | Requires recovery of F-Gas before decommissioning; records of quantities recovered |
| Regulation (EU) No 517/2014 (retained in UK law) | F-Gas Regulation — recovery, reclamation and destruction obligations |
| REFCOM Code of Practice | Standards for registered contractors performing F-Gas recovery |
| The Carriage of Dangerous Goods and Use of Transportable Pressure Equipment Regulations 2009 | Governs transport of fluorinated gases in pressure vessels |

---

## 3. Procurement

All refrigerant cylinder purchases are initiated through **Clik4**, the company's CRM system. Purchase orders are raised within Clik4 and emailed directly to the relevant supplier. The purchase order number is recorded in F-Gas Tracker Pro when the cylinder is registered on receipt, maintaining a continuous chain from procurement through to disposal.

No refrigerant cylinder may enter service without a corresponding purchase order reference recorded in the system.

---

## 4. Definitions

| Term | Definition |
|---|---|
| **Recovery Cylinder** | A pressure vessel used to collect fluorinated greenhouse gas removed from customer equipment. Categorised as `reclaim` in the system. |
| **Producer Site** | The customer premises where refrigerant was physically recovered. Each recovery event is tagged with the producer's name, address and postcode. |
| **Hazardous Waste** | Recovered refrigerant classified under EWC Code **14 06 01** (halogenated refrigerants, foam/aerosol blowing agents). |
| **HWCN** | Hazardous Waste Consignment Note. A multi-part document required by law whenever hazardous waste is transferred from one premises to another. |
| **Part C** | The Carrier's Certificate section of the HWCN — signed by the engineer transporting the waste. |
| **Part E** | The Consignee's Certificate section of the HWCN — signed by the receiving party (HQ-Stores staff or supplier). |
| **CBDU Number** | Carrier's Registered Waste Carrier number. 21 Degrees Ltd: **CBDU368286**. |
| **Waste Exemption** | EA-registered exemption under which waste is received/stored at HQ. 21 Degrees Ltd: **31Z 3725 34**. |
| **HQ-Stores** | 21 Degrees Ltd premises (Unit 10, Apollo Court, Hebburn) acting as interim consignee for multi-site waste. |
| **Single-Site Recovery** | A recovery cylinder that has received gas from only one producer site. May be returned directly to supplier. |
| **Multi-Site Recovery** | A recovery cylinder that has received gas from two or more producer sites. Must be returned to HQ-Stores first; cannot go direct to supplier. |
| **Unused Reclaim Cylinder** | A newly registered recovery cylinder (`gasType: "Unused"`, `currentWeight: 0 kg`) that has never had waste refrigerant recovered into it. Exempt from HWCN requirements when moved or returned. |
| **Trace Cylinder** | A recovery cylinder that previously held waste refrigerant and has been emptied to `0.00 kg` (via on-site re-charge or workshop decant) **without** being evacuated to vacuum (not vacced). Retains its refrigerant classification (e.g. `R410A`), displays its weight as **`Trace`**, and remains legally classified as Hazardous Waste — requiring a Paper Supplier HWCN when returned to the supplier. |
| **Empty / Evacuated Cylinder** | A recovery cylinder that has been emptied to `0.00 kg` **and** confirmed as pulled down to a full vacuum (vacced). Its gas type is reset to `Empty / Evacuated` and its producer sites are cleared; no HWCN is required when moved. |

---

## 5. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| **Engineer** | Use the F-Gas Tracker Pro mobile application to: register new recovery cylinders upon receipt; record all cylinder movements; record all on-site recovery accurately including weights, producer site details and equipment details; complete supplier HWCN paperwork at point of transfer; transport cylinders to the supplier on completion and obtain the supplier's HWCN documentation. Engineers must hold a current F-Gas Category I qualification. |
| **Office / Admin** | Register recovery cylinders received at HQ; complete Part E sign-off on internal HWCNs; record supplier returns including the supplier's HWCN reference number and photo; generate compliance reports for audit purposes |
| **Office Manager / Director** | Ensure the company's waste carrier registration (CBDU368286) and waste exemption (31Z 3725 34) remain current; approve this procedure; maintain REFCOM registration REF1010728 |

All engineers handling F-Gas must hold a current, relevant **F-Gas qualification** (Category I or appropriate category) and work under a company holding F-Gas certification **REF1010728**.

---

## 6. Procedure

### 6.1 Cylinder Receipt and Registration

Recovery cylinders enter 21 Degrees Ltd's possession by one of three routes:

**Route A — Delivery to HQ Stores:** Where a cylinder is delivered to Unit 10, Apollo Court, Hebburn, office staff inspect the cylinder on receipt and register it in F-Gas Tracker Pro. The cylinder is assigned to Stores and becomes available for allocation to engineers.

**Route B — Direct Collection from Supplier:** Where an engineer collects a cylinder directly from the supplier, the engineer registers the cylinder in the F-Gas Tracker Pro mobile application at the point of collection. The same information is recorded as Route A.

**Route C — Direct Delivery by Supplier to Job Site:** Where the Supplier delivers the cylinder direct to the job site — for example when a specific gas type is needed immediately on site — the engineer registers the bottle in the F-Gas Tracker Pro mobile application at the point of delivery. The same information is recorded as Route A.

In all cases, the following mandatory fields are recorded at registration:

| Field | Description | Example |
|---|---|---|
| Serial Number | Unique cylinder identifier | `1N051418` |
| Category | Select **Reclaim** | Reclaim |
| Gas Type | Initialized as `Unused` (updated automatically when gas type is confirmed on site) | `Unused` |
| Capacity (kg) | Maximum fill weight in kg (cylinder capacity) | `10.00 kg` |
| Supplier | Supplier from whom this cylinder was obtained | `Kooltech` / `A-Gas` |

The system creates a permanent cylinder record with an initial status and gas type of **Unused** (`0.00 kg`) and an entry in the audit log at the time of registration.

> **Supplier Serial Format Check:** At registration, F-Gas Tracker Pro checks the entered serial number against the selected supplier's standard format (e.g. BOC 8 digits + 1–2 letters; Beijer Ref / HRP / Dean & Wood / Kooltech 2 letters/digits + 6 digits or RR + 8 digits; A-Gas / TF Solutions AG + digits; Climate Center CC + digits). If an unusual format is entered, a warning prompt requires explicit confirmation before registering. Cylinders owned by **21 Degrees** (company-purchased bottles) or **Other** are exempt.

---

### 6.2 Recovery Cylinder Classifications (Unused, Active Waste, Trace, and Empty / Evacuated)

| Classification | Gas Type & Weight | Definition & HWCN Requirement |
|---|---|---|
| **Unused** | Gas Type: `Unused`<br>Weight: `0.00 kg` | Newly registered recovery cylinder that has never had waste refrigerant recovered into it. Contains no hazardous waste; may be moved between Stores, Vans, and Supplier with **no HWCN required**. |
| **Active Waste** | Gas Type: e.g. `R410A`, `R32`, `Mixed`<br>Weight: `> 0.00 kg` | Contains weighed recovered waste refrigerant. Legally classified as Hazardous Waste (EWC 14 06 01) — **requires an HWCN** when transferred to HQ-Stores or returned to a Supplier. |
| **Trace** | Gas Type: Retained (e.g. `R410A`)<br>Weight displayed as: `Trace` (`0.00 kg`) | A recovery cylinder that previously held waste refrigerant and has been emptied of weighed gas (`0.00 kg`) via on-site re-charge or workshop decant, **without being evacuated to a full vacuum (not vacced)**. Residual refrigerant vapour remains inside the vessel. The cylinder retains its gas classification, displays its weight as **Trace**, and **remains legally classified as Hazardous Waste — requiring a Paper Supplier HWCN when returned to the supplier** (with quantity recorded as *Trace* on Part B of the HWCN). |
| **Empty / Evacuated** | Gas Type: `Empty / Evacuated`<br>Weight: `0.00 kg` | A recovery cylinder that has been emptied to `0.00 kg` **and confirmed as pulled down to a full vacuum (vacced)** on site or during workshop decant. Its gas type is reset to `Empty / Evacuated`, its producer site history is cleared, and it can be reused for any refrigerant type or moved with **no HWCN required**. |

---

### 6.3 Cylinder Movements

**Stores to Van:** When a cylinder is issued to a field engineer, the Engineer records this allocation in F-Gas Tracker Pro. The engineer's name and vehicle registration plate are recorded against the cylinder and a movement log entry is created. The cylinder then appears in the engineer's Van Inventory on the mobile app.

> **Control:** Only one engineer's van is associated with each cylinder at any time. If a cylinder is transferred between vans, both parties and the date/time of the handover are recorded in the movement log.

**Van to Site:** When the engineer takes the cylinder to a customer job site, this movement is recorded in F-Gas Tracker Pro. The job reference and site details are recorded and a movement log entry is created.

**Site back to Van:** On completion of recovery work or upon concluding the site visit, the engineer records the movement of the cylinder back to their van in F-Gas Tracker Pro. A movement log entry is created and the cylinder returns to the engineer's Van Inventory.

> **Control & Compliance Note:** A Hazardous Waste Consignment Note (HWCN) is **strictly dependent on whether waste refrigerant was actually added/recovered into the cylinder during that site visit**. If a recovery cylinder was taken to a job site but no waste gas was added during the visit (e.g. no recovery performed, inspection only, or on-site recharge/leak check only), moving the cylinder back into the van is a simple physical location transfer. No HWCN is prompted or generated. An HWCN is only raised when hazardous waste has actually been recovered during that visit.

---

### 6.3 On-Site Refrigerant Recovery

When recovering refrigerant from a customer's system on site:

1. The engineer navigates to the recovery cylinder in the mobile app and selects **Log Recovery**.
2. The engineer enters:

| Field | Description | Example |
|---|---|---|
| Job Number | Work order / CRM job reference | `JOB-88219` |
| Job Type | Select **Recovery** | Recovery |
| Gas Type Recovered | Type of gas removed from the system | `R410A` |
| Producer Site Name | Customer/site name | `Retail Store #4` |
| Producer Site Address | Full site address | `123 High Street, Newcastle` |
| Producer Site Postcode | Postcode (required for HWCN Part A) | `NE1 4XP` |
| Weight Before (kg) | Cylinder weight before connecting to equipment | `2.50 kg` |
| Weight After (kg) | Cylinder weight after recovery complete | `5.20 kg` |
| Equipment Manufacturer | Manufacturer of the system recovered from | `Daikin` |
| Equipment Model | Model number | `FDTC50VF` |
| Equipment Serial | Equipment serial number | `9948201B` |

3. The system:
   - Updates `currentWeight` on the cylinder (increases by quantity recovered)
   - Creates an immutable **Usage Log** entry
   - Appends the producer site (name, address, postcode) to the cylinder's `producerSites` array
   - Creates an immutable **Movement Log** entry

> **Important:** If the gas type recovered differs from what is already in the cylinder (e.g. R410A added to a cylinder that was used for R32), the engineer must use a different, clean cylinder. Mixing refrigerant types is not permitted.

---

### 6.5 On-Site Re-charge Restrictions (Waste vs. Clean Recycled Gas)

Under UK F-Gas and Hazardous Waste Regulations, strict legal segregation applies between raw recovered waste and certified recycled stock:

- **Raw Recovery / Waste Cylinders (Category: Reclaim):** Uncleaned refrigerant decanted into a reclaim cylinder is legally classified as hazardous waste. It may strictly **ONLY be re-charged into equipment on the exact same job number** (`locationId`) from which that batch of waste gas was recovered (under the statutory on-site repair exemption). F-Gas Tracker Pro programmatically restricts the *"Use / Re-charge Recovered Gas"* button on both the **Bottle Actions** screen and the **Log Gas Recovery / Usage** screen so that it will **only appear when the cylinder is currently located on that exact matching job number** (e.g. if waste gas was recovered on job `C38038`, the re-charge option is hidden if the bottle is moved to job `C38037`, even at the same customer premises).
- **Evacuation Check When Re-charging to 0.00 kg:** If an on-site re-charge empties the recovery cylinder down to `0.00 kg`, the mobile app prompts the engineer to confirm whether the cylinder was **pulled to a full vacuum (Evacuated / Vacced)**. If evacuated, the cylinder is reset to `Empty / Evacuated`; if not evacuated, it retains its gas type and is classified as **Trace** (still subject to a Paper Supplier HWCN on return).
- **Certified Recycled Cylinders (Category: Recycled):** Where recovered refrigerant has been transferred to HQ-Stores/Workshop, passed through certified reclamation/filtration rigs, and formally reclassified under the Reclassification Procedure, the cylinder holds clean recycled gas. Certified recycled cylinders may be dispatched and charged into equipment on **any site for any job**.

---

### 6.5 Equipment Decommissioning Record (Where Applicable)

If the system being worked on is being **permanently decommissioned** (i.e. equipment is being removed from service):

1. During the recovery logging step, the engineer ticks **"Flag Equipment as Decommissioned"**.
2. The system creates an additional immutable **Decommissioned Equipment** record containing:

| Field | Captured |
|---|---|
| Job Number | Work order reference |
| Site Name, Address, Postcode | Producer site details |
| Engineer | Name of engineer performing decommissioning |
| Equipment details (per unit) | Manufacturer, model, serial number, weight of gas recovered |
| Gas Type | Type of refrigerant recovered |
| Total Weight Recovered | Sum of all units decommissioned in this session |
| Date/Time | ISO timestamp |

3. These records are visible in the **Decommissioned Equipment Register** (`/admin/decommissioned`) and are available for regulatory submissions demonstrating refrigerant removal from circulation.

---

### 6.5 Return of Recovery Cylinder to Supplier

On completion of recovery work, the engineer transports the cylinder to the authorised supplier's premises. The company's waste carrier registration **CBDU368286** must be current when transporting waste refrigerant on public roads.

At the supplier, the supplier issues their Hazardous Waste Consignment Note (HWCN) documentation. The engineer retains a copy or photograph of this document.

Office staff then record the supplier return in F-Gas Tracker Pro, entering the supplier's name, branch, HWCN reference number, and uploading a photo of the supplier's HWCN documentation. The system marks the cylinder as returned and creates a permanent movement log entry. The cylinder exits active tracking and appears in the **Returned to Supplier** register.

---

## 7. Waste Transfer and Hazardous Waste Consignment Note (HWCN)

When an engineer has completed recovery work and the cylinder contains waste refrigerant, a controlled transfer process must be followed before the cylinder leaves the engineer's van. This section describes that process as it operates within F-Gas Tracker Pro.

### 7.1 Initiating a Transfer

The engineer opens the cylinder record in the F-Gas Tracker Pro mobile application and selects **Move Cylinder**. The system automatically determines the required transfer route based on the cylinder's classification and contents:

- If the cylinder is classified as **Unused** or **Empty / Evacuated** (`0.00 kg` vacced), a simple location update is performed with no HWCN required.
- If the cylinder contains **waste refrigerant (`> 0.00 kg`)** or is classified as **Trace (`0.00 kg` non-evacuated with retained gas type)**, the system enforces hazardous waste consignment rules:
  - **Site to Van (No waste added on current visit):** Transferring the cylinder from the job site back into the engineer's van is completed as a direct vehicle stock allocation without prompting for or generating an HWCN.
  - **Transfer to HQ-Stores or Return to Supplier (from Site, Van, or after signing out of HQ-Stores):** The system routes the movement through the mandatory HWCN consignment workflow described below (Route A or Route B).

### 7.2 Transfer Routes

The system determines the permitted destination based on how many producer sites are associated with the cylinder:

| Scenario | Permitted Destination | HWCN Type |
|---|---|---|
| **Single producer site (or Trace cylinder from Stores/Van)** — waste or Trace gas from one source | Direct to supplier *or* HQ-Stores | Supplier's physical paper HWCN (e.g. `21DEGR/A XXXX`) *or* System-generated internal HWCN |
| **Multiple producer sites** — gas recovered from two or more different customer sites | HQ-Stores only — direct supplier return is blocked | System-generated internal HWCN (to HQ-Stores), followed by consolidated Supplier paper HWCN on return from Stores |

### 7.3 Route A — Transfer to Supplier (From Van or After Signing Out of HQ-Stores) & Paper HWCN Capture

Where a waste cylinder (`> 0.00 kg`) or a **Trace** cylinder (`0.00 kg` non-evacuated) is transferred to a supplier by an engineer — whether directly following a single-site recovery or after signing a waste/Trace bottle out of HQ-Stores into their van to drop off at a supplier branch — a **Paper Supplier HWCN** is mandatory:

1. The engineer selects **Supplier** as the destination and enters the supplier branch name (e.g. *Kooltech Gateshead* or *A-Gas Newcastle*).
2. The engineer completes the supplier's physical paper HWCN (e.g. `21DEGR/A XXXX`) — filling in Part A (Notification Details), Part B (Description of Waste — entering the weighed kg or **Trace** alongside the cylinder serial number and gas type), Part C (Carrier's Certificate including vehicle registration and CBDU368286), and Part D (Consignor's Certificate).
3. The system places the cylinder into **Supplier Transit** and immediately prompts the engineer to photograph and upload the completed Paper Supplier HWCN once the supplier branch has signed Part E (Consignee's Certificate).
4. When the engineer uploads the photo of the completed paper HWCN and confirms delivery, the system:
   - Marks the cylinder status as `returned` and location as `supplier`
   - Automatically stamps `returned_by` (engineer name) and `returned_at` (return timestamp)
   - Stores the uploaded HWCN photo permanently against the cylinder record and movement log
5. The cylinder then appears in the **Returned to Supplier** register showing its gas type, weight (or **Trace**), Return Date, Returned By, Supplier, and linked HWCN photo.

### 7.4 Route B — Transfer to HQ-Stores with Internal HWCN

The engineer has the option to return the waste bottle to 21 Degrees HQ-Stores. The system generates an internal HWCN automatically.

1. The engineer reviews and confirms the following information before proceeding:

| Section | Field | Source |
|---|---|---|
| Part A — Producer Sites | Name, address, and postcode for each site where gas was recovered | Auto-populated from recovery logs; engineer confirms or corrects |
| Part C — Carrier Certificate | Carrier name | Auto-populated from engineer's profile; editable |
| Part C — Carrier Certificate | Vehicle registration | Auto-populated from engineer's profile; editable |

2. The engineer confirms the transfer. The system:
   - Generates an internal HWCN with a unique reference number in the format **21Degr-XXXXXX**
   - Sets the HWCN status to *In Transit*
   - Records the cylinder's intended destination as HQ-Stores
   - Creates a movement log entry referencing the HWCN number

3. The engineer transports the cylinder to HQ-Stores (Unit 10, Apollo Court, Hebburn). The internal HWCN can be printed from the admin panel if a paper copy is required during transit.

4. On arrival at HQ-Stores, the engineer taps **Complete Transit** in the mobile application. The system:
   - Updates the cylinder location to HQ-Stores
   - Advances the HWCN status to *awaiting consignee sign-off*
   - Records the delivery timestamp
   - Creates a movement log entry

### 7.5 Part E Sign-Off by Office Staff (Route B)

Once a cylinder has been delivered to HQ-Stores under Route B, office staff must complete the consignee section (Part E) of the internal HWCN before the cylinder can proceed to the supplier.

1. Office staff navigate to the **HWCN Queue** in the admin panel. Consignment notes awaiting sign-off are displayed with an *Awaiting Part E* status.
2. Staff open the relevant HWCN record and verify the details shown (cylinder serial, gas type, weight, producer sites, carrier details, and delivery timestamp).
3. Staff complete Part E by entering the following:

| Field | Description |
|---|---|
| Received By | Name of the office staff member accepting the waste cylinder |
| Waste Exemption Number | Pre-populated: **31Z 3725 34** (immutable) |
| Acceptance Decision | Accept or Reject. If rejected, a reason must be entered and the cylinder remains at HQ-Stores pending resolution. |

4. On submission, the system sets the HWCN status to *complete*, records the sign-off timestamp, and the cylinder becomes available for onward collection by the supplier (see section 7.6).

> **Note:** The internal HWCN print template pre-populates all mandatory regulatory reference numbers (CBDU368286, waste exemption 31Z 3725 34, EWC Code 14 06 01). These values are immutable and cannot be changed by users.

### 7.6 Returning Waste or Trace Cylinders from HQ-Stores to Supplier

Once a waste cylinder (or **Trace** cylinder) has been received at HQ-Stores and Part E of any internal HWCN has been signed off, it may be returned to the supplier by either of two methods — both of which require a **Paper Supplier HWCN**:

- **Method 1 — Office / Admin Return from HQ-Stores (Return Waste to Supplier):** When the supplier collects from HQ-Stores or office staff process a batch return from Stores, the paper Supplier HWCN (e.g. `21DEGR/A XXXX`) is completed with 21 Degrees Ltd (Unit 10, Apollo Court, Hebburn, NE31 2ES) as the waste remover/consignor and the supplier branch as consignee. Multiple cylinders (including both weighed waste cylinders and **Trace** cylinders) may be listed on Part B of the same paper HWCN. Office staff open **HQ-Stores → Return Waste to Supplier**, select the cylinder(s), enter the Supplier Name, Supplier Branch, and Paper HWCN Number, and upload the photograph(s) of the signed paper HWCN.
- **Method 2 — Engineer Takes Waste / Trace Cylinder from HQ-Stores to Supplier Branch:** Where an engineer signs a waste or **Trace** cylinder out of HQ-Stores into their van to drop off at a supplier branch in person, selecting **Supplier** on the cylinder transfer screen automatically triggers the **Paper Supplier HWCN** capture flow (Section 7.3), requiring the engineer to photograph and upload the completed and signed paper HWCN at the supplier branch.

### 7.7 Cross-Referencing Prior Consignment Notes and Incremental Weight Tracking

Where a recovery cylinder undergoes a subsequent transfer (e.g. where a cylinder already holding consigned waste receives additional recovery gas from another site, or where residual waste is returned following on-site repair):

1. **Prior HWCN Cross-Reference:** F-Gas Tracker Pro automatically checks for prior completed consignment notes for that cylinder. The new HWCN explicitly cites the previous note code (e.g. `21Degr-XXXXXX`) and records the prior consigned weight.
2. **Incremental Liability Tracking:** To prevent double-counting the initial waste producer's liability, the system assigns only the incremental/net weight transferred on the new note.
3. **Field Engineer Transparency:** All prior and active consignment notes linked to a cylinder are displayed directly in the mobile *Bottle Action Hub* under "Associated Hazardous Waste Notes", allowing engineers to inspect the note history at any time.

### 7.8 Temporary Holding at HQ-Stores and On-Site Re-charge Reconciliation

In standard HVAC service operations, refrigerant may be decanted from a malfunctioning system into a recovery cylinder and transported to HQ-Stores under an internal HWCN for safe short-term holding while waiting for replacement parts or repairs. Once parts arrive, the cylinder is taken back to the same job site to re-charge the repaired or replaced equipment:

1. **On-Site Re-charge Action:** When the cylinder is returned to the original job site, the engineer logs the re-charge via *"Use / Re-charge Recycled Gas on Site"*. The bottle's physical weight is decremented in real time.
2. **Automatic Audit Reconciliation:** F-Gas Tracker Pro links the re-charge usage log to the earlier HWCN and generates an **On-Site Re-charge & Waste Reconciliation Log** displayed in both the admin portal and printed on Part B of the official HWCN manifest:
   > Original Consigned Weight − Total Re-charged on Site = Net Residual Waste in Cylinder
3. **Residual Waste Handling:** If 100% of the gas is re-charged back into equipment (0.00 kg remaining), the cylinder transitions to an empty reclaim cylinder and is automatically removed from active hazardous waste holding metrics. If residual gas remains, any subsequent consignment note records only the net residual weight.

---

## 8. HWCN Reference Data

The following regulatory reference numbers must appear on all HWCN documents generated by or for 21 Degrees Ltd:

| Reference | Value | Where Used |
|---|---|---|
| REFCOM Registration | REF1010728 | Company identity on all compliance documents |
| Carrier Registration Number (CBDU) | CBDU368286 | Part C of HWCN — carrier's certificate |
| Waste Exemption Number | 31Z 3725 34 | Part E of HWCN — consignee's certificate |
| EWC Waste Code | 14 06 01 | Waste description on all HWCN parts (halogenated refrigerants) |
| Waste Hazard Code | HP14 | Ecotoxic — applicable to HFCs / HCFCs |

These values are pre-populated in the F-Gas Tracker Pro HWCN print template.

---

## 9. Records Generated and Retention

| Record Type | Where Stored | Retention |
|---|---|---|
| Recovery Cylinder Registration | `bottles` table — F-Gas Tracker Pro database | Minimum 5 years |
| Movement Logs | `movement_logs` table — append-only | Minimum 5 years |
| Recovery / Usage Logs (per job) | `usage_logs` table — append-only, with producer site and equipment details | Minimum 5 years |
| Producer Sites Array | `producer_sites` JSONB field on bottle record | Retained for life of record |
| Internal HWCN (digital) | `hwcns` table — includes all parts, timestamps, signatures, prior HWCN reference | Minimum 3 years (Hazardous Waste Regs) — retain 5 years for F-Gas compliance |
| HWCN Part E Sign-Off | Recorded within HWCN record: `receivedBy`, `partECompletedAt`, `accepted` | As above |
| On-Site Re-charge Reconciliation Log | `usage_logs` linked to HWCN record; printed on Part B | Minimum 5 years |
| Supplier Return Record | `bottles` table — `returnedAt`, `returnHwcnNumber`, `supplierHwcnPhotoUrl` | Minimum 5 years |
| Supplier HWCN Photo | Cloud storage (URL stored in `supplierHwcnPhotoUrl`) | Minimum 5 years |
| Decommissioned Equipment Records | `decommissioned_equipment` table | Minimum 5 years |

**Reports available for audit:**
- **Full Job Report** (per job — all recovery events, quantities, producer sites, equipment details)
- **Cylinder Usage / Audit Trail** (per cylinder — complete lifecycle from registration to return)
- **Hazardous Waste Consignment Notes (HWCNs)** (registry with digital Part E signatures, prior HWCN references, and on-site re-charge reconciliation)
- **Decommissioned Equipment Register** (all decommissioning events by date, site, engineer, equipment)
- **HWCN Print** (statutory consignment note with Part B reconciliation, `/admin/hwcn/[id]/print`)
- **Haz Waste in Company Summary** (live dynamic hazardous waste holdings across vans, sites and stores)
- **Returned to Supplier Register** (all returned cylinders with supplier HWCN references)
- **On-Site Inventory Report** (cylinders currently at customer sites)
- **Van Inventory Report** (cylinders on each engineer's van)

---

## 10. Compliance Controls

| Control | How Enforced |
|---|---|
| Mandatory weight recording | Engineer cannot submit a recovery log without entering weight before and weight after; quantity recovered is system-calculated |
| Producer site capture | Site name, address and postcode are mandatory fields for all recovery log entries |
| Same-job re-charge restriction | Uncertified waste in reclaim cylinders is programmatically locked to the originating recovery job number; re-charging across different sites is blocked |
| Prior consignment cross-referencing | Subsequent waste transfers automatically cite prior completed HWCN numbers and deduct prior weight to prevent double-counting liabilities |
| Net residual waste reconciliation | HWCN manifests record on-site re-charge deductions to explain differences between initial stores receipts and residual returns |
| HWCN paperwork confirmation | App requires engineer to confirm supplier HWCN paperwork is completed before transfer proceeds |
| HWCN generation | Internal HWCN is generated automatically by the system on Route B transfer; cannot be bypassed |
| Part E sign-off required | HWCN remains in *awaiting consignee* status until office staff completes Part E; appears as open item in admin panel |
| Supplier HWCN photo required | Photo of supplier's completed HWCN must be uploaded to complete the return record |
| Immutable audit trail | All logs are append-only; no records can be deleted or edited retrospectively |
| Equipment traceability | Manufacturer, model and serial number recorded at every recovery event |
| F-Gas qualification | Only system-approved, REFCOM-registered engineers can log recovery events |
| Waste carrier registration | Company waste carrier registration CBDU368286 must remain current; required for legal transport of waste refrigerant on public roads |

---

## 11. Process Summary Diagram

```
Recovery Cylinder Issued to Engineer (Van)
              │
              ▼
     Gas Recovered On Site
     (weight before → after, producer site recorded)
              │
              ▼
  ┌───────────────────────────────────┐
  │  Transfer route selection         │
  │  Direct to Supplier / HQ-Stores   │
  └───────────────────────────────────┘
         │                   │
    SUPPLIER             HQ-STORES
         │                   │
         ▼                   ▼
  Engineer completes    Internal HWCN
  supplier paper HWCN   Generated
  (Producer/Carrier     (In Transit)
  sections)
         │                   │
         ▼                   ▼
  Engineer transits     Engineer transits
  to supplier           to HQ-Stores
         │                   │
         ▼                   ▼
  Supplier completes    Engineer completes
  Consignee section     transit in app
  accepts waste         (HWCN: awaiting Part E)
         │                   │
         ▼                   ▼
  Engineer uploads      Office staff
  photo of HWCN         completes Part E
         │                   │
         ▼                   ▼
  Cylinder status →     Supplier collects
  "returned"            from HQ-Stores
                              │
                              ▼
                        Office staff upload
                        supplier HWCN photo
                              │
                              ▼
                        Cylinder status →
                        "returned"
                        Lifecycle complete
```

---

*21 Degrees Ltd | Unit 10, Apollo Court, Monkton Business Park, Hebburn, Tyne & Wear, NE31 2ES | Tel: 0191 495 7224*
*REFCOM Registration: REF1010728 | Carrier CBDU368286 | 21 Degrees F-Gas Tracker Pro | © 2026 21 Degrees Ltd*
