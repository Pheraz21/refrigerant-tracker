# SOP-002: Recovery Cylinder — Refrigerant Recovery, Waste Claim (HWCN) and Return to Supplier

---

| | |
|---|---|
| **Document Number** | SOP-002 |
| **Version** | 3.0 |
| **Issue Date** | 25 April 2026 |
| **Next Review Date** | 25 April 2027 |
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
| Serial Number | Unique cylinder identifier | `REC-402` |
| Category | Select **Reclaim** | Reclaim |
| Gas Type | Leave as `Mixed/Recovery` (updated when gas type is confirmed on site) | `Mixed/Recovery` |
| Capacity (kg) | Maximum fill weight in kg (cylinder capacity) | `10.00 kg` |
| Supplier | Supplier from whom this cylinder was obtained | `A-Gas` |

The system creates a permanent cylinder record and an entry in the audit log at the time of registration.

---

### 6.2 Cylinder Movements

**Stores to Van:** When a cylinder is issued to a field engineer, the Engineer records this allocation in F-Gas Tracker Pro. The engineer's name and vehicle registration plate are recorded against the cylinder and a movement log entry is created. The cylinder then appears in the engineer's Van Inventory on the mobile app.

> **Control:** Only one engineer's van is associated with each cylinder at any time. If a cylinder is transferred between vans, both parties and the date/time of the handover are recorded in the movement log.

**Van to Site:** When the engineer takes the cylinder to a customer job site, this movement is recorded in F-Gas Tracker Pro. The job reference and site details are recorded and a movement log entry is created.

**Site back to Van:** On completion of recovery work, the engineer records the movement of the cylinder back to their van in F-Gas Tracker Pro. A movement log entry is created and the cylinder returns to the engineer's Van Inventory.

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

### 6.4 Equipment Decommissioning Record (Where Applicable)

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

The engineer opens the cylinder record in the F-Gas Tracker Pro mobile application and selects **Move Cylinder**. The system automatically determines the required transfer route based on the cylinder's contents:

- If the cylinder contains **no gas**, a simple location update is performed with no HWCN required.
- If the cylinder contains **waste refrigerant**, the system routes the transfer through the appropriate HWCN process described below.

### 7.2 Transfer Routes

The system determines the permitted destination based on how many producer sites are associated with the cylinder:

| Scenario | Permitted Destination | HWCN Type |
|---|---|---|
| **Single producer site** — all gas recovered from one customer site | Direct to supplier *or* HQ-Stores | Supplier's physical HWCN paperwork *or* System-generated internal HWCN |
| **Multiple producer sites** — gas recovered from two or more different customer sites | HQ-Stores only — direct supplier return is blocked | System-generated internal HWCN |

### 7.3 Route A — Direct Transfer to Supplier

Where the cylinder contains waste from a single producer site, the engineer may transfer it directly to the supplier.

1. The engineer selects **Supplier** as the destination and enters the supplier branch name (e.g. *A-Gas Newcastle*).
2. Before confirming the transfer in the app, the engineer completes the supplier's paper HWCN — filling in the Producer, Consignor, and Carrier sections. The app prompts the engineer to confirm this has been done before the transfer can proceed.
3. The system records the cylinder as *in transit* to the supplier and creates a movement log entry.
4. The engineer transports the cylinder to the supplier's premises. The company waste carrier registration **CBDU368286** must be current for the legal transport of waste refrigerant on public roads.
5. At the supplier, the engineer hands over the cylinder with the paperwork, where the supplier completes the Consignee section and accepts receipt of the waste cylinder.
6. The engineer taps **Complete Transit** in the mobile application and uploads a photo of the completed supplier HWCN.
7. The system marks the cylinder as *returned*, records the delivery timestamp, and stores the supplier's HWCN photo. A permanent movement log entry is created.
8. The cylinder then appears in the Returned to Supplier register with its full audit trail.

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

### 7.6 Supplier Collection from HQ-Stores

Once a waste cylinder has been received at HQ-Stores and Part E has been signed off, office staff contact the supplier to arrange collection of the cylinder.

When the supplier attends HQ-Stores to collect the waste cylinder, they bring their own HWCN paperwork. This is completed as part of the handover — covering the transfer of the waste from 21 Degrees Ltd to the supplier for reclamation or destruction.

Office staff photograph the completed supplier paperwork and upload it against the cylinder record in F-Gas Tracker Pro. The system marks the cylinder as returned to the supplier and the photo is stored permanently against the bottle, completing the audit trail.

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
| Internal HWCN (digital) | `hwcns` table — includes all parts, timestamps, signatures | Minimum 3 years (Hazardous Waste Regs) — retain 5 years for F-Gas compliance |
| HWCN Part E Sign-Off | Recorded within HWCN record: `receivedBy`, `partECompletedAt`, `accepted` | As above |
| Supplier Return Record | `bottles` table — `returnedAt`, `returnHwcnNumber`, `supplierHwcnPhotoUrl` | Minimum 5 years |
| Supplier HWCN Photo | Cloud storage (URL stored in `supplierHwcnPhotoUrl`) | Minimum 5 years |
| Decommissioned Equipment Records | `decommissioned_equipment` table | Minimum 5 years |

**Reports available for audit:**
- **Full Job Report** (per job — all recovery events, quantities, producer sites, equipment details)
- **Cylinder Usage / Audit Trail** (per cylinder — complete lifecycle from registration to return)
- **Decommissioned Equipment Register** (all decommissioning events by date, site, engineer, equipment)
- **HWCN Print** (printable consignment note per consignment, `/admin/hwcn/[id]`)
- **Returned to Supplier Register** (all returned cylinders with supplier HWCN references)
- **On-Site Inventory Report** (cylinders currently at customer sites)
- **Van Inventory Report** (cylinders on each engineer's van)

---

## 10. Compliance Controls

| Control | How Enforced |
|---|---|
| Mandatory weight recording | Engineer cannot submit a recovery log without entering weight before and weight after; quantity recovered is system-calculated |
| Producer site capture | Site name, address and postcode are mandatory fields for all recovery log entries |
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
