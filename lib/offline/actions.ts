// Offline-aware entry points for the three field actions engineers can perform
// without signal: gas usage, single-site recovery, and simple location moves.
// Online → straight through to db.ts (unchanged behaviour). Offline → optimistic
// cache update + queued mutation that syncs later. Callers must gate out flows
// that require the server (HWCN generation, supplier returns, decommission) before
// calling these when offline.
import { db, type Bottle } from "@/lib/db";
import { enqueueMutation } from "./queue";
import { applyMoveOptimistic, applyUsageOptimistic } from "./optimistic";

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
