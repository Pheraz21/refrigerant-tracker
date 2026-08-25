"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, PackageSearch } from "lucide-react";
import styles from "./page.module.css";
import Link from "next/link";
import { db, Bottle } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { ActiveVehicleBanner } from "@/components/ActiveVehicleBanner";

export default function EngineerInventoryPage() {
  const { user, activeVehicleReg, activeVehicleOwner, activePairingStatus, activePairing } = useAuth();
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGas, setSelectedGas] = useState<string>("");

  const isMateOrApprentice = user?.role === "mate" || user?.role === "apprentice";
  const isApproved = !isMateOrApprentice || activePairingStatus === "approved";

  useEffect(() => {
    if (!user) return;
    if (user.canViewStores) {
      setSelectedGas("");
      db.getBottlesByLocation("office").then(storesBottles => {
        setBottles(storesBottles);
        setLoading(false);
      });
    } else {
      db.getAllBottles().then(all => {
        const effectiveReg = isApproved 
          ? (activeVehicleReg || user.vehicleReg || "").trim().toUpperCase()
          : (user.vehicleReg || "").trim().toUpperCase();
        const effectiveOwner = isApproved ? (activeVehicleOwner || user.name) : user.name;

        const vanBottles = all.filter(b =>
          b.locationType === "van" && (
            (effectiveReg && b.vehicleReg && b.vehicleReg.toUpperCase() === effectiveReg) ||
            (!effectiveReg && b.locationId?.toLowerCase().includes((user.name || "").toLowerCase())) ||
            (effectiveOwner && b.locationId?.toLowerCase().includes(effectiveOwner.toLowerCase()))
          )
        );
        setBottles(vanBottles);
        setLoading(false);
      });
    }
  }, [user, activeVehicleReg, activeVehicleOwner, activePairingStatus]);

  const printReport = () => {
    const reportDate = new Date().toLocaleDateString("en-GB");
    const targetReg = activeVehicleReg || user?.vehicleReg || "Unassigned";
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
            @page { margin: 0; size: A4; }
            body { font-family: sans-serif; margin: 0; padding: 10mm; color: #333; }
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
              <div class="report-title">${user?.canViewStores ? "Stores Inventory Report" : `Van Stock Report (${targetReg})`}</div>
              <div class="report-meta">
                ${user?.canViewStores ? "" : `<div>Operative: ${user?.name || "N/A"}</div><div>Vehicle: ${targetReg}</div>`}
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
            21 Degrees F-Gas Tracker Pro | Official Audit Document | &copy; 2026 21 Degrees Ltd
          </div>
        </body>
      </html>
    `;
    const win = window.open("", "_blank");
    win?.document.write(html);
    win?.document.close();
  };

  const gasTypes = user?.canViewStores
    ? [...new Set(bottles.map(b => b.gasType))].sort()
    : [];

  const displayedBottles = selectedGas
    ? bottles.filter(b => b.gasType === selectedGas)
    : bottles;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.name}>{user?.canViewStores ? "Stores Inventory" : "Van Stock"}</h1>
          <p className={styles.greeting}>
            {user?.canViewStores
              ? "All bottles currently in HQ Stores"
              : activeVehicleReg
                ? `Cylinders in ${activeVehicleReg}${activeVehicleOwner ? ` (${activeVehicleOwner})` : ''}`
                : `Currently assigned to ${user?.name || "you"}`}
          </p>
        </div>
      </header>

      {!user?.canViewStores && <ActiveVehicleBanner />}

      {user?.canViewStores && !loading && (
        <div style={{display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1.25rem"}}>
          <select
            value={selectedGas}
            onChange={e => setSelectedGas(e.target.value)}
            style={{
              flex: 1, padding: "0.6rem 0.75rem",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "8px",
              color: selectedGas ? "#fff" : "rgba(255,255,255,0.4)",
              fontSize: "0.9rem", outline: "none"
            }}
          >
            <option value="">All Gas Types ({bottles.length})</option>
            {gasTypes.map(g => (
              <option key={g} value={g}>{g} ({bottles.filter(b => b.gasType === g).length})</option>
            ))}
          </select>
          {selectedGas && (
            <button
              onClick={() => setSelectedGas("")}
              style={{
                padding: "0.6rem 1rem", background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px",
                color: "#fff", fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap"
              }}
            >
              Reset
            </button>
          )}
        </div>
      )}

      {isMateOrApprentice && activePairingStatus === "pending" && (
        <div style={{
          background: "linear-gradient(90deg, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.05) 100%)",
          border: "1px solid rgba(234, 179, 8, 0.4)",
          borderRadius: "12px",
          padding: "0.85rem 1rem",
          marginBottom: "1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem"
        }}>
          <span style={{ fontSize: "1.2rem" }}>⏳</span>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
            Access request sent to <strong style={{ color: "#fff" }}>{activePairing?.leadEngineerName} ({activePairing?.vehicleReg})</strong>. Displaying your assigned vehicle inventory until approved.
          </div>
        </div>
      )}

      <section className={styles.inventory}>
        <div className={styles.sectionHeader}>
          <h2>Active Bottles</h2>
          <span className={styles.badge}>
            {loading ? "…" : selectedGas ? `${displayedBottles.length} / ${bottles.length}` : bottles.length}
          </span>
        </div>

        {loading && (
          <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>Loading van stock…</p>
        )}

        {!loading && bottles.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
            <PackageSearch size={48} style={{ marginBottom: "1rem", opacity: 0.4 }} />
            {user?.canViewStores ? (
              <p>No bottles currently in stores.</p>
            ) : (
              <>
                <p>No bottles currently in your van.</p>
                <p style={{ fontSize: "0.85rem" }}>Scan a bottle to check it out to your van.</p>
              </>
            )}
          </div>
        )}

        <div className={styles.bottleList}>
          {displayedBottles.map(bottle => (
            <Link 
              key={bottle.serial} 
              href={`/engineer/bottle/${bottle.serial}`}
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
                    {bottle.intendedDestination && (
                      <div style={{fontSize: '0.85rem', wordBreak: 'break-word', marginTop: '0.2rem'}}>
                        <span style={{color: 'var(--text-muted)'}}>Intended Destination: </span>
                        <strong style={{color: 'var(--warning)'}}>
                          {bottle.intendedLocationType === 'supplier' && bottle.supplier && bottle.intendedDestination
                            ? `${bottle.supplier} - ${bottle.intendedDestination}`
                            : bottle.intendedDestination}
                        </strong>
                        {bottle.category === "reclaim" && bottle.activeHWCN && (
                          <div style={{marginTop: '0.2rem', fontSize: '0.75rem', color: 'var(--primary)'}}>
                            Digital HWCN Active
                          </div>
                        )}
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
                {(bottle.returnedAt || bottle.locationChangedAt) && (
                  <div style={{marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                    {bottle.returnedAt
                      ? `Returned: ${new Date(bottle.returnedAt).toLocaleDateString("en-GB")}`
                      : `Last moved: ${new Date(bottle.locationChangedAt!).toLocaleDateString("en-GB")}`
                    }
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
