"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/db";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  Warehouse,
  Package,
  Settings,
  LogOut,
  FileText,
  Shield,
  MapPin,
  Users,
  Building2,
  Truck,
  RotateCcw,
  Repeat,
  RefreshCw,
  Bell,
  CalendarClock,
  History
} from "lucide-react";

const navGroups = [
  {
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
      { href: "/admin/actions", label: "Daily Actions", icon: History },
    ]
  },
  {
    title: "Inventory",
    items: [
      { href: "/admin/bottles", label: "All Bottles", icon: Package },
      { href: "/admin/stores", label: "Stores Inventory", icon: Warehouse },
      { href: "/admin/vans", label: "Van Inventory", icon: Truck },
      { href: "/admin/onsite", label: "Bottles on Site", icon: MapPin },
      { href: "/admin/suppliers", label: "Supplier Inventory", icon: Building2 },
      { href: "/admin/returned-to-supplier", label: "Returned to Supplier", icon: RotateCcw },
      { href: "/admin/expiry", label: "Upcoming Expiry", icon: CalendarClock },
    ]
  },
  {
    title: "Hazardous Waste",
    items: [
      { href: "/admin/hwcn", label: "HWCN Queue", icon: ClipboardList },
      { href: "/admin/supplier-returns", label: "Completed Waste Returns", icon: Building2 },
    ]
  },
  {
    title: "Other",
    items: [
      { href: "/admin/users", label: "User Management", icon: Users },
      { href: "/admin/reports", label: "Reports", icon: FileText },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ]
  }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, switchRole, logout, loading } = useAuth();
  const router = useRouter();

  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "office"))) {
      if (pathname !== "/admin/login") {
        router.push("/admin/login");
      }
    }

    if (user?.role === "admin") {
      const loadCount = async () => {
        const notifs = await db.getNotifications();
        setNotifCount(notifs.filter(n => n.status === "new").length);
      };
      loadCount();
      // Polling for mock real-time feel
      const interval = setInterval(loadCount, 5000);
      return () => clearInterval(interval);
    }
  }, [user, loading, pathname, router]);

  // Login page gets no layout
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (loading || !user) return null;

  return (
    <div style={{display: "flex", minHeight: "100vh", background: "var(--bg-main)"}}>
      {/* Sidebar */}
      <aside className="no-print" style={{
        width: "260px",
        background: "rgba(10, 14, 20, 0.95)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50
      }}>
        {/* Logo */}
        <div style={{padding: "1.5rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)"}}>
          <img src="/21-degrees-official-transparent.png" alt="21 Degrees" style={{width: "110px", height: "auto", display: "block", marginBottom: "0.5rem"}} />
          <div style={{display: "flex", alignItems: "center", gap: "0.4rem"}}>
            <Shield size={14} color="#00e5ff" />
            <span style={{fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em"}}>Office Portal</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{flex: 1, padding: "1rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.2rem", overflowY: "auto"}}>
          {navGroups.map((group, idx) => (
            <div key={idx} style={{marginBottom: group.title ? "0.5rem" : "0"}}>
              {group.title && (
                <div style={{
                  padding: "0 1rem",
                  marginTop: idx === 0 ? 0 : "1.25rem",
                  marginBottom: "0.4rem",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em"
                }}>
                  {group.title}
                </div>
              )}
              {group.items.map(item => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.7rem 1rem",
                      borderRadius: "8px",
                      textDecoration: "none",
                      fontSize: "0.9rem",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#00e5ff" : "rgba(255,255,255,0.6)",
                      background: isActive ? "rgba(0,229,255,0.08)" : "transparent",
                      transition: "all 0.15s"
                    }}
                  >
                    <item.icon size={20} />
                    <span style={{flex: 1}}>{item.label}</span>
                    {item.label === "Notifications" && notifCount > 0 && (
                      <span style={{
                        background: "var(--primary)",
                        color: "#000",
                        fontSize: "0.7rem",
                        fontWeight: "700",
                        padding: "0.1rem 0.4rem",
                        borderRadius: "10px",
                        minWidth: "1.2rem",
                        textAlign: "center"
                      }}>
                        {notifCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User / Logout */}
        <div style={{padding: "1rem 1.25rem", borderTop: "1px solid rgba(255,255,255,0.06)"}}>
          <div style={{fontSize: "0.85rem", color: "#fff", fontWeight: 600, marginBottom: "0.25rem"}}>{user.name}</div>
          <div style={{fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.75rem"}}>{user.email}</div>
          
          {user.availableRoles && user.availableRoles.length > 1 && (
            <div style={{marginBottom: "0.75rem"}}>
              <p style={{fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.4rem", letterSpacing: "0.05em"}}>Switch Role</p>
              <div style={{display: "flex", flexDirection: "column", gap: "0.3rem"}}>
                {user.availableRoles.filter(r => r !== user.role).map(role => (
                  <button
                    key={role}
                    onClick={() => switchRole(role)}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.6rem",
                      background: "rgba(0, 229, 255, 0.05)", border: "1px solid rgba(0, 229, 255, 0.15)",
                      borderRadius: "6px", color: "#00e5ff", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                      width: "100%", transition: "all 0.15s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0, 229, 255, 0.1)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0, 229, 255, 0.05)"}
                  >
                    <Repeat size={12} />
                    Switch to {role === "engineer" ? "Field Mode" : role === "admin" ? "Admin Mode" : "Office Mode"}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={logout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "none",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.5)",
              padding: "0.5rem 0.75rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.8rem",
              width: "100%",
              justifyContent: "center",
              transition: "all 0.15s"
            }}
          >
            <LogOut size={16} /> Sign Out
          </button>

          <button
            onClick={() => {
              // Clear all fgas related keys
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith("fgas_")) {
                  localStorage.removeItem(key);
                }
              });
              // Force a hard redirect to login
              window.location.assign("/");
            }}
            style={{
              width: "100%", marginTop: "0.75rem", padding: "0.5rem", background: "rgba(255, 68, 68, 0.1)", border: "1px solid rgba(255, 68, 68, 0.3)",
              borderRadius: "6px", color: "#ff4444", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: "0.4rem", transition: "all 0.15s", justifyContent: "center"
            }}
          >
            <RefreshCw size={12} /> Force Reset System Data
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        marginLeft: "260px",
        flex: 1,
        padding: "2rem 2.5rem",
        minHeight: "100vh",
        overflow: "auto"
      }}>
        {children}
      </main>
    </div>
  );
}
