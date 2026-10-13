"use client";

import { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { CheckCircle2, ScanLine, ArrowRight, PackageSearch, Camera, User, AlertTriangle } from "lucide-react";
import styles from "./page.module.css";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { useOffline } from "@/lib/offline/OfflineContext";
import { getCachedBottle } from "@/lib/offline/bottleCache";
import { ActiveVehicleBanner } from "@/components/ActiveVehicleBanner";
import { LeadEngineerCrewBanner } from "@/components/LeadEngineerCrewBanner";

interface ScanData {
  barcode: string;
  timestamp: string;
  location: { lat: number; lng: number } | null;
}

export default function DashboardScannerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { isOnline, openOfflineBottleModal, openOfflineGateModal } = useOffline();
  const [scanResult, setScanResult] = useState<ScanData | null>(null);
  const [uncachedOfflineSerial, setUncachedOfflineSerial] = useState<string | null>(null);
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
        rememberLastUsedCamera: true,
        videoConstraints: {
          facingMode: "environment"
        }
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

  const onScanSuccess = async (decodedText: string) => {
    // Stop scanning immediately to prevent multiple scans
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
    }
    setIsScanning(false);
    setIsCameraOpen(false);

    const serial = decodedText.trim().toUpperCase();
    const isCurrentlyOnline = isOnline && (typeof navigator === "undefined" || navigator.onLine);

    if (!isCurrentlyOnline) {
      setIsProcessingScan(true);
      const cached = await getCachedBottle(serial);
      setIsProcessingScan(false);
      if (cached && cached.status !== "returned") {
        openOfflineBottleModal(cached);
        setScanResult(null);
        setUncachedOfflineSerial(null);
      } else {
        setUncachedOfflineSerial(serial);
        setScanResult(null);
      }
      return;
    }

    setIsProcessingScan(true);
    const timestamp = new Date().toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short"
    });

    setScanResult({ barcode: serial, timestamp, location: null });
    setIsProcessingScan(false);
  };

  const onScanFailure = (error: any) => {
    // Ignore frequent scan failures
  };

  const resetScanner = () => {
    setScanResult(null);
    setUncachedOfflineSerial(null);
    setIsCameraOpen(true);
    setIsScanning(true);
  };

  const handleContinue = async () => {
    if (!scanResult) return;
    setIsLoadingRoute(true);
    const serial = scanResult.barcode.trim().toUpperCase();
    const isCurrentlyOnline = isOnline && (typeof navigator === "undefined" || navigator.onLine);

    if (!isCurrentlyOnline) {
      const cached = await getCachedBottle(serial);
      setIsLoadingRoute(false);
      if (cached && cached.status !== "returned") {
        openOfflineBottleModal(cached);
        setScanResult(null);
        setUncachedOfflineSerial(null);
      } else {
        setUncachedOfflineSerial(serial);
        setScanResult(null);
      }
      return;
    }

    const bottle = await db.getBottle(serial);
    if (bottle && bottle.status !== 'returned') {
      router.push(`/engineer/bottle/${encodeURIComponent(serial)}`);
    } else {
      router.push(`/engineer/bottle/register?serial=${encodeURIComponent(serial)}`);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header} style={{marginTop: '0', marginBottom: '1.5rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{display: "flex", alignItems: "center", gap: "1rem"}}>
          <Link href="/engineer/profile" style={{
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
        <div style={{width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', color: 'var(--primary)', fontWeight: '600'}}>
          {user?.name ? user.name.substring(0, 2).toUpperCase() : "EN"}
        </div>
      </header>

      <ActiveVehicleBanner />

      {!scanResult && !isCameraOpen && !isProcessingScan && !uncachedOfflineSerial && (
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
          
          <div className={styles.manualEntryContainer} style={{maxWidth: '100%', marginBottom: '1.5rem'}}>
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
                  if (!manualSerial.trim()) return;
                  const serial = manualSerial.trim().toUpperCase();
                  const isCurrentlyOnline = isOnline && (typeof navigator === "undefined" || navigator.onLine);

                  if (!isCurrentlyOnline) {
                    setIsProcessingScan(true);
                    const cached = await getCachedBottle(serial);
                    setIsProcessingScan(false);
                    if (cached && cached.status !== "returned") {
                      openOfflineBottleModal(cached);
                      setManualSerial("");
                      setUncachedOfflineSerial(null);
                    } else {
                      setUncachedOfflineSerial(serial);
                      setManualSerial("");
                    }
                    return;
                  }

                  setIsProcessingScan(true);
                  const bottle = await db.getBottle(serial);
                  setIsProcessingScan(false);
                  if (bottle && bottle.status !== 'returned') {
                    router.push(`/engineer/bottle/${encodeURIComponent(serial)}`);
                  } else {
                    onScanSuccess(serial);
                  }
                }}
                disabled={!manualSerial.trim()}
              >
                Go
              </button>
            </div>
          </div>

          <LeadEngineerCrewBanner />

          {user?.availableRoles?.includes("office") && (
            <div style={{ marginTop: '1.5rem' }}>
              <div
                className={styles.bulkLinkCard}
                onClick={() => {
                  if (!isOnline) {
                    openOfflineGateModal(
                      "Bulk pallet delivery receiving requires an active internet connection to import PO records from suppliers.",
                      "Bulk Receive Requires Signal"
                    );
                    return;
                  }
                  router.push("/engineer/bulk");
                }}
                style={{
                  cursor: "pointer",
                  position: "relative",
                  opacity: isOnline ? 1 : 0.65,
                }}
              >
                {!isOnline && (
                  <span
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "0.15rem 0.4rem",
                      borderRadius: "4px",
                      background: "rgba(245, 158, 11, 0.2)",
                      color: "var(--warning)",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                    }}
                  >
                    ☁️ Online
                  </span>
                )}
                <div className={styles.bulkIcon}>
                  <PackageSearch size={24} color="var(--primary)" />
                </div>
                <div className={styles.bulkText}>
                  <h3>Bulk Receive Delivery</h3>
                  <p>Use to bulk register pallets from a single PO</p>
                </div>
                <ArrowRight size={20} color="var(--primary)" />
              </div>
            </div>
          )}

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

      {uncachedOfflineSerial && (
        <div className={`${styles.successCard} glass-panel`} style={{ borderLeft: "4px solid var(--warning, #f59e0b)" }}>
          <div className={styles.successHeader}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 0.5rem",
              }}
            >
              <AlertTriangle size={28} color="var(--warning, #f59e0b)" />
            </div>
            <h2 style={{ fontSize: "1.25rem", margin: "0.25rem 0" }}>Not in Local Cache</h2>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
              padding: "1rem",
              margin: "1rem 0",
              textAlign: "left",
            }}
          >
            <p style={{ fontSize: "0.95rem", color: "#fff", lineHeight: 1.5, margin: 0 }}>
              Cylinder <strong style={{ color: "var(--primary, #00e5ff)", fontFamily: "var(--font-geist-mono, monospace)" }}>{uncachedOfflineSerial}</strong> is not in your local cache. Connect to signal to view company history.
            </p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4, margin: "0.6rem 0 0" }}>
              Cylinders assigned to your van or used on recent sites are automatically available offline. New or unassigned cylinders require signal to verify against the central company database.
            </p>
          </div>

          <div className={styles.actionButtons}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => {
                setUncachedOfflineSerial(null);
                setScanResult(null);
                setManualSerial("");
              }}
            >
              Scan Another
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              style={{
                opacity: 0.75,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
              }}
              onClick={() => {
                openOfflineGateModal(
                  "Cylinder registration requires an active internet connection to verify uniqueness in the company registry.",
                  "Registration Requires Signal"
                );
              }}
            >
              <span>Register Cylinder</span>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  padding: "0.15rem 0.35rem",
                  borderRadius: "4px",
                  background: "rgba(245, 158, 11, 0.2)",
                  color: "var(--warning)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                }}
              >
                ☁️ Online Only
              </span>
            </button>
          </div>
        </div>
      )}

      {isProcessingScan && (
        <div className={styles.loadingState} style={{marginTop: '4rem'}}>
          <div className={styles.spinner}></div>
          <p>Processing scan...</p>
        </div>
      )}
    </div>
  );
}
