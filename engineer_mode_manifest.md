# Refrigerant Tracker — Master Application Manifest
**Version 3.0 | Source of Truth | Last Updated: 2026-05-02**

This document defines the complete architectural standards, business logic, data models, regulatory compliance rules, and route inventory for the Refrigerant Tracker application. All code changes must strictly adhere to these definitions.

---

## 1. System Vision & User Roles

The system is a real-time regulatory compliance tool for managing high-value refrigerant gases and hazardous waste transitions, built for **21 Degrees Ltd** (Unit 10, Apollo Court, Monkton Business Park, Hebburn, NE31 2ES, Tel: 0191 5450545).

### 1.1 — User Personas

| Persona | Role Value | Primary Interface | Responsibilities |
|:--------|:-----------|:-----------------|:-----------------|
| **Engineer** | `engineer` | Mobile Dashboard (`/dashboard`) | Scan/register bottles, move bottles, log usage/recovery, complete HWCN transit deliveries |
| **HQ-Stores** | `office` | Admin Panel (`/admin`) | Receive returns, manage HQ inventory, sign off Digital HWCNs (Part E) |
| **Admin** | `admin` | Admin Panel (`/admin`) | Full system visibility, user management, settings, decommission reports, audit exports |

### 1.2 — Multi-Role Users
A single user account can hold multiple roles via the `available_roles` array. Switching is done in-session via `switchRole()` in `AuthContext`. The active role is stored in `localStorage` under key `fgas_user`.

### 1.3 — User Statuses
`pending` → `approved` | `rejected` | `disabled`

- **pending**: Newly registered, blocked from all features, redirected to `/pending`.
- **approved**: Full access to features for their role.
- **disabled**: Account suspended; cannot log in.
- **rejected**: Registration denied.

---

## 2. Authentication & Session Management

### 2.1 — Authentication Flow
- **Provider**: Supabase Auth (email + password).
- **Login**: `/` (engineer default) and `/admin/login` (office/admin entry).
- **Signup**: `/signup` — creates user in `public.users` table with `status: pending` and triggers a `new_user_registration` notification to admins.
- **Forgot Password**: `/forgot-password` — triggers Supabase password reset email.
- **Reset Password**: `/reset-password` — handles the token from reset email.
- **Session**: Stored in `localStorage` as `fgas_user` (JSON). `AuthContext.tsx` syncs on load.

### 2.2 — Route Protection Rules
| Route Pattern | Required Role | Fallback |
|:-------------|:-------------|:---------|
| `/dashboard/*` | `engineer` | Redirect to `/` |
| `/admin/*` | `office` or `admin` | Redirect to `/admin/login` |
| Any route | status `approved` | Redirect to `/pending` |

---

## 3. Core Entity: The Refrigerant Bottle

A bottle is the primary unit of tracking. Its lifecycle is governed by its **Category**, **Status**, and **Weight State**.

### 3.1 — Bottle Categories

| Category | Definition | Gas Type Behaviour | `can_be_bought_new` Gate |
|:---------|:-----------|:------------------|:------------------------|
| **new** | Virgin gas for installation | Explicitly selected from `gases` catalogue | Only gases where `can_be_bought_new = true` |
| **reclaim** | Recovery/Waste cylinder | Defaults to **Mixed/Recovery** | N/A |
| **nitrogen** | Oxygen-Free Nitrogen (OFN) | Locked to **Nitrogen** | N/A |

### 3.2 — Bottle Status Values

| Status | Meaning |
|:-------|:--------|
| `active` | In use / in circulation |
| `empty` | `currentWeight === 0` for a New or Nitrogen bottle |
| `returned` | Returned to supplier or marked as waste |

### 3.3 — Hazardous Waste State
A bottle's hazardous waste status is dynamic and not a stored field — it is derived:
- **Hazardous**: `category === "reclaim" && currentWeight > 0`
- **Clean/Empty**: `currentWeight === 0` for Reclaim, or `currentWeight === initialWeight` for New.

This triggers HWCN requirements for all future movements.

### 3.4 — Transit State
The transit state is not a separate `status` value. It is indicated by `intendedDestination` being set. When a bottle moves from Site → Van, the engineer must declare an intended destination. The bottle remains in transit until `completeTransit()` is called.

- **intendedDestination** + **intendedLocationType**: Where the bottle is heading.
- **activeHWCN**: The HWCN ID linked to this transit movement.

Clearing transit state sets all three fields to `null`.

### 3.5 — Bottle Data Model (`Bottle` interface)

```typescript
interface Bottle {
  serial: string;                   // Primary key (e.g. "8849201A", "REC-402")
  category: "new" | "reclaim" | "nitrogen";
  gasType: string;                  // e.g. "R410A", "Mixed/Recovery", "N₂"
  initialWeight: number;            // kg — set at registration
  currentWeight: number;            // kg — live
  locationType: "van" | "site" | "supplier" | "office";
  locationId: string;               // e.g. "John Smith - Van", "JOB-9921"
  poNumber?: string;                // Purchase Order number
  supplier?: string;                // Supplier name
  registeredAt: string;             // ISO timestamp
  registeredBy?: string;            // User ID who registered
  status: "active" | "empty" | "returned";
  intendedDestination?: string;     // Set when in transit
  intendedLocationType?: "van" | "site" | "supplier" | "office";
  activeHWCN?: string;              // HWCN ID linked to current transit
  supplierHwcnPhotoPending?: boolean;
  supplierHwcnPhotoUrl?: string;
  producerSites?: Array<{ name: string; address: string; postcode: string }>;
  returnedBy?: string;
  returnedAt?: string;
  deliveredAt?: string;
  returnHwcnNumber?: string;        // HWCN reference number for supplier return
  locationChangedAt?: string;
  vehicleReg?: string;              // Vehicle reg on bottle at time of last van move
  rentalExpiryDate?: string;        // ISO timestamp — triggers expiry notifications
}
```

---

## 4. Detailed Workflows

### 4.1 — Registration & Bulk Receive

**Logic Hierarchy**: Category → Gas Type → Location.

- **Gas Catalogue**: Top-used gases (R410A, R32, R134a, R404A) are one-tap buttons. "Other" triggers a custom input that auto-creates the gas in the `gases` table via `db.ensureGas()`.
- **New Category Gate**: Only gases where `can_be_bought_new = true` appear in the New category picker.
- **Validation**: Blocked unless `Weight`, `PO`, `Supplier`, and `Location Details` are valid.
- **Bulk Receive** (`/dashboard/bulk`): Allows receiving an entire shipment to a single PO. Scan settings (Gas/Type) are sticky across scans.
- **Registration Log**: Every registration creates a `movement_logs` record with `action: "registered"`.
- **Rental Expiry**: Optional field. When set, triggers a `rental_expiry` notification near the expiry date.

### 4.2 — Recovery (Adding Waste)

- **Constraint**: Recovery can ONLY be logged at a **Job Site** (`locationType === "site"`).
- **Producer Logging**: Every recovery event appends the site to the bottle's `producerSites` array (deduplicated by site name).
- **Decommissioning**: Engineers can flag equipment as decommissioned during recovery. This triggers a `decommissioned_equipment` record capturing: Equipment Type (manufacturer, model, serial), Job Number, Site, Gas Type, Total Weight Recovered.

### 4.3 — Movement Actions

Movement logs use these `action` values:

| Action | Trigger |
|:-------|:--------|
| `registered` | New bottle created |
| `moved` | Standard location change |
| `handover` | Van-to-van transfer (same location type, different van) |
| `received` | Transit completed, bottle received at destination |
| `returned_to_supplier` | `returnBottleToSupplier()` called |
| `vehicle_transfer` | Engineer's vehicle registration changed; all van bottles re-logged |

### 4.4 — The "Intended Destination" (Transit State)

When a waste bottle is moved from a Site to a Van, the engineer must set an intended destination:

| Destination | When | HWCN Required |
|:-----------|:-----|:-------------|
| **Direct to Supplier** | Waste from a single site | Paper HWCN (photo upload on delivery) |
| **To HQ-Stores** | Mandatory for multi-site waste | Digital HWCN (Part E by office) |

Card headers must show **`Supplier - Branch`** format (e.g., "Kooltech - Glasgow").

### 4.5 — Supplier Returns (Admin)

Admin/office can process supplier returns via `/admin/supplier-returns-waste`. This calls `db.returnBottleToSupplier()` which:
1. Sets bottle `status: "returned"`, `locationType: "supplier"`, `locationId: "Supplier (Returned)"`.
2. Records the HWCN paper number (`returnHwcnNumber`) and optional photo URL.
3. Logs a `returned_to_supplier` movement.

---

## 5. Compliance & Regulatory Logic (HWCN)

### 5.1 — HWCN Status Machine

```
draft → awaiting_consignee → complete
                ↓
            (rejected — rejection_details populated)
```

| Status | Meaning |
|:-------|:--------|
| `draft` | Created by engineer when initiating transit to HQ-Stores |
| `awaiting_consignee` | Bottle delivered; HWCN awaiting Part E sign-off |
| `complete` | Part E signed off; `accepted` = true |
| (implicit rejected) | `accepted` = false + `rejectionDetails` populated |

### 5.2 — HWCN Data Model

```typescript
interface HWCN {
  id: string;                     // e.g. "HWCN-12345"
  serial: string;                 // Linked bottle serial
  destination: string;            // Named destination
  sites: Array<{ name: string; address: string; weight: number }>;
  vehicleReg: string;             // Carrier vehicle (Part C)
  engineer: string;               // Consignor name
  date: string;                   // ISO timestamp
  gasType: string;
  fillWeight: number;             // kg at time of transit
  deliveredAt?: string;
  receivedBy?: string;            // Part E: consignee name
  receivedSignature?: string;     // Part E: signature data or name
  hwcnStatus: "draft" | "awaiting_consignee" | "complete";
  rejectionDetails?: string;
  vehicleRegConsignee?: string;   // Part E: consignee's vehicle
  partECompletedAt?: string;
  accepted?: boolean;
}
```

### 5.3 — Compliance Numbers (from Settings)
- **Carrier Registration Number (CBDU)**: `CBDU368286` — appears on Part C of all HWCNs.
- **Waste Authorised Exemption Number**: `31Z 3725 34` — appears on Part E.
- These are stored in the Settings page (currently hardcoded state — not yet persisted to DB).

### 5.4 — Weight Discrepancy Resolution
The system matches recovery logs to HWCN line items using Site Name matches, ensuring Part E signatures are legally accurate.

---

## 6. Notification System

### 6.1 — Notification Types

| Type | Trigger | Target Role |
|:-----|:--------|:-----------|
| `location_discrepancy` | Bottle found in unexpected location | `admin` |
| `new_registration` | New bottle registered | `admin` |
| `rental_expiry` | Bottle rental date approaching/passed | `admin`, `office` |
| `low_gas` | Bottle below threshold weight | `admin`, `office` |
| `new_gas_registration` | New gas type added to catalogue | `admin` |
| `new_user_registration` | New user signed up, awaiting approval | `admin` |

### 6.2 — Notification Statuses
`new` → `acknowledged`

- Admin can acknowledge individually or bulk-acknowledge all.
- Engineer notifications shown in `/dashboard/notifications`.
- Admin notifications shown in `/admin/notifications`.

---

## 7. Route & Page Inventory

### 7.1 — Public / Auth Routes

| Route | Purpose |
|:------|:--------|
| `/` | Engineer login (email + password) |
| `/signup` | New user registration |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset handler (token from email) |
| `/pending` | Awaiting admin approval screen |

### 7.2 — Engineer Dashboard Routes (`/dashboard/*`)

| Route | Purpose |
|:------|:--------|
| `/dashboard` | Main scan page — enter serial to find/register a bottle |
| `/dashboard/bottle/register` | Register new bottle (Category → Gas → Location flow) |
| `/dashboard/bottle/[serial]` | Bottle detail: weight, location, logs, actions |
| `/dashboard/move` | Move bottle between locations |
| `/dashboard/bulk` | Bulk receive — process a full pallet to one PO |
| `/dashboard/inventory` | Engineer's portable inventory (van + in-transit) |
| `/dashboard/history` | Movement and usage history |
| `/dashboard/log` | Daily activity log |
| `/dashboard/notifications` | Engineer notification feed |
| `/dashboard/profile` | User profile — vehicle reg, employer, role switch |
| `/dashboard/hwcn/[id]` | HWCN detail view (read + deliver action) |

### 7.3 — Admin Panel Routes (`/admin/*`)

| Route | Purpose |
|:------|:--------|
| `/admin` | Dashboard overview — key stats and recent activity |
| `/admin/login` | Office/Admin login portal |
| `/admin/bottles` | All bottles — filterable inventory list |
| `/admin/bottles/[serial]` | Bottle detail — full history, edit, admin actions |
| `/admin/bottles/[serial]/edit` | Edit bottle metadata |
| `/admin/stores` | Central stores inventory (office location) |
| `/admin/vans` | Van inventory — grouped by vehicle registration |
| `/admin/onsite` | Bottles currently at job sites |
| `/admin/suppliers` | Bottles at supplier locations |
| `/admin/returned-to-supplier` | Bottles with `status: returned` |
| `/admin/hwcn` | HWCN list — filterable by status |
| `/admin/hwcn/[id]` | HWCN detail + Part E sign-off |
| `/admin/haz-waste-summary` | Hazardous waste aggregated summary view |
| `/admin/supplier-returns-waste` | Process physical returns to suppliers |
| `/admin/decommissioned` | Decommissioned equipment log |
| `/admin/notifications` | Notification management |
| `/admin/actions` | Daily actions / outstanding tasks list |
| `/admin/expiry` | Upcoming rental/bottle expiry dates |
| `/admin/reports` | Reporting and analytics exports |
| `/admin/users` | User management — approve, disable, assign roles |
| `/admin/settings` | Company details, compliance numbers, supplier list, gas catalogue |

---

## 8. UI/UX & Design System

The "21 Degrees" design language: High-contrast, dark-mode, mobile-first.

### 8.1 — Design Tokens

| Token | Value | Usage |
|:------|:------|:------|
| **Primary** | `#00e5ff` | Primary actions, success states, progress, headings |
| **Warning** | `#ffaa00` | Hazardous waste, reclaim bottles, compliance alerts |
| **Danger** | `#ff3366` | Errors, deletions, rejected states |
| **Success** | `#22c55e` | Confirmed states, approved badges |
| **Surface** | Deep charcoal glassmorphism | `glass-panel` class — all cards |
| **Text Muted** | `rgba(255,255,255,0.5)` | `var(--text-muted)` |
| **Typography** | Inter/Geist for UI | Geist Mono for serials/registrations to prevent digit confusion |

### 8.2 — Component Rules

- **Action Buttons**: Minimum `50px` height for thumb-friendly mobile use.
- **Bottle Cards**: Must display Serial, Gas Type, Weight balance. Reclaim bottles must also show Intended Destination.
- **Scan UI**: Persistent manual entry field (monospace) paired with a branded "Scan" button (html5-qrcode).
- **No Components Directory**: All UI is currently inline within page files. Do not extract components unless a pattern appears in 3+ pages.
- **Inline Styles**: The codebase uses inline style objects extensively — match this pattern, do not introduce CSS modules or Tailwind unless instructed.

---

## 9. Database Schema

### 9.1 — Naming Convention
- **Database**: `snake_case` (Supabase/PostgreSQL)
- **Frontend**: `camelCase` (TypeScript interfaces)
- **Mapping Layer**: `lib/db.ts` — all `mapX()` functions handle the conversion.

### 9.2 — Tables

**`users`**
```
id TEXT PK | email TEXT UNIQUE | name TEXT | role TEXT | available_roles TEXT[]
status TEXT | vehicle_reg TEXT | employer TEXT | created_at TIMESTAMPTZ
```

**`bottles`**
```
serial TEXT PK | category TEXT | gas_type TEXT | initial_weight NUMERIC | current_weight NUMERIC
location_type TEXT | location_id TEXT | po_number TEXT | supplier TEXT | registered_at TIMESTAMPTZ
status TEXT | intended_destination TEXT | intended_location_type TEXT | active_hwcn TEXT
supplier_hwcn_photo_pending BOOLEAN | supplier_hwcn_photo_url TEXT | producer_sites JSONB
returned_by TEXT | returned_at TIMESTAMPTZ | delivered_at TIMESTAMPTZ | registered_by TEXT
return_hwcn_number TEXT | location_changed_at TIMESTAMPTZ | vehicle_reg TEXT | rental_expiry_date TIMESTAMPTZ
```

**`movement_logs`**
```
id UUID PK | serial TEXT FK(bottles) | date TIMESTAMPTZ | action TEXT
from_location TEXT | to_location TEXT | engineer TEXT | notes TEXT | vehicle_reg TEXT
```

**`usage_logs`**
```
id UUID PK | serial TEXT FK(bottles) | date TIMESTAMPTZ | job_type TEXT
site_ref TEXT | site_name TEXT | site_address TEXT | engineer TEXT
weight_used NUMERIC | weight_before NUMERIC | weight_after NUMERIC
```

**`hwcns`**
```
id TEXT PK | serial TEXT FK(bottles) | destination TEXT | sites JSONB | vehicle_reg TEXT
engineer TEXT | date TIMESTAMPTZ | gas_type TEXT | fill_weight NUMERIC | delivered_at TIMESTAMPTZ
received_by TEXT | received_signature TEXT | hwcn_status TEXT | rejection_details TEXT
vehicle_reg_consignee TEXT | part_e_completed_at TIMESTAMPTZ | accepted BOOLEAN
```

**`notifications`**
```
id TEXT PK | type TEXT | title TEXT | message TEXT | date TIMESTAMPTZ
status TEXT | metadata JSONB | target_role TEXT
```

**`suppliers`**
```
id TEXT PK | name TEXT | address TEXT | phone TEXT | created_at TIMESTAMPTZ
```

**`gases`**
```
id UUID PK | name TEXT UNIQUE | type TEXT | un_number TEXT | gwp NUMERIC
odp NUMERIC | hazard_class TEXT | can_be_bought_new BOOLEAN | created_at TIMESTAMPTZ
```

**`decommissioned_equipment`**
```
id TEXT PK | bottle_serial TEXT FK(bottles) | job_number TEXT | site_name TEXT
site_address TEXT | site_postcode TEXT | engineer TEXT
equipment JSONB (Array<{ manufacturer, model, serial, weightRecovered }>)
gas_type TEXT | total_weight_recovered NUMERIC | date TIMESTAMPTZ
```

### 9.3 — Schema Integrity Rules
- **Immutable Logs**: `movement_logs` and `usage_logs` are append-only. Never delete or update. Corrections via new adjustment log entries.
- **Relational Safety**: `movement_logs` and `usage_logs` use `ON DELETE CASCADE` on `serial`. This is acceptable for logs tied to deregistered bottles.
- **RLS**: Currently disabled on all tables (prototype phase). Must be re-enabled before any multi-tenant or public-facing deployment.
- **JSONB fields**: `producer_sites`, `sites` (hwcns), `equipment` (decommissioned), `metadata` (notifications) are JSONB — always validate structure in `db.ts` before insert.

---

## 10. Technical Stack

| Layer | Technology | Version |
|:------|:-----------|:--------|
| Framework | Next.js | 16.2.4 |
| UI Library | React | 19.2.4 |
| Database | Supabase (PostgreSQL) | @supabase/supabase-js ^2.105.1 |
| Language | TypeScript | ^5 |
| Icons | lucide-react | ^1.8.0 |
| QR/Barcode Scanning | html5-qrcode | ^2.3.8 |
| E2E Testing | Playwright | ^1.59.1 |
| Env Vars | dotenv | ^17.4.2 |

**IMPORTANT — Next.js 16**: This project uses Next.js 16, which has breaking changes from training data. Before writing any Next.js code, check `node_modules/next/dist/docs/` for current API conventions. Do not assume Next.js 13/14/15 patterns are valid.

### 10.1 — Key Files
| File | Purpose |
|:-----|:--------|
| `lib/db.ts` | All database access. Single source of truth for data operations. |
| `lib/AuthContext.tsx` | Auth state, role management, route protection. |
| `lib/supabaseClient.ts` | Supabase client init (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). |
| `lib/utils.ts` | `compressImage()` (photo uploads), `formatDays()` (date display). |

### 10.2 — Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=<supabase project url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase anon key>
```

---

## 11. Audit & Reporting

- **Cylinder History**: Every gram of gas must be accounted for from Registration → Return. The `movement_logs` + `usage_logs` chain provides the full audit trail per serial.
- **Decommissioned Equipment Log**: `/admin/decommissioned` — aggregated view of all `decommissioned_equipment` records for environmental compliance reporting.
- **Hazardous Waste Summary**: `/admin/haz-waste-summary` — cross-bottle view of all reclaim/waste movements.
- **Expiry Tracking**: `/admin/expiry` — surfaces bottles with `rentalExpiryDate` approaching or past. Triggers `rental_expiry` notifications.
- **Reports**: `/admin/reports` — exportable analytics (in progress).

---

## 12. Known Gaps & Outstanding Items

| Item | Status |
|:-----|:-------|
| Company settings not persisted to DB | Hardcoded in Settings page state — `db.saveCompanySettings()` not yet implemented |
| Engineer field in `logUsage()` | Hardcoded to `"System"` — should pass authenticated user |
| RLS policies | Disabled — must be implemented before production |
| `db.updateHWCN()` | Only maps `hwcnStatus` and `deliveredAt` — other fields need wiring |
| Reports page | Route exists, functionality pending |
| Components directory | Does not exist — all UI is inline in pages |
| `target_role` on notifications | Column exists in DB but not yet used for filtering in UI |
