"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/db";
import { User, Truck, ArrowLeft, Save, CheckCircle2, AlertCircle, LogOut } from "lucide-react";
import styles from "../page.module.css";
import Link from "next/link";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [vehicleReg, setVehicleReg] = useState("");
  const [newReg, setNewReg] = useState("");
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.id) {
      db.getUserById(user.id).then(u => {
        if (u?.vehicleReg) {
          setVehicleReg(u.vehicleReg);
        }
      });
    }
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setIsSubmitting(true);
    setError("");
    
    try {
      const upReg = newReg.toUpperCase();
      await db.updateUserVehicle(user.id, upReg);
      setVehicleReg(upReg);
      setNewReg("");
      setMode("view");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err) {
      setError("Failed to update vehicle details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.backBtn}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{color: "var(--text-main)"}}>My Profile</h1>
          <p style={{fontSize: "0.85rem", color: "var(--text-muted)"}}>Manage your engineer settings</p>
        </div>
      </header>

      <div className="glass-panel" style={{padding: "2rem", marginBottom: "1.5rem"}}>
        <div style={{display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem"}}>
          <div style={{
            width: "60px", height: "60px", background: "rgba(0, 229, 255, 0.1)", 
            borderRadius: "50%", display: "flex", alignItems: "center", 
            justifyContent: "center", border: "1px solid rgba(0, 229, 255, 0.2)"
          }}>
            <User size={30} color="var(--primary)" />
          </div>
          <div>
            <h2 style={{margin: 0, fontSize: "1.2rem"}}>{user?.name}</h2>
            <p style={{margin: 0, fontSize: "0.85rem", color: "var(--text-muted)"}}>{user?.email}</p>
          </div>
        </div>

        {mode === "view" ? (
          <div style={{
            background: "rgba(255,255,255,0.03)", padding: "1.25rem", 
            borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)"
          }}>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
              <div>
                <label style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.4rem"}}>
                  <Truck size={14} /> Current Vehicle Registration
                </label>
                <div style={{fontSize: "1.3rem", fontWeight: 700, color: "#fff", letterSpacing: "0.05em"}}>
                  {vehicleReg || "NOT ASSIGNED"}
                </div>
              </div>
              <button 
                onClick={() => setMode("edit")}
                className={styles.secondaryBtn}
                style={{padding: "0.6rem 1.2rem", height: "auto"}}
              >
                Change Registration
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdate}>
            <div style={{
              background: "rgba(255, 170, 0, 0.05)", border: "1px solid rgba(255, 170, 0, 0.2)",
              borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem"
            }}>
              <h3 style={{fontSize: "1rem", color: "#ffaa00", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
                <AlertCircle size={18} /> Transfer Van Inventory?
              </h3>
              <p style={{fontSize: "0.88rem", color: "rgba(255,255,255,0.8)", lineHeight: "1.4", margin: 0}}>
                By changing your Vehicle Registration, we will automatically move all bottles assigned to your current van to the new vehicle. <strong>Shall we proceed?</strong>
              </p>
            </div>

            <div className={styles.inputGroup} style={{marginBottom: "1.5rem"}}>
              <label style={{fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", fontWeight: 600}}>Enter New Vehicle Registration</label>
              <input 
                type="text" 
                value={newReg} 
                onChange={(e) => setNewReg(e.target.value)}
                placeholder="e.g. VA68 LNE"
                required
                autoFocus
                style={{
                  width: "100%", padding: "1rem", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
                  color: "#fff", fontSize: "1.1rem", fontWeight: 600, textTransform: "uppercase"
                }}
              />
            </div>

            {error && (
              <div style={{
                background: "rgba(255, 51, 102, 0.1)", border: "1px solid var(--error)",
                borderRadius: "8px", padding: "1rem", marginBottom: "1rem", color: "var(--error)",
                display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem"
              }}>
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <div style={{display: "flex", gap: "1rem"}}>
              <button 
                type="button" 
                onClick={() => { setMode("view"); setNewReg(""); }}
                className={styles.secondaryBtn} 
                style={{flex: 1}}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className={styles.primaryBtn} 
                disabled={isSubmitting || !newReg}
                style={{flex: 2}}
              >
                {isSubmitting ? "Processing..." : "Confirm & Transfer Bottles"}
              </button>
            </div>
          </form>
        )}
      </div>

      {showSuccess && (
        <div style={{
          position: "fixed", bottom: "2rem", right: "2rem", zIndex: 1000,
          background: "var(--success)", color: "#fff", padding: "1rem 1.5rem",
          borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 600,
          animation: "slideIn 0.3s ease-out"
        }}>
          <CheckCircle2 size={24} /> Van inventory transferred successfully!
        </div>
      )}

      <div className="glass-panel" style={{padding: "1.5rem", background: "rgba(255,255,255,0.02)"}}>
        <h3 style={{fontSize: "1rem", marginBottom: "1rem"}}>Account Status</h3>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span style={{fontSize: "0.9rem", color: "var(--text-muted)"}}>F-Gas Verification</span>
          <span style={{
            fontSize: "0.75rem", padding: "0.25rem 0.6rem", background: "rgba(0, 200, 83, 0.1)",
            color: "var(--success)", borderRadius: "100px", fontWeight: 600, border: "1px solid rgba(0, 200, 83, 0.2)"
          }}>VERIFIED</span>
        </div>
      </div>
      <div style={{marginTop: '2rem', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', marginBottom: '1.5rem'}}>
        <h3 style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>Developer Test Tools</h3>
        <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
          <button 
            id="simulate-existing-btn"
            onClick={() => router.push('/dashboard?simulate=existing')}
            style={{padding: '0.75rem', borderRadius: '8px', background: 'rgba(0, 229, 255, 0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer'}}
          >
            Simulate Existing Bottle Scan
          </button>
          <button 
            id="simulate-reclaim-btn"
            onClick={() => router.push('/dashboard?simulate=reclaim')}
            style={{padding: '0.75rem', borderRadius: '8px', background: 'rgba(255, 170, 0, 0.1)', border: '1px solid var(--warning)', color: 'var(--warning)', fontWeight: 600, cursor: 'pointer'}}
          >
            Simulate Reclaim Bottle Scan
          </button>
        </div>
      </div>
      <div style={{marginTop: "2rem"}}>
        {showLogoutConfirm ? (
          <div className="glass-panel" style={{padding: "1.5rem", border: "1px solid rgba(255, 51, 102, 0.3)", background: "rgba(255, 51, 102, 0.05)"}}>
            <p style={{textAlign: "center", marginBottom: "1rem", fontWeight: 600, color: "#fff"}}>Are you sure you want to logout?</p>
            <div style={{display: "flex", gap: "1rem"}}>
              <button onClick={() => setShowLogoutConfirm(false)} className={styles.secondaryBtn} style={{flex: 1}}>Cancel</button>
              <button onClick={logout} className={styles.primaryBtn} style={{flex: 1, background: "#ff3366", border: "none"}}>Logout</button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              width: "100%", padding: "1rem", borderRadius: "12px", 
              background: "rgba(255, 51, 102, 0.1)", border: "1px solid rgba(255, 51, 102, 0.2)",
              color: "#ff3366", fontWeight: 600, display: "flex", alignItems: "center", 
              justifyContent: "center", gap: "0.5rem", cursor: "pointer"
            }}
          >
            <LogOut size={18} /> Logout from Tracker
          </button>
        )}
      </div>
    </div>
  );
}
