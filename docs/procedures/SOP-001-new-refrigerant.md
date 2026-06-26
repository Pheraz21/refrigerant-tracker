# SOP-001: New Refrigerant Cylinder — Receipt, Allocation, Use and Return

---

| | |
|---|---|
| **Document Number** | SOP-001 |
| **Version** | 1.0 |
| **Issue Date** | 26 June 2026 |
| **Next Review Date** | 26 June 2027 |
| **Author** | _________________________ |
| **Approved By** | _________________________ |
| **REFCOM Registration** | REF1010728 |
| **System** | 21 Degrees F-Gas Tracker Pro |

---

## 1. Purpose and Scope

This procedure describes the controlled process by which **21 Degrees Ltd** receives new virgin refrigerant cylinders from suppliers, allocates them to certified engineers, records their use on site, and manages their return when empty or partially depleted. It establishes the audit trail maintained within the **F-Gas Tracker Pro** system to demonstrate compliance with UK F-Gas regulations.

**Scope:** Applies to all refrigerant cylinders categorised as **New** (virgin gas) within the F-Gas Tracker Pro system. This includes all hydrofluorocarbons (HFCs), hydrochlorofluorocarbons (HCFCs), and other fluorinated gases purchased for use in refrigeration and air conditioning equipment.

This procedure does **not** cover recovery cylinders (see SOP-002).

---

## 2. Regulatory References

| Reference | Description |
|---|---|
| The Fluorinated Greenhouse Gases Regulations 2015 (SI 2015/310) | UK implementing legislation for F-Gas control; operator record-keeping obligations |
| Regulation (EU) No 517/2014 (retained in UK law) | F-Gas Regulation requiring records of quantities of F-Gas placed on market, used, recovered and destroyed |
| BS EN 378 | Safety and environmental requirements for refrigerating systems |
| REFCOM Code of Practice | Register of Companies Competent to Handle Refrigerants — operational standards for registered contractors |
| Environment Act 1995 | Reporting obligations for fluorinated gases to the Environment Agency |

---

## 3. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| **Office / Admin** | Register new cylinders on receipt; process returns to supplier; maintain supplier and PO records in the system |
| **Engineer** | Collect allocated cylinders; record all on-site usage accurately and promptly; return cylinders to the van/stores after job completion |
| **Office Manager / Director** | Approve this procedure; ensure all engineers hold valid F-Gas qualifications before handling refrigerant |

All engineers handling F-Gas must hold a current, relevant **F-Gas qualification** (Category I or appropriate category) and be employed by REFCOM-registered company **REF1010728**.

---

## 4. Procedure

### 4.1 Cylinder Receipt and Registration

When a new refrigerant cylinder is received from a supplier:

1. Inspect the cylinder physically — check for damage, correct labelling, and that the weight label matches the delivery note.
2. Log into the **F-Gas Tracker Pro** admin panel and navigate to **Register Cylinder** (or use **Bulk Receive** for multiple cylinders).
3. Enter the following mandatory fields:

| Field | Description | Example |
|---|---|---|
| Serial Number | Unique cylinder identifier from the label | `8849201A` |
| Category | Select **New** | New |
| Gas Type | Select from catalogue (e.g. R410A, R32, R134a) | `R410A` |
| Initial Weight | Full weight in kg as shown on cylinder label | `12.00 kg` |
| Supplier | Supplier name | `A-Gas` |
| PO Number | Purchase order reference | `PO-2026-0441` |
| Rental Expiry (if applicable) | Date rental agreement expires | `31/12/2026` |

4. The system records:
   - `registeredAt` timestamp
   - `registeredBy` (user ID of admin performing registration)
   - `locationType: "office"` (cylinder enters stores)
   - `status: "active"`
   - An immutable **movement log** entry: action = `registered`

5. The cylinder is now tracked in the system and visible in the **Stores Inventory**.

---

### 4.2 Allocation to Engineer's Van

When a cylinder is to be issued to a field engineer:

1. In the admin panel, locate the cylinder by serial number.
2. Use the **Move Cylinder** function to change its location.
3. Enter:

| Field | Description |
|---|---|
| New Location Type | `Van` |
| Engineer | Select the receiving engineer by name |
| Vehicle Registration | The van registration plate (e.g. `VA68 LNE`) |

4. The system records:
   - `locationType: "van"`; `locationId: "<Engineer Name> - Van"`
   - `vehicleReg` on the bottle record
   - An immutable **movement log** entry: action = `moved`, with `from_location`, `to_location`, `engineer`, `vehicle_reg`, and timestamp

5. The cylinder now appears in the engineer's **Van Inventory** in the mobile app.

> **Control:** Only one engineer's van is associated with each cylinder at any time. If a cylinder is transferred between vans, a `handover` movement log entry is created recording both parties.

---

### 4.3 On-Site Usage

When refrigerant is dispensed to a customer's system on site:

1. The engineer navigates to the cylinder in the **F-Gas Tracker Pro** mobile app and selects **Log Usage**.
2. The engineer enters:

| Field | Description | Example |
|---|---|---|
| Job Number | Work order / job reference from the CRM | `JOB-88219` |
| Job Type | Nature of work | `Installation` / `Service` / `Repair` |
| Site Name | Customer site name (auto-filled from CRM if available) | `Retail Store #4` |
| Site Address | Full site address | `123 High Street, NE1 4XP` |
| Weight Before (kg) | Cylinder weight recorded immediately before dispensing | `11.50 kg` |
| Weight After (kg) | Cylinder weight recorded immediately after dispensing | `9.20 kg` |
| Equipment Manufacturer | Manufacturer of the system being charged | `Daikin` |
| Equipment Model | Model number of the system | `FDTC50VF` |
| Equipment Serial | Serial number of the system | `9948201B` |

3. The system **automatically calculates** quantity used: `Weight Used = Weight Before − Weight After`.
4. `currentWeight` on the bottle is updated to reflect the post-usage weight.

**Records created automatically:**
- Immutable **Usage Log** entry capturing all fields above, timestamp, and engineer name
- Immutable **Movement Log** entry: action = `usage`, site ref, vehicle reg

> **Control:** Weight before and after are recorded independently to provide a verifiable audit trail. The system does not allow retrospective editing of usage logs — corrections must be logged as separate adjustment entries.

---

### 4.4 Cylinder Status Monitoring

The system continuously tracks cylinder status:

| Status | Condition | Action Required |
|---|---|---|
| Active | `currentWeight > 0` | Normal use — available for jobs |
| Low Gas | Below configured threshold weight | Admin and office notified automatically |
| Empty | `currentWeight = 0` | Return to stores or supplier |

Cylinder status and weight history are visible at any time via the **Cylinder Detail** page, which shows:
- Full usage history (date, job number, engineer, quantity used, equipment details)
- All movement history (location changes with timestamps)
- Current location and weight

---

### 4.5 Return of Empty or Partially Depleted Cylinders

**When a cylinder is empty or no longer required on a van:**

1. The engineer returns the cylinder to HQ stores or directly to supplier.
2. Office admin navigates to **Returned to Supplier** in the admin panel.
3. Admin enters:

| Field | Description |
|---|---|
| Cylinder Serial(s) | One or more cylinders being returned |
| Return Weight | Weight at time of return (for audit reconciliation) |
| Supplier Name | e.g. `A-Gas` |
| Supplier Branch | e.g. `Newcastle` |
| Supplier HWCN / Returns Reference | Supplier's reference number on their returns documentation |
| Supplier Documentation Photo | Optional photo of supplier's return receipt or label |

4. The system records:
   - `status: "returned"`, `locationType: "supplier"`
   - `returnedAt` timestamp, `returnedBy` (admin user)
   - `returnHwcnNumber` (supplier's reference)
   - An immutable **movement log** entry: action = `returned_to_supplier`

5. The cylinder exits active tracking and appears in the **Returned to Supplier** register.

> **Note:** New (virgin gas) cylinders contain no hazardous waste. No HWCN is required for their return. Recovery cylinders require the full HWCN process — see **SOP-002**.

---

## 5. Records Generated and Retention

The following records are generated automatically by the F-Gas Tracker Pro system for each new refrigerant cylinder:

| Record Type | Where Stored | Retention |
|---|---|---|
| Cylinder Registration Record | `bottles` table — F-Gas Tracker Pro database | Minimum 5 years (UK F-Gas Regulations requirement) |
| Movement Log | `movement_logs` table — append-only | Minimum 5 years |
| Usage Log (per job visit) | `usage_logs` table — append-only | Minimum 5 years |
| Equipment Details (per usage log) | `equipment_details` field within usage log | Minimum 5 years |
| Return Record | `bottles` table — `returnedAt`, `returnedBy`, `returnHwcnNumber` | Minimum 5 years |

All records are **immutable** — the system does not permit deletion or editing of historical logs. All timestamps are recorded in ISO 8601 format (UTC).

The following reports can be generated from the system for audit purposes:
- **Cylinder Usage Report** (per cylinder — full usage history with equipment details)
- **Full Job Report** (per job — all cylinders used, quantities, engineers, equipment)
- **Van Inventory Report** (point-in-time snapshot of all cylinders on a van)
- **Returned to Supplier Register** (all returned cylinders with reference numbers)

---

## 6. Compliance Controls

| Control | How Enforced |
|---|---|
| Weight reconciliation | Every usage log records weight before and after independently; quantity used is system-calculated, not manually entered |
| Engineer qualification | Only registered, approved users can log usage in the system; role-based access control enforced at login |
| Immutable audit trail | `usage_logs` and `movement_logs` tables are append-only; no UPDATE or DELETE operations permitted on historical records |
| PO traceability | Every cylinder is linked to a supplier and PO number at registration |
| Equipment record | Manufacturer, model and serial number captured for every usage event, enabling traceability back to the specific system charged |
| Cylinder lifecycle | Full chain from `registeredAt` → `returnedAt` is traceable within the system for any cylinder at any time |

---

*21 Degrees Ltd | Unit 10, Apollo Court, Monkton Business Park, Hebburn, Tyne & Wear, NE31 2ES | Tel: 0191 495 7224*
*REFCOM Registration: REF1010728 | 21 Degrees F-Gas Tracker Pro | © 2026 21 Degrees Ltd*
