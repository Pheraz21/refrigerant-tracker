"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, CheckCircle2, PackageSearch, Trash2, Database } from "lucide-react";
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
  const [supplier, setSupplier] = useState("Bejer Ref");
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

      scannerRef.current.render(handleScanSuccess, () => {});
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [step, isScanning]);

  const handleScanSuccess = (decodedText: string) => {
    const upperSerial = decodedText.toUpperCase();
    
    // Check if already in batch
    if (batch.some(b => b.serial === upperSerial)) {
      alert("Bottle already scanned in this batch!");
      return;
    }

    const newBottle: BatchBottle = {
      serial: upperSerial,
      category: lastCategory,
      gasType: lastGasType,
      weight: lastWeight
    };

    setBatch(prev => [newBottle, ...prev]);
    setManualSerial("");
    // We intentionally DO NOT stop scanning. Let them rapid fire.
  };

  const removeBottle = (serial: string) => {
    setBatch(prev => prev.filter(b => b.serial !== serial));
  };

  const submitBatch = async () => {
    setIsSubmitting(true);
    // Stop scanner if active
    if (scannerRef.current) scannerRef.current.clear();
    setIsScanning(false);

    // Register all simultaneously
    const promises = batch.map(b => db.registerBottle({
      serial: b.serial,
      category: b.category,
      gasType: b.category === "nitrogen" ? "Nitrogen" : (b.category === "reclaim" ? "Unknown" : b.gasType),
      initialWeight: b.weight,
      currentWeight: b.weight,
      locationType: locationType as any,
      locationId: locationType === "van" ? `${user?.name} - Van` : locationType === "office" ? "HQ-Stores" : "Job-Delivery",
      poNumber,
      supplier,
      registeredAt: new Date().toISOString()
    }));

    await Promise.all(promises);

    setIsSubmitting(false);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className={styles.successContainer}>
        <CheckCircle2 size={64} color="var(--success)" />
        <h2>{batch.length} Bottles Received!</h2>
        <p>Batch successfully registered to PO {poNumber}.</p>
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
              <option value="Bejer Ref">Bejer Ref</option>
              <option value="Kooltech">Kooltech</option>
              <option value="TF Solutions">TF Solutions</option>
              <option value="Wolseley">Wolseley</option>
              <option value="BOC">BOC</option>
              <option value="Other">Other...</option>
            </select>
          </div>
          <div className={styles.inputGroup}>
            <label>Location Received</label>
            <select value={locationType} onChange={(e) => setLocationType(e.target.value as any)}>
              {user?.role === "admin" && (
                <option value="office">Received into Office / Stores</option>
              )}
              <option value="van">My Van (Collected by Engineer)</option>
              <option value="site">Direct to Job Site</option>
            </select>
          </div>

          <button 
            className={styles.primaryBtn} 
            onClick={() => setStep(2)}
            disabled={!poNumber}
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
            <button className={styles.startScanBtn} onClick={() => setIsScanning(true)}>
              <PackageSearch size={24} />
              Open Camera Scanner
            </button>
          ) : (
            <div className={styles.scannerBox}>
              <div id="reader-bulk" className={styles.reader}></div>
              
              <div className={styles.manualEntry}>
                <input 
                  type="text" 
                  placeholder="Manual Serial"
                  value={manualSerial}
                  onChange={e => setManualSerial(e.target.value)}
                />
                <button onClick={() => manualSerial && handleScanSuccess(manualSerial)}>Add</button>
              </div>
              <div className={styles.testActions}>
                 <button onClick={() => handleScanSuccess("BULK-" + Math.floor(Math.random()*10000))}>Simulate Scan</button>
                 <button onClick={() => setIsScanning(false)} className={styles.stopBtn}>Close Camera</button>
              </div>
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
