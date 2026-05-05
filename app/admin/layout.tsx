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
  Bell,
  CalendarClock,
  History,
  Trash2,
  ShieldAlert,
  BarChart2,
  Briefcase,
  UserCircle,
  ChevronLeft,
  ChevronRight
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
      { href: "/admin/suppliers", label: "Bottles By Supplier", icon: Building2 },
      { href: "/admin/jobs", label: "Refrigerant Jobs", icon: Briefcase },
      { href: "/admin/all-jobs", label: "All Jobs", icon: ClipboardList },
      { href: "/admin/returned-to-supplier", label: "Returned to Supplier", icon: RotateCcw },
      { href: "/admin/expiry", label: "Upcoming Expiry", icon: CalendarClock },
    ]
  },
  {
    title: "Hazardous Waste",
    items: [
      { href: "/admin/hwcn", label: "HWCN Queue", icon: ClipboardList },
      { href: "/admin/haz-waste-summary", label: "Haz Waste In Company", icon: ShieldAlert },
      { href: "/admin/supplier-returns", label: "Waste Return from Office to Supplier", icon: Building2 },
      { href: "/admin/decommissioned", label: "Decommissioned Equipment", icon: Trash2 },
    ]
  },
  {
    title: "Other",
    items: [
      { href: "/admin/users", label: "User Management", icon: Users },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
      { href: "/admin/reports", label: "Reports", icon: FileText },
      { href: "/admin/profile", label: "My Profile", icon: UserCircle },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ]
  }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  const [notifCount, setNotifCount] = useState(0);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("adminSidebarCollapsed") === "true"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("adminSidebarCollapsed", String(collapsed)); } catch {}
  }, [collapsed]);

  useEffect(() => {
    const canAccessAdmin =
      user?.availableRoles?.includes("admin") || user?.availableRoles?.includes("office") ||
      user?.role === "admin" || user?.role === "office";
    if (!loading && (!user || !canAccessAdmin)) {
      if (pathname !== "/admin/login") {
        router.push("/admin/login");
      }
    }

    if (canAccessAdmin) {
      const loadCounts = async () => {
        const [notifs, users] = await Promise.all([db.getNotifications(), db.getAllUsers()]);
        setNotifCount(notifs.filter((n: any) => n.status === "new").length);
        setPendingUsersCount(users.filter((u: any) => u.status === "pending").length);
      };
      loadCounts();
      const interval = setInterval(loadCounts, 5000);
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
        width: collapsed ? "60px" : "260px",
        background: "rgba(10, 14, 20, 0.95)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
        transition: "width 0.2s ease",
        overflow: "hidden"
      }}>
        {/* Logo */}
        <div style={{padding: collapsed ? "1.25rem 0" : "1.5rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", minHeight: "72px"}}>
          {collapsed ? (
            <Shield size={22} color="#00e5ff" />
          ) : (
            <>
              <div>
                <img src="/21-degrees-official-transparent.png" alt="21 Degrees" style={{width: "110px", height: "auto", display: "block", marginBottom: "0.5rem"}} />
                <div style={{display: "flex", alignItems: "center", gap: "0.4rem"}}>
                  <Shield size={14} color="#00e5ff" />
                  <span style={{fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em"}}>Office Portal</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Nav */}
        <nav style={{flex: 1, padding: collapsed ? "0.75rem 0.5rem" : "1rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.2rem", overflowY: "auto", overflowX: "hidden"}}>
          {navGroups.map((group, idx) => (
            <div key={idx} style={{marginBottom: group.title ? "0.5rem" : "0"}}>
              {group.title && !collapsed && (
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
              {collapsed && idx > 0 && (
                <div style={{height: "1px", background: "rgba(255,255,255,0.06)", margin: "0.5rem 0.5rem"}} />
              )}
              {group.items.map(item => {
                const isActive = ('exact' in item && item.exact)
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const badge = item.label === "Notifications" && notifCount > 0 ? notifCount
                  : item.label === "User Management" && pendingUsersCount > 0 ? pendingUsersCount
                  : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: collapsed ? "0.65rem" : "0.7rem 1rem",
                      borderRadius: "8px",
                      textDecoration: "none",
                      fontSize: "0.9rem",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#00e5ff" : "rgba(255,255,255,0.6)",
                      background: isActive ? "rgba(0,229,255,0.08)" : "transparent",
                      transition: "all 0.15s",
                      justifyContent: collapsed ? "center" : "flex-start",
                      position: "relative"
                    }}
                  >
                    <item.icon size={20} />
                    {!collapsed && <span style={{flex: 1}}>{item.label}</span>}
                    {!collapsed && badge > 0 && (
                      <span style={{
                        background: item.label === "Notifications" ? "var(--primary)" : "#ffaa00",
                        color: "#000", fontSize: "0.7rem", fontWeight: "700",
                        padding: "0.1rem 0.4rem", borderRadius: "10px",
                        minWidth: "1.2rem", textAlign: "center"
                      }}>
                        {badge}
                      </span>
                    )}
                    {collapsed && badge > 0 && (
                      <span style={{
                        position: "absolute", top: "4px", right: "4px",
                        background: item.label === "Notifications" ? "var(--primary)" : "#ffaa00",
                        color: "#000", fontSize: "0.6rem", fontWeight: "700",
                        width: "14px", height: "14px", borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}

        </nav>

        {/* Sidebar toggle — always visible, outside scrollable nav */}
        <div style={{padding: collapsed ? "0.5rem" : "0.5rem 0.75rem", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0}}>
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-end",
              padding: collapsed ? "0.6rem" : "0.5rem 0.75rem",
              background: "none", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", cursor: "pointer",
              borderRadius: "8px", transition: "all 0.15s",
              gap: "0.5rem", fontSize: "0.75rem"
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
          >
            {!collapsed && <span>Collapse</span>}
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* User / Logout */}
        <div style={{padding: collapsed ? "0.75rem 0.5rem" : "1rem 1.25rem", borderTop: "1px solid rgba(255,255,255,0.06)"}}>
          {!collapsed && <div style={{fontSize: "0.85rem", color: "#fff", fontWeight: 600, marginBottom: "0.25rem"}}>{user.name}</div>}
          {!collapsed && <div style={{fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.75rem"}}>{user.email}</div>}
          
          <button
            onClick={logout}
            title="Sign Out"
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
            <LogOut size={16} /> {!collapsed && "Sign Out"}
          </button>

        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        marginLeft: collapsed ? "60px" : "260px",
        flex: 1,
        padding: "2rem 2.5rem",
        minHeight: "100vh",
        overflow: "auto",
        transition: "margin-left 0.2s ease"
      }}>
        {children}
      </main>
    </div>
  );
}
