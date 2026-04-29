"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Truck, MapPin, RotateCcw, Building2, PackageSearch } from "lucide-react";
import Link from "next/link";
import { db, Bottle } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import styles from "./page.module.css";

type Tab = "van" | "onsite" | "returned";

export default function HistoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("van");
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

  const vanBottles = allBottles.filter(b =>
    b.locationType === "van" &&
    b.locationId?.toLowerCase().includes(engineerName)
  );

  const onsiteBottles = allBottles.filter(b =>
    b.locationType === "site"
  );

  const returnedBottles = allBottles.filter(b =>
    (b.locationType === "office" || b.locationType === "supplier" || b.status === "returned") &&
    b.returnedBy?.toLowerCase() === engineerName
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "van", label: "Van Stock", icon: <Truck size={16} />, count: vanBottles.length },
    { id: "onsite", label: "On Site", icon: <MapPin size={16} />, count: onsiteBottles.length },
    { id: "returned", label: "Returned", icon: <RotateCcw size={16} />, count: returnedBottles.length },
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
    <Link key={b.serial} href={`/dashboard/bottle/${b.serial}`} style={{ textDecoration: "none" }}>
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
            <strong>{b.currentWeight.toFixed(2)} kg</strong>
          </div>
          <div className={styles.stat}>
            <span>Location</span>
            <strong>{b.locationId || b.locationType}</strong>
            {b.category === "reclaim" && (b.currentWeight || 0) > 0 && b.intendedDestination && b.activeHWCN && (
              <div style={{fontSize: '0.85rem', wordBreak: 'break-word', marginTop: '0.2rem'}}>
                <span style={{color: 'var(--text-muted)'}}>Intended Destination: </span>
                <strong style={{color: 'var(--warning)'}}>{b.intendedDestination}</strong>
                <div style={{marginTop: '0.2rem', fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'underline'}}>
                  Digital HWCN Active
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.cardFooter}>
          {getStatusPill(b)}
          <span className={styles.viewLink}>View →</span>
        </div>
      </div>
    </Link>
  );

  const renderEmpty = (message: string) => (
    <div className={styles.empty}>
      <PackageSearch size={42} style={{ opacity: 0.35, marginBottom: "0.75rem" }} />
      <p>{message}</p>
    </div>
  );

  const activeBottles =
    activeTab === "van" ? vanBottles :
    activeTab === "onsite" ? onsiteBottles :
    returnedBottles;

  const emptyMessages: Record<Tab, string> = {
    van: "No bottles currently in your van.",
    onsite: "No bottles currently logged as on-site.",
    returned: "No returned bottles found.",
  };

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
        {loading
          ? <p className={styles.loadingText}>Loading…</p>
          : activeBottles.length === 0
            ? renderEmpty(emptyMessages[activeTab])
            : activeBottles.map(renderBottle)
        }
      </div>
    </div>
  );
}
