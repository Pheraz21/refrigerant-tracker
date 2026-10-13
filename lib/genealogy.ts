import { Bottle, MovementLog } from "./db";

export interface CylinderGenealogy {
  sourceSerial: string;
  relationType: "decanted" | "reclassified_in_place";
  date?: string;
  engineer?: string;
  notes?: string;
  isSameCylinder: boolean;
  displayText: string;
}

/**
 * Derives parent cylinder genealogy for a recycled bottle.
 * Ensures a bulletproof REFCOM and Environment Agency audit trail by linking
 * recycled cylinders back to their original source reclaim cylinder(s).
 */
export function getCylinderGenealogy(
  bottle: Bottle | null | undefined,
  movementLogs: MovementLog[] = []
): CylinderGenealogy | null {
  if (!bottle || bottle.category !== "recycled") return null;

  // 1. Look for workshop decant into this cylinder (Mode 2 Decant Transfer)
  const decantLog = movementLogs.find(
    m =>
      m.action === "workshop_decant_in" ||
      (m.from && m.from.toLowerCase().includes("decanted from")) ||
      (m.notes && m.notes.toLowerCase().includes("reclaim cylinder"))
  );

  if (decantLog) {
    let sourceSerial = "";

    // Parse from `from` field e.g. "Decanted from R410-0982"
    if (decantLog.from) {
      const fromMatch = decantLog.from.match(/decanted\s+from\s+([A-Za-z0-9_-]+)/i);
      if (fromMatch && fromMatch[1]) {
        sourceSerial = fromMatch[1].trim();
      }
    }

    // Fallback: Parse from `notes` field e.g. "from Reclaim cylinder R410-0982"
    if (!sourceSerial && decantLog.notes) {
      const notesMatch = decantLog.notes.match(/reclaim\s+cylinder\s+#?([A-Za-z0-9_-]+)/i);
      if (notesMatch && notesMatch[1]) {
        sourceSerial = notesMatch[1].trim();
      }
    }

    if (sourceSerial && sourceSerial.toUpperCase() !== bottle.serial.toUpperCase()) {
      return {
        sourceSerial,
        relationType: "decanted",
        date: decantLog.date,
        engineer: decantLog.engineer,
        notes: decantLog.notes,
        isSameCylinder: false,
        displayText: `Recycled from Reclaim Cylinder #${sourceSerial}`,
      };
    }
  }

  // 2. Look for in-place reclassification (Mode 1 In-Place Conversion)
  const reclassifyLog = movementLogs.find(
    m =>
      m.action === "reclassified_recycled" ||
      (m.notes && m.notes.toLowerCase().includes("reclassified from reclaim"))
  );

  if (reclassifyLog) {
    let sourceSerial = "";
    if (reclassifyLog.notes) {
      const notesDonorMatch = reclassifyLog.notes.match(
        /donor\s+(?:reclaim\s+)?(?:cylinder\s+)?#?([A-Za-z0-9_-]+)/i
      );
      if (notesDonorMatch && notesDonorMatch[1]) {
        sourceSerial = notesDonorMatch[1].trim();
      }
    }

    const isDifferent = !!sourceSerial && sourceSerial.toUpperCase() !== bottle.serial.toUpperCase();
    const finalSerial = isDifferent ? sourceSerial : bottle.serial;

    return {
      sourceSerial: finalSerial,
      relationType: "reclassified_in_place",
      date: reclassifyLog.date,
      engineer: reclassifyLog.engineer,
      notes: reclassifyLog.notes,
      isSameCylinder: !isDifferent,
      displayText: isDifferent
        ? `Recycled from Reclaim Cylinder #${finalSerial}`
        : `Reclassified from Reclaim Cylinder #${finalSerial}`,
    };
  }

  // 3. Search notes in any other movement log mentioning a source reclaim cylinder
  for (const log of movementLogs) {
    if (log.notes) {
      const match = log.notes.match(/reclaim\s+cylinder\s+#?([A-Za-z0-9_-]+)/i);
      if (match && match[1]) {
        const found = match[1].trim();
        const isSame = found.toUpperCase() === bottle.serial.toUpperCase();
        return {
          sourceSerial: found,
          relationType: isSame ? "reclassified_in_place" : "decanted",
          date: log.date,
          engineer: log.engineer,
          notes: log.notes,
          isSameCylinder: isSame,
          displayText: isSame
            ? `Reclassified from Reclaim Cylinder #${found}`
            : `Recycled from Reclaim Cylinder #${found}`,
        };
      }
    }
  }

  // 4. Default for a recycled cylinder where previous lifecycle was reclaim
  return {
    sourceSerial: bottle.serial,
    relationType: "reclassified_in_place",
    date: bottle.registeredAt,
    isSameCylinder: true,
    displayText: `Reclassified from Reclaim Cylinder #${bottle.serial}`,
  };
}
