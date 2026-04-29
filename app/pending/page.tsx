"use client";

import { useAuth } from "@/lib/AuthContext";
import { ShieldAlert, Clock, LogOut } from "lucide-react";
import Link from "next/link";

export default function PendingPage() {
  const { user, logout } = useAuth();

  return (
    <div style={{minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#fff", padding: "2rem"}}>
      <div style={{maxWidth: "500px", width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "3rem", textAlign: "center"}}>
        <div style={{width: "80px", height: "80px", background: user?.status === "disabled" ? "rgba(255, 68, 68, 0.1)" : "rgba(255, 193, 7, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 2rem"}}>
          {user?.status === "disabled" ? <ShieldAlert size={48} color="#ff4444" /> : <Clock size={48} color="#ffc107" />}
        </div>
        
        <h1 style={{fontSize: "1.8rem", fontWeight: 800, marginBottom: "1rem"}}>
          {user?.status === "disabled" ? "Account Disabled" : "Approval Pending"}
        </h1>
        
        <p style={{color: "var(--text-muted)", lineHeight: "1.6", marginBottom: "2.5rem"}}>
          {user?.status === "disabled" 
            ? "Your account has been disabled by an administrator. Please contact the office if you believe this is an error."
            : `Hello ${user?.name}, your registration is currently being reviewed by the office. You will gain access to the system once your account is approved.`
          }
        </p>

        <div style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
          <button 
            onClick={() => window.location.reload()}
            style={{
              width: "100%", padding: "1rem", background: "var(--primary)", border: "none", borderRadius: "12px", color: "#000", fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
            }}
          >
            Check Status
          </button>
          <button 
            onClick={logout}
            style={{
              width: "100%", padding: "1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
            }}
          >
            <LogOut size={18} /> Logout & Return
          </button>
        </div>
        <div style={{marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "0.7rem", color: "rgba(255,255,255,0.2)"}}>
          ID: {user?.id} • {user?.email}
        </div>
      </div>
    </div>
  );
}
