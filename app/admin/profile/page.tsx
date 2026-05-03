"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { UserCircle, Pencil, Mail, Lock, LogOut, Save, CheckCircle2, Eye, EyeOff } from "lucide-react";

const cardStyle = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "12px",
  padding: "1.5rem",
  marginBottom: "1.25rem",
};

const inputStyle = {
  width: "100%",
  padding: "0.75rem 1rem",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "0.95rem",
  boxSizing: "border-box" as const,
  outline: "none",
};

const sectionTitle = (label: string, Icon: React.ElementType) => (
  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
    <Icon size={16} color="#00e5ff" /> {label}
  </h3>
);

export default function AdminProfilePage() {
  const { user, logout, refreshUser } = useAuth();

  // Name
  const [nameMode, setNameMode] = useState<"view" | "edit">("view");
  const [editName, setEditName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  // Email
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailNotice, setEmailNotice] = useState("");
  const [emailError, setEmailError] = useState("");

  // Password
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [showPwSuccess, setShowPwSuccess] = useState(false);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);

  // Logout
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  const roleBadgeColor = user?.role === "admin" ? "#ff3366" : "#00e5ff";

  return (
    <div style={{ maxWidth: "640px" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <UserCircle size={28} /> My Profile
        </h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem" }}>Manage your account details and security</p>
      </div>

      {/* Identity card */}
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "1.25rem" }}>
        <div style={{ width: "64px", height: "64px", background: "rgba(0,229,255,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(0,229,255,0.2)", flexShrink: 0 }}>
          <UserCircle size={32} color="#00e5ff" />
        </div>
        <div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", marginBottom: "0.2rem" }}>{user?.name}</div>
          <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", marginBottom: "0.5rem" }}>{user?.email}</div>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "20px", background: `${roleBadgeColor}18`, border: `1px solid ${roleBadgeColor}44`, color: roleBadgeColor, textTransform: "capitalize" }}>
            {user?.role}
          </span>
        </div>
      </div>

      {/* Edit Name */}
      <div style={cardStyle}>
        {sectionTitle("Display Name", Pencil)}
        {nameMode === "view" ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "1rem", color: "#fff", fontWeight: 600 }}>{user?.name}</span>
            <button
              onClick={() => { setEditName(user?.name || ""); setNameMode("edit"); }}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem" }}
            >
              Edit
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus style={inputStyle} />
            <button onClick={() => setNameMode("view")} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", padding: "0.5rem 0.9rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
              Cancel
            </button>
            <button onClick={handleNameSave} disabled={nameSaving || !editName.trim()} style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.3)", color: "#00e5ff", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.35rem", whiteSpace: "nowrap" }}>
              <Save size={14} /> {nameSaving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Change Email */}
      <div style={cardStyle}>
        {sectionTitle("Change Email Address", Mail)}
        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", marginBottom: "1rem", marginTop: "-0.5rem" }}>Current: {user?.email}</p>
        <form onSubmit={handleEmailUpdate} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="New email address" required style={inputStyle} />
          {emailError && <p style={{ color: "#ff3366", fontSize: "0.82rem", margin: 0 }}>{emailError}</p>}
          {emailNotice && (
            <div style={{ background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.25)", color: "#ffaa00", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.82rem" }}>
              {emailNotice}
            </div>
          )}
          <button type="submit" disabled={emailSaving || !newEmail.trim()} style={{ alignSelf: "flex-start", background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.3)", color: "#00e5ff", padding: "0.6rem 1.2rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700 }}>
            {emailSaving ? "Sending…" : "Update Email"}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div style={cardStyle}>
        {sectionTitle("Change Password", Lock)}
        <form onSubmit={handlePasswordUpdate} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {([
            { label: "Current Password", value: pwCurrent, setter: setPwCurrent, showVal: showPwCurrent, toggleFn: () => setShowPwCurrent(v => !v) },
            { label: "New Password", value: pwNew, setter: setPwNew, showVal: showPwNew, toggleFn: () => setShowPwNew(v => !v) },
            { label: "Confirm New Password", value: pwConfirm, setter: setPwConfirm, showVal: showPwNew, toggleFn: null },
          ] as const).map(({ label, value, setter, showVal, toggleFn }) => (
            <div key={label}>
              <label style={{ display: "block", fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", marginBottom: "0.3rem", fontWeight: 600 }}>{label}</label>
              <div style={{ position: "relative" }}>
                <input type={showVal ? "text" : "password"} value={value} onChange={e => setter(e.target.value)} required style={{ ...inputStyle, paddingRight: toggleFn ? "2.5rem" : "1rem" }} />
                {toggleFn && (
                  <button type="button" onClick={toggleFn} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 0 }}>
                    {showVal ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
            </div>
          ))}
          {pwError && <p style={{ color: "#ff3366", fontSize: "0.82rem", margin: 0 }}>{pwError}</p>}
          <button type="submit" disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm} style={{ alignSelf: "flex-start", background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.3)", color: "#00e5ff", padding: "0.6rem 1.2rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700 }}>
            {pwSaving ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>

      {/* Sign Out */}
      <div style={{ marginTop: "0.5rem" }}>
        {showLogoutConfirm ? (
          <div style={{ ...cardStyle, border: "1px solid rgba(255,51,102,0.3)", background: "rgba(255,51,102,0.05)" }}>
            <p style={{ textAlign: "center", marginBottom: "1rem", fontWeight: 600, color: "#fff" }}>Are you sure you want to sign out?</p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1, padding: "0.65rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem" }}>
                Cancel
              </button>
              <button onClick={logout} style={{ flex: 1, padding: "0.65rem", background: "rgba(255,51,102,0.15)", border: "1px solid rgba(255,51,102,0.35)", color: "#ff3366", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowLogoutConfirm(true)} style={{ width: "100%", padding: "0.9rem", background: "rgba(255,51,102,0.08)", border: "1px solid rgba(255,51,102,0.2)", color: "#ff3366", borderRadius: "10px", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <LogOut size={18} /> Sign Out
          </button>
        )}
      </div>

      {/* Password success toast */}
      {showPwSuccess && (
        <div style={{ position: "fixed", bottom: "2rem", right: "2rem", zIndex: 1000, background: "#22c55e", color: "#fff", padding: "1rem 1.5rem", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 600 }}>
          <CheckCircle2 size={22} /> Password updated successfully!
        </div>
      )}
    </div>
  );
}
