"use client";

import { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { CheckCircle2, ScanLine, ArrowRight, PackageSearch, Camera, Repeat, User } from "lucide-react";
import styles from "./page.module.css";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";

interface ScanData {
  barcode: string;
  timestamp: string;
  location: { lat: number; lng: number } | null;
}

export default function DashboardScannerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, switchRole } = useAuth();
  const [scanResult, setScanResult] = useState<ScanData | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [manualSerial, setManualSerial] = useState("");
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [engineer, setEngineer] = useState<any>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (user?.id) {
      db.getEngineerById(user.id).then(setEngineer);
    }
  }, [user]);

  useEffect(() => {
    const simulate = searchParams.get("simulate");
    if (simulate === "existing") {
      const timestamp = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
      setScanResult({ barcode: "8849201A", timestamp, location: null });
    } else if (simulate === "reclaim") {
      const timestamp = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
      setScanResult({ barcode: "REC-402", timestamp, location: null });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isCameraOpen || !isScanning) return;

    // Initialize Scanner
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [
          Html5QrcodeScanType.SCAN_TYPE_CAMERA
        ],
        rememberLastUsedCamera: true
      },
      false
    );

    scannerRef.current.render(onScanSuccess, onScanFailure);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [isCameraOpen, isScanning]);

  const startCamera = () => {
    setIsCameraOpen(true);
    setIsScanning(true);
  };

  const onScanSuccess = (decodedText: string) => {
    // Stop scanning immediately to prevent multiple scans
    if (scannerRef.current) {
      scannerRef.current.clear();
    }
    setIsScanning(false);
    setIsCameraOpen(false);
    setIsProcessingScan(true);

    // Get current time
    const timestamp = new Date().toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short"
    });

    // Try to get GPS Location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setScanResult({
            barcode: decodedText,
            timestamp,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          });
          setIsProcessingScan(false);
        },
        (error) => {
          console.warn("Location error:", error);
          setScanResult({ barcode: decodedText, timestamp, location: null });
          setIsProcessingScan(false);
        },
        { enableHighAccuracy: false, timeout: 2000 }
      );
    } else {
      setScanResult({ barcode: decodedText, timestamp, location: null });
      setIsProcessingScan(false);
    }
  };

  const onScanFailure = (error: any) => {
    // Ignore frequent scan failures
  };

  const resetScanner = () => {
    setScanResult(null);
    setIsCameraOpen(true);
    setIsScanning(true);
  };

  const handleContinue = async () => {
    if (!scanResult) return;
    setIsLoadingRoute(true);
    const bottle = await db.getBottle(scanResult.barcode);
    if (bottle) {
      router.push(`/dashboard/bottle/${encodeURIComponent(scanResult.barcode)}`);
    } else {
      router.push(`/dashboard/bottle/register?serial=${encodeURIComponent(scanResult.barcode)}`);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header} style={{marginTop: '0', marginBottom: '1.5rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{display: "flex", alignItems: "center", gap: "1rem"}}>
          <Link href="/dashboard/profile" style={{
            width: "42px", height: "42px", borderRadius: "50%", background: "rgba(255,255,255,0.05)",
            display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--primary)"
          }}>
            <User size={20} />
          </Link>
          <div>
            <p style={{fontSize: "0.8rem", color: "var(--text-muted)", margin: 0}}>Welcome back,</p>
            <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
              <h1 style={{fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)", margin: 0}}>{user?.name || "Engineer"}</h1>
              {engineer?.defaultVehicleReg && (
                <span style={{
                  fontSize: "0.65rem",
                  background: "rgba(0, 229, 255, 0.1)",
                  color: "var(--primary)",
                  padding: "0.1rem 0.4rem",
                  borderRadius: "4px",
                  border: "1px solid rgba(0, 229, 255, 0.2)",
                  fontWeight: 700
                }}>
                  {engineer.defaultVehicleReg}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
          {user?.availableRoles && user.availableRoles.length > 1 && (
            <button 
              onClick={() => {
                const nextRole = user.availableRoles.find(r => r !== "engineer") || "office";
                switchRole(nextRole);
              }}
              style={{
                background: "rgba(0, 229, 255, 0.1)", border: "1px solid rgba(0, 229, 255, 0.2)", borderRadius: "8px", 
                padding: "0.5rem 0.75rem", color: "var(--primary)", fontSize: "0.75rem", fontWeight: 700,
                display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer"
              }}
            >
              <Repeat size={14} /> Switch to Office
            </button>
          )}
          <div style={{width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', color: 'var(--primary)', fontWeight: '600'}}>
            {user?.name ? user.name.substring(0, 2).toUpperCase() : "EN"}
          </div>
        </div>
      </header>

      {!scanResult && !isCameraOpen && !isProcessingScan && (
        <>
          <button 
            onClick={startCamera}
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
            <div style={{background: 'rgba(255,255,255,0.2)', padding: '1rem', borderRadius: '50%'}}>
              <Camera size={36} color="#000" />
            </div>
            <div style={{textAlign: 'center'}}>
              <h2 style={{fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.25rem'}}>Scan Bottle</h2>
              <p style={{fontSize: '0.9rem', opacity: 0.8}}>Open camera to register, move, or log usage</p>
            </div>
          </button>
          
          <div className={styles.manualEntryContainer} style={{maxWidth: '100%'}}>
            <p className={styles.manualEntryText} style={{textAlign: 'left'}}>Or enter serial manually:</p>
            <div className={styles.manualInputGroup}>
              <input 
                type="text" 
                placeholder="e.g. SN-998201A"
                value={manualSerial}
                onChange={(e) => setManualSerial(e.target.value)}
                className={styles.manualInput}
              />
              <button 
                className={styles.manualSubmitBtn}
                onClick={async () => {
                  if (!manualSerial) return;
                  const serial = manualSerial.toUpperCase();
                  const bottle = await db.getBottle(serial);
                  if (bottle) {
                    router.push(`/dashboard/bottle/${encodeURIComponent(serial)}`);
                  } else {
                    // Not found — show the "New Scan" overlay so they can register it
                    onScanSuccess(serial);
                  }
                }}
                disabled={!manualSerial}
              >
                Go
              </button>
            </div>
          </div>

          <Link href="/dashboard/bulk" style={{textDecoration: 'none', display: 'block', marginTop: '1.5rem'}}>
            <div className={styles.bulkLinkCard}>
              <div className={styles.bulkIcon}>
                <PackageSearch size={24} color="var(--primary)" />
              </div>
              <div className={styles.bulkText}>
                <h3>Bulk Receive Delivery</h3>
                <p>Use to bulk register pallets from a single PO</p>
              </div>
              <ArrowRight size={20} color="var(--primary)" />
            </div>
          </Link>

          <div className={styles.testButtonsContainer} style={{maxWidth: '100%'}}>
            <p className={styles.manualEntryText} style={{marginBottom: '0.5rem', opacity: 0.5, textAlign: 'left'}}>Developer Test Tools</p>
            <button 
              className={styles.simulateBtn} 
              onClick={() => {
                const timestamp = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
                setScanResult({ barcode: "8849201A", timestamp, location: null });
              }}
            >
              Test Existing Bottle Scan
            </button>
            <button 
              className={styles.simulateBtn} 
              onClick={() => {
                const timestamp = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
                setScanResult({ barcode: "NEW-" + Math.floor(Math.random()*1000), timestamp, location: null });
              }}
              style={{marginTop: '0.5rem'}}
            >
              Test Brand New Bottle Scan
            </button>
            <button 
              className={styles.simulateBtn} 
              onClick={() => {
                const timestamp = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
                setScanResult({ barcode: "REC-402", timestamp, location: null });
              }}
              style={{marginTop: '0.5rem', borderColor: 'var(--warning)', color: 'var(--warning)'}}
            >
              Test Reclaim Bottle Scan
            </button>
          </div>
        </>
      )}

      {isCameraOpen && (
        <div className={styles.scannerWrapper}>
          <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '1rem'}}>
            <h2 style={{fontSize: '1.2rem', fontWeight: '600'}}>Align Barcode</h2>
            <button 
              onClick={() => {
                setIsCameraOpen(false);
                setIsScanning(false);
                if (scannerRef.current) scannerRef.current.clear();
              }}
              style={{background: 'transparent', border: 'none', color: '#ff3366', cursor: 'pointer', fontWeight: '600'}}
            >
              Cancel
            </button>
          </div>
          <div id="reader" className={styles.reader} style={{maxWidth: '100%'}}></div>
        </div>
      )}

      {scanResult && (
        <div className={`${styles.successCard} glass-panel`}>
          <div className={styles.successHeader}>
            <CheckCircle2 size={48} color="var(--success)" />
            <h2>Scan Successful</h2>
          </div>

          <div className={styles.dataGroup}>
            <span className={styles.label}>Barcode / Serial</span>
            <span className={styles.valueBarcode}>{scanResult.barcode}</span>
          </div>

          <div className={styles.actionButtons}>
            <button className={styles.primaryBtn} onClick={handleContinue} disabled={isLoadingRoute}>
              {isLoadingRoute ? <span className={styles.spinner}></span> : "Continue"}
            </button>
            <button className={styles.secondaryBtn} onClick={resetScanner}>Scan Another</button>
          </div>
        </div>
      )}

      {isProcessingScan && (
        <div className={styles.loadingState} style={{marginTop: '4rem'}}>
          <div className={styles.spinner}></div>
          <p>Acquiring Location Data...</p>
        </div>
      )}
    </div>
  );
}
