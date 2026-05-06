"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Save, ArrowLeft } from "lucide-react";
import styles from "./page.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { AlertTriangle } from "lucide-react";

type JobType = "service" | "install" | "retrofit" | "recovery" | "waste";

export default function LogBottlePage() {
  const router = useRouter();
  // In Next.js 14/15 app router, useSearchParams must be wrapped in Suspense if pre-rendered, 
  // but for client-side rapid mockups, we can use it directly or mock it if it errors.
  const searchParams = useSearchParams();
  const serialParam = searchParams.get("serial") || "UNKNOWN";
  
  const [jobType, setJobType] = useState<JobType>("service");
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
  const { user } = useAuth();

  const [equipmentList, setEquipmentList] = useState([
    { id: 1, manufacturer: "", model: "", serial: "", weight: "", decommissioned: false }
  ]);

  const totalWeight = equipmentList.reduce((sum, eq) => sum + (parseFloat(eq.weight) || 0), 0);

  const addEquipment = () => {
    setEquipmentList([...equipmentList, { id: Date.now(), manufacturer: "", model: "", serial: "", weight: "", decommissioned: false }]);
  };

  const updateEquipment = (id: number, field: string, value: string) => {
    setEquipmentList(equipmentList.map(eq => eq.id === id ? { ...eq, [field]: value } : eq));
  };

  const removeEquipment = (id: number) => {
    setEquipmentList(equipmentList.filter(eq => eq.id !== id));
  };

  useEffect(() => {
    db.getBottle(serialParam).then(b => {
      if (b) {
        setBottleCategory(b.category);
        setBottleData(b);
        if (b.category === "reclaim") {
          setJobType("recovery");
          setRefrigerantType("Mixed/Recovery");
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
          // Only auto-fill producer site details if the bottle is still at the SAME site
          // as a previous recovery. If it's at a NEW site, leave blank for the engineer.
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
            // If no match, leave producerSite blank — this is a new site
          }
        }
      }
    });
  }, [serialParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!bottleData) return;

    // Weight Validation
    if (bottleCategory === "reclaim") {
      const currentFill = bottleData.currentWeight || 0;
      const maxFill = bottleData.maxWeight || 20; // Default to 20 if not set
      if (currentFill + totalWeight > maxFill) {
        setValidationError(`Cannot add ${totalWeight.toFixed(2)}kg. Bottle only has ${(maxFill - currentFill).toFixed(2)}kg of space left.`);
        return;
      }
    } else if (bottleCategory === "supply") {
      const currentSupply = bottleData.currentWeight || 0;
      if (totalWeight > currentSupply) {
        setValidationError(`Cannot log ${totalWeight.toFixed(2)}kg usage. Only ${currentSupply.toFixed(2)}kg of gas remains in this bottle.`);
        return;
      }
    }

    
    // §4.2: Check if this is adding a 2nd producer site
    const isRecovery = jobType === "recovery";
    const hasExistingSites = existingProducerSites.length > 0;
    
    // Detect new site by comparing the bottle's CURRENT location (job number)
    // against the locations where gas was previously recovered.
    // Also check if the producer site details entered differ from stored ones.
    const currentLocation = bottleData?.locationId || jobNumber;
    const isNewSite = hasExistingSites && (
      // Check if current job location doesn't match any stored producer site
      !existingProducerSites.some(
        s => s.name === currentLocation || s.name === producerSite.name
      ) ||
      // Or if the form has different details than ALL existing sites
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
    
    await db.logUsage(serialParam, jobType, totalWeight, jobType === "waste", jobType === "recovery" ? producerSite : undefined, finalRefrigerant, user?.name || "Unknown");

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
        destination: "Office/Stores",
        sites: sites,
        vehicleReg: vehicleReg,
        engineer: user?.name,
        date: new Date().toISOString(),
        gasType: finalRefrigerant || bottleData.gasType || "Unknown",
        fillWeight: (bottleData.currentWeight || 0) + totalWeight
      });
      // Update bottle with new intended destination
      await db.updateBottleLocation(serialParam, bottleData.locationType, bottleData.locationId, "Office/Stores", "office" as any, hwcnId);
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

  if (isSuccess) {
    return (
      <div className={styles.successContainer}>
        <CheckCircle2 size={64} color="var(--success)" />
        <h2>Log Saved Successfully!</h2>
        <p>REFCOM compliance data recorded.</p>
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
            {hasExistingHWCN || bottleData?.intendedDestination === "Office/Stores" ? (
              <>
                <p style={{fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem', color: 'var(--text-main)'}}>
                  You are adding a 2nd waste producer to this bottle. It cannot be returned by an engineer direct to supplier and must go back to the <strong>Office / Stores</strong>.
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
                  The Intended Destination will be automatically changed to <strong style={{color: 'var(--warning)'}}>Office / Stores</strong> and an Internal HWCN will be generated.
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
        <Link href="/engineer" className={styles.backBtn}>
          <ArrowLeft size={20} />
        </Link>
        <h1>{bottleCategory === "reclaim" ? "Log Gas Recovery" : "Log Bottle Activity"}</h1>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.readonlyField}>
          <span className={styles.label}>Cylinder Serial Number</span>
          <span className={styles.value}>{serialParam}</span>
        </div>

        {(jobType === "service" || jobType === "install" || jobType === "retrofit" || jobType === "recovery") && (
          <div className={`${styles.dynamicSection} glass-panel`} style={{ borderColor: 'var(--primary)', marginTop: '0.5rem', marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Job & Site Details</h3>
            <div className={styles.inputGroup}>
              <label>Job Number</label>
              <input 
                type="text" 
                placeholder="e.g. JOB-88219" 
                value={jobNumber}
                onChange={(e) => setJobNumber(e.target.value)}
                required 
              />
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
            <label>{jobType === "recovery" ? "Gas Type Being Recovered" : "Refrigerant Type"}</label>
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
          </div>
          
          {(jobType === "service" || jobType === "install" || jobType === "retrofit" || jobType === "recovery") && (
            <div className={styles.inputGroup}>
              <label>Total Logged Weight (kg)</label>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(0, 229, 255, 0.1)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)', fontWeight: '700', fontSize: '1.2rem', textAlign: 'center' }}>
                {totalWeight.toFixed(2)} kg
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Fields based on REFCOM Requirements */}
        {(jobType === "service" || jobType === "install" || jobType === "retrofit" || jobType === "recovery") && (
          <div className={`${styles.dynamicSection} glass-panel`} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3>Equipment Details</h3>

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
                  <input type="text" placeholder="e.g. FDTC50VF" value={eq.model} onChange={(e) => updateEquipment(eq.id, 'model', e.target.value)} required />
                </div>
                <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                  <label>Serial Number</label>
                  <input type="text" placeholder="e.g. 9948201B" value={eq.serial} onChange={(e) => updateEquipment(eq.id, 'serial', e.target.value)} required />
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
