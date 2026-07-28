export const REFRIGERANT_GWP: Record<string, number> = {
  "R410A": 2088,
  "R32": 675,
  "R404A": 3922,
  "R134A": 1430,
  "R407C": 1774,
  "R407A": 2107,
  "R407F": 1825,
  "R422D": 2729,
  "R454B": 466,
  "R507": 3985,
  "R744": 1,   // CO2
  "R290": 3,   // Propane
  "R600A": 3,  // Isobutane
  "R1234YF": 4,
  "R1234ZE": 7,
};

export function getGwp(gasType: string | undefined | null): number {
  if (!gasType) return 0;
  const clean = gasType.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return REFRIGERANT_GWP[clean] || 0;
}

export function calculateCO2e(gasType: string | undefined | null, weightKg: number | undefined | null): number {
  if (!weightKg || weightKg <= 0) return 0;
  const gwp = getGwp(gasType);
  if (!gwp) return 0;
  // Tonnes CO2 equivalent = (kg * GWP) / 1000
  return Number(((weightKg * gwp) / 1000).toFixed(2));
}
