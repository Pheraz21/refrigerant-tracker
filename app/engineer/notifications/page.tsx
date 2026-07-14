"use client";

import { useEffect, useState } from "react";
import { Truck, AlertTriangle, FileText, ArrowRight, Loader2, Bell } from "lucide-react";
import styles from "./page.module.css";
import Link from "next/link";
import { db, Bottle } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { useOffline } from "@/lib/offline/OfflineContext";
import { OfflineUnavailable } from "@/lib/offline/OfflineUnavailable";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const [loading, setLoading] = useState(true);
  const [missingPaperwork, setMissingPaperwork] = useState<Bottle[]>([]);

  useEffect(() => {
    async function loadNotifications() {
      if (!user) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      const bottles = await db.getAllBottles();
      // Filter for bottles assigned to this engineer (or in their van) that are missing photos
      // Note: In this mock db, we'll just check for global ones or if there's an engineer ID field
      // For now, showing all where supplierHwcnPhotoPending is true as the engineer is logged in
      const missing = bottles.filter(b => b.supplierHwcnPhotoPending);
      setMissingPaperwork(missing);
      setLoading(false);
    }
    loadNotifications();
  }, [user]);

  if (!isOnline) {
    return <OfflineUnavailable title="Alerts aren't available offline" />;
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={32} className={styles.spinner} />
        <p>Checking for notifications...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Bell size={28} color="var(--primary)" />
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>Action items requiring your attention</p>
        </div>
      </header>

      <div className={styles.notificationList}>
        {missingPaperwork.length === 0 && (
          <div className={styles.emptyState}>
            <Bell size={48} color="var(--text-muted)" style={{opacity: 0.3, marginBottom: '1rem'}} />
            <h3>No New Notifications</h3>
            <p>You are all caught up!</p>
          </div>
        )}

        {missingPaperwork.map(bottle => (
          <Link 
            key={bottle.serial} 
            href={`/engineer/bottle/${bottle.serial}`}
            className={`${styles.notificationCard} ${styles.urgent}`}
          >
            <div className={styles.cardIcon}>
              <AlertTriangle size={24} color="var(--error)" />
            </div>
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <span className={styles.badge}>Missing Paperwork</span>
                <span className={styles.date}>Urgent</span>
              </div>
              <h3 className={styles.cardTitle}>Upload Supplier HWCN Photo</h3>
              <p className={styles.cardMessage}>
                Bottle <strong>{bottle.serial}</strong> ({bottle.gasType}) was returned to supplier but is missing physical HWCN photo proof.
              </p>
              <div className={styles.cardFooter}>
                <span>Click to upload now</span>
                <ArrowRight size={16} />
              </div>
            </div>
          </Link>
        ))}

        {/* Placeholder for future notification types */}
        <div className={styles.futureNotice}>
          <FileText size={20} color="var(--text-muted)" />
          <span>New compliance alerts will appear here</span>
        </div>
      </div>

      <Link href="/engineer" className={styles.backBtn}>
        Back to Dashboard
      </Link>
    </div>
  );
}
