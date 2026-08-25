"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Save, ArrowLeft } from "lucide-react";
import styles from "./page.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { AlertTriangle } from "lucide-react";

type JobType = "service" | "install" | "retrofit" | "recovery" | "waste" | "recycled_charge";

export default function LogBottlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serialParam = searchParams.get("serial") || "UNKNOWN";
  const modeParam = searchParams.get("mode");
  const isRecycleMode = modeParam === "recycle";
  
  const [jobType, setJobType] = useState<JobType>(isRecycleMode ? "recycled_charge" : "service");
  const [refrigerantType, setRefrigerantType] = useState("R410A");
  const [customRefrigerant, setCustomRefrigerant] = useState("");
  const [jobNumber, setJobNumber] = useState("");
  const [producerSite, setProducerSite] = useState({ name: "", address: "", postcode: "" });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bottleCategory, setBottleCategory] = useState<string | null>(null);
  const [existingProducerSites, setExistingProducerSites] = useState<any[]>([]);
  const [showMultiSiteWarning, setShowMultiSiteWarning] = useState(false);
  const [multiSiteAcknowledged, setMultiSiteAcknowledged] = useState(false);
  const [bottleData, setBottleData] = useState<any>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasExistingHWCN, setHasExistingHWCN] = useState(false);
  const { user, activeVehicleOwner } = useAuth();
  const [crmMatch, setCrmMatch] = useState<string | null>(null);

  // Apprentice Supervision State
  const [qualifiedEngineers, setQualifiedEngineers] = useState<any[]>([]);
  const [supervisingEngineer, setSupervisingEngineer] = useState("");

  const [equipmentList, setEquipmentList] = useState([
    { id: 1, manufacturer: "", model: "", serial: "", weight: "", decommissioned: false }
  ]);

  const totalWeight = equipmentList.reduce((sum, eq) => sum + (parseFloat(eq.weight) || 0), 0);

  const addEquipment = () => {
    setEquipmentList([...equipmentList, { id: Date.now(), manufacturer: "", model: "", serial: "", weight: "", decommissioned: false }]);
  };

  const updateEquipment = (id: number, field: string, value: string) => {
    const finalValue = (field === "model" || field === "serial") ? value.toUpperCase() : value;
    setEquipmentList(equipmentList.map(eq => eq.id === id ? { ...eq, [field]: finalValue } : eq));
  };

  const removeEquipment = (id: number) => {
    setEquipmentList(equipmentList.filter(eq => eq.id !== id));
  };

  useEffect(() => {
    if (user?.role === "apprentice") {
      db.getQualifiedEngineers().then(engineers => {
        setQualifiedEngineers(engineers);
        // Default to active working van lead engineer if set
        if (activeVehicleOwner) {
          const match = engineers.find(e => e.name.toLowerCase() === activeVehicleOwner.toLowerCase());
          if (match) {
            setSupervisingEngineer(match.name);
          } else if (engineers.some(e => e.name === activeVehicleOwner)) {
            setSupervisingEngineer(activeVehicleOwner);
          }
        }
      });
    }
  }, [user, activeVehicleOwner]);

  useEffect(() => {
    db.getBottle(serialParam).then(b => {
      if (b) {
        setBottleCategory(b.category);
        setBottleData(b);
        if (isRecycleMode) {
          setJobType("recycled_charge");
          setRefrigerantType(b.gasType || "Recycled Gas");
        } else if (b.category === "reclaim") {
          setJobType("recovery");
          setRefrigerantType("Mixed/Recovery");
        } else {
          setRefrigerantType(b.gasType || "R410A");
        }
        // Track existing producer sites for multi-site detection
        if (b.producerSites && b.producerSites.length > 0) {
          setExistingProducerSites(b.producerSites);
        }
        // Check if an Internal HWCN already exists for this bottle
        if (b.activeHWCN) {
          setHasExistingHWCN(true);
        } else {
          // Also check DB for any HWCNs linked to this bottle
          db.getHWCNsForBottle(serialParam).then(hwcns => {
            if (hwcns && hwcns.length > 0) setHasExistingHWCN(true);
          });
        }
        // Auto-fill Job Number if bottle is on a site
        if (b.locationType === "site" && b.locationId) {
          setJobNumber(b.locationId);
          if (b.producerSites && b.producerSites.length > 0) {
            const matchingSite = b.producerSites.find(
              (s: any) => s.name === b.locationId
            );
            if (matchingSite) {
              setProducerSite({
                name: matchingSite.name || "",
                address: matchingSite.address || "",
                postcode: matchingSite.postcode || ""
              });
            }
          }
        }
      }
    });
  }, [serialParam, isRecycleMode]);

  useEffect(() => {
    if (!jobNumber || jobNumber.length < 3) {
      setCrmMatch(null);
      return;
    }
    db.getCrmJobByNumber(jobNumber).then(crmJob => {
      if (crmJob) {
        setCrmMatch(crmJob.siteTitle || "");
        if (jobType === "recovery") {
          setProducerSite(prev => ({
            name: prev.name || crmJob.siteTitle || "",
            address: prev.address || crmJob.siteAddress || "",
            postcode: prev.postcode || crmJob.sitePostcode || ""
          }));
        }
      } else {
        setCrmMatch(null);
      }
    });
  }, [jobNumber, jobType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!bottleData) return;

    // Job Number Format Validation (1 letter followed by numbers without spaces)
    const cleanJobNumber = (jobNumber || "").trim().replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Za-z]\d+$/.test(cleanJobNumber)) {
      setValidationError("Job number must start with 1 letter followed by numbers without spaces (e.g. J12345, M98201).");
      return;
    }

    // Apprentice supervision check
    if (user?.role === "apprentice" && !supervisingEngineer.trim()) {
      setValidationError("Apprentice logging requires selecting an approved Supervising F-Gas Engineer.");
      return;
    }

    // Weight Validation
    if (isRecycleMode || jobType === "recycled_charge") {
      const availableReclaim = bottleData.currentWeight || 0;
      if (totalWeight <= 0) {
        setValidationError("Please enter the weight of recycled gas charged into equipment.");
        return;
      }
      if (totalWeight > availableReclaim) {
        setValidationError(`Cannot dispense ${totalWeight.toFixed(2)}kg. Only ${availableReclaim.toFixed(2)}kg of recycled gas is currently in this cylinder.`);
        return;
      }
    } else if (bottleCategory === "reclaim") {
      const currentFill = bottleData.currentWeight || 0;
      const maxFill = bottleData.maxWeight || 20; // Default to 20 if not set
      if (currentFill + totalWeight > maxFill) {
        setValidationError(`Cannot add ${totalWeight.toFixed(2)}kg. Bottle only has ${(maxFill - currentFill).toFixed(2)}kg of space left.`);
        return;
      }
    } else if (bottleCategory === "supply" || bottleCategory === "new") {
      const currentSupply = bottleData.currentWeight || 0;
      if (totalWeight > currentSupply) {
        setValidationError(`Cannot log ${totalWeight.toFixed(2)}kg usage. Only ${currentSupply.toFixed(2)}kg of gas remains in this bottle.`);
        return;
      }
    }

    // §4.2: Check if this is adding a 2nd producer site
    const isRecovery = jobType === "recovery";
    const hasExistingSites = existingProducerSites.length > 0;
    
    const currentLocation = bottleData?.locationId || jobNumber;
    const isNewSite = hasExistingSites && (
      !existingProducerSites.some(
        s => s.name === currentLocation || s.name === producerSite.name
      ) ||
      !existingProducerSites.some(
        s => s.name === producerSite.name && s.address === producerSite.address
      )
    );
    
    if (isRecovery && isNewSite && !multiSiteAcknowledged) {
      setShowMultiSiteWarning(true);
      return;
    }
    
    setIsSubmitting(true);
    const finalRefrigerant = refrigerantType === "other" ? customRefrigerant : refrigerantType;
    
    const equipmentToSave = equipmentList
      .filter(eq => eq.manufacturer || eq.model || eq.serial)
      .map(eq => ({
        manufacturer: (eq.manufacturer || "").trim(),
        model: (eq.model || "").trim().toUpperCase(),
        serial: (eq.serial || "").trim().toUpperCase(),
        weight: parseFloat(eq.weight) || 0
      }));

    const derivedJobType = (() => {
      if (isRecycleMode || jobType === "recycled_charge") return "recycled_charge";
      if (jobType === "recovery" || jobType === "waste") return jobType;
      const prefix = (jobNumber || "").split(/[-\s_]/)[0].toUpperCase();
      if (prefix === "C") return "install";
      if (prefix === "M") return "maintenance";
      return "service";
    })();

    await db.logUsage(
      serialParam,
      derivedJobType,
      totalWeight,
      derivedJobType === "waste",
      derivedJobType === "recovery" ? producerSite : undefined,
      finalRefrigerant,
      user?.name || "Unknown",
      jobNumber || undefined,
      equipmentToSave.length > 0 ? equipmentToSave : undefined,
      supervisingEngineer || undefined
    );

    // §4.2: If multi-site was acknowledged, auto-generate Internal HWCN and set dest to Office
    if (isRecovery && multiSiteAcknowledged && bottleData) {
      const sites = [...existingProducerSites, producerSite];
      let vehicleReg = "";
      if (user?.id) {
        const profile = await db.getEngineerById(user.id);
        if (profile?.vehicleReg) vehicleReg = profile.vehicleReg;
      }
      const hwcnId = await db.createHWCN({
        serial: serialParam,
        destination: "HQ-Stores",
        sites: sites,
        vehicleReg: vehicleReg,
        engineer: user?.name,
        date: new Date().toISOString(),
        gasType: finalRefrigerant || bottleData.gasType || "Unknown",
        fillWeight: (bottleData.currentWeight || 0) + totalWeight
      });
      // Update bottle with new intended destination
      await db.updateBottleLocation(serialParam, bottleData.locationType, bottleData.locationId, "HQ-Stores", "office" as any, hwcnId);
    }

    // Log decommissioned equipment if any are flagged
    const decomEquipment = equipmentList.filter(eq => eq.decommissioned && eq.manufacturer);
    if (decomEquipment.length > 0 && isRecovery) {
      try {
        await db.logDecommission({
          bottleSerial: serialParam,
          jobNumber: jobNumber,
          siteName: producerSite.name || jobNumber,
          siteAddress: producerSite.address || "",
          sitePostcode: producerSite.postcode || "",
          engineer: user?.name || "Unknown",
          equipment: decomEquipment.map(eq => ({
            manufacturer: eq.manufacturer,
            model: eq.model,
            serial: eq.serial,
            weightRecovered: parseFloat(eq.weight) || 0
          })),
          gasType: finalRefrigerant,
          totalWeightRecovered: decomEquipment.reduce((sum, eq) => sum + (parseFloat(eq.weight) || 0), 0)
        });
      } catch (err) {
        console.error('Error logging decommission:', err);
      }
    }

    setIsSubmitting(false);
    setIsSuccess(true);
  };

  // Mate Role Intercept (Non-F-Gas qualified)
  if (user?.role === "mate") {
    return (
      <div className={styles.container} style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
        <div style={{
          width: "80px", height: "80px", borderRadius: "50%",
          background: "rgba(255, 170, 0, 0.12)", border: "2px solid var(--warning)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1.5rem"
        }}>
          <AlertTriangle size={42} color="var(--warning)" />
        </div>
        <h2 style={{ color: "#fff", marginBottom: "0.75rem", fontSize: "1.3rem" }}>F-Gas Qualification Required</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", lineHeight: 1.6, maxWidth: "380px", margin: "0 auto 2rem" }}>
          Under UK F-Gas and REFCOM regulations, only certified engineers (or supervised apprentices) may charge or recover refrigerant. Mates can move cylinders and manage van inventory.
        </p>
        <Link href="/engineer" style={{ textDecoration: "none" }}>
          <button className={styles.primaryBtn} style={{ width: "100%" }}>
            Return to Dashboard
          </button>
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className={styles.successContainer}>
        <CheckCircle2 size={64} color="var(--success)" />
        <h2>{isRecycleMode ? "Recycled Gas Charged!" : "Log Saved Successfully!"}</h2>
        <p>{isRecycleMode ? "Re-charge into on-site equipment recorded." : "REFCOM compliance data recorded."}</p>
        <button onClick={() => router.push("/engineer")} className={styles.primaryBtn}>
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>

      {/* §4.2 Multi-Site Producer Warning Overlay */}
      {showMultiSiteWarning && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '2px solid var(--warning)',
            borderRadius: '16px', padding: '2rem', maxWidth: '420px', width: '100%'
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem'}}>
              <AlertTriangle size={32} color="var(--warning)" />
              <h3 style={{color: 'var(--warning)', margin: 0}}>2nd Waste Producer Detected</h3>
            </div>
            {hasExistingHWCN || bottleData?.intendedDestination === "HQ-Stores" ? (
              <>
                <p style={{fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem', color: 'var(--text-main)'}}>
                  You are adding a 2nd waste producer to this bottle. It cannot be returned by an engineer direct to supplier and must go back to the <strong>HQ-Stores</strong>.
                </p>
                <p style={{fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.5rem', color: 'var(--text-muted)'}}>
                  There is already an Internal HWCN in place for this bottle, the 2nd waste producer will be added to that HWCN.
                </p>
              </>
            ) : (
              <>
                <p style={{fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem', color: 'var(--text-main)'}}>
                  You are adding a 2nd waste producer to this bottle. It can <strong>no longer be returned Direct to Supplier</strong>.
                </p>
                <p style={{fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.5rem', color: 'var(--text-muted)'}}>
                  The Intended Destination will be automatically changed to <strong style={{color: 'var(--warning)'}}>HQ-Stores</strong> and an Internal HWCN will be generated.
                </p>
              </>
            )}
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
              <button 
                className={styles.primaryBtn}
                style={{background: 'var(--warning)', color: '#000', width: '100%'}}
                onClick={() => {
                  setMultiSiteAcknowledged(true);
                  setShowMultiSiteWarning(false);
                  // Re-trigger the form submission
                  setTimeout(() => {
                    const form = document.querySelector('form');
                    if (form) form.requestSubmit();
                  }, 100);
                }}
              >
                Acknowledge
              </button>
              <button 
                style={{background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer'}}
                onClick={() => setShowMultiSiteWarning(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <header className={styles.header}>
        <Link href={`/engineer/bottle/${serialParam}`} className={styles.backBtn}>
          <ArrowLeft size={20} />
        </Link>
        <h1>
          {isRecycleMode
            ? "Re-charge Recycled Gas (On-Site)"
            : bottleCategory === "reclaim"
              ? "Log Gas Recovery"
              : "Log Bottle Activity"}
        </h1>
      </header>

      {/* Apprentice Supervised Logging Banner */}
      {user?.role === "apprentice" && (
        <div style={{
          background: "linear-gradient(90deg, rgba(192, 132, 252, 0.15) 0%, rgba(192, 132, 252, 0.05) 100%)",
          border: "1px solid rgba(192, 132, 252, 0.4)",
          borderRadius: "12px",
          padding: "1rem",
          marginBottom: "1.25rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "1.1rem" }}>🎓</span>
            <span style={{ fontWeight: 700, color: "#c084fc", fontSize: "0.95rem" }}>
              Apprentice Supervised Logging
            </span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 0.75rem 0", lineHeight: 1.4 }}>
            UK F-Gas regulations require apprentice activities to be directly supervised by a qualified F-Gas engineer.
          </p>
          <div className={styles.inputGroup}>
            <label style={{ color: "#c084fc", fontSize: "0.8rem", fontWeight: 700 }}>Supervising F-Gas Engineer *</label>
            <select
              value={supervisingEngineer}
              onChange={e => setSupervisingEngineer(e.target.value)}
              required
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid #c084fc",
                borderRadius: "8px",
                color: "#fff",
                padding: "0.65rem 0.75rem",
                width: "100%",
                fontSize: "0.9rem"
              }}
            >
              <option value="">-- Select Supervising Engineer --</option>
              {qualifiedEngineers.map(eng => (
                <option key={eng.id} value={eng.name}>
                  {eng.name} {eng.vehicleReg ? `(${eng.vehicleReg})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Recycled Gas On-Site Info Banner */}
      {isRecycleMode && (
        <div style={{
          background: "linear-gradient(90deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)",
          border: "1px solid rgba(34, 197, 94, 0.4)",
          borderRadius: "12px",
          padding: "1rem",
          marginBottom: "1.25rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "1.1rem" }}>♻️</span>
            <span style={{ fontWeight: 700, color: "var(--success)", fontSize: "0.95rem" }}>
              On-Site Gas Recycling
            </span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
            Re-charging recovered gas on the same site into existing or new equipment. Available gas in cylinder: <strong style={{ color: "#fff" }}>{bottleData?.currentWeight || 0} kg</strong>.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.readonlyField}>
          <span className={styles.label}>Cylinder Serial Number</span>
          <span className={styles.value}>{serialParam}</span>
        </div>

        {(jobType === "service" || jobType === "install" || jobType === "retrofit" || jobType === "recovery" || jobType === "recycled_charge") && (
          <div className={`${styles.dynamicSection} glass-panel`} style={{ borderColor: isRecycleMode ? 'var(--success)' : 'var(--primary)', marginTop: '0.5rem', marginBottom: '1rem' }}>
            <h3 style={{ color: isRecycleMode ? 'var(--success)' : 'var(--primary)', marginBottom: '1rem' }}>
              {isRecycleMode ? "Recipient Job Details" : "Job & Site Details"}
            </h3>
            <div className={styles.inputGroup}>
              <label>Job Number (e.g. J12345, M98201)</label>
              <input
                type="text"
                placeholder="e.g. J12345"
                value={jobNumber}
                pattern="^[A-Za-z][0-9]+$"
                title="Job number must start with 1 letter followed by numbers without spaces (e.g. J12345)"
                onChange={(e) => setJobNumber(e.target.value.replace(/\s+/g, "").toUpperCase())}
                required
              />
              {crmMatch && (
                <p style={{fontSize: "0.75rem", color: isRecycleMode ? "var(--success)" : "var(--primary)", marginTop: "0.3rem"}}>
                  ✓ {crmMatch}
                </p>
              )}
            </div>

            {jobType === "recovery" && (
              <>
                <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem', marginBottom: '0.5rem'}}>
                  For Hazardous Waste tracking, enter the full producer address:
                </p>
                <div className={styles.inputGroup}>
                  <label>Site / Client Name</label>
                  <input type="text" placeholder="e.g. Retail Store #4" value={producerSite.name} onChange={(e) => setProducerSite({...producerSite, name: e.target.value})} required />
                </div>
                <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                  <label>Site Address</label>
                  <input type="text" placeholder="e.g. 123 High Street" value={producerSite.address} onChange={(e) => setProducerSite({...producerSite, address: e.target.value})} required />
                </div>
                <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                  <label>Site Postcode</label>
                  <input type="text" placeholder="e.g. NE1 4XP" value={producerSite.postcode} onChange={(e) => setProducerSite({...producerSite, postcode: e.target.value})} required />
                </div>
              </>
            )}
          </div>
        )}

        <div className={styles.row}>
          <div className={styles.inputGroup} style={{flex: 1}}>
            <label>{isRecycleMode ? "Recycled Refrigerant Type" : jobType === "recovery" ? "Gas Type Being Recovered" : "Refrigerant Type"}</label>
            {isRecycleMode ? (
              <div style={{marginTop: '0.25rem'}}>
                <div style={{
                  display: 'inline-block', padding: '0.4rem 1.1rem',
                  background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)',
                  borderRadius: '6px', color: 'var(--success)', fontWeight: 700,
                  fontSize: '0.9rem', letterSpacing: '0.03em'
                }}>
                  {bottleData?.gasType || "Recycled Refrigerant"}
                </div>
                <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem'}}>
                  Gas will be drawn directly from this reclaim cylinder ({bottleData?.currentWeight || 0} kg in cylinder).
                </p>
              </div>
            ) : bottleCategory === "reclaim" ? (
              <>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.25rem'}}>
                  {["R410A", "R32", "R134a", "R404A", "R407C", "R22", "other"].map(gas => (
                    <button
                      key={gas}
                      type="button"
                      onClick={() => setRefrigerantType(gas)}
                      style={{
                        padding: '0.6rem 0.5rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
                        cursor: 'pointer', border: refrigerantType === gas ? 'none' : '1px solid rgba(255,255,255,0.12)',
                        background: refrigerantType === gas ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        color: refrigerantType === gas ? '#000' : 'rgba(255,255,255,0.7)',
                        transition: 'all 0.15s'
                      }}
                    >
                      {gas === "other" ? "Other" : gas}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setRefrigerantType("Mixed/Recovery")}
                  style={{
                    marginTop: '0.5rem', width: '100%', padding: '0.6rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
                    cursor: 'pointer', border: refrigerantType === "Mixed/Recovery" ? 'none' : '1px solid rgba(255,255,255,0.12)',
                    background: refrigerantType === "Mixed/Recovery" ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    color: refrigerantType === "Mixed/Recovery" ? '#000' : 'rgba(255,255,255,0.7)',
                    transition: 'all 0.15s'
                  }}
                >
                  Mixed / Recovery
                </button>
                {refrigerantType === "other" && (
                  <input
                    type="text"
                    placeholder="Enter refrigerant (e.g. R407C)"
                    value={customRefrigerant}
                    onChange={(e) => setCustomRefrigerant(e.target.value)}
                    style={{marginTop: '0.5rem'}}
                    required
                  />
                )}
                {jobType === "recovery" && (
                  <p style={{fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.3rem'}}>
                    This updates the bottle label only. The bottle remains classified as Hazardous Waste.
                  </p>
                )}
              </>
            ) : (
              <div style={{marginTop: '0.25rem'}}>
                <div style={{
                  display: 'inline-block', padding: '0.4rem 1.1rem',
                  background: 'rgba(0, 229, 255, 0.1)', border: '1px solid var(--primary)',
                  borderRadius: '20px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem'
                }}>
                  {bottleData?.gasType || refrigerantType}
                </div>
                <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem'}}>
                  Set at registration — cannot be changed.
                </p>
              </div>
            )}
          </div>
          
          {(jobType === "service" || jobType === "install" || jobType === "retrofit" || jobType === "recovery" || jobType === "recycled_charge") && (
            <div className={styles.inputGroup}>
              <label>Total Logged Weight (kg)</label>
              <div style={{ padding: '0.75rem 1rem', background: isRecycleMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0, 229, 255, 0.1)', border: isRecycleMode ? '1px solid var(--success)' : '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', color: isRecycleMode ? 'var(--success)' : 'var(--primary)', fontWeight: '700', fontSize: '1.2rem', textAlign: 'center' }}>
                {totalWeight.toFixed(2)} kg
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Fields based on REFCOM Requirements */}
        {(jobType === "service" || jobType === "install" || jobType === "retrofit" || jobType === "recovery" || jobType === "recycled_charge") && (
          <div className={`${styles.dynamicSection} glass-panel`} style={{ borderColor: isRecycleMode ? 'var(--success)' : 'var(--primary)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ color: isRecycleMode ? 'var(--success)' : 'var(--primary)' }}>{isRecycleMode ? "Recipient Equipment Asset Details" : "Equipment Details"}</h3>

            {equipmentList.map((eq, index) => (
              <div key={eq.id} style={{ position: 'relative', borderLeft: '2px solid var(--primary)', paddingLeft: '1rem' }}>
                {equipmentList.length > 1 && (
                  <button type="button" onClick={() => removeEquipment(eq.id)} style={{ position: 'absolute', top: '0', right: '0', background: 'transparent', border: 'none', color: '#ff3366', cursor: 'pointer' }}>Remove</button>
                )}
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Asset {index + 1}</h4>
                {jobType === "recovery" && (
                  <div style={{
                    marginBottom: '0.75rem', padding: '0.75rem', borderRadius: '8px',
                    background: eq.decommissioned ? 'rgba(255, 68, 68, 0.08)' : 'rgba(255,255,255,0.02)',
                    border: eq.decommissioned ? '1px solid rgba(255, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                    transition: 'all 0.2s'
                  }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                      <AlertTriangle size={16} color={eq.decommissioned ? '#ff4444' : 'var(--text-muted)'} />
                      <span style={{fontSize: '0.85rem', fontWeight: 600, color: eq.decommissioned ? '#ff4444' : 'var(--text-muted)'}}>
                        Equipment Decommissioned?
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEquipmentList(equipmentList.map(e => e.id === eq.id ? {...e, decommissioned: !e.decommissioned} : e));
                      }}
                      style={{
                        padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                        border: 'none', transition: 'all 0.2s',
                        background: eq.decommissioned ? '#ff4444' : 'rgba(255,255,255,0.08)',
                        color: eq.decommissioned ? '#fff' : 'var(--text-muted)'
                      }}
                    >
                      {eq.decommissioned ? '✓ Yes — Decommissioned' : 'No'}
                    </button>
                  </div>
                )}
                <div className={styles.inputGroup}>
                  <label>Manufacturer</label>
                  <input type="text" placeholder="e.g. Daikin, Mitsubishi" value={eq.manufacturer} onChange={(e) => updateEquipment(eq.id, 'manufacturer', e.target.value)} required />
                </div>
                <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                  <label>Model Number</label>
                  <input type="text" placeholder="e.g. FDTC50VF" value={eq.model} onChange={(e) => updateEquipment(eq.id, 'model', e.target.value)} style={{ textTransform: 'uppercase' }} required />
                </div>
                <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                  <label>Serial Number</label>
                  <input type="text" placeholder="e.g. 9948201B" value={eq.serial} onChange={(e) => updateEquipment(eq.id, 'serial', e.target.value)} style={{ textTransform: 'uppercase' }} required />
                </div>
                <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                  <label>Weight Logged (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1.5"
                    value={eq.weight}
                    onChange={(e) => updateEquipment(eq.id, 'weight', e.target.value)}
                    required
                    style={{ borderColor: 'var(--primary)', background: 'rgba(0, 229, 255, 0.02)' }}
                  />
                </div>
              </div>
            ))}

            <button type="button" onClick={addEquipment} style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, width: '100%', cursor: 'pointer' }}>+ Add Another Asset</button>
          </div>
        )}

        {jobType === "waste" && (
          <div className={`${styles.dynamicSection} glass-panel`}>
            <h3>Waste Disposal Details</h3>
            <div className={styles.inputGroup}>
              <label>Client Name</label>
              <input type="text" placeholder="Client Name" required />
            </div>
            <div className={styles.inputGroup}>
              <label>Hazardous Waste Consignment No.</label>
              <input type="text" placeholder="e.g. 21Degr-100001" required />
            </div>
            <div className={styles.inputGroup} style={{marginTop: '1rem'}}>
              <label>Upload Supplier HWCN Paperwork (Optional)</label>
              <input type="file" accept="image/*,.pdf" style={{padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--border)', color: 'var(--text-muted)'}} />
              <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem'}}>Take a photo of the completed supplier note for your digital records.</p>
            </div>
          </div>
        )}

        {validationError && (
          <div style={{
            background: 'rgba(255, 68, 68, 0.1)', border: '1px solid #ff4444',
            color: '#ff4444', padding: '1rem', borderRadius: '8px', 
            marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <AlertTriangle size={18} />
            {validationError}
          </div>
        )}

        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? <span className={styles.spinner}></span> : <><Save size={20} /> Save Compliance Log</>}
        </button>
      </form>
    </div>
  );
}
