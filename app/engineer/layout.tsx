"use client";

import { Home, ScanLine, History, User, PackageSearch, AlertTriangle, Bell } from "lucide-react";
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
        <Link href="/engineer/notifications" className="no-print" style={{textDecoration: 'none', display: 'block'}}>
          <div style={{background: 'var(--error)', color: '#fff', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold', zIndex: 100, position: 'relative'}}>
            <AlertTriangle size={18} />
            <span>Action Required: {missingPhotos} returned bottle{missingPhotos > 1 ? 's are' : ' is'} missing Supplier HWCN photos!</span>
            <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', opacity: 0.9}}>
              View All <Home size={14} />
            </div>
          </div>
        </Link>
      )}
      <main className={styles.mainContent}>
        {children}
      </main>

      <nav className={`${styles.bottomNav} glass-panel no-print`}>
        <Link href="/engineer/notifications" className={`${styles.navItem} ${pathname.includes("/engineer/notifications") ? styles.active : ""}`}>
          <div style={{position: 'relative'}}>
            <Bell size={24} />
            {missingPhotos > 0 && (
              <span style={{
                position: 'absolute', top: '-5px', right: '-5px', background: 'var(--error)',
                color: '#fff', borderRadius: '50%', width: '16px', height: '16px',
                fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--surface-light)'
              }}>
                {missingPhotos}
              </span>
            )}
          </div>
          <span>Alerts</span>
        </Link>
        <Link href="/engineer/history" className={`${styles.navItem} ${pathname.includes("/engineer/history") ? styles.active : ""}`}>
          <History size={24} />
          <span>My Bottles</span>
        </Link>
        <Link href="/engineer" className={`${styles.navItem} ${pathname === "/engineer" ? styles.active : ""}`}>
          <div className={styles.scanIconWrapper} style={{background: pathname === '/engineer' ? 'var(--primary)' : 'var(--surface-hover)', transform: 'translateY(-10px)'}}>
            <ScanLine size={28} color={pathname === '/engineer' ? '#000' : 'var(--primary)'} />
          </div>
          <span style={{marginTop: '-5px'}}>Scan</span>
        </Link>
        <Link href="/engineer/inventory" className={`${styles.navItem} ${pathname.includes("/engineer/inventory") ? styles.active : ""}`}>
          <PackageSearch size={24} />
          <span>My Van</span>
        </Link>
        <Link href="/engineer/profile" className={`${styles.navItem} ${pathname === "/engineer/profile" ? styles.active : ""}`}>
          <User size={24} />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
