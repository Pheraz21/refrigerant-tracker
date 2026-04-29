"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Save, ArrowLeft } from "lucide-react";
import styles from "./page.module.css";
import Link from "next/link";
import { db } from "@/lib/db";

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
  const [producerSite, setProducerSite] = useState({ name: "", address: "", postcode: "" });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bottleCategory, setBottleCategory] = useState<string | null>(null);

  const [equipmentList, setEquipmentList] = useState([
    { id: 1, manufacturer: "", model: "", serial: "", freeIssue: "no", weight: "" }
  ]);

  const totalWeight = equipmentList.reduce((sum, eq) => sum + (parseFloat(eq.weight) || 0), 0);

  const addEquipment = () => {
    setEquipmentList([...equipmentList, { id: Date.now(), manufacturer: "", model: "", serial: "", freeIssue: "no", weight: "" }]);
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
        if (b.category === "reclaim") {
          setJobType("recovery");
        }
      }
    });
  }, [serialParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const finalRefrigerant = refrigerantType === "other" ? customRefrigerant : refrigerantType;
    
    // Pass finalRefrigerant if db supports it, but for now we just log usage
    await db.logUsage(serialParam, jobType, totalWeight, jobType === "waste", jobType === "recovery" ? producerSite : undefined);

    setIsSubmitting(false);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className={styles.successContainer}>
        <CheckCircle2 size={64} color="var(--success)" />
        <h2>Log Saved Successfully!</h2>
        <p>REFCOM compliance data recorded.</p>
        <button onClick={() => router.push("/dashboard")} className={styles.primaryBtn}>
          Return to Dashboard
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
              <input type="text" placeholder="e.g. JOB-88219" required />
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
            <label>Refrigerant Type</label>
            <select value={refrigerantType} onChange={(e) => setRefrigerantType(e.target.value)} required>
              <option value="R410A">R410A</option>
              <option value="R32">R32</option>
              <option value="R134a">R134a</option>
              <option value="R404A">R404A</option>
              <option value="R407C">R407C</option>
              <option value="R22">R22</option>
              <option value="other">Other (Specify)</option>
            </select>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Equipment Details</h3>
              <button type="button" onClick={addEquipment} style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.85rem' }}>+ Add Asset</button>
            </div>
            
            {equipmentList.map((eq, index) => (
              <div key={eq.id} style={{ position: 'relative', borderLeft: '2px solid var(--primary)', paddingLeft: '1rem' }}>
                {equipmentList.length > 1 && (
                  <button type="button" onClick={() => removeEquipment(eq.id)} style={{ position: 'absolute', top: '0', right: '0', background: 'transparent', border: 'none', color: '#ff3366', cursor: 'pointer' }}>Remove</button>
                )}
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Asset {index + 1}</h4>
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
                <div className={styles.row} style={{marginTop: '0.5rem'}}>
                  <div className={styles.inputGroup}>
                    <label>Free Issue (Client)?</label>
                    <select value={eq.freeIssue} onChange={(e) => updateEquipment(eq.id, 'freeIssue', e.target.value)}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                  <div className={styles.inputGroup}>
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
              </div>
            ))}
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
              <input type="text" placeholder="e.g. HWCN-9921" required />
            </div>
            <div className={styles.inputGroup} style={{marginTop: '1rem'}}>
              <label>Upload Supplier HWCN Paperwork (Optional)</label>
              <input type="file" accept="image/*,.pdf" style={{padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--border)', color: 'var(--text-muted)'}} />
              <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem'}}>Take a photo of the completed supplier note for your digital records.</p>
            </div>
          </div>
        )}

        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? <span className={styles.spinner}></span> : <><Save size={20} /> Save Compliance Log</>}
        </button>
      </form>
    </div>
  );
}
