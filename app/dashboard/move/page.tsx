"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Truck, ArrowLeft, MapPin, Building2, Users, AlertTriangle, Building } from "lucide-react";
import styles from "../log/page.module.css"; // Reuse existing form styles
import { db } from "@/lib/db";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { compressImage } from "@/lib/utils";

export default function MoveBottlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serialParam = searchParams.get("serial") || "UNKNOWN";
  const isDiscrepancy = searchParams.get("discrepancy") === "true";
  
  const [destination, setDestination] = useState("site");
  const [locationId, setLocationId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedHWCN, setGeneratedHWCN] = useState<string | null>(null);
  const [customDestination, setCustomDestination] = useState({ name: "", address: "", postcode: "" });
  const [engineers, setEngineers] = useState<any[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState("");
  const [supplierPhoto, setSupplierPhoto] = useState<string | null>(null);
  
  const [bottle, setBottle] = useState<any>(null);
  const [reclaimFlowStep, setReclaimFlowStep] = useState<"loading" | "in_transit" | "intercept_supplier_photo" | "ask_supplier" | "confirm_supplier_hwcn" | "supplier_start_transit" | "standard">("loading");
  const [supplierHwcnConfirmed, setSupplierHwcnConfirmed] = useState(false);
  const [reclaimFlowPath, setReclaimFlowPath] = useState<"normal" | "supplier_direct" | "alternative">("normal");
  
  // HWCN Form State
  const [vehicleReg, setVehicleReg] = useState("");

  const { user } = useAuth();

  useEffect(() => {
    db.getBottle(serialParam).then(b => {
      setBottle(b);
      if (isDiscrepancy) {
        setReclaimFlowStep("standard");
        setReclaimFlowPath("normal");
      } else {
        if (b?.locationType === 'van' && b?.intendedDestination) {
          setReclaimFlowStep("in_transit");
        } else if (b?.category === "reclaim" && b?.currentWeight > 0) {
          setReclaimFlowStep("ask_supplier");
        } else {
          setReclaimFlowStep("standard");
          setReclaimFlowPath("normal");
        }
      }

      if (b?.locationType === 'site' || b?.locationType === 'office') {
        setDestination("van");
      }
    });

    if (user?.id) {
      db.getEngineerProfiles().then(profiles => {
        // Filter out current user
        setEngineers(profiles.filter(p => p.id !== user.id));
      });
      db.getEngineerById(user.id).then(profile => {
        if (profile?.defaultVehicleReg) {
          setVehicleReg(profile.defaultVehicleReg);
        }
      });
    }
  }, [serialParam, user]);

  const requiresHWCN = bottle?.category === "reclaim" && (bottle?.currentWeight > 0) && (destination === "office" || destination === "other");

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (destination === "van" || destination === "site" || destination === "engineer") {
      const finalDest = destination === "engineer" ? "van" : destination;
      const targetUser = engineers.find(e => e.id === selectedEngineer);
      const finalLocationId = destination === "engineer" 
        ? `${targetUser?.name || "Engineer"} - Van` 
        : locationId || `${user?.name} - Van`;
        
      await db.updateBottleLocation(serialParam, finalDest as any, finalLocationId);
    } else {
      // In transit
      const finalLocationId = destination === "office" ? "Office / Stores" : destination === "other" ? customDestination.name : locationId || "Supplier";
      const fullDestinationString = destination === "other" ? `${customDestination.name}, ${customDestination.address}, ${customDestination.postcode}` : finalLocationId;
      
      let hwcnId = undefined;
      if (requiresHWCN) {
        const allSites = bottle?.producerSites && bottle.producerSites.length > 0
          ? bottle.producerSites
          : [{name: "Unknown Site", address: "See recovery logs", postcode: ""}];

        hwcnId = await db.createHWCN({
          serial: serialParam,
          destination: fullDestinationString,
          sites: allSites,
          vehicleReg,
          engineer: user?.name,
          date: new Date().toISOString(),
          gasType: bottle?.gasType || "Unknown",
          fillWeight: bottle?.currentWeight
        });
        setGeneratedHWCN(hwcnId);
      }
      
      await db.updateBottleLocation(serialParam, "van", `${user?.name} - Van`, fullDestinationString, destination as any, hwcnId);
    }

    if (isDiscrepancy) {
      await db.createNotification({
        type: "location_discrepancy",
        title: "Location Discrepancy Reported",
        message: `${user?.name} has recorded Bottle ${serialParam} was in his van, but the app stated it was in ${bottle?.locationId || "Central Stores"}.`,
        metadata: { serial: serialParam, reportedBy: user?.name, oldLocation: bottle?.locationId || "Central Stores", newLocation: destination }
      });
    }

    setIsSubmitting(false);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className={styles.successContainer}>
        <CheckCircle2 size={64} color="var(--success)" />
        <h2>{generatedHWCN ? "Transfer Started!" : "Transfer Complete!"}</h2>
        <p>
          {generatedHWCN 
            ? `Bottle ${serialParam} is in Transit in ${user?.name}'s Van.` 
            : `Bottle ${serialParam} has been moved to ${destination}.`}
        </p>
        
        {generatedHWCN ? (
          <div style={{marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
            <p style={{color: 'var(--warning)', fontWeight: '600'}}>A Digital HWCN was generated for this movement.</p>
            <Link href={`/dashboard/hwcn/${generatedHWCN}`} style={{textDecoration: 'none'}}>
              <button className={styles.primaryBtn} style={{width: '100%', background: 'linear-gradient(135deg, var(--warning) 0%, #ff8800 100%)', color: '#000'}}>
                View / Download Digital HWCN
              </button>
            </Link>
            <button onClick={() => router.push("/dashboard")} className={styles.secondaryBtn}>
              Return to Dashboard
            </button>
          </div>
        ) : (
          <button onClick={() => router.push("/dashboard")} className={styles.primaryBtn}>
            Return to Dashboard
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href={`/dashboard/bottle/${serialParam}`} className={styles.backBtn}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{color: "var(--text-main)", fontSize: "1.5rem", margin: 0}}>
            {isDiscrepancy 
              ? "Report Location Mismatch" 
              : (bottle?.locationType === "site" || bottle?.locationType === "office" 
                  ? "Transfer to Van" 
                  : "Transfer Location")}
          </h1>
          <p style={{fontSize: "0.85rem", color: "var(--text-muted)", margin: "0.25rem 0 0"}}>
            {isDiscrepancy 
              ? "Select where this bottle is actually located" 
              : (bottle?.locationType === "office" ? "Picking up from Office / Stores" : `Bottle ${serialParam}`)}
          </p>
        </div>
      </header>

      {reclaimFlowStep === "loading" && (
        <div style={{padding: '2rem', textAlign: 'center'}}>
          <div className={styles.spinner} style={{margin: '0 auto'}}></div>
        </div>
      )}

      {reclaimFlowStep === "in_transit" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginTop: '2rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
            <Truck size={24} color="var(--primary)" />
            <h3 style={{color: 'var(--primary)', margin: 0}}>In Transit</h3>
          </div>
          <p style={{marginBottom: '1.5rem', fontSize: '0.95rem'}}>
            This bottle is currently in transit to <strong>{bottle?.intendedDestination}</strong>.
          </p>
          <p style={{marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)'}}>
            Have you arrived at the destination and dropped off the bottle?
          </p>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <button 
              type="button"
              className={styles.primaryBtn} 
              onClick={async () => {
                if (bottle?.intendedLocationType === "supplier") {
                  setReclaimFlowStep("intercept_supplier_photo");
                } else {
                  setIsSubmitting(true);
                  await db.completeTransit(serialParam, undefined, user?.name);
                  setIsSubmitting(false);
                  setIsSuccess(true);
                }
              }}
            >
              <CheckCircle2 size={18} /> Yes, Complete Transfer
            </button>
            <button 
              type="button"
              className={styles.primaryBtn} 
              onClick={async () => {
                setIsSubmitting(true);
                await db.clearTransitState(serialParam);
                window.location.reload();
              }}
            >
              No, Divert Route / Cancel Trip
            </button>
          </div>
        </div>
      )}

      {reclaimFlowStep === "intercept_supplier_photo" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--warning)', marginTop: '2rem'}}>
          <h3 style={{color: 'var(--warning)', marginBottom: '1rem'}}>Supplier Paperwork Upload</h3>
          <p style={{fontSize: '0.9rem', marginBottom: '1.5rem'}}>
            You are dropping off a hazardous waste bottle at a supplier. Please take a photo of the completed physical HWCN provided by the supplier.
          </p>
          <div className={styles.inputGroup} style={{marginBottom: '1.5rem'}}>
            <input 
              type="file" 
              accept="image/*" 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const compressed = await compressImage(file);
                  setSupplierPhoto(compressed);
                }
              }}
              style={{padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '2px dashed var(--warning)', color: 'var(--text-main)', width: '100%'}} 
            />
          </div>
          <div style={{display: 'flex', gap: '1rem'}}>
            <button 
              type="button"
              className={styles.secondaryBtn} 
              onClick={async () => {
                // Skipped photo
                setIsSubmitting(true);
                await db.completeTransit(serialParam, undefined, user?.name);
                setIsSubmitting(false);
                setIsSuccess(true);
              }}
            >
              Skip (I will do it later)
            </button>
            <button 
              type="button"
              className={styles.primaryBtn} 
              disabled={!supplierPhoto && !isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                await db.completeTransit(serialParam, supplierPhoto || "/mock-url.jpg", user?.name);
                setIsSubmitting(false);
                setIsSuccess(true);
              }}
              style={{flex: 1, opacity: (!supplierPhoto && !isSubmitting) ? 0.5 : 1}}
            >
              {isSubmitting ? "Uploading..." : "Upload & Complete"}
            </button>
          </div>
        </div>
      )}

      {reclaimFlowStep === "ask_supplier" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--warning)', marginTop: '2rem'}}>
          <h3 style={{color: 'var(--warning)', marginBottom: '1rem'}}>Hazardous Waste Transfer</h3>
          <p style={{marginBottom: '1.5rem', fontSize: '0.9rem'}}>This bottle contains reclaimed gas. Are you returning this directly to the Supplier?</p>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <button 
              type="button"
              className={styles.primaryBtn} 
              onClick={() => setReclaimFlowStep("confirm_supplier_hwcn")}
            >
              Yes, Return to Supplier
            </button>
            <button 
              type="button"
              className={styles.secondaryBtn} 
              onClick={() => {
                setReclaimFlowPath("normal");
                setReclaimFlowStep("standard");
              }}
            >
              No, Transfer to Alternative Location
            </button>
          </div>
        </div>
      )}

      {reclaimFlowStep === "confirm_supplier_hwcn" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--warning)', marginTop: '2rem'}}>
          <h3 style={{color: 'var(--warning)', marginBottom: '1rem'}}>Supplier Paperwork</h3>
          <label style={{display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px'}}>
            <input 
              type="checkbox" 
              checked={supplierHwcnConfirmed}
              onChange={(e) => setSupplierHwcnConfirmed(e.target.checked)}
              style={{width: '24px', height: '24px', flexShrink: 0}}
            />
            <span style={{fontSize: '0.9rem', lineHeight: '1.4'}}>I confirm I have completed the Supplier's physical HWCN paperwork for this return.</span>
          </label>
          <div style={{display: 'flex', gap: '1rem'}}>
            <button 
              type="button"
              className={styles.secondaryBtn} 
              onClick={() => setReclaimFlowStep("ask_supplier")}
            >
              Back
            </button>
            <button 
              type="button"
              className={styles.primaryBtn} 
              disabled={!supplierHwcnConfirmed}
              onClick={() => {
                setDestination("supplier");
                setReclaimFlowStep("supplier_start_transit");
              }}
              style={{flex: 1, opacity: supplierHwcnConfirmed ? 1 : 0.5}}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {reclaimFlowStep === "supplier_start_transit" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginTop: '2rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
            <Truck size={24} color="var(--primary)" />
            <h3 style={{color: 'var(--primary)', margin: 0}}>Load Bottle & Start Transit</h3>
          </div>
          <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
            Paperwork confirmed. Load the bottle into your van and confirm below to start transit to the Supplier.
          </p>
          <div style={{display: 'flex', gap: '1rem'}}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setReclaimFlowStep("confirm_supplier_hwcn")}
            >
              Back
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                await db.updateBottleLocation(
                  serialParam,
                  "van",
                  `${user?.name} - Van`,
                  "Supplier",
                  "supplier" as any,
                  undefined
                );
                setIsSubmitting(false);
                setGeneratedHWCN(null);
                setIsSuccess(true);
              }}
              style={{flex: 1}}
            >
              {isSubmitting
                ? <span className={styles.spinner} />
                : <><CheckCircle2 size={18} /> Bottle in Van — Start Transit</>
              }
            </button>
          </div>
        </div>
      )}

      {reclaimFlowStep === "standard" && (
        <form onSubmit={handleTransfer} className={styles.form}>
          <div className={styles.readonlyField}>
            <span className={styles.label}>Cylinder Serial Number</span>
            <span className={styles.value}>{serialParam}</span>
          </div>

          <div className={styles.inputGroup}>
            <label style={{marginBottom: "1rem", display: "block"}}>
              {isDiscrepancy 
                ? "Where is this bottle actually located?" 
                : (bottle?.locationType === "site" || bottle?.locationType === "office" ? "Confirm Movement" : "Select New Location")}
            </label>
            
            {(bottle?.locationType === "site" || bottle?.locationType === "office") && !isDiscrepancy ? (
              <div style={{marginTop: "0.5rem"}}>
                <div style={{
                  padding: "1.5rem", border: "1px solid var(--primary)", borderRadius: "12px",
                  background: "rgba(0, 229, 255, 0.05)", marginBottom: "1.5rem", color: "#fff",
                  fontSize: "1rem"
                }}>
                  This bottle will be added to your active Van Stock.
                </div>
              </div>
            ) : (
              <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem"}}>
                {/* SITE */}
                {reclaimFlowPath === "normal" && (
                  <button 
                    type="button"
                    onClick={() => setDestination("site")}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
                      padding: "1.5rem 1rem", borderRadius: "12px", border: destination === "site" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                      background: destination === "site" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                      color: destination === "site" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    <MapPin size={32} />
                    <span style={{fontSize: "0.9rem", fontWeight: 600}}>Job Site</span>
                  </button>
                )}

                {/* VAN */}
                {(reclaimFlowPath === "normal" || reclaimFlowPath === "supplier_direct") && (
                  <button 
                    type="button"
                    onClick={() => setDestination("van")}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
                      padding: "1.5rem 1rem", borderRadius: "12px", border: destination === "van" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                      background: destination === "van" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                      color: destination === "van" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    <Truck size={32} />
                    <span style={{fontSize: "0.9rem", fontWeight: 600}}>My Van</span>
                  </button>
                )}

                {/* SUPPLIER */}
                {(reclaimFlowPath === "normal" || reclaimFlowPath === "supplier_direct") && (
                  <button 
                    type="button"
                    onClick={() => setDestination("supplier")}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
                      padding: "1.5rem 1rem", borderRadius: "12px", border: destination === "supplier" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                      background: destination === "supplier" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                      color: destination === "supplier" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    <Building size={32} />
                    <span style={{fontSize: "0.9rem", fontWeight: 600}}>Supplier</span>
                  </button>
                )}

                {/* OFFICE */}
                {(reclaimFlowPath === "normal" || reclaimFlowPath === "alternative") && (
                  <button 
                    type="button"
                    onClick={() => setDestination("office")}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
                      padding: "1.5rem 1rem", borderRadius: "12px", border: destination === "office" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                      background: destination === "office" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                      color: destination === "office" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    <Building2 size={32} />
                    <span style={{fontSize: "0.9rem", fontWeight: 600}}>Office</span>
                  </button>
                )}

                {/* HANDOVER */}
                {(reclaimFlowPath === "normal" || reclaimFlowPath === "supplier_direct") && (
                  <button 
                    type="button"
                    onClick={() => setDestination("engineer")}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
                      padding: "1.5rem 1rem", borderRadius: "12px", border: destination === "engineer" ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                      background: destination === "engineer" ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.03)",
                      color: destination === "engineer" ? "var(--primary)" : "var(--text-main)", cursor: "pointer", transition: "all 0.2s",
                      gridColumn: "span 2"
                    }}
                  >
                    <Users size={32} />
                    <span style={{fontSize: "0.9rem", fontWeight: 600}}>Engineer Handover</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {destination === "other" && (
            <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginTop: '0.5rem', marginBottom: '1rem'}}>
              <h3 style={{color: 'var(--primary)'}}>Destination Details</h3>
              <div className={styles.inputGroup}>
                <label>Facility Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Licensed Waste Facility" 
                  value={customDestination.name}
                  onChange={(e) => setCustomDestination({...customDestination, name: e.target.value})}
                  required 
                />
              </div>
              <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                <label>Address</label>
                <input 
                  type="text" 
                  placeholder="e.g. 123 Industrial Park" 
                  value={customDestination.address}
                  onChange={(e) => setCustomDestination({...customDestination, address: e.target.value})}
                  required 
                />
              </div>
              <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                <label>Postcode</label>
                <input 
                  type="text" 
                  placeholder="e.g. AB12 3CD" 
                  value={customDestination.postcode}
                  onChange={(e) => setCustomDestination({...customDestination, postcode: e.target.value})}
                  required 
                />
              </div>
            </div>
          )}

          {(reclaimFlowPath === "supplier_direct" || reclaimFlowPath === "alternative") && (
            <button 
              type="button" 
              onClick={() => {
                setReclaimFlowStep("ask_supplier");
                setReclaimFlowPath("normal");
              }}
              style={{marginTop: '0.5rem', marginBottom: '1.5rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', width: '100%'}}
            >
              Change Return Route (Reset HWCN Options)
            </button>
          )}

          {destination === "site" && (
            <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginBottom: '1.5rem'}}>
              <h3 style={{color: 'var(--primary)'}}>Job Site Details</h3>
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
              <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>
                This allocates the physical bottle to the client's site for audit purposes.
              </p>
            </div>
          )}

          {destination === "engineer" && (
            <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginBottom: '1.5rem'}}>
              <h3 style={{color: 'var(--primary)'}}>Handover Details</h3>
              <div className={styles.inputGroup}>
                <label>Select Engineer</label>
                <select 
                  value={selectedEngineer} 
                  onChange={(e) => setSelectedEngineer(e.target.value)}
                  required
                >
                  <option value="">-- Select Recipient --</option>
                  {engineers.map(eng => (
                    <option key={eng.id} value={eng.id}>{eng.name} ({eng.vehicleReg || "No Van"})</option>
                  ))}
                </select>
              </div>
              <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>
                This bottle will be transferred to the selected engineer's van stock.
              </p>
            </div>
          )}



          {destination === "supplier" && (
            <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginBottom: '1.5rem'}}>
              <h3 style={{color: 'var(--primary)'}}>Return to {bottle?.supplier || "Supplier"}</h3>
              <div className={styles.inputGroup}>
                <label>Branch Name / Location</label>
                <input 
                  type="text" 
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  placeholder={`e.g. ${bottle?.supplier || "Supplier"} London Branch`} 
                  required={!requiresHWCN}
                />
              </div>
              <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>
                Enter the branch where this empty bottle was dropped off.
              </p>
            </div>
          )}

          {requiresHWCN && (
            <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--warning)', marginTop: '0.5rem', marginBottom: '1.5rem'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
                <Truck size={24} color="var(--warning)" />
                <h3 style={{color: 'var(--warning)', margin: 0}}>Generate Internal HWCN</h3>
              </div>
              <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
                Moving hazardous waste internally requires a digital Consignment Note. Please complete the following legal details.
              </p>

              <div style={{borderLeft: '2px solid var(--warning)', paddingLeft: '1rem', marginBottom: '1.5rem'}}>
                <h4 style={{fontSize: '0.9rem', marginBottom: '0.75rem'}}>Part A: Producer / Removal Sites</h4>
                <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>
                  Sites are automatically populated from your Gas Recovery logs for this bottle.
                </p>

                <div style={{background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.75rem'}}>
                  {bottle?.producerSites && bottle.producerSites.length > 0 ? (
                    <ul style={{margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--warning)'}}>
                      {bottle.producerSites.map((s: any, i: number) => (
                        <li key={i} style={{marginBottom: '0.4rem'}}>
                          <strong>Site {i + 1}:</strong> {s.name} — {s.address}, {s.postcode}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--error)'}}>
                      ⚠ No recovery sites logged yet. Please log the gas recovery first before transferring.
                    </p>
                  )}
                </div>
              </div>

              <div style={{borderLeft: '2px solid var(--warning)', paddingLeft: '1rem', marginBottom: '1.5rem'}}>
                <h4 style={{fontSize: '0.9rem', marginBottom: '0.75rem'}}>Part C: Carrier Certificate</h4>
                <div className={styles.inputGroup}>
                  <label>Vehicle Registration Number</label>
                  <input type="text" value={vehicleReg} onChange={(e) => setVehicleReg(e.target.value)} placeholder="e.g. AB12 CDE" required={requiresHWCN} />
                </div>
                <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem'}}>
                  Carrier Name: {user?.name || "Engineer"}
                </p>
              </div>
              
              <p style={{fontSize: '0.8rem', color: 'var(--warning)', fontStyle: 'italic'}}>
                Waste Producer (Part A5) and Waste Description (Part B) will be automatically pre-filled to legal standards upon generation.
              </p>
            </div>
          )}

          <button 
            type="submit" 
            className={styles.submitBtn} 
            disabled={isSubmitting || (destination === "site" && !locationId) || (destination === "engineer" && !selectedEngineer)}
            style={{marginTop: "1rem"}}
          >
            {isSubmitting ? <span className={styles.spinner}></span> : <><Truck size={20} /> {isDiscrepancy ? "Process Correction" : "Confirm Transfer"}</>}
          </button>
        </form>
      )}
    </div>
  );
}
