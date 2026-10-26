"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Truck, MapPin, RotateCcw, Building2, PackageSearch } from "lucide-react";
import Link from "next/link";
import { db, Bottle, isBottleTrace, hasReclaimWaste } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { ActiveVehicleBanner } from "@/components/ActiveVehicleBanner";
import styles from "./page.module.css";

type Tab = "live" | "returned";

export default function HistoryPage() {
  const { user, activeVehicleReg, activeVehicleOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("live");
  const [allBottles, setAllBottles] = useState<Bottle[]>([]);
  const [crmJobsByNumber, setCrmJobsByNumber] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadBottles = () => {
      db.getAllBottles().then(async bottles => {
        if (!active) return;
        setAllBottles(bottles);
        setLoading(false);

        const siteJobNumbers = Array.from(
          new Set(
            bottles
              .filter(b => b.locationType === "site" && b.locationId)
              .map(b => b.locationId.trim().toUpperCase())
              .filter(Boolean)
          )
        );
        if (siteJobNumbers.length > 0) {
          const entries = await Promise.all(
            siteJobNumbers.map(async jobNo => {
              try {
                const crm = await db.getCrmJobByNumber(jobNo);
                return [jobNo, crm] as const;
              } catch {
                return [jobNo, null] as const;
              }
            })
          );
          if (!active) return;
          const map: Record<string, any> = {};
          for (const [jobNo, crm] of entries) {
            if (crm) map[jobNo] = crm;
          }
          setCrmJobsByNumber(map);
        }
      });
    };
    loadBottles();

    window.addEventListener("pageshow", loadBottles);
    window.addEventListener("focus", loadBottles);
    window.addEventListener("bottle-data-refresh", loadBottles);
    return () => {
      active = false;
      window.removeEventListener("pageshow", loadBottles);
      window.removeEventListener("focus", loadBottles);
      window.removeEventListener("bottle-data-refresh", loadBottles);
    };
  }, []);

  const formatDate = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 2) return "just now";
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: diffDays > 365 ? "numeric" : undefined });
  };

  const userName = user?.name?.toLowerCase() || "";
  const pairedLead = activeVehicleOwner?.toLowerCase() || "";
  const currentReg = (activeVehicleReg || user?.vehicleReg || "").trim().toLowerCase();

  const isMatchedEngineer = (name?: string | null) => {
    if (!name) return false;
    const lower = name.toLowerCase();
    return lower === userName || (pairedLead && lower === pairedLead) || lower.includes(userName) || (pairedLead && lower.includes(pairedLead));
  };

  const isMatchedVan = (b: Bottle) => {
    if (b.locationType !== "van") return false;
    if (currentReg && b.vehicleReg && b.vehicleReg.toLowerCase() === currentReg) return true;
    if (b.locationId) {
      const loc = b.locationId.toLowerCase();
      if (loc.includes(userName) || (pairedLead && loc.includes(pairedLead))) return true;
    }
    return false;
  };

  const liveBottles = allBottles.filter(b =>
    isMatchedVan(b) ||
    (b.locationType === "site" && (
      isMatchedEngineer(b.lastEngineer) ||
      (!b.lastEngineer && b.registeredBy === user?.id)
    ))
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const returnedBottles = allBottles
    .filter(b =>
      (b.locationType === "office" || b.locationType === "supplier" || b.status === "returned") &&
      isMatchedEngineer(b.returnedBy) &&
      (b.locationChangedAt ? new Date(b.locationChangedAt) >= cutoff : false)
    )
    .sort((a, b) => {
      const da = a.locationChangedAt ? new Date(a.locationChangedAt).getTime() : 0;
      const db_ = b.locationChangedAt ? new Date(b.locationChangedAt).getTime() : 0;
      return db_ - da;
    });

  const officeReturned = returnedBottles.filter(b => b.locationType === "office");
  const supplierReturned = returnedBottles.filter(b => b.locationType === "supplier" || b.status === "returned");

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "live", label: "Live Bottles", icon: <Truck size={16} />, count: liveBottles.length },
    { id: "returned", label: "Returned Bottles", icon: <RotateCcw size={16} />, count: returnedBottles.length },
  ];

  const getCategoryLabel = (b: Bottle) => {
    if (b.category === "reclaim") return hasReclaimWaste(b) ? "Reclaim (Haz Waste)" : "Recovery / Reclaim";
    if (b.category === "recycled") return `Recycled (${b.gasType || "Refrigerant"})`;
    if (b.category === "nitrogen") return "Nitrogen (OFN)";
    return b.gasType ? `Virgin Gas (${b.gasType})` : "Virgin Gas";
  };

  const getStatusPill = (b: Bottle) => {
    const date = formatDate(b.locationChangedAt);
    if (b.locationType === "supplier" || b.status === "returned")
      return <span className={`${styles.pill} ${styles.pillReturned}`}>Returned to Supplier{date ? ` · ${date}` : ""}</span>;
    if (b.locationType === "office")
      return <span className={`${styles.pill} ${styles.pillOffice}`}>In HQ-Stores{date ? ` · ${date}` : ""}</span>;
    if (b.locationType === "van")
      return <span className={`${styles.pill} ${styles.pillVan}`}>In Van{date ? ` since ${date}` : ""}</span>;
    if (b.locationType === "site")
      return <span className={`${styles.pill} ${styles.pillSite}`}>On Site{date ? ` since ${date}` : ""}</span>;
    return null;
  };

  const renderBottle = (b: Bottle) => {
    const siteCrm = b.locationType === "site" && b.locationId
      ? crmJobsByNumber[b.locationId.trim().toUpperCase()]
      : null;
    const hasSiteDetails = Boolean(siteCrm && (siteCrm.siteTitle || siteCrm.customer || siteCrm.jobTitle));
    const hasIntendedDest = Boolean(hasReclaimWaste(b) && b.intendedDestination);

    return (
      <Link key={b.serial} href={`/engineer/bottle/${b.serial}`} style={{ textDecoration: "none" }}>
        <div className={`${styles.card} glass-panel`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardType}>
              {b.category === "reclaim" ? (
                <AlertTriangle size={16} color="var(--warning)" />
              ) : b.locationType === "office" || b.locationType === "supplier" ? (
                <Building2 size={16} color="var(--text-muted)" />
              ) : (
                <div className={`${styles.dot} ${b.category === "nitrogen" ? styles.dotNitrogen : styles.dotR410A}`} />
              )}
              <span className={b.category === "reclaim" ? styles.hazLabel : ""}>{getCategoryLabel(b)}</span>
            </div>
            <span className={styles.serial}>{b.serial}</span>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.stat}>
              <span>Weight</span>
              <strong>{isBottleTrace(b) ? "Trace" : `${(b.currentWeight || 0).toFixed(2)} kg`}</strong>
            </div>
            <div className={styles.stat}>
              <span>Status</span>
              <span style={{
                display: 'inline-block',
                alignSelf: 'flex-start',
                marginTop: '0.15rem',
                padding: '0.12rem 0.5rem',
                borderRadius: '10px',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'capitalize',
                background:
                  isBottleTrace(b) ? 'rgba(255,170,0,0.12)' :
                  b.status === 'unused' ? 'rgba(0,229,255,0.12)' :
                  b.status === 'active' ? 'rgba(34,197,94,0.12)' :
                  b.status === 'returned' ? 'rgba(168,85,247,0.12)' :
                  b.status === 'archived' ? 'rgba(239,68,68,0.12)' :
                  b.status === 'full' ? 'rgba(59,130,246,0.12)' :
                  b.status === 'recycled' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.08)',
                color:
                  isBottleTrace(b) ? '#ffaa00' :
                  b.status === 'unused' ? '#00e5ff' :
                  b.status === 'active' ? '#22c55e' :
                  b.status === 'returned' ? '#a855f7' :
                  b.status === 'archived' ? '#ef4444' :
                  b.status === 'full' ? '#3b82f6' :
                  b.status === 'recycled' ? '#10b981' : 'rgba(255,255,255,0.75)'
              }}>
                {isBottleTrace(b) ? 'Trace' : b.status === 'unused' ? 'Unopened' : b.status === 'active' ? 'Opened' : (b.status || 'Opened')}
              </span>
            </div>
            <div className={styles.stat}>
              <span>Location</span>
              <strong>{b.locationId || b.locationType}</strong>
            </div>
          </div>

          {(hasSiteDetails || hasIntendedDest) && (
            <div style={{
              marginBottom: '0.85rem',
              paddingTop: '0.65rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem'
            }}>
              {hasSiteDetails && siteCrm && (
                <>
                  {(siteCrm.siteTitle || siteCrm.customer) && (
                    <div style={{fontSize: '0.82rem', lineHeight: 1.4}}>
                      <span style={{color: 'var(--text-muted)'}}>Site: </span>
                      <strong style={{color: 'var(--primary)'}}>
                        {String(siteCrm.siteTitle || siteCrm.customer).replace(/,(?!\s)/g, ", ")}
                      </strong>
                    </div>
                  )}
                  {siteCrm.jobTitle && (
                    <div style={{fontSize: '0.82rem', lineHeight: 1.4}}>
                      <span style={{color: 'var(--text-muted)'}}>Job Name: </span>
                      <strong style={{color: '#fff'}}>{siteCrm.jobTitle}</strong>
                    </div>
                  )}
                </>
              )}
              {hasIntendedDest && (
                <div style={{fontSize: '0.82rem', lineHeight: 1.4, wordBreak: 'break-word'}}>
                  <span style={{color: 'var(--text-muted)'}}>Intended Destination: </span>
                  <strong style={{color: 'var(--warning)'}}>
                    {b.intendedLocationType === 'supplier' && b.supplier && b.intendedDestination
                      ? `${b.supplier} - ${b.intendedDestination}`
                      : b.intendedDestination}
                  </strong>
                  {b.activeHWCN && (
                    <div style={{marginTop: '0.15rem', fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'underline'}}>
                      Digital HWCN Active
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className={styles.cardFooter}>
            {getStatusPill(b)}
            <span className={styles.viewLink}>View →</span>
          </div>
          {(b.returnedAt || b.locationChangedAt) && (
            <div style={{fontSize: '0.72rem', color: 'var(--text-muted)', paddingTop: '0.4rem', marginTop: '0.2rem', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
              {b.returnedAt
                ? `Returned: ${new Date(b.returnedAt).toLocaleDateString("en-GB")}`
                : `Last moved: ${new Date(b.locationChangedAt!).toLocaleDateString("en-GB")}`
              }
            </div>
          )}
        </div>
      </Link>
    );
  };

  const renderEmpty = (message: string) => (
    <div className={styles.empty}>
      <PackageSearch size={42} style={{ opacity: 0.35, marginBottom: "0.75rem" }} />
      <p>{message}</p>
    </div>
  );

  const vanBottles = liveBottles.filter(b => b.locationType === "van");
  const siteBottles = liveBottles.filter(b => b.locationType === "site");

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>My Bottles</h1>
        <p className={styles.sub}>
          {activeVehicleOwner && activeVehicleOwner !== user?.name
            ? `Paired with ${activeVehicleOwner} (${activeVehicleReg})`
            : `Current bottle status for ${user?.name || "you"}`}
        </p>
      </header>

      <ActiveVehicleBanner />

      <div className={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span className={`${styles.tabBadge} ${activeTab === tab.id ? styles.tabBadgeActive : ""}`}>
              {loading ? "…" : tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {loading ? (
          <p className={styles.loadingText}>Loading…</p>
        ) : activeTab === "live" ? (
          <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            {/* VAN BOTTLES */}
            <div>
              <h3 style={{fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <Truck size={18} /> Bottles in Van
              </h3>
              {vanBottles.length === 0 
                ? <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px'}}>No bottles currently in your van.</p>
                : vanBottles.map(renderBottle)
              }
            </div>

            {/* SITE BOTTLES */}
            <div>
              <h3 style={{fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <MapPin size={18} /> Bottles on Sites
              </h3>
              {siteBottles.length === 0 
                ? <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px'}}>No bottles currently logged as on-site.</p>
                : siteBottles.map(renderBottle)
              }
            </div>
          </div>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '0.65rem 0.9rem', margin: 0}}>
              Showing returns from the last 30 days, most recent first.
            </p>
            {/* OFFICE RETURNS */}
            <div>
              <h3 style={{fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <Building2 size={18} /> Returned to Stores / Office
              </h3>
              {officeReturned.length === 0 
                ? <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px'}}>No bottles returned to stores.</p>
                : officeReturned.map(renderBottle)
              }
            </div>

            {/* SUPPLIER RETURNS */}
            <div>
              <h3 style={{fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <RotateCcw size={18} /> Returned to Suppliers
              </h3>
              {supplierReturned.length === 0 
                ? <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px'}}>No bottles returned to suppliers.</p>
                : supplierReturned.map(renderBottle)
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
