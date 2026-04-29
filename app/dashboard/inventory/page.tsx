"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, PackageSearch, Printer } from "lucide-react";
import styles from "./page.module.css";
import Link from "next/link";
import { db, Bottle } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";

export default function InventoryPage() {
  const { user } = useAuth();
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getAllBottles().then(all => {
      // Only show bottles physically in this engineer's van
      const vanBottles = all.filter(b =>
        b.locationType === "van" &&
        b.locationId?.toLowerCase().includes(user?.name?.toLowerCase() || "")
      );
      setBottles(vanBottles);
      setLoading(false);
    });
  }, [user]);

  const printReport = () => {
    const reportDate = new Date().toLocaleDateString("en-GB");
    const rows = bottles.map(b => `
      <tr>
        <td>${b.serial}</td>
        <td>${b.category === "new" ? "New" : b.category === "reclaim" ? "Reclaim" : "N2"}</td>
        <td>${b.gasType}</td>
        <td>${(b.initialWeight || 0).toFixed(2)} kg</td>
        <td>${(b.currentWeight || 0).toFixed(2)} kg</td>
        <td>${((b.initialWeight || 0) - (b.currentWeight || 0)).toFixed(2)} kg</td>
      </tr>
    `).join("");

    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
            .logo-section { display: flex; gap: 15px; align-items: flex-end; }
            .company-info { font-size: 10px; line-height: 1.4; color: #555; }
            .report-info { text-align: right; }
            .report-title { font-size: 20px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
            .report-meta { font-size: 11px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 10px; }
            th { background: #f8f9fa; font-weight: bold; text-transform: uppercase; color: #555; }
            .footer { margin-top: 20px; font-size: 9px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              <img src="/21-degrees-logo-reports.png" style="width: 100px; height: auto;" />
              <div class="company-info">
                <strong>21 Degrees Ltd</strong><br />
                Unit 10, Apollo Court, Monkton Business Park<br />
                Hebburn, Tyne & Wear, NE31 2ES<br />
                Tel: 0191 495 7224
              </div>
            </div>
            <div class="report-info">
              <div class="report-title">Van Stock Report</div>
              <div class="report-meta">
                <div>Engineer: ${user?.name || "N/A"}</div>
                <div>Generated: ${reportDate}</div>
                <div>Results: ${bottles.length} Bottles</div>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Serial</th><th>Type</th><th>Gas</th><th>Capacity</th><th>In Bottle</th><th>Balance</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          
          <div class="footer">
            Printed from F-Gas Tracker Pro | &copy; 21 Degrees Ltd
          </div>
        </body>
      </html>
    `;
    const win = window.open("", "_blank");
    win?.document.write(html);
    win?.document.close();
    setTimeout(() => { win?.print(); }, 500);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
          <div>
            <h1 className={styles.name}>My Van Stock</h1>
            <p className={styles.greeting}>Currently assigned to {user?.name || "you"}</p>
          </div>
          <button 
            onClick={printReport}
            style={{
              background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)", color: "var(--primary)",
              padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.85rem",
              fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem",
              marginTop: "0.5rem"
            }}
          >
            <Printer size={18} /> Print Report
          </button>
        </div>
      </header>

      <section className={styles.inventory}>
        <div className={styles.sectionHeader}>
          <h2>Active Bottles</h2>
          <span className={styles.badge}>{loading ? "…" : bottles.length}</span>
        </div>

        {loading && (
          <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>Loading van stock…</p>
        )}

        {!loading && bottles.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
            <PackageSearch size={48} style={{ marginBottom: "1rem", opacity: 0.4 }} />
            <p>No bottles currently in your van.</p>
            <p style={{ fontSize: "0.85rem" }}>Scan a bottle to check it out to your van.</p>
          </div>
        )}

        <div className={styles.bottleList}>
          {bottles.map(bottle => (
            <Link 
              key={bottle.serial} 
              href={`/dashboard/bottle/${bottle.serial}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div 
                className={`${styles.bottleCard} glass-panel ${bottle.category === "reclaim" ? styles.reclaimCard : ""}`}
                style={{ 
                  borderLeftColor: 
                    bottle.category === "reclaim" ? "var(--warning)" : 
                    bottle.category === "nitrogen" ? "#22c55e" : "var(--primary)",
                  background: 
                    bottle.category === "reclaim" ? "rgba(255, 170, 0, 0.03)" : 
                    bottle.category === "nitrogen" ? "rgba(34, 197, 94, 0.03)" : "rgba(0, 229, 255, 0.03)"
                }}
              >
                <div className={styles.bottleHeader}>
                  <div className={styles.bottleType}>
                    {bottle.category === "reclaim" ? (
                      <AlertTriangle size={16} color="var(--warning)" />
                    ) : (
                      <div 
                        className={styles.dot} 
                        style={{ 
                          background: bottle.category === "nitrogen" ? "#22c55e" : "var(--primary)" 
                        }} 
                      />
                    )}
                    <span style={{ 
                      color: 
                        bottle.category === "reclaim" ? "var(--warning)" : 
                        bottle.category === "nitrogen" ? "#22c55e" : "var(--primary)" 
                    }}>
                      {bottle.category === "new" ? "New Refrigerant" : 
                       bottle.category === "nitrogen" ? "Nitrogen" : "Reclaim / Haz"}
                    </span>
                  </div>
                  <span className={styles.serial}>{bottle.serial}</span>
                </div>
  
                <div className={styles.bottleBody} style={{display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: '1rem'}}>
                  {/* Left Column: Info */}
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.4rem', overflow: 'hidden'}}>
                    <div style={{fontSize: '0.85rem', wordBreak: 'break-word'}}>
                      <span style={{color: 'var(--text-muted)'}}>Gas Type: </span>
                      <strong style={{color: '#fff'}}>{bottle.gasType}</strong>
                    </div>
                    <div style={{fontSize: '0.85rem', wordBreak: 'break-word'}}>
                      <span style={{color: 'var(--text-muted)'}}>Current Location: </span>
                      <strong style={{color: '#fff', textTransform: 'capitalize'}}>{bottle.locationId || bottle.locationType}</strong>
                    </div>
                    {bottle.category === "reclaim" && (bottle.currentWeight || 0) > 0 && bottle.intendedDestination && bottle.activeHWCN && (
                      <div style={{fontSize: '0.85rem', wordBreak: 'break-word', marginTop: '0.2rem'}}>
                        <span style={{color: 'var(--text-muted)'}}>Intended Destination: </span>
                        <strong style={{color: 'var(--warning)'}}>{bottle.intendedDestination}</strong>
                        <div style={{marginTop: '0.2rem', fontSize: '0.75rem', color: 'var(--primary)'}}>
                          Digital HWCN Active
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Weights */}
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'right', minWidth: '160px'}}>
                    {bottle.category === "reclaim" ? (
                      <>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'}}>
                          <span style={{color: 'var(--text-muted)'}}>Max Fill Weight:</span>
                          <strong style={{color: '#fff'}}>{(bottle.initialWeight || 0).toFixed(2)} kg</strong>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'}}>
                          <span style={{color: 'var(--text-muted)'}}>Filled:</span>
                          <strong style={{color: 'var(--warning)'}}>{(bottle.currentWeight || 0).toFixed(2)} kg</strong>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'}}>
                          <span style={{color: 'var(--text-muted)'}}>Available Space:</span>
                          <strong style={{color: 'var(--success)'}}>{((bottle.initialWeight || 0) - (bottle.currentWeight || 0)).toFixed(2)} kg</strong>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'}}>
                          <span style={{color: 'var(--text-muted)'}}>Full Weight:</span>
                          <strong style={{color: '#fff'}}>{(bottle.initialWeight || 0).toFixed(2)} kg</strong>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'}}>
                          <span style={{color: 'var(--text-muted)'}}>Current Weight:</span>
                          <strong style={{color: 'var(--success)'}}>{(bottle.currentWeight || 0).toFixed(2)} kg</strong>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'}}>
                          <span style={{color: 'var(--text-muted)'}}>Weight Used:</span>
                          <strong style={{color: 'var(--warning)'}}>{((bottle.initialWeight || 0) - (bottle.currentWeight || 0)).toFixed(2)} kg</strong>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
