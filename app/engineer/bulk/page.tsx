"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, CheckCircle2, PackageSearch, Trash2, Database, Warehouse, Truck, MapPin, Camera } from "lucide-react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import Link from "next/link";
import { db, BottleCategory } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import styles from "./page.module.css";

interface BatchBottle {
  serial: string;
  category: BottleCategory;
  gasType: string;
  weight: number;
}

export default function BulkDeliveryPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Step 1: Global PO Data
  const [step, setStep] = useState<1 | 2>(1);
  const [poNumber, setPoNumber] = useState("");
  const [jobNumber, setJobNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [locationType, setLocationType] = useState<"van" | "office" | "site">(user?.role === "admin" ? "office" : "van");

  // Step 2: Batch Data
  const [batch, setBatch] = useState<BatchBottle[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [manualSerial, setManualSerial] = useState("");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Auto-fill memory
  const [lastCategory, setLastCategory] = useState<BottleCategory>("new");
  const [lastGasType, setLastGasType] = useState("R410A");
  const [lastWeight, setLastWeight] = useState(10.5);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function handleScanSuccess(decodedText: string) {
    const upperSerial = decodedText.toUpperCase();

    const newBottle: BatchBottle = {
      serial: upperSerial,
      category: lastCategory,
      gasType: lastGasType,
      weight: lastWeight
    };

    setBatch(prev => {
      if (prev.some(b => b.serial === upperSerial)) {
        alert("Bottle already scanned in this batch!");
        return prev;
      }
      return [newBottle, ...prev];
    });
    
    setManualSerial("");
    // We intentionally DO NOT stop scanning. Let them rapid fire.
  }

  // Handle Scanner Initialization
  useEffect(() => {
    if (step === 2 && isScanning) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader-bulk",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true
        },
        false
      );

      scannerRef.current.render(handleScanSuccess, () => { });
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [step, isScanning]);

  useEffect(() => {
    db.getSuppliers().then(data => {
      setSuppliers(data);
      if (data.length > 0) setSupplier(data[0].name);
    });
  }, []);

  const removeBottle = (serial: string) => {
    setBatch(prev => prev.filter(b => b.serial !== serial));
  };

  const submitBatch = async () => {
    setIsSubmitting(true);
    // Stop scanner if active
    if (scannerRef.current) scannerRef.current.clear();
    setIsScanning(false);

    // Register all simultaneously
    const promises = batch.map(async b => {
      let rentalExpiryDate: string | undefined = undefined;
      if (supplier) {
        const days = await db.getDurationForSupplier(supplier, b.category);
        if (days) {
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + days);
          rentalExpiryDate = expiry.toISOString().slice(0, 10);
        }
      }

      return db.registerBottle({
        serial: b.serial,
        category: b.category,
        gasType: b.category === "nitrogen" ? "Nitrogen" : (b.category === "reclaim" ? "Unknown" : b.gasType),
        initialWeight: b.weight,
        currentWeight: b.weight,
        locationType: locationType as any,
        locationId: locationType === "van" ? `${user?.name} - Van` : locationType === "office" ? "HQ-Stores" : jobNumber,
        poNumber,
        supplier,
        rentalExpiryDate,
        registeredAt: new Date().toISOString(),
        lastEngineer: user?.name,
        registeredBy: user?.name
      });
    });

    try {
      await Promise.all(promises);

      setIsSubmitting(false);
      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      alert((error as Error).message || "Failed to register some bottles in the batch.");
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={styles.successContainer}>
        <CheckCircle2 size={64} color="var(--success)" />
        <h2>{batch.length} Bottles Received!</h2>
        <p>Batch successfully registered to PO {poNumber}.</p>
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
          <h1>Bulk Receive Delivery</h1>
          <p className={styles.subtitle}>Scan multiple bottles onto one PO</p>
        </div>
      </header>

      {step === 1 ? (
        <div className={`${styles.stepCard} glass-panel`}>
          <h2>Step 1: Delivery Details</h2>
          <div className={styles.inputGroup}>
            <label>PO Number</label>
            <input
              type="text"
              value={poNumber}
              onChange={e => setPoNumber(e.target.value)}
              placeholder="e.g. PO-9921"
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Supplier</label>
            <select value={supplier} onChange={e => setSupplier(e.target.value)}>
              {suppliers.map(sup => (
                <option key={sup.id} value={sup.name}>{sup.name}</option>
              ))}
              <option value="Other">Other...</option>
            </select>
          </div>
          <div className={styles.inputGroup}>
            <label style={{ marginBottom: '0.75rem', display: 'block' }}>Location Received</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
              {user?.role === "admin" && (
                <button
                  type="button"
                  onClick={() => setLocationType("office")}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                    borderRadius: '12px', border: locationType === 'office' ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                    background: locationType === 'office' ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255,255,255,0.02)',
                    color: locationType === 'office' ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                  }}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '8px',
                    background: locationType === 'office' ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Warehouse size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>HQ-Stores</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Deliver items to main storage</div>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => setLocationType("van")}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                  borderRadius: '12px', border: locationType === 'van' ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                  background: locationType === 'van' ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255,255,255,0.02)',
                  color: locationType === 'van' ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '8px',
                  background: locationType === 'van' ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Truck size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>My Van</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Collected by Engineer</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLocationType("site")}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                  borderRadius: '12px', border: locationType === 'site' ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                  background: locationType === 'site' ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255,255,255,0.02)',
                  color: locationType === 'site' ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '8px',
                  background: locationType === 'site' ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Direct to Job Site</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Delivered straight to project</div>
                </div>
              </button>
            </div>
          </div>

          {locationType === "site" && (
            <div className={styles.inputGroup} style={{ marginTop: '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
              <label style={{ color: 'var(--primary)', fontWeight: 700 }}>Job Number</label>
              <input
                type="text"
                value={jobNumber}
                onChange={e => setJobNumber(e.target.value)}
                placeholder="e.g. JOB-1234"
                style={{
                  border: '1px solid var(--primary)',
                  background: 'rgba(0, 229, 255, 0.05)'
                }}
              />
            </div>
          )}

          <button
            className={styles.primaryBtn}
            onClick={() => setStep(2)}
            disabled={!poNumber || (locationType === 'site' && !jobNumber)}
            style={{ marginTop: '2rem' }}
          >
            Start Scanning
          </button>
        </div>
      ) : (
        <div className={styles.step2Container}>
          <div className={`${styles.globalSettingsCard} glass-panel`}>
            <h3>Current Scan Settings</h3>
            <p className={styles.hint}>Bottles you scan will automatically use these settings. Change them here if the next bottle in the pallet is different.</p>
            <div className={styles.row}>
              <select value={lastCategory} onChange={e => setLastCategory(e.target.value as BottleCategory)} className={styles.miniSelect}>
                <option value="new">New</option>
                <option value="reclaim">Reclaim</option>
                <option value="nitrogen">Nitrogen</option>
              </select>
              {lastCategory === "new" && (
                <select value={lastGasType} onChange={e => setLastGasType(e.target.value)} className={styles.miniSelect}>
                  <option value="R410A">R410A</option>
                  <option value="R32">R32</option>
                  <option value="R134a">R134a</option>
                </select>
              )}
              <div className={styles.weightInputWrapper}>
                <input type="number" value={lastWeight} onChange={e => setLastWeight(parseFloat(e.target.value))} className={styles.miniInput} />
                <span>kg</span>
              </div>
            </div>
          </div>

          {!isScanning ? (
            <>
              <button
                onClick={() => setIsScanning(true)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, var(--primary) 0%, #0088ff 100%)',
                  color: '#000',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-glow)',
                  marginBottom: '1.5rem',
                  transition: 'transform 0.2s'
                }}
              >
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1rem', borderRadius: '50%' }}>
                  <Camera size={36} color="#000" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.25rem' }}>Scan Bottle</h2>
                  <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Open camera to add next bottle to batch</p>
                </div>
              </button>

              <div className={styles.manualEntryContainer} style={{ maxWidth: '100%', marginBottom: '1.5rem' }}>
                <p className={styles.manualEntryText} style={{ textAlign: 'left', marginBottom: '0.5rem', fontSize: '0.85rem', opacity: 0.7 }}>Or enter serial manually:</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="e.g. SN-998201A"
                    value={manualSerial}
                    onChange={(e) => setManualSerial(e.target.value)}
                    style={{
                      flex: 1, padding: '0.75rem 1rem', background: 'var(--surface-hover)',
                      border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '1rem'
                    }}
                  />
                  <button
                    onClick={() => manualSerial && handleScanSuccess(manualSerial)}
                    disabled={!manualSerial}
                    style={{
                      padding: '0.75rem 1.5rem', background: 'var(--primary)', color: '#000',
                      border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer',
                      opacity: manualSerial ? 1 : 0.5
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.scannerBox} style={{ marginBottom: '1.5rem' }}>
              <div id="reader-bulk" className={styles.reader}></div>
              <button
                onClick={() => setIsScanning(false)}
                className={styles.primaryBtn}
                style={{ marginTop: '1rem', background: 'var(--surface-hover)', color: '#fff', border: '1px solid var(--border)' }}
              >
                Close Camera
              </button>
            </div>
          )}

          <div className={styles.batchListContainer}>
            <div className={styles.batchHeader}>
              <h3>Scanned Batch</h3>
              <span className={styles.badge}>{batch.length}</span>
            </div>

            {batch.length === 0 ? (
              <p className={styles.emptyBatch}>No bottles scanned yet.</p>
            ) : (
              <ul className={styles.batchList}>
                {batch.map((b) => (
                  <li key={b.serial} className={styles.batchItem}>
                    <div className={styles.itemInfo}>
                      <strong>{b.serial}</strong>
                      <span>{b.category === 'new' ? b.gasType : b.category} ({b.weight}kg)</span>
                    </div>
                    <button onClick={() => removeBottle(b.serial)} className={styles.removeBtn}>
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            className={styles.submitBatchBtn}
            onClick={submitBatch}
            disabled={batch.length === 0 || isSubmitting}
          >
            {isSubmitting ? "Registering..." : `Register All ${batch.length} Bottles`}
          </button>
        </div>
      )}
    </div>
  );
}
