# SOP-002: Recovery Cylinder — Refrigerant Recovery, Waste Claim (HWCN) and Return to Supplier

---

| | |
|---|---|
| **Document Number** | SOP-002 |
| **Version** | 1.0 |
| **Issue Date** | 26 June 2026 |
| **Next Review Date** | 26 June 2027 |
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
- Multi-site recovery (gas aggregated from more than one customer site — mandatory HWCN routing via HQ-Stores)
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

## 3. Definitions

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

## 4. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| **Engineer** | Perform recovery on site; record all weights, producer site details and equipment details accurately in the system; initiate transit and carry cylinder to HQ-Stores or supplier; hold current F-Gas Category I qualification |
| **Office / Admin** | Generate and print HWCNs; complete Part E sign-off on receipt at HQ-Stores; process supplier returns; record supplier HWCN reference numbers; manage waste exemption documentation |
| **Office Manager / Director** | Ensure carrier registration (CBDU368286) and waste exemption (31Z 3725 34) remain current; approve this procedure; maintain REFCOM registration REF1010728 |

---

## 5. Procedure

### 5.1 Recovery Cylinder Registration and Van Allocation

Recovery cylinders must be registered in the system **before** being issued to an engineer.

1. Office admin navigates to **Register Cylinder** in the F-Gas Tracker Pro admin panel.
2. Enter the following mandatory fields:

| Field | Description | Example |
|---|---|---|
| Serial Number | Unique cylinder identifier | `REC-402` |
| Category | Select **Reclaim** | Reclaim |
| Gas Type | Leave as `Mixed/Recovery` (updated when gas type is confirmed on site) | `Mixed/Recovery` |
| Initial Weight (capacity) | Maximum fill weight in kg (cylinder capacity) | `10.00 kg` |
| Current Weight | `0.00 kg` (cylinder is empty on issue) | `0.00 kg` |
| Supplier | Supplier from whom this cylinder was obtained | `A-Gas` |

3. The system records the cylinder as `active`, `locationType: "office"`, `status: "active"`.
4. Allocate the cylinder to the engineer's van using the **Move Cylinder** function (see SOP-001, Section 4.2). The engineer's name, vehicle registration, and timestamp are recorded.

---

### 5.2 On-Site Refrigerant Recovery

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
| Weight Recovered from this Unit (kg) | Gas removed from this specific unit | `2.70 kg` |

3. The system:
   - Updates `currentWeight` on the cylinder (increases by quantity recovered)
   - Creates an immutable **Usage Log** entry
   - Appends the producer site (name, address, postcode) to the cylinder's `producerSites` array
   - Creates an immutable **Movement Log** entry

> **Important:** If the gas type recovered differs from what is already in the cylinder (e.g. R410A added to a cylinder that was used for R32), the engineer must use a different, clean cylinder. Mixing refrigerant types is not permitted.

---

### 5.3 Equipment Decommissioning Record (Where Applicable)

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

### 5.4 Single-Site vs. Multi-Site Determination

After recovery is logged, the system automatically determines the required return route based on the number of producer sites associated with the cylinder:

| Scenario | Definition | Required Route |
|---|---|---|
| **Single-site** | All gas in the cylinder was recovered from **one** customer site | Cylinder may be returned **directly to supplier** |
| **Multi-site** | Gas was recovered from **two or more** different customer sites | Cylinder **must** be returned to **HQ-Stores** first; cannot go direct to supplier |

**Multi-site trigger:** When the engineer logs a recovery from a site that is different from any previously recorded producer site on that cylinder, the system displays a **"2nd Waste Producer Detected"** warning overlay. The engineer must acknowledge this. The system then:

- Automatically generates an internal **HWCN** (consignment note)
- Sets the cylinder's `intendedDestination` to `"HQ-Stores"`
- Sets `activeHWCN` to the new consignment note ID (e.g. `21Degr-100005`)
- Records an entry in the movement log

> **Reason:** The Hazardous Waste Regulations require that where waste is collected from multiple producers in a single vehicle journey, a separate consignment note is required. Aggregating multi-site waste must go through the registered consignee at HQ before onward transfer to the supplier.

---

### 5.5 Internal HWCN Generation (Multi-Site Route)

When the multi-site route is triggered, a digital HWCN is generated automatically by the system. The consignment note contains:

**Part A — Notification Details:**
- All producer sites (name, address, postcode, weight recovered from each)
- Destination: HQ-Stores (21 Degrees Ltd, Unit 10, Apollo Court, Hebburn, NE31 2ES)
- Total waste quantity (kg)
- Waste description: EWC Code **14 06 01** — Halogenated refrigerants
- Gas type

**Part C — Carrier's Certificate:**
- Engineer (carrier) name
- Vehicle registration
- 21 Degrees Ltd carrier registration: **CBDU368286**
- Date and time of collection

**Part E — Consignee's Certificate** (completed on delivery, see Section 5.6):
- Receiving staff member name
- Waste exemption number: **31Z 3725 34**
- Date received
- Accepted / Rejected status

The HWCN can be printed from the admin panel (`/admin/hwcn/[id]`) at any time and must travel with the cylinder during transport.

---

### 5.6 Transit to HQ-Stores and Part E Sign-Off (Multi-Site Route)

1. The engineer loads the cylinder into their vehicle. The HWCN (printed or digital) must accompany the waste during transit.
2. On arrival at HQ-Stores (Unit 10, Apollo Court, Hebburn), the engineer opens the cylinder record on the mobile app and taps **Complete Transit**.
3. The system:
   - Sets HWCN status from `draft` → `awaiting_consignee`
   - Records `deliveredAt` timestamp on the HWCN
   - Clears the cylinder's transit state (`intendedDestination`, `activeHWCN` → null)
   - Updates cylinder location to `locationType: "office"`, `locationId: "HQ-Stores"`

4. An office staff member navigates to the HWCN in the admin panel (`/admin/hwcn/[id]`) and completes **Part E**:

| Field | Description |
|---|---|
| Received By | Name of the staff member accepting the waste |
| Date Received | Confirmed automatically from `deliveredAt` timestamp |
| Accepted | Confirm acceptance (or reject with reason) |
| Waste Exemption Number | **31Z 3725 34** (pre-populated) |
| Vehicle Reg (Consignee) | If applicable |

5. On completion:
   - HWCN status → `complete`; `partECompletedAt` timestamp recorded
   - `accepted: true` recorded on the HWCN
   - The digital HWCN is now legally complete and stored in the system

6. The cylinder now sits at HQ-Stores and is ready for onward processing as a supplier return (Section 5.8).

> **Rejected Consignment:** If Part E is rejected (e.g. contaminated waste, incorrect cylinder), the office staff enters rejection details. The HWCN is retained with `accepted: false`. The cylinder remains at HQ-Stores pending resolution. No further system action is taken automatically.

---

### 5.7 Direct Supplier Return (Single-Site Route)

Where a cylinder contains gas from a **single producer site only**, it may be returned directly from the engineer's van to the supplier without transiting through HQ-Stores.

1. The engineer (or office admin) drives the cylinder to the supplier's branch.
2. At the supplier, the supplier issues their own HWCN paperwork. The engineer accepts and retains/photographs this document.
3. On return, office admin navigates to **Supplier Returns** (`/admin/supplier-returns`) in the admin panel.
4. Admin enters:

| Field | Description | Example |
|---|---|---|
| Cylinder Serial(s) | All cylinders being returned in this batch | `REC-402` |
| Supplier Name | Supplier receiving the waste | `A-Gas` |
| Supplier Branch | Branch location | `Newcastle` |
| Return Weight | Weight of cylinder at time of return | `5.20 kg` |
| Supplier HWCN Reference | Reference number from the supplier's HWCN | `BJJ-123456` |
| Supplier HWCN Photo | Photo of supplier's HWCN document | Upload |

5. Admin clicks **Complete Supplier Return**. The system:
   - Sets `status: "returned"`, `locationType: "supplier"`
   - Records `returnedAt` timestamp and `returnedBy` (admin name)
   - Stores `returnHwcnNumber` (supplier's reference) and `supplierHwcnPhotoUrl`
   - Creates immutable **movement log** entry: action = `returned_to_supplier`

> **Supplier Lock:** Once the first cylinder is added to a return batch, all subsequent cylinders in that batch must be from the **same supplier**. The system enforces this automatically to prevent cross-supplier HWCN errors.

---

### 5.8 Supplier Return Following HQ-Stores Transit (Multi-Site Route Completion)

After a multi-site cylinder has been received at HQ-Stores and Part E signed off:

1. Office admin batches cylinders for onward return to the supplier when operationally appropriate.
2. Follow the same process as Section 5.7 (Supplier Returns). The supplier's HWCN reference and photo are recorded in the system against each cylinder.
3. The cylinder's lifecycle is complete. It is visible in the **Returned to Supplier** register with its full audit trail: registration → recovery events (with producer sites) → internal HWCN → Part E sign-off → supplier return.

---

## 6. HWCN Reference Data

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

## 7. Records Generated and Retention

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
- **HWCN Print** (printable four-part consignment note per consignment, `/admin/hwcn/[id]`)
- **Returned to Supplier Register** (all returned cylinders with supplier HWCN references)
- **On-Site Inventory Report** (cylinders currently at customer sites)
- **Van Inventory Report** (cylinders on each engineer's van)

---

## 8. Compliance Controls

| Control | How Enforced |
|---|---|
| Mandatory weight recording | Engineer cannot submit a recovery log without entering weight before and weight after; quantity recovered is system-calculated |
| Producer site capture | Site name, address and postcode are mandatory fields for all recovery log entries |
| Multi-site routing enforcement | System automatically detects and flags second producer site; cylinder is locked to HQ-Stores routing — cannot be changed to direct supplier |
| HWCN generation | HWCN is generated automatically by the system on multi-site trigger; cannot be bypassed |
| Part E sign-off required | HWCN remains in `awaiting_consignee` status until office staff completes Part E; appears as open item in admin panel |
| Supplier lock on returns | All cylinders in a return batch must match the same supplier — enforced by the system |
| Immutable audit trail | All logs are append-only; no records can be deleted or edited retrospectively |
| Equipment traceability | Manufacturer, model and serial number recorded at every recovery event |
| F-Gas qualification | Only system-approved, REFCOM-registered engineers can log recovery events |

---

## 9. Process Summary Diagram

```
Recovery Cylinder Issued to Engineer (Van)
              │
              ▼
     Gas Recovered On Site
     (weight before → after, producer site recorded)
              │
              ▼
  ┌───────────────────────────┐
  │  More than one producer   │
  │  site on this cylinder?   │
  └───────────────────────────┘
         │           │
        YES          NO
         │           │
         ▼           ▼
  Internal HWCN    Cylinder ready
  Generated        for direct
  (destination:    supplier return
  HQ-Stores)
         │
         ▼
  Engineer transits to HQ-Stores
  (HWCN travels with cylinder)
         │
         ▼
  Engineer completes transit in app
  (HWCN status: awaiting_consignee)
         │
         ▼
  Office staff completes HWCN Part E
  (received by, accepted, exemption no.)
  (HWCN status: complete)
         │
         ▼
  Cylinder at HQ-Stores
         │
         ▼
  ┌─────────────────────────────────┐
  │ Admin processes Supplier Return │
  │ Enters supplier HWCN ref + photo│
  └─────────────────────────────────┘
         │
         ▼
  Cylinder status → "returned"
  Lifecycle complete — full audit trail
  preserved in F-Gas Tracker Pro
```

---

*21 Degrees Ltd | Unit 10, Apollo Court, Monkton Business Park, Hebburn, Tyne & Wear, NE31 2ES | Tel: 0191 495 7224*
*REFCOM Registration: REF1010728 | Carrier CBDU368286 | 21 Degrees F-Gas Tracker Pro | © 2026 21 Degrees Ltd*
