// Offline-aware entry points for the three field actions engineers can perform
// without signal: gas usage, single-site recovery, and simple location moves.
// Online → straight through to db.ts (unchanged behaviour). Offline → optimistic
// cache update + queued mutation that syncs later. Callers must gate out flows
// that require the server (HWCN generation, supplier returns, decommission) before
// calling these when offline.
import { db, type Bottle } from "@/lib/db";
import { enqueueMutation } from "./queue";
import { applyMoveOptimistic, applyTransitOptimistic, applyUsageOptimistic } from "./optimistic";

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export interface UsageInput {
  serial: string;
  jobType: string;
  weightChange: number;
  isWaste?: boolean;
  producerSite?: { name: string; address: string; postcode: string };
  gasType?: string;
  engineerName?: string;
  siteRef?: string;
  equipmentDetails?: Array<{ manufacturer: string; model: string; serial: string; weight: number }>;
}

export async function submitUsage(input: UsageInput): Promise<{ queued: boolean }> {
  const args = [
    input.serial,
    input.jobType,
    input.weightChange,
    input.isWaste ?? false,
    input.producerSite,
    input.gasType,
    input.engineerName ?? "Unknown",
    input.siteRef,
    input.equipmentDetails,
  ];
  if (isOnline()) {
    await (db.logUsage as (...a: unknown[]) => Promise<void>)(...args);
    return { queued: false };
  }
  const occurredAt = new Date().toISOString();
  await applyUsageOptimistic(input.serial, input.jobType, input.weightChange);
  await enqueueMutation({
    type: "usage",
    serial: input.serial,
    label: `${input.jobType} · ${input.weightChange}kg`,
    occurredAt,
    args: [...args, occurredAt],
  });
  return { queued: true };
}

export interface DecommissionRecord {
  bottleSerial: string;
  jobNumber: string;
  siteName: string;
  siteAddress: string;
  sitePostcode: string;
  engineer: string;
  equipment: Array<{ manufacturer: string; model: string; serial: string; weightRecovered: number }>;
  gasType: string;
  totalWeightRecovered: number;
}

// Decommission is an append-only compliance record captured on site. Offline it is
// queued with a stable id (so replay is idempotent via upsert) and its on-site
// timestamp, and created on the server when back online.
export async function submitDecommission(record: DecommissionRecord): Promise<{ queued: boolean }> {
  const occurredAt = new Date().toISOString();
  const id = `DECOM-${crypto.randomUUID()}`;
  if (isOnline()) {
    await db.logDecommission(record, occurredAt, id);
    return { queued: false };
  }
  await enqueueMutation({
    type: "decommission",
    serial: record.bottleSerial,
    label: `Decommission ${record.equipment.length} item(s)`,
    occurredAt,
    args: [record, occurredAt, id],
  });
  return { queued: true };
}

export interface HwcnTransitInput {
  serial: string;
  hwcnData: Record<string, unknown>; // passed to db.createHWCN
  // The bottle move that puts it in transit, referencing the new HWCN.
  locationType: Bottle["locationType"];
  locationId: string;
  intendedDestination: string;
  intendedLocationType: Bottle["locationType"];
  engineerName?: string;
}

// Generate a consignment note (HWCN) and put the bottle in transit. Online → create
// the numbered note now and attach it. Offline → show the bottle in transit with a
// pending reference and queue an "hwcn_transit" mutation; on sync the real numbered
// note is created (once) and attached. Returns the HWCN id when created online.
export async function submitHwcnTransit(input: HwcnTransitInput): Promise<{ queued: boolean; hwcnId?: string }> {
  if (isOnline()) {
    const hwcnId = await db.createHWCN(input.hwcnData);
    await db.updateBottleLocation(
      input.serial,
      input.locationType,
      input.locationId,
      input.intendedDestination,
      input.intendedLocationType,
      hwcnId,
      input.engineerName,
    );
    return { queued: false, hwcnId };
  }
  const occurredAt = new Date().toISOString();
  await applyTransitOptimistic(
    input.serial,
    input.locationType,
    input.locationId,
    input.intendedDestination,
    input.intendedLocationType,
  );
  await enqueueMutation({
    type: "hwcn_transit",
    serial: input.serial,
    label: `Consignment → ${input.intendedDestination}`,
    occurredAt,
    args: [
      {
        serial: input.serial,
        hwcnData: { ...input.hwcnData, date: (input.hwcnData.date as string) || occurredAt },
        locationType: input.locationType,
        locationId: input.locationId,
        intendedDestination: input.intendedDestination,
        intendedLocationType: input.intendedLocationType,
        engineerName: input.engineerName,
      },
      occurredAt,
    ],
  });
  return { queued: true };
}

export async function submitMove(
  serial: string,
  locationType: Bottle["locationType"],
  locationId: string,
  engineerName?: string,
): Promise<{ queued: boolean }> {
  const args = [serial, locationType, locationId, undefined, undefined, undefined, engineerName];
  if (isOnline()) {
    await (db.updateBottleLocation as (...a: unknown[]) => Promise<void>)(...args);
    return { queued: false };
  }
  const occurredAt = new Date().toISOString();
  await applyMoveOptimistic(serial, locationType, locationId);
  await enqueueMutation({
    type: "move",
    serial,
    label: `Move to ${locationId}`,
    occurredAt,
    args: [...args, occurredAt],
  });
  return { queued: true };
}
