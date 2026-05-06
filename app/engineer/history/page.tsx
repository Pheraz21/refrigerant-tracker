"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Truck, MapPin, RotateCcw, Building2, PackageSearch } from "lucide-react";
import Link from "next/link";
import { db, Bottle } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import styles from "./page.module.css";

type Tab = "live" | "returned";

export default function HistoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("live");
  const [allBottles, setAllBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getAllBottles().then(bottles => {
      setAllBottles(bottles);
      setLoading(false);
    });
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

  const engineerName = user?.name?.toLowerCase() || "";

  const liveBottles = allBottles.filter(b =>
    (b.locationType === "van" && b.locationId?.toLowerCase().includes(engineerName)) ||
    (b.locationType === "site")
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const returnedBottles = allBottles
    .filter(b =>
      (b.locationType === "office" || b.locationType === "supplier" || b.status === "returned") &&
      b.returnedBy?.toLowerCase() === engineerName &&
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
    if (b.category === "reclaim") return "Reclaim / Haz";
    if (b.category === "nitrogen") return "Nitrogen";
    return b.gasType || "New Refrigerant";
  };

  const getStatusPill = (b: Bottle) => {
    const date = formatDate(b.locationChangedAt);
    if (b.locationType === "supplier" || b.status === "returned")
      return <span className={`${styles.pill} ${styles.pillReturned}`}>Returned to Supplier{date ? ` · ${date}` : ""}</span>;
    if (b.locationType === "office")
      return <span className={`${styles.pill} ${styles.pillOffice}`}>In Office / Stores{date ? ` · ${date}` : ""}</span>;
    if (b.locationType === "van")
      return <span className={`${styles.pill} ${styles.pillVan}`}>In Van{date ? ` since ${date}` : ""}</span>;
    if (b.locationType === "site")
      return <span className={`${styles.pill} ${styles.pillSite}`}>On Site{date ? ` since ${date}` : ""}</span>;
    return null;
  };

  const renderBottle = (b: Bottle) => (
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
            <strong>{(b.currentWeight || 0).toFixed(2)} kg</strong>
          </div>
          <div className={styles.stat}>
            <span>Location</span>
            <strong>{b.locationId || b.locationType}</strong>
            {b.category === "reclaim" && (b.currentWeight || 0) > 0 && b.intendedDestination && (
              <div style={{fontSize: '0.85rem', wordBreak: 'break-word', marginTop: '0.2rem'}}>
                <span style={{color: 'var(--text-muted)'}}>Intended Destination: </span>
                <strong style={{color: 'var(--warning)'}}>
                  {b.intendedLocationType === 'supplier' && b.supplier && b.intendedDestination
                    ? `${b.supplier} - ${b.intendedDestination}`
                    : b.intendedDestination}
                </strong>
                {b.activeHWCN && (
                  <div style={{marginTop: '0.2rem', fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'underline'}}>
                    Digital HWCN Active
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

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
        <p className={styles.sub}>Current bottle status for {user?.name || "you"}</p>
      </header>

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
