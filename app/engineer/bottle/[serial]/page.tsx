"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Truck, Wrench, AlertTriangle, ArrowLeft, Loader2, PackageCheck, MapPin, Building2, Users, Building, CheckCircle2, Camera, Image as ImageIcon } from "lucide-react";
import styles from "./page.module.css";
import Link from "next/link";
import { db, Bottle } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { compressImage } from "@/lib/utils";

export default function BottleActionHub() {
  const router = useRouter();
  const params = useParams();
  const serial = decodeURIComponent(params.serial as string);
  const { user } = useAuth();
  
  const [bottle, setBottle] = useState<Bottle | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [isAltBranch, setIsAltBranch] = useState(false);
  const [altBranchName, setAltBranchName] = useState("");
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [supplierPhoto, setSupplierPhoto] = useState<string | null>(null);
  
  // Inline Transfer States
  const [destination, setDestination] = useState("site");
  const [locationId, setLocationId] = useState("");
  const [engineers, setEngineers] = useState<any[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState("");
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [generatedHWCN, setGeneratedHWCN] = useState<string | null>(null);
  const [vehicleReg, setVehicleReg] = useState("");
  const [associatedHWCNs, setAssociatedHWCNs] = useState<any[]>([]);
  const [showNitrogenUsage, setShowNitrogenUsage] = useState(false);
  const [isSubmittingNitrogen, setIsSubmittingNitrogen] = useState(false);

  const handleNitrogenUsage = async (isEmpty: boolean) => {
    if (!bottle) return;
    setIsSubmittingNitrogen(true);
    try {
      const weightUsed = isEmpty ? (bottle.currentWeight || 0) : 1;
      await db.logUsage(serial, "service", weightUsed, false, undefined, undefined, user?.name || "Unknown", bottle.locationId);
      router.push('/engineer');
    } catch (err) {
      console.error("Failed to log nitrogen usage:", err);
      setIsSubmittingNitrogen(false);
    }
  };

  useEffect(() => {
    async function loadInitialData() {
      const b = await db.getBottle(serial);
      if (!b) {
        router.push(`/engineer/bottle/register?serial=${serial}`);
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

      const hwcns = await db.getHWCNsForBottle(serial);
      setAssociatedHWCNs(hwcns);

      setLoading(false);
    }
    loadInitialData();
  }, [serial, router, user]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bottle) return;
    setIsSubmittingTransfer(true);
    
    // Check if HWCN is required
    const isReclaimWithGas = bottle.category === "reclaim" && (bottle.currentWeight || 0) > 0;
    const isMultiSite = (bottle.producerSites?.length || 0) > 1;
    const requiresHWCN = isReclaimWithGas && destination !== "supplier";
    
    if (requiresHWCN) {
      // Need to redirect to full move flow to handle HWCN generation
      router.push(`/engineer/move?serial=${bottle.serial}&dest=${destination}`);
      return;
    }

    // MULTI-SITE CONSTRAINT: If multi-site, user cannot return to supplier. 
    // They must pick Office.
    if (isMultiSite && destination === "supplier") {
      alert("Notice: This bottle contains waste from multiple locations. Suppliers only accept waste from a single producer per HWCN. This bottle must be returned to the HQ-Stores for internal consolidation.");
      setDestination("office");
      return;
    }

    try {
      const requiresSupplierHWCN = isReclaimWithGas && destination === "supplier";
      const needsTransit = requiresSupplierHWCN; // Only supplier HWCNs are handled inline now

      if (!needsTransit) {
        const finalDest = destination === "engineer" ? "van" : destination;
        let finalLocationId = "";
        
        if (destination === "engineer") {
          const targetUser = engineers.find(e => e.id === selectedEngineer);
          finalLocationId = `${targetUser?.name || "Engineer"} - Van`;
        } else if (destination === "van") {
          finalLocationId = `${user?.name} - Van`;
        } else if (destination === "office") {
          finalLocationId = "HQ-Stores";
        } else {
          finalLocationId = locationId || (destination === "supplier" ? "Supplier" : `${user?.name} - Van`);
        }
          
        await db.updateBottleLocation(serial, finalDest as any, finalLocationId, undefined, undefined, undefined, user?.name);
        
        if (destination === "supplier" || destination === "office") {
          const updates: any = { status: destination === "supplier" ? "returned" : "active" };
          if (destination === "supplier") {
            updates.supplier_hwcn_photo_pending = false;
          }
          await db.updateBottle(serial, updates);
        }
      } else {
        // Needs transit (Reclaim with gas to Supplier)
        const finalLocationId = locationId || "Supplier";
        await db.updateBottleLocation(serial, "van", `${user?.name} - Van`, finalLocationId, destination as any, undefined, user?.name);
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
        <Link href="/engineer" className={styles.backBtn}>
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
              {bottle.supplier && (
                <div style={{fontSize: '0.85rem', wordBreak: 'break-word'}}>
                  <span style={{color: 'var(--text-muted)'}}>Supplier: </span>
                  <strong style={{color: '#fff'}}>{bottle.supplier}</strong>
                </div>
              )}
              <div style={{fontSize: '0.85rem', wordBreak: 'break-word'}}>
                <span style={{color: 'var(--text-muted)'}}>Gas Type: </span>
                <strong style={{color: '#fff'}}>{bottle.gasType}</strong>
              </div>
              <div style={{fontSize: '0.85rem', wordBreak: 'break-word'}}>
                <span style={{color: 'var(--text-muted)'}}>Current Location: </span>
                <strong style={{color: '#fff', textTransform: 'capitalize'}}>{bottle.locationId || bottle.locationType}</strong>
              </div>
              {(locationId || bottle.intendedDestination || (destination === 'engineer' && selectedEngineer)) && (
                <div style={{fontSize: '0.85rem', wordBreak: 'break-word', marginTop: '0.2rem'}}>
                  <span style={{color: 'var(--text-muted)'}}>Intended Destination: </span>
                  <strong style={{color: 'var(--warning)'}}>
                    {destination === 'engineer' 
                      ? (engineers.find(e => e.id === selectedEngineer)?.name || "Selected Engineer")
                      : (bottle.intendedLocationType === 'supplier' && bottle.supplier && bottle.intendedDestination
                        ? `${bottle.supplier} - ${bottle.intendedDestination}`
                        : (locationId || bottle.intendedDestination))}
                  </strong>
                  {bottle.activeHWCN && (
                    <div style={{marginTop: '0.25rem'}}>
                      <Link href={`/engineer/hwcn/${encodeURIComponent(bottle.activeHWCN)}`} style={{color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.75rem'}}>
                        View Digital HWCN ({bottle.activeHWCN})
                      </Link>
                    </div>
                  )}
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

      {associatedHWCNs.length > 0 && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginBottom: '1.5rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
            <Truck size={24} color="var(--primary)" />
            <h3 style={{color: 'var(--primary)', margin: 0}}>Associated HWCNs</h3>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
            {associatedHWCNs.map(hwcn => (
              <div key={hwcn.id} style={{
                padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{fontWeight: 600, color: 'var(--text-main)'}}>{hwcn.id}</div>
                  <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                    {new Date(hwcn.date).toLocaleDateString()} · Dest: {hwcn.destination}
                  </div>
                </div>
                <Link 
                  href={`/engineer/hwcn/${encodeURIComponent(hwcn.id)}`}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '4px', background: 'var(--primary)', color: '#000',
                    fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none'
                  }}
                >
                  View Note
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {bottle.supplierHwcnPhotoPending && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--error)', marginBottom: '1.5rem', background: 'rgba(255, 51, 102, 0.05)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
            <AlertTriangle size={24} color="var(--error)" />
            <h3 style={{color: 'var(--error)', margin: 0}}>Missing Supplier Paperwork</h3>
          </div>
          <p style={{fontSize: '0.9rem', marginBottom: '1.5rem', color: 'var(--text-main)'}}>
            This bottle was returned to a supplier, but you skipped the photo upload. Please upload the physical HWCN photo to complete compliance.
          </p>
          <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem'}}>
            <label className={styles.primaryBtn} style={{flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0}}>
              <Camera size={18} /> Take Photo
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                style={{display: 'none'}}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const compressed = await compressImage(file);
                    setSupplierPhoto(compressed);
                  }
                }}
              />
            </label>
            <label className={styles.primaryBtn} style={{flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0}}>
              <ImageIcon size={18} /> From Gallery
              <input 
                type="file" 
                accept="image/*" 
                style={{display: 'none'}}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const compressed = await compressImage(file);
                    setSupplierPhoto(compressed);
                  }
                }}
              />
            </label>
          </div>
          {supplierPhoto && (
            <div style={{background: 'rgba(0,255,136,0.1)', border: '1px solid var(--success)', padding: '0.75rem', borderRadius: '8px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', marginBottom: '1.5rem'}}>
              <CheckCircle2 size={18} /> Photo successfully attached
            </div>
          )}
          <button 
            type="button"
            className={styles.primaryBtn} 
            disabled={!supplierPhoto || loading}
            onClick={async () => {
              setLoading(true);
              await db.completeTransit(bottle.serial, supplierPhoto || "/mock-url-uploaded.jpg");
              router.push('/engineer');
            }}
            style={{width: '100%', background: 'var(--error)', color: '#fff'}}
          >
            Upload Document
          </button>
        </div>
      )}

      {/* IN TRANSIT INTERCEPT */}
      {bottle.intendedDestination && !bottle.supplierHwcnPhotoPending && (
        <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--warning)', marginTop: '0.5rem', background: 'rgba(255, 187, 0, 0.05)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem'}}>
            <Truck size={26} color="var(--warning)" />
            <div>
              <h3 style={{color: 'var(--warning)', margin: 0}}>In Transit</h3>
              <p style={{margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)'}}>Cylinder is moving to {bottle.intendedDestination}</p>
            </div>
          </div>

          <p style={{fontSize: '0.9rem', marginBottom: '1.5rem'}}>
            Have you arrived at the destination? Completing the transfer will update the physical location and clear the transit state.
          </p>

          <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
            {showPhotoUpload ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 187, 0, 0.2)'}}>
                <h4 style={{color: 'var(--warning)', margin: 0}}>Supplier Paperwork Upload</h4>
                <p style={{fontSize: '0.85rem', margin: 0, color: 'var(--text-muted)'}}>Please take a photo of the completed physical HWCN provided by the supplier. You can use your camera directly.</p>
                <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
                  <label className={styles.primaryBtn} style={{flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--warning)', color: 'var(--warning)', textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0}}>
                    <Camera size={18} /> Take Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      style={{display: 'none'}}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const compressed = await compressImage(file);
                          setSupplierPhoto(compressed);
                        }
                      }}
                    />
                  </label>
                  <label className={styles.primaryBtn} style={{flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0}}>
                    <ImageIcon size={18} /> From Gallery
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{display: 'none'}}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const compressed = await compressImage(file);
                          setSupplierPhoto(compressed);
                        }
                      }}
                    />
                  </label>
                </div>
                {supplierPhoto && (
                  <div style={{background: 'rgba(0,255,136,0.1)', border: '1px solid var(--success)', padding: '0.75rem', borderRadius: '8px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'}}>
                    <CheckCircle2 size={18} /> Photo successfully attached
                  </div>
                )}
                {isAltBranch && (
                  <div className={styles.inputGroup} style={{marginBottom: '1rem'}}>
                    <label style={{color: 'var(--warning)', fontSize: '0.8rem'}}>New Branch Name</label>
                    <input 
                      type="text" 
                      value={altBranchName}
                      onChange={(e) => setAltBranchName(e.target.value)}
                      placeholder="e.g. A-Gas Bristol"
                      className={styles.textInput}
                      autoFocus
                    />
                  </div>
                )}
                <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                  <button
                    className={styles.primaryBtn}
                    disabled={!supplierPhoto || (isAltBranch && !altBranchName) || loading}
                    style={{background: 'var(--warning)', color: '#000', margin: 0, flex: 1}}
                    onClick={async () => {
                      setLoading(true);
                      await db.completeTransit(serial, supplierPhoto || "/mock-url.jpg", user?.name, isAltBranch ? altBranchName : undefined);
                      router.push('/engineer');
                    }}
                  >
                    {loading ? <Loader2 size={18} className={styles.spinner} /> : "Upload & Complete Return"}
                  </button>
                  <button 
                    onClick={() => {
                      setShowPhotoUpload(false);
                      setSupplierPhoto(null);
                      setIsAltBranch(false);
                    }}
                    style={{background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '0 1rem', borderRadius: '8px', cursor: 'pointer'}}
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* §3.1 — Supplier Intended Destination */}
                {bottle.intendedLocationType === 'supplier' && (
                  <>
                    <button
                      className={styles.primaryBtn}
                      style={{background: 'var(--warning)', color: '#000'}}
                      onClick={() => setShowPhotoUpload(true)}
                    >
                      <CheckCircle2 size={18} /> Yes, Arrived at Intended Destination
                    </button>
                    <button 
                      type="button"
                      className={styles.primaryBtn} 
                      onClick={() => {
                        setIsAltBranch(true);
                        setShowPhotoUpload(true);
                      }}
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                    >
                      Arrived at a DIFFERENT Supplier Branch
                    </button>
                    <button 
                      type="button"
                      onClick={() => router.push(`/engineer/move?serial=${serial}&action=divert`)}
                      style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      No, Changing Bottle Route
                    </button>
                  </>
                )}

                {/* §3.2 — HQ-Stores Intended Destination */}
                {bottle.intendedLocationType !== 'supplier' && (
                  <>
                    <button
                      className={styles.primaryBtn}
                      style={{background: 'var(--warning)', color: '#000'}}
                      onClick={async () => {
                        setLoading(true);
                        await db.completeTransit(serial, undefined, user?.name);
                        router.push('/engineer');
                      }}
                    >
                      <CheckCircle2 size={18} /> Complete Transfer to HQ-Stores
                    </button>
                    <button 
                      type="button"
                      onClick={() => router.push(`/engineer/move?serial=${serial}&action=divert`)}
                      style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      No, Transfer to Alternative Location
                    </button>
                  </>
                )}
              </>
            )}
            {!showPhotoUpload && (
              <button className={styles.secondaryBtn} onClick={() => router.push('/engineer')}>
                Not Yet
              </button>
            )}
          </div>
        </div>
      )}

      {/* ONLY SHOW ACTIONS IF NOT IN TRANSIT */}
      {!bottle.intendedDestination && (
        <>
          {/* OFFICE SIGN-OUT INTERCEPT */}
          {bottle.locationType === 'office' ? (
            <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--primary)', marginTop: '0.5rem'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem'}}>
                <PackageCheck size={26} color="var(--primary)" />
                <div>
                  <h3 style={{color: 'var(--primary)', margin: 0}}>In HQ-Stores</h3>
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
                    await db.signOutFromStores(serial, user?.name || 'Engineer', user?.id);
                    router.push('/engineer');
                  }}
                >
                  {signingOut
                    ? <Loader2 size={18} className={styles.spinner} />
                    : <><Truck size={18} /> Sign Out — Transfer to My Van</>
                  }
                </button>
                <Link href="/engineer" style={{textDecoration: 'none'}}>
                  <button className={styles.secondaryBtn} style={{width: '100%'}}>Back to Dashboard</button>
                </Link>
              </div>
            </div>
          ) : (
            <div className={styles.actionsContainer}>
              {bottle.locationType === 'supplier' ? (
                <div className={`${styles.dynamicSection} glass-panel`} style={{borderColor: 'var(--success)', marginTop: '0.5rem', textAlign: 'center', padding: '2rem'}}>
                  <div style={{display: 'flex', justifyContent: 'center', marginBottom: '1rem'}}>
                    <div style={{padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%'}}>
                      <CheckCircle2 size={48} color="var(--success)" />
                    </div>
                  </div>
                  <h3 style={{color: 'var(--success)', marginBottom: '0.5rem'}}>Lifecycle Complete</h3>
                  <p style={{color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '300px', margin: '0 auto 1.5rem'}}>
                    This bottle has been returned to the supplier. No further transfers or gas logs can be recorded.
                  </p>
                  <Link href="/engineer" style={{textDecoration: 'none'}}>
                    <button className={styles.secondaryBtn} style={{width: '100%'}}>Back to Dashboard</button>
                  </Link>
                </div>
              ) : transferSuccess ? (
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
                      <Link href={`/engineer/hwcn/${encodeURIComponent(generatedHWCN)}`} style={{textDecoration: 'none'}}>
                        <button className={styles.primaryBtn} style={{width: '100%', background: 'linear-gradient(135deg, var(--warning) 0%, #ff8800 100%)', color: '#000'}}>
                          View Digital HWCN
                        </button>
                      </Link>
                    )}
                    <button onClick={() => router.push('/engineer')} className={styles.secondaryBtn}>Done</button>
                  </div>
                </div>
              ) : bottle.locationType === 'van' ? (
                <div className={styles.inlineTransfer}>
                  <h2 className={styles.promptText} style={{textAlign: 'left', marginBottom: '1.5rem'}}>Transfer Location</h2>
                  
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem'}}>
                    {/* SITE */}
                    {(bottle.producerSites?.length || 0) <= 1 && (
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
                    )}

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
                    {(bottle.producerSites?.length || 0) <= 1 && (
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
                    )}

                    {/* HANDOVER */}
                    {(bottle.producerSites?.length || 0) <= 1 && (
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
                        <span style={{fontSize: "0.85rem", fontWeight: 600, textAlign: "center"}}>Handover to another Engineer</span>
                      </button>
                    )}
                  </div>

                  {(bottle.producerSites?.length || 0) > 1 && (
                    <div style={{background: 'rgba(255, 187, 0, 0.1)', border: '1px solid var(--warning)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem'}}>
                      <p style={{fontSize: '0.85rem', color: 'var(--warning)', margin: 0, lineHeight: 1.5}}>
                        <strong>Multi-Site Waste Detected:</strong> This bottle contains gas from multiple locations. Regulatory rules require this to be returned to the <strong>HQ-Stores</strong> for consolidation.
                      </p>
                    </div>
                  )}

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
                  <Link href={`/engineer/move?serial=${bottle.serial}`} className={`${styles.actionCard} ${styles.moveCard}`}>
                    <div className={styles.iconWrapper}>
                      <Truck size={32} />
                    </div>
                    <div className={styles.actionText}>
                      {bottle.locationType === "site" || bottle.locationType === "office" ? (
                        <>
                          <h3>Transfer Bottle into Van {bottle.locationType !== "site" ? "from Stores" : `from ${bottle.locationId}`}</h3>
                          <p>Move this bottle {bottle.locationType !== "site" ? "from HQ-Stores" : `from ${bottle.locationId}`} back into your van stock</p>
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
                  {bottle.category !== "nitrogen" ? (
                    bottle.status === 'empty' && bottle.category === 'new' ? (
                      <div className={styles.actionCard} style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                        <div className={styles.iconWrapper} style={{ background: 'rgba(255,255,255,0.1)' }}>
                          <CheckCircle2 size={32} color="var(--text-muted)" />
                        </div>
                        <div className={styles.actionText}>
                          <h3>Bottle Empty</h3>
                          <p>This cylinder is completely empty and cannot be used.</p>
                        </div>
                      </div>
                    ) : bottle.status === 'full' && bottle.category === 'reclaim' ? (
                      <div className={styles.actionCard} style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                        <div className={styles.iconWrapper} style={{ background: 'rgba(255,255,255,0.1)' }}>
                          <CheckCircle2 size={32} color="var(--text-muted)" />
                        </div>
                        <div className={styles.actionText}>
                          <h3>Bottle Full</h3>
                          <p>This reclaim cylinder is full. No more gas can be recovered into it.</p>
                        </div>
                      </div>
                    ) : (
                      <Link 
                        href={(bottle.locationType as string) === 'van' ? '#' : `/engineer/log?serial=${bottle.serial}`} 
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
                    )
                  ) : (
                    <>
                      {bottle.status !== 'empty' ? (
                        <button 
                          onClick={() => (bottle.locationType as string) !== 'van' && setShowNitrogenUsage(true)}
                          className={`${styles.actionCard} ${styles.nitrogenCard} ${(bottle.locationType as string) === 'van' ? styles.disabledCard : ''}`}
                          style={{ textAlign: 'left', width: '100%', cursor: (bottle.locationType as string) === 'van' ? 'not-allowed' : 'pointer' }}
                          disabled={(bottle.locationType as string) === 'van'}
                        >
                          <div className={styles.iconWrapper}>
                            <Wrench size={32} />
                          </div>
                          <div className={styles.actionText}>
                            <h3>Log Nitrogen Usage</h3>
                            <p>{(bottle.locationType as string) === 'van' ? "Bottle currently in van, transfer bottle to site to enable usage." : "Record nitrogen usage for pressure testing or purging"}</p>
                          </div>
                        </button>
                      ) : (
                        <div className={styles.actionCard} style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                          <div className={styles.iconWrapper} style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <CheckCircle2 size={32} color="var(--text-muted)" />
                          </div>
                          <div className={styles.actionText}>
                            <h3>Bottle Empty</h3>
                            <p>This nitrogen bottle is empty and cannot be used.</p>
                          </div>
                        </div>
                      )}

                      {showNitrogenUsage && (
                        <div className={`${styles.dynamicSection} glass-panel`} style={{ borderColor: '#00e5ff', marginTop: '1rem', animation: 'fadeIn 0.3s ease-out' }}>
                          <h3 style={{ color: '#00e5ff', marginBottom: '1rem', fontSize: '1rem' }}>Is the Nitrogen bottle empty?</h3>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Nitrogen cannot be weighed accurately. If the bottle is empty press &quot;Yes&quot;, if the bottle is not empty press &quot;No&quot;.
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button 
                              className={styles.primaryBtn}
                              style={{ background: 'var(--error)', color: '#fff' }}
                              disabled={isSubmittingNitrogen}
                              onClick={() => handleNitrogenUsage(true)}
                            >
                              {isSubmittingNitrogen ? <Loader2 size={18} className={styles.spinner} /> : "Yes, Empty"}
                            </button>
                            <button 
                              className={styles.primaryBtn}
                              style={{ background: 'var(--success)', color: '#fff' }}
                              disabled={isSubmittingNitrogen}
                              onClick={() => handleNitrogenUsage(false)}
                            >
                              {isSubmittingNitrogen ? <Loader2 size={18} className={styles.spinner} /> : "No, Not Empty"}
                            </button>
                          </div>
                          <button 
                            className={styles.secondaryBtn} 
                            style={{ width: '100%', marginTop: '1rem' }}
                            onClick={() => setShowNitrogenUsage(false)}
                            disabled={isSubmittingNitrogen}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* DISCREPANCY BUTTON - Only for non-supplier bottles */}
              {bottle.locationType !== 'supplier' && !transferSuccess && (
                <div style={{marginTop: "1.5rem", display: "flex", justifyContent: "center"}}>
                  <button 
                    onClick={() => router.push(`/engineer/move?serial=${bottle.serial}&discrepancy=true`)}
                    style={{
                      background: "rgba(255, 187, 0, 0.05)", border: "1px solid rgba(255, 187, 0, 0.2)",
                      color: "rgba(255, 187, 0, 0.6)", padding: "0.6rem 1rem", borderRadius: "8px", fontSize: "0.85rem",
                      display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 500
                    }}
                  >
                    <AlertTriangle size={16} /> Is Current Location Incorrect?
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
