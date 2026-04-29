"use client";

// Simple in-memory mock database for testing the logic flows.
// In production, this will be replaced by Firebase Firestore.

export type BottleCategory = "new" | "reclaim" | "nitrogen";
export type LocationType = "van" | "site" | "supplier" | "office";

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
  status: "active" | "empty" | "returned";
  intendedDestination?: string;
  intendedLocationType?: LocationType;
  activeHWCN?: string;
  supplierHwcnPhotoPending?: boolean;
  supplierHwcnPhotoUrl?: string;
  producerSites?: Array<{ name: string, address: string, postcode: string }>;
  returnedBy?: string;
  returnedAt?: string;
  deliveredAt?: string;
  locationChangedAt?: string;
  vehicleReg?: string;
  rentalExpiryDate?: string;
}

export interface AppNotification {
  id: string;
  type: "location_discrepancy" | "new_registration" | "rental_expiry" | "low_gas";
  title: string;
  message: string;
  date: string;
  status: "new" | "acknowledged";
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
    const bottles = getStored("bottles", INITIAL_BOTTLES);
    return bottles[serial] || null;
  },

  async createHWCN(hwcnData: any): Promise<string> {
    const id = `HWCN-${Math.floor(Math.random() * 100000)}`;
    const records = getStored("hwcn", [] as any[]);
    records.push({
      id,
      ...hwcnData,
      deliveredAt: null,
      receivedBy: null,
      receivedSignature: null,
      hwcnStatus: "draft"
    });
    setStored("hwcn", records);
    return id;
  },

  async getHWCN(id: string): Promise<any> {
    const records = getStored("hwcn", [] as any[]);
    return records.find((h: any) => h.id === id) || null;
  },

  async updateHWCN(id: string, updates: any): Promise<void> {
    const records = getStored("hwcn", [] as any[]);
    const record = records.find((h: any) => h.id === id);
    if (record) {
      Object.assign(record, updates);
      setStored("hwcn", records);
    }
  },

  async getHWCNsForBottle(serial: string): Promise<any[]> {
    const records = getStored("hwcn", [] as any[]);
    return records.filter((h: any) => h.serial === serial);
  },

  async registerBottle(data: Omit<Bottle, "status">): Promise<void> {
    const bottles = getStored("bottles", INITIAL_BOTTLES);
    const notifications = getStored("notifications", INITIAL_NOTIFICATIONS);
    const movements = getStored("movements", [] as any[]);
    
    bottles[data.serial] = { ...data, status: "active", locationChangedAt: new Date().toISOString() };
    
    movements.push({
      id: `MOV-${Math.floor(Math.random() * 100000)}`,
      serial: data.serial,
      date: new Date().toISOString(),
      action: "registered",
      from: "\u2014",
      to: data.locationId,
      engineer: "admin",
      notes: "Initial registration"
    });

    setStored("bottles", bottles);
    setStored("movements", movements);
    setStored("notifications", notifications);
  },

  async updateBottleLocation(serial: string, locationType: LocationType, locationId: string, intendedDestination?: string, intendedLocationType?: LocationType, activeHWCN?: string): Promise<void> {
    const bottles = getStored("bottles", INITIAL_BOTTLES);
    const movements = getStored("movements", [] as any[]);
    
    const bottle = bottles[serial];
    if (bottle) {
      const from = bottle.locationId;
      bottle.locationType = locationType;
      bottle.locationId = locationId;
      bottle.locationChangedAt = new Date().toISOString();
      if (intendedDestination !== undefined) bottle.intendedDestination = intendedDestination;
      if (intendedLocationType !== undefined) bottle.intendedLocationType = intendedLocationType;
      if (activeHWCN !== undefined) bottle.activeHWCN = activeHWCN;
      
      let action = "moved";
      if (locationId.includes(" - Van") && from.includes(" - Van") && locationId !== from) {
        action = "handover";
      }

      movements.push({
        id: `MOV-${Math.floor(Math.random() * 100000)}`,
        serial,
        date: new Date().toISOString(),
        action: action as any,
        from,
        to: locationId,
        notes: activeHWCN 
          ? `Consignment ${activeHWCN} generated. Destination: ${intendedDestination}.` 
          : (action === "handover" ? "Cylinder handed over to another engineer." : undefined)
      });

      setStored("bottles", bottles);
      setStored("movements", movements);
    }
  },

  async clearTransitState(serial: string): Promise<void> {
    const bottles = getStored("bottles", INITIAL_BOTTLES);
    if (bottles[serial]) {
      delete bottles[serial].intendedDestination;
      delete bottles[serial].intendedLocationType;
      delete bottles[serial].activeHWCN;
      setStored("bottles", bottles);
    }
  },

  async logUsage(serial: string, jobType: string, weightChange: number, isWaste: boolean = false, producerSite?: { name: string, address: string, postcode: string }): Promise<void> {
    const bottles = getStored("bottles", INITIAL_BOTTLES);
    const bottle = bottles[serial];
    if (!bottle) return;

    if (jobType === "service" || jobType === "install") {
      bottle.currentWeight = Math.max(0, bottle.currentWeight - weightChange);
      if (bottle.currentWeight === 0 && bottle.category === "new") {
        bottle.status = "empty";
      }
    } else if (jobType === "recovery" && bottle.category === "reclaim") {
      bottle.currentWeight += weightChange;
      if (producerSite) {
        if (!bottle.producerSites) bottle.producerSites = [];
        const exists = bottle.producerSites.find(s => s.name === producerSite.name);
        if (!exists) bottle.producerSites.push(producerSite);
      }
    }

    if (isWaste || jobType === "waste") {
      bottle.status = "returned";
      bottle.locationType = "supplier";
      bottle.locationId = "Supplier-Return";
    }
    setStored("bottles", bottles);
  },

  async completeTransit(serial: string, supplierPhotoUrl?: string, engineerName?: string): Promise<void> {
    const bottles = getStored("bottles", INITIAL_BOTTLES);
    const bottle = bottles[serial];
    if (bottle && bottle.intendedDestination && bottle.intendedLocationType) {
      const deliveredAt = new Date().toISOString();
      const finalDest = bottle.intendedDestination;
      const finalLocType = bottle.intendedLocationType;
      const hwcnId = bottle.activeHWCN;

      bottle.locationType = finalLocType;
      bottle.locationId = finalDest;
      bottle.deliveredAt = deliveredAt;
      bottle.locationChangedAt = deliveredAt;
      if (engineerName) bottle.returnedBy = engineerName;
      
      if (hwcnId) {
        const records = getStored("hwcn", [] as any[]);
        const hwcn = records.find((h: any) => h.id === hwcnId);
        if (hwcn) {
          hwcn.deliveredAt = deliveredAt;
          hwcn.hwcnStatus = "awaiting_consignee";
          setStored("hwcn", records);
        }
      }

      if (finalLocType === "supplier") {
        bottle.status = "returned";
        if (supplierPhotoUrl) {
          bottle.supplierHwcnPhotoUrl = supplierPhotoUrl;
          bottle.supplierHwcnPhotoPending = false;
        } else {
          bottle.supplierHwcnPhotoPending = true;
        }
      }
      
      const movements = getStored("movements", [] as any[]);
      movements.push({
        id: `MOV-${Math.floor(Math.random() * 100000)}`,
        serial,
        date: deliveredAt,
        action: "received" as any,
        from: "In Transit",
        to: finalDest,
        engineer: engineerName || "System",
        notes: hwcnId ? `Received and delivered. Linked to ${hwcnId}.` : "Received and delivered."
      });
      setStored("movements", movements);
      
      delete bottle.intendedDestination;
      delete bottle.intendedLocationType;
      delete bottle.activeHWCN;
      setStored("bottles", bottles);
    }
  },
  
  async getAllBottles(): Promise<Bottle[]> {
    const bottles = getStored("bottles", INITIAL_BOTTLES);
    return Object.values(bottles);
  },

  async signOutFromStores(serial: string, engineerName: string): Promise<void> {
    const bottles = getStored("bottles", INITIAL_BOTTLES);
    const bottle = bottles[serial];
    if (!bottle) return;
    bottle.locationType = "van";
    bottle.locationId = `${engineerName} - Van`;
    bottle.locationChangedAt = new Date().toISOString();
    bottle.status = "active";
    delete bottle.intendedDestination;
    delete bottle.intendedLocationType;
    delete bottle.activeHWCN;
    delete bottle.deliveredAt;
    delete bottle.returnedBy;
    bottle.producerSites = [];
    setStored("bottles", bottles);
  },

  async getAllHWCNs(): Promise<any[]> {
    return getStored("hwcn", [] as any[]);
  },

  async getHWCNsByStatus(status: string): Promise<any[]> {
    const records = getStored("hwcn", [] as any[]);
    return records.filter((h: any) => h.hwcnStatus === status);
  },

  async completePartE(hwcnId: string, data: any): Promise<void> {
    const records = getStored("hwcn", [] as any[]);
    const hwcn = records.find((h: any) => h.id === hwcnId);
    if (!hwcn) return;
    hwcn.receivedBy = data.receivedBy;
    hwcn.receivedSignature = data.receivedSignature || data.receivedBy;
    hwcn.accepted = data.accepted;
    hwcn.rejectionDetails = data.rejectionDetails;
    if (data.vehicleReg) hwcn.vehicleRegConsignee = data.vehicleReg;
    hwcn.partECompletedAt = new Date().toISOString();
    hwcn.hwcnStatus = "complete";
    setStored("hwcn", records);
  },

  async getBottlesByLocation(locationType: LocationType): Promise<Bottle[]> {
    const bottles = getStored("bottles", INITIAL_BOTTLES);
    return Object.values(bottles).filter((b: any) => b.locationType === locationType);
  },

  async getBottlesByVan(engineerId: string): Promise<Bottle[]> {
    const bottles = getStored("bottles", INITIAL_BOTTLES);
    return Object.values(bottles).filter((b: any) => 
      b.locationType === "van" && 
      (b.locationId === engineerId || b.locationId?.includes(engineerId))
    );
  },

  async getBottlesByCategory(category: BottleCategory): Promise<Bottle[]> {
    const bottles = getStored("bottles", INITIAL_BOTTLES);
    return Object.values(bottles).filter((b: any) => b.category === category);
  },

  async getUsageLogs(serial: string): Promise<UsageLog[]> {
    const logs = getStored("usage", [] as any[]);
    return logs.filter((l: any) => l.serial === serial).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async getMovementLogs(serial: string): Promise<MovementLog[]> {
    const logs = getStored("movements", [] as any[]);
    return logs.filter((l: any) => l.serial === serial).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async getAllUsageLogs(): Promise<UsageLog[]> {
    const logs = getStored("usage", [] as any[]);
    return [...logs].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async getEngineers(): Promise<string[]> {
    const users = getStored("users", INITIAL_USERS);
    return Object.values(users).filter((u: any) => u.role === "engineer").map((u: any) => u.id);
  },
  
  async getEngineerProfiles(): Promise<any[]> {
    const users = getStored("users", INITIAL_USERS);
    return Object.values(users).filter((u: any) => u.role === "engineer");
  },

  async getAllUsers(): Promise<any[]> {
    const users = getStored("users", INITIAL_USERS);
    return Object.values(users);
  },

  async getEngineerById(id: string): Promise<any | null> {
    const users = getStored("users", INITIAL_USERS);
    return users[id] || null;
  },

  async getUserById(id: string): Promise<any | null> {
    const users = getStored("users", INITIAL_USERS);
    return users[id] || null;
  },

  async getUserByEmail(email: string): Promise<any | null> {
    const users = getStored("users", INITIAL_USERS);
    return Object.values(users).find((u: any) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async registerUser(data: any): Promise<void> {
    const id = `user_${Math.random().toString(36).substr(2, 9)}`;
    const users = getStored("users", INITIAL_USERS);
    users[id] = { id, ...data, availableRoles: [data.role], status: "pending", createdAt: new Date().toISOString() };
    setStored("users", users);
  },

  async getSuppliers(): Promise<any[]> {
    return getStored("suppliers", INITIAL_SUPPLIERS);
  },

  async addSupplier(name: string): Promise<void> {
    const suppliers = getStored("suppliers", INITIAL_SUPPLIERS);
    suppliers.push({ id: `sup_${Date.now()}`, name });
    setStored("suppliers", suppliers);
  },

  async getRefrigerants(): Promise<any[]> {
    return getStored("refrigerants", INITIAL_REFRIGERANTS);
  },

  async switchUserRole(userId: string, newRole: any): Promise<void> {
    const users = getStored("users", INITIAL_USERS);
    const user = users[userId];
    if (user && user.availableRoles.includes(newRole)) {
      user.role = newRole;
      setStored("users", users);
    }
  },

  async approveUser(id: string): Promise<void> {
    const users = getStored("users", INITIAL_USERS);
    if (users[id]) {
      users[id].status = "approved";
      setStored("users", users);
    }
  },

  async setUserStatus(id: string, status: any): Promise<void> {
    const users = getStored("users", INITIAL_USERS);
    if (users[id]) {
      users[id].status = status;
      setStored("users", users);
    }
  },

  async updateUserRoles(id: string, roles: any[]): Promise<void> {
    const users = getStored("users", INITIAL_USERS);
    if (users[id]) {
      users[id].availableRoles = roles;
      setStored("users", users);
    }
  },

  async getNotifications(): Promise<any[]> {
    return getStored("notifications", INITIAL_NOTIFICATIONS);
  },

  async createNotification(notif: any): Promise<void> {
    const notifications = getStored("notifications", INITIAL_NOTIFICATIONS);
    notifications.unshift({ id: `NOT-${Math.floor(Math.random() * 100000)}`, status: "new", date: new Date().toISOString(), ...notif });
    setStored("notifications", notifications);
  },

  async acknowledgeNotification(id: string): Promise<void> {
    const notifications = getStored("notifications", INITIAL_NOTIFICATIONS);
    const notif = notifications.find((n: any) => n.id === id);
    if (notif) {
      notif.status = "acknowledged";
      setStored("notifications", notifications);
    }
  },

  async updateBottle(serial: string, updates: any): Promise<void> {
    const bottles = getStored("bottles", INITIAL_BOTTLES);
    if (bottles[serial]) {
      bottles[serial] = { ...bottles[serial], ...updates };
      setStored("bottles", bottles);
    }
  },

  async updateUserVehicle(userId: string, newReg: string): Promise<void> {
    const users = getStored("users", INITIAL_USERS);
    const bottles = getStored("bottles", INITIAL_BOTTLES);
    const movements = getStored("movements", [] as any[]);
    
    const user = users[userId];
    if (!user) return;
    
    const oldReg = user.vehicleReg || "Unassigned";
    user.vehicleReg = newReg;
    setStored("users", users);
    
    // Move all bottles on this user's van
    // Note: b.locationId typically looks like "Name - Van" or the userId
    const userBottles = Object.values(bottles).filter((b: any) => 
      b.locationType === "van" && 
      (b.locationId === userId || b.locationId?.includes(user.name))
    );
    
    userBottles.forEach((b: any) => {
      b.vehicleReg = newReg; 
      b.locationChangedAt = new Date().toISOString();
      
      movements.push({
        id: `MOV-${Math.floor(Math.random() * 100000)}`,
        serial: b.serial,
        date: new Date().toISOString(),
        action: "vehicle_transfer",
        from: `Van (${oldReg})`,
        to: `Van (${newReg})`,
        engineer: user.name,
        notes: `Cylinder transferred to new vehicle ${newReg}.`
      });
    });
    
    setStored("bottles", bottles);
    setStored("movements", movements);
    setStored("users", users);
  },

  async updateUserEmployer(userId: string, employer: string): Promise<void> {
    const users = getStored("users", INITIAL_USERS);
    if (users[userId]) {
      users[userId].employer = employer;
      setStored("users", users);
    }
  }
};
