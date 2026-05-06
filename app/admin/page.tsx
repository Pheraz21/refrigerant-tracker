"use client";

import { useEffect, useState } from "react";
import { db, Bottle } from "@/lib/db";
import Link from "next/link";
import { Warehouse, Package, Truck, AlertTriangle, CheckCircle2, Clock, MapPin, Bell, CalendarClock, UserCheck, ListTodo, ArrowRight } from "lucide-react";

export default function AdminDashboard() {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [hwcns, setHwcns] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      db.getAllBottles(),
      db.getAllHWCNs(),
      db.getNotifications(),
      db.getAllUsers()
    ]).then(([b, h, n, u]) => {
      setBottles(b);
      setHwcns(h);
      setNotifications(n);
      setPendingUsersCount(u.filter((user: any) => user.status === "pending").length);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{padding: "2rem", color: "var(--text-muted)"}}>Loading...</div>;

  const newNotifications = notifications.filter(n => n.status === "new");
  const pendingHWCNs = hwcns.filter(h => h.hwcnStatus === "awaiting_consignee");
  const completedHWCNs = hwcns.filter(h => h.hwcnStatus === "complete");
  const storesBottles = bottles.filter(b => b.locationType === "office");
  const onsiteBottles = bottles.filter(b => b.locationType === "site");
  const vanBottles = bottles.filter(b => b.locationType === "van");
  const totalActive = bottles.filter(b => b.status === "active").length;

  // Expiry Calculations
  const getDaysDiff = (dateStr: string) => {
    const expiry = new Date(dateStr);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (days: number) => {
    if (days < 0) return { label: "EXPIRED", color: "#ff3366", bg: "rgba(255,51,102,0.1)" };
    if (days <= 7) return { label: "URGENT", color: "#ffaa00", bg: "rgba(255,170,0,0.1)" };
    if (days <= 30) return { label: "WARNING", color: "#ffbb00", bg: "rgba(255,187,0,0.1)" };
    return null;
  };

  const expiringBottles = bottles
    .filter(b => b.rentalExpiryDate && b.status !== "returned")
    .map(b => ({ ...b, daysLeft: getDaysDiff(b.rentalExpiryDate!), statusInfo: getExpiryStatus(getDaysDiff(b.rentalExpiryDate!)) }))
    .filter(b => b.statusInfo !== null)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const getDaysSince = (dateStr?: string) => {
    if (!dateStr) return null;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  };
  const daysColor = (days: number) => days > 28 ? "#ff3366" : days > 14 ? "#ffaa00" : "rgba(255,255,255,0.45)";

  const idleBottles60 = bottles.filter(b =>
    b.status === "active" && b.locationChangedAt &&
    (Date.now() - new Date(b.locationChangedAt).getTime()) > 60 * 86400000
  );
  const expiringIn14 = expiringBottles.filter(b => b.daysLeft >= 0 && b.daysLeft <= 14);
  const pendingHWCNsSorted = [...pendingHWCNs].sort((a, b) => {
    const da = new Date(a.deliveredAt || a.date).getTime();
    const db2 = new Date(b.deliveredAt || b.date).getTime();
    return da - db2;
  });
  const oldestHWCNDays = pendingHWCNsSorted.length > 0 ? getDaysSince(pendingHWCNsSorted[0].deliveredAt || pendingHWCNsSorted[0].date) : null;

  const cards = [
    { label: "New Alerts", value: newNotifications.length, icon: Bell, color: "#ff3366", bg: "rgba(255,51,102,0.08)", border: "rgba(255,51,102,0.3)", href: "/admin/notifications", desc: "Active system notifications" },
    { label: "Pending HWCNs", value: pendingHWCNs.length, icon: Clock, color: "#ffc107", bg: "rgba(255,193,7,0.08)", border: "rgba(255,193,7,0.3)", href: "/admin/hwcn", desc: "Awaiting Part E completion" },
    { label: "In Stores", value: storesBottles.length, icon: Warehouse, color: "#00e5ff", bg: "rgba(0,229,255,0.06)", border: "rgba(0,229,255,0.2)", href: "/admin/stores", desc: "Bottles held in stores" },
    { label: "On Site", value: onsiteBottles.length, icon: MapPin, color: "#a855f7", bg: "rgba(168,85,247,0.06)", border: "rgba(168,85,247,0.2)", href: "/admin/onsite", desc: "Bottles currently on site" },
    { label: "Total Active", value: totalActive, icon: Package, color: "#22c55e", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.2)", href: "/admin/bottles", desc: "All active assets" },
  ];

  const topCards = [
    { label: "New Alerts", value: newNotifications.length, icon: Bell, color: "#ff3366", bg: "rgba(255,51,102,0.08)", border: "rgba(255,51,102,0.3)", href: "/admin/notifications", desc: "Active system notifications" },
    { label: "Pending HWCNs", value: pendingHWCNs.length, icon: Clock, color: "#ffc107", bg: "rgba(255,193,7,0.08)", border: "rgba(255,193,7,0.3)", href: "/admin/hwcn", desc: "Awaiting Part E completion" },
    { label: "Total Active", value: totalActive, icon: Package, color: "#22c55e", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.2)", href: "/admin/bottles", desc: "All active assets" },
  ];

  const bottomCards = [
    { label: "In Stores", value: storesBottles.length, icon: Warehouse, color: "#00e5ff", bg: "rgba(0,229,255,0.06)", border: "rgba(0,229,255,0.2)", href: "/admin/stores", desc: "Bottles held in stores" },
    { label: "In Vans", value: vanBottles.length, icon: Truck, color: "#ff8800", bg: "rgba(255,136,0,0.06)", border: "rgba(255,136,0,0.2)", href: "/admin/vans", desc: "Bottles currently in fleet" },
    { label: "On Site", value: onsiteBottles.length, icon: MapPin, color: "#a855f7", bg: "rgba(168,85,247,0.06)", border: "rgba(168,85,247,0.2)", href: "/admin/onsite", desc: "Bottles currently on site" },
  ];

  return (
    <div>
      <div style={{marginBottom: "2rem"}}>
        <h1 style={{fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem"}}>Dashboard</h1>
        <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>Office overview — HWCN compliance &amp; inventory status</p>
      </div>

      {/* Pending Approvals Banner */}
      {pendingUsersCount > 0 && (
        <Link href="/admin/users" style={{textDecoration: "none", display: "block", marginBottom: "1.5rem"}}>
          <div style={{
            background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.35)",
            borderRadius: "10px", padding: "0.9rem 1.25rem",
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
              <UserCheck size={20} color="#ffaa00" />
              <span style={{fontWeight: 700, color: "#ffaa00", fontSize: "0.95rem"}}>
                {pendingUsersCount} user{pendingUsersCount > 1 ? "s" : ""} awaiting approval
              </span>
              <span style={{fontSize: "0.82rem", color: "rgba(255,255,255,0.45)"}}>
                Engineers cannot log in until approved
              </span>
            </div>
            <span style={{color: "#ffaa00", fontSize: "0.82rem", fontWeight: 600}}>Review →</span>
          </div>
        </Link>
      )}

      {/* Row 1: Compliance & Alerts */}
      <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1rem"}}>
        {topCards.map(card => (
          <Link key={card.label} href={card.href} style={{textDecoration: "none"}}>
            <div style={{
              background: card.bg,
              border: `1px solid ${card.border}`,
              borderRadius: "12px",
              padding: "1.25rem",
              transition: "all 0.2s",
              cursor: "pointer",
              height: "100%"
            }}>
              <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem"}}>
                <card.icon size={24} color={card.color} />
                <span style={{fontSize: "2rem", fontWeight: 800, color: card.color, lineHeight: 1}}>{card.value}</span>
              </div>
              <div style={{fontSize: "0.95rem", fontWeight: 600, color: "#fff", marginBottom: "0.15rem"}}>{card.label}</div>
              <div style={{fontSize: "0.75rem", color: "rgba(255,255,255,0.4)"}}>{card.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Row 2: Physical Locations */}
      <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2.5rem"}}>
        {bottomCards.map(card => (
          <Link key={card.label} href={card.href} style={{textDecoration: "none"}}>
            <div style={{
              background: card.bg,
              border: `1px solid ${card.border}`,
              borderRadius: "12px",
              padding: "1.25rem",
              transition: "all 0.2s",
              cursor: "pointer",
              height: "100%"
            }}>
              <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem"}}>
                <card.icon size={24} color={card.color} />
                <span style={{fontSize: "2rem", fontWeight: 800, color: card.color, lineHeight: 1}}>{card.value}</span>
              </div>
              <div style={{fontSize: "0.95rem", fontWeight: 600, color: "#fff", marginBottom: "0.15rem"}}>{card.label}</div>
              <div style={{fontSize: "0.75rem", color: "rgba(255,255,255,0.4)"}}>{card.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Today's Actions */}
      <div className="glass-panel" style={{marginBottom: "2.5rem", padding: "1.25rem 1.5rem"}}>
        <h2 style={{fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255,255,255,0.9)"}}>
          <ListTodo size={18} color="var(--primary)" /> Today&apos;s Actions
        </h2>
        <div style={{display: "flex", flexDirection: "column", gap: "0.6rem"}}>
          {/* Pending HWCNs */}
          <Link href="/admin/hwcn" style={{textDecoration: "none"}}>
            <div style={{display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderRadius: "8px", background: pendingHWCNs.length > 0 ? "rgba(255,193,7,0.06)" : "rgba(34,197,94,0.04)", border: `1px solid ${pendingHWCNs.length > 0 ? "rgba(255,193,7,0.2)" : "rgba(34,197,94,0.12)"}`, transition: "all 0.15s"}}>
              <Clock size={16} color={pendingHWCNs.length > 0 ? "#ffc107" : "#22c55e"} style={{flexShrink: 0}} />
              <span style={{flex: 1, fontSize: "0.875rem", color: pendingHWCNs.length > 0 ? "#fff" : "rgba(255,255,255,0.5)"}}>
                {pendingHWCNs.length > 0
                  ? <><strong style={{color: "#ffc107"}}>{pendingHWCNs.length}</strong> HWCN{pendingHWCNs.length !== 1 ? "s" : ""} awaiting Part E{oldestHWCNDays !== null && <span style={{color: daysColor(oldestHWCNDays), marginLeft: "0.4rem", fontSize: "0.8rem"}}>— oldest {oldestHWCNDays}d</span>}</>
                  : "All HWCNs up to date"}
              </span>
              <ArrowRight size={14} color="rgba(255,255,255,0.25)" />
            </div>
          </Link>
          {/* Expiring Rentals */}
          <Link href="/admin/expiry" style={{textDecoration: "none"}}>
            <div style={{display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderRadius: "8px", background: expiringIn14.length > 0 ? "rgba(255,51,102,0.06)" : "rgba(34,197,94,0.04)", border: `1px solid ${expiringIn14.length > 0 ? "rgba(255,51,102,0.2)" : "rgba(34,197,94,0.12)"}`, transition: "all 0.15s"}}>
              <CalendarClock size={16} color={expiringIn14.length > 0 ? "#ff3366" : "#22c55e"} style={{flexShrink: 0}} />
              <span style={{flex: 1, fontSize: "0.875rem", color: expiringIn14.length > 0 ? "#fff" : "rgba(255,255,255,0.5)"}}>
                {expiringIn14.length > 0
                  ? <><strong style={{color: "#ff3366"}}>{expiringIn14.length}</strong> rental bottle{expiringIn14.length !== 1 ? "s" : ""} expiring within 14 days</>
                  : "No rentals expiring soon"}
              </span>
              <ArrowRight size={14} color="rgba(255,255,255,0.25)" />
            </div>
          </Link>
          {/* Idle Bottles */}
          <Link href="/admin/bottles" style={{textDecoration: "none"}}>
            <div style={{display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderRadius: "8px", background: idleBottles60.length > 0 ? "rgba(255,170,0,0.06)" : "rgba(34,197,94,0.04)", border: `1px solid ${idleBottles60.length > 0 ? "rgba(255,170,0,0.2)" : "rgba(34,197,94,0.12)"}`, transition: "all 0.15s"}}>
              <Package size={16} color={idleBottles60.length > 0 ? "#ffaa00" : "#22c55e"} style={{flexShrink: 0}} />
              <span style={{flex: 1, fontSize: "0.875rem", color: idleBottles60.length > 0 ? "#fff" : "rgba(255,255,255,0.5)"}}>
                {idleBottles60.length > 0
                  ? <><strong style={{color: "#ffaa00"}}>{idleBottles60.length}</strong> bottle{idleBottles60.length !== 1 ? "s" : ""} with no movement in 60+ days</>
                  : "No bottles idle for 60+ days"}
              </span>
              <ArrowRight size={14} color="rgba(255,255,255,0.25)" />
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Notifications */}
      {newNotifications.length > 0 && (
        <div style={{marginBottom: "2.5rem"}}>
          <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem"}}>
            <h2 style={{fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem"}}>
              <Bell size={20} color="#ff3366" /> Recent Notifications
            </h2>
            <Link href="/admin/notifications" style={{color: "#00e5ff", fontSize: "0.85rem", textDecoration: "none"}}>View all →</Link>
          </div>
          <div style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
            {newNotifications.slice(0, 3).map(n => (
              <div key={n.id} className="glass-panel" style={{
                padding: "1rem 1.25rem", borderLeft: "4px solid #ff3366", background: "rgba(255,51,102,0.02)"
              }}>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
                  <div>
                    <p style={{margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "0.9rem", lineHeight: 1.4}}>
                      {n.metadata?.serial ? (
                        (() => {
                          const parts = n.message.split(n.metadata.serial);
                          return (
                            <>
                              {parts[0]}
                              <Link 
                                href={`/admin/bottles/${n.metadata.serial}`}
                                style={{color: "var(--primary)", fontWeight: 700, textDecoration: "underline"}}
                              >
                                {n.metadata.serial}
                              </Link>
                              {parts[1]}
                            </>
                          );
                        })()
                      ) : n.message}
                    </p>
                    <div style={{marginTop: "0.5rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: "0.5rem"}}>
                      <Clock size={12} /> {new Date(n.date).toLocaleString()}
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      await db.acknowledgeNotification(n.id);
                      const updated = await db.getNotifications();
                      setNotifications(updated);
                    }}
                    style={{
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.6)", padding: "0.4rem 0.75rem", borderRadius: "6px",
                      fontSize: "0.75rem", cursor: "pointer"
                    }}
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending HWCNs */}
      <div style={{marginBottom: "2.5rem"}}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem"}}>
          <h2 style={{fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <AlertTriangle size={20} color="#ffc107" /> HWCNs Awaiting Completion
          </h2>
          <Link href="/admin/hwcn" style={{color: "#00e5ff", fontSize: "0.85rem", textDecoration: "none"}}>View all →</Link>
        </div>

        {pendingHWCNs.length === 0 ? (
          <div style={{background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "10px", padding: "2rem", textAlign: "center"}}>
            <CheckCircle2 size={32} color="#22c55e" style={{marginBottom: "0.5rem"}} />
            <p style={{color: "#22c55e", fontWeight: 600}}>All HWCNs are up to date</p>
            <p style={{color: "var(--text-muted)", fontSize: "0.82rem"}}>No pending Part E completions</p>
          </div>
        ) : (
          <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
            {pendingHWCNs.map(h => (
              <Link key={h.id} href={`/admin/hwcn/${encodeURIComponent(h.id)}`} style={{textDecoration: "none"}}>
                <div style={{
                  background: "rgba(255,193,7,0.04)",
                  border: "1px solid rgba(255,193,7,0.15)",
                  borderRadius: "10px",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}>
                  <div>
                    <span style={{fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "#ffc107"}}>{h.id}</span>
                    <span style={{color: "var(--text-muted)", margin: "0 0.75rem"}}>•</span>
                    <span style={{color: "#fff"}}>{h.serial}</span>
                    <span style={{color: "var(--text-muted)", margin: "0 0.75rem"}}>•</span>
                    <span style={{color: "var(--text-muted)", fontSize: "0.85rem"}}>{h.engineer}</span>
                  </div>
                  <div style={{display: "flex", alignItems: "center", gap: "1rem"}}>
                    {(() => {
                      const days = getDaysSince(h.deliveredAt || h.date);
                      return days !== null ? (
                        <span style={{fontSize: "0.8rem", fontWeight: 700, color: daysColor(days)}}>
                          {days === 0 ? "today" : `${days}d pending`}
                        </span>
                      ) : null;
                    })()}
                    <span style={{background: "rgba(255,193,7,0.15)", color: "#ffc107", padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600}}>
                      Awaiting Part E
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Expiring Rentals */}
      {expiringBottles.length > 0 && (
        <div style={{marginBottom: "2.5rem"}}>
          <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem"}}>
            <h2 style={{fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem"}}>
              <CalendarClock size={20} color="#ff3366" /> Expiring Rentals
            </h2>
            <Link href="/admin/expiry" style={{color: "#00e5ff", fontSize: "0.85rem", textDecoration: "none"}}>Full tracking →</Link>
          </div>
          <div className="glass-panel" style={{padding: 0, overflow: "hidden"}}>
            <table style={{width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", textAlign: "left"}}>
              <thead>
                <tr style={{background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.1)"}}>
                  <th style={{padding: "1rem", fontWeight: 600, color: "rgba(255,255,255,0.5)"}}>Serial</th>
                  <th style={{padding: "1rem", fontWeight: 600, color: "rgba(255,255,255,0.5)"}}>Status</th>
                  <th style={{padding: "1rem", fontWeight: 600, color: "rgba(255,255,255,0.5)"}}>Time Left</th>
                  <th style={{padding: "1rem", fontWeight: 600, color: "rgba(255,255,255,0.5)"}}>Location</th>
                  <th style={{padding: "1rem", fontWeight: 600, color: "rgba(255,255,255,0.5)"}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {expiringBottles.slice(0, 5).map(b => (
                  <tr key={b.serial} style={{borderBottom: "1px solid rgba(255,255,255,0.05)"}}>
                    <td style={{padding: "1rem"}}>
                      <Link href={`/admin/bottles/${b.serial}`} style={{color: "#00e5ff", fontWeight: 700, textDecoration: "none"}}>
                        {b.serial}
                      </Link>
                    </td>
                    <td style={{padding: "1rem"}}>
                      <span style={{
                        padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 800,
                        background: b.statusInfo?.bg, color: b.statusInfo?.color
                      }}>
                        {b.statusInfo?.label}
                      </span>
                    </td>
                    <td style={{padding: "1rem", color: b.daysLeft < 0 ? "#ff3366" : "#fff"}}>
                      {b.daysLeft < 0 ? `${Math.abs(b.daysLeft)} days overdue` : `${b.daysLeft} days remaining`}
                    </td>
                    <td style={{padding: "1rem", color: "rgba(255,255,255,0.6)"}}>{b.locationId}</td>
                    <td style={{padding: "1rem"}}>
                      <Link href={`/admin/bottles/${b.serial}/edit`} style={{color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: "0.8rem"}}>
                        Update Expiry
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recently Completed */}
      {completedHWCNs.length > 0 && (
        <div>
          <h2 style={{fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <CheckCircle2 size={20} color="#22c55e" /> Recently Completed
          </h2>
          <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
            {completedHWCNs.slice(0, 5).map(h => (
              <Link key={h.id} href={`/admin/hwcn/${encodeURIComponent(h.id)}`} style={{textDecoration: "none"}}>
                <div style={{
                  background: "rgba(34,197,94,0.03)",
                  border: "1px solid rgba(34,197,94,0.1)",
                  borderRadius: "10px",
                  padding: "0.85rem 1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer"
                }}>
                  <div>
                    <span style={{fontFamily: "var(--font-geist-mono)", fontWeight: 600, color: "#22c55e"}}>{h.id}</span>
                    <span style={{color: "var(--text-muted)", margin: "0 0.75rem"}}>•</span>
                    <span style={{color: "#fff"}}>{h.serial}</span>
                  </div>
                  <span style={{background: "rgba(34,197,94,0.12)", color: "#22c55e", padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600}}>
                    Complete
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
