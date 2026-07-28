"use client";

import { useState, useEffect } from "react";
import { db, AppNotification } from "@/lib/db";
import { Bell, CheckCircle, Clock, AlertTriangle, ShieldCheck, Trash2, ExternalLink, Calendar, Truck, Flame } from "lucide-react";
import Link from "next/link";
import styles from "../../engineer/page.module.css";

type FilterChip = "all" | "location_discrepancy" | "new_registration" | "expiry" | "low_gas" | "unread";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChip, setActiveChip] = useState<FilterChip>("all");

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const data = await db.getNotifications();
    setNotifications(data);
    setLoading(false);
  };

  const handleAcknowledge = async (id: string) => {
    await db.acknowledgeNotification(id);
    loadNotifications();
  };

  const handleAcknowledgeAll = async () => {
    if (confirm("Acknowledge all notifications?")) {
      await db.acknowledgeAllNotifications();
      loadNotifications();
    }
  };

  if (loading) return <div style={{padding: "2rem", color: "#fff"}}>Loading notifications...</div>;

  const newCount = notifications.filter(n => n.status === "new").length;

  const chips: { key: FilterChip; label: string; count?: number }[] = [
    { key: "all", label: "All", count: notifications.length },
    { key: "unread", label: "Unread Only", count: newCount },
    { key: "expiry", label: "Rental Expiry", count: notifications.filter(n => n.type === "expiry_date_required" || n.type === "rental_expiry").length },
    { key: "low_gas", label: "Low Gas Level", count: notifications.filter(n => n.type === "low_gas").length },
    { key: "location_discrepancy", label: "Location Discrepancy", count: notifications.filter(n => n.type === "location_discrepancy").length },
    { key: "new_registration", label: "New Registration", count: notifications.filter(n => n.type === "new_registration" || n.type === "new_gas_registration").length },
  ];

  const displayed = notifications.filter(n => {
    if (activeChip === "unread") return n.status === "new";
    if (activeChip === "location_discrepancy") return n.type === "location_discrepancy";
    if (activeChip === "new_registration") return n.type === "new_registration" || n.type === "new_gas_registration";
    if (activeChip === "expiry") return n.type === "expiry_date_required" || n.type === "rental_expiry";
    if (activeChip === "low_gas") return n.type === "low_gas";
    return true;
  });

  return (
    <div style={{maxWidth: "1000px"}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem"}}>
        <div>
          <h1 style={{fontSize: "1.8rem", fontWeight: 700, color: "#fff", margin: 0}}>Notification Center</h1>
          <p style={{color: "rgba(255,255,255,0.5)", margin: "0.25rem 0 0"}}>Monitor automated alerts, rental expiry warnings, and gas inventory updates</p>
        </div>
        {newCount > 0 && (
          <button 
            onClick={handleAcknowledgeAll}
            style={{
              background: "rgba(0, 229, 255, 0.1)", border: "1px solid var(--primary)",
              color: "var(--primary)", padding: "0.6rem 1.2rem", borderRadius: "8px",
              cursor: "pointer", fontSize: "0.9rem", fontWeight: 600, display: "flex",
              alignItems: "center", gap: "0.5rem"
            }}
          >
            <CheckCircle size={18} /> Acknowledge All
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div style={{display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem"}}>
        {chips.map(chip => (
          <button
            key={chip.key}
            onClick={() => setActiveChip(chip.key)}
            style={{
              padding: "0.35rem 0.85rem", borderRadius: "20px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
              background: activeChip === chip.key ? "rgba(0,229,255,0.15)" : "rgba(255,255,255,0.05)",
              border: activeChip === chip.key ? "1px solid rgba(0,229,255,0.4)" : "1px solid rgba(255,255,255,0.1)",
              color: activeChip === chip.key ? "#00e5ff" : "rgba(255,255,255,0.55)",
              transition: "all 0.15s"
            }}
          >
            {chip.label}
            {chip.count !== undefined && chip.count > 0 && (
              <span style={{marginLeft: "0.35rem", fontSize: "0.72rem", opacity: 0.7}}>({chip.count})</span>
            )}
          </button>
        ))}
      </div>

      <div style={{display: "flex", flexDirection: "column", gap: "1rem"}}>
        {displayed.length === 0 ? (
          <div className="glass-panel" style={{padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)"}}>
            <Bell size={48} style={{marginBottom: "1rem", opacity: 0.2}} />
            <p>{activeChip === "all" ? "No notifications yet." : "No notifications match this filter."}</p>
          </div>
        ) : (
          displayed.map((n) => {
            const isExpiry = n.type === "rental_expiry" || n.type === "expiry_date_required";
            const isLowGas = n.type === "low_gas";
            const isDiscrepancy = n.type === "location_discrepancy";

            const badgeBg = isExpiry
              ? "rgba(255,51,102,0.12)"
              : isLowGas
              ? "rgba(255,170,0,0.12)"
              : isDiscrepancy
              ? "rgba(255,187,0,0.12)"
              : "rgba(0,229,255,0.12)";

            const badgeColor = isExpiry
              ? "#ff3366"
              : isLowGas
              ? "#ffaa00"
              : isDiscrepancy
              ? "#ffbb00"
              : "var(--primary)";

            return (
              <div 
                key={n.id} 
                className="glass-panel" 
                style={{
                  padding: "1.5rem",
                  borderLeft: n.status === "new" ? `4px solid ${badgeColor}` : "1px solid rgba(255,255,255,0.1)",
                  background: n.status === "new" ? "rgba(0, 229, 255, 0.03)" : "rgba(255,255,255,0.02)",
                  opacity: n.status === "acknowledged" ? 0.6 : 1,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "1.5rem",
                  transition: "all 0.2s"
                }}
              >
                <div style={{display: "flex", gap: "1rem"}}>
                  <div style={{
                    width: "42px", height: "42px", borderRadius: "50%",
                    background: badgeBg, display: "flex", alignItems: "center", justifyContent: "center",
                    color: badgeColor, flexShrink: 0
                  }}>
                    {isExpiry ? <Calendar size={20} /> : isLowGas ? <Flame size={20} /> : isDiscrepancy ? <AlertTriangle size={20} /> : <Bell size={20} />}
                  </div>
                  <div>
                    <div style={{display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem", flexWrap: "wrap"}}>
                      <h3 style={{margin: 0, fontSize: "1rem", color: "#fff"}}>{n.title}</h3>
                      <span style={{fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: "0.25rem"}}>
                        <Clock size={12} /> {new Date(n.date).toLocaleString()}
                      </span>
                    </div>
                    <p style={{margin: 0, fontSize: "0.9rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.5}}>
                      {n.metadata?.serial ? (
                        (() => {
                          const parts = n.message.split(n.metadata.serial);
                          return (
                            <>
                              {parts[0]}
                              <Link 
                                href={`/admin/bottles/${n.metadata.serial}`}
                                style={{
                                  color: "var(--primary)", 
                                  fontWeight: 700, 
                                  textDecoration: "underline",
                                  background: "rgba(0, 229, 255, 0.1)",
                                  padding: "0 4px",
                                  borderRadius: "3px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "2px"
                                }}
                              >
                                {n.metadata.serial} <ExternalLink size={10} />
                              </Link>
                              {parts[1]}
                            </>
                          );
                        })()
                      ) : n.message}
                    </p>
                    {n.metadata && (
                      <div style={{marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center"}}>
                        {Object.entries(n.metadata).map(([key, val]) => (
                          <span key={key} style={{fontSize: "0.7rem", padding: "0.2rem 0.5rem", background: "rgba(255,255,255,0.05)", borderRadius: "4px", color: "rgba(255,255,255,0.5)"}}>
                            <strong>{key}:</strong> {String(val)}
                          </span>
                        ))}
                        {n.type === "new_gas_registration" && (
                          <Link
                            href="/admin/settings"
                            style={{
                              fontSize: "0.7rem", padding: "0.2rem 0.6rem", background: "rgba(0, 229, 255, 0.15)",
                              borderRadius: "4px", color: "var(--primary)", textDecoration: "none", fontWeight: 700,
                              display: "flex", alignItems: "center", gap: "0.25rem"
                            }}
                          >
                            <ExternalLink size={10} /> Complete Details
                          </Link>
                        )}
                        {n.type === "expiry_date_required" && n.metadata?.serial && (
                          <Link
                            href={`/admin/bottles/${n.metadata.serial}/edit`}
                            style={{
                              fontSize: "0.7rem", padding: "0.2rem 0.6rem", background: "rgba(255, 51, 102, 0.15)",
                              borderRadius: "4px", color: "#ff3366", textDecoration: "none", fontWeight: 700,
                              display: "flex", alignItems: "center", gap: "0.25rem"
                            }}
                          >
                            <Calendar size={10} /> Set Expiry Date
                          </Link>
                        )}
                        {n.type === "rental_expiry" && (
                          <>
                            <Link
                              href="/admin/expiry"
                              style={{
                                fontSize: "0.7rem", padding: "0.2rem 0.6rem", background: "rgba(255, 51, 102, 0.15)",
                                borderRadius: "4px", color: "#ff3366", textDecoration: "none", fontWeight: 700,
                                display: "flex", alignItems: "center", gap: "0.25rem"
                              }}
                            >
                              <Calendar size={10} /> Expiry Dashboard
                            </Link>
                            <Link
                              href="/admin/supplier-returns-waste"
                              style={{
                                fontSize: "0.7rem", padding: "0.2rem 0.6rem", background: "rgba(0, 229, 255, 0.15)",
                                borderRadius: "4px", color: "var(--primary)", textDecoration: "none", fontWeight: 700,
                                display: "flex", alignItems: "center", gap: "0.25rem"
                              }}
                            >
                              <Truck size={10} /> Return to Supplier
                            </Link>
                          </>
                        )}
                        {n.type === "low_gas" && n.metadata?.serial && (
                          <Link
                            href={`/admin/bottles/${n.metadata.serial}`}
                            style={{
                              fontSize: "0.7rem", padding: "0.2rem 0.6rem", background: "rgba(255, 170, 0, 0.15)",
                              borderRadius: "4px", color: "#ffaa00", textDecoration: "none", fontWeight: 700,
                              display: "flex", alignItems: "center", gap: "0.25rem"
                            }}
                          >
                            <Flame size={10} /> View Low Cylinder
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {n.status === "new" && (
                  <button 
                    onClick={() => handleAcknowledge(n.id)}
                    style={{
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff", padding: "0.4rem 0.75rem", borderRadius: "6px",
                      cursor: "pointer", fontSize: "0.75rem", fontWeight: 600,
                      whiteSpace: "nowrap"
                    }}
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
