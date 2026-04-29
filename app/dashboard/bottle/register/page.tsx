"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Database, ArrowLeft } from "lucide-react";
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
  const [weight, setWeight] = useState("");
  const [locationType, setLocationType] = useState<"van" | "office" | "office_collected" | "site">(user?.role === "admin" ? "office" : "van");
  const [locationId, setLocationId] = useState("");
  const [vehicleReg, setVehicleReg] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [supplier, setSupplier] = useState("Bejer Ref");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (user?.id && locationType === "van") {
      db.getEngineerById(user.id).then(profile => {
        if (profile?.defaultVehicleReg) {
          setVehicleReg(profile.defaultVehicleReg);
        }
      });
    }
  }, [user, locationType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    await db.registerBottle({
      serial: serialParam,
      category,
      gasType: gasType === "Unknown" && category !== "reclaim" ? "R410A" : gasType,
      initialWeight: Number(weight),
      currentWeight: category === "reclaim" ? 0 : Number(weight),
      locationType: locationType as any,
      locationId: locationType === "van" ? `${user?.name} - Van` : (locationType === "office" || locationType === "office_collected") ? "HQ-Stores" : locationId,
      vehicleReg: locationType === "van" ? vehicleReg : undefined,
      poNumber: poNumber,
      supplier: supplier,
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
        <button onClick={() => router.push(`/dashboard/bottle/${serialParam}`)} className={styles.primaryBtn}>
          View Bottle Actions
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.backBtn}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{color: "var(--primary)"}}>Unregistered Bottle</h1>
          <p style={{fontSize: "0.85rem", color: "var(--text-muted)"}}>Please register this bottle into the system</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.readonlyField}>
          <span className={styles.label}>Scanned Serial Number</span>
          <span className={styles.value}>{serialParam}</span>
        </div>

        <div className={styles.inputGroup}>
          <label>Where is this bottle being received?</label>
          <select value={locationType} onChange={(e) => setLocationType(e.target.value as "van" | "office" | "office_collected" | "site")} required>
            {user?.role === "admin" && (
              <>
                <option value="office">Received into Office / Stores</option>
                <option value="office_collected">Collected from Supplier (to Office)</option>
              </>
            )}
            <option value="van">My Van (Collected by Engineer)</option>
            <option value="site">Direct to Job Site (Delivered by Supplier)</option>
          </select>
        </div>
        {locationType === "van" && (
          <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginBottom: '1rem', marginTop: '-0.5rem'}}>
            <div className={styles.inputGroup}>
              <label>Vehicle Registration</label>
              <input 
                type="text" 
                value={vehicleReg}
                onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                placeholder="e.g. VA68 LNE"
                required
              />
              <p style={{fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.3rem"}}>Default vehicle auto-filled from your profile</p>
            </div>
          </div>
        )}
        {locationType === "site" && (
          <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginBottom: '1rem', marginTop: '-0.5rem'}}>
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

        <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
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
          <select value={supplier} onChange={(e) => setSupplier(e.target.value)} required>
            <option value="Bejer Ref">Bejer Ref</option>
            <option value="Kooltech">Kooltech</option>
            <option value="TF Solutions">TF Solutions</option>
            <option value="Wolseley">Wolseley</option>
            <option value="BOC">BOC</option>
            <option value="Other">Other...</option>
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label>Bottle Type</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as BottleCategory)} required>
            <option value="new">New Refrigerant</option>
            <option value="reclaim">Recovery / Reclaim (Empty)</option>
            <option value="nitrogen">OFN (Nitrogen)</option>
          </select>
        </div>

        {category === "new" && (
          <div className={styles.inputGroup}>
            <label>Refrigerant Gas Type</label>
            <select value={gasType} onChange={(e) => setGasType(e.target.value)} required>
              <option value="R410A">R410A</option>
              <option value="R32">R32</option>
              <option value="R134a">R134a</option>
              <option value="R404A">R404A</option>
            </select>
          </div>
        )}

        {category === "reclaim" && (
          <div className={styles.readonlyField} style={{background: 'rgba(255, 170, 0, 0.1)', borderColor: 'rgba(255, 170, 0, 0.3)'}}>
             <span className={styles.label}>Gas Type</span>
             <span style={{color: 'var(--warning)', fontWeight: 600}}>Unknown (Mixed/Recovery)</span>
          </div>
        )}

        <div className={styles.inputGroup}>
          <label>{category === "reclaim" ? "Max Fill Weight (kg)" : "Gross Weight (Full Cylinder kg)"}</label>
          <input 
            type="number" 
            step="0.01" 
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={category === "reclaim" ? "e.g. 10.0" : "e.g. 10.5"} 
            required 
          />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? <span className={styles.spinner}></span> : <><Database size={20} /> Register into System</>}
        </button>
      </form>
    </div>
  );
}
