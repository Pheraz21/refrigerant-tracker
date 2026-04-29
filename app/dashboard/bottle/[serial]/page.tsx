"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Truck, Wrench, AlertTriangle, ArrowLeft, Loader2, PackageCheck, MapPin, Building2, Users, Building, CheckCircle2 } from "lucide-react";
import styles from "./page.module.css";
import Link from "next/link";
import { db, Bottle } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";

export default function BottleActionHub() {
  const router = useRouter();
  const params = useParams();
  const serial = decodeURIComponent(params.serial as string);
  const { user } = useAuth();
  
  const [bottle, setBottle] = useState<Bottle | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  
  // Inline Transfer States
  const [destination, setDestination] = useState("site");
  const [locationId, setLocationId] = useState("");
  const [engineers, setEngineers] = useState<any[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState("");
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [generatedHWCN, setGeneratedHWCN] = useState<string | null>(null);
  const [vehicleReg, setVehicleReg] = useState("");

  useEffect(() => {
    async function loadInitialData() {
      const b = await db.getBottle(serial);
      if (!b) {
        router.push(`/dashboard/bottle/register?serial=${serial}`);
        return;
      }
      setBottle(b);
      
      // Load engineers for handover
      const profiles = await db.getEngineerProfiles();
      setEngineers(profiles.filter(p => p.id !== user?.id));

      // Load vehicle reg
      if (user?.id) {
        const profile = await db.getEngineerById(user.id);
        if (profile?.vehicleReg) setVehicleReg(profile.vehicleReg);
      }

      setLoading(false);
    }
    loadInitialData();
  }, [serial, router, user]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bottle) return;
    setIsSubmittingTransfer(true);
    
    try {
      if (destination === "van" || destination === "site" || destination === "engineer") {
        const finalDest = destination === "engineer" ? "van" : destination;
        const targetUser = engineers.find(e => e.id === selectedEngineer);
        const finalLocationId = destination === "engineer" 
          ? `${targetUser?.name || "Engineer"} - Van` 
          : locationId || `${user?.name} - Van`;
          
        await db.updateBottleLocation(serial, finalDest as any, finalLocationId);
      } else if (destination === "supplier" || destination === "office") {
        const finalLocationId = destination === "office" ? "Office / Stores" : locationId || "Supplier";
        
        let hwcnId = undefined;
        // Check if HWCN is needed for reclaim
        if (bottle.category === "reclaim" && (bottle.currentWeight || 0) > 0) {
          const allSites = bottle.producerSites && bottle.producerSites.length > 0
            ? bottle.producerSites
            : [{name: "Unknown Site", address: "See recovery logs", postcode: ""}];

          hwcnId = await db.createHWCN({
            serial: serial,
            destination: finalLocationId,
            sites: allSites,
            vehicleReg,
            engineer: user?.name,
            date: new Date().toISOString(),
            gasType: bottle.gasType || "Unknown",
            fillWeight: bottle.currentWeight
          });
          setGeneratedHWCN(hwcnId);
        }
        
        await db.updateBottleLocation(serial, "van", `${user?.name} - Van`, finalLocationId, destination as any, hwcnId);
      }
      setTransferSuccess(true);
    } catch (err) {
      console.error("Transfer failed:", err);
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} size={48} />
        <p>Loading bottle data...</p>
      </div>
    );
  }

  if (!bottle) return null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.backBtn}>
          <ArrowLeft size={20} />
        </Link>
        <h1>Bottle Actions</h1>
      </header>

        <div 
          className={`${styles.bottleInfoCard} glass-panel`}
          style={{ 
            borderLeftColor: 
              bottle.category === "reclaim" ? "var(--warning)" : 
              bottle.category === "nitrogen" ? "#22c55e" : "var(--primary)",
            background: 
              bottle.category === "reclaim" ? "rgba(255, 170, 0, 0.03)" : 
              bottle.category === "nitrogen" ? "rgba(34, 197, 94, 0.03)" : "rgba(0, 229, 255, 0.03)"
          }}
        >
          <div className={styles.bottleHeader}>
            <div className={styles.bottleType}>
              {bottle.category === "reclaim" ? (
                <AlertTriangle size={20} color="var(--warning)" />
              ) : (
                <div 
                  className={styles.dot} 
                  style={{ 
                    background: bottle.category === "nitrogen" ? "#22c55e" : "var(--primary)" 
                  }} 
                />
              )}
              <span style={{ 
                color: 
                  bottle.category === "reclaim" ? "var(--warning)" : 
                  bottle.category === "nitrogen" ? "#22c55e" : "var(--primary)" 
              }}>
                {bottle.category === "new" ? "New Refrigerant" : 
                 bottle.category === "nitrogen" ? "Nitrogen" : "Reclaim / Haz"}
              </span>
            </div>
            <span className={styles.serial}>{bottle.serial}</span>
          </div>

          <div className={styles.bottleStats} style={{display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: '1rem'}}>
            {/* Left Column: Info */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.4rem', overflow: 'hidden'}}>
              <div style={{fontSize: '0.85rem', wordBreak: 'break-word'}}>
                <span style={{color: 'var(--text-muted)'}}>Gas Type: </span>
                <strong style={{color: '#fff'}}>{bottle.gasType}</strong>
              </div>
              <div style={{fontSize: '0.85rem', wordBreak: 'break-word'}}>
                <span style={{color: 'var(--text-muted)'}}>Current Location: </span>
                <strong style={{color: '#fff', textTransform: 'capitalize'}}>{bottle.locationId || bottle.locationType}</strong>
              </div>
              {bottle.category === "reclaim" && bottle.intendedDestination && bottle.activeHWCN && (
                <div style={{fontSize: '0.85rem', wordBreak: 'break-word', marginTop: '0.2rem'}}>
                  <span style={{color: 'var(--text-muted)'}}>Intended Destination: </span>
                  <strong style={{color: 'var(--warning)'}}>{bottle.intendedDestination}</strong>
                  <div style={{marginTop: '0.25rem'}}>
                    <Link href={`/dashboard/hwcn/${bottle.activeHWCN}`} style={{color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.75rem'}}>
                      View Digital HWCN ({bottle.activeHWCN})
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Weights */}
            {bottle.category === "reclaim" ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'right', minWidth: '160px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'}}>
                  <span style={{color: 'var(--text-muted)'}}>Max Fill Weight:</span>
                  <strong style={{color: '#fff'}}>{(bottle.initialWeight || 0).toFixed(2)} kg</strong>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'}}>
                  <span style={{color: 'var(--text-muted)'}}>Filled:</span>
                  <strong style={{color: 'var(--warning)'}}>{(bottle.currentWeight || 0).toFixed(2)} kg</strong>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'}}>
                  <span style={{color: 'var(--text-muted)'}}>Available Space:</span>
                  <strong style={{color: 'var(--success)'}}>{((bottle.initialWeight || 0) - (bottle.currentWeight || 0)).toFixed(2)} kg</strong>
                </div>
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'right', minWidth: '160px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'}}>
                  <span style={{color: 'var(--text-muted)'}}>Full Weight:</span>
                  <strong style={{color: '#fff'}}>{(bottle.initialWeight || 0).toFixed(2)} kg</strong>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'}}>
                  <span style={{color: 'var(--text-muted)'}}>Current Weight:</span>
                  <strong style={{color: 'var(--success)'}}>{(bottle.currentWeight || 0).toFixed(2)} kg</strong>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'}}>
                  <span style={{color: 'var(--text-muted)'}}>Weight Used:</span>
                  <strong style={{color: 'var(--warning)'}}>{((bottle.initialWeight || 0) - (bottle.currentWeight || 0)).toFixed(2)} kg</strong>
                </div>
              </div>
            )}
          </div>
        </div>

      {bottle.supplierHwcnPhotoPending && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--error)', marginBottom: '1.5rem', background: 'rgba(255, 51, 102, 0.05)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
            <AlertTriangle size={24} color="var(--error)" />
            <h3 style={{color: 'var(--error)', margin: 0}}>Missing Supplier Paperwork</h3>
          </div>
          <p style={{fontSize: '0.9rem', marginBottom: '1.5rem', color: 'var(--text-main)'}}>
            This bottle was returned to a supplier, but you skipped the photo upload. Please upload the physical HWCN photo to complete compliance.
          </p>
          <div className={styles.inputGroup} style={{marginBottom: '1rem'}}>
            <input type="file" accept="image/*,.pdf" style={{padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '2px dashed var(--error)', color: 'var(--text-main)', width: '100%'}} />
          </div>
          <button 
            type="button"
            className={styles.primaryBtn} 
            onClick={async () => {
              setLoading(true);
              await db.completeTransit(bottle.serial, "/mock-url-uploaded.jpg");
              window.location.reload();
            }}
            style={{width: '100%', background: 'var(--error)', color: '#fff'}}
          >
            Upload Document
          </button>
        </div>
      )}

      {/* OFFICE SIGN-OUT INTERCEPT */}
      {bottle.locationType === 'office' && bottle.category === 'reclaim' ? (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginTop: '0.5rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem'}}>
            <PackageCheck size={26} color="var(--primary)" />
            <div>
              <h3 style={{color: 'var(--primary)', margin: 0}}>In Office / Stores</h3>
              <p style={{margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)'}}>This bottle is currently held in stores</p>
            </div>
          </div>

          <p style={{fontSize: '0.9rem', marginBottom: '1.5rem'}}>
            Are you taking this bottle out on a job? Signing it out will transfer it to your van and start a new recovery cycle.
          </p>

          <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
            <button
              className={styles.primaryBtn}
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                await db.signOutFromStores(serial, user?.name || 'Engineer');
                router.push('/dashboard');
              }}
            >
              {signingOut
                ? <Loader2 size={18} className={styles.spinner} />
                : <><Truck size={18} /> Sign Out — Transfer to My Van</>
              }
            </button>
            <Link href="/dashboard" style={{textDecoration: 'none'}}>
              <button className={styles.secondaryBtn} style={{width: '100%'}}>Back to Dashboard</button>
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.actionsContainer}>
          {transferSuccess ? (
            <div className={styles.successContainer} style={{padding: '1rem', textAlign: 'center'}}>
              <CheckCircle2 size={48} color="var(--success)" style={{marginBottom: '1rem'}} />
              <h3>{generatedHWCN ? "Transfer Started!" : "Transfer Complete!"}</h3>
              <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
                {generatedHWCN 
                  ? `Bottle ${serial} is in Transit in your van.` 
                  : `Bottle ${serial} has been successfully moved to ${destination === 'engineer' ? 'another engineer' : destination}.`}
              </p>
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                {generatedHWCN && (
                  <Link href={`/dashboard/hwcn/${generatedHWCN}`} style={{textDecoration: 'none'}}>
                    <button className={styles.primaryBtn} style={{width: '100%', background: 'linear-gradient(135deg, var(--warning) 0%, #ff8800 100%)', color: '#000'}}>
                      View Digital HWCN
                    </button>
                  </Link>
                )}
                <button onClick={() => window.location.reload()} className={styles.secondaryBtn}>Done</button>
              </div>
            </div>
          ) : bottle.locationType === 'van' ? (
            <div className={styles.inlineTransfer}>
              <h2 className={styles.promptText} style={{textAlign: 'left', marginBottom: '1.5rem'}}>Transfer Location</h2>
              
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem'}}>
                {/* SITE */}
                <button 
                  type="button"
                  onClick={() => setDestination("site")}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
                    padding: "1rem", borderRadius: "12px", border: destination === "site" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                    background: destination === "site" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                    color: destination === "site" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s"
                  }}
                >
                  <MapPin size={24} />
                  <span style={{fontSize: "0.85rem", fontWeight: 600}}>Job Site</span>
                </button>

                {/* OFFICE */}
                <button 
                  type="button"
                  onClick={() => setDestination("office")}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
                    padding: "1rem", borderRadius: "12px", border: destination === "office" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                    background: destination === "office" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                    color: destination === "office" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s"
                  }}
                >
                  <Building2 size={24} />
                  <span style={{fontSize: "0.85rem", fontWeight: 600}}>Office</span>
                </button>

                {/* SUPPLIER */}
                <button 
                  type="button"
                  onClick={() => setDestination("supplier")}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
                    padding: "1rem", borderRadius: "12px", border: destination === "supplier" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                    background: destination === "supplier" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                    color: destination === "supplier" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s"
                  }}
                >
                  <Building size={24} />
                  <span style={{fontSize: "0.85rem", fontWeight: 600}}>Supplier</span>
                </button>

                {/* HANDOVER */}
                <button 
                  type="button"
                  onClick={() => setDestination("engineer")}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
                    padding: "1rem", borderRadius: "12px", border: destination === "engineer" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                    background: destination === "engineer" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                    color: destination === "engineer" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s"
                  }}
                >
                  <Users size={24} />
                  <span style={{fontSize: "0.85rem", fontWeight: 600}}>Handover</span>
                </button>
              </div>

              {destination === "site" && (
                <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginBottom: '1.5rem'}}>
                  <h3 style={{color: 'var(--primary)', fontSize: '1rem', marginBottom: '1rem'}}>Job Site Details</h3>
                  <div className={styles.inputGroup}>
                    <label>Job Number</label>
                    <input 
                      type="text" 
                      value={locationId}
                      onChange={(e) => setLocationId(e.target.value)}
                      placeholder="e.g. JOB-88219" 
                      className={styles.textInput}
                    />
                  </div>
                </div>
              )}

              {destination === "engineer" && (
                <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginBottom: '1.5rem'}}>
                  <h3 style={{color: 'var(--primary)', fontSize: '1rem', marginBottom: '1rem'}}>Handover Details</h3>
                  <div className={styles.inputGroup}>
                    <label>Select Engineer</label>
                    <select 
                      value={selectedEngineer} 
                      onChange={(e) => setSelectedEngineer(e.target.value)}
                      style={{width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff'}}
                    >
                      <option value="">-- Select Recipient --</option>
                      {engineers.map(eng => (
                        <option key={eng.id} value={eng.id}>{eng.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {destination === "supplier" && (
                <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginBottom: '1.5rem'}}>
                  <h3 style={{color: 'var(--primary)', fontSize: '1rem', marginBottom: '1rem'}}>Return to {bottle.supplier || "Supplier"}</h3>
                  <div className={styles.inputGroup}>
                    <label>Branch Name / Location</label>
                    <input 
                      type="text" 
                      value={locationId}
                      onChange={(e) => setLocationId(e.target.value)}
                      placeholder={`e.g. ${bottle.supplier || "Supplier"} London Branch`} 
                      className={styles.textInput}
                    />
                  </div>
                </div>
              )}

              <button 
                className={styles.primaryBtn} 
                style={{width: '100%'}}
                disabled={isSubmittingTransfer || (destination === 'site' && !locationId) || (destination === 'engineer' && !selectedEngineer)}
                onClick={handleTransfer}
              >
                {isSubmittingTransfer ? <Loader2 size={18} className={styles.spinner} /> : "Confirm Transfer"}
              </button>
            </div>
          ) : (
            <>
              {/* LOGISTICS: Moving the physical bottle */}
              <Link href={`/dashboard/move?serial=${bottle.serial}`} className={`${styles.actionCard} ${styles.moveCard}`}>
                <div className={styles.iconWrapper}>
                  <Truck size={32} />
                </div>
                <div className={styles.actionText}>
                  {bottle.locationType === "site" || bottle.locationType === "office" ? (
                    <>
                      <h3>Transfer Bottle into Van {bottle.locationType === "office" ? "from Stores" : `from ${bottle.locationId}`}</h3>
                      <p>Move this bottle {bottle.locationType === "office" ? "from Office / Stores" : `from ${bottle.locationId}`} back into your van stock</p>
                    </>
                  ) : (
                    <>
                      <h3>Transfer Location</h3>
                      <p>Move bottle to/from Van, Site, or Supplier</p>
                    </>
                  )}
                </div>
              </Link>

              {/* COMPLIANCE: Using the gas inside */}
              {bottle.category !== "nitrogen" && (
                <Link 
                  href={(bottle.locationType as string) === 'van' ? '#' : `/dashboard/log?serial=${bottle.serial}`} 
                  className={`${styles.actionCard} ${bottle.category === 'reclaim' ? styles.reclaimCard : styles.useCard} ${(bottle.locationType as string) === 'van' ? styles.disabledCard : ''}`}
                >
                  <div className={styles.iconWrapper}>
                    <Wrench size={32} />
                  </div>
                  <div className={styles.actionText}>
                    {bottle.category === "reclaim" ? (
                      <>
                        <h3>Log Recovered Gas</h3>
                        <p>{(bottle.locationType as string) === 'van' ? "Bottle currently in van, transfer bottle to site to enable recovery." : "Log contaminated gas pumped into this cylinder"}</p>
                      </>
                    ) : (
                      <>
                        <h3>Log Gas Usage</h3>
                        <p>{(bottle.locationType as string) === 'van' ? "Bottle currently in van, transfer bottle to site to enable usage." : "Log refrigerant dispensed into a system"}</p>
                      </>
                    )}
                  </div>
                </Link>
              )}
            </>
          )}

          <div style={{marginTop: "1.5rem", display: "flex", justifyContent: "center"}}>
            <button 
              onClick={() => router.push(`/dashboard/move?serial=${bottle.serial}&discrepancy=true`)}
              style={{
                background: "rgba(255, 187, 0, 0.05)", border: "1px solid rgba(255, 187, 0, 0.2)",
                color: "rgba(255, 187, 0, 0.6)", padding: "0.6rem 1rem", borderRadius: "8px", fontSize: "0.85rem",
                display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 500
              }}
            >
              <AlertTriangle size={16} /> Is Current Location Incorrect?
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
