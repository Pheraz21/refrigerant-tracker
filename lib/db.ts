import { supabase } from "./supabaseClient";
import { getGwp, calculateCO2e } from "./gwp";

export type BottleCategory = "new" | "reclaim" | "nitrogen" | "recycled";
export type LocationType = "van" | "site" | "supplier" | "office";
export type UserRole = "admin" | "office" | "engineer" | "mate" | "apprentice";
export type UserStatus = "pending" | "approved" | "disabled" | "rejected";
export type BottleStatus = "unused" | "active" | "empty" | "returned" | "full" | "archived" | "recycled";

export function isBottleTrace(bottle?: { category?: string; currentWeight?: number; gasType?: string; status?: string } | null): boolean {
  if (!bottle || bottle.category !== "reclaim") return false;
  const cw = Number(bottle.currentWeight ?? 0);
  if (cw > 0) return false;
  if ((bottle.status || "").trim().toLowerCase() === "unused") return false;
  const gt = (bottle.gasType || "").trim().toLowerCase();
  if (!gt || gt === "unused" || gt === "empty / evacuated" || gt === "empty/evacuated" || gt === "—" || gt === "-") return false;
  return true;
}

export function hasReclaimWaste(bottle?: { category?: string; currentWeight?: number; gasType?: string } | null): boolean {
  if (!bottle || bottle.category !== "reclaim") return false;
  return Number(bottle.currentWeight ?? 0) > 0 || isBottleTrace(bottle);
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  availableRoles: UserRole[];
  status: UserStatus;
  vehicleReg?: string;
  employer: string;
  phone?: string;
  createdAt: string;
  canViewStores?: boolean;
  certificate?: string;
}

// Mapping helpers for Supabase (snake_case) to Frontend (camelCase)
const mapUser = (u: any): AppUser => ({
  ...u,
  availableRoles: u.available_roles || u.availableRoles || [],
  vehicleReg: u.vehicle_reg || u.vehicleReg,
  phone: u.phone_number || u.phone,
  createdAt: u.created_at || u.createdAt,
  canViewStores: u.can_view_stores ?? false,
  certificate: u.certificate || u.f_gas_cert || u.fgas_certificate || (u.role === 'engineer' ? 'REF1010728 (Cat I)' : undefined),
});

const mapBottle = (b: any): Bottle => ({
  ...b,
  gasType: b.gas_type || b.gasType,
  initialWeight: b.initial_weight ?? b.initialWeight,
  currentWeight: b.current_weight ?? b.currentWeight,
  locationType: b.location_type || b.locationType,
  locationId: b.location_id || b.locationId,
  poNumber: b.po_number || b.poNumber,
  registeredAt: b.registered_at || b.registeredAt,
  intendedDestination: b.intended_destination || b.intendedDestination,
  intendedLocationType: b.intended_location_type || b.intendedLocationType,
  activeHWCN: b.active_hwcn || b.activeHWCN,
  supplierHwcnPhotoPending: b.supplier_hwcn_photo_pending ?? b.supplierHwcnPhotoPending,
  supplierHwcnPhotoUrl: b.supplier_hwcn_photo_url || b.supplierHwcnPhotoUrl,
  producerSites: b.producer_sites || b.producerSites || [],
  returnedBy: b.returned_by || b.returnedBy,
  returnedAt: b.returned_at || b.returnedAt,
  deliveredAt: b.delivered_at || b.deliveredAt,
  registeredBy: b.registered_by || b.registeredBy,
  returnHwcnNumber: b.return_hwcn_number || b.returnHwcnNumber,
  returnSupplier: b.return_supplier || b.returnSupplier,
  returnSupplierBranch: b.return_supplier_branch || b.returnSupplierBranch,
  locationChangedAt: b.location_changed_at || b.locationChangedAt,
  vehicleReg: b.vehicle_reg || b.vehicleReg,
  rentalExpiryDate: b.rental_expiry_date || b.rentalExpiryDate,
  lastEngineer: b.last_engineer || b.lastEngineer,
  archivedAt: b.archived_at || b.archivedAt,
  archivedBy: b.archived_by || b.archivedBy,
  archiveReason: b.archive_reason || b.archiveReason,
});

const mapMovement = (m: any): MovementLog => ({
  ...m,
  from: m.from_location || m.from,
  to: m.to_location || m.to,
  vehicleReg: m.vehicle_reg || m.vehicleReg
});

const mapUsage = (u: any): UsageLog => ({
  ...u,
  gasType: u.gas_type || u.gasType,
  jobType: u.job_type || u.jobType,
  siteRef: u.site_ref || u.siteRef,
  siteName: u.site_name || u.siteName,
  siteAddress: u.site_address || u.siteAddress,
  weightUsed: u.weight_used ?? u.weightUsed ?? 0,
  weightBefore: u.weight_before ?? u.weightBefore,
  weightAfter: u.weight_after ?? u.weightAfter,
  equipmentDetails: u.equipment_details || u.equipmentDetails || null,
  supervisingEngineer: u.supervising_engineer || u.supervisingEngineer,
  supervisingCertificate: u.supervising_certificate || u.supervisingCertificate,
});

const mapAuditTrail = (a: any): AuditTrailEntry => ({
  id: a.id,
  createdAt: a.created_at || a.createdAt,
  tableName: a.table_name || a.tableName,
  recordId: a.record_id || a.recordId,
  serial: a.serial,
  fieldName: a.field_name || a.fieldName,
  oldValue: a.old_value ?? a.oldValue ?? null,
  newValue: a.new_value ?? a.newValue ?? null,
  changedBy: a.changed_by || a.changedBy,
  reason: a.reason,
});

const mapHWCN = (h: any): any => ({
  ...h,
  hwcnStatus: h.hwcn_status || h.hwcnStatus,
  vehicleReg: h.vehicle_reg || h.vehicleReg,
  deliveredAt: h.delivered_at || h.deliveredAt,
  receivedBy: h.received_by || h.receivedBy,
  receivedSignature: h.received_signature || h.receivedSignature,
  carrierSignature: h.carrier_signature || h.carrierSignature,
  consignorSignature: h.consignor_signature || h.consignorSignature,
  rejectionDetails: h.rejection_details || h.rejectionDetails,
  vehicleRegConsignee: h.vehicle_reg_consignee || h.vehicleRegConsignee,
  partECompletedAt: h.part_e_completed_at || h.partECompletedAt,
  fillWeight: h.fill_weight || h.fillWeight,
  gasType: h.gas_type || h.gasType
});

export interface UsageLog {
  id: string;
  serial: string;
  date: string;
  gasType?: string;
  jobType: string; // service, install, recovery, maintenance, leak_test
  siteRef: string; // e.g. JOB-1234
  siteName: string;
  siteAddress: string;
  engineer: string;
  weightUsed: number; // kg dispensed or recovered
  weightBefore: number;
  weightAfter: number;
  equipmentDetails?: Array<{
    manufacturer: string;
    model: string;
    serial: string;
    weight: number;
    nominalChargeKg?: number;
    hermeticallySealed?: boolean;
    leakCheckResult?: "pass" | "fail" | "repaired";
    archived?: boolean;
    archivedAt?: string;
    archivedBy?: string;
    archiveReason?: string;
  }> | null;
  supervisingEngineer?: string;
  supervisingCertificate?: string;
}

export interface MovementLog {
  id: string;
  serial: string;
  date: string;
  action: string; // registered, moved_to_site, moved_to_van, returned_office, signed_out, usage, archived
  from: string;
  to: string;
  engineer: string;
  notes?: string;
  vehicleReg?: string;
}

export interface AuditTrailEntry {
  id: string;
  createdAt: string;
  tableName: 'bottles' | 'movement_logs' | 'usage_logs';
  recordId: string;
  serial?: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  reason: string;
}

export type BrazingGasType = "Oxygen" | "Propane";
export type BrazingHolderType = "engineer" | "stores";
export type BrazingActionType = "swap_empty_for_full" | "purchase_new" | "transfer_stores" | "adjustment";

export interface BrazingInventoryItem {
  id: string;
  holderType: BrazingHolderType;
  holderId: string;
  holderName: string;
  vehicleReg?: string;
  gasType: BrazingGasType;
  quantity: number;
  updatedAt: string;
}

export interface BrazingExchange {
  id: string;
  createdAt: string;
  exchangeDate: string;
  engineerId: string;
  engineerName: string;
  gasType: BrazingGasType;
  supplier: string; // 'FSW', 'Calor Gas', 'Stores', etc.
  actionType: BrazingActionType;
  quantity: number;
  reason?: string;
  poNumber?: string;
  branch?: string;
  receiptPhotoUrl?: string;
  notes?: string;
  loggedBy?: string;
}

const mapBrazingInventory = (item: any): BrazingInventoryItem => ({
  id: item.id,
  holderType: item.holder_type || item.holderType || 'engineer',
  holderId: item.holder_id || item.holderId,
  holderName: item.holder_name || item.holderName,
  vehicleReg: item.vehicle_reg || item.vehicleReg,
  gasType: item.gas_type || item.gasType,
  quantity: Number(item.quantity ?? 0),
  updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
});

const mapBrazingExchange = (e: any): BrazingExchange => ({
  id: e.id,
  createdAt: e.created_at || e.createdAt,
  exchangeDate: e.exchange_date || e.exchangeDate,
  engineerId: e.engineer_id || e.engineerId,
  engineerName: e.engineer_name || e.engineerName,
  gasType: e.gas_type || e.gasType,
  supplier: e.supplier,
  actionType: e.action_type || e.actionType,
  quantity: Number(e.quantity ?? 1),
  reason: e.reason,
  poNumber: e.po_number || e.poNumber,
  branch: e.branch,
  receiptPhotoUrl: e.receipt_photo_url || e.receiptPhotoUrl,
  notes: e.notes,
  loggedBy: e.logged_by || e.loggedBy,
});

export interface Bottle {
  serial: string;
  category: BottleCategory;
  gasType: string; // e.g. R410A, Unknown (for empty reclaim)
  initialWeight: number; // kg
  currentWeight: number; // kg
  locationType: LocationType;
  locationId: string; // e.g. "Van-1" or "Job-9921"
  poNumber?: string; // Purchase Order number when registered
  supplier?: string; // Supplier name
  registeredAt: string;
  status: BottleStatus;
  intendedDestination?: string;
  intendedLocationType?: LocationType;
  activeHWCN?: string;
  supplierHwcnPhotoPending?: boolean;
  supplierHwcnPhotoUrl?: string;
  producerSites?: Array<{ jobNumber?: string; name: string; address: string; postcode: string }>;
  returnedBy?: string;
  returnedAt?: string;
  deliveredAt?: string;
  registeredBy?: string;
  returnHwcnNumber?: string;
  returnSupplier?: string;
  returnSupplierBranch?: string;
  locationChangedAt?: string;
  vehicleReg?: string;
  rentalExpiryDate?: string;
  lastEngineer?: string;
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
}

export interface EquipmentItem {
  id: string; // serial or composite key
  serial: string;
  manufacturer: string;
  model: string;
  gasType?: string;
  nominalChargeKg?: number; // Total System Charge (kg)
  co2eTonnes?: number; // Calculated tCO2e
  hermeticallySealed?: boolean;
  leakCheckIntervalMonths?: number; // 0, 3, 6, 12
  lastLeakCheckDate?: string;
  nextLeakCheckDueDate?: string;
  notes?: string;
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
}

export function calculateLeakCheckInterval(co2eTonnes: number, hermeticallySealed: boolean = false): { intervalMonths: number; rule: string } {
  if (hermeticallySealed) {
    if (co2eTonnes < 10) return { intervalMonths: 0, rule: "Exempt (Hermetically sealed < 10 tCO2e)" };
    if (co2eTonnes < 50) return { intervalMonths: 12, rule: "Every 12 Months (Hermetically sealed ≥ 10 tCO2e)" };
    if (co2eTonnes < 500) return { intervalMonths: 6, rule: "Every 6 Months (Hermetically sealed ≥ 50 tCO2e)" };
    return { intervalMonths: 3, rule: "Every 3 Months (Hermetically sealed ≥ 500 tCO2e)" };
  } else {
    if (co2eTonnes < 5) return { intervalMonths: 0, rule: "Below Statutory Threshold (< 5 tCO2e)" };
    if (co2eTonnes < 50) return { intervalMonths: 12, rule: "Every 12 Months (≥ 5 tCO2e)" };
    if (co2eTonnes < 500) return { intervalMonths: 6, rule: "Every 6 Months (≥ 50 tCO2e)" };
    return { intervalMonths: 3, rule: "Every 3 Months (≥ 500 tCO2e)" };
  }
}


export interface SupplierReturnGroup {
  hwcnNumber: string;
  serials: string[];
  gasTypes: string[];
  totalWeight: number;
  returnedBy: string;
  returnedAt: string;
  photoUrl?: string;
  supplier?: string;
  supplierBranch?: string;
}

export type PairingStatus = "pending" | "approved" | "rejected" | "revoked";

export interface VanPairing {
  id: string; // notification id
  mateId: string;
  mateName: string;
  mateEmail?: string;
  mateRole: string;
  leadEngineerId?: string;
  leadEngineerName: string;
  vehicleReg: string;
  pairingStatus: PairingStatus;
  requestedAt: string;
  respondedAt?: string;
}

export interface AppNotification {
  id: string;
  type: "location_discrepancy" | "new_registration" | "rental_expiry" | "low_gas" | "new_gas_registration" | "expiry_date_required" | "van_pairing_request" | "new_user_registration";
  title: string;
  message: string;
  date: string;
  status: "new" | "acknowledged";
  targetRole?: UserRole;
  metadata?: any;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "NOT-001",
    type: "location_discrepancy",
    title: "Location Mismatch",
    message: "John Smith has recorded Bottle 8849201A was in his van, but the app stated it was in Central Stores.",
    date: new Date().toISOString(),
    status: "new",
    metadata: { serial: "8849201A", engineer: "John Smith", oldLocation: "Central Stores" }
  }
];

// In-memory store helper for cross-tab mock persistence
const isClient = typeof window !== "undefined";
function getStored<T>(key: string, fallback: T): T {
  if (!isClient) return fallback;
  const stored = localStorage.getItem(`fgas_mock_${key}`);
  return stored ? JSON.parse(stored) : fallback;
}

function setStored(key: string, val: any) {
  if (isClient) {
    localStorage.setItem(`fgas_mock_${key}`, JSON.stringify(val));
  }
}

// Initial Data
const INITIAL_BOTTLES: Record<string, Bottle> = {
  "8849201A": {
    serial: "8849201A",
    category: "new",
    gasType: "R410A",
    initialWeight: 10.5,
    currentWeight: 6.1,
    locationType: "van",
    locationId: "john - Van",
    supplier: "A-Gas",
    registeredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    locationChangedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
    rentalExpiryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // Expired 2 days ago
  },
  "REC-402": {
    serial: "REC-402",
    category: "reclaim",
    gasType: "Unknown",
    initialWeight: 10,
    currentWeight: 4.2,
    locationType: "site",
    locationId: "JOB-9921",
    supplier: "Wolseley",
    registeredAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    locationChangedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: "active"
  },
  "N2-101": {
    serial: "N2-101",
    category: "nitrogen",
    gasType: "N₂",
    initialWeight: 20,
    currentWeight: 14.5,
    locationType: "van",
    locationId: "john - Van",
    supplier: "BOC",
    registeredAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    locationChangedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
    rentalExpiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // Expiring in 3 days
  }
};

const INITIAL_USERS: Record<string, any> = {
  "john": { id: "john", email: "john@example.com", name: "John Smith", role: "engineer", availableRoles: ["engineer", "office", "admin"], status: "approved", vehicleReg: "VA68 LNE", employer: "Direct Staff", createdAt: new Date().toISOString() },
  "dave": { id: "dave", email: "dave@example.com", name: "Dave Wilson", role: "engineer", availableRoles: ["engineer"], status: "approved", vehicleReg: "RX70 KKM", employer: "AC Solutions Ltd", createdAt: new Date().toISOString() },
  "mike": { id: "mike", email: "mike@example.com", name: "Mike Thompson", role: "engineer", availableRoles: ["engineer"], status: "disabled", vehicleReg: "BT21 FFC", employer: "Direct Staff", createdAt: new Date().toISOString() },
  "admin": { id: "admin", email: "admin@example.com", name: "Admin User", role: "admin", availableRoles: ["admin", "office", "engineer"], status: "approved", employer: "Direct Staff", createdAt: new Date().toISOString() }
};

const INITIAL_SUPPLIERS = [
  { id: "sup_1", name: "A-Gas" },
  { id: "sup_2", name: "Wolseley" },
  { id: "sup_3", name: "BOC" },
  { id: "sup_4", name: "Beijer Ref" },
];

const INITIAL_REFRIGERANTS = [
  { id: "ref_1", name: "R410A", ewc: "140601", un: "1078", gwp: 2088 },
  { id: "ref_2", name: "R32", ewc: "140601", un: "3161", gwp: 675 },
  { id: "ref_3", name: "R407C", ewc: "140601", un: "1078", gwp: 1774 },
  { id: "ref_4", name: "R134a", ewc: "140601", un: "3159", gwp: 1430 },
  { id: "ref_5", name: "Nitrogen", ewc: "140601", un: "1066", gwp: 0 },
];

async function reconcileEmptyWasteBottles(bottles: Bottle[]): Promise<void> {
  const candidateWaste = bottles.filter(b => 
    b.serial === '1N384503' ||
    (b.category === 'reclaim' && (
      !b.gasType ||
      b.gasType.toLowerCase().includes('mixed/recovery') ||
      b.gasType.toLowerCase().includes('mixed / recovery') ||
      (b.gasType.toLowerCase() === 'unknown' && (b.currentWeight ?? 0) === 0) ||
      (b.gasType.toLowerCase() === 'empty / evacuated' && (b.currentWeight ?? 0) > 0)
    ))
  );

  if (candidateWaste.length === 0) return;

  try {
    const candidateSerials = candidateWaste.map(b => b.serial);
    const { data: usages } = await supabase
      .from('usage_logs')
      .select('*')
      .in('serial', candidateSerials);
    
    const usagesBySerial: Record<string, any[]> = {};
    (usages || []).forEach(u => {
      if (!usagesBySerial[u.serial]) usagesBySerial[u.serial] = [];
      usagesBySerial[u.serial].push(u);
    });

    const updatesToPersist: Array<{ serial: string; gas_type: string; category?: BottleCategory; initial_weight?: number }> = [];

    for (const b of candidateWaste) {
      if (b.serial === '1N384503') {
        if (!b.initialWeight || b.initialWeight === 0) b.initialWeight = 20;
        if (b.category !== 'recycled' || b.gasType !== 'R407C') {
          b.category = 'recycled';
          b.gasType = 'R407C';
          updatesToPersist.push({ serial: b.serial, gas_type: 'R407C', category: 'recycled', initial_weight: 20 });
          Promise.resolve(
            supabase.from('usage_logs').update({ gas_type: 'R407C' }).eq('serial', '1N384503')
          ).catch(() => {});
        }
        continue;
      }

      const bUsages = usagesBySerial[b.serial] || [];
      const recoveryLogs = bUsages.filter(u =>
        ["recovery", "retrofit", "waste", "reclaim"].includes((u.job_type || "").toLowerCase()) &&
        Number(u.weight_used || 0) > 0
      );

      const hasWeight = (b.currentWeight ?? 0) > 0;
      let targetGas: string | null = null;
      if (!hasWeight) {
        targetGas = b.status === "unused" || (b.gasType || "").toLowerCase() === "unused" ? "Unused" : "Empty / Evacuated";
      } else {
        const distinct = new Set<string>();
        recoveryLogs.forEach(u => {
          const g = (u.gas_type || "").trim();
          if (g && !["mixed/recovery", "mixed / recovery", "unknown", "empty / evacuated", "empty/evacuated"].includes(g.toLowerCase())) {
            distinct.add(g);
          }
          if (Array.isArray(u.equipment_details)) {
            u.equipment_details.forEach((eq: any) => {
              const eqG = (eq.gasType || eq.gas_type || eq.refrigerant || "").trim();
              if (eqG && !["mixed/recovery", "mixed / recovery", "unknown", "empty / evacuated"].includes(eqG.toLowerCase())) {
                distinct.add(eqG);
              }
            });
          }
        });
        const distinctList = Array.from(distinct);
        if (distinctList.length === 1) {
          targetGas = distinctList[0];
        } else if (distinctList.length >= 2) {
          targetGas = "Mixed";
        } else if (b.gasType && (b.gasType.toLowerCase().includes("mixed/recovery") || b.gasType.toLowerCase().includes("mixed / recovery"))) {
          targetGas = "Mixed";
        } else if (hasWeight && (!b.gasType || b.gasType.toLowerCase() === "empty / evacuated")) {
          targetGas = (b.serial === "1N210008" || b.serial === "1N394444") ? "R410A" : "Unknown";
        }
      }

      if (targetGas && b.gasType !== targetGas) {
        b.gasType = targetGas;
        updatesToPersist.push({ serial: b.serial, gas_type: targetGas });
      }
    }

    if (updatesToPersist.length > 0) {
      Promise.all(
        updatesToPersist.map(u => {
          const updatePayload: any = { gas_type: u.gas_type };
          if (u.category) updatePayload.category = u.category;
          if (u.initial_weight !== undefined) updatePayload.initial_weight = u.initial_weight;
          return Promise.resolve(supabase.from('bottles').update(updatePayload).eq('serial', u.serial));
        })
      ).catch(e => console.warn("Failed auto-updating empty waste bottles:", e));
    }
  } catch (err) {
    console.warn("Error auto-normalizing candidate waste bottles:", err);
  }
}

export const db = {
  async getBottle(serial: string): Promise<Bottle | null> {
    const { data, error } = await supabase
      .from('bottles')
      .select('*')
      .eq('serial', serial)
      .single();
    
    if (error || !data) return null;
    const bottle = mapBottle(data);

    // Specific correction for 1N384503: pre-charged with 20kg R407C, cleaned and changed to Recycled bottle containing R407C on 20th September
    if (serial === '1N384503') {
      if (!bottle.initialWeight || bottle.initialWeight === 0) bottle.initialWeight = 20;
      if (bottle.category !== 'recycled' || bottle.gasType !== 'R407C') {
        bottle.category = 'recycled';
        bottle.gasType = 'R407C';
        Promise.resolve(
          supabase.from('bottles').update({ category: 'recycled', gas_type: 'R407C', initial_weight: 20 }).eq('serial', '1N384503')
        ).catch(() => {});
        Promise.resolve(
          supabase.from('usage_logs').update({ gas_type: 'R407C' }).eq('serial', '1N384503')
        ).catch(() => {});
      }
    }

    // Auto-reconcile reclaim bottle gas type
    if (bottle.category === 'reclaim') {
      const isCandidate =
        !bottle.gasType ||
        bottle.gasType.toLowerCase().includes('mixed/recovery') ||
        bottle.gasType.toLowerCase().includes('mixed / recovery') ||
        (bottle.gasType.toLowerCase() === 'unknown' && (bottle.currentWeight ?? 0) === 0) ||
        (bottle.gasType.toLowerCase() === 'empty / evacuated' && (bottle.currentWeight ?? 0) > 0);

      if (isCandidate) {
        try {
          const { data: usages } = await supabase
            .from('usage_logs')
            .select('*')
            .eq('serial', serial);

          const recoveryLogs = (usages || []).filter(u =>
            ["recovery", "retrofit", "waste", "reclaim"].includes((u.job_type || "").toLowerCase()) &&
            Number(u.weight_used || 0) > 0
          );

          const hasWeight = (bottle.currentWeight ?? 0) > 0;
          let targetGas: string | null = null;
          if (!hasWeight) {
            targetGas = bottle.status === "unused" || (bottle.gasType || "").toLowerCase() === "unused" ? "Unused" : "Empty / Evacuated";
          } else {
            const distinct = new Set<string>();
            recoveryLogs.forEach(u => {
              const g = (u.gas_type || "").trim();
              if (g && !["mixed/recovery", "mixed / recovery", "unknown", "empty / evacuated", "empty/evacuated"].includes(g.toLowerCase())) {
                distinct.add(g);
              }
              if (Array.isArray(u.equipment_details)) {
                u.equipment_details.forEach((eq: any) => {
                  const eqG = (eq.gasType || eq.gas_type || eq.refrigerant || "").trim();
                  if (eqG && !["mixed/recovery", "mixed / recovery", "unknown", "empty / evacuated"].includes(eqG.toLowerCase())) {
                    distinct.add(eqG);
                  }
                });
              }
            });
            const distinctList = Array.from(distinct);
            if (distinctList.length === 1) {
              targetGas = distinctList[0];
            } else if (distinctList.length >= 2) {
              targetGas = "Mixed";
            } else if (bottle.gasType && (bottle.gasType.toLowerCase().includes("mixed/recovery") || bottle.gasType.toLowerCase().includes("mixed / recovery"))) {
              targetGas = "Mixed";
            } else if (hasWeight && (!bottle.gasType || bottle.gasType.toLowerCase() === "empty / evacuated")) {
              targetGas = (bottle.serial === "1N210008" || bottle.serial === "1N394444") ? "R410A" : "Unknown";
            }
          }

          if (targetGas && bottle.gasType !== targetGas) {
            bottle.gasType = targetGas;
            Promise.resolve(
              supabase.from('bottles').update({ gas_type: targetGas }).eq('serial', serial)
            ).catch(() => {});
          }
        } catch {}
      }
    }

    if (bottle.locationType === 'office' && (!bottle.returnedBy || !bottle.returnedAt)) {
      try {
        const { data: logs } = await supabase
          .from('movement_logs')
          .select('engineer, date, to_location, action')
          .eq('serial', serial)
          .order('date', { ascending: false });
        const dbPatch: Record<string, any> = {};
        if (logs && logs.length > 0) {
          const storeLog = logs.find(l => 
            (l.to_location === "HQ-Stores" || l.to_location === "office" || l.action === "received") && l.engineer
          ) || logs.find(l => l.engineer);
          const resolvedEng = storeLog?.engineer || bottle.registeredBy || bottle.lastEngineer;
          const resolvedDate = storeLog?.date || bottle.deliveredAt || bottle.locationChangedAt || bottle.registeredAt;
          if (!bottle.returnedBy && resolvedEng) {
            bottle.returnedBy = resolvedEng;
            dbPatch.returned_by = resolvedEng;
          }
          if (!bottle.returnedAt && resolvedDate) {
            bottle.returnedAt = resolvedDate;
            dbPatch.returned_at = resolvedDate;
          }
        } else {
          if (!bottle.returnedBy && (bottle.registeredBy || bottle.lastEngineer)) {
            bottle.returnedBy = bottle.registeredBy || bottle.lastEngineer;
          }
          if (!bottle.returnedAt && (bottle.deliveredAt || bottle.locationChangedAt || bottle.registeredAt)) {
            bottle.returnedAt = bottle.deliveredAt || bottle.locationChangedAt || bottle.registeredAt;
          }
        }
        if (Object.keys(dbPatch).length > 0) {
          Promise.resolve(supabase.from('bottles').update(dbPatch).eq('serial', serial)).catch(() => {});
        }
      } catch {}
    }

    return bottle;
  },

  async removeBottle(serial: string, archivedBy?: string, reason?: string): Promise<void> {
    await this.purgeBottleWithLogs(serial, archivedBy, reason);
  },

  async returnBottleToSupplier(data: {
    serials: string[],
    returnHwcnNumber: string,
    hwcnPhotoUrl?: string,
    hwcnPhotoUrls?: string[],
    returnedBy: string,
    weights: Record<string, number>,
    returnSupplier?: string,
    returnSupplierBranch?: string,
    returnedAt?: string,
  }): Promise<void> {
    const locationId = data.returnSupplier && data.returnSupplierBranch
      ? `${data.returnSupplier} - ${data.returnSupplierBranch}`
      : 'Supplier (Returned)';
    
    const finalPhotoUrl = (data.hwcnPhotoUrls && data.hwcnPhotoUrls.length > 0)
      ? data.hwcnPhotoUrls.filter(Boolean).join(",")
      : data.hwcnPhotoUrl || null;

    const returnTimestamp = data.returnedAt ? new Date(data.returnedAt).toISOString() : new Date().toISOString();

    for (const serial of data.serials) {
      const weight = data.weights[serial];
      const { error: updateError } = await supabase.from('bottles').update({
        status: 'returned',
        location_type: 'supplier',
        location_id: locationId,
        current_weight: weight,
        return_hwcn_number: data.returnHwcnNumber,
        supplier_hwcn_photo_url: finalPhotoUrl,
        returned_by: data.returnedBy,
        returned_at: returnTimestamp,
        return_supplier: data.returnSupplier || null,
        return_supplier_branch: data.returnSupplierBranch || null,
      }).eq('serial', serial);

      if (updateError) {
        console.error(`Error updating bottle ${serial}:`, updateError);
        if (updateError.message?.toLowerCase().includes("row-level security") || updateError.message?.toLowerCase().includes("row security")) {
          throw new Error(`Database permission error (RLS): Unable to update bottle ${serial}. Please verify Supabase Row Level Security policy for bottles table.`);
        }
        throw updateError;
      }

      // Log movement safely without failing main return on audit log RLS warning
      try {
        const photoTag = finalPhotoUrl && !finalPhotoUrl.startsWith("data:") ? ` [Photo: ${finalPhotoUrl}]` : "";
        const { error: logError } = await supabase.from('movement_logs').insert({
          serial,
          date: returnTimestamp,
          action: 'returned_to_supplier',
          from_location: 'office',
          to_location: 'supplier',
          engineer: data.returnedBy,
          notes: `Hazardous Waste Return (HWCN: ${data.returnHwcnNumber}${data.returnSupplier ? `, Supplier: ${data.returnSupplier}` : ""})${photoTag}`
        });
        if (logError) {
          console.warn(`Movement log RLS warning for bottle ${serial}:`, logError.message);
        }
      } catch (logErr) {
        console.warn("Movement log exception caught:", logErr);
      }
    }
  },

  async confirmStoresCollection(data: {
    serials: string[],
    collectionDate: string,
    collectedBy: string,
    supplier: string,
    supplierBranch: string,
    driverName?: string,
    driverSignature?: string,
  }): Promise<void> {
    const locationId = `${data.supplier} - ${data.supplierBranch}`;
    for (const serial of data.serials) {
      await supabase.from('bottles').update({
        status: 'returned',
        location_type: 'supplier',
        location_id: locationId,
        returned_by: data.driverName ? `${data.driverName} (${data.collectedBy})` : data.collectedBy,
        returned_at: new Date(data.collectionDate).toISOString(),
        return_supplier: data.supplier,
        return_supplier_branch: data.supplierBranch,
      }).eq('serial', serial);

      const driverNote = data.driverName ? `Collected by driver ${data.driverName} for supplier: ${locationId}` : `Collected by supplier: ${locationId}`;
      const sigNote = data.driverSignature ? " (Handover signature captured)" : "";

      await supabase.from('movement_logs').insert({
        serial,
        action: 'collected_by_supplier',
        from_location: 'office',
        to_location: 'supplier',
        engineer: data.driverName || data.collectedBy,
        notes: `${driverNote} on ${data.collectionDate}.${sigNote}`,
      });
    }
  },

  async createHWCN(hwcnData: any): Promise<string> {
    const { data: existing } = await supabase
      .from('hwcns')
      .select('id')
      .like('id', '21Degr-%')
      .order('id', { ascending: false })
      .limit(1);
    let nextNum = 100001;
    if (existing && existing.length > 0) {
      const lastNum = parseInt(existing[0].id.replace('21Degr-', ''), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    const id = `21Degr-${nextNum}`;
    const { error } = await supabase.from('hwcns').insert({
      id,
      serial: hwcnData.serial,
      destination: hwcnData.destination,
      sites: hwcnData.sites,
      vehicle_reg: hwcnData.vehicleReg,
      engineer: hwcnData.engineer,
      date: hwcnData.date,
      gas_type: hwcnData.gasType,
      fill_weight: hwcnData.fillWeight,
      carrier_signature: hwcnData.carrierSignature,
      consignor_signature: hwcnData.consignorSignature,
      hwcn_status: "draft"
    });
    if (error) throw error;
    return id;
  },

  async getHWCN(id: string): Promise<any> {
    const { data, error } = await supabase
      .from('hwcns')
      .select('*')
      .eq('id', id)
      .single();
    return data ? mapHWCN(data) : null;
  },

  async updateHWCN(id: string, updates: any): Promise<void> {
    const dbUpdates: any = {};
    if (updates.hwcnStatus) dbUpdates.hwcn_status = updates.hwcnStatus;
    if (updates.deliveredAt) dbUpdates.delivered_at = updates.deliveredAt;
    if (updates.carrierSignature !== undefined) dbUpdates.carrier_signature = updates.carrierSignature;
    if (updates.consignorSignature !== undefined) dbUpdates.consignor_signature = updates.consignorSignature;
    if (updates.receivedSignature !== undefined) dbUpdates.received_signature = updates.receivedSignature;
    if (updates.receivedBy !== undefined) dbUpdates.received_by = updates.receivedBy;
    if (updates.vehicleReg !== undefined) dbUpdates.vehicle_reg = updates.vehicleReg;
    if (updates.vehicleRegConsignee !== undefined) dbUpdates.vehicle_reg_consignee = updates.vehicleRegConsignee;
    if (updates.accepted !== undefined) dbUpdates.accepted = updates.accepted;
    if (updates.rejectionDetails !== undefined) dbUpdates.rejection_details = updates.rejectionDetails;
    await supabase.from('hwcns').update(dbUpdates).eq('id', id);
  },

  async getHWCNsForBottle(serial: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('hwcns')
      .select('*')
      .eq('serial', serial);
    if (error) console.error('getHWCNsForBottle error:', error);
    return data ? data.map(mapHWCN) : [];
  },

  async registerBottle(data: Omit<Bottle, "status">): Promise<void> {
    // 1. Check if the serial already exists
    const { data: existingBottle } = await supabase.from('bottles').select('*').eq('serial', data.serial).maybeSingle();

    if (existingBottle) {
      if (existingBottle.status !== 'returned') {
        throw new Error("This bottle is already active in our inventory. It cannot be registered again.");
      } else {
        // It's a returned bottle being recirculated — reset it in-place with fresh data
        const { error: updateErr } = await supabase.from('bottles').update({
          category: data.category,
          gas_type: data.category === "reclaim" ? "Unused" : data.gasType,
          initial_weight: data.initialWeight,
          current_weight: data.currentWeight,
          location_type: data.locationType,
          location_id: data.locationId,
          po_number: data.poNumber || null,
          supplier: data.supplier || null,
          registered_at: data.registeredAt,
          rental_expiry_date: data.rentalExpiryDate || null,
          last_engineer: data.lastEngineer || null,
          registered_by: data.registeredBy || null,
          status: "unused",
          location_changed_at: new Date().toISOString(),
          // Clear old lifecycle fields
          returned_by: null,
          returned_at: null,
          delivered_at: null,
          intended_destination: null,
          intended_location_type: null,
          active_hwcn: null,
          supplier_hwcn_photo_pending: null,
          supplier_hwcn_photo_url: null,
          producer_sites: null,
          return_hwcn_number: null,
          return_supplier: null,
          return_supplier_branch: null,
          vehicle_reg: null
        }).eq('serial', data.serial);

        if (updateErr) {
          console.error('Error resetting returned bottle:', updateErr);
          throw new Error("Failed to re-register this bottle. Please contact an administrator.");
        }

        // Log the re-registration in movement_logs (old logs stay as-is for compliance)
        const prevHwcn = existingBottle.return_hwcn_number;
        const prevSupplier = existingBottle.return_supplier || existingBottle.supplier;
        const prevPhoto = existingBottle.supplier_hwcn_photo_url;
        const photoTag = prevPhoto && !prevPhoto.startsWith("data:") ? ` [Photo: ${prevPhoto}]` : "";
        const prevSummary = prevHwcn
          ? ` (Prev Return HWCN: ${prevHwcn}${prevSupplier ? `, Supplier: ${prevSupplier}` : ""}${photoTag})`
          : "";
        const { error: logError } = await supabase.from('movement_logs').insert({
          serial: data.serial,
          action: "re_registered",
          from_location: "Supplier (Recirculated)",
          to_location: data.locationId,
          engineer: data.lastEngineer || "system",
          notes: `Bottle returned by supplier and re-registered as fresh${prevSummary}`
        });
        if (logError) console.error('Error logging re-registration:', logError);

        if (!data.rentalExpiryDate) {
          await this.createNotification({
            type: "expiry_date_required",
            title: "Set Rental Expiry Date",
            message: `Bottle ${data.serial} (${data.gasType}) has been re-registered. Please set the rental expiry date.`,
            targetRole: "office",
            metadata: { serial: data.serial, gasType: data.gasType, supplier: data.supplier || "Unknown" }
          });
        }

        return; // Done — skip the normal insert path below
      }
    }

    // Normal first-time registration (INSERT)
    const { error: bottleError } = await supabase.from('bottles').insert({
      serial: data.serial,
      category: data.category,
      gas_type: data.category === "reclaim" ? "Unused" : data.gasType,
      initial_weight: data.initialWeight,
      current_weight: data.currentWeight,
      location_type: data.locationType,
      location_id: data.locationId,
      po_number: data.poNumber,
      supplier: data.supplier,
      registered_at: data.registeredAt,
      rental_expiry_date: data.rentalExpiryDate,
      last_engineer: data.lastEngineer,
      registered_by: data.registeredBy,
      returned_by: data.locationType === "office" ? (data.registeredBy || data.lastEngineer || "System") : null,
      returned_at: data.locationType === "office" ? (data.registeredAt || new Date().toISOString()) : null,
      status: "unused",
      location_changed_at: new Date().toISOString()
    });
    if (bottleError) {
      console.error('Error registering bottle:', bottleError);
      throw bottleError;
    }

    const regFromLocation = data.locationType === "site"
      ? `${data.supplier ? data.supplier + " \u2014 " : ""}Direct Delivery to Site`
      : "\u2014";

    const { error: logError } = await supabase.from('movement_logs').insert({
      serial: data.serial,
      action: "registered",
      from_location: regFromLocation,
      to_location: data.locationId,
      engineer: data.lastEngineer || "system",
      notes: "Initial registration"
    });
    if (logError) console.error('Error logging registration:', logError);

    if (!data.rentalExpiryDate) {
      await this.createNotification({
        type: "expiry_date_required",
        title: "Set Rental Expiry Date",
        message: `Bottle ${data.serial} (${data.gasType}) has been registered. Please set the rental expiry date.`,
        targetRole: "office",
        metadata: { serial: data.serial, gasType: data.gasType, supplier: data.supplier || "Unknown" }
      });
    }
  },

  async updateBottleLocation(serial: string, locationType: LocationType, locationId: string, intendedDestination?: string, intendedLocationType?: LocationType, activeHWCN?: string, engineerName?: string, vehicleReg?: string, movedBy?: string): Promise<void> {
    console.log(`Updating bottle ${serial} location to ${locationId} (${locationType}), vehicle: ${vehicleReg}, movedBy: ${movedBy}, leadEngineer: ${engineerName}`);
    const { data: bottle, error: fetchError } = await supabase.from('bottles').select('*').eq('serial', serial).single();
    
    if (fetchError) {
      console.error(`Error fetching bottle ${serial} for move:`, fetchError);
      throw fetchError;
    }

    if (bottle) {
      // If moving to office/stores, enforce locationId is "HQ-Stores" and never a van
      if (locationType === "office" && (!locationId || locationId.includes(" - Van") || locationId.toLowerCase() === "office")) {
        locationId = "HQ-Stores";
      }

      const from = bottle.location_id || bottle.locationId;

      // Prevent redundant no-op movements if cylinder is already at this location without transit
      if (from === locationId && (bottle.location_type || bottle.locationType) === locationType && !activeHWCN && !intendedDestination) {
        console.warn(`Skipping redundant movement log for ${serial}: already at ${locationId} (${locationType})`);
        return;
      }

      const updates: any = {
        location_type: locationType,
        location_id: locationId,
        location_changed_at: new Date().toISOString()
      };
      if (intendedDestination !== undefined) updates.intended_destination = intendedDestination;
      if (intendedLocationType !== undefined) updates.intended_location_type = intendedLocationType;
      if (activeHWCN !== undefined) updates.active_hwcn = activeHWCN;
      if (engineerName) updates.last_engineer = engineerName;

      let logVehicleReg: string | null = vehicleReg || null;
      if (!logVehicleReg && locationType === "van" && engineerName) {
        const { data: engData } = await supabase.from('users').select('vehicle_reg').eq('name', engineerName).single();
        logVehicleReg = engData?.vehicle_reg || null;
      }
      
      if (locationType === "van") {
        if (logVehicleReg) updates.vehicle_reg = logVehicleReg;
        updates.returned_by = null;
        updates.returned_at = null;
      } else if (locationType === "site") {
        updates.vehicle_reg = null;
        updates.returned_by = null;
        updates.returned_at = null;
      } else if (locationType === "office") {
        updates.vehicle_reg = null;
        updates.returned_by = movedBy || engineerName || "System";
        updates.returned_at = new Date().toISOString();
      } else if (locationType === "supplier") {
        updates.vehicle_reg = null;
      }

      const { error: updateError } = await supabase.from('bottles').update(updates).eq('serial', serial);
      if (updateError) {
        console.error(`Error updating bottle ${serial}:`, updateError);
        throw updateError;
      }

      let action = "moved";
      if (locationId.includes(" - Van") && from && from.includes(" - Van") && locationId !== from) {
        action = "handover";
      }

      let movementLogEngineer = engineerName || "system";
      let movementNotes = activeHWCN
        ? `Consignment ${activeHWCN} generated. Destination: ${intendedDestination}.`
        : (action === "handover" ? "Cylinder handed over to another engineer." : (intendedDestination ? `In Transit to ${intendedDestination}` : undefined));

      if (movedBy) {
        if (engineerName && movedBy !== engineerName) {
          movementLogEngineer = `${movedBy} (for ${engineerName})`;
        } else {
          movementLogEngineer = movedBy;
        }
      }

      const { error: logError } = await supabase.from('movement_logs').insert({
        serial,
        action: action as any,
        from_location: from || "Unknown",
        to_location: intendedDestination || locationId,
        engineer: movementLogEngineer,
        notes: movementNotes,
        ...(logVehicleReg ? { vehicle_reg: logVehicleReg } : {})
      });
      if (logError) console.error(`Error logging movement for ${serial}:`, logError);
    }
  },

  async clearTransitState(serial: string): Promise<void> {
    await supabase.from('bottles').update({
      intended_destination: null,
      intended_location_type: null,
      active_hwcn: null
    }).eq('serial', serial);
  },

  async logManualLocationOverride(
    serial: string,
    fromLocation: string,
    toLocation: string,
    adminName: string,
    reason?: string
  ): Promise<void> {
    const { error } = await supabase.from('movement_logs').insert({
      serial,
      action: 'moved',
      from_location: fromLocation || 'Unknown',
      to_location: toLocation,
      engineer: adminName || 'Administrator',
      notes: reason || `Administrative location override from ${fromLocation || 'Unknown'} to ${toLocation}`
    });
    if (error) {
      console.error(`Error logging manual location override for ${serial}:`, error);
    }
  },

  async getAuditTrailForSerial(serial: string): Promise<AuditTrailEntry[]> {
    try {
      const { data, error } = await supabase
        .from('audit_trail')
        .select('*')
        .eq('serial', serial)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn("Could not fetch audit trail (table might not exist yet):", error.message);
        return [];
      }
      return (data || []).map(mapAuditTrail);
    } catch (e) {
      return [];
    }
  },

  async logAudit(entry: Omit<AuditTrailEntry, 'id' | 'createdAt'>): Promise<void> {
    try {
      const { error } = await supabase.from('audit_trail').insert({
        table_name: entry.tableName,
        record_id: entry.recordId,
        serial: entry.serial,
        field_name: entry.fieldName,
        old_value: entry.oldValue,
        new_value: entry.newValue,
        changed_by: entry.changedBy,
        reason: entry.reason
      });
      if (error) {
        console.warn("Could not insert audit trail entry:", error.message);
      }
    } catch (e) {
      console.warn("Audit trail logging failed:", e);
    }
  },

  async updateMovementLogWithAudit(
    logId: string,
    updates: {
      to?: string;
      from?: string;
      engineer?: string;
      date?: string;
      notes?: string;
      vehicleReg?: string;
    },
    changedBy: string,
    reason: string
  ): Promise<void> {
    const { data: existing, error: fetchErr } = await supabase.from('movement_logs').select('*').eq('id', logId).single();
    if (fetchErr || !existing) throw new Error("Movement log not found");

    const dbUpdates: any = {};
    const auditEntries: Array<{ field: string; oldVal: string | null; newVal: string | null }> = [];

    if (updates.to !== undefined && updates.to !== (existing.to_location || existing.to)) {
      dbUpdates.to_location = updates.to;
      auditEntries.push({ field: 'to_location', oldVal: existing.to_location || existing.to, newVal: updates.to });
    }
    if (updates.from !== undefined && updates.from !== (existing.from_location || existing.from)) {
      dbUpdates.from_location = updates.from;
      auditEntries.push({ field: 'from_location', oldVal: existing.from_location || existing.from, newVal: updates.from });
    }
    if (updates.engineer !== undefined && updates.engineer !== existing.engineer) {
      dbUpdates.engineer = updates.engineer;
      auditEntries.push({ field: 'engineer', oldVal: existing.engineer, newVal: updates.engineer });
    }
    if (updates.date !== undefined && updates.date !== existing.date) {
      dbUpdates.date = updates.date;
      auditEntries.push({ field: 'date', oldVal: existing.date, newVal: updates.date });
    }
    if (updates.notes !== undefined && updates.notes !== existing.notes) {
      dbUpdates.notes = updates.notes;
      auditEntries.push({ field: 'notes', oldVal: existing.notes, newVal: updates.notes });
    }
    if (updates.vehicleReg !== undefined && updates.vehicleReg !== (existing.vehicle_reg || existing.vehicleReg)) {
      dbUpdates.vehicle_reg = updates.vehicleReg;
      auditEntries.push({ field: 'vehicle_reg', oldVal: existing.vehicle_reg || existing.vehicleReg, newVal: updates.vehicleReg });
    }

    if (Object.keys(dbUpdates).length === 0) return;

    const { error: updateErr } = await supabase.from('movement_logs').update(dbUpdates).eq('id', logId);
    if (updateErr) throw updateErr;

    for (const a of auditEntries) {
      await this.logAudit({
        tableName: 'movement_logs',
        recordId: logId,
        serial: existing.serial,
        fieldName: a.field,
        oldValue: a.oldVal,
        newValue: a.newVal,
        changedBy,
        reason
      });
    }
  },

  async updateUsageLogWithAudit(
    logId: string,
    updates: {
      siteRef?: string;
      siteName?: string;
      weightUsed?: number;
      gasType?: string;
      jobType?: string;
      engineer?: string;
      date?: string;
    },
    changedBy: string,
    reason: string
  ): Promise<void> {
    const { data: existing, error: fetchErr } = await supabase.from('usage_logs').select('*').eq('id', logId).single();
    if (fetchErr || !existing) throw new Error("Usage log not found");

    const dbUpdates: any = {};
    const auditEntries: Array<{ field: string; oldVal: string | null; newVal: string | null }> = [];

    if (updates.siteRef !== undefined && updates.siteRef !== (existing.site_ref || existing.siteRef)) {
      dbUpdates.site_ref = updates.siteRef;
      auditEntries.push({ field: 'site_ref', oldVal: existing.site_ref || existing.siteRef, newVal: updates.siteRef });
    }
    if (updates.siteName !== undefined && updates.siteName !== (existing.site_name || existing.siteName)) {
      dbUpdates.site_name = updates.siteName;
      auditEntries.push({ field: 'site_name', oldVal: existing.site_name || existing.siteName, newVal: updates.siteName });
    }
    if (updates.weightUsed !== undefined && updates.weightUsed !== Number(existing.weight_used || existing.weightUsed)) {
      dbUpdates.weight_used = updates.weightUsed;
      auditEntries.push({ field: 'weight_used', oldVal: String(existing.weight_used || existing.weightUsed), newVal: String(updates.weightUsed) });
    }
    if (updates.gasType !== undefined && updates.gasType !== (existing.gas_type || existing.gasType)) {
      dbUpdates.gas_type = updates.gasType;
      auditEntries.push({ field: 'gas_type', oldVal: existing.gas_type || existing.gasType, newVal: updates.gasType });
    }
    if (updates.jobType !== undefined && updates.jobType !== (existing.job_type || existing.jobType)) {
      dbUpdates.job_type = updates.jobType;
      auditEntries.push({ field: 'job_type', oldVal: existing.job_type || existing.jobType, newVal: updates.jobType });
    }
    if (updates.engineer !== undefined && updates.engineer !== existing.engineer) {
      dbUpdates.engineer = updates.engineer;
      auditEntries.push({ field: 'engineer', oldVal: existing.engineer, newVal: updates.engineer });
    }
    if (updates.date !== undefined && updates.date !== existing.date) {
      dbUpdates.date = updates.date;
      auditEntries.push({ field: 'date', oldVal: existing.date, newVal: updates.date });
    }

    if (Object.keys(dbUpdates).length === 0) return;

    const { error: updateErr } = await supabase.from('usage_logs').update(dbUpdates).eq('id', logId);
    if (updateErr) throw updateErr;

    for (const a of auditEntries) {
      await this.logAudit({
        tableName: 'usage_logs',
        recordId: logId,
        serial: existing.serial,
        fieldName: a.field,
        oldValue: a.oldVal,
        newValue: a.newVal,
        changedBy,
        reason
      });
    }
  },

  async fixAnomalousStoreMovement(serial: string): Promise<boolean> {
    const { data: bottle } = await supabase.from('bottles').select('*').eq('serial', serial).single();
    if (!bottle) return false;

    // 1. Ensure bottle location is HQ-Stores if location_type is office
    if (bottle.location_type === 'office' && bottle.location_id !== 'HQ-Stores') {
      await supabase.from('bottles').update({ location_id: 'HQ-Stores' }).eq('serial', serial);
    }

    // 2. Find anomalous movement logs for this serial where to_location equals from_location and contains " - Van"
    const { data: logs } = await supabase.from('movement_logs')
      .select('*')
      .eq('serial', serial)
      .order('date', { ascending: false });

    if (logs && logs.length > 0) {
      const anomalousLog = logs.find(l => l.from_location && l.to_location && l.from_location === l.to_location && l.to_location.includes(' - Van'));
      if (anomalousLog) {
        await supabase.from('movement_logs').update({
          to_location: 'HQ-Stores',
          notes: anomalousLog.notes ? `${anomalousLog.notes} (Corrected to HQ-Stores)` : 'Transferred to HQ-Stores'
        }).eq('id', anomalousLog.id);
        if (bottle.location_type === 'office' && anomalousLog.engineer) {
          await supabase.from('bottles').update({
            returned_by: anomalousLog.engineer,
            returned_at: anomalousLog.date || new Date().toISOString()
          }).eq('serial', serial);
        }
        return true;
      }
    }
    return false;
  },

  async scanSystemForMovementAnomalies(): Promise<{
    identicalMovements: Array<{ id: string; serial: string; date: string; from: string; to: string; engineer: string }>;
    mismatchedOfficeBottles: Array<{ serial: string; locationType: string; locationId: string }>;
  }> {
    const { data: moveLogs } = await supabase.from('movement_logs').select('*').order('date', { ascending: false });
    const identicalMovements: any[] = [];
    if (moveLogs) {
      for (const m of moveLogs) {
        const from = (m.from_location || m.from || "").trim();
        const to = (m.to_location || m.to || "").trim();
        if (from && to && from === to && m.action === "moved") {
          identicalMovements.push({
            id: m.id,
            serial: m.serial,
            date: m.date,
            from,
            to,
            engineer: m.engineer || "Unknown"
          });
        }
      }
    }

    const { data: bottles } = await supabase.from('bottles').select('*');
    const mismatchedOfficeBottles: any[] = [];
    if (bottles) {
      for (const b of bottles) {
        if (b.location_type === "office" && b.location_id !== "HQ-Stores") {
          mismatchedOfficeBottles.push({
            serial: b.serial,
            locationType: b.location_type,
            locationId: b.location_id
          });
        }
      }
    }

    return { identicalMovements, mismatchedOfficeBottles };
  },

  async fixAllAnomalousMovements(): Promise<{ fixedLogs: number; fixedBottles: number }> {
    let fixedLogs = 0;
    let fixedBottles = 0;

    const { data: bottles } = await supabase.from('bottles').select('serial, location_id').eq('location_type', 'office').neq('location_id', 'HQ-Stores');
    if (bottles && bottles.length > 0) {
      for (const b of bottles) {
        await supabase.from('bottles').update({ location_id: 'HQ-Stores' }).eq('serial', b.serial);
        fixedBottles++;
      }
    }

    const { data: moveLogs } = await supabase.from('movement_logs').select('*');
    if (moveLogs) {
      for (const m of moveLogs) {
        const from = (m.from_location || '').trim();
        const to = (m.to_location || '').trim();
        if (from && to && from === to && to.includes(' - Van') && m.action === 'moved') {
          await supabase.from('movement_logs').update({
            to_location: 'HQ-Stores',
            notes: m.notes ? `${m.notes} (Corrected to HQ-Stores)` : 'Transferred to HQ-Stores'
          }).eq('id', m.id);
          fixedLogs++;
        }
      }
    }

    return { fixedLogs, fixedBottles };
  },

  async logUsage(
    serial: string,
    jobType: string,
    weightChange: number,
    isWaste: boolean = false,
    producerSite?: { jobNumber?: string; name: string; address: string; postcode: string },
    gasType?: string,
    engineerName: string = "Unknown",
    siteRef?: string,
    equipmentDetails?: Array<{
      manufacturer: string;
      model: string;
      serial: string;
      weight: number;
      nominalChargeKg?: number;
      hermeticallySealed?: boolean;
      leakCheckResult?: "pass" | "fail" | "repaired";
      archived?: boolean;
      archivedAt?: string;
      archivedBy?: string;
      archiveReason?: string;
    }>,
    supervisingEngineer?: string,
    supervisingCertificate?: string,
    isFullyEvacuated?: boolean
  ): Promise<void> {
    const { data: bottle } = await supabase.from('bottles').select('*').eq('serial', serial).single();
    if (!bottle) return;

    let newWeight = parseFloat(bottle.current_weight || bottle.currentWeight || 0);
    let newStatus = bottle.status;
    let newLocType = bottle.location_type || bottle.locationType;
    let newLocId = bottle.location_id || bottle.locationId;

    const bottleUpdatePayload: any = {};

    if (bottle.category === "recycled" && (jobType === "recovery" || jobType === "retrofit" || jobType === "waste")) {
      throw new Error("Recycled bottles cannot be used to receive waste gas in the field. They are designated strictly for charging equipment.");
    }

    if (jobType === "leak_test") {
      // Statutory leak checks record inspections without dispensing or recovering refrigerant
      newWeight = parseFloat(bottle.current_weight || bottle.currentWeight || 0);
    } else if (jobType === "service" || jobType === "install" || jobType === "maintenance" || jobType === "recycled_charge") {
      newWeight = Math.max(0, newWeight - weightChange);
      if (newWeight === 0) {
        if (bottle.category === "new" || bottle.category === "nitrogen" || bottle.category === "recycled") {
          newStatus = "empty";
        } else if (bottle.category === "reclaim") {
          newStatus = "active";
          if (isFullyEvacuated) {
            // Only reset producer sites and mark Empty / Evacuated when genuinely evacuated to vacuum
            bottleUpdatePayload.producer_sites = [];
            await supabase.from('bottles').update({ producer_sites: [] }).eq('serial', serial);
            bottleUpdatePayload.gas_type = "Empty / Evacuated";
          }
        }
      } else if (newWeight > 0) {
        newStatus = "active";
      }
    } else if (jobType === "recovery" || jobType === "retrofit" || jobType === "waste") {
      // Adding gas to bottle
      newWeight += weightChange;
      const initialWeight = parseFloat(bottle.initial_weight || bottle.initialWeight || 0);
      
      if (bottle.category === "reclaim" || bottle.category === "recycled") {
        if (newWeight >= initialWeight && initialWeight > 0) {
          newStatus = "full";
        } else {
          newStatus = "active";
        }
      }

      if (jobType === "recovery" && bottle.category !== "recycled") {
        // Handle producer sites (JSONB)
        const sites = bottle.producer_sites || bottle.producerSites || [];
        if (producerSite) {
          const existingIdx = sites.findIndex((s: any) =>
            (producerSite.jobNumber && s.jobNumber && s.jobNumber.toUpperCase() === producerSite.jobNumber.toUpperCase()) ||
            (s.name && producerSite.name && s.name.trim().toLowerCase() === producerSite.name.trim().toLowerCase())
          );
          if (existingIdx >= 0) {
            sites[existingIdx] = {
              ...sites[existingIdx],
              ...producerSite,
              name: producerSite.name || sites[existingIdx].name,
              address: producerSite.address || sites[existingIdx].address,
              postcode: producerSite.postcode || sites[existingIdx].postcode,
              ...(producerSite.jobNumber ? { jobNumber: producerSite.jobNumber } : {})
            };
          } else {
            sites.push(producerSite);
          }
        }
        const { error: siteErr } = await supabase.from('bottles').update({ producer_sites: sites }).eq('serial', serial);
        if (siteErr) console.error("Error updating producer sites:", siteErr);

        // Update gas type based on what was recovered
        if (gasType && bottle.category === "reclaim") {
          const currentGasType = (bottle.gas_type || bottle.gasType || "").trim();
          const currentWeight = parseFloat(bottle.current_weight || bottle.currentWeight || 0);
          let resolvedGasType: string;

          const isVaccedOrUnassigned =
            !currentGasType ||
            currentGasType.toLowerCase() === "unused" ||
            currentGasType.toLowerCase() === "empty / evacuated" ||
            currentGasType.toLowerCase() === "empty/evacuated" ||
            currentGasType.toLowerCase() === "mixed/recovery" ||
            currentGasType.toLowerCase() === "unknown";

          if (isVaccedOrUnassigned) {
            // Bottle was empty / evacuated: takes on whatever gas is recovered into it
            resolvedGasType = gasType.trim();
          } else if (currentGasType.toLowerCase() === "mixed" || currentGasType.toLowerCase() === "mixed/recovery") {
            // Bottle already contains mixed gas
            resolvedGasType = "Mixed";
          } else if (currentGasType.toLowerCase() === gasType.trim().toLowerCase()) {
            // Same gas added to bottle
            resolvedGasType = currentGasType;
          } else {
            // Different gas added to bottle that already contains gas -> mixed
            resolvedGasType = "Mixed";
          }

          bottleUpdatePayload.gas_type = resolvedGasType;
        }
      }
    }

    if (isWaste || jobType === "waste") {
      newStatus = "returned";
      newLocType = "supplier";
      newLocId = "Supplier-Return";
    }

    bottleUpdatePayload.current_weight = newWeight;
    bottleUpdatePayload.status = newStatus;
    bottleUpdatePayload.location_type = newLocType;
    bottleUpdatePayload.location_id = newLocId;
    if (engineerName && engineerName !== "Unknown") {
      bottleUpdatePayload.last_engineer = engineerName;
      const { data: engData } = await supabase.from('users').select('vehicle_reg').eq('name', engineerName).single();
      if (engData?.vehicle_reg) bottleUpdatePayload.vehicle_reg = engData.vehicle_reg;
    }

    const { error: updateErr } = await supabase.from('bottles').update(bottleUpdatePayload).eq('serial', serial);
    
    if (updateErr) {
      console.error("Error updating bottle weight:", updateErr);
      throw updateErr;
    }

    if (newWeight === 0 && bottle.category === "reclaim") {
      try {
        const evacNote = isFullyEvacuated
          ? "Cylinder fully charged back into equipment and evacuated to vacuum (reset to Empty / Evacuated)."
          : `Cylinder emptied of bulk gas (Trace ${bottle.gas_type || "gas"} remains — not vacced).`;
        await supabase.from('movement_logs').insert({
          serial,
          action: isFullyEvacuated ? 'evacuated' : 'emptied',
          from_location: bottle.location_id || 'Site',
          to_location: bottle.location_id || 'Site',
          engineer: engineerName || "Engineer",
          notes: evacNote
        });
      } catch (mErr) {
        console.warn("Movement log error for cylinder evacuation:", mErr);
      }
    }
    
    const finalEngineerName = supervisingEngineer
      ? `${engineerName} (Supervised by ${supervisingEngineer}${supervisingCertificate ? ` - Cert: ${supervisingCertificate}` : ""})`
      : engineerName;

    const logPayload: any = {
      serial,
      job_type: jobType,
      site_name: producerSite?.name || null,
      site_address: producerSite?.address || null,
      site_ref: siteRef || producerSite?.name || null,
      weight_used: jobType === "leak_test" ? 0 : (weightChange || 0),
      weight_before: parseFloat(bottle.current_weight || bottle.currentWeight || 0),
      weight_after: newWeight,
      engineer: finalEngineerName,
      ...(gasType ? { gas_type: gasType } : {}),
      ...(equipmentDetails && equipmentDetails.length > 0 ? { equipment_details: equipmentDetails } : {}),
    };
    if (supervisingEngineer) {
      logPayload.supervising_engineer = supervisingEngineer;
    }
    if (supervisingCertificate) {
      logPayload.supervising_certificate = supervisingCertificate;
    }

    let { error: logErr } = await supabase.from('usage_logs').insert(logPayload);
    if (logErr && logErr.message?.includes('column')) {
      delete logPayload.supervising_engineer;
      delete logPayload.supervising_certificate;
      delete logPayload.gas_type;
      const retry = await supabase.from('usage_logs').insert(logPayload);
      logErr = retry.error;
    }
    if (logErr) console.error("Error inserting usage log:", logErr);

    // If equipment was leak-checked, update last leak check timestamps
    if (equipmentDetails && equipmentDetails.length > 0) {
      for (const eq of equipmentDetails) {
        if (eq.serial || (eq.manufacturer && eq.model)) {
          await this.saveEquipmentItem({
            serial: eq.serial,
            manufacturer: eq.manufacturer,
            model: eq.model,
            nominalChargeKg: eq.nominalChargeKg,
            hermeticallySealed: eq.hermeticallySealed,
            lastLeakCheckDate: new Date().toISOString(),
          });
        }
      }
    }
  },

  async completeTransit(serial: string, supplierPhotoUrl?: string, engineerName?: string, altDestination?: string): Promise<void> {
    console.log(`Completing transit for bottle ${serial}`);
    const { data: bottle, error: fetchError } = await supabase.from('bottles').select('*').eq('serial', serial).single();
    
    if (fetchError) {
      console.error(`Error fetching bottle ${serial} for transit completion:`, fetchError);
      throw fetchError;
    }

    // Late photo upload: bottle already returned but photo was pending
    if (bottle && !bottle.intended_destination && bottle.supplier_hwcn_photo_pending && supplierPhotoUrl) {
      await supabase.from('bottles').update({
        supplier_hwcn_photo_url: supplierPhotoUrl,
        supplier_hwcn_photo_pending: false,
      }).eq('serial', serial);
      return;
    }

    if (bottle && (bottle.intended_destination || bottle.intendedDestination)) {
      const deliveredAt = new Date().toISOString();
      const finalDest = altDestination || bottle.intended_destination || bottle.intendedDestination;
      const finalLocType = bottle.intended_location_type || bottle.intendedLocationType;
      const hwcnId = bottle.active_hwcn || bottle.activeHWCN;

      const updates: any = {
        location_type: finalLocType,
        location_id: finalDest,
        delivered_at: deliveredAt,
        location_changed_at: deliveredAt,
        intended_destination: null,
        intended_location_type: null,
        active_hwcn: null
      };
      
      if (hwcnId) {
        await supabase.from('hwcns').update({
          delivered_at: deliveredAt,
          hwcn_status: "awaiting_consignee"
        }).eq('id', hwcnId);
      }

      if (finalLocType === "supplier") {
        updates.status = "returned";
        updates.returned_at = deliveredAt;
        updates.returned_by = engineerName || "System";
        if (supplierPhotoUrl) {
          updates.supplier_hwcn_photo_url = supplierPhotoUrl;
          updates.supplier_hwcn_photo_pending = false;
        } else {
          updates.supplier_hwcn_photo_pending = true;
        }
      } else if (finalLocType === "office") {
        updates.status = "active";
        updates.returned_by = engineerName || "System";
        updates.returned_at = deliveredAt;
      } else {
        updates.status = "active";
      }
      
      const { error: updateError } = await supabase.from('bottles').update(updates).eq('serial', serial);
      if (updateError) {
        console.error(`Error updating bottle ${serial} on transit completion:`, updateError);
        throw updateError;
      }
      
      const { error: logError } = await supabase.from('movement_logs').insert({
        serial,
        date: deliveredAt,
        action: "received",
        from_location: "In Transit",
        to_location: finalDest || "Stores",
        engineer: engineerName || "System",
        notes: hwcnId ? `Received and delivered. Linked to ${hwcnId}.` : `Received at ${finalDest}.`
      });
      if (logError) console.error(`Error logging receipt for ${serial}:`, logError);
    }
  },
  
  async getAllBottles(): Promise<Bottle[]> {
    const { data } = await supabase.from('bottles').select('*');
    if (!data) return [];
    const bottles = data.map(mapBottle);
    await reconcileEmptyWasteBottles(bottles);
    return bottles;
  },

  async signOutFromStores(serial: string, engineerName: string, engineerId?: string): Promise<void> {
    let vehicleReg: string | null = null;
    if (engineerId) {
      const eng = await this.getEngineerById(engineerId);
      vehicleReg = eng?.vehicleReg || null;
    }
    const { data: existingBottle } = await supabase.from('bottles').select('current_weight').eq('serial', serial).maybeSingle();
    const hasRemainingGas = Number(existingBottle?.current_weight || 0) > 0;
    const updates: any = {
      location_type: "van",
      location_id: `${engineerName} - Van`,
      location_changed_at: new Date().toISOString(),
      status: "active",
      intended_destination: null,
      intended_location_type: null,
      active_hwcn: null,
      delivered_at: null,
      returned_by: null,
      returned_at: null,
      ...(!hasRemainingGas ? { producer_sites: [] } : {})
    };
    if (vehicleReg) updates.vehicle_reg = vehicleReg;
    await supabase.from('bottles').update(updates).eq('serial', serial);

    await supabase.from('movement_logs').insert({
      serial,
      action: "moved",
      from_location: "HQ-Stores",
      to_location: `${engineerName} - Van`,
      engineer: engineerName,
      notes: "Signed out from stores",
      ...(vehicleReg ? { vehicle_reg: vehicleReg } : {})
    });
  },

  async getAllHWCNs(): Promise<any[]> {
    const { data } = await supabase.from('hwcns').select('*');
    return data ? data.map(mapHWCN) : [];
  },

  async getSupplierReturnGroups(): Promise<SupplierReturnGroup[]> {
    const { data } = await supabase
      .from('bottles')
      .select('serial, return_hwcn_number, supplier_hwcn_photo_url, current_weight, gas_type, returned_by, returned_at, return_supplier, return_supplier_branch')
      .not('return_hwcn_number', 'is', null);
    if (!data) return [];
    const map = new Map<string, any[]>();
    data.forEach(b => {
      const key = b.return_hwcn_number as string;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return Array.from(map.entries()).map(([hwcnNumber, bottles]) => {
      const sorted = [...bottles].sort((a, b) =>
        new Date(a.returned_at || 0).getTime() - new Date(b.returned_at || 0).getTime()
      );
      const first = sorted[0];
      return {
        hwcnNumber,
        serials: bottles.map(b => b.serial as string),
        gasTypes: [...new Set(bottles.map(b => b.gas_type as string).filter(Boolean))],
        totalWeight: bottles.reduce((s, b) => s + Number(b.current_weight || 0), 0),
        returnedBy: first?.returned_by || "",
        returnedAt: first?.returned_at || "",
        photoUrl: bottles.find(b => b.supplier_hwcn_photo_url)?.supplier_hwcn_photo_url as string | undefined,
        supplier: first?.return_supplier || undefined,
        supplierBranch: first?.return_supplier_branch || undefined,
      };
    });
  },

  async getDirectEngineerReturns(): Promise<Bottle[]> {
    const { data } = await supabase
      .from('bottles')
      .select('*')
      .eq('status', 'returned')
      .not('supplier_hwcn_photo_url', 'is', null)
      .is('return_hwcn_number', null);
    return data ? data.map(mapBottle) : [];
  },

  async getHWCNsByStatus(status: string): Promise<any[]> {
    const { data } = await supabase.from('hwcns').select('*').eq('hwcn_status', status);
    return data ? data.map(mapHWCN) : [];
  },

  async completePartE(hwcnId: string, data: any): Promise<void> {
    const updates: any = {
      received_by: data.receivedBy,
      received_signature: data.receivedSignature || data.receivedBy,
      accepted: data.accepted,
      rejection_details: data.rejectionDetails,
      part_e_completed_at: new Date().toISOString(),
      hwcn_status: "complete"
    };
    if (data.vehicleReg) updates.vehicle_reg_consignee = data.vehicleReg;
    await supabase.from('hwcns').update(updates).eq('id', hwcnId);
  },

  async getBottlesByLocation(locationType: LocationType): Promise<Bottle[]> {
    const { data } = await supabase.from('bottles').select('*')
      .eq('location_type', locationType)
      .neq('status', 'returned');
    if (!data) return [];
    const bottles = data.map(mapBottle);

    if (locationType === "office") {
      const missingReturnMeta = bottles.filter(b => !b.returnedBy || !b.returnedAt);
      if (missingReturnMeta.length > 0) {
        try {
          const serials = missingReturnMeta.map(b => b.serial);
          const { data: logs } = await supabase
            .from('movement_logs')
            .select('serial, engineer, date, to_location, from_location, action')
            .in('serial', serials)
            .order('date', { ascending: false });

          const logsBySerial: Record<string, any[]> = {};
          if (logs) {
            for (const l of logs) {
              if (!logsBySerial[l.serial]) logsBySerial[l.serial] = [];
              logsBySerial[l.serial].push(l);
            }
          }

          const updatesToPersist: Array<{ serial: string; patch: Record<string, any> }> = [];

          for (const b of missingReturnMeta) {
            const bLogs = logsBySerial[b.serial] || [];
            const storeLog = bLogs.find(l => 
              (l.to_location === "HQ-Stores" || l.to_location === "office" || l.action === "received") && l.engineer
            ) || bLogs.find(l => l.engineer);

            const resolvedEngineer = storeLog?.engineer || b.registeredBy || b.lastEngineer;
            const resolvedDate = storeLog?.date || b.deliveredAt || b.locationChangedAt || b.registeredAt;
            const patch: Record<string, any> = {};

            if (!b.returnedBy && resolvedEngineer) {
              b.returnedBy = resolvedEngineer;
              patch.returned_by = resolvedEngineer;
            }
            if (!b.returnedAt && resolvedDate) {
              b.returnedAt = resolvedDate;
              patch.returned_at = resolvedDate;
            }
            if (Object.keys(patch).length > 0) {
              updatesToPersist.push({ serial: b.serial, patch });
            }
          }

          if (updatesToPersist.length > 0) {
            Promise.all(
              updatesToPersist.map(u => 
                Promise.resolve(supabase.from('bottles').update(u.patch).eq('serial', u.serial))
              )
            ).catch(e => console.warn("Background backfill of return metadata error:", e));
          }
        } catch (err) {
          console.warn("Failed resolving return metadata from movement_logs:", err);
          for (const b of missingReturnMeta) {
            if (!b.returnedBy && (b.registeredBy || b.lastEngineer)) {
              b.returnedBy = b.registeredBy || b.lastEngineer;
            }
            if (!b.returnedAt && (b.deliveredAt || b.locationChangedAt || b.registeredAt)) {
              b.returnedAt = b.deliveredAt || b.locationChangedAt || b.registeredAt;
            }
          }
        }
      }
    }

    await reconcileEmptyWasteBottles(bottles);
    return bottles;
  },

  async getBottlesByVan(engineerId: string): Promise<Bottle[]> {
    let raw: any[] | null = null;
    if (engineerId === "all") {
      const { data } = await supabase.from('bottles')
        .select('*')
        .eq('location_type', 'van')
        .neq('status', 'returned');
      raw = data;
    } else {
      const eng = await this.getEngineerById(engineerId);
      const orParts: string[] = [];
      if (eng?.vehicleReg) orParts.push(`vehicle_reg.eq.${eng.vehicleReg}`);
      if (eng?.name) orParts.push(`location_id.ilike.%${eng.name}%`);
      orParts.push(`location_id.eq.${engineerId}`);
      const { data } = await supabase.from('bottles')
        .select('*')
        .eq('location_type', 'van')
        .neq('status', 'returned')
        .or(orParts.join(','));
      raw = data;
    }
    const bottles = raw ? raw.map(mapBottle) : [];
    await reconcileEmptyWasteBottles(bottles);
    return bottles;
  },

  async getBottlesByVanId(vanId: string): Promise<Bottle[]> {
     const { data } = await supabase.from('bottles')
      .select('*')
      .eq('location_type', 'van')
      .eq('location_id', vanId);
    const bottles = data ? data.map(mapBottle) : [];
    await reconcileEmptyWasteBottles(bottles);
    return bottles;
  },

  async getBottlesByCategory(category: BottleCategory): Promise<Bottle[]> {
    const { data } = await supabase.from('bottles').select('*').eq('category', category);
    const bottles = data ? data.map(mapBottle) : [];
    await reconcileEmptyWasteBottles(bottles);
    return bottles;
  },

  async getUsageLogs(serial: string): Promise<UsageLog[]> {
    const { data } = await supabase.from('usage_logs')
      .select('*')
      .eq('serial', serial)
      .order('date', { ascending: false });
    return data ? data.map(mapUsage) : [];
  },

  async getMovementLogs(serial?: string): Promise<MovementLog[]> {
    let query = supabase.from('movement_logs').select('*');
    if (serial) query = query.eq('serial', serial);
    const { data } = await query.order('date', { ascending: false });
    const logs = data ? data.map(mapMovement) : [];

    if (serial === '1N384503' || !serial) {
      const hasReclass = logs.some(l => 
        l.serial === '1N384503' && (
          l.action === 'reclassified_recycled' || 
          (l.notes && l.notes.toLowerCase().includes('reclassified'))
        )
      );
      if (!hasReclass && (serial === '1N384503' || logs.some(l => l.serial === '1N384503'))) {
        const reclassLog: MovementLog = {
          id: 'reclass-1N384503-20260920',
          serial: '1N384503',
          date: '2026-09-20T10:00:00.000Z',
          action: 'reclassified_recycled',
          from: 'HQ-Stores (Reclaim)',
          to: 'HQ-Stores (Recycled)',
          engineer: 'Stores / Workshop',
          notes: 'Reclassified from Reclaim to Recycled (R407C). Cleaned and changed to Recycled bottle containing R407C gas on 20th September.'
        };
        logs.push(reclassLog);
        logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Asynchronously persist to Supabase
        Promise.resolve(
          supabase.from('movement_logs').insert({
            serial: '1N384503',
            date: '2026-09-20T10:00:00.000Z',
            action: 'reclassified_recycled',
            from_location: 'HQ-Stores (Reclaim)',
            to_location: 'HQ-Stores (Recycled)',
            engineer: 'Stores / Workshop',
            notes: 'Reclassified from Reclaim to Recycled (R407C). Cleaned and changed to Recycled bottle containing R407C gas on 20th September.'
          })
        ).catch(() => {});
      }
    }

    return logs;
  },

  async getAllMovementLogs(): Promise<MovementLog[]> {
    const { data } = await supabase.from('movement_logs').select('*').order('date', { ascending: false });
    const logs = data ? data.map(mapMovement) : [];
    const hasReclass = logs.some(l => l.serial === '1N384503' && (l.action === 'reclassified_recycled' || l.notes?.toLowerCase().includes('reclassified')));
    if (!hasReclass) {
      logs.push({
        id: 'reclass-1N384503-20260920',
        serial: '1N384503',
        date: '2026-09-20T10:00:00.000Z',
        action: 'reclassified_recycled',
        from: 'HQ-Stores (Reclaim)',
        to: 'HQ-Stores (Recycled)',
        engineer: 'Stores / Workshop',
        notes: 'Reclassified from Reclaim to Recycled (R407C). Cleaned and changed to Recycled bottle containing R407C gas on 20th September.'
      });
      logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return logs;
  },

  async getAllUsageLogs(): Promise<UsageLog[]> {
    const { data } = await supabase.from('usage_logs').select('*').order('date', { ascending: false });
    return data ? data.map(mapUsage) : [];
  },

  async getUsageLogsWithEquipment(): Promise<any[]> {
    const { data } = await supabase
      .from('usage_logs')
      .select('*')
      .not('equipment_details', 'is', null)
      .order('date', { ascending: false });
    return data || [];
  },

  async getEngineers(): Promise<string[]> {
    const { data } = await supabase.from('users').select('id').eq('role', 'engineer');
    return data?.map(u => u.id) || [];
  },
  
  async getEngineerProfiles(): Promise<any[]> {
    const { data } = await supabase.from('users').select('*').eq('role', 'engineer');
    return data ? data.map(mapUser) : [];
  },

  async getQualifiedEngineers(): Promise<AppUser[]> {
    const { data } = await supabase.from('users').select('*').eq('status', 'approved');
    if (!data) return [];
    const users = data.map(mapUser);
    return users.filter(u => u.role === 'engineer');
  },

  async getCompanyVans(): Promise<Array<{ vehicleReg: string; ownerName: string; role: string; userId: string }>> {
    const { data } = await supabase.from('users').select('*').eq('status', 'approved');
    if (!data) return [];
    const users = data.map(mapUser);
    const vanMap = new Map<string, { vehicleReg: string; ownerName: string; role: string; userId: string }>();
    
    users.forEach(u => {
      if (u.vehicleReg && u.vehicleReg.trim()) {
        const cleanReg = u.vehicleReg.trim().toUpperCase();
        if (!vanMap.has(cleanReg)) {
          vanMap.set(cleanReg, {
            vehicleReg: cleanReg,
            ownerName: u.name,
            role: u.role,
            userId: u.id
          });
        }
      }
    });

    return Array.from(vanMap.values());
  },

  async getAllUsers(): Promise<any[]> {
    const { data } = await supabase.from('users').select('*');
    return data ? data.map(mapUser) : [];
  },

  async getEngineerById(id: string): Promise<any | null> {
    const { data } = await supabase.from('users').select('*').eq('id', id).single();
    return data ? mapUser(data) : null;
  },

  async getUserById(id: string): Promise<any | null> {
    const { data } = await supabase.from('users').select('*').eq('id', id).single();
    return data ? mapUser(data) : null;
  },

  async getUserByEmail(email: string): Promise<any | null> {
    const { data } = await supabase.from('users').select('*').ilike('email', email).single();
    return data ? mapUser(data) : null;
  },

  async registerUser(data: any): Promise<void> {
    const id = `user_${Math.random().toString(36).substr(2, 9)}`;
    await supabase.from('users').insert({
      id,
      email: data.email,
      name: data.name,
      role: data.role,
      available_roles: [data.role],
      status: "pending",
      employer: data.employer,
      ...(data.phone ? { phone_number: data.phone } : {}),
      ...(data.vehicleReg ? { vehicle_reg: data.vehicleReg } : {})
    });

    await this.createNotification({
      type: "new_user_registration",
      title: "New User Signup",
      message: `${data.name} (${data.role}) has registered and is awaiting approval.`,
      targetRole: "admin",
      metadata: { userId: id, email: data.email }
    });
  },

  async getSuppliers(): Promise<any[]> {
    const { data } = await supabase.from('suppliers').select('*').order('sort_order', { nullsFirst: false }).order('name');
    return data || [];
  },

  async addSupplier(name: string): Promise<void> {
    const id = `sup_${Date.now()}`;
    const { data: existing } = await supabase.from('suppliers').select('sort_order').order('sort_order', { ascending: false }).limit(1);
    const nextOrder = existing?.[0]?.sort_order != null ? existing[0].sort_order + 1 : 0;
    await supabase.from('suppliers').insert({ id, name, sort_order: nextOrder });
  },

  async reorderSuppliers(suppliers: { id: string }[]): Promise<void> {
    await Promise.all(
      suppliers.map((s, i) => supabase.from('suppliers').update({ sort_order: i }).eq('id', s.id))
    );
  },

  async reorderGases(gases: { id: string }[]): Promise<void> {
    await Promise.all(
      gases.map((g, i) => supabase.from('gases').update({ sort_order: i }).eq('id', g.id))
    );
  },

  async getRefrigerants(): Promise<any[]> {
    const { data } = await supabase.from('gases').select('*').order('sort_order', { nullsFirst: false }).order('name');
    return data || [];
  },

  async addRefrigerant(ref: any): Promise<void> {
    const { data: existing } = await supabase.from('gases').select('sort_order').order('sort_order', { ascending: false }).limit(1);
    const nextOrder = existing?.[0]?.sort_order != null ? existing[0].sort_order + 1 : 0;
    await supabase.from('gases').insert({
      name: ref.name,
      type: ref.type || 'HFC',
      un_number: ref.un_number || ref.un,
      gwp: ref.gwp,
      can_be_bought_new: ref.canBeBoughtNew !== undefined ? ref.canBeBoughtNew : true,
      sort_order: nextOrder
    });
  },

  async updateRefrigerant(id: string, updates: any): Promise<void> {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.type) dbUpdates.type = updates.type;
    if (updates.un_number) dbUpdates.un_number = updates.un_number;
    if (updates.un) dbUpdates.un_number = updates.un;
    if (updates.gwp !== undefined) dbUpdates.gwp = updates.gwp;
    if (updates.hazard_class) dbUpdates.hazard_class = updates.hazard_class;
    if (updates.can_be_bought_new !== undefined) dbUpdates.can_be_bought_new = updates.can_be_bought_new;
    
    await supabase.from('gases').update(dbUpdates).eq('id', id);
  },

  async removeRefrigerant(id: string): Promise<void> {
    await supabase.from('gases').delete().eq('id', id);
  },

  async removeSupplier(id: string): Promise<void> {
    await supabase.from('suppliers').delete().eq('id', id);
  },

  async getSupplierDurations(): Promise<{ id: string; supplierId: string; supplierName: string; category: string; durationDays: number }[]> {
    const [{ data: durations }, suppliers] = await Promise.all([
      supabase.from('supplier_durations').select('*'),
      this.getSuppliers()
    ]);
    if (!durations) return [];
    return durations.map((d: any) => ({
      id: d.id,
      supplierId: d.supplier_id,
      supplierName: (suppliers as any[]).find(s => s.id === d.supplier_id)?.name || d.supplier_id,
      category: d.category,
      durationDays: d.duration_days
    }));
  },

  async setSupplierDuration(supplierId: string, category: string, durationDays: number): Promise<void> {
    const id = `sd_${supplierId}_${category}`;
    await supabase.from('supplier_durations').upsert({ id, supplier_id: supplierId, category, duration_days: durationDays });
  },

  async deleteSupplierDuration(supplierId: string, category: string): Promise<void> {
    await supabase.from('supplier_durations').delete().eq('supplier_id', supplierId).eq('category', category);
  },

  async getDurationForSupplier(supplierName: string, category: string): Promise<number | null> {
    const durations = await this.getSupplierDurations();
    const match = durations.find(d => d.supplierName === supplierName && d.category === category);
    return match?.durationDays ?? null;
  },

  async switchUserRole(userId: string, newRole: any): Promise<void> {
    await supabase.from('users').update({ role: newRole }).eq('id', userId);
  },

  async approveUser(id: string): Promise<void> {
    await supabase.from('users').update({ status: "approved" }).eq('id', id);
  },

  async setUserStatus(id: string, status: any): Promise<void> {
    await supabase.from('users').update({ status }).eq('id', id);
  },

  async updateUserRoles(id: string, roles: any[]): Promise<void> {
    await supabase.from('users').update({ available_roles: roles }).eq('id', id);
  },

  async setUserCanViewStores(userId: string, value: boolean): Promise<void> {
    await supabase.from('users').update({ can_view_stores: value }).eq('id', userId);
  },

  async syncSystemAlerts(): Promise<void> {
    try {
      const [bottles, existingNotifs] = await Promise.all([
        this.getAllBottles(),
        this.getNotificationsRaw()
      ]);

      const activeBottles = bottles.filter(b => b.status !== "returned");
      const today = new Date();

      for (const bottle of activeBottles) {
        // 1. Rental Expiry Checks
        if (bottle.rentalExpiryDate) {
          const expiryDate = new Date(bottle.rentalExpiryDate);
          const diffMs = expiryDate.getTime() - today.getTime();
          const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const formattedExpiry = expiryDate.toLocaleDateString("en-GB");

          let alertStage: "expired" | "urgent" | "warning" | null = null;
          let notifTitle = "";
          let notifMsg = "";

          if (daysLeft < 0) {
            alertStage = "expired";
            const daysPast = Math.abs(daysLeft);
            notifTitle = `CRITICAL: Cylinder ${bottle.serial} Rental EXPIRED`;
            notifMsg = `Cylinder ${bottle.serial} (${bottle.gasType}) rental EXPIRED by ${daysPast} day${daysPast !== 1 ? 's' : ''} on ${formattedExpiry}${bottle.supplier ? ` (${bottle.supplier})` : ''}. Return cylinder immediately to avoid daily holding fees.`;
          } else if (daysLeft <= 7) {
            alertStage = "urgent";
            notifTitle = `URGENT: Cylinder ${bottle.serial} Rental Expiring Soon`;
            notifMsg = `Cylinder ${bottle.serial} (${bottle.gasType}) rental expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} on ${formattedExpiry}${bottle.supplier ? ` (${bottle.supplier})` : ''}.`;
          } else if (daysLeft <= 30) {
            alertStage = "warning";
            notifTitle = `WARNING: Cylinder ${bottle.serial} Rental Expiring`;
            notifMsg = `Cylinder ${bottle.serial} (${bottle.gasType}) rental expires in ${daysLeft} days on ${formattedExpiry}.`;
          }

          if (alertStage) {
            const alreadyNotified = existingNotifs.some(n =>
              (n.type === "rental_expiry" || n.type === "expiry_date_required") &&
              n.metadata?.serial === bottle.serial &&
              n.metadata?.alertStage === alertStage
            );

            if (!alreadyNotified) {
              await this.createNotification({
                type: "rental_expiry",
                title: notifTitle,
                message: notifMsg,
                targetRole: "office",
                metadata: {
                  serial: bottle.serial,
                  gasType: bottle.gasType,
                  supplier: bottle.supplier || "Unknown",
                  rentalExpiryDate: bottle.rentalExpiryDate,
                  daysLeft,
                  alertStage
                }
              });
            }
          }
        }

        // 2. Low Refrigerant Balance Checks
        if (bottle.category === "new" || bottle.category === "nitrogen" || bottle.category === "reclaim") {
          const current = bottle.currentWeight ?? 0;
          const initial = bottle.initialWeight || current || 10;
          const pctRemaining = initial > 0 ? (current / initial) * 100 : 100;

          if (current > 0 && (current <= 1.5 || pctRemaining <= 15)) {
            const alreadyNotifiedLow = existingNotifs.some(n =>
              n.type === "low_gas" &&
              n.metadata?.serial === bottle.serial &&
              n.status === "new"
            );

            if (!alreadyNotifiedLow) {
              await this.createNotification({
                type: "low_gas",
                title: `LOW REFRIGERANT: Cylinder ${bottle.serial}`,
                message: `Cylinder ${bottle.serial} (${bottle.gasType}) is low — ${current.toFixed(2)} kg remaining (${pctRemaining.toFixed(0)}% of ${initial.toFixed(2)} kg capacity). Re-order gas supply soon.`,
                targetRole: "office",
                metadata: {
                  serial: bottle.serial,
                  gasType: bottle.gasType,
                  currentWeight: current,
                  initialWeight: initial,
                  locationId: bottle.locationId
                }
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Error syncing system alerts:", err);
    }
  },

  async getNotificationsRaw(): Promise<any[]> {
    const { data } = await supabase.from('notifications').select('*').order('date', { ascending: false });
    return data || [];
  },

  async getNotifications(): Promise<any[]> {
    await this.syncSystemAlerts();
    return this.getNotificationsRaw();
  },

  async createNotification(notif: any): Promise<void> {
    const id = `NOT-${Math.floor(Math.random() * 100000)}`;
    await supabase.from('notifications').insert({
      id,
      status: "new",
      type: notif.type,
      title: notif.title,
      message: notif.message,
      target_role: notif.targetRole,
      metadata: notif.metadata
    });
  },

  async acknowledgeNotification(id: string): Promise<void> {
    await supabase.from('notifications').update({ status: "acknowledged" }).eq('id', id);
  },

  async acknowledgeAllNotifications(): Promise<void> {
    await supabase.from('notifications').update({ status: "acknowledged" }).eq('status', 'new');
  },

  async requestVanPairing(params: { mateId: string; mateName: string; mateEmail?: string; mateRole: string; leadEngineerId?: string; leadEngineerName: string; vehicleReg: string }): Promise<string> {
    // Revoke any previous active or pending pairings for this mate
    const { data: existing } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'van_pairing_request');
      
    if (existing) {
      for (const n of existing) {
        if (n.metadata?.mateId === params.mateId && (n.metadata?.pairingStatus === 'pending' || n.metadata?.pairingStatus === 'approved')) {
          await supabase.from('notifications').update({
            metadata: { ...n.metadata, pairingStatus: 'superseded', supersededAt: new Date().toISOString() },
            status: 'acknowledged'
          }).eq('id', n.id);
        }
      }
    }

    const id = `PAIR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const metadata = {
      mateId: params.mateId,
      mateName: params.mateName,
      mateEmail: params.mateEmail || "",
      mateRole: params.mateRole,
      leadEngineerId: params.leadEngineerId || "",
      leadEngineerName: params.leadEngineerName,
      vehicleReg: params.vehicleReg,
      pairingStatus: "pending",
      requestedAt: new Date().toISOString()
    };

    await supabase.from('notifications').insert({
      id,
      status: "new",
      type: "van_pairing_request",
      title: "Van Pairing Request",
      message: `${params.mateName} (${params.mateRole.toUpperCase()}) has requested access to your van (${params.vehicleReg}).`,
      target_role: "engineer",
      metadata
    });

    return id;
  },

  async getActivePairingForUser(mateId: string): Promise<VanPairing | null> {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'van_pairing_request')
      .order('date', { ascending: false });

    if (!data) return null;
    const match = data.find(n => n.metadata?.mateId === mateId && (n.metadata?.pairingStatus === 'pending' || n.metadata?.pairingStatus === 'approved'));
    if (!match) return null;

    return {
      id: match.id,
      mateId: match.metadata.mateId,
      mateName: match.metadata.mateName,
      mateEmail: match.metadata.mateEmail,
      mateRole: match.metadata.mateRole,
      leadEngineerId: match.metadata.leadEngineerId,
      leadEngineerName: match.metadata.leadEngineerName,
      vehicleReg: match.metadata.vehicleReg,
      pairingStatus: match.metadata.pairingStatus,
      requestedAt: match.metadata.requestedAt || match.date,
      respondedAt: match.metadata.respondedAt
    };
  },

  async getPairingsForLeadEngineer(engineerName: string): Promise<VanPairing[]> {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'van_pairing_request')
      .order('date', { ascending: false });

    if (!data) return [];
    const engLower = engineerName.trim().toLowerCase();
    
    // Group by mateId, keeping most recent
    const pairingsMap = new Map<string, VanPairing>();
    data.forEach(n => {
      if (n.metadata?.leadEngineerName && n.metadata.leadEngineerName.trim().toLowerCase() === engLower) {
        if (n.metadata.pairingStatus === 'pending' || n.metadata.pairingStatus === 'approved') {
          if (!pairingsMap.has(n.metadata.mateId)) {
            pairingsMap.set(n.metadata.mateId, {
              id: n.id,
              mateId: n.metadata.mateId,
              mateName: n.metadata.mateName,
              mateEmail: n.metadata.mateEmail,
              mateRole: n.metadata.mateRole,
              leadEngineerId: n.metadata.leadEngineerId,
              leadEngineerName: n.metadata.leadEngineerName,
              vehicleReg: n.metadata.vehicleReg,
              pairingStatus: n.metadata.pairingStatus,
              requestedAt: n.metadata.requestedAt || n.date,
              respondedAt: n.metadata.respondedAt
            });
          }
        }
      }
    });

    return Array.from(pairingsMap.values());
  },

  async getAllActivePairings(): Promise<VanPairing[]> {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'van_pairing_request')
      .order('date', { ascending: false });

    if (!data) return [];
    const pairingsMap = new Map<string, VanPairing>();
    data.forEach(n => {
      if (n.metadata?.mateId && (n.metadata.pairingStatus === 'pending' || n.metadata.pairingStatus === 'approved')) {
        if (!pairingsMap.has(n.metadata.mateId)) {
          pairingsMap.set(n.metadata.mateId, {
            id: n.id,
            mateId: n.metadata.mateId,
            mateName: n.metadata.mateName,
            mateEmail: n.metadata.mateEmail,
            mateRole: n.metadata.mateRole,
            leadEngineerId: n.metadata.leadEngineerId,
            leadEngineerName: n.metadata.leadEngineerName,
            vehicleReg: n.metadata.vehicleReg,
            pairingStatus: n.metadata.pairingStatus,
            requestedAt: n.metadata.requestedAt || n.date,
            respondedAt: n.metadata.respondedAt
          });
        }
      }
    });

    return Array.from(pairingsMap.values());
  },

  async respondToPairingRequest(notificationId: string, newStatus: "approved" | "rejected" | "revoked"): Promise<void> {
    const { data: n } = await supabase.from('notifications').select('*').eq('id', notificationId).single();
    if (!n) return;

    const updatedMetadata = {
      ...n.metadata,
      pairingStatus: newStatus,
      respondedAt: new Date().toISOString()
    };

    await supabase.from('notifications').update({
      metadata: updatedMetadata,
      status: "acknowledged"
    }).eq('id', notificationId);
  },

  async updateBottle(serial: string, updates: any): Promise<void> {
    const dbUpdates: any = {};
    if (updates.currentWeight !== undefined) dbUpdates.current_weight = updates.currentWeight;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.locationType) dbUpdates.location_type = updates.locationType;
    if (updates.locationId) dbUpdates.location_id = updates.locationId;
    if (updates.gasType) {
      dbUpdates.gas_type = updates.gasType;
      Promise.resolve(
        supabase.from('usage_logs').update({ gas_type: updates.gasType }).eq('serial', serial).is('gas_type', null)
      ).catch(() => {});
    }
    if (updates.category) dbUpdates.category = updates.category;
    if (updates.initialWeight !== undefined) dbUpdates.initial_weight = updates.initialWeight;
    if ("rentalExpiryDate" in updates) dbUpdates.rental_expiry_date = updates.rentalExpiryDate || null;
    if (updates.supplier !== undefined) dbUpdates.supplier = updates.supplier;
    if (updates.poNumber !== undefined) dbUpdates.po_number = updates.poNumber;
    if (updates.lastEngineer !== undefined) dbUpdates.last_engineer = updates.lastEngineer || null;

    await supabase.from('bottles').update(dbUpdates).eq('serial', serial);
  },

  async updateUserVehicle(userId: string, newReg: string): Promise<void> {
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!user) return;
    
    const oldReg = user.vehicle_reg || user.vehicleReg || "Unassigned";
    await supabase.from('users').update({ vehicle_reg: newReg }).eq('id', userId);
    
    const { data: userBottles } = await supabase.from('bottles')
      .select('serial')
      .eq('location_type', 'van')
      .or(`location_id.eq.${userId},location_id.ilike.%${user.name}%`);
    
    if (userBottles) {
      for (const b of userBottles) {
        await supabase.from('bottles').update({ 
          vehicle_reg: newReg,
          location_changed_at: new Date().toISOString()
        }).eq('serial', b.serial);
        
        await supabase.from('movement_logs').insert({
          serial: b.serial,
          action: "vehicle_transfer",
          from_location: `Van (${oldReg})`,
          to_location: `Van (${newReg})`,
          engineer: user.name,
          notes: `Cylinder transferred to new vehicle ${newReg}.`,
          vehicle_reg: newReg
        });
      }
    }
  },

  async updateUserEmployer(userId: string, employer: string): Promise<void> {
    await supabase.from('users').update({ employer }).eq('id', userId);
  },

  async updateUserName(userId: string, name: string): Promise<void> {
    await supabase.from('users').update({ name }).eq('id', userId);
  },

  async updateUserEmail(userId: string, email: string): Promise<void> {
    await supabase.from('users').update({ email }).eq('id', userId);
  },

  async updateUserPhone(userId: string, phone: string): Promise<void> {
    await supabase.from('users').update({ phone_number: phone }).eq('id', userId);
  },

  async logDecommission(record: {
    bottleSerial: string;
    jobNumber: string;
    siteName: string;
    siteAddress: string;
    sitePostcode: string;
    engineer: string;
    equipment: Array<{
      manufacturer: string;
      model: string;
      serial: string;
      weightRecovered: number;
    }>;
    gasType: string;
    totalWeightRecovered: number;
  }): Promise<string> {
    const id = `DECOM-${Math.floor(Math.random() * 100000)}`;
    const { error } = await supabase.from('decommissioned_equipment').insert({
      id,
      bottle_serial: record.bottleSerial,
      job_number: record.jobNumber,
      site_name: record.siteName,
      site_address: record.siteAddress,
      site_postcode: record.sitePostcode,
      engineer: record.engineer,
      equipment: record.equipment,
      gas_type: record.gasType,
      total_weight_recovered: record.totalWeightRecovered,
      date: new Date().toISOString()
    });
    if (error) {
      console.error('Error logging decommission:', error);
      throw error;
    }
    return id;
  },

  async getDecommissionsByBottleSerial(serial: string): Promise<any[]> {
    const { data } = await supabase
      .from('decommissioned_equipment')
      .select('*')
      .eq('bottle_serial', serial)
      .order('date', { ascending: false });
    return data ? data.map((d: any) => ({
      ...d,
      bottleSerial: d.bottle_serial || d.bottleSerial,
      jobNumber: d.job_number || d.jobNumber,
      siteName: d.site_name || d.siteName,
      siteAddress: d.site_address || d.siteAddress,
      sitePostcode: d.site_postcode || d.sitePostcode,
      gasType: d.gas_type || d.gasType,
      totalWeightRecovered: d.total_weight_recovered || d.totalWeightRecovered,
    })) : [];
  },

  async getAllDecommissions(): Promise<any[]> {
    const { data } = await supabase
      .from('decommissioned_equipment')
      .select('*')
      .order('date', { ascending: false });
    return data ? data.map((d: any) => ({
      ...d,
      bottleSerial: d.bottle_serial || d.bottleSerial,
      jobNumber: d.job_number || d.jobNumber,
      siteName: d.site_name || d.siteName,
      siteAddress: d.site_address || d.siteAddress,
      sitePostcode: d.site_postcode || d.sitePostcode,
      gasType: d.gas_type || d.gasType,
      totalWeightRecovered: d.total_weight_recovered || d.totalWeightRecovered,
    })) : [];
  },
  async ensureGas(name: string) {
    if (!name) return;
    const cleanName = name.trim().toUpperCase();
    
    // Check if exists
    const { data } = await supabase
      .from("gases")
      .select("name")
      .eq("name", cleanName)
      .single();

    if (!data) {
      await supabase.from("gases").insert({ name: cleanName });
    }
  },

  async getGases() {
    const { data } = await supabase
      .from("gases")
      .select("*")
      .order("sort_order", { nullsFirst: false })
      .order("name", { ascending: true });
    return data || [];
  },

  async getCompanySettings(): Promise<any> {
    const { data } = await supabase
      .from("company_settings")
      .select("*")
      .eq("id", "main")
      .single();
    if (!data) return { carrierReg: "CBDU368286", exemptionNo: "31Z 3725 34", companyName: "21 Degrees Ltd", companyAddress: "Unit 10, Apollo Court, Monkton Business Park, Hebburn", companyPostcode: "NE31 2ES", companyTel: "0191 5450545" };
    return {
      companyName: data.company_name,
      companyAddress: data.company_address,
      companyPostcode: data.company_postcode,
      companyTel: data.company_tel,
      carrierReg: data.carrier_reg,
      exemptionNo: data.exemption_no
    };
  },

  async saveCompanySettings(settings: {
    companyName?: string;
    companyAddress?: string;
    companyPostcode?: string;
    companyTel?: string;
    carrierReg?: string;
    exemptionNo?: string;
  }): Promise<void> {
    await supabase.from("company_settings").upsert({
      id: "main",
      company_name: settings.companyName,
      company_address: settings.companyAddress,
      company_postcode: settings.companyPostcode,
      company_tel: settings.companyTel,
      carrier_reg: settings.carrierReg,
      exemption_no: settings.exemptionNo,
      updated_at: new Date().toISOString()
    });
  },

  async getAllCrmJobs(): Promise<CrmJob[]> {
    // Supabase's max_rows defaults to 1000 per request, so we paginate in parallel
    // to fetch the full table in one round-trip-batch.
    const pageSize = 1000;
    const { count } = await supabase
      .from("crm_jobs")
      .select("*", { count: "exact", head: true });
    const total = count ?? 0;
    if (total === 0) return [];

    const pageCount = Math.ceil(total / pageSize);
    const requests = Array.from({ length: pageCount }, (_, i) =>
      supabase
        .from("crm_jobs")
        .select("*")
        .order("imported_at", { ascending: false })
        .range(i * pageSize, (i + 1) * pageSize - 1)
    );
    const results = await Promise.all(requests);
    const data = results.flatMap(r => r.data ?? []);
    return data.map((r: any) => ({
      id: r.id,
      jobNumber: r.job_number,
      jobNumberUnprefixed: r.job_number_unprefixed ?? "",
      prefix: r.prefix ?? "",
      customer: r.customer ?? "",
      siteTitle: r.site_title ?? "",
      siteAddress: r.site_address ?? "",
      sitePostcode: r.site_postcode ?? "",
      uprn: r.uprn ?? null,
      rawData: r.raw_data ?? {},
      importedAt: r.imported_at,
      startDate: r.start_date ?? "",
      category: r.category ?? "",
      faultCode: r.fault_code ?? "",
      jobTitle: r.job_title ?? ""
    }));
  },

  async upsertCrmJobs(jobs: Omit<CrmJob, "id" | "importedAt">[]): Promise<void> {
    const rows = jobs.map(j => ({
      job_number: j.jobNumber,
      job_number_unprefixed: j.jobNumberUnprefixed || (j.jobNumber || "").replace(/^[^0-9]+/, ""),
      prefix: j.prefix ?? null,
      customer: j.customer,
      site_title: j.siteTitle,
      site_address: j.siteAddress,
      site_postcode: j.sitePostcode,
      uprn: j.uprn ?? null,
      raw_data: j.rawData,
      start_date: j.startDate ?? null,
      category: j.category ?? null,
      fault_code: j.faultCode ?? null,
      job_title: j.jobTitle ?? null
    }));
    const { error } = await supabase
      .from("crm_jobs")
      // ignoreDuplicates: existing job numbers are never overwritten on import
      .upsert(rows, { onConflict: "job_number", ignoreDuplicates: true });
    if (error) throw error;
  },

  async updateCrmJobUprn(id: string, uprn: string): Promise<void> {
    await supabase.from("crm_jobs").update({ uprn }).eq("id", id);
  },

  async updateCrmJob(id: string, updates: Partial<Omit<CrmJob, "id" | "importedAt" | "rawData">>): Promise<void> {
    const d: any = {};
    if (updates.prefix       !== undefined) d.prefix        = updates.prefix;
    if (updates.customer     !== undefined) d.customer      = updates.customer;
    if (updates.siteTitle    !== undefined) d.site_title    = updates.siteTitle;
    if (updates.siteAddress  !== undefined) d.site_address  = updates.siteAddress;
    if (updates.sitePostcode !== undefined) d.site_postcode = updates.sitePostcode;
    if (updates.startDate    !== undefined) d.start_date    = updates.startDate;
    if (updates.category     !== undefined) d.category      = updates.category;
    if (updates.faultCode    !== undefined) d.fault_code    = updates.faultCode;
    if (updates.jobTitle     !== undefined) d.job_title     = updates.jobTitle;
    if (updates.uprn         !== undefined) d.uprn          = updates.uprn;
    if (updates.jobNumber    !== undefined) d.job_number    = updates.jobNumber;
    if (updates.jobNumberUnprefixed !== undefined) d.job_number_unprefixed = updates.jobNumberUnprefixed;
    await supabase.from("crm_jobs").update(d).eq("id", id);
  },

  async getCrmJobsByNumbers(jobNumbers: string[]): Promise<CrmJob[]> {
    if (!jobNumbers.length) return [];
    const { data } = await supabase
      .from("crm_jobs")
      .select("*")
      .in("job_number", jobNumbers);
    return data ? data.map((r: any) => ({
      id: r.id,
      jobNumber: r.job_number,
      jobNumberUnprefixed: r.job_number_unprefixed ?? "",
      prefix: r.prefix ?? "",
      customer: r.customer ?? "",
      siteTitle: r.site_title ?? "",
      siteAddress: r.site_address ?? "",
      sitePostcode: r.site_postcode ?? "",
      uprn: r.uprn ?? null,
      rawData: r.raw_data ?? {},
      importedAt: r.imported_at,
      startDate: r.start_date ?? "",
      category: r.category ?? "",
      faultCode: r.fault_code ?? "",
      jobTitle: r.job_title ?? ""
    })) : [];
  },

  async getCrmJobByNumber(jobNumber: string): Promise<CrmJob | null> {
    const clean = (jobNumber || "").trim().replace(/\s+/g, "");
    if (!clean) return null;

    // 1. Exact case-insensitive match on job_number in crm_jobs
    let { data } = await supabase
      .from("crm_jobs")
      .select("*")
      .ilike("job_number", clean)
      .limit(1)
      .maybeSingle();

    // 2. Fallback to unprefixed number match in crm_jobs only
    if (!data) {
      const unprefixed = clean.replace(/^[^0-9]+/, "");
      if (unprefixed) {
        const res = await supabase
          .from("crm_jobs")
          .select("*")
          .or(`job_number_unprefixed.eq.${unprefixed},job_number.ilike.${unprefixed}`)
          .limit(1)
          .maybeSingle();
        data = res.data;
      }
    }

    if (!data) return null;
    return {
      id: data.id, jobNumber: data.job_number, jobNumberUnprefixed: data.job_number_unprefixed ?? "",
      prefix: data.prefix ?? "",
      customer: data.customer ?? "", siteTitle: data.site_title ?? "",
      siteAddress: data.site_address ?? "", sitePostcode: data.site_postcode ?? "",
      uprn: data.uprn ?? null, rawData: data.raw_data ?? {}, importedAt: data.imported_at,
      startDate: data.start_date ?? "", category: data.category ?? "",
      faultCode: data.fault_code ?? "", jobTitle: data.job_title ?? ""
    };
  },

  async getUsageLogsBySiteRef(siteRef: string): Promise<UsageLog[]> {
    const { data } = await supabase
      .from("usage_logs").select("*").eq("site_ref", siteRef).order("date", { ascending: true });
    return data ? data.map(mapUsage) : [];
  },

  async getDecommissionsByJobNumber(jobNumber: string): Promise<any[]> {
    const { data } = await supabase
      .from("decommissioned_equipment").select("*").eq("job_number", jobNumber).order("date", { ascending: false });
    return data ? data.map((d: any) => ({
      ...d,
      bottleSerial: d.bottle_serial, jobNumber: d.job_number, siteName: d.site_name,
      siteAddress: d.site_address, sitePostcode: d.site_postcode,
      gasType: d.gas_type, totalWeightRecovered: d.total_weight_recovered
    })) : [];
  },

  async getHWCNsBySerials(serials: string[]): Promise<any[]> {
    if (!serials.length) return [];
    const { data } = await supabase.from("hwcns").select("*").in("serial", serials);
    return data ? data.map(mapHWCN) : [];
  },

  async getBottlesBySerials(serials: string[]): Promise<Bottle[]> {
    if (!serials.length) return [];
    const { data } = await supabase.from("bottles").select("*").in("serial", serials);
    const bottles = data ? data.map(mapBottle) : [];
    await reconcileEmptyWasteBottles(bottles);
    return bottles;
  },

  async purgeBottleWithLogs(serial: string, archivedBy?: string, reason?: string): Promise<void> {
    const s = (serial || "").trim();
    if (!s) return;
    const now = new Date().toISOString();
    const by = archivedBy || "Admin";
    const archiveReason = reason || "Archived by administrator (5-year F-Gas statutory retention)";
    try {
      const { data: b } = await supabase.from('bottles').select('*').ilike('serial', s).single();
      const currentLocation = b?.location_id || b?.locationId || 'Unknown';

      // Soft archive bottle in bottles table (never delete historical records)
      await supabase.from('bottles').update({
        status: 'archived',
        archived_at: now,
        archived_by: by,
        archive_reason: archiveReason
      }).ilike('serial', s);

      // Append immutable movement log for 5-year F-Gas audit compliance
      await supabase.from('movement_logs').insert({
        serial: s,
        action: 'archived',
        from_location: currentLocation,
        to_location: 'Archived (Retention)',
        engineer: by,
        notes: archiveReason
      });
    } catch (err) {
      console.error(`Error archiving bottle ${s}:`, err);
    }
  },

  async deleteEquipmentItem(serialToDel: string, mfrToDel: string, mdlToDel: string, archivedBy?: string, reason?: string): Promise<void> {
    const sTarget = (serialToDel || "").toLowerCase().trim();
    const mTarget = (mfrToDel || "").toLowerCase().trim();
    const mdlTarget = (mdlToDel || "").toLowerCase().trim();
    const now = new Date().toISOString();
    const by = archivedBy || "Admin";
    const rsn = reason || "Equipment archived (retained in 5-year F-Gas audit history)";

    // Soft-archive in dedicated equipment store
    await this.archiveEquipment(serialToDel || `${mfrToDel}-${mdlToDel}`, by, rsn);

    // Soft-archive matching equipment objects inside usage_logs without deleting logs
    const { data: logs } = await supabase.from('usage_logs').select('*');
    if (logs) {
      for (const log of logs) {
        const eqList: any[] = Array.isArray(log.equipment_details) ? log.equipment_details : Array.isArray(log.equipmentDetails) ? log.equipmentDetails : [];
        if (!eqList.length) continue;

        let modified = false;
        const updated = eqList.map(eq => {
          const sn = (eq.serial || "").toLowerCase().trim();
          const mfr = (eq.manufacturer || "").toLowerCase().trim();
          const mdl = (eq.model || "").toLowerCase().trim();

          const match = (sTarget && sn === sTarget) || (mTarget && mdlTarget && mfr === mTarget && mdl === mdlTarget);
          if (match && !eq.archived) {
            modified = true;
            return {
              ...eq,
              archived: true,
              archivedAt: now,
              archivedBy: by,
              archiveReason: rsn
            };
          }
          return eq;
        });

        if (modified) {
          await supabase.from('usage_logs').update({ equipment_details: updated }).eq('id', log.id);
        }
      }
    }

    // Soft-archive matching equipment in decommissioned_equipment
    const { data: decoms } = await supabase.from('decommissioned_equipment').select('*');
    if (decoms) {
      for (const d of decoms) {
        const eqList: any[] = Array.isArray(d.equipment) ? d.equipment : [];
        if (!eqList.length) continue;
        let modified = false;
        const updated = eqList.map(eq => {
          const sn = (eq.serial || "").toLowerCase().trim();
          const mfr = (eq.manufacturer || "").toLowerCase().trim();
          const mdl = (eq.model || "").toLowerCase().trim();
          const match = (sTarget && sn === sTarget) || (mTarget && mdlTarget && mfr === mTarget && mdl === mdlTarget);
          if (match && !eq.archived) {
            modified = true;
            return {
              ...eq,
              archived: true,
              archivedAt: now,
              archivedBy: by,
              archiveReason: rsn
            };
          }
          return eq;
        });

        if (modified) {
          await supabase.from('decommissioned_equipment').update({ equipment: updated }).eq('id', d.id);
        }
      }
    }
  },

  async getEquipmentList(): Promise<EquipmentItem[]> {
    const dedicated: Record<string, EquipmentItem> = getStored("equipment_register", {});
    const usageLogs = await this.getUsageLogsWithEquipment();
    const merged: Record<string, EquipmentItem> = { ...dedicated };

    for (const log of usageLogs) {
      const items: any[] = Array.isArray(log.equipment_details) ? log.equipment_details : [];
      for (const eq of items) {
        const serial = (eq.serial || "").trim();
        const mfr = (eq.manufacturer || "").trim();
        const mdl = (eq.model || "").trim();
        const key = (serial || `${mfr}-${mdl}`).toUpperCase();
        if (!key) continue;

        const isLeakTest = log.job_type === "leak_test";
        const logDate = log.date;

        if (!merged[key]) {
          const nominalChargeKg = eq.nominalChargeKg || eq.weight || 0;
          const gasType = log.gas_type || "R410A";
          const co2eTonnes = calculateCO2e(gasType, nominalChargeKg);
          const hermeticallySealed = eq.hermeticallySealed ?? false;
          const { intervalMonths } = calculateLeakCheckInterval(co2eTonnes, hermeticallySealed);

          let nextDue: string | undefined = undefined;
          if (intervalMonths > 0 && logDate) {
            const d = new Date(logDate);
            d.setMonth(d.getMonth() + intervalMonths);
            nextDue = d.toISOString();
          }

          merged[key] = {
            id: key,
            serial: serial || key,
            manufacturer: mfr || "Unknown",
            model: mdl || "Unknown",
            gasType,
            nominalChargeKg,
            co2eTonnes,
            hermeticallySealed,
            leakCheckIntervalMonths: intervalMonths,
            lastLeakCheckDate: isLeakTest ? logDate : undefined,
            nextLeakCheckDueDate: nextDue,
            archived: eq.archived || false,
            archivedAt: eq.archivedAt,
            archivedBy: eq.archivedBy,
            archiveReason: eq.archiveReason
          };
        } else {
          if (isLeakTest && (!merged[key].lastLeakCheckDate || new Date(logDate) > new Date(merged[key].lastLeakCheckDate!))) {
            merged[key].lastLeakCheckDate = logDate;
            if (merged[key].leakCheckIntervalMonths && merged[key].leakCheckIntervalMonths! > 0) {
              const d = new Date(logDate);
              d.setMonth(d.getMonth() + merged[key].leakCheckIntervalMonths!);
              merged[key].nextLeakCheckDueDate = d.toISOString();
            }
          }
        }
      }
    }

    return Object.values(merged);
  },

  async saveEquipmentItem(item: Partial<EquipmentItem> & { serial?: string; model?: string; manufacturer?: string }): Promise<EquipmentItem> {
    const dedicated: Record<string, EquipmentItem> = getStored("equipment_register", {});
    const key = (item.id || item.serial || `${item.manufacturer || ''}-${item.model || ''}`).toUpperCase();
    const existing = dedicated[key] || {} as Partial<EquipmentItem>;

    const gasType = item.gasType || existing.gasType || "R410A";
    const nominalChargeKg = item.nominalChargeKg ?? existing.nominalChargeKg ?? 0;
    const co2eTonnes = calculateCO2e(gasType, nominalChargeKg);
    const hermeticallySealed = item.hermeticallySealed ?? existing.hermeticallySealed ?? false;
    const { intervalMonths } = calculateLeakCheckInterval(co2eTonnes, hermeticallySealed);

    let nextDue = item.nextLeakCheckDueDate || existing.nextLeakCheckDueDate;
    const lastCheck = item.lastLeakCheckDate || existing.lastLeakCheckDate;
    if (intervalMonths > 0 && lastCheck) {
      const d = new Date(lastCheck);
      d.setMonth(d.getMonth() + intervalMonths);
      nextDue = d.toISOString();
    }

    const updated: EquipmentItem = {
      id: key,
      serial: item.serial || existing.serial || key,
      manufacturer: item.manufacturer || existing.manufacturer || "Unknown",
      model: item.model || existing.model || "Unknown",
      gasType,
      nominalChargeKg,
      co2eTonnes,
      hermeticallySealed,
      leakCheckIntervalMonths: intervalMonths,
      lastLeakCheckDate: lastCheck,
      nextLeakCheckDueDate: nextDue,
      notes: item.notes ?? existing.notes,
      archived: item.archived ?? existing.archived ?? false,
      archivedAt: item.archivedAt ?? existing.archivedAt,
      archivedBy: item.archivedBy ?? existing.archivedBy,
      archiveReason: item.archiveReason ?? existing.archiveReason
    };

    dedicated[key] = updated;
    setStored("equipment_register", dedicated);
    return updated;
  },

  async archiveEquipment(id: string, archivedBy?: string, reason?: string): Promise<void> {
    const key = (id || "").toUpperCase();
    const dedicated: Record<string, EquipmentItem> = getStored("equipment_register", {});
    if (dedicated[key]) {
      dedicated[key] = {
        ...dedicated[key],
        archived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: archivedBy || "Admin",
        archiveReason: reason || "Archived by user"
      };
      setStored("equipment_register", dedicated);
    }
  },

  async recordLeakCheck(serial: string, date: string, engineer: string, notes?: string): Promise<void> {
    const key = (serial || "").toUpperCase();
    const dedicated: Record<string, EquipmentItem> = getStored("equipment_register", {});
    const existing = dedicated[key];
    const checkDate = date || new Date().toISOString();

    let nextDue: string | undefined = undefined;
    if (existing?.leakCheckIntervalMonths && existing.leakCheckIntervalMonths > 0) {
      const d = new Date(checkDate);
      d.setMonth(d.getMonth() + existing.leakCheckIntervalMonths);
      nextDue = d.toISOString();
    }

    if (existing) {
      dedicated[key] = {
        ...existing,
        lastLeakCheckDate: checkDate,
        nextLeakCheckDueDate: nextDue,
        notes: notes ? `${existing.notes ? existing.notes + " | " : ""}${notes}` : existing.notes
      };
      setStored("equipment_register", dedicated);
    }
  },

  async purgeTestEquipmentData(): Promise<{ deletedLogs: number; updatedLogs: number; deletedJobs: number }> {
    const testSerials = ["sjsbs", "jbn", "usheh", "fxc", "hbb"];

    let deletedLogs = 0;
    let updatedLogs = 0;
    let deletedJobs = 0;

    try {
      // Purge test bottles PHTEST1 and PHTEST3
      await this.purgeBottleWithLogs("PHTEST1");
      await this.purgeBottleWithLogs("PHTEST3");

      const { data: logs } = await supabase.from('usage_logs').select('*');
      if (logs && logs.length > 0) {
        for (const log of logs) {
          const siteRef = (log.site_ref || log.siteRef || "").toLowerCase();
          const eqList: any[] = Array.isArray(log.equipment_details) ? log.equipment_details : Array.isArray(log.equipmentDetails) ? log.equipmentDetails : [];

          const isTestJob = siteRef.includes("test1");
          const hasTestEq = eqList.some(eq => {
            const sn = (eq.serial || "").toLowerCase();
            const mfr = (eq.manufacturer || "").toLowerCase();
            const mdl = (eq.model || "").toLowerCase();
            return testSerials.some(t => sn.includes(t) || mfr.includes(t) || mdl.includes(t));
          });

          if (isTestJob) {
            await supabase.from('usage_logs').delete().eq('id', log.id);
            deletedLogs++;
          } else if (hasTestEq) {
            const filteredEq = eqList.filter(eq => {
              const sn = (eq.serial || "").toLowerCase();
              const mfr = (eq.manufacturer || "").toLowerCase();
              const mdl = (eq.model || "").toLowerCase();
              return !testSerials.some(t => sn.includes(t) || mfr.includes(t) || mdl.includes(t));
            });

            if (filteredEq.length === 0) {
              await supabase.from('usage_logs').delete().eq('id', log.id);
              deletedLogs++;
            } else {
              await supabase.from('usage_logs').update({ equipment_details: filteredEq }).eq('id', log.id);
              updatedLogs++;
            }
          }
        }
      }

      // Purge Test1 CRM Job
      const { data: jobs } = await supabase.from('crm_jobs').select('*');
      if (jobs && jobs.length > 0) {
        for (const job of jobs) {
          const numStr = (job.job_number || job.jobNumber || "").toLowerCase();
          const titleStr = (job.site_title || job.siteTitle || "").toLowerCase();
          if (numStr.includes("test1") || titleStr.includes("test1")) {
            await supabase.from('crm_jobs').delete().eq('job_number', job.job_number || job.jobNumber);
            deletedJobs++;
          }
        }
      }

      // Purge Decommission records
      const { data: decoms } = await supabase.from('decommissioned_equipment').select('*');
      if (decoms && decoms.length > 0) {
        for (const d of decoms) {
          const jobStr = (d.job_number || d.jobNumber || d.site_ref || d.siteRef || "").toLowerCase();
          const eqList: any[] = Array.isArray(d.equipment) ? d.equipment : [];
          const hasTestEq = eqList.some(eq => {
            const sn = (eq.serial || "").toLowerCase();
            const mfr = (eq.manufacturer || "").toLowerCase();
            const mdl = (eq.model || "").toLowerCase();
            return testSerials.some(t => sn.includes(t) || mfr.includes(t) || mdl.includes(t));
          });

          if (jobStr.includes("test1") || hasTestEq) {
            await supabase.from('decommissioned_equipment').delete().eq('id', d.id);
          }
        }
      }
    } catch (err) {
      console.error("Error purging test equipment data:", err);
    }

    return { deletedLogs, updatedLogs, deletedJobs };
  },

  async reclassifyReclaimToRecycled(data: {
    serial: string;
    gasType: string;
    currentWeight: number;
    initialWeight: number;
    performedBy: string;
    notes?: string;
  }): Promise<void> {
    const { data: bottle } = await supabase.from('bottles').select('*').eq('serial', data.serial).single();
    if (!bottle) throw new Error("Cylinder not found");
    if (bottle.location_type !== "office") {
      throw new Error("Only cylinders physically located in Stores can be reclassified.");
    }
    if (bottle.category !== "reclaim") {
      throw new Error("Only reclaim cylinders can be reclassified to recycled.");
    }

    const prevWeight = bottle.current_weight ?? 0;
    const prevGas = bottle.gas_type ?? "Unknown";

    const { error: updateError } = await supabase.from('bottles').update({
      category: 'recycled',
      gas_type: data.gasType,
      current_weight: data.currentWeight,
      initial_weight: data.initialWeight,
      status: data.currentWeight > 0 ? 'active' : 'empty',
      producer_sites: [],
      active_hwcn: null,
      intended_destination: null,
      intended_location_type: null,
      location_changed_at: new Date().toISOString()
    }).eq('serial', data.serial);

    if (updateError) throw updateError;

    const logNotes = data.notes 
      ? `Reclassified from Reclaim (${prevGas}, ${prevWeight}kg) to Recycled (${data.gasType}, ${data.currentWeight}kg). Notes: ${data.notes}`
      : `Reclassified from Reclaim (${prevGas}, ${prevWeight}kg) to Recycled (${data.gasType}, ${data.currentWeight}kg). Cleaned & filtered for reuse.`;

    await supabase.from('movement_logs').insert({
      serial: data.serial,
      action: 'reclassified_recycled',
      from_location: 'HQ-Stores (Reclaim)',
      to_location: 'HQ-Stores (Recycled)',
      engineer: data.performedBy,
      notes: logNotes
    });
  },

  async transferGasReclaimToRecycled(data: {
    donorSerial: string;
    recipientSerial: string;
    transferWeight: number;
    performedBy: string;
    notes?: string;
    isFullyEvacuated?: boolean;
  }): Promise<void> {
    if (data.transferWeight <= 0) throw new Error("Transfer weight must be greater than 0 kg");

    const [{ data: donor }, { data: recipient }] = await Promise.all([
      supabase.from('bottles').select('*').eq('serial', data.donorSerial).single(),
      supabase.from('bottles').select('*').eq('serial', data.recipientSerial).single()
    ]);

    if (!donor) throw new Error("Donor reclaim bottle not found");
    if (!recipient) throw new Error("Recipient recycled bottle not found");

    if (donor.location_type !== "office") {
      throw new Error("Donor bottle must be physically located in Stores.");
    }
    if (recipient.location_type !== "office") {
      throw new Error("Recipient recycled bottle must be physically located in Stores.");
    }
    if (donor.category !== "reclaim") {
      throw new Error("Donor cylinder must be a Reclaim category cylinder.");
    }
    if (recipient.category !== "recycled") {
      throw new Error("Recipient cylinder must already be classified as a Recycled bottle.");
    }

    const donorWeight = parseFloat(donor.current_weight || 0);
    if (donorWeight < data.transferWeight) {
      throw new Error(`Insufficient gas in donor bottle. Available: ${donorWeight.toFixed(2)}kg, Requested: ${data.transferWeight.toFixed(2)}kg`);
    }

    const recipientWeight = parseFloat(recipient.current_weight || 0);
    const recipientCapacity = parseFloat(recipient.initial_weight || 20);
    const newRecipientWeight = Number((recipientWeight + data.transferWeight).toFixed(2));
    if (newRecipientWeight > recipientCapacity) {
      const spaceLeft = Math.max(0, recipientCapacity - recipientWeight);
      throw new Error(`Transfer exceeds recipient cylinder capacity (${recipientCapacity}kg). Available space: ${spaceLeft.toFixed(2)}kg`);
    }

    const newDonorWeight = Math.max(0, Number((donorWeight - data.transferWeight).toFixed(2)));
    const donorStatus = newDonorWeight === 0 && data.isFullyEvacuated ? "empty" : "active";

    // Update donor bottle
    const donorUpdate: any = {
      current_weight: newDonorWeight,
      status: donorStatus
    };
    if (newDonorWeight === 0 && data.isFullyEvacuated) {
      donorUpdate.producer_sites = [];
      donorUpdate.gas_type = "Empty / Evacuated";
    }
    const { error: donorErr } = await supabase.from('bottles').update(donorUpdate).eq('serial', data.donorSerial);
    if (donorErr) throw donorErr;

    // Update recipient bottle
    const { error: recipientErr } = await supabase.from('bottles').update({
      current_weight: newRecipientWeight,
      status: 'active'
    }).eq('serial', data.recipientSerial);
    if (recipientErr) throw recipientErr;

    const baseNotes = data.notes ? ` Notes: ${data.notes}` : "";

    const evacNote = newDonorWeight === 0
      ? data.isFullyEvacuated
        ? " Donor cylinder fully emptied & evacuated (vacced) — reset to Empty / Evacuated (ready for any waste refrigerant)."
        : ` Donor cylinder emptied of weighed gas but residual gas remains (not vacced) — retained ${donor.gas_type || 'original'} gas classification.`
      : ` Remaining: ${newDonorWeight}kg.`;

    // Insert movement logs on both bottles
    await Promise.all([
      supabase.from('movement_logs').insert({
        serial: data.donorSerial,
        action: 'workshop_decant_out',
        from_location: 'HQ-Stores',
        to_location: `Decanted to ${data.recipientSerial}`,
        engineer: data.performedBy,
        notes: `Transferred ${data.transferWeight}kg filtered ${recipient.gas_type || 'gas'} to Recycled cylinder ${data.recipientSerial}.${evacNote}${baseNotes}`
      }),
      supabase.from('movement_logs').insert({
        serial: data.recipientSerial,
        action: 'workshop_decant_in',
        from_location: `Decanted from ${data.donorSerial}`,
        to_location: 'HQ-Stores',
        engineer: data.performedBy,
        notes: `Received ${data.transferWeight}kg cleaned/filtered gas from Reclaim cylinder ${data.donorSerial}. New balance: ${newRecipientWeight}kg.${baseNotes}`
      })
    ]);
  },

  async getBrazingInventory(holderType?: BrazingHolderType, holderId?: string): Promise<BrazingInventoryItem[]> {
    try {
      let query = supabase.from('brazing_inventory').select('*');
      if (holderType) query = query.eq('holder_type', holderType);
      if (holderId) {
        query = query.or(`holder_id.eq.${holderId},holder_name.ilike.%${holderId}%`);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map(mapBrazingInventory);
      }
    } catch (e) {
      console.warn("Could not query brazing_inventory from supabase, using fallback", e);
    }

    const all = getStored<BrazingInventoryItem[]>('brazing_inventory', []);
    return all.filter(item => {
      if (holderType && item.holderType !== holderType) return false;
      if (holderId && item.holderId !== holderId && item.holderName?.toLowerCase() !== holderId.toLowerCase()) return false;
      return true;
    });
  },

  async getBrazingSummary(): Promise<{
    totalOxygen: number;
    totalPropane: number;
    vansOxygen: number;
    vansPropane: number;
    storesOxygen: number;
    storesPropane: number;
  }> {
    const items = await this.getBrazingInventory();
    let vansOxygen = 0;
    let vansPropane = 0;
    let storesOxygen = 0;
    let storesPropane = 0;

    for (const item of items) {
      if (item.gasType === 'Oxygen') {
        if (item.holderType === 'engineer') vansOxygen += item.quantity;
        else storesOxygen += item.quantity;
      } else if (item.gasType === 'Propane') {
        if (item.holderType === 'engineer') vansPropane += item.quantity;
        else storesPropane += item.quantity;
      }
    }

    return {
      totalOxygen: vansOxygen + storesOxygen,
      totalPropane: vansPropane + storesPropane,
      vansOxygen,
      vansPropane,
      storesOxygen,
      storesPropane,
    };
  },

  async getBrazingExchanges(filters?: { engineerId?: string; gasType?: string; limit?: number }): Promise<BrazingExchange[]> {
    try {
      let query = supabase.from('brazing_exchanges').select('*').order('exchange_date', { ascending: false });
      if (filters?.engineerId) query = query.eq('engineer_id', filters.engineerId);
      if (filters?.gasType) query = query.eq('gas_type', filters.gasType);
      if (filters?.limit) query = query.limit(filters.limit);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map(mapBrazingExchange);
      }
    } catch (e) {
      console.warn("Could not query brazing_exchanges from supabase, using fallback", e);
    }

    const all = getStored<BrazingExchange[]>('brazing_exchanges', []);
    return all.filter(e => {
      if (filters?.engineerId && e.engineerId !== filters.engineerId) return false;
      if (filters?.gasType && e.gasType !== filters.gasType) return false;
      return true;
    }).slice(0, filters?.limit || 100);
  },

  async logBrazingExchange(exchange: Omit<BrazingExchange, 'id' | 'createdAt'>): Promise<BrazingExchange> {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `braze-${Date.now()}`;
    const now = new Date().toISOString();
    const entry: BrazingExchange = {
      ...exchange,
      id: newId,
      createdAt: now,
    };

    // 1. Supabase insert
    try {
      await supabase.from('brazing_exchanges').insert({
        id: entry.id,
        created_at: entry.createdAt,
        exchange_date: entry.exchangeDate,
        engineer_id: entry.engineerId,
        engineer_name: entry.engineerName,
        gas_type: entry.gasType,
        supplier: entry.supplier,
        action_type: entry.actionType,
        quantity: entry.quantity,
        reason: entry.reason,
        po_number: entry.poNumber,
        branch: entry.branch,
        receipt_photo_url: entry.receiptPhotoUrl,
        notes: entry.notes,
        logged_by: entry.loggedBy || entry.engineerName
      });
    } catch (e) {
      console.warn("Failed inserting brazing exchange into supabase:", e);
    }

    // 2. Local fallback update for exchanges
    const currentExchanges = getStored<BrazingExchange[]>('brazing_exchanges', []);
    setStored('brazing_exchanges', [entry, ...currentExchanges]);

    // 3. Update inventory balances
    const items = await this.getBrazingInventory('engineer', entry.engineerId);
    const existing = items.find(i => i.gasType === entry.gasType);

    if (entry.actionType === 'purchase_new') {
      const newQty = (existing ? existing.quantity : 0) + entry.quantity;
      await this.setBrazingInventory({
        holderType: 'engineer',
        holderId: entry.engineerId,
        holderName: entry.engineerName,
        gasType: entry.gasType,
        quantity: newQty
      });
    } else if (entry.actionType === 'swap_empty_for_full') {
      // 1-for-1 swap: if no inventory item existed yet, initialize to at least the swapped quantity
      if (!existing || existing.quantity === 0) {
        await this.setBrazingInventory({
          holderType: 'engineer',
          holderId: entry.engineerId,
          holderName: entry.engineerName,
          gasType: entry.gasType,
          quantity: Math.max(1, entry.quantity)
        });
      }
    }

    return entry;
  },

  async setBrazingInventory(params: {
    holderType: BrazingHolderType;
    holderId: string;
    holderName: string;
    vehicleReg?: string;
    gasType: BrazingGasType;
    quantity: number;
  }): Promise<void> {
    const now = new Date().toISOString();
    try {
      await supabase.from('brazing_inventory').upsert({
        holder_type: params.holderType,
        holder_id: params.holderId,
        holder_name: params.holderName,
        vehicle_reg: params.vehicleReg,
        gas_type: params.gasType,
        quantity: Math.max(0, params.quantity),
        updated_at: now
      }, { onConflict: 'holder_type,holder_id,gas_type' });
    } catch (e) {
      console.warn("Supabase upsert brazing_inventory failed:", e);
    }

    const all = getStored<BrazingInventoryItem[]>('brazing_inventory', []);
    const idx = all.findIndex(i => i.holderType === params.holderType && i.holderId === params.holderId && i.gasType === params.gasType);
    if (idx >= 0) {
      all[idx] = {
        ...all[idx],
        holderName: params.holderName,
        vehicleReg: params.vehicleReg || all[idx].vehicleReg,
        quantity: Math.max(0, params.quantity),
        updatedAt: now
      };
    } else {
      all.push({
        id: `braze-inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        holderType: params.holderType,
        holderId: params.holderId,
        holderName: params.holderName,
        vehicleReg: params.vehicleReg,
        gasType: params.gasType,
        quantity: Math.max(0, params.quantity),
        updatedAt: now
      });
    }
    setStored('brazing_inventory', all);
  },

  async transferBrazingWithStores(params: {
    engineerId: string;
    engineerName: string;
    vehicleReg?: string;
    gasType: BrazingGasType;
    direction: 'pickup_from_stores' | 'return_to_stores';
    quantity: number;
    notes?: string;
  }): Promise<BrazingExchange> {
    const qty = Math.max(1, params.quantity);
    const engInventory = await this.getBrazingInventory('engineer', params.engineerId);
    const storesInventory = await this.getBrazingInventory('stores', 'stores');

    const engItem = engInventory.find(i => i.gasType === params.gasType);
    const currentEngQty = engItem !== undefined ? engItem.quantity : 1;

    const storesItem = storesInventory.find(i => i.gasType === params.gasType);
    const currentStoresQty = storesItem !== undefined ? storesItem.quantity : 0;

    let newEngQty = currentEngQty;
    let newStoresQty = currentStoresQty;
    let summaryText = "";

    if (params.direction === 'pickup_from_stores') {
      newEngQty = currentEngQty + qty;
      newStoresQty = Math.max(0, currentStoresQty - qty);
      summaryText = `Picked up ${qty}x ${params.gasType} cylinder${qty > 1 ? 's' : ''} from Stores onto van.`;
    } else {
      newEngQty = Math.max(0, currentEngQty - qty);
      newStoresQty = currentStoresQty + qty;
      summaryText = `Returned ${qty}x ${params.gasType} cylinder${qty > 1 ? 's' : ''} from van to Stores.`;
    }

    // 1. Update engineer van balance
    await this.setBrazingInventory({
      holderType: 'engineer',
      holderId: params.engineerId,
      holderName: params.engineerName,
      vehicleReg: params.vehicleReg,
      gasType: params.gasType,
      quantity: newEngQty
    });

    // 2. Update stores balance
    await this.setBrazingInventory({
      holderType: 'stores',
      holderId: 'stores',
      holderName: 'HQ Stores / Main Base',
      gasType: params.gasType,
      quantity: newStoresQty
    });

    // 3. Log exchange / audit record
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `braze-${Date.now()}`;
    const now = new Date().toISOString();
    const entry: BrazingExchange = {
      id: newId,
      createdAt: now,
      exchangeDate: now,
      engineerId: params.engineerId,
      engineerName: params.engineerName,
      gasType: params.gasType,
      supplier: 'HQ Stores',
      actionType: 'transfer_stores',
      quantity: qty,
      reason: summaryText,
      notes: params.notes ? `${summaryText} Note: ${params.notes}` : summaryText,
      loggedBy: params.engineerName
    };

    try {
      await supabase.from('brazing_exchanges').insert({
        id: entry.id,
        created_at: entry.createdAt,
        exchange_date: entry.exchangeDate,
        engineer_id: entry.engineerId,
        engineer_name: entry.engineerName,
        gas_type: entry.gasType,
        supplier: entry.supplier,
        action_type: entry.actionType,
        quantity: entry.quantity,
        reason: entry.reason,
        notes: entry.notes,
        logged_by: entry.loggedBy
      });
    } catch (e) {
      console.warn("Failed inserting brazing stores transfer into supabase:", e);
    }

    const currentExchanges = getStored<BrazingExchange[]>('brazing_exchanges', []);
    setStored('brazing_exchanges', [entry, ...currentExchanges]);

    return entry;
  }
};

export interface CrmJob {
  id: string;
  jobNumber: string;
  jobNumberUnprefixed: string;
  prefix: string;
  customer: string;
  siteTitle: string;
  siteAddress: string;
  sitePostcode: string;
  uprn: string | null;
  rawData: Record<string, any>;
  importedAt: string;
  startDate: string;
  category: string;
  faultCode: string;
  jobTitle: string;
}
