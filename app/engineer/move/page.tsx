"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Truck, ArrowLeft, MapPin, Building2, Users, AlertTriangle, Building } from "lucide-react";
import styles from "../log/page.module.css"; // Reuse existing form styles
import { db } from "@/lib/db";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { compressImage } from "@/lib/utils";
import { submitMove } from "@/lib/offline/actions";
import { getCachedBottle, cacheBottle } from "@/lib/offline/bottleCache";
import { useOffline } from "@/lib/offline/OfflineContext";

export default function MoveBottlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serialParam = searchParams.get("serial") || "UNKNOWN";
  const isDiscrepancy = searchParams.get("discrepancy") === "true";
  
  const [destination, setDestination] = useState(searchParams.get("dest") || "site");
  const [locationId, setLocationId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [offlineBlock, setOfflineBlock] = useState<string | null>(null);
  const [generatedHWCN, setGeneratedHWCN] = useState<string | null>(null);
  const [customDestination, setCustomDestination] = useState({ name: "", address: "", postcode: "" });
  const [engineers, setEngineers] = useState<any[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState("");
  const [supplierPhoto, setSupplierPhoto] = useState<string | null>(null);
  const [carrierRegNo, setCarrierRegNo] = useState("CBDU368286");
  
  const [bottle, setBottle] = useState<any>(null);
  const [reclaimFlowStep, setReclaimFlowStep] = useState<"loading" | "in_transit" | "intercept_supplier_photo" | "ask_supplier" | "confirm_supplier_hwcn" | "supplier_start_transit" | "standard" | "divert_supplier_branch" | "divert_destination" | "divert_to_site" | "divert_to_office">("loading");
  const [supplierHwcnConfirmed, setSupplierHwcnConfirmed] = useState(false);
  const [reclaimFlowPath, setReclaimFlowPath] = useState<"normal" | "supplier_direct" | "alternative">("normal");
  const [intendedBranch, setIntendedBranch] = useState("");
  const [divertedBranch, setDivertedBranch] = useState("");
  const [divertSiteJobNo, setDivertSiteJobNo] = useState("");
  
  // HWCN Form State
  const [vehicleReg, setVehicleReg] = useState("");
  const [carrierName, setCarrierName] = useState("");
  const [intendedDest, setIntendedDest] = useState("");
  const [hwcnSites, setHwcnSites] = useState<any[]>([]);

  const { user } = useAuth();
  const { isOnline } = useOffline();

  useEffect(() => {
    const online = typeof navigator === "undefined" ? true : navigator.onLine;

    // Carrier reg is only needed for HWCN generation (online-only).
    if (online) {
      db.getCompanySettings().then(s => { if (s?.carrierReg) setCarrierRegNo(s.carrierReg); }).catch(() => {});
    }

    async function loadBottle() {
      let b: any = null;
      if (online) {
        try {
          b = await db.getBottle(serialParam);
          if (b) cacheBottle(b);
        } catch {
          b = await getCachedBottle(serialParam);
        }
      } else {
        b = await getCachedBottle(serialParam);
      }
      setBottle(b);
      if (b?.producerSites && b.producerSites.length > 0) {
        setHwcnSites(b.producerSites);
      } else {
        setHwcnSites([{ name: "", address: "", postcode: "" }]);
      }

      const action = searchParams.get("action");

      if (isDiscrepancy) {
        setReclaimFlowStep("standard");
        setReclaimFlowPath("normal");
      } else if (action === "divert") {
        setReclaimFlowStep("divert_destination");
      } else {
        if (b?.activeHWCN && b?.intendedDestination) {
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
    }
    loadBottle();

    if (user?.id) {
      if (user?.vehicleReg) setVehicleReg(user.vehicleReg);
      if (user?.name) setCarrierName(user.name);
      // Engineer list (for handover) is online-only — handovers require a signal.
      if (online) {
        db.getEngineerProfiles().then(profiles => {
          setEngineers(profiles.filter(p => p.id !== user.id));
          const myProfile = profiles.find(p => p.id === user.id);
          if (myProfile?.vehicleReg) setVehicleReg(myProfile.vehicleReg);
          if (myProfile?.name) setCarrierName(myProfile.name);
        }).catch(() => {});
      }
    }
  }, [serialParam, user]);

  const requiresHWCN = bottle?.category === "reclaim" && (bottle?.currentWeight > 0) && destination !== "supplier";

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const isReclaimWithGas = bottle?.category === "reclaim" && (bottle?.currentWeight > 0);
    const requiresInternalHWCN = isReclaimWithGas && destination !== "supplier";
    const requiresSupplierHWCN = isReclaimWithGas && (destination === "supplier");
    const needsTransit = requiresInternalHWCN || requiresSupplierHWCN;

    // Offline gate: only plain location moves (to Van, Job Site, or Other) can be
    // queued offline. Supplier/HQ-Stores returns, handovers, and hazardous-waste
    // consignments create server records and must be done with a signal.
    const online = typeof navigator === "undefined" ? true : navigator.onLine;
    const offlineAllowed = !needsTransit && (destination === "site" || destination === "van" || destination === "other");
    if (!online && !offlineAllowed) {
      setIsSubmitting(false);
      setOfflineBlock("This move needs a signal — returns to a supplier or HQ-Stores, handovers, and hazardous-waste consignments must be done online. Offline you can move to your Van, a Job Site, or another location.");
      return;
    }
    setOfflineBlock(null);

    if (!needsTransit) {
      const finalDest = destination === "engineer" ? "van" : destination;
      let finalLocationId = "";
      
      let effectiveEngineerName = user?.name;
      if (destination === "engineer") {
        const targetUser = engineers.find(e => e.id === selectedEngineer);
        finalLocationId = `${targetUser?.name || "Engineer"} - Van`;
        effectiveEngineerName = targetUser?.name || user?.name;
      } else if (destination === "van") {
        finalLocationId = `${user?.name} - Van`;
      } else if (destination === "office") {
        finalLocationId = "HQ-Stores";
      } else if (destination === "other") {
        finalLocationId = `${customDestination.name}, ${customDestination.address}, ${customDestination.postcode}`;
      } else {
        finalLocationId = locationId || (destination === "supplier" ? "Supplier" : `${user?.name} - Van`);
      }

      // Offline-aware: queues + syncs when offline, else writes immediately.
      await submitMove(serialParam, finalDest as any, finalLocationId, effectiveEngineerName);

      // If returning directly to supplier or office, also update status (online-only
      // destinations, so this never runs offline).
      if (destination === "supplier" || destination === "office") {
        const updates: any = { status: destination === "supplier" ? "returned" : "active" };
        if (destination === "supplier") {
          updates.supplier_hwcn_photo_pending = false; // Non-reclaim doesn't need a photo
        }
        await db.updateBottle(serialParam, updates);
      }
    } else {
      // In transit (Requires HWCN or Supplier Document)
      let finalLocationId = destination === "office" ? "HQ-Stores" : destination === "other" ? customDestination.name : locationId || "Supplier";
      if (destination === "van") {
         finalLocationId = intendedDest; // If they clicked 'Transfer to Van', the actual destination is their chosen intendedDest
      }
      const fullDestinationString = destination === "other" ? `${customDestination.name}, ${customDestination.address}, ${customDestination.postcode}` : finalLocationId;
      
      let hwcnId = undefined;
      if (requiresInternalHWCN) {
        hwcnId = await db.createHWCN({
          serial: serialParam,
          destination: intendedDest || fullDestinationString,
          sites: hwcnSites,
          vehicleReg,
          engineer: carrierName || user?.name,
          date: new Date().toISOString(),
          gasType: bottle?.gasType || "Unknown",
          fillWeight: bottle?.currentWeight
        });
        setGeneratedHWCN(hwcnId);
      }
      
      let intendedLocType = destination;
      if (destination === "van") {
        intendedLocType = intendedDest === "HQ-Stores" ? "office" : "site";
      }

      await db.updateBottleLocation(serialParam, "van", `${user?.name} - Van`, intendedDest || fullDestinationString, intendedLocType as any, hwcnId, user?.name);
    }

    if (isDiscrepancy && online) {
      await db.createNotification({
        type: "location_discrepancy",
        title: "Location Discrepancy Reported",
        message: `${user?.name} has recorded Bottle ${serialParam} was in his van, but the app stated it was in ${bottle?.locationId || "Central Stores"}.`,
        metadata: { serial: serialParam, reportedBy: user?.name, oldLocation: bottle?.locationId || "Central Stores", newLocation: destination }
      });
    }

    setIsSubmitting(false);
    
    // Redirect immediately if no HWCN was generated, otherwise show success screen with HWCN link
    if (needsTransit && isReclaimWithGas && (destination === "office" || destination === "other")) {
      setIsSuccess(true);
    } else {
      router.push("/engineer");
    }
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
            <Link href={`/engineer/hwcn/${encodeURIComponent(generatedHWCN)}`} style={{textDecoration: 'none'}}>
              <button className={styles.primaryBtn} style={{width: '100%', background: 'linear-gradient(135deg, var(--warning) 0%, #ff8800 100%)', color: '#000'}}>
                View / Download Digital HWCN
              </button>
            </Link>
            <button onClick={() => router.push("/engineer")} className={styles.primaryBtn} style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)', marginTop: '0' }}>
              Return to Dashboard
            </button>
          </div>
        ) : (
          <button onClick={() => router.push("/engineer")} className={styles.primaryBtn}>
            Return to Dashboard
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href={`/engineer/bottle/${serialParam}`} className={styles.backBtn}>
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
              : (bottle?.locationType === "office" ? "Picking up from HQ-Stores" : `Bottle ${serialParam}`)}
          </p>
          {bottle?.intendedDestination && (
            <div style={{marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(255, 187, 0, 0.1)', borderLeft: '3px solid var(--warning)', borderRadius: '4px'}}>
              <span style={{fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'}}>Intended Destination</span>
              <div style={{fontSize: '0.9rem', color: '#fff', fontWeight: 600}}>{bottle.intendedDestination}</div>
            </div>
          )}
        </div>
      </header>
      
      {bottle && (
        <div 
          className={`${styles.bottleInfoCard} glass-panel`}
          style={{ 
            marginBottom: '1.5rem',
            borderLeft: '4px solid',
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
              {((destination === "supplier" && locationId) || (intendedDest) || bottle.intendedDestination) && (
                <div style={{fontSize: '0.85rem', wordBreak: 'break-word', marginTop: '0.2rem'}}>
                  <span style={{color: 'var(--text-muted)'}}>Intended Destination: </span>
                  <strong style={{color: 'var(--warning)'}}>
                    {destination === "supplier" && locationId && bottle.supplier
                      ? `${bottle.supplier} - ${locationId}`
                      : (intendedDest || (bottle.intendedLocationType === 'supplier' && bottle.supplier && bottle.intendedDestination
                        ? `${bottle.supplier} - ${bottle.intendedDestination}`
                        : bottle.intendedDestination))}
                  </strong>
                </div>
              )}
            </div>

            {/* Right Column: Weights */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'right', minWidth: '120px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'}}>
                <span style={{color: 'var(--text-muted)'}}>Filled:</span>
                <strong style={{color: bottle.category === 'reclaim' ? 'var(--warning)' : 'var(--success)'}}>{(bottle.currentWeight || 0).toFixed(2)} kg</strong>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'}}>
                <span style={{color: 'var(--text-muted)'}}>{bottle.category === 'reclaim' ? 'Capacity:' : 'Initial:'}</span>
                <strong style={{color: '#fff'}}>{(bottle.initialWeight || 0).toFixed(2)} kg</strong>
              </div>
            </div>
          </div>
        </div>
      )}

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
            Have you arrived at the intended destination?
          </p>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>

            {/* §3.1 — Supplier Intended Destination */}
            {bottle?.intendedLocationType === "supplier" && (
              <>
                <button 
                  type="button"
                  className={styles.primaryBtn} 
                  style={{background: 'var(--warning)', color: '#000'}}
                  onClick={() => setReclaimFlowStep("intercept_supplier_photo")}
                >
                  <CheckCircle2 size={18} /> Yes, Arrived at Intended Destination
                </button>
                <button 
                  type="button"
                  className={styles.primaryBtn} 
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                  onClick={() => setReclaimFlowStep("divert_supplier_branch")}
                >
                  Arrived at a DIFFERENT Supplier Branch
                </button>
                <button 
                  type="button"
                  className={styles.primaryBtn} 
                  style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                  onClick={() => setReclaimFlowStep("divert_destination")}
                >
                  No, Changing Bottle Route
                </button>
              </>
            )}

            {/* §3.2 — HQ-Stores Intended Destination */}
            {bottle?.intendedLocationType !== "supplier" && (
              <>
                {/* Bottle is at a site (picked up from a job) — load back to van to continue transit */}
                {bottle?.locationType !== 'van' && (
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    style={{ background: 'var(--primary)', color: '#000' }}
                    onClick={async () => {
                      const intLocType = bottle?.intendedDestination === "HQ-Stores" ? "office" : "site";
                      await db.updateBottleLocation(serialParam, "van", `${user?.name} - Van`, bottle.intendedDestination, intLocType as any, bottle.activeHWCN, user?.name);
                      router.push("/engineer");
                    }}
                  >
                    <Truck size={18} /> Loaded — Continue Transit to {bottle?.intendedDestination}
                  </button>
                )}
                <button
                  type="button"
                  className={styles.primaryBtn}
                  style={{background: 'var(--warning)', color: '#000'}}
                  onClick={async () => {
                    await db.completeTransit(serialParam, undefined, user?.name);
                    router.push("/engineer");
                  }}
                >
                  <CheckCircle2 size={18} /> Complete Transfer to HQ-Stores
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                  onClick={() => setReclaimFlowStep("divert_destination")}
                >
                  No, Transfer to Alternative Location
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* §4.1 — Destination Changed: Where instead? */}
      {reclaimFlowStep === "divert_destination" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--warning)', marginTop: '2rem'}}>
          <h3 style={{color: 'var(--warning)', marginBottom: '1rem'}}>Where are you transferring the bottle instead?</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <button 
              type="button"
              className={styles.primaryBtn}
              onClick={() => setReclaimFlowStep("divert_to_site")}
            >
              <MapPin size={18} /> To a Job Site
            </button>
            <button 
              type="button"
              className={styles.primaryBtn} 
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
              onClick={() => setReclaimFlowStep("divert_to_office")}
            >
              <Building2 size={18} /> To HQ-Stores
            </button>
            <button 
              type="button"
              style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: '0.5rem' }}
              onClick={() => setReclaimFlowStep("in_transit")}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* §4.2 — Divert to Job Site */}
      {reclaimFlowStep === "divert_to_site" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginTop: '2rem'}}>
          <h3 style={{color: 'var(--primary)', marginBottom: '1rem'}}>Transfer to Job Site</h3>
          <div className={styles.inputGroup} style={{marginBottom: '1.5rem'}}>
            <label>Job Number</label>
            <input 
              type="text" 
              placeholder="e.g. JOB-88219" 
              value={divertSiteJobNo} 
              onChange={(e) => setDivertSiteJobNo(e.target.value)}
              required
            />
          </div>
          <div style={{display: 'flex', gap: '1rem'}}>
            <button 
              type="button"
              className={styles.primaryBtn} 
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
              onClick={() => setReclaimFlowStep("divert_destination")}
            >
              Back
            </button>
            <button 
              type="button"
              className={styles.primaryBtn} 
              disabled={!divertSiteJobNo || isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                await db.clearTransitState(serialParam);
                await db.updateBottleLocation(serialParam, "site", divertSiteJobNo, undefined, undefined, undefined, user?.name);
                setIsSubmitting(false);
                router.push("/engineer");
              }}
              style={{flex: 1}}
            >
              {isSubmitting ? "Transferring..." : "Confirm Transfer to Site"}
            </button>
          </div>
        </div>
      )}

      {/* §4.3 — Divert to Office (auto-generate Internal HWCN) */}
      {reclaimFlowStep === "divert_to_office" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--warning)', marginTop: '2rem'}}>
          <h3 style={{color: 'var(--warning)', marginBottom: '1rem'}}>Change Destination to HQ-Stores</h3>
          {bottle?.intendedLocationType === "supplier" && (
            <div style={{background: 'rgba(255, 187, 0, 0.1)', border: '1px solid var(--warning)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem'}}>
              <p style={{fontSize: '0.85rem', color: 'var(--warning)', margin: 0, lineHeight: 1.5}}>
                The physical Supplier HWCN is no longer applicable. An Internal Digital HWCN will be generated instead.
              </p>
            </div>
          )}
          <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
            The Intended Destination will be changed to <strong>HQ-Stores</strong> and an Internal HWCN will be generated for this movement.
          </p>
          <div style={{display: 'flex', gap: '1rem'}}>
            <button 
              type="button"
              className={styles.primaryBtn} 
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
              onClick={() => setReclaimFlowStep("divert_destination")}
            >
              Back
            </button>
            <button 
              type="button"
              className={styles.primaryBtn} 
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                // Clear old transit, generate internal HWCN, set new intended dest
                const sites = bottle?.producerSites?.length > 0 
                  ? bottle.producerSites 
                  : [{name: "Unknown Site", address: "See recovery logs", postcode: ""}];
                const hwcnId = await db.createHWCN({
                  serial: serialParam,
                  destination: "HQ-Stores",
                  sites: sites,
                  vehicleReg: vehicleReg,
                  engineer: user?.name,
                  date: new Date().toISOString(),
                  gasType: bottle?.gasType || "Unknown",
                  fillWeight: bottle?.currentWeight
                });
                await db.updateBottleLocation(serialParam, "van", `${user?.name} - Van`, "HQ-Stores", "office" as any, hwcnId, user?.name);
                setIsSubmitting(false);
                setGeneratedHWCN(hwcnId);
                setIsSuccess(true);
              }}
              style={{flex: 1}}
            >
              {isSubmitting ? "Generating..." : "Confirm — Generate Internal HWCN"}
            </button>
          </div>
        </div>
      )}

      {reclaimFlowStep === "divert_supplier_branch" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--warning)', marginTop: '2rem'}}>
          <h3 style={{color: 'var(--warning)', marginBottom: '1rem'}}>Divert to Different Branch</h3>
          <div className={styles.inputGroup} style={{marginBottom: '1.5rem'}}>
            <label>New Branch Name</label>
            <input 
              type="text" 
              placeholder="e.g. A-Gas Bristol" 
              value={divertedBranch} 
              onChange={(e) => setDivertedBranch(e.target.value)}
              required
            />
          </div>
          <div style={{display: 'flex', gap: '1rem'}}>
            <button 
              type="button"
              className={styles.primaryBtn} 
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
              onClick={() => setReclaimFlowStep("in_transit")}
            >
              Back
            </button>
            <button 
              type="button"
              className={styles.primaryBtn} 
              disabled={!divertedBranch}
              onClick={() => setReclaimFlowStep("intercept_supplier_photo")}
              style={{flex: 1}}
            >
              Proceed to Photo Upload
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
              className={styles.primaryBtn} 
              disabled={!supplierPhoto && !isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                // Use divertedBranch if set, otherwise original intended destination
                const finalLocId = divertedBranch || bottle?.intendedDestination || "Supplier";
                await db.completeTransit(serialParam, supplierPhoto || "/mock-url.jpg", user?.name, finalLocId);
                router.push("/engineer");
              }}
              style={{flex: 1, opacity: (!supplierPhoto && !isSubmitting) ? 0.5 : 1}}
            >
              {isSubmitting ? "Uploading..." : "Upload & Complete Return"}
            </button>
          </div>
        </div>
      )}

      {reclaimFlowStep === "ask_supplier" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--warning)', marginTop: '2rem'}}>
          <h3 style={{color: 'var(--warning)', marginBottom: '1rem'}}>Hazardous Waste Transfer</h3>
          {(bottle?.producerSites?.length || 0) <= 1 ? (
            <>
              <p style={{marginBottom: '1.5rem', fontSize: '0.9rem'}}>This bottle contains reclaimed gas. Is it being returned Direct to Supplier or to HQ-Stores?</p>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                <button 
                  type="button"
                  className={styles.primaryBtn} 
                  onClick={() => setReclaimFlowStep("confirm_supplier_hwcn")}
                >
                  Direct to Supplier
                </button>
                <button 
                  type="button"
                  className={styles.primaryBtn} 
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                  onClick={() => {
                    setIntendedDest("HQ-Stores");
                    setReclaimFlowPath("alternative");
                    setDestination("van");
                    setReclaimFlowStep("standard");
                  }}
                >
                  To HQ-Stores
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{background: 'rgba(255, 187, 0, 0.1)', border: '1px solid var(--warning)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem'}}>
                <p style={{fontSize: '0.85rem', color: 'var(--warning)', margin: 0, lineHeight: 1.5}}>
                  <strong style={{display: 'block', marginBottom: '0.25rem'}}>Multiple Producer Sites Detected</strong>
                  This bottle contains waste from multiple locations. Suppliers only accept waste from a single producer per HWCN. This bottle must be returned to the <strong>HQ-Stores</strong> for internal consolidation.
                </p>
              </div>
              <button 
                type="button"
                className={styles.primaryBtn} 
                onClick={() => {
                  setIntendedDest("HQ-Stores");
                  setReclaimFlowPath("alternative");
                  setDestination("van");
                  setReclaimFlowStep("standard");
                }}
              >
                Transfer to HQ-Stores
              </button>
            </>
          )}
        </div>
      )}

      {reclaimFlowStep === "confirm_supplier_hwcn" && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--warning)', marginTop: '2rem'}}>
          <h3 style={{color: 'var(--warning)', marginBottom: '1rem'}}>Supplier Paperwork</h3>

          <div style={{background: 'rgba(255, 170, 0, 0.08)', border: '1px solid rgba(255, 170, 0, 0.4)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem'}}>
            <p style={{fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 700, margin: '0 0 0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Write this on the supplier's paperwork</p>
            <p style={{fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 0.5rem'}}>Carrier Registration Number (CBDU):</p>
            <p style={{fontSize: '1.4rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-geist-mono)', margin: 0, letterSpacing: '0.1em'}}>{carrierRegNo}</p>
          </div>

          <label style={{display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px'}}>
            <input 
              type="checkbox" 
              checked={supplierHwcnConfirmed}
              onChange={(e) => setSupplierHwcnConfirmed(e.target.checked)}
              style={{width: '24px', height: '24px', flexShrink: 0}}
            />
            <span style={{fontSize: '0.9rem', lineHeight: '1.4'}}>I confirm I have completed the Supplier's physical HWCN paperwork for this return.</span>
          </label>

          <div className={styles.inputGroup} style={{marginBottom: '1.5rem'}}>
            <label style={{color: 'var(--warning)'}}>Intended Destination Branch</label>
            <input 
              type="text" 
              placeholder="e.g. A-Gas Portbury" 
              value={intendedBranch} 
              onChange={(e) => setIntendedBranch(e.target.value)} 
              required
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--warning)' }}
            />
            <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem'}}>Specify which supplier branch this waste is being returned to.</p>
          </div>

          <div style={{display: 'flex', gap: '1rem'}}>
            <button 
              type="button"
              className={styles.primaryBtn} 
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)', flex: '0 0 auto', padding: '0 1.5rem' }}
              onClick={() => setReclaimFlowStep("ask_supplier")}
            >
              Back
            </button>
            <button 
              type="button"
              className={styles.primaryBtn} 
              disabled={!supplierHwcnConfirmed || !intendedBranch}
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
              className={styles.primaryBtn}
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)', flex: '0 0 auto', padding: '0 1.5rem' }}
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
                  intendedBranch,
                  "supplier" as any,
                  undefined,
                  user?.name
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
                    <span style={{fontSize: "0.9rem", fontWeight: 600, textAlign: "center"}}>Handover to another Engineer</span>
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
                <h4 style={{fontSize: '0.9rem', marginBottom: '0.75rem'}}>Intended Final Destination</h4>
                <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                  <button 
                    type="button"
                    onClick={() => setIntendedDest("HQ-Stores")}
                    style={{
                      flex: 1, padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem', transition: 'all 0.2s',
                      background: intendedDest === "HQ-Stores" ? 'rgba(255, 187, 0, 0.15)' : 'rgba(255,255,255,0.03)',
                      border: intendedDest === "HQ-Stores" ? '1px solid var(--warning)' : '1px solid var(--border)',
                      color: intendedDest === "HQ-Stores" ? 'var(--warning)' : 'var(--text-main)'
                    }}
                  >
                    HQ-Stores
                  </button>
                  {reclaimFlowPath !== "alternative" && (
                    <button 
                      type="button"
                      onClick={() => setIntendedDest("Another Job Site")}
                      style={{
                        flex: 1, padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem', transition: 'all 0.2s',
                        background: intendedDest === "Another Job Site" ? 'rgba(255, 187, 0, 0.15)' : 'rgba(255,255,255,0.03)',
                        border: intendedDest === "Another Job Site" ? '1px solid var(--warning)' : '1px solid var(--border)',
                        color: intendedDest === "Another Job Site" ? 'var(--warning)' : 'var(--text-main)'
                      }}
                    >
                      Another Job Site
                    </button>
                  )}
                </div>
                <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem'}}>
                  Where is this hazardous waste eventually being delivered to? This is legally required for the HWCN.
                </p>
              </div>

              <div style={{borderLeft: '2px solid var(--warning)', paddingLeft: '1rem', marginBottom: '1.5rem'}}>
                <h4 style={{fontSize: '0.9rem', marginBottom: '0.75rem'}}>Part A: Producer / Removal Sites</h4>
                <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>
                  Sites are populated from your Gas Recovery logs. You can edit them if they are incomplete.
                </p>

                <div style={{background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.75rem'}}>
                  {hwcnSites.map((s: any, i: number) => (
                    <div key={i} style={{marginBottom: '1rem'}}>
                      <strong style={{color: 'var(--warning)', fontSize: '0.85rem'}}>Site {i + 1}</strong>
                      <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                        <input type="text" placeholder="Site Name" value={s.name} onChange={(e) => { const newSites = [...hwcnSites]; newSites[i].name = e.target.value; setHwcnSites(newSites); }} required={requiresHWCN} />
                      </div>
                      <div className={styles.inputGroup} style={{marginTop: '0.5rem'}}>
                        <input type="text" placeholder="Address & Postcode" value={s.address} onChange={(e) => { const newSites = [...hwcnSites]; newSites[i].address = e.target.value; setHwcnSites(newSites); }} required={requiresHWCN} />
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setHwcnSites([...hwcnSites, {name: "", address: "", postcode: ""}])} style={{background: 'transparent', border: '1px dashed var(--warning)', color: 'var(--warning)', padding: '0.5rem', width: '100%', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'}}>
                    + Add Another Site
                  </button>
                </div>
              </div>

              <div style={{borderLeft: '2px solid var(--warning)', paddingLeft: '1rem', marginBottom: '1.5rem'}}>
                <h4 style={{fontSize: '0.9rem', marginBottom: '0.75rem'}}>Part C: Carrier Certificate</h4>
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                  <div className={styles.inputGroup}>
                    <label>Carrier Name</label>
                    <input type="text" value={carrierName} onChange={(e) => setCarrierName(e.target.value)} placeholder="e.g. John Doe" required={requiresHWCN} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Vehicle Registration Number</label>
                    <input type="text" value={vehicleReg} onChange={(e) => setVehicleReg(e.target.value)} placeholder="e.g. AB12 CDE" required={requiresHWCN} />
                  </div>
                </div>
              </div>
              
              <p style={{fontSize: '0.8rem', color: 'var(--warning)', fontStyle: 'italic'}}>
                Waste Producer (Part A5) and Waste Description (Part B) will be automatically pre-filled to legal standards upon generation.
              </p>
            </div>
          )}

          {!isOnline && (
            <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem', alignItems: 'flex-start', marginTop: '1rem'}}>
              <AlertTriangle size={14} style={{flexShrink: 0, marginTop: '0.15rem', color: 'var(--warning)'}} />
              Offline: you can move to your Van, a Job Site, or another location. Supplier/HQ-Stores returns and handovers need a signal.
            </p>
          )}

          {offlineBlock && (
            <div style={{marginTop: '1rem', background: 'rgba(255,170,0,0.12)', border: '1px solid var(--warning)', padding: '0.75rem', borderRadius: '8px', color: 'var(--warning)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.85rem'}}>
              <AlertTriangle size={18} style={{flexShrink: 0}} /> {offlineBlock}
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
