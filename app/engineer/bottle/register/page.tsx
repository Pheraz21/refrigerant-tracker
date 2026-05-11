"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Database, ArrowLeft, Truck, Building2, MapPin, RotateCcw, Wind } from "lucide-react";
import styles from "../../log/page.module.css"; // Reuse existing form styles
import { db, BottleCategory } from "@/lib/db";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

export default function RegisterBottlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serialParam = searchParams.get("serial") || "UNKNOWN";
  const { user } = useAuth();

  const [category, setCategory] = useState<BottleCategory>("new");
  const [gasType, setGasType] = useState("R410A");
  const [locationType, setLocationType] = useState<"van" | "office" | "office_collected" | "site">(user?.role === "admin" ? "office" : "van");
  const [locationId, setLocationId] = useState("");
  const [vehicleReg, setVehicleReg] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [weight, setWeight] = useState("");
  const [customGas, setCustomGas] = useState("");
  const [rentalExpiryDate, setRentalExpiryDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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
          serial: serialParam
        }
      });
    }

    await db.registerBottle({
      serial: serialParam,
      category,
      gasType: category === "reclaim" ? "Mixed/Recovery" : (category === "nitrogen" ? "Nitrogen" : finalGas),
      initialWeight: Number(weight),
      currentWeight: category === "reclaim" ? 0 : Number(weight),
      locationType: locationType as any,
      locationId: locationType === "van" ? `${user?.name} - Van` : (locationType === "office" || locationType === "office_collected") ? "HQ-Stores" : locationId,
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
  };

  if (isSuccess) {
    return (
      <div className={styles.successContainer}>
        <CheckCircle2 size={64} color="var(--success)" />
        <h2>Bottle Registered!</h2>
        <p>This bottle is now tracked in {locationType === "van" ? "your van" : (locationType === "office" || locationType === "office_collected") ? "the office/stores" : "the job site"}.</p>
        <button onClick={() => router.push("/engineer")} className={styles.primaryBtn}>
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/engineer" className={styles.backBtn}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ color: "var(--primary)" }}>Unregistered Bottle</h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Please register this bottle into the system</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.readonlyField}>
          <span className={styles.label}>Scanned Serial Number</span>
          <span className={styles.value}>{serialParam}</span>
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
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>New</span>
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
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Reclaim</span>
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
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Nitrogen</span>
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
          <div className={styles.readonlyField} style={{ background: 'rgba(255, 170, 0, 0.1)', borderColor: 'rgba(255, 170, 0, 0.3)', marginTop: '-0.5rem', marginBottom: '1.5rem' }}>
            <span className={styles.label}>Gas Type</span>
            <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Unknown (Mixed/Recovery)</span>
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
              <label>Job Number</label>
              <input
                type="text"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="e.g. JOB-88219"
                required
              />
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
