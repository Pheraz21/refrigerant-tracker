"use client";

import { Home, ScanLine, History, User, PackageSearch, AlertTriangle, Bell, Warehouse } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { NavigationGuardProvider, useNavigationGuard } from "@/lib/NavigationGuardContext";
import { OfflineProvider, useOffline } from "@/lib/offline/OfflineContext";
import { OfflineBanner } from "@/lib/offline/OfflineBanner";
import { OfflineBottleModal } from "@/lib/offline/OfflineBottleModal";
import { OfflineGateModal } from "@/lib/offline/OfflineGateModal";
import styles from "./layout.module.css";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, refreshUser } = useAuth();
  const { requestNavigate } = useNavigationGuard();
  const { offlineBottle, closeOfflineBottleModal, gateModal, closeOfflineGateModal } = useOffline();

  useEffect(() => {
    refreshUser();
  }, []);
  const [missingPhotos, setMissingPhotos] = useState<number>(0);

  useEffect(() => {
    db.getAllBottles().then(bottles => {
      const isManagement = user?.role === "admin" || user?.role === "office";
      const missing = bottles.filter(b =>
        b.supplierHwcnPhotoPending && (isManagement || b.returnedBy === user?.name || b.lastEngineer === user?.name)
      ).length;
      setMissingPhotos(missing);
    });
  }, [pathname, user]);

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (pathname === href) return;
    if (!requestNavigate(href)) {
      e.preventDefault();
    }
  };

  return (
    <div className={styles.layout}>
      <OfflineBanner />
      <OfflineBottleModal
        bottle={offlineBottle}
        isOpen={!!offlineBottle}
        onClose={closeOfflineBottleModal}
      />
      <OfflineGateModal
        isOpen={gateModal.isOpen}
        title={gateModal.title}
        reason={gateModal.reason}
        onClose={closeOfflineGateModal}
      />
      {(user?.role === "admin" || user?.role === "office") && (
        <div
          className="no-print"
          style={{
            background: "rgba(15, 23, 42, 0.95)",
            borderBottom: "1px solid rgba(0, 229, 255, 0.2)",
            padding: "0.45rem 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.8rem",
            zIndex: 90,
            position: "relative",
          }}
        >
          <span style={{ color: "#94a3b8" }}>
            Admin Testing Mode • <strong style={{ color: "#fff" }}>{user?.name}</strong>
          </span>
          <Link
            href="/admin"
            style={{
              color: "#00e5ff",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "0.75rem",
              background: "rgba(0, 229, 255, 0.12)",
              border: "1px solid rgba(0, 229, 255, 0.3)",
              padding: "0.25rem 0.65rem",
              borderRadius: "6px",
            }}
          >
            ← Back to Desktop
          </Link>
        </div>
      )}
      {missingPhotos > 0 && (
        <Link
          href="/engineer/notifications"
          onClick={(e) => handleNavClick(e, "/engineer/notifications")}
          className="no-print"
          style={{textDecoration: 'none', display: 'block'}}
        >
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
        <Link
          href="/engineer/notifications"
          onClick={(e) => handleNavClick(e, "/engineer/notifications")}
          className={`${styles.navItem} ${pathname.includes("/engineer/notifications") ? styles.active : ""}`}
        >
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
        <Link
          href="/engineer/history"
          onClick={(e) => handleNavClick(e, "/engineer/history")}
          className={`${styles.navItem} ${pathname.includes("/engineer/history") ? styles.active : ""}`}
        >
          <History size={24} />
          <span>My Bottles</span>
        </Link>
        <Link
          href="/engineer"
          onClick={(e) => handleNavClick(e, "/engineer")}
          className={`${styles.navItem} ${pathname === "/engineer" ? styles.active : ""}`}
        >
          <div className={styles.scanIconWrapper} style={{background: pathname === '/engineer' ? 'var(--primary)' : 'var(--surface-hover)', transform: 'translateY(-10px)'}}>
            <ScanLine size={28} color={pathname === '/engineer' ? '#000' : 'var(--primary)'} />
          </div>
          <span style={{marginTop: '-5px'}}>Scan</span>
        </Link>
        <Link
          href="/engineer/inventory"
          onClick={(e) => handleNavClick(e, "/engineer/inventory")}
          className={`${styles.navItem} ${pathname.includes("/engineer/inventory") ? styles.active : ""}`}
        >
          {user?.canViewStores ? <Warehouse size={24} /> : <PackageSearch size={24} />}
          <span>{user?.canViewStores ? "Stores" : "My Van"}</span>
        </Link>
        <Link
          href="/engineer/profile"
          onClick={(e) => handleNavClick(e, "/engineer/profile")}
          className={`${styles.navItem} ${pathname === "/engineer/profile" ? styles.active : ""}`}
        >
          <User size={24} />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OfflineProvider>
      <NavigationGuardProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </NavigationGuardProvider>
    </OfflineProvider>
  );
}
