"use client";

import { useState, useEffect } from "react";
import { db, AppNotification } from "@/lib/db";
import { Bell, CheckCircle, Clock, AlertTriangle, ShieldCheck, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";
import styles from "../../dashboard/page.module.css";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{maxWidth: "1000px"}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem"}}>
        <div>
          <h1 style={{fontSize: "1.8rem", fontWeight: 700, color: "#fff", margin: 0}}>Notification Center</h1>
          <p style={{color: "rgba(255,255,255,0.5)", margin: "0.25rem 0 0"}}>Monitor alerts and system updates</p>
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

      <div style={{display: "flex", flexDirection: "column", gap: "1rem"}}>
        {notifications.length === 0 ? (
          <div className="glass-panel" style={{padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)"}}>
            <Bell size={48} style={{marginBottom: "1rem", opacity: 0.2}} />
            <p>No notifications yet.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id} 
              className="glass-panel" 
              style={{
                padding: "1.5rem",
                borderLeft: n.status === "new" ? "4px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
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
                  width: "40px", height: "40px", borderRadius: "50%",
                  background: n.type === "location_discrepancy" ? "rgba(255, 187, 0, 0.1)" : "rgba(0, 229, 255, 0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: n.type === "location_discrepancy" ? "#ffbb00" : "var(--primary)"
                }}>
                  {n.type === "location_discrepancy" ? <AlertTriangle size={20} /> : <Bell size={20} />}
                </div>
                <div>
                  <div style={{display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem"}}>
                    <h3 style={{margin: 0, fontSize: "1rem", color: "#fff"}}>{n.title}</h3>
                    <span style={{fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: "0.25rem"}}>
                      <Clock size={12} /> {new Date(n.date).toLocaleString()}
                    </span>
                  </div>
                  <p style={{margin: 0, fontSize: "0.9rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5}}>
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
                    <div style={{marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap"}}>
                      {Object.entries(n.metadata).map(([key, val]) => (
                        <span key={key} style={{fontSize: "0.7rem", padding: "0.2rem 0.5rem", background: "rgba(255,255,255,0.05)", borderRadius: "4px", color: "rgba(255,255,255,0.5)"}}>
                          <strong>{key}:</strong> {String(val)}
                        </span>
                      ))}
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
          ))
        )}
      </div>
    </div>
  );
}
