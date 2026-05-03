"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/db";
import { User, Truck, Building2, ArrowLeft, Save, CheckCircle2, AlertCircle, LogOut, Pencil, Mail, Lock, Eye, EyeOff } from "lucide-react";
import styles from "../page.module.css";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  
  const [vehicleReg, setVehicleReg] = useState("");
  const [newReg, setNewReg] = useState("");
  const [mode, setMode] = useState<"view" | "edit">("view");

  // Employer editing
  const [employer, setEmployer] = useState("");
  const [editEmployer, setEditEmployer] = useState("");
  const [employerMode, setEmployerMode] = useState<"view" | "edit">("view");
  const [employerSaving, setEmployerSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [error, setError] = useState("");

  // Name editing
  const [editName, setEditName] = useState("");
  const [nameMode, setNameMode] = useState<"view" | "edit">("view");
  const [nameSaving, setNameSaving] = useState(false);

  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailNotice, setEmailNotice] = useState("");
  const [emailError, setEmailError] = useState("");

  // Password change
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [showPwSuccess, setShowPwSuccess] = useState(false);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);

  useEffect(() => {
    if (user?.id) {
      db.getUserById(user.id).then(u => {
        if (u?.vehicleReg) setVehicleReg(u.vehicleReg);
        if (u?.employer) setEmployer(u.employer);
      });
    }
  }, [user]);

  const handleNameSave = async () => {
    if (!user?.id || !editName.trim()) return;
    setNameSaving(true);
    try {
      await db.updateUserName(user.id, editName.trim());
      await refreshUser();
      setNameMode("view");
    } finally {
      setNameSaving(false);
    }
  };

  const handleEmployerSave = async () => {
    if (!user?.id || !editEmployer.trim()) return;
    setEmployerSaving(true);
    try {
      await db.updateUserEmployer(user.id, editEmployer.trim());
      setEmployer(editEmployer.trim());
      await refreshUser();
      setEmployerMode("view");
    } finally {
      setEmployerSaving(false);
    }
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newEmail.trim()) return;
    setEmailSaving(true);
    setEmailError("");
    setEmailNotice("");
    try {
      const { error: authErr } = await supabase.auth.updateUser({ email: newEmail });
      if (authErr) throw authErr;
      await db.updateUserEmail(user.id, newEmail);
      setEmailNotice(`Confirmation email sent to ${newEmail}. Your login email will update once you click the link.`);
      setNewEmail("");
    } catch (err: any) {
      setEmailError(err.message || "Failed to update email.");
    } finally {
      setEmailSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwNew !== pwConfirm) { setPwError("Passwords do not match."); return; }
    if (pwNew.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    if (!user) return;
    setPwSaving(true);
    setPwError("");
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: pwCurrent });
      if (signInErr) { setPwError("Current password is incorrect."); setPwSaving(false); return; }
      const { error: updateErr } = await supabase.auth.updateUser({ password: pwNew });
      if (updateErr) throw updateErr;
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
      setShowPwSuccess(true);
      setTimeout(() => setShowPwSuccess(false), 4000);
    } catch (err: any) {
      setPwError(err.message || "Failed to update password.");
    } finally {
      setPwSaving(false);
    }
  };

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

      {/* Employer */}
      <div className="glass-panel" style={{padding: "1.5rem", marginBottom: "1.5rem"}}>
        <h3 style={{fontSize: "1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Building2 size={16} /> Employer / Company
        </h3>
        {employerMode === "view" ? (
          <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <span style={{fontSize: "1rem", color: "#fff", fontWeight: 600}}>{employer || "Not set"}</span>
            <button onClick={() => { setEditEmployer(employer); setEmployerMode("edit"); }} className={styles.secondaryBtn} style={{padding: "0.5rem 1rem", height: "auto"}}>
              Edit
            </button>
          </div>
        ) : (
          <div style={{display: "flex", gap: "0.75rem"}}>
            <input
              type="text" value={editEmployer} onChange={e => setEditEmployer(e.target.value)}
              autoFocus
              style={{flex: 1, padding: "0.75rem 1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", fontSize: "0.95rem"}}
            />
            <button onClick={() => setEmployerMode("view")} className={styles.secondaryBtn} style={{padding: "0.5rem 0.9rem", height: "auto"}}>Cancel</button>
            <button onClick={handleEmployerSave} disabled={employerSaving || !editEmployer.trim()} className={styles.primaryBtn} style={{padding: "0.5rem 1rem", height: "auto", display: "flex", alignItems: "center", gap: "0.4rem"}}>
              <Save size={15} /> {employerSaving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{padding: "1.5rem", background: "rgba(255,255,255,0.02)", marginBottom: "1.5rem"}}>
        <h3 style={{fontSize: "1rem", marginBottom: "1rem"}}>Account Status</h3>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span style={{fontSize: "0.9rem", color: "var(--text-muted)"}}>F-Gas Verification</span>
          <span style={{
            fontSize: "0.75rem", padding: "0.25rem 0.6rem", background: "rgba(0, 200, 83, 0.1)",
            color: "var(--success)", borderRadius: "100px", fontWeight: 600, border: "1px solid rgba(0, 200, 83, 0.2)"
          }}>VERIFIED</span>
        </div>
      </div>

      {/* Edit Name */}
      <div className="glass-panel" style={{padding: "1.5rem", marginBottom: "1.5rem"}}>
        <h3 style={{fontSize: "1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Pencil size={16} /> Display Name
        </h3>
        {nameMode === "view" ? (
          <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <span style={{fontSize: "1rem", color: "#fff", fontWeight: 600}}>{user?.name}</span>
            <button onClick={() => { setEditName(user?.name || ""); setNameMode("edit"); }} className={styles.secondaryBtn} style={{padding: "0.5rem 1rem", height: "auto"}}>
              Edit
            </button>
          </div>
        ) : (
          <div style={{display: "flex", gap: "0.75rem"}}>
            <input
              type="text" value={editName} onChange={e => setEditName(e.target.value)}
              autoFocus
              style={{flex: 1, padding: "0.75rem 1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", fontSize: "0.95rem"}}
            />
            <button onClick={() => setNameMode("view")} className={styles.secondaryBtn} style={{padding: "0.5rem 0.9rem", height: "auto"}}>Cancel</button>
            <button onClick={handleNameSave} disabled={nameSaving || !editName.trim()} className={styles.primaryBtn} style={{padding: "0.5rem 1rem", height: "auto", display: "flex", alignItems: "center", gap: "0.4rem"}}>
              <Save size={15} /> {nameSaving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Change Email */}
      <div className="glass-panel" style={{padding: "1.5rem", marginBottom: "1.5rem"}}>
        <h3 style={{fontSize: "1rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Mail size={16} /> Change Email Address
        </h3>
        <p style={{fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem"}}>Current: {user?.email}</p>
        <form onSubmit={handleEmailUpdate} style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
          <input
            type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
            placeholder="New email address" required
            style={{padding: "0.75rem 1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", fontSize: "0.95rem"}}
          />
          {emailError && <p style={{color: "#ff3366", fontSize: "0.82rem", margin: 0}}>{emailError}</p>}
          {emailNotice && (
            <div style={{background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.25)", color: "#ffaa00", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.82rem"}}>
              {emailNotice}
            </div>
          )}
          <button type="submit" disabled={emailSaving || !newEmail.trim()} className={styles.primaryBtn} style={{alignSelf: "flex-start", padding: "0.6rem 1.2rem", height: "auto"}}>
            {emailSaving ? "Sending…" : "Update Email"}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="glass-panel" style={{padding: "1.5rem", marginBottom: "1.5rem"}}>
        <h3 style={{fontSize: "1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Lock size={16} /> Change Password
        </h3>
        <form onSubmit={handlePasswordUpdate} style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
          {[
            { label: "Current Password", value: pwCurrent, setter: setPwCurrent, show: showPwCurrent, toggle: () => setShowPwCurrent(v => !v) },
            { label: "New Password", value: pwNew, setter: setPwNew, show: showPwNew, toggle: () => setShowPwNew(v => !v) },
            { label: "Confirm New Password", value: pwConfirm, setter: setPwConfirm, show: showPwNew, toggle: null },
          ].map(({ label, value, setter, show, toggle }) => (
            <div key={label} style={{position: "relative"}}>
              <label style={{display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.3rem", fontWeight: 600}}>{label}</label>
              <div style={{position: "relative"}}>
                <input
                  type={show ? "text" : "password"} value={value}
                  onChange={e => setter(e.target.value)} required
                  style={{width: "100%", padding: "0.75rem 2.5rem 0.75rem 1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", fontSize: "0.95rem", boxSizing: "border-box"}}
                />
                {toggle && (
                  <button type="button" onClick={toggle} style={{position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 0}}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
            </div>
          ))}
          {pwError && <p style={{color: "#ff3366", fontSize: "0.82rem", margin: 0}}>{pwError}</p>}
          <button type="submit" disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm} className={styles.primaryBtn} style={{alignSelf: "flex-start", padding: "0.6rem 1.2rem", height: "auto"}}>
            {pwSaving ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>

      {showPwSuccess && (
        <div style={{position: "fixed", bottom: "2rem", right: "2rem", zIndex: 1000, background: "var(--success)", color: "#fff", padding: "1rem 1.5rem", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 600, animation: "slideIn 0.3s ease-out"}}>
          <CheckCircle2 size={24} /> Password updated successfully!
        </div>
      )}

      <div style={{marginTop: "2rem", paddingBottom: "env(safe-area-inset-bottom, 1rem)"}}>
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
