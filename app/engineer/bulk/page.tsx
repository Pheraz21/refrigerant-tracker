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
  const { user, activeVehicleReg } = useAuth();
  const canUseOfficeStores =
    user?.role === "admin" ||
    user?.role === "office" ||
    Boolean(user?.availableRoles?.includes("office"));

  // Step 1: Global PO Data
  const [step, setStep] = useState<1 | 2>(1);
  const [poNumber, setPoNumber] = useState("");
  const [jobNumber, setJobNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [locationType, setLocationType] = useState<"van" | "office" | "site">(canUseOfficeStores ? "office" : "van");

  // Step 2: Batch Data
  const [batch, setBatch] = useState<BatchBottle[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [manualSerial, setManualSerial] = useState("");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Auto-fill memory
  const [lastCategory, setLastCategory] = useState<BottleCategory>("new");
  const [lastGasType, setLastGasType] = useState("R410A");
  const [lastWeight, setLastWeight] = useState(10.5);

  // Refs to avoid stale closure inside Html5QrcodeScanner callback
  const lastCategoryRef = useRef<BottleCategory>(lastCategory);
  const lastGasTypeRef = useRef<string>(lastGasType);
  const lastWeightRef = useRef<number>(lastWeight);
  const batchRef = useRef<BatchBottle[]>(batch);

  useEffect(() => { lastCategoryRef.current = lastCategory; }, [lastCategory]);
  useEffect(() => { lastGasTypeRef.current = lastGasType; }, [lastGasType]);
  useEffect(() => { lastWeightRef.current = lastWeight; }, [lastWeight]);
  useEffect(() => { batchRef.current = batch; }, [batch]);

  // Inline scan status & duplicate cooldown (2s per serial)
  const [scanStatus, setScanStatus] = useState<{ type: "info" | "warning" | "error"; message: string } | null>(null);
  const duplicateCooldownRef = useRef<Record<string, number>>({});
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showScanStatus = (type: "info" | "warning" | "error", message: string) => {
    setScanStatus({ type, message });
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setScanStatus(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleScanSuccess(decodedText: string) {
    const upperSerial = decodedText.trim().toUpperCase();
    if (!upperSerial) return;

    if (batchRef.current.some(b => b.serial === upperSerial)) {
      const now = Date.now();
      const lastWarned = duplicateCooldownRef.current[upperSerial] || 0;
      if (now - lastWarned >= 2000) {
        duplicateCooldownRef.current[upperSerial] = now;
        showScanStatus("warning", `Bottle ${upperSerial} is already in this batch.`);
      }
      return;
    }

    const parsedWeight = Number(lastWeightRef.current);
    const safeWeight = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : 0;

    const newBottle: BatchBottle = {
      serial: upperSerial,
      category: lastCategoryRef.current,
      gasType: lastGasTypeRef.current,
      weight: safeWeight
    };

    const nextBatch = [newBottle, ...batchRef.current];
    batchRef.current = nextBatch;
    setBatch(nextBatch);
    showScanStatus("info", `Added ${upperSerial} to batch.`);
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
          rememberLastUsedCamera: true,
          videoConstraints: {
            facingMode: "environment"
          }
        },
        false
      );

      scannerRef.current.render(handleScanSuccess, () => { });
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
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
    setBatch(prev => {
      const next = prev.filter(b => b.serial !== serial);
      batchRef.current = next;
      return next;
    });
  };

  const submitBatch = async () => {
    if (isSubmitting || batch.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);
    // Stop scanner if active
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setIsScanning(false);

    try {
      let resolvedVehicleReg = activeVehicleReg || user?.vehicleReg || undefined;
      if (locationType === "van" && !resolvedVehicleReg && user?.id) {
        try {
          const profile = await db.getEngineerById(user.id);
          if (profile?.vehicleReg) resolvedVehicleReg = profile.vehicleReg;
        } catch {
          // Ignore profile lookup error and continue
        }
      }

      const batchSnapshot = [...batch];
      const results = await Promise.allSettled(
        batchSnapshot.map(async b => {
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
            gasType: b.category === "nitrogen" ? "Nitrogen" : (b.category === "reclaim" ? "None (Supplier Clean)" : b.gasType),
            initialWeight: b.weight,
            currentWeight: b.category === "reclaim" ? 0 : b.weight,
            locationType: locationType as any,
            locationId: locationType === "van" ? `${user?.name} - Van` : locationType === "office" ? "HQ-Stores" : jobNumber,
            vehicleReg: locationType === "van" ? resolvedVehicleReg : undefined,
            poNumber,
            supplier,
            rentalExpiryDate,
            registeredAt: new Date().toISOString(),
            lastEngineer: user?.name,
            registeredBy: user?.name
          });
        })
      );

      const succeededSerials = new Set<string>();
      const failedItems: { serial: string; message: string }[] = [];

      results.forEach((result, idx) => {
        const item = batchSnapshot[idx];
        if (result.status === "fulfilled") {
          succeededSerials.add(item.serial);
        } else {
          failedItems.push({
            serial: item.serial,
            message: (result.reason as Error)?.message || "Registration failed"
          });
        }
      });

      if (failedItems.length === 0) {
        setSubmittedCount(succeededSerials.size);
        setBatch([]);
        batchRef.current = [];
        setIsSuccess(true);
      } else {
        const remaining = batchSnapshot.filter(b => !succeededSerials.has(b.serial));
        setBatch(remaining);
        batchRef.current = remaining;
        const details = failedItems.map(f => `${f.serial} (${f.message})`).join(", ");
        setSubmitError(
          succeededSerials.size > 0
            ? `${succeededSerials.size} bottle(s) registered successfully. ${failedItems.length} failed and remain in your batch: ${details}`
            : `Failed to register ${failedItems.length} bottle(s): ${details}`
        );
      }
    } catch (error) {
      console.error(error);
      setSubmitError((error as Error)?.message || "Failed to register bottles in the batch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={styles.successContainer}>
        <CheckCircle2 size={64} color="var(--success)" />
        <h2>{submittedCount} Bottles Received!</h2>
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
        <button type="button" onClick={() => router.replace("/engineer")} className={styles.backBtn}>
          <ArrowLeft size={20} />
        </button>
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
              {canUseOfficeStores && (
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
              <label style={{ color: 'var(--primary)', fontWeight: 700 }}>Job Number (e.g. J12345, M98201)</label>
              <input
                type="text"
                value={jobNumber}
                pattern="^[A-Za-z][0-9]+$"
                title="Job number must start with 1 letter followed by numbers without spaces (e.g. J12345)"
                onChange={e => setJobNumber(e.target.value.replace(/\s+/g, "").toUpperCase())}
                placeholder="e.g. J12345"
                style={{
                  border: '1px solid var(--primary)',
                  background: 'rgba(0, 229, 255, 0.05)'
                }}
              />
            </div>
          )}

          <button
            className={styles.primaryBtn}
            onClick={() => {
              if (locationType === "site") {
                const cleanJob = (jobNumber || "").trim().replace(/\s+/g, "").toUpperCase();
                if (!/^[A-Za-z]\d+$/.test(cleanJob)) {
                  alert("Job number must start with 1 letter followed by numbers without spaces (e.g. J12345, M98201).");
                  return;
                }
              }
              setStep(2);
            }}
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
                <option value="new">Virgin Gas</option>
                <option value="reclaim">Recovery / Reclaim</option>
                <option value="nitrogen">Nitrogen (OFN)</option>
              </select>
              {lastCategory === "new" && (
                <select value={lastGasType} onChange={e => setLastGasType(e.target.value)} className={styles.miniSelect}>
                  <option value="R410A">R410A</option>
                  <option value="R32">R32</option>
                  <option value="R134a">R134a</option>
                </select>
              )}
              <div className={styles.weightInputWrapper}>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={lastWeight}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setLastWeight(Number.isNaN(val) ? 0 : val);
                  }}
                  className={styles.miniInput}
                />
                <span>kg</span>
              </div>
            </div>
          </div>

          {scanStatus && (
            <div
              role="status"
              style={{
                marginBottom: "1rem",
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                fontSize: "0.88rem",
                fontWeight: 600,
                border:
                  scanStatus.type === "warning"
                    ? "1px solid var(--warning)"
                    : scanStatus.type === "error"
                    ? "1px solid #ff4444"
                    : "1px solid var(--primary)",
                background:
                  scanStatus.type === "warning"
                    ? "rgba(255, 170, 0, 0.12)"
                    : scanStatus.type === "error"
                    ? "rgba(255, 68, 68, 0.12)"
                    : "rgba(0, 229, 255, 0.1)",
                color:
                  scanStatus.type === "warning"
                    ? "var(--warning)"
                    : scanStatus.type === "error"
                    ? "#ff6b6b"
                    : "var(--primary)"
              }}
            >
              {scanStatus.message}
            </div>
          )}

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
                      <span>
                        {b.category === "new"
                          ? `Virgin Gas (${b.gasType})`
                          : b.category === "reclaim"
                          ? "Recovery / Reclaim"
                          : b.category === "nitrogen"
                          ? "Nitrogen (OFN)"
                          : b.category}{" "}
                        ({b.weight}kg)
                      </span>
                    </div>
                    <button onClick={() => removeBottle(b.serial)} className={styles.removeBtn}>
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {submitError && (
            <div
              role="alert"
              style={{
                marginBottom: "1rem",
                padding: "0.85rem 1rem",
                borderRadius: "10px",
                background: "rgba(255, 68, 68, 0.12)",
                border: "1px solid #ff4444",
                color: "#ff6b6b",
                fontSize: "0.88rem",
                lineHeight: 1.4
              }}
            >
              {submitError}
            </div>
          )}

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
