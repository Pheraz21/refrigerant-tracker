"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Database, ArrowLeft, Truck, Building2, MapPin, RotateCcw, Wind, AlertTriangle, Edit3, ShieldCheck } from "lucide-react";
import styles from "../../log/page.module.css"; // Reuse existing form styles
import { db, BottleCategory } from "@/lib/db";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

function checkSupplierSerialFormat(rawSerial: string, supplierName: string): { isValid: boolean; reason?: string; expectedHint?: string } {
  const s = (rawSerial || "").trim().toUpperCase();
  const sup = (supplierName || "").trim();

  // Do not apply format restrictions to 21 Degrees (outright purchased cylinders can have any format) or Other
  if (!sup || sup.toLowerCase().includes("21 degrees") || sup.toLowerCase() === "other") {
    return { isValid: true };
  }

  if (!s || s === "UNKNOWN") {
    return {
      isValid: false,
      reason: "No valid serial number entered.",
      expectedHint: "Please enter or re-scan the cylinder serial number."
    };
  }

  // Universal mis-scan red flag: purely alphabetical string (e.g. YGJAHJI from 1D barcode misread)
  if (/^[A-Z]+$/.test(s)) {
    return {
      isValid: false,
      reason: `"${s}" contains only letters and no numbers, which typically happens when the camera misreads a barcode.`,
      expectedHint: `Check the physical label on the ${sup} cylinder and correct the serial number.`
    };
  }

  const supLower = sup.toLowerCase();

  if (supLower.includes("kooltech")) {
    const isStandardKooltech =
      /^1N\d{6}$/.test(s) ||
      /^RR27\d{6}$/.test(s) ||
      /^[34]0\d{4}[A-Z]?$/.test(s);

    if (isStandardKooltech) return { isValid: true };

    if (/^N\d{6}$/.test(s)) {
      return {
        isValid: false,
        reason: `"${s}" looks like a Kooltech "1N" serial that is missing the leading "1" (e.g. 1${s}).`,
        expectedHint: "Kooltech cylinders normally use 1N + 6 digits (e.g. 1N210008), RR27 + 6 digits (e.g. RR27001891), or 6-digit Nitrogen serials (e.g. 306393)."
      };
    }
    if (/^1N\d+$/.test(s) && s.length !== 8) {
      return {
        isValid: false,
        reason: `"${s}" has ${s.length - 2} digits after "1N", whereas Kooltech "1N" serials normally have 6 digits (8 characters total).`,
        expectedHint: "Expected format: 1N followed by 6 digits (e.g. 1N210008)."
      };
    }
    return {
      isValid: false,
      reason: `"${s}" does not match the normal Kooltech serial format.`,
      expectedHint: "Kooltech cylinders normally use 1N + 6 digits (e.g. 1N210008), RR27 + 6 digits (e.g. RR27001891), or 6-digit Nitrogen serials (e.g. 306393)."
    };
  }

  if (supLower.includes("beijer")) {
    const isStandardBeijer =
      /^1N\d{6}$/.test(s) ||
      /^B27\d{5}$/.test(s) ||
      /^BR99\d{6}$/.test(s) ||
      /^RR27\d{6}$/.test(s) ||
      /^\d{6}[A-Z]{0,2}$/.test(s);

    if (isStandardBeijer) return { isValid: true };

    if (/^N\d{6}$/.test(s)) {
      return {
        isValid: false,
        reason: `"${s}" looks like a "1N" serial missing the leading "1" (e.g. 1${s}).`,
        expectedHint: "Beijer Ref cylinders normally use 1N + 6 digits, B27 + 5 digits, BR99 + 6 digits, RR27 + 6 digits, or 6-digit Nitrogen serials."
      };
    }
    return {
      isValid: false,
      reason: `"${s}" does not match the normal Beijer Ref serial format.`,
      expectedHint: "Beijer Ref cylinders normally use 1N + 6 digits (e.g. 1N154368), B27 + 5 digits (e.g. B2700130), BR99 + 6 digits (e.g. BR99003224), RR27 + 6 digits (e.g. RR27003131), or 6-digit Nitrogen serials (e.g. 307051)."
    };
  }

  if (supLower.includes("tf solutions")) {
    const isStandardTfs =
      /^AG\d{6}$/.test(s) ||
      /^AM\d{6}$/.test(s) ||
      /^1TFS\d{6}$/.test(s) ||
      /^1N\d{6}$/.test(s) ||
      /^RR27\d{6}$/.test(s);

    if (isStandardTfs) return { isValid: true };

    return {
      isValid: false,
      reason: `"${s}" does not match the normal TF Solutions serial format.`,
      expectedHint: "TF Solutions cylinders normally use AG + 6 digits (e.g. AG059561), AM + 6 digits (e.g. AM119748), or 1TFS + 6 digits (e.g. 1TFS002301)."
    };
  }

  if (supLower.includes("boc")) {
    const isStandardBoc = /^\d{10,16}$/.test(s);
    if (isStandardBoc) return { isValid: true };

    return {
      isValid: false,
      reason: `"${s}" does not match the normal BOC Gas & Gear serial format.`,
      expectedHint: "BOC cylinders normally use a 10–16 digit numeric barcode (e.g. 21034010786462)."
    };
  }

  return { isValid: true };
}

export default function RegisterBottlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serialParam = searchParams.get("serial") || "UNKNOWN";
  const { user } = useAuth();

  const [serialInput, setSerialInput] = useState(serialParam.trim().toUpperCase());
  const [isEditingSerial, setIsEditingSerial] = useState(false);
  const [serialWarningConfirmed, setSerialWarningConfirmed] = useState(false);
  const [existingBottleMatch, setExistingBottleMatch] = useState<any | null>(null);

  const [category, setCategory] = useState<BottleCategory>("new");
  const [gasType, setGasType] = useState("R410A");
  const [locationType, setLocationType] = useState<"van" | "office" | "office_collected" | "site">(user?.role === "admin" ? "office" : "van");
  const [locationId, setLocationId] = useState("");
  const [siteCrmJob, setSiteCrmJob] = useState<any | null>(null);
  const [vehicleReg, setVehicleReg] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [weight, setWeight] = useState("");
  const [customGas, setCustomGas] = useState("");
  const [rentalExpiryDate, setRentalExpiryDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const effectiveSerial = (serialInput || serialParam).trim().replace(/\s+/g, "").toUpperCase();
  const serialCheck = useMemo(() => checkSupplierSerialFormat(effectiveSerial, supplier), [effectiveSerial, supplier]);

  useEffect(() => {
    setSerialWarningConfirmed(false);
  }, [effectiveSerial, supplier]);

  useEffect(() => {
    if (locationType !== "site" || !locationId || locationId.trim().length < 3) {
      setSiteCrmJob(null);
      return;
    }
    let active = true;
    db.getCrmJobByNumber(locationId.trim()).then(crm => {
      if (active) setSiteCrmJob(crm || null);
    }).catch(() => {
      if (active) setSiteCrmJob(null);
    });
    return () => { active = false; };
  }, [locationType, locationId]);

  useEffect(() => {
    if (!effectiveSerial || effectiveSerial === serialParam.trim().toUpperCase()) {
      setExistingBottleMatch(null);
      return;
    }
    let active = true;
    db.getBottle(effectiveSerial).then(b => {
      if (active) setExistingBottleMatch(b && b.status !== "returned" ? b : null);
    }).catch(() => {
      if (active) setExistingBottleMatch(null);
    });
    return () => { active = false; };
  }, [effectiveSerial, serialParam]);

  useEffect(() => {
    if (user && locationType === "van") {
      // Priority 1: User context vehicle reg (available for all roles if set)
      if (user.vehicleReg) {
        setVehicleReg(user.vehicleReg);
      }

      // Auto-fill vehicle reg if missing
      if (!vehicleReg) {
        db.getEngineerById(user.id).then(profile => {
          if (profile?.vehicleReg) setVehicleReg(profile.vehicleReg);
        });
      }
    }
  }, [user, vehicleReg]);

  const applyExpiryForSupplierAndCategory = (supplierName: string, cat: BottleCategory) => {
    if (!supplierName) return;
    db.getDurationForSupplier(supplierName, cat).then(days => {
      if (days) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + days);
        setRentalExpiryDate(expiry.toISOString().slice(0, 10));
      } else {
        setRentalExpiryDate("");
      }
    });
  };

  const [topGases, setTopGases] = useState<string[]>(["R32", "R410A", "R407C", "R22"]);

  useEffect(() => {
    async function loadPreferences() {
      const [allSuppliers, allGases] = await Promise.all([
        db.getSuppliers(),
        db.getGases(),
      ]);

      setSuppliers(allSuppliers);
      if (allSuppliers.length > 0) {
        setSupplier(prev => {
          const activeSupplier = prev || allSuppliers[0].name;
          applyExpiryForSupplierAndCategory(activeSupplier, category);
          return activeSupplier;
        });
      }

      const buyableGases = allGases
        .filter(g => category !== "new" || g.can_be_bought_new !== false)
        .map(g => g.name);
      setTopGases(buyableGases);
      if (buyableGases.length > 0) setGasType(buyableGases[0]);
    }

    if (user) loadPreferences();
  }, [user, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveSerial || effectiveSerial === "UNKNOWN") {
      alert("Please enter a valid bottle serial number.");
      return;
    }
    if (!serialCheck.isValid && !serialWarningConfirmed) {
      alert("Please check the bottle serial number against the physical label and either correct it or tap the confirmation button before registering.");
      return;
    }

    setIsSubmitting(true);

    const finalGas = gasType === "Other" ? customGas : gasType;

    if (gasType === "Other" && customGas) {
      // Ensure the new gas is in our global gases table
      await db.ensureGas(customGas);

      // Create notification for office to update details
      await db.createNotification({
        type: "new_gas_registration",
        title: "New Gas Cataloged",
        message: `Engineer ${user?.name} registered a new gas: ${customGas}. Please update UN/GWP details.`,
        targetRole: "office",
        metadata: {
          gasName: customGas,
          registeredBy: user?.name,
          serial: effectiveSerial
        }
      });
    }

    if (locationType === "site") {
      const cleanJob = (locationId || "").trim().replace(/\s+/g, "").toUpperCase();
      if (!/^[A-Za-z]\d+$/.test(cleanJob)) {
        alert("Job number must start with 1 letter followed by numbers without spaces (e.g. J12345, M98201).");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const cleanLocationId = locationType === "site" ? (locationId || "").trim().replace(/\s+/g, "").toUpperCase() : locationId;
      await db.registerBottle({
        serial: effectiveSerial,
        category,
        gasType: category === "reclaim" ? "Unused" : (category === "nitrogen" ? "Nitrogen" : finalGas),
        initialWeight: Number(weight),
        currentWeight: category === "reclaim" ? 0 : Number(weight),
        locationType: locationType as any,
        locationId: locationType === "van" ? `${user?.name} - Van` : (locationType === "office" || locationType === "office_collected") ? "HQ-Stores" : cleanLocationId,
        vehicleReg: locationType === "van" ? vehicleReg : undefined,
        poNumber: poNumber,
        supplier: supplier,
        rentalExpiryDate: rentalExpiryDate || undefined,
        lastEngineer: user?.name,
        registeredBy: user?.name,
        registeredAt: new Date().toISOString()
      });

      setIsSubmitting(false);
      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      alert((error as Error).message || "Failed to register bottle.");
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={styles.successContainer}>
        <CheckCircle2 size={64} color="var(--success)" />
        <h2>Bottle Registered!</h2>
        <p>This bottle is now tracked in {locationType === "van" ? "your van" : (locationType === "office" || locationType === "office_collected") ? "the office/stores" : "the job site"}.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", marginTop: "0.5rem" }}>
          <button
            type="button"
            onClick={() => router.replace(`/engineer/bottle/${encodeURIComponent(effectiveSerial)}`)}
            className={styles.primaryBtn}
          >
            Open Bottle Actions
          </button>
          <button
            type="button"
            onClick={() => router.replace("/engineer")}
            className={styles.primaryBtn}
            style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-main)", border: "1px solid var(--border)" }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/engineer" replace className={styles.backBtn}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ color: "var(--primary)" }}>Unregistered Bottle</h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Please register this bottle into the system</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div
          className={styles.readonlyField}
          style={{
            borderColor: !serialCheck.isValid
              ? (serialWarningConfirmed ? "rgba(16, 185, 129, 0.45)" : "rgba(245, 158, 11, 0.55)")
              : undefined,
            background: !serialCheck.isValid
              ? (serialWarningConfirmed ? "rgba(16, 185, 129, 0.06)" : "rgba(245, 158, 11, 0.08)")
              : undefined,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "0.5rem" }}>
            <span className={styles.label}>Scanned Serial Number</span>
            <button
              type="button"
              onClick={() => setIsEditingSerial((prev) => !prev)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.3rem",
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)",
                color: "var(--primary)", borderRadius: "6px", padding: "0.25rem 0.6rem",
                fontSize: "0.75rem", fontWeight: 600, cursor: "pointer"
              }}
            >
              <Edit3 size={13} /> {isEditingSerial ? "Done Editing" : "Edit / Fix Scan"}
            </button>
          </div>

          {isEditingSerial ? (
            <div style={{ marginTop: "0.5rem", width: "100%" }}>
              <input
                type="text"
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                placeholder="Enter exact bottle serial number"
                autoFocus
                style={{
                  width: "100%", padding: "0.65rem 0.75rem", borderRadius: "8px",
                  border: "2px solid var(--primary)", background: "rgba(0, 229, 255, 0.08)",
                  color: "#fff", fontSize: "1.15rem", fontWeight: 700,
                  fontFamily: "var(--font-geist-mono)", letterSpacing: "0.05em"
                }}
              />
              <span style={{ display: "block", fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                Compare carefully against the barcode label on the cylinder collar/body.
              </span>
            </div>
          ) : (
            <span className={styles.value} style={{ letterSpacing: "0.04em" }}>{effectiveSerial || "—"}</span>
          )}

          {existingBottleMatch && (
            <div style={{
              marginTop: "0.65rem", padding: "0.65rem 0.75rem", borderRadius: "8px",
              background: "rgba(0, 229, 255, 0.12)", border: "1px solid rgba(0, 229, 255, 0.35)",
              display: "flex", flexDirection: "column", gap: "0.4rem"
            }}>
              <span style={{ fontSize: "0.8rem", color: "#fff", fontWeight: 600 }}>
                Bottle <strong>{existingBottleMatch.serial}</strong> ({existingBottleMatch.gasType} • {existingBottleMatch.supplier || "Unknown Supplier"}) is already registered in the system!
              </span>
              <button
                type="button"
                onClick={() => router.push(`/engineer/bottle/${encodeURIComponent(existingBottleMatch.serial)}`)}
                style={{
                  alignSelf: "flex-start", background: "var(--primary)", color: "#000",
                  border: "none", borderRadius: "6px", padding: "0.4rem 0.75rem",
                  fontSize: "0.8rem", fontWeight: 700, cursor: "pointer"
                }}
              >
                Open Existing Bottle {existingBottleMatch.serial} →
              </button>
            </div>
          )}
        </div>

        <div className={styles.inputGroup}>
          <label>Bottle Type</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={() => { setCategory("new"); applyExpiryForSupplierAndCategory(supplier, "new"); }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
                padding: "1rem", borderRadius: "12px", border: category === "new" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                background: category === "new" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                color: category === "new" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s"
              }}
            >
              <CheckCircle2 size={24} />
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Virgin Gas</span>
            </button>
            <button
              type="button"
              onClick={() => { setCategory("reclaim"); applyExpiryForSupplierAndCategory(supplier, "reclaim"); }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
                padding: "1rem", borderRadius: "12px", border: category === "reclaim" ? "2px solid var(--warning)" : "1px solid rgba(255,255,255,0.1)",
                background: category === "reclaim" ? "rgba(255, 170, 0, 0.1)" : "rgba(255,255,255,0.03)",
                color: category === "reclaim" ? "var(--warning)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s"
              }}
            >
              <RotateCcw size={24} />
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Recovery / Reclaim</span>
            </button>
            <button
              type="button"
              onClick={() => { setCategory("nitrogen"); applyExpiryForSupplierAndCategory(supplier, "nitrogen"); }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
                padding: "1rem", borderRadius: "12px", border: category === "nitrogen" ? "2px solid #a855f7" : "1px solid rgba(255,255,255,0.1)",
                background: category === "nitrogen" ? "rgba(168, 85, 247, 0.1)" : "rgba(255,255,255,0.03)",
                color: category === "nitrogen" ? "#a855f7" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s"
              }}
            >
              <Wind size={24} />
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Nitrogen (OFN)</span>
            </button>
          </div>
        </div>

        {category === "new" && (
          <div className={styles.inputGroup} style={{ marginTop: '-0.5rem', marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
            <label>Refrigerant Gas Type</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginTop: "0.5rem" }}>
              {[...topGases, "Other"].map((gas) => (
                <button
                  key={gas}
                  type="button"
                  onClick={() => setGasType(gas)}
                  style={{
                    padding: "0.75rem", borderRadius: "8px", border: gasType === gas ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                    background: gasType === gas ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                    color: gasType === gas ? "var(--primary)" : "var(--text-main)", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem"
                  }}
                >
                  {gas}
                </button>
              ))}
            </div>

            {gasType === "Other" && (
              <div style={{ marginTop: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>Enter Custom Gas Type</label>
                <input
                  type="text"
                  value={customGas}
                  onChange={e => setCustomGas(e.target.value.toUpperCase())}
                  placeholder="e.g. R407C"
                  style={{ marginTop: '0.25rem', border: '1px solid var(--primary)', background: 'rgba(0, 229, 255, 0.05)' }}
                  required
                />
              </div>
            )}
          </div>
        )}

        {category === "reclaim" && (
          <div className={styles.readonlyField} style={{ background: 'rgba(0, 229, 255, 0.08)', borderColor: 'rgba(0, 229, 255, 0.25)', marginTop: '-0.5rem', marginBottom: '1.5rem' }}>
            <span className={styles.label}>Gas Type</span>
            <span style={{ color: '#00e5ff', fontWeight: 600 }}>Unused (Ready for Recovery)</span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem' }}>
              Cylinder will automatically adopt the refrigerant type upon first gas recovery on site.
            </span>
          </div>
        )}

        <div className={styles.inputGroup}>
          <label>Where is this bottle being received?</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem", marginTop: "0.5rem" }}>
            {/* VAN */}
            <button
              type="button"
              onClick={() => setLocationType("van")}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
                padding: "1rem", borderRadius: "12px", border: locationType === "van" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                background: locationType === "van" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                color: locationType === "van" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s"
              }}
            >
              <Truck size={24} />
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>My Van</span>
            </button>

            {/* OFFICE */}
            <button
              type="button"
              onClick={() => setLocationType("office")}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
                padding: "1rem", borderRadius: "12px", border: locationType === "office" || locationType === "office_collected" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                background: locationType === "office" || locationType === "office_collected" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                color: locationType === "office" || locationType === "office_collected" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s"
              }}
            >
              <Building2 size={24} />
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>HQ-Stores</span>
            </button>

            {/* SITE */}
            <button
              type="button"
              onClick={() => setLocationType("site")}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
                padding: "1rem", borderRadius: "12px", border: locationType === "site" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                background: locationType === "site" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                color: locationType === "site" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s",
                gridColumn: "span 2"
              }}
            >
              <MapPin size={24} />
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Direct to Job Site</span>
            </button>
          </div>
        </div>

        {locationType === "site" && (
          <div className={`${styles.dynamicSection} glass-panel`} style={{ borderColor: 'var(--primary)', marginBottom: '1rem', marginTop: '-0.5rem' }}>
            <div className={styles.inputGroup}>
              <label>Job Number (e.g. J12345, M98201)</label>
              <input
                type="text"
                value={locationId}
                pattern="^[A-Za-z][0-9]+$"
                title="Job number must start with 1 letter followed by numbers without spaces (e.g. J12345)"
                onChange={(e) => setLocationId(e.target.value.replace(/\s+/g, "").toUpperCase())}
                placeholder="e.g. J12345"
                required
              />
              {siteCrmJob && (
                <div style={{ marginTop: "0.5rem", padding: "0.65rem 0.8rem", background: "rgba(0, 229, 255, 0.08)", border: "1px solid rgba(0, 229, 255, 0.25)", borderRadius: "8px", fontSize: "0.82rem", lineHeight: 1.45 }}>
                  {(siteCrmJob.siteTitle || siteCrmJob.customer) && (
                    <div style={{ color: "var(--primary)", fontWeight: 600 }}>
                      ✓ Site: {String(siteCrmJob.siteTitle || siteCrmJob.customer).replace(/,(?!\s)/g, ", ")}
                    </div>
                  )}
                  {siteCrmJob.jobTitle && (
                    <div style={{ color: "#fff", marginTop: "0.15rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Job Name: </span>{siteCrmJob.jobTitle}
                    </div>
                  )}
                  {(siteCrmJob.siteAddress || siteCrmJob.sitePostcode) && (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.15rem" }}>
                      {[siteCrmJob.siteAddress, siteCrmJob.sitePostcode].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className={styles.inputGroup} style={{ marginTop: '0.5rem' }}>
          <label>Purchase Order (PO) Number</label>
          <input
            type="text"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            placeholder="e.g. PO-10442"
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Supplier</label>
          <select value={supplier} onChange={(e) => { setSupplier(e.target.value); applyExpiryForSupplierAndCategory(e.target.value, category); }} required>
            {suppliers.map(sup => (
              <option key={sup.id} value={sup.name}>{sup.name}</option>
            ))}
            <option value="Other">Other...</option>
          </select>
        </div>

        {!serialCheck.isValid && (
          <div
            style={{
              padding: "1rem",
              borderRadius: "12px",
              border: serialWarningConfirmed
                ? "2px solid rgba(16, 185, 129, 0.55)"
                : "2px solid rgba(245, 158, 11, 0.75)",
              background: serialWarningConfirmed
                ? "rgba(16, 185, 129, 0.08)"
                : "rgba(245, 158, 11, 0.1)",
              marginBottom: "0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem" }}>
              {serialWarningConfirmed ? (
                <ShieldCheck size={22} color="#10b981" style={{ flexShrink: 0, marginTop: "2px" }} />
              ) : (
                <AlertTriangle size={22} color="#f59e0b" style={{ flexShrink: 0, marginTop: "2px" }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "0.92rem", color: serialWarningConfirmed ? "#10b981" : "#fbbf24" }}>
                  {serialWarningConfirmed
                    ? `Serial Verified for ${supplier}`
                    : `Unusual Serial Format for ${supplier}`}
                </div>
                <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.82rem", color: "rgba(255,255,255,0.88)", lineHeight: 1.45 }}>
                  {serialCheck.reason}
                </p>
                {serialCheck.expectedHint && (
                  <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                    {serialCheck.expectedHint}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
              <button
                type="button"
                onClick={() => {
                  setIsEditingSerial(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                style={{
                  flex: "1 1 140px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Edit3 size={15} /> Fix / Edit Serial
              </button>

              <button
                type="button"
                onClick={() => setSerialWarningConfirmed((prev) => !prev)}
                style={{
                  flex: "2 1 200px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.45rem",
                  padding: "0.65rem 0.9rem",
                  borderRadius: "8px",
                  border: serialWarningConfirmed
                    ? "2px solid #10b981"
                    : "2px solid #f59e0b",
                  background: serialWarningConfirmed
                    ? "rgba(16, 185, 129, 0.22)"
                    : "rgba(245, 158, 11, 0.22)",
                  color: serialWarningConfirmed ? "#6ee7b7" : "#fde68a",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <CheckCircle2 size={16} />
                {serialWarningConfirmed
                  ? "Confirmed: Serial Matches Bottle Label"
                  : "I Have Checked the Bottle — Serial is Correct"}
              </button>
            </div>
          </div>
        )}

        <div className={styles.inputGroup}>
          <label>{category === "reclaim" ? "Max Fill Weight (kg)" : "Net Weight Of Refrigerant (Full Cylinder kg)"}</label>
          <input
            type="number"
            step="0.01"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={category === "reclaim" ? "e.g. 10.0" : "e.g. 10.5"}
            required
          />
        </div>

        {locationType === "van" && (
          <div className={`${styles.dynamicSection} glass-panel`} style={{ borderColor: 'var(--primary)', marginBottom: '1rem', marginTop: '1.5rem' }}>
            <div className={styles.inputGroup}>
              <label>Vehicle / Van Registration</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={vehicleReg}
                    onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                    placeholder="Enter Registration"
                    style={{
                      background: 'transparent', border: 'none', color: 'var(--primary)',
                      fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.05em',
                      fontFamily: 'var(--font-geist-mono)', width: '100%', outline: 'none',
                      padding: 0
                    }}
                  />
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Tap to edit van registration</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={
            isSubmitting ||
            !effectiveSerial ||
            effectiveSerial === "UNKNOWN" ||
            (!serialCheck.isValid && !serialWarningConfirmed) ||
            !weight ||
            !poNumber ||
            !supplier ||
            (locationType === "site" && !locationId) ||
            (locationType === "van" && !vehicleReg) ||
            (category === "new" && gasType === "Other" && !customGas)
          }
        >
          {isSubmitting ? <span className={styles.spinner}></span> : <><Database size={20} /> Register into System</>}
        </button>
      </form>
    </div>
  );
}
