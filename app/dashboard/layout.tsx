"use client";

import { Home, ScanLine, History, User, PackageSearch, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import styles from "./layout.module.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [missingPhotos, setMissingPhotos] = useState<number>(0);

  useEffect(() => {
    db.getAllBottles().then(bottles => {
      const missing = bottles.filter(b => b.supplierHwcnPhotoPending).length;
      setMissingPhotos(missing);
    });
  }, [pathname]);

  return (
    <div className={styles.layout}>
      {missingPhotos > 0 && (
        <div className="no-print" style={{background: 'var(--error)', color: '#fff', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold', zIndex: 100, position: 'relative'}}>
          <AlertTriangle size={18} />
          <span>Action Required: {missingPhotos} returned bottle{missingPhotos > 1 ? 's are' : ' is'} missing Supplier HWCN photos!</span>
        </div>
      )}
      <main className={styles.mainContent}>
        {children}
      </main>

      <nav className={`${styles.bottomNav} glass-panel no-print`}>
        <Link href="/dashboard" className={`${styles.navItem} ${pathname === "/dashboard" ? styles.active : ""}`}>
          <ScanLine size={24} />
          <span>Scan</span>
        </Link>
        <Link href="/dashboard/inventory" className={`${styles.navItem} ${pathname.includes("/dashboard/inventory") ? styles.active : ""}`}>
          <div className={styles.scanIconWrapper} style={{background: pathname.includes('/inventory') ? 'var(--primary)' : 'var(--surface-hover)', transform: 'translateY(-10px)'}}>
            <PackageSearch size={28} color={pathname.includes('/inventory') ? '#000' : 'var(--primary)'} />
          </div>
          <span style={{marginTop: '-5px'}}>My Van</span>
        </Link>
        <Link href="/dashboard/history" className={`${styles.navItem} ${pathname.includes("/dashboard/history") ? styles.active : ""}`}>
          <History size={24} />
          <span>My Bottles</span>
        </Link>
        <Link href="/dashboard/profile" className={`${styles.navItem} ${pathname === "/dashboard/profile" ? styles.active : ""}`}>
          <User size={24} />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
