import { supabase } from "./supabaseClient";

export type BottleCategory = "new" | "reclaim" | "nitrogen";
export type LocationType = "van" | "site" | "supplier" | "office";
export type UserRole = "admin" | "office" | "engineer";
export type UserStatus = "pending" | "approved" | "disabled" | "rejected";

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
}

// Mapping helpers for Supabase (snake_case) to Frontend (camelCase)
const mapUser = (u: any): AppUser => ({
  ...u,
  availableRoles: u.available_roles || u.availableRoles || [],
  vehicleReg: u.vehicle_reg || u.vehicleReg,
  phone: u.phone_number || u.phone,
  createdAt: u.created_at || u.createdAt
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
  lastEngineer: b.last_engineer || b.lastEngineer
});

const mapMovement = (m: any): MovementLog => ({
  ...m,
  from: m.from_location || m.from,
  to: m.to_location || m.to,
  vehicleReg: m.vehicle_reg || m.vehicleReg
});

const mapUsage = (u: any): UsageLog => ({
  ...u,
  jobType: u.job_type || u.jobType,
  siteRef: u.site_ref || u.siteRef,
  siteName: u.site_name || u.siteName,
  siteAddress: u.site_address || u.siteAddress,
  weightUsed: u.weight_used || u.weightUsed,
  weightBefore: u.weight_before || u.weightBefore,
  weightAfter: u.weight_after || u.weightAfter
});

const mapHWCN = (h: any): any => ({
  ...h,
  hwcnStatus: h.hwcn_status || h.hwcnStatus,
  vehicleReg: h.vehicle_reg || h.vehicleReg,
  deliveredAt: h.delivered_at || h.deliveredAt,
  receivedBy: h.received_by || h.receivedBy,
  receivedSignature: h.received_signature || h.receivedSignature,
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
  jobType: string; // service, install, recovery
  siteRef: string; // e.g. JOB-1234
  siteName: string;
  siteAddress: string;
  engineer: string;
  weightUsed: number; // kg dispensed or recovered
  weightBefore: number;
  weightAfter: number;
}

export interface MovementLog {
  id: string;
  serial: string;
  date: string;
  action: string; // registered, moved_to_site, moved_to_van, returned_office, signed_out, usage
  from: string;
  to: string;
  engineer: string;
  notes?: string;
  vehicleReg?: string;
}

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
  status: "active" | "empty" | "returned" | "full";
  intendedDestination?: string;
  intendedLocationType?: LocationType;
  activeHWCN?: string;
  supplierHwcnPhotoPending?: boolean;
  supplierHwcnPhotoUrl?: string;
  producerSites?: Array<{ name: string, address: string, postcode: string }>;
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

export interface AppNotification {
  id: string;
  type: "location_discrepancy" | "new_registration" | "rental_expiry" | "low_gas" | "new_gas_registration" | "expiry_date_required";
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

export const db = {
  async getBottle(serial: string): Promise<Bottle | null> {
    const { data, error } = await supabase
      .from('bottles')
      .select('*')
      .eq('serial', serial)
      .single();
    
    if (error || !data) return null;
    return mapBottle(data);
  },

  async removeBottle(serial: string): Promise<void> {
    await supabase.from('bottles').delete().eq('serial', serial);
  },

  async returnBottleToSupplier(data: {
    serials: string[],
    returnHwcnNumber: string,
    hwcnPhotoUrl?: string,
    returnedBy: string,
    weights: Record<string, number>,
    returnSupplier?: string,
    returnSupplierBranch?: string,
  }): Promise<void> {
    const locationId = data.returnSupplier && data.returnSupplierBranch
      ? `${data.returnSupplier} - ${data.returnSupplierBranch}`
      : 'Supplier (Returned)';
    for (const serial of data.serials) {
      const weight = data.weights[serial];
      await supabase.from('bottles').update({
        status: 'returned',
        location_type: 'supplier',
        location_id: locationId,
        current_weight: weight,
        return_hwcn_number: data.returnHwcnNumber,
        supplier_hwcn_photo_url: data.hwcnPhotoUrl,
        returned_by: data.returnedBy,
        returned_at: new Date().toISOString(),
        return_supplier: data.returnSupplier || null,
        return_supplier_branch: data.returnSupplierBranch || null,
      }).eq('serial', serial);

      // Log movement
      await supabase.from('movement_logs').insert({
        serial,
        action: 'returned_to_supplier',
        from_location: 'office',
        to_location: 'supplier',
        engineer: data.returnedBy,
        notes: `Hazardous Waste Return (HWCN: ${data.returnHwcnNumber})`
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
    // ... add more if needed, but for now map basic ones
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
          gas_type: data.gasType,
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
          status: data.category === "reclaim" ? "empty" : "full",
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
        const { error: logError } = await supabase.from('movement_logs').insert({
          serial: data.serial,
          action: "re_registered",
          from_location: "Supplier (Recirculated)",
          to_location: data.locationId,
          engineer: data.lastEngineer || "system",
          notes: "Bottle returned by supplier and re-registered as fresh"
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
      gas_type: data.gasType,
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
      status: data.category === "reclaim" ? "empty" : "full",
      location_changed_at: new Date().toISOString()
    });
    if (bottleError) {
      console.error('Error registering bottle:', bottleError);
      throw bottleError;
    }

    const { error: logError } = await supabase.from('movement_logs').insert({
      serial: data.serial,
      action: "registered",
      from_location: "\u2014",
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

  async updateBottleLocation(serial: string, locationType: LocationType, locationId: string, intendedDestination?: string, intendedLocationType?: LocationType, activeHWCN?: string, engineerName?: string): Promise<void> {
    console.log(`Updating bottle ${serial} location to ${locationId} (${locationType})`);
    const { data: bottle, error: fetchError } = await supabase.from('bottles').select('*').eq('serial', serial).single();
    
    if (fetchError) {
      console.error(`Error fetching bottle ${serial} for move:`, fetchError);
      throw fetchError;
    }

    if (bottle) {
      const from = bottle.location_id || bottle.locationId;
      const updates: any = {
        location_type: locationType,
        location_id: locationId,
        location_changed_at: new Date().toISOString()
      };
      if (intendedDestination !== undefined) updates.intended_destination = intendedDestination;
      if (intendedLocationType !== undefined) updates.intended_location_type = intendedLocationType;
      if (activeHWCN !== undefined) updates.active_hwcn = activeHWCN;
      if (engineerName) updates.last_engineer = engineerName;
      
      const { error: updateError } = await supabase.from('bottles').update(updates).eq('serial', serial);
      if (updateError) {
        console.error(`Error updating bottle ${serial}:`, updateError);
        throw updateError;
      }
      
      let action = "moved";
      if (locationId.includes(" - Van") && from && from.includes(" - Van") && locationId !== from) {
        action = "handover";
      }

      const { error: logError } = await supabase.from('movement_logs').insert({
        serial,
        action: action as any,
        from_location: from || "Unknown",
        to_location: locationId,
        engineer: engineerName || "system",
        notes: activeHWCN 
          ? `Consignment ${activeHWCN} generated. Destination: ${intendedDestination}.` 
          : (action === "handover" ? "Cylinder handed over to another engineer." : (intendedDestination ? `In Transit to ${intendedDestination}` : undefined))
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

  async logUsage(serial: string, jobType: string, weightChange: number, isWaste: boolean = false, producerSite?: { name: string, address: string, postcode: string }, gasType?: string, engineerName: string = "Unknown", siteRef?: string): Promise<void> {
    const { data: bottle } = await supabase.from('bottles').select('*').eq('serial', serial).single();
    if (!bottle) return;

    let newWeight = parseFloat(bottle.current_weight || bottle.currentWeight || 0);
    let newStatus = bottle.status;
    let newLocType = bottle.location_type || bottle.locationType;
    let newLocId = bottle.location_id || bottle.locationId;

    const bottleUpdatePayload: any = {};

    if (jobType === "service" || jobType === "install") {
      newWeight = Math.max(0, newWeight - weightChange);
      if (newWeight === 0 && (bottle.category === "new" || bottle.category === "nitrogen")) {
        newStatus = "empty";
      } else if (newWeight > 0) {
        newStatus = "active";
      }
    } else if (jobType === "recovery" || jobType === "retrofit" || jobType === "waste") {
      // Adding gas to bottle
      newWeight += weightChange;
      const initialWeight = parseFloat(bottle.initial_weight || bottle.initialWeight || 0);
      
      if (bottle.category === "reclaim") {
        if (newWeight >= initialWeight && initialWeight > 0) {
          newStatus = "full";
        } else {
          newStatus = "active";
        }
      }

      if (jobType === "recovery") {
        // Handle producer sites (JSONB)
        const sites = bottle.producer_sites || bottle.producerSites || [];
        if (producerSite) {
          const exists = sites.find((s: any) => s.name === producerSite.name);
          if (!exists) sites.push(producerSite);
        }
        const { error: siteErr } = await supabase.from('bottles').update({ producer_sites: sites }).eq('serial', serial);
        if (siteErr) console.error("Error updating producer sites:", siteErr);

        // Update gas type based on what was recovered
        if (gasType && bottle.category === "reclaim") {
          const currentGasType = bottle.gas_type || "Mixed/Recovery";
          const currentWeight = parseFloat(bottle.current_weight || 0);
          let resolvedGasType: string;

          if (currentWeight === 0 || currentGasType === "Mixed/Recovery" || currentGasType === "Unknown") {
            resolvedGasType = gasType;
          } else if (currentGasType === gasType) {
            resolvedGasType = currentGasType;
          } else {
            resolvedGasType = "Mixed/Recovery";
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
    if (engineerName && engineerName !== "Unknown") bottleUpdatePayload.last_engineer = engineerName;

    const { error: updateErr } = await supabase.from('bottles').update(bottleUpdatePayload).eq('serial', serial);
    
    if (updateErr) {
      console.error("Error updating bottle weight:", updateErr);
      throw updateErr;
    }
    
    const { error: logErr } = await supabase.from('usage_logs').insert({
      serial,
      job_type: jobType,
      site_name: producerSite?.name || null,
      site_address: producerSite?.address || null,
      site_ref: siteRef || producerSite?.name || null,
      weight_used: weightChange || 0,
      weight_before: parseFloat(bottle.current_weight || bottle.currentWeight || 0),
      weight_after: newWeight,
      engineer: engineerName
    });
    
    if (logErr) console.error("Error inserting usage log:", logErr);
  },

  async completeTransit(serial: string, supplierPhotoUrl?: string, engineerName?: string, altDestination?: string): Promise<void> {
    console.log(`Completing transit for bottle ${serial}`);
    const { data: bottle, error: fetchError } = await supabase.from('bottles').select('*').eq('serial', serial).single();
    
    if (fetchError) {
      console.error(`Error fetching bottle ${serial} for transit completion:`, fetchError);
      throw fetchError;
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
      
      if (engineerName) updates.returned_by = engineerName;
      
      if (hwcnId) {
        await supabase.from('hwcns').update({
          delivered_at: deliveredAt,
          hwcn_status: "awaiting_consignee"
        }).eq('id', hwcnId);
      }

      if (finalLocType === "supplier") {
        updates.status = "returned";
        if (supplierPhotoUrl) {
          updates.supplier_hwcn_photo_url = supplierPhotoUrl;
          updates.supplier_hwcn_photo_pending = false;
        } else {
          updates.supplier_hwcn_photo_pending = true;
        }
      } else if (finalLocType === "office") {
        updates.status = "active"; // Reactivate when back in stores
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
    return data ? data.map(mapBottle) : [];
  },

  async signOutFromStores(serial: string, engineerName: string, engineerId?: string): Promise<void> {
    let vehicleReg: string | null = null;
    if (engineerId) {
      const eng = await this.getEngineerById(engineerId);
      vehicleReg = eng?.vehicleReg || null;
    }
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
      producer_sites: []
    };
    if (vehicleReg) updates.vehicle_reg = vehicleReg;
    await supabase.from('bottles').update(updates).eq('serial', serial);

    await supabase.from('movement_logs').insert({
      serial,
      action: "moved",
      from_location: "HQ-Stores",
      to_location: `${engineerName} - Van`,
      engineer: engineerName,
      notes: "Signed out from stores"
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
    return data ? data.map(mapBottle) : [];
  },

  async getBottlesByVan(engineerId: string): Promise<Bottle[]> {
    if (engineerId === "all") {
      const { data } = await supabase.from('bottles')
        .select('*')
        .eq('location_type', 'van')
        .neq('status', 'returned');
      return data ? data.map(mapBottle) : [];
    }
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
    return data ? data.map(mapBottle) : [];
  },

  async getBottlesByVanId(vanId: string): Promise<Bottle[]> {
     const { data } = await supabase.from('bottles')
      .select('*')
      .eq('location_type', 'van')
      .eq('location_id', vanId);
    return data ? data.map(mapBottle) : [];
  },

  async getBottlesByCategory(category: BottleCategory): Promise<Bottle[]> {
    const { data } = await supabase.from('bottles').select('*').eq('category', category);
    return data ? data.map(mapBottle) : [];
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
    return data ? data.map(mapMovement) : [];
  },

  async getAllMovementLogs(): Promise<MovementLog[]> {
    const { data } = await supabase.from('movement_logs').select('*').order('date', { ascending: false });
    return data ? data.map(mapMovement) : [];
  },

  async getAllUsageLogs(): Promise<UsageLog[]> {
    const { data } = await supabase.from('usage_logs').select('*').order('date', { ascending: false });
    return data ? data.map(mapUsage) : [];
  },

  async getEngineers(): Promise<string[]> {
    const { data } = await supabase.from('users').select('id').eq('role', 'engineer');
    return data?.map(u => u.id) || [];
  },
  
  async getEngineerProfiles(): Promise<any[]> {
    const { data } = await supabase.from('users').select('*').eq('role', 'engineer');
    return data ? data.map(mapUser) : [];
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

  async getNotifications(): Promise<any[]> {
    const { data } = await supabase.from('notifications').select('*').order('date', { ascending: false });
    return data || [];
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

  async updateBottle(serial: string, updates: any): Promise<void> {
    const dbUpdates: any = {};
    if (updates.currentWeight !== undefined) dbUpdates.current_weight = updates.currentWeight;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.locationType) dbUpdates.location_type = updates.locationType;
    if (updates.locationId) dbUpdates.location_id = updates.locationId;
    if (updates.gasType) dbUpdates.gas_type = updates.gasType;
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
          notes: `Cylinder transferred to new vehicle ${newReg}.`
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
    const { data } = await supabase
      .from("crm_jobs")
      .select("*")
      .order("imported_at", { ascending: false });
    return data ? data.map((r: any) => ({
      id: r.id,
      jobNumber: r.job_number,
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

  async upsertCrmJobs(jobs: Omit<CrmJob, "id" | "importedAt">[]): Promise<void> {
    const rows = jobs.map(j => ({
      job_number: j.jobNumber,
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
    await supabase.from("crm_jobs").update(d).eq("id", id);
  },

  async getCrmJobByNumber(jobNumber: string): Promise<CrmJob | null> {
    const { data } = await supabase
      .from("crm_jobs").select("*").eq("job_number", jobNumber).limit(1).single();
    if (!data) return null;
    return {
      id: data.id, jobNumber: data.job_number, prefix: data.prefix ?? "",
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
    return data ? data.map(mapBottle) : [];
  }
};

export interface CrmJob {
  id: string;
  jobNumber: string;
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
